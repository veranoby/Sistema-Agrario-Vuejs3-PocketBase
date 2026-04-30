/**
 * core.js - Motores principales del sistema de sincronización
 * Consolida Identidad (idMapper), Resolución de Conflictos y Configuración.
 */

import { cache } from '@/utils/cacheManager'

// ============================================================================
// 1. RESOLUCIÓN DE CONFLICTOS
// ============================================================================

export const conflictResolver = {
  /**
   * Resuelve conflicto entre versiones local y remota basándose en timestamps.
   * @param {Object} local - Versión local
   * @param {Object} remote - Versión remota
   * @returns {Object} - Versión ganadora
   */
  resolve(local, remote) {
    const localDate = new Date(local.updated || local.created || 0).getTime()
    const remoteDate = new Date(remote.updated || remote.created || 0).getTime()
    return localDate >= remoteDate ? local : remote
  },

  /**
   * Calcula diferencias entre dos objetos para auditoría de conflictos.
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

// ============================================================================
// 2. MAPEO DE IDENTIDAD (IDs Temporales)
// ============================================================================

export function createIdMapper({ stores }) {
  const tempToRealIdMap = cache.get('tempToRealIdMap') || {}

  return {
    generateTempId() {
      return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },

    getRealId(tempId) {
      return tempToRealIdMap[tempId] || tempId
    },

    isTempId(id) {
      return typeof id === 'string' && id.startsWith('temp_')
    },

    async updateRefs(tempId, realId) {
      tempToRealIdMap[tempId] = realId
      cache.set('tempToRealIdMap', tempToRealIdMap)

      for (const useStore of stores) {
        try {
          const store = useStore()
          if (typeof store.updateReferencesToItem === 'function') {
            await store.updateReferencesToItem(tempId, realId)
            continue
          }

          // Inyectar referencia en arrays del estado si no hay método especializado
          const itemsKey = store.$id
          store.$patch((state) => {
            const items = state[itemsKey] || state.items || []
            if (!Array.isArray(items)) return

            state[itemsKey] = items.map(item => {
              const newItem = { ...item }
              let changed = false
              Object.keys(newItem).forEach(key => {
                if (newItem[key] === tempId) {
                  newItem[key] = realId
                  changed = true
                }
                if (Array.isArray(newItem[key]) && newItem[key].includes(tempId)) {
                  newItem[key] = newItem[key].map(id => id === tempId ? realId : id)
                  changed = true
                }
              })
              return changed ? newItem : item
            })
          })
        } catch (e) { /* ignore */ }
      }
    },

    setMap(map) { Object.assign(tempToRealIdMap, map) },
    getMap() { return { ...tempToRealIdMap } }
  }
}

// ============================================================================
// 3. CONFIGURACIÓN DE SINCRONIZACIÓN
// ============================================================================

export function createSyncConfig({ cacheManager: cm = cache }) {
  const defaultConfig = {
    enabled: false,
    collections: {
      Haciendas: { enabled: true, priority: 'high', immediate: true },
      actividades: { enabled: true, priority: 'high', immediate: true },
      siembras: { enabled: true, priority: 'medium', immediate: true },
      zonas: { enabled: true, priority: 'medium', immediate: true },
      programaciones: { enabled: true, priority: 'low', immediate: false },
      bitacora: { enabled: true, priority: 'low', immediate: false }
    },
    deferredSyncInterval: 30000
  }

  let config = cm.get('selectiveSyncConfig') || defaultConfig

  return {
    shouldSyncImmediately(col) {
      if (!config.enabled) return true
      return config.collections[col]?.immediate ?? true
    },
    getPriority(col) {
      if (!config.enabled) return 'high'
      return config.collections[col]?.priority ?? 'medium'
    },
    updateConfig(newConfig) {
      config = { ...config, ...newConfig }
      cm.set('selectiveSyncConfig', config)
    },
    getConfig() { return config }
  }
}
