<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                Gestión Financiera
                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ userRole }}
                </v-chip>
                <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ mi_hacienda.name }}
                </v-chip>
              </h3>
            </div>

            <!-- Button Section -->
            <div class="w-full sm:w-auto z-10">
              <v-btn
                block
                sm:inline-flex
                size="small"
                variant="flat"
                rounded="lg"
                color="#6380a247"
                prepend-icon="mdi-plus"
                @click="openNuevoItem"
                class="min-w-[210px]"
              >
                Nuevo Registro
              </v-btn>
            </div>
          </div>

          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <main class="flex-1 py-2">
      <v-container>
        <!-- Panel de control mejorado -->
        <v-card class="mb-4">
          <v-card-text>
            <v-row align="center">
              <!-- Navegación de meses mejorada -->
              <v-col cols="12" sm="7" md="5" class="d-flex align-center">
                <v-btn icon variant="text" @click="finanzaStore.changeMonth('prev')">
                  <v-icon>mdi-chevron-left-circle</v-icon>
                </v-btn>

                <div class="d-flex flex-column flex-sm-row gap-1 mx-2">
                  <v-select
                    v-model="selectedMonth"
                    :items="months"
                    label="Mes"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="month-selector"
                    @update:modelValue="updateMonth"
                  ></v-select>

                  <v-select
                    v-model="selectedYear"
                    :items="years"
                    label="Año"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="year-selector"
                    @update:modelValue="updateYear"
                  ></v-select>
                </div>

                <v-btn icon variant="text" @click="finanzaStore.changeMonth('next')">
                  <v-icon>mdi-chevron-right-circle</v-icon>
                </v-btn>
              </v-col>

              <!-- Totales -->
              <v-col cols="12" sm="6" md="3" class="d-flex align-center justify-center">
                <div class="text-center">
                  <div class="text-subtitle-2">Total del mes</div>
                  <div class="text-h5">{{ formatCurrency(finanzaStore.totalMes) }}</div>
                </div>
              </v-col>

              <!-- Botones de acción -->
              <v-col cols="12" md="4" class="d-flex gap-2 justify-end">
                <v-btn
                  variant="tonal"
                  color="success"
                  prepend-icon="mdi-file-excel"
                  @click="finanzaStore.exportToExcel"
                  size="small"
                >
                  Exportar
                </v-btn>
                <v-btn
                  variant="tonal"
                  color="info"
                  prepend-icon="mdi-file-import"
                  @click="importExcel"
                  size="small"
                >
                  Importar
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Filtros mejorados -->
        <v-card class="mb-4">
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="filters.razonSocial"
                  label="Filtrar por Razón Social"
                  density="compact"
                  compact
                  variant="outlined"
                  prepend-inner-icon="mdi-filter"
                  hide-details
                  clearable
                  color="primary"
                  :class="filters.razonSocial ? 'active-filter' : ''"
                  :bg-color="filters.razonSocial ? 'blue-lighten-4' : undefined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="3">
                <v-select
                  v-model="filters.categoria"
                  :items="[
                    '',
                    'SERVICIOS LEGALES',
                    'INVERSION',
                    'SUNDRY',
                    'ALIMENTACION',
                    'EQUIPOS',
                    'HONORARIOS',
                    'MOVILIZACION',
                    'MATERIALES'
                  ]"
                  label="Filtrar por Categoría"
                  density="compact"
                  compact
                  variant="outlined"
                  prepend-inner-icon="mdi-filter"
                  hide-details
                  clearable
                  color="success"
                  :class="filters.categoria ? 'active-filter' : ''"
                  :bg-color="filters.categoria ? 'green-lighten-3' : undefined"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="3">
                <v-select
                  v-model="filters.pagadoPor"
                  :items="usuariosItems"
                  label="Filtrar por Pagado Por"
                  density="compact"
                  compact
                  variant="outlined"
                  prepend-inner-icon="mdi-filter"
                  hide-details
                  clearable
                  color="primary"
                  :class="filters.pagadoPor ? 'active-filter' : ''"
                  :bg-color="filters.pagadoPor ? 'blue-lighten-4' : undefined"
                ></v-select>
              </v-col>
            </v-row>
            <!-- Nueva fila para filtros adicionales -->
            <v-row class="mt-2">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="filters.detalle"
                  label="Filtrar por Detalle"
                  density="compact"
                  compact
                  variant="outlined"
                  prepend-inner-icon="mdi-filter"
                  hide-details
                  clearable
                  color="success"
                  :class="filters.detalle ? 'active-filter' : ''"
                  :bg-color="filters.detalle ? 'green-lighten-3' : undefined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="filters.comentarios"
                  label="Filtrar por Comentarios"
                  density="compact"
                  compact
                  variant="outlined"
                  prepend-inner-icon="mdi-filter"
                  hide-details
                  clearable
                  color="primary"
                  :class="filters.comentarios ? 'active-filter' : ''"
                  :bg-color="filters.comentarios ? 'blue-lighten-4' : undefined"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Tabla de registros financieros mejorada -->
        <v-card>
          <v-data-table
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="filteredRegistros"
            :loading="finanzaStore.loading"
            item-value="id"
            class="elevation-0"
          >
            <!-- Formato de fecha -->
            <template v-slot:item.fecha="{ item }">
              {{ formatDate(item.fecha) }}
            </template>

            <!-- Formato de monto -->
            <template v-slot:item.monto="{ item }">
              {{ formatCurrency(item.monto) }}
            </template>

            <!-- Categoría con chip -->
            <template v-slot:item.costo="{ item }">
              <v-chip size="small" :color="getCategoryColor(item.costo)" label>
                {{ item.costo }}
              </v-chip>
            </template>

            <!-- Registrado por / Pagado por -->
            <template v-slot:item.registro_por="{ item }">
              {{ getUsuarioNombre(item.registro_por) }}
            </template>

            <template v-slot:item.pagado_por="{ item }">
              {{ getUsuarioNombre(item.pagado_por) }}
            </template>

            <!-- Acciones por item -->
            <template v-slot:item.actions="{ item }">
              <div class="d-flex gap-2">
                <v-tooltip text="Editar">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      color="primary"
                      v-bind="props"
                      @click="openEditarItem(item)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="Duplicar">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      color="info"
                      v-bind="props"
                      @click="duplicarItem(item)"
                    >
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="Eliminar">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      color="error"
                      v-bind="props"
                      @click="confirmDelete(item)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
              </div>
            </template>

            <!-- Mensaje cuando no hay datos -->
            <template v-slot:no-data>
              <div class="d-flex flex-column align-center pa-4">
                <v-icon size="large" color="grey-lighten-1">mdi-database-off</v-icon>
                <span class="text-grey-lighten-1 mt-2"
                  >No hay registros financieros para este mes</span
                >
                <v-btn class="mt-4" variant="tonal" color="primary" @click="openNuevoItem">
                  Agregar registro
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-container>
    </main>

    <!-- Usar el componente FinanzasForm -->
    <FinanzasForm
      v-model="showForm"
      :itemEditando="itemEditando"
      :itemDuplicado="itemDuplicado"
      @guardado="handleGuardado"
    />

    <!-- Diálogo de confirmación para eliminar -->
    <v-dialog v-model="confirmDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">Confirmar eliminación</v-card-title>
        <v-card-text>
          ¿Está seguro que desea eliminar este registro financiero? Esta acción no se puede
          deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="confirmDeleteDialog = false"
            >Cancelar</v-btn
          >
          <v-btn color="error" variant="text" @click="eliminarRegistro">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- En el template, agrega el componente: -->
    <FinanzasImportExcel ref="importExcelDialog" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSyncStore } from '@/stores/syncStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useProfileStore } from '@/stores/profileStore'
import { useFinanzaStore } from '@/stores/finanzaStore'
import { useAuthStore } from '@/stores/authStore'
import { storeToRefs } from 'pinia'
import { format, parseISO, getMonth, getYear, setMonth, setYear } from 'date-fns'
import { es } from 'date-fns/locale'
import FinanzasForm from '@/components/forms/FinanzasForm.vue'
import FinanzasImportExcel from '@/components/forms/FinanzasImportExcel.vue'

const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const finanzaStore = useFinanzaStore()
const authStore = useAuthStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const userRole = computed(() => profileStore.user.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

const showForm = ref(false)
const itemEditando = ref(null)
const confirmDeleteDialog = ref(false)
const itemToDelete = ref(null)
const itemsPerPage = ref(50)

// Selección de mes y año
const selectedMonth = ref(getMonth(finanzaStore.currentMonth))
const selectedYear = ref(getYear(finanzaStore.currentMonth))

// Lista de meses y años para los selectores
const months = [
  { title: 'Enero', value: 0 },
  { title: 'Febrero', value: 1 },
  { title: 'Marzo', value: 2 },
  { title: 'Abril', value: 3 },
  { title: 'Mayo', value: 4 },
  { title: 'Junio', value: 5 },
  { title: 'Julio', value: 6 },
  { title: 'Agosto', value: 7 },
  { title: 'Septiembre', value: 8 },
  { title: 'Octubre', value: 9 },
  { title: 'Noviembre', value: 10 },
  { title: 'Diciembre', value: 11 }
]

// Generar años (desde hace 5 años hasta 5 años adelante)
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 11 }, (_, i) => ({
  title: String(currentYear - 5 + i),
  value: currentYear - 5 + i
}))

// Filtros
const filters = ref({
  razonSocial: '',
  categoria: '',
  pagadoPor: '',
  detalle: '',
  comentarios: ''
})

// Lista de usuarios para el filtro - Utilizando haciendaUsers del localStorage
const usuariosItems = computed(() => {
  try {
    // Obtener usuarios de la hacienda desde el store
    const haciendaUsers = haciendaStore.haciendaUsers
    console.log('Usuarios de la hacienda cargados en FinanzasConfig:', haciendaUsers)

    // Convertir a formato para v-select
    return [
      { title: 'Todos', value: '' },
      ...haciendaUsers.map((user) => ({
        title: `${user.name} ${user.lastname}` || user.username || 'Usuario ' + user.id,
        value: user.id
      }))
    ]
  } catch (error) {
    console.error('Error cargando usuarios de hacienda:', error)
    return [{ title: 'Todos', value: '' }]
  }
})

// Filtrar registros según los filtros aplicados
const filteredRegistros = computed(() => {
  return finanzaStore.registros
    .filter((reg) => {
      // Filtro por mes y año
      const regDate = parseISO(reg.fecha)
      if (getMonth(regDate) !== selectedMonth.value || getYear(regDate) !== selectedYear.value) {
        return false
      }

      // Filtro por razón social
      if (
        filters.value.razonSocial &&
        !reg.razon_social?.toLowerCase().includes(filters.value.razonSocial.toLowerCase())
      ) {
        return false
      }

      // Filtro por categoría
      if (filters.value.categoria && reg.costo !== filters.value.categoria) {
        return false
      }

      // Filtro por pagado por
      if (filters.value.pagadoPor && reg.pagado_por !== filters.value.pagadoPor) {
        return false
      }

      // Filtro por detalle
      if (
        filters.value.detalle &&
        !reg.detalle?.toLowerCase().includes(filters.value.detalle.toLowerCase())
      ) {
        return false
      }

      // Filtro por comentarios
      if (
        filters.value.comentarios &&
        !reg.comentarios?.toLowerCase().includes(filters.value.comentarios.toLowerCase())
      ) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      // Sort by date in ascending order
      return new Date(a.fecha) - new Date(b.fecha)
    })
})

const syncStore = useSyncStore()
const form = ref(null)

// Headers mejorados para la tabla - Agregar comentarios
const headers = [
  { title: 'Fecha', key: 'fecha', sortable: true, width: '100px' },
  { title: 'Detalle', key: 'detalle' },
  { title: 'Razón Social', key: 'razon_social' },
  { title: 'N° Factura', key: 'factura', width: '120px' },
  { title: 'Categoría', key: 'costo', align: 'center', width: '150px' },
  { title: 'Monto', key: 'monto', sortable: true, align: 'end', width: '120px' },
  { title: 'Comentarios', key: 'comentarios' },
  { title: 'Registrado por', key: 'registro_por', width: '150px' },
  { title: 'Pagado por', key: 'pagado_por', width: '150px' },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'center', width: '100px' }
]

const formData = ref({
  fecha: format(new Date(), 'yyyy-MM-dd'),
  detalle: '',
  razon_social: '',
  factura: '',
  costo: '',
  monto: null,
  registro_por: '',
  pagado_por: ''
})

// Actualizar mes/año cuando cambia currentMonth en el store
watch(
  () => finanzaStore.currentMonth,
  () => {
    selectedMonth.value = getMonth(finanzaStore.currentMonth)
    selectedYear.value = getYear(finanzaStore.currentMonth)
  }
)

onMounted(async () => {
  // Inicializar syncStore
  await syncStore.init()

  // Establecer el mes actual al cargar la página
  finanzaStore.currentMonth = new Date()
  selectedMonth.value = getMonth(finanzaStore.currentMonth)
  selectedYear.value = getYear(finanzaStore.currentMonth)

  // Cargar registros financieros
  await finanzaStore.cargarRegistros()
})

// Funciones para actualizar mes/año
function updateMonth() {
  const newDate = setMonth(finanzaStore.currentMonth, selectedMonth.value)
  finanzaStore.currentMonth = newDate
}

function updateYear() {
  const newDate = setYear(finanzaStore.currentMonth, selectedYear.value)
  finanzaStore.currentMonth = newDate
}

// Asignar colores a las categorías
function getCategoryColor(categoria) {
  const colors = {
    'SERVICIOS LEGALES': 'blue-lighten-1',
    INVERSION: 'green-lighten-1',
    SUNDRY: 'purple-lighten-1',
    ALIMENTACION: 'orange-lighten-1',
    EQUIPOS: 'cyan-lighten-1',
    HONORARIOS: 'indigo-lighten-1',
    MOVILIZACION: 'amber-lighten-1',
    MATERIALES: 'teal-lighten-1'
  }
  return colors[categoria] || 'grey-lighten-1'
}

function formatDate(dateString) {
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy')
  } catch (error) {
    return dateString
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

// Función para duplicar un item
function duplicarItem(item) {
  itemEditando.value = null
  itemDuplicado.value = item
  showForm.value = true
}

function openNuevoItem() {
  itemEditando.value = null
  itemDuplicado.value = null

  formData.value = {
    fecha: format(new Date(), 'yyyy-MM-dd'),
    detalle: '',
    razon_social: '',
    factura: '',
    costo: '',
    monto: null,
    comentarios: '',
    registro_por: authStore.user.id,
    pagado_por: ''
  }
  showForm.value = true
}

function openEditarItem(item) {
  itemEditando.value = item
  formData.value = {
    fecha: item.fecha ? format(parseISO(item.fecha), 'yyyy-MM-dd') : '',
    detalle: item.detalle || '',
    razon_social: item.razon_social || '',
    factura: item.factura || '',
    costo: item.costo || '',
    monto: item.monto || 0,
    registro_por: item.registro_por || authStore.user.id,
    pagado_por: item.pagado_por || ''
  }
  showForm.value = true
}

async function guardarRegistro() {
  try {
    if (itemEditando.value) {
      await finanzaStore.updateRegistro(itemEditando.value.id, formData.value)
    } else {
      await finanzaStore.crearRegistro(formData.value)
    }
    handleGuardado()
  } catch (error) {
    console.error('Error al guardar registro:', error)
  }
}

function confirmDelete(item) {
  itemToDelete.value = item
  confirmDeleteDialog.value = true
}

async function eliminarRegistro() {
  if (!itemToDelete.value) return

  try {
    await finanzaStore.eliminarRegistro(itemToDelete.value.id)
    confirmDeleteDialog.value = false
    itemToDelete.value = null
  } catch (error) {
    console.error('Error al eliminar registro:', error)
  }
}

const importExcelDialog = ref(null)

function importExcel() {
  importExcelDialog.value?.open()
}

const handleGuardado = () => {
  showForm.value = false
  itemEditando.value = null
}

// Function to get user name and last name from haciendaUsers
function getUsuarioNombre(userId) {
  const user = haciendaStore.haciendaUsers.find((u) => u.id === userId)
  return user ? `${user.name || ''} ${user.lastname || ''}`.trim() || '-' : '-'
}

const itemDuplicado = ref(null)
</script>

<style scoped>
.month-selector {
  min-width: 120px;
}
.year-selector {
  min-width: 100px;
}
.filter-active {
  border-color: #4caf50; /* Cambia este color según tu preferencia */
  background-color: rgba(76, 175, 80, 0.1); /* Color de fondo suave */
}
</style>
