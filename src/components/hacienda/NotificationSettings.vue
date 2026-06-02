<template>
  <div class="bg-dinamico border-1 m-5 mt-4 px-4 py-4 shadow-md hover:shadow-xl rounded-lg">
    <h2 class="text-xl font-bold mb-4">
      <v-icon color="success" class="mr-2">mdi-bell-ring-outline</v-icon>
      {{ t('notifications.title') }}
    </h2>
    <p class="text-xs text-gray-600 mb-6">
      {{ t('notifications.subtitle') }}
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
              <div class="text-sm font-semibold">{{ t('notifications.weekly_digest_title') }}</div>
              <div class="text-xs text-gray-500">{{ t('notifications.weekly_digest_desc') }}</div>
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
              <div class="text-sm font-semibold text-red-darken-2">{{ t('notifications.emergency_alerts_title') }}</div>
              <div class="text-xs text-gray-500">{{ t('notifications.emergency_alerts_desc') }}</div>
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
          {{ t('notifications.save_preferences') }}
        </v-btn>
      </div>
    </v-form>
    
    <div v-else-if="loading" class="flex justify-center p-10">
      <v-progress-circular indeterminate color="success"></v-progress-circular>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { emailAlertService } from '@/services/emailAlertService'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
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
    let preferences = await emailAlertService.getAlertPreferences(mi_hacienda.value.id)
    
    // Fallback in case PocketBase returned a raw string
    if (typeof preferences === 'string' && preferences.trim() !== '') {
      try {
        preferences = JSON.parse(preferences)
      } catch (e) {
        console.warn('Could not parse alertConfig string', preferences)
      }
    }
    
    if (!preferences || typeof preferences !== 'object') {
      preferences = {}
    }

    config.value = {
      ...config.value,
      digestWeekly: preferences.digestWeekly === true || preferences.digestWeekly === 'true',
      emergencyAlerts: preferences.emergencyAlerts === true || preferences.emergencyAlerts === 'true',
      recipients: Array.isArray(preferences.recipients) ? preferences.recipients : [],
      enabled_types: Array.isArray(preferences.enabled_types) ? preferences.enabled_types : []
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
    const payload = {
      ...config.value,
      enabled_types: config.value.enabled_types,
      recipients: config.value.recipients,
      frequency: config.value.digestWeekly ? 'weekly' : 'immediate'
    }
    
    await emailAlertService.configureAlertPreferences(mi_hacienda.value.id, payload)
    
    // Update local store cache so that other parts of the app don't overwrite it with stale data
    if (haciendaStore.mi_hacienda) {
      haciendaStore.mi_hacienda.alertConfig = payload
    }
    
    uiFeedbackStore.showSnackbar(t('notifications.preferences_saved_success'), 'success')
  } catch (error) {
    uiFeedbackStore.showSnackbar(t('notifications.preferences_saved_error'), 'error')
  } finally {
    saving.value = false
  }
}

watch(() => mi_hacienda.value?.id, (newId) => {
  if (newId) {
    loadSettings()
  }
}, { immediate: true })
</script>

<style scoped>
:deep(.v-label) {
  opacity: 1 !important;
}
</style>
