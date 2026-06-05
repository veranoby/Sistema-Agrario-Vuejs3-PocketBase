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
                color="success"
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
      <v-col cols="12">
        <v-alert type="info" class="text-center">
          {{ $t('bitacora.no_entries') }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="!isLoading && displayedEntries.length > 0">
      <v-col
        v-for="entry in displayedEntries"
        :key="entry.id"
        cols="12"
        md="6" 
        lg="4" 
      >
        <BitacoraEntryCard :entry="entry" />
      </v-col>
    </v-row>
    
    <v-row v-if="!isLoading && displayedEntries.length > 0 && paginatedEntries.length < filteredEntries.length" class="mt-4">
        <v-col class="text-center">
            <v-btn @click="loadMore" color="primary">Cargar Más</v-btn>
        </v-col>
    </v-row>
    </div>

    <v-dialog
      v-model="showNewEntryDialog"
      max-width="800px"
      persistent
      scrollable
      @keydown.esc="showNewEntryDialog = false"
    >
      <BitacoraEntryForm
        v-if="showNewEntryDialog"
        @close="showNewEntryDialog = false"
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
import { pdfExporter } from '@/utils/exporters/pdfExporter';
import { excelExporter } from '@/utils/exporters/excelExporter';
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/authStore';
import { useI18n } from 'vue-i18n';

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

const isLoading = ref(false);
const error = ref(null);

// Filters
const filterSiembraId = ref(null);
const filterActividadId = ref(null);
const filterDate = ref(null); // Store date as YYYY-MM-DD string

const itemsPerPage = ref(9); // Number of cards to load initially and per "load more"
const currentPage = ref(1);

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

async function handleBitacoraCreated() {
  showNewEntryDialog.value = false;
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
