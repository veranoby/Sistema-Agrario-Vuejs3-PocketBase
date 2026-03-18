<template>
  <v-container fluid class="program-detail">
    <v-btn icon="mdi-arrow-left" variant="text" @click="$router.back()" class="mb-4">
      <v-icon start>mdi-arrow-left</v-icon>
      Volver
    </v-btn>

    <v-row v-if="programacion">
      <!-- Información Principal -->
      <v-col cols="12" lg="8">
        <v-card class="mb-4">
          <v-card-title class="text-h4">
            {{ programacion.nombre }}
            <v-chip :color="getStatusColor(programacion.estado)" class="ml-2">
              {{ programacion.estado }}
            </v-chip>
          </v-card-title>
          <v-card-subtitle>
            {{ programacion.actividad_nombre }}
          </v-card-subtitle>

          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <p><strong>Hacienda:</strong> {{ programacion.hacienda_nombre }}</p>
                <p><strong>Frecuencia:</strong> {{ programacion.frecuencia }}</p>
                <p><strong>Estado:</strong> {{ programacion.estado }}</p>
              </v-col>
              <v-col cols="12" md="6">
                <p><strong>Creada:</strong> {{ formatDate(programacion.created) }}</p>
                <p><strong>Última actualización:</strong> {{ formatDate(programacion.updated) }}</p>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <h4 class="text-h6 mb-3">Descripción</h4>
            <p>{{ programacion.descripcion || 'Sin descripción' }}</p>
          </v-card-text>

          <v-card-actions>
            <v-btn color="primary" prepend-icon="mdi-download" @click="exportToMarkdown">
              Exportar a MD
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Historial de Ejecuciones -->
        <v-card v-if="ejecuciones?.length">
          <v-card-title>Historial de Ejecuciones</v-card-title>
          <v-card-text>
            <v-timeline density="compact" side="end">
              <v-timeline-item
                v-for="ejecucion in ejecuciones"
                :key="ejecucion.id"
                :dot-color="getStatusColor(ejecucion.estado)"
                size="small"
              >
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <p class="text-subtitle-2 font-weight-bold">
                      {{ formatDate(ejecucion.fecha) }}
                    </p>
                    <p class="text-caption text-grey">
                      {{ ejecucion.responsable || 'Sin responsable' }}
                    </p>
                  </div>
                  <v-chip size="small" :color="getStatusColor(ejecucion.estado)">
                    {{ ejecucion.estado }}
                  </v-chip>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Panel Lateral -->
      <v-col cols="12" lg="4">
        <!-- Siembras Relacionadas -->
        <v-card class="mb-4">
          <v-card-title class="text-h6">Siembras Relacionadas</v-card-title>
          <v-card-text>
            <v-list v-if="siembrasRelacionadas?.length" density="compact">
              <v-list-item
                v-for="siembra in siembrasRelacionadas"
                :key="siembra.id"
                @click="$router.push(`/knowledge/siembra/${siembra.id}`)"
              >
                <v-list-item-title>{{ siembra.nombre }}</v-list-item-title>
                <v-list-item-subtitle>{{ siembra.tipo_cultivo }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <p v-else class="text-grey text-center py-4">Sin siembras relacionadas</p>
          </v-card-text>
        </v-card>

        <!-- Bitácoras Vinculadas -->
        <v-card>
          <v-card-title class="text-h6">Bitácoras Vinculadas</v-card-title>
          <v-card-text>
            <v-list v-if="bitacorasVinculadas?.length" density="compact">
              <v-list-item
                v-for="bitacora in bitacorasVinculadas"
                :key="bitacora.id"
              >
                <v-list-item-title>{{ bitacora.descripcion }}</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(bitacora.fecha) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <p v-else class="text-grey text-center py-4">Sin bitácoras vinculadas</p>
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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { exportProgramacionesToMarkdown } from '@/utils/markdownExporter'
import { useSnackbarStore } from '@/stores/snackbarStore'

const route = useRoute()
const snackbarStore = useSnackbarStore()

// Estado
const programacion = ref(null)
const ejecuciones = ref([])
const siembrasRelacionadas = ref([])
const bitacorasVinculadas = ref([])
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')

onMounted(async () => {
  await loadData()
})

// Cargar datos
async function loadData() {
  try {
    // Obtener programación
    programacion.value = await pb.collection('programaciones').getOne(route.params.id, {
      expand: 'actividad,hacienda'
    })

    // Obtener ejecuciones (mock - en producción sería una colección real)
    ejecuciones.value = await pb.collection('programaciones_ejecuciones').getFullList({
      filter: `programacion = "${route.params.id}"`,
      sort: '-fecha'
    }).catch(() => [])

    // Obtener siembras relacionadas
    siembrasRelacionadas.value = await pb.collection('siembras').getFullList({
      filter: `programaciones ~ "${route.params.id}"`
    }).catch(() => [])

    // Obtener bitácoras vinculadas
    bitacorasVinculadas.value = await pb.collection('bitacora').getFullList({
      filter: `programacion = "${route.params.id}"`
    }).catch(() => [])
  } catch (error) {
    handleError(error, 'Error al cargar datos de la programación')
  }
}

// Exportar a Markdown
function exportToMarkdown() {
  try {
    const markdown = exportProgramacionesToMarkdown([programacion.value])
    downloadMarkdown(markdown, `programacion_${programacion.value.nombre.replace(/\s+/g, '_')}.md`)
    showSnackbar('Programación exportada', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar programación')
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
    pendiente: 'info',
    cancelada: 'error'
  }
  return colors[status?.toLowerCase()] || 'grey'
}

function formatDate(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.program-detail {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
