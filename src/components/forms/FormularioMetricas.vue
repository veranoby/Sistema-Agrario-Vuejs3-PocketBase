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
      <v-card
        v-for="grupo in metricasAgrupadas"
        :key="grupo.principal.key"
        variant="flat"
        class="transition-all rounded-lg bg-grey-lighten-4"
        :class="{ 'bg-success-lighten-5 elevation-1': localSelection.includes(grupo.principal.key) }"
      >
        <v-card-text class="pa-3">
          <div class="flex items-center mb-2">
            <v-checkbox-btn
              :model-value="localSelection.includes(grupo.principal.key)"
              @update:model-value="toggleMetricSelection(grupo.principal.key, grupo.unidad?.key)"
              color="success"
              density="compact"
              class="mr-2 mt-n1"
            />
            <div class="flex flex-col" @click="toggleMetricSelection(grupo.principal.key, grupo.unidad?.key)" style="cursor: pointer;">
              <span class="text-body-2" :class="localSelection.includes(grupo.principal.key) ? 'text-success font-weight-bold' : 'text-grey-darken-3'">
                {{ grupo.principal.descripcion }}
              </span>
            </div>
          </div>
          
          <div class="mt-2 flex gap-2">
            <!-- Principal Metric -->
            <div :class="grupo.unidad ? 'w-2/3' : 'w-full'">
              <template v-if="grupo.principal.tipo === 'select'">
                <v-select
                  v-model="metricasValues[grupo.principal.key]"
                  :items="grupo.principal.opciones"
                  :label="grupo.principal.descripcion"
                  variant="outlined"
                  density="compact"
                  class="rounded-lg bg-white"
                  :rules="grupo.principal.requerido && localSelection.includes(grupo.principal.key) ? [v => !!v || 'Requerido'] : []"
                  hide-details="auto"
                  :disabled="!localSelection.includes(grupo.principal.key)"
                ></v-select>
              </template>
              <template v-else-if="grupo.principal.tipo === 'multi-select'">
                <v-select
                  v-model="metricasValues[grupo.principal.key]"
                  :items="grupo.principal.opciones"
                  :label="grupo.principal.descripcion"
                  multiple
                  chips
                  variant="outlined"
                  density="compact"
                  class="rounded-lg bg-white"
                  :rules="grupo.principal.requerido && localSelection.includes(grupo.principal.key) ? [v => !!v || 'Requerido'] : []"
                  hide-details="auto"
                  :disabled="!localSelection.includes(grupo.principal.key)"
                ></v-select>
              </template>
              <template v-else-if="grupo.principal.tipo === 'boolean' || grupo.principal.tipo === 'checkbox'">
                <v-checkbox
                  v-model="metricasValues[grupo.principal.key]"
                  :label="grupo.principal.descripcion"
                  density="compact"
                  color="success"
                  hide-details="auto"
                  :disabled="!localSelection.includes(grupo.principal.key)"
                ></v-checkbox>
              </template>
              <template v-else-if="grupo.principal.tipo === 'number'">
                <v-text-field
                  v-model.number="metricasValues[grupo.principal.key]"
                  :label="grupo.principal.descripcion"
                  type="number"
                  variant="outlined"
                  density="compact"
                  :suffix="grupo.principal.unidad"
                  class="bg-white rounded-lg"
                  :rules="grupo.principal.requerido && localSelection.includes(grupo.principal.key) ? [v => !!v || 'Requerido'] : []"
                  hide-details="auto"
                  :disabled="!localSelection.includes(grupo.principal.key)"
                ></v-text-field>
              </template>
              <template v-else-if="grupo.principal.tipo === 'date'">
                <v-text-field
                  v-model="metricasValues[grupo.principal.key]"
                  :label="grupo.principal.descripcion"
                  type="date"
                  variant="outlined"
                  density="compact"
                  class="bg-white rounded-lg"
                  :rules="grupo.principal.requerido && localSelection.includes(grupo.principal.key) ? [v => !!v || 'Requerido'] : []"
                  hide-details="auto"
                  :disabled="!localSelection.includes(grupo.principal.key)"
                ></v-text-field>
              </template>
              <template v-else>
                <v-text-field
                  v-model="metricasValues[grupo.principal.key]"
                  :label="grupo.principal.descripcion"
                  variant="outlined"
                  density="compact"
                  class="bg-white rounded-lg"
                  :rules="grupo.principal.requerido && localSelection.includes(grupo.principal.key) ? [v => !!v || 'Requerido'] : []"
                  hide-details="auto"
                  :disabled="!localSelection.includes(grupo.principal.key)"
                ></v-text-field>
              </template>
            </div>

            <!-- Unit Metric (if exists) -->
            <div v-if="grupo.unidad" class="w-1/3">
              <v-select
                v-model="metricasValues[grupo.unidad.key]"
                :items="grupo.unidad.opciones"
                variant="outlined"
                density="compact"
                class="rounded-lg bg-white"
                :rules="grupo.unidad.requerido && localSelection.includes(grupo.principal.key) ? [v => !!v || 'Req.'] : []"
                hide-details="auto"
                :disabled="!localSelection.includes(grupo.principal.key)"
                placeholder="Unidad"
              ></v-select>
            </div>
          </div>
        </v-card-text>
      </v-card>
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

const metricasAgrupadas = computed(() => {
  const grupos = [];
  let currentGrupo = null;

  for (const metrica of props.metricasDisponibles) {
    if (metrica.key.startsWith('unidad_') && currentGrupo && currentGrupo.principal.tipo === 'number') {
      currentGrupo.unidad = metrica;
    } else {
      currentGrupo = { principal: metrica, unidad: null };
      grupos.push(currentGrupo);
    }
  }
  return grupos;
});

const toggleMetricSelection = (metricKey, unitKey = null) => {
  const index = localSelection.value.indexOf(metricKey);
  if (index > -1) {
    localSelection.value.splice(index, 1);
    if (unitKey) {
      const unitIndex = localSelection.value.indexOf(unitKey);
      if (unitIndex > -1) localSelection.value.splice(unitIndex, 1);
    }
  } else {
    localSelection.value.push(metricKey);
    if (unitKey && !localSelection.value.includes(unitKey)) {
      localSelection.value.push(unitKey);
    }
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

