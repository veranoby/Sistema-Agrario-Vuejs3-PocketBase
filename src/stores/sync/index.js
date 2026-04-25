/**
 * index.js - Orquestador del módulo sync
 * Ensambla todos los submódulos y expone la API del store
 */

import { defineStore } from 'pinia'
import { cacheManager } from './cacheManager'
import { initNetworkMonitor } from './networkMonitor'
import { conflictResolver } from './conflictResolver'
import { createIdMapper } from './idMapper'
import { createSyncConfig } from './syncConfig'
import { createConflictUI } from './conflictUI'
import { createQueueProcessor } from './queueProcessor'
import { createOfflineFeatures } from './offlineFeatures'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'

const ALL_STORES = [
  useZonasStore,
  useSiembrasStore,
  useActividadesStore,
  useRecordatoriosStore,
  useProgramacionesStore,
  useBitacoraStore
]

const STORE_MAP = {
  zonas: useZonasStore,
  siembras: useSiembrasStore,
  actividades: useActividadesStore,
  recordatorios: useRecordatoriosStore,
  programaciones: useProgramacionesStore,
  bitacora: useBitacoraStore
}

export const useSyncStore = defineStore('sync', {
  state: () => ({
    isOnline: navigator.onLine,
    queue: cacheManager.get('syncQueue') || [],
    lastSyncTime: null,
    syncStatus: 'idle',
    initialized: false,
    errors: []
  }),

  actions: {
    async init() {
      if (this.initialized) return

      const snackbar = useSnackbarStore()
      const notify = (msg, type) => snackbar.showSnackbar(msg, type)

      // Inicializar módulos
      const { isOnline } = initNetworkMonitor((online) => {
        this.isOnline = online
        if (online && this.queue.length > 0) this.processPendingQueue()
      })

      this.idMapper = createIdMapper({ stores: ALL_STORES, cacheManager })
      this.syncConfig = createSyncConfig({ cacheManager })
      this.conflictUI = createConflictUI({ cacheManager })
      this.processor = createQueueProcessor({
        getStore: (name) => STORE_MAP[name]?.(),
        updateRefs: this.idMapper.updateRefs,
        saveCache: cacheManager.save,
        resolveConflict: conflictResolver.resolve,
        addConflict: this.conflictUI.addConflict,
        notify
      })
      this.offline = createOfflineFeatures({ stores: ALL_STORES, cacheManager })

      this.initialized = true
    },

    getStoreByCollectionName(name) {
      return STORE_MAP[name]?.()
    },

    async queueOperation(operation) {
      const item = {
        id: crypto.randomUUID(),
        collection: operation.collection,
        action: operation.type,
        data: operation.data,
        tempId: operation.type === 'create' ? this.idMapper.generateTempId() : null,
        timestamp: new Date().toISOString(),
        retries: 0,
        status: 'pending',
        priority: this.syncConfig.getPriority(operation.collection)
      }
      this.queue.push(item)
      cacheManager.save('syncQueue', this.queue)

      if (this.isOnline) await this.processPendingQueue()
      return item.tempId
    },

    async processPendingQueue() {
      if (this.syncStatus === 'syncing') return
      this.syncStatus = 'syncing'

      try {
        await this.processor.processQueue(this.queue)
        this.lastSyncTime = Date.now()
      } catch (error) {
        this.errors.push({ message: error.message, timestamp: Date.now() })
      } finally {
        this.syncStatus = 'idle'
      }
    }
  }
})
