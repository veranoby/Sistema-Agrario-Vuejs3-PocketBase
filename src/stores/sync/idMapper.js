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

    for (const useStore of stores) {
      try {
        const store = useStore()

        // Si tiene método propio, usarlo
        if (typeof store.updateReferencesToItem === 'function') {
          await store.updateReferencesToItem(tempId, realId)
          continue
        }

        // Encontrar el key del array de items
        const itemsKey = findItemsKey(store)
        if (!itemsKey) continue

        // FIX REACTIVIDAD: Usar $patch con acceso correcto
        store.$patch((state) => {
          const items = state[itemsKey]
          if (!Array.isArray(items)) return

          state[itemsKey] = items.map(item => {
            let changed = false
            const newItem = { ...item }

            Object.keys(newItem).forEach(key => {
              if (newItem[key] === tempId) {
                newItem[key] = realId
                changed = true
              }
              // Manejar arrays de referencias
              if (Array.isArray(newItem[key]) && newItem[key].includes(tempId)) {
                newItem[key] = newItem[key].map(id => id === tempId ? realId : id)
                changed = true
              }
            })

            return changed ? newItem : item
          })
        })

      } catch (error) {
        console.warn('[idMapper] Error actualizando store:', error)
      }
    }
  }

  /**
   * Helper para encontrar el key del array de items
   * @param {Object} store - Store de Pinia
   * @returns {string|null} - Key del array o null
   */
  function findItemsKey(store) {
    const collectionName = store.$id || ''

    // Intentar por nombre de colección
    if (store[collectionName] && Array.isArray(store[collectionName])) {
      return collectionName
    }

    // Intentar 'items'
    if (store.items && Array.isArray(store.items)) {
      return 'items'
    }

    // Buscar en state
    for (const key of Object.keys(store.$state || {})) {
      if (Array.isArray(store[key])) {
        return key
      }
    }

    return null
  }

  function setMap(map) {
    Object.assign(tempToRealIdMap, map)
  }

  function getMap() {
    return { ...tempToRealIdMap }
  }

  return { generateTempId, getRealId, isTempId, updateRefs, setMap, getMap }
}
