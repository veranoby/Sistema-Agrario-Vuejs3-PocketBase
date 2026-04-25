/**
 * conflictResolver.js
 * Pure logic - testeable en Node sin mocks
 * Resuelve conflictos basándose en timestamps y calcula diferencias
 */

export const conflictResolver = {
  /**
   * Resuelve conflicto entre versiones local y remota
   * Gana la versión más reciente (timestamp mayor)
   * @param {Object} local - Versión local
   * @param {Object} remote - Versión remota
   * @returns {Object} - Versión ganadora
   */
  resolve(local, remote) {
    const localDate = new Date(local.updated).getTime()
    const remoteDate = new Date(remote.updated).getTime()
    return localDate >= remoteDate ? local : remote
  },

  /**
   * Calcula diferencias entre dos objetos
   * @param {Object} itemA - Primer objeto
   * @param {Object} itemB - Segundo objeto
   * @returns {Array} - Array de diferencias { field, local, remote }
   */
  diffFields(itemA, itemB) {
    const diffs = []
    const allKeys = new Set([...Object.keys(itemA), ...Object.keys(itemB)])
    
    for (const key of allKeys) {
      if (JSON.stringify(itemA[key]) !== JSON.stringify(itemB[key])) {
        diffs.push({ field: key, local: itemA[key], remote: itemB[key] })
      }
    }
    
    return diffs
  }
}
