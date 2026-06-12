<template>
  <v-container fluid class="pa-4 pa-sm-6">
    <div class="flex items-center mb-6">
      <v-icon color="primary" class="mr-3">mdi-chart-line</v-icon>
      <h3 class="text-h4 font-weight-bold">Rendimiento de Sincronización</h3>
    </div>
    
    <!-- Resumen general -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 text-center rounded-lg" elevation="2">
          <div class="text-overline text-grey-darken-1 mb-1">Operaciones Totales</div>
          <div class="text-h3 font-weight-bold mb-2">{{ metrics.operationCounts.total }}</div>
          <div class="text-xs font-weight-bold" :class="operationTrend > 0 ? 'text-primary' : 'text-error'">
            <v-icon start size="14">{{ operationTrend > 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
            {{ operationTrend > 0 ? '+' : '' }}{{ operationTrend.toFixed(1) }}% <span class="text-grey">(1h)</span>
          </div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 text-center rounded-lg" elevation="2">
          <div class="text-overline text-grey-darken-1 mb-1">Tasa de Éxito</div>
          <div class="text-h3 font-weight-bold mb-2" :class="`text-${successRateColor}`">
            {{ metrics.syncRate.successRate.toFixed(1) }}%
          </div>
          <v-chip :color="successRateColor" size="x-small" variant="flat" class="font-weight-bold">
            {{ successRateStatus }}
          </v-chip>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 text-center rounded-lg" elevation="2">
          <div class="text-overline text-grey-darken-1 mb-1">Cola Actual</div>
          <div class="text-h3 font-weight-bold mb-2">{{ metrics.queueStats.currentQueueSize }}</div>
          <div class="text-xs text-grey">
            Máximo histórico: {{ metrics.queueStats.maxQueueSize }}
          </div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" lg="3">
        <v-card class="pa-4 text-center rounded-lg" elevation="2">
          <div class="text-overline text-grey-darken-1 mb-1">Errores</div>
          <div class="text-h3 font-weight-bold mb-2 text-error">{{ metrics.errors.totalErrors }}</div>
          <div class="text-xs text-grey truncate">
            Último: {{ lastErrorTime }}
          </div>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Gráficos detallados -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-card class="pa-4 h-full rounded-lg" elevation="2">
          <div class="text-h6 font-weight-bold mb-4">Operaciones por Minuto</div>
          <div class="flex items-center justify-center bg-grey-lighten-4 rounded-lg h-48 border-dashed border-2 border-grey">
            <p class="text-grey">Visualización temporal activa</p>
          </div>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card class="pa-4 h-full rounded-lg" elevation="2">
          <div class="text-h6 font-weight-bold mb-4">Procesamiento por Tipo</div>
          <div class="flex items-center justify-center bg-grey-lighten-4 rounded-lg h-48 border-dashed border-2 border-grey">
            <p class="text-grey">Distribución de carga</p>
          </div>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Alertas y recomendaciones -->
    <div v-if="hasAlerts" class="mb-6">
      <h3 class="text-h6 font-weight-bold mb-3">Alertas de Rendimiento</h3>
      <div class="grid grid-cols-1 gap-3">
        <v-alert
          v-for="alert in activeAlerts"
          :key="alert.id"
          :type="alert.severity === 'critical' ? 'error' : 'warning'"
          variant="tonal"
          class="rounded-lg"
          border="start"
        >
          <template v-slot:title>
            <span class="font-weight-bold">{{ alert.title }}</span>
          </template>
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span>{{ alert.description }}</span>
            <v-btn
              v-if="alert.action"
              size="small"
              variant="flat"
              :color="alert.severity === 'critical' ? 'error' : 'warning'"
              @click="handleAlertAction(alert.action)"
            >
              {{ alert.actionLabel }}
            </v-btn>
          </div>
        </v-alert>
      </div>
    </div>
    
    <!-- Detalles técnicos -->
    <v-card class="pa-4 rounded-lg" elevation="2">
      <h3 class="text-h6 font-weight-bold mb-4">Métricas Técnicas</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        <div class="flex justify-between py-2 border-b border-grey-lighten-3">
          <span class="text-grey-darken-1 text-md">Última sincronización</span>
          <span class="font-weight-medium">{{ lastSyncTime }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-grey-lighten-3">
          <span class="text-grey-darken-1 text-md">Tiempo promedio / op</span>
          <span class="font-weight-medium">{{ averageOperationTime }}ms</span>
        </div>
        <div class="flex justify-between py-2 border-b border-grey-lighten-3">
          <span class="text-grey-darken-1 text-md">Reintentos totales</span>
          <span class="font-weight-medium">{{ metrics.operationCounts.retried }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-grey-lighten-3">
          <span class="text-grey-darken-1 text-md">Tipos de error comunes</span>
          <span class="font-weight-medium truncate ml-4" :title="commonErrorTypes">{{ commonErrorTypes }}</span>
        </div>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSyncStore } from '@/stores/sync'

const syncStore = useSyncStore()
const metrics = ref({
  operationCounts: { total: 0, successful: 0, failed: 0, retried: 0 },
  timing: { totalProcessingTime: 0, averageOperationTime: 0, lastProcessedAt: null },
  queueStats: { currentQueueSize: 0, maxQueueSize: 0, averageQueueSize: 0 },
  syncRate: { operationsPerMinute: 0, successRate: 0 },
  errors: { totalErrors: 0, errorTypes: {}, lastError: null }
})

const refreshInterval = ref(null)

const operationTrend = computed(() => 0)

const successRateColor = computed(() => {
  const rate = metrics.value.syncRate.successRate
  if (rate >= 95) return 'success'
  if (rate >= 90) return 'info'
  if (rate >= 80) return 'warning'
  return 'error'
})

const successRateStatus = computed(() => {
  const rate = metrics.value.syncRate.successRate
  if (rate >= 95) return 'Excelente'
  if (rate >= 90) return 'Bueno'
  if (rate >= 80) return 'Advertencia'
  return 'Crítico'
})

const lastErrorTime = computed(() => {
  if (!metrics.value.errors.lastError) return 'Ninguno'
  const date = new Date(metrics.value.errors.lastError.timestamp)
  return date.toLocaleTimeString()
})

const hasAlerts = computed(() => activeAlerts.value.length > 0)

const activeAlerts = computed(() => {
  const alerts = []
  if (metrics.value.syncRate.successRate < 90) {
    alerts.push({
      id: 'low-success-rate', severity: 'warning', icon: 'mdi-alert',
      title: 'Tasa de éxito baja', description: 'La tasa de éxito está por debajo del 90%',
      action: 'view-logs', actionLabel: 'Ver registros'
    })
  }
  if (metrics.value.queueStats.currentQueueSize > 50) {
    alerts.push({
      id: 'large-queue', severity: 'warning', icon: 'mdi-queue',
      title: 'Cola saturada', description: `Hay ${metrics.value.queueStats.currentQueueSize} operaciones pendientes`,
      action: 'process-queue', actionLabel: 'Procesar'
    })
  }
  if (metrics.value.errors.totalErrors > 10) {
    alerts.push({
      id: 'high-error-count', severity: 'critical', icon: 'mdi-alert-circle',
      title: 'Muchos errores', description: `Se han registrado ${metrics.value.errors.totalErrors} errores`,
      action: 'clear-errors', actionLabel: 'Limpiar'
    })
  }
  return alerts
})

const lastSyncTime = computed(() => {
  if (!metrics.value.timing.lastProcessedAt) return 'Nunca'
  return new Date(metrics.value.timing.lastProcessedAt).toLocaleTimeString()
})

const averageOperationTime = computed(() => metrics.value.timing.averageOperationTime.toFixed(0))

const commonErrorTypes = computed(() => {
  const entries = Object.entries(metrics.value.errors.errorTypes)
  if (entries.length === 0) return 'Ninguno'
  entries.sort((a, b) => b[1] - a[1])
  return entries.slice(0, 3).map(([type, count]) => `${type} (${count})`).join(', ')
})

const updateMetrics = async () => {
  try {
    metrics.value = syncStore.getPerformanceMetrics()
  } catch (error) {
    console.error('Error actualizando métricas:', error)
  }
}

const handleAlertAction = (action) => {
  switch (action) {
    case 'view-logs': console.log('Ver registros'); break
    case 'process-queue': syncStore.processPendingQueue(); break
    case 'clear-errors': console.log('Limpiar errores'); break
  }
}

onMounted(() => {
  updateMetrics()
  refreshInterval.value = setInterval(updateMetrics, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})
</script>

<style scoped>
/* Scoped styles removed in favor of Vuetify/Tailwind utility classes */
</style>