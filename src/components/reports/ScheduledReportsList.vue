<template>
  <v-card variant="elevated" elevation="2">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Reportes Programados</span>
      <ReportScheduler v-model="showSchedulerDialog" @scheduled="loadSchedules" />
    </v-card-title>

    <v-card-subtitle>Gestión de reportes automáticos</v-card-subtitle>

    <v-card-text>
      <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

      <v-data-table
        v-else-if="schedules.length > 0"
        :headers="headers"
        :items="schedules"
        :items-per-page="10"
        density="compact"
        hover
      >
        <template v-slot:item.templateId="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :icon="getTemplateIcon(item.templateId)"
              :color="getTemplateColor(item.templateId)"
              class="mr-2"
            />
            <div>
              <div class="font-weight-medium">
                {{ getTemplateName(item.templateId) }}
              </div>
              <div class="">
                {{ getTemplateDescription(item.templateId) }}
              </div>
            </div>
          </div>
        </template>

        <template v-slot:item.frequency="{ item }">
          <v-chip
            :color="getFrequencyColor(item.frequency)"
            size="small"
            prepend-icon="mdi-clock-outline"
          >
            {{ getFrequencyLabel(item.frequency) }}
          </v-chip>
        </template>

        <template v-slot:item.nextRun="{ item }">
          <div class="d-flex align-center">
            <v-icon size="small" class="mr-2">mdi-calendar-clock</v-icon>
            {{ formatDate(item.nextRun) }}
          </div>
        </template>

        <template v-slot:item.active="{ item }">
          <v-chip :color="item.active ? 'success' : 'grey'" size="small">
            <v-icon start>{{ item.active ? 'mdi-check-circle' : 'mdi-pause-circle' }}</v-icon>
            {{ item.active ? 'Activo' : 'Pausado' }}
          </v-chip>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon
            size="small"
            variant="text"
            @click="toggleSchedule(item)"
            :title="item.active ? 'Pausar' : 'Activar'"
          >
            <v-icon>{{ item.active ? 'mdi-pause' : 'mdi-play' }}</v-icon>
          </v-btn>

          <v-btn
            icon
            size="small"
            variant="text"
            @click="runNow(item)"
            :disabled="!item.active"
            title="Ejecutar ahora"
          >
            <v-icon>mdi-play-circle</v-icon>
          </v-btn>

          <v-btn
            icon
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
            title="Eliminar"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>

      <v-empty-state
        v-if="schedules.length === 0 && !loading"
        title="Sin reportes programados"
        text="Programá tu primer reporte automático para comenzar"
        icon="mdi-calendar-remove"
      >
        <template v-slot:media>
          <ReportScheduler v-model="showSchedulerDialog" @scheduled="loadSchedules" />
        </template>
      </v-empty-state>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useReportStore } from '@/stores/reportStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { logger } from '@/utils/logger'
import ReportScheduler from './ReportScheduler.vue'

const reportStore = useReportStore()
const haciendaStore = useHaciendaStore()

const loading = ref(false)
const showSchedulerDialog = ref(false)
const scheduleToDelete = ref(null)

const schedules = computed(() =>
  reportStore.getSchedulesForHacienda(haciendaStore.mi_hacienda?.id)
)

const headers = [
  { key: 'templateId', title: 'Reporte', sortable: true, minWidth: 200 },
  { key: 'frequency', title: 'Frecuencia', sortable: true },
  { key: 'recipients', title: 'Destinatarios', sortable: false },
  { key: 'nextRun', title: 'Próxima Ejecución', sortable: true },
  { key: 'active', title: 'Estado', sortable: true },
  { key: 'actions', title: 'Acciones', sortable: false, align: 'center' }
]

onMounted(async () => {
  await loadSchedules()
})

async function loadSchedules() {
  loading.value = true
  try {
    await reportStore.loadSchedules(haciendaStore.mi_hacienda?.id)
    logger.info('[SCHEDULED_REPORTS] Schedules cargados')
  } catch (error) {
    logger.error('[SCHEDULED_REPORTS] Error cargando schedules', error)
  } finally {
    loading.value = false
  }
}

function getTemplateName(templateId) {
  const template = reportStore.getTemplateById(templateId)
  return template?.name || templateId
}

function getTemplateDescription(templateId) {
  const template = reportStore.getTemplateById(templateId)
  return template?.description || ''
}

function getTemplateIcon(templateId) {
  const icons = {
    actividades_semanal: 'mdi-calendar-weekend',
    bpa_compliance: 'mdi-clipboard-check',
    siembras_activas: 'mdi-seed',
    productividad: 'mdi-chart-line'
  }
  return icons[templateId] || 'mdi-file-document'
}

function getTemplateColor(templateId) {
  const colors = {
    actividades_semanal: 'primary',
    bpa_compliance: 'success',
    siembras_activas: 'info',
    productividad: 'amber'
  }
  return colors[templateId] || 'grey'
}

function getFrequencyLabel(frequency) {
  const labels = {
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual'
  }
  return labels[frequency] || frequency
}

function getFrequencyColor(frequency) {
  const colors = {
    daily: 'blue',
    weekly: 'green',
    monthly: 'purple'
  }
  return colors[frequency] || 'grey'
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('es-ES', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function toggleSchedule(schedule) {
  try {
    await reportStore.toggleSchedule(schedule.id, !schedule.active)
    logger.info('[SCHEDULED_REPORTS] Schedule actualizado', {
      id: schedule.id,
      active: !schedule.active
    })
  } catch (error) {
    logger.error('[SCHEDULED_REPORTS] Error actualizando schedule', error)
  }
}

async function runNow(schedule) {
  try {
    loading.value = true
    await reportStore.executeScheduledReport(schedule.id)
    logger.info('[SCHEDULED_REPORTS] Reporte ejecutado manualmente', { id: schedule.id })
  } catch (error) {
    logger.error('[SCHEDULED_REPORTS] Error ejecutando reporte', error)
  } finally {
    loading.value = false
  }
}

function confirmDelete(schedule) {
  scheduleToDelete.value = schedule
  if (confirm(`¿Está seguro que desea eliminar el reporte "${getTemplateName(schedule.templateId)}"?`)) {
    deleteSchedule(schedule.id)
  }
}

async function deleteSchedule(scheduleId) {
  try {
    await reportStore.deleteSchedule(scheduleId)
    logger.info('[SCHEDULED_REPORTS] Schedule eliminado', { id: scheduleId })
  } catch (error) {
    logger.error('[SCHEDULED_REPORTS] Error eliminando schedule', error)
  }
}
</script>
