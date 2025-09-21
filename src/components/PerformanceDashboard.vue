<template>
  <div class="performance-dashboard">
    <h2>Métricas de Rendimiento de Sincronización</h2>
    
    <!-- Resumen general -->
    <div class="metrics-summary">
      <div class="metric-card">
        <h3>Operaciones Totales</h3>
        <p class="metric-value">{{ metrics.operationCounts.total }}</p>
        <p class="metric-change" :class="{ positive: operationTrend > 0, negative: operationTrend < 0 }">
          {{ operationTrend > 0 ? '+' : '' }}{{ operationTrend.toFixed(1) }}% (última hora)
        </p>
      </div>
      
      <div class="metric-card">
        <h3>Tasa de Éxito</h3>
        <p class="metric-value">{{ metrics.syncRate.successRate.toFixed(1) }}%</p>
        <p class="metric-status" :class="successRateClass">
          {{ successRateStatus }}
        </p>
      </div>
      
      <div class="metric-card">
        <h3>Cola Actual</h3>
        <p class="metric-value">{{ metrics.queueStats.currentQueueSize }}</p>
        <p class="metric-label">
          Máximo: {{ metrics.queueStats.maxQueueSize }}
        </p>
      </div>
      
      <div class="metric-card">
        <h3>Errores</h3>
        <p class="metric-value">{{ metrics.errors.totalErrors }}</p>
        <p class="metric-label">
          Último: {{ lastErrorTime }}
        </p>
      </div>
    </div>
    
    <!-- Gráficos detallados -->
    <div class="metrics-detail">
      <div class="chart-container">
        <h3>Operaciones por Minuto</h3>
        <div class="chart-placeholder">
          <!-- Aquí iría un gráfico de líneas con Chart.js o similar -->
          <p>Gráfico de operaciones por minuto (última hora)</p>
        </div>
      </div>
      
      <div class="chart-container">
        <h3>Tiempos de Procesamiento</h3>
        <div class="chart-placeholder">
          <!-- Aquí iría un gráfico de barras con tiempos promedio -->
          <p>Gráfico de tiempos de procesamiento por tipo de operación</p>
        </div>
      </div>
    </div>
    
    <!-- Alertas y recomendaciones -->
    <div class="alerts-section" v-if="hasAlerts">
      <h3>Alertas de Rendimiento</h3>
      <div class="alert" v-for="alert in activeAlerts" :key="alert.id" :class="alert.severity">
        <i :class="alert.icon"></i>
        <div class="alert-content">
          <h4>{{ alert.title }}</h4>
          <p>{{ alert.description }}</p>
          <button v-if="alert.action" @click="handleAlertAction(alert.action)">
            {{ alert.actionLabel }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Detalles técnicos -->
    <div class="technical-details">
      <h3>Detalles Técnicos</h3>
      <div class="detail-row">
        <span class="detail-label">Última sincronización:</span>
        <span class="detail-value">{{ lastSyncTime }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Tiempo promedio por operación:</span>
        <span class="detail-value">{{ averageOperationTime }}ms</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Reintentos totales:</span>
        <span class="detail-value">{{ metrics.operationCounts.retried }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Tipos de error más comunes:</span>
        <span class="detail-value">{{ commonErrorTypes }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSyncStore } from '@/stores/syncStore'

const syncStore = useSyncStore()
const metrics = ref({
  operationCounts: {
    total: 0,
    successful: 0,
    failed: 0,
    retried: 0
  },
  timing: {
    totalProcessingTime: 0,
    averageOperationTime: 0,
    lastProcessedAt: null
  },
  queueStats: {
    currentQueueSize: 0,
    maxQueueSize: 0,
    averageQueueSize: 0
  },
  syncRate: {
    operationsPerMinute: 0,
    successRate: 0
  },
  errors: {
    totalErrors: 0,
    errorTypes: {},
    lastError: null
  }
})

const refreshInterval = ref(null)

// Calcular tendencia de operaciones
const operationTrend = computed(() => {
  // Simplificación: calcular tendencia basada en datos históricos
  return 0 // En una implementación real, esto calcularía la tendencia real
})

// Determinar clase de tasa de éxito
const successRateClass = computed(() => {
  const rate = metrics.value.syncRate.successRate
  if (rate >= 95) return 'excellent'
  if (rate >= 90) return 'good'
  if (rate >= 80) return 'warning'
  return 'critical'
})

// Determinar estado de tasa de éxito
const successRateStatus = computed(() => {
  const rate = metrics.value.syncRate.successRate
  if (rate >= 95) return 'Excelente'
  if (rate >= 90) return 'Bueno'
  if (rate >= 80) return 'Advertencia'
  return 'Crítico'
})

// Formatear hora del último error
const lastErrorTime = computed(() => {
  if (!metrics.value.errors.lastError) return 'Ninguno'
  const date = new Date(metrics.value.errors.lastError.timestamp)
  return date.toLocaleTimeString()
})

// Verificar si hay alertas
const hasAlerts = computed(() => {
  return activeAlerts.value.length > 0
})

// Alertas activas
const activeAlerts = computed(() => {
  const alerts = []
  
  // Alerta de tasa de éxito baja
  if (metrics.value.syncRate.successRate < 90) {
    alerts.push({
      id: 'low-success-rate',
      severity: 'warning',
      icon: 'mdi-alert',
      title: 'Tasa de éxito baja',
      description: 'La tasa de éxito de sincronización está por debajo del 90%',
      action: 'view-logs',
      actionLabel: 'Ver registros'
    })
  }
  
  // Alerta de cola grande
  if (metrics.value.queueStats.currentQueueSize > 50) {
    alerts.push({
      id: 'large-queue',
      severity: 'warning',
      icon: 'mdi-queue',
      title: 'Cola de sincronización grande',
      description: `Hay ${metrics.value.queueStats.currentQueueSize} operaciones pendientes`,
      action: 'process-queue',
      actionLabel: 'Procesar ahora'
    })
  }
  
  // Alerta de muchos errores
  if (metrics.value.errors.totalErrors > 10) {
    alerts.push({
      id: 'high-error-count',
      severity: 'critical',
      icon: 'mdi-alert-circle',
      title: 'Alto número de errores',
      description: `Se han registrado ${metrics.value.errors.totalErrors} errores`,
      action: 'clear-errors',
      actionLabel: 'Limpiar errores'
    })
  }
  
  return alerts
})

// Formatear hora de última sincronización
const lastSyncTime = computed(() => {
  if (!metrics.value.timing.lastProcessedAt) return 'Nunca'
  const date = new Date(metrics.value.timing.lastProcessedAt)
  return date.toLocaleTimeString()
})

// Tiempo promedio por operación
const averageOperationTime = computed(() => {
  return metrics.value.timing.averageOperationTime.toFixed(0)
})

// Tipos de error más comunes
const commonErrorTypes = computed(() => {
  const errorTypes = metrics.value.errors.errorTypes
  const entries = Object.entries(errorTypes)
  if (entries.length === 0) return 'Ninguno'
  
  // Ordenar por frecuencia y tomar los 3 más comunes
  entries.sort((a, b) => b[1] - a[1])
  return entries.slice(0, 3).map(([type, count]) => `${type} (${count})`).join(', ')
})

// Actualizar métricas
const updateMetrics = async () => {
  try {
    const newMetrics = syncStore.getPerformanceMetrics()
    metrics.value = newMetrics
  } catch (error) {
    console.error('Error actualizando métricas:', error)
  }
}

// Manejar acción de alerta
const handleAlertAction = (action) => {
  switch (action) {
    case 'view-logs':
      // Navegar a página de registros
      console.log('Ver registros')
      break
    case 'process-queue':
      // Procesar cola de sincronización
      syncStore.processPendingQueue()
      break
    case 'clear-errors':
      // Limpiar errores
      console.log('Limpiar errores')
      break
    default:
      console.warn('Acción de alerta desconocida:', action)
  }
}

// Iniciar actualización automática
onMounted(() => {
  updateMetrics()
  refreshInterval.value = setInterval(updateMetrics, 30000) // Actualizar cada 30 segundos
})

// Limpiar intervalo
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.performance-dashboard {
  padding: 20px;
  font-family: 'Roboto', sans-serif;
}

.metrics-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.metric-card h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #666;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 5px 0;
  color: #333;
}

.metric-change.positive {
  color: #4caf50;
}

.metric-change.negative {
  color: #f44336;
}

.metric-status.excellent {
  color: #4caf50;
}

.metric-status.good {
  color: #8bc34a;
}

.metric-status.warning {
  color: #ff9800;
}

.metric-status.critical {
  color: #f44336;
}

.metric-label {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.metrics-detail {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart-container h3 {
  margin-top: 0;
  color: #333;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  border-radius: 4px;
  color: #999;
}

.alerts-section {
  margin-bottom: 30px;
}

.alerts-section h3 {
  color: #333;
  margin-bottom: 15px;
}

.alert {
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.alert.warning {
  background: #fff3e0;
  border-left: 4px solid #ff9800;
}

.alert.critical {
  background: #ffebee;
  border-left: 4px solid #f44336;
}

.alert i {
  font-size: 24px;
  margin-right: 15px;
}

.alert-content h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.alert-content p {
  margin: 0 0 10px 0;
  color: #666;
}

.alert-content button {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.technical-details {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.technical-details h3 {
  margin-top: 0;
  color: #333;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.detail-label {
  color: #666;
}

.detail-value {
  color: #333;
  font-weight: 500;
}

@media (max-width: 768px) {
  .metrics-summary {
    grid-template-columns: 1fr 1fr;
  }
  
  .metrics-detail {
    grid-template-columns: 1fr;
  }
  
  .detail-row {
    flex-direction: column;
    gap: 5px;
  }
}
</style>