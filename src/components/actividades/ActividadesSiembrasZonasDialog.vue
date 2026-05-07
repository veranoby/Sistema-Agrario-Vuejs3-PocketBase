<template>
  <v-dialog v-model="dialogVisible" persistent max-width="900px">
    <div class="grid grid-cols-2 gap-2 p-0 m-2 bg-white">
      <v-card>
        <v-toolbar color="success" dark density="compact">
          <v-toolbar-title small
            ><span class="text-sm"
              ><v-icon class="mr-2">mdi-sprout</v-icon>{{ t('activity_workspace.sowings_projects') }}</span
            ></v-toolbar-title
          >
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-card-text class="ml-4 mr-4">
          <v-chip-group column color="green-darken-4" multiple :model-value="selectedSiembras"
            @update:model-value="$emit('update:selected-siembras', $event)">
            <v-chip
              v-for="siembra in siembras"
              :key="siembra.id"
              :text="`${siembra.nombre}-${siembra.tipo}`"
              :value="siembra.id"
              filter
              density="compact"
            ></v-chip>
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

        <v-card-text class="ml-4 mr-4">
          <v-chip-group color="blue-darken-4" column multiple :model-value="selectedZonas"
            @update:model-value="$emit('update:selected-zonas', $event)">
            <v-chip
              v-for="zona in filteredZonas"
              :key="zona.id"
              :text="`${zona.nombre}(${getZonaTipoNombre(zona.id)})`"
              :value="zona.id"
              filter
              size="small"
              density="compact"
              pill
            ></v-chip>
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
  const zona = zonasStore.getZonaById(zonaId)
  return zona?.expand?.tipos_zonas?.nombre.toUpperCase() || ''
}
</script>

<style scoped>
.grid {
  display: grid;
}
</style>
