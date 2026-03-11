<template>
  <div class="gis-map-container">
    <div ref="mapContainer" class="map-container"></div>
    
    <!-- Drawing controls -->
    <div class="map-controls">
      <v-btn
        size="small"
        variant="flat"
        color="primary"
        prepend-icon="mdi-draw"
        @click="toggleDrawing"
        class="mr-2"
      >
        {{ drawingMode ? 'Salir de Dibujo' : 'Dibujar Polígono' }}
      </v-btn>
      
      <v-btn
        size="small"
        variant="outlined"
        color="error"
        prepend-icon="mdi-delete"
        @click="clearPolygon"
        :disabled="!polygonDrawn"
      >
        Limpiar
      </v-btn>
    </div>

    <!-- Polygon info -->
    <v-alert
      v-if="polygonGeoJSON"
      type="info"
      variant="tonal"
      class="mt-2"
      density="compact"
    >
      <div class="text-xs">
        <strong>Polígono dibujado:</strong>
        {{ polygonGeoJSON.coordinates[0].length - 1 }} vértices |
        Área estimada: {{ calculatedArea }} hectáreas
      </div>
    </v-alert>

    <!-- Save button -->
    <v-btn
      v-if="polygonGeoJSON && !readonly"
      block
      class="mt-2"
      color="success"
      variant="flat"
      @click="savePolygon"
      :loading="saving"
    >
      Guardar Polígono en Zona
    </v-btn>
  </div>
</template>

<script>
import { defineComponent, onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import L from 'leaflet'
import 'leaflet-draw'

// Leaflet CSS (import in main.js or here)
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

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
    const drawingMode = ref(false)
    const polygonDrawn = ref(false)
    const saving = ref(false)
    
    let map = null
    let drawnItems = null
    let drawControl = null
    let polygonLayer = null
    
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
      
      // Initialize FeatureGroup for drawn items
      drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      
      // Load initial polygon if provided
      if (props.initialGeoJSON) {
        loadPolygon(props.initialGeoJSON)
      }
      
      // Add draw control
      addDrawControl()
      
      // Handle draw events
      setupDrawEvents()
    }
    
    const addDrawControl = () => {
      drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
          remove: true
        },
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: '#4CAF50',
              fillColor: '#4CAF50',
              fillOpacity: 0.3
            }
          },
          polyline: false,
          circle: false,
          rectangle: false,
          marker: false,
          circlemarker: false
        }
      })
      
      if (!props.readonly) {
        map.addControl(drawControl)
      }
    }
    
    const setupDrawEvents = () => {
      map.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer
        
        // Clear existing layers (only one polygon allowed)
        drawnItems.clearLayers()
        
        drawnItems.addLayer(layer)
        polygonDrawn.value = true
        drawingMode.value = false
        
        // Hide draw control after drawing
        if (drawControl) {
          map.removeControl(drawControl)
        }
      })
      
      map.on(L.Draw.Event.EDITED, () => {
        polygonDrawn.value = true
      })
      
      map.on(L.Draw.Event.DELETED, () => {
        polygonDrawn.value = drawnItems.getLayers().length > 0
      })
    }
    
    const loadPolygon = (geoJSON) => {
      try {
        const layer = L.GeoJSON.geometryToLayer(geoJSON)
        if (layer) {
          drawnItems.addLayer(layer)
          polygonDrawn.value = true
          
          // Fit map to polygon bounds
          const bounds = layer.getBounds()
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      } catch (error) {
        console.error('[GisMap] Error loading polygon:', error)
      }
    }
    
    const toggleDrawing = () => {
      if (drawingMode.value) {
        // Exit drawing mode
        if (drawControl) {
          map.removeControl(drawControl)
        }
        drawingMode.value = false
      } else {
        // Enter drawing mode
        addDrawControl()
        drawingMode.value = true
        
        // Trigger draw polygon tool
        const drawToolbar = map._controls.find(c => c instanceof L.Control.Draw)
        if (drawToolbar && drawToolbar._toolbars) {
          drawToolbar._toolbars.draw._modes.polygon.handler.enable()
        }
      }
    }
    
    const clearPolygon = () => {
      drawnItems.clearLayers()
      polygonDrawn.value = false
      
      // Re-add draw control if in drawing mode
      if (drawingMode.value) {
        addDrawControl()
      }
    }
    
    const savePolygon = () => {
      if (!polygonGeoJSON.value) return
      
      saving.value = true
      
      // Emit event with GeoJSON
      emit('polygon-saved', {
        geoJSON: polygonGeoJSON.value,
        area: calculatedArea.value
      })
      
      saving.value = false
    }
    
    // Watch for initialGeoJSON changes
    watch(() => props.initialGeoJSON, (newVal) => {
      if (newVal && map) {
        drawnItems.clearLayers()
        loadPolygon(newVal)
      }
    })
    
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
      drawingMode,
      polygonDrawn,
      saving,
      polygonGeoJSON,
      calculatedArea,
      toggleDrawing,
      clearPolygon,
      savePolygon
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
