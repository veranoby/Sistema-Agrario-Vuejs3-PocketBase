/**
 * locationCoordinator.js
 * Servicio coordinador de localización
 * Gestiona la coexistencia de GeolocationService (posición instantánea) y LocationTracker (seguimiento continuo)
 * Evita reinicios innecesarios del hardware GPS y centraliza el permiso del navegador
 */

import { GeolocationService } from '@/utils/geolocation'
import { LocationTracker } from '@/utils/locationTracker'

class LocationCoordinator {
  constructor() {
    this.geoService = new GeolocationService()
    this.tracker = new LocationTracker()
    this.permissionGranted = false
    this.permissionPromise = null
  }

  /**
   * Solicita permiso de geolocalización (centralizado)
   * Solo solicita una vez, luego retorna el estado cacheado
   * @returns {Promise<boolean>} true si se concedió permiso
   */
  async requestPermission() {
    if (this.permissionGranted) return true
    if (this.permissionPromise) return this.permissionPromise

    this.permissionPromise = this.geoService.requestPermission()
      .then(granted => {
        this.permissionGranted = granted
        this.permissionPromise = null
        return granted
      })

    return this.permissionPromise
  }

  /**
   * Obtiene posición actual instantánea
   * Reutiliza el permiso ya solicitado
   * @returns {Promise<Object>} Posición actual {latitude, longitude, accuracy}
   */
  async getPosition() {
    const hasPermission = await this.requestPermission()
    if (!hasPermission) {
      throw new Error('Permiso de geolocalización no concedido')
    }
    return this.geoService.getCurrentPosition()
  }

  /**
   * Inicia seguimiento continuo de ubicación
   * Solo inicia si no hay tracking activo
   * @param {Object} options - Opciones de tracking
   * @returns {boolean} true si se inició, false si ya estaba activo
   */
  startTracking(options = {}) {
    if (this.tracker.isTracking) {
      console.log('[LocationCoordinator] Tracking ya activo, reutilizando instancia')
      return false
    }

    this.tracker.startTracking(options)
    return true
  }

  /**
   * Detiene el seguimiento continuo
   */
  stopTracking() {
    this.tracker.stopTracking()
  }

  /**
   * Verifica si hay tracking activo
   * @returns {boolean}
   */
  isTracking() {
    return this.tracker.isTracking
  }

  /**
   * Obtiene ubicación actual del tracker (si está activo)
   * @returns {Object|null}
   */
  getCurrentLocation() {
    return this.tracker.currentLocation
  }

  /**
   * Obtiene historial de ubicaciones
   * @returns {Array}
   */
  getLocationHistory() {
    return this.tracker.locationHistory
  }

  /**
   * Exporta datos para bitácora
   * @returns {Object}
   */
  exportForLog() {
    return this.tracker.exportForLog()
  }

  /**
   * Obtiene estadísticas de tracking
   * @returns {Object}
   */
  getStats() {
    return this.tracker.getStats()
  }

  /**
   * Limpia historial de ubicaciones
   */
  clearHistory() {
    this.tracker.clearHistory()
  }
}

// Exportar instancia singleton
export const locationCoordinator = new LocationCoordinator()
