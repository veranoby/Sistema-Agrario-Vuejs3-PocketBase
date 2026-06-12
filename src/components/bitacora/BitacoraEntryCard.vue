<template>
  <v-card class="mb-4" outlined>
    <v-card-title class="d-flex justify-space-between">
      <span>{{ actividadNombre }}</span>
    </v-card-title>
    <v-card-subtitle>
      <v-chip variant="flat" size="x-small" :color="estadoColor">{{ entry.estado_ejecucion }}</v-chip>
      <v-chip size="x-small" :color="estadoColor" variant="flat"> {{ formatDate(entry.fecha_ejecucion) }}</v-chip>
      <span v-if="tipoActividadNombre"> | Tipo: {{ tipoActividadNombre }}</span>
    </v-card-subtitle>

    <v-divider></v-divider>

    <v-card-text>
      <v-list dense>
        <v-list-item v-if="responsableName">
          <template v-slot:prepend><v-icon>mdi-account</v-icon></template>
          <v-list-item-title>Responsable</v-list-item-title>
          <v-list-item-subtitle>{{ responsableName }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="programacionOrigenName">
          <template v-slot:prepend><v-icon>mdi-calendar-clock</v-icon></template>
          <v-list-item-title>Programación Origen</v-list-item-title>
          <v-list-item-subtitle>{{ programacionOrigenName }}</v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="entry.notas">
          <template v-slot:prepend><v-icon>mdi-note-text</v-icon></template>
          <v-list-item-title>Notas</v-list-item-title>
          <v-list-item-subtitle class="text-wrap">{{ entry.notas }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <!-- Tabla de Ubicación (Siembras y Zonas) -->
      <div v-if="siembrasInvolucradas.length > 0 || zonasInvolucradas.length > 0" class="mt-3">
        <h4 class="mb-1">Ubicación de Actividad:</h4>
        <v-table dense class="text-xs">
          <thead>
            <tr>
              <th class="text-left w-25">Tipo</th>
              <th class="text-left">Elementos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="siembrasInvolucradas.length > 0">
              <td class="font-weight-medium">Siembras</td>
              <td class="py-1">
                <v-chip v-for="s in siembrasInvolucradas" :key="s" size="x-small" class="mr-1 my-1" color="green-darken-2" variant="flat">{{ s }}</v-chip>
              </td>
            </tr>
            <tr v-if="zonasInvolucradas.length > 0">
              <td class="font-weight-medium">Zonas</td>
              <td class="py-1">
                <v-chip v-for="z in zonasInvolucradas" :key="z" size="x-small" class="mr-1 my-1" color="primary" variant="tonal">{{ z }}</v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div v-if="validFormatoReporteColumnas && validFormatoReporteColumnas.length > 0 && entry.metricas" class="mt-3">
        <h4 class=" mb-1">Detalles de Actividad:</h4>
        <v-table dense class="text-xs">
          <thead>
            <tr>
              <th class="text-left">Métrica</th>
              <th class="text-left">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="columna in validFormatoReporteColumnas" :key="columna.metrica || columna.nombre">
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
      <div v-else-if="validUnstructuredMetricasKeys.length > 0 && (!validFormatoReporteColumnas || validFormatoReporteColumnas.length === 0)" class="mt-3">
         <h4 class=" mb-1">Metricas Registradas (sin formato):</h4>
         <v-list dense>
            <v-list-item v-for="key in validUnstructuredMetricasKeys" :key="key">
                 <v-list-item-title>{{ key }}: {{ entry.metricas[key] }}</v-list-item-title>
            </v-list-item>
         </v-list>
      </div>

    </v-card-text>
    <v-divider v-if="entry.id"></v-divider>
    <v-card-actions v-if="entry.id">
      <BitacoraSignature
        :bitacoraId="entry.id"
        :existingSignature="entry.signature"
        @signed="onSigned"
      />
      <v-spacer></v-spacer>
      <v-btn
        v-if="isBpaActive"
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-file-pdf-box"
        :loading="pdfLoading"
        @click="handleDownloadPdf"
        class="mr-2"
      >
        Certificado BPA
      </v-btn>
      <v-btn v-if="canEdit" icon="mdi-pencil" size="small" variant="text" @click="$emit('edit', entry)" />
      <v-btn v-if="canDelete" icon="mdi-delete" size="small" variant="text" color="error" @click="$emit('delete', entry)" />
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { generateBpaReport } from '@/services/pdfGenerator'
import BitacoraSignature from './BitacoraSignature.vue';

const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()
const bitacoraStore = useBitacoraStore()

const canEdit = computed(() => authStore.canEdit)
const canDelete = computed(() => authStore.canDelete)

const props = defineProps({
  entry: {
    type: Object,
    required: true,
  },
});

const pdfLoading = ref(false)

const isBpaActive = computed(() => {
  return haciendaStore.isModuleActive('pdf_bpa') && props.entry.signature?.hash
})

async function handleDownloadPdf() {
  pdfLoading.value = true
  try {
    await generateBpaReport(props.entry, haciendaStore.mi_hacienda)
  } catch (err) {
    console.error('[BitacoraEntryCard] Error generating PDF:', err)
  } finally {
    pdfLoading.value = false
  }
}

async function onSigned(payload) {
  try {
    await bitacoraStore.updateBitacoraEntry(props.entry.id, { signature: payload })
  } catch (err) {
    console.error('[BitacoraEntryCard] Error updating signature:', err)
  }
}

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

const siembrasInvolucradas = computed(() => {
  if (props.entry.expand?.siembras) {
    return props.entry.expand.siembras.map(s => s.tipo ? `${s.nombre} (${s.tipo})` : s.nombre);
  }
  const oldSiembra = getSafe(() => props.entry.expand.siembra_asociada);
  if (oldSiembra) {
    return oldSiembra.tipo ? [`${oldSiembra.nombre} (${oldSiembra.tipo})`] : [oldSiembra.nombre];
  }
  return [];
});

const zonasInvolucradas = computed(() => {
  if (props.entry.expand?.zonas) {
    return props.entry.expand.zonas.map(z => z.nombre);
  }
  return [];
});

const programacionOrigenName = computed(() => getSafe(() => props.entry.expand.programacion_origen.descripcion, props.entry.programacion_origen));
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

const validFormatoReporteColumnas = computed(() => {
  if (!formatoReporteColumnas.value || !formatoReporteColumnas.value.length) return [];
  return formatoReporteColumnas.value.filter(columna => {
    let val = getMetricaValue(columna.metrica);
    if (val === undefined) {
       if (columna.tipo === 'text' && props.entry.metricas && props.entry.metricas[columna.nombre]) {
         val = props.entry.metricas[columna.nombre];
       }
    }
    return val !== undefined && val !== null && val !== '' && String(val).trim().toUpperCase() !== 'N/A';
  });
});

const validUnstructuredMetricasKeys = computed(() => {
  if (!props.entry.metricas) return [];
  return Object.keys(props.entry.metricas).filter(key => {
    const val = props.entry.metricas[key];
    return val !== undefined && val !== null && val !== '' && String(val).trim().toUpperCase() !== 'N/A';
  });
});

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
.v-card-title span {
  word-break: break-word; /* Ensure long activity names wrap */
}
.text-xs { /* Vuetify utility, but ensure it's available or define if needed */
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
