<template>
  <div class="report-countdown-clock">
    <!-- Reloj countdown -->
    <v-chip
      :color="clockColor"
      :variant="isDue ? 'elevated' : 'outlined'"
      size="small"
      class="countdown-chip"
    >
      <v-icon start :icon="clockIcon" size="small" />
      <span class="countdown-text">{{ displayText }}</span>
    </v-chip>

    <!-- Detalles en tooltip -->
    <v-tooltip v-if="report" bottom>
      <template #activator="{ props }">
        <v-icon
          v-bind="props"
          size="small"
          color="grey"
          class="ml-1"
        >
          mdi-information
        </v-icon>
      </template>
      <div class="tooltip-content">
        <div><strong>Próxima ejecución:</strong> {{ formattedNextExecution }}</div>
        <div v-if="report.frequency"><strong>Frecuencia:</strong> {{ frequencyText }}</div>
        <div v-if="report.lastExecuted"><strong>Última ejecución:</strong> {{ formattedLastExecution }}</div>
      </div>
    </v-tooltip>

    <!-- Indicador de ejecución inmediata -->
    <v-chip
      v-if="isDue"
      color="warning"
      size="small"
      class="ml-2"
    >
      Pendiente
    </v-chip>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  report: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'small'
  }
})

// Funciones de tiempo (reemplazo de useReportScheduler)
const getTimeUntilExecution = (report) => {
  if (!report?.nextExecution) return null
  const now = new Date()
  const next = new Date(report.nextExecution)
  const diffMs = next - now
  const isDue = diffMs <= 0
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000)
  const hours = Math.floor(diffSecs / 3600)
  const minutes = Math.floor((diffSecs % 3600) / 60)
  return { isDue, hours, minutes, totalMs: diffMs }
}

const formatTimeRemaining = (timeData) => {
  if (!timeData) return 'No programado'
  if (timeData.isDue) return 'Ahora'
  if (timeData.hours > 24) {
    const days = Math.floor(timeData.hours / 24)
    return `${days}d ${timeData.hours % 24}h`
  }
  if (timeData.hours > 0) return `${timeData.hours}h ${timeData.minutes}m`
  return `${timeData.minutes}m`
}

const timeLeft = ref(null)
let countdownInterval = null

const updateTimeLeft = () => {
  if (!props.report?.nextExecution) {
    timeLeft.value = null
    return
  }
  timeLeft.value = getTimeUntilExecution(props.report)
}

const clockColor = computed(() => {
  if (!timeLeft.value) return 'grey'
  if (timeLeft.value.isDue) return 'warning'
  if (timeLeft.value.hours < 1) return 'orange'
  if (timeLeft.value.hours < 6) return 'info'
  return 'success'
})

// Icono según estado
const clockIcon = computed(() => {
  if (!timeLeft.value) return 'mdi-clock-outline'
  if (timeLeft.value.isDue) return 'mdi-clock-alert'
  if (timeLeft.value.hours < 1) return 'mdi-clock-fast'
  return 'mdi-clock'
})

// Texto a mostrar
const displayText = computed(() => {
  if (!timeLeft.value) return 'No programado'
  return formatTimeRemaining(timeLeft.value)
})

const isDue = computed(() => {
  return timeLeft.value?.isDue || false
})

// Fecha formateada
const formattedNextExecution = computed(() => {
  if (!props.report?.nextExecution) return '-'
  return new Date(props.report.nextExecution).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
})

const formattedLastExecution = computed(() => {
  if (!props.report?.lastExecuted) return '-'
  return new Date(props.report.lastExecuted).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
})

const frequencyText = computed(() => {
  const freqMap = {
    'daily': 'Diario',
    'weekly': 'Semanal',
    'monthly': 'Mensual'
  }
  return freqMap[props.report?.frequency] || props.report?.frequency || '-'
})

// Actualizar cada segundo
onMounted(() => {
  updateTimeLeft()
  countdownInterval = setInterval(updateTimeLeft, 1000)
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<style scoped>
.report-countdown-clock {
  display: inline-flex;
  align-items: center;
}

.countdown-chip {
  font-family: 'Roboto Mono', monospace;
  font-weight: 500;
  min-width: 80px;
  justify-content: center;
}

.countdown-text {
  font-size: 0.875rem;
}

.tooltip-content {
  font-size: 0.875rem;
  line-height: 1.5;
}

.tooltip-content div {
  margin-bottom: 4px;
}

.tooltip-content div:last-child {
  margin-bottom: 0;
}
</style>
