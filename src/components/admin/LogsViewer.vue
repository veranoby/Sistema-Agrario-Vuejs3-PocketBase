<template>
  <v-container fluid class="logs-viewer">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">Visor de Logs del Sistema</h2>
      <div>
        <v-btn
          color="secondary"
          prepend-icon="mdi-download"
          class="mr-2"
          @click="exportLogsToCSV"
        >
          Exportar CSV
        </v-btn>
        <v-btn
          color="error"
          prepend-icon="mdi-delete"
          variant="outlined"
          @click="clearLogs"
        >
          Limpiar Logs
        </v-btn>
      </div>
    </div>

    <!-- Filtros -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.level"
              label="Nivel de Log"
              :items="logLevels"
              multiple
              chips
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.user"
              label="Filtrar por usuario"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.search"
              label="Buscar en mensaje"
              prepend-icon="mdi-magnify"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn color="primary" block @click="applyFilters">
              <v-icon start>mdi-filter</v-icon>
              Aplicar Filtros
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.startDate"
              label="Fecha inicio"
              type="datetime-local"
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.endDate"
              label="Fecha fin"
              type="datetime-local"
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-switch
              v-model="autoRefresh"
              label="Auto-refresh (5s)"
              color="primary"
              hide-details
              class="ml-auto"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Estadísticas -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card color="blue-grey-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ totalLogs }}</div>
            <div class="text-subtitle-2 text-grey">Total Logs</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4 text-green">{{ infoCount }}</div>
            <div class="text-subtitle-2 text-grey">INFO</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4 text-orange">{{ warningCount }}</div>
            <div class="text-subtitle-2 text-grey">WARNING</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="red-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4 text-red">{{ errorCount }}</div>
            <div class="text-subtitle-2 text-grey">ERROR</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabla de Logs -->
    <v-card>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="filteredLogs"
          :loading="loading"
          :items-per-page="20"
          :sort-by="[{ key: 'timestamp', order: 'desc' }]"
          hover
        >
          <!-- Level Badge -->
          <template #item.level="{ item }">
            <v-chip
              :color="getLevelColor(item.level)"
              size="small"
              label
              :prepend-icon="getLevelIcon(item.level)"
            >
              {{ item.level }}
            </v-chip>
          </template>

          <!-- Timestamp -->
          <template #item.timestamp="{ item }">
            <div class="text-no-wrap">
              {{ formatTimestamp(item.timestamp) }}
            </div>
          </template>

          <!-- Message -->
          <template #item.message="{ item }">
            <div class="text-truncate" style="max-width: 400px">
              {{ item.message }}
            </div>
          </template>

          <!-- Metadata -->
          <template #item.metadata="{ item }">
            <v-btn
              icon="mdi-information"
              size="x-small"
              variant="text"
              @click="showMetadata(item)"
            />
          </template>

          <!-- Expand Row -->
          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length">
                <v-card flat class="ma-2 pa-4 bg-grey-lighten-5">
                  <v-row>
                    <v-col cols="12" md="6">
                      <strong>Usuario:</strong> {{ item.user || 'N/A' }}<br />
                      <strong>Módulo:</strong> {{ item.module || 'N/A' }}<br />
                      <strong>Acción:</strong> {{ item.action || 'N/A' }}
                    </v-col>
                    <v-col cols="12" md="6">
                      <strong>IP:</strong> {{ item.ip || 'N/A' }}<br />
                      <strong>User Agent:</strong> {{ item.userAgent || 'N/A' }}<br />
                      <strong>Stack Trace:</strong>
                      <pre class="text-body-2">{{ item.stack || 'N/A' }}</pre>
                    </v-col>
                  </v-row>
                </v-card>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Dialog: Ver Metadata -->
    <v-dialog v-model="metadataDialog" max-width="600">
      <v-card>
        <v-card-title>Detalles del Log</v-card-title>
        <v-card-text>
          <v-list v-if="selectedLog">
            <v-list-item>
              <v-list-item-title>Nivel</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getLevelColor(selectedLog.level)" size="small">
                  {{ selectedLog.level }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Mensaje</v-list-item-title>
              <v-list-item-subtitle>{{ selectedLog.message }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Timestamp</v-list-item-title>
              <v-list-item-subtitle>{{ formatTimestamp(selectedLog.timestamp) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLog.user">
              <v-list-item-title>Usuario</v-list-item-title>
              <v-list-item-subtitle>{{ selectedLog.user }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLog.module">
              <v-list-item-title>Módulo</v-list-item-title>
              <v-list-item-subtitle>{{ selectedLog.module }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLog.action">
              <v-list-item-title>Acción</v-list-item-title>
              <v-list-item-subtitle>{{ selectedLog.action }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLog.metadata">
              <v-list-item-title>Metadata</v-list-item-title>
              <v-list-item-subtitle>
                <pre class="bg-grey-lighten-4 pa-2 rounded">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" @click="metadataDialog = false">Cerrar</v-btn>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from '@/stores/snackbarStore'

const snackbarStore = useSnackbarStore()

// Estado
const loading = ref(false)
const logs = ref([])
const autoRefresh = ref(false)
const metadataDialog = ref(false)
const selectedLog = ref(null)
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')

// Filtros
const filters = ref({
  level: [],
  user: '',
  search: '',
  startDate: '',
  endDate: ''
})

// Niveles de log
const logLevels = [
  { title: 'INFO', value: 'INFO' },
  { title: 'WARNING', value: 'WARNING' },
  { title: 'ERROR', value: 'ERROR' },
  { title: 'DEBUG', value: 'DEBUG' }
]

// Headers de tabla
const headers = [
  { title: 'Nivel', key: 'level', sortable: true, width: 120 },
  { title: 'Fecha', key: 'timestamp', sortable: true, width: 180 },
  { title: 'Usuario', key: 'user', sortable: true, width: 150 },
  { title: 'Módulo', key: 'module', sortable: true, width: 120 },
  { title: 'Mensaje', key: 'message', sortable: false },
  { title: 'Detalles', key: 'metadata', sortable: false, width: 80 }
]

// Logs filtrados
const filteredLogs = computed(() => {
  let result = logs.value

  // Filtro por nivel
  if (filters.value.level?.length) {
    result = result.filter(log => filters.value.level.includes(log.level))
  }

  // Filtro por usuario
  if (filters.value.user) {
    result = result.filter(log =>
      log.user?.toLowerCase().includes(filters.value.user.toLowerCase())
    )
  }

  // Filtro por búsqueda
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(log =>
      log.message?.toLowerCase().includes(search) ||
      log.module?.toLowerCase().includes(search) ||
      log.action?.toLowerCase().includes(search)
    )
  }

  // Filtro por fecha
  if (filters.value.startDate) {
    const startDate = new Date(filters.value.startDate)
    result = result.filter(log => new Date(log.timestamp) >= startDate)
  }
  if (filters.value.endDate) {
    const endDate = new Date(filters.value.endDate)
    result = result.filter(log => new Date(log.timestamp) <= endDate)
  }

  return result
})

// Estadísticas
const totalLogs = computed(() => logs.value.length)
const infoCount = computed(() => logs.value.filter(l => l.level === 'INFO').length)
const warningCount = computed(() => logs.value.filter(l => l.level === 'WARNING').length)
const errorCount = computed(() => logs.value.filter(l => l.level === 'ERROR').length)

// Auto-refresh interval
let refreshInterval = null

onMounted(async () => {
  await fetchLogs()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Obtener logs
async function fetchLogs() {
  loading.value = true
  try {
    // En producción, esto vendría de una API endpoint
    // Por ahora usamos datos mock
    logs.value = generateMockLogs()
  } catch (error) {
    handleError(error, 'Error al cargar logs')
  } finally {
    loading.value = false
  }
}

// Aplicar filtros
function applyFilters() {
  fetchLogs()
  showSnackbar('Filtros aplicados', 'success')
}

// Mostrar metadata
function showMetadata(log) {
  selectedLog.value = log
  metadataDialog.value = true
}

// Exportar a CSV
function exportLogsToCSV() {
  try {
    const headers = ['Timestamp', 'Level', 'User', 'Module', 'Action', 'Message']
    const rows = filteredLogs.value.map(log => [
      log.timestamp,
      log.level,
      log.user || '',
      log.module || '',
      log.action || '',
      `"${log.message?.replace(/"/g, '""')}"`
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    downloadFile(csv, `logs_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    showSnackbar(`${filteredLogs.value.length} logs exportados`, 'success')
  } catch (error) {
    handleError(error, 'Error al exportar logs')
  }
}

// Limpiar logs
async function clearLogs() {
  try {
    logs.value = []
    showSnackbar('Logs limpiados', 'success')
  } catch (error) {
    handleError(error, 'Error al limpiar logs')
  }
}

// Auto-refresh
function startAutoRefresh() {
  refreshInterval = setInterval(() => {
    if (autoRefresh.value) {
      fetchLogs()
    }
  }, 5000)
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Utilidades
function getLevelColor(level) {
  const colors = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    DEBUG: 'grey'
  }
  return colors[level] || 'grey'
}

function getLevelIcon(level) {
  const icons = {
    INFO: 'mdi-information',
    WARNING: 'mdi-alert',
    ERROR: 'mdi-close-circle',
    DEBUG: 'mdi-bug'
  }
  return icons[level] || 'mdi-file'
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

// Mock logs generator (para demo)
function generateMockLogs() {
  const levels = ['INFO', 'WARNING', 'ERROR', 'DEBUG']
  const modules = ['auth', 'haciendas', 'siembras', 'actividades', 'sync', 'cache']
  const actions = ['create', 'update', 'delete', 'login', 'logout', 'sync', 'export']
  const messages = [
    'Usuario autenticado exitosamente',
    'Error al sincronizar datos',
    'Cache miss para key:',
    'Hacienda creada correctamente',
    'Advertencia: Cola de sincronización llena',
    'Error de conexión con PocketBase',
    'Backup completado',
    'Exportación a PDF generada'
  ]

  return Array.from({ length: 50 }, (_, i) => ({
    id: `log_${i}`,
    level: levels[Math.floor(Math.random() * levels.length)],
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    user: `usuario${Math.floor(Math.random() * 10)}@example.com`,
    module: modules[Math.floor(Math.random() * modules.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    metadata: { requestId: `req_${i}`, duration: Math.floor(Math.random() * 1000) },
    ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0',
    stack: Math.random() > 0.8 ? 'Error: Something went wrong\n    at file.js:123' : null
  }))
}
</script>

<style scoped>
.logs-viewer {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
