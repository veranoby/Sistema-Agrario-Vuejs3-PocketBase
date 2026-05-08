<template>
  <v-card>
    <v-form ref="form" v-model="formularioValido" lazy-validation>
      <v-toolbar color="success" dark flat>
        <v-toolbar-title class="font-weight-bold">
          {{ modoEdicion ? $t('zones.edit') : $t('zones.create') }} {{ tipoZonaActual?.nombre }}
          <template v-if="siembraContext">
            <v-icon size="small" class="mx-2">mdi-chevron-right</v-icon>
            <span class="text-subtitle-2 opacity-80">{{ siembraContext.nombre }}</span>
          </template>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="cerrar">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <!-- Main Layout Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- LEFT COLUMN: Management & Information (5/12) -->
          <div class="lg:col-span-5">
            
            <!-- Section: Header & Basic Data -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
              <!-- Avatar Column (only in Edit mode) -->
              <div v-if="modoEdicion" class="md:col-span-4 flex justify-center items-start">
                <div class="relative group mt-2">
                  <v-avatar size="100" class="elevation-2 border-2 border-white">
                    <v-img :src="CargaImagenZona(zonaLocal.id)" alt="Avatar de Zona"></v-img>
                  </v-avatar>
                  <v-btn
                    icon
                    size="x-small"
                    color="success"
                    class="absolute bottom-0 right-0"
                    @click="showAvatarDialog = true"
                  >
                    <v-icon size="16">mdi-camera</v-icon>
                  </v-btn>
                  
                  <AvatarForm
                    v-model="showAvatarDialog"
                    collection="zonas"
                    :entityId="zonaLocal?.id"
                    :currentAvatarUrl="CargaImagenZona(zonaLocal.id)"
                    :hasCurrentAvatar="!!zonaLocal?.avatar"
                    @avatar-updated="handleAvatarUpdated"
                  />
                </div>
              </div>

              <!-- Name & Sowing Column -->
              <div :class="modoEdicion ? 'md:col-span-8' : 'md:col-span-12'">
                <v-text-field
                  v-model="zonaLocal.nombre"
                  label="Nombre de la Zona"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                  required
                  :rules="[(v) => !!v || 'El nombre es requerido']"
                  prepend-inner-icon="mdi-map"
                ></v-text-field>

                <v-select
                  v-if="!fromSiembraWorkspace"
                  v-model="zonaLocal.siembra"
                  :items="props.siembrasActivas"
                  prepend-inner-icon="mdi-sprout"
                  label="Siembra Asociada"
                  item-title="nombre"
                  item-value="id"
                  density="compact"
                  variant="outlined"
                  hide-details
                >
                  <template v-slot:item="{ props: itemProps, item }">
                    <v-list-item 
                      v-bind="itemProps" 
                      :title="item.raw.nombre" 
                      :subtitle="item.raw.tipo"
                    ></v-list-item>
                  </template>
                  <template v-slot:selection="{ item }">
                    <span class="text-truncate">{{ item.raw.nombre }} - {{ item.raw.tipo }}</span>
                  </template>
                </v-select>
              </div>
            </div>

            <!-- Section: Technical Row (Area, Unidad, Contabilizable) -->
            <div class="grid grid-cols-12 gap-2 mb-4 p-3 bg-grey-lighten-4 rounded-lg border border-dashed">
              <div class="col-span-5">
                <v-text-field
                  v-model="zonaLocal.area.area"
                  label="Área"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                ></v-text-field>
              </div>
              <div class="col-span-3">
                <v-select
                  v-model="zonaLocal.area.unidad"
                  variant="outlined"
                  density="compact"
                  :items="['m²', 'ha', 'km²']"
                  label="Und"
                  hide-details
                ></v-select>
              </div>
              <div class="col-span-4 d-flex align-center justify-center">
                <v-tooltip text="¿Se usará para sumar áreas totales de la siembra?" location="top">
                  <template v-slot:activator="{ props }">
                    <v-checkbox
                      v-bind="props"
                      v-model="zonaLocal.contabilizable"
                      label="Contabilizable"
                      density="compact"
                      hide-details
                      class="mt-0"
                    ></v-checkbox>
                  </template>
                </v-tooltip>
              </div>
            </div>

            <!-- Section: Metrics -->
            <div class="mb-6 p-4 bg-grey-lighten-5 rounded-lg border">
              <div class="d-flex justify-space-between align-center mb-3">
                <div class="text-subtitle-2 font-weight-bold d-flex align-center">
                  <v-icon start color="success" size="small">mdi-chart-line</v-icon>
                  Métricas y Atributos
                </div>
                <v-btn size="x-small" color="success" @click="openAddMetricaDialog" icon elevation="1">
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div v-for="(metrica, key) in zonaLocal.metricas" :key="key">
                  <!-- Select -->
                  <v-select
                    v-if="metrica.tipo === 'select'"
                    v-model="metrica.valor"
                    :label="key"
                    :items="metrica.opciones || []"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="bg-white"
                  >
                    <template v-slot:append-inner>
                      <v-icon size="small" color="grey" @click="removeMetrica(key)">mdi-close-circle</v-icon>
                    </template>
                  </v-select>

                  <!-- String -->
                  <v-text-field
                    v-else-if="metrica.tipo === 'string'"
                    v-model="metrica.valor"
                    :label="key"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="bg-white"
                  >
                    <template v-slot:append-inner>
                      <v-icon size="small" color="grey" @click="removeMetrica(key)">mdi-close-circle</v-icon>
                    </template>
                  </v-text-field>

                  <!-- Number -->
                  <v-text-field
                    v-else-if="metrica.tipo === 'number'"
                    v-model.number="metrica.valor"
                    :label="key"
                    type="number"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="bg-white"
                  >
                    <template v-slot:append-inner>
                      <v-icon size="small" color="grey" @click="removeMetrica(key)">mdi-close-circle</v-icon>
                    </template>
                  </v-text-field>

                  <!-- Checkbox -->
                  <v-checkbox
                    v-else-if="metrica.tipo === 'checkbox'"
                    v-model="metrica.valor"
                    :label="key"
                    density="compact"
                    hide-details
                    class="mt-n2"
                  >
                    <template v-slot:append>
                      <v-icon size="small" color="grey" @click="removeMetrica(key)">mdi-delete</v-icon>
                    </template>
                  </v-checkbox>

                  <!-- Multi-select -->
                  <v-select
                    v-else-if="metrica.tipo === 'multi-select'"
                    v-model="metrica.valor"
                    :label="key"
                    :items="metrica.opciones || []"
                    multiple
                    chips
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="bg-white"
                  >
                    <template v-slot:append-inner>
                      <v-icon size="small" color="grey" @click="removeMetrica(key)">mdi-close-circle</v-icon>
                    </template>
                  </v-select>
                </div>
              </div>
            </div>

            <!-- Section: Mi Info (Editor) -->
            <div class="mt-4 p-4 bg-grey-lighten-5 rounded-lg border">
              <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
                <v-icon start color="amber-darken-2" size="small">mdi-note-text-outline</v-icon>
                Notas y Detalles Adicionales
              </div>
              <QuillEditor
                v-model:content="zonaLocal.info"
                contentType="html"
                toolbar="essential"
                theme="snow"
                class="quill-editor"
              />
            </div>
          </div>

          <!-- RIGHT COLUMN: GIS Visualization (7/12) -->
          <div class="lg:col-span-7 flex flex-col">
            <!-- GPS & Map Header -->
            <div class="mb-4">
              <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
                <v-icon start color="blue" size="small">mdi-map-marker-path</v-icon>
                Geometría y Ubicación (GIS)
              </div>
              
              <!-- GPS Editable Fields (alineado a HaciendaForm) -->
              <div class="mb-4">
                <div class="text-caption font-weight-bold mb-2">Coordenadas GPS</div>
                <div class="flex flex-wrap gap-4 items-center">
                  <div class="grid grid-cols-2 gap-2 flex-grow-1" style="min-width: 200px;">
                    <v-text-field
                      v-model.number="zonaLocal.gps.lat"
                      label="Latitud"
                      type="number"
                      step="0.000001"
                      prepend-icon="mdi-latitude"
                      density="compact"
                      variant="outlined"
                      :rules="[v => v === null || v === '' || (v >= -90 && v <= 90) || 'Latitud debe estar entre -90 y 90']"
                      hint="Grados decimales (-90 a 90)"
                      persistent-hint
                    ></v-text-field>
                    <v-text-field
                      v-model.number="zonaLocal.gps.lng"
                      label="Longitud"
                      type="number"
                      step="0.000001"
                      prepend-icon="mdi-longitude"
                      density="compact"
                      variant="outlined"
                      :rules="[v => v === null || v === '' || (v >= -180 && v <= 180) || 'Longitud debe estar entre -180 y 180']"
                      hint="Grados decimales (-180 a 180)"
                      persistent-hint
                    ></v-text-field>
                  </div>
                  <!-- Botones en línea horizontal -->
                  <div class="flex flex-row flex-wrap gap-2 items-center">
                    <v-btn
                      icon="mdi-target-variant"
                      size="small"
                      variant="text"
                      color="blue"
                      @click="centerOnGPS"
                      title="Centrar mapa en estas coordenadas"
                    ></v-btn>
                    <v-btn
                      icon="mdi-home"
                      size="small"
                      variant="text"
                      color="green"
                      @click="centerOnHaciendaGPS"
                      title="Centrar mapa en GPS de la Hacienda"
                    ></v-btn>
                    <v-btn
                      icon="mdi-restore"
                      size="small"
                      variant="text"
                      color="grey"
                      @click="resetMapToInitial"
                      title="Volver al punto inicial del mapa"
                    ></v-btn>
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
                </div>
              </div>

              <!-- Map Container -->
              <div class="border rounded-lg overflow-hidden elevation-1 bg-white mt-4">
                <v-toolbar density="compact" flat color="grey-lighten-4">
                  <v-icon start size="x-small" class="ml-2">mdi-draw-polygon</v-icon>
                  <span class="text-caption font-weight-bold">
                    Modo: {{ drawMode === 'polygon' ? 'Dibujo de Polígono' : 'Marcador de Punto' }}
                  </span>
                  <v-spacer></v-spacer>
                  <v-chip v-if="gpsAccuracy" size="x-small" color="success" variant="flat" class="mr-2">
                    Precisión: {{ gpsAccuracy }}m
                  </v-chip>
                </v-toolbar>
                
                <GisMapComponent
                  :enable-drawing="true"
                  :draw-mode="drawMode"
                  :center="mapCenter"
                  :zoom="mapZoom"
                  :initial-geo-json="zonaLocal.geometria"
                  :hacienda-gps="mi_hacienda?.gps"
                  @geometry-updated="handleGeometryUpdated"
                  style="height: 1100px; width: 100%;"
                />
              </div>

              <div v-if="gpsError" class="mt-2 text-caption text-error d-flex align-center">
                <v-icon start size="small">mdi-alert</v-icon>
                {{ gpsError }}
              </div>

              <!-- Vértices de polígono (post-dibujo) -->
              <div v-if="polygonVertices.length > 0" class="mt-2 p-2 bg-grey-lighten-4 rounded-lg text-caption">
                <div class="font-weight-bold mb-1">Vértices del polígono ({{ polygonVertices.length }}):</div>
                <div v-for="(vertex, index) in polygonVertices" :key="index" class="d-flex gap-2">
                  <span>V{{ index + 1 }}:</span>
                  <span>
                    Lat: {{ vertex.lat.toFixed(6) }},
                    Lng: {{ vertex.lng.toFixed(6) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM SECTION: BPA Compliance (Full Width) -->
        <div class="mt-8 pt-6 border-t" v-if="zonaLocal.tipos_zonas">
          <div class="text-h6 font-weight-bold mb-4 d-flex align-center">
            <v-icon start color="green-darken-2">mdi-shield-check-outline</v-icon>
            Seguimiento de Buenas Prácticas Agrícolas (BPA)
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <v-card 
              v-for="(pregunta, index) in getBpaPreguntas" 
              :key="index"
              variant="flat"
              class="pa-4 bg-grey-lighten-5 border rounded-xl"
            >
              <div class="d-flex align-start gap-3 mb-2">
                <v-avatar size="24" color="success" variant="tonal">
                  <span class="text-caption font-weight-bold">{{ index + 1 }}</span>
                </v-avatar>
                <div class="text-caption font-weight-bold text-grey-darken-3 leading-tight">
                  {{ pregunta.pregunta }}
                  <v-tooltip
                    v-if="pregunta.descripcion"
                    activator="parent"
                    location="top"
                  >
                    <div class="text-caption pa-2">{{ pregunta.descripcion }}</div>
                  </v-tooltip>
                </div>
              </div>

              <v-radio-group
                v-if="zonaLocal.datos_bpa && zonaLocal.datos_bpa[index]"
                v-model="zonaLocal.datos_bpa[index].respuesta"
                hide-details
                density="compact"
                class="mt-1"
              >
                <div class="flex flex-wrap gap-x-4 gap-y-1">
                  <v-radio
                    v-for="(opcion, opcionIndex) in pregunta.opciones"
                    :key="`${index}-${opcionIndex}`"
                    :label="opcion"
                    :value="opcion"
                    density="compact"
                    color="success"
                  >
                    <template v-slot:label>
                      <span class="text-caption font-weight-medium">{{ opcion }}</span>
                    </template>
                  </v-radio>
                </div>
              </v-radio-group>
            </v-card>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          variant="flat"          
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="cerrar"
        >
          CANCELAR
        </v-btn>
        <v-btn
          variant="flat"          
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="guardar"
          :disabled="!formularioValido"
        >
          GUARDAR
        </v-btn>
      </v-card-actions>
    </v-form>
  </v-card>

  <!-- Diálogo para agregar métrica personalizada -->
  <v-dialog v-model="addMetricaDialog" persistent max-width="1400px">
    <v-card>
      <v-toolbar color="success" dark>
        <v-toolbar-title>Agregar Métrica</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-card-text>
        <v-text-field
          density="compact"
          variant="outlined"
          v-model="newMetrica.titulo"
          label="Título"
        />
        <v-textarea
          density="compact"
          variant="outlined"
          v-model="newMetrica.descripcion"
          label="Descripción"
        />
        <v-select
          density="compact"
          variant="outlined"
          v-model="newMetrica.tipo"
          :items="['checkbox', 'number', 'string', 'select', 'multi-select']"
          label="Tipo"
          @update:model-value="handleTipoChange"
        />
        <!-- Campo de opciones que aparece solo para tipos específicos -->
        <v-textarea
          v-if="showOpcionesField"
          density="compact"
          variant="outlined"
          v-model="newMetrica.opcionesText"
          label="Opciones (separadas por coma)"
          placeholder="Opción 1, Opción 2, Opción 3"
          hint="*INGRESAR OPCIONES SEPARADAS POR COMAS"
          persistent-hint
        />
      </v-card-text>
      <v-card-actions>
        <v-btn
          variant="flat"          
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="addMetricaDialog = false"
          >CANCELAR</v-btn
        >
        <v-btn
          variant="flat"          
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="addMetrica"
          >Agregar</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useZonasStore } from '@/stores/zonasStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { storeToRefs } from 'pinia'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useAvatarStore } from '@/stores/avatarStore'
import AvatarForm from '@/components/forms/AvatarForm.vue'
import GisMapComponent from '@/components/GisMapComponent.vue'


const showAvatarDialog = ref(false)

const props = defineProps({
  modoEdicion: {
    type: Boolean,
    default: false
  },
  zonaInicial: {
    type: Object,
    default: () => ({
      nombre: '',
      area: { area: null, unidad: 'ha' },
      info: '',
      contabilizable: true,
      gps: null,
      avatar: null,
      datos_bpa: [],
      metricas: {}
    })
  },
  tipoZonaActual: {
    type: Object,
    required: true
  },
  siembraContext: {
    type: Object,
    default: null
  },
  fromSiembraWorkspace: {
    type: Boolean,
    default: false
  },
  siembrasActivas: {
    type: Array,
    default: () => []
  }
})

const { t } = useI18n();
const emit = defineEmits(['close', 'saved'])
const zonasStore = useZonasStore()
const uiFeedbackStore = useUiFeedbackStore()
const { tiposZonas } = storeToRefs(zonasStore)
const haciendaStore = useHaciendaStore()
const avatarStore = useAvatarStore()

// Importar servicio de geolocalización
import { locationCoordinator } from '@/services/locationCoordinator'

// Importar logger
import { logger } from '@/utils/logger'

const { mi_hacienda } = storeToRefs(haciendaStore)
const { zonas } = storeToRefs(zonasStore)

const form = ref(null)
const formularioValido = ref(true)
const avatarFile = ref(null)
//const avatarPreview = ref(null)

// Estado para GPS automático
const loadingGPS = ref(false)
const gpsAvailable = ref(true)
const gpsError = ref('')
const gpsAccuracy = ref(null)
const mapCenter = ref([4.5709, -74.2973])
const mapZoom = ref(13)

// Estado para vértices de polígono
const polygonVertices = ref([])

// Almacenar centro y zoom iniciales del mapa
const initialMapCenter = ref([4.5709, -74.2973])
const initialMapZoom = ref(13)

// Estado inicial
const initialState = {
  nombre: '',
  area: { area: null, unidad: 'ha' },
  info: '',
  tipos_zonas: props.tipoZonaActual?.id,
  hacienda: mi_hacienda.value?.id,
  siembra: props.siembraContext?.id || null,
  datos_bpa: [],
  metricas: {},
  contabilizable: true,
  gps: { lat: null, lng: null },
  geometria: null
}

const newMetrica = ref({
  titulo: '',
  descripcion: '',
  tipo: '',
  opcionesText: ''
})

const addMetricaDialog = ref(false)
const showOpcionesField = ref(false)

import placeholderZonas from '@/assets/placeholder-zonas.png'

// Estado local usando reactive en lugar de ref para mejor manejo de objetos anidados
const zonaLocal = reactive({ ...initialState })

// Computed properties
const getBpaPreguntas = computed(() => {
  const tipoZona = tiposZonas.value.find((t) => t.id === zonaLocal.tipos_zonas)
  return tipoZona?.datos_bpa?.preguntas_bpa || []
})

const drawMode = computed(() => {
  const tipo = tiposZonas.value.find(t => t.id === zonaLocal.tipos_zonas)
  return tipo?.nombre?.toLowerCase().includes('lote') ? 'polygon' : 'marker'
})

const handleGeometryUpdated = ({ geojson, areaHa }) => {
  polygonVertices.value = []
  zonaLocal.geometria = geojson
  if (areaHa > 0 && drawMode.value === 'polygon') {
    zonaLocal.area.area = areaHa
    zonaLocal.area.unidad = 'ha'
  }
  
  // Si es un punto (marker), actualizamos el campo GPS para consistencia
  if (geojson && geojson.type === 'Point') {
    zonaLocal.gps = {
      lat: geojson.coordinates[1],
      lng: geojson.coordinates[0]
    }
  }

  // Si es un polígono, extraer vértices de la anilla exterior
  if (geojson && geojson.type === 'Polygon') {
    const exteriorRing = geojson.coordinates[0] || []
    polygonVertices.value = exteriorRing.map(coord => ({
      lng: coord[0],
      lat: coord[1]
    }))
  }
}


const CargaImagenZona = (zonaId) => {
  console.log('checando cargaimagenzona', zonaId)
  const zona = zonas.value.find((s) => s.id === zonaId)
  if (!zona) return placeholderZonas
  return avatarStore.getAvatarUrl({ ...zona, type: 'zona' }, 'zonas')
}

const handleAvatarUpdated = (updatedRecord) => {
  zonasStore.$patch((state) => {
    const index = state.zonas.findIndex((s) => s.id === updatedRecord.id)
    if (index !== -1) {
      state.zonas[index] = { ...state.zonas[index], ...updatedRecord }
      console.log('matriz de zonas actualizadas:', zonas)
    }
  })

  // Actualizar el estado local con el nuevo avatar
  zonaLocal.avatar = updatedRecord.avatar || null // Asegúrate de que el avatar se actualice correctamente
  console.log('verificando zonaLocal:', zonaLocal)
}

function openAddMetricaDialog() {
  addMetricaDialog.value = true
  showOpcionesField.value = false
  newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
}

function handleTipoChange(value) {
  // Mostrar campo de opciones solo para estos tipos
  showOpcionesField.value = ['checkbox', 'select', 'multi-select'].includes(value)

  // Limpiar opciones si se cambia a un tipo que no las necesita
  if (!showOpcionesField.value) {
    newMetrica.value.opcionesText = ''
  }
}

function addMetrica() {
  if (newMetrica.value.titulo && newMetrica.value.tipo) {
    // Reemplazar espacios en blanco por guiones bajos en el título
    const sanitizedTitulo = newMetrica.value.titulo.toUpperCase().replace(/\s+/g, '_')

    // Procesar opciones si existen
    let opciones = []
    if (
      newMetrica.value.opcionesText &&
      ['checkbox', 'select', 'multi-select'].includes(newMetrica.value.tipo)
    ) {
      opciones = newMetrica.value.opcionesText
        .split(',')
        .map((opt) => opt.trim())
        .filter((opt) => opt)
    }

    // Corregido: Usar sanitizedTitulo (con 'z')
    zonaLocal.metricas[sanitizedTitulo] = {
      descripcion: newMetrica.value.descripcion,
      tipo: newMetrica.value.tipo,
      valor: newMetrica.value.tipo === 'multi-select' ? [] : null,
      opciones: opciones.length > 0 ? opciones : undefined
    }

    console.log('zonaLocal:', zonaLocal.metricas)

    // Restablecer el formulario
    newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
    showOpcionesField.value = false
    addMetricaDialog.value = false
  } else {
    uiFeedbackStore.showError('Título y tipo son requeridos para agregar una métrica')
  }
}

function removeMetrica(index) {
  delete zonaLocal.metricas[index]
}

/**
 * GPS Automático - Obtiene coordenadas actuales del dispositivo
 */
async function autoLocate() {
  loadingGPS.value = true
  gpsError.value = ''
  gpsAccuracy.value = null

  try {
    // Intentar obtener ubicación a través del coordinador
    const position = await locationCoordinator.getPosition()

    // Manejar tanto formato de API estándar como posible formato personalizado
    const coords = position.coords || position

    // Actualizar campo GPS con coordenadas (objeto, no string)
    zonaLocal.gps = {
      lat: coords.latitude,
      lng: coords.longitude
    }

    if (drawMode.value === 'marker' || !zonaLocal.geometria) {
      zonaLocal.geometria = {
        type: 'Point',
        // Estándar GeoJSON: [longitud, latitud]
        coordinates: [coords.longitude, coords.latitude]
      }
    }
    
    // Centrar mapa instantáneamente con zoom cercano
    mapCenter.value = [coords.latitude, coords.longitude]
    mapZoom.value = 18

    // GUARDAR precisión si está disponible
    if (coords.accuracy !== null) {
      gpsAccuracy.value = Math.round(coords.accuracy)
      uiFeedbackStore.showSnackbar(`Ubicación obtenida (precisión: ${gpsAccuracy.value}m)`, 'success')
    } else {
      uiFeedbackStore.showSnackbar('Ubicación obtenida exitosamente', 'success')
    }

    logger.debug('[ZonaForm] Coordenadas GPS obtenidas:', {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy
    })
  } catch (error) {
    // Manejo específico de errores para guiar al usuario
    let errorMsg = error.message

    if (error.message.includes('denegado')) {
      errorMsg = 'Permiso denegado. Activa la ubicación en tu navegador.'
    }

    gpsError.value = errorMsg
    uiFeedbackStore.showError(`Error GPS: ${errorMsg}`)
    logger.error('[ZonaForm] Error obteniendo ubicación:', error)
  } finally {
    loadingGPS.value = false
  }
}

/**
 * Centra el mapa en las coordenadas actuales del campo GPS
 */
function centerOnGPS() {
  const { lat, lng } = zonaLocal.gps || {}
  if (lat != null && lng != null) {
    mapCenter.value = [lat, lng]
    mapZoom.value = 18
    uiFeedbackStore.showSnackbar('Mapa centrado en coordenadas', 'info')
  } else {
    uiFeedbackStore.showError('Coordenadas GPS no válidas para centrar')
  }
}

/**
 * Centra el mapa en las coordenadas GPS de la hacienda
 */
function centerOnHaciendaGPS() {
  const haciendaGps = mi_hacienda.value?.gps
  if (!haciendaGps || typeof haciendaGps.lat !== 'number' || typeof haciendaGps.lng !== 'number') {
    uiFeedbackStore.showError('No se encontraron coordenadas GPS válidas de la hacienda')
    return
  }
  mapCenter.value = [haciendaGps.lat, haciendaGps.lng]
  mapZoom.value = 18
  uiFeedbackStore.showSnackbar('Mapa centrado en GPS de la hacienda', 'info')
}

/**
 * Resetea el mapa al punto inicial (zona existente o GPS de hacienda)
 */
function resetMapToInitial() {
  mapCenter.value = [...initialMapCenter.value]
  mapZoom.value = initialMapZoom.value
  uiFeedbackStore.showSnackbar('Mapa restaurado al punto inicial', 'info')
}

async function guardar() {
  const { valid } = await form.value.validate()
  if (!valid) {
    logger.warn('[ZonaForm] Formulario con errores de validación')
    return
  }

  try {
    // Sanitizar objeto para evitar proxies y campos de sistema de PocketBase
    const rawData = JSON.parse(JSON.stringify(zonaLocal))
    
    const zonaToSave = {
      ...rawData,
      nombre: (rawData.nombre || '').toUpperCase(),
      gps: rawData.gps || { lat: null, lng: null }
      // Nota: No incluimos 'avatar' aquí, se maneja por separado si hay un archivo nuevo
    }

    logger.info('[ZonaForm] Payload final a guardar:', zonaToSave)
    let resultado

    if (props.modoEdicion) {
      resultado = await zonasStore.updateZona(zonaToSave.id, zonaToSave)
    } else {
      resultado = await zonasStore.crearZona(zonaToSave)
    }

    if (avatarFile.value) {
      await zonasStore.updateZonaAvatar(resultado.id, avatarFile.value[0])
    }

    emit('saved', resultado)
    cerrar()
  } catch (error) {
    logger.error('[ZonaForm] Error al guardar la zona:', error.message || error, error)
    uiFeedbackStore.showError('Error al guardar la zona')
  }
}

function cerrar() {
  emit('close')
}

// Función para inicializar datos_bpa
function initializeDatosBpa(tipoZona) {
  if (tipoZona?.datos_bpa?.preguntas_bpa) {
    return tipoZona.datos_bpa.preguntas_bpa.map(() => ({
      respuesta: null
    }))
  }
  return []
}

// Función mejorada para inicializar métricas
function initializeMetricas(tipoZona, metricasExistentes = null) {
  const metricasInicializadas = {}
  if (tipoZona?.metricas?.metricas) {
    Object.entries(tipoZona.metricas.metricas).forEach(([key, config]) => {
      metricasInicializadas[key] = {
        ...config,
        valor: metricasExistentes?.[key]?.valor ?? getDefaultMetricaValue(config.tipo)
      }
    })
  }
  return metricasInicializadas
}

// Un solo watch para manejar cambios en zonaInicial
watch(
  () => props.zonaInicial,
  (newZona) => {
    if (newZona && Object.keys(newZona).length > 0) {
      // Modo edición - Preservar los valores existentes con un clon profundo para evitar mutar props
      const cleanZona = JSON.parse(JSON.stringify(newZona))
      
      // Procesar GPS: asegurar que sea objeto {lat, lng}
      let gpsObj = { lat: null, lng: null }
      if (cleanZona.gps) {
        if (typeof cleanZona.gps === 'string') {
          try {
            const parsed = JSON.parse(cleanZona.gps)
            if (parsed && typeof parsed === 'object') {
              gpsObj = {
                lat: typeof parsed.lat === 'number' ? parsed.lat : null,
                lng: typeof parsed.lng === 'number' ? parsed.lng : null
              }
            }
          } catch (e) {
            logger.warn('[ZonaForm] Error parseando GPS string en edición:', e)
          }
        } else if (typeof cleanZona.gps === 'object') {
          gpsObj = {
            lat: typeof cleanZona.gps.lat === 'number' ? cleanZona.gps.lat : null,
            lng: typeof cleanZona.gps.lng === 'number' ? cleanZona.gps.lng : null
          }
        }
      }

      Object.assign(zonaLocal, {
        ...cleanZona,
        gps: gpsObj,
        datos_bpa: Array.isArray(cleanZona.datos_bpa) ? cleanZona.datos_bpa : [],
        metricas: typeof cleanZona.metricas === 'object' ? cleanZona.metricas : {}
      })

      // Actualizar centro del mapa y punto inicial si hay coordenadas válidas
      if (gpsObj.lat != null && gpsObj.lng != null && gpsObj.lat >= -90 && gpsObj.lat <= 90 && gpsObj.lng >= -180 && gpsObj.lng <= 180) {
        mapCenter.value = [gpsObj.lat, gpsObj.lng]
        initialMapCenter.value = [gpsObj.lat, gpsObj.lng]
        mapZoom.value = 18
        initialMapZoom.value = 18

        // Fallback visual: si existe GPS pero no geometría, generamos el Point al vuelo
        if (!cleanZona.geometria) {
          zonaLocal.geometria = {
            type: 'Point',
            // Estándar GeoJSON: [longitud, latitud]
            coordinates: [gpsObj.lng, gpsObj.lat]
          }
        }
      }
    } else {
      // Modo creación - Inicializar con valores por defecto
      Object.assign(zonaLocal, {
        ...initialState,
        tipos_zonas: props.tipoZonaActual?.id,
        datos_bpa: initializeDatosBpa(props.tipoZonaActual),
        metricas: initializeMetricas(props.tipoZonaActual)
      })

      // En modo creación, el punto inicial es el GPS de la hacienda
      if (mi_hacienda.value?.gps?.lat && mi_hacienda.value?.gps?.lng) {
        initialMapCenter.value = [mi_hacienda.value.gps.lat, mi_hacienda.value.gps.lng]
        initialMapZoom.value = 18
      }
    }
  },
  { immediate: true, deep: true }
)

// Watch para tipoZonaActual solo en modo creación
watch(
  () => props.tipoZonaActual,
  (newTipoZona) => {
    if (newTipoZona && !props.modoEdicion) {
      zonaLocal.tipos_zonas = newTipoZona.id
      zonaLocal.datos_bpa = initializeDatosBpa(newTipoZona)
      zonaLocal.metricas = initializeMetricas(newTipoZona)

      // Actualizar punto inicial si cambia la hacienda
      if (mi_hacienda.value?.gps?.lat && mi_hacienda.value?.gps?.lng) {
        initialMapCenter.value = [mi_hacienda.value.gps.lat, mi_hacienda.value.gps.lng]
        initialMapZoom.value = 18
      }
    }
  },
  { immediate: true }
)

// Watch para recentrar mapa automáticamente al editar coordenadas GPS
watch(
  () => [zonaLocal.gps?.lat, zonaLocal.gps?.lng],
  ([newLat, newLng]) => {
    if (
      newLat != null &&
      newLng != null &&
      newLat >= -90 && newLat <= 90 &&
      newLng >= -180 && newLng <= 180 &&
      (newLat !== mapCenter.value[0] || newLng !== mapCenter.value[1])
    ) {
      mapCenter.value = [newLat, newLng]
      mapZoom.value = 18

      // Sincronizar geometría si es marcador o no hay geometría previa
      if (drawMode.value === 'marker' || !zonaLocal.geometria) {
        zonaLocal.geometria = {
          type: 'Point',
          // Estándar GeoJSON: [longitud, latitud]
          coordinates: [newLng, newLat]
        }
      }
    }
  }
)

// Función para obtener valor por defecto según tipo
function getDefaultMetricaValue(tipo) {
  switch (tipo) {
    case 'checkbox':
      return []
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'select':
      return null
    default:
      return null
  }
}
</script>
<style scoped>
.quill-editor {
  height: 150px;
}
</style>
