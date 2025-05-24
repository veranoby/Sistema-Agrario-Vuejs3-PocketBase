<template>
  <div class="bitacora-view">
    <h2>Bitácora de Actividades</h2>

    <div v-if="isLoading" class="loading">Cargando entradas...</div>

    <div v-if="error" class="error-message">
      <p>Error cargando la bitácora: {{ error.message }}</p>
    </div>

    <div v-if="!isLoading && entries.length === 0 && !error" class="no-entries">
      No hay entradas en la bitácora para mostrar.
    </div>

    <div v-if="entries.length > 0" class="entries-list">
      <div class="filters">
        <label for="filterType">Filtrar por:</label>
        <select id="filterType" v-model="filterType">
          <option value="all">Todas</option>
          <option value="siembra">Siembra</option>
          <option value="programacion">Programación</option>
        </select>

        <input 
          v-if="filterType === 'siembra'" 
          v-model="filterSiembraId" 
          placeholder="ID de Siembra"
        />
        <input 
          v-if="filterType === 'programacion'" 
          v-model="filterProgramacionId" 
          placeholder="ID de Programación"
        />
        <button @click="applyFilter">Aplicar Filtro</button>
      </div>

      <ul>
        <li v-for="entry in displayedEntries" :key="entry.id" class="bitacora-entry">
          <div class="entry-header">
            <strong>Actividad:</strong> {{ entry.actividad_realizada_nombre || entry.actividad_realizada }} 
            <span class="entry-date">({{ formatDate(entry.fecha_ejecucion) }})</span>
          </div>
          <div class_="entry-details">
            <p v-if="entry.programacion_origen"><strong>Programación Origen:</strong> {{ entry.programacion_origen }}</p>
            <p v-if="entry.siembra_asociada_nombre || entry.siembra_asociada"><strong>Siembra:</strong> {{ entry.siembra_asociada_nombre || entry.siembra_asociada }}</p>
            <p><strong>Estado:</strong> {{ entry.estado_ejecucion }}</p>
            <p v-if="entry.user_responsable_nombre || entry.user_responsable"><strong>Responsable:</strong> {{ entry.user_responsable_nombre || entry.user_responsable }}</p>
            <p v-if="entry.notas"><strong>Notas:</strong> {{ entry.notas }}</p>
            <small class="entry-id">ID: {{ entry.id }}</small>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useBitacoraStore } from '@/stores/bitacoraStore';
import { useHaciendaStore } from '@/stores/haciendaStore';
// For fetching names for related IDs (optional enhancement)
// import { useActividadesStore } from '@/stores/actividadesStore';
// import { useSiembrasStore } from '@/stores/siembrasStore';
// import { useProfileStore } from '@/stores/profileStore'; // Assuming user names are here

const bitacoraStore = useBitacoraStore();
const haciendaStore = useHaciendaStore();
// const actividadesStore = useActividadesStore(); // Optional
// const siembrasStore = useSiembrasStore(); // Optional
// const profileStore = useProfileStore(); // Optional


const isLoading = ref(false);
const error = ref(null);
const entries = ref([]);

const filterType = ref('all'); // 'all', 'siembra', 'programacion'
const filterSiembraId = ref('');
const filterProgramacionId = ref('');

// Fetch initial data (all entries for the hacienda)
onMounted(async () => {
  isLoading.value = true;
  error.value = null;
  try {
    // Ensure bitacoraStore is initialized (loads from localStorage or fetches)
    if (!bitacoraStore.lastSync && haciendaStore.mi_hacienda?.id) {
        // If never synced, call init or cargar directly
        await bitacoraStore.init(); // or await bitacoraStore.cargarBitacoraEntries(haciendaStore.mi_hacienda.id);
    }
    // Entries are now reactive from the store's state if store is designed reactively
    // If not, we might need to explicitly assign them after load.
    // For this component, let's assume we just need to trigger loading if not already done.
  } catch (e) {
    console.error('Error loading bitacora entries:', e);
    error.value = e;
  } finally {
    isLoading.value = false;
  }
});

// Watch for changes in store's entries (if store state is directly used)
// This makes the component reactive to store updates from sync, etc.
watch(() => bitacoraStore.bitacoraEntries, (newEntries) => {
  entries.value = newEntries.map(entry => enrichEntry(entry));
}, { immediate: true, deep: true });

const displayedEntries = computed(() => {
  if (filterType.value === 'all') {
    return entries.value;
  } else if (filterType.value === 'siembra' && filterSiembraId.value) {
    return entries.value.filter(e => e.siembra_asociada === filterSiembraId.value);
  } else if (filterType.value === 'programacion' && filterProgramacionId.value) {
    return entries.value.filter(e => e.programacion_origen === filterProgramacionId.value);
  }
  return entries.value; // Fallback
});

function applyFilter() {
  // The computed property `displayedEntries` will update automatically
  // when filterType, filterSiembraId, or filterProgramacionId change.
  // This function can be used if a manual trigger for filtering is desired,
  // but with the current computed property, it's mostly for show or future complex logic.
  console.log("Applying filter:", filterType.value, filterSiembraId.value, filterProgramacionId.value);
}

// Helper to format date
function formatDate(dateString) {
  if (!dateString) return 'Fecha no disponible';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Optional: Helper to enrich entries with names from related stores
// This is a basic version. A more robust solution might involve getters in the bitacoraStore
// or more sophisticated data fetching/joining.
function enrichEntry(entry) {
  const enriched = { ...entry };
  // Example: (uncomment and adapt if these stores are used)
  /*
  if (entry.actividad_realizada) {
    const actividad = actividadesStore.actividades.find(a => a.id === entry.actividad_realizada);
    enriched.actividad_realizada_nombre = actividad?.nombre || entry.actividad_realizada;
  }
  if (entry.siembra_asociada) {
    const siembra = siembrasStore.siembras.find(s => s.id === entry.siembra_asociada);
    enriched.siembra_asociada_nombre = siembra?.nombre || entry.siembra_asociada;
  }
  if (entry.user_responsable) {
    // Profile store might need a getter like `getUserById`
    // const user = profileStore.getUserById(entry.user_responsable); 
    // enriched.user_responsable_nombre = user?.name || entry.user_responsable;
  }
  */
  return enriched;
}

</script>

<style scoped>
.bitacora-view {
  padding: 20px;
  font-family: Arial, sans-serif;
}
.loading, .no-entries, .error-message {
  text-align: center;
  padding: 20px;
  color: #666;
}
.error-message {
  color: red;
  border: 1px solid red;
  background-color: #ffebeb;
}
.filters {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 5px;
}
.filters label {
  margin-right: 10px;
}
.filters select, .filters input {
  margin-right: 10px;
  padding: 8px;
  border-radius: 3px;
  border: 1px solid #ccc;
}
.filters button {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}
.filters button:hover {
  background-color: #0056b3;
}
.entries-list ul {
  list-style-type: none;
  padding: 0;
}
.bitacora-entry {
  background-color: #fff;
  border: 1px solid #eee;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.entry-header {
  font-size: 1.1em;
  margin-bottom: 10px;
}
.entry-date {
  font-size: 0.9em;
  color: #777;
}
.entry-details p {
  margin: 5px 0;
  font-size: 0.95em;
}
.entry-id {
  font-size: 0.8em;
  color: #aaa;
  display: block;
  margin-top: 10px;
}
</style>
