/**
 * Sync Queue Manager Module
 * Manages the sync queue and processes pending operations
 */

import { defineStore } from 'pinia'
import { SyncQueue } from '@/utils/syncQueue'
import { logger, logSync, logError } from '@/utils/logger'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import { useAuthStore } from '@/stores/authStore'
import {
  useZonasStore,
  useSiembrasStore,
  useActividadesStore,
  useRecordatoriosStore,
  useProgramacionesStore,
  useBitacoraStore
} from '@/stores'

export const useSyncQueueManager = defineStore('syncQueueManager', {
  state: () => ({
    // Sync queue instance
    queue: new SyncQueue(),

    // Temporary to real ID mapping
    tempToRealIdMap: {},

    // Last sync timestamp
    lastSyncTime: null,

    // Sync status
    syncStatus: 'idle',

    // Sync in progress flag
    syncInProgress: false,

    // Errors array
    errors: []
  }),

  actions: {
    /**
     * Queue a sync operation
     * @param {Object} operation - Operation to queue
     */
    async queueOperation(operation) {
      try {
        // Validate operation
        if (!operation.type || !operation.collection) {
          throw new Error('Operación inválida: debe tener tipo y colección')
        }

        // For creations, ensure it has a temporary ID
        if (operation.type === 'create' && !operation.data?.id) {
          operation.data = operation.data || {}
          operation.data.id = this.generateConsistentTempId(operation.collection)
        }

        // Add to queue with current userId
        const authStore = useAuthStore()
        const currentUserId = authStore.user?.id

        // Include userId in operation
        operation.userId = currentUserId || null

        const tempId = await this.queue.add(operation)
        this.persistQueueState()

        return tempId
      } catch (error) {
        this.handleSyncError(error, 'Error encolando operación')
        return null
      }
    },

    /**
     * Process pending queue operations
     */
    async processPendingQueue() {
      // Avoid concurrent processing
      if (this.syncStatus === 'syncing' || this.syncInProgress) {
        logSync('[SyncQueueManager] Ya hay una sincronización en progreso, saltando...')
        return
      }

      this.syncStatus = 'syncing'
      this.syncInProgress = true

      try {
        // Verify connection
        if (!navigator.onLine) {
          throw new Error('No hay conexión a internet')
        }

        // Process queue
        const syncResults = await this.queue.process()

        if (!syncResults || typeof syncResults !== 'object') {
          logError('[SyncQueueManager] syncResults no es válido o está indefinido.')
          this.handleSyncError(new Error('Resultados de sincronización inválidos.'), 'Error procesando cola de sincronización')
        } else {
          const { createdItems, updatedItems, deletedItems } = syncResults

          // Process Created Items
          if (createdItems && createdItems.length > 0) {
            for (const item of createdItems) {
              try {
                const collectionName = item.realItem.collectionName || item.realItem['@collectionName']
                if (!collectionName) {
                  logger.warn('[SyncQueueManager] No se pudo determinar collectionName para el item creado:', item.tempId)
                  continue
                }
                const targetStore = this.getStoreByCollectionName(collectionName)
                if (targetStore && typeof targetStore.applySyncedCreate === 'function') {
                  await targetStore.applySyncedCreate(item.tempId, item.realItem)
                  // updateCrossStoreReferences is called here to ensure real ID is available
                  await this.updateCrossStoreReferences(item.tempId, item.realItem.id)
                } else {
                  logger.warn(
                    `[SyncQueueManager] Store o método applySyncedCreate no encontrado para la colección '${collectionName}'.`
                  )
                }
              } catch (e) {
                logError(`[SyncQueueManager] Error procesando item creado: ${item.tempId}`, e)
                this.handleSyncError(e, `Error procesando creación para ${item.tempId}`)
              }
            }
          }

          // Process Updated Items
          if (updatedItems && updatedItems.length > 0) {
            for (const item of updatedItems) {
              try {
                const collectionName = item.collection
                if (!collectionName) {
                  logger.warn('[SyncQueueManager] No se pudo determinar collectionName para el item actualizado:', item.id)
                  continue
                }
                const targetStore = this.getStoreByCollectionName(collectionName)
                if (targetStore && typeof targetStore.applySyncedUpdate === 'function') {
                  await targetStore.applySyncedUpdate(item.id, item.updatedItem)
                } else {
                  logger.warn(
                    `[SyncQueueManager] Store o método applySyncedUpdate no encontrado para la colección '${collectionName}'.`
                  )
                }
              } catch (e) {
                logError(`[SyncQueueManager] Error procesando item actualizado: ${item.id}`, e)
                this.handleSyncError(e, `Error procesando actualización para ${item.id}`)
              }
            }
          }

          // Process Deleted Items
          if (deletedItems && deletedItems.length > 0) {
            for (const item of deletedItems) {
              try {
                const collectionName = item.collection
                if (!collectionName) {
                  logger.warn('[SyncQueueManager] No se pudo determinar collectionName para el item eliminado:', item.id)
                  continue
                }
                const targetStore = this.getStoreByCollectionName(collectionName)
                if (targetStore && typeof targetStore.applySyncedDelete === 'function') {
                  await targetStore.applySyncedDelete(item.id)
                } else {
                  logger.warn(
                    `[SyncQueueManager] Store o método applySyncedDelete no encontrado para la colección '${collectionName}'.`
                  )
                }
              } catch (e) {
                logError(`[SyncQueueManager] Error procesando item eliminado: ${item.id}`, e)
                this.handleSyncError(e, `Error procesando eliminación para ${item.id}`)
              }
            }
          }
          this.lastSyncTime = Date.now()
          this.persistQueueState()
        }
      } catch (error) {
        this.handleSyncError(error, 'Error procesando cola de sincronización')
      } finally {
        this.syncStatus = 'idle'
        this.syncInProgress = false
      }
    },

    /**
     * Persist queue state to localStorage
     */
    persistQueueState() {
      safeLocalStorage.saveToLocalStorage('syncQueue', this.queue.queue)
      this.queue.saveTempToRealIdMap()
    },

    /**
     * Optimistic operation with immediate local update
     * @param {Object} operation - Operation to execute
     * @param {Function} localUpdateFn - Local update function
     */
    async optimisticOperation(operation, localUpdateFn) {
      try {
        // 1. Execute local update immediately
        const localResult = localUpdateFn()

        // 2. Queue operation for sync
        const tempId = await this.queueOperation(operation)

        // 3. Return result with pending indicator
        return { ...localResult, tempId, isPending: true }
      } catch (error) {
        this.handleSyncError(error, 'Error en operación optimista')
        throw error
      }
    },

    /**
     * Clean up old data
     */
    cleanupOldData() {
      try {
        this.queue.cleanupOldMappings()

        // Clean old errors
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        this.errors = this.errors.filter((err) => err.timestamp > oneDayAgo)
      } catch (error) {
        logError('[SyncQueueManager] Error limpiando datos antiguos:', error)
      }
    },

    /**
     * Get store by collection name
     * @param {string} collectionName - Collection name
     */
    getStoreByCollectionName(collectionName) {
      const storeMap = {
        zonas: useZonasStore,
        siembras: useSiembrasStore,
        actividades: useActividadesStore,
        recordatorios: useRecordatoriosStore,
        programaciones: useProgramacionesStore,
        bitacora: useBitacoraStore
      }
      const storeGetter = storeMap[collectionName]
      return storeGetter ? storeGetter() : null
    },

    /**
     * Generate consistent temporary ID
     * @param {string} collection - Collection name
     */
    generateConsistentTempId(collection) {
      // No longer using collection name for temp IDs
      return this.queue.generateConsistentTempId()
    },

    /**
     * Update cross-store references
     * @param {string} tempId - Temporary ID
     * @param {string} realId - Real ID
     */
    async updateCrossStoreReferences(tempId, realId) {
      if (!tempId || !realId) return

      logSync(`[SyncQueueManager] Actualizando referencias entre stores: ${tempId} -> ${realId}`)

      const storeGetters = [
        useZonasStore,
        useSiembrasStore,
        useActividadesStore,
        useRecordatoriosStore,
        useProgramacionesStore,
        useBitacoraStore
      ]

      for (const useStore of storeGetters) {
        try {
          const store = useStore()
          const collectionName = store.$id || store.collectionName || 'unknown_collection'

          let itemsKey = null
          if (store[collectionName] && Array.isArray(store[collectionName])) {
             itemsKey = collectionName
          } else if (store.items && Array.isArray(store.items)) {
             itemsKey = 'items'
          } else {
            // Try to find a plausible items array
            const stateKeys = Object.keys(store.$state || {})
            for (const key of stateKeys) {
              if (Array.isArray(store[key]) && store[key].length > 0 && typeof store[key][0] === 'object' && 'id' in store[key][0]) {
                itemsKey = key
                break
              } else if (Array.isArray(store[key]) && store[key].length === 0) {
                itemsKey = key
              }
            }
          }

          if (itemsKey && store[itemsKey] && Array.isArray(store[itemsKey])) {
            const updatedCount = this.updateAllReferencesInStore(collectionName, tempId, realId, store[itemsKey])
            if (updatedCount > 0) {
              if (typeof store.persistState === 'function') {
                await store.persistState()
              } else {
                safeLocalStorage.saveToLocalStorage(collectionName, store[itemsKey])
              }
              logSync(`[SyncQueueManager] Referencias actualizadas y persistidas para ${collectionName}.`)
            }
          } else {
             logger.warn(`[SyncQueueManager] No se pudo determinar/encontrar el array de items para el store '${collectionName}'.`)
          }
        } catch (e) {
          logger.warn(`[SyncQueueManager] Error accediendo/actualizando store: ${e.message}.`)
        }
      }
    },

    /**
     * Update all references in a store
     * @param {string} collection - Collection name
     * @param {string} oldId - Old ID
     * @param {string} newId - New ID
     * @param {Array} items - Items array
     */
    updateAllReferencesInStore(collection, oldId, newId, items) {
      if (!oldId || !newId || oldId === newId) return 0

      logSync(`[SyncQueueManager] Actualizando todas las referencias en ${collection} de ${oldId} a ${newId}`)
      let updatedCount = 0

      // All possible fields that could contain references
      const possibleRefFields = [
        'id',
        'siembra',
        'siembras',
        'zona',
        'zonas',
        'actividad',
        'actividades',
        'parent',
        'children',
        'relacionados',
        'recordatorio',
        'recordatorios'
      ]

      // Go through all elements
      items.forEach((item) => {
        // Check each property of the element
        Object.keys(item).forEach((key) => {
          const value = item[key]

          // If it's an array, search for oldId
          if (Array.isArray(value)) {
            let updated = false
            for (let i = 0; i < value.length; i++) {
              if (value[i] === oldId) {
                value[i] = newId
                updated = true
                updatedCount++
              }
            }
            if (updated) {
              logSync(`[SyncQueueManager] Actualizada referencia en array ${key} de ${item.id}`)
            }
          }
          // If it's a string and matches oldId
          else if (typeof value === 'string' && value === oldId) {
            item[key] = newId
            updatedCount++
            logSync(`[SyncQueueManager] Actualizada referencia en campo ${key} de ${item.id}`)
          }
        })
      })

      logSync(`[SyncQueueManager] Se actualizaron ${updatedCount} referencias en ${collection}`)
      return updatedCount
    },

    /**
     * Handle sync errors
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
    },

    /**
     * Get queue statistics
     */
    getQueueStats() {
      return {
        queueSize: this.queue.queue.length,
        lastSyncTime: this.lastSyncTime,
        syncStatus: this.syncStatus,
        isInProgress: this.syncInProgress,
        errorCount: this.errors.length
      }
    },

    /**
     * Refresh all stores from localStorage
     */
    refreshAllStores() {
      try {
        logSync('[SyncQueueManager] Refreshing all data stores from localStorage')

        const storesToRefresh = [
          useActividadesStore,
          useZonasStore,
          useSiembrasStore,
          useRecordatoriosStore,
          useProgramacionesStore,
          useBitacoraStore
        ]

        storesToRefresh.forEach(useStore => {
          try {
            const store = useStore()
            if (store && typeof store.initFromLocalStorage === 'function') {
              store.initFromLocalStorage()
            } else if (store) {
              logger.warn(`[SyncQueueManager] Store ${store.$id || 'unknown'} no tiene método initFromLocalStorage.`)
            } else {
              logger.warn(`[SyncQueueManager] No se pudo obtener una instancia del store.`)
            }
          } catch (e) {
            logger.warn(`[SyncQueueManager] Error inicializando store: ${e.message}.`)
          }
        })

        logSync('[SyncQueueManager] All data stores refreshed from localStorage.')
      } catch (error) {
        logError('[SyncQueueManager] Error al refrescar los stores:', error)
        this.handleSyncError(error, 'Error refrescando stores')
      }
    },

    /**
     * Load saved queue from localStorage
     */
    loadSavedQueue() {
      try {
        const savedQueue = safeLocalStorage.loadFromLocalStorage('syncQueue')
        if (savedQueue) {
          this.queue.queue = savedQueue
          logSync('[SyncQueueManager] Cola guardada cargada')
        }
      } catch (error) {
        logError('[SyncQueueManager] Error cargando cola guardada:', error)
      }
    },

    /**
     * Cleanup method for preventing memory leaks
     */
    cleanup() {
      try {
        // Clear errors
        this.errors = []

        // Clear temp ID mapping
        this.tempToRealIdMap = {}

        logSync('[SyncQueueManager] Queue manager cleanup completado')
      } catch (error) {
        logError('[SyncQueueManager] Error en cleanup:', error)
      }
    }
  }
})
