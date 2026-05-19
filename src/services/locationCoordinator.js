/**
 * locationCoordinator.js
 * Servicio coordinador de localización.
 * Gestiona la posición del mapa y tracking continuo usando GeolocationService.
 * Evita reinicios innecesarios del hardware GPS y centraliza el permiso del navegador.
 * INTEGRA offlineGeoStorage para persistencia de trazas GPS y polígonos.
 */

import { GeolocationService } from '@/utils/geolocation'
import { offlineGeoStorage } from '@/utils/offlineGeoStorage'
import { logger } from '@/utils/logger'

// NUEVO: Importar Leaflet y Draw (asumiendo que están instalados)
import L from 'leaflet'
import 'leaflet-draw'

class LocationCoordinator {
  constructor() {
    this.geoService = new GeolocationService()
    this.tracker = new GeolocationService()
    this.permissionGranted = false // Corregido: sin 'd' al final para coincidir con requestPermission
    this.permissionPromise = null
    this.mapInstance = null
    this.drawControl = null
    this.drawnItems = null
  }

  /**
   * Solicita permiso de geolocalización (centralizado).
   * Solo solicita una vez, luego retorna el estado cacheado.
   * @returns {Promise<boolean>} true si se concedió permiso.
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
   * Obtiene posición actual instantánea.
   * Reutiliza el permiso ya solicitado.
   * @returns {Promise<Object>} Posición actual {latitude, longitude, accuracy}.
   */
  async getPosition() {
    const hasPermission = await this.requestPermission()
    if (!hasPermission) {
      throw new Error('Permiso de geolocalización no concedido')
    }
    return this.geoService.getCurrentPosition()
  }

  /**
   * Inicia seguimiento continuo de ubicación.
   * Integra guardado automático en offlineGeoStorage.
   * @param {Function} onUpdate - Callback con cada actualización de ubicación.
   * @param {Function} onError - Callback cuando hay error.
   * @returns {boolean} true si inició exitosamente.
   */
  startTracking(onUpdate, onError) {
    if (this.tracker.isTracking) {
      console.log('[LocationCoordinator] Tracking ya activo, reutilizando instancia')
      return false
    }

    // Wrapper para guardar en IndexedDB y luego llamar al callback del usuario.
    const wrappedOnUpdate = async (location) => {
      // GUARDAR traza en offlineGeoStorage.
      try {
        const traza = {
          id: `traza_${Date.now()}`,
          fecha: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD.
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: location.timestamp
        }
        await offlineGeoStorage.saveTrazaGPS(traza)
      } catch (err) {
        logger.error('[LocationCoordinator] Error guardando traza en IndexedDB:', err)
      }

      // Ejecutar callback original.
      if (onUpdate) {
        onUpdate(location)
      }
    }

    const wrappedOnError = (error) => {
      logger.error('[LocationCoordinator] Error en seguimiento:', error)
      if (onError) {
        onError(error)
      }
    }

    this.tracker.startTracking(wrappedOnUpdate, wrappedOnError)
    return true
  }

  /**
   * Detiene el seguimiento continuo.
   */
  stopTracking() {
    this.tracker.stopTracking()
  }

  /**
   * Verifica si hay tracking activo.
   * @returns {boolean}
   */
  isTracking() {
    return this.tracker.isTracking
  }

  /**
   * Obtiene ubicación actual del tracker (si está activo).
   * @returns {Object|null}
   */
  getCurrentLocation() {
    return this.tracker.currentLocation
  }

  /**
   * Obtiene historial de ubicaciones.
   * @returns {Array}
   */
  getLocationHistory() {
    return this.tracker.locationHistory
  }

  /**
   * Exporta datos para bitácora.
   * @returns {Object}
   */
  exportForLog() {
    return this.tracker.exportForLog()
  }

  /**
   * Obtiene estadísticas de tracking.
   * @returns {Object}
   */
  getStats() {
    return this.tracker.getStats()
  }

  /**
   * Limpia historial de ubicaciones.
   */
  clearHistory() {
    this.tracker.clearHistory()
  }

  // ==========================================================================
  // NUEVAS FUNCIONALIDADES: MAPAS Y DIBUJO (Hito 3)
  // ==========================================================================

  /**
   * Inicializa el mapa con capacidades de dibujo (Leaflet + Leaflet.draw).
   * @param {HTMLElement} mapContainer - Elemento DOM para el mapa.
   * @param {Object} options - Opciones de inicialización.
   */
  initMap(mapContainer, options = {}) {
    if (this.mapInstance) {
      logger.warn('[LocationCoordinator] Mapa ya inicializado')
      return
    }

    try {
      this.mapInstance = L.map(mapContainer, {
        center: options.center || [4.5709, -74.2973], // Colombia por defecto.
        zoom: options.zoom || 10,
        maxZoom: 22
      })

      // Añadir capa base (OpenStreetMap) con soporte para zoom extendido estirado
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 22,
        maxNativeZoom: 19
      }).addTo(this.mapInstance)

      // Inicializar capa de dibujo.
      this.drawnItems = new L.FeatureGroup()
      this.mapInstance.addLayer(this.drawnItems)

      // Añadir controles de dibujo.
      if (L.Control && L.Control.Draw) {
        this.drawControl = new L.Control.Draw({
          edit: {
            featureGroup: this.drawnItems
          },
          draw: {
            polygon: true,
            marker: true,
            polyline: true,
            rectangle: true,
            circle: false
          }
        })
        this.mapInstance.addControl(this.drawControl)
      }

      // Eventos de dibujo.
      this.mapInstance.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer
        this.saveDrawnPolygon(layer)
      })

      logger.info('[LocationCoordinator] Mapa inicializado con dibujo')
    } catch (error) {
      logger.error('[LocationCoordinator] Error inicializando mapa:', error)
    }
  }

  /**
   * Guarda un polígono dibujado en offlineGeoStorage.
   * @param {Object} layer - Capa de Leaflet (polígono).
   */
  async saveDrawnPolygon(layer) {
    try {
      const geoJson = layer.toGeoJSON()
      const { useZonasStore } = await import('@/stores/zonasStore')
      const zonasStore = useZonasStore()

      const zonaData = {
        nombre: `Zona Dibujada ${new Date().toLocaleDateString()}`,
        geometria: geoJson,
        activa: true
      }

      await zonasStore.crearZona(zonaData)
      logger.info('[LocationCoordinator] Polígono guardado y sincronizado vía zonasStore')
    } catch (error) {
      logger.error('[LocationCoordinator] Error guardando polígono:', error)
    }
  }

  /**
   * Carga polígonos guardados en el mapa.
   * @param {string} haciendaId - ID de hacienda para filtrar.
   */
  async loadSavedPolygons(haciendaId) {
    try {
      const zonas = await offlineGeoStorage.getAllZonas(haciendaId)
      const L = window.L

      zonas.forEach(zona => {
        if (zona.geometria) {
          const layer = L.geoJSON(zona.geometria)
          this.drawnItems.addLayer(layer)
        }
      })
      logger.info(`[LocationCoordinator] ${zonas.length} polígonos cargados`)
    } catch (error) {
      logger.error('[LocationCoordinator] Error cargando polígonos:', error)
    }
  }

  async cacheMapTiles(zoomLevel = 10, radius = 2) {
    if (!this.mapInstance) return

    try {
      const center = this.mapInstance.getCenter()
      const tiles = []

      // Generar coordenadas de tiles cercanas.
      for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
          const tile = {
            x: Math.floor((center.lng + 180) / 360 * (1 << zoomLevel)) + x,
            y: Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * (1 << zoomLevel)) + y,
            z: zoomLevel
          }
          tiles.push(tile)
        }
      }

      // GUARDAR tiles en CacheStorage nativo
      logger.info(`[LocationCoordinator] Cacheando ${tiles.length} tiles en CacheStorage...`)

      if (!('caches' in window)) {
        logger.warn('[LocationCoordinator] Cache API no está soportada en este navegador')
        return { cached: 0, status: 'unsupported' }
      }

      const cache = await window.caches.open('map-tiles-v1')

      // Descargar y guardar cada tile
      for (const tile of tiles) {
        try {
          // Asumimos 'a', 'b', o 'c'. Para maximizar hits, cacheamos los tres subdominios básicos
          const subdomains = ['a', 'b', 'c']
          for (const s of subdomains) {
            const tileUrl = `https://${s}.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`
            const response = await fetch(tileUrl)
            if (response.ok) {
              await cache.put(tileUrl, response)
            }
          }
        } catch (tileError) {
          logger.warn(`[LocationCoordinator] Error cacheando tile:`, tileError)
        }
      }

      return { cached: tiles.length, status: 'success' }
    } catch (error) {
      logger.error('[LocationCoordinator] Error cacheando tiles:', error)
    }
  }

  /**
   * Destruye la instancia del mapa.
   */
  destroyMap() {
    if (this.mapInstance) {
      this.mapInstance.remove()
      this.mapInstance = null
      this.drawnItems = null
      this.drawControl = null
      logger.info('[LocationCoordinator] Mapa destruido')
    }
  }
}

// Exportar instancia singleton.
export const locationCoordinator = new LocationCoordinator()
