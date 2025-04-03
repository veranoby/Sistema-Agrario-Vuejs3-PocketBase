<template>
  <v-dialog v-model="dialogVisible" max-width="600px" @update:model-value="onDialogChange">
    <v-card>
      <v-card-title class="text-h5">
        {{ itemEditando ? 'Editar Registro' : 'Nuevo Registro' }}
      </v-card-title>
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
        <v-btn color="error" variant="text" @click="cerrar">Cancelar</v-btn>
        <v-btn color="primary" variant="text" :disabled="!formValid" @click="guardarRegistro">
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
  itemEditando: Object
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
  const fechaObj = new Date(
    fechaSeleccionada.value.anio,
    fechaSeleccionada.value.mes - 1, // date-fns usa 0-11 para meses
    fechaSeleccionada.value.dia
  )
  formData.value.fecha = format(fechaObj, 'yyyy-MM-dd')
}

// Inicializar fecha seleccionada desde fecha del formulario
function inicializarFechaSeleccionada() {
  try {
    const fechaObj = parseISO(formData.value.fecha)
    fechaSeleccionada.value = {
      dia: getDate(fechaObj),
      mes: getMonth(fechaObj) + 1, // date-fns usa 0-11 para meses
      anio: getYear(fechaObj)
    }
  } catch (error) {
    // En caso de error, usar fecha actual
    const hoy = new Date()
    fechaSeleccionada.value = {
      dia: getDate(hoy),
      mes: getMonth(hoy) + 1,
      anio: getYear(hoy)
    }
    formData.value.fecha = format(hoy, 'yyyy-MM-dd')
  }
}

// Cargar datos para edición
function cargarDatosEdicion() {
  if (props.itemEditando) {
    // Si itemEditando tiene un valor, cargar los datos del ítem
    formData.value = {
      fecha: props.itemEditando.fecha || format(new Date(), 'yyyy-MM-dd'),
      detalle: props.itemEditando.detalle || '',
      razon_social: props.itemEditando.razon_social || '',
      factura: props.itemEditando.factura || '',
      costo: props.itemEditando.costo || '',
      monto: props.itemEditando.monto || null,
      comentarios: props.itemEditando.comentarios || '',
      registro_por: props.itemEditando.registro_por || authStore.user?.id || '',
      pagado_por: props.itemEditando.pagado_por || ''
    }
    inicializarFechaSeleccionada()
  } else {
    // Si itemEditando es null, cargar los datos de formData
    formData.value = {
      fecha: format(new Date(), 'yyyy-MM-dd'),
      detalle: formData.value.detalle || '',
      razon_social: formData.value.razon_social || '',
      factura: formData.value.factura || '',
      costo: formData.value.costo || '',
      monto: formData.value.monto || null,
      comentarios: formData.value.comentarios || '',
      registro_por: authStore.user?.id || '',
      pagado_por: formData.value.pagado_por || ''
    }
    inicializarFechaSeleccionada()
  }
}

// Guardar registro
async function guardarRegistro() {
  try {
    if (!formValid.value) {
      return
    }

    if (props.itemEditando) {
      await finanzaStore.updateRegistro(props.itemEditando.id, formData.value)
    } else {
      await finanzaStore.crearRegistro(formData.value)
    }

    emit('guardado')
    dialogVisible.value = false
  } catch (error) {
    console.error('Error al guardar registro:', error)
  }
}

function cerrar() {
  dialogVisible.value = false
}

function onDialogChange(visible) {
  if (visible) {
    cargarDatosEdicion()
  }
}

// Observers
watch(
  () => props.itemEditando,
  (newValue) => {
    if (newValue) {
      cargarDatosEdicion()
    }
  }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      cargarDatosEdicion()
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
  cargarDatosEdicion()
})
</script>
