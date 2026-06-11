<template>
  <v-container fluid class="siembra-knowledge">
    <v-btn icon="mdi-arrow-left" variant="text" @click="$router.back()" class="mb-4">
      <v-icon start>mdi-arrow-left</v-icon>
      Volver
    </v-btn>

    <v-row v-if="siembra">
      <!-- Información Principal -->
      <v-col cols="12" lg="8">
        <v-card class="mb-4">
          <v-card-title class="text-h4">
            {{ siembra.nombre }}
            <v-chip :color="getStatusColor(siembra.estado)" class="ml-2">
              {{ siembra.estado }}
            </v-chip>
          </v-card-title>
          <v-card-subtitle>
            {{ siembra.tipo_cultivo }}
          </v-card-subtitle>

          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <p><strong>Hacienda:</strong> {{ siembra.hacienda_nombre }}</p>
                <p><strong>Zona:</strong> {{ siembra.zona_nombre }}</p>
                <p><strong>Área:</strong> {{ siembra.area?.area }} {{ siembra.area?.unidad }}</p>
              </v-col>
              <v-col cols="12" md="6">
                <p><strong>Fecha siembra:</strong> {{ formatDate(siembra.fecha_siembra) }}</p>
                <p><strong>Fecha cosecha estimada:</strong> {{ formatDate(siembra.fecha_cosecha_estimada) }}</p>
                <p><strong>Días restantes:</strong> {{ diasRestantes }} días</p>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-h6 mb-3">Información Adicional</h4>
            <p>{{ siembra.descripcion || 'Sin descripción' }}</p>
          </v-card-text>

          <v-card-actions>
            <v-btn color="primary" prepend-icon="mdi-download" @click="exportToMarkdown">
              Exportar a MD
            </v-btn>
            <v-btn color="secondary" prepend-icon="mdi-brain" @click="showAIRecommendations = !showAIRecommendations">
              <v-icon start>mdi-lightbulb</v-icon>
              Recomendaciones IA
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Recomendaciones IA -->
        <v-card v-if="showAIRecommendations" class="mb-4">
          <v-card-title>
            <v-icon start color="purple">mdi-brain</v-icon>
            Recomendaciones de IA
          </v-card-title>
          <v-card-text>
            <v-alert type="info" density="compact" class="mb-3">
              Recomendaciones generadas basadas en el tipo de cultivo, etapa de crecimiento y prácticas BPA.
            </v-alert>
            <v-list>
              <v-list-item v-for="(rec, idx) in recomendacionesIA" :key="idx">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title>{{ rec }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Actividades Realizadas -->
        <v-card class="mb-4">
          <v-card-title>Actividades Realizadas vs Programadas</v-card-title>
          <v-card-text>
            <v-progress-linear
              v-if="actividadesProgress"
              :model-value="actividadesProgress"
              :color="actividadesProgress >= 80 ? 'success' : 'warning'"
              class="mb-3"
            />
            <p class="text-body-2">
              {{ actividadesRealizadas }} de {{ actividadesProgramadas }} actividades completadas
              ({{ actividadesProgress }}%)
            </p>

            <v-list v-if="actividades?.length" density="compact">
              <v-list-item
                v-for="actividad in actividades"
                :key="actividad.id"
              >
                <template v-slot:prepend>
                  <v-icon :color="actividad.estado === 'completada' ? 'success' : 'grey'">
                    {{ actividad.estado === 'completada' ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                </template>
                <v-list-item-title>{{ actividad.nombre }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatDate(actividad.fecha_ejecucion) }} - {{ actividad.estado }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Bitácoras -->
        <v-card>
          <v-card-title>Bitácoras Vinculadas</v-card-title>
          <v-card-text>
            <v-list v-if="bitacoras?.length" density="compact">
              <v-list-item
                v-for="bitacora in bitacoras"
                :key="bitacora.id"
              >
                <v-list-item-title>{{ bitacora.descripcion }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatDate(bitacora.created) }} - {{ bitacora.estado }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <p v-else class="text-grey text-center py-4">Sin bitácoras registradas</p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Panel Lateral -->
      <v-col cols="12" lg="4">
        <!-- Métricas BPA -->
        <v-card class="mb-4">
          <v-card-title class="text-h6">Métricas BPA</v-card-title>
          <v-card-text>
            <div v-if="metricasBPA?.length">
              <v-progress-circular
                :model-value="bpaCompliance"
                :color="bpaCompliance >= 80 ? 'success' : 'warning'"
                size="100"
                width="10"
                class="mb-3"
              >
                {{ bpaCompliance }}%
              </v-progress-circular>
              <v-list density="compact">
                <v-list-item
                  v-for="(metrica, idx) in metricasBPA"
                  :key="idx"
                >
                  <v-list-item-title>{{ metrica.pregunta }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip size="small" :color="metrica.respuesta ? 'success' : 'warning'">
                      {{ metrica.respuesta ? 'Cumple' : 'Pendiente' }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
            <p v-else class="text-grey text-center py-4">Sin métricas BPA registradas</p>
          </v-card-text>
        </v-card>

        <!-- Programaciones Futuras -->
        <v-card>
          <v-card-title class="text-h6">Programaciones Futuras</v-card-title>
          <v-card-text>
            <v-timeline v-if="programacionesFuturas?.length" density="compact" side="end">
              <v-timeline-item
                v-for="prog in programacionesFuturas"
                :key="prog.id"
                dot-color="primary"
                size="small"
              >
                <div>
                  <p class="text-md font-weight-bold">{{ prog.actividad_nombre }}</p>
                  <p class="text-caption text-grey">{{ formatDate(prog.fecha_programada) }}</p>
                </div>
              </v-timeline-item>
            </v-timeline>
            <p v-else class="text-grey text-center py-4">Sin programaciones futuras</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-overlay v-else model-value loading>
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-overlay>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { handleError } from '@/utils/errorHandler'
import { exportSiembrasToMarkdown } from '@/utils/exporters/markdownExporter'
import { formatDate } from '@/utils/formatters'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useProgramacionesStore } from '@/stores/programaciones'
import { useBitacoraStore } from '@/stores/bitacoraStore'

const route = useRoute()
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const programacionesStore = useProgramacionesStore()
const bitacoraStore = useBitacoraStore()

// Estado
const siembra = ref(null)
const actividades = ref([])
const bitacoras = ref([])
const metricasBPA = ref([])
const programacionesFuturas = ref([])
const showAIRecommendations = ref(false)
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')

// Recomendaciones IA (mock - en producción vendrían de la API de IA)
const recomendacionesIA = ref([
  'Realizar monitoreo de plagas en los próximos 7 días',
  'Aplicar fertilizante nitrogenado según etapa de crecimiento',
  'Verificar sistema de riego para optimizar uso de agua',
  'Programar poda de mantenimiento para la próxima semana'
])

// Días restantes para cosecha
const diasRestantes = computed(() => {
  if (!siembra.value?.fecha_cosecha_estimada) return 0
  const hoy = new Date()
  const cosecha = new Date(siembra.value.fecha_cosecha_estimada)
  return Math.ceil((cosecha - hoy) / (1000 * 60 * 60 * 24))
})

// Progreso de actividades
const actividadesProgress = computed(() => {
  if (!actividades.value.length) return 0
  const completadas = actividades.value.filter(a => a.estado === 'completada').length
  return Math.round((completadas / actividades.value.length) * 100)
})

const actividadesRealizadas = computed(() => {
  return actividades.value.filter(a => a.estado === 'completada').length
})

const actividadesProgramadas = computed(() => {
  return actividades.value.length
})

// Cumplimiento BPA
const bpaCompliance = computed(() => {
  if (!metricasBPA.value.length) return 0
  const cumplidas = metricasBPA.value.filter(m => m.respuesta).length
  return Math.round((cumplidas / metricasBPA.value.length) * 100)
})

onMounted(async () => {
  await loadData()
})

// Cargar datos
async function loadData() {
  try {
    siembra.value = await siembrasStore.fetchSiembraById(route.params.id)

    actividades.value = await actividadesStore.fetchActividadesBySiembra(route.params.id)
      .catch(() => [])

    bitacoras.value = await bitacoraStore.fetchBitacorasBySiembra(route.params.id)
      .catch(() => [])

    metricasBPA.value = siembra.value?.metricas_bpa || []

    programacionesFuturas.value = await programacionesStore.fetchProgramacionesBySiembra(route.params.id)
      .catch(() => [])
  } catch (error) {
    handleError(error, 'Error al cargar datos de la siembra')
  }
}

// Exportar a Markdown
function exportToMarkdown() {
  try {
    const markdown = exportSiembrasToMarkdown([siembra.value])
    downloadMarkdown(markdown, `siembra_${siembra.value.nombre.replace(/\s+/g, '_')}.md`)
    showSnackbar('Siembra exportada', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar siembra')
  }
}

// Descargar archivo MD
function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Utilidades
function getStatusColor(status) {
  const colors = {
    activa: 'success',
    en_progreso: 'warning',
    completada: 'success',
    finalizada: 'success',
    pendiente: 'info'
  }
  return colors[status?.toLowerCase()] || 'grey'
}


function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.siembra-knowledge {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
