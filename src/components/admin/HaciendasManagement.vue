<template>
  <v-container fluid class="haciendas-management">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">Gestión de Haciendas</h2>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
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
    <v-row>
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
              <h3 class="text-h6">{{ hacienda.name }}</h3>
              <v-chip :color="hacienda.status === 'active' ? 'success' : 'grey'" size="small">
                {{ hacienda.status === 'active' ? 'Activa' : 'Inactiva' }}
              </v-chip>
            </div>

            <p class="text-body-2 text-grey mb-2">{{ hacienda.descripcion || 'Sin descripción' }}</p>

            <v-divider class="my-2" />

            <div class="text-body-2">
              <p><strong>Ubicación:</strong> {{ hacienda.ubicacion || 'N/A' }}</p>
              <p><strong>Plan:</strong> {{ hacienda.plan?.name || 'N/A' }}</p>
              <p>
                <strong>Usuarios:</strong>
                {{ hacienda.users?.length || 0 }}
              </p>
              <p><strong>Creada:</strong> {{ formatDate(hacienda.created) }}</p>
            </div>

            <v-chip-group v-if="hacienda.active_modules?.length" class="mt-2">
              <v-chip
                v-for="module in hacienda.active_modules.slice(0, 3)"
                :key="module"
                size="x-small"
                color="primary"
                variant="outlined"
              >
                {{ formatModule(module) }}
              </v-chip>
              <v-chip v-if="hacienda.active_modules.length > 3" size="x-small">
                +{{ hacienda.active_modules.length - 3 }}
              </v-chip>
            </v-chip-group>
          </v-card-text>

          <v-card-actions>
            <v-btn icon="mdi-eye" size="small" variant="text" @click="viewHacienda(hacienda)" />
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="editHacienda(hacienda)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="confirmDelete(hacienda)"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- No Data -->
    <div v-if="!filteredHaciendas.length && !loading" class="text-center py-8">
      <v-icon size="64" color="grey">mdi-barn-off</v-icon>
      <p class="text-grey mt-2">No se encontraron haciendas</p>
    </div>

    <!-- Loading -->
    <v-overlay v-model="loading" class="align-center justify-center" contained>
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-overlay>

    <!-- Dialog: Crear/Editar Hacienda -->
    <v-dialog v-model="haciendaDialog" max-width="700" persistent>
      <v-card>
        <v-card-title>
          {{ editingHacienda ? 'Editar Hacienda' : 'Nueva Hacienda' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="haciendaForm" v-model="formValid" @submit.prevent="saveHacienda">
            <v-text-field
              v-model="formData.name"
              label="Nombre"
              :rules="[v => !!v || 'Nombre requerido']"
              required
            />
            <v-textarea
              v-model="formData.descripcion"
              label="Descripción"
              rows="3"
              :rules="[v => !!v || 'Descripción requerida']"
              required
            />
            <v-text-field
              v-model="formData.ubicacion"
              label="Ubicación"
              :rules="[v => !!v || 'Ubicación requerida']"
              required
            />
            <v-select
              v-model="formData.plan"
              label="Plan"
              :items="planesList"
              item-title="name"
              item-value="id"
              :rules="[v => !!v || 'Plan requerido']"
              required
            />
            <v-select
              v-model="formData.status"
              label="Estado"
              :items="[
                { title: 'Activa', value: 'active' },
                { title: 'Inactiva', value: 'inactive' }
              ]"
              :rules="[v => !!v || 'Estado requerido']"
              required
            />
            <v-combobox
              v-model="formData.active_modules"
              label="Módulos activos"
              :items="moduleOptions"
              multiple
              chips
              closable-chips
              hint="Presiona Enter para agregar módulos"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="closeDialog">Cancelar</v-btn>
          <v-btn color="primary" :disabled="!formValid" @click="saveHacienda">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Ver Hacienda -->
    <v-dialog v-model="viewDialog" max-width="800">
      <v-card>
        <v-card-title>Detalles de Hacienda</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-list>
                <v-list-item>
                  <v-list-item-title>Nombre</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedHacienda?.name }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Descripción</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedHacienda?.descripcion }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Ubicación</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedHacienda?.ubicacion }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Plan</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedHacienda?.plan?.name || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Estado</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip :color="selectedHacienda?.status === 'active' ? 'success' : 'grey'" size="small">
                      {{ selectedHacienda?.status === 'active' ? 'Activa' : 'Inactiva' }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <v-list>
                <v-list-item>
                  <v-list-item-title>Usuarios</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ selectedHacienda?.users?.length || 0 }} usuarios asignados
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="selectedHacienda?.users?.length">
                  <v-list-item-title>Lista de usuarios</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip-group>
                      <v-chip
                        v-for="user in selectedHacienda.users"
                        :key="user.id"
                        color="primary"
                        size="small"
                      >
                        {{ user.email }}
                      </v-chip>
                    </v-chip-group>
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="selectedHacienda?.active_modules?.length">
                  <v-list-item-title>Módulos activos</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip-group>
                      <v-chip
                        v-for="module in selectedHacienda.active_modules"
                        :key="module"
                        color="secondary"
                        size="small"
                      >
                        {{ formatModule(module) }}
                      </v-chip>
                    </v-chip-group>
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Fecha de creación</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(selectedHacienda?.created) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" variant="text" @click="exportHaciendaToMarkdown(selectedHacienda)">
            Exportar a MD
          </v-btn>
          <v-spacer />
          <v-btn color="grey" @click="viewDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Eliminación -->
    <v-dialog v-model="deleteDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">Confirmar Eliminación</v-card-title>
        <v-card-text>
          ¿Está seguro de eliminar la hacienda <strong>{{ selectedHacienda?.name }}</strong>?
          <v-alert type="warning" class="mt-2" density="compact">
            Esta acción eliminará todos los datos asociados (usuarios, siembras, actividades, etc.)
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" @click="deleteHacienda">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { handleError } from '@/utils/errorHandler'
import { exportHaciendasToMarkdown } from '@/utils/exporters/markdownExporter'
import { formatDate } from '@/utils/formatters'
import { useHaciendaManagementStore } from '@/stores/haciendaManagementStore'
import { usePlanStore } from '@/stores/planStore'

const haciendaManagementStore = useHaciendaManagementStore()
const planStore = usePlanStore()

// Estado
const loading = ref(false)
const haciendas = ref([])
const planes = ref([])
const searchQuery = ref('')
const filterStatus = ref(null)
const haciendaDialog = ref(false)
const viewDialog = ref(false)
const deleteDialog = ref(false)
const editingHacienda = ref(null)
const selectedHacienda = ref(null)
const formValid = ref(false)
const haciendaForm = ref(null)

// Formulario
const formData = ref({
  name: '',
  descripcion: '',
  ubicacion: '',
  plan: null,
  status: 'active',
  active_modules: []
})

// Opciones de módulos
const moduleOptions = [
  'users',
  'haciendas',
  'ai',
  'reports',
  'storage',
  'support',
  'bitacoras_avanzadas',
  'programaciones_inteligentes',
  'alertas_proactivas',
  'auditoria_bpa'
]

// Haciendas filtradas
const filteredHaciendas = computed(() => {
  let result = haciendas.value

  // Filtro por búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(h => h.name?.toLowerCase().includes(query))
  }

  // Filtro por estado
  if (filterStatus.value) {
    result = result.filter(h => h.status === filterStatus.value)
  }

  return result
})

// Lista de planes para el select
const planesList = computed(() => {
  return planes.value.map(p => ({ title: p.name, value: p.id }))
})

// Cargar datos iniciales
onMounted(async () => {
  await Promise.all([fetchHaciendas(), fetchPlanes()])
})

// Obtener haciendas
async function fetchHaciendas() {
  loading.value = true
  try {
    await haciendaManagementStore.fetchHaciendas({ expand: 'plan,users' })
    haciendas.value = haciendaManagementStore.haciendas.map(h => ({
      ...h,
      users: h.expand?.users || [],
      plan: h.expand?.plan || null
    }))
  } catch (error) {
    handleError(error, 'Error al cargar haciendas')
  } finally {
    loading.value = false
  }
}

// Obtener planes
async function fetchPlanes() {
  try {
    await planStore.fetchAvailablePlans()
    planes.value = planStore.availablePlans
  } catch (error) {
    handleError(error, 'Error al cargar planes')
  }
}

// Abrir dialog de creación
function openCreateDialog() {
  editingHacienda.value = null
  formData.value = {
    name: '',
    descripcion: '',
    ubicacion: '',
    plan: null,
    status: 'active',
    active_modules: []
  }
  haciendaForm.value?.reset()
  haciendaDialog.value = true
}

// Editar hacienda
function editHacienda(hacienda) {
  editingHacienda.value = hacienda
  formData.value = {
    name: hacienda.name,
    descripcion: hacienda.descripcion || '',
    ubicacion: hacienda.ubicacion || '',
    plan: hacienda.plan?.id || null,
    status: hacienda.status || 'active',
    active_modules: hacienda.active_modules || []
  }
  haciendaDialog.value = true
}

// Ver hacienda
function viewHacienda(hacienda) {
  selectedHacienda.value = hacienda
  viewDialog.value = true
}

// Confirmar eliminación
function confirmDelete(hacienda) {
  selectedHacienda.value = hacienda
  deleteDialog.value = true
}

// Guardar hacienda
async function saveHacienda() {
  const valid = await haciendaForm.value?.validate()
  if (!valid?.valid) return

  loading.value = true
  try {
    const data = {
      name: formData.value.name,
      descripcion: formData.value.descripcion,
      ubicacion: formData.value.ubicacion,
      plan: formData.value.plan,
      status: formData.value.status,
      active_modules: formData.value.active_modules
    }

    if (editingHacienda.value) {
      await haciendaManagementStore.updateHacienda(editingHacienda.value.id, data)
      showSnackbar('Hacienda actualizada correctamente', 'success')
    } else {
      await haciendaManagementStore.createHacienda(data)
      showSnackbar('Hacienda creada correctamente', 'success')
    }

    closeDialog()
    await fetchHaciendas()
  } catch (error) {
    handleError(error, editingHacienda.value ? 'Error al actualizar hacienda' : 'Error al crear hacienda')
  } finally {
    loading.value = false
  }
}

// Eliminar hacienda
async function deleteHacienda() {
  loading.value = true
  try {
    await haciendaManagementStore.deleteHacienda(selectedHacienda.value.id)
    showSnackbar('Hacienda eliminada correctamente', 'success')
    deleteDialog.value = false
    selectedHacienda.value = null
    await fetchHaciendas()
  } catch (error) {
    handleError(error, 'Error al eliminar hacienda')
  } finally {
    loading.value = false
  }
}

// Cerrar dialog
function closeDialog() {
  haciendaDialog.value = false
  editingHacienda.value = null
  formData.value = {}
}

// Exportar a Markdown
async function exportToMarkdown() {
  try {
    const markdown = exportHaciendasToMarkdown(filteredHaciendas.value)
    downloadMarkdown(markdown, 'haciendas.md')
    showSnackbar(`${filteredHaciendas.value.length} haciendas exportadas`, 'success')
  } catch (error) {
    handleError(error, 'Error al exportar haciendas')
  }
}

// Exportar hacienda individual
function exportHaciendaToMarkdown(hacienda) {
  try {
    const markdown = exportHaciendasToMarkdown([hacienda])
    downloadMarkdown(markdown, `hacienda_${hacienda.name.replace(/\s+/g, '_')}.md`)
    showSnackbar('Hacienda exportada', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar hacienda')
  }
}

// Descargar archivo MD
function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Utilidades
function formatModule(module) {
  const names = {
    users: 'Usuarios',
    haciendas: 'Haciendas',
    ai: 'IA Assistant',
    reports: 'Reportes',
    storage: 'Almacenamiento',
    support: 'Soporte',
    bitacoras_avanzadas: 'Bitácoras Avanzadas',
    programaciones_inteligentes: 'Programaciones Inteligentes',
    alertas_proactivas: 'Alertas Proactivas',
    auditoria_bpa: 'Auditoría BPA'
  }
  return names[module] || module
}


function showSnackbar(message) {
  // El uiFeedbackStore ya está integrado en el store
  console.log(message)
}
</script>

<style scoped>
.haciendas-management {
  max-width: 1400px;
  margin: 0 auto;
}

.hacienda-card {
  transition: transform 0.2s;
}

.hacienda-card:hover {
  transform: translateY(-2px);
}
</style>
