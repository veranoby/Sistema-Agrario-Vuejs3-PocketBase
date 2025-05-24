import { defineStore } from 'pinia';
import { pb } from '@/utils/pocketbase';
import { handleError } from '@/utils/errorHandler';
import { useSyncStore } from './syncStore'; // For queueOperation and generateTempId
import { useAuthStore } from './authStore'; // For current user ID
import { useHaciendaStore } from './haciendaStore'; // For current hacienda ID

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
    // Get all entries sorted by creation date (newest first)
    sortedEntries: (state) => {
      return [...state.bitacoraEntries].sort((a, b) => new Date(b.created) - new Date(a.created));
    }
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
        const records = await pb.collection('bitacora').getFullList({
          filter: `hacienda="${haciendaId}"`,
          sort: '-created', // newest first
          // Consider expanding relations if needed directly on load, e.g., expand: 'actividad_realizada,siembra_asociada'
        });
        this.bitacoraEntries = records.map(entry => ({...entry, _isTemp: false })); // Ensure no old temp flags
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
        return tempEntry;
      }

      console.log('[BITACORA_STORE] Online mode: Creating entry directly on PocketBase.');
      this.isLoading = true;
      try {
        // Data sent to PB should not contain tempId or _isTemp
        const record = await pb.collection('bitacora').create(fullEntryData);
        const newEntry = {...record, _isTemp: false };
        this.bitacoraEntries.unshift(newEntry);
        syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        console.log('[BITACORA_STORE] Entry created on PocketBase and added to store:', newEntry);
        return newEntry;
      } catch (error) {
        handleError(error, 'Error creando entrada de bitácora en PocketBase');
        return null; // Or throw error
      } finally {
        this.isLoading = false;
      }
    },

    // Apply a synced creation from syncStore
    applySyncedCreate(tempId, realItem) {
      console.log(`[BITACORA_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`);
      const index = this.bitacoraEntries.findIndex(entry => entry.id === tempId && entry._isTemp);
      if (index !== -1) {
        this.bitacoraEntries[index] = { ...realItem, _isTemp: false };
        useSyncStore().saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        console.log('[BITACORA_STORE] Synced create applied.');
      } else {
        // If not found by tempId (e.g., page reloaded before sync completed but after queue processed),
        // add if it's not already present by realId (to avoid duplicates)
        if (!this.bitacoraEntries.some(entry => entry.id === realItem.id)) {
            this.bitacoraEntries.unshift({ ...realItem, _isTemp: false });
            useSyncStore().saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            console.log('[BITACORA_STORE] Synced item added as new (was not found by tempId).');
        } else {
            console.log('[BITACORA_STORE] Synced item already exists by realId.');
        }
      }
    },

    // Apply a synced update from syncStore
    applySyncedUpdate(id, updatedItemData) {
      console.log(`[BITACORA_STORE] Applying synced update for id: ${id}`);
      const index = this.bitacoraEntries.findIndex(entry => entry.id === id);
      if (index !== -1) {
        // Merge carefully: updatedItemData might be partial
        this.bitacoraEntries[index] = { ...this.bitacoraEntries[index], ...updatedItemData, _isTemp: false };
        useSyncStore().saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
        console.log('[BITACORA_STORE] Synced update applied.');
      } else {
         console.warn(`[BITACORA_STORE] Could not find item with id ${id} to apply update.`);
         // Optionally, fetch it if critical, or add if it's a new item not yet in local store
         // For now, just log.
      }
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
    },
    
    // Placeholder for direct online update if needed, with offline queuing
    async updateBitacoraEntry(id, dataToUpdate) {
        const syncStore = useSyncStore();
        console.log(`[BITACORA_STORE] Attempting to update entry ${id}:`, dataToUpdate);

        if (!syncStore.isOnline) {
            console.log('[BITACORA_STORE] Offline mode: Queuing update.');
            // Update locally first
            const index = this.bitacoraEntries.findIndex(entry => entry.id === id);
            if (index !== -1) {
                this.bitacoraEntries[index] = { ...this.bitacoraEntries[index], ...dataToUpdate, updated: new Date().toISOString() };
                syncStore.saveToLocalStorage('bitacoraEntries', this.bitacoraEntries);
            } else {
                 console.warn(`[BITACORA_STORE] Cannot update locally: item with id ${id} not found.`);
                 // Do not queue if item doesn't exist locally
                 return null;
            }
            
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
