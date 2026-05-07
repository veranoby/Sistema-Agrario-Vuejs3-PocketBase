<template>
  <v-card
    class="prog-card"
    :class="complianceCardClass"
    :aria-label="`Programación ${programacion.descripcion}, ${complianceStateLabel}`"
    role="article"
  >
    <!-- Left accent bar via CSS class, full info in one row -->
    <v-card-text class="pa-3">
      <!-- Row 1: Status + title + edit -->
      <div class="d-flex align-center gap-2 mb-1">
        <v-icon :color="complianceStateColor" size="18">{{ complianceStateIcon }}</v-icon>
        <span class="prog-title flex-grow-1">{{ programacion.descripcion }}</span>
        <v-btn
          icon="mdi-pencil-outline"
          size="x-small"
          variant="text"
          :color="complianceStateColor"
          @click="$emit('editar', programacion)"
          :aria-label="`Editar ${programacion.descripcion}`"
        />
      </div>

      <!-- Row 2: chips -->
      <div class="d-flex align-center flex-wrap gap-1 mb-2">
        <v-chip
          v-if="actividadTipo"
          size="x-small"
          variant="tonal"
          color="primary"
          class="text-capitalize"
        >
          <v-icon start size="10">mdi-leaf</v-icon>
          {{ actividadTipo }}
        </v-chip>

        <v-chip
          v-if="esUrgente"
          size="x-small"
          variant="flat"
          color="error"
        >
          <v-icon start size="10">mdi-alert-circle</v-icon>
          {{ ejecucionesPendientes }} pend.
        </v-chip>

        <v-chip
          v-if="debeEjecutarHoy && !esUrgente"
          size="x-small"
          variant="flat"
          color="info"
        >
          <v-icon start size="10">mdi-calendar-today</v-icon>
          Hoy
        </v-chip>

        <v-spacer />

        <!-- Compact status label -->
        <span class="prog-state-label" :style="{ color: complianceStateColor }">
          {{ complianceStateLabel }}
        </span>
      </div>

      <!-- Row 3: dates -->
      <div class="d-flex align-center gap-2 mb-2 prog-dates">
        <v-icon size="13" color="grey">mdi-history</v-icon>
        <span>{{ formatFecha(programacion.ultima_ejecucion) }}</span>
        <v-icon size="13" color="grey">mdi-arrow-right-thin</v-icon>
        <v-icon size="13" color="grey">mdi-calendar-arrow-right</v-icon>
        <span>{{ formatFecha(programacion.proxima_ejecucion) }}</span>
      </div>

      <!-- Row 4: action buttons -->
      <div v-if="showBatchExecutionButton || showSingleExecutionButton" class="d-flex gap-2">
        <v-btn
          v-if="showBatchExecutionButton"
          variant="tonal"
          color="warning"
          size="small"
          density="comfortable"
          @click="showBatchDialog = true"
          class="flex-grow-1"
          :aria-label="`Registrar ${ejecucionesPendientes} acumulados`"
        >
          <v-icon start size="15">mdi-playlist-check</v-icon>
          {{ ejecucionesPendientes }} acumulados
        </v-btn>

        <v-btn
          v-if="showBatchExecutionButton"
          icon="mdi-broom"
          variant="tonal"
          color="grey-darken-1"
          size="small"
          density="comfortable"
          @click="programacionesStore.limpiarHistorialPendiente(programacion.id)"
          :aria-label="`Limpiar historial acumulado`"
          title="Limpiar historial acumulado"
        />

        <v-btn
          v-if="showSingleExecutionButton"
          variant="tonal"
          color="success"
          size="small"
          density="comfortable"
          @click="handleRegistrarCumplimiento"
          class="flex-grow-1"
          :aria-label="`Registrar cumplimiento`"
        >
          <v-icon start size="15">mdi-check-circle-outline</v-icon>
          Registrar
        </v-btn>
      </div>

    </v-card-text>

    <BatchExecutionDialog
      v-if="showBatchDialog"
      v-model="showBatchDialog"
      :programacion-id="programacion.id"
    />
  </v-card>
</template>

<style scoped>
.prog-card {
  border-left: 3px solid transparent;
  border-radius: 8px;
  transition: box-shadow 0.2s ease;
}
.prog-card:hover {
  box-shadow: 0 3px 12px rgba(0,0,0,0.1) !important;
}

/* Semantic left-border colors by compliance state */
.prog-card.compliance-registrado { border-left-color: #4caf50; }
.prog-card.compliance-pendiente  { border-left-color: #ffd54f; }
.prog-card.compliance-acumulado  { border-left-color: #f57c00; }
.prog-card.compliance-programado { border-left-color: #1976d2; }
.prog-card.compliance-vencido    { border-left-color: #d32f2f; }

.prog-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prog-state-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.85;
}

.prog-dates {
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.capitalize { text-transform: capitalize; }
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
</style>

<script setup>
import { defineProps, computed, ref } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'
import { differenceInDays, differenceInMonths, isBefore, isValid } from 'date-fns'
import { useProgramacionesStore } from '@/stores/programaciones'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import BatchExecutionDialog from '@/components/dialogs/BatchExecutionDialog.vue';

const props = defineProps({
  programacion: {
    type: Object,
    required: true
  },
  bgColor: {
    type: String,
    default: '#001f2f94'
  },
  textColor: {
    type: String,
    default: 'white'
  }
})

const actividadesStore = useActividadesStore()
const programacionesStore = useProgramacionesStore()
const bitacoraStore = useBitacoraStore()

const colorEstado = computed(
  () =>
    ({
      activo: 'green',
      pausado: 'orange',
      finalizado: 'red'
    })[props.programacion.estado] || 'gray'
)

const actividadTipo = computed(() => {
  const actividadId = props.programacion.actividades?.[0]
  if (!actividadId) return ''

  const actividad = actividadesStore.actividades.find((a) => a.id === actividadId)
  if (!actividad) return 'Desconocido'

  return actividadesStore.getActividadTipo(actividad.tipo_actividades) || 'Desconocido'
})

const formatFecha = (fecha) => {
  if (!fecha) return 'N/A'

  try {
    // Verificar que la fecha sea válida
    const fechaObj = new Date(fecha)
    if (isNaN(fechaObj.getTime())) {
      console.warn(`Fecha inválida: ${fecha}`)
      return 'Pendiente'
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(fechaObj)
  } catch (error) {
    console.error(`Error formateando fecha: ${fecha}`, error)
    return 'Pendiente'
  }
}

const ejecucionesPendientes = computed(() => {
  if (!props.programacion.ultima_ejecucion) return 1

  const hoy = new Date()
  const ultimaEjecucion = new Date(props.programacion.ultima_ejecucion)

  if (props.programacion.frecuencia === 'fecha_especifica') {
    const fechaEspecifica = new Date(props.programacion.frecuencia_personalizada?.fecha)
    return fechaEspecifica < hoy ? 1 : 0
  }

  const diasDesdeUltima = differenceInDays(hoy, ultimaEjecucion)

  switch (props.programacion.frecuencia) {
    case 'diaria':
      return diasDesdeUltima
    case 'semanal':
      return Math.floor(diasDesdeUltima / 7)
    case 'quincenal':
      return Math.floor(diasDesdeUltima / 15)
    case 'mensual':
      return differenceInMonths(hoy, ultimaEjecucion)
    case 'personalizada':
      const config = props.programacion.frecuencia_personalizada
      if (config.tipo === 'dias') return Math.floor(diasDesdeUltima / config.cantidad)
      if (config.tipo === 'semanas') return Math.floor(diasDesdeUltima / (7 * config.cantidad))
      if (config.tipo === 'meses') return differenceInMonths(hoy, ultimaEjecucion) / config.cantidad
      return 0
    default:
      return 0
  }
})

const esUrgente = computed(() => ejecucionesPendientes.value > 0)

const hoy = new Date()
const debeEjecutarHoy = computed(() => {
  // Si es fecha específica, comparar directamente con hoy
  if (props.programacion.frecuencia === 'fecha_especifica') {
    // Asegurarnos de que la fecha existe y es válida
    const fechaStr = props.programacion.frecuencia_personalizada?.fecha
    if (!fechaStr) return false

    // Parsear la fecha usando UTC para evitar problemas de zona horaria
    const [year, month, day] = fechaStr.split('-').map(Number)
    const fechaEspecifica = new Date(year, month - 1, day) // month es 0-based en JS

    const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const fechaEspecificaNormalizada = new Date(
      fechaEspecifica.getFullYear(),
      fechaEspecifica.getMonth(),
      fechaEspecifica.getDate()
    )

    return fechaEspecificaNormalizada.getTime() === hoyNormalizado.getTime()
  }

  // Para otras frecuencias, usar la próxima ejecución
  const proximaEjecucion = new Date(props.programacion.proxima_ejecucion)
  const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const proximaEjecucionNormalizada = new Date(
    proximaEjecucion.getFullYear(),
    proximaEjecucion.getMonth(),
    proximaEjecucion.getDate()
  )

  return proximaEjecucionNormalizada.getTime() === hoyNormalizado.getTime()
})

const canExecuteSingle = computed(() => {
  if (props.programacion.estado !== 'activo') {
    return false
  }
  const proximaEjecucionDate = new Date(props.programacion.proxima_ejecucion)
  // Gracefully handle invalid dates: if proxima_ejecucion is invalid, proximaIsValid will be false.
  const proximaIsValid = isValid(proximaEjecucionDate)

  // Condition: isPastDue OR debeEjecutarHoy OR hasPending
  const isPastDue = proximaIsValid && isBefore(proximaEjecucionDate, new Date())
  const hasPending = ejecucionesPendientes.value > 0

  return isPastDue || debeEjecutarHoy.value || hasPending
})

const showBatchDialog = ref(false)

// Handler for registrar cumplimiento button
const handleRegistrarCumplimiento = () => {
  // Emit the single execution request
  emits('request-single-execution', props.programacion)
}

// Define emits
const emits = defineEmits(['editar', 'request-single-execution'])

// Compliance state computed properties
const complianceState = computed(() => programacionesStore.getComplianceState(props.programacion))
const complianceStateColor = computed(() => programacionesStore.getComplianceStateColor(props.programacion))
const complianceStateIcon = computed(() => programacionesStore.getComplianceStateIcon(props.programacion))
const complianceStateLabel = computed(() => {
  const state = complianceState.value
  const labels = {
    'REGISTRADO': 'Registrado',
    'PENDIENTE': 'Pendiente',
    'ACUMULADO': 'Acumulado',
    'PROGRAMADO': 'Programado',
    'VENCIDO': 'Vencido'
  }
  return labels[state] || state
})
const complianceStateTooltip = computed(() => programacionesStore.getComplianceStateTooltip(props.programacion))

// Button visibility logic based on compliance state
const showBatchExecutionButton = computed(() => {
  return complianceState.value === 'ACUMULADO' && props.programacion.estado === 'activo'
})

const showSingleExecutionButton = computed(() => {
  return (complianceState.value === 'PENDIENTE' || complianceState.value === 'VENCIDO') && props.programacion.estado === 'activo'
})

// Agricultural UI computed properties
const complianceCardClass = computed(() => {
  const state = complianceState.value.toLowerCase()
  return `compliance-${state}`
})

const complianceHeaderStyle = computed(() => {
  const baseStyle = {
    position: 'relative'
  }

  // Remove background variations - use neutral background
  return { ...baseStyle, backgroundColor: 'rgba(248, 249, 250, 0.8)' }
})

// const ejecutarEnBloque = async () => { // Method is no longer needed as per new requirements
//   // try {
//   //   for (let i = 0; i < ejecucionesPendientes.value; i++) {
//   //     await programacionesStore.ejecutarProgramacion(props.programacion.id)
//   //   }
//   // } catch (error) {
//   //   console.error('Error ejecutando en bloque:', error)
//   // }
// }
</script>

