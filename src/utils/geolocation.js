/**
 * GeolocationService - Servicio de geolocalización GPS automática
 * 
 * Proporciona métodos para obtener ubicación actual del dispositivo
 * con manejo de errores, precisión y soporte offline.
 * 
 * @module utils/geolocation
 */

import { logger } from './logger'
import { calculateDistance, isValidCoordinate } from './geoUtils'

/**
 * @typedef {Object} GeolocationPosition
 * @property {number} latitude - Latitud en grados decimales
 * @property {number} longitude - Longitud en grados decimales
 * @property {number|null} accuracy - Precisión en metros
 * @property {number|null} altitude - Altitud en metros sobre nivel del mar
 * @property {number|null} altitudeAccuracy - Precisión de altitud en metros
 * @property {number|null} heading - Dirección del movimiento en grados (0-360)
 * @property {number|null} speed - Velocidad en metros/segundo
 * @property {number} timestamp - Timestamp de la lectura
 */

/**
 * @typedef {Object} GeolocationOptions
 * @property {boolean} [enableHighAccuracy=true] - Usar GPS de alta precisión
 * @property {number} [timeout=10000] - Timeout en ms para obtener ubicación
 * @property {number} [maximumAge=0] - Edad máxima de cached location
 */

export class GeolocationService {
  constructor() {
    this.lastPosition = null
    this.watchId = null
    this.isWatching = false
    this.locationHistory = []
    this.maxHistorySize = 100
  }

  /**
   * Obtiene la posición GPS actual del dispositivo
   * 
   * @param {GeolocationOptions} options - Opciones de geolocalización
   * @returns {Promise<GeolocationPosition>} Posición GPS
   * @throws {Error} Si la geolocalización no está soportada o hay error
   * 
   * @example
   * const geo = new GeolocationService()
   * try {
   *   const position = await geo.getCurrentPosition()
   *   console.log(`Lat: ${position.latitude}, Lng: ${position.longitude}`)
   * } catch (error) {
   *   console.error('Error GPS:', error.message)
   * }
   */
  async getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    const config = { ...defaultOptions, ...options }

    return new Promise((resolve, reject) => {
      // Verificar soporte
      if (!navigator.geolocation) {
        const error = new Error('Geolocalización no soportada por este navegador')
        error.code = 'NOT_SUPPORTED'
        logger.error('[GeolocationService]', error.message)
        reject(error)
        return
      }

      logger.debug('[GeolocationService] Solicitando posición GPS...')

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const formattedPosition = this.formatPosition(position)
          this.lastPosition = formattedPosition
          
          logger.debug('[GeolocationService] Posición obtenida:', {
            latitude: formattedPosition.latitude,
            longitude: formattedPosition.longitude,
            accuracy: formattedPosition.accuracy
          })
          
          resolve(formattedPosition)
        },
        (error) => {
          const formattedError = this.formatError(error)
          logger.error('[GeolocationService] Error obteniendo posición:', formattedError)
          reject(formattedError)
        },
        config
      )
    })
  }

  /**
   * Inicia el seguimiento continuo de ubicación
   * Útil para tracking en tiempo real durante operaciones de campo
   * 
   * @param {Function} onUpdate - Callback cuando hay nueva posición
   * @param {Function} onError - Callback cuando hay error
   * @returns {number} Watch ID para cancelar seguimiento
   * 
   * @example
   * const geo = new GeolocationService()
   * const watchId = geo.watchPosition(
   *   (pos) => console.log('Nueva posición:', pos),
   *   (err) => console.error('Error:', err)
   * )
   * 
   * // Para detener:
   * // geo.stopTracking()
   */
  watchPosition(onUpdate, onError) {
    if (!navigator.geolocation) {
      const error = new Error('Geolocalización no soportada')
      error.code = 'NOT_SUPPORTED'
      logger.error('[GeolocationService]', error.message)
      if (onError) onError(error)
      return null
    }

    logger.debug('[GeolocationService] Iniciando seguimiento de posición...')

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const formattedPosition = this.formatPosition(position)
        this.lastPosition = formattedPosition
        
        this.locationHistory.push(formattedPosition)
        if (this.locationHistory.length > this.maxHistorySize) {
          this.locationHistory = this.locationHistory.slice(-this.maxHistorySize)
        }
        
        onUpdate(formattedPosition)
      },
      (error) => {
        const formattedError = this.formatError(error)
        logger.error('[GeolocationService] Error en seguimiento:', formattedError)
        if (onError) onError(formattedError)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    )

    this.isWatching = true
    return this.watchId
  }

  /**
   * Detiene el seguimiento continuo de ubicación
   */
  stopTracking() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
      this.isWatching = false
      logger.debug('[GeolocationService] Seguimiento detenido')
    }
  }

  /**
   * Obtiene la última posición conocida
   * Útil para fallback cuando GPS falla
   * 
   * @returns {GeolocationPosition|null} Última posición o null
   */
  getLastKnownPosition() {
    return this.lastPosition
  }

  /**
   * Obtiene el historial de ubicaciones
   * @param {number} limit - Máximo número de ubicaciones
   */
  getHistory(limit = 50) {
    return this.locationHistory.slice(-limit)
  }

  /**
   * Limpia el historial de ubicaciones
   */
  clearHistory() {
    this.locationHistory = []
  }

  /**
   * Calcula la distancia total recorrida
   */
  getTotalDistance() {
    if (this.locationHistory.length < 2) return 0
    let total = 0
    for (let i = 1; i < this.locationHistory.length; i++) {
      const prev = this.locationHistory[i - 1]
      const curr = this.locationHistory[i]
      total += this.calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
    }
    return total
  }

  /**
   * Exporta historial para logs
   */
  exportForLog() {
    return {
      currentLocation: this.lastPosition,
      history: this.locationHistory,
      distance: this.getTotalDistance(),
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * Verifica si el GPS está disponible
   * 
   * @returns {boolean} true si está disponible
   */
  isAvailable() {
    return 'geolocation' in navigator
  }

  /**
   * Obtiene el estado actual del tracking
   * 
   * @returns {boolean} true si está trackeando activamente
   */
  get isTracking() {
    return this.isWatching
  }

  /**
   * Formatea la posición desde el formato nativo a nuestro formato
   * 
   * @param {Position} position - Posición nativa del navegador
   * @returns {GeolocationPosition} Posición formateada
   * @private
   */
  formatPosition(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      altitude: position.coords.altitude ?? null,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      timestamp: position.timestamp
    }
  }

  /**
   * Formatea el error de geolocalización
   * 
   * @param {GeolocationPositionError} error - Error nativo
   * @returns {Error} Error formateado con mensaje descriptivo
   * @private
   */
  formatError(error) {
    const messages = {
      1: 'Permiso de ubicación denegado. Permite el acceso a la ubicación en la configuración de tu navegador.',
      2: 'Posición no disponible. Verifica que el GPS esté activado.',
      3: 'Timeout obteniendo ubicación. Intenta nuevamente en un área con mejor señal.'
    }

    const message = messages[error.code] || `Error desconocido de geolocalización (${error.code})`
    const formattedError = new Error(message)
    formattedError.code = this.getErrorCode(error.code)
    formattedError.originalCode = error.code
    
    return formattedError
  }

  /**
   * Obtiene código de error legible
   * 
   * @param {number} code - Código numérico del error
   * @returns {string} Código de error legible
   * @private
   */
  getErrorCode(code) {
    const codes = {
      1: 'PERMISSION_DENIED',
      2: 'POSITION_UNAVAILABLE',
      3: 'TIMEOUT'
    }
    return codes[code] || 'UNKNOWN_ERROR'
  }

  /**
   * Calcula la distancia entre dos puntos GPS (Fórmula de Haversine)
   * 
   * @param {number} lat1 - Latitud punto 1
   * @param {number} lng1 - Longitud punto 1
   * @param {number} lat2 - Latitud punto 2
   * @param {number} lng2 - Longitud punto 2
   * @returns {number} Distancia en metros
   * 
   * @example
   * const distance = geo.calculateDistance(4.7110, -74.0721, 4.6097, -74.0817)
   * console.log(`Distancia: ${distance} metros`)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    return calculateDistance(lat1, lng1, lat2, lng2)
  }

  /**
   * Valida si una coordenada es válida (dentro de rangos razonables)
   * 
   * @param {number} latitude - Latitud a validar
   * @param {number} longitude - Longitud a validar
   * @returns {boolean} true si es válida
   * 
   * @example
   * if (geo.isValidCoordinate(lat, lng)) {
   *   // Coordenada válida
   * }
   */
  isValidCoordinate(latitude, longitude) {
    return isValidCoordinate(latitude, longitude)
  }

  /**
   * Obtiene coordenadas aproximadas para Colombia (fallback)
   * Útil cuando GPS falla en zonas rurales
   * 
   * @returns {Object} Coordenadas por defecto para Colombia
   */
  getDefaultColombiaCoordinates() {
    return {
      latitude: 4.5709,
      longitude: -74.2973,
      accuracy: null,
      note: 'Coordenadas por defecto (Colombia central)'
    }
  }
}

// Exportar instancia singleton para uso conveniente
export const geoService = new GeolocationService()

/**
 * Hook conveniente para Vue 3 Composition API
 * 
 * @example
 * // En un componente Vue
 * import { useGeolocation } from '@/utils/geolocation'
 * 
 * setup() {
 *   const { getCurrentPosition, error, loading } = useGeolocation()
 *   
 *   const getLocation = async () => {
 *     await getCurrentPosition()
 *   }
 *   
 *   return { getLocation, error, loading }
 * }
 */
export function useGeolocation() {
  const geo = new GeolocationService()
  
  // Estado reactivo simulado (en Vue real usar ref/reactive)
  let position = null
  let error = null
  let loading = false

  const getCurrentPosition = async (options) => {
    loading = true
    error = null
    
    try {
      position = await geo.getCurrentPosition(options)
      return position
    } catch (err) {
      error = err
      throw err
    } finally {
      loading = false
    }
  }

  const watchPosition = (onUpdate, onError) => {
    return geo.watchPosition(onUpdate, onError)
  }

  const stopTracking = () => {
    geo.stopTracking()
  }

  const getLastKnownPosition = () => {
    return geo.getLastKnownPosition()
  }

  const exportForLog = () => geo.exportForLog()
  const getHistory = () => geo.getHistory()
  const clearHistory = () => geo.clearHistory()
  const getTotalDistance = () => geo.getTotalDistance()

  return {
    position,
    error,
    loading,
    getCurrentPosition,
    watchPosition,
    stopTracking,
    getLastKnownPosition,
    exportForLog,
    getHistory,
    clearHistory,
    getTotalDistance,
    isAvailable: () => geo.isAvailable(),
    isTracking: geo.isTracking
  }
}
