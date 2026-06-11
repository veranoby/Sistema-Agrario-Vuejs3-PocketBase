<template>
  <v-container fluid class="pa-2">
    <div class="d-flex flex-column gap-4 w-100">
      <header class="w-100 bg-background shadow-sm p-0 mb-4">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0 text-uppercase">
                {{ t('bitacora.general_title') }}
                <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
                  {{ t('roles.' + userRole) }}
                </v-chip>
                <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
                  {{ t('dashboard.hacienda') }}: {{ mi_hacienda?.name }}
                </v-chip>
              </h3>
            </div>

            <div class="w-full sm:w-auto z-10 d-flex gap-2">
              <v-btn
                prepend-icon="mdi-plus-circle"
                color="primary"
                variant="flat"
                class="font-weight-bold text-white elevation-2 rounded-lg"
                @click="showNewEntryDialog = true"
              >
                Nueva Entrada
              </v-btn>
              <v-btn
                v-if="!isLoading && displayedEntries.length > 0"
                prepend-icon="mdi-file-pdf"
                color="red-darken-3"
                variant="flat"
                class="font-weight-bold text-white elevation-2 rounded-lg"
                @click="exportToPDF"
                :loading="exportingPDF"
              >
                {{ $t('bitacora.export_pdf') }}
              </v-btn>
              <v-btn
                v-if="!isLoading && displayedEntries.length > 0"
                prepend-icon="mdi-file-excel"
                color="green-darken-3"
                variant="flat"
                class="font-weight-bold text-white elevation-2 rounded-lg"
                @click="exportToExcel"
                :loading="exportingExcel"
              >
                {{ $t('bitacora.export_excel') }}
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>

    <v-row>
      <v-col cols="12">
        <v-expansion-panels class="mb-4">
          <v-expansion-panel class="soft-green-filter">
            <v-expansion-panel-title>
              <v-icon start>mdi-filter-variant</v-icon>
              Filtros 
              <span class="text-caption text-grey-darken-1 mt-1">
                Todas las entradas registradas para la hacienda actual.
              </span>

            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row dense>
                <v-col cols="12" md="4" class="mb-2">
                  <v-select
                    v-model="filterSiembraId"
                    :items="siembrasForFilter"
                    item-title="nombre"
                    item-value="id"
                    label="Filtrar por Siembra"
                    clearable
                    dense
                    hide-details
                  ></v-select>
                </v-col>
                <v-col cols="12" md="4" class="mb-2">
                  <v-select
                    v-model="filterActividadId"
                    :items="actividadesForFilter"
                    item-title="nombre"
                    item-value="id"
                    label="Filtrar por Actividad"
                    clearable
                    dense
                    hide-details
                  ></v-select>
                </v-col>
                <v-col cols="12" md="4" class="mb-2">
                  <v-text-field
                    v-model="filterDate"
                    label="Filtrar por Fecha (YYYY-MM-DD)"
                    type="date"
                    clearable
                    dense
                    hide-details
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>

    <v-row v-if="isLoading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p>Cargando bitácora...</p>
      </v-col>
    </v-row>

    <v-row v-if="!isLoading && error">
      <v-col cols="12">
        <v-alert type="error" prominent>
          Error cargando la bitácora: {{ error.message || error }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="!isLoading && displayedEntries.length === 0 && !error">
      <v-col cols="12" md="10" offset-md="1" class="mt-4">
        <v-card class="pa-6 text-center rounded-xl elevation-0 border bg-surface">
          <v-icon size="48" color="primary" class="mb-3">mdi-book-open-variant</v-icon>
          <h3 class="text-md font-weight-bold mb-1">Fase 3: Control y Bitácora</h3>
          <p class="text-smtext-medium-emphasis mb-6">
            Aún no hay entradas en el Libro Diario. La Bitácora es el resultado de la ejecución de las fases anteriores.
          </p>
          
          <v-timeline align="start" side="end" density="compact" class="text-left mt-4 mb-4">
            <v-timeline-item dot-color="success" size="small">
              <template v-slot:icon><v-icon color="white" size="small">mdi-check</v-icon></template>
              <div class="mb-1">
                <div class="  font-weight-bold text-success">Fase 1 y 2: Estructura</div>
                <div class="text-caption text-medium-emphasis">Las siembras, zonas y actividades ya deben estar configuradas.</div>
              </div>
            </v-timeline-item>

            <v-timeline-item dot-color="success" size="small">
              <template v-slot:icon><v-icon color="white" size="small">mdi-check</v-icon></template>
              <div class="mb-1">
                <div class="  font-weight-bold text-success">Fase 3: Programaciones</div>
                <div class="text-caption text-medium-emphasis">Planifica tus labores para que se ejecuten a tiempo.</div>
              </div>
            </v-timeline-item>

            <v-timeline-item dot-color="primary" size="small">
              <div class="mb-1">
                <div class="  font-weight-bold">Bitácora (Estás aquí)</div>
                <div class="text-caption text-medium-emphasis">Al completarse una programación o reportar una actividad, se generará una entrada inmutable aquí.</div>
              </div>
              <v-btn size="small" variant="flat" color="primary" class="mt-2" @click="showNewEntryDialog = true">Registrar Entrada Manual</v-btn>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="!isLoading" class="mb-4">
      <v-col cols="12">
        <v-card outlined>
          <v-card-title class="d-flex align-center justify-space-between pb-0">
            <h3 class="text-h6 font-weight-bold">
              {{ formattedCurrentMonth }}
            </h3>
            <div>
              <v-btn icon="mdi-chevron-left" variant="text" @click="prevMonth"></v-btn>
              <v-btn variant="text" @click="goToToday" class="mx-2">Hoy</v-btn>
              <v-btn icon="mdi-chevron-right" variant="text" @click="nextMonth"></v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <BitacoraCalendar 
              :current-date="currentDate" 
              :entries="filteredEntries" 
              @day-click="handleDayClick"
              @entry-click="handleEntryClick"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <div v-if="!isLoading && displayedEntries.length === 0" class="text-center pa-4 text-medium-emphasis">
      No hay registros en este mes.
    </div>
    </div>

    <!-- Entry Details Dialog -->
    <v-dialog v-model="showEntryDetailDialog" max-width="600px" @keydown.esc="showEntryDetailDialog = false">
      <v-card v-if="selectedEntryForDetail">
        <v-card-title class="d-flex justify-space-between align-center px-4 pt-4 pb-2">
          <span>Detalle de Bitácora</span>
          <v-btn icon="mdi-close" variant="text" @click="showEntryDetailDialog = false" size="small"></v-btn>
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          <BitacoraEntryCard 
            :entry="selectedEntryForDetail" 
            @edit="abrirEdicion"
            @delete="confirmarBorrado"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showNewEntryDialog"
      max-width="800px"
      persistent
      scrollable
      @keydown.esc="showNewEntryDialog = false"
    >
      <BitacoraEntryForm
        v-if="showNewEntryDialog"
        :entryToEdit="entryToEdit"
        :programacionId="pendingProgramacionId"
        @close="cerrarDialogoFormulario"
        @save="handleBitacoraCreated"
      />
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import BitacoraEntryForm from '@/components/forms/BitacoraEntryForm.vue';
import { useHaciendaStore } from '@/stores/haciendaStore';
import { useSiembrasStore } from '@/stores/siembrasStore'; // For filter
import { useActividadesStore } from '@/stores/actividadesStore'; // For filter
// No hay store separado para tipos, están en actividadesStore.tiposActividades
import BitacoraEntryCard from './BitacoraEntryCard.vue'; // Import the new card component
import BitacoraCalendar from './BitacoraCalendar.vue'; // Import the calendar component
import { pdfExporter } from '@/utils/exporters/pdfExporter';
import { excelExporter } from '@/utils/exporters/excelExporter';
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from 'vue-i18n';
import { addMonths, subMonths, format, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const bitacoraStore = useBitacoraStore();
const haciendaStore = useHaciendaStore();
const siembrasStore = useSiembrasStore();
const actividadesStore = useActividadesStore();
const uiFeedbackStore = useUiFeedbackStore();
const authStore = useAuthStore();
const { t } = useI18n();
const { userRole, avatarUrl } = storeToRefs(authStore);
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore);

const exportingPDF = ref(false);
const exportingExcel = ref(false);
const showNewEntryDialog = ref(false);
const entryToEdit = ref(null);
const pendingProgramacionId = ref(null);

const showEntryDetailDialog = ref(false);
const selectedEntryForDetail = ref(null);

const currentDate = ref(new Date());

const isLoading = ref(false);
const error = ref(null);

// Filters
const filterSiembraId = ref(null);
const filterActividadId = ref(null);
const filterDate = ref(null); // Keep as secondary filter if needed, though calendar is already monthly

const itemsPerPage = ref(9); // Unused in calendar view, but kept for compatibility
const currentPage = ref(1);

const formattedCurrentMonth = computed(() => {
  return format(currentDate.value, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
});

function prevMonth() {
  currentDate.value = subMonths(currentDate.value, 1);
}

function nextMonth() {
  currentDate.value = addMonths(currentDate.value, 1);
}

function goToToday() {
  currentDate.value = new Date();
}

function handleDayClick(date) {
  // Can be used to open form pre-filled with date
}

function handleEntryClick(entry) {
  selectedEntryForDetail.value = entry;
  showEntryDetailDialog.value = true;
}

// Ensure dependent stores are initialized for filters
onMounted(async () => {
  isLoading.value = true;
  error.value = null;
  try {
    // Init master data for filters if not already loaded
    if (siembrasStore.siembras.length === 0) {
      await siembrasStore.init(haciendaStore.mi_hacienda?.id);
    }
    if (actividadesStore.actividades.length === 0) {
      await actividadesStore.init(haciendaStore.mi_hacienda?.id);
    }

    // Init bitacoraStore (loads from localStorage or fetches)
    // The store itself handles not re-fetching if data is recent via its `lastSync`
    await bitacoraStore.init(); 

    // Auto-open form if we come from programaciones
    const { useProgramacionesStore } = await import('@/stores/programaciones/programacionesStore');
    const programacionesStore = useProgramacionesStore();
    if (programacionesStore.pendingBitacoraFromProgramacionData) {
      pendingProgramacionId.value = programacionesStore.pendingBitacoraFromProgramacionData.programacion_origen || programacionesStore.pendingBitacoraFromProgramacionData.programacionId;
      showNewEntryDialog.value = true;
    }

  } catch (e) {
    console.error('Error initializing BitacoraView or dependent stores:', e);
    error.value = e;
  } finally {
    isLoading.value = false;
  }
});

// Get all enriched entries from the store
const allEnrichedEntries = computed(() => {
    // Using the getter that returns already sorted entries (newest first)
    return bitacoraStore.getEnrichedBitacoraEntries || []; 
});

const filteredEntries = computed(() => {
  let entries = allEnrichedEntries.value;

  if (filterSiembraId.value) {
    entries = entries.filter(entry => entry.siembra_asociada === filterSiembraId.value || entry.expand?.siembra_asociada?.id === filterSiembraId.value);
  }
  if (filterActividadId.value) {
    entries = entries.filter(entry => entry.actividad_realizada === filterActividadId.value || entry.expand?.actividad_realizada?.id === filterActividadId.value);
  }
  if (filterDate.value) {
    entries = entries.filter(entry => {
      if (!entry.fecha_ejecucion) return false;
      // Compare only date part, ignoring time
      const entryDate = entry.fecha_ejecucion.substring(0, 10);
      return entryDate === filterDate.value;
    });
  }
  return entries;
});

const paginatedEntries = computed(() => {
    const end = currentPage.value * itemsPerPage.value;
    return filteredEntries.value.slice(0, end);
});

// Use paginatedEntries for display
const displayedEntries = computed(() => paginatedEntries.value);

const siembrasForFilter = computed(() => {
  return siembrasStore.siembras.map(s => ({ id: s.id, nombre: s.nombre }));
});

const actividadesForFilter = computed(() => {
  return actividadesStore.actividades.map(a => ({ id: a.id, nombre: a.nombre }));
});

watch([filterSiembraId, filterActividadId, filterDate], () => {
    currentPage.value = 1; // Reset to first page on filter change
});

function loadMore() {
    currentPage.value += 1;
}

function abrirEdicion(entry) {
  showEntryDetailDialog.value = false;
  entryToEdit.value = entry;
  showNewEntryDialog.value = true;
}

function cerrarDialogoFormulario() {
  showNewEntryDialog.value = false;
  entryToEdit.value = null;
  pendingProgramacionId.value = null;
}

async function confirmarBorrado(entry) {
  if (confirm('¿Está seguro de eliminar esta entrada?')) {
     await bitacoraStore.deleteBitacoraEntry(entry.id);
     showEntryDetailDialog.value = false;
     await bitacoraStore.refreshPage();
     uiFeedbackStore.showSnackbar('Entrada eliminada', 'success');
  }
}

async function handleBitacoraCreated() {
  cerrarDialogoFormulario();
  await bitacoraStore.refreshPage();
}

// Export functions
async function exportToPDF() {
  if (exportingPDF.value) return;

  exportingPDF.value = true;
  try {
    // Export all filtered entries to PDF
    await pdfExporter.exportBitacorasMultiple(
      filteredEntries.value,
      actividadesStore.actividades,
      actividadesStore.tiposActividades || [],
      haciendaStore.mi_hacienda
    );

    uiFeedbackStore.showSnackbar('PDF exportado correctamente', 'success');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    uiFeedbackStore.showSnackbar(`Error exportando PDF: ${error.message}`, 'error');
  } finally {
    exportingPDF.value = false;
  }
}

async function exportToExcel() {
  if (exportingExcel.value) return;

  exportingExcel.value = true;
  try {
    // Export filtered entries to Excel with summary
    await excelExporter.exportBitacorasWithSummary(
      filteredEntries.value,
      actividadesStore.actividades,
      actividadesStore.tiposActividades || [],
      {
        filtros: {
          siembra: filterSiembraId.value,
          actividad: filterActividadId.value,
          fecha: filterDate.value
        }
      }
    );

    uiFeedbackStore.showSnackbar('Excel exportado correctamente', 'success');
  } catch (error) {
    console.error('Error exporting Excel:', error);
    uiFeedbackStore.showSnackbar(`Error exportando Excel: ${error.message}`, 'error');
  } finally {
    exportingExcel.value = false;
  }
}
</script>

<style scoped>
/* Add any specific styles for BitacoraView if needed */
.v-expansion-panel-title {
  font-weight: 500;
}
</style>
