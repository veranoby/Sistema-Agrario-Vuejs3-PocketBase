import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from '@/stores/sync/index'
import { useHaciendaStore } from './haciendaStore'
import { computed } from 'vue'
import { offlineGeoStorage } from '@/utils/offlineGeoStorage'
import { logger } from '@/utils/logger'
import { tieredCache, CacheKeys } from '@/utils/cacheManager'


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
    collectionName: 'Siembras',
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
        if (this.siembras.length > 0 && !syncStore.isOnline) {
          this.loading = false;
          return this.siembras;
        }

        if (!syncStore.isOnline) {
          this.siembras = []
          return []
        }

        const cacheConfig = CacheKeys.paginatedResult('siembras', page, { hacienda: haciendaStore.mi_hacienda?.id })
        
        const resultList = await tieredCache.fetchWithCache(cacheConfig, async () => {
          return await pb.collection('Siembras').getList(page, perPage, {
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
            sort: '-created'
          })
        })


        this.siembras = resultList.items
        this.totalItems = resultList.totalItems
        this.currentPage = resultList.page
        this.totalPages = resultList.totalPages

        // CORRECTO: Sanitizar con JSON.parse(JSON.stringify()) para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(this.siembras)));
        
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

        this.applySyncedCreate(tempId, tempSiembra)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'Siembras',
          data: enrichedData,
          tempId
        })

        uiFeedbackStore.hideLoading()
        return tempSiembra
      }


      try {
        const record = await pb.collection('Siembras').create(enrichedData)
        
        this.applySyncedCreate(record.id, record)
        
        // Invalidar caché de siembras paginadas
        tieredCache.invalidatePattern('siembras:page:')
        
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
        this.applySyncedUpdate(id, enrichedData)

        await syncStore.queueOperation({
          type: 'update',
          collection: 'Siembras',
          id,
          data: enrichedData
        })

        uiFeedbackStore.hideLoading()
        return this.getSiembraById(id)
      }


      try {
        const record = await pb.collection('Siembras').update(id, enrichedData, {
          expand: 'tipos_zonas'
        })

        
        this.applySyncedUpdate(id, record)
        
        // Invalidar caché de siembras paginadas
        tieredCache.invalidatePattern('siembras:page:')
        
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

        this.applySyncedDelete(id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'Siembras',
          id
        })

        uiFeedbackStore.hideLoading()
        return true
      }


      try {
        await pb.collection('Siembras').delete(id)
        
        // Limpiar estado local y caché
        this.applySyncedDelete(id)
        
        // Invalidar caché de siembras paginadas
        tieredCache.invalidatePattern('siembras:page:')
        
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
        const record = await pb.collection('Siembras').getOne(id, {
          expand: 'hacienda,zona'
        })
        const siembraIndex = this.siembras.findIndex((s) => s.id === id)
        if (siembraIndex !== -1) {
          this.siembras[siembraIndex] = record
        } else {
          this.siembras.push(record)
        }
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('siembras', JSON.parse(JSON.stringify(this.siembras)));
        return record
      }

      throw new Error('Siembra no encontrada y sin conexión')
    },

    async fetchSiembrasByProgramacion(programacionId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return this.siembras.filter(s => s.programaciones?.includes(programacionId))
      }
      return pb.collection('Siembras').getFullList({
        filter: `programaciones ~ "${programacionId}"`,
        sort: '-fecha_ejecucion'
      }).catch(() => [])
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('Siembras', tempId, newItem, this.siembras)
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'Siembras',
        tempId,
        realId,
        this.siembras
      )
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('Siembras', id, this.siembras)
    },

    /**
     * Analiza las dependencias de una siembra antes de eliminarla.
     * @param {string} siembraId ID de la siembra a analizar.
     * @returns {Object|null} Resultado del análisis clasificado por tipo y exclusividad.
     */
    async analyzeDependencies(siembraId) {
      if (!siembraId) return null;
      
      const uiFeedbackStore = useUiFeedbackStore();
      uiFeedbackStore.showLoading();
      
      try {
        // Consultas concurrentes para optimizar tiempo
        const [zonas, bitacora, programaciones, recordatorios] = await Promise.all([
          pb.collection('zonas').getFullList({ 
            filter: `siembra="${siembraId}"`, 
            fields: 'id,nombre' 
          }),
          pb.collection('bitacora').getFullList({ 
            filter: `siembras ~ "${siembraId}"`, 
            fields: 'id,actividad_realizada,siembras' 
          }),
          pb.collection('programaciones').getFullList({ 
            filter: `siembras ~ "${siembraId}"`, 
            fields: 'id,estado,siembras' 
          }),
          pb.collection('recordatorios').getFullList({ 
            filter: `siembras ~ "${siembraId}"`, 
            fields: 'id,siembras' 
          })
        ]);

        const analysis = {
          exclusive: [],
          shared: []
        };

        // Zonas son siempre exclusivas (relación 1:1 según esquema actual)
        zonas.forEach(z => analysis.exclusive.push({ id: z.id, name: z.nombre, type: 'zonas', currentSiembra: z.siembra }));

        // Clasificar Bitácora, Programaciones y Recordatorios
        const processItems = (items, type) => {
          items.forEach(item => {
            const isExclusive = item.siembras.length === 1 && item.siembras[0] === siembraId;
            if (isExclusive) {
              analysis.exclusive.push({ id: item.id, type, currentSiembras: item.siembras });
            } else {
              analysis.shared.push({ id: item.id, type, currentSiembras: item.siembras });
            }
          });
        };

        processItems(bitacora, 'bitacora');
        processItems(programaciones, 'programaciones');
        processItems(recordatorios, 'recordatorios');

        return analysis;
      } catch (error) {
        handleError(error, 'Error analizando dependencias de siembra');
        return null;
      } finally {
        uiFeedbackStore.hideLoading();
      }
    },

    /**
     * Ejecuta la eliminación inteligente de una siembra y sus dependencias.
     * @param {string} siembraId ID de la siembra.
     * @param {Object} analysisData Resultado de analyzeDependencies.
     * @param {Object} userActions Mapa de acciones ('delete' o 'detach') por tipo de elemento exclusivo.
     */
    async executeSmartDeletion(siembraId, analysisData, userActions = {}) {
      const syncStore = useSyncStore();
      const uiFeedbackStore = useUiFeedbackStore();

      if (!syncStore.isOnline) {
        uiFeedbackStore.showSnackbar('La eliminación compleja requiere conexión a internet', 'warning');
        return false;
      }

      uiFeedbackStore.showLoading();
      
      try {
        const exclusivePromises = analysisData.exclusive.map(item => {
          const action = userActions[item.type] || 'delete';
          
          if (action === 'delete') {
            return pb.collection(item.type).delete(item.id);
          } else {
            // Acción 'detach' para elementos exclusivos
            if (item.type === 'zonas') {
              return pb.collection('zonas').update(item.id, { siembra: null });
            } else {
              return pb.collection(item.type).update(item.id, {
                siembras: item.currentSiembras.filter(id => id !== siembraId)
              });
            }
          }
        });

        const sharedPromises = analysisData.shared.map(item => 
          pb.collection(item.type).update(item.id, {
            siembras: item.currentSiembras.filter(id => id !== siembraId)
          })
        );

        // Ejecutar limpieza de dependencias
        const results = await Promise.allSettled([...exclusivePromises, ...sharedPromises]);
        
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          logger.error('[SIEMBRAS_STORE] Fallos parciales en eliminación de dependencias:', failures);
          uiFeedbackStore.showSnackbar(`Error parcial: ${failures.length} elementos no pudieron procesarse. Abortando eliminación principal.`, 'error');
          return false;
        }

        // Eliminar registro maestro
        await pb.collection('Siembras').delete(siembraId);
        
        // Limpiar estado local y caché
        this.applySyncedDelete(siembraId);
        // Invalidar caché
        tieredCache.invalidatePattern('siembras:page:');
        
        await offlineGeoStorage.deleteSiembra(siembraId).catch(e => 
          logger.warn('[SIEMBRAS_STORE] Error eliminando de offlineGeoStorage:', e)
        );

        uiFeedbackStore.showSnackbar('Siembra y dependencias eliminadas con éxito', 'success');
        return true;
      } catch (error) {
        handleError(error, 'Error durante el proceso de eliminación inteligente');
        return false;
      } finally {
        uiFeedbackStore.hideLoading();
      }
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
