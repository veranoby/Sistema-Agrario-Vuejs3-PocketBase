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
                color="primary"
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
            <v-select
              v-model="localConfig.global_ai_config.provider"
              :items="['custom', 'openrouter']"
              label="AI Provider"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="localConfig.global_ai_config.model"
              label="AI Model"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="localConfig.global_ai_config.base_url"
              label="AI Base URL"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="localConfig.global_ai_config.auth_token"
              label="AI Auth Token"
              type="password"
              variant="outlined"
              density="compact"
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
            <v-icon start color="primary">mdi-bank</v-icon>
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

    <!-- Planes y Módulos -->
    <v-row v-if="!settingsStore.loading">
      <!-- Gestión de Planes -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="blue">mdi-card-account-details</v-icon>
            Gestión de Planes
          </v-card-title>
          <v-card-text>
            <v-expansion-panels>
              <v-expansion-panel v-for="plan in planesList" :key="plan.id">
                <v-expansion-panel-title>{{ plan.nombre || plan.name }}</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-text-field v-model.number="plan.precio" label="Precio" type="number" density="compact" />
                  <v-text-field v-model.number="plan.operadores" label="Límite Operadores" type="number" density="compact" />
                  <v-text-field v-model.number="plan.auditores" label="Límite Auditores" type="number" density="compact" />
                  <v-btn color="primary" size="small" @click="updatePlan(plan)">Guardar Plan</v-btn>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Gestión de Módulos -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="purple">mdi-view-module</v-icon>
            Gestión de Módulos
          </v-card-title>
          <v-card-text>
             <v-list>
               <v-list-item v-for="modulo in modulosList" :key="modulo.id">
                 <v-list-item-title>{{ modulo.nombre || modulo.name }}</v-list-item-title>
                 <v-list-item-subtitle>{{ modulo.descripcion }}</v-list-item-subtitle>
                 <template v-slot:append>
                   <v-switch v-model="modulo.is_active" color="primary" hide-details @change="updateModulo(modulo)"></v-switch>
                 </template>
               </v-list-item>
             </v-list>
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

  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { pb } from '@/utils/pocketbase'

const settingsStore = useSettingsStore()
const uiFeedbackStore = useUiFeedbackStore()

const planesList = ref([])
const modulosList = ref([])

const localConfig = ref({
  system_name: '',
  support_email: '',
  maintenance_mode: false,
  allow_registration: true,
  bank_account_info: '',
  resend_api_key: '',
  global_ai_config: { provider: 'custom', base_url: '', model: '', auth_token: '' },
  ai_rate_limit: 5,
  ai_rate_window: 3600000
})

onMounted(async () => {
  await settingsStore.fetchConfig()
  if (settingsStore.system_config) {
    localConfig.value = { 
      ...settingsStore.system_config,
      global_ai_config: settingsStore.system_config.global_ai_config || { provider: 'custom', base_url: '', model: '', auth_token: '' }
    }
  }
  await fetchPlanesAndModulos()
})

async function fetchPlanesAndModulos() {
  try {
    const [planes, modulos] = await Promise.all([
      pb.collection('planes').getFullList(),
      pb.collection('modulos').getFullList()
    ])
    planesList.value = planes
    modulosList.value = modulos
  } catch (err) {
    console.error('Error fetching planes/modulos', err)
  }
}

async function updatePlan(plan) {
  try {
    await pb.collection('planes').update(plan.id, {
      precio: plan.precio,
      operadores: plan.operadores,
      auditores: plan.auditores
    })
    showSnackbar('Plan actualizado', 'success')
  } catch (err) {
    handleError(err, 'Error al actualizar plan')
  }
}

async function updateModulo(modulo) {
  try {
    await pb.collection('modulos').update(modulo.id, {
      is_active: modulo.is_active
    })
    showSnackbar('Módulo actualizado', 'success')
  } catch (err) {
    handleError(err, 'Error al actualizar módulo')
  }
}

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
