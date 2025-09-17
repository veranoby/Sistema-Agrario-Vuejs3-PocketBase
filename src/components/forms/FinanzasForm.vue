<template>
  <v-dialog v-model="dialogVisible" max-width="600px" @update:model-value="onDialogChange">
    <v-card>
      <v-toolbar :color="headerColor">
        <v-toolbar-title> {{ formTitle }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-card-text>
        <v-form @submit.prevent="guardarRegistro" ref="form" v-model="formValid">
          <v-row>
            <!-- Selector de fecha mejorado -->
            <v-col cols="12">
              <div class="d-flex flex-column flex-sm-row gap-2">
                <v-select
                  v-model="fechaSeleccionada.dia"
                  :items="diasMes"
                  label="Día"
                  density="compact"
                  class="flex-grow-0"
                  style="min-width: 80px"
                  :rules="[(v) => !!v || 'Requerido']"
                  @update:model-value="actualizarFecha"
                ></v-select>

                <v-select
                  v-model="fechaSeleccionada.mes"
                  :items="meses"
                  label="Mes"
                  density="compact"
                  class="flex-grow-1"
                  :rules="[(v) => !!v || 'Requerido']"
                  @update:model-value="actualizarFecha"
                ></v-select>

                <v-select
                  v-model="fechaSeleccionada.anio"
                  :items="anios"
                  label="Año"
                  density="compact"
                  class="flex-grow-0"
                  style="min-width: 100px"
                  :rules="[(v) => !!v || 'Requerido']"
                  @update:model-value="actualizarFecha"
                ></v-select>
              </div>
            </v-col>

            <v-col cols="12">
              <v-select
                v-model="formData.costo"
                label="Categoría"
                :items="[
                  'SERVICIOS LEGALES',
                  'INVERSION',
                  'SUNDRY',
                  'ALIMENTACION',
                  'EQUIPOS',
                  'HONORARIOS',
                  'MOVILIZACION',
                  'MATERIALES'
                ]"
                :rules="[(v) => !!v || 'Categoría requerida']"
                required
              ></v-select>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.detalle"
                label="Detalle"
                :rules="[(v) => !!v || 'Detalle requerido']"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model="formData.razon_social"
                label="Razón Social"
                :rules="[(v) => !!v || 'Razón social requerida']"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.factura"
                label="N° de Factura"
                hint="Incluya ceros iniciales si es necesario"
                persistent-hint
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formData.monto"
                label="Monto"
                type="number"
                step="0.01"
                :rules="[
                  (v) => !!v || 'Monto requerido',
                  (v) => (v !== null && v !== '' && !isNaN(v)) || 'Debe ser un valor numérico'
                ]"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.comentarios"
                label="Comentarios"
                rows="3"
                auto-grow
              ></v-textarea>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="usuarioActual.name"
                label="Registrado por"
                readonly
                disabled
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="formData.pagado_por"
                :items="usuariosHacienda"
                label="Pagado por"
                item-title="title"
                item-value="value"
                clearable
              ></v-select>
            </v-col>
          </v-row>
        </v-form>
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
          >Cancelar</v-btn
        >
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          :color="headerColor"
          :disabled="!formValid"
          @click="guardarRegistro"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFinanzaStore } from '@/stores/finanzaStore'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { format, parseISO, getYear, getMonth, getDate, setYear, setMonth, setDate } from 'date-fns'

const finanzaStore = useFinanzaStore()
const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()

// Props
const props = defineProps({
  modelValue: Boolean,
  itemEditando: Object,
  itemDuplicado: Object
})

// Emits
const emit = defineEmits(['update:modelValue', 'guardado'])

// Variables reactivas
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = ref(null)
const formValid = ref(false)

const usuarioActual = computed(() => {
  return {
    id: authStore.user?.id,
    name: authStore.user?.name || authStore.user?.username || 'Usuario actual'
  }
})

// Datos del formulario
const formData = ref({
  fecha: format(new Date(), 'yyyy-MM-dd'),
  detalle: '',
  razon_social: '',
  factura: '',
  costo: '',
  monto: null,
  comentarios: '',
  registro_por: authStore.user?.id || '',
  pagado_por: ''
})

// Control para los selectores de fecha
const fechaSeleccionada = ref({
  dia: getDate(new Date()),
  mes: getMonth(new Date()) + 1, // date-fns usa 0-11 para meses
  anio: getYear(new Date())
})

// Lista de días, meses y años para los selectores
const diasMes = computed(() => {
  // Generar días según el mes y año seleccionados
  const ultimoDia = new Date(fechaSeleccionada.value.anio, fechaSeleccionada.value.mes, 0).getDate()
  return Array.from({ length: ultimoDia }, (_, i) => i + 1)
})

const meses = [
  { title: 'Enero', value: 1 },
  { title: 'Febrero', value: 2 },
  { title: 'Marzo', value: 3 },
  { title: 'Abril', value: 4 },
  { title: 'Mayo', value: 5 },
  { title: 'Junio', value: 6 },
  { title: 'Julio', value: 7 },
  { title: 'Agosto', value: 8 },
  { title: 'Septiembre', value: 9 },
  { title: 'Octubre', value: 10 },
  { title: 'Noviembre', value: 11 },
  { title: 'Diciembre', value: 12 }
]

// Generar años (desde hace 5 años hasta 5 años adelante)
const anioActual = new Date().getFullYear()
const anios = Array.from({ length: 11 }, (_, i) => anioActual - 5 + i)

// Cargar usuarios de la hacienda desde el store
const usuariosHacienda = computed(() => {
  try {
    const haciendaUsers = haciendaStore.haciendaUsers
    console.log('Usuarios de la hacienda cargados en FinanzasForm:', haciendaUsers)

    return haciendaUsers.map((user) => ({
      title: `${user.name} ${user.lastname}` || user.username || 'Usuario ' + user.id,
      value: user.id
    }))
  } catch (error) {
    console.error('Error cargando usuarios de hacienda:', error)
    return []
  }
})

// Actualizar fecha completa cuando cambia alguno de los selectores
function actualizarFecha() {
  // Create the ISO date string with UTC time at noon to avoid timezone issues
  const year = fechaSeleccionada.value.anio
  const month = String(fechaSeleccionada.value.mes).padStart(2, '0')
  const day = String(fechaSeleccionada.value.dia).padStart(2, '0')

  // Set the time to T12:00:00Z (noon UTC) to avoid any timezone-related date shifts
  formData.value.fecha = `${year}-${month}-${day}T12:00:00Z`
}

// Inicializar fecha seleccionada desde fecha del formulario
function inicializarFechaSeleccionada() {
  try {
    // Handle ISO date with or without time component
    let dateStr = formData.value.fecha
    if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0]
    }

    const [year, month, day] = dateStr.split('-').map(Number)

    fechaSeleccionada.value = {
      dia: day,
      mes: month,
      anio: year
    }

    // Re-apply the standardized format with time to ensure consistency
    actualizarFecha()
  } catch (error) {
    console.error('Error initializing date selectors:', error)
    // En caso de error, usar fecha actual
    const hoy = new Date()
    fechaSeleccionada.value = {
      dia: getDate(hoy),
      mes: getMonth(hoy) + 1,
      anio: getYear(hoy)
    }
    actualizarFecha()
  }
}

// Computed property to set the form title based on the action
const formTitle = computed(() => {
  if (props.itemEditando) {
    return 'Editar Registro'
  } else if (props.itemDuplicado) {
    return 'Duplicar Registro'
  } else {
    return 'Nuevo Registro'
  }
})

// Computed property to set the header color based on the form action
const headerColor = computed(() => {
  if (props.itemEditando) {
    return 'blue' // Color for editing
  } else if (props.itemDuplicado) {
    return 'orange' // Color for duplicating
  } else {
    return 'green' // Color for new record
  }
})

// Function to initialize form data based on the action
function initializeFormData() {
  if (props.itemEditando) {
    // For Edit: Load the data from the item being edited
    formData.value = {
      fecha: props.itemEditando.fecha
        ? format(parseISO(props.itemEditando.fecha), 'yyyy-MM-dd')
        : '',
      detalle: props.itemEditando.detalle || '',
      razon_social: props.itemEditando.razon_social || '',
      factura: props.itemEditando.factura || '',
      costo: props.itemEditando.costo || '',
      monto: props.itemEditando.monto || 0,
      comentarios: props.itemEditando.comentarios || '',
      registro_por: props.itemEditando.registro_por || authStore.user?.id || '',
      pagado_por: props.itemEditando.pagado_por || ''
    }
  } else if (props.itemDuplicado) {
    // For Duplicate: Load the data from the item being duplicated
    formData.value = {
      fecha: props.itemDuplicado.fecha
        ? format(parseISO(props.itemDuplicado.fecha), 'yyyy-MM-dd')
        : '',
      detalle: props.itemDuplicado.detalle || '',
      razon_social: props.itemDuplicado.razon_social || '',
      factura: props.itemDuplicado.factura || '',
      costo: props.itemDuplicado.costo || '',
      monto: props.itemDuplicado.monto || 0,
      comentarios: props.itemDuplicado.comentarios || '',
      registro_por: authStore.user?.id || '',
      pagado_por: props.itemDuplicado.pagado_por || ''
    }
  } else {
    // For New Record: Initialize with default values
    formData.value = {
      fecha: format(new Date(), 'yyyy-MM-dd'),
      detalle: '',
      razon_social: '',
      factura: '',
      costo: '',
      monto: null,
      comentarios: '',
      registro_por: authStore.user?.id || '',
      pagado_por: ''
    }
  }
  inicializarFechaSeleccionada()
}

// Function to handle form submission
async function guardarRegistro() {
  try {
    if (!formValid.value) {
      return
    }

    if (props.itemEditando) {
      // For Edit: Update the existing record
      await finanzaStore.updateRegistro(props.itemEditando.id, formData.value)
    } else {
      // For Duplicate and New Record: Create a new record
      await finanzaStore.crearRegistro(formData.value)
    }

    emit('guardado')
    dialogVisible.value = false
  } catch (error) {
    console.error('Error al guardar registro:', error)
  }
}

// Function to close the form
function cerrar() {
  dialogVisible.value = false
}

// Function to handle dialog visibility change
function onDialogChange(visible) {
  if (visible) {
    initializeFormData()
  }
}

// Observers
watch(
  () => props.itemEditando,
  (newValue) => {
    if (newValue) {
      initializeFormData()
    }
  }
)

watch(
  () => props.itemDuplicado,
  (newValue) => {
    if (newValue) {
      initializeFormData()
    }
  }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      initializeFormData()
    }
  }
)

// Watchers para convertir a mayúsculas
watch(
  () => formData.value.detalle,
  (newValue) => {
    formData.value.detalle = newValue.toUpperCase()
  }
)

watch(
  () => formData.value.razon_social,
  (newValue) => {
    formData.value.razon_social = newValue.toUpperCase()
  }
)

watch(
  () => formData.value.comentarios,
  (newValue) => {
    formData.value.comentarios = newValue.toUpperCase()
  }
)

onMounted(() => {
  initializeFormData()
})
</script>
