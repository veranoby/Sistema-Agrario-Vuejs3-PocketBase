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
import { IndexedDBStorage } from '@/utils/indexedDBStorage'

// ... [Mantener STORE_MAP, ALL_STORES, etc.] ...

// Nueva instancia de almacenamiento IndexedDB para syncCache (Hito 2)
const indexedDBStorage = new IndexedDBStorage()

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

// Namespace aislado para sincronización utilizando IndexedDB (Migración Hito 2)
const syncCache = {
  async save(key, data) {
    try {
      await indexedDBStorage.setItem(`agri_sync_${key}`, data)
    } catch (e) {
      logger.error('[SYNC] Error guardando en IndexedDB:', e)
      // Fallback a tieredCache si IndexedDB falla
      tieredCache.setToLevel(`agri_sync_${key}`, data, 'l2')
    }
  },
  async get(key) {
    try {
      return await indexedDBStorage.getItem(`agri_sync_${key}`)
    } catch (e) {
      logger.error('[SYNC] Error leyendo de IndexedDB:', e)
      return tieredCache.getFromLevel(`agri_sync_${key}`, 'l2')
    }
  },
  async remove(key) {
    try {
      await indexedDBStorage.removeItem(`agri_sync_${key}`)
    } catch (e) {
      logger.error('[SYNC] Error eliminando de IndexedDB:', e)
    }
  },
  async clear() {
    try {
      await indexedDBStorage.clear()
    } catch (e) {
      logger.error('[SYNC] Error limpiando IndexedDB:', e)
    }
  }
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
    // ... [Mantener resolveStore, init, getStoreByCollectionName, etc.] ...
    
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

      // RESTAURAR ESTADO (Ahora usa IndexedDB)
      try {
        const q = localStorage.getItem('agri_syncQueue')
        this.queue = q ? JSON.parse(q) : []
        const savedIdMap = await syncCache.get('tempToRealIdMap')
        if (savedIdMap) {
          this.idMapper.setMap(savedIdMap)
        }
      } catch (e) {
        logger.error('[SYNC] Error restoring state from storage', e)
      }

      this.initialized = true

      // Procesar cola pendiente si online
      if (navigator.onLine && this.queue.length > 0) {
        await this.processPendingQueue()
      }
    },

    // ... [Mantener el resto de acciones: persistQueueState, loadFromLocalStorage, etc.] ...
    
    // PERSISTENCIA (Cola en localStorage, Cache en IndexedDB según Hito 2)
    persistQueueState() {
      try {
        localStorage.setItem('agri_syncQueue', JSON.stringify(this.queue))
        const idMap = this.idMapper.getMap()
        syncCache.set('tempToRealIdMap', idMap)
      } catch (error) {
        logger.error('[SYNC] Error saving queue to storage', error)
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

    // ... [Mantener el resto del store] ...
  }
})
