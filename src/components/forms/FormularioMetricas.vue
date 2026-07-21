<template>
  <div v-if="metricasDisponibles.length > 0" class="fade-in">
    <!-- Header and Batch Controls -->
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-grey-darken-3 flex items-center">
        <v-icon start color="primary" class="mr-2">mdi-chart-line</v-icon>
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
        :class="{ 'bg-primary-5 elevation-1': localSelection.includes(grupo.principal.key) }"
      >
        <v-card-text class="pa-3">
          <div class="flex items-center mb-2">
            <v-checkbox-btn
              :model-value="localSelection.includes(grupo.principal.key)"
              @update:model-value="toggleMetricSelection(grupo.principal.key, grupo.unidad?.key)"
              color="primary"
              density="compact"
              class="mr-2 mt-n1"
            />
            <div class="flex flex-col" @click="toggleMetricSelection(grupo.principal.key, grupo.unidad?.key)" style="cursor: pointer;">
              <div class="d-flex align-center gap-1">
                <span class="text-md" :class="localSelection.includes(grupo.principal.key) ? 'text-primary font-weight-bold' : 'text-grey-darken-3'">
                  {{ grupo.principal.descripcion }}
                </span>
                <!-- Tooltip inteligente para campos críticos vacíos (QW0-T4) -->
                <v-tooltip
                  v-if="isMetricCritical(grupo.principal.key) && !isValueFilled(metricasValues[grupo.principal.key])"
                  location="top"
                >
                  <template v-slot:activator="{ props: tooltipProps }">
                    <v-icon
                      v-bind="tooltipProps"
                      size="x-small"
                      color="warning"
                      class="ml-1 cursor-pointer"
                      @click.stop
                    >
                      mdi-information
                    </v-icon>
                  </template>
                  <span class="text-xs">{{ getMetricHelpTooltip(grupo) }}</span>
                </v-tooltip>
              </div>
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
                  color="primary"
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
      <span class="text-xs text-blue-grey-darken-3">
        {{ localSelection.length }} de {{ metricasDisponibles.length }} métricas seleccionadas para registro.
      </span>
    </div>

    <!-- Widget Calculadora de Mezclas "Al Vuelo" (QW1-T2) -->
    <v-card
      v-if="isApplicableForMixCalculator && mixCalculationResult"
      variant="outlined"
      color="teal"
      class="mt-4 pa-3 rounded-lg bg-teal-lighten-5 border-teal"
    >
      <div class="d-flex align-center mb-1">
        <v-icon color="teal-darken-2" class="mr-2" size="small">mdi-calculator-variant-outline</v-icon>
        <span class="text-xs font-weight-bold text-teal-darken-4">Calculadora de Mezclas "Al Vuelo"</span>
        <v-spacer></v-spacer>
        <v-chip color="teal-darken-2" size="x-small" variant="flat">Freemium</v-chip>
      </div>

      <div v-if="mixCalculationResult.status === 'OK'" class="text-xs text-teal-darken-4">
        <div><strong>Volumen total sugerido:</strong> {{ mixCalculationResult.cantidadTotal }} {{ mixCalculationResult.unidadTotal }}</div>
        <div v-if="mixCalculationResult.equivalenciaTexto" class="text-grey-darken-2 text-caption">
          💡 {{ mixCalculationResult.equivalenciaTexto }} (para {{ mixTotalArea }} ha totales)
        </div>
        <v-btn
          v-if="hasVolumenField"
          size="x-small"
          color="teal-darken-2"
          variant="flat"
          class="mt-2 text-none"
          @click="applyMixToVolumenField"
        >
          <v-icon start size="x-small">mdi-check-all</v-icon>
          Aplicar {{ mixCalculationResult.cantidadTotal }} al campo de volumen
        </v-btn>
      </div>

      <div v-else class="text-xs text-teal-darken-3">
        <span>💡 {{ mixCalculationResult.mensaje }}</span>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { CRITICAL_FIELDS_MAP } from '@/composables/useFieldCompleteness';
import { useMixCalculator } from '@/composables/useMixCalculator';
import { useZonasStore } from '@/stores/zonasStore';

function isMetricCritical(key) {
  if (!key) return false;
  return Object.values(CRITICAL_FIELDS_MAP).some(fields => fields.includes(key));
}

function isValueFilled(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim() !== '';
  if (typeof val === 'number') return !isNaN(val);
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

function getMetricHelpTooltip(grupo) {
  const key = grupo?.principal?.key;
  if (key === 'periodo_carencia_dias') {
    return 'Requerido por Art. 16 BPA. Tiempo obligatorio entre aplicación y cosecha para evitar trazas de químicos.';
  }
  if (key === 'ingrediente_activo') {
    return 'Requerido por Art. 15 BPA. Principio activo químico necesario para verificar dosis aprobadas.';
  }
  if (key === 'registro_oficial_agrocalidad') {
    return 'Requerido por Art. 15 BPA. Código de registro nacional para descartar contrabando.';
  }
  if (key === 'analisis_suelo_referencia') {
    return 'Requerido por Art. 12 BPA. Número de análisis de laboratorio que justifica la fertilización.';
  }
  if (key === 'lote_fabricacion') {
    return 'Requerido por Art. 12 BPA. Lote de fábrica indispensable para trazabilidad y retiro sanitario.';
  }
  if (key === 'codigo_trazabilidad_lote') {
    return 'Requerido por Art. 21/34 BPA. Permite trazar el lote cosechado desde el campo hasta el comprador.';
  }
  if (key === 'analisis_calidad_agua_fecha') {
    return 'Requerido por Art. 13 BPA. Fecha del último análisis microbiológico del agua de riego.';
  }
  if (key === 'metodo_disposicion') {
    return 'Requerido por Art. 19 BPA. Método de disposición final (ej: Campo Limpio, compostaje).';
  }

  const bpaDesc = grupo?.principal?.descripcionBpa || grupo?.principal?.descripcion;
  return bpaDesc ? `Requerido por BPA: ${bpaDesc}` : 'Campo recomendado para auditoría BPA.';
}

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
  },
  zonasIds: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'update:metricasValues']);

const { calcularMezcla } = useMixCalculator();
const zonasStore = useZonasStore();

function getZonaAreaHectareas(z) {
  if (!z) return 0;
  let val = 0;
  let unit = 'ha';
  if (typeof z.area === 'object' && z.area !== null) {
    val = Number(z.area.area) || 0;
    unit = z.area.unidad || 'ha';
  } else if (typeof z.area === 'number') {
    val = z.area;
  } else if (typeof z.superficie === 'number') {
    val = z.superficie;
  } else if (typeof z.area_hectareas === 'number') {
    val = z.area_hectareas;
  }

  if (unit === 'm²') return val / 10000;
  if (unit === 'km²') return val * 100;
  return val;
}

const isApplicableForMixCalculator = computed(() => {
  const keys = props.metricasDisponibles.map(m => m.key);
  return keys.some(k => k.includes('dosis') || k.includes('volumen') || k.includes('fertiliz') || k.includes('plaga'));
});

const mixTotalArea = computed(() => {
  const selectedIds = props.zonasIds || [];
  if (!selectedIds.length) {
    const allZonas = zonasStore.zonas || [];
    if (!allZonas.length) return 0;
    return Number(allZonas.reduce((acc, z) => acc + getZonaAreaHectareas(z), 0).toFixed(2));
  }
  return Number(selectedIds.reduce((acc, id) => {
    const z = zonasStore.zonas.find(item => item.id === id);
    return acc + getZonaAreaHectareas(z);
  }, 0).toFixed(2));
});

const mixCalculationResult = computed(() => {
  if (!isApplicableForMixCalculator.value) return null;

  const dosisVal = metricasValues.value.dosis_aplicada || metricasValues.value.dosis || metricasValues.value.dosis_por_hectarea;
  const unidadVal = metricasValues.value.unidad_dosis_aplicada || metricasValues.value.unidad_dosis || 'L/ha';

  return calcularMezcla(mixTotalArea.value, dosisVal, unidadVal);
});

const hasVolumenField = computed(() => {
  const keys = props.metricasDisponibles.map(m => m.key);
  return keys.some(k => k.includes('volumen_agua') || k.includes('volumen_total') || k.includes('cantidad_total'));
});

const applyMixToVolumenField = () => {
  if (!mixCalculationResult.value?.cantidadTotal) return;
  const targetKey = props.metricasDisponibles.find(m =>
    m.key.includes('volumen_agua') || m.key.includes('volumen_total') || m.key.includes('cantidad_total')
  )?.key || 'volumen_agua_utilizada';

  if (targetKey) {
    const updated = { ...metricasValues.value, [targetKey]: mixCalculationResult.value.cantidadTotal };
    emit('update:metricasValues', updated);
    if (!localSelection.value.includes(targetKey)) {
      toggleMetricSelection(targetKey);
    }
  }
};

const localSelection = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const metricasValues = computed({
  get: () => props.metricasValues,
  set: (val) => emit('update:metricasValues', val)
});

// Auto-select all metrics when available metrics change, but only if selection is currently empty
// or if we're initializing
watch(() => props.metricasDisponibles, (newVal) => {
  if (props.modelValue.length === 0 && newVal.length > 0) {
    selectAllMetrics();
  }
}, { deep: true, immediate: true });

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
  const newSelection = [...props.modelValue];
  const index = newSelection.indexOf(metricKey);
  if (index > -1) {
    newSelection.splice(index, 1);
    if (unitKey) {
      const unitIndex = newSelection.indexOf(unitKey);
      if (unitIndex > -1) newSelection.splice(unitIndex, 1);
    }
  } else {
    newSelection.push(metricKey);
    if (unitKey && !newSelection.includes(unitKey)) {
      newSelection.push(unitKey);
    }
  }
  emit('update:modelValue', newSelection);
};

const selectAllMetrics = () => {
  emit('update:modelValue', props.metricasDisponibles.map(m => m.key));
};

const clearAllMetrics = () => {
  emit('update:modelValue', []);
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

