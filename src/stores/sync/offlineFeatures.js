/**
 * offlineFeatures.js
 * Factory para funcionalidades offline
 * Búsqueda fuzzy y cache inteligente
 */

import { cache } from '@/utils/cacheManager'

/**
 * Crea gestor de funcionalidades offline
 * @param {Object} params - { stores: Array<Function>, cacheManager: Object }
 * @returns {Object} - { buildIndex, searchOffline }
 */
export function createOfflineFeatures({ stores, cacheManager: cm = cache }) {
  const searchIndex = new Map()

  /**
   * Construye índice de búsqueda desde todos los stores
   */
  async function buildIndex() {
    for (const useStore of stores) {
      try {
        const store = useStore()
        const items = store.items || store.list || []
        searchIndex.set(store.$id, items)
      } catch (error) {
        console.warn(`[offlineFeatures] Error indexando store:`, error)
      }
    }
  }

  /**
   * Búsqueda fuzzy offline
   * @param {string} query - Query de búsqueda
   * @param {Object} options - { limit: number, fields: Array<string> }
   * @returns {Array} - Resultados ordenados por score
   */
  function searchOffline(query, options = {}) {
    const { limit = 50, fields = ['name', 'nombre', 'descripcion'] } = options
    const normalizedQuery = query.toLowerCase().trim()
    const results = []

    for (const [collection, items] of searchIndex) {
      for (const item of items) {
        let score = 0
        
        for (const field of fields) {
          const value = item[field]
          if (typeof value === 'string' && value.toLowerCase().includes(normalizedQuery)) {
            score += 10
          }
        }
        
        if (score > 0) {
          results.push({ ...item, collection, score })
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  return { buildIndex, searchOffline }
}
