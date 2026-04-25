/**
 * syncConfig.js
 * Factory para configuración de sincronización selectiva
 * Define prioridades y comportamiento inmediato/diferido por colección
 */

import { cacheManager } from './cacheManager'

/**
 * Crea configuración de sincronización
 * @param {Object} params - { cacheManager: Object }
 * @returns {Object} - { shouldSyncImmediately, getPriority, updateConfig, getConfig }
 */
export function createSyncConfig({ cacheManager: cm = cacheManager }) {
  const defaultConfig = {
    enabled: false,
    collections: {
      Haciendas: { enabled: true, priority: 'high', immediate: true },
      actividades: { enabled: true, priority: 'high', immediate: true },
      siembras: { enabled: true, priority: 'medium', immediate: true },
      zonas: { enabled: true, priority: 'medium', immediate: true },
      programaciones: { enabled: true, priority: 'low', immediate: false },
      bitacora: { enabled: true, priority: 'low', immediate: false },
      recordatorios: { enabled: false, priority: 'low', immediate: false }
    },
    deferredSyncInterval: 30000,
    lastDeferredSync: null
  }

  let config = cm.get('selectiveSyncConfig') || defaultConfig

  /**
   * Determina si una colección debe sincronizarse inmediatamente
   * @param {string} collection - Nombre de colección
   * @returns {boolean}
   */
  function shouldSyncImmediately(collection) {
    if (!config.enabled) return true
    return config.collections[collection]?.immediate ?? true
  }

  /**
   * Obtiene la prioridad de una colección
   * @param {string} collection - Nombre de colección
   * @returns {string} - 'high' | 'medium' | 'low'
   */
  function getPriority(collection) {
    if (!config.enabled) return 'high'
    return config.collections[collection]?.priority ?? 'medium'
  }

  /**
   * Actualiza la configuración
   * @param {Object} newConfig - Configuración parcial a actualizar
   */
  function updateConfig(newConfig) {
    config = { ...config, ...newConfig }
    cm.save('selectiveSyncConfig', config)
  }

  /**
   * Obtiene la configuración completa
   * @returns {Object}
   */
  function getConfig() {
    return config
  }

  return { shouldSyncImmediately, getPriority, updateConfig, getConfig }
}
