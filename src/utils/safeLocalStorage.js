/**
 * SafeLocalStorage - Wrapper seguro para localStorage con manejo de quota
 *
 * Características:
 * - Verificación de tamaño antes de guardar (límite 4MB)
 * - Manejo de QuotaExceededError
 * - Cleanup de datos antiguos cuando se llena el localStorage
 * - Compresión de datos grandes si es necesario
 */

const MAX_ITEM_SIZE = 4 * 1024 * 1024 // 4MB por item
const MAX_TOTAL_SIZE = 8 * 1024 * 1024 // 8MB total aproximado
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 días

class SafeLocalStorage {
  constructor() {
    this.prefix = 'app_'
  }

  /**
   * Calcula el tamaño de un dato en bytes
   */
  getSize(data) {
    const serialized = JSON.stringify(data)
    return new Blob([serialized]).size
  }

  /**
   * Estima el tamaño total usado en localStorage
   */
  getEstimatedTotalSize() {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      total += new Blob([key + value]).size
    }
    return total
  }

  /**
   * Guarda datos en localStorage con verificación de tamaño
   * @param {string} key - Clave para guardar
   * @param {any} data - Datos a guardar
   * @param {Object} options - Opciones adicionales
   * @param {boolean} options.skipSizeCheck - Saltar verificación de tamaño (no recomendado)
   * @returns {boolean} true si se guardó correctamente, false en caso contrario
   */
  saveToLocalStorage(key, data, options = {}) {
    try {
      const serialized = JSON.stringify(data)
      const size = new Blob([serialized]).size

      // Verificar tamaño del item
      if (!options.skipSizeCheck && size > MAX_ITEM_SIZE) {
        console.warn(`[SafeLocalStorage] Data too large for key "${key}": ${size} bytes (max: ${MAX_ITEM_SIZE})`)
        return this.handleLargeData(key, data, size)
      }

      // Verificar si estamos cerca del límite total
      const estimatedTotal = this.getEstimatedTotalSize()
      if (estimatedTotal + size > MAX_TOTAL_SIZE) {
        console.warn(`[SafeLocalStorage] Near total quota limit. Attempting cleanup...`)
        this.cleanupOldData()
      }

      localStorage.setItem(key, serialized)
      return true
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        return this.handleQuotaExceeded(key, data)
      }
      console.error(`[SafeLocalStorage] Error saving "${key}":`, error)
      return false
    }
  }

  /**
   * Carga datos desde localStorage
   * @param {string} key - Clave a cargar
   * @returns {any|null} Datos parseados o null si no existe
   */
  loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`[SafeLocalStorage] Error loading "${key}":`, error)
      return null
    }
  }

  /**
   * Elimina datos desde localStorage
   * @param {string} key - Clave a eliminar
   * @returns {boolean} true si se eliminó correctamente
   */
  removeFromLocalStorage(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`[SafeLocalStorage] Error removing "${key}":`, error)
      return false
    }
  }

  /**
   * Maneja datos que exceden el límite de tamaño
   */
  handleLargeData(key, data, size) {
    console.warn(`[SafeLocalStorage] Attempting to compress large data for "${key}"`)

    // Si es un array, intentar truncar datos antiguos
    if (Array.isArray(data) && data.length > 1000) {
      console.warn(`[SafeLocalStorage] Truncating array from ${data.length} items`)
      const truncated = data.slice(-500) // Mantener solo los últimos 500
      return this.saveToLocalStorage(key, truncated, { skipSizeCheck: true })
    }

    // Si es un objeto, intentar remover propiedades no esenciales
    if (typeof data === 'object' && data !== null) {
      const compressed = this.compressObject(data)
      if (this.getSize(compressed) < MAX_ITEM_SIZE) {
        return this.saveToLocalStorage(key, compressed, { skipSizeCheck: true })
      }
    }

    console.error(`[SafeLocalStorage] Cannot save "${key}": data too large even after compression`)
    return false
  }

  /**
   * Comprime un objeto removiendo propiedades no esenciales
   */
  compressObject(obj) {
    // Propiedades que generalmente se pueden comprimir/remover
    const compressibleProps = ['logs', 'history', 'tempData', 'cache']

    if (Array.isArray(obj)) {
      return obj
    }

    const compressed = { ...obj }
    for (const prop of compressibleProps) {
      if (prop in compressed) {
        delete compressed[prop]
      }
    }

    return compressed
  }

  /**
   * Maneja QuotaExceededError
   */
  handleQuotaExceeded(key, data) {
    console.error(`[SafeLocalStorage] Quota exceeded for "${key}". Attempting cleanup...`)

    // Primer intento: limpiar datos antiguos
    this.cleanupOldData()

    // Segundo intento: intentar guardar después del cleanup
    try {
      localStorage.setItem(key, JSON.stringify(data))
      console.log(`[SafeLocalStorage] Successfully saved "${key}" after cleanup`)
      return true
    } catch (error) {
      console.error(`[SafeLocalStorage] Still cannot save "${key}" after cleanup`)
      return false
    }
  }

  /**
   * Limpia datos antiguos de localStorage
   */
  cleanupOldData() {
    console.log('[SafeLocalStorage] Cleaning up old data...')

    const now = Date.now()
    const keysToRemove = []

    // Buscar entradas con timestamp antiguo
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      // No limpiar datos críticos
      if (this.isCriticalKey(key)) {
        continue
      }

      // Verificar si es un dato con timestamp
      const value = localStorage.getItem(key)
      try {
        const parsed = JSON.parse(value)
        if (parsed.timestamp && (now - parsed.timestamp) > MAX_AGE) {
          keysToRemove.push(key)
        }
      } catch {
        // No es JSON, no tiene timestamp
      }
    }

    // Remover entradas antiguas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`[SafeLocalStorage] Removed old data: ${key}`)
    })

    if (keysToRemove.length > 0) {
      console.log(`[SafeLocalStorage] Cleaned up ${keysToRemove.length} old entries`)
    } else {
      console.log('[SafeLocalStorage] No old data to clean')
    }
  }

  /**
   * Determina si una clave es crítica y no debe ser eliminada
   */
  isCriticalKey(key) {
    const criticalKeys = [
      'pocketbase_auth',
      'rememberMe_active',
      'last_auth_success',
      'rememberedUser'
    ]
    return criticalKeys.some(critical => key.includes(critical))
  }

  /**
   * Limpia todos los datos de la aplicación (excepto críticos si se especifica)
   */
  clearAll(keepCritical = false) {
    const keysToRemove = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (keepCritical && this.isCriticalKey(key)) {
        continue
      }

      keysToRemove.push(key)
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })

    console.log(`[SafeLocalStorage] Cleared ${keysToRemove.length} entries`)
  }
}

// Instancia singleton
export const safeLocalStorage = new SafeLocalStorage()

// Exportar clase por si se necesita una instancia personalizada
export { SafeLocalStorage }
