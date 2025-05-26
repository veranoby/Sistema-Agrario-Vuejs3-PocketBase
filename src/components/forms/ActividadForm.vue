<template>
  <v-dialog
    v-model="dialogVisible"
    persistent
    transition="dialog-bottom-transition"
    scrollable
    max-width="900px"
  >
    <v-card>
      <v-toolbar color="success" dark>
        <v-toolbar-title>Nueva Actividad</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-form @submit.prevent="crearActividad">
        <v-card-text>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <v-select
                density="compact"
                prepend-icon="mdi-diameter"
                v-model="nuevaActividadData.tipo_actividades"
                :items="tiposActividades"
                item-title="nombre"
                item-value="id"
                label="Tipo de Actividad"
                required
              ></v-select>
            </div>

            <div>
              <v-text-field
                density="compact"
                v-model="nuevaActividadData.nombre"
                label="Nombre de la Actividad"
                prepend-icon="mdi-diameter"
                required
              ></v-text-field>
            </div>
          </div>

          <div class="mt-2">
            <div class="mb-2">
              <v-icon class="mr-2">mdi-sprout</v-icon>
              Seleccionar Siembras (opcional)
            </div>
            <v-chip-group
              density="compact"
              column
              multiple
              color="green-darken-4"
              v-model="nuevaActividadData.siembras"
              label="Selecciona Siembras"
            >
              <v-chip
                v-for="siembra in siembras"
                filter
                size="small"
                :key="siembra.id"
                :text="`${siembra.nombre} ${siembra.tipo}`"
                :value="siembra.id"
                class="ma-1"
                :class="{ 'chip-selected': nuevaActividadData.siembras.includes(siembra.id) }"
              >
              </v-chip>
            </v-chip-group>
          </div>

          <div class="mt-2">
            <div class="mb-2">
              <v-icon class="mr-2">mdi-sprout</v-icon>
              Seleccionar Zonas (opcional)
            </div>
            <v-chip-group
              density="compact"
              column
              multiple
              color="blue-darken-4"
              v-model="nuevaActividadData.zonas"
              label="Selecciona Siembras"
            >
              <v-chip
                v-for="zona in filteredZonas"
                :key="zona.id"
                :text="`${zona.nombre}(${zonasStore.getZonaById(zona.id)?.expand?.tipos_zonas?.nombre.toUpperCase()})`"
                :value="zona.id"
                filter
                size="small"
                density="compact"
                pill
              >
              </v-chip>
            </v-chip-group>
          </div>

          <div class="mt-2">
            <div class="mb-2">
              <v-icon class="mr-2">mdi-information</v-icon>
              Descripción
            </div>
            <QuillEditor
              v-model:content="nuevaActividadData.descripcion"
              contentType="html"
              toolbar="essential"
              theme="snow"
              class="quill-editor"
            />
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
            @click="cerrarDialog"
          >
            Cancelar
          </v-btn>
          <v-btn
            type="submit"
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
          >
            Crear Actividad
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, defineEmits, watch, onMounted, computed } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'

import { useSyncStore } from '@/stores/syncStore'
import { storeToRefs } from 'pinia'
import { useZonasStore } from '@/stores/zonasStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  siembraPreseleccionada: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'actividad-creada'])

const actividadesStore = useActividadesStore()
const siembrasStore = useSiembrasStore()
const snackbarStore = useSnackbarStore()
const syncStore = useSyncStore()

const { tiposActividades } = storeToRefs(actividadesStore)
const { siembras } = storeToRefs(siembrasStore)

const dialogVisible = ref(false)
const nuevaActividadData = ref({
  nombre: '',
  tipo_actividades: null,
  bpa_estado: 0,
  datos_bpa: [],
  metricas: {},
  descripcion: '',
  siembras: props.siembraPreseleccionada ? [props.siembraPreseleccionada] : [],
  activa: true
})

const zonasStore = useZonasStore()

const { zonas, tiposZonas } = storeToRefs(zonasStore)

watch(
  () => props.modelValue,
  (newValue) => {
    dialogVisible.value = newValue
  }
)

watch(dialogVisible, (newValue) => {
  emit('update:modelValue', newValue)
})

const cerrarDialog = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  nuevaActividadData.value = {
    nombre: '',
    tipo_actividades: null,
    bpa_estado: 0,
    datos_bpa: [],
    metricas: {},
    descripcion: '',
    siembras: props.siembraPreseleccionada ? [props.siembraPreseleccionada] : [],
    activa: true
  }
}

const filteredZonas = computed(() => {
  const zonastemp = zonas.value.filter((zona) => !zona.siembra) // Filtrar zonas sin siembra
  return zonastemp
})

function getDefaultMetricaValue(tipo) {
  switch (tipo) {
    case 'multi-select':
      return []
    case 'checkbox':
      return []
    case 'number':
      return 0
    case 'text':
      return 'por determinar'

    case 'boolean':
      return false
    case 'select':
      return null
    default:
      return null
  }
}

const initializeMetricas = (tipoActividad) => {
  if (!tipoActividad?.metricas?.metricas) return {}

  return Object.entries(tipoActividad.metricas.metricas).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: {
        ...value,
        valor: getDefaultMetricaValue(value.tipo)
      }
    }),
    {}
  )
}

const crearActividad = async () => {
  if (!isFormValid()) {
    snackbarStore.showError('Nombre y tipo son requeridos')
    return
  }

  try {
    const actividadData = prepareActividadData()
    const actividad = await handleActividadCreation(actividadData)

    emit('actividad-creada', actividad)
    cerrarDialog()
  } catch (error) {
    handleError(error, 'Error al crear la Actividad')
  }
}

const isFormValid = () =>
  nuevaActividadData.value.nombre && nuevaActividadData.value.tipo_actividades

const prepareActividadData = () => {
  // Convertir el campo siembra a siembras para mantener compatibilidad
  const siembras = nuevaActividadData.value.siembras || []

  // Obtener el tipo de actividad seleccionado
  const tipoActividad = actividadesStore.tiposActividades.find(
    (t) => t.id === nuevaActividadData.value.tipo_actividades
  )

  // Inicializar datos_bpa con respuestas predeterminadas
  const datos_bpa = []
  if (tipoActividad?.datos_bpa?.preguntas_bpa) {
    tipoActividad.datos_bpa.preguntas_bpa.forEach((pregunta) => {
      // Usar la primera opción como valor predeterminado o "No implementado" si no hay opciones
      const respuestaPredeterminada = pregunta.opciones?.[0] || 'No implementado'
      datos_bpa.push({ respuesta: respuestaPredeterminada })
    })
  }

  return {
    ...nuevaActividadData.value,
    // Reemplazar siembra por siembras (array)
    siembras: siembras,
    datos_bpa: datos_bpa,
    metricas: initializeMetricas(tipoActividad)
  }
}

const handleActividadCreation = async (actividadData) => {
  // Crear la actividad usando el store
  return await actividadesStore.crearActividad(actividadData)
}

const onEditorReady = (editor) => {
  document
    .querySelector('.document-editor')
    .insertBefore(
      editor.ui.view.toolbar.element,
      document.querySelector('.document-editor .ck-editor__editable')
    )
}

onMounted(async () => {
  await actividadesStore.cargarTiposActividades({ expand: 'metricas,datos_bpa' })
})
</script>

<style scoped></style>
