/**
 * LocationTracker - Rastreador de ubicación para bitácoras y operaciones de campo
 * 
 * Proporciona tracking continuo de ubicación durante operaciones agrícolas,
 * ideal para registrar coordenadas precisas en bitácoras de campo.
 * 
 * @module utils/locationTracker
 */

import { logger } from './logger'
import { calculateDistance } from '@/utils/geoUtils'

/**
 * @typedef {Object} LocationData
 * @property {number} lat - Latitud en grados decimales
 * @property {number} lng - Longitud en grados decimales
 * @property {number|null} accuracy - Precisión en metros
 * @property {number} timestamp - Timestamp de la lectura
 */

/**
 * @typedef {Object} LocationTrackerOptions
 * @property {boolean} [enableHighAccuracy=true] - Usar GPS de alta precisión
 * @property {number} [updateInterval=5000] - Intervalo mínimo entre actualizaciones (ms)
 * @property {number} [maxAge=10000] - Edad máxima de ubicación cacheada
 */

export class LocationTracker {
  constructor(options = {}) {
    this.watchId = null
    this.currentLocation = null
    this.locationHistory = []
    this.isTracking = false
    this.options = {
      enableHighAccuracy: true,
      updateInterval: options.updateInterval || 5000,
      maxAge: options.maxAge || 10000,
      ...options
    }
    
    this.maxHistorySize = 100 // Máximo número de ubicaciones en historial
    this.onUpdateCallback = null
    this.onErrorCallback = null
  }

  /**
   * Inicia el rastreo continuo de ubicación
   * 
   * @param {Function} onUpdate - Callback con cada actualización de ubicación
   * @param {Function} onError - Callback cuando hay error
   * @returns {boolean} true si inició exitosamente
   * 
   * @example
   * const tracker = new LocationTracker()
   * tracker.startTracking(
   *   (location) => {
   *     console.log('Ubicación actualizada:', location)
   *   },
   *   (error) => {
   *     console.error('Error de tracking:', error)
   *   }
   * )
   */
  startTracking(onUpdate, onError) {
    if (!navigator.geolocation) {
      const error = new Error('Geolocalización no soportada por este navegador')
      logger.error('[LocationTracker]', error.message)
      if (onError) onError(error)
      return false
    }

    if (this.isTracking) {
      logger.warn('[LocationTracker] Ya hay un seguimiento en curso')
      return false
    }

    this.onUpdateCallback = onUpdate
    this.onErrorCallback = onError

    logger.debug('[LocationTracker] Iniciando seguimiento de ubicación...')

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.formatLocation(position)
        this.currentLocation = location
        this.addToHistory(location)
        
        logger.debug('[LocationTracker] Ubicación actualizada:', {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy
        })
        
        if (this.onUpdateCallback) {
          this.onUpdateCallback(location)
        }
      },
      (error) => {
        const formattedError = this.formatError(error)
        logger.error('[LocationTracker] Error de seguimiento:', formattedError)
        
        if (this.onErrorCallback) {
          this.onErrorCallback(formattedError)
        }
      },
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        maximumAge: this.options.maxAge,
        timeout: 15000
      }
    )

    this.isTracking = true
    return true
  }

  /**
   * Detiene el rastreo de ubicación
   */
  stopTracking() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
      this.isTracking = false
      
      logger.debug('[LocationTracker] Seguimiento detenido')
    }
  }

  /**
   * Obtiene la ubicación actual
   * 
   * @returns {LocationData|null} Ubicación actual o null
   */
  getCurrentLocation() {
    return this.currentLocation
  }

  /**
   * Obtiene el historial de ubicaciones
   * 
   * @param {number} limit - Máximo número de ubicaciones a retornar
   * @returns {LocationData[]} Historial de ubicaciones
   */
  getHistory(limit = 50) {
    return this.locationHistory.slice(-limit)
  }

  /**
   * Limpia el historial de ubicaciones
   */
  clearHistory() {
    this.locationHistory = []
    logger.debug('[LocationTracker] Historial limpiado')
  }

  /**
   * Obtiene estadísticas del tracking
   * 
   * @returns {Object} Estadísticas de tracking
   */
  getStats() {
    return {
      isTracking: this.isTracking,
      hasCurrentLocation: !!this.currentLocation,
      historySize: this.locationHistory.length,
      lastUpdate: this.currentLocation?.timestamp || null,
      averageAccuracy: this.calculateAverageAccuracy()
    }
  }

  /**
   * Calcula la distancia total recorrida durante el tracking
   * 
   * @returns {number} Distancia en metros
   */
  getTotalDistance() {
    if (this.locationHistory.length < 2) {
      return 0
    }

    let totalDistance = 0
    
    for (let i = 1; i < this.locationHistory.length; i++) {
      const prev = this.locationHistory[i - 1]
      const curr = this.locationHistory[i]
      
      totalDistance += this.calculateDistance(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng
      )
    }

    return totalDistance
  }

  /**
   * Exporta el historial para guardar en bitácora
   * 
   * @returns {Object} Datos exportados listos para guardar
   */
  exportForLog() {
    return {
      currentLocation: this.currentLocation,
      history: this.locationHistory,
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    }
  }

  /**
   * Agrega ubicación al historial
   * 
   * @param {LocationData} location - Ubicación a agregar
   * @private
   */
  addToHistory(location) {
    this.locationHistory.push(location)
    
    // Limitar tamaño del historial
    if (this.locationHistory.length > this.maxHistorySize) {
      this.locationHistory = this.locationHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Formatea la posición desde formato nativo
   * 
   * @param {Position} position - Posición nativa del navegador
   * @returns {LocationData} Ubicación formateada
   * @private
   */
  formatLocation(position) {
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      altitude: position.coords.altitude ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      timestamp: position.timestamp
    }
  }

  /**
   * Formatea el error de geolocalización
   * 
   * @param {GeolocationPositionError} error - Error nativo
   * @returns {Error} Error formateado
   * @private
   */
  formatError(error) {
    const messages = {
      1: 'Permiso de ubicación denegado',
      2: 'Posición no disponible',
      3: 'Timeout obteniendo ubicación'
    }

    const message = messages[error.code] || `Error desconocido (${error.code})`
    const formattedError = new Error(message)
    formattedError.code = error.code
    
    return formattedError
  }

  /**
   * Calcula la distancia entre dos puntos (Fórmula de Haversine)
   * 
   * @param {number} lat1 - Latitud punto 1
   * @param {number} lng1 - Longitud punto 1
   * @param {number} lat2 - Latitud punto 2
   * @param {number} lng2 - Longitud punto 2
   * @returns {number} Distancia en metros
   * @private
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3 // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  /**
   * Calcula la precisión promedio del historial
   * 
   * @returns {number|null} Precisión promedio en metros
   * @private
   */
  calculateAverageAccuracy() {
    const validLocations = this.locationHistory.filter(loc => loc.accuracy !== null)
    
    if (validLocations.length === 0) {
      return null
    }

    const sum = validLocations.reduce((acc, loc) => acc + loc.accuracy, 0)
    return Math.round(sum / validLocations.length)
  }
}

// Exportar instancia singleton
export const locationTracker = new LocationTracker()

/**
 * Hook conveniente para Vue 3 Composition API
 * 
 * @example
 * // En un componente Vue
 * import { useLocationTracker } from '@/utils/locationTracker'
 * 
 * setup() {
 *   const { startTracking, stopTracking, currentLocation, history } = useLocationTracker()
 *   
 *   const startBitacoraTracking = () => {
 *     startTracking()
 *   }
 *   
 *   const saveBitacora = () => {
 *     const locationData = exportForLog()
 *     // Guardar en bitácora
 *   }
 *   
 *   return { startBitacoraTracking, saveBitacora, currentLocation, history }
 * }
 */
export function useLocationTracker() {
  const tracker = new LocationTracker()

  let currentLocation = null
  let history = []
  let isTracking = false
  let error = null

  const startTracking = () => {
    const success = tracker.startTracking(
      (location) => {
        currentLocation = location
        history = tracker.getHistory()
      },
      (err) => {
        error = err
      }
    )
    isTracking = success
    return success
  }

  const stopTracking = () => {
    tracker.stopTracking()
    isTracking = false
  }

  const exportForLog = () => {
    return tracker.exportForLog()
  }

  const getStats = () => {
    return tracker.getStats()
  }

  const clearHistory = () => {
    tracker.clearHistory()
    history = []
  }

  return {
    currentLocation,
    history,
    isTracking,
    error,
    startTracking,
    stopTracking,
    exportForLog,
    getStats,
    clearHistory
  }
}
