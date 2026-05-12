<template>
  <v-container fluid class="system-settings">
    <h2 class="text-h5 mb-4">Configuración del Sistema</h2>

    <v-row v-if="!settingsStore.loading">
      <!-- Configuración General -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="primary">mdi-cog</v-icon>
            Configuración General
          </v-card-title>
          <v-card-text>
            <v-form>
              <v-text-field
                v-model="localConfig.system_name"
                label="Nombre del Sistema"
                hint="Nombre que se muestra en la interfaz"
                persistent-hint
              />
              <v-text-field
                v-model="localConfig.support_email"
                label="Email de Soporte"
                type="email"
                hint="Email para contacto de soporte"
                persistent-hint
              />
              <v-switch
                v-model="localConfig.maintenance_mode"
                label="Modo Mantenimiento"
                color="warning"
                hint="Bloquea el acceso a usuarios no-superadmin"
                persistent-hint
              />
              <v-switch
                v-model="localConfig.allow_registration"
                label="Permitir Registros"
                color="success"
                hint="Permite nuevos registros desde el landing page"
                persistent-hint
              />
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Configuración IA y Correo -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="orange">mdi-robot</v-icon>
            Configuración IA y APIS
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="localConfig.global_openrouter_key"
              label="OpenRouter Global Key"
              hint="Llave de respaldo para haciendas sin llave propia"
              persistent-hint
            />
            <v-text-field
              v-model="localConfig.resend_api_key"
              label="Resend API Key"
              hint="Llave para envío de correos"
              persistent-hint
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model.number="localConfig.ai_rate_limit"
                  label="Límite IA"
                  type="number"
                  hint="Ej: 5 peticiones"
                  persistent-hint
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="localConfig.ai_rate_window"
                  label="Ventana de IA (ms)"
                  type="number"
                  hint="Ej: 3600000 para 1h"
                  persistent-hint
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Instrucciones Bancarias -->
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start color="green">mdi-bank</v-icon>
            Información Bancaria
          </v-card-title>
          <v-card-text>
            <v-alert type="info" density="compact" class="mb-3">
              Estas instrucciones se mostrarán a los usuarios cuando deseen pagar su suscripción por transferencia.
            </v-alert>
            <v-textarea
              v-model="localConfig.bank_account_info"
              label="Instrucciones Bancarias (Se permite Markdown)"
              rows="5"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Botón de Guardar General -->
    <v-row v-if="!settingsStore.loading">
      <v-col cols="12" class="text-right">
        <v-btn color="primary" size="large" @click="saveSettings">
          Guardar Configuración
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-else>
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { handleError } from '@/utils/errorHandler'

const settingsStore = useSettingsStore()

// Estado UI
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')

const localConfig = ref({
  system_name: '',
  support_email: '',
  maintenance_mode: false,
  allow_registration: true,
  bank_account_info: '',
  resend_api_key: '',
  global_openrouter_key: '',
  ai_rate_limit: 5,
  ai_rate_window: 3600000
})

onMounted(async () => {
  await settingsStore.fetchConfig()
  if (settingsStore.system_config) {
    localConfig.value = { ...settingsStore.system_config }
  }
})

async function saveSettings() {
  const success = await settingsStore.updateConfig(localConfig.value)
  if (success) {
    showSnackbar('Configuración guardada correctamente', 'success')
  } else {
    showSnackbar('Error al guardar configuración', 'error')
  }
}

function showSnackbar(message, color = 'success') {
  uiFeedbackStore.showSnackbar(message, color)
}
</script>

<style scoped>
.system-settings {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
