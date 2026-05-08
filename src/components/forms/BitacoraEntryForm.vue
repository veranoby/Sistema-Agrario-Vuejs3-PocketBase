<template>
  <v-card class="rounded-xl overflow-hidden borderless-dialog">
    <v-toolbar :color="isEditMode ? 'warning' : 'success'" dark flat height="70">
      <v-icon size="28" class="ml-4 mr-3">{{ isEditMode ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
      <div class="flex flex-col">
        <v-toolbar-title class="font-weight-bold text-h6 leading-none">{{ formTitle }}</v-toolbar-title>
        <div v-if="contextSubtitle" class="text-caption opacity-80 leading-none mt-1">
          {{ contextSubtitle }}
        </div>
      </div>
      <v-spacer></v-spacer>
      <v-btn icon @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
    </v-toolbar>

    <v-card-text class="pa-0 overflow-y-auto" style="max-height: 80vh;">
      <v-form ref="bitacoraFormRef">
        <div class="flex flex-col gap-6 pa-6">
          
          <!-- SECCIÓN 1: Datos Básicos -->
          <div class="bg-dinamico p-4 rounded-xl">
            <div class="flex items-center mb-4">
              <v-icon color="success" class="mr-2">mdi-information-outline</v-icon>
              <h4>Datos de la Entrada</h4>
            </div>
            
            <div class="ml-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <v-text-field
                v-model="formData.fecha_ejecucion"
                label="Fecha y Hora de Ejecución"
                type="datetime-local"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-calendar-clock"
                class="rounded-lg"
              ></v-text-field>

              <v-select
                v-model="formData.estado_ejecucion"
                :items="['planificada', 'en_progreso', 'completado', 'cancelada']"
                label="Estado"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-progress-check"
                class="rounded-lg"
              ></v-select>

              <v-autocomplete
                v-model="formData.actividad_realizada_id"
                :items="actividadesDisponibles"
                item-title="nombre"
                item-value="id"
                label="Actividad Realizada"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-hammer-wrench"
                class="rounded-lg md:col-span-2"
                @update:modelValue="onActividadChange"
                :disabled="isEditMode && !!props.actividadIdContext"
                clearable
              ></v-autocomplete>
            </div>
          </div>

          <!-- SECCIÓN 2: Siembras Involucradas (Checklist Inteligente) -->
          <div class="bg-dinamico p-4 rounded-xl">
            <SiembraSelectorList
              v-model="formData.siembras_ids"
              :available-ids="relevantSiembraIds"
              class="ml-8"
            />
          </div>

          <!-- SECCIÓN 3: Información de Bitácora (Componente Universal) -->
          <div v-if="selectedActividadDetalles" class="mt-2">
            <BatchGeneralDataForm
              is-single-entry
              :actividad-preview="selectedActividadDetalles"
              v-model:observaciones="formData.notas"
              v-model:metricasSeleccionadas="metricasSeleccionadas"
              class="ml-2"
            />
          </div>
        </div>
      </v-form>
    </v-card-text>

    <v-divider />

    <v-card-actions class="pa-4 bg-grey-lighten-5">
      <v-spacer></v-spacer>
      <v-btn
        variant="flat"
        prepend-icon="mdi-cancel"
        color="red-lighten-3"
        @click="closeDialog"
        class="px-6"
      >
        CANCELAR
      </v-btn>
      <v-btn 
        color="green-lighten-2" 
        variant="flat" 
        @click="submitForm" 
        :loading="isSubmitting"
        class="px-8 font-weight-bold"
        prepend-icon="mdi-check"
      >
        {{ isEditMode ? 'GUARDAR CAMBIOS' : 'GUARDAR ENTRADA' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useActividadesStore } from '@/stores/actividadesStore';
import { useSiembrasStore } from '@/stores/siembrasStore';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import { useProgramacionesStore } from '@/stores/programaciones';
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore';
import { handleError } from '@/utils/errorHandler';
import SiembraSelectorList from './SiembraSelectorList.vue';
import BatchGeneralDataForm from './BatchGeneralDataForm.vue';

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
const uiFeedbackStore = useUiFeedbackStore();

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
  siembras_ids: props.siembraIdContext ? [props.siembraIdContext] : [], // Multiple siembras support
  metricas_values: {}, // Holds values for dynamic metric fields
  programacion_origen_id: null, // Added for prefill
});

const formData = reactive(defaultFormData());

const rules = {
  required: value => (Array.isArray(value) ? value.length > 0 : !!value) || 'Este campo es requerido.',
};

const isEditMode = computed(() => !!props.entryToEdit);
const formTitle = computed(() => isEditMode.value ? t('bitacora.edit_entry') : t('bitacora.new_entry'));

const contextSubtitle = computed(() => {
  if (isEditMode.value && props.entryToEdit?.expand?.siembras) {
    const s = props.entryToEdit.expand.siembras;
    return Array.isArray(s) ? s.map(si => si.nombre).join(', ') : s.nombre;
  }
  if (props.siembraIdContext) {
    const s = siembrasStore.siembras.find(si => si.id === props.siembraIdContext);
    return s ? `${s.nombre} | ${s.tipo}` : '';
  }
  return '';
});

const relevantSiembraIds = computed(() => {
  if (props.siembraIdContext) return [props.siembraIdContext];
  if (selectedActividadDetalles.value?.siembras) return selectedActividadDetalles.value.siembras;
  return null;
});

const metricasSeleccionadas = ref([]);

const observacionesAutomaticas = computed(() => {
  // Logic removed as per instruction - redundancy removal
  return '';
});


onMounted(async () => {
  try {
    if (actividadesStore.actividades.length === 0) {
      await actividadesStore.cargarActividades();
    }
    
    if (props.siembraIdContext) {
        actividadesDisponibles.value = actividadesStore.actividades.filter(
            act => Array.isArray(act.siembras) && act.siembras.includes(props.siembraIdContext)
        );
    } else {
        actividadesDisponibles.value = actividadesStore.actividades;
    }
    
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
      const pendingData = programacionesStore.pendingBitacoraFromProgramacionData;
      formData.actividad_realizada_id = pendingData.actividadRealizadaId;
      const dt = new Date(pendingData.fechaEjecucion);
      formData.fecha_ejecucion = `${pendingData.fechaEjecucion}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      formData.notas = pendingData.observacionesPreload;
      formData.programacion_origen_id = pendingData.programacionOrigenId;
      formData.siembras_ids = pendingData.siembraAsociadaId ? [pendingData.siembraAsociadaId] : [];
      isPrefillingMetrics.value = true;
    }
  } catch (error) {
    handleError(error, 'Error inicializando formulario');
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
        formData.siembras_ids = [newVal];
         // Optionally re-filter actividadesDisponibles if not already done by onMounted logic
    }
});


async function loadActividadDetails(actividadId) {
  if (!actividadId) {
    selectedActividadDetalles.value = null;
    formData.metricas_values = {};
    return;
  }

  try {
    const actividad = await actividadesStore.fetchActividadById(actividadId, { expand: 'tipo_actividades' });
    if (!actividad) throw new Error(`No se encontró la actividad`);

    selectedActividadDetalles.value = actividad;
    initializeMetricasValues();
  } catch (error) {
    handleError(error, 'Error cargando detalles de actividad');
    selectedActividadDetalles.value = null;
    formData.metricas_values = {};
  }
}


function initializeMetricasValues() {
  const newMetricasValues = {};
  try {
    if (!selectedActividadDetalles.value?.metricas || typeof selectedActividadDetalles.value.metricas !== 'object') {
      formData.metricas_values = {};
      return;
    }

    const actividadMetricas = JSON.parse(JSON.stringify(selectedActividadDetalles.value.metricas));

    // Objective 1 Critical Requirement: Handle mapping inconsistencies
    if (actividadMetricas.producto_fertilizante && actividadMetricas.producto_fertilizante.valor) {
      if (actividadMetricas.producto_fertilizante_1 && (actividadMetricas.producto_fertilizante_1.valor === null || actividadMetricas.producto_fertilizante_1.valor === undefined || actividadMetricas.producto_fertilizante_1.valor === '')) {
        console.log('[BitacoraEntryForm] Applying metric mapping: producto_fertilizante -> producto_fertilizante_1');
        actividadMetricas.producto_fertilizante_1.valor = actividadMetricas.producto_fertilizante.valor;
      }
    }

    for (const key in actividadMetricas) {
      if (Object.prototype.hasOwnProperty.call(actividadMetricas, key)) {
        const metricaDef = actividadMetricas[key];

        if (!metricaDef || typeof metricaDef !== 'object') {
          console.warn(`[BitacoraEntryForm] Invalid metric definition for key: ${key}. Skipping.`);
          continue;
        }

        const valorCustomizado = metricaDef.valor;

        if (valorCustomizado !== undefined && valorCustomizado !== null) {
          newMetricasValues[key] = valorCustomizado;
        } else {
          const tipoActividades = selectedActividadDetalles.value.expand?.tipo_actividades;
          const tipoMetricaDef = tipoActividades?.metricas?.metricas?.[key];

          if (tipoMetricaDef?.defaultValue !== undefined) {
            newMetricasValues[key] = tipoMetricaDef.defaultValue;
            console.log(`[BitacoraEntryForm] Metric '${key}' using fallback default value.`);
          } else {
            newMetricasValues[key] = metricaDef.tipo === 'boolean' ? false : null;
          }
        }
      }
    }
  } catch (error) {
    console.error('[BitacoraEntryForm] Error initializing metric values:', error);
    uiFeedbackStore.showSnackbar('Error inicializando métricas de la actividad', 'warning');
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
  
  // Handle multiple siembras in edit mode
  if (entry.siembras) {
    formData.siembras_ids = Array.isArray(entry.siembras) ? entry.siembras : [entry.siembras];
  } else if (entry.expand?.siembras) {
    const expanded = entry.expand.siembras;
    formData.siembras_ids = Array.isArray(expanded) ? expanded.map(s => s.id) : [expanded.id];
  } else {
    formData.siembras_ids = [];
  }
  
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
    uiFeedbackStore.showSnackbar('Por favor, corrija los errores en el formulario.', 'error');
    return;
  }

  isSubmitting.value = true;
  try {
    // Only record metrics that were selected in the checklist
    const filteredMetricas = {};
    metricasSeleccionadas.value.forEach(key => {
        if (formData.metricas_values[key] !== undefined) {
            filteredMetricas[key] = formData.metricas_values[key];
        }
    });

    const dataToSubmit = {
      fecha_ejecucion: new Date(formData.fecha_ejecucion).toISOString(),
      actividad_realizada: formData.actividad_realizada_id,
      estado_ejecucion: formData.estado_ejecucion,
      notas: formData.notas.trim(),
      siembras: formData.siembras_ids,
      metricas: filteredMetricas,
    };

    if (isEditMode.value) {
      await bitacoraStore.updateBitacoraEntry(props.entryToEdit.id, dataToSubmit);
      uiFeedbackStore.showSnackbar('Entrada de bitácora actualizada con éxito.', 'success');
    } else {
      // Include programacion_origen_id if present for new entries
      if (formData.programacion_origen_id) {
        dataToSubmit.programacion_origen = formData.programacion_origen_id;
      }
      await bitacoraStore.crearBitacoraEntry(dataToSubmit);
      uiFeedbackStore.showSnackbar(t('bitacora.new_entry_success'), 'success');

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
          uiFeedbackStore.showSnackbar('Programación actualizada.', 'success');
        } catch (progError) {
          console.error('Error finalizing programacion execution:', progError);
          // handleError(progError, 'Error actualizando la programación asociada'); // Optionally show another snackbar
          uiFeedbackStore.showSnackbar('Error actualizando la programación asociada. La bitácora se guardó.', 'warning');
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

function clearActivitySelection() {
  formData.actividad_realizada_id = null;
  selectedActividadDetalles.value = null;
  formData.metricas_values = {};
  formData.notas = '';
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
