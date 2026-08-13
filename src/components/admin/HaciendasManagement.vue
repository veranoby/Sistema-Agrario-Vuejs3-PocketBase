<template>
  <v-container fluid class="haciendas-management">
    <div class="d-flex justify-space-between align-center mb-4">
      <h3 class="text-md">Gestión de Haciendas</h3>
      <v-btn v-role="'HACIENDAS_MANAGE'" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Nueva Hacienda
      </v-btn>
    </div>

    <!-- Filtros y Búsqueda -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              label="Buscar por nombre"
              prepend-icon="mdi-magnify"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filterStatus"
              label="Estado"
              :items="[
                { title: 'Activas', value: 'active' },
                { title: 'Suspendidas', value: 'suspended' },
                { title: 'Inactivas', value: 'inactive' }
              ]"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn color="secondary" @click="exportToMarkdown" class="mr-2">
              <v-icon start>mdi-language-markdown</v-icon>
              Exportar MD
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Grid de Haciendas -->
    <v-row v-if="filteredHaciendas.length">
      <v-col
        v-for="hacienda in filteredHaciendas"
        :key="hacienda.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card hover class="hacienda-card">
          <v-card-text>
            <div class="d-flex justify-space-between align-start mb-2">
              <h3 class="text-h6">{{ hacienda.name || hacienda.nombre }}</h3>
              <v-chip :color="getStatusColor(hacienda.status)" size="small">
                {{ formatStatus(hacienda.status) }}
              </v-chip>
            </div>

            <p class="text-sm text-grey mb-2" v-html="hacienda.info || hacienda.descripcion || 'Sin descripción'"></p>

            <v-divider class="my-2" />

            <div class="text-md">
              <p><strong>Ubicación:</strong> {{ hacienda.location || hacienda.ubicacion || 'N/A' }}</p>
              <p><strong>Plan:</strong> {{ hacienda.plan?.name || hacienda.plan?.nombre || 'N/A' }}</p>
              <p><strong>Propietario/Admin:</strong> {{ getOwnerName(hacienda) }}</p>
              <p>
                <strong>Usuarios:</strong>
                {{ getHaciendaUsersCount(hacienda.id) }}
              </p>
              <p><strong>Creada:</strong> {{ formatDate(hacienda.created) }}</p>
            </div>

            <v-chip-group column v-if="hacienda.active_modules?.length" class="mt-2">
              <v-chip
                v-for="moduleId in hacienda.active_modules"
                :key="moduleId"
                size="small"
                color="primary"
                variant="outlined"
              >
                {{ getModuleName(moduleId) }}
              </v-chip>
            </v-chip-group>
          </v-card-text>

          <v-card-actions>
            <v-btn icon="mdi-eye" size="small" variant="text" @click="viewHacienda(hacienda)" />
            <v-btn v-role="'HACIENDAS_MANAGE'" icon="mdi-pencil" size="small" variant="text" @click="editHacienda(hacienda)" />
            <v-btn
              v-role="'HACIENDAS_MANAGE'"
              icon="mdi-delete"
              size="small"
              color="error"
              variant="text"
              @click="confirmDelete(hacienda)"
            />
            <v-spacer />
            <v-btn icon="mdi-language-markdown" size="small" variant="text" color="secondary" title="Exportar esta hacienda" @click="exportHaciendaToMarkdown(hacienda)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-else type="info" class="mt-4">
      No se encontraron haciendas registradas con los filtros actuales.
    </v-alert>

    <!-- Diálogos Encapsulados -->
    <HaciendaCreateEditDialog
      v-model="haciendaDialog"
      :hacienda-data="editingHacienda"
      :users-list="usersList"
      :planes-list="planesList"
      :modulos-list="modulosList"
      @saved="refreshData"
    />

    <HaciendaDetailDialog
      v-model="viewDialog"
      :hacienda="selectedHacienda"
      :users-list="usersList"
      :planes-list="planesList"
      :modulos-list="modulosList"
      @updated="refreshData"
      @edit="editHacienda"
    />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { formatDate } from '@/utils/formatters'
import { exportHaciendasToMarkdown } from '@/utils/exporters/markdownExporter'
import { useHaciendaManagementStore } from '@/stores/haciendaManagementStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

import HaciendaCreateEditDialog from './dialogs/HaciendaCreateEditDialog.vue'
import HaciendaDetailDialog from './dialogs/HaciendaDetailDialog.vue'

const haciendaManagementStore = useHaciendaManagementStore()
const uiFeedbackStore = useUiFeedbackStore()

// Filtros y Búsqueda
const searchQuery = ref('')
const filterStatus = ref(null)

// Estados para modales
const haciendaDialog = ref(false)
const viewDialog = ref(false)
const editingHacienda = ref(null)
const selectedHacienda = ref(null)
const usersList = ref([])

const haciendas = computed(() => haciendaManagementStore.haciendas)
const planesList = computed(() => haciendaManagementStore.planes)
const modulosList = computed(() => haciendaManagementStore.modulos)

// Haciendas filtradas
const filteredHaciendas = computed(() => {
  let result = haciendas.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(h => (h.name || h.nombre || '').toLowerCase().includes(query))
  }
  if (filterStatus.value) {
    result = result.filter(h => h.status === filterStatus.value)
  }
  return result
})

onMounted(async () => {
  await refreshData()
})

async function refreshData() {
  await Promise.all([
    fetchHaciendas(),
    fetchPlanes(),
    fetchModulos(),
    fetchUsers()
  ])
}

async function fetchHaciendas() {
  try {
    await haciendaManagementStore.fetchHaciendas()
  } catch (error) {
    handleError(error, 'Error al cargar haciendas')
  }
}

async function fetchPlanes() {
  try {
    await haciendaManagementStore.fetchPlanes()
  } catch (error) {
    handleError(error, 'Error al cargar planes')
  }
}

async function fetchModulos() {
  try {
    await haciendaManagementStore.fetchModulos()
  } catch (error) {
    handleError(error, 'Error al cargar módulos')
  }
}

async function fetchUsers() {
  try {
    const records = await pb.collection('users').getFullList({
      sort: 'name'
    })
    usersList.value = records.map(u => ({
      id: u.id,
      label: `${u.name || u.nombre || u.email || 'Sin nombre'} (${u.email || 'N/A'})`,
      email: u.email,
      hacienda: u.hacienda,
      name: u.name || u.nombre
    }))
  } catch (error) {
    handleError(error, 'Error al cargar lista de usuarios')
  }
}

function openCreateDialog() {
  editingHacienda.value = null
  haciendaDialog.value = true
}

async function editHacienda(hacienda) {
  let h = hacienda
  try {
    const fresh = await pb.collection('Haciendas').getOne(hacienda.id, { expand: 'plan' })
    h = { ...fresh, plan: fresh.expand?.plan || hacienda.plan }
  } catch (e) {
    console.warn('No se pudo refrescar hacienda, usando copia local', e)
  }
  editingHacienda.value = h
  haciendaDialog.value = true
}

async function viewHacienda(hacienda) {
  let h = hacienda
  try {
    const fresh = await pb.collection('Haciendas').getOne(hacienda.id, { expand: 'plan' })
    h = { ...fresh, plan: fresh.expand?.plan || hacienda.plan }
  } catch (e) {
    console.warn('No se pudo refrescar detalles de hacienda, usando copia local', e)
  }
  selectedHacienda.value = h
  viewDialog.value = true
}

async function confirmDelete(hacienda) {
  const confirmed = await uiFeedbackStore.showConfirm(
    'Eliminar Hacienda',
    `¿Está seguro de eliminar la hacienda "${hacienda.name || hacienda.nombre}"? Esta acción no se puede deshacer.`,
    'error',
    'mdi-alert'
  )
  if (!confirmed) return

  try {
    await haciendaManagementStore.deleteHacienda(hacienda.id)
    uiFeedbackStore.showSnackbar('Hacienda eliminada exitosamente', 'success')
    await fetchHaciendas()
  } catch (error) {
    handleError(error, 'Error al eliminar la hacienda')
  }
}

// Exportar a Markdown
async function exportToMarkdown() {
  try {
    const markdown = exportHaciendasToMarkdown(filteredHaciendas.value)
    downloadMarkdown(markdown, 'haciendas.md')
    uiFeedbackStore.showSnackbar(`${filteredHaciendas.value.length} haciendas exportadas`, 'success')
  } catch (error) {
    handleError(error, 'Error al exportar haciendas')
  }
}

function exportHaciendaToMarkdown(hacienda) {
  try {
    const markdown = exportHaciendasToMarkdown([hacienda])
    downloadMarkdown(markdown, `hacienda_${(hacienda.name || hacienda.nombre).replace(/\s+/g, '_')}.md`)
    uiFeedbackStore.showSnackbar('Hacienda exportada', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar hacienda')
  }
}

function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return 'success'
    case 'suspended': return 'warning'
    case 'inactive': return 'error'
    default: return 'grey'
  }
}

function formatStatus(status) {
  switch (status) {
    case 'active': return 'Activa'
    case 'suspended': return 'Suspendida'
    case 'inactive': return 'Inactiva'
    default: return status || 'Desconocido'
  }
}

function getOwnerName(hacienda) {
  const ownerId = hacienda.owner || hacienda.administrador
  if (!ownerId) return 'Sin asignar'
  const user = usersList.value.find(u => u.id === ownerId)
  return user ? user.label : ownerId
}

function getHaciendaUsersCount(haciendaId) {
  return usersList.value.filter(u => u.hacienda === haciendaId).length
}

function getModuleName(id) {
  const mod = modulosList.value.find(m => m.id === id)
  return mod ? (mod.name || mod.nombre) : id
}

function handleError(error, defaultMessage) {
  console.error(defaultMessage, error)
  uiFeedbackStore.showSnackbar(error.message || defaultMessage, 'error')
}
</script>

<style scoped>
.hacienda-card {
  transition: transform 0.2s, box-shadow 0.2s;
}
.hacienda-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}
</style>
