/**
 * index.js - Orquestador del módulo sync
 * Ensambla todos los submódulos y expone la API del store
 */

import { defineStore } from 'pinia'
import { tieredCache } from '@/utils/cacheManager'
import { digitalSignature } from '@/services/digitalSignature'
import { logger } from '@/utils/logger'
import { initNetworkMonitor } from './networkMonitor'
import { conflictResolver, createIdMapper, createSyncConfig } from './core'
import { createConflictUI } from './conflictUI'
import { createQueueProcessor } from './queueProcessor'
import { createOfflineFeatures } from './offlineFeatures'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programaciones'
import { useBitacoraStore } from '@/stores/bitacoraStore'

// STORE_MAP con lazy resolution - sin ciclo de dependencia
const STORE_MAP = {
  zonas: () => useZonasStore(),
  siembras: () => useSiembrasStore(),
  actividades: () => useActividadesStore(),
  recordatorios: () => useRecordatoriosStore(),
  programaciones: () => useProgramacionesStore(),
  bitacora: () => useBitacoraStore()
}

const ALL_STORES = [
  useZonasStore,
  useSiembrasStore,
  useActividadesStore,
  useRecordatoriosStore,
  useProgramacionesStore,
  useBitacoraStore
]

// Namespace aislado para sincronización utilizando TieredCache
const syncCache = {
  save: (key, data) => tieredCache.setToLevel(`agri_sync_${key}`, data, 'l2'),
  get: (key) => tieredCache.getFromLevel(`agri_sync_${key}`, 'l2'),
  remove: (key) => tieredCache.invalidateAcrossLevels(`agri_sync_${key}`),
  clear: () => tieredCache.clear()
}

export const useSyncStore = defineStore('sync', {
  state: () => ({
    isOnline: navigator.onLine,
    queue: (() => {
      try {
        const q = localStorage.getItem('agri_syncQueue')
        return q ? JSON.parse(q) : []
      } catch (e) {
        return []
      }
    })(),
    lastSyncTime: null,
    syncStatus: 'idle',
    initialized: false,
    errors: []
  }),

  getters: {
    conflictDialog() {
      return this.conflictUI?.showDialog || false
    }
  },

  actions: {
    /**
     * Resuelve un store de forma dinámica para evitar ciclos de dependencia.
     * @param {string} name - Nombre de la colección/store
     */
    async resolveStore(name) {
      const map = {
        zonas: () => import('@/stores/zonasStore'),
        siembras: () => import('@/stores/siembrasStore'),
        actividades: () => import('@/stores/actividadesStore'),
        recordatorios: () => import('@/stores/recordatoriosStore'),
        programaciones: () => import('@/stores/programaciones'),
        bitacora: () => import('@/stores/bitacoraStore'),
        finanzas: () => import('@/stores/finanzaStore'),
        Haciendas: () => import('@/stores/haciendaStore'),
        users: () => import('@/stores/userStore')
      }
      if (!map[name]) return null
      const module = await map[name]()
      const hookName = Object.keys(module).find(k => k.startsWith('use'))
      return module[hookName]()
    },

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

      // Cargar stores críticos para idMapper
      const storeModules = await Promise.all([
        import('@/stores/zonasStore'),
        import('@/stores/siembrasStore'),
        import('@/stores/actividadesStore'),
        import('@/stores/recordatoriosStore'),
        import('@/stores/programaciones'),
        import('@/stores/bitacoraStore')
      ])
      const stores = storeModules.map(m => m[Object.keys(m).find(k => k.startsWith('use'))]())

      // Factories
      this.idMapper = createIdMapper({ stores, cacheManager: syncCache })
      this.syncConfig = createSyncConfig({ cacheManager: syncCache })
      this.conflictUI = createConflictUI({ cacheManager: syncCache })
      this.processor = createQueueProcessor({
        getStore: async (name) => await this.resolveStore(name),
        updateRefs: this.idMapper.updateRefs,
        saveCache: syncCache.save,
        resolveConflict: conflictResolver.resolve,
        addConflict: this.conflictUI.addConflict,
        notify
      })
      this.offline = createOfflineFeatures({ stores, cacheManager: syncCache })

      // RESTAURAR ESTADO
      try {
        const q = localStorage.getItem('agri_syncQueue')
        this.queue = q ? JSON.parse(q) : []
        const savedIdMapStr = localStorage.getItem('agri_idMap')
        if (savedIdMapStr) {
          this.idMapper.setMap(JSON.parse(savedIdMapStr))
        }
      } catch (e) {
        logger.error('[SYNC] Error restoring state from localStorage', e)
      }

      this.initialized = true

      // Procesar cola pendiente si online
      if (navigator.onLine && this.queue.length > 0) {
        await this.processPendingQueue()
      }
    },

    getStoreByCollectionName(name) {
      return this.storeMap[name]?.()
    },

    // === LÓGICA DE COORDINACIÓN ===

    // PERSISTENCIA
    persistQueueState() {
      try {
        localStorage.setItem('agri_syncQueue', JSON.stringify(this.queue))
        localStorage.setItem('agri_idMap', JSON.stringify(this.idMapper.getMap()))
      } catch (error) {
        logger.error('[SYNC] Error saving queue to localStorage', error)
      }
    },

    loadFromLocalStorage(key) {
      return syncCache.get(key)
    },

    saveToLocalStorage(key, value) {
      syncCache.save(key, value)
    },

    removeFromLocalStorage(key) {
      syncCache.remove(key)
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
