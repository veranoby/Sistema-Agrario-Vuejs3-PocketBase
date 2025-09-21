<template>
  <div class="conflict-history-viewer">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-history</v-icon>
          Historial de Cambios y Conflictos
        </div>
        <div>
          <v-btn
            variant="outlined"
            size="small"
            @click="refreshHistory"
            :loading="loading"
            class="mr-2"
          >
            <v-icon start>mdi-refresh</v-icon>
            Actualizar
          </v-btn>
          <v-btn
            variant="outlined"
            size="small"
            @click="exportHistory"
            :disabled="!hasHistory"
          >
            <v-icon start>mdi-download</v-icon>
            Exportar
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="filters.entityId"
              label="Filtrar por ID de Entidad"
              variant="outlined"
              density="compact"
              clearable
              @input="applyFilters"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="filters.collection"
              :items="availableCollections"
              label="Filtrar por Colección"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="applyFilters"
            />
          </v-col>
        </v-row>

        <v-tabs v-model="activeTab" class="mb-4">
          <v-tab value="changes">
            Cambios Locales
            <v-chip size="small" class="ml-2">{{ filteredChanges.length }}</v-chip>
          </v-tab>
          <v-tab value="conflicts">
            Resoluciones de Conflictos
            <v-chip size="small" class="ml-2">{{ conflictResolutions.length }}</v-chip>
          </v-tab>
        </v-tabs>

        <v-card-text class="pa-0">
          <v-tabs-window v-model="activeTab">
            <!-- Pestaña de Cambios Locales -->
            <v-tabs-window-item value="changes">
              <div v-if="filteredChanges.length === 0" class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-history</v-icon>
                <p class="text-h6 mt-4 text-grey-darken-1">No hay cambios registrados</p>
                <p class="text-body-2 text-grey-darken-2">
                  Los cambios aparecerán aquí cuando modifiques datos localmente
                </p>
              </div>

              <div v-else>
                <v-virtual-scroll
                  :items="filteredChanges"
                  height="400"
                  item-height="80"
                >
                  <template v-slot:default="{ item }">
                    <v-list-item @click="showChangeDetails(item)">
                      <template v-slot:prepend>
                        <v-avatar :color="getOperationColor(item.operation)" size="small">
                          <v-icon size="small" color="white">
                            {{ getOperationIcon(item.operation) }}
                          </v-icon>
                        </v-avatar>
                      </template>

                      <v-list-item-title>
                        {{ item.collection }} - {{ item.entityId }}
                      </v-list-item-title>

                      <v-list-item-subtitle>
                        <div class="d-flex justify-space-between align-center">
                          <span>{{ formatTimestamp(item.timestamp) }}</span>
                          <v-chip
                            :color="getOperationColor(item.operation)"
                            size="small"
                            variant="tonal"
                          >
                            {{ getOperationLabel(item.operation) }}
                          </v-chip>
                        </div>
                      </v-list-item-subtitle>

                      <template v-slot:append>
                        <v-btn
                          icon="mdi-chevron-right"
                          variant="text"
                          size="small"
                        />
                      </template>
                    </v-list-item>
                    <v-divider />
                  </template>
                </v-virtual-scroll>
              </div>
            </v-tabs-window-item>

            <!-- Pestaña de Resoluciones de Conflictos -->
            <v-tabs-window-item value="conflicts">
              <div v-if="conflictResolutions.length === 0" class="text-center pa-8">
                <v-icon size="64" color="grey-lighten-1">mdi-merge</v-icon>
                <p class="text-h6 mt-4 text-grey-darken-1">No hay conflictos resueltos</p>
                <p class="text-body-2 text-grey-darken-2">
                  Las resoluciones de conflictos aparecerán aquí cuando se sincronicen datos con conflictos
                </p>
              </div>

              <div v-else>
                <v-virtual-scroll
                  :items="conflictResolutions"
                  height="400"
                  item-height="100"
                >
                  <template v-slot:default="{ item }">
                    <v-list-item @click="showConflictDetails(item)">
                      <template v-slot:prepend>
                        <v-avatar :color="getStrategyColor(item.strategy)" size="small">
                          <v-icon size="small" color="white">
                            {{ getStrategyIcon(item.strategy) }}
                          </v-icon>
                        </v-avatar>
                      </template>

                      <v-list-item-title>
                        {{ item.collection }} - {{ item.entityId }}
                      </v-list-item-title>

                      <v-list-item-subtitle>
                        <div>{{ formatTimestamp(item.timestamp) }}</div>
                        <div class="d-flex justify-space-between align-center mt-1">
                          <span class="text-caption">Usuario: {{ item.userId }}</span>
                          <v-chip
                            :color="getStrategyColor(item.strategy)"
                            size="small"
                            variant="tonal"
                          >
                            {{ getStrategyLabel(item.strategy) }}
                          </v-chip>
                        </div>
                      </v-list-item-subtitle>

                      <template v-slot:append>
                        <v-btn
                          icon="mdi-chevron-right"
                          variant="text"
                          size="small"
                        />
                      </template>
                    </v-list-item>
                    <v-divider />
                  </template>
                </v-virtual-scroll>
              </div>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>

        <!-- Dialog para detalles de cambio -->
        <v-dialog v-model="changeDetailsDialog" max-width="800">
          <v-card v-if="selectedChange">
            <v-card-title>
              Detalles del Cambio
              <v-spacer />
              <v-btn icon="mdi-close" variant="text" @click="changeDetailsDialog = false" />
            </v-card-title>

            <v-card-text>
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    label="Colección"
                    :model-value="selectedChange.collection"
                    readonly
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    label="ID Entidad"
                    :model-value="selectedChange.entityId"
                    readonly
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    label="Operación"
                    :model-value="getOperationLabel(selectedChange.operation)"
                    readonly
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    label="Timestamp"
                    :model-value="formatTimestamp(selectedChange.timestamp)"
                    readonly
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-row v-if="selectedChange.oldData || selectedChange.newData">
                <v-col cols="12" sm="6" v-if="selectedChange.oldData">
                  <h4 class="mb-2">Datos Anteriores</h4>
                  <v-card variant="outlined">
                    <v-card-text>
                      <pre class="code-text">{{ JSON.stringify(selectedChange.oldData, null, 2) }}</pre>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="6" v-if="selectedChange.newData">
                  <h4 class="mb-2">Datos Nuevos</h4>
                  <v-card variant="outlined">
                    <v-card-text>
                      <pre class="code-text">{{ JSON.stringify(selectedChange.newData, null, 2) }}</pre>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-dialog>

        <!-- Dialog para detalles de conflicto -->
        <v-dialog v-model="conflictDetailsDialog" max-width="1000">
          <v-card v-if="selectedConflict">
            <v-card-title>
              Detalles de Resolución de Conflicto
              <v-spacer />
              <v-btn icon="mdi-close" variant="text" @click="conflictDetailsDialog = false" />
            </v-card-title>

            <v-card-text>
              <v-row>
                <v-col cols="12" sm="4">
                  <v-text-field
                    label="Colección"
                    :model-value="selectedConflict.collection"
                    readonly
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    label="ID Entidad"
                    :model-value="selectedConflict.entityId"
                    readonly
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    label="Estrategia"
                    :model-value="getStrategyLabel(selectedConflict.strategy)"
                    readonly
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" sm="4">
                  <h4 class="mb-2">Datos Locales</h4>
                  <v-card variant="outlined" class="code-card">
                    <v-card-text>
                      <pre class="code-text">{{ JSON.stringify(selectedConflict.localData, null, 2) }}</pre>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="4">
                  <h4 class="mb-2">Datos Remotos</h4>
                  <v-card variant="outlined" class="code-card">
                    <v-card-text>
                      <pre class="code-text">{{ JSON.stringify(selectedConflict.remoteData, null, 2) }}</pre>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" sm="4">
                  <h4 class="mb-2">Resolución Final</h4>
                  <v-card variant="outlined" class="code-card">
                    <v-card-text>
                      <pre class="code-text">{{ JSON.stringify(selectedConflict.resolution, null, 2) }}</pre>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useSyncStore } from '@/stores/syncStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

const syncStore = useSyncStore()
const snackbarStore = useSnackbarStore()

// Estado reactivo
const loading = ref(false)
const activeTab = ref('changes')
const changes = ref([])
const conflictResolutions = ref([])
const changeDetailsDialog = ref(false)
const conflictDetailsDialog = ref(false)
const selectedChange = ref(null)
const selectedConflict = ref(null)

// Filtros
const filters = reactive({
  entityId: '',
  collection: ''
})

// Colecciones disponibles
const availableCollections = [
  'Haciendas',
  'actividades',
  'siembras',
  'zonas',
  'programaciones',
  'bitacora',
  'recordatorios'
]

// Cambios filtrados
const filteredChanges = computed(() => {
  let filtered = changes.value

  if (filters.entityId) {
    filtered = filtered.filter(change =>
      change.entityId.toLowerCase().includes(filters.entityId.toLowerCase())
    )
  }

  if (filters.collection) {
    filtered = filtered.filter(change => change.collection === filters.collection)
  }

  return filtered
})

const hasHistory = computed(() => {
  return changes.value.length > 0 || conflictResolutions.value.length > 0
})

// Métodos auxiliares
function getOperationColor(operation) {
  const colors = {
    create: 'success',
    update: 'warning',
    delete: 'error'
  }
  return colors[operation] || 'info'
}

function getOperationIcon(operation) {
  const icons = {
    create: 'mdi-plus',
    update: 'mdi-pencil',
    delete: 'mdi-delete'
  }
  return icons[operation] || 'mdi-help'
}

function getOperationLabel(operation) {
  const labels = {
    create: 'Crear',
    update: 'Actualizar',
    delete: 'Eliminar'
  }
  return labels[operation] || operation
}

function getStrategyColor(strategy) {
  const colors = {
    auto: 'success',
    manual: 'warning',
    latest_wins: 'info',
    merge: 'primary'
  }
  return colors[strategy] || 'grey'
}

function getStrategyIcon(strategy) {
  const icons = {
    auto: 'mdi-auto-fix',
    manual: 'mdi-account',
    latest_wins: 'mdi-clock',
    merge: 'mdi-merge'
  }
  return icons[strategy] || 'mdi-help'
}

function getStrategyLabel(strategy) {
  const labels = {
    auto: 'Automática',
    manual: 'Manual',
    latest_wins: 'Más Reciente Gana',
    merge: 'Merge Inteligente'
  }
  return labels[strategy] || strategy
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString()
}

// Métodos principales
async function refreshHistory() {
  try {
    loading.value = true

    // Obtener cambios locales (últimos 100)
    changes.value = syncStore.getChangeHistory(null, null, 100)

    // Obtener resoluciones de conflictos (últimas 50)
    conflictResolutions.value = syncStore.getConflictResolutionHistory(50)

    console.log('Historial actualizado:', {
      changes: changes.value.length,
      conflicts: conflictResolutions.value.length
    })

  } catch (error) {
    console.error('Error actualizando historial:', error)
    snackbarStore.showSnackbar('Error actualizando historial', 'error')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  // Los filtros se aplican automáticamente mediante computed
  console.log('Filtros aplicados:', filters)
}

function showChangeDetails(change) {
  selectedChange.value = change
  changeDetailsDialog.value = true
}

function showConflictDetails(conflict) {
  selectedConflict.value = conflict
  conflictDetailsDialog.value = true
}

async function exportHistory() {
  try {
    const success = syncStore.exportChangeHistory()
    if (success) {
      snackbarStore.showSnackbar('Historial exportado exitosamente', 'success')
    } else {
      throw new Error('Error exportando historial')
    }
  } catch (error) {
    console.error('Error exportando historial:', error)
    snackbarStore.showSnackbar('Error exportando historial', 'error')
  }
}

// Inicialización
onMounted(() => {
  refreshHistory()
})
</script>

<style scoped>
.conflict-history-viewer {
  max-width: 100%;
}

.code-text {
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  max-height: 300px;
}

.code-card {
  max-height: 350px;
  overflow-y: auto;
}

.v-virtual-scroll {
  border: 1px solid rgb(var(--v-border-color));
  border-radius: 4px;
}

.v-list-item {
  cursor: pointer;
}

.v-list-item:hover {
  background-color: rgb(var(--v-theme-surface-variant));
}

@media (max-width: 960px) {
  .code-text {
    font-size: 10px;
  }

  .code-card {
    max-height: 200px;
  }
}
</style>