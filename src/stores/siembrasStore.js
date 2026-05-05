import { defineStore } from 'pinia'
import { markRaw, toRaw } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from '@/stores/sync/index'
import { useHaciendaStore } from './haciendaStore'
import { computed } from 'vue'
import { offlineGeoStorage } from '@/utils/offlineGeoStorage'
import { logger } from '@/utils/logger'

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

    getSiembraNombre: (state) => (id) => {
      const siembra = state.siembras.find((s) => s.id === id)
      return siembra ? `${siembra.nombre}-${siembra.tipo}` : 'Sin siembras registradas'
    },

    activeSiembras: (state) => {
      return state.siembras.filter((siembra) => siembra.estado !== 'finalizada')
    },

    activeSiembrasWithMemo: (state) =>
      computed(() => state.siembras.filter((s) => s.estado !== 'finalizada')),

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
      return this.fetchPage(1, 100)
    },

    async fetchPage(page = 1, perPage = 20) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.loading = true;

      try {
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
        this.currentPage = resultList.page
        this.totalPages = resultList.totalPages

        // CORRECTO: Sanitizar con JSON.parse(JSON.stringify()) para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));
        
        for (const siembra of resultList.items) {
          if (siembra.gps || siembra.geometria) {
            await offlineGeoStorage.saveSiembra(siembra).catch(e => 
              logger.warn('[SIEMBRAS_STORE] Error guardando en offlineGeoStorage:', e)
            )
          }
        }

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
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      const enrichedData = {
        ...siembraData,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      }

      if (!syncStore.isOnline) {
        const tempId = syncStore.generateTempId()

        const tempSiembra = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.siembras.unshift(tempSiembra)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));

        await syncStore.queueOperation({
          type: 'create',
          collection: 'siembras',
          data: enrichedData,
          tempId
        })

        uiFeedbackStore.hideLoading()
        return tempSiembra
      }

      try {
        const record = await pb.collection('siembras').create(enrichedData)
        this.siembras.unshift(record)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));
        
        if (record.gps || record.geometria) {
          await offlineGeoStorage.saveSiembra(record).catch(e => 
            logger.warn('[SIEMBRAS_STORE] Error guardando en offlineGeoStorage:', e)
          )
        }
        
        useUiFeedbackStore().showSnackbar('Siembra creada exitosamente')
        return record
      } catch (error) {
        handleError(error, 'Error al crear siembra')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async updateSiembra(id, updateData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de siembra no proporcionado para actualización')
      }

      const siembra = this.getSiembraById(id)
      if (!siembra) {
        uiFeedbackStore.hideLoading()
        throw new Error(`No se encontró siembra con ID: ${id}`)
      }

      const enrichedData = {
        ...updateData,
        avatar: updateData.avatar || siembra?.avatar
      }

      if (!syncStore.isOnline) {
        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = {
            ...this.siembras[index],
            ...enrichedData,
            updated: new Date().toISOString()
          }
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'siembras',
          id,
          data: enrichedData
        })

        uiFeedbackStore.hideLoading()
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));
        return this.siembras[index]
      }

      try {
        const record = await pb.collection('siembras').update(id, enrichedData, {
          expand: 'tipos_zonas'
        })
        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = record
        }
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));
        
        if (record.gps || record.geometria) {
          await offlineGeoStorage.saveSiembra(record).catch(e => 
            logger.warn('[SIEMBRAS_STORE] Error actualizando en offlineGeoStorage:', e)
          )
        }
        
        useUiFeedbackStore().showSnackbar('Siembra actualizada exitosamente')
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar siembra')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async eliminarSiembra(id) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de siembra no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        const siembraExiste = this.siembras.some((s) => s.id === id)
        if (!siembraExiste) {
          uiFeedbackStore.hideLoading()
          throw new Error(`No se encontró siembra con ID: ${id}`)
        }

        this.siembras = this.siembras.filter((s) => s.id !== id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'siembras',
          id
        })

        uiFeedbackStore.hideLoading()
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));
        return true
      }

      try {
        await pb.collection('siembras').delete(id)
        this.siembras = this.siembras.filter((s) => s.id !== id)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));
        
        await offlineGeoStorage.deleteSiembra(id).catch(e => 
          logger.warn('[SIEMBRAS_STORE] Error eliminando de offlineGeoStorage:', e)
        )
        
        useUiFeedbackStore().showSnackbar('Siembra eliminada exitosamente')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar siembra')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async fetchSiembraById(id) {
      if (!id) throw new Error('ID de siembra no proporcionado')

      const local = this.siembras.find((s) => s.id === id)
      if (local) return local

      const syncStore = useSyncStore()
      if (syncStore.isOnline) {
        const record = await pb.collection('siembras').getOne(id, {
          expand: 'hacienda,zona'
        })
        const siembraIndex = this.siembras.findIndex((s) => s.id === id)
        if (siembraIndex !== -1) {
          this.siembras[siembraIndex] = record
        } else {
          this.siembras.push(record)
        }
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(toRaw(this.siembras))));
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
        sort: '-fecha_ejecucion'
      }).catch(() => [])
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('siembras', tempId, newItem, this.siembras)
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'siembras',
        tempId,
        realId,
        this.siembras
      )
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('siembras', id, this.siembras)
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore();
      // CORRECTO: Usar await para loadFromLocalStorage
      const localSiembras = await syncStore.loadFromLocalStorage('siembras');
      // CORRECTO: Validar que sea array
      this.siembras = (localSiembras && Array.isArray(localSiembras)) ? localSiembras : [];
      console.log('[SIEMBRAS_STORE] Initialized from localStorage. Siembras:', this.siembras.length);
    }
  }
})
