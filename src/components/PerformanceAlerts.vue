<template>
  <div class="performance-alerts" v-if="activeAlerts.length > 0">
    <div 
      v-for="alert in activeAlerts" 
      :key="alert.type"
      class="alert"
      :class="[alert.severity.toLowerCase()]"
    >
      <div class="alert-icon">
        <i :class="getAlertIcon(alert.type)"></i>
      </div>
      <div class="alert-content">
        <h4>{{ alert.message }}</h4>
        <p class="alert-details">
          Valor actual: {{ formatAlertValue(alert.currentValue) }} | 
          Umbral: {{ formatAlertValue(alert.threshold) }}
        </p>
      </div>
      <div class="alert-actions">
        <button @click="handleAlertAction(alert)" class="action-button">
          {{ getActionButtonText(alert.type) }}
        </button>
        <button @click="dismissAlert(alert)" class="dismiss-button">
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSyncStore } from '@/stores/syncStore'

const syncStore = useSyncStore()
const dismissedAlerts = ref(new Set())
const refreshInterval = ref(null)

// Alertas activas (excluyendo las descartadas)
const activeAlerts = computed(() => {
  const allAlerts = syncStore.checkPerformanceAlerts()
  return allAlerts.filter(alert => !dismissedAlerts.value.has(alert.type))
})

// Obtener ícono según tipo de alerta
const getAlertIcon = (type) => {
  const icons = {
    LOW_SUCCESS_RATE: 'mdi-alert-circle-outline',
    LARGE_QUEUE: 'mdi-queue',
    HIGH_ERROR_COUNT: 'mdi-alert-octagon-outline'
  }
  return icons[type] || 'mdi-alert'
}

// Formatear valor de alerta para mostrar
const formatAlertValue = (value) => {
  if (typeof value === 'number') {
    if (value % 1 === 0) {
      return value.toString()
    }
    return value.toFixed(1)
  }
  return value
}

// Obtener texto del botón de acción según tipo de alerta
const getActionButtonText = (type) => {
  const texts = {
    LOW_SUCCESS_RATE: 'Ver detalles',
    LARGE_QUEUE: 'Procesar cola',
    HIGH_ERROR_COUNT: 'Limpiar errores'
  }
  return texts[type] || 'Acción'
}

// Manejar acción de alerta
const handleAlertAction = (alert) => {
  switch (alert.type) {
    case 'LOW_SUCCESS_RATE':
      // Navegar a página de métricas o logs
      console.log('Ver detalles de tasa de éxito baja')
      break
    case 'LARGE_QUEUE':
      // Procesar cola de sincronización
      syncStore.processPendingQueue()
      break
    case 'HIGH_ERROR_COUNT':
      // Limpiar errores
      syncStore.errors = []
      console.log('Errores limpiados')
      break
    default:
      console.warn('Acción de alerta desconocida:', alert.type)
  }
}

// Descartar alerta
const dismissAlert = (alert) => {
  dismissedAlerts.value.add(alert.type)
  // Auto-limpiar alertas descartadas después de 1 hora
  setTimeout(() => {
    dismissedAlerts.value.delete(alert.type)
  }, 60 * 60 * 1000)
}

// Refrescar alertas periódicamente
const refreshAlerts = () => {
  // Forzar actualización reactiva
  syncStore.getPerformanceMetrics()
}

// Iniciar actualización automática
onMounted(() => {
  refreshInterval.value = setInterval(refreshAlerts, 30000) // Cada 30 segundos
})

// Limpiar intervalo
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.performance-alerts {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 400px;
}

.alert {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: slideIn 0.3s ease-out;
  backdrop-filter: blur(10px);
}

.alert.warning {
  background: rgba(255, 152, 0, 0.9);
  border: 1px solid rgba(255, 152, 0, 0.5);
  color: white;
}

.alert.critical {
  background: rgba(244, 67, 54, 0.9);
  border: 1px solid rgba(244, 67, 54, 0.5);
  color: white;
}

.alert-icon {
  margin-right: 15px;
  font-size: 24px;
}

.alert-content {
  flex: 1;
}

.alert-content h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 500;
}

.alert-details {
  margin: 0;
  font-size: 12px;
  opacity: 0.9;
}

.alert-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 15px;
}

.action-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.dismiss-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.dismiss-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .performance-alerts {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .alert {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .alert-icon {
    margin-right: 0;
    margin-bottom: 10px;
  }
  
  .alert-actions {
    margin-left: 0;
    margin-top: 10px;
    align-self: flex-end;
  }
}
</style>