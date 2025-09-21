import { defineStore } from 'pinia';
import { pb } from '@/utils/pocketbase';
import { handleError } from '@/utils/errorHandler';
import { useSyncStore } from './syncStore'; // For queueOperation and generateTempId
import { useAuthStore } from './authStore'; // For current user ID
import { useHaciendaStore } from './haciendaStore'; // For current hacienda ID
import { useProgramacionesStore } from './programacionesStore'; // For clearing compliance cache

export const useBitacoraStore = defineStore('bitacora', {
  state: () => ({
    bitacoraEntries: [],
    isLoading: false,
    lastSync: null, // Timestamp of last successful fetch from server
  }),

  getters: {
    // Example getter: Get entries by programacion_origen
    getBitacoraByProgramacion: (state) => (programacionId) => {
      return state.bitacoraEntries.filter(entry => entry.programacion_origen === programacionId);
    },
    // Example getter: Get entries by siembra_asociada
    getBitacoraBySiembra: (state) => (siembraId) => {
      return state.bitacoraEntries.filter(entry => entry.siembra_asociada === siembraId);
    },
    // Get all entries sorted by creation date (newest first) - Will be replaced by getEnrichedBitacoraEntries
    // sortedEntries: (state) => {
    //   return [...state.bitacoraEntries].sort((a, b) => new Date(b.created) - new Date(a.created));
    // }

    // New Enriched Getters
    getEnrichedBitacoraEntries: (state) => {
      return [...state.bitacoraEntries].sort((a, b) => {
        const dateA = a.fecha_ejecucion ? new Date(a.fecha_ejecucion) : new Date(a.created);
        const dateB = b.fecha_ejecucion ? new Date(b.fecha_ejecucion) : new Date(b.created);
        return dateB - dateA; // Newest first
      });
    },

    getEnrichedBitacoraBySiembra: (state) => (siembraId) => {
      if (!siembraId) return [];
      return state.bitacoraEntries
        .filter(entry => {
          // Check direct ID or expanded ID
          if (entry.siembra_asociada === siembraId) return true;
          return entry.expand?.siembra_asociada?.id === siembraId;
        })
        .sort((a, b) => {
          const dateA = a.fecha_ejecucion ? new Date(a.fecha_ejecucion) : new Date(a.created);
          const dateB = b.fecha_ejecucion ? new Date(b.fecha_ejecucion) : new Date(b.created);
          return dateB - dateA; // Newest first
        });
    },

    getEnrichedBitacoraByActividadRealizada: (state) => (actividadId) => {
      if (!actividadId) return [];
      return state.bitacoraEntries
        .filter(entry => {
          // Check direct ID or expanded ID
          if (entry.actividad_realizada === actividadId) return true;
          return entry.expand?.actividad_realizada?.id === actividadId;
        })
        .sort((a, b) => {
          const dateA = a.fecha_ejecucion ? new Date(a.fecha_ejecucion) : new Date(a.created);
          const dateB = b.fecha_ejecucion ? new Date(b.fecha_ejecucion) : new Date(b.created);
          return dateB - dateA; // Newest first
        });
    },
  },

  actions: {
    // Initialize store: load from localStorage, then fetch if online
    async init() {
      console.log('[BITACORA_STORE] Initializing...');
      const syncStore = useSyncStore();
      const haciendaStore = useHaciendaStore();

      const localData = syncStore.loadFromLocalStorage('bitacoraEntries');
      if (localData) {
        this.bitacoraEntries = localData;
        console.log('[BITACORA_STORE] Loaded from localStorage:', this.bitacoraEntries.length, 'entries.');
      }

      if (syncStore.isOnline && haciendaStore.mi_hacienda?.id) {
        try {
          await this.cargarBitacoraEntries(haciendaStore.mi_hacienda.id);
        } catch (error) {
          // handleError is likely called within cargarBitacoraEntries
          console.error('[BITACORA_STORE] Error during initial fetch:', error);
        }
      }
      console.log('[BITACORA_STORE] Initialization complete.');
    },

    // Fetch entries from PocketBase for the current hacienda
    async cargarBitacoraEntries(haciendaId) {
      if (!haciendaId) {
        console.warn('[BITACORA_STORE] No haciendaId provided to cargarBitacoraEntries.');
        return;
      }
      console.log(`[BITACORA_STORE] Fetching entries for hacienda: ${haciendaId}`);
      this.isLoading = true;
      try {
        // Simplificar consulta para debug - remover expand problemático
        const records = await pb.collection('bitacora').getFullList({
          filter: `hacienda="${haciendaId}"`,
          sort: '-created' // usar created en lugar de fecha_ejecucion por si no existe
          // expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable" // Comentado temporalmente
        });
        this.bitacoraEntries = records.map(entry => ({...entry, _isTemp: false })); 
        this.lastSync = Date.now();
        useSyncStore().saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        console.log('[BITACORA_STORE] Fetched and saved to localStorage:', this.bitacoraEntries.length, 'entries.');
      } catch (error) {
        handleError(error, 'Error cargando entradas de bitácora desde PocketBase');
      } finally {
        this.isLoading = false;
      }
    },

    // Create a new bitacora entry
    async crearBitacoraEntry(entryData) {
      console.log('[BITACORA_STORE] Attempting to create bitacora entry:', entryData);
      const syncStore = useSyncStore();
      const authStore = useAuthStore();
      const haciendaStore = useHaciendaStore();

      const fullEntryData = {
        ...entryData,
        hacienda: entryData.hacienda || haciendaStore.mi_hacienda?.id,
        user_responsable: entryData.user_responsable || authStore.user?.id,
        // Ensure all required fields for PB collection are present
      };

      // Validate essential fields (adjust as per your PB collection's requirements)
      if (!fullEntryData.hacienda || !fullEntryData.programacion_origen || !fullEntryData.actividad_realizada || !fullEntryData.fecha_ejecucion) {
          console.error('[BITACORA_STORE] Missing essential data for bitacora entry:', fullEntryData);
          handleError(new Error('Datos incompletos para la entrada de bitácora.'), 'Error creando entrada de bitácora');
          return null; // Or throw error
      }

      if (!syncStore.isOnline) {
        console.log('[BITACORA_STORE] Offline mode: Creating temporary entry.');
        const tempId = syncStore.generateTempId(); // Use syncStore's method
        const tempEntry = {
          ...fullEntryData,
          id: tempId,
          created: new Date().toISOString(), // Simulate PB fields
          updated: new Date().toISOString(),
          _isTemp: true,
        };
        this.bitacoraEntries.unshift(tempEntry); // Add to start of array
        syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);

        await syncStore.queueOperation({
          type: 'create',
          collection: 'bitacora', // Collection name in PocketBase
          data: fullEntryData, // Data without tempId for PB
          tempId: tempId,
        });
        console.log('[BITACORA_STORE] Temporary entry created and queued:', tempEntry);
        
        // Clear compliance state cache since bitacora entries have changed
        const programacionesStore = useProgramacionesStore();
        programacionesStore.clearComplianceStateCache();
        
        return tempEntry;
      }

      console.log('[BITACORA_STORE] Online mode: Creating entry directly on PocketBase.');
      this.isLoading = true;
      try {
        // Data sent to PB should not contain tempId or _isTemp
        const record = await pb.collection('bitacora').create(fullEntryData, {
          expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable"
        });
        const newEntry = {...record, _isTemp: false }; // record should now be expanded
        this.bitacoraEntries.unshift(newEntry);
        syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        console.log('[BITACORA_STORE] Entry created on PocketBase (expanded) and added to store:', newEntry);
        
        // Clear compliance state cache since bitacora entries have changed
        const programacionesStore = useProgramacionesStore();
        programacionesStore.clearComplianceStateCache();
        
        return newEntry;
      } catch (error) {
        handleError(error, 'Error creando entrada de bitácora en PocketBase');
        return null; // Or throw error
      } finally {
        this.isLoading = false;
      }
    },

    // Apply a synced creation from syncStore
    async applySyncedCreate(tempId, realItem) {
      console.log(`[BITACORA_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`);
      const syncStore = useSyncStore();
      let itemIndex = this.bitacoraEntries.findIndex(entry => entry.id === tempId && entry._isTemp);

      try {
        const freshEnrichedItem = await pb.collection('bitacora').getOne(realItem.id, { 
            expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable" 
        });
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...freshEnrichedItem, _isTemp: false };
        } else {
            // If not found by tempId, check if it exists by realId before adding
            itemIndex = this.bitacoraEntries.findIndex(entry => entry.id === realItem.id);
            if (itemIndex !== -1) {
                this.bitacoraEntries[itemIndex] = { ...freshEnrichedItem, _isTemp: false }; // Update if exists
                 console.log('[BITACORA_STORE] Synced item (create) already exists by realId, updated with fresh data.');
            } else {
                this.bitacoraEntries.unshift({ ...freshEnrichedItem, _isTemp: false }); // Add as new
                console.log('[BITACORA_STORE] Synced item (create) added as new with fresh data (was not found by tempId).');
            }
        }
      } catch (e) {
        console.error("[BITACORA_STORE] Error re-fetching enriched item for applySyncedCreate:", e);
        // Fallback to using the potentially less-expanded data from realItem
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...realItem, _isTemp: false };
        } else {
            // Fallback: if not found by tempId, add if it's not already present by realId
            if (!this.bitacoraEntries.some(entry => entry.id === realItem.id)) {
                this.bitacoraEntries.unshift({ ...realItem, _isTemp: false });
                console.log('[BITACORA_STORE] Synced item added as new (fallback, not found by tempId).');
            } else {
                 console.log('[BITACORA_STORE] Synced item already exists by realId (fallback).');
            }
        }
      }
      syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
      console.log('[BITACORA_STORE] Synced create applied, localStorage updated.');
      
      // Clear compliance state cache since bitacora entries have changed
      const programacionesStore = useProgramacionesStore();
      programacionesStore.clearComplianceStateCache();
    },

    async applySyncedUpdate(id, updatedItemData) {
      console.log(`[BITACORA_STORE] Applying synced update for id: ${id}`);
      const syncStore = useSyncStore();
      let itemIndex = this.bitacoraEntries.findIndex(entry => entry.id === id);

      try {
        const freshEnrichedItem = await pb.collection('bitacora').getOne(id, { 
            expand: "actividad_realizada,actividad_realizada.tipo_actividades,siembra_asociada,user_responsable" 
        });
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...freshEnrichedItem, _isTemp: false };
        } else {
            // If for some reason it's not in the list, add it.
            this.bitacoraEntries.unshift({ ...freshEnrichedItem, _isTemp: false });
            console.warn(`[BITACORA_STORE] Item with id ${id} not found for update, added with fresh data.`);
        }
      } catch (e) {
        console.error("[BITACORA_STORE] Error re-fetching enriched item for applySyncedUpdate:", e);
        // Fallback to merging updatedItemData
        if (itemIndex !== -1) {
            this.bitacoraEntries[itemIndex] = { ...this.bitacoraEntries[itemIndex], ...updatedItemData, _isTemp: false };
        } else {
            // If not found, cannot apply partial update. Log warning.
            console.warn(`[BITACORA_STORE] Could not find item with id ${id} to apply fallback update.`);
        }
      }
      syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
      console.log('[BITACORA_STORE] Synced update applied, localStorage updated.');
      
      // Clear compliance state cache since bitacora entries have changed
      const programacionesStore = useProgramacionesStore();
      programacionesStore.clearComplianceStateCache();
    },

    // Apply a synced delete from syncStore
    applySyncedDelete(id) {
      console.log(`[BITACORA_STORE] Applying synced delete for id: ${id}`);
      const initialLength = this.bitacoraEntries.length;
      this.bitacoraEntries = this.bitacoraEntries.filter(entry => entry.id !== id);
      if (this.bitacoraEntries.length < initialLength) {
        useSyncStore().saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        console.log('[BITACORA_STORE] Synced delete applied.');
      } else {
        console.warn(`[BITACORA_STORE] Could not find item with id ${id} to apply delete.`);
      }
      
      // Clear compliance state cache since bitacora entries have changed
      const programacionesStore = useProgramacionesStore();
      programacionesStore.clearComplianceStateCache();
    },
    
    // Placeholder for direct online update if needed, with offline queuing
    async updateBitacoraEntry(id, dataToUpdate) {
        const syncStore = useSyncStore();
        console.log(`[BITACORA_STORE] Attempting to update entry ${id}:`, dataToUpdate);

        if (!syncStore.isOnline) {
            console.log('[BITACORA_STORE] Offline mode: Queuing update.');
            // Update locally first
            this.bitacoraEntries[index] = { ...this.bitacoraEntries[index], ...dataToUpdate, updated: new Date().toISOString() };
            syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            
            // Clear compliance state cache since bitacora entries have changed
            const programacionesStore = useProgramacionesStore();
            programacionesStore.clearComplianceStateCache();
            
            await syncStore.queueOperation({
                type: 'update',
                collection: 'bitacora',
                id: id, // Real ID, assuming it's a synced item or tempId if not yet synced (though update usually implies synced)
                data: dataToUpdate,
            });
            return this.bitacoraEntries[index];
        }

        console.log('[BITACORA_STORE] Online mode: Updating entry directly on PocketBase.');
        this.isLoading = true;
        try {
            const record = await pb.collection('bitacora').update(id, dataToUpdate);
            const updatedEntry = { ...record, _isTemp: false };
            const index = this.bitacoraEntries.findIndex(entry => entry.id === id);
            if (index !== -1) {
                this.bitacoraEntries[index] = updatedEntry;
            } else {
                this.bitacoraEntries.unshift(updatedEntry); // Add if not found (should ideally exist)
            }
            syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            
            // Clear compliance state cache since bitacora entries have changed
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

    // Placeholder for direct online delete if needed, with offline queuing
    async deleteBitacoraEntry(id) {
        const syncStore = useSyncStore();
        console.log(`[BITACORA_STORE] Attempting to delete entry ${id}`);

        if (!syncStore.isOnline) {
            console.log('[BITACORA_STORE] Offline mode: Queuing delete.');
            // Remove locally first
            const initialLength = this.bitacoraEntries.length;
            this.bitacoraEntries = this.bitacoraEntries.filter(entry => entry.id !== id);
            if (this.bitacoraEntries.length < initialLength) {
                syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
                
                // Clear compliance state cache since bitacora entries have changed
                const programacionesStore = useProgramacionesStore();
                programacionesStore.clearComplianceStateCache();
            } else {
                console.warn(`[BITACORA_STORE] Cannot delete locally: item with id ${id} not found.`);
                // Do not queue if item doesn't exist locally
                return false;
            }

            await syncStore.queueOperation({
                type: 'delete',
                collection: 'bitacora',
                id: id,
            });
            return true;
        }

        console.log('[BITACORA_STORE] Online mode: Deleting entry directly on PocketBase.');
        this.isLoading = true;
        try {
            await pb.collection('bitacora').delete(id);
            this.bitacoraEntries = this.bitacoraEntries.filter(entry => entry.id !== id);
            syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            
            // Clear compliance state cache since bitacora entries have changed
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
