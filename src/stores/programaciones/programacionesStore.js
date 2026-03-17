/**
 * programacionesStore.js
 * Main Pinia store for programaciones (refactored with modular architecture)
 */

import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { format, isBefore } from 'date-fns'
import { useSyncStore } from '../syncStore'
import { handleError } from '@/utils/errorHandler'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useHaciendaStore } from '../haciendaStore'
import { useSnackbarStore } from '../snackbarStore'
import { useBitacoraStore } from '../bitacoraStore'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import { logger } from '@/utils/logger'

// Import modular functions
import {
  calcularProximaEjecucion,
  obtenerEstadoVisual,
  calcularEjecucionesPendientes,
  formatToISOString
} from './utils/dateCalculators'
import {
  FREQUENCY_TYPES,
  calculateNextExecutionByFrequency,
  calculateInitialExecutionDate,
  validateFrequencyConfig
} from './utils/frequencyHandlers'
import {
  getFechasPendientesWithValidation
} from './recurrenceCalculator'
import {
  getComplianceState,
  getComplianceStateColor,
  getComplianceStateIcon,
  getComplianceStateTooltip
} from './complianceChecker'
import {
  prepareBitacoraEntryData,
  ejecutarProgramacionesBatch,
  finalizeProgramacionExecution as finalizeBatchExecution,
  updateProgramacionAfterBatch,
  validateSiembraContext
} from './batchOperations'

export const useProgramacionesStore = defineStore('programaciones', {
  state: () => ({
    programaciones: [],
    loading: false,
    error: null,
    lastCalculated: null,
    version: 1,
    lastSync: null,
    pendingBitacoraFromProgramacionData: null,
    loaded: false,
    // Pagination state
    pagination: {
      page: 1,
      perPage: 50,
      totalItems: 0,
      totalPages: 0,
      hasMore: false
    },
    filters: {
      hacienda: null,
      actividad: null,
      siembra: null,
      estado: null // 'vencida', 'proxima', 'al-dia'
    }
  }),

  getters: {
    programacionesPorHacienda: (state) => {
      const haciendaStore = useHaciendaStore()
      return state.programaciones.filter((p) => p.hacienda === haciendaStore.mi_hacienda?.id)
    },

    programacionesAgrupadas: (state) => {
      const grouped = {}
      state.programaciones.forEach((p) => {
        if (!grouped[p.actividad]) grouped[p.actividad] = []
        grouped[p.actividad].push(p)
      })
      return grouped
    },

    programacionesParaHoy: (state) => {
      const hoy = new Date()
      const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

      return state.programaciones.filter((p) => {
        const fechaEjecucion =
          p.frecuencia === FREQUENCY_TYPES.FECHA_ESPECIFICA
            ? new Date(p.frecuencia_personalizada?.fecha)
            : new Date(p.proxima_ejecucion)

        const fechaEjecucionNormalizada = new Date(
          fechaEjecucion.getFullYear(),
          fechaEjecucion.getMonth(),
          fechaEjecucion.getDate()
        )

        return fechaEjecucionNormalizada.getTime() === hoyNormalizado.getTime()
      })
    },

    programacionesPendientes: (state) => {
      const hoy = new Date()
      return state.programaciones.filter((p) => {
        const fechaEjecucion =
          p.frecuencia === FREQUENCY_TYPES.FECHA_ESPECIFICA
            ? new Date(p.frecuencia_personalizada?.fecha)
            : new Date(p.proxima_ejecucion)

        return isBefore(fechaEjecucion, hoy)
      })
    }
  },

  actions: {
    // ========== Initialization & Loading ==========

    async init() {
      try {
        await this.cargarProgramaciones()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar programaciones')
        return false
      }
    },

    async cargarProgramaciones() {
      return this.fetchPage(1, 100, {})
    },

    async fetchPage(page = 1, perPage = 50, filters = {}) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      const targetHacienda = filters.hacienda || haciendaStore.mi_hacienda?.id

      if (!targetHacienda) {
        logger.warn('[PROGRAMACIONES_STORE] No haciendaId provided to fetchPage.')
        return { items: [], pagination: this.pagination }
      }

      this.error = null
      this.loading = true

      logger.debug(`[PROGRAMACIONES_STORE] Fetching page ${page} with ${perPage} items per page for hacienda: ${targetHacienda}`)

      try {
        // Build filter string
        const filterParts = [`hacienda="${targetHacienda}"`]

        if (filters.actividad) {
          filterParts.push(`actividad="${filters.actividad}"`)
        }
        if (filters.siembra) {
          filterParts.push(`siembras ~ "${filters.siembra}"`)
        }

        const filterString = filterParts.join(' && ')

        // Use PocketBase getList for pagination
        const result = await pb.collection('programaciones').getList(page, perPage, {
          filter: filterString,
          sort: '-created',
          expand: 'actividad,siembras'
        })

        // Update pagination state
        this.pagination = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        }

        // Update filters state
        this.filters = { ...this.filters, ...filters }

        // Enriquecer programaciones
        const programaciones = result.items.map(this.enriquecerProgramacion.bind(this))

        // For page 1, replace entries; for other pages, append
        if (page === 1) {
          this.programaciones = programaciones
        } else {
          this.programaciones = [...this.programaciones, ...programaciones]
        }

        this.lastSync = Date.now()
        this.saveToStorage()

        logger.debug(`[PROGRAMACIONES_STORE] Fetched page ${page}: ${programaciones.length} items (Total: ${result.totalItems})`)

        return {
          items: programaciones,
          pagination: this.pagination
        }
      } catch (error) {
        handleError(error, 'Error cargando página de programaciones')
        return { items: [], pagination: this.pagination }
      } finally {
        this.loading = false
      }
    },

    async loadNextPage() {
      if (!this.pagination.hasMore || this.loading) {
        return { items: [], pagination: this.pagination }
      }

      const nextPage = this.pagination.page + 1
      return this.fetchPage(nextPage, this.pagination.perPage, this.filters)
    },

    async refreshPage() {
      return this.fetchPage(1, this.pagination.perPage, this.filters)
    },

    clearProgramaciones() {
      this.programaciones = []
      this.pagination = {
        page: 1,
        perPage: 50,
        totalItems: 0,
        totalPages: 0,
        hasMore: false
      }
      this.filters = {
        hacienda: null,
        actividad: null,
        siembra: null,
        estado: null
      }
    },

    // ========== Programacion CRUD ==========

    enriquecerProgramacion(programacion) {
      if (!programacion) return null

      const proximaEjecucion = calcularProximaEjecucion(programacion)
      const estadoVisual = obtenerEstadoVisual(programacion)
      const ejecucionesPendientes = calcularEjecucionesPendientes(programacion)

      return {
        ...programacion,
        actividades: programacion.actividades || [],
        siembras: programacion.siembras || [],
        proximaEjecucion,
        estadoVisual,
        ejecucionesPendientes
      }
    },

    async crearProgramacion(nuevaProgramacion) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      const fechaActual = new Date().toISOString()

      // Validate frequency configuration
      const validation = validateFrequencyConfig(
        nuevaProgramacion.frecuencia,
        nuevaProgramacion.frecuencia_personalizada
      )
      if (!validation.valid) {
        snackbarStore.hideLoading()
        throw new Error(validation.error)
      }

      // Calculate proxima ejecucion using utility function
      let proximaEjecucion
      try {
        proximaEjecucion = calculateInitialExecutionDate(
          nuevaProgramacion.frecuencia,
          nuevaProgramacion.frecuencia_personalizada
        ).toISOString()
      } catch (error) {
        logger.error('[PROGRAMACIONES_STORE] Error calculando próxima ejecución:', error)
        proximaEjecucion = fechaActual
      }

      const enrichedData = {
        ...nuevaProgramacion,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version,
        ultima_ejecucion: null,
        actividades: nuevaProgramacion.actividadesSeleccionadas,
        siembras: await this.obtenerSiembrasRelacionadas(
          nuevaProgramacion.actividadesSeleccionadas
        ),
        proxima_ejecucion: proximaEjecucion,
        created: fechaActual
      }

      if (!syncStore.isOnline) {
        const tempId = syncStore.generateTempId()

        const tempProgramacion = {
          ...enrichedData,
          id: tempId,
          created: fechaActual,
          updated: fechaActual,
          _isTemp: true
        }

        this.programaciones.unshift(tempProgramacion)
        syncStore.saveToLocalStorage('programaciones', this.programaciones)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'programaciones',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        return tempProgramacion
      }

      try {
        const record = await pb.collection('programaciones').create(enrichedData, {
          expand: 'actividad,siembras'
        })
        this.programaciones.push(record)
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return record
      } catch (error) {
        handleError(error, 'Error al crear programación')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async actualizarProgramacion(id, datosActualizados) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de programación no proporcionado para actualización')
      }

      const programacion = this.programaciones.find((p) => p.id === id)
      if (!programacion) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró programación con ID: ${id}`)
      }

      const dataToUpdate = {
        ...datosActualizados,
        actividades: datosActualizados.actividades || programacion?.actividades || [],
        siembras: datosActualizados.siembras || programacion?.siembras || [],
        proxima_ejecucion: calcularProximaEjecucion({
          ...programacion,
          ...datosActualizados
        })
      }

      if (!syncStore.isOnline) {
        const index = this.programaciones.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.programaciones[index] = {
            ...this.programaciones[index],
            ...dataToUpdate,
            updated: new Date().toISOString()
          }
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'programaciones',
          id,
          data: dataToUpdate
        })

        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return this.programaciones[index]
      }

      try {
        const record = await pb.collection('programaciones').update(id, dataToUpdate, {
          expand: 'actividad,siembras'
        })
        const index = this.programaciones.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.programaciones[index] = record
        }
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar programación')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async eliminarProgramacion(id) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de programación no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        const programacionExiste = this.programaciones.some((p) => p.id === id)
        if (!programacionExiste) {
          snackbarStore.hideLoading()
          throw new Error(`No se encontró programación con ID: ${id}`)
        }

        this.programaciones = this.programaciones.filter((p) => p.id !== id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'programaciones',
          id
        })
        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return true
      }

      try {
        await pb.collection('programaciones').delete(id)
        this.programaciones = this.programaciones.filter((p) => p.id !== id)
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar programación')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    // ========== Helper Methods ==========

    async obtenerSiembrasRelacionadas(actividadesIds) {
      const actividadesStore = useActividadesStore()
      const siembras = new Set()

      const missingIds = []
      for (const id of actividadesIds) {
        const actividad = actividadesStore.actividades.find(a => a.id === id)
        if (actividad?.siembras) {
          actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
        } else if (!actividad) {
          missingIds.push(id)
        }
      }

      if (missingIds.length > 0) {
        try {
          const filter = missingIds.map(id => `id="${id}"`).join(' || ')

          const actividades = await pb.collection('actividades')
            .getFullList({ filter, batch: 100 })

          for (const actividad of actividades) {
            if (actividad?.siembras) {
              actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
            }
          }
        } catch (error) {
          logger.error('[PROGRAMACIONES_STORE] Error obteniendo actividades faltantes en batch:', error)
          const failedIds = []
          for (const id of missingIds) {
            try {
              const actividad = await actividadesStore.fetchActividadById(id)
              if (actividad?.siembras) {
                actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
              }
            } catch (err) {
              failedIds.push(id)
              logger.error(`[PROGRAMACIONES_STORE] Error procesando actividad ${id}:`, err)
            }
          }
          if (failedIds.length > 0) {
            logger.warn(`[obtenerSiembrasRelacionadas] No se pudieron obtener ${failedIds.length} de ${missingIds.length} actividades`)
          }
        }
      }

      return Array.from(siembras)
    },

    // ========== Sync Methods ==========

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem(
        'programaciones',
        tempId,
        newItem,
        this.programaciones,
        {
          referenceFields: ['programacion', 'programaciones'],
          executionFields: ['proxima_ejecucion']
        }
      )
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'programaciones',
        tempId,
        realId,
        this.programaciones,
        ['programacion', 'programaciones']
      )
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem(
        'programaciones',
        id,
        this.programaciones
      )
    },

    applySyncedCreate(tempId, realItem) {
      const syncStore = useSyncStore()
      logger.debug(`[PROGRAMACIONES_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`)
      const index = this.programaciones.findIndex(p => p.id === tempId && p._isTemp)
      if (index !== -1) {
        this.programaciones[index] = { ...realItem, _isTemp: false }
      } else {
        if (!this.programaciones.some(p => p.id === realItem.id)) {
          this.programaciones.unshift({ ...realItem, _isTemp: false })
          logger.debug('[PROGRAMACIONES_STORE] Synced item added as new (was not found by tempId).')
        } else {
          logger.debug('[PROGRAMACIONES_STORE] Synced item already exists by realId.')
        }
      }
      syncStore.saveToLocalStorage('programaciones', this.programaciones)
      logger.debug('[PROGRAMACIONES_STORE] Synced create applied, localStorage updated.')
    },

    applySyncedUpdate(id, updatedItemData) {
      const syncStore = useSyncStore()
      logger.debug(`[PROGRAMACIONES_STORE] Applying synced update for id: ${id}`)
      const index = this.programaciones.findIndex(p => p.id === id)
      if (index !== -1) {
        this.programaciones[index] = { ...this.programaciones[index], ...updatedItemData, _isTemp: false }
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        logger.debug('[PROGRAMACIONES_STORE] Synced update applied, localStorage updated.')
      } else {
        logger.warn(`[PROGRAMACIONES_STORE] Could not find item with id ${id} to apply update.`)
      }
    },

    applySyncedDelete(id) {
      const syncStore = useSyncStore()
      logger.debug(`[PROGRAMACIONES_STORE] Applying synced delete for id: ${id}`)
      const initialLength = this.programaciones.length
      this.programaciones = this.programaciones.filter(p => p.id !== id)
      if (this.programaciones.length < initialLength) {
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        logger.debug('[PROGRAMACIONES_STORE] Synced delete applied, localStorage updated.')
      } else {
        logger.warn(`[PROGRAMACIONES_STORE] Could not find item with id ${id} to apply delete.`)
      }
    },

    // ========== Bitacora Integration ==========

    async prepareForBitacoraEntryFromProgramacion(programacion) {
      const actividadesStore = useActividadesStore()
      this.pendingBitacoraFromProgramacionData = null

      const preparedData = await prepareBitacoraEntryData(programacion, actividadesStore)
      if (preparedData) {
        this.pendingBitacoraFromProgramacionData = preparedData
        return true
      }
      return false
    },

    clearPendingBitacoraData() {
      this.pendingBitacoraFromProgramacionData = null
      logger.debug('[PROGRAMACIONES_STORE] Cleared pending bitacora data.')
    },

    async finalizeProgramacionExecution(payload) {
      const { programacionId, fechaEjecucionReal } = payload
      const programacionIndex = this.programaciones.findIndex(p => p.id === programacionId)

      if (programacionIndex === -1) {
        logger.error(`[PROGRAMACIONES_STORE] Programacion with ID ${programacionId} not found for finalization.`)
        return
      }

      const programacion = this.programaciones[programacionIndex]

      try {
        const updateData = await finalizeBatchExecution(payload, programacion)
        await this.actualizarProgramacion(programacionId, updateData)
      } catch (error) {
        logger.error(`[PROGRAMACIONES_STORE] Error finalizing programacion execution for ${programacionId}:`, error)
        throw error
      }
    },

    async ejecutarProgramacionesBatch(payload) {
      const { programacionId, fechasEjecucion, observacionesAdicionales = '', siembraId = null, metricasSeleccionadas = [] } = payload

      const snackbarStore = useSnackbarStore()
      const actividadesStore = useActividadesStore()
      const bitacoraStore = useBitacoraStore()

      const stores = {
        actividadesStore,
        bitacoraStore,
        snackbarStore,
        programaciones: this.programaciones
      }

      try {
        const result = await ejecutarProgramacionesBatch(payload, stores)

        if (result.successfulExecutions > 0 && result.latestSuccessfullyExecutedDate) {
          const programacion = this.programaciones.find(p => p.id === programacionId)
          const updateData = await updateProgramacionAfterBatch(
            programacionId,
            result.latestSuccessfullyExecutedDate,
            programacion
          )

          await this.actualizarProgramacion(programacionId, updateData)

          const siembraContext = siembraId ? ` (Siembra: ${siembraId})` : ''
          snackbarStore.showSnackbar(
            `${result.successfulExecutions} de ${result.totalExecutions} programaciones ejecutadas y registradas${siembraContext}. Programación actualizada.`,
            'success'
          )
        } else if (fechasEjecucion.length > 0 && result.successfulExecutions === 0) {
          snackbarStore.showSnackbar('Ninguna de las programaciones seleccionadas pudo ser registrada.', 'error')
        } else if (fechasEjecucion.length === 0) {
          snackbarStore.showSnackbar('No se seleccionaron fechas para ejecutar.', 'info')
        }
      } catch (error) {
        logger.error('[PROGRAMACIONES_STORE] Error in ejecutarProgramacionesBatch:', error)
        snackbarStore.showSnackbar(error.message || 'Error ejecutando programaciones', 'error')
      }
    },

    // ========== Compliance & Recurrence ==========

    getFechasPendientes(programacion, siembraId = null) {
      return getFechasPendientesWithValidation(
        programacion,
        this.isFechaProcessedInBitacora.bind(this),
        siembraId
      )
    },

    isFechaProcessedInBitacora(programacionId, fecha, siembraId = null) {
      const bitacoraStore = useBitacoraStore()

      if (!bitacoraStore.bitacoras || !Array.isArray(bitacoraStore.bitacoras)) {
        return false
      }

      const fechaStr = format(fecha, 'yyyy-MM-dd')

      return bitacoraStore.bitacoras.some(bitacora => {
        if (bitacora.programaciones !== programacionId) {
          return false
        }

        const bitacoraFecha = bitacora.fecha ? format(new Date(bitacora.fecha), 'yyyy-MM-dd') : null
        if (bitacoraFecha !== fechaStr) {
          return false
        }

        if (siembraId) {
          const bitacoraSiembras = Array.isArray(bitacora.siembras) ? bitacora.siembras : []
          return bitacoraSiembras.includes(siembraId)
        }

        return true
      })
    },

    hasBitacoraEntryForSiembra(programacionId, siembraId = null) {
      const bitacoraStore = useBitacoraStore()

      if (!bitacoraStore.bitacoras || !Array.isArray(bitacoraStore.bitacoras)) {
        return false
      }

      return bitacoraStore.bitacoras.some(bitacora => {
        if (bitacora.programaciones !== programacionId) {
          return false
        }

        if (siembraId) {
          const bitacoraSiembras = Array.isArray(bitacora.siembras) ? bitacora.siembras : []
          return bitacoraSiembras.includes(siembraId)
        }

        return true
      })
    },

    getComplianceState(programacion, siembraId = null) {
      return getComplianceState(programacion, this.hasBitacoraEntryForSiembra.bind(this), siembraId)
    },

    getComplianceStateColor(programacion, siembraId = null) {
      return getComplianceStateColor(programacion, this.hasBitacoraEntryForSiembra.bind(this), siembraId)
    },

    getComplianceStateIcon(programacion, siembraId = null) {
      return getComplianceStateIcon(programacion, this.hasBitacoraEntryForSiembra.bind(this), siembraId)
    },

    getComplianceStateTooltip(programacion, siembraId = null) {
      return getComplianceStateTooltip(programacion, this.hasBitacoraEntryForSiembra.bind(this), siembraId)
    },

    validateSiembraContext(programacionId, siembraId) {
      return validateSiembraContext(programacionId, siembraId, this.programaciones)
    },

    // ========== Storage ==========

    saveToStorage() {
      try {
        safeLocalStorage.saveToLocalStorage('programaciones', this.programaciones)
      } catch (error) {
        logger.error('[PROGRAMACIONES_STORE] Error guardando en localStorage:', error)
      }
    },

    loadFromStorage() {
      try {
        const data = safeLocalStorage.loadFromLocalStorage('programaciones')
        if (data && Array.isArray(data)) {
          this.programaciones = data.map(this.enriquecerProgramacion.bind(this))
          this.loaded = true
          return true
        }
        return false
      } catch (error) {
        logger.error('[PROGRAMACIONES_STORE] Error cargando desde localStorage:', error)
        return false
      }
    }
  }
})
