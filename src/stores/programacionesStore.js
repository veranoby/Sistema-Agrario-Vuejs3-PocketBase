import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  differenceInDays,
  differenceInMonths
} from 'date-fns'
import { useSyncStore } from './syncStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'
import { useSnackbarStore } from './snackbarStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'

export const useProgramacionesStore = defineStore('programaciones', {
  state: () => ({
    programaciones: [],
    loading: false,
    error: null,
    lastCalculated: null,
    version: 1,
    lastSync: null
  }),

  persist: {
    key: 'programaciones',
    storage: sessionStorage,
    paths: ['programaciones']
  },

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
          p.frecuencia === 'fecha_especifica'
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
          p.frecuencia === 'fecha_especifica'
            ? new Date(p.frecuencia_personalizada?.fecha)
            : new Date(p.proxima_ejecucion)

        return isBefore(fechaEjecucion, hoy)
      })
    }
  },

  actions: {
    async cargarProgramaciones() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      // Cargar datos locales primero
      const programacionesLocal = syncStore.loadFromLocalStorage('programaciones')
      if (programacionesLocal) {
        this.programaciones = programacionesLocal.map(this.enriquecerProgramacion)

        this.loading = false
        return this.programaciones
      }

      try {
        const records = await pb.collection('programaciones').getFullList({
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'actividad,siembras'
        })

        this.lastSync = Date.now()

        this.programaciones = records.map(this.enriquecerProgramacion)
        // Guardar zonas en localStorage para uso offline
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
      } catch (error) {
        handleError(error, 'Error al cargar programaciones')
      } finally {
        this.loading = false
      }
    },

    enriquecerProgramacion(programacion) {
      if (!programacion) return null

      const proximaEjecucion = this.calcularProximaEjecucion(programacion)
      const estadoVisual = this.obtenerEstadoVisual(programacion)
      const ejecucionesPendientes = this.calcularEjecucionesPendientes(programacion)

      return {
        ...programacion,
        actividades: programacion.actividades || [],
        siembras: programacion.siembras || [],
        proximaEjecucion,
        estadoVisual,
        ejecucionesPendientes
      }
    },

    calcularProximaEjecucion(programacion) {
      if (programacion.frecuencia === 'fecha_especifica') {
        return new Date(programacion.frecuencia_personalizada?.fecha)
      }

      if (!programacion.ultima_ejecucion) return new Date(programacion.created)

      const baseDate = new Date(programacion.ultima_ejecucion)
      const config = programacion.frecuencia_personalizada || {}

      switch (programacion.frecuencia) {
        case 'diaria':
          return addDays(baseDate, 1)
        case 'semanal':
          return addWeeks(baseDate, 1)
        case 'quincenal':
          return addDays(baseDate, 15)
        case 'mensual':
          return addMonths(baseDate, 1)
        case 'personalizada':
          return this.calcularFrecuenciaPersonalizada(baseDate, config)
        default:
          return addDays(baseDate, 1)
      }
    },

    calcularFrecuenciaPersonalizada(baseDate, config) {
      const addFunctions = {
        dias: addDays,
        semanas: addWeeks,
        meses: addMonths,
        años: addYears
      }

      return addFunctions[config.tipo]?.(baseDate, config.cantidad) || addDays(baseDate, 1)
    },

    obtenerEstadoVisual(programacion) {
      const hoy = new Date()
      const fechaTarget =
        programacion.frecuencia === 'fecha_especifica'
          ? new Date(programacion.frecuencia_personalizada?.fecha)
          : new Date(programacion.proxima_ejecucion)

      if (isBefore(fechaTarget, hoy)) return 'vencida'

      const diff = differenceInDays(fechaTarget, hoy)
      if (diff <= 3) return 'proxima'
      return 'al-dia'
    },

    calcularEjecucionesPendientes(programacion) {
      if (!programacion.ultima_ejecucion) return 1

      const hoy = new Date()
      const ultimaEjecucion = new Date(programacion.ultima_ejecucion)

      if (programacion.frecuencia === 'fecha_especifica') {
        const fechaEspecifica = new Date(programacion.frecuencia_personalizada?.fecha)
        return fechaEspecifica < hoy ? 1 : 0
      }

      const diasDesdeUltima = differenceInDays(hoy, ultimaEjecucion)

      switch (programacion.frecuencia) {
        case 'diaria':
          return diasDesdeUltima
        case 'semanal':
          return Math.floor(diasDesdeUltima / 7)
        case 'quincenal':
          return Math.floor(diasDesdeUltima / 15)
        case 'mensual':
          return differenceInMonths(hoy, ultimaEjecucion)
        case 'personalizada':
          const config = programacion.frecuencia_personalizada
          if (config.tipo === 'dias') return Math.floor(diasDesdeUltima / config.cantidad)
          if (config.tipo === 'semanas') return Math.floor(diasDesdeUltima / (7 * config.cantidad))
          if (config.tipo === 'meses')
            return differenceInMonths(hoy, ultimaEjecucion) / config.cantidad
          return 0
        default:
          return 0
      }
    },

    async crearProgramacion(nuevaProgramacion) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      // Enriquecer datos con siembras relacionadas
      const enrichedData = {
        ...nuevaProgramacion,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version,
        actividades: nuevaProgramacion.actividadesSeleccionadas,
        siembras: await this.obtenerSiembrasRelacionadas(nuevaProgramacion.actividadesSeleccionadas)
      }

      if (!syncStore.isOnline) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const tempProgramacion = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.programaciones.push(this.enriquecerProgramacion(tempProgramacion))

        await syncStore.queueOperation({
          type: 'create',
          collection: 'programaciones',
          data: this.enriquecerProgramacion(enrichedData),
          tempId
        })

        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('programaciones', this.programaciones)

        return tempProgramacion
      }

      // Online flow
      try {
        const record = await pb.collection('programaciones').create(
          this.enriquecerProgramacion(enrichedData, {
            expand: 'actividad,siembras'
          })
        )
        this.programaciones.push(this.enriquecerProgramacion(record))
        return record
      } catch (error) {
        handleError(error, 'Error al crear programación')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async obtenerSiembrasRelacionadas(actividadesIds) {
      const actividadesStore = useActividadesStore()
      const siembrasStore = useSiembrasStore()
      const siembras = new Set()

      for (const id of actividadesIds) {
        try {
          const actividad = await actividadesStore.fetchActividadById(id)
          if (actividad?.siembras) {
            actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
          }
        } catch (error) {
          console.error(`Error cargando actividad ${id}:`, error)
        }
      }

      return Array.from(siembras)
    },

    async actualizarProgramacion(id, datosActualizados) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      const enrichedData = {
        ...datosActualizados,
        version: this.version
      }

      if (!syncStore.isOnline) {
        const index = this.programaciones.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.programaciones[index] = {
            ...this.programaciones[index],
            ...this.enriquecerProgramacion(enrichedData)
          }
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'programaciones',
          id,
          data: this.enriquecerProgramacion(enrichedData)
        })

        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('programaciones', this.programaciones)

        return this.programaciones[index]
      }

      // Online flow
      try {
        const record = await pb.collection('programaciones').update(id, enrichedData, {
          expand: 'actividad,siembras'
        })
        const index = this.programaciones.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.programaciones[index] = this.enriquecerProgramacion(record)
          // Actualizar localStorage
          syncStore.saveToLocalStorage('programaciones', this.programaciones)
        }
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

      if (!syncStore.isOnline) {
        this.programaciones = this.programaciones.filter((programacion) => programacion.id !== id)

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
        this.programaciones = this.programaciones.filter((programacion) => programacion.id !== id)
        syncStore.saveToLocalStorage('programaciones', this.programaciones)

        return true
      } catch (error) {
        handleError(error, 'Error al eliminar programacion')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async ejecutarProgramacion(id) {
      const syncStore = useSyncStore()
      const programacion = this.programaciones.find((p) => p.id === id)
      if (!programacion) return

      // Lógica para crear en bitácora
      console.log('Registrando en bitácora:', {
        programacion: id,
        fecha: new Date().toISOString(),
        actividad: programacion.actividad
      })

      // Actualizar fechas
      const ultimaEjecucion = new Date().toISOString()
      const proximaEjecucion = this.calcularProximaEjecucion({
        ...programacion,
        ultima_ejecucion: ultimaEjecucion
      })

      try {
        // Registrar en bitácora (por ahora solo console.log)
        console.log('Registrando en bitácora:', {
          programacion: id,
          fecha: ultimaEjecucion,
          actividad: programacion.actividad
        })

        // Actualizar programación
        return await this.actualizarProgramacion(id, {
          ultima_ejecucion: ultimaEjecucion,
          proxima_ejecucion: proximaEjecucion.toISOString()
        })
      } catch (error) {
        handleError(error, 'Error al ejecutar programación')
        throw error
      }
    }
  }
})
