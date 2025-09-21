<template>
  <div class="selective-sync-settings">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-sync-circle</v-icon>
        Configuración de Sincronización Selectiva
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-switch
              v-model="localConfig.enabled"
              label="Habilitar Sincronización Selectiva"
              color="primary"
              hide-details
              class="mb-4"
              @change="updateConfig"
            />
          </v-col>
        </v-row>

        <v-divider class="mb-4" />

        <div v-if="localConfig.enabled">
          <v-row>
            <v-col cols="12">
              <h3 class="text-h6 mb-3">Configuración por Colección</h3>
              <p class="text-body-2 text-grey-darken-1 mb-4">
                Configure qué datos sincronizar y con qué prioridad
              </p>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <div class="collection-settings">
                <div
                  v-for="(config, collection) in localConfig.collections"
                  :key="collection"
                  class="collection-item"
                >
                  <v-card variant="outlined" class="mb-3">
                    <v-card-text>
                      <v-row align="center">
                        <v-col cols="12" sm="3">
                          <v-checkbox
                            v-model="config.enabled"
                            :label="getCollectionDisplayName(collection)"
                            color="primary"
                            hide-details
                            @change="updateConfig"
                          />
                        </v-col>

                        <v-col cols="12" sm="3">
                          <v-select
                            v-model="config.priority"
                            :items="priorityOptions"
                            label="Prioridad"
                            variant="outlined"
                            density="compact"
                            :disabled="!config.enabled"
                            @update:model-value="updateConfig"
                          />
                        </v-col>

                        <v-col cols="12" sm="3">
                          <v-switch
                            v-model="config.immediate"
                            label="Sincronización Inmediata"
                            color="primary"
                            hide-details
                            :disabled="!config.enabled"
                            @change="updateConfig"
                          />
                        </v-col>

                        <v-col cols="12" sm="3">
                          <v-chip
                            :color="getPriorityColor(config.priority)"
                            size="small"
                            variant="tonal"
                          >
                            {{ getPriorityLabel(config.priority) }}
                          </v-chip>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="localConfig.deferredSyncInterval"
                label="Intervalo de Sincronización Diferida (ms)"
                type="number"
                variant="outlined"
                :min="5000"
                :max="300000"
                suffix="ms"
                @blur="updateConfig"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-grey-darken-1">
                <v-icon size="small" class="mr-1">mdi-information</v-icon>
                Los datos no inmediatos se sincronizan cada {{ Math.round(localConfig.deferredSyncInterval / 1000) }} segundos
              </div>
            </v-col>
          </v-row>
        </div>

        <v-row class="mt-4">
          <v-col cols="12">
            <v-alert
              v-if="!localConfig.enabled"
              type="info"
              variant="tonal"
              class="mb-4"
            >
              <template v-slot:prepend>
<v-icon >mdi-information</v-icon>
</template>
              Cuando la sincronización selectiva está deshabilitada, todos los datos se sincronizan inmediatamente.
            </v-alert>

            <v-alert
              v-if="localConfig.enabled && hasHighPriorityDisabled"
              type="warning"
              variant="tonal"
              class="mb-4"
            >
              <template v-slot:prepend>
<v-icon >mdi-alert</v-icon>
</template>
              Algunos datos críticos (Haciendas, Actividades) están deshabilitados. Esto puede afectar la funcionalidad del sistema.
            </v-alert>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <div class="d-flex justify-space-between">
              <v-btn
                variant="outlined"
                @click="resetToDefaults"
              >
                Restaurar Defaults
              </v-btn>

              <v-btn
                color="primary"
                @click="saveConfiguration"
                :loading="saving"
              >
                Guardar Configuración
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSyncStore } from '@/stores/syncStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

const syncStore = useSyncStore()
const snackbarStore = useSnackbarStore()

const saving = ref(false)
const localConfig = ref({
  enabled: false,
  collections: {},
  deferredSyncInterval: 30000,
  lastDeferredSync: null
})

const priorityOptions = [
  { title: 'Alta', value: 'high' },
  { title: 'Media', value: 'medium' },
  { title: 'Baja', value: 'low' }
]

const collectionDisplayNames = {
  Haciendas: 'Haciendas',
  actividades: 'Actividades',
  siembras: 'Siembras',
  zonas: 'Zonas',
  programaciones: 'Programaciones',
  bitacora: 'Bitácora',
  recordatorios: 'Recordatorios'
}

const hasHighPriorityDisabled = computed(() => {
  if (!localConfig.value.enabled) return false

  const criticalCollections = ['Haciendas', 'actividades']
  return criticalCollections.some(collection =>
    localConfig.value.collections[collection] &&
    !localConfig.value.collections[collection].enabled
  )
})

function getCollectionDisplayName(collection) {
  return collectionDisplayNames[collection] || collection
}

function getPriorityColor(priority) {
  const colors = {
    high: 'red',
    medium: 'orange',
    low: 'green'
  }
  return colors[priority] || 'grey'
}

function getPriorityLabel(priority) {
  const labels = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja'
  }
  return labels[priority] || priority
}

function loadConfiguration() {
  try {
    const config = syncStore.getSelectiveSyncConfig()
    localConfig.value = JSON.parse(JSON.stringify(config)) // Deep copy
  } catch (error) {
    console.error('Error cargando configuración:', error)
    resetToDefaults()
  }
}

function updateConfig() {
  // Validar configuración antes de aplicar
  if (localConfig.value.deferredSyncInterval < 5000) {
    localConfig.value.deferredSyncInterval = 5000
  }
  if (localConfig.value.deferredSyncInterval > 300000) {
    localConfig.value.deferredSyncInterval = 300000
  }
}

async function saveConfiguration() {
  try {
    saving.value = true

    const success = syncStore.configureSelectiveSync(localConfig.value)

    if (success) {
      snackbarStore.showSnackbar('Configuración guardada exitosamente', 'success')
    } else {
      throw new Error('Error guardando configuración')
    }
  } catch (error) {
    console.error('Error guardando configuración:', error)
    snackbarStore.showSnackbar('Error guardando configuración', 'error')
  } finally {
    saving.value = false
  }
}

function resetToDefaults() {
  localConfig.value = {
    enabled: false,
    collections: {
      Haciendas: { enabled: true, priority: 'high', immediate: true },
      actividades: { enabled: true, priority: 'high', immediate: true },
      siembras: { enabled: true, priority: 'medium', immediate: true },
      zonas: { enabled: true, priority: 'medium', immediate: true },
      programaciones: { enabled: true, priority: 'low', immediate: false },
      bitacora: { enabled: true, priority: 'low', immediate: false },
      recordatorios: { enabled: false, priority: 'low', immediate: false }
    },
    deferredSyncInterval: 30000,
    lastDeferredSync: null
  }
}

onMounted(() => {
  loadConfiguration()
})

// Watch para detectar cambios importantes y mostrar advertencias
watch(() => localConfig.value.enabled, (newValue) => {
  if (newValue) {
    snackbarStore.showSnackbar('Sincronización selectiva habilitada. Configure las prioridades según sus necesidades.', 'info')
  }
})
</script>

<style scoped>
.selective-sync-settings {
  max-width: 100%;
}

.collection-settings {
  background-color: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 16px;
}

.collection-item {
  transition: all 0.2s ease;
}

.collection-item:hover {
  transform: translateY(-1px);
}

.text-caption {
  line-height: 1.4;
}

@media (max-width: 960px) {
  .collection-item .v-row {
    flex-direction: column;
  }

  .collection-item .v-col {
    padding-bottom: 8px;
  }
}
</style>