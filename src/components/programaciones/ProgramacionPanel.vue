<template>
  <!-- Agricultural-focused card design -->
  <v-card
    class="agricultural-card"
    :class="complianceCardClass"
    elevation="2"
    :aria-label="`Programación ${programacion.descripcion}, estado ${complianceStateLabel}`"
    role="article"
  >
    <!-- Prominent compliance header -->
    <div class="compliance-header" :style="complianceHeaderStyle">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon
            :color="complianceStateColor"
            size="default"
            class="mr-3"
            :aria-label="`Estado de compliance: ${complianceStateLabel}`"
          >
            {{ complianceStateIcon }}
          </v-icon>
          <div>
            <div class="compliance-title">{{ complianceStateLabel }}</div>
            <div class="compliance-subtitle">{{ complianceStateTooltip }}</div>
          </div>
        </div>

        <!-- Alert chip for pending executions -->
        <v-chip
          v-if="ejecucionesPendientes > 1"
          color="warning"
          size="small"
          variant="elevated"
          class="font-weight-bold"
        >
          <v-icon start size="small">mdi-alert-circle-outline</v-icon>
          {{ ejecucionesPendientes }} pendientes
        </v-chip>
      </div>
    </div>

    <!-- Content with better spacing -->
    <v-card-text class="agricultural-content pa-4">
      <!-- Program description with edit button -->
      <div class="program-description mb-3 d-flex align-center justify-space-between">
        <v-tooltip location="top" :text="programacion.descripcion">
          <template v-slot:activator="{ props: tooltipDescProps }">
            <h4 v-bind="tooltipDescProps" class="text-h6 font-weight-medium agricultural-text" style="font-size: 1.1rem;">
              {{ programacion.descripcion }}
            </h4>
          </template>
        </v-tooltip>

        <!-- Edit button (moved to title area) -->
        <v-btn
          variant="outlined"
          icon="mdi-pencil"
          size="small"
          @click="$emit('editar', programacion)"
          @keydown.enter="$emit('editar', programacion)"
          @keydown.space.prevent="$emit('editar', programacion)"
          class="agricultural-btn agricultural-btn--edit"
          :aria-label="`Editar programación ${programacion.descripcion}`"
          tabindex="0"
        />
      </div>

      <!-- Information chips section -->
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <!-- Activity type chip -->
        <v-chip
          color="primary"
          size="small"
          variant="outlined"
          class="agricultural-chip agricultural-chip--info"
        >
          <v-icon start size="small">mdi-leaf</v-icon>
          <span class="capitalize font-weight-medium">{{ actividadTipo }}</span>
        </v-chip>

        <!-- Urgent indicator -->
        <v-tooltip location="top" v-if="esUrgente">
          <template v-slot:activator="{ props: tooltipUrgenteProps }">
            <v-chip
              v-bind="tooltipUrgenteProps"
              color="error"
              size="small"
              variant="elevated"
              class="agricultural-chip agricultural-chip--urgent"
              role="alert"
              :aria-live="esUrgente ? 'polite' : 'off'"
            >
              <v-icon start size="small">mdi-alert-circle</v-icon>
              URGENTE: {{ ejecucionesPendientes }}
            </v-chip>
          </template>
          <span>{{ ejecucionesPendientes }} ejecución(es) pendiente(s)</span>
        </v-tooltip>

        <!-- Today indicator -->
        <v-chip
          v-if="debeEjecutarHoy"
          color="info"
          size="small"
          variant="elevated"
          class="agricultural-chip agricultural-chip--today"
        >
          <v-icon start size="small">mdi-calendar-today</v-icon>
          PARA HOY
        </v-chip>
      </div>

      <!-- Action buttons section -->
      <div class="d-flex align-center justify-end flex-wrap ga-2">
          <!-- Batch execution button -->
          <v-btn
            v-if="showBatchExecutionButton"
            variant="elevated"
            color="warning"
            size="default"
            @click="showBatchDialog = true"
            @keydown.enter="showBatchDialog = true"
            @keydown.space.prevent="showBatchDialog = true"
            class="agricultural-btn agricultural-btn--batch"
            :aria-label="`Registrar ${ejecucionesPendientes} cumplimientos acumulados para ${programacion.descripcion}`"
            :aria-describedby="`batch-desc-${programacion.id}`"
            tabindex="0"
          >
            <v-icon start>mdi-playlist-check</v-icon>
            REGISTRAR {{ ejecucionesPendientes }} ACUMULADOS
          </v-btn>
          <div
            v-if="showBatchExecutionButton"
            :id="`batch-desc-${programacion.id}`"
            class="sr-only"
          >
            Registra múltiples cumplimientos de una vez para esta programación
          </div>

          <!-- Single execution button -->
          <v-btn
            v-if="showSingleExecutionButton"
            variant="elevated"
            color="success"
            size="default"
            @click="handleRegistrarCumplimiento"
            @keydown.enter="handleRegistrarCumplimiento"
            @keydown.space.prevent="handleRegistrarCumplimiento"
            class="agricultural-btn agricultural-btn--primary"
            :aria-label="`Registrar cumplimiento para ${programacion.descripcion}`"
            :aria-describedby="`single-desc-${programacion.id}`"
            tabindex="0"
          >
            <v-icon start>mdi-check-circle</v-icon>
            REGISTRAR CUMPLIMIENTO
          </v-btn>
          <div
            v-if="showSingleExecutionButton"
            :id="`single-desc-${programacion.id}`"
            class="sr-only"
          >
            Registra un cumplimiento individual para esta programación
          </div>
      </div>

      <BatchExecutionDialog
        v-if="showBatchDialog"
        v-model="showBatchDialog"
        :programacion-id="programacion.id"
      />

      <!-- Fila de información adicional (Date Chips) -->
      <div class="d-flex align-center gap-2 mt-3">
        <v-chip color="blue-grey-lighten-2" size="small" density="default" variant="outlined" class="date-chip">
          <v-icon start size="small">mdi-history</v-icon>
          <span class="font-weight-medium">
            Última: {{ formatFecha(programacion.ultima_ejecucion) }}
          </span>
        </v-chip>

        <v-chip color="blue-grey-darken-1" size="small" density="default" variant="outlined" class="date-chip">
          <v-icon start size="small">mdi-calendar-arrow-right</v-icon>
          <span class="font-weight-medium">
            Próxima: {{ formatFecha(programacion.proxima_ejecucion) }}
          </span>
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Agricultural Color Palette */
:root {
  --agri-green-primary: #2e7d32;
  --agri-green-light: #4caf50;
  --agri-earth-brown: #5d4037;
  --agri-soil-dark: #3e2723;
  --agri-sunshine-yellow: #ffd54f;
  --agri-sky-blue: #1976d2;
  --agri-harvest-orange: #f57c00;
  --agri-warning-red: #d32f2f;
  --agri-surface-light: #f8f9fa;
  --agri-surface-card: #ffffff;
}

/* Core Agricultural Card Design */
.agricultural-card {
  background: var(--agri-surface-card);
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.agricultural-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(46, 125, 50, 0.15) !important;
  border-color: var(--agri-green-light);
}

.agricultural-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--agri-green-primary), var(--agri-green-light));
  z-index: 1;
}

/* Compliance Header Styling */
.compliance-header {
  background: linear-gradient(135deg, var(--agri-surface-light) 0%, #ffffff 100%);
  padding: 16px 20px;
  border-bottom: 1px solid rgba(46, 125, 50, 0.1);
  position: relative;
}

.compliance-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--agri-soil-dark);
  margin-bottom: 2px;
}

.compliance-subtitle {
  font-size: 0.875rem;
  color: var(--agri-earth-brown);
  opacity: 0.8;
}

/* Content Area */
.agricultural-content {
  background: var(--agri-surface-card);
  position: relative;
}

.program-description h3 {
  color: var(--agri-soil-dark);
  line-height: 1.3;
}

/* Agricultural Chips */
.agricultural-chip {
  font-weight: 500;
  letter-spacing: 0.025em;
  border-radius: 8px;
}

.agricultural-chip--info {
  background-color: rgba(46, 125, 50, 0.1);
  border-color: var(--agri-green-primary);
  color: var(--agri-green-primary);
}

.agricultural-chip--urgent {
  background: linear-gradient(45deg, var(--agri-warning-red), #e57373);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
}

.agricultural-chip--today {
  background: linear-gradient(45deg, var(--agri-sky-blue), #42a5f5);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

/* Agricultural Buttons */
.agricultural-btn {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.025em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px; /* Touch-friendly size */
}

.agricultural-btn--primary {
  background: linear-gradient(45deg, var(--agri-green-primary), var(--agri-green-light));
  border: none;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}

.agricultural-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.4);
}

.agricultural-btn--batch {
  background: linear-gradient(45deg, var(--agri-harvest-orange), #ffb74d);
  border: none;
  box-shadow: 0 4px 12px rgba(245, 124, 0, 0.3);
}

.agricultural-btn--batch:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(245, 124, 0, 0.4);
}

.agricultural-btn--edit {
  border: 2px solid var(--agri-green-primary);
  color: var(--agri-green-primary);
  background: transparent;
}

.agricultural-btn--edit:hover {
  background: var(--agri-green-primary);
  color: white;
  transform: translateY(-1px);
}

/* Compliance State Colors */
.compliance-registered .compliance-header {
  border-left: 4px solid var(--agri-green-primary);
}

.compliance-pending .compliance-header {
  border-left: 4px solid var(--agri-sunshine-yellow);
}

.compliance-accumulated .compliance-header {
  border-left: 4px solid var(--agri-harvest-orange);
}

.compliance-scheduled .compliance-header {
  border-left: 4px solid var(--agri-sky-blue);
}

.compliance-overdue .compliance-header {
  border-left: 4px solid var(--agri-warning-red);
}

/* Responsive Design for Tablet Field Use */
@media (max-width: 1024px) {
  .agricultural-card {
    margin-bottom: 16px;
  }

  .compliance-header {
    padding: 20px 16px;
  }

  .agricultural-content {
    padding: 20px 16px;
  }

  .agricultural-btn {
    min-height: 48px; /* Larger touch targets for tablets */
    font-size: 0.95rem;
  }

  .compliance-title {
    font-size: 1.15rem;
  }

  .program-description h3 {
    font-size: 1.2rem;
  }
}

@media (max-width: 768px) {
  .agricultural-card {
    border-radius: 8px;
  }

  .compliance-header {
    padding: 16px 12px;
  }

  .agricultural-content {
    padding: 16px 12px;
  }

  .agricultural-btn {
    min-height: 52px; /* Even larger for mobile */
    width: 100%;
    margin-bottom: 8px;
  }

  .d-flex.align-center.justify-space-between {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .d-flex.align-center.ga-2 {
    justify-content: center;
  }
}

/* Enhanced Visual Feedback */
.agricultural-btn:active {
  transform: translateY(0);
  transition: transform 0.1s;
}

.agricultural-btn:focus-visible {
  outline: 3px solid var(--agri-sky-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--agri-surface-card), 0 0 0 5px var(--agri-sky-blue);
}

.agricultural-chip {
  transition: all 0.2s ease;
}

.agricultural-chip:hover {
  transform: translateY(-1px);
}

.agricultural-chip:focus-visible {
  outline: 2px solid var(--agri-sky-blue);
  outline-offset: 1px;
}

/* Screen Reader Support */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Loading States */
.agricultural-card.loading {
  opacity: 0.7;
  pointer-events: none;
}

.agricultural-card.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

/* Animation Classes */
.animated-btn {
  transition: min-width 0.2s ease-in-out, transform 0.2s ease;
}

/* Legacy compatibility styles */
.compliance-indicator {
  font-weight: 500;
}

.compliance-tooltip {
  font-size: 14px;
}

.text-shadow-lg {
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.text-shadow-black-300 {
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.capitalize {
  text-transform: capitalize;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gap-2 {
  gap: 0.5rem;
}

.cursor-help {
  cursor: help;
}

/* High contrast colors for outdoor visibility */
.compliance-registered {
  color: #4caf50;
}

.compliance-pending {
  color: #ffeb3b;
}

.compliance-accumulated {
  color: #f44336;
}

.compliance-scheduled {
  color: #2196f3;
}

.compliance-overdue {
  color: #ff9800;
}
</style>

<script setup>
import { defineProps, computed, ref } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'
import { differenceInDays, differenceInMonths, isBefore, isValid } from 'date-fns'
import { useProgramacionesStore } from '@/stores/programacionesStore'
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

<style scoped>
.animated-btn {
  transition: min-width 0.2s ease-in-out;
}

.compliance-indicator {
  font-weight: 500;
}

.compliance-tooltip {
  font-size: 14px;
}

.text-shadow-lg {
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.text-shadow-black-300 {
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.capitalize {
  text-transform: capitalize;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gap-2 {
  gap: 0.5rem;
}

.cursor-help {
  cursor: help;
}

/* Responsive design for tablets */
@media (max-width: 768px) {
  .v-btn {
    min-height: 40px;
    min-width: 40px;
  }
  
  .v-chip {
    font-size: 0.75rem;
  }
  
  .text-xs {
    font-size: 0.75rem;
  }
}

/* Enhanced Date Chips */
.date-chip {
  font-weight: 500;
  min-height: 32px;
  border-width: 1.5px;
}

.date-chip .v-chip__content {
  font-size: 0.875rem;
}

/* High contrast colors for outdoor visibility */
.compliance-registered {
  color: #4caf50; /* Green */
}

.compliance-pending {
  color: #ffeb3b; /* Yellow */
}

.compliance-accumulated {
  color: #f44336; /* Red */
}

.compliance-scheduled {
  color: #2196f3; /* Blue */
}

.compliance-overdue {
  color: #ff9800; /* Orange */
}
</style>
