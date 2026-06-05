<template>
  <v-container fluid class="metricas-dashboard pa-0 pb-8">
    <!-- Header Estilo Plataforma -->
          <header role="banner" class="bg-background shadow-sm">
        <div class="profile-container">
          <h3 class="profile-title" id="dashboard-welcome-title">
            HUB DE INTELIGENCIA Y METRICAS
            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
              {{ t('roles.' + userRole) }}
            </v-chip>

            <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
              {{ t('dashboard.hacienda') }}: {{ mi_hacienda.name }}
            </v-chip>
              <p class="text-caption text-grey-darken-3 mt-1">
            <v-icon size="14" class="mr-1">mdi-information</v-icon>
            Fuente: Bitácoras - gráficos se basan en métricas estándar (cantidad_cosechada, volumen_agua_utilizada, dosis_aplicada, etc).
          </p>
          </h3>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>


    <!-- Filters -->
    <v-row class="px-4 mb-4">
      <v-col cols="12">
        <v-card flat rounded="lg" class="pa-4 siembras-info elevation-0 border mb-2">
          <div class="text-subtitle-1 mb-3 font-weight-bold text-blue-grey-darken-3">
            <v-icon color="primary" class="mr-2">mdi-filter-variant</v-icon>Filtros Globales
          </div>
          <v-row>
            <v-col cols="12" md="4">
              <v-autocomplete
                v-model="filtroSiembraId"
                :items="siembras"
                item-title="nombre"
                item-value="id"
                label="Siembra / Proyecto"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :subtitle="item.raw.tipo"></v-list-item>
                </template>
              </v-autocomplete>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filtroFechaDesde"
                type="date"
                label="Fecha Desde"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filtroFechaHasta"
                type="date"
                label="Fecha Hasta"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>

    <!-- KPIs Superiores -->
    <v-row class="px-4 mb-6">
      <v-col cols="12" sm="4" md="2">
        <v-tooltip text="Suma normalizada de 'cantidad_cosechada' (en kg) basada en bitácoras." location="top">
          <template v-slot:activator="{ props }">
            <v-card v-bind="props" flat rounded="lg" class="pa-4 text-center kpi-card">
              <div class=" font-weight-bold text-uppercase">Rendimiento Total</div>
              <div class="text-h5 font-weight-black text-success mt-2 fluid-kpi-value">{{ totalCosecha.toFixed(1) }} kg</div>
              <div class="text-caption text-grey mt-1">Eficiencia: {{ rendimientoPlanta.toFixed(2) }} kg/planta</div>
            </v-card>
          </template>
        </v-tooltip>
      </v-col>
      <v-col cols="12" sm="4" md="2">
        <v-tooltip text="Suma de 'volumen_agua_utilizada' (en m³) normalizado de bitácoras." location="top">
          <template v-slot:activator="{ props }">
            <v-card v-bind="props" flat rounded="lg" class="pa-4 text-center kpi-card">
              <div class=" font-weight-bold text-uppercase">Consumo Hídrico</div>
              <div class="text-h5 font-weight-black text-info mt-2 fluid-kpi-value">{{ totalAgua.toFixed(1) }} m³</div>
              <div class="text-caption text-grey mt-1">Métrica: volumen_agua_utilizada</div>
            </v-card>
          </template>
        </v-tooltip>
      </v-col>
      <v-col cols="12" sm="4" md="2">
        <v-tooltip text="Kilogramos producidos por cada metro cúbico de agua consumida. Fórmula: Rendimiento / Agua." location="top">
          <template v-slot:activator="{ props }">
            <v-card v-bind="props" flat rounded="lg" class="pa-4 text-center kpi-card">
              <div class=" font-weight-bold text-uppercase">Efic. Hídrica</div>
              <div class="text-h5 font-weight-black text-blue-darken-3 mt-2 fluid-kpi-value">{{ eficienciaHidrica }}</div>
              <div class="text-caption text-grey mt-1">kg / m³</div>
            </v-card>
          </template>
        </v-tooltip>
      </v-col>
      <v-col cols="12" sm="4" md="2">
        <v-tooltip text="Suma normalizada de 'dosis_aplicada' y 'cantidad_total_utilizada'." location="top">
          <template v-slot:activator="{ props }">
            <v-card v-bind="props" flat rounded="lg" class="pa-4 text-center kpi-card">
              <div class=" font-weight-bold text-uppercase">Insumos Total</div>
              <div class="text-h5 font-weight-black text-warning mt-2 fluid-kpi-value">{{ totalInsumos.toFixed(1) }} L/kg</div>
              <div class="text-caption text-grey mt-1">Métrica: dosis_aplicada</div>
            </v-card>
          </template>
        </v-tooltip>
      </v-col>
      <v-col cols="12" sm="4" md="2">
        <v-tooltip text="Insumos químicos aplicados por planta. Fórmula: Insumos / Total de Plantas estimadas." location="top">
          <template v-slot:activator="{ props }">
            <v-card v-bind="props" flat rounded="lg" class="pa-4 text-center kpi-card">
              <div class=" font-weight-bold text-uppercase">Carga Química</div>
              <div class="text-h5 font-weight-black text-deep-orange-darken-2 mt-2 fluid-kpi-value">{{ cargaQuimica }}</div>
              <div class="text-caption text-grey mt-1">L/kg por planta</div>
            </v-card>
          </template>
        </v-tooltip>
      </v-col>
      <v-col cols="12" sm="4" md="2">
        <v-tooltip text="Promedio del 'nivel_afectacion' (Bajo=1, Moderado=2, Alto=3)." location="top">
          <template v-slot:activator="{ props }">
            <v-card v-bind="props" flat rounded="lg" class="pa-4 text-center kpi-card">
              <div class=" font-weight-bold text-uppercase">Indice Salud</div>
              <div class="text-h5 font-weight-black text-error mt-2 fluid-kpi-value">{{ indiceSaludAvg.toFixed(1) }} / 3.0</div>
              <div class="text-caption text-grey mt-1">Métrica: nivel_afectacion</div>
            </v-card>
          </template>
        </v-tooltip>
      </v-col>
    </v-row>

    <!-- Charts (1 por fila para lectura profunda) -->
    <v-row class="px-4">
      <v-col cols="12" md="6">
        <v-card flat rounded="lg" class="pa-4 elevation-1 h-100">
          <v-card-title class="font-weight-bold text-blue-grey-darken-3 d-flex align-center">
            <v-icon color="indigo" class="mr-2">mdi-spider-web</v-icon>
            Balance Agronómico (Radar)
            <v-tooltip text="Normalización base 100 heurística de: 1. Sanidad (Índice Inverso), 2. Producción (kg), 3. Riego (m³) y 4. Insumos (L o kg)." location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="small" color="grey" class="ml-2">mdi-information-outline</v-icon>
              </template>
            </v-tooltip>
          </v-card-title>
          <div class="chart-container-large">
            <Radar v-if="chartDataRadar" :data="chartDataRadar" :options="chartOptionsRadar" />
            <div v-else class="empty-state">Datos insuficientes para el balance</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card flat rounded="lg" class="pa-4 elevation-1 h-100">
          <v-card-title class="font-weight-bold text-blue-grey-darken-3 d-flex align-center">
            <v-icon color="orange" class="mr-2">mdi-scatter-plot</v-icon>
            Agua vs Producción Mensual
            <v-tooltip text="Impacto hídrico: Eje X = Agua Consumida, Eje Y = Cantidad Cosechada." location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="small" color="grey" class="ml-2">mdi-information-outline</v-icon>
              </template>
            </v-tooltip>
          </v-card-title>
          <div class="chart-container-large">
            <Scatter v-if="chartDataScatter" :data="chartDataScatter" :options="chartOptionsScatter" />
            <div v-else class="empty-state">Faltan registros coincidentes de Riego y Cosecha</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card flat rounded="lg" class="pa-4 elevation-1">
          <v-card-title class="font-weight-bold text-blue-grey-darken-3 d-flex align-center">
            <v-icon color="success" class="mr-2">mdi-chart-bar</v-icon>
            Evolución de Producción (Cosecha)
            <v-tooltip text="Métrica: 'cantidad_cosechada'. Se agrupa y suma el total diario de kilogramos normalizados registrados." location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="small" color="grey" class="ml-2">mdi-information-outline</v-icon>
              </template>
            </v-tooltip>
          </v-card-title>
          <div class="chart-container-large">
            <Bar v-if="chartDataProduccion" :data="chartDataProduccion" :options="chartOptionsBase" />
            <div v-else class="empty-state">No hay datos suficientes para graficar producción</div>
          </div>
        </v-card>
      </v-col>
      
      <v-col cols="12">
        <v-card flat rounded="lg" class="pa-4 elevation-1">
          <v-card-title class="font-weight-bold text-blue-grey-darken-3 d-flex align-center">
            <v-icon color="warning" class="mr-2">mdi-chart-donut</v-icon>
            Calidad de Cosecha (% Producto)
            <v-tooltip text="Distribución de 'clasificacion_producto', ponderada por el peso total ('cantidad_cosechada') de cada entrada." location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="small" color="grey" class="ml-2">mdi-information-outline</v-icon>
              </template>
            </v-tooltip>
          </v-card-title>
          <div class="chart-container-large">
            <Doughnut v-if="chartDataCalidad" :data="chartDataCalidad" :options="chartOptionsDoughnut" />
            <div v-else class="empty-state">No hay datos suficientes para graficar calidad</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card flat rounded="lg" class="pa-4 elevation-1">
          <v-card-title class="font-weight-bold text-blue-grey-darken-3 d-flex align-center">
            <v-icon color="info" class="mr-2">mdi-water</v-icon>
            Tendencia de Consumo Hídrico
            <v-tooltip text="Métrica: 'volumen_agua_utilizada'. Sumatoria diaria calculada y estandarizada en metros cúbicos (m³)." location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="small" color="grey" class="ml-2">mdi-information-outline</v-icon>
              </template>
            </v-tooltip>
          </v-card-title>
          <div class="chart-container-large">
            <Line v-if="chartDataAgua" :data="chartDataAgua" :options="chartOptionsLine" />
            <div v-else class="empty-state">No hay datos suficientes para graficar consumo hídrico</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card flat rounded="lg" class="pa-4 elevation-1">
          <v-card-title class="font-weight-bold text-blue-grey-darken-3 d-flex align-center">
            <v-icon color="error" class="mr-2">mdi-bug</v-icon>
            Picos de Alerta Sanitaria
            <v-tooltip text="Métrica: 'nivel_afectacion'. Plotea el valor en el tiempo donde: Bajo=1, Moderado=2, Alto=3." location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" size="small" color="grey" class="ml-2">mdi-information-outline</v-icon>
              </template>
            </v-tooltip>
          </v-card-title>
          <div class="chart-container-large">
            <Line v-if="chartDataSalud" :data="chartDataSalud" :options="chartOptionsAlerts" />
            <div v-else class="empty-state">No hay datos suficientes para graficar alertas</div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useMetrics } from '@/composables/useMetrics'
import { format } from 'date-fns'

import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()

const { userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

// ChartJS Imports
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
  ArcElement, PointElement, LineElement, RadialLinearScale, Filler
} from 'chart.js'
import { Bar, Doughnut, Line, Radar, Scatter } from 'vue-chartjs'

ChartJS.register(
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale,
  ArcElement, PointElement, LineElement, RadialLinearScale, Filler
)

// Stores
const siembrasStore = useSiembrasStore()
const { getTotalSum, getDistribution, getTimeSeries, getIndiceSaludTimeSeries, getRendimientoPorPlanta } = useMetrics()

// Filters
const filtroSiembraId = ref(null)
const filtroFechaDesde = ref(null)
const filtroFechaHasta = ref(null)

const dateRange = computed(() => ({
  start: filtroFechaDesde.value,
  end: filtroFechaHasta.value
}))

const activeSiembras = computed(() => {
  return filtroSiembraId.value ? [filtroSiembraId.value] : []
})

// Data
const siembras = computed(() => siembrasStore.siembras)

// KPIs
const totalCosecha = computed(() => getTotalSum('cantidad_cosechada', activeSiembras.value, null, dateRange.value))
const totalAgua = computed(() => getTotalSum('volumen_agua_utilizada', activeSiembras.value, null, dateRange.value))
const totalInsumos = computed(() => getTotalSum('dosis_aplicada', activeSiembras.value, null, dateRange.value))
const rendimientoPlanta = computed(() => getRendimientoPorPlanta(filtroSiembraId.value))

const indiceSaludAvg = computed(() => {
  const series = getIndiceSaludTimeSeries(activeSiembras.value, dateRange.value)
  if (series.length === 0) return 0
  const sum = series.reduce((acc, curr) => acc + curr.y, 0)
  return sum / series.length
})

const eficienciaHidrica = computed(() => {
  if (totalAgua.value <= 0) return 'N/A'
  return (totalCosecha.value / totalAgua.value).toFixed(2)
})

const cargaQuimica = computed(() => {
  if (rendimientoPlanta.value === 0 && totalCosecha.value === 0) return 'N/A'
  const totalPlantas = totalCosecha.value > 0 ? (totalCosecha.value / rendimientoPlanta.value) : 0
  if (totalPlantas <= 0) return 'N/A'
  return (totalInsumos.value / totalPlantas).toFixed(3)
})

// Charts Data
const chartDataRadar = computed(() => {
  // Normalización heurística 0-100 para balance visual
  const saludScore = Math.max(0, 100 - ((indiceSaludAvg.value - 1) * 50)) // 1 = 100%, 3 = 0%
  const prodScore = totalCosecha.value > 0 ? Math.min(100, (totalCosecha.value / 1000) * 100) : 0 
  const aguaScore = totalAgua.value > 0 ? Math.min(100, (totalAgua.value / 500) * 100) : 0
  const quimScore = totalInsumos.value > 0 ? Math.min(100, (totalInsumos.value / 50) * 100) : 0
  
  if (saludScore === 100 && prodScore === 0 && aguaScore === 0 && quimScore === 0) return null

  return {
    labels: ['Salud (Inverso)', 'Producción Rel.', 'Consumo Hídrico Rel.', 'Carga Química Rel.'],
    datasets: [{
      label: 'Balance del Proyecto (0-100)',
      data: [saludScore, prodScore, aguaScore, quimScore],
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      borderColor: '#4CAF50',
      pointBackgroundColor: '#4CAF50'
    }]
  }
})

const chartDataScatter = computed(() => {
  const seriesAgua = getTimeSeries('volumen_agua_utilizada', activeSiembras.value, null, dateRange.value)
  const seriesCosecha = getTimeSeries('cantidad_cosechada', activeSiembras.value, null, dateRange.value)

  const monthlyAgua = {}
  seriesAgua.forEach(s => {
    const month = format(new Date(s.x), 'yyyy-MM')
    monthlyAgua[month] = (monthlyAgua[month] || 0) + s.y
  })

  const monthlyCosecha = {}
  seriesCosecha.forEach(s => {
    const month = format(new Date(s.x), 'yyyy-MM')
    monthlyCosecha[month] = (monthlyCosecha[month] || 0) + s.y
  })

  const allMonths = new Set([...Object.keys(monthlyAgua), ...Object.keys(monthlyCosecha)])
  
  const scatterData = Array.from(allMonths).map(month => ({
    x: monthlyAgua[month] || 0,
    y: monthlyCosecha[month] || 0,
    monthLabel: month
  })).filter(d => d.x > 0 || d.y > 0)

  if (scatterData.length === 0) return null

  return {
    datasets: [{
      label: 'Meses: Agua (m³) vs Prod (kg)',
      backgroundColor: '#FF9800',
      data: scatterData
    }]
  }
})
const chartDataProduccion = computed(() => {
  const series = getTimeSeries('cantidad_cosechada', activeSiembras.value, null, dateRange.value)
  if (series.length === 0) return null

  // Agrupar por fecha
  const grouped = {}
  series.forEach(item => {
    const dateStr = format(new Date(item.x), 'dd MMM yyyy')
    grouped[dateStr] = (grouped[dateStr] || 0) + item.y
  })

  return {
    labels: Object.keys(grouped),
    datasets: [{
      label: 'Cantidad Cosechada (kg)',
      backgroundColor: '#4CAF50',
      data: Object.values(grouped),
      borderRadius: 4
    }]
  }
})

const chartDataCalidad = computed(() => {
  const dist = getDistribution('clasificacion_producto', 'cantidad_cosechada', activeSiembras.value, null, dateRange.value)
  const keys = Object.keys(dist)
  if (keys.length === 0) return null

  return {
    labels: keys,
    datasets: [{
      backgroundColor: ['#FFC107', '#2196F3', '#FF5722', '#9C27B0'],
      data: Object.values(dist)
    }]
  }
})

const chartDataAgua = computed(() => {
  const series = getTimeSeries('volumen_agua_utilizada', activeSiembras.value, null, dateRange.value)
  if (series.length === 0) return null

  // Agrupar por fecha
  const grouped = {}
  series.forEach(item => {
    const dateStr = format(new Date(item.x), 'dd MMM')
    grouped[dateStr] = (grouped[dateStr] || 0) + item.y
  })

  return {
    labels: Object.keys(grouped),
    datasets: [{
      label: 'Consumo Hídrico (m³)',
      borderColor: '#03A9F4',
      backgroundColor: 'rgba(3, 169, 244, 0.1)',
      data: Object.values(grouped),
      fill: true,
      tension: 0.3
    }]
  }
})

const chartDataSalud = computed(() => {
  const series = getIndiceSaludTimeSeries(activeSiembras.value, dateRange.value)
  if (series.length === 0) return null

  return {
    labels: series.map(s => format(new Date(s.x), 'dd MMM')),
    datasets: [{
      label: 'Nivel Afectación (1=Bajo, 3=Alto)',
      borderColor: '#F44336',
      backgroundColor: 'transparent',
      data: series.map(s => s.y),
      tension: 0,
      pointBackgroundColor: '#F44336',
      pointRadius: 5
    }]
  }
})

// Chart Options
const chartOptionsBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  }
}

const chartOptionsDoughnut = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' }
  }
}

const chartOptionsLine = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: { beginAtZero: true }
  }
}

const chartOptionsAlerts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: { 
      min: 0, 
      max: 4, 
      ticks: {
        callback: function(value) {
          if (value === 1) return 'Bajo (1)'
          if (value === 2) return 'Moderado (2)'
          if (value === 3) return 'Alto (3)'
          return ''
        }
      }
    }
  }
}

const chartOptionsRadar = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      angleLines: { display: true },
      suggestedMin: 0,
      suggestedMax: 100
    }
  }
}

const chartOptionsScatter = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: function(context) {
          return `Mes: ${context.raw.monthLabel} | Agua: ${context.parsed.x} m³ | Prod: ${context.parsed.y} kg`;
        }
      }
    }
  },
  scales: {
    x: {
      type: 'linear',
      position: 'bottom',
      title: { display: true, text: 'Consumo Hídrico (m³)' }
    },
    y: {
      title: { display: true, text: 'Producción (kg)' }
    }
  }
}

onMounted(async () => {
  if (siembrasStore.siembras.length === 0) {
    await siembrasStore.cargarSiembras()
  }
})
</script>

<style scoped>
.metricas-dashboard {
  min-height: 100vh;
  background-color: rgb(var(--v-theme-background));
}
.profile-container {
  position: relative;
}
.profile-title {
  margin: 0;
}
.siembras-info {
  background-color: #f1f8e9 !important; /* light green similar to siembras workspace */
  border-color: #c5e1a5 !important;
}
.kpi-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(0,0,0,0.05);
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
}
.chart-container-large {
  height: 400px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state {
  color: #9e9e9e;
  font-style: italic;
  font-size: 0.9rem;
}
.fluid-kpi-value {
  font-size: clamp(1.2rem, 4vw, 1.5rem) !important;
  line-height: 1.2;
  word-break: break-word;
}
</style>
