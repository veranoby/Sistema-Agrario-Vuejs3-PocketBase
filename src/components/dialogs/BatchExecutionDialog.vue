<template>
  <v-dialog v-model="dialog" persistent max-width="1200px" width="95%">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-playlist-check</v-icon>
        <span class="text-h5">Registrar Cumplimientos Acumulados</span>
      </v-card-title>
      <v-card-subtitle>
        <div>{{ programacion?.descripcion }}</div>
        <div v-if="siembraContext" class="siembra-context mt-1">
          <v-chip color="primary" variant="outlined" size="small">
            <v-icon start size="small">mdi-sprout</v-icon>
            Siembra: {{ siembraContext }}
          </v-chip>
        </div>
      </v-card-subtitle>

      <v-card-text>
        <v-container v-if="!loading">
          <p class="mb-4">Seleccione las fechas de cumplimiento que desea registrar en la bitácora.</p>

          <!-- Selection Summary and Batch Controls -->
          <div class="d-flex align-center justify-space-between mb-4">
            <v-chip color="primary" variant="tonal" size="large">
              {{ selectedFechas.length }} de {{ pendingFechas.length }} fechas seleccionadas
            </v-chip>

            <div class="d-flex ga-2">
              <v-btn
                size="small"
                variant="outlined"
                color="success"
                @click="selectAllFechas"
                :disabled="allFechasSelected"
              >
                <v-icon start size="small">mdi-check-all</v-icon>
                Seleccionar todas
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                color="warning"
                @click="clearAllFechas"
                :disabled="!anyFechasSelected"
              >
                <v-icon start size="small">mdi-close-box-multiple</v-icon>
                Limpiar selección
              </v-btn>
            </div>
          </div>

          <v-row dense class="mt-4">
            <v-col v-for="fecha in pendingFechas" :key="fecha" cols="12" sm="6" md="4">
              <v-card variant="outlined" class="pa-3 agricultural-date-card">
                <v-checkbox-btn
                  :model-value="selectedFechas.includes(fecha)"
                  @update:model-value="toggleFechaSelection(fecha)"
                  :label="formatFecha(fecha)"
                  color="success"
                  class="date-checkbox"
                />
              </v-card>
            </v-col>
          </v-row>

          <!-- Preview de datos generales -->
          <BatchGeneralDataForm
            v-if="selectedFechas.length > 0 && actividadDetalle"
            :actividad-preview="actividadDetalle"
            :fechas-seleccionadas="selectedFechas"
            v-model:observaciones="observacionesAdicionales"
            v-model:metricasSeleccionadas="metricasSeleccionadas"
            class="mt-4"
          />

        </v-container>
        <div v-else class="text-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4">Calculando fechas pendientes...</p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey-darken-1"
          variant="text"
          @click="closeDialog"
          :disabled="executing"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="success"
          variant="tonal"
          @click="executeBatch"
          :loading="executing"
          :disabled="selectedFechas.length === 0"
        >
          Registrar {{ selectedFechas.length }} cumplimientos
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useProgramacionesStore } from '@/stores/programacionesStore';
import { useActividadesStore } from '@/stores/actividadesStore';
import BatchGeneralDataForm from '@/components/forms/BatchGeneralDataForm.vue';

const props = defineProps({
  modelValue: Boolean,
  programacionId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

const programacionesStore = useProgramacionesStore();
const actividadesStore = useActividadesStore();

const loading = ref(true);
const executing = ref(false);
const pendingFechas = ref([]);
const selectedFechas = ref([]);
const actividadDetalle = ref(null);
const observacionesAdicionales = ref('');
const metricasSeleccionadas = ref([]);

const programacion = computed(() =>
  programacionesStore.programaciones.find(p => p.id === props.programacionId)
);

// Siembra context for multi-siembra scenarios
const siembraContext = computed(() => {
  if (!programacion.value?.siembras) return null;
  if (programacion.value.siembras.length === 1) {
    return `ID: ${programacion.value.siembras[0]}`;
  } else if (programacion.value.siembras.length > 1) {
    return `${programacion.value.siembras.length} siembras (primera: ${programacion.value.siembras[0]})`;
  }
  return null;
});

// Batch selection states
const allFechasSelected = computed(() => {
  return pendingFechas.value.length > 0 && selectedFechas.value.length === pendingFechas.value.length;
});

const anyFechasSelected = computed(() => {
  return selectedFechas.value.length > 0;
});

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const loadPendingDates = async () => {
  if (!programacion.value) return;
  loading.value = true;
  try {
    // Get the first siembra from the programacion for context isolation
    const siembraId = programacion.value.siembras && programacion.value.siembras.length > 0
      ? programacion.value.siembras[0]
      : null;

    const fechas = programacionesStore.getFechasPendientes(programacion.value, siembraId);
    pendingFechas.value = fechas;
    selectedFechas.value = [...fechas]; // Pre-seleccionar todas

    // Cargar detalles de la actividad para el preview
    if (programacion.value.actividades && programacion.value.actividades.length > 0) {
      const primaryActivityId = programacion.value.actividades[0];
      actividadDetalle.value = await actividadesStore.fetchActividadById(primaryActivityId, { expand: 'tipo_actividades' });
    }
  } catch (error) {
    console.error("Error calculating pending dates:", error);
  } finally {
    loading.value = false;
  }
};

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    loadPendingDates();
  }
});

onMounted(() => {
  if (props.modelValue) {
    loadPendingDates();
  }
});

const closeDialog = () => {
  if (executing.value) return;
  dialog.value = false;
};

const executeBatch = async () => {
  if (selectedFechas.value.length === 0) return;

  executing.value = true;
  try {
    // Get the first siembra from the programacion for context isolation
    const siembraId = programacion.value.siembras && programacion.value.siembras.length > 0
      ? programacion.value.siembras[0]
      : null;

    await programacionesStore.ejecutarProgramacionesBatch({
      programacionId: props.programacionId,
      fechasEjecucion: selectedFechas.value,
      observacionesAdicionales: observacionesAdicionales.value,
      siembraId: siembraId,
      metricasSeleccionadas: metricasSeleccionadas.value
    });
    // La acción del store ya muestra un snackbar
  } catch (error) {
    console.error("Error executing batch:", error);
    // La acción del store debería manejar el snackbar de error también
  } finally {
    executing.value = false;
    closeDialog();
  }
};

const toggleFechaSelection = (fecha) => {
  const index = selectedFechas.value.indexOf(fecha);
  if (index > -1) {
    selectedFechas.value.splice(index, 1);
  } else {
    selectedFechas.value.push(fecha);
  }
};

// Batch selection methods
const selectAllFechas = () => {
  selectedFechas.value = [...pendingFechas.value];
};

const clearAllFechas = () => {
  selectedFechas.value = [];
};

const formatFecha = (fecha) => {
  if (!fecha) return 'N/A';
  const date = new Date(fecha);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${date.getDate()} ${meses[date.getMonth()]} ${date.getFullYear()}`;
};

</script>

<style scoped>
/* Agricultural Color Palette */
:root {
  --agri-green-primary: #2e7d32;
  --agri-green-light: #4caf50;
  --agri-earth-brown: #5d4037;
  --agri-soil-dark: #3e2723;
  --agri-sky-blue: #1976d2;
  --agri-surface-light: #f8f9fa;
  --agri-surface-card: #ffffff;
}

/* Siembra Context Chip */
.siembra-context {
  margin-top: 4px;
}

/* Enhanced Date Card Styling */
.agricultural-date-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 72px;
  display: flex;
  align-items: center;
  border: 2px solid rgba(76, 175, 80, 0.2);
  border-radius: 12px;
  background: var(--agri-surface-card);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

/* Date card hover effects */
.agricultural-date-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--agri-green-primary), var(--agri-green-light));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.agricultural-date-card:hover {
  background-color: rgba(46, 125, 50, 0.08);
  border-color: var(--agri-green-light);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.2);
}

.agricultural-date-card:hover::before {
  opacity: 1;
}

/* Selected state styling */
.agricultural-date-card:has(.v-checkbox-btn input:checked) {
  border-color: var(--agri-green-primary);
  background: rgba(46, 125, 50, 0.05);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.15);
}

.agricultural-date-card:has(.v-checkbox-btn input:checked)::before {
  opacity: 1;
}

/* Enhanced checkbox styling */
.date-checkbox {
  width: 100%;
  min-height: 44px; /* Touch target size */
}

.date-checkbox .v-label {
  font-size: 1rem;
  line-height: 1.3;
  font-weight: 500;
  color: var(--agri-soil-dark);
  letter-spacing: 0.025em;
}

/* Selected checkbox label styling */
.agricultural-date-card:has(.v-checkbox-btn input:checked) .date-checkbox .v-label {
  color: var(--agri-green-primary);
  font-weight: 600;
}

/* Focus states for accessibility */
.agricultural-date-card:focus-within {
  outline: 3px solid var(--agri-sky-blue);
  outline-offset: 2px;
}

.date-checkbox:focus-visible {
  outline: 2px solid var(--agri-sky-blue);
  outline-offset: 1px;
  border-radius: 4px;
}

/* Button styling enhancements */
.v-btn.v-btn--variant-outlined {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.025em;
  min-height: 36px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-btn.v-btn--variant-outlined:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.v-btn.v-btn--variant-outlined:disabled {
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

/* Responsive design for tablet optimization */
@media (max-width: 1024px) {
  .agricultural-date-card {
    min-height: 80px;
    border-radius: 10px;
  }

  .date-checkbox .v-label {
    font-size: 1.05rem;
  }

  .date-checkbox {
    min-height: 48px;
  }
}

@media (max-width: 768px) {
  .agricultural-date-card {
    min-height: 88px;
    border-radius: 8px;
  }

  .date-checkbox .v-label {
    font-size: 1.1rem;
  }

  .date-checkbox {
    min-height: 52px;
  }

  /* Stack batch controls vertically on mobile */
  .d-flex.ga-2 {
    flex-direction: column;
    gap: 8px;
  }

  .v-btn {
    width: 100%;
    min-height: 44px;
  }
}

/* High contrast colors for outdoor visibility */
.v-theme--light .agricultural-date-card {
  border-color: rgba(46, 125, 50, 0.3);
}

.v-theme--light .date-checkbox .v-label {
  color: #1a1a1a;
}

.v-theme--light .agricultural-date-card:has(.v-checkbox-btn input:checked) .date-checkbox .v-label {
  color: var(--agri-green-primary);
}

/* Animation for date cards */
.agricultural-date-card {
  animation: fadeInScale 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>