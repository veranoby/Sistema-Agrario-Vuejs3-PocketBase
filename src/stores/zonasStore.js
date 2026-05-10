import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from '@/stores/sync/index'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'
import { calculateBpaStatus } from '@/utils/agriMetrics'
import { logger } from '@/utils/logger'
import { offlineGeoStorage } from '@/utils/offlineGeoStorage'
import { tieredCache, CacheKeys } from '@/utils/cacheManager'


export const useZonasStore = defineStore('zonas', {
  state: () => ({
    zonas: [],
    tiposZonas: [],
    loading: false,
    error: null,
    version: 1,
    lastSync: null,
    // Pagination state
    currentPage: 1,
    perPage: 20,
    totalItems: 0,
    totalPages: 0,
    // NUEVO: Filtros (faltaba)
    filters: {
      hacienda: null,
      siembra: null,
      programacion_origen: null,
      actividad_realizada: null,
      fecha_desde: null,
      fecha_hasta: null
    }
  }),

  persist: {
    key: 'zonas',
    storage: localStorage,
    paths: ['zonas', 'tiposZonas']
  },

  sync: {
    collectionName: 'zonas',
    stateProp: 'zonas'
  },

  getters: {
    promedioBpaEstado() {
      const haciendaStore = useHaciendaStore()
      const zonasHacienda = this.zonas.filter(
        (zona) => zona.hacienda === haciendaStore.mi_hacienda?.id
      )
      const totalBpaEstado = zonasHacienda.reduce((acc, zona) => acc + (zona.bpa_estado || 0), 0)
      return zonasHacienda.length ? Math.round(totalBpaEstado / zonasHacienda.length) : 0
    },
    getZonaById: (state) => (id) => {
      return state.zonas.find((z) => z.id === id)
    },

    // Pagination getters
    hasNextPage: (state) => state.currentPage < state.totalPages,
    hasPrevPage: (state) => state.currentPage > 1
  },

  actions: {
    async init() {
      this.loading = true;

      try {
        // INVALIDAR CACHE: Asegurar que traemos geometrías y GPS frescos
        await tieredCache.invalidatePattern('zonas:page:')

        await this.cargarTiposZonas()

        await this.cargarZonas() // Cargar zonas desde el servidor
      } catch (error) {
        handleError(error, 'Error al inicializar zonas')
      } finally {
        this.loading = false
      }
    },

    async cargarZonas() {
      // Local storage loading is now handled by initFromLocalStorage.
      // This method maintains backward compatibility by loading all items.
      return this.fetchPage(1, 100)
    },

    async fetchPage(page = 1, perPage = 20, filters = this.filters) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore();

      // CORRECTO: Usar safeFilters para evitar undefined
      const safeFilters = (filters && typeof filters === 'object') ? filters : (this.filters || {});
      const targetHacienda = safeFilters.hacienda || haciendaStore.mi_hacienda?.id;

      if (!targetHacienda) {
        console.warn('[ZONAS_STORE] No haciendaId provided to fetchPage.');
        this.loading = false; // Corregido: resetear loading
        return { items: [], pagination: this.pagination };
      }

      logger.debug(`[ZONAS_STORE] Fetching page ${page} with ${perPage} items per page for hacienda: ${targetHacienda}`);
      this.loading = true;

      try {
        const cacheConfig = CacheKeys.paginatedResult('zonas', page, safeFilters)

        const result = await tieredCache.fetchWithCache(cacheConfig, async () => {
          const filterParts = [`hacienda="${targetHacienda}"`];

          if (safeFilters.siembra) {
            filterParts.push(`siembra="${safeFilters.siembra}"`);
          }
          if (safeFilters.programacion_origen) {
            filterParts.push(`programacion_origen="${safeFilters.programacion_origen}"`);
          }
          if (safeFilters.actividad_realizada) {
            filterParts.push(`actividad_realizada="${safeFilters.actividad_realizada}"`);
          }
          if (safeFilters.fecha_desde) {
            filterParts.push(`fecha_ejecucion>"${safeFilters.fecha_desde}"`);
          }
          if (safeFilters.fecha_hasta) {
            filterParts.push(`fecha_ejecucion<"${safeFilters.fecha_hasta}"`);
          }

          const filterString = filterParts.join(' && ');

          console.log(`[TRACE-STORE] Solicitando zonas a PocketBase con filtro: ${filterString}`);
          const rawResult = await pb.collection('zonas').getList(page, perPage, {
            filter: filterString,
            sort: '-created',
            expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra"
          });

          console.log(`[TRACE-STORE] PocketBase devolvió ${rawResult.items?.length} items.`);
          if (rawResult.items?.length > 0) {
            const firstItem = rawResult.items[0];
            console.log(`[TRACE-STORE] Ejemplo Zona Cruda (${firstItem.nombre}):`, {
              id: firstItem.id,
              geometria_presente: !!firstItem.geometria,
              gps_presente: !!firstItem.gps,
              geometria_tipo: typeof firstItem.geometria,
              gps_tipo: typeof firstItem.gps
            });
          }

          return rawResult;
        })

        console.log(`[TRACE-STORE] Resultado final (post-cache): ${result.items?.length} items.`);

        this.pagination = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        };

        this.filters = { ...this.filters, ...safeFilters };

        const entries = result.items.map(entry => ({ ...entry, _isTemp: false }));

        if (page === 1) {
          this.zonas = entries;
        } else {
          this.zonas = [...this.zonas, ...entries];
        }


        this.lastSync = Date.now();
        // CORRECTO: Sanitizar con JSON.parse(JSON.stringify()) para IndexedDB
        syncStore.saveToLocalStorage('zonas', JSON.parse(JSON.stringify(this.zonas)));

        // Persistir geometrías en IndexedDB
        for (const zona of result.items) {
          if (zona.geometria || zona.gps) {
            await offlineGeoStorage.saveZona(zona).catch(e =>
              logger.warn('[ZONAS_STORE] Error guardando en offlineGeoStorage:', e)
            )
          }
        }

        logger.debug(`[ZONAS_STORE] Fetched page ${page}: ${entries.length} items (Total: ${result.totalItems})`);


        return {
          items: entries,
          pagination: this.pagination
        };
      } catch (error) {
        handleError(error, 'Error cargando página de zonas');
        return { items: [], pagination: this.pagination };
      } finally {
        this.loading = false;
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

    async crearZona(zonaData) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      // Enriquecer datos con contexto de hacienda
      const enrichedData = {
        ...zonaData,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version,
        bpa_estado: this.calculateBpaStatus(zonaData.datos_bpa || [])
      }

      if (!syncStore.isOnline) {
        // Usar optimistic operation
        return syncStore.optimisticOperation(
          {
            type: 'create',
            collection: 'zonas',
            data: enrichedData
          },
          () => {
            // Función de actualización local optimística usando el plugin
            const tempId = syncStore.generateTempId()
            const tempZona = {
              ...enrichedData,
              id: tempId,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              _isTemp: true
            }

            this.applySyncedCreate(tempId, tempZona)

            if (tempZona.geometria || tempZona.gps) {
              offlineGeoStorage.saveZona(tempZona).catch(e =>
                logger.warn('[ZONAS_STORE] Error guardando en offlineGeoStorage (offline):', e)
              )
            }

            return tempZona
          }

        )
      }

      // Online flow
      try {
        const record = await pb.collection('zonas').create(enrichedData, {
          expand: 'tipos_zonas'
        })

        // Usar acción inyectada por el plugin
        this.applySyncedCreate(record.id, record)

        // Invalidar cache de paginación para forzar recarga
        tieredCache.invalidatePattern('zonas:page:')

        if (record.geometria || record.gps) {
          await offlineGeoStorage.saveZona(record).catch(e =>
            logger.warn('[ZONAS_STORE] Error guardando en offlineGeoStorage:', e)
          )
        }

        return record
      } catch (error) {

        handleError(error, 'Error al crear zona')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async updateZona(id, updateData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      const zona = this.getZonaById(id)
      const enrichedData = {
        ...updateData,
        bpa_estado: this.calculateBpaStatus(updateData.datos_bpa),
        datos_bpa: updateData.datos_bpa || zona?.datos_bpa || [],
        metricas: updateData.metricas || zona?.metricas || {},
        version: this.version
      }

      if (!syncStore.isOnline) {
        // Usar optimistic operation
        return syncStore.optimisticOperation(
          {
            type: 'update',
            collection: 'zonas',
            id,
            data: enrichedData
          },
          () => {
            // Función de actualización local optimística usando el plugin
            this.applySyncedUpdate(id, enrichedData)

            const updated = this.getZonaById(id)
            if (updated && (updated.geometria || updated.gps)) {
              offlineGeoStorage.saveZona(updated).catch(e =>
                logger.warn('[ZONAS_STORE] Error actualizando en offlineGeoStorage (offline):', e)
              )
            }

            return updated
          }

        )
      }

      // Online flow
      try {
        const record = await pb.collection('zonas').update(id, enrichedData, {
          expand: 'tipos_zonas'
        })

        // Usar acción inyectada por el plugin
        this.applySyncedUpdate(id, record)

        // Invalidar cache de paginación para forzar recarga
        tieredCache.invalidatePattern('zonas:page:')

        if (record.geometria || record.gps) {
          await offlineGeoStorage.saveZona(record).catch(e =>
            logger.warn('[ZONAS_STORE] Error actualizando en offlineGeoStorage:', e)
          )
        }

        return record
      } catch (error) {

        handleError(error, 'Error al actualizar zona')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async eliminarZona(id) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el ID existe
      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de zona no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        // Verificar si la zona existe antes de eliminarla
        const zonaExiste = this.zonas.some((z) => z.id === id)
        if (!zonaExiste) {
          uiFeedbackStore.hideLoading()
          throw new Error(`No se encontró zona con ID: ${id}`)
        }

        // Usar optimistic operation
        return syncStore.optimisticOperation(
          {
            type: 'delete',
            collection: 'zonas',
            id
          },
          () => {
            // Función de actualización local optimística usando el plugin
            this.applySyncedDelete(id)

            offlineGeoStorage.deleteZona(id).catch(e =>
              logger.warn('[ZONAS_STORE] Error eliminando de offlineGeoStorage (offline):', e)
            )

            return true
          }

        )
      }

      try {
        await pb.collection('zonas').delete(id)

        // Usar acción inyectada por el plugin
        this.applySyncedDelete(id)

        await offlineGeoStorage.deleteZona(id).catch(e =>
          logger.warn('[ZONAS_STORE] Error eliminando de offlineGeoStorage:', e)
        )

        return true
      } catch (error) {

        handleError(error, 'Error al eliminar zona')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    calculateBpaStatus(datosBpa) {
      return calculateBpaStatus(datosBpa)
    },

    async cargarTiposZonas() {
      // Local storage loading is now handled by initFromLocalStorage.


      const syncStore = useSyncStore()
      if (this.tiposZonas.length > 0 && !syncStore.isOnline) {
        return this.tiposZonas;
      }

      try {
        const records = await pb.collection('tipos_zonas').getFullList({
          sort: 'nombre'
        })
        // markRaw: lookup data doesn't need deep reactivity
        this.tiposZonas = markRaw(records)
        // GUARDAR zonas en localStorage para uso offline
        useSyncStore().saveToLocalStorage('tiposZonas', JSON.parse(JSON.stringify(this.tiposZonas)))
      } catch (error) {
        handleError(error, 'Error al cargar tipos de zonas')
      }
    },

    async cargarZonasPorSiembras(siembraIds) {
      // const zonasStore = useZonasStore()
      this.loading = true;

      try {
        // Usar directamente el store de zonas para obtener las zonas filtradas
        return this.zonas.filter((zona) => siembraIds.includes(zona.siembra))
      } catch (error) {
        handleError(error, 'Error al cargar zonas por siembras')
        return []
      } finally {
        this.loading = false
      }
    },

    async cargarZonasPrecargadas() {
      // const zonasStore = useZonasStore()
      this.loading = true;

      try {
        // Filtrar zonas que no pertenecen a siembras
        const zonasFiltradas = this.zonas.filter(
          (zona) => !zona.siembra // Asegúrate de que la propiedad siembra esté configurada
        )

        return zonasFiltradas // Retornar las zonas precargadas
      } catch (error) {
        handleError(error, 'Error al cargar zonas precargadas')
        return []
      } finally {
        this.loading = false
      }
    },

    async updateZonaAvatar(zonaId, avatarFile) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      try {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const updatedZona = await pb.collection('zonas').update(zonaId, formData, {
          expand: 'tipos_zonas'
        })
        const index = this.zonas.findIndex((z) => z.id === updatedZona.id)
        if (index !== -1) {
          this.zonas[index] = updatedZona
        }
        return updatedZona
      } catch (error) {
        handleError(error, 'Error al actualizar el avatar de la zona')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('zonas', tempId, newItem, this.zonas, {
        referenceFields: ['zona', 'zonas'],
        metricFields: ['metricas']
      })
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem('zonas', tempId, realId, this.zonas, [
        'zona',
        'zonas'
      ])
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('zonas', id, this.zonas)
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore();
      // CORRECTO: Usar await para loadFromLocalStorage
      const localZonas = await syncStore.loadFromLocalStorage('zonas');
      // CORRECTO: Validar que sea array
      this.zonas = (localZonas && Array.isArray(localZonas)) ? localZonas : [];
      // CORRECTO: Usar await para loadFromLocalStorage
      const localTiposZonas = await syncStore.loadFromLocalStorage('tiposZonas');
      // CORRECTO: Validar que sea array
      this.tiposZonas = (localTiposZonas && Array.isArray(localTiposZonas)) ? markRaw(localTiposZonas) : [];
      console.log('[ZONAS_STORE] Initialized from localStorage. Zonas:', this.zonas.length, 'Tipos:', this.tiposZonas.length);
    }
  }
})
