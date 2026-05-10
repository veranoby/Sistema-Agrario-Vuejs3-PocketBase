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
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programaciones/programacionesStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { IndexedDBStorage } from '@/utils/indexedDBStorage'

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
      // CORRECTO: Sanitizar datos con JSON.parse(JSON.stringify()) para evitar DataCloneError
      const sanitizedData = JSON.parse(JSON.stringify(data))
      await indexedDBStorage.setItem(`agri_sync_${key}`, sanitizedData)
    } catch (e) {
      logger.error('[SYNC] Error guardando en IndexedDB:', { error: e, key: `agri_sync_${key}` })
    }
  },
  async get(key) {
    try {
      return await indexedDBStorage.getItem(`agri_sync_${key}`)
    } catch (e) {
      logger.error('[SYNC] Error leyendo de IndexedDB:', { error: e, key: `agri_sync_${key}` })
      return null
    }
  },
  async remove(key) {
    try {
      await indexedDBStorage.removeItem(`agri_sync_${key}`)
    } catch (e) {
      logger.error('[SYNC] Error eliminando de IndexedDB:', { error: e, key: `agri_sync_${key}` })
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
    async checkConnection() {
      if (this._checkConnectivity) {
        await this._checkConnectivity()
      }
      return this.isOnline
    },

    dispose() {
      if (this._networkCleanup) {
        this._networkCleanup()
        this._networkCleanup = null
      }
      this._checkConnectivity = null
      this.initialized = false
    },

    generateTempId() {
      if (this.idMapper) {
        return this.idMapper.generateTempId()
      }
      return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },

    async resolveStore(name) {
      const map = {
        zonas: () => import('@/stores/zonasStore'),
        siembras: () => import('@/stores/siembrasStore'),
        actividades: () => import('@/stores/actividadesStore'),
        recordatorios: () => import('@/stores/recordatoriosStore'),
        programaciones: () => import('@/stores/programaciones/programacionesStore'),
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

      const snackbar = useUiFeedbackStore()
      const notify = (msg, type) => snackbar.showSnackbar(msg, type)

      // Network monitor
      const { isOnline, cleanup, checkConnectivity } = initNetworkMonitor((online) => {
        this.isOnline = online
        if (online && this.queue.length > 0) this.processPendingQueue()
      })
      this._networkCleanup = cleanup
      this._checkConnectivity = checkConnectivity

      // Cargar stores críticos para idMapper con resiliencia
      let stores = []
      try {
        const storeModules = await Promise.all([
          import('@/stores/zonasStore'),
          import('@/stores/siembrasStore'),
          import('@/stores/actividadesStore'),
          import('@/stores/recordatoriosStore'),
          import('@/stores/programaciones/programacionesStore'),
          import('@/stores/bitacoraStore')
        ])
        stores = storeModules.map(m => m[Object.keys(m).find(k => k.startsWith('use'))]())
      } catch (loadError) {
        logger.error('[SYNC] Error crítico cargando módulos. Abortando init para reintento manual.', loadError)
        return // No marcamos como initialized para permitir reintento
      }

      // Factories
      this.idMapper = createIdMapper({ stores, cacheManager: syncCache })
      this.syncConfig = createSyncConfig({ cacheManager: syncCache })
      this.conflictUI = await createConflictUI({ cacheManager: syncCache })
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
      if (this.isOnline && this.queue.length > 0) {
        await this.processPendingQueue()
      }
    },

    async processPendingQueue() {
      if (!this.processor) return { processed: 0, failed: 0 }
      const result = await this.processor.processQueue(this.queue)
      this.queue = this.queue.filter(op => op.status !== 'completed')
      this.persistQueueState()
      return result
    },

    persistQueueState() {
      try {
        localStorage.setItem('agri_syncQueue', JSON.stringify(this.queue))
        const idMap = this.idMapper.getMap()
        syncCache.save('tempToRealIdMap', idMap)
      } catch (error) {
        logger.error('[SYNC] Error saving queue to storage', error)
      }
    },

    loadFromLocalStorage(key) {
      return syncCache.get(key)
    },

    saveToLocalStorage(key, value) {
      // CORRECTO: Sanitizar valor antes de guardar
      const sanitizedValue = JSON.parse(JSON.stringify(value))
      syncCache.save(key, sanitizedValue)
    },

    removeFromLocalStorage(key) {
      syncCache.remove(key)
    }
  }
})
