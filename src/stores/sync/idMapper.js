/**
 * idMapper.js
 * Factory para mapear IDs temporales a IDs reales
 * Maneja referencias cruzadas entre stores
 */

import { cacheManager } from './cacheManager'

/**
 * Crea un mapper de IDs temporales a reales
 * @param {Object} params - { stores: Array<Function>, cacheManager: Object }
 * @returns {Object} - { generateTempId, getRealId, isTempId, updateRefs }
 */
export function createIdMapper({ stores, cacheManager: cm = cacheManager }) {
  const tempToRealIdMap = cm.get('tempToRealIdMap') || {}

  /**
   * Genera un ID temporal único
   * @returns {string} - ID temporal con formato temp_timestamp_random
   */
  function generateTempId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Obtiene el ID real correspondiente a un ID temporal
   * @param {string} tempId - ID temporal
   * @returns {string} - ID real o el mismo ID si no es temporal
   */
  function getRealId(tempId) {
    return tempToRealIdMap[tempId] || tempId
  }

  /**
   * Verifica si un ID es temporal
   * @param {string} id - ID a verificar
   * @returns {boolean}
   */
  function isTempId(id) {
    return typeof id === 'string' && id.startsWith('temp_')
  }

  /**
   * Actualiza referencias cruzadas en todos los stores
   * @param {string} tempId - ID temporal
   * @param {string} realId - ID real
   */
  async function updateRefs(tempId, realId) {
    tempToRealIdMap[tempId] = realId
    cm.save('tempToRealIdMap', tempToRealIdMap)

    // Actualizar referencias cruzadas en cada store
    for (const useStore of stores) {
      try {
        const store = useStore()
        const collectionName = store.$id || store.collectionName || 'unknown'

        // Verificar si el store tiene método específico de actualización
        if (typeof store.updateReferencesToItem === 'function') {
          await store.updateReferencesToItem(tempId, realId)
          continue
        }

        // Encontrar el array de items en el store
        let itemsKey = null
        if (store[collectionName] && Array.isArray(store[collectionName])) {
          itemsKey = collectionName
        } else if (store.items && Array.isArray(store.items)) {
          itemsKey = 'items'
        } else {
          // Buscar array plausible
          const stateKeys = Object.keys(store.$state || {})
          for (const key of stateKeys) {
            if (Array.isArray(store[key])) {
              itemsKey = key
              break
            }
          }
        }

        if (itemsKey && store[itemsKey]) {
          updateAllReferencesInStore(tempId, realId, store[itemsKey])
        }
      } catch (error) {
        console.warn(`[idMapper] Error actualizando store:`, error)
      }
    }
  }

  /**
   * Actualiza todas las referencias en un array de items
   * @param {string} oldId - ID viejo
   * @param {string} newId - ID nuevo
   * @param {Array} items - Array de items
   */
  function updateAllReferencesInStore(oldId, newId, items) {
    if (!oldId || !newId || oldId === newId) return 0

    let updatedCount = 0
    const possibleRefFields = [
      'id', 'siembra', 'siembras', 'zona', 'zonas',
      'actividad', 'actividades', 'parent', 'children',
      'relacionados', 'recordatorio', 'recordatorios'
    ]

    items.forEach(item => {
      Object.keys(item).forEach(key => {
        const value = item[key]

        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            if (value[i] === oldId) {
              value[i] = newId
              updatedCount++
            }
          }
        } else if (typeof value === 'string' && value === oldId) {
          item[key] = newId
          updatedCount++
        }
      })
    })

    return updatedCount
  }

  return { generateTempId, getRealId, isTempId, updateRefs }
}
