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
const snackbarStore = useSnackbarStore();

const bitacoraFormRef = ref(null);
const isSubmitting = ref(false);

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
  }
}

function initializeMetricasValues() {
  formData.metricas_values = {};
  if (selectedActividadDetalles.value?.metricas) {
    for (const key in selectedActividadDetalles.value.metricas) {
      const metricaDef = selectedActividadDetalles.value.metricas[key];
      // Set default value based on type or definition
      formData.metricas_values[key] = metricaDef.defaultValue !== undefined ? metricaDef.defaultValue : (metricaDef.tipo === 'boolean' ? false : null);
    }
  }
}

async function onActividadChange(actividadId) {
  await loadActividadDetails(actividadId);
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
      await bitacoraStore.crearBitacoraEntry(dataToSubmit);
      snackbarStore.showSnackbar('Nueva entrada de bitácora creada con éxito.', 'success');
    }
    emit('save');
    closeDialog();
  } catch (error) {
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
