<template>
  <v-container fluid class="admin-exports">
    <h2 class="text-h5 mb-4">Exportaciones de Datos</h2>
    <p class="text-body-1 text-grey mb-6">
      Exporta datos del sistema a formato Markdown para alimentar IAs externas y generar manuales.
    </p>

    <!-- Tarjetas de Exportación -->
    <v-row>
      <!-- Usuarios -->
      <v-col cols="12" md="6" lg="4">
        <v-card hover class="export-card">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon size="40" color="primary" class="mr-3">mdi-account-group</v-icon>
              <h3 class="text-h6">Usuarios</h3>
            </div>
            <p class="text-body-2 text-grey mb-3">
              Exporta todos los usuarios con sus roles, haciendas asignadas y estado.
            </p>
            <v-divider class="my-3" />
            <div class="text-body-2">
              <p><strong>Campos:</strong> Email, nombre, rol, haciendas, estado</p>
              <p><strong>Formato:</strong> Markdown</p>
              <p><strong>Total:</strong> {{ stats.users }}</p>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" variant="tonal" block @click="exportData('users')">
              <v-icon start>mdi-download</v-icon>
              Exportar Usuarios
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Haciendas -->
      <v-col cols="12" md="6" lg="4">
        <v-card hover class="export-card">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon size="40" color="secondary" class="mr-3">mdi-barn</v-icon>
              <h3 class="text-h6">Haciendas</h3>
            </div>
            <p class="text-body-2 text-grey mb-3">
              Exporta todas las haciendas con configuración, planes y módulos activos.
            </p>
            <v-divider class="my-3" />
            <div class="text-body-2">
              <p><strong>Campos:</strong> Nombre, ubicación, plan, módulos, usuarios</p>
              <p><strong>Formato:</strong> Markdown</p>
              <p><strong>Total:</strong> {{ stats.haciendas }}</p>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="secondary" variant="tonal" block @click="exportData('haciendas')">
              <v-icon start>mdi-download</v-icon>
              Exportar Haciendas
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Tipos de Actividades -->
      <v-col cols="12" md="6" lg="4">
        <v-card hover class="export-card">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon size="40" color="primary" class="mr-3">mdi-check-all</v-icon>
              <h3 class="text-h6">Tipos de Actividades</h3>
            </div>
            <p class="text-body-2 text-grey mb-3">
              Exporta catálogo completo de tipos de actividades con métricas BPA.
            </p>
            <v-divider class="my-3" />
            <div class="text-body-2">
              <p><strong>Campos:</strong> Nombre, descripción, categoría, métricas BPA</p>
              <p><strong>Formato:</strong> Markdown</p>
              <p><strong>Total:</strong> {{ stats.actividades }}</p>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" variant="tonal" block @click="exportData('actividades')">
              <v-icon start>mdi-download</v-icon>
              Exportar Actividades
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Tipos de Zonas -->
      <v-col cols="12" md="6" lg="4">
        <v-card hover class="export-card">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon size="40" color="info" class="mr-3">mdi-map-marker</v-icon>
              <h3 class="text-h6">Tipos de Zonas</h3>
            </div>
            <p class="text-body-2 text-grey mb-3">
              Exporta catálogo de tipos de zonas utilizadas en el sistema.
            </p>
            <v-divider class="my-3" />
            <div class="text-body-2">
              <p><strong>Campos:</strong> Nombre, descripción</p>
              <p><strong>Formato:</strong> Markdown</p>
              <p><strong>Total:</strong> {{ stats.zonas }}</p>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="info" variant="tonal" block @click="exportData('zonas')">
              <v-icon start>mdi-download</v-icon>
              Exportar Zonas
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Knowledge Hub Completo -->
      <v-col cols="12" md="6" lg="4">
        <v-card hover class="export-card featured">
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <v-icon size="40" color="purple" class="mr-3">mdi-book-open-page-variant</v-icon>
              <h3 class="text-h6">Knowledge Hub Completo</h3>
            </div>
            <p class="text-body-2 text-grey mb-3">
              Exporta TODO el conocimiento del sistema en un solo archivo Markdown estructurado.
            </p>
            <v-divider class="my-3" />
            <div class="text-body-2">
              <p><strong>Incluye:</strong> Usuarios, haciendas, siembras, actividades, programaciones</p>
              <p><strong>Formato:</strong> Markdown con índice</p>
              <p><strong>Total entidades:</strong> {{ stats.total }}</p>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="purple" variant="tonal" block size="large" @click="exportData('knowledge')">
              <v-icon start>mdi-download</v-icon>
              Exportar Knowledge Hub
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Historial de Exportaciones -->
      <v-col cols="12" lg="12">
        <v-card>
          <v-card-title>
            <v-icon start color="grey">mdi-history</v-icon>
            Historial de Exportaciones
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="historyHeaders"
              :items="exportHistory"
              :items-per-page="5"
              density="compact"
            >
              <template #item.timestamp="{ item }">
                {{ formatTimestamp(item.timestamp) }}
              </template>
              <template #item.size="{ item }">
                {{ formatSize(item.size) }}
              </template>
              <template #item.actions="{ item }">
                <v-btn
                  icon="mdi-download"
                  size="small"
                  variant="text"
                  @click="downloadHistoryItem(item)"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import {
  exportUsersToMarkdown,
  exportHaciendasToMarkdown,
  exportTiposActividadesToMarkdown,
  exportTiposZonasToMarkdown,
  exportKnowledgeHubToMarkdown
} from '@/utils/exporters/markdownExporter'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const uiFeedbackStore = useUiFeedbackStore()

// Estado
const stats = ref({
  users: 0,
  haciendas: 0,
  actividades: 0,
  zonas: 0,
  total: 0
})
const exportHistory = ref([])

// Datos
const users = ref([])
const haciendas = ref([])
const tiposActividades = ref([])
const tiposZonas = ref([])
const siembras = ref([])
const actividades = ref([])
const programaciones = ref([])

// Headers de historial
const historyHeaders = [
  { title: 'Fecha', key: 'timestamp', sortable: true },
  { title: 'Tipo', key: 'type', sortable: true },
  { title: 'Registros', key: 'records', sortable: true },
  { title: 'Tamaño', key: 'size', sortable: true },
  { title: 'Acciones', key: 'actions', align: 'end' }
]

onMounted(async () => {
  await loadData()
  loadExportHistory()
})

// Cargar datos
async function loadData() {
  try {
    const [
      usersData,
      haciendasData,
      actividadesData,
      zonasData,
      siembrasData,
      actividadesRegData,
      programacionesData
    ] = await Promise.all([
      pb.collection('users').getFullList(),
      pb.collection('Haciendas').getFullList(),
      pb.collection('tipo_actividades').getFullList(),
      pb.collection('tipos_zonas').getFullList(),
      pb.collection('siembras').getFullList(),
      pb.collection('actividades').getFullList(),
      pb.collection('programaciones').getFullList()
    ])

    users.value = usersData
    haciendas.value = haciendasData
    tiposActividades.value = actividadesData
    tiposZonas.value = zonasData
    siembras.value = siembrasData
    actividades.value = actividadesRegData
    programaciones.value = programacionesData

    stats.value = {
      users: users.value.length,
      haciendas: haciendas.value.length,
      actividades: tiposActividades.value.length,
      zonas: tiposZonas.value.length,
      total:
        users.value.length +
        haciendas.value.length +
        siembras.value.length +
        actividades.value.length +
        programaciones.value.length
    }
  } catch (error) {
    handleError(error, 'Error al cargar datos')
  }
}

// Exportar datos
async function exportData(type) {
  try {
    let markdown = ''
    let filename = ''
    let records = 0

    switch (type) {
      case 'users':
        markdown = exportUsersToMarkdown(users.value)
        filename = 'usuarios.md'
        records = users.value.length
        break
      case 'haciendas':
        markdown = exportHaciendasToMarkdown(haciendas.value)
        filename = 'haciendas.md'
        records = haciendas.value.length
        break
      case 'actividades':
        markdown = exportTiposActividadesToMarkdown(tiposActividades.value)
        filename = 'tipos_actividades.md'
        records = tiposActividades.value.length
        break
      case 'zonas':
        markdown = exportTiposZonasToMarkdown(tiposZonas.value)
        filename = 'tipos_zonas.md'
        records = tiposZonas.value.length
        break
      case 'knowledge':
        markdown = exportKnowledgeHubToMarkdown({
          usuarios: users.value,
          haciendas: haciendas.value,
          siembras: siembras.value,
          actividades: actividades.value,
          programaciones: programaciones.value
        })
        filename = `knowledge_hub_${new Date().toISOString().split('T')[0]}.md`
        records = stats.value.total
        break
    }

    downloadMarkdown(markdown, filename)
    addToHistory(type, records, markdown.length)
    showSnackbar(`${records} registros exportados`, 'success')
  } catch (error) {
    handleError(error, 'Error al exportar datos')
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

// Agregar al historial
function addToHistory(type, records, size) {
  const exportItem = {
    id: `export_${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: formatType(type),
    records,
    size,
    filename: `${type}_${new Date().toISOString().split('T')[0]}.md`
  }

  exportHistory.value.unshift(exportItem)
  saveExportHistory()
}

// Cargar historial
function loadExportHistory() {
  const saved = localStorage.getItem('exportHistory')
  if (saved) {
    exportHistory.value = JSON.parse(saved)
  }
}

// GUARDAR historial
function saveExportHistory() {
  localStorage.setItem('exportHistory', JSON.stringify(exportHistory.value.slice(0, 20)))
}

// Descargar item del historial
function downloadHistoryItem(item) {
  // En producción, se recuperaría el archivo del servidor
  showSnackbar('Descargando archivo...', 'info')
}

// Utilidades
function formatType(type) {
  const types = {
    users: 'Usuarios',
    haciendas: 'Haciendas',
    actividades: 'Actividades',
    zonas: 'Zonas',
    knowledge: 'Knowledge Hub'
  }
  return types[type] || type
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('es-EC')
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function showSnackbar(message, color = 'success') {
  uiFeedbackStore.showSnackbar(message, color)
}
</script>

<style scoped>
.admin-exports {
  max-width: 1400px;
  margin: 0 auto;
}

.export-card {
  transition: transform 0.2s;
}

.export-card:hover {
  transform: translateY(-4px);
}

.export-card.featured {
  border: 2px solid rgb(var(--v-theme-purple));
}
</style>
