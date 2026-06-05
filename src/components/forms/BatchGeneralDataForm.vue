<template>
  <v-form ref="form">
    <div v-if="actividadPreview" class="flex flex-col gap-8">
      <!-- Activity Preview Section -->
      <div class="bg-dinamico p-4 rounded-lg">
        <div class="flex items-center mb-4">
          <v-icon color="success" class="mr-2">mdi-leaf</v-icon>
          <div class="flex flex-col">
            <h4 class=" leading-tight">{{ actividadPreview.nombre }}</h4>
            <span class="text-caption text-grey-darken-1 font-weight-medium">
              {{ actividadPreview.expand?.tipo_actividades?.nombre || 'Tipo no disponible' }}
            </span>
          </div>
          <v-spacer />
          <v-chip v-if="!isSingleEntry" color="success" variant="flat" size="small" class="">
            <v-icon start size="14">mdi-calendar-multiple</v-icon>
            {{ fechasSeleccionadas.length }} entradas
          </v-chip>
        </div>

        <div class="ml-8">
          <!-- Date Range Display (Only for Batch) -->
          <div v-if="!isSingleEntry && fechasSeleccionadas.length > 0" class="bg-blue-grey-lighten-5 pa-2 px-4 rounded-pill d-inline-flex align-center mb-6">
            <v-icon size="16" color="blue-grey-darken-2" class="mr-2">mdi-calendar-range</v-icon>
            <span class="text-caption  text-blue-grey-darken-3">Rango: {{ formatDateRange() }}</span>
          </div>

          <!-- Selectable Metrics Section -->
          <FormularioMetricas
            :metricas-disponibles="metricasDisponibles"
            v-model="metricasSeleccionadas"
          />

          <!-- Auto-generated Observations Preview (REMOVED as per latest instruction) -->
        </div>
      </div>

      <!-- Additional Observations Input -->
      <div class="bg-dinamico p-4 rounded-lg">
        <div class="flex items-center mb-4">
          <v-icon color="primary" class="mr-2">mdi-pencil-outline</v-icon>
          <h4 class="">Observaciones Adicionales</h4>
        </div>
        <div class="ml-8">
          <v-textarea
            v-model="observacionesAdicionales"
            label="Detalles adicionales para la bitácora"
            rows="3"
            variant="outlined"
            density="compact"
            color="primary"
            hint="Estas observaciones se combinarán con los datos del sistema en cada entrada"
            persistent-hint
            :placeholder="observacionesPlaceholder"
            @input="$emit('update:observaciones', observacionesAdicionales)"
            class="rounded-lg"
          />
        </div>
      </div>
    </div>
  </v-form>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { format } from 'date-fns';
import FormularioMetricas from './FormularioMetricas.vue';

const props = defineProps({
  actividadPreview: { type: Object, default: null },
  fechasSeleccionadas: { type: Array, default: () => [] },
  observaciones: { type: String, default: '' },
  metricasSeleccionadas: { type: Array, default: () => [] },
  isSingleEntry: { type: Boolean, default: false }
});

const emit = defineEmits(['update:observaciones', 'update:metricasSeleccionadas']);

const form = ref(null);
const observacionesAdicionales = ref(props.observaciones);

const metricasSeleccionadas = computed({
  get: () => props.metricasSeleccionadas,
  set: (value) => emit('update:metricasSeleccionadas', value)
});

watch(() => props.observaciones, (newValue) => {
  observacionesAdicionales.value = newValue;
});

const metricasDisponibles = computed(() => {
  if (!props.actividadPreview?.metricas) return [];
  return Object.entries(props.actividadPreview.metricas)
    .filter(([_, m]) => m.valor !== null && m.valor !== undefined && m.valor !== '')
    .map(([key, metrica]) => ({
      key,
      descripcion: metrica.descripcion || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      valor: metrica.valor,
      unidad: metrica.unidad || ''
    }));
});

const formatDateRange = () => {
  if (props.fechasSeleccionadas.length === 0) return 'Sin fechas';
  if (props.fechasSeleccionadas.length === 1) return formatDate(props.fechasSeleccionadas[0]);
  const sorted = [...props.fechasSeleccionadas].sort();
  return `${formatDate(sorted[0])} - ${formatDate(sorted[sorted.length - 1])}`;
};

const formatDate = (dateString) => {
  try { return format(new Date(dateString), 'dd/MM/yyyy'); }
  catch (e) { return dateString; }
};

const observacionesPlaceholder = computed(() => {
  if (!props.actividadPreview) return '';
  return `Ejemplo: Condiciones favorables para ${props.actividadPreview.nombre || 'esta actividad'}.`;
});

const observacionesAutomaticas = computed(() => {
  if (!props.actividadPreview) return '';
  try {
    const activityDetails = props.actividadPreview;
    const tipoActividad = activityDetails.expand?.tipo_actividades;
    
    let mappedMetricaKeys = new Set();
    if (tipoActividad?.formato_reporte?.columnas) {
      tipoActividad.formato_reporte.columnas.forEach(col => {
        if (col.metrica && col.nombre !== 'Observaciones') {
          mappedMetricaKeys.add(col.metrica);
        }
      });
    }

    const unmappedMetricasContent = [];
    if (activityDetails.metricas && typeof activityDetails.metricas === 'object') {
      for (const metricaKey in activityDetails.metricas) {
        if (Object.prototype.hasOwnProperty.call(activityDetails.metricas, metricaKey) && !mappedMetricaKeys.has(metricaKey)) {
          const metrica = activityDetails.metricas[metricaKey];
          const desc = metrica.descripcion || metricaKey.replace(/_/g, ' ');
          const val = metrica.valor !== undefined && metrica.valor !== null ? metrica.valor : null;
          if (val !== null && val !== '') {
            const unit = metrica.unidad || '';
            unmappedMetricasContent.push(`${desc}: ${val} ${unit}`.trim());
          }
        }
      }
    }
    return unmappedMetricasContent.join('\n');
  } catch (e) { 
    console.error('[BatchGeneralDataForm] Error generating observations:', e);
    return ''; 
  }
});

watch(observacionesAdicionales, (newValue) => {
  emit('update:observaciones', newValue);
});
</script>

<style scoped>
/* Scoped styles minimized by using Vuetify color props and Tailwind utility classes */
</style>