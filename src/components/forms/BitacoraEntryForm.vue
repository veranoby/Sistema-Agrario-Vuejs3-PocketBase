<template>
  <v-card class="rounded-lg overflow-hidden borderless-dialog">
    <v-toolbar :color="isEditMode ? 'warning' : 'success'" dark flat height="70">
      <v-icon size="28" class="ml-4 mr-3">{{ isEditMode ? 'mdi-pencil' : 'mdi-plus-circle' }}</v-icon>
      <div class="flex flex-col">
        <div class="d-flex align-center">
          <v-toolbar-title class="font-weight-bold text-h6 leading-none mr-3">{{ formTitle }}</v-toolbar-title>
          <v-chip
            v-if="!isEditMode"
            :color="modoOrdenTrabajo ? 'white' : 'blue-darken-1'"
            :variant="modoOrdenTrabajo ? 'outlined' : 'flat'"
            size="small"
          >
            <v-icon start size="small">{{ modoOrdenTrabajo ? 'mdi-clipboard-check' : 'mdi-pencil-plus' }}</v-icon>
            {{ modoOrdenTrabajo ? 'Orden de Trabajo' : 'Entrada Libre' }}
          </v-chip>
        </div>
        <div v-if="contextSubtitle" class="text-xs opacity-80 leading-none mt-1">
          {{ contextSubtitle }}
        </div>
      </div>
      <v-spacer></v-spacer>
      <v-btn icon @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
    </v-toolbar>

    <v-card-text class="pa-0 overflow-y-auto" style="max-height: 80vh;">
      <!-- Banner contextual de completitud BPA (QW0-T3) -->
      <v-alert
        v-if="completenessBannerInfo"
        type="warning"
        variant="tonal"
        density="compact"
        icon="mdi-information-outline"
        class="ma-4 mb-0 rounded-lg"
      >
        <div class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span class="text-xs font-weight-medium">
            ℹ️ Completar <strong>{{ completenessBannerInfo.faltantes.length }}</strong> campos adicionales mejora tu puntaje BPA ({{ completenessBannerInfo.porcentaje }}%) y activa la Calculadora de Mezclas.
          </span>
          <v-btn
            size="x-small"
            color="amber-darken-3"
            variant="flat"
            class="text-white font-weight-bold"
            @click="scrollToIncompleteFields"
          >
            Ver campos
            <v-icon end size="x-small">mdi-arrow-down</v-icon>
          </v-btn>
        </div>
      </v-alert>

      <v-form ref="bitacoraFormRef">
        <div class="flex flex-col gap-6 pa-6">
          
          <!-- SECCIÓN 1: Datos Básicos -->
          <div class="bg-dinamico p-4 rounded-lg">
            <div class="flex items-center mb-4">
              <v-icon color="primary" class="mr-2">mdi-information-outline</v-icon>
              <h4>Datos de la Entrada</h4>
            </div>
            
            <div class="ml-8 grid grid-cols-1 gap-4">
              <!-- Fila 1: Fecha y Estado -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  :items="['planificada', 'activa', 'completada', 'cancelada']"
                  label="Estado"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-progress-check"
                  class="rounded-lg"
                ></v-select>
              </div>

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
                class="rounded-lg"
                @update:modelValue="onActividadChange"
                :disabled="isEditMode || modoOrdenTrabajo"
                clearable
              >
                <template v-slot:append-inner v-if="modoOrdenTrabajo">
                  <v-icon color="primary">mdi-lock</v-icon>
                </template>
              </v-autocomplete>
              <v-autocomplete
                v-if="haciendaStore.isModuleActive('nomina_express')"
                v-model="formData.trabajadores_involucrados"
                :items="plantillaNomina"
                item-title="nombre"
                item-value="id"
                label="Trabajadores Involucrados (Nómina)"
                multiple
                chips
                closable-chips
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-account-group"
                class="rounded-lg mt-2"
              ></v-autocomplete>
            </div>
          </div>

          <!-- SECCIÓN 2: Siembras y Zonas Involucradas (Checklist Inteligente) -->
          <div v-if="selectedActividadDetalles || props.siembraIdContext" class="bg-dinamico p-4 rounded-lg">
            <SiembraSelectorList
              v-model="formData.siembras_ids"
              :available-ids="relevantSiembraIds"
              class="ml-8"
            />
            
            <ZonaSelectorList
              v-model="formData.zonas_ids"
              :available-ids="relevantZonaIds"
              :selected-siembras="formData.siembras_ids"
              class="ml-8 mt-4"
            />

            <!-- Banner de Alerta de Carencia (QW2-T4) -->
            <v-alert
              v-if="carenciaWarningInfo"
              type="error"
              variant="flat"
              density="compact"
              icon="mdi-alert-octagon-outline"
              class="ml-8 mt-4 rounded-lg text-white"
            >
              <div class="text-xs font-weight-medium">
                {{ carenciaWarningInfo.mensaje }}
              </div>
            </v-alert>
          </div>

          <!-- SECCIÓN 3: Información de Bitácora (Componente Universal) -->
          <div v-if="selectedActividadDetalles" id="bpa-metrics-section" class="mt-2">
            <BatchGeneralDataForm
              is-single-entry
              :actividad-preview="selectedActividadDetalles"
              :zonas-ids="formData.zonas_ids"
              v-model:observaciones="formData.notas"
              v-model:metricasSeleccionadas="metricasSeleccionadas"
              v-model:metricasValues="formData.metricas_values"
              class="ml-2"
            />
          </div>

          <!-- SECCIÓN 4: Checklist BPA -->
          <div v-if="preguntasBpa.length > 0" class="mt-2">
            <BpaChecklist
              :preguntas="preguntasBpa"
              v-model="formData.bpa_respuestas"
            />
          </div>

          <!-- SECCIÓN BODEGA: Consumo de Insumos -->
          <div v-if="showBodegaSection" class="bg-dinamico p-4 rounded-lg border border-teal-lighten-4">
            <div class="flex items-center mb-4">
              <v-icon color="primary" class="mr-2">mdi-warehouse</v-icon>
              <h4 class="font-weight-bold text-primary-3">Consumo de Insumos de Bodega</h4>
            </div>
            
            <div class="ml-8">
              <!-- Lista de insumos agregados -->
              <div v-if="insumosConsumidos.length > 0" class="mb-4 flex flex-col gap-2">
                <div 
                  v-for="(insumo, idx) in insumosConsumidos" 
                  :key="idx"
                  class="d-flex align-center justify-space-between p-3 rounded-lg border border-teal-lighten-4 bg-primary-5"
                >
                  <div class="d-flex align-center gap-2">
                    <v-chip color="primary" size="small" variant="flat" class="text-white">
                      {{ getNombreInsumo(insumo.item) }}
                    </v-chip>
                    <span class="text-md font-weight-medium text-primary-4">
                      Cantidad: {{ insumo.cantidad }} {{ getUnidadInsumo(insumo.item) }}
                    </span>
                  </div>
                  <v-btn 
                    icon="mdi-delete" 
                    variant="text" 
                    color="red-lighten-1" 
                    size="small"
                    @click="removerInsumoConsumido(idx)"
                  ></v-btn>
                </div>
              </div>

              <!-- Formulario de selección y cantidad -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <v-autocomplete
                  v-model="nuevoInsumo.item"
                  :items="insumosDisponibles"
                  item-title="nombre"
                  item-value="id"
                  label="Insumo disponible"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="rounded-lg md:col-span-2"
                  color="primary"
                >
                  <template v-slot:item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps" :subtitle="'Stock: ' + item.raw.stock_actual + ' ' + item.raw.unidad">
                    </v-list-item>
                  </template>
                </v-autocomplete>

                <div class="d-flex align-center gap-2">
                  <v-text-field
                    v-model.number="nuevoInsumo.cantidad"
                    type="number"
                    label="Cantidad"
                    min="0.01"
                    step="any"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="rounded-lg"
                    color="primary"
                    @keyup.enter="agregarInsumo"
                  ></v-text-field>

                  <v-btn
                    color="primary"
                    icon="mdi-plus"
                    variant="flat"
                    class="text-white"
                    @click="agregarInsumo"
                    :disabled="!nuevoInsumo.item || !nuevoInsumo.cantidad || nuevoInsumo.cantidad <= 0"
                  ></v-btn>
                </div>
              </div>
              <div v-if="insumosConsumidos.length === 0" class="text-xs text-grey-darken-1 mt-2">
                * Opcional: Agregue insumos de bodega consumidos en esta labor.
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- SECCIÓN 5: Evidencia Fotográfica -->
            <div class="bg-dinamico p-4 rounded-lg border border-blue-lighten-4">
              <div class="flex items-center mb-4">
                <v-icon color="blue" class="mr-2">mdi-camera</v-icon>
                <h4 class="font-weight-bold text-blue-darken-3">Fotografía / Evidencia</h4>
              </div>
              <div class="ml-8">
                <EvidenciasImageUpload v-model="formData.fotos" :max-files="5" />
              </div>
            </div>

            <!-- SECCIÓN 6: Firma Digital -->
            <div v-if="formData.estado_ejecucion === 'completada'" class="bg-dinamico p-4 rounded-lg border border-teal-lighten-4">
              <v-alert
                v-if="haciendaStore.isModuleActive('pdf_bpa') && !formData.signature"
                type="info"
                variant="tonal"
                color="teal-darken-2"
                class="mb-4"
              >
                El módulo PDF BPA requiere firma del operador. Por favor firme antes de guardar para generar el certificado.
              </v-alert>
              <UniversalSignature
                :bitacoraId="formData.id || ''"
                :existing-signature="formData.signature"
                :data-to-sign="computedDataToSign"
                @signed="onSignatureCaptured"
                :require-drawing="!isEditMode"
              />
            </div>
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
        {{ isEditMode ? 'GUARDAR CAMBIOS' : 'FIRMAR Y GUARDAR' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import EvidenciasImageUpload from '@/components/common/EvidenciasImageUpload.vue';
import { useActividadesStore } from '@/stores/actividadesStore';
import { useSiembrasStore } from '@/stores/siembrasStore';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import { useZonasStore } from '@/stores/zonasStore';
import { useProgramacionesStore } from '@/stores/programaciones';
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore';
import { handleError } from '@/utils/errorHandler';
import { useHaciendaStore } from '@/stores/haciendaStore';
import { useBodegaStore } from '@/stores/bodegaStore';
import { useNominaStore } from '@/stores/nominaStore';
import { useBodegaMovimientosStore } from '@/stores/bodegaMovimientosStore';
import SiembraSelectorList from './SiembraSelectorList.vue';
import ZonaSelectorList from './ZonaSelectorList.vue';
import BatchGeneralDataForm from './BatchGeneralDataForm.vue';
import BpaChecklist from '../bitacora/BpaChecklist.vue';
import UniversalSignature from '@/components/common/UniversalSignature.vue';
import { useFieldCompleteness } from '@/composables/useFieldCompleteness';
import { useCarenciaSemaforo } from '@/composables/useCarenciaSemaforo';

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
  programacionId: { // To distinguish Modo A/B
    type: String,
    default: null,
  },
});

const emit = defineEmits(['close', 'save']);

const actividadesStore = useActividadesStore();
const siembrasStore = useSiembrasStore();
const bitacoraStore = useBitacoraStore();
const zonasStore = useZonasStore();
const programacionesStore = useProgramacionesStore();
const uiFeedbackStore = useUiFeedbackStore();
const haciendaStore = useHaciendaStore();
const bodegaStore = useBodegaStore();
const nominaStore = useNominaStore();
const bodegaMovimientosStore = useBodegaMovimientosStore();

const plantillaNomina = computed(() => nominaStore.plantilla || []);

const bitacoraFormRef = ref(null);
const isSubmitting = ref(false);
const isPrefillingMetrics = ref(false);

const actividadesDisponibles = ref([]);
const siembrasDisponibles = ref([]);
const selectedActividadDetalles = ref(null);

const defaultFormData = () => ({
  fecha_ejecucion: new Date().toISOString().substring(0, 16),
  actividad_realizada_id: props.actividadIdContext || null,
  estado_ejecucion: 'completada',
  notas: '',
  siembras_ids: props.siembraIdContext ? [props.siembraIdContext] : [],
  zonas_ids: [],
  metricas_values: {},
  programacion_origen_id: null,
  bpa_respuestas: {},
  trabajadores_involucrados: [],
  signature: null,
  fotos: [],
});

const formData = reactive(defaultFormData());
const rules = {
  required: value => (Array.isArray(value) ? value.length > 0 : !!value) || 'Este campo es requerido.',
};

const isEditMode = computed(() => !!props.entryToEdit);
const modoOrdenTrabajo = computed(() => !!props.programacionId);
const formTitle = computed(() => isEditMode.value ? 'Editar Entrada' : 'Nueva Entrada');

const { calculateCompleteness } = useFieldCompleteness();

const completenessBannerInfo = computed(() => {
  if (!isEditMode.value) return null;

  const tipoOrActividad = selectedActividadDetalles.value?.expand?.tipo_actividades
    || selectedActividadDetalles.value
    || formData.actividad_realizada_id;

  const completeness = calculateCompleteness(tipoOrActividad, formData.metricas_values || {});

  if (completeness.porcentaje >= 100 || completeness.faltantes.length === 0) {
    return null;
  }

  return completeness;
});

const scrollToIncompleteFields = () => {
  const section = document.getElementById('bpa-metrics-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const { calcularEstadoCarencia } = useCarenciaSemaforo();

const carenciaWarningInfo = computed(() => {
  const actividadNombre = (selectedActividadDetalles.value?.nombre || '').toLowerCase();
  const tipoNombre = (selectedActividadDetalles.value?.expand?.tipo_actividades?.nombre || '').toLowerCase();
  const isCosecha = actividadNombre.includes('cosecha') || tipoNombre.includes('cosecha') || formData.actividad_realizada_id === 'yhtpctztpakym9h';

  if (!isCosecha) return null;

  const zonasSeleccionadas = formData.zonas_ids || [];
  if (!zonasSeleccionadas.length) return null;

  const zonasBloqueadas = [];
  for (const zonaId of zonasSeleccionadas) {
    const estado = calcularEstadoCarencia(zonaId);
    if (estado.estado === 'BLOQUEADO') {
      const zonaObj = zonasStore.zonas.find(z => z.id === zonaId);
      zonasBloqueadas.push({
        zonaId,
        nombre: zonaObj?.nombre || zonaId,
        diasRestantes: estado.diasRestantes,
        fechaLibre: estado.fechaLibre
      });
    }
  }

  if (!zonasBloqueadas.length) return null;

  return {
    zonasBloqueadas,
    mensaje: `⚠️ ATENCIÓN: ${zonasBloqueadas.map(z => `El lote '${z.nombre}' está en período de carencia por ${z.diasRestantes} día(s) más`).join('. ')}. Cosechar ahora viola el Art. 16 BPA de Agrocalidad.`
  };
});

const relevantSiembraIds = computed(() => {
  if (props.siembraIdContext) return [props.siembraIdContext];
  if (selectedActividadDetalles.value?.siembras) return selectedActividadDetalles.value.siembras;
  return null;
});

const relevantZonaIds = computed(() => {
  if (selectedActividadDetalles.value?.zonas) return selectedActividadDetalles.value.zonas;
  if (props.siembraIdContext) {
    return zonasStore.zonas
      .filter(z => z.siembra === props.siembraIdContext)
      .map(z => z.id);
  }
  return null;
});

const preguntasBpa = computed(() => {
  return selectedActividadDetalles.value?.expand?.tipo_actividades?.preguntas_bpa || [];
});

const metricasSeleccionadas = ref([]);

const computedDataToSign = computed(() => {
  const filteredMetricas = {};
  if (formData.metricas_values) {
    metricasSeleccionadas.value.forEach(key => {
      if (formData.metricas_values[key] !== undefined) {
        filteredMetricas[key] = formData.metricas_values[key];
      }
    });
  }
  return {
    fecha_ejecucion: formData.fecha_ejecucion,
    actividad_realizada: formData.actividad_realizada_id,
    siembras: formData.siembras_ids,
    metricas: filteredMetricas,
    bpa_respuestas: formData.bpa_respuestas,
    trabajadores_involucrados: formData.trabajadores_involucrados
  };
});

function onSignatureCaptured(signaturePayload) {
  formData.signature = signaturePayload;
}

const insumosConsumidos = ref([]);
const nuevoInsumo = reactive({
  item: null,
  cantidad: null
});

const showBodegaSection = computed(() => {
  return haciendaStore.isModuleActive('kardex_bodega') && !isEditMode.value;
});

const insumosDisponibles = computed(() => {
  return bodegaStore.items.filter(item => {
    const yaAgregado = insumosConsumidos.value.some(ic => ic.item === item.id);
    return item.stock_actual > 0 && !yaAgregado;
  });
});

function getNombreInsumo(itemId) {
  const item = bodegaStore.getItemById(itemId);
  return item ? item.nombre : 'Insumo desconocido';
}

function getUnidadInsumo(itemId) {
  const item = bodegaStore.getItemById(itemId);
  return item ? item.unidad : '';
}

function agregarInsumo() {
  if (!nuevoInsumo.item || !nuevoInsumo.cantidad || nuevoInsumo.cantidad <= 0) return;
  
  const item = bodegaStore.getItemById(nuevoInsumo.item);
  if (item && nuevoInsumo.cantidad > item.stock_actual) {
    uiFeedbackStore.showSnackbar(`La cantidad solicitada supera el stock disponible (${item.stock_actual} ${item.unidad})`, 'warning');
    return;
  }

  insumosConsumidos.value.push({
    item: nuevoInsumo.item,
    cantidad: nuevoInsumo.cantidad
  });

  nuevoInsumo.item = null;
  nuevoInsumo.cantidad = null;
}

function removerInsumoConsumido(index) {
  insumosConsumidos.value.splice(index, 1);
}


onMounted(async () => {
  try {
    if (haciendaStore.isModuleActive('kardex_bodega')) {
      if (bodegaStore.items.length === 0) {
        await bodegaStore.cargarItems().catch(err => console.error(err));
      }
    }
    
    if (haciendaStore.isModuleActive('nomina_express') && plantillaNomina.value.length === 0) {
      await nominaStore.cargarPlantilla().catch(e => console.warn(e));
    }

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
    } else if (modoOrdenTrabajo.value && programacionesStore.pendingBitacoraFromProgramacionData) {
      const pendingData = programacionesStore.pendingBitacoraFromProgramacionData;
      
      const actividadId = pendingData.actividadRealizadaId || pendingData.actividad_realizada_id;
      formData.actividad_realizada_id = actividadId;
      
      isPrefillingMetrics.value = true;

      if (actividadId) {
        await loadActividadDetails(actividadId);
      }

      if (pendingData.fechaEjecucion || pendingData.fecha_ejecucion) {
        const dateStr = pendingData.fechaEjecucion || pendingData.fecha_ejecucion;
        const dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) {
          formData.fecha_ejecucion = `${dateStr.split('T')[0]}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        }
      }
      
      formData.notas = pendingData.observacionesPreload || '';
      formData.programacion_origen_id = props.programacionId;
      
    } else {
      programacionesStore.clearPendingBitacoraData();
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
    if (newVal && !isEditMode.value) {
        formData.actividad_realizada_id = newVal;
        await loadActividadDetails(newVal);
    }
});
watch(() => props.siembraIdContext, (newVal) => {
    if (newVal && !isEditMode.value) {
        formData.siembras_ids = [newVal];
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
    if (!selectedActividadDetalles.value?.metricas || typeof selectedActividadDetalles.value.metricas !== 'object' || selectedActividadDetalles.value.metricas === null) {
      formData.metricas_values = {};
      return;
    }

    const actividadMetricas = JSON.parse(JSON.stringify(selectedActividadDetalles.value.metricas));

    if (actividadMetricas.producto_fertilizante && actividadMetricas.producto_fertilizante.valor) {
      if (actividadMetricas.producto_fertilizante_1 && (actividadMetricas.producto_fertilizante_1.valor === null || actividadMetricas.producto_fertilizante_1.valor === undefined || actividadMetricas.producto_fertilizante_1.valor === '')) {
        actividadMetricas.producto_fertilizante_1.valor = actividadMetricas.producto_fertilizante.valor;
      }
    }

    for (const key in actividadMetricas) {
      if (Object.prototype.hasOwnProperty.call(actividadMetricas, key)) {
        const metricaDef = actividadMetricas[key];

        if (!metricaDef || typeof metricaDef !== 'object') {
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

watch(selectedActividadDetalles, (newDetails) => {
  if (newDetails && isPrefillingMetrics.value && programacionesStore.pendingBitacoraFromProgramacionData) {
    const pendingMetricas = programacionesStore.pendingBitacoraFromProgramacionData.metricasToPreload;
    if (pendingMetricas) {
      for (const key in pendingMetricas) {
        if (Object.prototype.hasOwnProperty.call(pendingMetricas, key)) {
          if (Object.prototype.hasOwnProperty.call(formData.metricas_values, key) || 
              (selectedActividadDetalles.value?.metricas && Object.prototype.hasOwnProperty.call(selectedActividadDetalles.value.metricas, key)) ) {
            formData.metricas_values[key] = pendingMetricas[key];
            if (!metricasSeleccionadas.value.includes(key)) {
              metricasSeleccionadas.value.push(key);
            }
          }
        }
      }
    }
    isPrefillingMetrics.value = false;
    programacionesStore.clearPendingBitacoraData();
  }
}, { deep: true });

async function onActividadChange(actividadId) {
  if (actividadId) {
    await loadActividadDetails(actividadId);
  } else {
    await loadActividadDetails(null);
  }
}

function populateFormForEdit() {
  if (!props.entryToEdit) return;
  const entry = props.entryToEdit;
  formData.fecha_ejecucion = entry.fecha_ejecucion ? new Date(entry.fecha_ejecucion).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16);
  formData.actividad_realizada_id = typeof entry.actividad_realizada === 'string' ? entry.actividad_realizada : entry.expand?.actividad_realizada?.id;
  formData.estado_ejecucion = entry.estado_ejecucion || 'completada';
  formData.notas = entry.notas || '';
  formData.signature = entry.signature || null;
  formData.trabajadores_involucrados = entry.trabajadores_involucrados || [];
  
  if (entry.siembras) {
    formData.siembras_ids = Array.isArray(entry.siembras) ? entry.siembras : [entry.siembras];
  } else if (entry.expand?.siembras) {
    const expanded = entry.expand.siembras;
    formData.siembras_ids = Array.isArray(expanded) ? expanded.map(s => s.id) : [expanded.id];
  } else {
    formData.siembras_ids = [];
  }
  
  formData.bpa_respuestas = entry.bpa_respuestas || {};
  
  if (formData.actividad_realizada_id) {
    loadActividadDetails(formData.actividad_realizada_id).then(() => {
      if (entry.metricas && typeof entry.metricas === 'object') {
        formData.metricas_values = { ...entry.metricas };
        metricasSeleccionadas.value = Object.keys(entry.metricas);
      } else {
        formData.metricas_values = {};
        metricasSeleccionadas.value = [];
      }
      
      formData.zonas_ids = entry.zonas || [];
    });
  } else {
     formData.metricas_values = {};
     metricasSeleccionadas.value = [];
     formData.zonas_ids = [];
  }
}

async function submitForm() {
  const { valid } = await bitacoraFormRef.value.validate();
  if (!valid) {
    uiFeedbackStore.showSnackbar('Por favor, corrija los errores en el formulario.', 'error');
    return;
  }

  isSubmitting.value = true;
  try {
    if (formData.estado_ejecucion === 'completada' && !formData.signature) {
      uiFeedbackStore.showSnackbar('Es obligatorio firmar la bitácora antes de guardar.', 'error');
      isSubmitting.value = false;
      return;
    }

    const filteredMetricas = {};
    metricasSeleccionadas.value.forEach(key => {
        if (formData.metricas_values[key] !== undefined) {
            filteredMetricas[key] = formData.metricas_values[key];
        }
    });

    let finalNotas = formData.notas.trim();
    if (carenciaWarningInfo.value) {
      const advertenciaTexto = `[ADVERTENCIA BPA: Cosecha registrada durante periodo de carencia activo en ${carenciaWarningInfo.value.zonasBloqueadas.map(z => z.nombre).join(', ')}]`;
      if (!finalNotas.includes(advertenciaTexto)) {
        finalNotas = finalNotas ? `${finalNotas}\n${advertenciaTexto}` : advertenciaTexto;
      }
    }

    const dataToSubmit = {
      fecha_ejecucion: new Date(formData.fecha_ejecucion).toISOString(),
      actividad_realizada: formData.actividad_realizada_id,
      estado_ejecucion: formData.estado_ejecucion,
      notas: finalNotas,
      siembras: formData.siembras_ids,
      zonas: formData.zonas_ids,
      metricas: filteredMetricas,
      bpa_respuestas: formData.bpa_respuestas,
      signature: formData.signature,
      trabajadores_involucrados: formData.trabajadores_involucrados,
      fotos: formData.fotos
    };

    let success = false;
    if (isEditMode.value) {
      const updated = await bitacoraStore.updateBitacoraEntry(props.entryToEdit.id, dataToSubmit);
      if (updated) {
        uiFeedbackStore.showSnackbar('Entrada de bitácora actualizada con éxito.', 'success');
        success = true;
      }
    } else {
      console.log('[BitacoraForm] Modo:', modoOrdenTrabajo.value ? 'A (Orden de Trabajo)' : 'B (Entrada Libre)');
      // Include programacion_origen_id if present for new entries
      if (formData.programacion_origen_id) {
        dataToSubmit.programacion_origen = formData.programacion_origen_id;
      }
      const createdRecord = await bitacoraStore.crearBitacoraEntry(dataToSubmit);
      
      if (createdRecord) {
        success = true;
        if (createdRecord.id && showBodegaSection.value && insumosConsumidos.value.length > 0) {
          for (const insumo of insumosConsumidos.value) {
            try {
              await bodegaMovimientosStore.registrarMovimiento({
                item: insumo.item,
                tipo: 'egreso',
                cantidad: insumo.cantidad,
                bitacora: createdRecord.id,
                notas: `Consumo en campo para la actividad: ${selectedActividadDetalles.value?.nombre || 'Bitácora'}`,
                costo_unitario_aplicado: bodegaStore.getItemById(insumo.item)?.costo_promedio_ponderado
              });
            } catch (movError) {
              console.error('[BitacoraEntryForm] Error registrando movimiento de bodega:', movError);
              uiFeedbackStore.showSnackbar('Entrada guardada pero falló el descuento de inventario', 'warning');
            }
          }
        }
        
        uiFeedbackStore.showSnackbar('Nueva entrada de bitácora guardada con éxito.', 'success');

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
            uiFeedbackStore.showSnackbar('Error actualizando la programación asociada. La bitácora se guardó.', 'warning');
          }
        }
      }
    }
    if (!success) {
      isSubmitting.value = false;
      return;
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
  formData.fotos = [];
  insumosConsumidos.value = [];
  nuevoInsumo.item = null;
  nuevoInsumo.cantidad = null;
  selectedActividadDetalles.value = null;
  bitacoraFormRef.value?.resetValidation();
  emit('close');
}

</script>

<style scoped>
/* Add any specific styles for the form if needed */
</style>
