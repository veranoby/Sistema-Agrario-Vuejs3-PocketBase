import { defineStore } from 'pinia';
import { pb } from '@/utils/pocketbase';
import { handleError } from '@/utils/errorHandler';
import { useSyncStore } from '@/stores/sync/index'
import { useAuthStore } from './authStore';
import { useHaciendaStore } from './haciendaStore';
import { useProgramacionesStore } from './programaciones';
import { useActividadesStore } from './actividadesStore';
import { getHandlerForTipo } from '@/utils/bitacora/bitacoraHandlers'
import { logger } from '@/utils/logger'
import { useAlertTriggers } from '@/composables/useAlertTriggers'
import { digitalSignature } from '@/services/digitalSignature'
import { locationCoordinator } from '@/services/locationCoordinator'
import { differenceInDays, format } from 'date-fns'

export const useBitacoraStore = defineStore('bitacora', {
  state: () => ({
    bitacoraEntries: [],
    isLoading: false,
    lastSync: null,
    pagination: {
      page: 1,
      perPage: 50,
      totalItems: 0,
      totalPages: 0,
      hasMore: false
    },
    filters: {
      hacienda: null,
      siembra_asociada: null,
      programacion_origen: null,
      actividad_realizada: null,
      fecha_desde: null,
      fecha_hasta: null
    }
  }),

  getters: {
    getBitacoraByProgramacion: (state) => (programacionId) => {
      return state.bitacoraEntries.filter(entry => entry.programacion_origen === programacionId);
    },
    getBitacoraBySiembra: (state) => (siembraId) => {
      return state.bitacoraEntries.filter(entry => entry.siembra_asociada === siembraId);
    },
    getEnrichedBitacoraEntries: (state) => {
      return [...state.bitacoraEntries].sort((a, b) => {
        const dateA = a.fecha_ejecucion ? new Date(a.fecha_ejecucion) : new Date(a.created);
        const dateB = b.fecha_ejecucion ? new Date(b.fecha_ejecucion) : new Date(b.created);
        return dateB - dateA;
      });
    },
    getEnrichedBitacoraBySiembra: (state) => (siembraId) => {
      if (!siembraId) return [];
      return state.bitacoraEntries
        .filter(entry => {
          if (entry.siembra_asociada === siembraId) return true;
          return entry.expand?.siembra_asociada?.id === siembraId;
        })
        .sort((a, b) => {
          const dateA = a.fecha_ejecucion ? new Date(a.fecha_ejecucion) : new Date(a.created);
          const dateB = b.fecha_ejecucion ? new Date(b.fecha_ejecucion) : new Date(b.created);
          return dateB - dateA;
        });
    },
    getEnrichedBitacoraByActividadRealizada: (state) => (actividadId) => {
      if (!actividadId) return [];
      return state.bitacoraEntries
        .filter(entry => {
          if (entry.actividad_realizada === actividadId) return true;
          return entry.expand?.actividad_realizada?.id === actividadId;
        })
        .sort((a, b) => {
          const dateA = a.fecha_ejecucion ? new Date(a.fecha_ejecucion) : new Date(a.created);
          const dateB = b.fecha_ejecucion ? new Date(b.fecha_ejecucion) : new Date(b.created);
          return dateB - dateA;
        });
    },
  },

  actions: {
    async init() {
      logger.debug('[BITACORA_STORE] Initializing...');
      const syncStore = useSyncStore();
      const haciendaStore = useHaciendaStore();

      const localData = syncStore.loadFromLocalStorage('bitacoraEntries');
      if (localData) {
        this.bitacoraEntries = localData;
        logger.debug('[BITACORA_STORE] Loaded from localStorage:', this.bitacoraEntries.length, 'entries.');
      }

      if (syncStore.isOnline && haciendaStore.mi_hacienda?.id) {
        try {
          await this.cargarBitacoraEntries(haciendaStore.mi_hacienda.id);
        } catch (error) {
          handleError(error, 'Error during initial fetch');
        }
      }
      logger.debug('[BITACORA_STORE] Initialization complete.');
    },

    async fetchBitacorasBySiembra(siembraId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return this.bitacoraEntries.filter(e => e.siembra_asociada === siembraId)
      }
      return pb.collection('bitacora').getFullList({
        filter: `siembra_asociada = "${siembraId}"`,
        sort: '-created'
      })
    },

    async fetchBitacorasByProgramacion(programacionId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return this.bitacoraEntries.filter(e => e.programacion_origen === programacionId)
      }
      return pb.collection('bitacora').getFullList({
        filter: `programacion_origen = "${programacionId}"`,
        sort: '-created'
      }).catch(() => [])
    },

    async cargarBitacoraEntries(haciendaId) {
      return this.fetchPage(1, 100, { hacienda: haciendaId });
    },

    async fetchPage(page = 1, perPage = 50, filters = {}) {
      const syncStore = useSyncStore();
      const haciendaStore = useHaciendaStore();
      
      const targetHacienda = filters.hacienda || haciendaStore.mi_hacienda?.id;
      
      if (!targetHacienda) {
        console.warn('[BITACORA_STORE] No haciendaId provided to fetchPage.');
        return { items: [], pagination: this.pagination };
      }
      
      logger.debug(`[BITACORA_STORE] Fetching page ${page} with ${perPage} items per page for hacienda: ${targetHacienda}`);
      this.isLoading = true;
      
      try {
        const filterParts = [`hacienda="${targetHacienda}"`];
        
        if (filters.siembra_asociada) {
          filterParts.push(`siembra_asociada="${filters.siembra_asociada}"`);
        }
        if (filters.programacion_origen) {
          filterParts.push(`programacion_origen="${filters.programacion_origen}"`);
        }
        if (filters.actividad_realizada) {
          filterParts.push(`actividad_realizada="${filters.actividad_realizada}"`);
        }
        if (filters.fecha_desde) {
          filterParts.push(`fecha_ejecucion>="${filters.fecha_desde}"`);
        }
        if (filters.fecha_hasta) {
          filterParts.push(`fecha_ejecucion<="${filters.fecha_hasta}"`);
        }
        
        const filterString = filterParts.join(' && ');
        
        const result = await pb.collection('bitacora').getList(page, perPage, {
          filter: filterString,
          sort: '-created',
          expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable"
        });
        
        this.pagination = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        };
        
        this.filters = { ...this.filters, ...filters };
        
        const entries = result.items.map(entry => ({...entry, _isTemp: false }));
        
        if (page === 1) {
          this.bitacoraEntries = entries;
        } else {
          this.bitacoraEntries = [...this.bitacoraEntries, ...entries];
        }
        
        this.lastSync = Date.now();
        syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        logger.debug(`[BITACORA_STORE] Fetched page ${page}: ${entries.length} items (Total: ${result.totalItems})`);
        
        return {
          items: entries,
          pagination: this.pagination
        };
      } catch (error) {
        handleError(error, 'Error cargando página de bitácora');
        return { items: [], pagination: this.pagination };
      } finally {
        this.isLoading = false;
      }
    },

    async loadNextPage() {
      if (!this.pagination.hasMore || this.isLoading) {
        return { items: [], pagination: this.pagination };
      }
      
      const nextPage = this.pagination.page + 1;
      return this.fetchPage(nextPage, this.pagination.perPage, this.filters);
    },

    async refreshPage() {
      return this.fetchPage(1, this.pagination.perPage, this.filters);
    },

    clearEntries() {
      this.bitacoraEntries = [];
      this.pagination = {
        page: 1,
        perPage: 50,
        totalItems: 0,
        totalPages: 0,
        hasMore: false
      };
      this.filters = {
        hacienda: null,
        siembra_asociada: null,
        programacion_origen: null,
        actividad_realizada: null,
        fecha_desde: null,
        fecha_hasta: null
      };
    },

    async crearBitacoraEntry(entryData) {
      logger.debug('[BITACORA_STORE] Attempting to create bitacora entry:', entryData);
      const syncStore = useSyncStore();
      const authStore = useAuthStore();
      const haciendaStore = useHaciendaStore();
      const actividadesStore = useActividadesStore();

      // NUEVO: Obtener handler y validar
      const handler = await getHandlerForTipo(
        entryData.actividad_realizada,
        actividadesStore
      )

      const validation = handler.validate(entryData.metricas || {})
      if (!validation.valid) {
        handleError(
          new Error(`Validación fallida: ${validation.errors.join(', ')}`),
          'Error validando entrada de bitácora'
        )
        return null
      }

      // NUEVO: Transformar métricas
      const transformedMetricas = handler.transform(entryData.metricas || {})

      const fullEntryData = {
        ...entryData,
        metricas: transformedMetricas.flat,
        hacienda: entryData.hacienda || haciendaStore.mi_hacienda?.id,
        user_responsable: entryData.user_responsable || authStore.user?.id,
      };

      // NUEVO: Auto-geolocalización
      if (!fullEntryData.gps && !fullEntryData.ubicacion) {
        try {
          const position = await locationCoordinator.getPosition()
          fullEntryData.gps = { lat: position.latitude, lng: position.longitude }
          logger.info('[BITACORA_STORE] Ubicación GPS capturada automáticamente')
        } catch (geoError) {
          logger.debug('[BITACORA_STORE] No se pudo capturar ubicación automática:', geoError.message)
        }
      }

      // NUEVO: Firmar antes de guardar
      let signatureData = null
      try {
        signatureData = await digitalSignature.sign({
          collection: 'bitacora',
          data: fullEntryData,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        logger.warn('[BITACORA_STORE] No se pudo firmar, continuando sin firma:', error)
      }

      fullEntryData.signature = signatureData

      if (!fullEntryData.hacienda || !fullEntryData.programacion_origen || !fullEntryData.actividad_realizada || !fullEntryData.fecha_ejecucion) {
          handleError(new Error('Datos incompletos para la entrada de bitácora.'), 'Error creando entrada de bitácora');
          return null;
      }

      if (!syncStore.isOnline) {
        logger.debug('[BITACORA_STORE] Offline mode: Creating temporary entry.');
        const tempId = syncStore.generateTempId();
        const tempEntry = {
          ...fullEntryData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true,
        };
        this.bitacoraEntries.unshift(tempEntry);
        syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);

        await syncStore.queueOperation({
          type: 'create',
          collection: 'bitacora',
          data: fullEntryData,
          tempId: tempId,
        });
        logger.debug('[BITACORA_STORE] Temporary entry created and queued:', tempEntry);
        
        const programacionesStore = useProgramacionesStore();
        programacionesStore.clearComplianceStateCache();
        
        return tempEntry;
      }

      logger.debug('[BITACORA_STORE] Online mode: Creating entry directly on PocketBase.');
      this.isLoading = true;
      try {
        const record = await pb.collection('bitacora').create(fullEntryData, {
          expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable"
        });
        const newEntry = {...record, _isTemp: false };
        this.bitacoraEntries.unshift(newEntry);
        syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        logger.debug('[BITACORA_STORE] Entry created on PocketBase (expanded) and added to store:', newEntry);

        // NUEVO: Post-procesamiento
        if (record) {
          await handler.postProcess(record, { actividadesStore })
        }

        const programacionesStore = useProgramacionesStore();
        programacionesStore.clearComplianceStateCache();

        return newEntry;
      } catch (error) {
        handleError(error, 'Error creando entrada de bitácora en PocketBase');
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async applySyncedCreate(tempId, realItem) {
      logger.debug(`[BITACORA_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`);
      const syncStore = useSyncStore();
      let itemIndex = this.bitacoraEntries.findIndex(entry => entry.id === tempId && entry._isTemp);

      try {
        const freshEnrichedItem = await pb.collection('bitacora').getOne(realItem.id, { 
            expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable" 
        });
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...freshEnrichedItem, _isTemp: false };
        } else {
            itemIndex = this.bitacoraEntries.findIndex(entry => entry.id === realItem.id);
            if (itemIndex !== -1) {
                this.bitacoraEntries[itemIndex] = { ...freshEnrichedItem, _isTemp: false };
            } else {
                this.bitacoraEntries.unshift({ ...freshEnrichedItem, _isTemp: false });
            }
        }
      } catch (e) {
        handleError(e, 'Error re-fetching enriched item for applySyncedCreate')
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...realItem, _isTemp: false };
        } else {
            if (!this.bitacoraEntries.some(entry => entry.id === realItem.id)) {
                this.bitacoraEntries.unshift({ ...realItem, _isTemp: false });
            }
        }
      }
      syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
      logger.debug('[BITACORA_STORE] Synced create applied, localStorage updated.');
      
      const programacionesStore = useProgramacionesStore();
      programacionesStore.clearComplianceStateCache();
    },

    async applySyncedUpdate(id, updatedItemData) {
      logger.debug(`[BITACORA_STORE] Applying synced update for id: ${id}`);
      const syncStore = useSyncStore();
      let itemIndex = this.bitacoraEntries.findIndex(entry => entry.id === id);

      try {
        const freshEnrichedItem = await pb.collection('bitacora').getOne(id, { 
            expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable" 
        });
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...freshEnrichedItem, _isTemp: false };
        } else {
            this.bitacoraEntries.unshift({ ...freshEnrichedItem, _isTemp: false });
        }
      } catch (e) {
        handleError(e, 'Error re-fetching enriched item for applySyncedUpdate')
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...this.bitacoraEntries[itemIndex], ...updatedItemData, _isTemp: false };
        } else {
            console.warn(`[BITACORA_STORE] Could not find item with id ${id} to apply fallback update.`);
        }
      }
      syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
      logger.debug('[BITACORA_STORE] Synced update applied, localStorage updated.');
      
      const programacionesStore = useProgramacionesStore();
      programacionesStore.clearComplianceStateCache();
    },

    applySyncedDelete(id) {
      logger.debug(`[BITACORA_STORE] Applying synced delete for id: ${id}`);
      const initialLength = this.bitacoraEntries.length;
      this.bitacoraEntries = this.bitacoraEntries.filter(entry => entry.id !== id);
      if (this.bitacoraEntries.length < initialLength) {
        useSyncStore().saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        logger.debug('[BITACORA_STORE] Synced delete applied.');
      } else {
        console.warn(`[BITACORA_STORE] Could not find item with id ${id} to apply delete.`);
      }
      
      const programacionesStore = useProgramacionesStore();
      programacionesStore.clearComplianceStateCache();
    },
    
    async updateBitacoraEntry(id, dataToUpdate) {
        const syncStore = useSyncStore();
        logger.debug(`[BITACORA_STORE] Attempting to update entry ${id}:`, dataToUpdate);

        const index = this.bitacoraEntries.findIndex(entry => entry.id === id);

        if (!syncStore.isOnline) {
            logger.debug('[BITACORA_STORE] Offline mode: Queuing update.');
            if (index !== -1) {
              this.bitacoraEntries[index] = { ...this.bitacoraEntries[index], ...dataToUpdate, updated: new Date().toISOString() };
            }
            syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            
            const programacionesStore = useProgramacionesStore();
            programacionesStore.clearComplianceStateCache();
            
            await syncStore.queueOperation({
                type: 'update',
                collection: 'bitacora',
                id: id,
                data: dataToUpdate,
            });
            return index !== -1 ? this.bitacoraEntries[index] : null;
        }

        logger.debug('[BITACORA_STORE] Online mode: Updating entry directly on PocketBase.');
        this.isLoading = true;
        try {
            const record = await pb.collection('bitacora').update(id, dataToUpdate);
            const updatedEntry = { ...record, _isTemp: false };
            if (index !== -1) {
                this.bitacoraEntries[index] = updatedEntry;
            } else {
                this.bitacoraEntries.unshift(updatedEntry);
            }
            syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            
            const programacionesStore = useProgramacionesStore();
            programacionesStore.clearComplianceStateCache();
            
            return updatedEntry;
        } catch (error) {
            handleError(error, `Error actualizando entrada de bitácora ${id} en PocketBase`);
            return null;
        } finally {
            this.isLoading = false;
        }
    },

    async deleteBitacoraEntry(id) {
        const syncStore = useSyncStore();
        logger.debug(`[BITACORA_STORE] Attempting to delete entry ${id}`);

        if (!syncStore.isOnline) {
            logger.debug('[BITACORA_STORE] Offline mode: Queuing delete.');
            const initialLength = this.bitacoraEntries.length;
            this.bitacoraEntries = this.bitacoraEntries.filter(entry => entry.id !== id);
            if (this.bitacoraEntries.length < initialLength) {
                syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
                
                const programacionesStore = useProgramacionesStore();
                programacionesStore.clearComplianceStateCache();
            } else {
                console.warn(`[BITACORA_STORE] Cannot delete locally: item with id ${id} not found.`);
                return false;
            }

            await syncStore.queueOperation({
                type: 'delete',
                collection: 'bitacora',
                id: id,
            });
            return true;
        }

        logger.debug('[BITACORA_STORE] Online mode: Deleting entry directly on PocketBase.');
        this.isLoading = true;
        try {
            await pb.collection('bitacora').delete(id);
            this.bitacoraEntries = this.bitacoraEntries.filter(entry => entry.id !== id);
            syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            
            const programacionesStore = useProgramacionesStore();
            programacionesStore.clearComplianceStateCache();
            
            return true;
        } catch (error) {
            handleError(error, `Error eliminando entrada de bitácora ${id} en PocketBase`);
            return false;
        } finally {
            this.isLoading = false;
        }
    }
  }
});

export async function checkBPACertificados(haciendaId) {
  if (!haciendaId) return

  const { triggerAlert } = useAlertTriggers()
  const bitacoraStore = useBitacoraStore()

  try {
    const { items } = await bitacoraStore.fetchPage(1, 100, {
      hacienda: haciendaId
    })

    if (!items || items.length === 0) return

    const hoy = new Date()

    for (const cert of items) {
      if (!cert.fecha_vencimiento) continue

      const fechaVenc = new Date(cert.fecha_vencimiento)
      const diasRestantes = differenceInDays(fechaVenc, hoy)

      if (diasRestantes > 0 && diasRestantes <= 7) {
        await triggerAlert('bpa_vencido', {
          producto: cert.producto || 'Certificado BPA',
          fechaVencimiento: format(fechaVenc, 'dd/MM/yyyy'),
          diasRestantes: String(diasRestantes),
          ubicacion: cert.ubicacion || 'No especificada',
          certificadoId: cert.id
        }, haciendaId)
      }
    }

  } catch (error) {
    handleError(error, 'Error en checkBPACertificados')
  }
}
