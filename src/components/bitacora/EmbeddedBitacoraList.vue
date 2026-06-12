<template>
  <div class="embedded-bitacora-calendar">
    <div class="d-flex align-center justify-space-between mb-2">
      <h3 v-if="title" class="text-h6 font-weight-bold">{{ title }}</h3>
      
      <div v-if="!isLoading" class="d-flex align-center bg-grey-lighten-4 rounded-pill px-2 py-1">
        <v-btn icon="mdi-chevron-left" size="x-small" variant="text" color="primary" @click="prevMonth"></v-btn>
        <span class="text-md font-weight-medium px-3 text-capitalize">{{ formattedCurrentMonth }}</span>
        <v-btn icon="mdi-chevron-right" size="x-small" variant="text" color="primary" @click="nextMonth"></v-btn>
      </div>
    </div>

    <div v-if="isLoading" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary" size="small"></v-progress-circular>
      <p class="text-xs">Cargando bitácora...</p>
    </div>

    <v-alert v-if="!isLoading && error" type="warning" density="compact" variant="tonal">
      <template v-slot:prepend><v-icon size="small">mdi-alert-circle-outline</v-icon></template>
      <span class="text-xs">Error: {{ error.message || error }}</span>
    </v-alert>

    <v-card v-if="!isLoading" outlined class="border border-grey-lighten-3 rounded-lg overflow-hidden">
      <BitacoraCalendar 
        :current-date="currentDate" 
        :entries="entriesToShow" 
        @day-click="handleDayClick"
        @entry-click="handleEntryClick"
      />
    </v-card>

    <div v-if="!isLoading && totalMatchingEntries > 0 && entriesToShow.length > 0" class="text-center mt-3">
      <v-btn 
        variant="text" 
        color="primary" 
        size="small"
        @click="navigateToFullBitacora"
      >
        Ver Todas en Vista General ({{ totalMatchingEntries }})
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </div>

    <!-- Entry Details Dialog -->
    <v-dialog v-model="showEntryDetailDialog" max-width="600px">
      <v-card v-if="selectedEntryForDetail">
        <v-card-title class="d-flex justify-space-between align-center px-4 pt-4 pb-2">
          <span class="text-subtitle-1 font-weight-bold">Detalle de Bitácora</span>
          <v-btn icon="mdi-close" variant="text" @click="showEntryDetailDialog = false" size="small"></v-btn>
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          <BitacoraEntryCard 
            :entry="selectedEntryForDetail" 
            @edit="handleEdit"
            @delete="handleDelete"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import { addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import BitacoraCalendar from './BitacoraCalendar.vue';
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
  itemLimit: { // Note: Calendar shows full month, this prop is now mostly obsolete, kept for compatibility if needed elsewhere
    type: Number,
    default: 5,
  },
  title: {
    type: String,
    default: 'Bitácora Reciente'
  }
});

const emit = defineEmits(['edit', 'delete']);

const router = useRouter();
const bitacoraStore = useBitacoraStore();

const isLoading = ref(false);
const error = ref(null);

const currentDate = ref(new Date());
const showEntryDetailDialog = ref(false);
const selectedEntryForDetail = ref(null);

const formattedCurrentMonth = computed(() => {
  return format(currentDate.value, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
});

function prevMonth() {
  currentDate.value = subMonths(currentDate.value, 1);
}

function nextMonth() {
  currentDate.value = addMonths(currentDate.value, 1);
}

function handleDayClick(date) {
  // Option to do something when clicking empty day
}

function handleEntryClick(entry) {
  selectedEntryForDetail.value = entry;
  showEntryDetailDialog.value = true;
}

function handleEdit(entry) {
  showEntryDetailDialog.value = false;
  emit('edit', entry);
}

function handleDelete(entry) {
  showEntryDetailDialog.value = false;
  emit('delete', entry);
}

const allMatchingEntries = computed(() => {
  if (props.siembraId) {
    return bitacoraStore.getEnrichedBitacoraBySiembra(props.siembraId);
  } else if (props.actividadId) {
    return bitacoraStore.getEnrichedBitacoraByActividadRealizada(props.actividadId);
  } else {
    return bitacoraStore.getEnrichedBitacoraEntries;
  }
});

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    if(bitacoraStore.bitacoraEntries.length === 0 || !bitacoraStore.lastSync) {
        await bitacoraStore.init();
    }
  } catch (err) {
    console.error('Error fetching bitacora entries:', err);
    error.value = err;
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

watch(() => [props.siembraId, props.actividadId], () => {
  fetchData();
});

const entriesToShow = computed(() => {
  return allMatchingEntries.value;
});

const totalMatchingEntries = computed(() => {
    return allMatchingEntries.value.length;
});

function navigateToFullBitacora() {
  const query = {};
  if (props.siembraId) query.siembraId = props.siembraId;
  if (props.actividadId) query.actividadId = props.actividadId;
  router.push({ path: '/bitacora', query }); 
}

</script>

<style scoped>
.embedded-bitacora-calendar {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  background-color: white;
}
</style>
