<template>
  <div class="gis-map-container">
    <div ref="mapContainer" class="map-container"></div>
    
    <!-- Nota: Funcionalidad de dibujo requiere leaflet-draw -->
    <v-alert v-if="readonly" type="info" density="compact" class="mt-2">
      Mapa en modo solo lectura
    </v-alert>
  </div>
</template>

<script>
import { defineComponent, onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import L from 'leaflet'
import { offlineGeoStorage } from '@/utils/offlineGeoStorage'
import { logger } from '@/utils/logger'

// Leaflet CSS
import 'leaflet/dist/leaflet.css'

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
      default: 13
    },
    // Read-only mode (no drawing)
    readonly: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['polygon-saved'],
  
  setup(props, { emit }) {
    const mapContainer = ref(null)
    const saving = ref(false)
    const isOffline = ref(!navigator.onLine)
    const cachedGeoJSON = ref(null)

    let map = null
    let drawnItems = null
    let polygonLayer = null

    // Watch for online/offline status
    watch(() => navigator.onLine, (online) => {
      isOffline.value = !online
      if (!online) {
        loadCachedGeometries()
      }
    })
    
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
      map = L.map(mapContainer.value).setView(props.center, props.zoom)

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map)

      // Initialize FeatureGroup for drawn items (para cuando se instale leaflet-draw)
      drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)

      // Load initial polygon if provided
      if (props.initialGeoJSON) {
        loadPolygon(props.initialGeoJSON)
      }
    }
    
    const loadPolygon = (geoJSON) => {
      try {
        const layer = L.GeoJSON.geometryToLayer(geoJSON)
        if (layer) {
          drawnItems.addLayer(layer)
          map.fitBounds(layer.getBounds(), { padding: [50, 50] })
        }
      } catch (error) {
        logger.error('[GisMap] Error loading polygon:', error)
      }
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
      if (map) {
        map.remove()
        map = null
      }
    })

    return {
      mapContainer,
      saving
    }
  }
})
</script>

<style scoped>
.gis-map-container {
  position: relative;
  width: 100%;
  height: 500px;
}

.map-container {
  width: 100%;
  height: 450px;
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
</style>
