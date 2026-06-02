import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from '@/stores/sync/index'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { logger } from '@/utils/logger'
import { tieredCache, CacheKeys } from '@/utils/cacheManager'

export const useBodegaStore = defineStore('bodega', {
  state: () => ({
    items: [],
    loading: false,
    error: null,
    version: 1
  }),

  persist: {
    key: 'bodega_items',
    storage: localStorage,
    paths: ['items']
  },

  sync: {
    collectionName: 'bodega_items',
    stateProp: 'items'
  },

  getters: {
    getItemById: (state) => (id) => {
      return state.items.find((item) => item.id === id)
    },
    criticalItems: (state) => {
      return state.items.filter((item) => item.stock_actual <= item.stock_minimo)
    }
  },

  actions: {
    async init() {
      try {
        await this.cargarItems()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar almacén de bodega')
        return false
      }
    },

    async cargarItems() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.loading = true

      try {
        if (this.items.length > 0 && !syncStore.isOnline) {
          this.loading = false
          return this.items
        }

        if (!syncStore.isOnline) {
          this.items = []
          return []
        }

        const cacheConfig = CacheKeys.paginatedResult('bodega_items', 1, { hacienda: haciendaStore.mi_hacienda?.id })
        
        const resultList = await tieredCache.fetchWithCache(cacheConfig, async () => {
          return await pb.collection('bodega_items').getList(1, 200, {
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
            sort: '-created'
          })
        })

        this.items = resultList.items

        // Sanitizar y guardar en IndexedDB
        syncStore.saveToLocalStorage('bodega_items', JSON.parse(JSON.stringify(this.items)))
        return this.items
      } catch (error) {
        handleError(error, 'Error al cargar inventario de bodega')
        throw error
      } finally {
        this.loading = false
      }
    },

    async crearItem(itemData) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      const enrichedData = {
        ...itemData,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      }

      if (!syncStore.isOnline) {
        const tempId = syncStore.generateTempId()

        const tempItem = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.applySyncedCreate(tempId, tempItem)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'bodega_items',
          data: enrichedData,
          tempId
        })

        uiFeedbackStore.hideLoading()
        return tempItem
      }

      try {
        const record = await pb.collection('bodega_items').create(enrichedData)
        this.applySyncedCreate(record.id, record)
        
        // Invalidar caché
        tieredCache.invalidatePattern('bodega_items:page:')
        
        useUiFeedbackStore().showSnackbar('Insumo registrado exitosamente en la bodega')
        return record
      } catch (error) {
        handleError(error, 'Error al registrar insumo')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async updateItem(id, updateData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID del insumo no proporcionado')
      }

      const item = this.getItemById(id)
      if (!item) {
        uiFeedbackStore.hideLoading()
        throw new Error(`No se encontró insumo con ID: ${id}`)
      }

      if (!syncStore.isOnline) {
        this.applySyncedUpdate(id, updateData)

        await syncStore.queueOperation({
          type: 'update',
          collection: 'bodega_items',
          id,
          data: updateData
        })

        uiFeedbackStore.hideLoading()
        return this.getItemById(id)
      }

      try {
        const record = await pb.collection('bodega_items').update(id, updateData)
        this.applySyncedUpdate(id, record)
        
        // Invalidar caché
        tieredCache.invalidatePattern('bodega_items:page:')
        
        useUiFeedbackStore().showSnackbar('Insumo actualizado exitosamente')
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar insumo')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async eliminarItem(id) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID del insumo no proporcionado')
      }

      if (!syncStore.isOnline) {
        const itemExiste = this.items.some((i) => i.id === id)
        if (!itemExiste) {
          uiFeedbackStore.hideLoading()
          throw new Error(`No se encontró insumo con ID: ${id}`)
        }

        this.applySyncedDelete(id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'bodega_items',
          id
        })

        uiFeedbackStore.hideLoading()
        return true
      }

      try {
        await pb.collection('bodega_items').delete(id)
        this.applySyncedDelete(id)
        
        // Invalidar caché
        tieredCache.invalidatePattern('bodega_items:page:')
        
        useUiFeedbackStore().showSnackbar('Insumo eliminado exitosamente de la bodega')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar insumo')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore()
      const localItems = await syncStore.loadFromLocalStorage('bodega_items')
      this.items = (localItems && Array.isArray(localItems)) ? localItems : []
      logger.info(`[BODEGA_STORE] Initialized from localStorage. Items: ${this.items.length}`)
    }
  }
})
