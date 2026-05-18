<template>
  <div class="bg-dinamico border-1 m-5 mt-4 px-4 py-4 shadow-md hover:shadow-xl rounded-lg">
    <h2 class="text-xl font-bold mb-4">
      <v-icon color="success" class="mr-2">mdi-bell-ring-outline</v-icon>
      Configuración de Notificaciones
    </h2>
    <p class="text-xs text-gray-600 mb-6">
      Configure cómo desea recibir los resúmenes y alertas críticas de su hacienda.
    </p>

    <v-form v-if="config" ref="form">
      <div class="mb-4">
        <v-checkbox
          v-model="config.digestWeekly"
          color="success"
          hide-details
          class="mb-0"
        >
          <template v-slot:label>
            <div>
              <div class="text-sm font-semibold">Resumen Gerencial Semanal</div>
              <div class="text-xs text-gray-500">Reciba un reporte todos los lunes con lo logrado la semana pasada y lo programado para la actual.</div>
            </div>
          </template>
        </v-checkbox>
      </div>

      <v-divider class="my-4"></v-divider>

      <div class="mb-6">
        <v-checkbox
          v-model="config.emergencyAlerts"
          color="error"
          hide-details
        >
          <template v-slot:label>
            <div>
              <div class="text-sm font-semibold text-red-darken-2">Alertas de Emergencia</div>
              <div class="text-xs text-gray-500">Notificaciones inmediatas sobre vencimiento de suscripción o riesgos críticos de BPA.</div>
            </div>
          </template>
        </v-checkbox>
      </div>

      <div class="mt-6 flex justify-end">
        <v-btn
          color="success"
          :loading="saving"
          prepend-icon="mdi-content-save"
          @click="saveSettings"
          rounded="lg"
        >
          Guardar Preferencias
        </v-btn>
      </div>
    </v-form>
    
    <div v-else-if="loading" class="flex justify-center p-10">
      <v-progress-circular indeterminate color="success"></v-progress-circular>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { emailAlertService } from '@/services/emailAlertService'
import { storeToRefs } from 'pinia'

const haciendaStore = useHaciendaStore()
const uiFeedbackStore = useUiFeedbackStore()
const { mi_hacienda } = storeToRefs(haciendaStore)

const config = ref({
  digestWeekly: false,
  emergencyAlerts: false,
  recipients: [],
  enabled_types: []
})

const loading = ref(false)
const saving = ref(false)

const loadSettings = async () => {
  if (!mi_hacienda.value?.id) return
  
  loading.value = true
  try {
    const preferences = await emailAlertService.getAlertPreferences(mi_hacienda.value.id)
    // Mapear campos existentes o nuevos
    config.value = {
      ...config.value,
      digestWeekly: preferences.digestWeekly || false,
      emergencyAlerts: preferences.emergencyAlerts || false,
      recipients: preferences.recipients || [],
      enabled_types: preferences.enabled_types || []
    }
  } catch (error) {
    console.error('Error loading notification settings:', error)
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  if (!mi_hacienda.value?.id) return
  
  saving.value = true
  try {
    // Usamos el servicio existente para guardar en PocketBase
    const payload = {
      ...config.value,
      // Asegurar compatibilidad con el endpoint backend existente
      enabled_types: config.value.enabled_types,
      recipients: config.value.recipients,
      frequency: config.value.digestWeekly ? 'weekly' : 'immediate'
    }
    
    await emailAlertService.configureAlertPreferences(mi_hacienda.value.id, payload)
    uiFeedbackStore.showSnackbar('Preferencias de notificación actualizadas', 'success')
  } catch (error) {
    uiFeedbackStore.showSnackbar('Error al guardar preferencias', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
:deep(.v-label) {
  opacity: 1 !important;
}
</style>
