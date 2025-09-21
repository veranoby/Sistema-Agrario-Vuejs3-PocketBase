<template>
  <div v-if="metricasDisponibles.length > 0" class="agricultural-metrics-form">
    <!-- Header and Batch Controls -->
    <div class="d-flex align-center justify-space-between mb-3">
      <h4 class="text-subtitle-1 font-weight-bold agricultural-section-title">
        <v-icon start color="green-darken-2">mdi-chart-line</v-icon>
        Métricas a Registrar
      </h4>
      <div class="d-flex ga-2">
        <v-btn
          size="small"
          variant="outlined"
          color="primary"
          @click="selectAllMetrics"
          :disabled="allMetricsSelected"
        >
          Seleccionar Todo
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="error"
          @click="clearAllMetrics"
          :disabled="!anyMetricsSelected"
        >
          Limpiar Todo
        </v-btn>
      </div>
    </div>

    <!-- Metrics Grid -->
    <v-row dense>
      <v-col
        v-for="metrica in metricasDisponibles"
        :key="metrica.key"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card
          variant="outlined"
          class="agricultural-metric-card"
          :class="{ 'metric-selected': localSelection.includes(metrica.key) }"
          @click="toggleMetricSelection(metrica.key)"
        >
          <v-card-text class="pa-3">
            <v-checkbox-btn
              :model-value="localSelection.includes(metrica.key)"
              color="success"
              class="agricultural-checkbox"
            >
              <template #label>
                <div class="metric-label-content">
                  <div class="metric-name">{{ metrica.descripcion }}</div>
                  <div class="metric-value">
                    <strong>{{ metrica.valor }}</strong>
                    <span v-if="metrica.unidad" class="text-caption"> {{ metrica.unidad }}</span>
                  </div>
                </div>
              </template>
            </v-checkbox-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Selection Summary Alert -->
    <v-alert
      v-if="localSelection.length > 0"
      type="info"
      variant="tonal"
      class="mt-3 agricultural-alert"
      density="compact"
    >
      <v-icon start>mdi-information</v-icon>
      {{ localSelection.length }} de {{ metricasDisponibles.length }} métricas se registrarán.
    </v-alert>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  metricasDisponibles: {
    type: Array,
    default: () => []
  },
  modelValue: { // Used for v-model
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue']);

const localSelection = ref([...props.modelValue]);

// Sync local state with parent via v-model
watch(localSelection, (newSelection) => {
  emit('update:modelValue', newSelection);
});

// Sync with parent if prop changes from outside
watch(() => props.modelValue, (newParentValue) => {
  if (JSON.stringify(newParentValue) !== JSON.stringify(localSelection.value)) {
    localSelection.value = [...newParentValue];
  }
});

// Auto-select all when the list of available metrics changes
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
/* Using shared agricultural styles from other components */
.agricultural-metrics-form {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.agricultural-section-title {
  color: var(--agri-soil-dark, #3e2723);
  display: flex;
  align-items: center;
  gap: 8px;
}

.agricultural-metric-card {
  border: 2px solid rgba(76, 175, 80, 0.2);
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--agri-surface-card, #ffffff);
  min-height: 80px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.agricultural-metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--agri-green-primary, #2e7d32), var(--agri-green-light, #4caf50));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.agricultural-metric-card:hover {
  border-color: var(--agri-green-light, #4caf50);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.2);
}

.agricultural-metric-card:hover::before {
  opacity: 1;
}

.agricultural-metric-card.metric-selected {
  border-color: var(--agri-green-primary, #2e7d32);
  background: rgba(46, 125, 50, 0.05);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.15);
}

.agricultural-metric-card.metric-selected::before {
  opacity: 1;
}

.agricultural-checkbox {
  width: 100%;
}

.agricultural-checkbox .v-label {
  width: 100%;
  color: var(--agri-soil-dark, #3e2723);
}

.metric-label-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--agri-soil-dark, #3e2723);
  line-height: 1.2;
}

.metric-value {
  font-size: 0.85rem;
  color: var(--agri-earth-brown, #5d4037);
  opacity: 0.8;
}

.metric-selected .metric-name {
  color: var(--agri-green-primary, #2e7d32);
  font-weight: 700;
}

.metric-selected .metric-value {
  color: var(--agri-earth-brown, #5d4037);
  font-weight: 600;
}

.agricultural-alert {
  border-radius: 8px;
  border-left: 4px solid var(--agri-sky-blue, #1976d2);
}

.v-btn.v-btn--variant-outlined {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.025em;
  min-height: 36px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
