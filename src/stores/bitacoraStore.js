import { defineStore } from 'pinia';
import { pb } from '@/utils/pocketbase';
import { handleError } from '@/utils/errorHandler';
import { useSyncStore } from '@/stores/sync/index'
import { useAuthStore } from './authStore';
import { useHaciendaStore } from './haciendaStore';

import { useActividadesStore } from './actividadesStore';
import { getHandlerForTipo } from '@/utils/bitacora/bitacoraHandlers'
import { logger } from '@/utils/logger'
import { useAlertTriggers } from '@/composables/useAlertTriggers'
import { digitalSignature } from '@/services/digitalSignature'
import { locationCoordinator } from '@/services/locationCoordinator'
import { differenceInDays, format } from 'date-fns'
import { autocompleteBitacora } from '@/services/aiService'
import eventBus, { EVENTS } from '@/utils/eventBus'

// Helpers de Mapeo Backend <-> Frontend
function mapToFrontend(entry) {
  if (!entry) return entry;
  const mapped = { ...entry };
  
  if (mapped.fecha) mapped.fecha_ejecucion = mapped.fecha;
  if (mapped.actividades) mapped.actividad_realizada = mapped.actividades;
  if (mapped.estado) mapped.estado_ejecucion = mapped.estado;
  if (mapped.programaciones) mapped.programacion_origen = mapped.programaciones;
  if (mapped.user_created) mapped.user_responsable = mapped.user_created;

  if (mapped.expand && mapped.expand.actividades) {
    mapped.expand.actividad_realizada = mapped.expand.actividades;
  }
  if (mapped.expand && mapped.expand.programaciones) {
    mapped.expand.programacion_origen = mapped.expand.programaciones;
  }
  if (mapped.expand && mapped.expand.user_created) {
    mapped.expand.user_responsable = mapped.expand.user_created;
  }
  
  return mapped;
}

function mapToBackend(entryData) {
  const payload = { ...entryData };
  
  if (payload.fecha_ejecucion) { payload.fecha = payload.fecha_ejecucion; delete payload.fecha_ejecucion; }
  if (payload.actividad_realizada) { payload.actividades = payload.actividad_realizada; delete payload.actividad_realizada; }
  if (payload.estado_ejecucion) { payload.estado = payload.estado_ejecucion; delete payload.estado_ejecucion; }
  if (payload.programacion_origen) { payload.programaciones = payload.programacion_origen; delete payload.programacion_origen; }
  if (payload.user_responsable) { payload.user_created = payload.user_responsable; delete payload.user_responsable; }
  
  // Clean up fields not in DB to prevent errors
  delete payload.fotos;
  delete payload.trabajadores_involucrados;
  
  return payload;
}

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
      siembras: null,
      programacion_origen: null,
      actividad_realizada: null,
      fecha_desde: null,
      fecha_hasta: null
    }
  }),

  sync: {
    collectionName: 'bitacora',
    stateProp: 'bitacoraEntries',
    hooks: {
      onCreate: function() {
        eventBus.emit(EVENTS.BITACORA_UPDATED);
      },
      onUpdate: function() {
        eventBus.emit(EVENTS.BITACORA_UPDATED);
      },
      onDelete: function() {
        eventBus.emit(EVENTS.BITACORA_UPDATED);
      }
    }
  },

  getters: {
    getBitacoraByProgramacion: (state) => (programacionId) => {
      return state.bitacoraEntries.filter(entry => entry.programacion_origen === programacionId);
    },
    getBitacoraBySiembra: (state) => (siembraId) => {
      return state.bitacoraEntries.filter(entry => 
        (entry.siembras && Array.isArray(entry.siembras) && entry.siembras.includes(siembraId)) ||
        entry.siembras === siembraId
      );
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
          const hasDirectRef = (entry.siembras && Array.isArray(entry.siembras) && entry.siembras.includes(siembraId)) || entry.siembras === siembraId;
          if (hasDirectRef) return true;
          
          const expandedSiembras = entry.expand?.siembras;
          if (Array.isArray(expandedSiembras)) {
            return expandedSiembras.some(s => s.id === siembraId);
          }
          return expandedSiembras?.id === siembraId;
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

      const localData = await syncStore.loadFromLocalStorage('bitacoraEntries');
      if (localData && Array.isArray(localData)) {
        this.bitacoraEntries = localData;
        logger.debug('[BITACORA_STORE] Loaded from localStorage:', this.bitacoraEntries.length, 'entries.');
      } else {
        this.bitacoraEntries = [];
        logger.warn('[BITACORA_STORE] Invalid local data for bitacoraEntries, initializing empty array');
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
        return this.bitacoraEntries.filter(e => {
          if (Array.isArray(e.siembras)) return e.siembras.includes(siembraId);
          return e.siembras === siembraId;
        })
      }
      return pb.collection('bitacora').getFullList({
        filter: `siembras ~ "${siembraId}"`,
        sort: '-created'
      }).then(list => list.map(mapToFrontend))
    },

    async fetchBitacorasByProgramacion(programacionId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return this.bitacoraEntries.filter(e => e.programacion_origen === programacionId)
      }
      return pb.collection('bitacora').getFullList({
        filter: `programaciones = "${programacionId}"`,
        sort: '-created'
      }).then(list => list.map(mapToFrontend)).catch(() => [])
    },

    async cargarBitacoraEntries(haciendaId) {
      return this.fetchPage(1, 100, { hacienda: haciendaId });
    },

    async fetchPage(page = 1, perPage = 50, filters = this.filters) {
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
        
        if (filters.siembras) {
          filterParts.push(`siembras ~ "${filters.siembras}"`);
        }
        if (filters.programacion_origen) {
          filterParts.push(`programaciones="${filters.programacion_origen}"`);
        }
        if (filters.actividad_realizada) {
          filterParts.push(`actividades="${filters.actividad_realizada}"`);
        }
        if (filters.fecha_desde) {
          filterParts.push(`fecha>"${filters.fecha_desde}"`);
        }
        if (filters.fecha_hasta) {
          filterParts.push(`fecha<"${filters.fecha_hasta}"`);
        }
        
        const filterString = filterParts.join(' && ');
        
        const result = await pb.collection('bitacora').getList(page, perPage, {
          filter: filterString,
          sort: '-created',
          expand: "actividades,actividades.tipo_actividades,siembras,zonas,programaciones,user_created"
        });
        
        this.pagination = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        };
        
        this.filters = { ...this.filters, ...filters };
        
        const entries = result.items.map(entry => ({...mapToFrontend(entry), _isTemp: false }));
        
        if (page === 1) {
          this.bitacoraEntries = entries;
        } else {
          this.bitacoraEntries = [...this.bitacoraEntries, ...entries];
        }
        
        this.lastSync = Date.now();
        syncStore.saveToLocalStorage('bitacoraEntries', JSON.parse(JSON.stringify(this.bitacoraEntries)));
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
        siembras: null,
        programacion_origen: null,
        actividad_realizada: null,
        fecha_desde: null,
        fecha_hasta: null
      };
    },

    async autocompleteEntry(informalInput, metricasConfig) {
      try {
        logger.info('[BITACORA_STORE] Solicitando autocompletado de IA...')
        const result = await autocompleteBitacora(informalInput, metricasConfig)
        return result
      } catch (error) {
        logger.error('[BITACORA_STORE] Error en autocompletado IA:', error)
        throw error
      }
    },

    async crearBitacoraEntry(entryData) {
      logger.debug('[BITACORA_STORE] Attempting to create bitacora entry:', entryData);
      const syncStore = useSyncStore();
      const authStore = useAuthStore();
      const haciendaStore = useHaciendaStore();
      const actividadesStore = useActividadesStore();

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

      const transformedMetricas = handler.transform(entryData.metricas || {})

      const fullEntryData = {
        ...entryData,
        metricas: transformedMetricas.flat,
        hacienda: entryData.hacienda || haciendaStore.mi_hacienda?.id,
        user_responsable: entryData.user_responsable || authStore.user?.id,
      };

      if (!fullEntryData.gps && !fullEntryData.ubicacion) {
        try {
          const position = await locationCoordinator.getPosition()
          fullEntryData.gps = { lat: position.latitude, lng: position.longitude }
          logger.info('[BITACORA_STORE] Ubicación GPS capturada automáticamente')
        } catch (geoError) {
          logger.debug('[BITACORA_STORE] No se pudo capturar ubicación automática:', geoError.message)
        }
      }

      let signatureData = null
      if (entryData.signature && entryData.signature.signature) {
        logger.info('[BITACORA_STORE] Bypass de firma automática: usando firma provista por UI')
        signatureData = entryData.signature
      } else {
        try {
          signatureData = await digitalSignature.sign({
            collection: 'bitacora',
            data: fullEntryData,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          logger.warn('[BITACORA_STORE] No se pudo firmar, continuando sin firma:', error)
        }
      }

      fullEntryData.signature = signatureData;

      if (!fullEntryData.hacienda || !fullEntryData.actividad_realizada || !fullEntryData.fecha_ejecucion) {
          handleError(new Error('Datos incompletos para la entrada de bitácora.'), 'Error creando entrada de bitácora');
          return null;
      }

      const backendPayload = mapToBackend(fullEntryData);

      if (!syncStore.isOnline) {
        logger.debug('[BITACORA_STORE] Offline mode: Creating temporary entry.');
        const tempId = syncStore.generateTempId();
        const tempEntry = {
          ...mapToFrontend(backendPayload),
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true,
        };
        this.applySyncedCreate(tempId, tempEntry);

        await syncStore.queueOperation({
          type: 'create',
          collection: 'bitacora',
          data: backendPayload,
          tempId: tempId,
        });
        logger.debug('[BITACORA_STORE] Temporary entry created and queued:', tempEntry);
        
        eventBus.emit(EVENTS.BITACORA_UPDATED);
        
        return tempEntry;
      }

      logger.debug('[BITACORA_STORE] Online mode: Creating entry directly on PocketBase.');
      this.isLoading = true;
      try {
        const record = await pb.collection('bitacora').create(backendPayload, {
          expand: "actividades,actividades.tipo_actividades,siembras,zonas,programaciones,user_created"
        });
        
        const mappedRecord = mapToFrontend(record);
        this.applySyncedCreate(mappedRecord.id, mappedRecord);
        
        logger.debug('[BITACORA_STORE] Entry created on PocketBase (expanded) and added to store:', mappedRecord);

        if (mappedRecord) {
          await handler.postProcess(mappedRecord, { actividadesStore })
        }

        eventBus.emit(EVENTS.BITACORA_UPDATED);

        return mappedRecord;
      } catch (error) {
        handleError(error, 'Error creando entrada de bitácora en PocketBase');
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    
    async updateBitacoraEntry(id, dataToUpdate) {
        const syncStore = useSyncStore();
        logger.debug(`[BITACORA_STORE] Attempting to update entry ${id}:`, dataToUpdate);

        const index = this.bitacoraEntries.findIndex(entry => entry.id === id);
        const backendPayload = mapToBackend(dataToUpdate);

        if (!syncStore.isOnline) {
            logger.debug('[BITACORA_STORE] Offline mode: Queuing update.');
            this.applySyncedUpdate(id, dataToUpdate);
            eventBus.emit(EVENTS.BITACORA_UPDATED);
            await syncStore.queueOperation({
                type: 'update',
                collection: 'bitacora',
                id: id,
                data: backendPayload,
            });
            return index !== -1 ? this.bitacoraEntries[index] : null;
        }

        logger.debug('[BITACORA_STORE] Online mode: Updating entry directly on PocketBase.');
        this.isLoading = true;
        try {
            const record = await pb.collection('bitacora').update(id, backendPayload);
            const mappedRecord = mapToFrontend(record);
            this.applySyncedUpdate(id, mappedRecord);
            eventBus.emit(EVENTS.BITACORA_UPDATED);
            return mappedRecord;
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
            this.applySyncedDelete(id);
            eventBus.emit(EVENTS.BITACORA_UPDATED);
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
            this.applySyncedDelete(id);
            eventBus.emit(EVENTS.BITACORA_UPDATED);
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
  if (!haciendaId) return;

  const { triggerAlert } = useAlertTriggers()
  const bitacoraStore = useBitacoraStore()

  try {
    const { items } = await bitacoraStore.fetchPage(1, 100, {
      hacienda: haciendaId
    })

    if (!items || items.length === 0) return;

    const hoy = new Date()

    for (const cert of items) {
      if (!cert.fecha_vencimiento) continue;

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
