/**
 * Cache Manager con TTL para optimizar cargas de datos
 * @module utils/cacheManager
 */

import { logger } from '@/utils/logger'

/**
 * Configuración por defecto del cache
 */
const DEFAULT_CONFIG = {
  ttl: 600000, // 10 minutos en milisegundos
  maxSize: 100, // Máximo número de entradas
  cleanupInterval: 300000 // 5 minutos entre limpiezas
}

/**
 * Entry individual del cache
 * @typedef {Object} CacheEntry
 * @property {*} data - Datos almacenados
 * @property {number} timestamp - Timestamp de creación
 * @property {number} ttl - Time to live específico para esta entrada
 * @property {number} hits - Número de accesos
 */

/**
 * Cache Manager con soporte TTL y LRU eviction
 */
export class CacheManager {
  constructor(config = {}) {
    this.cache = new Map()
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.hits = 0
    this.misses = 0
    this.accessOrder = [] // Array para mantener el orden de acceso para LRU O(1)
    this.maxSize = this.config.maxSize; // Exponer maxSize para tests
  }

  /**
   * Obtiene un valor del cache.
   * Realiza "lazy eviction" si el item ha expirado.
   * Actualiza el orden de acceso para LRU.
   * @param {string} key - Clave del cache
   * @returns {*} Datos almacenados o null si no existe/expiró
   */
  get(key) {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    // Lazy eviction: Verificar expiración al acceder
    if (this.isExpired(key)) {
      this.delete(key) // Usa el método delete refactorizado
      this.misses++
      return null
    }

    // Actualizar orden de acceso para LRU
    this._updateAccessOrder(key)

    entry.hits++
    this.hits++
    return entry.data
  }

  /**
   * Almacena un valor en el cache.
   * @param {string} key - Clave del cache
   * @param {*} data - Datos a almacenar
   * @param {number} [ttl] - TTL específico (usa default si no se proporciona)
   */
  set(key, data, ttl = null) {
    // Si la clave ya existe, la tratamos como una actualización
    if (this.cache.has(key)) {
      this._updateAccessOrder(key)
    } else {
      // Si es una clave nueva y el cache está lleno, evict
      if (this.cache.size >= this.maxSize) {
        this.evictLRU()
      }
      // Añadir nueva clave al final del orden de acceso
      this.accessOrder.push(key)
    }

    const entry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      hits: this.cache.get(key)?.hits || 0 // Mantiene los hits si la clave se actualiza
    }

    this.cache.set(key, entry)
  }

  /**
   * Verifica si una entrada existe y no ha expirado
   * @param {string} key - Clave del cache
   * @returns {boolean} True si existe y es válida
   */
  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false
    // Realiza chequeo de expiración sin eliminar para no tener efectos secundarios
    return !this.isExpired(key)
  }

  /**
   * Elimina una entrada del cache y de la lista de acceso.
   * @param {string} key - Clave del cache
   * @returns {boolean} True si se eliminó
   */
  delete(key) {
    const deleted = this.cache.delete(key)
    if (deleted) {
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
    }
    return deleted
  }

  /**
   * Limpia todas las entradas del cache y la lista de acceso.
   */
  clear() {
    this.cache.clear()
    this.accessOrder = []
    this.hits = 0
    this.misses = 0
  }
  
  /**
   * Obtiene el número actual de items en el cache.
   * @returns {number} Cantidad de items.
   */
  getSize() {
    return this.cache.size;
  }

  /**
   * Obtiene los metadatos de una entrada del cache (sin los datos).
   * @param {string} key - Clave del cache
   * @returns {Object|null} Metadatos de la entrada o null si no existe.
   */
  getMetadata(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    // Retornar una copia sin la propiedad 'data'
    const { data, ...metadata } = entry;
    return {
      ...metadata,
      expiresAt: metadata.ttl !== -1 ? metadata.timestamp + metadata.ttl : undefined // undefined if no expiry
    };
  }

  /**
   * Mueve una clave al final de la lista de acceso (marcando como recientemente usada).
   * @private
   */
  _updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      // Remueve del lugar actual y lo pone al final
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }
  }

  /**
   * Evicta la entrada menos usada recientemente (LRU) en O(1).
   */
  evictLRU() {
    // El primer elemento en accessOrder es el menos recientemente usado
    const lruKey = this.accessOrder.shift()
    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Verifica si una entrada (por clave) ha expirado
   * @param {string} key - Clave del cache
   * @returns {boolean} True si ha expirado o no existe
   */
  isExpired(key) { // Public method now takes key
    const entry = this.cache.get(key);
    if (!entry) return true; // Si no existe, se considera expirado/no válido
    if (entry.ttl === -1) return false; // TTL de -1 significa que nunca expira
    return (Date.now() - entry.timestamp) > entry.ttl;
  }

  /**
   * Obtiene estadísticas del cache
   * @returns {Object} Estadísticas de uso
   */
  getStats() {
    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests * 100).toFixed(2) : 0

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        hits: entry.hits,
        expiresAt: entry.ttl !== -1 ? entry.timestamp + entry.ttl : undefined
      }))
    }
  }

  /**
   * Destruye el cache y limpia timers
   */
  destroy() {
    this.clear()
  }
}

/**
 * Instancia global del cache para uso en toda la aplicación
 */
let globalCache = null

/**
 * Obtiene o crea la instancia global del cache
 */
function getGlobalCache() {
  if (!globalCache) {
    globalCache = new CacheManager({
      ttl: 600000, // 10 minutos
      maxSize: 200
    })
  }
  return globalCache
}

/**
 * Wrapper para usar el cache global
 */
export const cache = {
  get: (key) => getGlobalCache().get(key),
  set: (key, data, ttl) => getGlobalCache().set(key, data, ttl),
  has: (key) => getGlobalCache().has(key),
  delete: (key) => getGlobalCache().delete(key),
  clear: () => getGlobalCache().clear(),
  getOrCompute: (key, fn, ttl) => getGlobalCache().getOrCompute(key, fn, ttl),
  invalidatePattern: (pattern) => getGlobalCache().invalidatePattern(pattern),
  getStats: () => getGlobalCache().getStats(),
  destroy: () => {
    if (globalCache) {
      globalCache.destroy()
      globalCache = null
    }
  }
}

/**
 * Helper para generar claves de cache
 */
export const CacheKeys = {
  users: (page = 1, perPage = 50) => `users:page:${page}:perPage:${perPage}`,
  haciendas: (page = 1, perPage = 50) => `haciendas:page:${page}:perPage:${perPage}`,
  userStats: () => 'stats:users',
  haciendaStats: () => 'stats:haciendas',
  userGrowth: (days) => `growth:users:${days}d`,
  actividades: (haciendaId) => `actividades:hacienda:${haciendaId}`,
  programaciones: (haciendaId) => `programaciones:hacienda:${haciendaId}`,
  bitacora: (haciendaId, filters) => `bitacora:hacienda:${haciendaId}:${JSON.stringify(filters)}`,
  tiposActividades: () => 'tipos:actividades'
}

/**
 * Decorador para cachear resultados de funciones asíncronas
 * @param {string} keyFn - Función para generar la clave del cache o string
 * @param {number} [ttl] - TTL específico
 * @returns {Function} Función decorada
 */
export function cached(keyFn, ttl = null) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args) {
      const key = typeof keyFn === 'function'
        ? keyFn(...args)
        : keyFn

      // Intentar obtener del cache
      const cached = getGlobalCache().get(key)
      if (cached !== null) {
        return cached
      }

      // Ejecutar función original
      const result = await originalMethod.apply(this, args)

      // Guardar en cache
      getGlobalCache().set(key, result, ttl)

      return result
    }

    return descriptor
  }
}

// Exportar por defecto la clase
export default CacheManager
