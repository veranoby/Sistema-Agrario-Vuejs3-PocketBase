<template>
  <v-form ref="form" class="agricultural-batch-form">
    <v-container>
      <!-- Activity Preview Header -->
      <v-row v-if="actividadPreview">
        <v-col cols="12">
          <v-card variant="outlined" class="agricultural-preview-card mb-4">
            <v-card-title class="agricultural-preview-header">
              <v-icon start color="green-darken-2">mdi-leaf</v-icon>
              <div>
                <div class="text-h6 font-weight-bold">{{ actividadPreview.nombre }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ actividadPreview.expand?.tipo_actividades?.nombre || 'Tipo no disponible' }}
                </div>
              </div>
              <v-spacer />
              <v-chip color="primary" variant="tonal" size="large">
                <v-icon start>mdi-calendar-multiple</v-icon>
                {{ fechasSeleccionadas.length }} entradas
              </v-chip>
            </v-card-title>

            <v-card-text class="pa-4">
              <!-- Date Range Display -->
              <div class="agricultural-date-summary mb-4">
                <v-chip
                  color="blue-grey-lighten-2"
                  variant="outlined"
                  size="default"
                  class="agricultural-chip"
                >
                  <v-icon start size="small">mdi-calendar-range</v-icon>
                  <strong>Rango:</strong> {{ formatDateRange() }}
                </v-chip>
              </div>

              <!-- Refactored Selectable Metrics Section -->
              <FormularioMetricas
                :metricas-disponibles="metricasDisponibles"
                v-model="metricasSeleccionadas"
                class="mt-4"
              />

              <!-- Auto-generated Observations Preview -->
              <div v-if="observacionesAutomaticas" class="mt-4">
                <h4 class="text-subtitle-1 font-weight-bold agricultural-section-title mb-2">
                  <v-icon start color="orange-darken-2">mdi-text-box-outline</v-icon>
                  Observaciones Automáticas
                </h4>
                <v-textarea
                  :model-value="observacionesAutomaticas"
                  readonly
                  rows="3"
                  variant="outlined"
                  density="comfortable"
                  class="agricultural-readonly-textarea"
                  hide-details
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Additional Observations Input -->
      <v-row>
        <v-col cols="12">
          <v-card variant="outlined" class="agricultural-input-card">
            <v-card-title class="agricultural-input-header">
              <v-icon start color="blue-darken-2">mdi-pencil</v-icon>
              Observaciones Adicionales
            </v-card-title>
            <v-card-text class="pa-4">
              <v-textarea
                v-model="observacionesAdicionales"
                label="Escribe observaciones adicionales que se agregarán a cada entrada"
                rows="4"
                variant="outlined"
                density="comfortable"
                class="agricultural-textarea"
                hint="Estas observaciones se combinarán con las observaciones automáticas en cada entrada de bitácora"
                persistent-hint
                :placeholder="observacionesPlaceholder"
                @input="$emit('update:observaciones', observacionesAdicionales)"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-form>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { format } from 'date-fns';
import FormularioMetricas from './FormularioMetricas.vue'; // Import the new component

const props = defineProps({
  actividadPreview: {
    type: Object,
    default: null
  },
  fechasSeleccionadas: {
    type: Array,
    default: () => []
  },
  observaciones: {
    type: String,
    default: ''
  },
  // Add modelValue for metricasSeleccionadas
  metricasSeleccionadas: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:observaciones', 'update:metricasSeleccionadas']);

const form = ref(null);
const observacionesAdicionales = ref(props.observaciones);

// Use a computed property for v-model binding to avoid mutating props directly
const metricasSeleccionadas = computed({
  get: () => props.metricasSeleccionadas,
  set: (value) => emit('update:metricasSeleccionadas', value)
});

// Watch for external changes to props.observaciones
watch(() => props.observaciones, (newValue) => {
  observacionesAdicionales.value = newValue;
});

// Available metrics that can be selected (passed to child component)
const metricasDisponibles = computed(() => {
  if (!props.actividadPreview?.metricas) return [];

  const metricas = [];
  for (const [key, metrica] of Object.entries(props.actividadPreview.metricas)) {
    if (metrica.valor !== null && metrica.valor !== undefined && metrica.valor !== '') {
      metricas.push({
        key,
        descripcion: metrica.descripcion || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        valor: metrica.valor,
        unidad: metrica.unidad || ''
      });
    }
  }
  return metricas;
});

// Date range formatting
const formatDateRange = () => {
  if (props.fechasSeleccionadas.length === 0) return 'Sin fechas seleccionadas';
  if (props.fechasSeleccionadas.length === 1) {
    return formatDate(props.fechasSeleccionadas[0]);
  }

  const sortedDates = [...props.fechasSeleccionadas].sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
};

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
};

// Observaciones placeholder
const observacionesPlaceholder = computed(() => {
  if (!props.actividadPreview) return '';

  const activityName = props.actividadPreview.nombre || 'esta actividad';
  const dateCount = props.fechasSeleccionadas.length;

  return `Ejemplo: Condiciones climáticas favorables para ${activityName}. Registro de ${dateCount} ejecuciones completadas satisfactoriamente.`;
});

// Auto-generated observations (unmapped metrics)
const observacionesAutomaticas = computed(() => {
  if (!props.actividadPreview) return '';

  try {
    const tipoActividad = props.actividadPreview.expand?.tipo_actividades;
    if (!tipoActividad?.formato_reporte?.columnas) return '';

    const mappedMetricaKeys = new Set();
    tipoActividad.formato_reporte.columnas.forEach(col => {
      if (col.metrica && col.nombre !== 'Observaciones') {
        mappedMetricaKeys.add(col.metrica);
      }
    });

    const unmappedContent = [];
    if (props.actividadPreview.metricas) {
      for (const [key, metrica] of Object.entries(props.actividadPreview.metricas)) {
        if (!mappedMetricaKeys.has(key) && metrica.valor !== null && metrica.valor !== undefined && metrica.valor !== '') {
          const desc = metrica.descripcion || key.replace(/_/g, ' ');
          const unit = metrica.unidad || '';
          unmappedContent.push(`${desc}: ${metrica.valor} ${unit}`.trim());
        }
      }
    }

    return unmappedContent.join('\n');
  } catch (error) {
    console.error('[BatchGeneralDataForm] Error generating automatic observaciones:', error);
    return '';
  }
});

// Watch observaciones changes and emit to parent
watch(observacionesAdicionales, (newValue) => {
  emit('update:observaciones', newValue);
});
</script>

<style scoped>
/* Styles are largely inherited from the parent context or global styles */
/* This ensures consistency with the agricultural design system */

.agricultural-batch-form {
  background: transparent;
}

.agricultural-preview-card {
  border: 2px solid rgba(46, 125, 50, 0.2);
  border-radius: 12px;
  background: var(--agri-surface-card, #ffffff);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.agricultural-preview-card:hover {
  border-color: var(--agri-green-light, #4caf50);
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.15);
}

.agricultural-preview-header {
  background: linear-gradient(135deg, var(--agri-surface-light, #f8f9fa) 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(46, 125, 50, 0.1);
  padding: 16px 20px;
}

.agricultural-date-summary {
  padding: 12px;
  background: rgba(46, 125, 50, 0.05);
  border-radius: 8px;
  border-left: 4px solid var(--agri-green-primary, #2e7d32);
}

.agricultural-chip {
  font-weight: 500;
  letter-spacing: 0.025em;
  min-height: 36px;
}

.agricultural-section-title {
  color: var(--agri-soil-dark, #3e2723);
  display: flex;
  align-items: center;
  gap: 8px;
}

.agricultural-alert {
  border-radius: 8px;
  border-left: 4px solid var(--agri-sky-blue, #1976d2);
}

.agricultural-input-card {
  border: 2px solid rgba(25, 118, 210, 0.2);
  border-radius: 12px;
  background: var(--agri-surface-card, #ffffff);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.agricultural-input-header {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(25, 118, 210, 0.1);
  padding: 16px 20px;
  color: var(--agri-soil-dark, #3e2723);
}

.agricultural-textarea .v-field {
  border-radius: 8px;
}

.agricultural-readonly-textarea .v-field {
  background-color: rgba(46, 125, 50, 0.05);
  border-color: rgba(46, 125, 50, 0.2);
}
</style>