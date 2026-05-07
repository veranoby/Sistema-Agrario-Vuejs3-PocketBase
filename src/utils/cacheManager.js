/**
 * Cache Manager con TTL para optimizar cargas de datos
 * @module utils/cacheManager
 */

import { logger } from '@/utils/logger'
import { CACHE_LEVELS, CACHE_KEYS } from '@/constants/bpa'
import { IndexedDBStorage } from '@/utils/indexedDBStorage'

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
    // eslint-disable-next-line no-unused-vars
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

  /**
   * Invalidates entradas que coincidan con un patrón de clave.
   * @param {string} pattern - Patrón de clave (substring)
   */
  invalidatePattern(pattern) {
    const keysToDelete = []
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.delete(key))
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
 * Helper para generar claves de cache con nivel
 */
export const CacheKeys = {
  // L1 Keys (datos de lookup)
  tiposActividades: () => ({ key: CACHE_KEYS.TIPOS_ACTIVIDADES(), level: CACHE_LEVELS.LOOKUP }),
  tiposZonas: () => ({ key: CACHE_KEYS.TIPOS_ZONAS(), level: CACHE_LEVELS.LOOKUP }),
  planes: () => ({ key: CACHE_KEYS.PLANES_CONFIG(), level: CACHE_LEVELS.LOOKUP }),

  // L2 Keys (datos recientes)
  actividades: (haciendaId) => ({ key: CACHE_KEYS.ACTIVIDADES(haciendaId), level: CACHE_LEVELS.RECENT }),
  bitacoras: (haciendaId) => ({ key: CACHE_KEYS.BITACORAS(haciendaId), level: CACHE_LEVELS.RECENT }),
  siembras: (haciendaId) => ({ key: CACHE_KEYS.SIEMBRAS(haciendaId), level: CACHE_LEVELS.RECENT }),
  programaciones: (haciendaId) => ({ key: CACHE_KEYS.PROGRAMACIONES(haciendaId), level: CACHE_LEVELS.RECENT }),

  // L3 Keys (paginación)
  paginatedResult: (collection, page, filters) => ({
    key: `${collection}:page:${page}:${JSON.stringify(filters)}`,
    level: CACHE_LEVELS.PAGINATION
  }),

  // Legacy keys (backward compatibility)
  users: (page = 1, perPage = 50) => `users:page:${page}:perPage:${perPage}`,
  haciendas: (page = 1, perPage = 50) => `haciendas:page:${page}:perPage:${perPage}`,
  userStats: () => 'stats:users',
  haciendaStats: () => 'stats:haciendas',
  userGrowth: (days) => `growth:users:${days}d`,
  tiposActividadesLegacy: () => 'tipos:actividades'
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

      // GUARDAR en cache
      getGlobalCache().set(key, result, ttl)

      return result
    }

    return descriptor
  }
}

// Exportar por defecto la clase
export default CacheManager

/**
 * TieredCacheManager - Cache de 3 niveles para optimización BPA
 * L1: Lookup Data (TTL: 1 hora) - Tipos de actividades, zonas, configuración
 * L2: Recent Entries (TTL: 10 minutos) - Últimas actividades, bitácoras, siembras
 * L3: Pagination (TTL: 5 minutos) - Resultados paginados, listas filtradas
 */
export class TieredCacheManager extends CacheManager {
  constructor() {
    super({
      ttl: 600000,  // 10 minutos default
      maxSize: 300   // Aumentado de 200
    })

    // Cachés separados por nivel
    // L1: Mantiene en memoria/localStorage (Lookup)
    this.l1Cache = new CacheManager({ ttl: 3600000, maxSize: 50 })   // 1 hora

    // L2 y L3: Migrados a IndexedDB (Hito 2)
    this.l2Storage = new IndexedDBStorage('agriCacheL2', 'recent')
    this.l3Storage = new IndexedDBStorage('agriCacheL3', 'pagination')

    // Trackers de claves para soporte de invalidación por patrón en IndexedDB
    this.l1Keys = new Set()   // Claves en L1 (memoria)
    this.l2Keys = new Set()   // Claves en L2 (IndexedDB)
    this.l3Keys = new Set()   // Claves en L3 (IndexedDB)
  }

  /**
   * Obtiene del nivel apropiado de cache
   * @param {string} key - Clave del cache
   * @param {string} level - 'l1' | 'l2' | 'l3'
   */
  async getFromLevel(key, level = CACHE_LEVELS.RECENT) {
    try {
      if (level === CACHE_LEVELS.LOOKUP) {
        const data = this.l1Cache.get(key)
        if (data !== null) this.l1Keys.add(key)
        return data
      } else if (level === CACHE_LEVELS.RECENT) {
        const data = await this.l2Storage.getItem(key)
        if (data !== null) this.l2Keys.add(key)
        return data
      } else if (level === CACHE_LEVELS.PAGINATION) {
        const data = await this.l3Storage.getItem(key)
        if (data !== null) this.l3Keys.add(key)
        return data
      }
      logger.warn(`[TieredCache] Nivel inválido: ${level}`)
      return null
    } catch (error) {
      logger.error('[TieredCache] Error obteniendo de IndexedDB:', error)
      return null
    }
  }

  /**
   * Guarda en el nivel especificado
   * @param {string} key - Clave del cache
   * @param {*} data - Datos a almacenar
   * @param {string} level - 'l1' | 'l2' | 'l3'
   * @param {number} [customTtl] - TTL personalizado opcional
   */
  async setToLevel(key, data, level = CACHE_LEVELS.RECENT, customTtl = null) {
    try {
      if (level === CACHE_LEVELS.LOOKUP) {
        this.l1Cache.set(key, data, customTtl)
        this.l1Keys.add(key)
      } else if (level === CACHE_LEVELS.RECENT) {
        await this.l2Storage.setItem(key, { data, timestamp: Date.now(), ttl: customTtl || 600000 })
        this.l2Keys.add(key)
      } else if (level === CACHE_LEVELS.PAGINATION) {
        await this.l3Storage.setItem(key, { data, timestamp: Date.now(), ttl: customTtl || 300000 })
        this.l3Keys.add(key)
      } else {
        logger.warn(`[TieredCache] Nivel inválido: ${level}`)
      }
    } catch (error) {
      logger.error('[TieredCache] Error guardando en IndexedDB:', error)
    }
  }

  /**
   * Invalida claves que coincidan con un patrón en todos los niveles
   * @param {string} pattern - Patrón de claves a invalidar
   */
  async invalidatePattern(pattern) {
    // Invalidar L1 (memoria)
    this.l1Cache.invalidatePattern(pattern)
    const l1KeysToDelete = Array.from(this.l1Keys).filter(key => key.includes(pattern))
    l1KeysToDelete.forEach(key => this.l1Keys.delete(key))

    // Invalidar L2 (IndexedDB)
    const l2KeysToDelete = Array.from(this.l2Keys).filter(key => key.includes(pattern))
    for (const key of l2KeysToDelete) {
      try {
        await this.l2Storage.removeItem(key)
        this.l2Keys.delete(key)
      } catch (error) {
        logger.error(`[TieredCache] Error eliminando clave L2 ${key}:`, error)
      }
    }

    // Invalidar L3 (IndexedDB)
    const l3KeysToDelete = Array.from(this.l3Keys).filter(key => key.includes(pattern))
    for (const key of l3KeysToDelete) {
      try {
        await this.l3Storage.removeItem(key)
        this.l3Keys.delete(key)
      } catch (error) {
        logger.error(`[TieredCache] Error eliminando clave L3 ${key}:`, error)
      }
    }

    // Limpiar caché en memoria del padre
    super.invalidatePattern(pattern)
  }

  /**
   * Invalida across all levels (método legacy)
   * @param {string} keyPattern - Patrón de claves a invalidar
   */
  async invalidateAcrossLevels(keyPattern) {
    await this.invalidatePattern(keyPattern)
  }

  /**
   * Obtiene estadísticas combinadas
   * @returns {Object} Estadísticas de todos los niveles
   */
  async getCombinedStats() {
    return {
      l1: this.l1Cache.getStats(),
      l2: { size: this.l2Keys.size, note: 'IndexedDB L2' },
      l3: { size: this.l3Keys.size, note: 'IndexedDB L3' },
      totalSize: this.l1Cache.cache.size + this.l2Keys.size + this.l3Keys.size
    }
  }

  /**
   * Override del método get para usar L2 por defecto
   */
  async get(key) {
    return this.getFromLevel(key, CACHE_LEVELS.RECENT)
  }

  /**
   * Override del método set para usar L2 por defecto
   */
  async set(key, data, ttl = null) {
    await this.setToLevel(key, data, CACHE_LEVELS.RECENT, ttl)
  }

  /**
   * Fetch with cache - Intenta obtener de cache, si no existe o expiró, ejecuta fetchFn y cachea.
   * @param {Object} cacheKeyConfig - { key, level }
   * @param {Function} fetchFn - Función asíncrona que retorna los datos
   * @param {number} [ttl] - TTL opcional
   */
  async fetchWithCache(cacheKeyConfig, fetchFn, ttl = null) {
    const { key, level } = cacheKeyConfig

    // 1. Intentar obtener de cache
    const cachedData = await this.getFromLevel(key, level)

    // Si los datos en IndexedDB vienen con metadata (L2/L3), verificar expiración
    if (cachedData && typeof cachedData === 'object' && cachedData.timestamp) {
      const isExpired = (Date.now() - cachedData.timestamp) > (ttl || cachedData.ttl)
      if (!isExpired) {
        logger.debug(`[TieredCache] HIT [${level}]: ${key}`)
        return cachedData.data
      }
      logger.debug(`[TieredCache] EXPIRED [${level}]: ${key}`)
    } else if (cachedData !== null) {
      // L1 no tiene metadata en el objeto retornado (lo maneja internamente CacheManager)
      logger.debug(`[TieredCache] HIT [${level}]: ${key}`)
      return cachedData
    }

    logger.debug(`[TieredCache] MISS [${level}]: ${key}`)

    // 2. Fetch de la fuente
    const freshData = await fetchFn()

    // 3. GUARDAR en cache
    if (freshData !== null && freshData !== undefined) {
      await this.setToLevel(key, freshData, level, ttl)
    }

    return freshData
  }

  /**
   * Limpia todos los niveles de caché
   */
  async clear() {
    // Limpiar L1
    this.l1Cache.clear()
    this.l1Keys.clear()

    // Limpiar L2
    await this.l2Storage.clear()
    this.l2Keys.clear()

    // Limpiar L3
    await this.l3Storage.clear()
    this.l3Keys.clear()

    // Limpiar padre
    super.clear()
  }
}


/**
 * Instancia global del cache tiered para uso en toda la aplicación
 */
let globalTieredCache = null

/**
 * Obtiene o crea la instancia global del cache tiered
 */
function getGlobalTieredCache() {
  if (!globalTieredCache) {
    globalTieredCache = new TieredCacheManager()
  }
  return globalTieredCache
}

/**
 * Wrapper para usar el cache global tiered
 */
export const tieredCache = {
  get: (key) => getGlobalTieredCache().get(key),
  set: (key, data, ttl) => getGlobalTieredCache().set(key, data, ttl),
  fetchWithCache: (config, fn, ttl) => getGlobalTieredCache().fetchWithCache(config, fn, ttl),
  getFromLevel: (key, level) => getGlobalTieredCache().getFromLevel(key, level),
  setToLevel: (key, data, level, ttl) => getGlobalTieredCache().setToLevel(key, data, level, ttl),

  invalidateAcrossLevels: (pattern) => getGlobalTieredCache().invalidateAcrossLevels(pattern),
  invalidatePattern: (pattern) => getGlobalTieredCache().invalidatePattern(pattern),
  getStats: () => getGlobalTieredCache().getCombinedStats(),
  clear: () => getGlobalTieredCache().clear(),
  destroy: () => {
    if (globalTieredCache) {
      globalTieredCache.destroy()
      globalTieredCache = null
    }
  }
}
