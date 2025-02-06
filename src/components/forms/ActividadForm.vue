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
              v-model="nuevaActividadData.siembra"
              label="Selecciona Siembras"
            >
              <v-chip
                v-for="siembra in siembras"
                filter
                color="green"
                variant="flat"
                size="small"
                :key="siembra.id"
                :text="`${siembra.nombre} ${siembra.tipo}`"
                :value="siembra.id"
                class="ma-1"
                :class="{ 'chip-selected': nuevaActividadData.siembra.includes(siembra.id) }"
              >
              </v-chip>

              <!--
              <v-chip
                v-for="siembra in siembras"
                filter
                color="green"
                variant="flat"
                size="small"
                :key="siembra.id"
                :text="`${siembra.nombre} ${siembra.tipo}`"
                :value="siembra.id"
                @click="cargarZonasPorSiembra"
                class="ma-1"
                :class="{ 'chip-selected': nuevaActividadData.siembra.includes(siembra.id) }"
              >
              </v-chip> -->
            </v-chip-group>
          </div>

          <div class="mt-2">
            <div class="mb-2">
              <v-icon class="mr-2">mdi-information</v-icon>
              Descripción
            </div>
            <ckeditor
              v-model="nuevaActividadData.descripcion"
              :editor="editor"
              :config="editorConfig"
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
import { ref, defineEmits, watch } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'

import { editor, editorConfig } from '@/utils/ckeditorConfig'
import { CKEditor } from '@ckeditor/ckeditor5-vue'
import { useSyncStore } from '@/stores/syncStore'
import { storeToRefs } from 'pinia'

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
  siembra: props.siembraPreseleccionada ? [props.siembraPreseleccionada] : [],
  activa: true
})

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
    siembra: props.siembraPreseleccionada ? [props.siembraPreseleccionada] : [],
    activa: true
  }
}
/*
const crearActividad = async () => {
  if (nuevaActividadData.value.nombre && nuevaActividadData.value.tipo) {
    try {
      nuevaActividadData.value.nombre = nuevaActividadData.value.nombre.toUpperCase()
      const actividad = await actividadesStore.crearActividad(nuevaActividadData.value)
      snackbarStore.showSnackbar('Actividad creada exitosamente')
      emit('actividad-creada', actividad)
      cerrarDialog()
    } catch (error) {
      snackbarStore.showError('Error al crear la Actividad')
    }
  } else {
    snackbarStore.showError('Nombre y tipo son requeridos')
  }
}
*/
function getDefaultMetricaValue(tipo) {
  switch (tipo) {
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

const crearActividad = async () => {
  if (nuevaActividadData.value.nombre && nuevaActividadData.value.tipo_actividades) {
    // Inicializar métricas correctamente
    const metricasInicializadas = {}
    const tipoActividadSeleccionado = actividadesStore.tiposActividades.find(
      (t) => t.id === nuevaActividadData.value.tipo_actividades
    )

    if (tipoActividadSeleccionado?.metricas?.metricas) {
      Object.entries(tipoActividadSeleccionado.metricas.metricas).forEach(([key, value]) => {
        metricasInicializadas[key] = {
          ...value,
          valor: getDefaultMetricaValue(value.tipo)
        }
      })
    }

    // Inicializar datos_bpa
    const datosBpaInicializados =
      tipoActividadSeleccionado?.datos_bpa?.preguntas_bpa?.map(() => ({
        respuesta: null
      })) || []

    try {
      nuevaActividadData.value.nombre = nuevaActividadData.value.nombre.toUpperCase()
      const actividadToCreate = {
        ...nuevaActividadData.value,
        datos_bpa: datosBpaInicializados,
        metricas: metricasInicializadas
      }

      if (!syncStore.isOnline) {
        const actividad = await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: actividadToCreate
        })
        actividadesStore.actividades.push(actividadToCreate)
        snackbarStore.showSnackbar('Actividad en espera para crearse')
        emit('actividad-creada', actividad)
      } else {
        const actividad = await actividadesStore.crearActividad(actividadToCreate)
        snackbarStore.showSnackbar('Actividad creada exitosamente')
        emit('actividad-creada', actividad)
      }

      cerrarDialog()
    } catch (error) {
      handleError(error, 'Error al crear la Actividad')
    }
  } else {
    snackbarStore.showError('Nombre y tipo son requeridos')
  }
}

/*const cargarZonasPorSiembra = async () => {
  const selectedSiembras = nuevaActividadData.value.siembra
  if (selectedSiembras.length > 0) {
    zonasDisponibles.value = await ZonasStore.cargarZonasPorSiembras(selectedSiembras)
  } else {
    zonasDisponibles.value = await ZonasStore.cargarZonasPrecargadas()
  }
}*/
</script>
