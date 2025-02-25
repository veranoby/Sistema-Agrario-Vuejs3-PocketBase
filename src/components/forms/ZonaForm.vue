<template>
  <v-card>
    <v-form ref="form" v-model="formularioValido" lazy-validation>
      <v-card-title class="headline">
        <h2 class="text-xl font-bold mt-2">
          {{ modoEdicion ? 'Editar' : 'Crear' }} {{ tipoZonaActual?.nombre }}
          <template v-if="siembraContext">
            <v-icon>mdi-chevron-right</v-icon>
            <span class="ml-1 text-sm font-bold text-gray-700">
              {{ siembraContext.nombre }} {{ siembraContext.tipo }}
            </span>
          </template>
        </h2>
      </v-card-title>

      <v-card-text>
        <div class="grid grid-cols-2 gap-0">
          <div>
            <!-- Selector de Siembra -->
            <v-select
              v-if="!fromSiembraWorkspace"
              v-model="zonaLocal.siembra"
              :items="props.siembrasActivas"
              prepend-icon="mdi-sprout"
              item-title="nombreCompleto"
              item-value="id"
              label="Siembra"
              density="compact"
              variant="outlined"
              class="compact-form"
            ></v-select>

            <!-- Nombre de la Zona -->
            <v-text-field
              v-model="zonaLocal.nombre"
              label="Nombre"
              variant="outlined"
              class="compact-form"
              required
              :rules="[(v) => !!v || 'El nombre es requerido']"
              prepend-icon="mdi-map"
            ></v-text-field>

            <!-- Área y Unidad de la Zona -->
            <div class="flex">
              <v-text-field
                v-model="zonaLocal.area.area"
                label="Área"
                type="number"
                :rules="[(v) => !!v || 'El area es requerida']"
                prepend-icon="mdi-diameter"
                variant="outlined"
                density="compact"
                class="compact-form"
              ></v-text-field>
              <v-select
                v-model="zonaLocal.area.unidad"
                variant="outlined"
                class="compact-form"
                density="compact"
                :items="['m²', 'ha', 'km²']"
                label="Unidad de área"
                required
                prepend-icon="mdi-diameter-outline"
                :rules="[(v) => !!v || 'La unidad es requerida']"
              ></v-select>
            </div>
            <!-- GPS -->
            <v-text-field
              v-model="zonaLocal.gps"
              variant="outlined"
              class="compact-form"
              label="GPS (Lat, Lng)"
              density="compact"
              placeholder="Ej: {lat: 0, lng: 0}"
              prepend-icon="mdi-crosshairs-gps"
            ></v-text-field>

            <div class="flex">
              <v-select
                v-model="zonaLocal.tipos_zonas"
                class="compact-form"
                :disabled="true"
                :items="tiposZonas"
                item-title="nombre"
                item-value="id"
                label="Tipo de Zona"
                variant="outlined"
                density="compact"
                required
                :rules="[(v) => !!v || 'Seleccione un tipo de zona']"
                prepend-icon="mdi-format-list-bulleted"
              ></v-select>

              <!-- Checkbox Contabilizable -->
              <v-checkbox
                v-model="zonaLocal.contabilizable"
                label="Contabilizable"
                class="compact-form"
                :true-value="true"
                :false-value="false"
              ></v-checkbox>
            </div>
          </div>
          <div>
            <!-- Avatar -->
            <div v-if="modoEdicion">
              <AvatarForm
                v-if="modoEdicion"
                v-model="showAvatarDialog"
                collection="zonas"
                :entityId="zonaLocal?.id"
                :currentAvatarUrl="CargaImagenZona(zonaLocal.id)"
                :hasCurrentAvatar="!!zonaLocal?.avatar"
                @avatar-updated="handleAvatarUpdated"
              />

              <div class="flex items-center justify-center mt-0 relative">
                <v-avatar size="128">
                  <v-img :src="CargaImagenZona(zonaLocal.id)" alt="Avatar de Zona"></v-img>
                </v-avatar>
                <!-- Botón para abrir el diálogo de avatar -->
                <v-btn
                  icon
                  size="small"
                  color="green-lighten-2"
                  class="absolute bottom-0 right-0"
                  @click="showAvatarDialog = true"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </div>
            </div>

            <!-- Formulario de Métricas -->
            <div class="siembra-info mt-4">
              <v-card-title class="headline d-flex justify-between">
                <h2 class="text-xl font-bold mt-2">Métricas</h2>
                <v-btn size="x-small" color="green-lighten-2" @click="openAddMetricaDialog" icon>
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div class="grid grid-cols-2 gap-0">
                  <div v-for="(metrica, key) in zonaLocal.metricas" :key="key" cols="6">
                    <!-- Select para tipo "select" -->
                    <v-select
                      v-if="metrica.tipo === 'select'"
                      v-model="metrica.valor"
                      :label="key"
                      :items="metrica.opciones"
                      variant="outlined"
                      density="compact"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-select>
                    <!-- Input number para tipo "text" -->
                    <v-text-field
                      v-else-if="metrica.tipo === 'text'"
                      v-model.number="metrica.valor"
                      :label="key"
                      density="compact"
                      variant="outlined"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-text-field>
                    <!-- Input number para tipo "number" -->
                    <v-text-field
                      v-else-if="metrica.tipo === 'number'"
                      v-model.number="metrica.valor"
                      :label="key"
                      type="number"
                      density="compact"
                      variant="outlined"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-text-field>
                    <!-- Input number para tipo "checkbox" -->
                    <v-checkbox
                      v-else-if="metrica.tipo === 'checkbox'"
                      v-model.number="metrica.valor"
                      :label="key"
                      density="compact"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template></v-checkbox
                    >
                    <!-- Input number para tipo "boolean" -->
                    <v-checkbox
                      v-else-if="metrica.tipo === 'boolean'"
                      v-model.number="metrica.valor"
                      :label="key"
                      density="compact"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template></v-checkbox
                    >
                  </div>
                </div>
              </v-card-text>
            </div>
          </div>
        </div>

        <!-- Información Adicional -->

        <div class="mt-2">
          <div class="mb-2">
            <v-icon class="mr-2">mdi-information</v-icon>
            Mi Info
          </div>
          <QuillEditor
            v-model:content="zonaLocal.info"
            contentType="html"
            toolbar="essential"
            theme="snow"
            class="quill-editor"
          />
        </div>

        <!-- Formulario de Seguimiento BPA -->

        <div class="siembra-info mt-4" v-if="zonaLocal.tipos_zonas">
          <v-card-title class="headline">
            <h2 class="text-xl font-bold mt-2">Seguimiento BPA</h2>
          </v-card-title>
          <v-card-text>
            <div class="grid grid-cols-3 gap-2">
              <div v-for="(pregunta, index) in getBpaPreguntas" :key="index">
                <span class="text-xs font-black text-justify">
                  {{ pregunta.pregunta }}
                  <v-tooltip
                    width="300"
                    v-if="pregunta.descripcion"
                    activator="parent"
                    location="top"
                    density="compact"
                    variant="outlined"
                    class="text-xs text-justify"
                  >
                    {{ pregunta.descripcion }}</v-tooltip
                  >
                </span>

                <v-radio-group
                  v-if="zonaLocal.datos_bpa && zonaLocal.datos_bpa[index]"
                  v-model="zonaLocal.datos_bpa[index].respuesta"
                  class="mt-2"
                >
                  <v-radio
                    v-for="(opcion, opcionIndex) in pregunta.opciones"
                    :key="`${index}-${opcionIndex}`"
                    :label="opcion"
                    :value="opcion"
                    class="compact-form"
                    density="compact"
                  ></v-radio>
                </v-radio-group>
              </div>
            </div>
          </v-card-text>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="guardar"
          :disabled="!formularioValido"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-form>
  </v-card>

  <!-- Diálogo para agregar métrica personalizada -->
  <v-dialog v-model="addMetricaDialog" persistent max-width="300px">
    <v-card>
      <v-toolbar color="success" dark>
        <v-toolbar-title>Agregar Métrica</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-card-text class="m-1 p-0 pl-2">
        <v-text-field
          density="compact"
          variant="outlined"
          class="compact-form"
          v-model="newMetrica.titulo"
          label="Título"
        />
        <v-textarea
          density="compact"
          variant="outlined"
          class="compact-form"
          v-model="newMetrica.descripcion"
          label="Descripción"
        />
        <v-select
          density="compact"
          variant="outlined"
          class="compact-form"
          v-model="newMetrica.tipo"
          :items="['checkbox', 'number', 'text']"
          label="Tipo"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="addMetricaDialog = false"
          >Cancelar</v-btn
        >
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
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
import { useZonasStore } from '@/stores/zonasStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { storeToRefs } from 'pinia'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useAvatarStore } from '@/stores/avatarStore'
import AvatarForm from '@/components/forms/AvatarForm.vue'

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
      gps: '',
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

const emit = defineEmits(['close', 'saved'])
const zonasStore = useZonasStore()
const snackbarStore = useSnackbarStore()
const { tiposZonas } = storeToRefs(zonasStore)
const haciendaStore = useHaciendaStore()
const avatarStore = useAvatarStore()

const { mi_hacienda } = storeToRefs(haciendaStore)
const { zonas } = storeToRefs(zonasStore)

const form = ref(null)
const formularioValido = ref(true)
const avatarFile = ref(null)
//const avatarPreview = ref(null)

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
  gps: ''
}
const newMetrica = ref({
  titulo: '',
  descripcion: '',
  tipo: ''
})

const addMetricaDialog = ref(false)

import placeholderZonas from '@/assets/placeholder-zonas.png'

// Estado local usando reactive en lugar de ref para mejor manejo de objetos anidados
const zonaLocal = reactive({ ...initialState })

// Computed properties
const getBpaPreguntas = computed(() => {
  const tipoZona = tiposZonas.value.find((t) => t.id === zonaLocal.tipos_zonas)
  return tipoZona?.datos_bpa?.preguntas_bpa || []
})

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
}
function addMetrica() {
  if (newMetrica.value.titulo && newMetrica.value.tipo) {
    // Reemplazar espacios en blanco por guiones bajos en el título
    const sanitizedTitulo = newMetrica.value.titulo.replace(/\s+/g, '_')

    console.log('newMetrica:', newMetrica)

    zonaLocal.metricas[sanitizedTitulo] = {
      descripcion: newMetrica.value.descripcion,
      tipo: newMetrica.value.tipo,
      valor: null // Inicializar valor como null
    }
    console.log('zonaLocal:', zonaLocal.metricas)

    newMetrica.value = { titulo: '', descripcion: '', tipo: '' } // Resetear
    addMetricaDialog.value = false
  } else {
    console.error('Título y tipo son requeridos para agregar una métrica')
  }
}

function removeMetrica(index) {
  delete zonaLocal.metricas[index]
}

async function guardar() {
  if (form.value.validate()) {
    try {
      const zonaToSave = {
        ...zonaLocal,
        nombre: zonaLocal.nombre.toUpperCase(),

        avatar: zonaLocal.avatar || null // Asegúrate de que el avatar se incluya correctamente
      }

      console.log('guardar zonaLocal:', zonaLocal)
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
      snackbarStore.showError('Error al guardar la zona')
      console.error(error) // Agregar un log para ver el error
    }
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
      // Modo edición - Preservar los valores existentes
      Object.assign(zonaLocal, {
        ...newZona,
        datos_bpa: Array.isArray(newZona.datos_bpa) ? newZona.datos_bpa : [],
        metricas: typeof newZona.metricas === 'object' ? newZona.metricas : {}
      })
    } else {
      // Modo creación - Inicializar con valores por defecto
      Object.assign(zonaLocal, {
        ...initialState,
        tipos_zonas: props.tipoZonaActual?.id,
        datos_bpa: initializeDatosBpa(props.tipoZonaActual),
        metricas: initializeMetricas(props.tipoZonaActual)
      })
    }
  },
  { immediate: true }
)

// Watch para tipoZonaActual solo en modo creación
watch(
  () => props.tipoZonaActual,
  (newTipoZona) => {
    if (newTipoZona && !props.modoEdicion) {
      zonaLocal.tipos_zonas = newTipoZona.id
      zonaLocal.datos_bpa = initializeDatosBpa(newTipoZona)
      zonaLocal.metricas = initializeMetricas(newTipoZona)
    }
  },
  { immediate: true }
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
.avatar-section {
  @apply flex flex-col items-center;
}

.avatar-preview {
  @apply flex flex-col items-center justify-center;
}

.compact-form {
  @apply text-sm;
}
</style>
