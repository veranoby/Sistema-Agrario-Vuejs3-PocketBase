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
    let filterParts = []

    if (filters.value.hacienda) {
      filterParts.push(`hacienda="${filters.value.hacienda}"`)
    }

    if (filters.value.tipo) {
      filterParts.push(`tipo_actividades="${filters.value.tipo}"`)
    }

    if (filters.value.dateFrom) {
      filterParts.push(`created >= "${filters.value.dateFrom}T00:00:00Z"`)
    }

    if (filters.value.dateTo) {
      filterParts.push(`created <= "${filters.value.dateTo}T23:59:59Z"`)
    }

    const filter = filterParts.length > 0 ? filterParts.join(' && ') : ''

    const resultList = await pb.collection('actividades').getList(1, 1000, {
      filter: filter || undefined,
      sort: '-created',
      expand: 'tipo_actividades,hacienda'
    })

    results.value = resultList.items
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
  const headers = ['ID', 'Nombre', 'Tipo', 'Hacienda', 'Fecha', 'Estado', 'Descripción']
  const rows = results.value.map(r => [
    r.id,
    r.nombre,
    r.tipo_actividades || 'Sin tipo',
    getHaciendaName(r.hacienda),
    r.created,
    r.estado || 'N/A',
    r.descripcion || ''
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `query_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)

  logger.info('[DATA_MINING] CSV exportado', { rows: rows.length })
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

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

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
