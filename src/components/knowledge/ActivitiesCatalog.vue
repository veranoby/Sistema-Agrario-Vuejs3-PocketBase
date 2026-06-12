<template>
  <v-container fluid class="activities-catalog">
    <div class="d-flex justify-space-between align-center mb-4">
      <h3 class="text-md">Catálogo de Tipos de Actividades</h3>
      <v-btn color="primary" prepend-icon="mdi-download" @click="exportCatalog">
        Exportar MD
      </v-btn>
    </div>

    <!-- Filtros -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar por nombre o descripción"
              prepend-icon="mdi-magnify"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filterCategory"
              label="Filtrar por categoría"
              :items="categories"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-chip color="primary" label>
              {{ filteredActivities.length }} tipos
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Grid de Actividades -->
    <v-row>
      <v-col
        v-for="actividad in filteredActivities"
        :key="actividad.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card hover class="activity-card" @click="viewDetail(actividad)">
          <v-card-text>
            <div class="d-flex justify-space-between align-start mb-2">
              <h3 class="text-h6">{{ actividad.nombre }}</h3>
              <v-chip size="small" color="primary">
                {{ actividad.categoria || 'General' }}
              </v-chip>
            </div>

            <p class="text-smtext-grey mb-3">
              {{ actividad.descripcion || 'Sin descripción' }}
            </p>

            <v-divider class="my-2" />

            <div v-if="actividad.metricas_bpa?.length" class="mb-2">
              <p class="text-md mb-1">
                <v-icon size="small" start>mdi-clipboard-check</v-icon>
                Métricas BPA
              </p>
              <v-chip-group>
                <v-chip
                  v-for="(metrica, idx) in actividad.metricas_bpa.slice(0, 3)"
                  :key="idx"
                  size="small"
                  variant="outlined"
                >
                  {{ idx + 1 }}
                </v-chip>
                <v-chip v-if="actividad.metricas_bpa.length > 3" size="small">
                  +{{ actividad.metricas_bpa.length - 3 }}
                </v-chip>
              </v-chip-group>
            </div>

            <p class="text-xs text-grey">
              Creado: {{ formatDate(actividad.created) }}
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-empty-state
      v-if="!filteredActivities.length"
      title="No se encontraron actividades"
      text="Intenta con otros filtros o términos de búsqueda"
      icon="mdi-clipboard-list-off"
    />

    <!-- Dialog: Ver Detalle -->
    <v-dialog v-model="detailDialog" max-width="800">
      <v-card>
        <v-card-title>
          {{ selectedActivity?.nombre }}
          <v-chip size="small" color="primary" class="ml-2">
            {{ selectedActivity?.categoria || 'General' }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <h4 class=" mb-2">Información General</h4>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>ID</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedActivity?.id }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Descripción</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedActivity?.descripcion || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Categoría</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedActivity?.categoria || 'General' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Fecha de creación</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(selectedActivity?.created) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <h4 class=" mb-2">Métricas BPA</h4>
              <v-list v-if="selectedActivity?.metricas_bpa?.length" density="compact">
                <v-list-item
                  v-for="(metrica, idx) in selectedActivity.metricas_bpa"
                  :key="idx"
                >
                  <v-list-item-title>{{ idx + 1 }}. {{ metrica.pregunta }}</v-list-item-title>
                </v-list-item>
              </v-list>
              <p v-else class="text-grey">Sin métricas BPA definidas</p>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" variant="text" @click="exportActivity(selectedActivity)">
            Exportar a MD
          </v-btn>
          <v-spacer />
          <v-btn color="grey" @click="detailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { handleError } from '@/utils/errorHandler'
import { exportTiposActividadesToMarkdown } from '@/utils/exporters/markdownExporter'
import { formatDate } from '@/utils/formatters'
import { useActividadesStore } from '@/stores/actividadesStore'

const actividadesStore = useActividadesStore()

// Estado
const loading = ref(false)
const activities = ref([])
const search = ref('')
const filterCategory = ref(null)
const detailDialog = ref(false)
const selectedActivity = ref(null)
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')

// Categorías únicas
const categories = computed(() => {
  const cats = new Set(activities.value.map(a => a.categoria).filter(Boolean))
  return Array.from(cats)
})

// Actividades filtradas
const filteredActivities = computed(() => {
  let result = activities.value

  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(a =>
      a.nombre?.toLowerCase().includes(query) ||
      a.descripcion?.toLowerCase().includes(query)
    )
  }

  if (filterCategory.value) {
    result = result.filter(a => a.categoria === filterCategory.value)
  }

  return result
})

onMounted(async () => {
  await fetchActivities()
})

// Obtener actividades
async function fetchActivities() {
  loading.value = true
  try {
    await actividadesStore.cargarTiposActividades()
    activities.value = actividadesStore.tiposActividades
  } catch (error) {
    handleError(error, 'Error al cargar tipos de actividades')
  } finally {
    loading.value = false
  }
}

// Ver detalle
function viewDetail(actividad) {
  selectedActivity.value = actividad
  detailDialog.value = true
}

// Exportar catálogo
function exportCatalog() {
  try {
    const markdown = exportTiposActividadesToMarkdown(filteredActivities.value)
    downloadMarkdown(markdown, 'catalogo_actividades.md')
    showSnackbar(`${filteredActivities.value.length} actividades exportadas`, 'success')
  } catch (error) {
    handleError(error, 'Error al exportar catálogo')
  }
}

// Exportar actividad individual
function exportActivity(actividad) {
  try {
    const markdown = exportTiposActividadesToMarkdown([actividad])
    downloadMarkdown(markdown, `actividad_${actividad.nombre.replace(/\s+/g, '_')}.md`)
    showSnackbar('Actividad exportada', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar actividad')
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

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.activities-catalog {
  max-width: 1400px;
  margin: 0 auto;
}

.activity-card {
  transition: transform 0.2s;
  cursor: pointer;
}

.activity-card:hover {
  transform: translateY(-4px);
}
</style>
