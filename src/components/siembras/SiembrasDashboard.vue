<template>
  <v-container fluid class="siembras-dashboard">
    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h4 font-weight-bold">Dashboard de Siembras</h1>
            <p class="text-subtitle-2 text-medium-emphasis">
              Vista general del estado de cultivos
            </p>
          </div>
          <v-btn
            color="success"
            prepend-icon="mdi-plus"
            @click="navigateToNewSiembra"
          >
            Nueva Siembra
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Métricas clave -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card variant="elevated" elevation="2" class="metric-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center">
              <v-avatar size="48" color="success-lighten-4" class="mr-3">
                <v-icon color="success" size="large">mdi-sprout</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-medium-emphasis">Siembras Activas</div>
                <div class="text-h4 font-weight-bold">{{ metrics.activeSiembras }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="elevated" elevation="2" class="metric-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center">
              <v-avatar size="48" color="blue-lighten-4" class="mr-3">
                <v-icon color="blue" size="large">mdi-ruler</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-medium-emphasis">Área Sembrada</div>
                <div class="text-h4 font-weight-bold">{{ formatArea(metrics.totalArea) }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="elevated" elevation="2" class="metric-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center">
              <v-avatar size="48" color="orange-lighten-4" class="mr-3">
                <v-icon color="orange" size="large">mdi-calendar-clock</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-medium-emphasis">Cosechas Próximas</div>
                <div class="text-h4 font-weight-bold">{{ metrics.upcomingHarvests }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="elevated" elevation="2" class="metric-card">
          <v-card-text class="pa-4">
            <div class="d-flex align-center">
              <v-avatar size="48" color="error-lighten-4" class="mr-3">
                <v-icon color="error" size="large">mdi-alert-circle</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-medium-emphasis">Alertas</div>
                <div class="text-h4 font-weight-bold text-error">{{ metrics.alerts }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Mapa y Lista -->
    <v-row>
      <!-- Mapa de siembras -->
      <v-col cols="12" lg="8">
        <v-card variant="elevated" elevation="2" class="h-100">
          <v-card-title class="pa-4">
            <v-icon start color="success">mdi-map</v-icon>
            Mapa de Siembras
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <div class="map-container" style="height: 500px;">
              <GisMapComponent
                v-if="siembrasGeoJSON"
                :initial-geo-json="siembrasGeoJSON"
                :readonly="true"
              />
              <div v-else class="d-flex align-center justify-center h-100">
                <v-progress-circular indeterminate color="success" />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Lista de siembras recientes -->
      <v-col cols="12" lg="4">
        <v-card variant="elevated" elevation="2" class="h-100">
          <v-card-title class="pa-4 d-flex justify-space-between align-center">
            <span>
              <v-icon start color="success">mdi-clock-time-three</v-icon>
              Siembras Recientes
            </span>
            <v-btn
              size="small"
              variant="text"
              @click="navigateToSiembrasList"
            >
              Ver todas
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <v-list class="siembras-list">
              <v-list-item
                v-for="siembra in recentSiembras"
                :key="siembra.id"
                :to="`/siembras/${siembra.id}`"
                class="siembra-item"
                lines="two"
              >
                <template #prepend>
                  <v-avatar :color="getSiembraColor(siembra)" size="40">
                    <v-icon size="small">mdi-sprout</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ siembra.nombre }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex flex-column gap-1">
                    <span>{{ formatDate(siembra.fecha_siembra) }}</span>
                    <v-chip size="x-small" :color="getEstadoColor(siembra.estado)" variant="tonal">
                      {{ siembra.estado }}
                    </v-chip>
                  </div>
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item v-if="recentSiembras.length === 0">
                <v-list-item-text class="text-center text-medium-emphasis">
                  No hay siembras registradas
                </v-list-item-text>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gráfico de ciclos -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card variant="elevated" elevation="2">
          <v-card-title class="pa-4">
            <v-icon start color="success">mdi-chart-timeline-variant</v-icon>
            Ciclos de Cultivo
          </v-card-title>
          <v-divider />
          <v-card-text>
            <CycleChart :siembras="siembras" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabla de rendimiento por cultivo -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card variant="elevated" elevation="2">
          <v-card-title class="pa-4 d-flex justify-space-between align-center">
            <span>
              <v-icon start color="success">mdi-chart-bar</v-icon>
              Rendimiento por Cultivo
            </span>
            <v-btn
              size="small"
              variant="outlined"
              prepend-icon="mdi-download"
              @click="exportReport"
            >
              Exportar
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th>Cultivo</th>
                  <th>Área Total (ha)</th>
                  <th>N° Siembras</th>
                  <th>Rendimiento Prom.</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cultivo in cultivosAgrupados" :key="cultivo.nombre">
                  <td class="font-weight-medium">{{ cultivo.nombre }}</td>
                  <td>{{ formatArea(cultivo.areaTotal) }}</td>
                  <td>{{ cultivo.numSiembras }}</td>
                  <td>{{ cultivo.rendimientoProm }} kg/ha</td>
                  <td>
                    <v-chip size="small" :color="getEstadoColor(cultivo.estado)" variant="tonal">
                      {{ cultivo.estado }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import GisMapComponent from '@/components/GisMapComponent.vue'
import CycleChart from './CycleChart.vue'

const router = useRouter()
const siembrasStore = useSiembrasStore()

const siembras = ref([])
const isLoading = ref(true)

// Cargar datos
onMounted(async () => {
  try {
    isLoading.value = true
    await siembrasStore.fetchSiembras()
    siembras.value = siembrasStore.siembras || []
  } catch (error) {
    console.error('Error cargando siembras:', error)
  } finally {
    isLoading.value = false
  }
})

// Métricas
const metrics = computed(() => {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const activeSiembras = siembras.value.filter(s => s.estado === 'activo' || s.estado === 'en_produccion')
  const totalArea = activeSiembras.reduce((sum, s) => sum + (s.area_total || 0), 0)
  const upcomingHarvests = siembras.value.filter(s => {
    if (!s.fecha_cosecha_estimada) return false
    const cosechaDate = new Date(s.fecha_cosecha_estimada)
    return cosechaDate >= now && cosechaDate <= thirtyDaysFromNow
  })
  const alerts = siembras.value.filter(s => s.alertas && s.alertas.length > 0).length

  return {
    activeSiembras: activeSiembras.length,
    totalArea,
    upcomingHarvests: upcomingHarvests.length,
    alerts
  }
})

// Siembras recientes
const recentSiembras = computed(() => {
  return [...siembras.value]
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 5)
})

// GeoJSON para mapa
const siembrasGeoJSON = computed(() => {
  if (!siembras.value || siembras.value.length === 0) return null

  return {
    type: 'FeatureCollection',
    features: siembras.value
      .filter(s => s.geometria)
      .map(s => ({
        type: 'Feature',
        properties: {
          id: s.id,
          nombre: s.nombre,
          estado: s.estado,
          area: s.area_total
        },
        geometry: s.geometria
      }))
  }
})

// Cultivos agrupados
const cultivosAgrupados = computed(() => {
  const agrupados = {}

  siembras.value.forEach(s => {
    const cultivo = s.tipo_cultivo || 'Sin especificar'
    if (!agrupados[cultivo]) {
      agrupados[cultivo] = {
        nombre: cultivo,
        areaTotal: 0,
        numSiembras: 0,
        rendimientoTotal: 0,
        rendimientoCount: 0,
        estado: s.estado
      }
    }
    agrupados[cultivo].areaTotal += s.area_total || 0
    agrupados[cultivo].numSiembras += 1
    if (s.rendimiento) {
      agrupados[cultivo].rendimientoTotal += s.rendimiento
      agrupados[cultivo].rendimientoCount += 1
    }
  })

  return Object.values(agrupados).map(c => ({
    ...c,
    rendimientoProm: c.rendimientoCount > 0
      ? Math.round(c.rendimientoTotal / c.rendimientoCount)
      : 0
  }))
})

// Navegación
function navigateToNewSiembra() {
  router.push('/siembras/nueva')
}

function navigateToSiembrasList() {
  router.push('/siembras')
}

// Utilidades
function formatArea(area) {
  if (!area) return '0 ha'
  if (area >= 100) {
    return `${(area / 100).toFixed(1)} km²`
  }
  return `${area.toFixed(1)} ha`
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: es })
  } catch {
    return dateString
  }
}

function getEstadoColor(estado) {
  const colors = {
    activo: 'success',
    en_produccion: 'success',
    planificado: 'blue',
    en_cosecha: 'orange',
    finalizado: 'grey',
    fallido: 'error'
  }
  return colors[estado] || 'grey'
}

function getSiembraColor(siembra) {
  const estadoColors = {
    activo: 'success',
    en_produccion: 'success',
    planificado: 'blue',
    en_cosecha: 'orange',
    finalizado: 'grey',
    fallido: 'error'
  }
  return estadoColors[siembra.estado] || 'grey'
}

function exportReport() {
  // TODO: Implementar exportación a PDF/Excel
  console.log('Exportar reporte de rendimiento')
}
</script>

<style scoped>
.metric-card {
  transition: transform 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.map-container {
  border-radius: 8px;
  overflow: hidden;
}

.siembras-list {
  max-height: 450px;
  overflow-y: auto;
}

.siembras-list .siembra-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.siembras-list .siembra-item:last-child {
  border-bottom: none;
}

.gap-1 {
  gap: 4px;
}

.h-100 {
  height: 100%;
}
</style>
