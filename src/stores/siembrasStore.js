import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from '@/stores/sync/index'
import { useHaciendaStore } from './haciendaStore'
import { computed } from 'vue'
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { createSyncActions } from '@/utils/syncActions'

export const useSiembrasStore = defineStore('siembras', {
  state: () => ({
    siembras: [],
    loading: false,
    error: null,
    version: 1,
    // Pagination state
    currentPage: 1,
    perPage: 20,
    totalItems: 0,
    totalPages: 0
  }),

  persist: {
    key: 'siembras',
    storage: localStorage,
    paths: ['siembras']
  },

  sync: {
    collectionName: 'siembras',
    stateProp: 'siembras'
  },

  getters: {
    getSiembraById: (state) => (id) => {
      return state.siembras.find((siembra) => siembra.id === id)
    },

    // Function to get the activity type based on the activity ID
    getSiembraNombre: (state) => (id) => {
      const siembra = state.siembras.find((s) => s.id === id)
      return siembra ? `${siembra.nombre}-${siembra.tipo}` : 'Sin siembras registradas'
    },

    activeSiembras: (state) => {
      return state.siembras.filter((siembra) => siembra.estado !== 'finalizada')
    },

    activeSiembrasWithMemo: (state) =>
      computed(() => state.siembras.filter((s) => s.estado !== 'finalizada')),

    // Pagination getters
    hasNextPage: (state) => state.currentPage < state.totalPages,
    hasPrevPage: (state) => state.currentPage > 1
  },

  actions: {
    async init() {
      try {
        await this.cargarSiembras()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar siembras')
        return false
      }
    },

    async cargarSiembras() {
      // Local storage loading is now handled by initFromLocalStorage.
      // This method maintains backward compatibility by loading all items.
      return this.fetchPage(1, MAX_PAGE_SIZE)
    },

    async fetchPage(page = 1, perPage = 20) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.loading = true

      try {
        // If data already populated by initFromLocalStorage, and offline, return.
        if (this.siembras.length > 0 && !navigator.onLine) {
          this.loading = false;
          return this.siembras;
        }

        if (!syncStore.isOnline) {
          this.siembras = []
          return []
        }

        const resultList = await pb.collection('siembras').getList(page, perPage, {
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          sort: '-created'
        })

        this.siembras = resultList.items
        this.totalItems = resultList.totalItems
        this.currentPage = page
        this.totalPages = resultList.totalPages

        syncStore.saveToLocalStorage('siembras', resultList.items)
        return resultList
      } catch (error) {
        handleError(error, 'Error al cargar siembras')
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

    async crearSiembra(siembraData) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      // Enriquecer datos con contexto de hacienda
      const enrichedData = {
        ...siembraData,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      }

      if (!syncStore.isOnline) {
        // Usar la función unificada para generar ID temporal
        const tempId = syncStore.generateTempId()

        const tempSiembra = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true // Marcar como temporal para mejor seguimiento
        }

        this.siembras.unshift(tempSiembra)
        syncStore.saveToLocalStorage('siembras', this.siembras)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'siembras',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        return tempSiembra
      }

      try {
        const record = await pb.collection('siembras').create(enrichedData)
        this.siembras.unshift(record)
        syncStore.saveToLocalStorage('siembras', this.siembras)
        useSnackbarStore().showSnackbar('Siembra creada exitosamente')
        return record
      } catch (error) {
        handleError(error, 'Error al crear la siembra')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateSiembra(id, updateData) {
      const syncStore = useSyncStore()
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de siembra no proporcionado para actualización')
      }

      const siembra = this.getSiembraById(id)
      if (!siembra) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró siembra con ID: ${id}`)
      }

      const dataToUpdate = {
        ...updateData,
        avatar: updateData.avatar || siembra?.avatar
      }

      if (!syncStore.isOnline) {
        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = {
            ...this.siembras[index],
            ...dataToUpdate,
            updated: new Date().toISOString()
          }
          syncStore.saveToLocalStorage('siembras', this.siembras)
        }

        // Generar un tempId para la operación de actualización
        await syncStore.queueOperation({
          type: 'update',
          collection: 'siembras',
          id,
          data: dataToUpdate
        })

        snackbarStore.hideLoading()
        return this.siembras[index]
      }

      try {
        const record = await pb.collection('siembras').update(id, dataToUpdate)
        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = record
        }
        syncStore.saveToLocalStorage('siembras', this.siembras)
        useSnackbarStore().showSnackbar('Siembra actualizada exitosamente')
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar la siembra')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async eliminarSiembra(id) {
      const syncStore = useSyncStore()
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de siembra no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        this.siembras = this.siembras.filter((s) => s.id !== id)
        syncStore.saveToLocalStorage('siembras', this.siembras)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'siembras',
          id
        })

        snackbarStore.hideLoading()
        return true
      }

      try {
        await pb.collection('siembras').delete(id)
        this.siembras = this.siembras.filter((s) => s.id !== id)
        syncStore.saveToLocalStorage('siembras', this.siembras)
        useSnackbarStore().showSnackbar('Siembra eliminada exitosamente')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar la siembra')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async fetchSiembraById(id) {
      if (!id) throw new Error('ID de siembra no proporcionado')

      // Buscar en array local primero
      const local = this.siembras.find((s) => s.id === id)
      if (local) return local

      // Fallback a PocketBase
      const syncStore = useSyncStore()
      if (syncStore.isOnline) {
        const record = await pb.collection('siembras').getOne(id, {
          expand: 'hacienda,zona'
        })
        // Agregar al array local
        if (!this.siembras.some(s => s.id === record.id)) {
          this.siembras.push(record)
          syncStore.saveToLocalStorage('siembras', this.siembras)
        }
        return record
      }

      throw new Error('Siembra no encontrada y sin conexión')
    },

    async fetchSiembrasByProgramacion(programacionId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return this.siembras.filter(s => s.programaciones?.includes(programacionId))
      }
      return pb.collection('siembras').getFullList({
        filter: `programaciones ~ "${programacionId}"`,
        sort: '-created'
      }).catch(() => [])
    },

    // Método para actualizar un elemento local
    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('siembras', tempId, newItem, this.siembras)
    },

    // Método para actualizar referencias
    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem('siembras', tempId, realId, this.siembras)
    },

    // Método para eliminar un elemento local
    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('siembras', id, this.siembras)
    },

    initFromLocalStorage() {
      const syncStore = useSyncStore();
      const localSiembras = syncStore.loadFromLocalStorage('siembras');
      this.siembras = localSiembras || [];
      console.log('[SIEMBRAS_STORE] Initialized from localStorage. Siembras:', this.siembras.length);
    }
  }
})
