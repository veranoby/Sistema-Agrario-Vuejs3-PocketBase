<template>
  <div v-if="metricasDisponibles.length > 0" class="fade-in">
    <!-- Header and Batch Controls -->
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-grey-darken-3 flex items-center">
        <v-icon start color="success" class="mr-2">mdi-chart-line</v-icon>
        Métricas a Registrar
      </h4>
      <div class="flex gap-2">
        <v-btn
          size="x-small"
          variant="tonal"
          color="primary"
          @click="selectAllMetrics"
          :disabled="allMetricsSelected"
        >
          Todo
        </v-btn>
        <v-btn
          size="x-small"
          variant="tonal"
          color="error"
          @click="clearAllMetrics"
          :disabled="!anyMetricsSelected"
        >
          Limpiar
        </v-btn>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <!-- MODO SELECCIÓN (Checklist para Batch) -->
      <template v-if="mode === 'select'">
        <v-card
          v-for="metrica in metricasDisponibles"
          :key="metrica.key"
          variant="flat"
          class="transition-all rounded-lg bg-grey-lighten-4"
          :class="{ 'bg-success-lighten-5 elevation-1': localSelection.includes(metrica.key) }"
          @click="toggleMetricSelection(metrica.key)"
        >
          <v-card-text class="pa-3 flex items-start">
            <v-checkbox-btn
              :model-value="localSelection.includes(metrica.key)"
              color="success"
              density="compact"
              class="mt-n1"
            />
            <div class="flex flex-col ml-1">
              <span class="text-body-2" :class="localSelection.includes(metrica.key) ? 'text-success font-weight-bold' : 'text-grey-darken-3'">
                {{ metrica.descripcion }}
              </span>
              <span class="text-caption text-grey-darken-1">
                {{ metrica.valor }} <span class="text-grey">{{ metrica.unidad }}</span>
              </span>
            </div>
          </v-card-text>
        </v-card>
      </template>

      <!-- MODO EDICIÓN (Inputs para Bitácora Individual) -->
      <template v-else-if="mode === 'edit'">
        <div
          v-for="metrica in metricasDisponibles"
          :key="metrica.key"
          class="flex flex-col"
        >
          <template v-if="metrica.tipo === 'select'">
            <v-select
              v-model="metricasValues[metrica.key]"
              :items="metrica.opciones"
              :label="metrica.descripcion"
              variant="outlined"
              density="compact"
              class="rounded-lg"
              :rules="metrica.requerido ? [v => !!v || 'Requerido'] : []"
              hide-details="auto"
            ></v-select>
          </template>
          <template v-else-if="metrica.tipo === 'boolean' || metrica.tipo === 'checkbox'">
            <v-checkbox
              v-model="metricasValues[metrica.key]"
              :label="metrica.descripcion"
              density="compact"
              color="success"
              hide-details="auto"
            ></v-checkbox>
          </template>
          <template v-else-if="metrica.tipo === 'number'">
            <v-text-field
              v-model.number="metricasValues[metrica.key]"
              :label="metrica.descripcion"
              type="number"
              variant="outlined"
              density="compact"
              :suffix="metrica.unidad"
              :rules="metrica.requerido ? [v => !!v || 'Requerido'] : []"
              hide-details="auto"
            ></v-text-field>
          </template>
          <template v-else>
            <v-text-field
              v-model="metricasValues[metrica.key]"
              :label="metrica.descripcion"
              variant="outlined"
              density="compact"
              :rules="metrica.requerido ? [v => !!v || 'Requerido'] : []"
              hide-details="auto"
            ></v-text-field>
          </template>
        </div>
      </template>
    </div>

    <!-- Selection Summary -->
    <div
      v-if="localSelection.length > 0"
      class="mt-4 px-4 py-2 bg-blue-grey-lighten-5 rounded-lg d-inline-flex align-center border-l-4 border-blue-grey-lighten-2"
    >
      <v-icon size="16" color="blue-grey-darken-2" class="mr-2">mdi-information-outline</v-icon>
      <span class="text-caption text-blue-grey-darken-3">
        {{ localSelection.length }} de {{ metricasDisponibles.length }} métricas seleccionadas para registro.
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  metricasDisponibles: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: 'select', // 'select' or 'edit'
    validator: (v) => ['select', 'edit'].includes(v)
  },
  metricasValues: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'update:metricasValues']);

const localSelection = ref([...props.modelValue]);
const metricasValues = computed({
  get: () => props.metricasValues,
  set: (val) => emit('update:metricasValues', val)
});

watch(localSelection, (newSelection) => {
  emit('update:modelValue', newSelection);
}, { deep: true });

watch(() => props.modelValue, (newParentValue) => {
  if (JSON.stringify(newParentValue) !== JSON.stringify(localSelection.value)) {
    localSelection.value = [...newParentValue];
  }
});

watch(() => props.metricasDisponibles, () => {
  selectAllMetrics();
}, { deep: true });

const allMetricsSelected = computed(() => {
  return props.metricasDisponibles.length > 0 &&
         localSelection.value.length === props.metricasDisponibles.length;
});

const anyMetricsSelected = computed(() => {
  return localSelection.value.length > 0;
});

const toggleMetricSelection = (metricKey) => {
  const index = localSelection.value.indexOf(metricKey);
  if (index > -1) {
    localSelection.value.splice(index, 1);
  } else {
    localSelection.value.push(metricKey);
  }
};

const selectAllMetrics = () => {
  localSelection.value = props.metricasDisponibles.map(m => m.key);
};

const clearAllMetrics = () => {
  localSelection.value = [];
};
</script>

<style scoped>
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

