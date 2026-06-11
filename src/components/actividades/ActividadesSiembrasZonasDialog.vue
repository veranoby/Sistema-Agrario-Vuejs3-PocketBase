<template>
  <v-dialog v-model="dialogVisible" persistent max-width="1100px" max-height="80vh" scrollable>
    <div class="grid grid-cols-2 gap-2 p-0 m-2 bg-white">
      <v-card>
        <v-toolbar color="primary" dark density="compact">
          <v-toolbar-title small
            ><span class="text-sm"
              ><v-icon class="mr-2">mdi-sprout</v-icon>{{ t('activity_workspace.sowings_projects') }}</span
            ></v-toolbar-title
          >
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-card-text class="ml-4 mr-4" style="max-height: 55vh; overflow-y: auto;">
          <v-chip-group column color="green-darken-4" multiple :model-value="selectedSiembras"
            @update:model-value="$emit('update:selected-siembras', $event)">
            <v-tooltip
              v-for="siembra in siembras"
              :key="siembra.id"
              :text="`${siembra.nombre} - ${siembra.tipo}`"
              location="top"
            >
              <template #activator="{ props: tooltipProps }">
                <v-chip
                  v-bind="tooltipProps"
                  :value="siembra.id"
                  filter
                  density="compact"
                  class="chip-truncate"
                >
                  {{ `${siembra.nombre}-${siembra.tipo}` }}
                </v-chip>
              </template>
            </v-tooltip>
          </v-chip-group>
        </v-card-text>
      </v-card>
      <v-card>
        <v-toolbar color="primary" dark density="compact">
          <v-toolbar-title
            ><span class="text-sm"
              ><v-icon class="mr-2">mdi-map</v-icon>{{ t('activity_workspace.available_zones') }}</span
            ></v-toolbar-title
          >
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-card-text class="ml-4 mr-4" style="max-height: 55vh; overflow-y: auto;">
          <v-chip-group color="blue-darken-4" column multiple :model-value="selectedZonas"
            @update:model-value="$emit('update:selected-zonas', $event)">
            <v-tooltip
              v-for="zona in filteredZonas"
              :key="zona.id"
              :text="`${zona.nombre} (${getZonaTipoNombre(zona.id)})`"
              location="top"
            >
              <template #activator="{ props: tooltipProps }">
                <v-chip
                  v-bind="tooltipProps"
                  :value="zona.id"
                  filter
                  size="small"
                  density="compact"
                  pill
                  class="chip-truncate"
                >
                  {{ `${zona.nombre} (${getZonaTipoNombre(zona.id)})` }}
                </v-chip>
              </template>
            </v-tooltip>
          </v-chip-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            @click="dialogVisible = false"
            variant="flat"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            >{{ t('activity_workspace.cancel') }}</v-btn
          >
          <v-btn
            @click="$emit('save')"
            variant="flat"            
            prepend-icon="mdi-check"
            color="green-lighten-3"
            >{{ t('activity_workspace.save') }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useZonasStore } from '@/stores/zonasStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  siembras: {
    type: Array,
    required: true
  },
  filteredZonas: {
    type: Array,
    required: true
  },
  selectedSiembras: {
    type: Array,
    required: true
  },
  selectedZonas: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'update:selected-siembras', 'update:selected-zonas', 'save'])

const { t } = useI18n()
const zonasStore = useZonasStore()

const dialogVisible = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newVal) => {
    dialogVisible.value = newVal
  }
)

watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

const getZonaTipoNombre = (zonaId) => {
  return zonasStore.getTipoZonaNombreByZonaId(zonaId)
}
</script>

<style scoped>
.grid {
  display: grid;
}

/* Chips con texto truncado — nowrap evita wrap de 2 líneas, ellipsis muestra que hay más */
.chip-truncate {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-flex;
  align-items: center;
}

/* El contenido interno del chip también debe truncarse */
.chip-truncate :deep(.v-chip__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
