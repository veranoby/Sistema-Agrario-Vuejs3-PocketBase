<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="1000px"
    persistent
  >
    <v-card>
      <v-toolbar :color="formTitleColor" dark>
        <v-toolbar-title>{{ esEdicion ? 'Editar' : 'Nueva' }} Programación</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="cerrarDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-form @submit.prevent="guardarProgramacion">
          <v-row>
            <v-col cols="12">
              <p class="text-gray-600">
                <v-icon>mdi-gesture-tap-button</v-icon> Actividades de Siembras
              </p>
              <v-chip-group
                color="blue-darken-4"
                column
                multiple
                v-model="form.actividadesSeleccionadas"
              >
                <v-chip
                  v-for="actividad in filteredActividadesSiebra"
                  :key="actividad.id"
                  :text="`${actividad.nombre} (${siembrasStore.getSiembraNombre(actividad.siembras[0])})`"
                  :value="actividad.id"
                  filter
                  density="compact"
                  pill
                ></v-chip>
              </v-chip-group>
            </v-col>

            <v-col cols="12">
              <p class="text-gray-600">
                <v-icon>mdi-gesture-tap-button</v-icon> Actividades adicionales
              </p>
              <v-chip-group
                prepend-icon="mdi-gesture-tap-button"
                color="blue-darken-4"
                column
                multiple
                v-model="form.actividadesSeleccionadas"
              >
                <v-chip
                  v-for="actividad in filteredActividades"
                  :key="actividad.id"
                  :text="`${actividad.nombre} (${actividadesStore.getActividadTipo(actividad.tipo_actividades)})`"
                  :value="actividad.id"
                  filter
                  density="compact"
                  pill
                ></v-chip>
              </v-chip-group>
            </v-col>

            <v-col cols="12">
              <v-text-field
                density="compact"
                prepend-icon="mdi-text-box"
                v-model="form.descripcion"
                label="Descripción"
                :rules="[required]"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="form.frecuencia"
                :items="frecuencias"
                label="Frecuencia"
                :rules="[required]"
                required
                prepend-icon="mdi-calendar-sync"
                @update:modelValue="handleFrecuenciaChange"
              ></v-select>
            </v-col>

            <v-col v-if="form.frecuencia === 'personalizada'" cols="12" md="6">
              <v-card variant="outlined" class="pa-4">
                <v-select
                  v-model="frecuenciaPersonalizada.tipo"
                  :items="['dias', 'semanas', 'meses', 'años']"
                  label="Tipo de frecuencia"
                  required
                  prepend-icon="mdi-calendar-cursor"
                ></v-select>

                <v-text-field
                  v-model="frecuenciaPersonalizada.cantidad"
                  label="Cada cuánto"
                  type="number"
                  min="1"
                  required
                  prepend-icon="mdi-numeric"
                ></v-text-field>

                <v-select
                  v-if="frecuenciaPersonalizada.tipo === 'semanas'"
                  v-model="frecuenciaPersonalizada.diasSemana"
                  :items="diasSemanaOptions"
                  label="Días de la semana"
                  multiple
                  chips
                  prepend-icon="mdi-calendar-week"
                ></v-select>

                <v-text-field
                  v-if="frecuenciaPersonalizada.tipo === 'meses'"
                  v-model="frecuenciaPersonalizada.diasMes"
                  label="Días del mes (separados por coma)"
                  prepend-icon="mdi-calendar-month"
                ></v-text-field>

                <v-select
                  v-model="frecuenciaPersonalizada.exclusiones"
                  :items="['feriados', 'fines_de_semana']"
                  label="Exclusiones"
                  multiple
                  chips
                  prepend-icon="mdi-calendar-remove"
                ></v-select>
              </v-card>
            </v-col>

            <v-col cols="12">
              <v-select
                v-model="form.estado"
                :items="estados"
                label="Estado"
                :rules="[required]"
                required
                prepend-icon="mdi-state-machine"
              ></v-select>
            </v-col>
          </v-row>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              @click="cerrarDialog"
              >Cancelar</v-btn
            >
            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              type="submit"
              >Guardar</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { storeToRefs } from 'pinia'
import { useSiembrasStore } from '@/stores/siembrasStore'

const props = defineProps({
  modelValue: Boolean,
  programacionActual: Object
})

const emit = defineEmits(['update:modelValue', 'guardado'])

const store = useProgramacionesStore()
const actividadesStore = useActividadesStore()
const siembrasStore = useSiembrasStore()

const { actividades, tiposActividades } = storeToRefs(actividadesStore)

const filteredActividades = computed(() => {
  return actividades.value.filter(
    (actividad) => !actividad.siembras || actividad.siembras.length === 0
  )
})

const filteredActividadesSiebra = computed(() => {
  const actividadestemp = actividades.value.filter(
    (actividad) => actividad.siembras && actividad.siembras.length > 0
  )
  return actividadestemp
})

const form = ref({
  descripcion: '',
  actividadesSeleccionadas: [],
  frecuencia: 'diaria',
  frecuencia_personalizada: null,
  estado: 'activo'
})

const frecuenciaPersonalizada = ref({
  tipo: 'dias',
  cantidad: 1,
  diasSemana: [],
  diasMes: [],
  exclusiones: []
})

const frecuencias = [
  { title: 'Diaria', value: 'diaria' },
  { title: 'Semanal', value: 'semanal' },
  { title: 'Quincenal', value: 'quincenal' },
  { title: 'Mensual', value: 'mensual' },
  { title: 'Personalizada', value: 'personalizada' }
]

const estados = [
  { title: 'Activo', value: 'activo' },
  { title: 'Pausado', value: 'pausado' },
  { title: 'Finalizado', value: 'finalizado' }
]

const actividadesOptions = computed(() =>
  actividadesStore.actividades.map((a) => ({
    nombre: a.nombre,
    id: a.id
  }))
)

const esEdicion = computed(() => !!props.programacionActual)

const formTitleColor = computed(() => (esEdicion.value ? 'orange-darken-1' : 'green-darken-1'))

watch(
  () => props.programacionActual,
  (val) => {
    if (val) {
      form.value = {
        ...val,
        actividadesSeleccionadas: val.actividades || [],
        frecuencia_personalizada:
          typeof val.frecuencia_personalizada === 'string'
            ? JSON.parse(val.frecuencia_personalizada)
            : val.frecuencia_personalizada
      }

      // Cargar valores de frecuencia personalizada
      if (form.value.frecuencia_personalizada) {
        frecuenciaPersonalizada.value = {
          tipo: form.value.frecuencia_personalizada.tipo || 'dias',
          cantidad: form.value.frecuencia_personalizada.cantidad || 1,
          diasSemana: form.value.frecuencia_personalizada.diasSemana || [],
          diasMes: Array.isArray(form.value.frecuencia_personalizada.diasMes)
            ? form.value.frecuencia_personalizada.diasMes
            : [form.value.frecuencia_personalizada.diasMes] || [],
          exclusiones: form.value.frecuencia_personalizada.exclusiones || []
        }
      }
    }
  },
  { immediate: true }
)

const required = (v) => !!v || 'Campo requerido'
const validJson = (v) => {
  try {
    JSON.parse(v)
    return true
  } catch {
    return 'JSON inválido'
  }
}

const handleFrecuenciaChange = (val) => {
  if (val !== 'personalizada') {
    form.value.frecuencia_personalizada = null
  }
}

const cerrarDialog = () => {
  emit('update:modelValue', false)
  form.value = resetForm()
}

const resetForm = () => ({
  descripcion: '',
  actividadesSeleccionadas: [],
  frecuencia: 'diaria',
  frecuencia_personalizada: null,
  estado: 'activo'
})

const guardarProgramacion = async () => {
  try {
    const data = {
      ...form.value,
      frecuencia_personalizada:
        form.value.frecuencia === 'personalizada'
          ? JSON.stringify({
              tipo: frecuenciaPersonalizada.value.tipo,
              cantidad: Number(frecuenciaPersonalizada.value.cantidad),
              diasSemana: frecuenciaPersonalizada.value.diasSemana,
              diasMes: frecuenciaPersonalizada.value.diasMes,
              exclusiones: frecuenciaPersonalizada.value.exclusiones
            })
          : null
    }

    if (esEdicion.value) {
      await store.actualizarProgramacion(props.programacionActual.id, data)
    } else {
      await store.crearProgramacion(data)
    }

    emit('guardado')
    cerrarDialog()
  } catch (error) {
    console.error('Error guardando programación:', error)
  }
}

const diasSemanaOptions = [
  { title: 'Lunes', value: 1 },
  { title: 'Martes', value: 2 },
  { title: 'Miércoles', value: 3 },
  { title: 'Jueves', value: 4 },
  { title: 'Viernes', value: 5 },
  { title: 'Sábado', value: 6 },
  { title: 'Domingo', value: 0 }
]

// Computed para generar la descripción dinámica
const descripcionDinamica = computed(() => {
  // Parte 1: Nombres de actividades seleccionadas
  const nombresActividades = form.value.actividadesSeleccionadas
    .map((id) => {
      const actividad = actividades.value.find((a) => a.id === id)
      return actividad?.nombre || ''
    })
    .filter((nombre) => nombre)
    .join(', ')

  // Parte 2: Frecuencia seleccionada
  let frecuenciaTexto = ''
  if (form.value.frecuencia === 'personalizada') {
    const { tipo, cantidad } = frecuenciaPersonalizada.value
    frecuenciaTexto = `Cada ${cantidad} ${tipo}`
  } else {
    frecuenciaTexto = frecuencias.find((f) => f.value === form.value.frecuencia)?.title || ''
  }

  // Combinar ambas partes
  return `${nombresActividades}${nombresActividades && frecuenciaTexto ? ' - ' : ''}${frecuenciaTexto}`
})

// Watcher para actualizar el campo descripción
watch(
  [
    () => form.value.actividadesSeleccionadas,
    () => form.value.frecuencia,
    () => frecuenciaPersonalizada.value.tipo,
    () => frecuenciaPersonalizada.value.cantidad
  ],
  () => {
    form.value.descripcion = descripcionDinamica.value
  },
  { immediate: true, deep: true }
)
</script>
