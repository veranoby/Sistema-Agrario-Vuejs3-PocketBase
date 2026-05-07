<template>
  <div class="siembra-selector">
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-grey-darken-3 flex items-center">
        <v-icon start color="success" class="mr-2">mdi-sprout-outline</v-icon>
        Siembras Involucradas
      </h4>
      <div v-if="siembrasToDisplay.length > 1" class="flex gap-2">
        <v-btn
          size="x-small"
          variant="tonal"
          color="primary"
          @click="selectAll"
          :disabled="allSelected"
        >
          Todas
        </v-btn>
        <v-btn
          size="x-small"
          variant="tonal"
          color="error"
          @click="clearAll"
          :disabled="modelValue.length === 0"
        >
          Ninguna
        </v-btn>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <v-progress-circular indeterminate color="success" size="24" />
    </div>

    <div v-else-if="siembrasToDisplay.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <v-card
        v-for="siembra in siembrasToDisplay"
        :key="siembra.id"
        variant="flat"
        class="transition-all rounded-lg bg-grey-lighten-4"
        :class="{ 'bg-success-lighten-5 elevation-1': modelValue.includes(siembra.id) }"
        @click="toggleSelection(siembra.id)"
      >
        <v-card-text class="pa-3 flex items-center">
          <v-checkbox-btn
            :model-value="modelValue.includes(siembra.id)"
            color="success"
            density="compact"
            class="mr-2"
          />
          <div class="flex flex-col">
            <span class="text-body-2" :class="modelValue.includes(siembra.id) ? 'text-success font-weight-bold' : 'text-grey-darken-3'">
              {{ siembra.nombre }}
            </span>
            <span class="text-caption text-grey-darken-1">
              {{ siembra.tipo }}
            </span>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <div v-else class="text-caption text-grey-darken-1 pa-4 bg-grey-lighten-5 rounded-lg text-center">
      <v-icon start size="16">mdi-information-outline</v-icon>
      No hay siembras disponibles para esta selección.
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useSiembrasStore } from '@/stores/siembrasStore';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  availableIds: {
    type: Array,
    default: null // If null, show all sowings from store
  },
  readonly: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const siembrasStore = useSiembrasStore();
const loading = ref(false);

const siembrasToDisplay = computed(() => {
  if (props.availableIds) {
    return siembrasStore.siembras.filter(s => props.availableIds.includes(s.id));
  }
  return siembrasStore.siembras;
});

const allSelected = computed(() => {
  return siembrasToDisplay.value.length > 0 && 
         siembrasToDisplay.value.every(s => props.modelValue.includes(s.id));
});

onMounted(async () => {
  if (siembrasStore.siembras.length === 0) {
    loading.value = true;
    try {
      await siembrasStore.cargarSiembras();
    } finally {
      loading.value = false;
    }
  }

  // Auto-select all available ones if no previous selection exists
  if (props.modelValue.length === 0 && props.availableIds && props.availableIds.length > 0) {
    emit('update:modelValue', [...props.availableIds]);
  }
});

// Watch for availableIds in case they are loaded asynchronously
watch(() => props.availableIds, (newIds) => {
  if (props.modelValue.length === 0 && newIds && newIds.length > 0) {
    console.log('[SiembraSelectorList] Async auto-selection triggered:', newIds);
    emit('update:modelValue', [...newIds]);
  }
}, { immediate: true });

const toggleSelection = (id) => {
  if (props.readonly) return;
  const newSelection = [...props.modelValue];
  const index = newSelection.indexOf(id);
  if (index > -1) {
    newSelection.splice(index, 1);
  } else {
    newSelection.push(id);
  }
  emit('update:modelValue', newSelection);
};

const selectAll = () => {
  emit('update:modelValue', siembrasToDisplay.value.map(s => s.id));
};

const clearAll = () => {
  emit('update:modelValue', []);
};
</script>

<style scoped>
.siembra-selector {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
