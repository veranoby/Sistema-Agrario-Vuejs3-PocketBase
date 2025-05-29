<template>
  <v-card>
    <v-toolbar :color="isEditMode ? 'warning' : 'primary'" dark>
      <v-toolbar-title>{{ formTitle }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
    </v-toolbar>

    <v-card-text>
      <v-form ref="bitacoraFormRef">
        <v-row dense>
          <!-- Fecha de Ejecución -->
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.fecha_ejecucion"
              label="Fecha de Ejecución"
              type="datetime-local"
              :rules="[rules.required]"
              variant="outlined"
              density="compact"
            ></v-text-field>
          </v-col>

          <!-- Estado de Ejecución -->
          <v-col cols="12" md="6">
            <v-select
              v-model="formData.estado_ejecucion"
              :items="['planificada', 'en_progreso', 'completado', 'cancelada']"
              label="Estado de Ejecución"
              :rules="[rules.required]"
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>

          <!-- Actividad Realizada -->
          <v-col cols="12">
            <v-autocomplete
              v-model="formData.actividad_realizada_id"
              :items="actividadesDisponibles"
              item-title="nombre"
              item-value="id"
              label="Actividad Realizada"
              :rules="[rules.required]"
              variant="outlined"
              density="compact"
              @update:modelValue="onActividadChange"
              :disabled="isEditMode && !!props.actividadIdContext"
              clearable
            ></v-autocomplete>
          </v-col>
          
          <!-- Siembra Asociada (Optional, might be context-driven) -->
          <v-col cols="12" v-if="!props.siembraIdContext && selectedActividadRequiresSiembra">
             <v-autocomplete
              v-model="formData.siembra_asociada_id"
              :items="siembrasDisponibles"
              item-title="nombre"
              item-value="id"
              label="Siembra Asociada (si aplica)"
              variant="outlined"
              density="compact"
              clearable
            ></v-autocomplete>
          </v-col>


          <!-- Notas -->
          <v-col cols="12">
            <v-textarea
              v-model="formData.notas"
              label="Notas Adicionales"
              variant="outlined"
              density="compact"
              rows="3"
            ></v-textarea>
          </v-col>

          <!-- Dynamic Metricas Section -->
          <v-col cols="12" v-if="selectedActividadDetalles && metricasParaFormulario.length > 0">
            <v-divider class="my-3"></v-divider>
            <h3 class="text-subtitle-1 mb-2">Métricas de la Actividad</h3>
            <v-row dense v-for="metrica in metricasParaFormulario" :key="metrica.key">
              <v-col cols="12">
                <template v-if="metrica.tipo === 'select'">
                  <v-select
                    v-model="formData.metricas_values[metrica.key]"
                    :items="metrica.opciones"
                    :label="metrica.descripcion || metrica.key.replace(/_/g, ' ')"
                    variant="outlined"
                    density="compact"
                    :rules="metrica.requerido ? [rules.required] : []"
                  ></v-select>
                </template>
                <template v-else-if="metrica.tipo === 'boolean'">
                   <v-checkbox
                    v-model="formData.metricas_values[metrica.key]"
                    :label="metrica.descripcion || metrica.key.replace(/_/g, ' ')"
                    density="compact"
                  ></v-checkbox>
                </template>
                <template v-else-if="metrica.tipo === 'number'">
                  <v-text-field
                    v-model.number="formData.metricas_values[metrica.key]"
                    :label="metrica.descripcion || metrica.key.replace(/_/g, ' ')"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :rules="metrica.requerido ? [rules.required] : []"
                  ></v-text-field>
                </template>
                <template v-else> <!-- Default to string/text -->
                  <v-text-field
                    v-model="formData.metricas_values[metrica.key]"
                    :label="metrica.descripcion || metrica.key.replace(/_/g, ' ')"
                    variant="outlined"
                    density="compact"
                    :rules="metrica.requerido ? [rules.required] : []"
                  ></v-text-field>
                </template>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-card-actions class="pa-4">
      <v-spacer></v-spacer>
      <v-btn variant="text" @click="closeDialog">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" @click="submitForm" :loading="isSubmitting">
        {{ isEditMode ? 'Guardar Cambios' : 'Crear Entrada' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useActividadesStore } from '@/stores/actividadesStore';
import { useSiembrasStore } from '@/stores/siembrasStore';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import { useProgramacionesStore } from '@/stores/programacionesStore'; // Added
import { useSnackbarStore } from '@/stores/snackbarStore';
import { handleError } from '@/utils/errorHandler';

const props = defineProps({
  entryToEdit: {
    type: Object,
    default: null,
  },
  siembraIdContext: { // To filter/suggest activities or auto-assign siembra
    type: String,
    default: null,
  },
  actividadIdContext: { // To pre-select activity
    type: String,
    default: null,
  },
});

const emit = defineEmits(['close', 'save']);

const actividadesStore = useActividadesStore();
const siembrasStore = useSiembrasStore();
const bitacoraStore = useBitacoraStore();
const programacionesStore = useProgramacionesStore(); // Added
const snackbarStore = useSnackbarStore();

const bitacoraFormRef = ref(null);
const isSubmitting = ref(false);
const isPrefillingMetrics = ref(false); // Flag to manage metric prefilling

const actividadesDisponibles = ref([]);
const siembrasDisponibles = ref([]); // For optional siembra_asociada selection
const selectedActividadDetalles = ref(null); // To store full details of selected actividad

const defaultFormData = () => ({
  fecha_ejecucion: new Date().toISOString().substring(0, 16), // YYYY-MM-DDTHH:mm
  actividad_realizada_id: props.actividadIdContext || null,
  estado_ejecucion: 'completado',
  notas: '',
  siembra_asociada_id: props.siembraIdContext || null, // Auto-assign if context provided
  metricas_values: {}, // Holds values for dynamic metric fields
  programacion_origen_id: null, // Added for prefill
});

const formData = reactive(defaultFormData());

const rules = {
  required: value => !!value || 'Este campo es requerido.',
};

const isEditMode = computed(() => !!props.entryToEdit);
const formTitle = computed(() => isEditMode.value ? 'Editar Entrada de Bitácora' : 'Nueva Entrada de Bitácora');

const selectedActividadRequiresSiembra = computed(() => {
    // Logic to determine if the selected actividad type typically requires a siembra.
    // This might involve checking a property on selectedActividadDetalles.expand.tipo_actividades
    // For now, let's assume some activities might not be directly tied to a siembra (e.g., general maintenance)
    // and allow manual selection if no siembraIdContext is provided.
    if (!selectedActividadDetalles.value) return false;
    // Example: if tipo_actividad has a flag like 'requires_siembra'
    // return selectedActividadDetalles.value.expand?.tipo_actividades?.requires_siembra === true;
    return true; // Default to true for now, show siembra selector if no context
});


onMounted(async () => {
  try {
    // Fetch actividades
    if (actividadesStore.actividades.length === 0) {
      await actividadesStore.cargarActividades(); // Ensure this method loads all necessary activities
    }
    // Filter activities if siembraIdContext is provided (optional)
    if (props.siembraIdContext) {
        actividadesDisponibles.value = actividadesStore.actividades.filter(
            act => Array.isArray(act.siembras) && act.siembras.includes(props.siembraIdContext)
        );
    } else {
        actividadesDisponibles.value = actividadesStore.actividades;
    }
    
    // Fetch siembras for optional manual selection
    if (siembrasStore.siembras.length === 0) {
        await siembrasStore.cargarSiembras();
    }
    siembrasDisponibles.value = siembrasStore.siembras;

    if (props.actividadIdContext) {
      await loadActividadDetails(props.actividadIdContext);
    }

    if (isEditMode.value && props.entryToEdit) {
      populateFormForEdit();
    } else if (programacionesStore.pendingBitacoraFromProgramacionData) {
      // Pre-fill from programacionesStore
      const pendingData = programacionesStore.pendingBitacoraFromProgramacionData;
      formData.actividad_realizada_id = pendingData.actividadRealizadaId;
      // Ensure date is in 'YYYY-MM-DDTHH:mm' format for datetime-local input
      const dt = new Date(pendingData.fechaEjecucion);
      formData.fecha_ejecucion = `${pendingData.fechaEjecucion}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      formData.notas = pendingData.observacionesPreload;
      formData.programacion_origen_id = pendingData.programacionOrigenId;
      formData.siembra_asociada_id = pendingData.siembraAsociadaId;

      isPrefillingMetrics.value = true; // Set flag to prefill metrics once actividad details are loaded

      // loadActividadDetails will be called by the watcher on actividad_realizada_id
      // or we can call it explicitly if needed, but watcher should handle it.
      // The actual metric prefilling will happen in a watchEffect or watcher for selectedActividadDetalles

      // Clear the data from the store AFTER it has been used
      // programacionesStore.clearPendingBitacoraData(); // Moved to after metrics are set
    }

  } catch (error) {
    handleError(error, 'Error inicializando formulario de bitácora');
    snackbarStore.showSnackbar('Error cargando datos para el formulario.', 'error');
  }
});

watch(() => props.entryToEdit, (newVal) => {
  if (newVal && isEditMode.value) {
    populateFormForEdit();
  } else if (!newVal) {
    Object.assign(formData, defaultFormData());
    selectedActividadDetalles.value = null;
  }
}, { immediate: true });

watch(() => props.actividadIdContext, async (newVal) => {
    if (newVal && !isEditMode.value) { // Only auto-select on create if context changes
        formData.actividad_realizada_id = newVal;
        await loadActividadDetails(newVal);
    }
});
watch(() => props.siembraIdContext, (newVal) => {
    if (newVal && !isEditMode.value) {
        formData.siembra_asociada_id = newVal;
         // Optionally re-filter actividadesDisponibles if not already done by onMounted logic
    }
});


async function loadActividadDetails(actividadId) {
  if (!actividadId) {
    selectedActividadDetalles.value = null;
    formData.metricas_values = {}; // Clear metric values
    return;
  }
  try {
    // Fetch full actividad details including its 'metricas' definition and expanded 'tipo_actividades' (for formato_reporte)
    // actividadesStore should have a method to fetch a single, fully expanded activity.
    const actividad = await actividadesStore.fetchActividadById(actividadId, { expand: 'tipo_actividades' }); // Pass expand options
    selectedActividadDetalles.value = actividad;
    initializeMetricasValues();
  } catch (error) {
    handleError(error, `Error cargando detalles de actividad ${actividadId}`);
    selectedActividadDetalles.value = null;
    formData.metricas_values = {}; // Clear metrics when activity is cleared
    formData.notas = ''; // Clear notes when activity is cleared
    return; // Exit early
  }
  try {
    // Fetch full actividad details including its 'metricas' definition and expanded 'tipo_actividades' (for formato_reporte)
    const actividad = await actividadesStore.fetchActividadById(actividadId, { expand: 'tipo_actividades' }); 
    selectedActividadDetalles.value = actividad;
    // Initialize metric values based on definition (e.g., default values)
    // This will be called first, then specific prefill from programacion can override.
    initializeMetricasValues(); 
    
    // If not prefilling from a programacion, then populate observations from activity details.
    // If prefilling from programacion, observations are set from pendingData.observacionesPreload.
    if (!isPrefillingMetrics.value) {
      await populateObservationsFromActivityDetails(selectedActividadDetalles.value);
    }

  } catch (error) {
    handleError(error, `Error cargando detalles de actividad ${actividadId}`);
    selectedActividadDetalles.value = null;
    formData.metricas_values = {};
    formData.notas = '';
  }
}

// Populates formData.notas with unmapped metrics
async function populateObservationsFromActivityDetails(activityDetails) {
  if (!activityDetails) {
    formData.notas = '';
    return;
  }
  let observacionesContent = '';
  try {
    // Ensure tipo_actividades is available, might need to await if not always expanded
    const tipoActividad = activityDetails.expand?.tipo_actividades;
    if (tipoActividad && tipoActividad.formato_reporte && tipoActividad.formato_reporte.columnas) {
      const mappedMetricaKeys = new Set();
      tipoActividad.formato_reporte.columnas.forEach(col => {
        if (col.metrica_asociada && col.titulo !== 'Observaciones') {
          mappedMetricaKeys.add(col.metrica_asociada);
        }
      });

      const unmappedMetricasContent = [];
      if (activityDetails.metricas && typeof activityDetails.metricas === 'object') {
        for (const metricaKey in activityDetails.metricas) {
          if (Object.prototype.hasOwnProperty.call(activityDetails.metricas, metricaKey) && !mappedMetricaKeys.has(metricaKey)) {
            const metrica = activityDetails.metricas[metricaKey];
            const desc = metrica.descripcion || metricaKey;
            // Use the actual 'valor' for observations, not 'defaultValue'
            const val = metrica.valor !== undefined && metrica.valor !== null ? metrica.valor : 'N/A';
            const unit = metrica.unidad || '';
            unmappedMetricasContent.push(`${desc}: ${val} ${unit}`.trim());
          }
        }
      }
      observacionesContent = unmappedMetricasContent.join('\n');
    }
  } catch (error) {
    console.error('[BitacoraEntryForm] Error generating observacionesContent from activity details:', error);
  }
  formData.notas = observacionesContent;
}


function initializeMetricasValues() {
  const newMetricasValues = {};
  if (selectedActividadDetalles.value?.metricas) {
    for (const key in selectedActividadDetalles.value.metricas) {
      const metricaDef = selectedActividadDetalles.value.metricas[key];
      newMetricasValues[key] = metricaDef.defaultValue !== undefined ? metricaDef.defaultValue : (metricaDef.tipo === 'boolean' ? false : null);
    }
  }
  formData.metricas_values = newMetricasValues;
}

// Watch for selectedActividadDetalles to be populated, then prefill metrics if needed
// This watcher is primarily for the scenario where data is coming from programacionesStore
watch(selectedActividadDetalles, (newDetails) => {
  if (newDetails && isPrefillingMetrics.value && programacionesStore.pendingBitacoraFromProgramacionData) {
    const pendingMetricas = programacionesStore.pendingBitacoraFromProgramacionData.metricasToPreload;
    if (pendingMetricas) {
      for (const key in pendingMetricas) {
        if (Object.prototype.hasOwnProperty.call(pendingMetricas, key)) {
          // Check if this metric key exists in the form's metric definitions (derived from selectedActividadDetalles)
          // This ensures we only try to set values for metrics that are actually part of the form
          if (Object.prototype.hasOwnProperty.call(formData.metricas_values, key) || 
              (selectedActividadDetalles.value?.metricas && Object.prototype.hasOwnProperty.call(selectedActividadDetalles.value.metricas, key)) ) {
            formData.metricas_values[key] = pendingMetricas[key];
          } else {
            console.warn(`[BitacoraEntryForm] Metrica key "${key}" from prefill data not found in current activity's metric definitions. Skipping.`);
          }
        }
      }
    }
    // After attempting to prefill metrics, clear the flag and the store data
    isPrefillingMetrics.value = false;
    programacionesStore.clearPendingBitacoraData();
    console.log('[BitacoraEntryForm] Prefilled metrics and cleared pending data.');
  }
}, { deep: true }); // deep watch might be needed if metricas_values structure is complex initially

async function onActividadChange(actividadId) {
  // The flag isPrefillingMetrics is true ONLY during onMounted if pendingData from programacion exists.
  // If user manually changes activity, isPrefillingMetrics will be false.
  // If activityId is cleared, loadActividadDetails(null) handles reset.
  if (actividadId) {
    await loadActividadDetails(actividadId);
    // Note: populateObservationsFromActivityDetails is now called within loadActividadDetails
    // if !isPrefillingMetrics.value. Metric values (defaults) are set by initializeMetricasValues.
    // Specific prefill from programacion (metricasToPreload) is handled by the watch on selectedActividadDetalles.
  } else {
    // Activity cleared by user
    await loadActividadDetails(null); // This will clear metrics and notes
  }
}

function populateFormForEdit() {
  if (!props.entryToEdit) return;
  const entry = props.entryToEdit;
  formData.fecha_ejecucion = entry.fecha_ejecucion ? new Date(entry.fecha_ejecucion).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16);
  formData.actividad_realizada_id = typeof entry.actividad_realizada === 'string' ? entry.actividad_realizada : entry.expand?.actividad_realizada?.id;
  formData.estado_ejecucion = entry.estado_ejecucion || 'completado';
  formData.notas = entry.notas || '';
  formData.siembra_asociada_id = typeof entry.siembra_asociada === 'string' ? entry.siembra_asociada : entry.expand?.siembra_asociada?.id;
  
  // Load actividad details for edit mode to ensure metric definitions are available
  if (formData.actividad_realizada_id) {
    loadActividadDetails(formData.actividad_realizada_id).then(() => {
      // Once details (and thus metric definitions) are loaded, populate metricas_values
      if (entry.metricas && typeof entry.metricas === 'object') {
        formData.metricas_values = { ...entry.metricas };
      } else {
        formData.metricas_values = {}; // Initialize if no metrics were stored
      }
    });
  } else {
     formData.metricas_values = {};
  }
}

const metricasParaFormulario = computed(() => {
  if (!selectedActividadDetalles.value) return [];

  const activityMetrics = selectedActividadDetalles.value.metricas || {}; // Customized metrics for the activity
  const tipoActividadFormato = selectedActividadDetalles.value.expand?.tipo_actividades?.formato_reporte?.columnas || [];
  
  // Use formato_reporte from tipo_actividad to determine which metrics to show and their order/labels
  return tipoActividadFormato.map(col => {
    const metricaKey = col.metrica;
    if (metricaKey && activityMetrics[metricaKey]) { // Ensure the metric key from format is in activity's defined metrics
      return {
        key: metricaKey,
        descripcion: col.nombre, // Use nombre from formato_reporte as label
        tipo: activityMetrics[metricaKey].tipo,
        opciones: activityMetrics[metricaKey].opciones || [],
        requerido: activityMetrics[metricaKey].requerido || false, // Assuming 'requerido' field in metric definition
      };
    } else if (col.tipo === 'text' && !col.metrica) { // For direct fields like "Observaciones" in formato_reporte
        return {
            key: col.nombre.toLowerCase().replace(/\s+/g, '_'), // Generate a key
            descripcion: col.nombre,
            tipo: 'textarea', // Or 'string'
            requerido: false
        };
    }
    return null;
  }).filter(m => m !== null);
});

async function submitForm() {
  const { valid } = await bitacoraFormRef.value.validate();
  if (!valid) {
    snackbarStore.showSnackbar('Por favor, corrija los errores en el formulario.', 'error');
    return;
  }

  isSubmitting.value = true;
  try {
    const dataToSubmit = {
      fecha_ejecucion: new Date(formData.fecha_ejecucion).toISOString(),
      actividad_realizada: formData.actividad_realizada_id,
      estado_ejecucion: formData.estado_ejecucion,
      notas: formData.notas,
      siembra_asociada: formData.siembra_asociada_id || null, // Ensure null if empty
      metricas: { ...formData.metricas_values }, // Actual recorded values
      // user_responsable will be set by bitacoraStore.crearBitacoraEntry if not provided
    };

    if (isEditMode.value) {
      await bitacoraStore.updateBitacoraEntry(props.entryToEdit.id, dataToSubmit);
      snackbarStore.showSnackbar('Entrada de bitácora actualizada con éxito.', 'success');
    } else {
      // Include programacion_origen_id if present for new entries
      if (formData.programacion_origen_id) {
        dataToSubmit.programacion_origen = formData.programacion_origen_id;
      }
      const newEntry = await bitacoraStore.crearBitacoraEntry(dataToSubmit); // Capture new entry if needed
      snackbarStore.showSnackbar('Nueva entrada de bitácora creada con éxito.', 'success');

      // After successful bitacora entry creation, finalize programacion execution if applicable
      if (formData.programacion_origen_id) {
        try {
          // formData.fecha_ejecucion is in YYYY-MM-DDTHH:mm format from the input
          // finalizeProgramacionExecution expects YYYY-MM-DD, so we split it.
          const fechaSinHora = formData.fecha_ejecucion.split('T')[0];
          await programacionesStore.finalizeProgramacionExecution({
            programacionId: formData.programacion_origen_id,
            fechaEjecucionReal: fechaSinHora 
          });
          snackbarStore.showSnackbar('Programación actualizada.', 'success');
        } catch (progError) {
          console.error('Error finalizing programacion execution:', progError);
          // handleError(progError, 'Error actualizando la programación asociada'); // Optionally show another snackbar
          snackbarStore.showSnackbar('Error actualizando la programación asociada. La bitácora se guardó.', 'warning');
        }
      }
    }
    emit('save');
    closeDialog();
  } catch (error) {
    // Error from bitacoraStore operations will be caught here
    handleError(error, `Error ${isEditMode.value ? 'actualizando' : 'creando'} entrada de bitácora`);
    // snackbar is shown by handleError
  } finally {
    isSubmitting.value = false;
  }
}

function closeDialog() {
  Object.assign(formData, defaultFormData()); // Reset form
  selectedActividadDetalles.value = null;
  bitacoraFormRef.value?.resetValidation();
  emit('close');
}

</script>

<style scoped>
/* Add any specific styles for the form if needed */
</style>
