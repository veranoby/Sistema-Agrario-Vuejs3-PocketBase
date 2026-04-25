<template>
  <v-dialog
    v-model="show"
    max-width="900px"
    persistent
    scrollable
  >
    <v-card class="conflict-dialog">
      <v-card-title class="d-flex align-center pa-4 bg-error-light">
        <v-icon start color="error" size="large">mdi-alert-octagon</v-icon>
        <span class="text-h5">Conflictos de Sincronización</span>
        <v-spacer />
        <v-chip color="error" variant="tonal">
          {{ conflicts.length }} {{ conflicts.length === 1 ? 'conflicto' : 'conflictos' }}
        </v-chip>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-alert type="warning" variant="tonal" class="mb-4" density="compact">
          <template #prepend>
            <v-icon>mdi-information</v-icon>
          </template>
          Hay cambios conflictivos entre tu versión local y la del servidor.
          Selecciona qué versión mantener para cada conflicto.
        </v-alert>

        <v-list class="conflict-list">
          <v-list-item
            v-for="conflict in conflicts"
            :key="conflict.id"
            class="conflict-item mb-3"
            :class="{ 'conflict-resolved': conflict.resolved }"
          >
            <template #prepend>
              <v-avatar color="warning" variant="tonal">
                <v-icon>mdi-file-document-outline</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="text-h6 mb-2">
              {{ getConflictTitle(conflict) }}
            </v-list-item-title>

            <v-list-item-subtitle class="text-caption mb-3">
              <v-chip size="x-small" color="info" variant="tonal">
                {{ conflict.collection }}
              </v-chip>
              <span class="ml-2 text-grey">ID: {{ conflict.id?.slice(-8) || conflict.tempId?.slice(-8) }}</span>
            </v-list-item-subtitle>

            <!-- Diff visual local vs server -->
            <v-row class="diff-container mt-2" dense>
              <v-col cols="12" sm="6">
                <v-card
                  variant="tonal"
                  :color="conflict.resolution === 'local' ? 'success' : 'blue-grey'"
                  :class="{ 'selected-version': conflict.resolution === 'local' }"
                  class="diff-card local-card"
                  :ripple="!conflict.resolved"
                  @click="!conflict.resolved && selectResolution(conflict, 'local')"
                >
                  <v-card-title class="text-subtitle-2 pa-2">
                    <v-icon start size="small">mdi-cellphone</v-icon>
                    Tu Versión (Local)
                    <v-spacer />
                    <v-icon v-if="conflict.resolution === 'local'" color="success">mdi-check-circle</v-icon>
                  </v-card-title>
                  <v-card-text class="pa-2">
                    <pre class="diff-content">{{ formatConflictData(conflict.local) }}</pre>
                  </v-card-text>
                  <v-card-actions v-if="!conflict.resolved" class="pa-2">
                    <v-btn
                      size="small"
                      color="success"
                      variant="tonal"
                      block
                      @click.stop="selectResolution(conflict, 'local')"
                    >
                      Mantener Local
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6">
                <v-card
                  variant="tonal"
                  :color="conflict.resolution === 'server' ? 'success' : 'blue-grey'"
                  :class="{ 'selected-version': conflict.resolution === 'server' }"
                  class="diff-card server-card"
                  :ripple="!conflict.resolved"
                  @click="!conflict.resolved && selectResolution(conflict, 'server')"
                >
                  <v-card-title class="text-subtitle-2 pa-2">
                    <v-icon start size="small">mdi-cloud</v-icon>
                    Versión Servidor
                    <v-spacer />
                    <v-icon v-if="conflict.resolution === 'server'" color="success">mdi-check-circle</v-icon>
                  </v-card-title>
                  <v-card-text class="pa-2">
                    <pre class="diff-content">{{ formatConflictData(conflict.server) }}</pre>
                  </v-card-text>
                  <v-card-actions v-if="!conflict.resolved" class="pa-2">
                    <v-btn
                      size="small"
                      color="success"
                      variant="tonal"
                      block
                      @click.stop="selectResolution(conflict, 'server')"
                    >
                      Mantener Servidor
                    </v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          v-if="hasUnresolved"
          variant="tonal"
          color="info"
          @click="resolveAll('local')"
        >
          <v-icon start>mdi-check-all</v-icon>
          Todos los Locales
        </v-btn>
        <v-btn
          v-if="hasUnresolved"
          variant="tonal"
          color="info"
          @click="resolveAll('server')"
        >
          <v-icon start>mdi-check-all</v-icon>
          Todos del Servidor
        </v-btn>
        <v-spacer />
        <v-btn
          variant="text"
          color="grey"
          @click="cancel"
        >
          Cancelar
        </v-btn>
        <v-btn
          variant="tonal"
          color="success"
          :disabled="!allResolved"
          @click="applyResolutions"
        >
          <v-icon start>mdi-check-circle</v-icon>
          Aplicar Resoluciones ({{ resolvedCount }}/{{ conflicts.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSyncStore } from '@/stores/syncStore'

const syncStore = useSyncStore()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  conflicts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'resolve'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const localConflicts = ref([])

// Sincronizar conflicts prop con localConflicts
watch(
  () => props.conflicts,
  (newConflicts) => {
    localConflicts.value = newConflicts.map(c => ({
      ...c,
      resolved: false,
      resolution: null
    }))
  },
  { immediate: true, deep: true }
)

const hasUnresolved = computed(() => {
  return localConflicts.value.some(c => !c.resolved)
})

const allResolved = computed(() => {
  return localConflicts.value.length > 0 && localConflicts.value.every(c => c.resolved)
})

const resolvedCount = computed(() => {
  return localConflicts.value.filter(c => c.resolved).length
})

function getConflictTitle(conflict) {
  const collectionNames = {
    'zonas': 'Zona',
    'siembras': 'Siembra',
    'actividades': 'Actividad',
    'bitacora': 'Entrada de Bitácora',
    'recordatorios': 'Recordatorio',
    'programaciones': 'Programación'
  }

  const collectionName = collectionNames[conflict.collection] || conflict.collection

  // Intentar obtener un nombre descriptivo
  const localName = conflict.local?.nombre || conflict.local?.name || conflict.local?.descripcion || ''
  const serverName = conflict.server?.nombre || conflict.server?.name || conflict.server?.descripcion || ''

  if (localName && serverName && localName !== serverName) {
    return `${collectionName}: "${localName}" vs "${serverName}"`
  } else if (localName) {
    return `${collectionName}: ${localName}`
  }

  return `${collectionName} - Conflicto de versión`
}

function formatConflictData(data) {
  if (!data) return 'Sin datos'

  // Campos importantes a mostrar primero
  const importantFields = ['nombre', 'name', 'descripcion', 'description', 'estado', 'estado_ejecucion', 'fecha', 'fecha_ejecucion']
  const important = {}
  const rest = {}

  Object.keys(data).forEach(key => {
    if (importantFields.includes(key)) {
      important[key] = data[key]
    } else if (!key.startsWith('expand') && !key.startsWith('id') && key !== 'created' && key !== 'updated') {
      rest[key] = data[key]
    }
  })

  const formatted = { ...important, ...rest }

  return JSON.stringify(formatted, null, 2)
}

function selectResolution(conflict, resolution) {
  const index = localConflicts.value.findIndex(c => c.id === conflict.id || c.tempId === conflict.tempId)
  if (index !== -1) {
    localConflicts.value[index].resolved = true
    localConflicts.value[index].resolution = resolution
  }
}

function resolveAll(resolution) {
  localConflicts.value.forEach(conflict => {
    if (!conflict.resolved) {
      conflict.resolved = true
      conflict.resolution = resolution
    }
  })
}

function cancel() {
  // Resetear resoluciones
  localConflicts.value.forEach(conflict => {
    conflict.resolved = false
    conflict.resolution = null
  })
  show.value = false
}

function applyResolutions() {
  const resolvedConflicts = localConflicts.value
    .filter(c => c.resolved)
    .map(c => ({
      id: c.id,
      tempId: c.tempId,
      collection: c.collection,
      resolution: c.resolution,
      local: c.local,
      server: c.server
    }))

  emit('resolve', resolvedConflicts)
  show.value = false
}
</script>

<style scoped>
.conflict-dialog {
  overflow: hidden;
}

.conflict-list {
  max-height: 500px;
  overflow-y: auto;
}

.conflict-item {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.conflict-item.conflict-resolved {
  opacity: 0.6;
  background-color: rgba(76, 175, 80, 0.05);
}

.diff-container {
  margin: 0 -8px;
}

.diff-card {
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
}

.diff-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.diff-card.selected-version {
  border: 2px solid rgb(76, 175, 80);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
}

.diff-content {
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.02);
  padding: 8px;
  border-radius: 4px;
}

.local-card {
  border-left: 4px solid rgb(33, 150, 243);
}

.server-card {
  border-left: 4px solid rgb(255, 152, 0);
}

/* Dark theme adjustments */
.v-theme--dark .diff-content {
  background-color: rgba(255, 255, 255, 0.05);
}

.v-theme--dark .conflict-item {
  border-color: rgba(255, 255, 255, 0.12);
}
</style>
