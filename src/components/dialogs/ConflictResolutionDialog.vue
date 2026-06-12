<template>
  <v-dialog
    v-model="show"
    max-width="900px"
    persistent
    scrollable
  >
    <v-card class="rounded-lg">
      <v-card-title class="pa-4 bg-error-lighten-5 flex items-center border-b">
        <v-icon start color="error" size="28" class="mr-3">mdi-alert-octagon</v-icon>
        <span class="text-md font-weight-bold">Conflictos de Sincronización</span>
        <v-spacer />
        <v-chip color="error" variant="flat" size="small" class="font-weight-bold">
          {{ safeConflicts.length }} {{ safeConflicts.length === 1 ? 'conflicto' : 'conflictos' }}
        </v-chip>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-alert
          type="warning"
          variant="tonal"
          class="mb-6 rounded-lg"
          density="compact"
          border="start"
        >
          Se han detectado discrepancias entre tu versión local y el servidor.
          Por favor, elige la versión que deseas conservar.
        </v-alert>

        <div class="flex flex-col gap-6">
          <div
            v-for="conflict in localConflicts"
            :key="conflict.id || conflict.tempId"
            class="border rounded-lg pa-4 transition-all"
            :class="conflict.resolved ? 'bg-grey-lighten-5 opacity-80' : 'bg-white shadow-sm'"
          >
            <div class="flex items-center gap-3 mb-4">
              <v-avatar :color="conflict.resolved ? 'success' : 'warning'" variant="tonal" size="40">
                <v-icon size="20">{{ conflict.resolved ? 'mdi-check' : 'mdi-file-document-outline' }}</v-icon>
              </v-avatar>
              <div class="flex flex-col">
                <span class=" font-weight-bold leading-tight">{{ getConflictTitle(conflict) }}</span>
                <div class="flex items-center gap-2 mt-1">
                  <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                    {{ conflict.collection }}
                  </v-chip>
                  <span class="text-xs text-grey">ID: {{ (conflict.id || conflict.tempId || '').slice(-8) }}</span>
                </div>
              </div>
            </div>

            <v-row dense>
              <v-col cols="12" sm="6">
                <v-card
                  variant="outlined"
                  :color="conflict.resolution === 'local' ? 'success' : 'grey-lighten-1'"
                  class="rounded-lg transition-all border-2"
                  :class="{ 'bg-primary-5 border-success': conflict.resolution === 'local' }"
                  @click="!conflict.resolved && selectResolution(conflict, 'local')"
                >
                  <div class="pa-3 border-b flex items-center justify-between" :class="conflict.resolution === 'local' ? 'bg-primary-4' : 'bg-grey-lighten-4'">
                    <span class="text-xs font-weight-bold flex items-center">
                      <v-icon start size="14" class="mr-1">mdi-cellphone</v-icon> Local
                    </span>
                    <v-icon v-if="conflict.resolution === 'local'" color="primary" size="16">mdi-check-circle</v-icon>
                  </div>
                  <v-card-text class="pa-2">
                    <pre class="text-[10px] font-mono bg-black/5 p-2 rounded max-h-32 overflow-y-auto">{{ formatConflictData(conflict.local) }}</pre>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6">
                <v-card
                  variant="outlined"
                  :color="conflict.resolution === 'server' ? 'success' : 'grey-lighten-1'"
                  class="rounded-lg transition-all border-2"
                  :class="{ 'bg-primary-5 border-success': conflict.resolution === 'server' }"
                  @click="!conflict.resolved && selectResolution(conflict, 'server')"
                >
                  <div class="pa-3 border-b flex items-center justify-between" :class="conflict.resolution === 'server' ? 'bg-primary-4' : 'bg-grey-lighten-4'">
                    <span class="text-xs font-weight-bold flex items-center">
                      <v-icon start size="14" class="mr-1">mdi-cloud</v-icon> Servidor
                    </span>
                    <v-icon v-if="conflict.resolution === 'server'" color="primary" size="16">mdi-check-circle</v-icon>
                  </div>
                  <v-card-text class="pa-2">
                    <pre class="text-[10px] font-mono bg-black/5 p-2 rounded max-h-32 overflow-y-auto">{{ formatConflictData(conflict.server) }}</pre>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-4">
        <div class="flex gap-2 w-full flex-wrap sm:flex-nowrap">
          <v-btn
            v-if="hasUnresolved"
            variant="tonal"
            color="primary"
            size="small"
            @click="resolveAll('local')"
            class="flex-1"
          >
            Usar Todo Local
          </v-btn>
          <v-btn
            v-if="hasUnresolved"
            variant="tonal"
            color="primary"
            size="small"
            @click="resolveAll('server')"
            class="flex-1"
          >
            Usar Todo Servidor
          </v-btn>
          <v-spacer class="hidden sm:block" />
          <v-btn
            variant="text"
            color="grey-darken-1"
            @click="cancel"
          >
            CANCELAR
          </v-btn>
          <v-btn
            variant="flat"
            color="primary"
            :disabled="!allResolved"
            @click="applyResolutions"
            class="px-6"
          >
            Aplicar ({{ resolvedCount }}/{{ localConflicts.length }})
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  conflicts: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'resolve'])

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const safeConflicts = computed(() => Array.isArray(props.conflicts) ? props.conflicts : [])

const localConflicts = ref([])

watch(
  () => props.conflicts,
  (newConflicts) => {
    localConflicts.value = (Array.isArray(newConflicts) ? newConflicts : []).map(c => ({
      ...c,
      resolved: false,
      resolution: null
    }))
  },
  { immediate: true, deep: true }
)

const hasUnresolved = computed(() => localConflicts.value.some(c => !c.resolved))
const allResolved = computed(() => localConflicts.value.length > 0 && localConflicts.value.every(c => c.resolved))
const resolvedCount = computed(() => localConflicts.value.filter(c => c.resolved).length)

function getConflictTitle(conflict) {
  const collectionNames = {
    'zonas': 'Zona', 'siembras': 'Siembra', 'actividades': 'Actividad',
    'bitacora': 'Entrada de Bitácora', 'recordatorios': 'Recordatorio', 'programaciones': 'Programación'
  }
  const collectionName = collectionNames[conflict.collection] || conflict.collection
  const localName = conflict.local?.nombre || conflict.local?.name || conflict.local?.descripcion || ''
  const serverName = conflict.server?.nombre || conflict.server?.name || conflict.server?.descripcion || ''
  if (localName && serverName && localName !== serverName) return `${collectionName}: "${localName}" vs "${serverName}"`
  if (localName) return `${collectionName}: ${localName}`
  return `${collectionName} - Conflicto`
}

function formatConflictData(data) {
  if (!data) return 'Sin datos'
  const importantFields = ['nombre', 'name', 'descripcion', 'description', 'estado', 'estado_ejecucion', 'fecha']
  const important = {}, rest = {}
  Object.keys(data).forEach(key => {
    if (importantFields.includes(key)) important[key] = data[key]
    else if (!key.startsWith('expand') && !key.startsWith('id') && key !== 'created' && key !== 'updated') rest[key] = data[key]
  })
  return JSON.stringify({ ...important, ...rest }, null, 2)
}

function selectResolution(conflict, resolution) {
  const item = localConflicts.value.find(c => (c.id && c.id === conflict.id) || (c.tempId && c.tempId === conflict.tempId))
  if (item) { item.resolved = true; item.resolution = resolution; }
}

function resolveAll(resolution) {
  localConflicts.value.forEach(c => { c.resolved = true; c.resolution = resolution; })
}

function cancel() {
  localConflicts.value.forEach(c => { c.resolved = false; c.resolution = null; })
  show.value = false
}

function applyResolutions() {
  emit('resolve', localConflicts.value.filter(c => c.resolved).map(c => ({
    id: c.id, tempId: c.tempId, collection: c.collection, resolution: c.resolution,
    local: c.local, server: c.server
  })))
  show.value = false
}
</script>

<style scoped>
/* Scoped styles minimized by using Vuetify props and Tailwind utility classes */
</style>

