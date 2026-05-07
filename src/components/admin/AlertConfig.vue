<template>
  <v-card>
    <v-card-title>Configuración de Alertas por Email</v-card-title>
    <v-card-text>
      <v-alert
        v-if="!uiFeedbackStore.isConfigured"
        type="info"
        variant="tonal"
        class="mb-4"
        density="compact"
      >
        <strong>Configuración incompleta:</strong>
        <span v-if="uiFeedbackStore.preferences.enabledTypes.length === 0">
          Seleccione al menos un tipo de alerta.
        </span>
        <span v-else-if="uiFeedbackStore.preferences.recipients.length === 0">
          Agregue al menos un destinatario.
        </span>
      </v-alert>

      <v-form ref="formRef" @submit.prevent="savePreferences">
        <!-- Tipos de Alerta -->
        <div class="mb-6">
          <h3 class=" mb-3">Tipos de Alerta</h3>
          <v-checkbox-group v-model="form.enabledTypes">
            <v-checkbox
              v-for="type in availableAlertTypes"
              :key="type.value"
              :value="type.value"
              :label="`${type.icon} ${type.label}`"
              :hint="type.description"
              persistent-hint
            />
          </v-checkbox-group>
        </div>

        <!-- Destinatarios -->
        <div class="mb-6">
          <h3 class=" mb-3">Destinatarios</h3>
          <v-text-field
            v-model="emailInput"
            label="Agregar email"
            placeholder="ejemplo@correo.com"
            variant="outlined"
            density="compact"
            :error-messages="emailError"
            @keyup.enter="addEmail"
          >
            <template v-slot:append>
              <v-btn
                color="primary"
                variant="tonal"
                size="small"
                @click="addEmail"
                :disabled="!emailInput.trim()"
              >
                <v-icon>mdi-plus</v-icon>
                Agregar
              </v-btn>
            </template>
          </v-text-field>

          <!-- Lista de emails agregados -->
          <div v-if="form.recipients.length > 0" class="mt-3">
            <v-chip
              v-for="(email, index) in form.recipients"
              :key="index"
              closable
              class="mr-2 mb-2"
              @click:close="removeEmail(email)"
            >
              <v-icon start>mdi-email-outline</v-icon>
              {{ email }}
            </v-chip>
          </div>
          <p v-else class="text-caption text-medium-emphasis mt-2">
            No hay destinatarios configurados
          </p>
        </div>

        <!-- Frecuencia -->
        <div class="mb-4">
          <h3 class=" mb-3">Frecuencia de Envío</h3>
          <v-select
            v-model="form.frequency"
            :items="frequencies"
            label="Seleccionar frecuencia"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-clock-outline"
          />
        </div>
      </v-form>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        variant="outlined"
        color="grey"
        @click="resetForm"
        :disabled="loading"
      >
        CANCELAR
      </v-btn>
      <v-btn
        color="primary"
        :loading="loading"
        :disabled="!formValid"
        @click="savePreferences"
      >
        <v-icon start>mdi-content-save</v-icon>
        GUARDAR Configuración
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { alertTypes, validateEmails } from '@/services/emailAlertService'
import { logger } from '@/utils/logger'

const uiFeedbackStore = useUiFeedbackStore()
const haciendaStore = useHaciendaStore()

const formRef = ref(null)
const loading = ref(false)
const emailInput = ref('')
const emailError = ref('')

const form = ref({
  enabledTypes: [],
  recipients: [],
  frequency: 'immediate'
})

const availableAlertTypes = [
  {
    value: alertTypes.ACTIVIDAD_CRITICA,
    label: 'Actividad Crítica',
    icon: '⚠️',
    description: 'Alertas para actividades de prioridad alta'
  },
  {
    value: alertTypes.BPA_VENCIDO,
    label: 'BPA Vencido',
    icon: '🔴',
    description: 'Alertas cuando el BPA de una zona está por vencer'
  },
  {
    value: alertTypes.RECORDATORIO,
    label: 'Recordatorio',
    icon: '📋',
    description: 'Recordatorios de tareas programadas'
  },
  {
    value: alertTypes.ACTIVIDAD_ASIGNADA,
    label: 'Actividad Asignada',
    icon: '✅',
    description: 'Notificaciones cuando se asigna una nueva actividad'
  },
  {
    value: alertTypes.ZONA_REQUIERE_ATENCION,
    label: 'Zona Requiere Atención',
    icon: '🎯',
    description: 'Alertas para zonas que necesitan intervención'
  }
]

const frequencies = [
  { value: 'immediate', label: 'Inmediato', subtitle: 'Enviar alertas al instante' },
  { value: 'hourly', label: 'Resumen por hora', subtitle: 'Compilar alertas cada hora' },
  { value: 'daily', label: 'Resumen diario', subtitle: 'Enviar resumen una vez al día' }
]

const formValid = computed(() => {
  return (
    form.value.enabledTypes.length > 0 &&
    form.value.recipients.length > 0 &&
    form.value.frequency !== ''
  )
})

onMounted(async () => {
  await loadPreferences()
})

async function loadPreferences() {
  loading.value = true
  try {
    const haciendaId = haciendaStore.mi_hacienda?.id
    if (!haciendaId) {
      logger.warn('[ALERT_CONFIG] No hay hacienda seleccionada')
      return
    }

    await uiFeedbackStore.loadPreferences(haciendaId)
    
    // Cargar preferencias en el formulario
    form.value = {
      enabledTypes: [...uiFeedbackStore.preferences.enabledTypes],
      recipients: [...uiFeedbackStore.preferences.recipients],
      frequency: uiFeedbackStore.preferences.frequency || 'immediate'
    }
    
    logger.info('[ALERT_CONFIG] Preferencias cargadas')
  } catch (error) {
    logger.error('[ALERT_CONFIG] Error cargando preferencias', error)
  } finally {
    loading.value = false
  }
}

function addEmail() {
  emailError.value = ''
  const email = emailInput.value.trim()
  
  if (!email) {
    emailError.value = 'El email es requerido'
    return
  }
  
  const validation = validateEmails([email])
  
  if (validation.invalid.length > 0) {
    emailError.value = 'Email inválido'
    return
  }
  
  if (form.value.recipients.includes(email)) {
    emailError.value = 'Este email ya fue agregado'
    return
  }
  
  uiFeedbackStore.addRecipient(email)
  form.value.recipients.push(email)
  emailInput.value = ''
  logger.info('[ALERT_CONFIG] Email agregado', { email })
}

function removeEmail(email) {
  uiFeedbackStore.removeRecipient(email)
  form.value.recipients = form.value.recipients.filter(e => e !== email)
  logger.info('[ALERT_CONFIG] Email removido', { email })
}

async function savePreferences() {
  if (!formValid.value) {
    logger.warn('[ALERT_CONFIG] Formulario inválido')
    return
  }
  
  loading.value = true
  try {
    const haciendaId = haciendaStore.mi_hacienda?.id
    if (!haciendaId) {
      logger.error('[ALERT_CONFIG] No hay hacienda seleccionada')
      return
    }
    
    await uiFeedbackStore.updatePreferences(haciendaId, {
      enabledTypes: form.value.enabledTypes,
      recipients: form.value.recipients,
      frequency: form.value.frequency
    })
    
    logger.info('[ALERT_CONFIG] Preferencias guardadas exitosamente')
  } catch (error) {
    logger.error('[ALERT_CONFIG] Error guardando preferencias', error)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    enabledTypes: [...uiFeedbackStore.preferences.enabledTypes],
    recipients: [...uiFeedbackStore.preferences.recipients],
    frequency: uiFeedbackStore.preferences.frequency || 'immediate'
  }
  emailInput.value = ''
  emailError.value = ''
}
</script>
