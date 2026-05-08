<template>
  <div class="gis-map-container">
    <div ref="mapContainer" class="map-container"></div>
    
    <!-- Controles adicionales expuestos -->
    <div class="map-controls" style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
      <v-btn 
        color="primary" 
        size="small" 
        prepend-icon="mdi-cloud-download" 
        @click="cacheTiles"
        :loading="cachingTiles"
      >
        GUARDAR Offline
      </v-btn>
    </div>

    <!-- Nota: Funcionalidad de dibujo requiere leaflet-draw -->
    <v-alert v-if="readonly" type="info" density="compact" class="mt-2">
      Mapa en modo solo lectura
    </v-alert>
  </div>
</template>

<script>
import { defineComponent, onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import L from 'leaflet'
import 'leaflet-draw'

import { offlineGeoStorage } from '@/utils/offlineGeoStorage'
import { locationCoordinator } from '@/services/locationCoordinator'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { logger } from '@/utils/logger'
import { SIEMBRA_COLORS, POI_FALLBACK_COLOR, HACIENDA_CENTER_COLOR } from '@/constants/mapColors'

// Leaflet CSS


// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

export default defineComponent({
  name: 'GisMapComponent',
  
  props: {
    // Initial GeoJSON polygon (for editing)
    initialGeoJSON: {
      type: Object,
      default: null
    },
    // Center coordinates [lat, lng]
    center: {
      type: Array,
      default: () => [4.5709, -74.2973] // Colombia default
    },
    // Zoom level
    zoom: {
      type: Number,
      default: 18
    },
    // Read-only mode (no drawing)
    readonly: {
      type: Boolean,
      default: false
    },
    // Enable drawing tools
    enableDrawing: {
      type: Boolean,
      default: false
    },
    // Draw mode: 'polygon' or 'marker'
    drawMode: {
      type: String,
      default: 'polygon',
      validator: (val) => ['polygon', 'marker'].includes(val)
    },
    // Loading state
    loading: {
      type: Boolean,
      default: false
    },
    // Nombre dinámico de la hacienda para tooltips/popups
    haciendaName: {
      type: String,
      default: ''
    },
    // NUEVA PROP: GPS independiente de la hacienda
    haciendaGps: {
      type: Object,
      default: null
    }
  },

  emits: ['polygon-saved', 'geometry-updated'],

  
  setup(props, { emit }) {
    const mapContainer = ref(null)
    const saving = ref(false)
    const isOffline = ref(!navigator.onLine)
    const cachedGeoJSON = ref(null)
    const cachingTiles = ref(false)
    const uiFeedback = useUiFeedbackStore()

    let map = null
    let drawnItems = null
    let centerCircleMarker = null // Referencia persistente al círculo de la hacienda

    const updateCenterCircle = (latlng) => {
      if (!map || !latlng || latlng.length !== 2) return;
      
      if (centerCircleMarker) {
        centerCircleMarker.setLatLng(latlng);
        // Actualizar contenido de popup/tooltip
        centerCircleMarker.unbindPopup();
        centerCircleMarker.unbindTooltip();
        const popupContent = props.haciendaName 
          ? `<div class="pa-1"><strong>${props.haciendaName}</strong><br/><span class="text-caption">Ubicación Principal (GPS)</span></div>`
          : '<div class="pa-1"><strong>Centro de Hacienda</strong><br/><span class="text-caption">Ubicación Principal (GPS)</span></div>';
        centerCircleMarker.bindPopup(popupContent);
        centerCircleMarker.bindTooltip(props.haciendaName || 'Centro de Hacienda', { permanent: false, direction: 'top' });
      } else {
        // Un círculo geográfico fijo de 15 metros. A prueba de fallos de iconos.
        centerCircleMarker = L.circle(latlng, {
          color: '#ffffff',
          weight: 3,
          fillColor: HACIENDA_CENTER_COLOR,
          fillOpacity: 1,
          radius: 15 // Radio en metros
        }).addTo(map);
        
        const popupContent = props.haciendaName 
          ? `<div class="pa-1"><strong>${props.haciendaName}</strong><br/><span class="text-caption">Ubicación Principal (GPS)</span></div>`
          : '<div class="pa-1"><strong>Centro de Hacienda</strong><br/><span class="text-caption">Ubicación Principal (GPS)</span></div>';
        centerCircleMarker.bindPopup(popupContent);
        centerCircleMarker.bindTooltip(props.haciendaName || 'Centro de Hacienda', { permanent: false, direction: 'top' });
      }
    };

    // Watch for haciendaName changes to update center circle
    watch(() => props.haciendaName, (newName) => {
      if (centerCircleMarker) {
        centerCircleMarker.unbindPopup();
        centerCircleMarker.unbindTooltip();
        const popupContent = newName 
          ? `<div class="pa-1"><strong>${newName}</strong><br/><span class="text-caption">Ubicación Principal (GPS)</span></div>`
          : '<div class="pa-1"><strong>Centro de Hacienda</strong><br/><span class="text-caption">Ubicación Principal (GPS)</span></div>';
        centerCircleMarker.bindPopup(popupContent);
        centerCircleMarker.bindTooltip(newName || 'Centro de Hacienda', { permanent: false, direction: 'top' });
      }
    });

    // Watch for online/offline status
    watch(() => navigator.onLine, (online) => {
      isOffline.value = !online
      if (!online) {
        loadCachedGeometries()
      }
    })

    // Watch for center changes - NO afecta al círculo de hacienda
    watch(() => props.center, (newCenter) => {
      if (map && newCenter && newCenter.length === 2) {
        map.flyTo(newCenter, props.zoom, { animate: true, duration: 1.5 })
        // ELIMINADO: updateCenterCircle(newCenter)
      }
    }, { deep: true })

    // NUEVO WATCH: Solo actualiza el círculo de hacienda cuando cambia haciendaGps
    watch(() => props.haciendaGps, (newGps) => {
      if (newGps?.lat && newGps?.lng) {
        updateCenterCircle([newGps.lat, newGps.lng])
      } else if (centerCircleMarker) {
        centerCircleMarker.remove()
        centerCircleMarker = null
      }
    }, { immediate: true, deep: true })

    // Watch for GeoJSON changes
    watch(() => props.initialGeoJSON, (newVal) => {
      if (map && newVal) {
        loadPolygon(newVal)
      }
    }, { deep: true })
    
    const polygonGeoJSON = computed(() => {
      if (!drawnItems || drawnItems.getLayers().length === 0) return null
      
      const layer = drawnItems.getLayers()[0]
      const geojson = layer.toGeoJSON()
      
      // Ensure it's a polygon
      if (geojson.geometry.type === 'Polygon') {
        return geojson.geometry
      }
      return null
    })
    
    const calculatedArea = computed(() => {
      if (!polygonGeoJSON.value) return 0
      
      // Calculate area using Leaflet.GeometryUtil or simple formula
      const layer = drawnItems?.getLayers()[0]
      if (!layer) return 0
      
      // Get area in square meters
      const areaSqMeters = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0])
      
      // Convert to hectares (1 hectare = 10,000 sq meters)
      const hectares = areaSqMeters / 10000
      return hectares.toFixed(2)
    })
    
    const initMap = () => {
      if (!mapContainer.value) return

      // Create map
      map = L.map(mapContainer.value)
      
      // Establecer vista inicial basada en props
      if (props.center && props.center.length === 2) {
        map.setView(props.center, props.zoom)
        // ELIMINADO: updateCenterCircle(props.center)
      } else {
        map.setView([4.6097, -74.0817], props.zoom) // Bogotá fallback - Corregido: coma añadida
      }

      // Define tile layers for different map types
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      })

      // Satélite (Esri World Imagery - ideal para visualizar cultivos)
      const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      })

      // Relieve (OpenTopoMap)
      const openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
        maxZoom: 17
      })

      // Add default satellite layer (mejor para cultivos)
      esriSatellite.addTo(map)

      // Control para cambiar entre tipos de mapa
      const baseLayers = {
        '🛰 Satélite (Esri)': esriSatellite,
        '⛰ Relieve (OpenTopoMap)': openTopoMap,
        '🗺 Calles (OSM)': osm
      }
      L.control.layers(baseLayers, null, { position: 'bottomleft' }).addTo(map)

      // Initialize FeatureGroup for drawn items
      drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)

      // Initialize Draw Control if enabled
      if (!props.readonly && props.enableDrawing) {
        const drawOptions = {
          edit: {
            featureGroup: drawnItems,
            remove: true
          },
          draw: {
            polygon: props.drawMode === 'polygon' ? {
              allowIntersection: false,
              showArea: true
            } : false,
            polyline: false,
            rectangle: props.drawMode === 'polygon',
            circle: false,
            marker: props.drawMode === 'marker',
            circlemarker: false
          }
        }

        const drawControl = new L.Control.Draw(drawOptions)
        map.addControl(drawControl)

        // Event: Created - Corregido: Evento en mayúsculas
        map.on(L.Draw.Event.CREATED, (e) => {
          const layer = e.layer
          drawnItems.clearLayers()
          drawnItems.addLayer(layer)
          notifyChange(layer)
        })

        // Event: Edited - Corregido: Evento en mayúsculas
        map.on(L.Draw.Event.EDITED, (e) => {
          const layers = e.layers
          layers.eachLayer((layer) => {
            notifyChange(layer)
          })
        })

        // Event: Deleted - Corregido: Evento en mayúsculas
        map.on(L.Draw.Event.DELETED, () => {
          emit('geometry-updated', { geojson: null, areaHa: 0 })
        })
      }

      // Load initial polygon if provided
      if (props.initialGeoJSON) {
        loadPolygon(props.initialGeoJSON)
      }
    }

    const notifyChange = (layer) => {
      const geojson = layer.toGeoJSON().geometry
      let areaHa = 0
      
      if (geojson.type === 'Polygon') {
        // L.GeometryUtil.geodesicArea expects an array of LatLngs
        // For Polygons, getLatLngs() returns an array of arrays (rings)
        const latlngs = layer.getLatLngs()[0]
        const areaSqMeters = L.GeometryUtil.geodesicArea(latlngs)
        areaHa = (areaSqMeters / 10000).toFixed(2)
      }
      
      emit('geometry-updated', { geojson, areaHa })
    }

    
    const loadPolygon = (geoJSON) => {
      if (!map || !drawnItems || !geoJSON) return
      
      try {
        drawnItems.clearLayers()
        
        let layer = null
        let bounds = null

        // Handle Array of Features or raw Features
        if (Array.isArray(geoJSON)) {
          layer = L.geoJSON(geoJSON, { onEachFeature: onEachFeatureHandler, pointToLayer: customPointToLayer })
        } else if (geoJSON.type === 'FeatureCollection' || geoJSON.type === 'Feature' || geoJSON.type === 'GeometryCollection') {
          layer = L.geoJSON(geoJSON, { onEachFeature: onEachFeatureHandler, pointToLayer: customPointToLayer })
        } else {
          // It's a single geometry object (Polygon, Point, etc.)
          layer = L.GeoJSON.geometryToLayer(geoJSON)
        }

        if (layer) {
          drawnItems.addLayer(layer)
          
          // Determinar si debemos usar flyTo (para puntos únicos) o fitBounds (para formas)
          let isSinglePoint = false
          let pointLatLng = null

          if (geoJSON.type === 'Point') {
            isSinglePoint = true
            pointLatLng = layer.getLatLng()
          } else if (geoJSON.type === 'Feature' && geoJSON.geometry?.type === 'Point') {
            isSinglePoint = true
            pointLatLng = layer.getLatLng()
          } else if (geoJSON.type === 'FeatureCollection' && geoJSON.features?.length === 1 && geoJSON.features[0].geometry?.type === 'Point') {
            isSinglePoint = true
            // En una FeatureCollection, layer es un FeatureGroup. Obtenemos el primer marker.
            const layers = layer.getLayers()
            if (layers.length > 0 && layers[0].getLatLng) {
              pointLatLng = layers[0].getLatLng()
            }
          }
          
          if (isSinglePoint && pointLatLng) {
            setTimeout(() => {
              if (map) {
                map.invalidateSize()
                map.flyTo(pointLatLng, 18, { animate: true })
              }
            }, 100)
          } else if (layer.getBounds) {
            bounds = layer.getBounds()
            if (bounds.isValid()) {
              setTimeout(() => {
                if (map) {
                  map.invalidateSize()
                  map.fitBounds(bounds, { padding: [50, 50], animate: true })
                }
              }, 100)
            }
          }
        }
      } catch (error) {
        logger.error('[GisMap] Error loading geometry:', error)
      }
    }

    const onEachFeatureHandler = (feature, layer) => {
      if (feature.properties && feature.properties.nombre) {
        let popupContent = `<div class="pa-1">
          <strong>${feature.properties.nombre}</strong>`
        
        if (feature.properties.tipoNombre) {
          popupContent += `<br/><span class="text-caption">Tipo: ${feature.properties.tipoNombre}</span>`
        }
        
        if (feature.properties.estado) {
          popupContent += `<br/><span class="text-caption">Estado: ${feature.properties.estado}</span>`
        }
        
        popupContent += `</div>`

        layer.bindTooltip(feature.properties.nombre, { 
          permanent: false, 
          direction: 'top',
          offset: [0, -10]
        })
        layer.bindPopup(popupContent)
      }
      
      // Aplicar estilos y eventos hover para polígonos de siembra/lote
      if (feature.properties?.type?.includes('siembra') && layer.setStyle) {
        const baseStyle = {
          color: feature.properties.color || SIEMBRA_COLORS.finalizada,
          fillColor: feature.properties.color || SIEMBRA_COLORS.finalizada,
          fillOpacity: 0.4,
          weight: 1
        };
        layer.setStyle(baseStyle);

        // Eventos de hover para resaltar
        layer.on('mouseover', () => {
          layer.setStyle({
            weight: 3,
            fillOpacity: 0.6
          });
        });

        layer.on('mouseout', () => {
          layer.setStyle(baseStyle);
        });
      }
    }

    const customPointToLayer = (feature, latlng) => {
      let svgContent = '';
      let iconSize = [32, 32];
      let iconAnchor = [16, 32];
      let popupAnchor = [0, -32];

      if (feature.properties?.source === 'zone-point') {
        // Validar color hexadecimal
        const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(feature.properties?.color);
        const pinColor = isValidHex ? feature.properties.color : POI_FALLBACK_COLOR;
        // Pin para Puntos de Interés con accesibilidad
        svgContent = `
          <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg" aria-label="Punto de interés" role="img">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${pinColor}"/>
          </svg>
        `;
      } else {
        // Pin Azul por defecto
        svgContent = `
          <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#1976d2"/>
          </svg>
        `;
      }

      const customIcon = L.divIcon({
        html: `<div style="display: flex; justify-content: center; align-items: center; filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.4));">${svgContent}</div>`,
        className: 'clear-leaflet-bg', 
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        popupAnchor: popupAnchor
      });

      const marker = L.marker(latlng, {
        icon: customIcon,
        title: feature.properties?.nombre || 'Marcador'
      });

      // Añadir tooltip para POI
      if (feature.properties?.source === 'zone-point' && feature.properties.nombre) {
        marker.bindTooltip(feature.properties.nombre, { permanent: false, direction: 'top' });
      }

      return marker;
    }

    const savePolygon = async () => {
      // Nota: funcionalidad simplificada - requiere leaflet-draw para dibujo
      logger.warn('[GisMap] Funcionalidad de dibujo no disponible sin leaflet-draw')
    }

    const loadCachedGeometries = async () => {
      if (!isOffline.value) return

      try {
        // Intentar cargar geometrías cacheadas
        const cachedZonas = await offlineGeoStorage.getAllZonasUnfiltered()
        
        if (cachedZonas.length > 0) {
          // Cargar la primera zona encontrada (o implementar lógica de selección)
          const zona = cachedZonas[0]
          if (zona.geometria) {
            cachedGeoJSON.value = zona.geometria
            loadPolygon(zona.geometria)
            logger.debug('[GisMap] Geometría cargada desde caché offline')
          }
        }
      } catch (error) {
        logger.error('[GisMap] Error cargando caché offline:', error)
      }
    }
    
    // Lifecycle
    onMounted(() => {
      initMap()
    })

    onBeforeUnmount(() => {
      if (centerCircleMarker) {
        centerCircleMarker.unbindPopup();
        centerCircleMarker.unbindTooltip();
        centerCircleMarker.remove()
        centerCircleMarker = null
      }
      if (map) {
        map.remove()
        map = null
      }
    })

    const cacheTiles = async () => {
      cachingTiles.value = true
      try {
        if (!map) throw new Error('Mapa no inicializado')
        const zoom = map.getZoom()
        const result = await locationCoordinator.cacheMapTiles(zoom, 2)
        if (result?.status === 'success') {
          uiFeedback.showToast(`Se han guardado ${result.cached} teselas para uso offline`, 'success')
        } else {
          uiFeedback.showToast(`Error o no soportado: ${result?.status}`, 'warning')
        }
      } catch (error) {
        uiFeedback.showToast(`Error: ${error.message}`, 'error')
      } finally {
        cachingTiles.value = false
      }
    }

    return {
      mapContainer,
      saving,
      cachingTiles,
      cacheTiles
    }
  }
})
</script>

<style scoped>
.gis-map-container {
  position: relative;
  width:100%;
  height: 1000px; /* Altura original 500px, duplicada para dashboard */
}

.map-container {
  width:100%;
  height: 900px; /* Altura original 450px, duplicada para dashboard */
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: white;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-draw-toolbar a) {
  background-color: #4CAF50;
  border: 1px solid #388E3C;
}

:deep(.leaflet-draw-toolbar a:hover) {
  background-color: #388E3C;
}

:deep(.clear-leaflet-bg) {
  background: transparent !important;
  border: none !important;
}
</style>
