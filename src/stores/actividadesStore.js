import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from '@/stores/sync/index'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'
import { calculateBpaStatus } from '@/utils/agriMetrics'
import { tieredCache, CacheKeys } from '@/utils/cacheManager'


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
      onCreate: function () {
        this.buildActivityLookup()
      },
      onUpdate: function () {
        this.buildActivityLookup()
      },
      onDelete: function (id) {
        if (this.activityLookupMap instanceof Map) {
          this.activityLookupMap.delete(id)
        }
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
      this.loading = true;

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

      if (this.actividades.length > 0 && !syncStore.isOnline) {
        this.loading = false
        return this.actividades
      }

      try {
        const cacheConfig = CacheKeys.paginatedResult('actividades', page, { hacienda: haciendaStore.mi_hacienda?.id })
        
        const resultList = await tieredCache.fetchWithCache(cacheConfig, async () => {
          return await pb.collection('actividades').getList(page, perPage, {
            sort: 'nombre',
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
            expand: 'tipo_actividades,siembras'
          })
        })


        const previousLength = this.actividades.length
        this.actividades = resultList.items
        this.totalItems = resultList.totalItems
        this.currentPage = resultList.page
        this.totalPages = resultList.totalPages
        this.lastSync = Date.now()

        if (previousLength !== resultList.items.length) {
          this.buildActivityLookup()
        }

        // CORRECTO: Sanitizar con JSON.parse(JSON.stringify()) para IndexedDB
        syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));
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
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
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
        if (!(this.activityLookupMap instanceof Map)) this.buildActivityLookup()
        this.activityLookupMap.set(tempId, tempActividad)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));

        await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: enrichedData,
          tempId
        })

        uiFeedbackStore.hideLoading()
        return tempActividad
      }

      try {
        const record = await pb.collection('actividades').create(enrichedData)
        this.actividades.push(record)
        if (!(this.activityLookupMap instanceof Map)) this.buildActivityLookup()
        this.activityLookupMap.set(record.id, record)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));
        
        // Invalidar cache de la lista paginada para que la interfaz se refresque sola
        tieredCache.invalidatePattern('actividades')

        if (actividadData.prioridad === 'alta') {
          try {
            const uiFeedbackStore = useUiFeedbackStore()
            await uiFeedbackStore.triggerCriticalActivityAlert(record)
          } catch (alertError) {
            handleError(alertError, 'Error enviando alerta crítica')
          }
        }

        return record
      } catch (error) {
        handleError(error, 'Error al crear actividad')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async updateActividad(id, updateData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de actividad no proporcionado para actualización')
      }

      if (!(this.activityLookupMap instanceof Map)) this.buildActivityLookup()
      const actividad = this.activityLookupMap.get(id)
      if (!actividad) {
        uiFeedbackStore.hideLoading()
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
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'actividades',
          id,
          data: enrichedData
        })

        if (!(this.activityLookupMap instanceof Map)) this.buildActivityLookup()
        this.activityLookupMap.set(id, this.actividades[index])
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));
        uiFeedbackStore.hideLoading()
        return this.actividades[index]
      }

      try {
        const record = await pb.collection('actividades').update(id, enrichedData, {
          expand: 'tipo_actividades,zonas.tipos_zonas,siembras'
        })
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = record
        }
        if (!(this.activityLookupMap instanceof Map)) this.buildActivityLookup()
        this.activityLookupMap.set(id, record)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));
        tieredCache.invalidatePattern('actividades')
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar actividad')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async deleteActividad(id) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de actividad no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        if (!(this.activityLookupMap instanceof Map)) this.buildActivityLookup()
        const actividadExiste = this.activityLookupMap.has(id)
        if (!actividadExiste) {
          uiFeedbackStore.hideLoading()
          throw new Error(`No se encontró actividad con ID: ${id}`)
        }

        this.actividades = this.actividades.filter((a) => a.id !== id)
        if (this.activityLookupMap instanceof Map) this.activityLookupMap.delete(id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'actividades',
          id
        })

        uiFeedbackStore.hideLoading()
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));
        return true
      }

      try {
        await pb.collection('actividades').delete(id)
        this.actividades = this.actividades.filter((a) => a.id !== id)
        if (this.activityLookupMap instanceof Map) this.activityLookupMap.delete(id)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));
        tieredCache.invalidatePattern('actividades')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar actividad')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async fetchActividadById(id, options = {}) {
      if (!id) throw new Error('ID de actividad no proporcionado')

      try {
        if (!(this.activityLookupMap instanceof Map)) {
          this.buildActivityLookup()
        }

        // Si se solicita expand, no usar caché local (no tiene relaciones resueltas)
        // Solo usar caché cuando NO se necesitan relaciones expandidas
        const needsExpand = !!options.expand
        const actividad = needsExpand ? null : this.activityLookupMap.get(id)

        if (actividad) {
          return {
            ...actividad,
            datos_bpa: actividad.datos_bpa || [],
            metricas: actividad.metricas || {},
            siembras: actividad.siembras || [],
            zonas: actividad.zonas || [],
            expand: actividad.expand || {}
          }
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
          // CORRECTO: Sanitizar para IndexedDB
          syncStore.saveToLocalStorage('actividades', JSON.parse(JSON.stringify(this.actividades)));
          this.buildActivityLookup()
          return record
        }

        // Offline: si está en caché local, retornarla aunque sin expand
        const cachedActividad = this.activityLookupMap.get(id)
        if (cachedActividad) {
          return {
            ...cachedActividad,
            datos_bpa: cachedActividad.datos_bpa || [],
            metricas: cachedActividad.metricas || {},
            siembras: cachedActividad.siembras || [],
            zonas: cachedActividad.zonas || [],
            expand: cachedActividad.expand || {}
          }
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

      const syncStore = useSyncStore()
      if (this.tiposActividades.length > 0 && !syncStore.isOnline) {
        return this.tiposActividades
      }

      if (this.tiposActividades.length > 0) {
        return this.tiposActividades
      }

      this.loadingTipos = true

      try {
        const cacheConfig = CacheKeys.tiposActividades()
        
        const records = await tieredCache.fetchWithCache(cacheConfig, async () => {
          return await pb.collection('tipo_actividades').getFullList({
            sort: 'nombre',
            expand: 'metricas,datos_bpa'
          })
        })

        this.tiposActividades = markRaw(records.map((record) => ({
          id: record.id,
          nombre: record.nombre,
          descripcion: record.descripcion,
          datos_bpa: record.datos_bpa,
          metricas: record.metricas
        })))
        useSyncStore().saveToLocalStorage('tiposActividades', JSON.parse(JSON.stringify(this.tiposActividades)));
      } catch (error) {
        handleError(error, 'Error al cargar tipos de actividades')
      } finally {
        this.loadingTipos = false
      }
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore();
      // CORRECTO: Usar await para loadFromLocalStorage
      const localActividades = await syncStore.loadFromLocalStorage('actividades');
      // CORRECTO: Validar que sea array
      this.actividades = (localActividades && Array.isArray(localActividades)) ? localActividades : [];
      // CORRECTO: Usar await para loadFromLocalStorage
      const localTiposActividades = await syncStore.loadFromLocalStorage('tiposActividades');
      // CORRECTO: Validar que sea array
      this.tiposActividades = (localTiposActividades && Array.isArray(localTiposActividades)) ? markRaw(localTiposActividades) : [];
      this.buildActivityLookup()
      console.log('[ACTIVIDADES_STORE] Initialized from localStorage. Actividades:', this.actividades.length, 'Tipos:', this.tiposActividades.length)
    }
  }
})
