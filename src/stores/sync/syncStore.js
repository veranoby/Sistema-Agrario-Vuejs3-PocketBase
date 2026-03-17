/**
 * Main Sync Store (Refactored)
 * Orchestrates synchronization operations and coordinates between modules
 */

import { defineStore } from 'pinia'
import { logger, logSync, logError, logP3 } from '@/utils/logger'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import { useSnackbarStore } from './snackbarStore'
import { useAuthStore } from './authStore'
import { pb } from '@/utils/pocketbase'
import {
  useZonasStore,
  useSiembrasStore,
  useActividadesStore,
  useRecordatoriosStore,
  useHaciendaStore,
  useProgramacionesStore,
  useBitacoraStore
} from '@/stores'

// Import sync modules
import { useSyncQueueManager } from './sync/syncQueueManager'
import { useConflictResolver } from './sync/conflictResolver'
import { useOfflineIndexer } from './sync/offlineIndexer'
import { useCacheManager } from './sync/cacheManager'
import {
  DEFAULT_SELECTIVE_SYNC_CONFIG,
  COLLECTION_NAMES,
  SYNC_STATUS
} from './sync/types'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    // Connection status
    isOnline: navigator.onLine,

    // Initialization flag
    initialized: false,

    // Errors array
    errors: [],

    // Selective sync configuration
    selectiveSyncConfig: { ...DEFAULT_SELECTIVE_SYNC_CONFIG }
  }),

  actions: {
    // ============================================
    // INITIALIZATION & LIFECYCLE
    // ============================================

    /**
     * Initialize sync store and all modules
     */
    async init() {
      if (this.initialized) return

      try {
        const queueManager = useSyncQueueManager()
        const conflictResolver = useConflictResolver()
        const cacheManager = useCacheManager()
        const offlineIndexer = useOfflineIndexer()

        // Initialize conflict callback
        queueManager.queue.onConflictCallback = (conflict) => conflictResolver.addConflict(conflict)

        // Clean up previous listeners to avoid duplicates
        window.removeEventListener('online', this.handleOnline)
        window.removeEventListener('offline', this.handleOffline)

        // Add listeners with bind to maintain context
        window.addEventListener('online', this.handleOnline.bind(this))
        window.addEventListener('offline', this.handleOffline.bind(this))

        // Load saved queue
        queueManager.loadSavedQueue()

        // Load pending conflicts from localStorage
        conflictResolver.loadConflictsFromStorage()

        // Initialize selective sync config
        this.initSelectiveSyncConfig()

        // Initialize offline features
        cacheManager.initOfflineFeatures()
        offlineIndexer.initSearchIndex()

        // Try to restore session if necessary
        const authStore = useAuthStore()
        if (!pb.authStore.isValid) {
          await authStore.ensureAuthInitialized()
        }

        this.initialized = true

        // Check if there are pending operations and we're online
        if (navigator.onLine && queueManager.queue.queue.length > 0) {
          logSync('[SyncStore] Procesando cola pendiente al inicializar')
          await queueManager.processPendingQueue()
        }
      } catch (error) {
        this.handleSyncError(error, 'Error inicializando syncStore')
      }
    },

    /**
     * Handle online event
     */
    async handleOnline() {
      logSync('[SyncStore] Conexión restaurada, verificando cola pendiente')
      this.isOnline = true

      const queueManager = useSyncQueueManager()
      const authStore = useAuthStore()

      // Try to restore session before processing queue
      await authStore.ensureAuthInitialized()

      // Notify user
      useSnackbarStore().showSnackbar('Conexión restaurada, sincronizando datos...', 'info')

      // Process pending queue if there are elements
      if (queueManager.queue.queue.length > 0) {
        await queueManager.processPendingQueue()
        // Refresh stores after processing queue
        queueManager.refreshAllStores()
      }
    },

    /**
     * Handle offline event
     */
    handleOffline() {
      this.isOnline = false
      useSnackbarStore().showSnackbar(
        'Modo sin conexión activado. Los cambios se sincronizarán cuando vuelva la conexión.',
        'warning'
      )
    },

    /**
     * Cleanup method for preventing memory leaks
     */
    cleanup() {
      try {
        const queueManager = useSyncQueueManager()
        const conflictResolver = useConflictResolver()
        const cacheManager = useCacheManager()
        const offlineIndexer = useOfflineIndexer()

        // Clean up all modules
        queueManager.cleanup()
        conflictResolver.cleanup()
        cacheManager.cleanup()
        offlineIndexer.cleanup()

        // Remove event listeners
        window.removeEventListener('online', this.handleOnline)
        window.removeEventListener('offline', this.handleOffline)

        logSync('[SyncStore] SyncStore cleanup completado')
      } catch (error) {
        logError('[SyncStore] Error en syncStore cleanup:', error)
      }
    },

    /**
     * Pinia dispose hook for automatic cleanup
     */
    $dispose() {
      this.cleanup()
    },

    // ============================================
    // SYNC ORCHESTRATION
    // ============================================

    /**
     * Configure selective sync
     * @param {Object} config - Selective sync configuration
     */
    configureSelectiveSync(config) {
      try {
        // Merge configuration maintaining defaults
        this.selectiveSyncConfig = {
          ...this.selectiveSyncConfig,
          ...config,
          collections: {
            ...this.selectiveSyncConfig.collections,
            ...(config.collections || {})
          }
        }

        // Save configuration to localStorage
        this.saveToLocalStorage('selectiveSyncConfig', this.selectiveSyncConfig)

        logSync('[SyncStore] Configuración de sincronización selectiva actualizada')
        return true
      } catch (error) {
        logError('[SyncStore] Error configurando sincronización selectiva:', error)
        return false
      }
    },

    /**
     * Get current selective sync configuration
     */
    getSelectiveSyncConfig() {
      return { ...this.selectiveSyncConfig }
    },

    /**
     * Check if a collection should sync immediately
     * @param {string} collectionName - Collection name
     */
    shouldSyncImmediately(collectionName) {
      if (!this.selectiveSyncConfig.enabled) return true

      const config = this.selectiveSyncConfig.collections[collectionName]
      return config ? config.enabled && config.immediate : true
    },

    /**
     * Get collection priority
     * @param {string} collectionName - Collection name
     */
    getCollectionPriority(collectionName) {
      if (!this.selectiveSyncConfig.enabled) return 'high'

      const config = this.selectiveSyncConfig.collections[collectionName]
      return config ? config.priority : 'medium'
    },

    /**
     * Check if a collection is enabled for sync
     * @param {string} collectionName - Collection name
     */
    isCollectionSyncEnabled(collectionName) {
      if (!this.selectiveSyncConfig.enabled) return true

      const config = this.selectiveSyncConfig.collections[collectionName]
      return config ? config.enabled : true
    },

    /**
     * Process deferred sync
     */
    async processDeferredSync() {
      if (!this.selectiveSyncConfig.enabled) return

      const now = Date.now()
      const lastSync = this.selectiveSyncConfig.lastDeferredSync || 0
      const interval = this.selectiveSyncConfig.deferredSyncInterval

      if (now - lastSync < interval) return

      try {
        logSync('[SyncStore] Procesando sincronización diferida...')

        const queueManager = useSyncQueueManager()

        // Filter deferred operations from queue
        const deferredOperations = queueManager.queue.queue.filter(op => {
          const config = this.selectiveSyncConfig.collections[op.collectionName]
          return config && config.enabled && !config.immediate
        })

        if (deferredOperations.length > 0) {
          logSync(`[SyncStore] Procesando ${deferredOperations.length} operaciones diferidas`)
          // Process deferred operations with low priority
          await queueManager.processPendingQueue()
        }

        this.selectiveSyncConfig.lastDeferredSync = now
        this.saveToLocalStorage('selectiveSyncConfig', this.selectiveSyncConfig)

      } catch (error) {
        logError('[SyncStore] Error en sincronización diferida:', error)
      }
    },

    /**
     * Initialize selective sync config from localStorage
     */
    initSelectiveSyncConfig() {
      try {
        const saved = this.loadFromLocalStorage('selectiveSyncConfig')
        if (saved) {
          this.selectiveSyncConfig = {
            ...this.selectiveSyncConfig,
            ...saved,
            collections: {
              ...this.selectiveSyncConfig.collections,
              ...(saved.collections || {})
            }
          }
        }
      } catch (error) {
        logError('[SyncStore] Error cargando configuración selectiva:', error)
      }
    },

    // ============================================
    // BATCH OPERATIONS
    // ============================================

    /**
     * Load dashboard with parallel requests
     */
    async loadDashboardWithParallelRequests() {
      const startTime = performance.now()

      try {
        // PHASE 1: Load hacienda first (prerequisite)
        const haciendaStore = useHaciendaStore()
        let haciendaId = haciendaStore.mi_hacienda?.id

        // If hacienda is not loaded, load it first
        if (!haciendaId) {
          await haciendaStore.init()
          haciendaId = haciendaStore.mi_hacienda?.id
        }

        if (!haciendaId) {
          throw new Error('No se pudo cargar la hacienda')
        }

        // PHASE 2: Load rest of collections in parallel with correct filters and expansions
        const promises = [
          pb.collection('recordatorios').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`,
            expand: 'actividades.tipo_actividades,zonas.tipos_zonas'
          })
            .then(result => ({ collection: 'recordatorios', data: result.items || [] }))
            .catch(error => ({ collection: 'recordatorios', data: [], error: error.message })),

          pb.collection('siembras').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`
          })
            .then(result => ({ collection: 'siembras', data: result.items || [] }))
            .catch(error => ({ collection: 'siembras', data: [], error: error.message })),

          pb.collection('actividades').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`,
            expand: 'tipo_actividades,siembras'
          })
            .then(result => ({ collection: 'actividades', data: result.items || [] }))
            .catch(error => ({ collection: 'actividades', data: [], error: error.message })),

          pb.collection('zonas').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`,
            expand: 'tipos_zonas'
          })
            .then(result => ({ collection: 'zonas', data: result.items || [] }))
            .catch(error => ({ collection: 'zonas', data: [], error: error.message }))
        ]

        const results = await Promise.all(promises)
        const duration = performance.now() - startTime

        // Process results
        const collections = {}
        let totalRecords = 0
        let successfulCollections = 1 // Count hacienda as successful

        // Add hacienda to results (already loaded in phase 1)
        collections['Haciendas'] = haciendaStore.mi_hacienda ? [haciendaStore.mi_hacienda] : []
        totalRecords += collections['Haciendas'].length

        // Process phase 2 results
        results.forEach(result => {
          if (result.error) {
            collections[result.collection] = []
          } else {
            collections[result.collection] = result.data
            totalRecords += result.data.length
            successfulCollections++
          }
        })

        const metrics = {
          duration: Math.round(duration),
          collectionsLoaded: successfulCollections,
          recordsLoaded: totalRecords,
          recordsPerSecond: Math.round(totalRecords / (duration / 1000))
        }

        return {
          success: successfulCollections > 0,
          collections,
          metrics
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          collections: {},
          metrics: { duration: Math.round(performance.now() - startTime), collectionsLoaded: 0, recordsLoaded: 0 }
        }
      }
    },

    /**
     * Process batch results
     * @param {Array} batchData - Batch data
     */
    processBatchResults(batchData) {
      const collections = {}

      if (Array.isArray(batchData)) {
        const collectionNames = ['Haciendas', 'recordatorios', 'siembras', 'actividades', 'zonas']

        batchData.forEach((result, index) => {
          const collectionName = collectionNames[index] || `collection_${index}`

          if (result.status === 200 && result.body?.items) {
            collections[collectionName] = result.body.items
            logP3(`[SyncStore] Batch result - ${collectionName}: ${result.body.items.length} registros`)
          } else {
            collections[collectionName] = []
            logger.warn(`[SyncStore] Batch result - ${collectionName}: Error ${result.status}`)
          }
        })
      }

      return collections
    },

    /**
     * Batch initialize dashboard
     */
    async batchInitializeDashboard() {
      try {
        logP3('[SyncStore] Iniciando batch processing para Dashboard...')
        const startTime = performance.now()

        // Verify authentication
        const authStore = useAuthStore()
        if (!authStore.isLoggedIn || !pb.authStore.isValid) {
          logger.warn('[SyncStore] Usuario no autenticado, cancelando batch processing')
          return {
            success: false,
            error: 'Usuario no autenticado',
            collections: {},
            metrics: { duration: 0, collectionsLoaded: 0, recordsLoaded: 0 }
          }
        }

        // Use parallel requests as optimized P3.1 approach
        const parallelResult = await this.loadDashboardWithParallelRequests()

        if (parallelResult.success) {
          logP3('[SyncStore] Parallel requests exitoso')
          return {
            success: true,
            collections: parallelResult.collections,
            metrics: {
              ...parallelResult.metrics,
              method: 'parallel_requests'
            }
          }
        }

        return {
          success: false,
          error: 'Todas las optimizaciones P3.1 fallaron',
          collections: {},
          metrics: { duration: performance.now() - startTime, collectionsLoaded: 0, recordsLoaded: 0 }
        }

      } catch (error) {
        logP3('[SyncStore] Error en batch processing Dashboard:', error)
        return {
          success: false,
          error: error.message,
          collections: {},
          metrics: { duration: 0, collectionsLoaded: 0, recordsLoaded: 0 }
        }
      }
    },

    /**
     * Apply batch data to stores
     * @param {Object} batchData - Batch data
     */
    async applyBatchDataToStores(batchData) {
      try {
        if (!batchData.success || !batchData.collections) {
          logger.warn('[SyncStore] Datos batch inválidos para aplicar a stores')
          return false
        }

        const { collections } = batchData
        let storesUpdated = 0

        // Map collections to stores
        const storeMap = {
          'Haciendas': useHaciendaStore,
          'recordatorios': useRecordatoriosStore,
          'siembras': useSiembrasStore,
          'actividades': useActividadesStore,
          'zonas': useZonasStore
        }

        // Apply data to each store
        for (const [collectionName, storeGetter] of Object.entries(storeMap)) {
          try {
            const data = collections[collectionName]
            if (data && Array.isArray(data)) {
              const store = storeGetter()

              // Apply data to store according to its structure
              if (typeof store.applyBatchData === 'function') {
                await store.applyBatchData(data)
              } else {
                // Map correct structure for each store
                switch (collectionName) {
                  case 'Haciendas':
                    if (!store.mi_hacienda && data.length > 0) {
                      store.mi_hacienda = data[0]
                    }
                    break
                  case 'siembras':
                    store.siembras = data
                    break
                  case 'actividades':
                    store.actividades = data
                    break
                  case 'recordatorios':
                    store.recordatorios = data
                    break
                  case 'zonas':
                    store.zonas = data
                    break
                  default:
                    if (store.items) {
                      store.items = data
                    }
                }

                // Persist to localStorage
                this.saveToLocalStorage(collectionName, data)
              }

              logP3(`[SyncStore] Store ${collectionName} actualizado con ${data.length} registros`)
              storesUpdated++
            }
          } catch (storeError) {
            logger.warn(`[SyncStore] Error aplicando datos a store ${collectionName}:`, storeError)
          }
        }

        logP3(`[SyncStore] ${storesUpdated} stores actualizados exitosamente`)
        return storesUpdated > 0

      } catch (error) {
        logP3('[SyncStore] Error aplicando datos batch a stores:', error)
        return false
      }
    },

    /**
     * Initialize dashboard with batch
     */
    async initializeDashboardWithBatch() {
      try {
        logP3('[SyncStore] Iniciando inicialización Dashboard con batch processing...')

        // 1. Execute batch request
        const batchResult = await this.batchInitializeDashboard()

        if (batchResult.success) {
          // 2. Apply data to stores
          const appliedToStores = await this.applyBatchDataToStores(batchResult)

          // 3. Return combined result
          return {
            ...batchResult,
            storesUpdated: appliedToStores,
            method: 'batch_processing'
          }
        } else {
          return {
            success: false,
            error: batchResult.error,
            fallbackAvailable: true,
            method: 'batch_processing_failed'
          }
        }

      } catch (error) {
        logP3('[SyncStore] Error en inicialización Dashboard con batch:', error)
        return {
          success: false,
          error: error.message,
          method: 'batch_processing_error'
        }
      }
    },

    // ============================================
    // CRUD COORDINATION (Proxy methods to syncQueueManager)
    // ============================================

    /**
     * Update local item
     * @param {string} collection - Collection name
     * @param {string} tempId - Temporary ID
     * @param {Object} newItem - New item data
     * @param {Array} items - Items array
     */
    updateLocalItem(collection, tempId, newItem, items) {
      const queueManager = useSyncQueueManager()
      // This is a helper that would be in syncQueueManager
      // For now, just log and return
      logSync(`[SyncStore] updateLocalItem called for ${collection}: ${tempId}`)
      return false
    },

    /**
     * Update all references in store
     * @param {string} collection - Collection name
     * @param {string} oldId - Old ID
     * @param {string} newId - New ID
     * @param {Array} items - Items array
     */
    updateAllReferencesInStore(collection, oldId, newId, items) {
      const queueManager = useSyncQueueManager()
      return queueManager.updateAllReferencesInStore(collection, oldId, newId, items)
    },

    /**
     * Update references to item
     * @param {string} collection - Collection name
     * @param {string} tempId - Temporary ID
     * @param {string} realId - Real ID
     * @param {Array} items - Items array
     * @param {Array} referenceFields - Reference fields
     */
    updateReferencesToItem(collection, tempId, realId, items, referenceFields) {
      // This would be implemented in syncQueueManager
      logSync(`[SyncStore] updateReferencesToItem called for ${collection}`)
      return 0
    },

    /**
     * Remove local item
     * @param {string} collection - Collection name
     * @param {string} id - Item ID
     * @param {Array} items - Items array
     */
    removeLocalItem(collection, id, items) {
      if (!id) return false

      const initialLength = items.length
      items = items.filter((item) => item.id !== id)

      if (items.length < initialLength) {
        this.saveToLocalStorage(collection, items)
        return true
      }

      return false
    },

    /**
     * Check if two temp IDs are related
     * @param {string} id1 - First ID
     * @param {string} id2 - Second ID
     */
    isRelatedTempId(id1, id2) {
      const queueManager = useSyncQueueManager()
      return queueManager.queue.areRelatedTempIds(
        queueManager.queue.extractTempIdInfo(id1),
        queueManager.queue.extractTempIdInfo(id2)
      )
    },

    /**
     * Normalize collection name
     * @param {string} prefix - Collection prefix
     */
    normalizeCollectionName(prefix) {
      if (!prefix) return ''
      return prefix.toLowerCase()
    },

    /**
     * Generate consistent temp ID
     * @param {string} collection - Collection name
     */
    generateConsistentTempId(collection) {
      const queueManager = useSyncQueueManager()
      return queueManager.generateConsistentTempId(collection)
    },

    /**
     * Generate temp ID (public method)
     */
    generateTempId() {
      const queueManager = useSyncQueueManager()
      return queueManager.generateConsistentTempId()
    },

    /**
     * Update cross-store references
     * @param {string} tempId - Temporary ID
     * @param {string} realId - Real ID
     */
    async updateCrossStoreReferences(tempId, realId) {
      const queueManager = useSyncQueueManager()
      await queueManager.updateCrossStoreReferences(tempId, realId)
    },

    /**
     * Refresh all stores
     */
    refreshAllStores() {
      const queueManager = useSyncQueueManager()
      queueManager.refreshAllStores()
    },

    // ============================================
    // STORAGE UTILITIES
    // ============================================

    /**
     * Load from localStorage
     * @param {string} key - Storage key
     */
    loadFromLocalStorage(key) {
      return safeLocalStorage.loadFromLocalStorage(key)
    },

    /**
     * Save to localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to save
     */
    saveToLocalStorage(key, value) {
      const success = safeLocalStorage.saveToLocalStorage(key, value)
      if (!success) {
        logError(`[SyncStore] Failed to save "${key}" to localStorage`)
      }
      return success
    },

    /**
     * Remove from localStorage
     * @param {string} key - Storage key
     */
    removeFromLocalStorage(key) {
      return safeLocalStorage.removeFromLocalStorage(key)
    },

    /**
     * Handle sync error
     * @param {Error} error - Error object
     * @param {string} message - Error message
     */
    handleSyncError(error, message) {
      logError(message, error)
      this.errors.push({
        message: error.message,
        timestamp: Date.now(),
        context: message
      })

      // Limit number of stored errors
      if (this.errors.length > 50) {
        this.errors = this.errors.slice(-50)
      }

      useSnackbarStore().showSnackbar(`${message}: ${error.message}`, 'error')
    },

    /**
     * Get store by collection name
     * @param {string} collectionName - Collection name
     */
    getStoreByCollectionName(collectionName) {
      const queueManager = useSyncQueueManager()
      return queueManager.getStoreByCollectionName(collectionName)
    }
  }
})
