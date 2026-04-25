/**
 * cacheManager.js
 * Stateless wrapper sobre localStorage
 * Encapsula el acceso a localStorage para facilitar migración a IndexedDB
 */

export const cacheManager = {
  /**
   * Guarda datos en localStorage
   * @param {string} key - Clave de almacenamiento
   * @param {*} data - Datos a guardar (serán JSON.stringify)
   */
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('[cacheManager] Error guardando:', key, error)
    }
  },

  /**
   * Obtiene datos de localStorage
   * @param {string} key - Clave de almacenamiento
   * @returns {*} Datos parseados o null si no existe
   */
  get(key) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('[cacheManager] Error leyendo:', key, error)
      return null
    }
  },

  /**
   * Elimina una clave específica
   * @param {string} key - Clave a eliminar
   */
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('[cacheManager] Error eliminando:', key, error)
    }
  },

  /**
   * Elimina todas las claves con un prefijo específico
   * @param {string} prefix - Prefijo de las claves a eliminar
   */
  clear(prefix) {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('[cacheManager] Error limpiando prefijo:', prefix, error)
    }
  }
}
