import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from './syncStore'
import { useHaciendaStore } from './haciendaStore'
//import { useAvatarStore } from './avatarStore'
import { computed } from 'vue'

export const useSiembrasStore = defineStore('siembras', {
  state: () => ({
    siembras: [],
    loading: false,
    error: null,
    version: 1
  }),

  persist: {
    key: 'siembras',
    storage: sessionStorage,
    paths: ['siembras']
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
      computed(() => state.siembras.filter((s) => s.estado !== 'finalizada'))
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

        const records = await pb.collection('siembras').getFullList({
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`
        })
        this.siembras = records
        syncStore.saveToLocalStorage('siembras', records)
        return records
      } catch (error) {
        handleError(error, 'Error al cargar siembras')
        return []
      } finally {
        this.loading = false
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
      console.log('entrando a fetchSiembraById: id=', id)
      const index = this.siembras.findIndex((s) => s.id === id)
      if (index !== -1) {
        return this.siembras[index] // Retorna la actividad encontrada
      } else {
        throw new Error('Actividad no encontrada') // Manejo de error si no se encuentra
      }
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
    },

    // Standard sync methods
    applySyncedCreate(tempId, realItem) {
      const syncStore = useSyncStore();
      console.log(`[SIEMBRAS_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`);
      const index = this.siembras.findIndex(s => s.id === tempId && s._isTemp);
      if (index !== -1) {
        this.siembras[index] = { ...realItem, _isTemp: false };
      } else {
        if (!this.siembras.some(s => s.id === realItem.id)) {
            this.siembras.unshift({ ...realItem, _isTemp: false }); 
            console.log('[SIEMBRAS_STORE] Synced item added as new (was not found by tempId).');
        } else {
            console.log('[SIEMBRAS_STORE] Synced item already exists by realId.');
        }
      }
      syncStore.saveToLocalStorage('siembras', this.siembras);
      console.log('[SIEMBRAS_STORE] Synced create applied, localStorage updated.');
    },

    applySyncedUpdate(id, updatedItemData) {
      const syncStore = useSyncStore();
      console.log(`[SIEMBRAS_STORE] Applying synced update for id: ${id}`);
      const index = this.siembras.findIndex(s => s.id === id);
      if (index !== -1) {
        this.siembras[index] = { ...this.siembras[index], ...updatedItemData, _isTemp: false };
        syncStore.saveToLocalStorage('siembras', this.siembras);
        console.log('[SIEMBRAS_STORE] Synced update applied, localStorage updated.');
      } else {
         console.warn(`[SIEMBRAS_STORE] Could not find item with id ${id} to apply update.`);
      }
    },

    applySyncedDelete(id) {
      const syncStore = useSyncStore();
      console.log(`[SIEMBRAS_STORE] Applying synced delete for id: ${id}`);
      const initialLength = this.siembras.length;
      this.siembras = this.siembras.filter(s => s.id !== id);
      if (this.siembras.length < initialLength) {
        syncStore.saveToLocalStorage('siembras', this.siembras);
        console.log('[SIEMBRAS_STORE] Synced delete applied, localStorage updated.');
      } else {
        console.warn(`[SIEMBRAS_STORE] Could not find item with id ${id} to apply delete.`);
      }
    }
  }
})
