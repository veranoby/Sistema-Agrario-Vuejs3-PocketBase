import { ref } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

// TTL de caché en milisegundos (5 minutos)
const CACHE_TTL = 5 * 60 * 1000

// Caché global de validaciones (compartido entre instancias)
const checkedFields = new Map()

// Timer para limpieza automática de caché
let cleanupTimer = null

/**
 * Composable para validación de campos con caché TTL
 * Reemplaza validationStore - evita peticiones redundantes a PocketBase
 */
export function useValidation() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Verifica disponibilidad de campos con caché
   * @param {Array} fields - Array de { collection, field, value }
   * @param {Object} options - { skipCache: boolean }
   * @returns {Object} - { [fieldName]: boolean } true = disponible, false = ocupado
   */
  async function checkFieldsTaken(fields, options = {}) {
    const { skipCache = false } = options
    const results = {}
    const fieldsToCheck = []

    // Verificar caché primero
    for (const field of fields) {
      const cacheKey = generateCacheKey(field)
      const cached = checkedFields.get(cacheKey)

      if (!skipCache && cached && !isExpired(cached)) {
        results[field.field] = cached.available
        logger.debug('[USE_VALIDATION] Cache hit:', { field: field.field, available: cached.available })
      } else {
        fieldsToCheck.push(field)
        // Limpiar entrada expirada si existe
        if (cached && isExpired(cached)) {
          checkedFields.delete(cacheKey)
        }
      }
    }

    // Si todo está en caché, retornar inmediatamente
    if (fieldsToCheck.length === 0) {
      return results
    }

    // Consultar campos no cacheados
    loading.value = true
    error.value = null

    try {
      // Agrupar por colección para eficiencia
      const collections = new Map()
      for (const field of fieldsToCheck) {
        if (!collections.has(field.collection)) {
          collections.set(field.collection, [])
        }
        collections.get(field.collection).push(field)
      }

      // Procesar cada colección
      for (const [collection, collectionFields] of collections.entries()) {
        const filters = collectionFields
          .map(f => `${f.field} = "${f.value.replace(/"/g, '\\"')}"`)
          .join(' || ')

        const result = await pb.collection(collection).getList(1, 1, { filter: filters })

        // Procesar resultados y guardar en caché
        for (const field of collectionFields) {
          const isTaken = result.items.some(item => item[field.field] === field.value)
          const available = !isTaken

          results[field.field] = available

          // GUARDAR en caché
          const cacheKey = generateCacheKey(field)
          checkedFields.set(cacheKey, {
            available,
            timestamp: Date.now()
          })

          logger.debug('[USE_VALIDATION] Cache miss - consultado:', { field: field.field, available })
        }
      }

      return results
    } catch (err) {
      error.value = err.message
      handleError(err, 'Error validando campos')

      // En caso de error, asumir disponible para no bloquear UX
      for (const field of fieldsToCheck) {
        results[field.field] = true
      }
      return results
    } finally {
      loading.value = false
    }
  }

  /**
   * Verifica si una entrada de caché está expirada
   */
  function isExpired(cachedEntry) {
    return Date.now() - cachedEntry.timestamp > CACHE_TTL
  }

  /**
   * Genera clave única para caché
   */
  function generateCacheKey(field) {
    return `${field.collection}:${field.field}:${field.value.toLowerCase()}`
  }

  /**
   * Limpia entradas expiradas del caché
   */
  function clearExpiredCache() {
    const now = Date.now()
    let clearedCount = 0

    for (const [key, entry] of checkedFields.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        checkedFields.delete(key)
        clearedCount++
      }
    }

    if (clearedCount > 0) {
      logger.info('[USE_VALIDATION] Limpieza de caché:', { clearedCount, remaining: checkedFields.size })
    }

    return clearedCount
  }

  /**
   * Limpia todo el caché
   */
  function clearCache() {
    const size = checkedFields.size
    checkedFields.clear()
    logger.info('[USE_VALIDATION] Caché limpiado completamente:', { previousSize: size })
  }

  /**
   * Invalida caché específico para un campo
   */
  function invalidateCache(collection, field, value) {
    const cacheKey = `${collection}:${field}:${value.toLowerCase()}`
    if (checkedFields.has(cacheKey)) {
      checkedFields.delete(cacheKey)
      logger.debug('[USE_VALIDATION] Cache invalidado:', { collection, field, value })
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  function getCacheStats() {
    const now = Date.now()
    let expired = 0
    let valid = 0

    for (const entry of checkedFields.values()) {
      if (now - entry.timestamp > CACHE_TTL) {
        expired++
      } else {
        valid++
      }
    }

    return {
      total: checkedFields.size,
      valid,
      expired,
      ttl: CACHE_TTL
    }
  }

  return {
    loading,
    error,
    checkFieldsTaken,
    clearExpiredCache,
    clearCache,
    invalidateCache,
    getCacheStats
  }
}

// Iniciar limpieza automática cada 5 minutos
function startAutoCleanup() {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const { clearExpiredCache } = useValidation()
    clearExpiredCache()
  }, CACHE_TTL)

  logger.info('[USE_VALIDATION] Limpieza automática iniciada (TTL: 5min)')
}

// Iniciar limpieza automática al importar
startAutoCleanup()

// Función para detener limpieza (útil en tests o cleanup)
export function stopAutoCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
    logger.info('[USE_VALIDATION] Limpieza automática detenida')
  }
}
