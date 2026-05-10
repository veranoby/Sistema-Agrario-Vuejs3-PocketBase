<template>
  <v-form ref="form">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pa-2">
      <!-- Datos Básicos -->
      <div class="flex flex-col gap-4">
        <div class="flex items-center mb-2">
          <v-icon color="success" class="mr-2">mdi-home-outline</v-icon>
          <h4 class="font-bold ">{{ t('hacienda_info.basic_data') || 'Datos Básicos' }}</h4>
        </div>
        
        <v-text-field
          v-model="formData.name"
          :label="t('hacienda_info.name')"
          variant="outlined"
          density="compact"
          prepend-icon="mdi-home"
        ></v-text-field>
        
        <v-text-field
          v-model="formData.location"
          :label="t('hacienda_info.location')"
          variant="outlined"
          density="compact"
          prepend-icon="mdi-map-marker"
        ></v-text-field>

        <div class="flex flex-col gap-2">
          <div class="flex items-center mb-1">
            <v-icon color="primary" class="mr-2">mdi-crosshairs-gps</v-icon>
            <span class="text-subtitle-2 font-medium">{{ t('hacienda_info.gps') }}</span>            <v-btn
              color="primary"
              size="small"
              :loading="loadingGPS"
              :disabled="!gpsAvailable"
              @click="autoLocate"
              variant="tonal"
            >
              <v-icon start>mdi-crosshairs-gps</v-icon>
              Auto-detectar
            </v-btn>
            <div v-if="gpsError" class="text-caption text-error">
              <v-icon start size="small">mdi-alert</v-icon>
              {{ gpsError }}
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <v-text-field
              v-model.number="formData.gps.lat"
              label="Latitud"
              type="number"
              step="0.000001"
              prepend-icon="mdi-latitude"
              density="compact"
              variant="outlined"
              :rules="[v => v === null || v === '' || (v >= -90 && v <= 90) || 'Latitud debe estar entre -90 y 90']"
              persistent-hint
            ></v-text-field>
            <v-text-field
              v-model.number="formData.gps.lng"
              label="Longitud"
              type="number"
              step="0.000001"
              prepend-icon="mdi-longitude"
              density="compact"
              variant="outlined"
              :rules="[v => v === null || v === '' || (v >= -180 && v <= 180) || 'Longitud debe estar entre -180 y 180']"
              persistent-hint
            ></v-text-field>
          </div>
        </div>
      </div>

      <!-- Contacto e Inteligencia Artificial -->
      <div class="flex flex-col gap-4">
        <div class="flex items-center mb-2">
          <v-icon color="success" class="mr-2">mdi-card-account-phone</v-icon>
          <h4 class="font-bold ">{{ t('hacienda_info.contact') }}</h4>
        </div>
        
        <v-text-field
          v-model="formData.contacto_email"
          :label="t('hacienda_info.contact_email')"
          density="compact"
          variant="outlined"
          prepend-icon="mdi-email"
          type="email"
        ></v-text-field>
        
        <v-text-field
          v-model="formData.contacto_telefono"
          :label="t('hacienda_info.contact_phone')"
          density="compact"
          variant="outlined"
          prepend-icon="mdi-phone"
          type="tel"
        ></v-text-field>

        <div class="mt-2">
          <div class="flex items-center mb-4">
            <v-icon color="info" class="mr-2">mdi-robot</v-icon>
            <h4 class="font-bold ">Inteligencia Artificial (BYOK)</h4>
          </div>
          <div class="flex items-center gap-2">
            <v-text-field
              v-model="formData.openrouter_key"
              label="API Key (OpenRouter)"
              density="compact"
              variant="outlined"
              prepend-icon="mdi-key"
              type="password"
              hide-details
            ></v-text-field>
            <v-btn
              color="info"
              variant="outlined"
              size="small"
              :loading="testingAI"
              @click="testAIConnection"
            >
              Test
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Métricas -->
    <div class="mt-6 pa-2">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center">
          <v-icon color="success" class="mr-2">mdi-chart-box</v-icon>
          <h4 class="font-bold ">{{ t('hacienda_info.metrics') }}</h4>
        </div>
        <v-btn
          size="small"
          variant="flat"
          prepend-icon="mdi-plus"
          color="green-lighten-3"
          @click="openAddMetricaDialog"
        >
          {{ t('hacienda_info.add_metric') }}
        </v-btn>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <div v-for="(metrica, key) in formData.metricas" :key="key">
          <v-tooltip location="bottom">
            <template v-slot:activator="{ props }">
              <div v-bind="props">
                <v-select
                  v-if="metrica.tipo === 'select'"
                  v-model="metrica.valor"
                  :label="key.replace(/_/g, ' ').toUpperCase()"
                  :items="metrica.opciones"
                  variant="outlined"
                  density="compact"
                >
                  <template v-slot:append>
                    <v-icon size="small" color="primary" class="mr-1" @click.stop="editMetrica(key, metrica)">mdi-pencil</v-icon>
                    <v-icon size="small" @click.stop="removeMetrica(key)" color="red-lighten-2">mdi-delete</v-icon>
                  </template>
                </v-select>
                <v-text-field
                  v-else-if="metrica.tipo === 'date'"
                  v-model="metrica.valor"
                  :label="key.replace(/_/g, ' ').toUpperCase()"
                  type="date"
                  density="compact"
                  variant="outlined"
                >
                  <template v-slot:append>
                    <v-icon size="small" color="primary" class="mr-1" @click.stop="editMetrica(key, metrica)">mdi-pencil</v-icon>
                    <v-icon size="small" @click.stop="removeMetrica(key)" color="red-lighten-2">mdi-delete</v-icon>
                  </template>
                </v-text-field>
                <v-text-field
                  v-else-if="metrica.tipo === 'text'"
                  v-model="metrica.valor"
                  :label="key.replace(/_/g, ' ').toUpperCase()"
                  density="compact"
                  variant="outlined"
                >
                  <template v-slot:append>
                    <v-icon size="small" color="primary" class="mr-1" @click.stop="editMetrica(key, metrica)">mdi-pencil</v-icon>
                    <v-icon size="small" @click.stop="removeMetrica(key)" color="red-lighten-2">mdi-delete</v-icon>
                  </template>
                </v-text-field>
                <v-text-field
                  v-else-if="metrica.tipo === 'number'"
                  v-model.number="metrica.valor"
                  :label="key.replace(/_/g, ' ').toUpperCase()"
                  type="number"
                  density="compact"
                  variant="outlined"
                >
                  <template v-slot:append>
                    <v-icon size="small" color="primary" class="mr-1" @click.stop="editMetrica(key, metrica)">mdi-pencil</v-icon>
                    <v-icon size="small" @click.stop="removeMetrica(key)" color="red-lighten-2">mdi-delete</v-icon>
                  </template>
                </v-text-field>
                <v-checkbox
                  v-else-if="metrica.tipo === 'boolean' || metrica.tipo === 'checkbox'"
                  v-model="metrica.valor"
                  :label="key.replace(/_/g, ' ').toUpperCase()"
                  density="compact"
                  hide-details
                >
                  <template v-slot:append>
                    <v-icon size="small" color="primary" class="mr-1" @click.stop="editMetrica(key, metrica)">mdi-pencil</v-icon>
                    <v-icon size="small" @click.stop="removeMetrica(key)" color="red-lighten-2">mdi-delete</v-icon>
                  </template>
                </v-checkbox>
              </div>
            </template>
            <span>{{ metrica.descripcion }}</span>
          </v-tooltip>
        </div>
      </div>
    </div>

    <!-- Información Extendida -->
    <div class="mt-6 pa-2">
      <div class="mb-2 flex items-center">
        <v-icon color="success" class="mr-2">mdi-information</v-icon>
        <h4 class="font-bold ">{{ t('hacienda_info.my_info') }}</h4>
      </div>
      <QuillEditor
        contentType="html"
        v-model:content="formData.info"
        toolbar="essential"
        theme="snow"
        class="quill-editor"
      />
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
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { locationCoordinator } from '@/services/locationCoordinator'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { aiService } from '@/services/aiService'

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

// Ensure GPS object has valid structure
if (!formData.value.gps || typeof formData.value.gps !== 'object') {
  formData.value.gps = { lat: null, lng: null }
} else {
  formData.value.gps.lat = typeof formData.value.gps.lat === 'number' ? formData.value.gps.lat : null
  formData.value.gps.lng = typeof formData.value.gps.lng === 'number' ? formData.value.gps.lng : null
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

const formatGPS = (gps) => {
  if (!gps || !gps.lat || !gps.lng) return t('hacienda_info.not_available')
  return `Lat: ${gps.lat}, Lng: ${gps.lng}`
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
  } catch (error) {
    let errorMsg = error.message
    if (error.message.includes('denegado')) {
      errorMsg = 'Permiso denegado. Activa la ubicación en tu navegador.'
    }
    gpsError.value = errorMsg
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
