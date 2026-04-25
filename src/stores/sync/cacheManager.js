/**
 * cacheManager.js
 * Factory para crear wrappers de localStorage con namespace
 * Permite aislar caché de diferentes módulos
 */

import { handleError } from '@/utils/errorHandler'

/**
 * Crea un gestor de caché con prefijo de namespace
 * @param {string} prefix - Prefijo para las keys (ej: 'agri_sync_')
 * @returns {Object} - { save, get, remove, clear }
 */
export function createCacheManager(prefix = '') {
  return {
    save(key, data) {
      try {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(data))
      } catch (error) {
        handleError(error, 'Error guardando en caché')
      }
    },

    get(key) {
      try {
        const item = localStorage.getItem(`${prefix}${key}`)
        return item ? JSON.parse(item) : null
      } catch (error) {
        handleError(error, 'Error leyendo de caché')
        return null
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(`${prefix}${key}`)
      } catch (error) {
        handleError(error, 'Error eliminando de caché')
      }
    },

    clear() {
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        handleError(error, 'Error limpiando caché')
      }
    }
  }
}

/**
 * Instancia por defecto sin prefijo (backward compatible)
 */
export const cacheManager = createCacheManager()
