<template>
  <v-card class="mb-4" outlined>
    <v-card-title class="d-flex justify-space-between">
      <span>{{ actividadNombre }}</span>
      <v-chip size="small" :color="estadoColor" label>{{ entry.estado_ejecucion }}</v-chip>
    </v-card-title>
    <v-card-subtitle>
      {{ formatDate(entry.fecha_ejecucion) }}
      <span v-if="tipoActividadNombre"> | Tipo: {{ tipoActividadNombre }}</span>
    </v-card-subtitle>

    <v-divider></v-divider>

    <v-card-text>
      <v-list dense>
        <v-list-item v-if="siembraNombre">
          <template v-slot:prepend><v-icon>mdi-sprout</v-icon></template>
          <v-list-item-title>Siembra</v-list-item-title>
          <v-list-item-subtitle>{{ siembraNombre }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="responsableName">
          <template v-slot:prepend><v-icon>mdi-account</v-icon></template>
          <v-list-item-title>Responsable</v-list-item-title>
          <v-list-item-subtitle>{{ responsableName }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="entry.programacion_origen">
          <template v-slot:prepend><v-icon>mdi-calendar-clock</v-icon></template>
          <v-list-item-title>Programación Origen</v-list-item-title>
          <v-list-item-subtitle>{{ entry.programacion_origen }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="entry.notas">
          <template v-slot:prepend><v-icon>mdi-note-text</v-icon></template>
          <v-list-item-title>Notas</v-list-item-title>
          <v-list-item-subtitle class="text-wrap">{{ entry.notas }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <div v-if="formatoReporteColumnas && formatoReporteColumnas.length > 0 && entry.metricas" class="mt-3">
        <h4 class="text-subtitle-1 mb-1">Detalles de Actividad:</h4>
        <v-table dense class="text-caption">
          <thead>
            <tr>
              <th class="text-left">Métrica</th>
              <th class="text-left">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="columna in formatoReporteColumnas" :key="columna.metrica || columna.nombre">
              <td>{{ columna.nombre }}</td>
              <td>
                <span v-if="getMetricaValue(columna.metrica) !== undefined">
                  {{ getMetricaValue(columna.metrica) }}
                </span>
                <em v-else-if="columna.tipo === 'text' && entry.metricas && entry.metricas[columna.nombre]"> <!-- For direct text like Observaciones -->
                  {{ entry.metricas[columna.nombre] }}
                </em>
                <em v-else>No registrado</em>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
      <div v-else-if="entry.metricas && Object.keys(entry.metricas).length > 0 && (!formatoReporteColumnas || formatoReporteColumnas.length === 0)" class="mt-3">
         <h4 class="text-subtitle-1 mb-1">Metricas Registradas (sin formato):</h4>
         <v-list dense>
            <v-list-item v-for="(value, key) in entry.metricas" :key="key">
                 <v-list-item-title>{{ key }}: {{ value }}</v-list-item-title>
            </v-list-item>
         </v-list>
      </div>

    </v-card-text>
    <v-divider v-if="entry.id"></v-divider>
     <v-card-actions v-if="entry.id">
        <v-spacer></v-spacer>
        <v-chip variant="outlined" size="x-small" pill>ID: {{ entry.id }}</v-chip>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  entry: {
    type: Object,
    required: true,
  },
});

// Helper to safely access nested properties
const getSafe = (fn, defaultValue = '') => {
  try {
    const value = fn();
    // Ensure that if value is an empty object (from a failed expand but existing field), it's treated as defaultValue
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0 && defaultValue === '') {
        return defaultValue;
    }
    return value === undefined || value === null ? defaultValue : value;
  } catch (e) {
    return defaultValue;
  }
};

const actividadNombre = computed(() => getSafe(() => props.entry.expand.actividad_realizada.nombre, 'Actividad Desconocida'));
const tipoActividadNombre = computed(() => getSafe(() => props.entry.expand.actividad_realizada.expand.tipo_actividades.nombre));
const siembraNombre = computed(() => getSafe(() => props.entry.expand.siembra_asociada.nombre));
const responsableName = computed(() => getSafe(() => props.entry.expand.user_responsable.name, getSafe(() => props.entry.expand.user_responsable.username, 'No asignado')));

const estadoColor = computed(() => {
  switch (props.entry.estado_ejecucion?.toLowerCase()) {
    case 'completado': return 'green';
    case 'en_progreso': return 'blue';
    case 'planificada': return 'orange';
    case 'cancelada': return 'red';
    default: return 'grey';
  }
});

const formatoReporteColumnas = computed(() => {
  return getSafe(() => props.entry.expand.actividad_realizada.expand.tipo_actividades.formato_reporte.columnas, []);
});

const bitacoraMetricasValues = computed(() => {
  return getSafe(() => props.entry.metricas, {});
});

function getMetricaValue(metricaKey) {
  // metricaKey comes from formato_reporte.columnas[n].metrica
  // This key should directly map to a key in the bitacora entry's own 'metricas' field.
  // Return undefined if not found, so v-if can distinguish between "not found" and a legitimate falsy value like 0 or false.
  return bitacoraMetricasValues.value[metricaKey];
}

function formatDate(dateString) {
  if (!dateString) return 'Fecha no disponible';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    // Use toLocaleString for a more user-friendly date and time format
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return 'Fecha inválida';
  }
}

</script>

<style scoped>
/* Tailwind classes can be used here if needed, e.g., for margin/padding adjustments */
.v-card-title span {
  word-break: break-word; /* Ensure long activity names wrap */
}
.text-caption { /* Vuetify utility, but ensure it's available or define if needed */
    font-size: 0.75rem !important;
    line-height: 1.25rem;
}
.text-wrap { /* Vuetify utility */
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
}
.v-list-item-subtitle {
  white-space: normal; /* Allow subtitles to wrap */
}
</style>
