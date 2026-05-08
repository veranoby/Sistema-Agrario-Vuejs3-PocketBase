<template>
  <v-container fluid class="pa-4">
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4">Reportes</h1>
        <p class="text-subtitle-2 text-medium-emphasis">
          Generación y programación de reportes automáticos
        </p>
      </div>
      <ReportScheduler v-model="showSchedulerDialog" @scheduled="refreshReports" />
    </div>

    <v-row>
      <!-- Reportes Programados -->
      <v-col cols="12" md="8">
        <ScheduledReportsList @refresh="refreshReports" />
      </v-col>

      <!-- Historial -->
      <v-col cols="12" md="4">
        <v-card variant="elevated" elevation="2">
          <v-card-title>Historial</v-card-title>
          <v-card-text>
            <v-timeline density="compact" side="end">
              <v-timeline-item
                v-for="item in reportStore.getHistory.slice(0, 5)"
                :key="item.id"
                dot-color="primary"
                size="small"
              >
                <div class="text-subtitle-2">{{ getTemplateName(item.templateId) }}</div>
                <div class="">
                  {{ formatDate(item.generatedAt) }}
                </div>
                <div class="text-caption">
                  <v-icon size="small">mdi-email</v-icon>
                  {{ item.recipients }} destinatarios
                </div>
              </v-timeline-item>

              <v-timeline-item v-if="reportStore.getHistory.length === 0" dot-color="grey">
                <div class="text-subtitle-2 text-medium-emphasis">
                  Sin historial de reportes
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Templates Disponibles -->
      <v-col cols="12">
        <v-card variant="elevated" elevation="2">
          <v-card-title>Templates Disponibles</v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                v-for="template in reportStore.templates"
                :key="template.id"
                cols="12"
                sm="6"
                md="3"
              >
                <v-card variant="tonal" :color="getTemplateColor(template.id)" class="h-100">
                  <v-card-text>
                    <v-icon
                      :icon="getTemplateIcon(template.id)"
                      size="large"
                      class="mb-2"
                    />
                    <div class=" font-weight-bold mb-1">
                      {{ template.name }}
                    </div>
                    <div class="">
                      {{ template.description }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useReportStore } from '@/stores/reportStore'
import { logger } from '@/utils/logger'
import ReportScheduler from '@/components/reports/ReportScheduler.vue'
import ScheduledReportsList from '@/components/reports/ScheduledReportsList.vue'

const reportStore = useReportStore()
const showSchedulerDialog = ref(false)

function getTemplateName(templateId) {
  const template = reportStore.getTemplateById(templateId)
  return template?.name || templateId
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

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function refreshReports() {
  logger.info('[REPORTS_VIEW] Reportes actualizados')
}
</script>

<style scoped>
.h-100 {
  height: 100%;
}
</style>
