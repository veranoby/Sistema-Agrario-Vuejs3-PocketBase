/**
 * conflictUI.js
 * Factory para gestión de UI de conflictos
 * Maneja lista de conflictos y estado del diálogo
 */

import { cacheManager } from './cacheManager'

/**
 * Crea gestor de UI de conflictos
 * @param {Object} params - { cacheManager: Object }
 * @returns {Object} - { conflicts, showDialog, addConflict, resolveChoice, clearResolved }
 */
export function createConflictUI({ cacheManager: cm = cacheManager }) {
  let conflicts = cm.get('sync_conflicts') || []
  let showDialog = conflicts.some(c => !c.resolved)

  /**
   * Agrega un conflicto a la lista
   * @param {Object} conflict - Conflicto a agregar
   */
  function addConflict(conflict) {
    const exists = conflicts.find(
      c => c.id === conflict.id || c.tempId === conflict.tempId
    )
    
    if (!exists) {
      conflicts.push({ ...conflict, resolved: false, resolution: null })
      showDialog = true
      cm.save('sync_conflicts', conflicts)
    }
  }

  /**
   * Resuelve un conflicto con una elección específica
   * @param {string} id - ID del conflicto
   * @param {string} resolution - Resolución elegida
   * @returns {Object|null} - Conflicto resuelto o null
   */
  function resolveChoice(id, resolution) {
    const conflict = conflicts.find(c => c.id === id || c.tempId === id)
    
    if (conflict) {
      conflict.resolved = true
      conflict.resolution = resolution
      showDialog = conflicts.some(c => !c.resolved)
      cm.save('sync_conflicts', conflicts)
    }
    
    return conflict
  }

  /**
   * Limpia conflictos resueltos
   */
  function clearResolved() {
    conflicts = conflicts.filter(c => !c.resolved)
    cm.save('sync_conflicts', conflicts)
  }

  return {
    conflicts,
    get showDialog() { return showDialog },
    addConflict,
    resolveChoice,
    clearResolved
  }
}
