import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from '@/stores/sync/index'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'
import { calculateBpaStatus } from '@/utils/agriMetrics'
import { useAlertStore } from './alertStore'


export const useActividadesStore = defineStore('actividades', {
  state: () => ({
    actividades: [],
    tiposActividades: [],
    loading: false,
    loadingTipos: false,
    error: null,
    version: 1,
    lastSync: null,
    activityLookupMap: new Map(),
    currentPage: 1,
    perPage: 20,
    totalItems: 0,
    totalPages: 0
  }),

  persist: {
    key: 'actividades',
    storage: localStorage,
    paths: ['actividades', 'tiposActividades']
  },

  sync: {
    collectionName: 'actividades',
    stateProp: 'actividades',
    hooks: {
      onCreate: function() {
        this.buildActivityLookup()
      },
      onUpdate: function() {
        this.buildActivityLookup()
      },
      onDelete: function(id) {
        this.activityLookupMap.delete(id)
      }
    }
  },

  getters: {
    promedioBpaEstado() {
      const haciendaStore = useHaciendaStore()
      const actividadesHacienda = this.actividades.filter(
        (a) => a.hacienda === haciendaStore.mi_hacienda?.id
      )

      if (!actividadesHacienda.length) return 0

      const totalBpa = actividadesHacienda.reduce((acc, a) => acc + (a.bpa_estado || 0), 0)
      return Math.round(totalBpa / actividadesHacienda.length)
    },

    getActividadTipo: (state) => (tipoId) => {
      const tipo = state.tiposActividades.find((t) => t.id === tipoId)
      return tipo?.nombre || 'Desconocido'
    },

    getNombreActividad: (state) => (id) => {
      const actividad = state.actividades.find((a) => a.id === id)
      return actividad?.nombre || 'Actividad no encontrada'
    },

    getTiposActividades: (state) => {
      return state.tiposActividades
    },

    hasNextPage: (state) => state.currentPage < state.totalPages,
    hasPrevPage: (state) => state.currentPage > 1
  },

  actions: {
    async init() {
      this.loading = true

      try {
        await this.cargarTiposActividades()
        await this.cargarActividades()
      } catch (error) {
        handleError(error, 'Error al inicializar actividades')
      } finally {
        this.loading = false
      }
    },

    async cargarActividades() {
      return this.fetchPage(1, 100)
    },

    async fetchPage(page = 1, perPage = 20) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      if (this.actividades.length > 0 && !navigator.onLine) {
        this.loading = false
        return this.actividades
      }

      try {
        const resultList = await pb.collection('actividades').getList(page, perPage, {
          sort: 'nombre',
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'tipo_actividades,siembras'
        })

        const previousLength = this.actividades.length
        this.actividades = resultList.items
        this.totalItems = resultList.totalItems
        this.currentPage = page
        this.totalPages = resultList.totalPages
        this.lastSync = Date.now()

        if (previousLength !== resultList.items.length) {
          this.buildActivityLookup()
        }

        syncStore.saveToLocalStorage('actividades', resultList.items)
        return resultList
      } catch (error) {
        handleError(error, 'Error al cargar actividades')
        throw error
      } finally {
        this.loading = false
      }
    },

    nextPage() {
      if (this.hasNextPage) {
        return this.fetchPage(this.currentPage + 1, this.perPage)
      }
    },

    prevPage() {
      if (this.hasPrevPage) {
        return this.fetchPage(this.currentPage - 1, this.perPage)
      }
    },

    async crearActividad(actividadData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      const tempId = syncStore.generateTempId()

      const siembras = Array.isArray(actividadData.siembras)
        ? actividadData.siembras
        : actividadData.siembra
          ? [actividadData.siembra]
          : []

      const enrichedData = {
        ...actividadData,
        nombre: actividadData.nombre.toUpperCase(),
        tipo_actividades: actividadData.tipo_actividades,
        hacienda: haciendaStore.mi_hacienda?.id,
        siembras: siembras,
        zonas: actividadData.zonas || [],
        bpa_estado: this.calculateBpaStatus(actividadData.datos_bpa),
        activa: true,
        version: this.version,
        datos_bpa: actividadData.datos_bpa || [],
        metricas: actividadData.metricas || {}
      }

      if (!syncStore.isOnline) {
        const tempActividad = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.actividades.unshift(tempActividad)
        this.activityLookupMap.set(tempId, tempActividad)
        syncStore.saveToLocalStorage('actividades', this.actividades)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        return tempActividad
      }

      try {
        const record = await pb.collection('actividades').create(enrichedData)
        this.actividades.push(record)
        this.activityLookupMap.set(record.id, record)
        syncStore.saveToLocalStorage('actividades', this.actividades)

        if (actividadData.prioridad === 'alta') {
          try {
            const alertStore = useAlertStore()
            await alertStore.triggerCriticalActivityAlert(record)
          } catch (alertError) {
            handleError(alertError, 'Error enviando alerta crítica')
          }
        }

        return record
      } catch (error) {
        handleError(error, 'Error al crear actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateActividad(id, updateData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de actividad no proporcionado para actualización')
      }

      const actividad = this.activityLookupMap.get(id)
      if (!actividad) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró actividad con ID: ${id}`)
      }

      const enrichedData = {
        ...updateData,
        tipo_actividades: updateData.tipo_actividades || actividad?.tipo_actividades,
        metricas: updateData.metricas || actividad?.metricas || {},
        datos_bpa: updateData.datos_bpa || actividad?.datos_bpa || [],
        siembras: Array.isArray(updateData.siembras)
          ? updateData.siembras
          : actividad?.siembras || [],
        zonas: Array.isArray(updateData.zonas) ? updateData.zonas : actividad?.zonas || [],
        bpa_estado: this.calculateBpaStatus(updateData.datos_bpa || actividad?.datos_bpa || []),
        version: this.version
      }

      if (!syncStore.isOnline) {
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = {
            ...this.actividades[index],
            ...enrichedData,
            updated: new Date().toISOString()
          }

          await syncStore.queueOperation({
            type: 'update',
            collection: 'actividades',
            id: id,
            data: enrichedData
          })

          this.activityLookupMap.set(id, this.actividades[index])
          syncStore.saveToLocalStorage('actividades', this.actividades)
          snackbarStore.hideLoading()
          return this.actividades[index]
        }
        snackbarStore.hideLoading()
        throw new Error('Actividad no encontrada')
      }

      try {
        const record = await pb.collection('actividades').update(id, enrichedData, {
          expand: 'tipo_actividades'
        })
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = record
          syncStore.saveToLocalStorage('actividades', this.actividades)
        }
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async deleteActividad(id) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de actividad no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        const actividadExiste = this.activityLookupMap.has(id)
        if (!actividadExiste) {
          snackbarStore.hideLoading()
          throw new Error(`No se encontró actividad con ID: ${id}`)
        }

        this.actividades = this.actividades.filter((a) => a.id !== id)
        this.activityLookupMap.delete(id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'actividades',
          id
        })
        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('actividades', this.actividades)

        return true
      }

      try {
        await pb.collection('actividades').delete(id)
        this.actividades = this.actividades.filter((a) => a.id !== id)
        this.activityLookupMap.delete(id)
        syncStore.saveToLocalStorage('actividades', this.actividades)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async fetchActividadById(id, options = {}) {
      if (!id) {
        throw new Error('ID de actividad no proporcionado')
      }

      try {
        // Asegurar que activityLookupMap sea un Map válido
        if (!(this.activityLookupMap instanceof Map)) {
          this.buildActivityLookup()
        }

        let actividad = this.activityLookupMap.get(id)

        if (actividad) {
          const actividadCompleta = {
            ...actividad,
            datos_bpa: actividad.datos_bpa || [],
            metricas: actividad.metricas || {},
            siembras: actividad.siembras || [],
            zonas: actividad.zonas || [],
            expand: actividad.expand || {}
          }

          return actividadCompleta
        }

        const syncStore = useSyncStore()
        if (syncStore.isOnline) {
          const record = await pb.collection('actividades').getOne(id, options)

          const actividadIndex = this.actividades.findIndex((a) => a.id === id)
          if (actividadIndex !== -1) {
            this.actividades[actividadIndex] = record
          } else {
            this.actividades.push(record)
          }
          syncStore.saveToLocalStorage('actividades', this.actividades)
          this.buildActivityLookup()
          return record
        }

        throw new Error('Actividad no encontrada y sin conexión')
      } catch (error) {
        handleError(error, 'Error al obtener actividad')
        throw error
      }
    },

    async fetchActividadesBySiembra(siembraId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return this.actividades.filter(a => a.siembras?.includes(siembraId))
      }
      return pb.collection('actividades').getFullList({
        filter: `siembras ~ "${siembraId}"`,
        sort: '-fecha_ejecucion'
      })
    },

    buildActivityLookup() {
      this.activityLookupMap = new Map()
      this.actividades.forEach(actividad => {
        this.activityLookupMap.set(actividad.id, actividad)
      })
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('actividades', tempId, newItem, this.actividades, {
        referenceFields: ['actividad', 'actividades'],
        bpaFields: ['datos_bpa']
      })
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'actividades',
        tempId,
        realId,
        this.actividades,
        ['actividad', 'actividades']
      )
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('actividades', id, this.actividades)
    },

    calculateBpaStatus(datosBpa) {
      return calculateBpaStatus(datosBpa)
    },

    async cargarTiposActividades() {
      if (this.loadingTipos) {
        console.log('[ACTIVIDADES] Ya hay una carga de tipos en progreso, esperando...')
        return this.tiposActividades
      }

      if (this.tiposActividades.length > 0 && !navigator.onLine) {
        return this.tiposActividades
      }

      if (this.tiposActividades.length > 0) {
        return this.tiposActividades
      }

      this.loadingTipos = true

      try {
        const records = await pb.collection('tipo_actividades').getFullList({
          sort: 'nombre',
          expand: 'metricas,datos_bpa'
        })
        this.tiposActividades = markRaw(records.map((record) => ({
          id: record.id,
          nombre: record.nombre,
          descripcion: record.descripcion,
          datos_bpa: record.datos_bpa,
          metricas: record.metricas
        })))
        useSyncStore().saveToLocalStorage('tiposActividades', this.tiposActividades)
      } catch (error) {
        handleError(error, 'Error al cargar tipos de actividades')
      } finally {
        this.loadingTipos = false
      }
    },

    initFromLocalStorage() {
      const syncStore = useSyncStore()
      const localActividades = syncStore.loadFromLocalStorage('actividades')
      this.actividades = localActividades || []
      const localTiposActividades = syncStore.loadFromLocalStorage('tiposActividades')
      this.tiposActividades = localTiposActividades ? markRaw(localTiposActividades) : []
      this.buildActivityLookup()
      console.log('[ACTIVIDADES_STORE] Initialized from localStorage. Actividades:', this.actividades.length, 'Tipos:', this.tiposActividades.length)
    }
  }
})
