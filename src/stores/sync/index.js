/**
 * index.js - Orquestador del módulo sync
 * Ensambla todos los submódulos y expone la API del store
 */

import { defineStore } from 'pinia'
import { createCacheManager } from './cacheManager'
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

// Namespace aislado para sincronización
const syncCache = createCacheManager('agri_sync_')

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
    queue: syncCache.get('syncQueue') || [],
    lastSyncTime: null,
    syncStatus: 'idle',
    initialized: false,
    errors: []
  }),

  getters: {
    conflicts() {
      return this.conflictUI?.conflicts || []
    },
    conflictDialog() {
      return this.conflictUI?.showDialog || false
    }
  },

  actions: {
    async init() {
      if (this.initialized) return

      const snackbar = useSnackbarStore()
      const notify = (msg, type) => snackbar.showSnackbar(msg, type)

      // Network monitor
      const { isOnline, cleanup } = initNetworkMonitor((online) => {
        this.isOnline = online
        if (online && this.queue.length > 0) this.processPendingQueue()
      })
      this._networkCleanup = cleanup

      // Factories
      this.idMapper = createIdMapper({ stores: ALL_STORES, cacheManager: syncCache })
      this.syncConfig = createSyncConfig({ cacheManager: syncCache })
      this.conflictUI = createConflictUI({ cacheManager: syncCache })
      this.processor = createQueueProcessor({
        getStore: (name) => STORE_MAP[name]?.(),
        updateRefs: this.idMapper.updateRefs,
        saveCache: syncCache.save,
        resolveConflict: conflictResolver.resolve,
        addConflict: this.conflictUI.addConflict,
        notify
      })
      this.offline = createOfflineFeatures({ stores: ALL_STORES, cacheManager: syncCache })

      // RESTAURAR ESTADO
      this.queue = syncCache.get('syncQueue') || []

      const savedIdMap = syncCache.get('idMap')
      if (savedIdMap) {
        this.idMapper.setMap(savedIdMap)
      }

      this.initialized = true

      // Procesar cola pendiente si online
      if (navigator.onLine && this.queue.length > 0) {
        await this.processPendingQueue()
      }
    },

    getStoreByCollectionName(name) {
      return STORE_MAP[name]?.()
    },

    // === DELEGACIONES A FACTORIES ===

    // IDENTIDAD (idMapper)
    generateTempId() {
      if (!this.idMapper) return crypto.randomUUID()
      return this.idMapper.generateTempId()
    },
    isTempId(id) {
      if (!this.idMapper) return false
      return this.idMapper.isTempId(id)
    },
    getRealId(tempId) {
      if (!this.idMapper) return null
      return this.idMapper.getRealId(tempId)
    },

    // CONFIGURACIÓN (syncConfig)
    shouldSyncImmediately(col) {
      if (!this.syncConfig) return true
      return this.syncConfig.shouldSyncImmediately(col)
    },
    getCollectionPriority(col) {
      if (!this.syncConfig) return 5
      return this.syncConfig.getPriority(col)
    },
    configureSelectiveSync(config) {
      if (!this.syncConfig) return
      return this.syncConfig.updateConfig(config)
    },
    getSelectiveSyncConfig() {
      if (!this.syncConfig) return { enabled: false }
      return this.syncConfig.getConfig()
    },

    // CONFLICTOS UI (conflictUI)
    addConflict(conflict) {
      if (!this.conflictUI) return
      this.conflictUI.addConflict(conflict)
    },
    resolveConflict(id, resolution) {
      if (!this.conflictUI) return
      return this.conflictUI.resolveChoice(id, resolution)
    },
    clearResolvedConflicts() {
      if (!this.conflictUI) return
      this.conflictUI.clearResolved()
    },

    // OFFLINE FEATURES (offline)
    async searchOffline(query, options) {
      if (!this.offline) return []
      return this.offline.searchOffline(query, options)
    },
    async buildSearchIndex() {
      if (!this.offline) return
      return this.offline.buildIndex()
    },

    // MÉTRICAS (processor)
    getPerformanceMetrics() {
      if (!this.processor) return {}
      return this.processor.getMetrics()
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
      syncCache.save('syncQueue', this.queue)

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
        if (this.errors.length > 50) this.errors = this.errors.slice(-50)
      } finally {
        this.syncStatus = 'idle'
      }
    },

    $dispose() {
      this._networkCleanup?.()
    },

    // === LÓGICA DE COORDINACIÓN ===

    // PERSISTENCIA
    persistQueueState() {
      syncCache.save('syncQueue', this.queue)
      syncCache.save('idMap', this.idMapper.getMap())
    },

    loadFromLocalStorage(key) {
      return syncCache.get(key)
    },

    saveToLocalStorage(key, value) {
      syncCache.save(key, value)
    },

    // ACTUALIZACIÓN LOCAL
    updateLocalItem(collection, tempId, newItem, items) {
      if (!tempId || !newItem || !newItem.id) return false

      const index = items.findIndex(item => item.id === tempId)
      if (index === -1) {
        items.push({ ...newItem, _isTemp: false })
      } else {
        items[index] = { ...items[index], ...newItem, _isTemp: false }
      }

      this.idMapper.updateRefs(tempId, newItem.id)
      syncCache.save(collection, items)
      return true
    },

    // OPTIMISTIC UPDATES
    async optimisticOperation(operation, localUpdateFn) {
      try {
        const localResult = localUpdateFn()
        const tempId = await this.queueOperation(operation)
        return { ...localResult, tempId, isPending: true }
      } catch (error) {
        this.errors.push({ message: error.message, timestamp: Date.now() })
        if (this.errors.length > 50) this.errors = this.errors.slice(-50)
        throw error
      }
    },

    // REFRESH STORES
    async refreshAllStores() {
      for (const useStore of ALL_STORES) {
        try {
          const store = useStore()
          if (store?.initFromLocalStorage) store.initFromLocalStorage()
        } catch (e) {
          // store no disponible aún
        }
      }
    },

    // SYNC SELECTIVO
    async processDeferredSync() {
      const config = this.syncConfig.getConfig()
      if (!config.enabled) return

      const now = Date.now()
      if (now - (config.lastDeferredSync || 0) < config.deferredSyncInterval) return

      await this.processPendingQueue()
      this.syncConfig.updateConfig({ lastDeferredSync: now })
    },

    // CONFLICTOS RESOLUTION
    async forceLocalVersion(conflict) {
      const opIndex = this.queue.findIndex(
        op => op.tempId === conflict.tempId || op.id === conflict.id
      )
      if (opIndex !== -1) {
        this.queue[opIndex].status = 'pending'
        this.queue[opIndex].retries = 0
        this.persistQueueState()
        setTimeout(() => this.processPendingQueue(), 1000)
      }
    },

    async acceptServerVersion(conflict, serverData) {
      const store = this.getStoreByCollectionName(conflict.collection)
      if (!store) return

      if (conflict.type === 'update' && store.applySyncedUpdate) {
        await store.applySyncedUpdate(conflict.id, serverData || conflict.server)
      } else if (conflict.type === 'create' && store.applySyncedCreate) {
        await store.applySyncedCreate(conflict.tempId, serverData || conflict.server)
      }

      this.queue = this.queue.filter(
        op => op.tempId !== conflict.tempId && op.id !== conflict.id
      )
      this.persistQueueState()
    },

    // HISTORIAL (stubs)
    trackLocalChange() {
      // stub - implementar si se necesita
    },
    getChangeHistory() {
      return []
    },
    exportChangeHistory() {
      // stub
    },

    // OFFLINE REPORTS (stub)
    generateOfflineReport(type, params) {
      return null
    },

    // PREFETCH (stubs)
    async prefetchBasedOnPatterns() {
      // stub
    },
    async prefetchCollection(name) {
      // stub
    },
    getPrefetchedData() {
      return null
    },
    trackUserAction() {
      // stub
    },

    // BATCH DASHBOARD
    async batchInitializeDashboard() {
      const { useDashboardLoader } = await import('@/composables/useDashboardLoader')
      const loader = useDashboardLoader(ALL_STORES)
      return loader.loadDashboard()
    },

    // CLEANUP
    cleanupOldData() {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      this.errors = this.errors.filter(err => err.timestamp > oneDayAgo)
    }
  }
})
