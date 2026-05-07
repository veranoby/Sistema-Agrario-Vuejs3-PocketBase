/**
 * conflictUI.js
 * Factory para gestión de UI de conflictos (async para soportar syncCache con IndexedDB)
 * Maneja lista de conflictos y estado del diálogo
 */

import { cache } from '@/utils/cacheManager'
import { logger } from '@/utils/logger'

/**
 * Crea gestor de UI de conflictos
 * @param {Object} params - { cacheManager: Object }
 * @returns {Promise<Object>} - { conflicts, showDialog, addConflict, resolveChoice, clearResolved }
 */
export async function createConflictUI({ cacheManager: cm = cache }) {
  // Obtener valor de caché (soporta sync/async get) con manejo de errores
  let cachedValue = []
  try {
    cachedValue = await cm.get('sync_conflicts')
  } catch (e) {
    logger.error('[CONFLICT_UI] Error leyendo conflictos de caché:', e)
    cachedValue = null
  }

  // Limpiar entrada corrupta si existe (no es un array)
  if (cachedValue && !Array.isArray(cachedValue)) {
    try {
      if (typeof cm.delete === 'function') {
        // CacheManager tiene método delete síncrono
        cm.delete('sync_conflicts')
      } else if (typeof cm.remove === 'function') {
        // syncCache tiene método remove asíncrono
        await cm.remove('sync_conflicts')
      }
      // Re-leer valor tras limpieza
      cachedValue = await cm.get('sync_conflicts')
    } catch (e) {
      logger.error('[CONFLICT_UI] Error limpiando entrada corrupta de caché:', e)
      cachedValue = null
    }
  }

  // Inicializar conflicts con validación de array
  let conflicts = Array.isArray(cachedValue) ? cachedValue : []
  let showDialog = conflicts.some(c => !c.resolved)

  /**
   * Agrega un conflicto a la lista
   * @param {Object} conflict - Conflicto a agregar
   */
  async function addConflict(conflict) {
    const exists = conflicts.find(
      c => c.id === conflict.id || c.tempId === conflict.tempId
    )

    if (!exists) {
      conflicts.push({ ...conflict, resolved: false, resolution: null })
      showDialog = true
      // GUARDAR en caché, soporta set (CacheManager) o save (syncCache)
      try {
        if (typeof cm.set === 'function') {
          cm.set('sync_conflicts', conflicts)
        } else if (typeof cm.save === 'function') {
          await cm.save('sync_conflicts', conflicts)
        }
      } catch (e) {
        logger.error('[CONFLICT_UI] Error guardando conflictos en caché:', e)
      }
    }
  }

  /**
   * Resuelve un conflicto con una elección específica
   * @param {string} id - ID del conflicto
   * @param {string} resolution - Resolución elegida
   * @returns {Object|null} - Conflicto resuelto o null
   */
  async function resolveChoice(id, resolution) {
    const conflict = conflicts.find(c => c.id === id || c.tempId === id)

    if (conflict) {
      conflict.resolved = true
      conflict.resolution = resolution
      showDialog = conflicts.some(c => !c.resolved)
      // GUARDAR en caché
      try {
        if (typeof cm.set === 'function') {
          cm.set('sync_conflicts', conflicts)
        } else if (typeof cm.save === 'function') {
          await cm.save('sync_conflicts', conflicts)
        }
      } catch (e) {
        logger.error('[CONFLICT_UI] Error guardando conflictos en caché:', e)
      }
    }

    return conflict
  }

  /**
   * Limpia conflictos resueltos
   */
  async function clearResolved() {
    conflicts = conflicts.filter(c => !c.resolved)
    // GUARDAR en caché
    try {
      if (typeof cm.set === 'function') {
        cm.set('sync_conflicts', conflicts)
      } else if (typeof cm.save === 'function') {
        await cm.save('sync_conflicts', conflicts)
      }
    } catch (e) {
      logger.error('[CONFLICT_UI] Error guardando conflictos en caché:', e)
    }
  }

  return {
    conflicts,
    get showDialog() { return showDialog },
    addConflict,
    resolveChoice,
    clearResolved
  }
}
