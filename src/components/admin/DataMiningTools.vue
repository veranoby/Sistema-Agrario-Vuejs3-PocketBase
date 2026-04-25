<template>
  <v-card variant="elevated" elevation="2">
    <v-card-title>Herramientas de Data Mining</v-card-title>
    <v-card-subtitle>Consultas avanzadas y exportación de datos</v-card-subtitle>

    <v-card-text>
      <!-- Filtros -->
      <v-form @submit.prevent="runQuery">
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filters.dateFrom"
              label="Desde"
              type="date"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-calendar-start"
              clearable
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="filters.dateTo"
              label="Hasta"
              type="date"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-calendar-end"
              clearable
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-autocomplete
              v-model="filters.hacienda"
              :items="haciendasItems"
              label="Hacienda"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-home-city"
              clearable
              placeholder="Todas"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-autocomplete
              v-model="filters.tipo"
              :items="tiposActividadesItems"
              label="Tipo Actividad"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-alert-circle"
              clearable
              placeholder="Todos"
            />
          </v-col>
        </v-row>

        <div class="d-flex gap-2 mb-4">
          <v-btn
            color="primary"
            type="submit"
            :loading="loading"
            prepend-icon="mdi-magnify"
          >
            Ejecutar Query
          </v-btn>

          <v-btn
            v-if="results.length > 0"
            color="success"
            @click="exportResults"
            prepend-icon="mdi-download"
          >
            Exportar CSV
          </v-btn>

          <v-btn
            v-if="results.length > 0"
            variant="outlined"
            color="grey"
            @click="clearResults"
            prepend-icon="mdi-delete"
          >
            Limpiar
          </v-btn>
        </div>
      </v-form>

      <!-- Resultados -->
      <v-alert
        v-if="results.length > 0"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        <strong>{{ results.length }}</strong> resultados encontrados
        <span v-if="queryDuration">en {{ queryDuration }}ms</span>
      </v-alert>

      <v-data-table
        v-if="results.length > 0"
        :headers="headers"
        :items="results"
        :items-per-page="20"
        :loading="loading"
        density="compact"
        show-select
        hover
      >
        <template v-slot:item.tipo_actividades="{ item }">
          <v-chip size="small" color="primary">
            {{ item.tipo_actividades || 'Sin tipo' }}
          </v-chip>
        </template>

        <template v-slot:item.estado="{ item }">
          <v-chip
            :color="getEstadoColor(item.estado)"
            size="small"
          >
            {{ item.estado || 'N/A' }}
          </v-chip>
        </template>

        <template v-slot:item.created="{ item }">
          {{ formatDate(item.created) }}
        </template>

        <template v-slot:item.hacienda="{ item }">
          <v-chip size="small" variant="outlined">
            {{ getHaciendaName(item.hacienda) }}
          </v-chip>
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-eye"
            size="small"
            variant="text"
            @click="viewDetails(item)"
          />
        </template>
      </v-data-table>

      <v-empty-state
        v-if="results.length === 0 && !loading"
        title="Sin resultados"
        text="Ejecutá una query para ver resultados"
        icon="mdi-database-search"
        class="mt-8"
      />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { formatDate } from '@/utils/formatters'
import { exportToCSV } from '@/utils/exporters'

const analyticsStore = useAnalyticsStore()
const loading = ref(false)
const results = ref([])
const queryDuration = ref(null)
const haciendasItems = ref([])
const tiposActividadesItems = ref([])
const haciendaNamesCache = ref({})

const filters = ref({
  dateFrom: null,
  dateTo: null,
  hacienda: null,
  tipo: null
})

const headers = [
  { key: 'nombre', title: 'Nombre', sortable: true, minWidth: 200 },
  { key: 'tipo_actividades', title: 'Tipo', sortable: true },
  { key: 'hacienda', title: 'Hacienda', sortable: true },
  { key: 'estado', title: 'Estado', sortable: true },
  { key: 'created', title: 'Fecha', sortable: true },
  { key: 'actions', title: 'Acciones', sortable: false, align: 'center' }
]

onMounted(async () => {
  await loadFilterOptions()
})

async function loadFilterOptions() {
  try {
    // Cargar haciendas
    const haciendas = await pb.collection('Haciendas').getList(1, 100)
    haciendasItems.value = haciendas.items.map(h => ({
      value: h.id,
      title: h.name
    }))

    // Cargar tipos de actividades
    const tipos = await pb.collection('tipo_actividades').getList(1, 100)
    tiposActividadesItems.value = tipos.items.map(t => ({
      value: t.id,
      title: t.nombre
    }))

    logger.info('[DATA_MINING] Opciones de filtros cargadas')
  } catch (error) {
    logger.error('[DATA_MINING] Error cargando opciones', error)
  }
}

async function runQuery() {
  loading.value = true
  const startTime = Date.now()

  try {
    // Usar analytics API para patrones
    const patternType = filters.value.tipo || 'siembra'
    await analyticsStore.fetchPatterns({
      type: patternType,
      region: filters.value.hacienda,
      cultivo: null
    })

    // Convertir patrones a formato de tabla
    if (analyticsStore.patterns?.patterns) {
      results.value = analyticsStore.patterns.patterns.map(p => ({
        id: `${p.cultivo}-${p.mes || p.promedio}`,
        nombre: p.cultivo,
        tipo_actividades: patternType,
        hacienda: filters.value.hacienda || 'Todas',
        estado: 'analizado',
        created: new Date().toISOString(),
        ...p
      }))
    }

    queryDuration.value = Date.now() - startTime

    logger.info('[DATA_MINING] Query ejecutada', {
      results: results.value.length,
      duration: queryDuration.value
    })
  } catch (error) {
    logger.error('[DATA_MINING] Error ejecutando query', error)
  } finally {
    loading.value = false
  }
}

function clearResults() {
  results.value = []
  queryDuration.value = null
  filters.value = {
    dateFrom: null,
    dateTo: null,
    hacienda: null,
    tipo: null
  }
}

function exportResults() {
  if (results.value.length === 0) {
    logger.warn('[DATA_MINING] No hay resultados para exportar')
    return
  }

  const exportData = results.value.map(r => ({
    nombre: r.nombre,
    tipo: r.tipo_actividades,
    hacienda: r.hacienda,
    mes: r.mes || '',
    cultivo: r.cultivo || '',
    probabilidad: r.probabilidad || '',
    promedio: r.promedio || '',
    rendimientoPromedio: r.rendimientoPromedio || '',
    count: r.count || 0
  }))

  const filename = `data_mining_${new Date().toISOString().split('T')[0]}.csv`
  exportToCSV(exportData, filename)

  logger.info('[DATA_MINING] CSV exportado', { rows: exportData.length })
}

function getHaciendaName(haciendaId) {
  if (!haciendaId) return 'N/A'
  if (haciendaNamesCache.value[haciendaId]) return haciendaNamesCache.value[haciendaId]

  // Intentar obtener de expand si está disponible
  const hacienda = results.value.find(r => r.id === haciendaId)?.expand?.hacienda
  if (hacienda) {
    haciendaNamesCache.value[haciendaId] = hacienda.name
    return hacienda.name
  }

  return haciendaId
}

function getEstadoColor(estado) {
  const colors = {
    planificada: 'grey',
    en_progreso: 'blue',
    completada: 'success',
    cancelada: 'error'
  }
  return colors[estado?.toLowerCase()] || 'grey'
}

// formatDate ya está importado de @/utils/formatters

function viewDetails(item) {
  logger.info('[DATA_MINING] Ver detalles', { item })
  // Aquí se podría abrir un diálogo con más detalles
  // Por ahora, solo logueamos la información
}
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
