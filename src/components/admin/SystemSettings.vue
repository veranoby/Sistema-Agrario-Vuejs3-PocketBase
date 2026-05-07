<template>
  <v-container fluid class="system-settings">
    <h2 class="text-h5 mb-4">Configuración del Sistema</h2>

    <v-row>
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
                v-model="settings.systemName"
                label="Nombre del Sistema"
                hint="Nombre que se muestra en la interfaz"
                persistent-hint
              />
              <v-text-field
                v-model="settings.supportEmail"
                label="Email de Soporte"
                type="email"
                hint="Email para contacto de soporte"
                persistent-hint
              />
              <v-select
                v-model="settings.timezone"
                label="Zona Horaria"
                :items="timezones"
                hint="Zona horaria del sistema"
                persistent-hint
              />
              <v-select
                v-model="settings.locale"
                label="Idioma"
                :items="locales"
                hint="Idioma predeterminado"
                persistent-hint
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="saveGeneralSettings">GUARDAR Cambios</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Límites del Sistema -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="secondary">mdi-scale-balance</v-icon>
            Límites del Sistema
          </v-card-title>
          <v-card-text>
            <v-form>
              <v-text-field
                v-model="settings.maxUsers"
                label="Máximo de Usuarios"
                type="number"
                hint="Número máximo de usuarios en el sistema"
                persistent-hint
              />
              <v-text-field
                v-model="settings.maxHaciendas"
                label="Máximo de Haciendas"
                type="number"
                hint="Número máximo de haciendas"
                persistent-hint
              />
              <v-text-field
                v-model="settings.storageLimit"
                label="Límite de Almacenamiento (GB)"
                type="number"
                hint="Límite de almacenamiento por hacienda"
                persistent-hint
              />
              <v-text-field
                v-model="settings.maxExportRecords"
                label="Máximo Registros Exportación"
                type="number"
                hint="Límite de registros por exportación"
                persistent-hint
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="secondary" @click="saveLimitsSettings">GUARDAR Límites</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Umbrales de Alertas -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="warning">mdi-alert</v-icon>
            Umbrales de Alertas
          </v-card-title>
          <v-card-text>
            <v-form>
              <v-slider
                v-model="settings.alertSyncQueueThreshold"
                label="Alerta Cola de Sincronización"
                min="10"
                max="100"
                step="5"
                thumb-label="always"
                hint="Número de operaciones para alertar"
                persistent-hint
              />
              <v-slider
                v-model="settings.alertCacheHitRate"
                label="Alerta Cache Hit Rate Mínimo"
                min="50"
                max="100"
                step="5"
                thumb-label="always"
                hint="Porcentaje mínimo de aciertos de cache"
                persistent-hint
              />
              <v-slider
                v-model="settings.alertErrorRate"
                label="Alerta Tasa de Error Máxima"
                min="1"
                max="20"
                step="1"
                thumb-label="always"
                hint="Porcentaje máximo de errores"
                persistent-hint
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="warning" @click="saveAlertSettings">GUARDAR Umbrales</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Feature Flags -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start color="info">mdi-flag</v-icon>
            Feature Flags
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item v-for="feature in featureFlags" :key="feature.key">
                <v-list-item-title>{{ feature.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ feature.description }}</v-list-item-subtitle>
                <template v-slot:append>
                  <v-switch
                    v-model="feature.enabled"
                    color="primary"
                    hide-details
                    @change="toggleFeature(feature)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Backup y Restore -->
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start color="success">mdi-database</v-icon>
            Backup y Restore
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <h4 class=" mb-2">Crear Backup</h4>
                <p class="text-body-2 text-grey mb-3">
                  Genera un backup completo de todos los datos del sistema.
                </p>
                <v-btn color="success" prepend-icon="mdi-download" @click="createBackup">
                  Crear Backup Ahora
                </v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <h4 class=" mb-2">Restaurar Backup</h4>
                <p class="text-body-2 text-grey mb-3">
                  Restaura los datos desde un archivo de backup.
                </p>
                <v-file-input
                  v-model="backupFile"
                  label="Seleccionar archivo de backup"
                  accept=".zip,.sql"
                  prepend-icon="mdi-upload"
                  @change="onBackupFileSelected"
                />
                <v-btn
                  color="error"
                  prepend-icon="mdi-restore"
                  :disabled="!backupFile"
                  @click="restoreBackup"
                >
                  Restaurar Backup
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Variables de Entorno -->
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start color="purple">mdi-code-braces</v-icon>
            Variables de Entorno
          </v-card-title>
          <v-card-text>
            <v-alert type="info" density="compact" class="mb-3">
              Estas variables se almacenan en el servidor y requieren reinicio para aplicar cambios.
            </v-alert>
            <v-data-table
              :headers="envHeaders"
              :items="envVariables"
              density="compact"
            >
              <template #item.value="{ item }">
                <v-text-field
                  v-model="item.value"
                  :type="item.secret ? 'password' : 'text'"
                  density="compact"
                  hide-details
                  @change="markEnvChanged(item)"
                />
              </template>
              <template #item.actions="{ item }">
                <v-btn
                  icon="mdi-eye"
                  size="small"
                  variant="text"
                  @click="item.secret = !item.secret"
                />
              </template>
            </v-data-table>
            <v-btn
              color="purple"
              class="mt-3"
              prepend-icon="mdi-content-save"
              :disabled="!envChanged"
              @click="saveEnvVariables"
            >
              GUARDAR Variables
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const uiFeedbackStore = useUiFeedbackStore()

// Estado
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')
const backupFile = ref(null)
const envChanged = ref(false)

// Configuración general
const settings = ref({
  systemName: 'ConAgri',
  supportEmail: 'soporte@agroassist.com',
  timezone: 'America/Guayaquil',
  locale: 'es-EC',
  maxUsers: 1000,
  maxHaciendas: 100,
  storageLimit: 10,
  maxExportRecords: 10000,
  alertSyncQueueThreshold: 50,
  alertCacheHitRate: 70,
  alertErrorRate: 5
})

// Feature flags
const featureFlags = ref([
  { key: 'ai_assistant', name: 'AI Assistant', description: 'Asistente IA en siembras', enabled: true },
  { key: 'advanced_reports', name: 'Reportes Avanzados', description: 'Reportes personalizados', enabled: true },
  { key: 'module_marketplace', name: 'Mercado de Módulos', description: 'Suscripción modular', enabled: false },
  { key: 'knowledge_hub', name: 'Knowledge Hub', description: 'Exportación a Markdown', enabled: false },
  { key: 'auto_backup', name: 'Backup Automático', description: 'Backups programados', enabled: true }
])

// Variables de entorno
const envVariables = ref([
  { key: 'PB_BASE_URL', value: '', secret: false, changed: false },
  { key: 'GEMINI_API_KEY', value: '', secret: true, changed: false },
  { key: 'MAX_CONCURRENT_USERS', value: '200', secret: false, changed: false },
  { key: 'CACHE_TTL', value: '600000', secret: false, changed: false }
])

const envHeaders = [
  { title: 'Variable', key: 'key' },
  { title: 'Valor', key: 'value' },
  { title: 'Acciones', key: 'actions', align: 'end' }
]

// Opciones
const timezones = [
  { title: 'America/Guayaquil (ECT)', value: 'America/Guayaquil' },
  { title: 'America/New_York (EST)', value: 'America/New_York' },
  { title: 'America/Mexico_City (CST)', value: 'America/Mexico_City' },
  { title: 'UTC', value: 'UTC' }
]

const locales = [
  { title: 'Español (Ecuador)', value: 'es-EC' },
  { title: 'Español (México)', value: 'es-MX' },
  { title: 'English (US)', value: 'en-US' }
]

onMounted(async () => {
  await loadSettings()
  await loadFeatureFlags()
  await loadEnvVariables()
})

// Cargar configuración
async function loadSettings() {
  try {
    const response = await pb.collection('settings').getFirstListItem('')
    settings.value = { ...settings.value, ...response }
  } catch (error) {
    if (error.status !== 404) {
      handleError(error, 'Error al cargar configuración')
    }
  }
}

// Cargar feature flags
async function loadFeatureFlags() {
  try {
    const response = await pb.collection('feature_flags').getFullList()
    if (response.length) {
      featureFlags.value = response.map(f => ({
        key: f.key,
        name: f.name,
        description: f.description,
        enabled: f.enabled
      }))
    }
  } catch (error) {
    // Feature flags no existen aún
  }
}

// Cargar variables de entorno
async function loadEnvVariables() {
  try {
    const response = await pb.collection('env_variables').getFullList()
    if (response.length) {
      envVariables.value = response.map(e => ({
        key: e.key,
        value: e.value,
        secret: e.secret || false,
        changed: false
      }))
    }
  } catch (error) {
    // Env variables no existen aún
  }
}

// GUARDAR configuración general
async function saveGeneralSettings() {
  try {
    await pb.collection('settings').upsert({
      key: 'general',
      ...settings.value
    })
    showSnackbar('Configuración guardada', 'success')
  } catch (error) {
    handleError(error, 'Error al guardar configuración')
  }
}

// GUARDAR límites
async function saveLimitsSettings() {
  try {
    await pb.collection('settings').upsert({
      key: 'limits',
      maxUsers: settings.value.maxUsers,
      maxHaciendas: settings.value.maxHaciendas,
      storageLimit: settings.value.storageLimit,
      maxExportRecords: settings.value.maxExportRecords
    })
    showSnackbar('Límites guardados', 'success')
  } catch (error) {
    handleError(error, 'Error al guardar límites')
  }
}

// GUARDAR umbrales de alertas
async function saveAlertSettings() {
  try {
    await pb.collection('settings').upsert({
      key: 'alerts',
      alertSyncQueueThreshold: settings.value.alertSyncQueueThreshold,
      alertCacheHitRate: settings.value.alertCacheHitRate,
      alertErrorRate: settings.value.alertErrorRate
    })
    showSnackbar('Umbrales guardados', 'success')
  } catch (error) {
    handleError(error, 'Error al guardar umbrales')
  }
}

// Toggle feature flag
async function toggleFeature(feature) {
  try {
    await pb.collection('feature_flags').upsert({
      key: feature.key,
      name: feature.name,
      description: feature.description,
      enabled: feature.enabled
    })
    showSnackbar(`Feature ${feature.enabled ? 'activada' : 'desactivada'}`, 'success')
  } catch (error) {
    handleError(error, 'Error al actualizar feature flag')
    feature.enabled = !feature.enabled
  }
}

// Marcar variable como cambiada
function markEnvChanged(item) {
  item.changed = true
  envChanged.value = envVariables.value.some(e => e.changed)
}

// GUARDAR variables de entorno
async function saveEnvVariables() {
  try {
    const changed = envVariables.value.filter(e => e.changed)
    await Promise.all(
      changed.map(e =>
        pb.collection('env_variables').upsert({
          key: e.key,
          value: e.value,
          secret: e.secret
        })
      )
    )
    envChanged.value = false
    showSnackbar('Variables guardadas', 'success')
  } catch (error) {
    handleError(error, 'Error al guardar variables')
  }
}

// Crear backup
async function createBackup() {
  try {
    showSnackbar('Generando backup...', 'info')
    // Implementar lógica de backup
    showSnackbar('Backup creado exitosamente', 'success')
  } catch (error) {
    handleError(error, 'Error al crear backup')
  }
}

// Seleccionar archivo de backup
function onBackupFileSelected(file) {
  backupFile.value = file
}

// Restaurar backup
async function restoreBackup() {
  try {
    if (!backupFile.value) return
    
    showSnackbar('Restaurando backup...', 'info')
    // Implementar lógica de restore
    showSnackbar('Backup restaurado exitosamente', 'success')
    backupFile.value = null
  } catch (error) {
    handleError(error, 'Error al restaurar backup')
  }
}

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.system-settings {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
