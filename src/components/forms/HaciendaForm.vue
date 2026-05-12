<template>
  <v-form ref="form">
    <!-- Main Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pa-2">
      
      <!-- LEFT COLUMN: Data & Information (5/12) -->
      <div class="lg:col-span-5 flex flex-col gap-6">
        
        <!-- Section: Basic Data -->
        <v-card variant="flat" class="border pa-4 rounded-xl bg-grey-lighten-5">
          <div class="flex items-center mb-4">
            <v-icon color="success" class="mr-2">mdi-home-outline</v-icon>
            <h4 class="font-bold">{{ t('hacienda_info.basic_data') || 'Datos Básicos' }}</h4>
          </div>
          
          <div class="flex flex-col gap-2">
            <v-text-field
              v-model="formData.name"
              :label="t('hacienda_info.name')"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-home"
              class="bg-white"
            ></v-text-field>
            
            <v-text-field
              v-model="formData.location"
              :label="t('hacienda_info.location')"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-map-marker"
              class="bg-white"
            ></v-text-field>
          </div>
        </v-card>

        <!-- Section: Contact & AI -->
        <v-card variant="flat" class="border pa-4 rounded-xl bg-grey-lighten-5">
          <div class="flex items-center mb-4">
            <v-icon color="success" class="mr-2">mdi-card-account-phone</v-icon>
            <h4 class="font-bold">{{ t('hacienda_info.contact') }}</h4>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <v-text-field
              v-model="formData.contacto_email"
              :label="t('hacienda_info.contact_email')"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-email"
              type="email"
              class="bg-white"
              hide-details
            ></v-text-field>
            
            <v-text-field
              v-model="formData.contacto_telefono"
              :label="t('hacienda_info.contact_phone')"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-phone"
              type="tel"
              class="bg-white"
              hide-details
            ></v-text-field>
          </div>

          <v-divider class="mb-4" />

          <div class="flex items-center mb-4">
            <v-icon color="info" class="mr-2">mdi-robot</v-icon>
            <h4 class="font-bold">Inteligencia Artificial (BYOK)</h4>
          </div>
          
          <div class="flex items-center gap-2">
            <v-text-field
              v-model="formData.openrouter_key"
              label="API Key (OpenRouter)"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-key"
              type="password"
              hide-details
              class="bg-white"
            ></v-text-field>
            <v-btn
              color="info"
              variant="flat"
              size="small"
              height="40"
              :loading="testingAI"
              @click="testAIConnection"
            >
              Test
            </v-btn>
          </div>
        </v-card>

        <!-- Section: Metrics -->
        <v-card variant="flat" class="border pa-4 rounded-xl bg-grey-lighten-5">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center">
              <v-icon color="success" class="mr-2">mdi-chart-box</v-icon>
              <h4 class="font-bold">{{ t('hacienda_info.metrics') }}</h4>
            </div>
            <v-btn
              size="x-small"
              variant="flat"
              icon="mdi-plus"
              color="success"
              @click="openAddMetricaDialog"
            ></v-btn>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div v-for="(metrica, key) in formData.metricas" :key="key">
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps">
                    <!-- Text Field (Default for text, date, number) -->
                    <v-text-field
                      v-if="['text', 'date', 'number'].includes(metrica.tipo)"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ').toUpperCase()"
                      :type="metrica.tipo"
                      density="compact"
                      variant="outlined"
                      class="bg-white"
                      hide-details
                    >
                      <template v-slot:append-inner>
                        <v-icon size="x-small" color="grey" @click.stop="removeMetrica(key)">mdi-close-circle</v-icon>
                      </template>
                    </v-text-field>

                    <!-- Select -->
                    <v-select
                      v-else-if="metrica.tipo === 'select'"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ').toUpperCase()"
                      :items="metrica.opciones"
                      variant="outlined"
                      density="compact"
                      class="bg-white"
                      hide-details
                    >
                      <template v-slot:append-inner>
                        <v-icon size="x-small" color="grey" @click.stop="removeMetrica(key)">mdi-close-circle</v-icon>
                      </template>
                    </v-select>

                    <!-- Checkbox -->
                    <v-checkbox
                      v-else-if="metrica.tipo === 'boolean' || metrica.tipo === 'checkbox'"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ').toUpperCase()"
                      density="compact"
                      hide-details
                      class="mt-n2"
                    >
                      <template v-slot:append>
                        <v-icon size="x-small" color="grey" @click.stop="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-checkbox>
                  </div>
                </template>
                <span>{{ metrica.descripcion }}</span>
              </v-tooltip>
            </div>
          </div>
        </v-card>

        <!-- Section: Extended Info -->
        <v-card variant="flat" class="border pa-4 rounded-xl bg-grey-lighten-5">
          <div class="mb-2 flex items-center">
            <v-icon color="success" class="mr-2">mdi-information</v-icon>
            <h4 class="font-bold">{{ t('hacienda_info.my_info') }}</h4>
          </div>
          <QuillEditor
            contentType="html"
            v-model:content="formData.info"
            toolbar="essential"
            theme="snow"
            class="quill-editor bg-white"
          />
        </v-card>
      </div>

      <!-- RIGHT COLUMN: GIS Visualization (7/12) -->
      <div class="lg:col-span-7 flex flex-col gap-4">
        <v-card variant="flat" class="border pa-4 rounded-xl bg-grey-lighten-5 h-full">
          <div class="text-subtitle-2 font-weight-bold mb-4 d-flex align-center">
            <v-icon start color="blue" class="mr-2">mdi-map-marker-path</v-icon>
            Geometría y Ubicación (GIS)
          </div>

          <!-- GPS Controls -->
          <div class="mb-4 bg-white p-3 rounded-lg border">
            <div class="text-caption font-weight-bold mb-2">Marcador Central (GPS)</div>
            <div class="flex flex-wrap gap-4 items-center">
              <div class="grid grid-cols-2 gap-2 flex-grow-1" style="min-width: 200px;">
                <v-text-field
                  v-model.number="formData.gps.lat"
                  label="Latitud"
                  type="number"
                  step="0.000001"
                  prepend-inner-icon="mdi-latitude"
                  density="compact"
                  variant="outlined"
                  hide-details
                ></v-text-field>
                <v-text-field
                  v-model.number="formData.gps.lng"
                  label="Longitud"
                  type="number"
                  step="0.000001"
                  prepend-inner-icon="mdi-longitude"
                  density="compact"
                  variant="outlined"
                  hide-details
                ></v-text-field>
              </div>
              <v-btn
                color="primary"
                :loading="loadingGPS"
                :disabled="!gpsAvailable"
                @click="autoLocate"
                variant="flat"
                height="40"
                prepend-icon="mdi-crosshairs-gps"
              >
                AUTO
              </v-btn>
            </div>
            <div v-if="gpsError" class="mt-2 text-caption text-error d-flex align-center">
              <v-icon start size="small">mdi-alert</v-icon>
              {{ gpsError }}
            </div>
          </div>

          <!-- Map Container -->
          <div class="border rounded-lg overflow-hidden elevation-1 bg-white">
            <v-toolbar density="compact" flat color="grey-lighten-4">
              <v-icon start size="x-small" class="ml-2">mdi-draw-polygon</v-icon>
              <span class="text-caption font-weight-bold">Delimitación de Hacienda</span>
              <v-spacer></v-spacer>
            </v-toolbar>
            
            <GisMapComponent
              :enable-drawing="true"
              draw-mode="both"
              :no-fill="true"
              :center="[formData.gps.lat || 4.5709, formData.gps.lng || -74.2973]"
              :zoom="16"
              :initialGeoJSON="formData.geometria"
              :hacienda-gps="formData.gps"
              @geometry-updated="handleGeometryUpdated"
              @first-point-placed="handleFirstPointPlaced"
              style="height: 600px; width: 100%;"
            />
          </div>

          <!-- Vértices del Polígono -->
          <div v-if="polygonVertices.length > 0" class="mt-4 p-4 bg-white rounded-lg border shadow-sm">
            <div class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon start color="blue" size="small" class="mr-2">mdi-shape-polygon-plus</v-icon>
              Vértices del perímetro ({{ polygonVertices.length }})
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
              <div v-for="(vertex, index) in polygonVertices" :key="index" class="d-flex gap-2 align-center bg-grey-lighten-5 p-2 rounded border">
                <v-chip size="x-small" color="blue" variant="flat" class="font-weight-bold">V{{ index + 1 }}</v-chip>
                <v-text-field
                  v-model.number="vertex.lat"
                  label="Lat"
                  type="number"
                  step="0.000001"
                  density="compact"
                  variant="outlined"
                  hide-details
                  @change="updatePolygonFromVertices"
                ></v-text-field>
                <v-text-field
                  v-model.number="vertex.lng"
                  label="Lng"
                  type="number"
                  step="0.000001"
                  density="compact"
                  variant="outlined"
                  hide-details
                  @change="updatePolygonFromVertices"
                ></v-text-field>
              </div>
            </div>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Diálogo para añadir métrica -->
    <v-dialog v-model="addMetricaDialog" persistent max-width="400px">
      <v-card rounded="xl">
        <v-toolbar color="success" density="compact">
          <v-toolbar-title class="">{{ isEditingMetrica ? (t('hacienda_info.edit_metric') || 'Editar Métrica') : t('hacienda_info.add_metric') }}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="newMetrica.titulo"
            :label="t('hacienda_info.title')"
            variant="outlined"
            density="compact"
            class="mb-2"
          />
          <v-textarea
            v-model="newMetrica.descripcion"
            :label="t('hacienda_info.description')"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-2"
          />
          <v-select
            v-model="newMetrica.tipo"
            :items="['text', 'number', 'date', 'boolean', 'checkbox', 'select']"
            :label="t('hacienda_info.type')"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="flat" color="red-lighten-3" @click="addMetricaDialog = false">{{ t('hacienda_info.cancel') }}</v-btn>
          <v-btn variant="flat" color="green-lighten-3" @click="handleAddMetrica">{{ isEditingMetrica ? (t('hacienda_info.save') || 'Guardar') : t('hacienda_info.add') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-form>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { locationCoordinator } from '@/services/locationCoordinator'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { aiService } from '@/services/aiService'
import GisMapComponent from '@/components/GisMapComponent.vue'
import L from 'leaflet'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  initialData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const haciendaStore = useHaciendaStore()
const uiFeedback = useUiFeedbackStore()

const formData = ref(JSON.parse(JSON.stringify(props.initialData)))

// Estado para vértices de polígono
const polygonVertices = ref([])

// Ensure structure
if (!formData.value.gps || typeof formData.value.gps !== 'object') {
  formData.value.gps = { lat: null, lng: null }
}
if (!formData.value.geometria) {
  formData.value.geometria = null
}

// GPS State
const loadingGPS = ref(false)
const gpsAvailable = ref(true)
const gpsError = ref('')
const gpsAccuracy = ref(null)

// AI State
const testingAI = ref(false)

// Metrics State
const addMetricaDialog = ref(false)
const isEditingMetrica = ref(false)
const editingMetricaKey = ref('')
const newMetrica = ref({
  titulo: '',
  descripcion: '',
  tipo: 'text'
})

// Sync data back to parent
watch(formData, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

/**
 * Carga inicial de vértices si existe geometría
 */
const initVertices = () => {
  if (formData.value.geometria && formData.value.geometria.type === 'Polygon') {
    const exteriorRing = formData.value.geometria.coordinates[0] || []
    let displayVertices = [...exteriorRing]
    
    // Quitar el último punto duplicado de GeoJSON para la edición
    if (displayVertices.length > 1) {
      const first = displayVertices[0]
      const last = displayVertices[displayVertices.length - 1]
      if (first[0] === last[0] && first[1] === last[1]) {
        displayVertices.pop()
      }
    }
    
    polygonVertices.value = displayVertices.map(coord => ({
      lng: coord[0],
      lat: coord[1]
    }))
  }
}

onMounted(() => {
  initVertices()
})

const handleGeometryUpdated = ({ geojson }) => {
  formData.value.geometria = geojson
  
  if (geojson && geojson.type === 'Polygon') {
    const exteriorRing = geojson.coordinates[0] || []
    let displayVertices = [...exteriorRing]
    
    if (displayVertices.length > 1) {
      const first = displayVertices[0]
      const last = displayVertices[displayVertices.length - 1]
      if (first[0] === last[0] && first[1] === last[1]) {
        displayVertices.pop()
      }
    }
    
    polygonVertices.value = displayVertices.map(coord => ({
      lng: coord[0],
      lat: coord[1]
    }))
  } else {
    polygonVertices.value = []
  }
}

const handleFirstPointPlaced = (latlng) => {
  if (latlng) {
    formData.value.gps.lat = parseFloat(Number(latlng.lat).toFixed(6))
    formData.value.gps.lng = parseFloat(Number(latlng.lng).toFixed(6))
  }
}

function updatePolygonFromVertices() {
  if (polygonVertices.value.length > 0) {
    const newCoords = polygonVertices.value.map(v => [Number(v.lng), Number(v.lat)])
    const closedCoords = [...newCoords, [...newCoords[0]]]
    
    formData.value.geometria = {
      type: 'Polygon',
      coordinates: [closedCoords]
    }
  }
}

async function autoLocate() {
  loadingGPS.value = true
  gpsError.value = ''
  gpsAccuracy.value = null

  try {
    const position = await locationCoordinator.getPosition()
    formData.value.gps = {
      lat: position.latitude,
      lng: position.longitude
    }
    uiFeedback.showToast('GPS actualizado con ubicación actual', 'success')
  } catch (error) {
    let errorMsg = error.message
    if (error.message.includes('denegado')) {
      errorMsg = 'Permiso denegado. Activa la ubicación en tu navegador.'
    }
    gpsError.value = errorMsg
    uiFeedback.showError(errorMsg)
  } finally {
    loadingGPS.value = false
  }
}

const testAIConnection = async () => {
  if (!formData.value.openrouter_key) {
    uiFeedback.showToast('Debes ingresar una clave primero', 'warning')
    return
  }
  
  testingAI.value = true
  try {
    const isOk = await aiService.testConnection(formData.value.openrouter_key)
    if (isOk) {
      uiFeedback.showToast('Conexión con OpenRouter exitosa', 'success')
    } else {
      uiFeedback.showToast('No se pudo validar la clave de OpenRouter', 'error')
    }
  } catch (error) {
    uiFeedback.showToast('Error probando conexión: ' + error.message, 'error')
  } finally {
    testingAI.value = false
  }
}

const openAddMetricaDialog = () => {
  addMetricaDialog.value = true
  isEditingMetrica.value = false
  editingMetricaKey.value = ''
  newMetrica.value = { titulo: '', descripcion: '', tipo: 'text' }
}

const editMetrica = (key, metrica) => {
  isEditingMetrica.value = true
  editingMetricaKey.value = key
  newMetrica.value = {
    titulo: key.replace(/_/g, ' ').toUpperCase(),
    descripcion: metrica.descripcion || '',
    tipo: metrica.tipo || 'text'
  }
  addMetricaDialog.value = true
}

const handleAddMetrica = () => {
  if (!newMetrica.value.titulo) return

  const key = newMetrica.value.titulo.toLowerCase().replace(/\s+/g, '_')

  if (!formData.value.metricas) {
    formData.value.metricas = {}
  }

  const metricaData = {
    tipo: newMetrica.value.tipo,
    valor: (isEditingMetrica.value && formData.value.metricas[editingMetricaKey.value]?.tipo === newMetrica.value.tipo)
      ? formData.value.metricas[editingMetricaKey.value].valor
      : haciendaStore.getDefaultMetricaValue(newMetrica.value.tipo),
    descripcion: newMetrica.value.descripcion
  }

  if (isEditingMetrica.value && editingMetricaKey.value !== key) {
    delete formData.value.metricas[editingMetricaKey.value]
  }

  formData.value.metricas[key] = metricaData

  newMetrica.value = {
    titulo: '',
    descripcion: '',
    tipo: 'text'
  }

  addMetricaDialog.value = false
  isEditingMetrica.value = false
  editingMetricaKey.value = ''
}

const removeMetrica = (key) => {
  const metricas = { ...formData.value.metricas }
  delete metricas[key]
  formData.value.metricas = metricas
}

defineExpose({
  formData
})
</script>

<style scoped>
.quill-editor {
  min-height: 150px;
}
</style>
