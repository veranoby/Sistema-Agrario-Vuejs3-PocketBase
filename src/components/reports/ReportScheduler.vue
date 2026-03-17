<template>
  <v-dialog v-model="dialog" max-width="600px" persistent>
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        color="primary"
        prepend-icon="mdi-calendar-clock"
      >
        Programar Reporte
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-calendar-clock</v-icon>
        Programar Reporte Automático
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" @submit.prevent="saveSchedule">
          <!-- Tipo de Reporte -->
          <v-select
            v-model="form.templateId"
            :items="reportStore.templates"
            item-title="name"
            item-value="id"
            label="Tipo de Reporte"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-file-document"
            :rules="[v => !!v || 'Seleccione un tipo de reporte']"
            class="mb-4"
          >
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template v-slot:subtitle>
                  {{ item.raw.description }}
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Frecuencia -->
          <v-select
            v-model="form.frequency"
            :items="availableFrequencies"
            item-title="label"
            item-value="value"
            label="Frecuencia"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-clock-outline"
            :rules="[v => !!v || 'Seleccione una frecuencia']"
            class="mb-4"
          >
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template v-slot:subtitle>
                  {{ item.raw.subtitle }}
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Destinatarios -->
          <v-text-field
            v-model="form.recipients"
            label="Destinatarios (emails separados por coma)"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-email-multiple"
            placeholder="ejemplo@correo.com, otro@correo.com"
            :rules="[
              v => !!v || 'Ingrese al menos un destinatario',
              v => validateEmails(v) || 'Ingrese emails válidos'
            ]"
            class="mb-4"
            hint="Separe múltiples emails con comas"
            persistent-hint
          />

          <!-- Información del próximo envío -->
          <v-alert
            v-if="form.frequency && form.templateId"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <div class="d-flex align-center">
              <v-icon start size="small">mdi-information</v-icon>
              <span>
                El primer reporte se ejecutará el <strong>{{ calculateFirstRun() }}</strong>
              </span>
            </div>
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="outlined"
          color="grey"
          @click="closeDialog"
          :disabled="loading"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="saveSchedule"
        >
          <v-icon start>mdi-content-save</v-icon>
          Programar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useReportStore, REPORT_FREQUENCIES } from '@/stores/reportStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { logger } from '@/utils/logger'

const reportStore = useReportStore()
const haciendaStore = useHaciendaStore()

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'scheduled'])

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const formRef = ref(null)
const loading = ref(false)

const form = ref({
  templateId: '',
  frequency: '',
  recipients: ''
})

const availableFrequencies = [
  {
    value: REPORT_FREQUENCIES.DAILY,
    label: 'Diario',
    subtitle: 'Todos los días a las 9:00 AM'
  },
  {
    value: REPORT_FREQUENCIES.WEEKLY,
    label: 'Semanal',
    subtitle: 'Todos los lunes a las 9:00 AM'
  },
  {
    value: REPORT_FREQUENCIES.MONTHLY,
    label: 'Mensual',
    subtitle: 'El día 1 de cada mes a las 9:00 AM'
  }
]

function closeDialog() {
  dialog.value = false
  resetForm()
}

function resetForm() {
  form.value = {
    templateId: '',
    frequency: '',
    recipients: ''
  }
  if (formRef.value) {
    formRef.value.resetValidation()
  }
}

function validateEmails(value) {
  if (!value) return false
  const emails = value.split(',').map(e => e.trim())
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emails.every(email => emailRegex.test(email))
}

function calculateFirstRun() {
  if (!form.value.frequency) return ''

  const now = new Date()
  let nextRun

  switch (form.value.frequency) {
    case REPORT_FREQUENCIES.DAILY:
      nextRun = new Date(now)
      nextRun.setDate(nextRun.getDate() + 1)
      nextRun.setHours(9, 0, 0, 0)
      break
    case REPORT_FREQUENCIES.WEEKLY:
      nextRun = new Date(now)
      nextRun.setDate(nextRun.getDate() + 7)
      nextRun.setHours(9, 0, 0, 0)
      break
    case REPORT_FREQUENCIES.MONTHLY:
      nextRun = new Date(now)
      nextRun.setMonth(nextRun.getMonth() + 1)
      nextRun.setDate(1)
      nextRun.setHours(9, 0, 0, 0)
      break
    default:
      return ''
  }

  return nextRun.toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function saveSchedule() {
  if (!formRef.value) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  loading.value = true

  try {
    const recipients = form.value.recipients
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    await reportStore.scheduleReport(
      form.value.templateId,
      form.value.frequency,
      recipients,
      haciendaStore.mi_hacienda?.id
    )

    logger.info('[REPORT_SCHEDULER] Reporte programado exitosamente')
    emit('scheduled')
    closeDialog()
  } catch (error) {
    logger.error('[REPORT_SCHEDULER] Error programando reporte', error)
  } finally {
    loading.value = false
  }
}

// Reset form when dialog closes
watch(dialog, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})
</script>
