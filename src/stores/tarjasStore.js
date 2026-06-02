import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from '@/stores/sync/index'
import { useHaciendaStore } from './haciendaStore'
import { logger } from '@/utils/logger'
import { tieredCache, CacheKeys } from '@/utils/cacheManager'

export const useTarjasStore = defineStore('tarjas', {
  state: () => ({
    tarjas: [],
    loading: false,
    error: null,
    version: 1
  }),

  persist: {
    key: 'tarjas',
    storage: localStorage,
    paths: ['tarjas']
  },

  sync: {
    collectionName: 'tarjas',
    stateProp: 'tarjas'
  },

  getters: {
    getTarjaById: (state) => (id) => {
      return state.tarjas.find((t) => t.id === id)
    },
    getTarjasByOperario: (state) => (operarioId) => {
      return state.tarjas.filter((t) => t.operario === operarioId)
    },
    getTarjasBySiembra: (state) => (siembraId) => {
      return state.tarjas.filter((t) => t.siembra === siembraId)
    }
  },

  actions: {
    async init() {
      try {
        await this.cargarTarjas()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar tarjas')
        return false
      }
    },

    async cargarTarjas() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.loading = true

      try {
        if (this.tarjas.length > 0 && !syncStore.isOnline) {
          this.loading = false
          return this.tarjas
        }

        if (!syncStore.isOnline) {
          this.tarjas = []
          return []
        }

        const cacheConfig = CacheKeys.paginatedResult('tarjas', 1, { hacienda: haciendaStore.mi_hacienda?.id })
        
        const resultList = await tieredCache.fetchWithCache(cacheConfig, async () => {
          return await pb.collection('tarjas').getList(1, 1000, {
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
            sort: '-fecha',
            expand: 'operario,siembra'
          })
        })

        this.tarjas = resultList.items

        // Guardar en IndexedDB
        syncStore.saveToLocalStorage('tarjas', JSON.parse(JSON.stringify(this.tarjas)))
        return this.tarjas
      } catch (error) {
        handleError(error, 'Error al cargar registros de cosecha (tarjas)')
        throw error
      } finally {
        this.loading = false
      }
    },

    async crearTarja(tarjaData) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      const enrichedData = {
        ...tarjaData,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      }

      if (!syncStore.isOnline) {
        const tempId = syncStore.generateTempId()

        const tempTarja = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        // Registrar tarja de forma local
        this.applySyncedCreate(tempId, tempTarja)

        // Encolar creación de la tarja
        await syncStore.queueOperation({
          type: 'create',
          collection: 'tarjas',
          data: enrichedData,
          tempId
        })

        uiFeedbackStore.hideLoading()
        return tempTarja
      }

      try {
        const record = await pb.collection('tarjas').create(enrichedData)
        this.applySyncedCreate(record.id, record)
        
        // Invalidar cachés
        tieredCache.invalidatePattern('tarjas:page:')

        uiFeedbackStore.showSnackbar('Registro de cosecha (tarja) guardado con éxito')
        return record
      } catch (error) {
        handleError(error, 'Error al registrar cosecha (tarja)')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async eliminarTarja(id) {
      const syncStore = useSyncStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      if (!syncStore.isOnline) {
        const isTemp = this.tarjas.find(t => t.id === id)?._isTemp
        if (isTemp) {
          this.applySyncedDelete(id)
          syncStore.queue = syncStore.queue.filter(op => op.tempId !== id)
          syncStore.persistQueueState()
          uiFeedbackStore.hideLoading()
          uiFeedbackStore.showSnackbar('Registro temporal eliminado')
          return true
        }

        this.applySyncedDelete(id)
        await syncStore.queueOperation({
          type: 'delete',
          collection: 'tarjas',
          id
        })
        uiFeedbackStore.hideLoading()
        return true
      }

      try {
        await pb.collection('tarjas').delete(id)
        this.applySyncedDelete(id)
        tieredCache.invalidatePattern('tarjas:page:')
        uiFeedbackStore.showSnackbar('Registro de cosecha eliminado')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar registro de cosecha')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore()
      const localTarjas = await syncStore.loadFromLocalStorage('tarjas')
      this.tarjas = (localTarjas && Array.isArray(localTarjas)) ? localTarjas : []
      logger.info(`[TARJAS_STORE] Initialized from localStorage. Tarjas: ${this.tarjas.length}`)
    }
  }
})
