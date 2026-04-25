<template>
  <v-container fluid class="unified-search">
    <h2 class="text-h5 mb-4">Búsqueda Unificada de Conocimiento</h2>
    <p class="text-body-1 text-grey mb-6">
      Busca en todas las entidades del sistema: siembras, programaciones, actividades, tipos de actividades y más.
    </p>

    <!-- Barra de Búsqueda -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="searchQuery"
              label="Buscar..."
              placeholder="Ej: fumigación, maíz, zona norte..."
              prepend-icon="mdi-magnify"
              clearable
              @update:model-value="debouncedSearch"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedTypes"
              label="Filtrar por tipo"
              :items="entityTypes"
              multiple
              chips
              clearable
              @update:model-value="performSearch"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Resultados -->
    <v-row v-if="searchPerformed">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h3 class="text-h6">
            Resultados ({{ totalResults }})
          </h3>
          <v-btn
            color="primary"
            prepend-icon="mdi-download"
            :disabled="!hasResults"
            @click="exportResults"
          >
            Exportar Resultados
          </v-btn>
        </div>
      </v-col>

      <!-- Pestañas por tipo de entidad -->
      <v-col cols="12">
        <v-tabs v-model="activeTab" align-tabs="start" show-arrows>
          <v-tab
            v-for="type in entityTypes"
            :key="type.value"
            :value="type.value"
            :disabled="!results[type.value]?.length"
          >
            <v-icon start>{{ type.icon }}</v-icon>
            {{ type.title }}
            <v-chip size="x-small" color="primary" class="ml-2">
              {{ results[type.value]?.length || 0 }}
            </v-chip>
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
          <v-window-item
            v-for="type in entityTypes"
            :key="type.value"
            :value="type.value"
          >
            <!-- Siembras -->
            <v-card v-if="type.value === 'siembras'" class="mt-4">
              <v-card-text>
                <v-list v-if="results.siembras?.length">
                  <v-list-item
                    v-for="siembra in results.siembras"
                    :key="siembra.id"
                    :prepend-avatar="getAvatarUrl(siembra)"
                    @click="navigateToDetail('siembra', siembra.id)"
                  >
                    <v-list-item-title>{{ siembra.nombre }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ siembra.tipo_cultivo }} • Hacienda: {{ siembra.hacienda_nombre }} •
                      Zona: {{ siembra.zona_nombre }}
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <v-chip size="small" :color="getStatusColor(siembra.estado)">
                        {{ siembra.estado }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
                <v-empty-state
                  v-else
                  title="No se encontraron siembras"
                  text="Intenta con otros términos de búsqueda"
                  icon="mdi-seed"
                />
              </v-card-text>
            </v-card>

            <!-- Programaciones -->
            <v-card v-else-if="type.value === 'programaciones'" class="mt-4">
              <v-card-text>
                <v-list v-if="results.programaciones?.length">
                  <v-list-item
                    v-for="prog in results.programaciones"
                    :key="prog.id"
                    @click="navigateToDetail('programacion', prog.id)"
                  >
                    <v-list-item-title>{{ prog.nombre }}</v-list-item-title>
                    <v-list-item-subtitle>
                      Actividad: {{ prog.actividad_nombre }} •
                      Frecuencia: {{ prog.frecuencia }}
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <v-chip size="small" :color="getStatusColor(prog.estado)">
                        {{ prog.estado }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
                <v-empty-state
                  v-else
                  title="No se encontraron programaciones"
                  text="Intenta con otros términos de búsqueda"
                  icon="mdi-calendar-clock"
                />
              </v-card-text>
            </v-card>

            <!-- Actividades -->
            <v-card v-else-if="type.value === 'actividades'" class="mt-4">
              <v-card-text>
                <v-list v-if="results.actividades?.length">
                  <v-list-item
                    v-for="act in results.actividades"
                    :key="act.id"
                    @click="navigateToDetail('actividad', act.id)"
                  >
                    <v-list-item-title>{{ act.nombre }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ act.tipo }} • Hacienda: {{ act.hacienda_nombre }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
                <v-empty-state
                  v-else
                  title="No se encontraron actividades"
                  text="Intenta con otros términos de búsqueda"
                  icon="mdi-check-all"
                />
              </v-card-text>
            </v-card>

            <!-- Tipos de Actividades -->
            <v-card v-else-if="type.value === 'tipos_actividades'" class="mt-4">
              <v-card-text>
                <v-list v-if="results.tipos_actividades?.length">
                  <v-list-item
                    v-for="tipo in results.tipos_actividades"
                    :key="tipo.id"
                    @click="navigateToDetail('tipo_actividad', tipo.id)"
                  >
                    <v-list-item-title>{{ tipo.nombre }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ tipo.descripcion || 'Sin descripción' }}
                    </v-list-item-subtitle>
                    <template v-slot:append v-if="tipo.metricas_bpa?.length">
                      <v-chip size="small" color="info">
                        {{ tipo.metricas_bpa.length }} métricas BPA
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
                <v-empty-state
                  v-else
                  title="No se encontraron tipos de actividades"
                  text="Intenta con otros términos de búsqueda"
                  icon="mdi-clipboard-list"
                />
              </v-card-text>
            </v-card>

            <!-- Haciendas -->
            <v-card v-else-if="type.value === 'haciendas'" class="mt-4">
              <v-card-text>
                <v-list v-if="results.haciendas?.length">
                  <v-list-item
                    v-for="hacienda in results.haciendas"
                    :key="hacienda.id"
                    @click="navigateToDetail('hacienda', hacienda.id)"
                  >
                    <v-list-item-title>{{ hacienda.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ hacienda.descripcion || 'Sin descripción' }} •
                      {{ hacienda.ubicacion || 'Ubicación no especificada' }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
                <v-empty-state
                  v-else
                  title="No se encontraron haciendas"
                  text="Intenta con otros términos de búsqueda"
                  icon="mdi-barn"
                />
              </v-card-text>
            </v-card>
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>

    <!-- Estado inicial -->
    <v-empty-state
      v-else
      class="py-16"
      title="Comienza a buscar"
      text="Escribe un término para buscar en todo el conocimiento del sistema"
      icon="mdi-magnify"
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { handleError } from '@/utils/errorHandler'
import { debounce } from '@/utils/debounce'
import { exportKnowledgeHubToMarkdown } from '@/utils/markdownExporter'
import { useSyncStore } from '@/stores/sync/index'

const router = useRouter()
const syncStore = useSyncStore()

// Estado
const searchQuery = ref('')
const selectedTypes = ref([])
const activeTab = ref(null)
const searchPerformed = ref(false)
const results = ref({})
const loading = ref(false)
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')

// Tipos de entidades
const entityTypes = [
  { value: 'siembras', title: 'Siembras', icon: 'mdi-seed' },
  { value: 'programaciones', title: 'Programaciones', icon: 'mdi-calendar-clock' },
  { value: 'actividades', title: 'Actividades', icon: 'mdi-check-all' },
  { value: 'tipos_actividades', title: 'Tipos Actividades', icon: 'mdi-clipboard-list' },
  { value: 'haciendas', title: 'Haciendas', icon: 'mdi-barn' }
]

// Total de resultados
const totalResults = computed(() => {
  return Object.values(results.value).reduce((sum, arr) => sum + arr.length, 0)
})

const hasResults = computed(() => totalResults.value > 0)

// Búsqueda debounceada
const debouncedSearch = debounce(() => {
  performSearch()
}, 300)

// Ejecutar búsqueda
async function performSearch() {
  if (!searchQuery.value && !selectedTypes.value.length) {
    results.value = {}
    searchPerformed.value = false
    return
  }

  searchPerformed.value = true
  loading.value = true

  try {
    const query = searchQuery.value.toLowerCase()
    const types = selectedTypes.value.length ? selectedTypes.value : entityTypes.map(t => t.value)

    // Usar syncStore.searchOffline para búsqueda offline-first
    const searchResults = await syncStore.searchOffline(query, {
      collections: types,
      fields: ['nombre', 'tipo_cultivo', 'descripcion', 'actividad_nombre', 'name']
    })

    results.value = {}
    if (types.includes('siembras')) results.value.siembras = searchResults.siembras || []
    if (types.includes('programaciones')) results.value.programaciones = searchResults.programaciones || []
    if (types.includes('actividades')) results.value.actividades = searchResults.actividades || []
    if (types.includes('tipos_actividades')) results.value.tipos_actividades = searchResults.tipos_actividades || []
    if (types.includes('haciendas')) results.value.haciendas = searchResults.haciendas || []

    // Seleccionar primera pestaña con resultados
    const firstTypeWithResults = entityTypes.find(t => results.value[t.value]?.length)
    if (firstTypeWithResults) {
      activeTab.value = firstTypeWithResults.value
    }
  } catch (error) {
    handleError(error, 'Error al buscar')
  } finally {
    loading.value = false
  }
}

// Navegar a detalle
function navigateToDetail(type, id) {
  const routes = {
    siembra: '/knowledge/siembra',
    programacion: '/knowledge/program',
    actividad: '/knowledge/activities',
    tipo_actividad: '/knowledge/activities',
    hacienda: '/admin/haciendas'
  }

  const route = routes[type]
  if (route) {
    router.push(`${route}/${id}`)
  }
}

// Exportar resultados
function exportResults() {
  try {
    const markdown = exportKnowledgeHubToMarkdown({
      siembras: results.value.siembras || [],
      actividades: results.value.actividades || [],
      programaciones: results.value.programaciones || []
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resultados_busqueda_${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)

    showSnackbar('Resultados exportados', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar resultados')
  }
}

// Utilidades
function getStatusColor(status) {
  const colors = {
    activa: 'success',
    activo: 'success',
    completada: 'success',
    en_progreso: 'warning',
    pendiente: 'info',
    inactiva: 'grey',
    inactivo: 'grey'
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
.unified-search {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
