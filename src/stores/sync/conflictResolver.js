/**
 * Conflict Resolver Module
 * Handles conflict detection, tracking, and resolution
 */

import { defineStore } from 'pinia'
import { logger, logSync, logError } from '@/utils/logger'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import { RESOLUTION_STRATEGIES } from './types'
import { SyncQueue } from '@/utils/syncQueue'

export const useConflictResolver = defineStore('conflictResolver', {
  state: () => ({
    // Active conflicts
    conflicts: [],

    // Conflict dialog state
    conflictDialog: false,

    // Default resolution strategy
    conflictResolution: 'user-choice', // 'local' | 'server' | 'user-choice'

    // Sync queue for conflict tracking
    queue: new SyncQueue()
  }),

  actions: {
    /**
     * Track local change in history
     * @param {string} entityId - Entity ID
     * @param {string} collection - Collection name
     * @param {string} operation - Operation type
     * @param {Object} oldData - Old data
     * @param {Object} newData - New data
     */
    trackLocalChange(entityId, collection, operation, oldData, newData) {
      try {
        return this.queue.trackLocalChange(entityId, collection, operation, oldData, newData)
      } catch (error) {
        logError('[ConflictResolver] Error tracking local change:', error)
        return null
      }
    },

    /**
     * Get change history for an entity
     * @param {string} entityId - Entity ID
     * @param {string} collection - Collection name (optional)
     * @param {number} limit - Maximum entries
     */
    getChangeHistory(entityId, collection = null, limit = 50) {
      try {
        return this.queue.getChangeHistory(entityId, collection, limit)
      } catch (error) {
        logError('[ConflictResolver] Error getting change history:', error)
        return []
      }
    },

    /**
     * Resolve conflict with historical context
     * @param {Object} localData - Local version
     * @param {Object} remoteData - Remote version
     * @param {string} entityId - Entity ID
     * @param {string} collection - Collection name
     */
    resolveConflictWithContext(localData, remoteData, entityId, collection) {
      try {
        return this.queue.resolveConflictWithContext(localData, remoteData, entityId, collection)
      } catch (error) {
        logError('[ConflictResolver] Error resolving conflict with context:', error)
        // Fallback: return remote data
        return remoteData
      }
    },

    /**
     * Get conflict resolution history
     * @param {number} limit - Maximum entries
     */
    getConflictResolutionHistory(limit = 20) {
      try {
        const history = this.queue.changeHistory?.conflictResolutions || []
        return history
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
      } catch (error) {
        logError('[ConflictResolver] Error getting conflict resolution history:', error)
        return []
      }
    },

    /**
     * Clean up old history entries
     * @param {number} maxAgeMs - Maximum age in milliseconds
     */
    cleanupOldHistory(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
      try {
        this.queue.cleanupOldHistory(maxAgeMs)
      } catch (error) {
        logError('[ConflictResolver] Error cleaning up old history:', error)
      }
    },

    /**
     * Export complete change history
     */
    exportChangeHistory() {
      try {
        const history = {
          changes: this.queue.changeHistory?.changes || [],
          conflictResolutions: this.queue.changeHistory?.conflictResolutions || [],
          exportedAt: Date.now(),
          version: '1.0'
        }

        const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `change-history-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        return true
      } catch (error) {
        logError('[ConflictResolver] Error exporting change history:', error)
        return false
      }
    },

    /**
     * Add a conflict to the list and open dialog
     * @param {Object} conflict - Conflict object
     */
    addConflict(conflict) {
      const existingIndex = this.conflicts.findIndex(
        c => (c.id === conflict.id || c.tempId === conflict.tempId)
      )

      if (existingIndex === -1) {
        this.conflicts.push({
          ...conflict,
          resolved: false,
          resolution: null
        })

        logSync(`[ConflictResolver] Conflicto agregado: ${conflict.collection}`)

        // Open dialog automatically if there are conflicts
        if (this.conflicts.length > 0) {
          this.conflictDialog = true
        }

        // Save to localStorage for persistence
        this.saveConflictsToStorage()
      }
    },

    /**
     * Resolve a specific conflict
     * @param {string} conflictId - Conflict ID
     * @param {string} resolution - Resolution strategy
     * @param {Object} serverData - Server data (if accepting server version)
     */
    resolveConflict(conflictId, resolution, serverData = null) {
      const index = this.conflicts.findIndex(c => c.id === conflictId || c.tempId === conflictId)

      if (index !== -1) {
        const conflict = this.conflicts[index]

        // Update conflict state
        conflict.resolved = true
        conflict.resolution = resolution

        logSync(`[ConflictResolver] Conflicto resuelto: ${conflict.collection} - resolución: ${resolution}`)

        // Execute corresponding action
        if (resolution === RESOLUTION_STRATEGIES.LOCAL_WINS) {
          this.forceLocalVersion(conflict)
        } else if (resolution === RESOLUTION_STRATEGIES.SERVER_WINS) {
          this.acceptServerVersion(conflict, serverData)
        }

        // Close dialog if no more unresolved conflicts
        const hasUnresolved = this.conflicts.some(c => !c.resolved)
        if (!hasUnresolved) {
          this.conflictDialog = false
        }

        // Save state
        this.saveConflictsToStorage()
      }
    },

    /**
     * Resolve multiple conflicts at once
     * @param {Array} resolutions - Array of conflict resolutions
     */
    resolveMultipleConflicts(resolutions) {
      resolutions.forEach(resolution => {
        this.resolveConflict(
          resolution.id || resolution.tempId,
          resolution.resolution,
          resolution.serverData
        )
      })

      // Clean up resolved conflicts
      this.cleanupResolvedConflicts()

      logSync(`[ConflictResolver] ${resolutions.length} conflictos resueltos`)
    },

    /**
     * Force local version for a conflict
     * @param {Object} conflict - Conflict object
     */
    async forceLocalVersion(conflict) {
      logSync(`[ConflictResolver] Forzando versión local para ${conflict.collection}`)

      try {
        // Local version is already in the local store
        // Just mark conflict as resolved and retry sync

        // Retry sync for this specific operation
        if (conflict.operation) {
          const opIndex = this.queue.queue.findIndex(
            op => op.tempId === conflict.tempId || op.id === conflict.id
          )

          if (opIndex !== -1) {
            const operation = this.queue.queue[opIndex]
            operation.status = 'pending'
            operation.retryCount = 0 // Reset retry counter

            // Save state
            this.queue.saveState()

            // Schedule sync
            setTimeout(() => {
              // This will be handled by syncQueueManager
              logSync(`[ConflictResolver] Programando re-sync para operación ${conflict.tempId}`)
            }, 1000)
          }
        }
      } catch (error) {
        logError('[ConflictResolver] Error forzando versión local:', error)
      }
    },

    /**
     * Accept server version for a conflict
     * @param {Object} conflict - Conflict object
     * @param {Object} serverData - Server data
     */
    async acceptServerVersion(conflict, serverData) {
      logSync(`[ConflictResolver] Aceptando versión servidor para ${conflict.collection}`)

      try {
        // This will be handled by the main syncStore
        // which has access to all the stores
        logSync(`[ConflictResolver] Versión servidor aceptada para ${conflict.collection}`)

        // Remove operation from queue (already resolved by server)
        this.queue.queue = this.queue.queue.filter(
          op => (op.tempId !== conflict.tempId && op.id !== conflict.id)
        )
        this.queue.saveState()

        logSync('[ConflictResolver] Versión servidor aplicada exitosamente')
      } catch (error) {
        logError('[ConflictResolver] Error aceptando versión servidor:', error)
      }
    },

    /**
     * Clean up resolved conflicts
     */
    cleanupResolvedConflicts() {
      this.conflicts = this.conflicts.filter(c => !c.resolved)
      this.saveConflictsToStorage()
    },

    /**
     * Save conflicts to localStorage
     */
    saveConflictsToStorage() {
      try {
        const conflictsToSave = this.conflicts.map(c => ({
          id: c.id,
          tempId: c.tempId,
          collection: c.collection,
          type: c.type,
          local: c.local,
          server: c.server,
          resolved: c.resolved,
          resolution: c.resolution
        }))
        localStorage.setItem('sync_conflicts', JSON.stringify(conflictsToSave))
      } catch (error) {
        logError('[ConflictResolver] Error guardando conflictos:', error)
      }
    },

    /**
     * Load conflicts from localStorage
     */
    loadConflictsFromStorage() {
      try {
        const saved = localStorage.getItem('sync_conflicts')
        if (saved) {
          const conflicts = JSON.parse(saved)
          // Only load unresolved conflicts
          this.conflicts = conflicts.filter(c => !c.resolved)

          if (this.conflicts.length > 0) {
            logSync(`[ConflictResolver] ${this.conflicts.length} conflictos pendientes cargados`)
            this.conflictDialog = true
          }
        }
      } catch (error) {
        logError('[ConflictResolver] Error cargando conflictos:', error)
      }
    },

    /**
     * Close conflict dialog
     */
    closeConflictDialog() {
      this.conflictDialog = false
    },

    /**
     * Open conflict dialog
     */
    openConflictDialog() {
      this.conflictDialog = true
    },

    /**
     * Set conflict resolution strategy
     * @param {string} strategy - Resolution strategy
     */
    setConflictResolutionStrategy(strategy) {
      if (Object.values(RESOLUTION_STRATEGIES).includes(strategy)) {
        this.conflictResolution = strategy
        logSync(`[ConflictResolver] Estrategia de resolución cambiada a: ${strategy}`)
      } else {
        logger.warn(`[ConflictResolver] Estrategia de resolución inválida: ${strategy}`)
      }
    },

    /**
     * Get active conflicts count
     */
    getActiveConflictsCount() {
      return this.conflicts.filter(c => !c.resolved).length
    },

    /**
     * Get conflicts by collection
     * @param {string} collection - Collection name
     */
    getConflictsByCollection(collection) {
      return this.conflicts.filter(c => c.collection === collection && !c.resolved)
    },

    /**
     * Clear all conflicts (use with caution)
     */
    clearAllConflicts() {
      this.conflicts = []
      this.saveConflictsToStorage()
      this.conflictDialog = false
      logSync('[ConflictResolver] Todos los conflictos limpiados')
    },

    /**
     * Cleanup method for preventing memory leaks
     */
    cleanup() {
      try {
        // Clear conflicts array
        this.conflicts = []

        // Clear queue change history
        if (this.queue.changeHistory) {
          this.queue.changeHistory.changes = []
          this.queue.changeHistory.conflictResolutions = []
        }

        logSync('[ConflictResolver] Conflict resolver cleanup completado')
      } catch (error) {
        logError('[ConflictResolver] Error en cleanup:', error)
      }
    }
  }
})
