/**
 * cacheManager.js
 * Factory para crear wrappers de localStorage con namespace
 * Permite aislar caché de diferentes módulos
 */

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
        console.error('[cacheManager] Error guardando:', key, error)
      }
    },

    get(key) {
      try {
        const item = localStorage.getItem(`${prefix}${key}`)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error('[cacheManager] Error leyendo:', key, error)
        return null
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(`${prefix}${key}`)
      } catch (error) {
        console.error('[cacheManager] Error eliminando:', key, error)
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
        console.error('[cacheManager] Error limpiando:', error)
      }
    }
  }
}

/**
 * Instancia por defecto sin prefijo (backward compatible)
 */
export const cacheManager = createCacheManager()
