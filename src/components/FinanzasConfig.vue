<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                {{ t('finance.financial_management') }}
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
                {{ t('finance.new_record') }}
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
        <v-card class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="7" md="5" class="d-flex align-center">
                <v-btn icon variant="text" @click="finanzaStore.changeMonth('prev')">
                  <v-icon>mdi-chevron-left-circle</v-icon>
                </v-btn>

                <div class="d-flex flex-column flex-sm-row gap-1 mx-2">
                  <v-select
                    v-model="selectedMonth"
                    :items="months"
                    :label="t('finance.month')"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="month-selector"
                    @update:modelValue="updateMonth"
                  ></v-select>

                  <v-select
                    v-model="selectedYear"
                    :items="years"
                    :label="t('finance.year')"
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

              <v-col cols="12" sm="6" md="3" class="d-flex align-center justify-center">
                <div class="text-center">
                  <div class="text-subtitle-2">{{ t('finance.total_of_the_month') }}</div>
                  <div class="text-h5 mb-2">{{ formatCurrency(finanzaStore.totalMes) }}</div>

                  <div class="d-flex flex-wrap gap-1 justify-center" v-if="finanzaStore.totalesPorUsuario.length > 0">
                    <v-chip
                      v-for="usuario in finanzaStore.totalesPorUsuario"
                      :key="usuario.userId"
                      size="x-small"
                      variant="tonal"
                      color="primary"
                      class="ma-1"
                    >
                      <v-icon start size="x-small">mdi-account</v-icon>
                      {{ usuario.nombre }}: {{ formatCurrency(usuario.total) }}
                    </v-chip>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" md="4" class="d-flex gap-2 justify-end">
                <v-btn
                  variant="tonal"
                  color="success"
                  prepend-icon="mdi-file-excel"
                  @click="finanzaStore.exportToExcel"
                  size="small"
                >
                  {{ t('finance.export') }}
                </v-btn>
                <v-btn
                  variant="tonal"
                  color="info"
                  prepend-icon="mdi-file-import"
                  @click="importExcel"
                  size="small"
                >
                  {{ t('finance.import') }}
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="filters.razonSocial"
                  :label="t('finance.filter_by_business_name')"
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
                  :label="t('finance.filter_by_category')"
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
                  :label="t('finance.filter_by_paid_by')"
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
            <v-row class="mt-2">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="filters.detalle"
                  :label="t('finance.filter_by_detail')"
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
                  :label="t('finance.filter_by_comments')"
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

        <v-card>
          <v-data-table
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="filteredRegistros"
            :loading="finanzaStore.loading"
            item-value="id"
            class="elevation-0"
          >
            <template v-slot:item.fecha="{ item }">
              {{ formatDate(item.fecha) }}
            </template>
            <template v-slot:item.monto="{ item }">
              {{ formatCurrency(item.monto) }}
            </template>
            <template v-slot:item.costo="{ item }">
              <v-chip size="small" :color="getCategoryColor(item.costo)" label>
                {{ item.costo }}
              </v-chip>
            </template>
            <template v-slot:item.registro_por="{ item }">
              {{ getUsuarioNombre(item.registro_por) }}
            </template>
            <template v-slot:item.pagado_por="{ item }">
              {{ getUsuarioNombre(item.pagado_por) }}
            </template>
            <template v-slot:item.actions="{ item }">
              <div class="d-flex gap-2">
                <v-tooltip
                  :text="
                    item.registro_por === authStore.user.id || userRole === 'administrador'
                      ? t('finance.edit')
                      : t('finance.edit_error')
                  "
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      :color="
                        item.registro_por === authStore.user.id || userRole === 'administrador'
                          ? 'primary'
                          : 'grey'
                      "
                      v-bind="props"
                      @click="
                        item.registro_por === authStore.user.id || userRole === 'administrador'
                          ? openEditarItem(item)
                          : showEditError()
                      "
                      :disabled="
                        item.registro_por !== authStore.user.id && userRole !== 'administrador'
                      "
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip :text="t('finance.duplicate')">
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
                <v-tooltip
                  :text="
                    item.registro_por === authStore.user.id || userRole === 'administrador'
                      ? t('finance.delete')
                      : t('finance.delete_error')
                  "
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      :color="
                        item.registro_por === authStore.user.id || userRole === 'administrador'
                          ? 'error'
                          : 'grey'
                      "
                      v-bind="props"
                      @click="
                        item.registro_por === authStore.user.id || userRole === 'administrador'
                          ? confirmDelete(item)
                          : showDeleteError()
                      "
                      :disabled="
                        item.registro_por !== authStore.user.id && userRole !== 'administrador'
                      "
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
              </div>
            </template>
            <template v-slot:no-data>
              <div class="d-flex flex-column align-center pa-4">
                <v-icon size="large" color="grey-lighten-1">mdi-database-off</v-icon>
                <span class="text-grey-lighten-1 mt-2">{{ t('finance.no_records') }}</span>
                <v-btn class="mt-4" variant="tonal" color="primary" @click="openNuevoItem">
                  {{ t('finance.add_record') }}
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-container>
    </main>

    <FinanzasForm
      v-model="showForm"
      :itemEditando="itemEditando"
      :itemDuplicado="itemDuplicado"
      @guardado="handleGuardado"
    />

    <v-dialog v-model="confirmDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">{{ t('finance.confirm_delete') }}</v-card-title>
        <v-card-text>
          {{ t('finance.confirm_delete_text') }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="confirmDeleteDialog = false">{{ t('finance.cancel') }}</v-btn>
          <v-btn color="error" variant="text" @click="eliminarRegistro">{{ t('finance.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <FinanzasImportExcel ref="importExcelDialog" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSyncStore } from '@/stores/syncStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useProfileStore } from '@/stores/profileStore'
import { useFinanzaStore } from '@/stores/finanzaStore'
import { useAuthStore } from '@/stores/authStore'
import { storeToRefs } from 'pinia'
import { format, parseISO, getMonth, getYear, setMonth, setYear } from 'date-fns'
import FinanzasForm from '@/components/forms/FinanzasForm.vue'
import FinanzasImportExcel from '@/components/forms/FinanzasImportExcel.vue'

const { t } = useI18n()
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

const selectedMonth = ref(getMonth(finanzaStore.currentMonth))
const selectedYear = ref(getYear(finanzaStore.currentMonth))

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

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 11 }, (_, i) => ({
  title: String(currentYear - 5 + i),
  value: currentYear - 5 + i
}))

const filters = ref({
  razonSocial: '',
  categoria: '',
  pagadoPor: '',
  detalle: '',
  comentarios: ''
})

const usuariosItems = computed(() => {
  try {
    const haciendaUsers = haciendaStore.haciendaUsers
    return [
      { title: t('finance.all'), value: '' },
      ...haciendaUsers.map((user) => ({
        title: `${user.name} ${user.lastname}` || user.username || 'Usuario ' + user.id,
        value: user.id
      }))
    ]
  } catch (error) {
    console.error('Error cargando usuarios de hacienda:', error)
    return [{ title: t('finance.all'), value: '' }]
  }
})

const filteredRegistros = computed(() => {
  return finanzaStore.registros
    .filter((reg) => {
      const regDate = parseISO(reg.fecha)
      if (getMonth(regDate) !== selectedMonth.value || getYear(regDate) !== selectedYear.value) {
        return false
      }
      if (
        filters.value.razonSocial &&
        !reg.razon_social?.toLowerCase().includes(filters.value.razonSocial.toLowerCase())
      ) {
        return false
      }
      if (filters.value.categoria && reg.costo !== filters.value.categoria) {
        return false
      }
      if (filters.value.pagadoPor && reg.pagado_por !== filters.value.pagadoPor) {
        return false
      }
      if (
        filters.value.detalle &&
        !reg.detalle?.toLowerCase().includes(filters.value.detalle.toLowerCase())
      ) {
        return false
      }
      if (
        filters.value.comentarios &&
        !reg.comentarios?.toLowerCase().includes(filters.value.comentarios.toLowerCase())
      ) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      return new Date(a.fecha) - new Date(b.fecha)
    })
})

const syncStore = useSyncStore()

const headers = [
  { title: t('finance.date'), key: 'fecha', sortable: true, width: '100px' },
  { title: t('finance.detail'), key: 'detalle' },
  { title: t('finance.business_name'), key: 'razon_social' },
  { title: t('finance.invoice_no'), key: 'factura', width: '120px' },
  { title: t('finance.category'), key: 'costo', align: 'center', width: '150px' },
  { title: t('finance.amount'), key: 'monto', sortable: true, align: 'end', width: '120px' },
  { title: t('finance.comments'), key: 'comentarios' },
  { title: t('finance.registered_by'), key: 'registro_por', width: '150px' },
  { title: t('finance.paid_by'), key: 'pagado_por', width: '150px' },
  { title: t('finance.actions'), key: 'actions', sortable: false, align: 'center', width: '100px' }
]

watch(
  () => finanzaStore.currentMonth,
  () => {
    selectedMonth.value = getMonth(finanzaStore.currentMonth)
    selectedYear.value = getYear(finanzaStore.currentMonth)
  }
)

onMounted(async () => {
  await syncStore.init()
  finanzaStore.currentMonth = new Date()
  selectedMonth.value = getMonth(finanzaStore.currentMonth)
  selectedYear.value = getYear(finanzaStore.currentMonth)
  await finanzaStore.cargarRegistros()
})

function updateMonth() {
  const newDate = setMonth(finanzaStore.currentMonth, selectedMonth.value)
  finanzaStore.currentMonth = newDate
}

function updateYear() {
  const newDate = setYear(finanzaStore.currentMonth, selectedYear.value)
  finanzaStore.currentMonth = newDate
}

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

const itemDuplicado = ref(null)

function duplicarItem(item) {
  itemEditando.value = null
  itemDuplicado.value = item
  showForm.value = true
}

function openNuevoItem() {
  itemEditando.value = null
  itemDuplicado.value = null
  showForm.value = true
}

function openEditarItem(item) {
  itemEditando.value = item
  itemDuplicado.value = null
  showForm.value = true
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
  itemDuplicado.value = null
}

function getUsuarioNombre(userId) {
  const user = haciendaStore.haciendaUsers.find((u) => u.id === userId)
  return user ? `${user.name || ''} ${user.lastname || ''}`.trim() || '-' : '-'
}

function showEditError() {
  alert(t('finance.edit_not_allowed'))
}

function showDeleteError() {
  alert(t('finance.delete_not_allowed'))
}
</script>

<style scoped>
.month-selector {
  min-width: 120px;
}
.year-selector {
  min-width: 100px;
}
.filter-active {
  border-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}
</style>