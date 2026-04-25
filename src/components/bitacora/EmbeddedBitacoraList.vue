<template>
  <div class="embedded-bitacora-list">
    <h3 v-if="title" class="text-h6 mb-2">{{ title }}</h3>
    
    <div v-if="isLoading" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary" size="small"></v-progress-circular>
      <p class="text-caption">Cargando bitácora...</p>
    </div>

    <v-alert v-if="!isLoading && error" type="warning" density="compact" variant="tonal">
      <template v-slot:prepend><v-icon size="small">mdi-alert-circle-outline</v-icon></template>
      <span class="text-caption">Error: {{ error.message || error }}</span>
    </v-alert>

    <div v-if="!isLoading && entriesToShow.length === 0 && !error" class="text-center pa-4">
      <p class="text-caption">No hay entradas de bitácora recientes para mostrar.</p>
    </div>

    <div v-if="!isLoading && entriesToShow.length > 0">
      <v-list lines="one" density="compact">
        <template v-for="(entry, index) in entriesToShow" :key="entry.id">
          <v-list-item @click="expandedEntryId = expandedEntryId === entry.id ? null : entry.id" class="pa-0">
            <v-row no-gutters align="center">
              <v-col cols="auto" class="pr-2">
                 <v-chip size="x-small" :color="estadoColor(entry.estado_ejecucion)" label>{{ entry.estado_ejecucion }}</v-chip>
              </v-col>
              <v-col>
                <div class="text-subtitle-2 text-truncate">
                  {{ getSafe(() => entry.expand.actividad_realizada.nombre, 'Actividad Desconocida') }}
                </div>
                <div class="text-caption grey--text text--darken-1">
                  {{ formatDate(entry.fecha_ejecucion) }}
                </div>
              </v-col>
              <v-col cols="auto">
                <v-btn icon variant="text" size="small">
                  <v-icon>{{ expandedEntryId === entry.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-list-item>
          <v-expand-transition>
            <div v-show="expandedEntryId === entry.id">
              <BitacoraEntryCard :entry="entry" class="my-2 elevation-1" />
            </div>
          </v-expand-transition>
          <v-divider v-if="index < entriesToShow.length - 1" class="my-1"></v-divider>
        </template>
      </v-list>
    </div>

    <div v-if="!isLoading && totalMatchingEntries > itemLimit && entriesToShow.length > 0" class="text-center mt-3">
      <v-btn 
        variant="text" 
        color="primary" 
        size="small"
        @click="navigateToFullBitacora"
      >
        Ver Todas ({{ totalMatchingEntries }})
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import BitacoraEntryCard from './BitacoraEntryCard.vue';

const props = defineProps({
  siembraId: {
    type: String,
    default: null,
  },
  actividadId: { // This refers to actividad_realizada in bitacora
    type: String,
    default: null,
  },
  itemLimit: {
    type: Number,
    default: 5,
  },
  title: {
    type: String,
    default: 'Bitácora Reciente'
  }
});

const router = useRouter();
const bitacoraStore = useBitacoraStore();

const isLoading = ref(false);
const error = ref(null);
const allMatchingEntries = ref([]);
const expandedEntryId = ref(null); // To expand one card at a time

// Helper to safely access nested properties
const getSafe = (fn, defaultValue = '') => {
  try {
    return fn() || defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    // Ensure bitacora store is initialized (it handles its own fetching logic)
    if(bitacoraStore.bitacoraEntries.length === 0 || !bitacoraStore.lastSync) { // Basic check
        await bitacoraStore.init();
    }

    let entriesSource;
    if (props.siembraId) {
      // Assumes getEnrichedBitacoraBySiembra getter returns sorted (newest first)
      entriesSource = bitacoraStore.getEnrichedBitacoraBySiembra(props.siembraId);
    } else if (props.actividadId) {
      // Assumes getEnrichedBitacoraByActividadRealizada getter returns sorted (newest first)
      entriesSource = bitacoraStore.getEnrichedBitacoraByActividadRealizada(props.actividadId);
    } else {
      // Default to all entries if no specific filter, sorted by most recent
      entriesSource = bitacoraStore.getEnrichedBitacoraEntries;
    }
    allMatchingEntries.value = entriesSource || [];

  } catch (e) {
    console.error('Error fetching bitacora for embedded list:', e);
    error.value = e;
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

// Watch for prop changes to refetch data if necessary
watch(() => [props.siembraId, props.actividadId], () => {
  fetchData();
});

// Watch for changes in the store itself
watch(() => bitacoraStore.bitacoraEntries, (newEntries) => {
    // Re-evaluate the source based on current props when store changes
    if (props.siembraId) {
      allMatchingEntries.value = bitacoraStore.getEnrichedBitacoraBySiembra(props.siembraId) || [];
    } else if (props.actividadId) {
      allMatchingEntries.value = bitacoraStore.getEnrichedBitacoraByActividadRealizada(props.actividadId) || [];
    } else {
      allMatchingEntries.value = bitacoraStore.getEnrichedBitacoraEntries || [];
    }
}, { deep: true });


const entriesToShow = computed(() => {
  return allMatchingEntries.value.slice(0, props.itemLimit);
});

const totalMatchingEntries = computed(() => {
    return allMatchingEntries.value.length;
});

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
     if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'Fecha inválida';
  }
}

const estadoColor = (estado) => {
  switch (estado?.toLowerCase()) {
    case 'completado': return 'green-lighten-1';
    case 'en_progreso': return 'blue-lighten-1';
    case 'planificada': return 'orange-lighten-1';
    case 'cancelada': return 'red-lighten-1';
    default: return 'grey-lighten-1';
  }
};

function navigateToFullBitacora() {
  const query = {};
  if (props.siembraId) query.siembraId = props.siembraId;
  if (props.actividadId) query.actividadId = props.actividadId;
  // Assuming your main bitacora view is at '/bitacora' route
  // And it can accept siembraId/actividadId as query params for pre-filtering
  router.push({ path: '/bitacora', query }); 
}

</script>

<style scoped>
.embedded-bitacora-list {
  border: 1px solid #e0e0e0; /* Vuetify's grey.lighten-2 */
  border-radius: 4px;
  padding: 8px;
}
.v-list-item {
  cursor: pointer;
}
.text-truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
