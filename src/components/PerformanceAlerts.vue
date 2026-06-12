<template>
  <div v-if="activeAlerts.length > 0" class="fixed top-5 right-5 z-[10000] max-w-[400px] w-[calc(100%-2.5rem)] flex flex-col gap-3">
    <transition-group name="scroll-x-reverse-transition">
      <v-alert
        v-for="alert in activeAlerts"
        :key="alert.type"
        :type="alert.severity.toLowerCase() === 'critical' ? 'error' : 'warning'"
        variant="flat"
        class="rounded-lg elevation-4 blur-bg"
        border="start"
        closable
        @click:close="dismissAlert(alert)"
      >
        <template v-slot:prepend>
          <v-icon :icon="getAlertIcon(alert.type)" size="24"></v-icon>
        </template>

        <div class="flex flex-col gap-1">
          <span class="text-md font-weight-bold">{{ alert.message }}</span>
          <span class="text-xs opacity-90">
            Actual: {{ formatAlertValue(alert.currentValue) }} | 
            Umbral: {{ formatAlertValue(alert.threshold) }}
          </span>
          <v-btn
            size="x-small"
            variant="tonal"
            class="mt-2 align-self-start"
            @click="handleAlertAction(alert)"
          >
            {{ getActionButtonText(alert.type) }}
          </v-btn>
        </div>
      </v-alert>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSyncStore } from '@/stores/sync'

const syncStore = useSyncStore()
const dismissedAlerts = ref(new Set())
const refreshInterval = ref(null)

const activeAlerts = computed(() => {
  const allAlerts = syncStore.checkPerformanceAlerts()
  return allAlerts.filter(alert => !dismissedAlerts.value.has(alert.type))
})

const getAlertIcon = (type) => {
  const icons = {
    LOW_SUCCESS_RATE: 'mdi-alert-circle-outline',
    LARGE_QUEUE: 'mdi-queue',
    HIGH_ERROR_COUNT: 'mdi-alert-octagon-outline'
  }
  return icons[type] || 'mdi-alert'
}

const formatAlertValue = (value) => {
  if (typeof value === 'number') {
    return value % 1 === 0 ? value.toString() : value.toFixed(1)
  }
  return value
}

const getActionButtonText = (type) => {
  const texts = {
    LOW_SUCCESS_RATE: 'Ver detalles',
    LARGE_QUEUE: 'Procesar cola',
    HIGH_ERROR_COUNT: 'Limpiar errores'
  }
  return texts[type] || 'Acción'
}

const handleAlertAction = (alert) => {
  switch (alert.type) {
    case 'LOW_SUCCESS_RATE': console.log('Ver detalles'); break
    case 'LARGE_QUEUE': syncStore.processPendingQueue(); break
    case 'HIGH_ERROR_COUNT': syncStore.errors = []; break
  }
}

const dismissAlert = (alert) => {
  dismissedAlerts.value.add(alert.type)
  setTimeout(() => dismissedAlerts.value.delete(alert.type), 3600000)
}

const refreshAlerts = () => syncStore.getPerformanceMetrics()

onMounted(() => {
  refreshInterval.value = setInterval(refreshAlerts, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})
</script>

<style scoped>
.blur-bg {
  backdrop-filter: blur(8px);
  background-color: rgba(var(--v-theme-surface), 0.9) !important;
}

.v-alert--type-error.blur-bg {
  background-color: rgba(var(--v-theme-error), 0.9) !important;
}

.v-alert--type-warning.blur-bg {
  background-color: rgba(var(--v-theme-warning), 0.9) !important;
}
</style>