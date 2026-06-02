<template>
  <v-dialog v-model="dialog" persistent max-width="900px" width="95%" scrollable>
    <v-card class="rounded-xl overflow-hidden">
      <v-toolbar color="success" dark flat height="70">
        <v-icon size="28" class="ml-4 mr-3">mdi-playlist-check</v-icon>
        <div class="flex flex-col">
          <v-toolbar-title class="font-weight-bold text-h6 leading-none">Registrar Cumplimientos</v-toolbar-title>
          <div class="text-caption opacity-80 leading-none mt-1">
            {{ programacion?.descripcion }} 
            <span v-if="siembraContext" class="ml-2 font-weight-bold">| {{ siembraContext }}</span>
          </div>
        </div>
        <v-spacer></v-spacer>
        <v-btn icon @click="closeDialog" :disabled="executing" class="mr-2">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 pt-6">
        <div v-if="!loading">
          <div class="flex items-center mb-4">
            <v-icon color="success" class="mr-2">mdi-calendar-multiselect</v-icon>
            <h4 class="">Selección de Fechas</h4>
          </div>
          <p class="text-body-2 text-grey-darken-1 mb-6 ml-8">Seleccione las fechas de cumplimiento que desea registrar en la bitácora.</p>

          <!-- Selection Summary and Batch Controls -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <v-chip color="success" variant="flat" class="font-weight-bold">
              {{ selectedFechas.length }} / {{ pendingFechas.length }} seleccionadas
            </v-chip>

            <div class="flex gap-2">
              <v-btn
                size="small"
                variant="tonal"
                color="success"
                @click="selectAllFechas"
                :disabled="allFechasSelected"
                class="flex-1 sm:flex-none"
              >
                <v-icon start size="18">mdi-check-all</v-icon>
                Todas
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="warning"
                @click="clearAllFechas"
                :disabled="!anyFechasSelected"
                class="flex-1 sm:flex-none"
              >
                <v-icon start size="18">mdi-close-box-multiple</v-icon>
                Ninguna
              </v-btn>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <v-card
              v-for="fecha in pendingFechas"
              :key="fecha"
              variant="flat"
              class="date-card transition-all bg-grey-lighten-4"
              :class="{ 'date-card--selected bg-success-lighten-5': selectedFechas.includes(fecha) }"
              @click="toggleFechaSelection(fecha)"
            >
              <div class="pa-3 flex items-center">
                <v-checkbox-btn
                  :model-value="selectedFechas.includes(fecha)"
                  color="success"
                  density="compact"
                  class="mr-2"
                />
                <span class="text-body-2 font-weight-medium">{{ formatFecha(fecha) }}</span>
              </div>
            </v-card>
          </div>

          <!-- Preview de datos generales -->
          <div v-if="selectedFechas.length > 0 && actividadDetalle" class="mt-8">
            <div class="flex items-center mb-4">
              <v-icon color="success" class="mr-2">mdi-text-box-search-outline</v-icon>
              <h4 class="">Información de Bitácora</h4>
            </div>
            
            <BatchGeneralDataForm
              :actividad-preview="actividadDetalle"
              :fechas-seleccionadas="selectedFechas"
              v-model:observaciones="observacionesAdicionales"
              v-model:metricasSeleccionadas="metricasSeleccionadas"
              class="ml-2"
            />

            <!-- SECCIÓN Checklist BPA -->
            <div v-if="preguntasBpa.length > 0" class="mt-6">
              <div class="flex items-center mb-4">
                <v-icon color="success" class="mr-2">mdi-clipboard-list-outline</v-icon>
                <h4 class="">Checklist de Buenas Prácticas Agrícolas (BPA)</h4>
              </div>
              <BpaChecklist
                :preguntas="preguntasBpa"
                v-model="bpa_respuestas"
                class="ml-2"
              />
            </div>

            <!-- SECCIÓN Firma Digital -->
            <div class="mt-6 border-t pt-4">
              <BitacoraSignature
                :data-to-sign="computedDataToSign"
                @signed="onSignatureCaptured"
                :require-drawing="true"
                class="ml-2"
              />
            </div>
          </div>
        </div>
        
        <div v-else class="flex flex-col items-center justify-center py-12">
          <v-progress-circular indeterminate color="success" size="64" width="6"></v-progress-circular>
          <p class="mt-4 text-grey-darken-1">Calculando fechas pendientes...</p>
        </div>
      </v-card-text>

      <v-divider />
      
      <v-card-actions class="pa-4 bg-grey-lighten-5">
        <v-spacer class="hidden sm:block"></v-spacer>
        <v-btn
          variant="flat"
          color="red-lighten-3"
          @click="closeDialog"
          :disabled="executing"
          prepend-icon="mdi-cancel"
          class="px-6 mr-2"
        >
          CANCELAR
        </v-btn>
        <v-btn
          variant="flat"
          color="green-lighten-3"
          @click="handleExecuteClick"
          :loading="executing"
          :disabled="selectedFechas.length === 0"
          prepend-icon="mdi-check"
          class="px-8 font-weight-bold"
        >
          REGISTRAR {{ selectedFechas.length }} CUMPLIMIENTOS
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Diálogo de Advertencia por Selección Incompleta -->
    <v-dialog v-model="showWarningDialog" max-width="500px" persistent>
      <v-card class="rounded-xl">
        <v-toolbar color="warning" dark flat density="compact">
          <v-icon class="ml-4 mr-2">mdi-alert</v-icon>
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">Atención: Selección Incompleta</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-6 text-center">
          <v-avatar color="warning-lighten-4" size="64" class="mb-4">
            <v-icon color="warning" size="32">mdi-history-remove</v-icon>
          </v-avatar>
          <p class="text-body-1 font-weight-bold mb-2">¿Deseas descartar las fechas no seleccionadas?</p>
          <p class="text-body-2 text-grey-darken-1">
            Has seleccionado <strong>{{ selectedFechas.length }}</strong> de <strong>{{ pendingFechas.length }}</strong> fechas pendientes. 
            Las fechas no seleccionadas serán <strong>borradas del historial</strong> sin ser ingresadas a la bitácora.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-5 border-t">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            color="grey-darken-1"
            @click="showWarningDialog = false"
            class="px-4"
          >
            VOLVER A SELECCIONAR
          </v-btn>
          <v-btn
            variant="flat"
            color="warning"
            @click="executeBatch(true)"
            class="px-6 font-weight-bold"
          >
            SÍ, DESCARTAR Y REGISTRAR
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useProgramacionesStore } from '@/stores/programaciones';
import { useActividadesStore } from '@/stores/actividadesStore';
import BatchGeneralDataForm from '@/components/forms/BatchGeneralDataForm.vue';
import BpaChecklist from '@/components/bitacora/BpaChecklist.vue';
import BitacoraSignature from '@/components/bitacora/BitacoraSignature.vue';
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore';

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
const showWarningDialog = ref(false);

const bpa_respuestas = ref({});
const signature = ref(null);
const uiFeedbackStore = useUiFeedbackStore();

const preguntasBpa = computed(() => {
  return actividadDetalle.value?.expand?.tipo_actividades?.preguntas_bpa || [];
});

const computedDataToSign = computed(() => {
  return {
    batch: true,
    programacionId: props.programacionId,
    fechasEjecucion: selectedFechas.value,
    observacionesAdicionales: observacionesAdicionales.value,
    bpa_respuestas: bpa_respuestas.value
  };
});

function onSignatureCaptured(signaturePayload) {
  signature.value = signaturePayload;
}

const programacion = computed(() =>
  programacionesStore.programaciones.find(p => p.id === props.programacionId)
);

const siembraContext = computed(() => {
  if (!programacion.value?.expand?.siembras) return null;
  const siembras = programacion.value.expand.siembras;
  if (siembras.length === 1) {
    return `${siembras[0].nombre} ${siembras[0].tipo}`;
  } else if (siembras.length > 1) {
    return `${siembras.length} siembras`;
  }
  return null;
});

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
  bpa_respuestas.value = {};
  signature.value = null;
  try {
    const siembraId = programacion.value.siembras && programacion.value.siembras.length > 0
      ? programacion.value.siembras[0]
      : null;

    const fechas = programacionesStore.getFechasPendientes(programacion.value, siembraId);
    pendingFechas.value = fechas;
    selectedFechas.value = [...fechas];

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
  bpa_respuestas.value = {};
  signature.value = null;
  observacionesAdicionales.value = '';
  dialog.value = false;
};

const handleExecuteClick = () => {
  if (selectedFechas.value.length < pendingFechas.value.length) {
    showWarningDialog.value = true;
  } else {
    executeBatch(false);
  }
};

const executeBatch = async (cleanup = false) => {
  if (selectedFechas.value.length === 0) return;

  if (!signature.value) {
    uiFeedbackStore.showSnackbar('Es obligatorio firmar el lote antes de registrar los cumplimientos.', 'error');
    return;
  }

  executing.value = true;
  showWarningDialog.value = false;
  try {
    const siembraId = programacion.value.siembras && programacion.value.siembras.length > 0
      ? programacion.value.siembras[0]
      : null;

    await programacionesStore.ejecutarProgramacionesBatch({
      programacionId: props.programacionId,
      fechasEjecucion: selectedFechas.value,
      observacionesAdicionales: observacionesAdicionales.value,
      siembraId: siembraId,
      metricasSeleccionadas: metricasSeleccionadas.value,
      signature: signature.value,
      bpa_respuestas: bpa_respuestas.value,
      cleanup: cleanup
    });
  } catch (error) {
    console.error("Error executing batch:", error);
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
.date-card {
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid transparent;
}

.date-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.date-card--selected {
  border: 1px solid rgba(112, 210, 115, 0.487);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1);
}
</style>