<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="headline">Bitácora General de Actividades</v-card-title>
          <v-card-subtitle>Todas las entradas registradas para la hacienda actual.</v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-expansion-panels class="mb-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon start>mdi-filter-variant</v-icon>
              Filtros
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row dense>
                <v-col cols="12" md="4">
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
                <v-col cols="12" md="4">
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
                <v-col cols="12" md="4">
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
          No hay entradas en la bitácora que coincidan con los filtros aplicados, o no hay entradas registradas aún.
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

  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import { useHaciendaStore } from '@/stores/haciendaStore';
import { useSiembrasStore } from '@/stores/siembrasStore'; // For filter
import { useActividadesStore } from '@/stores/actividadesStore'; // For filter
import BitacoraEntryCard from './BitacoraEntryCard.vue'; // Import the new card component

const bitacoraStore = useBitacoraStore();
const haciendaStore = useHaciendaStore();
const siembrasStore = useSiembrasStore();
const actividadesStore = useActividadesStore();

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

</script>

<style scoped>
/* Add any specific styles for BitacoraView if needed */
.v-expansion-panel-title {
  font-weight: 500;
}
</style>
