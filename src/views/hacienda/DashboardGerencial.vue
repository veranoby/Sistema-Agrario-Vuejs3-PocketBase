<template>
  <v-container fluid class="pa-2">
    <div class="d-flex flex-column gap-4 w-100">
      <header class="w-100 bg-background shadow-sm p-0 mb-4">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0 text-uppercase">
                <v-icon icon="mdi-chart-bar" color="primary" class="mr-2"></v-icon> Dashboard Gerencial
                <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
                  {{ t('roles.' + userRole) }}
                </v-chip>
                <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
                  {{ t('dashboard.hacienda') }}: {{ mi_hacienda?.name }}
                </v-chip>
              </h3>
            </div>

            <div class="w-full sm:w-auto z-10 d-flex gap-2">
              <v-btn
                color="green-darken-3"
                variant="flat"
                prepend-icon="mdi-refresh"
                class="font-weight-bold text-white elevation-2 rounded-lg"
                :loading="loading"
                @click="cargarDatos"
              >
                Actualizar
              </v-btn>
              <v-btn
                color="green-darken-3"
                variant="flat"
                prepend-icon="mdi-file-excel"
                class="font-weight-bold text-white rounded-lg elevation-2"
                @click="exportarDatos"
              >
                Exportar
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>

      <!-- KPI Summary Cards Minimal -->
      <v-row class="mb-6">
        <!-- Costo Total Card -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="elevation-1 rounded-lg border h-100 pa-2">
            <v-card-text class="d-flex align-center justify-space-between pa-2">
              <div>
                <span class="text-xs font-weight-bold text-grey-darken-1 d-block mb-1">COSTO OPERATIVO TOTAL</span>
                <span class="text-h6 font-weight-black text-primary-4">${{ formatNumber(totalCostos) }}</span>
              </div>
              <v-avatar color="teal-lighten-5" size="36">
                <v-icon icon="mdi-currency-usd" color="teal-darken-3" size="20"></v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Mano de Obra Card -->
        <v-col cols="12" sm="6" md="3">
          <v-card v-if="haciendaStore.isModuleActive('nomina_express')" class="elevation-1 rounded-lg border h-100 pa-2">
            <v-card-text class="d-flex align-center justify-space-between pa-2">
              <div>
                <span class="text-xs font-weight-bold text-grey-darken-1 d-block mb-1">MANO DE OBRA (NÓMINA)</span>
                <span class="text-h6 font-weight-black text-primary-4">${{ formatNumber(totalNomina) }}</span>
              </div>
              <v-avatar color="indigo-lighten-5" size="36">
                <v-icon icon="mdi-account-group" color="indigo-darken-3" size="20"></v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
          <v-card v-else class="elevation-1 rounded-lg border h-100 bg-grey-lighten-4 d-flex align-center justify-center pa-2">
            <v-card-text class="text-center py-2">
              <span class="text-xs d-block text-grey-darken-1"><v-icon size="small" class="mr-1">mdi-lock</v-icon>Activa Nómina Express</span>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Insumos Card -->
        <v-col cols="12" sm="6" md="3">
          <v-card v-if="haciendaStore.isModuleActive('kardex_bodega')" class="elevation-1 rounded-lg border h-100 pa-2">
            <v-card-text class="d-flex align-center justify-space-between pa-2">
              <div>
                <span class="text-xs font-weight-bold text-grey-darken-1 d-block mb-1">INSUMOS CONSUMIDOS</span>
                <span class="text-h6 font-weight-black text-primary-4">${{ formatNumber(totalBodega) }}</span>
              </div>
              <v-avatar color="amber-lighten-5" size="36">
                <v-icon icon="mdi-sprout-outline" color="amber-darken-4" size="20"></v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
          <v-card v-else class="elevation-1 rounded-lg border h-100 bg-grey-lighten-4 d-flex align-center justify-center pa-2">
            <v-card-text class="text-center py-2">
              <span class="text-xs d-block text-grey-darken-1"><v-icon size="small" class="mr-1">mdi-lock</v-icon>Activa Kardex Bodega</span>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Cosecha Card -->
        <v-col cols="12" sm="6" md="3">
          <v-card class="elevation-1 rounded-lg border h-100 pa-2">
            <v-card-text class="d-flex align-center justify-space-between pa-2">
              <div>
                <span class="text-xs font-weight-bold text-grey-darken-1 d-block mb-1">VOLUMEN COSECHA</span>
                <span class="text-h6 font-weight-black text-primary-4">{{ formatNumber(totalCosechaVolumen) }} un.</span>
              </div>
              <v-avatar color="teal-lighten-5" size="36">
                <v-icon icon="mdi-package-variant" color="teal-darken-3" size="20"></v-icon>
              </v-avatar>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts Section -->
      <v-row v-if="hasData">
        <!-- Distribution of Costs -->
        <v-col cols="12" md="6">
          <v-card class="elevation-3 rounded-lg pa-4 bg-white border border-grey-lighten-2 h-100">
            <v-card-title class="font-weight-black text-primary-3 px-2 mb-4 d-flex align-center">
              <v-icon icon="mdi-chart-pie" color="primary" class="mr-2"></v-icon>
              Distribución de Costos Operativos
            </v-card-title>
            <div class="chart-container py-4" v-if="!mobile">
              <Doughnut :data="chartDataCosto" :options="chartOptionsDoughnut" />
            </div>
            <v-list v-else density="compact" class="bg-transparent">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="#3f51b5" icon="mdi-circle"></v-icon>
                </template>
                <v-list-item-title>Mano de Obra</v-list-item-title>
                <template v-slot:append>
                  <span class="font-weight-bold">${{ formatNumber(totalNomina) }}</span>
                </template>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="#ff9800" icon="mdi-circle"></v-icon>
                </template>
                <v-list-item-title>Insumos</v-list-item-title>
                <template v-slot:append>
                  <span class="font-weight-bold">${{ formatNumber(totalBodega) }}</span>
                </template>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="#009688" icon="mdi-circle"></v-icon>
                </template>
                <v-list-item-title>Finanzas</v-list-item-title>
                <template v-slot:append>
                  <span class="font-weight-bold">${{ formatNumber(totalFinanzas) }}</span>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Budget vs Real -->
        <v-col cols="12" md="6">
          <v-card class="elevation-3 rounded-lg pa-4 bg-white border border-grey-lighten-2 h-100">
            <v-card-title class="font-weight-black text-primary-3 px-2 mb-4 d-flex align-center">
              <v-icon icon="mdi-chart-bar-stacked" color="primary" class="mr-2"></v-icon>
              Presupuesto Proyectado vs Costo Real
            </v-card-title>
            <div class="chart-container py-4">
              <Bar :data="chartDataPresupuesto" :options="chartOptionsBar" />
            </div>
          </v-card>
        </v-col>

        <!-- Weekly Harvest Projection -->
        <v-col cols="12">
          <v-card class="elevation-3 rounded-lg pa-4 bg-white border border-grey-lighten-2 mt-4">
            <v-card-title class="font-weight-black text-primary-3 px-2 mb-4 d-flex align-center">
              <v-icon icon="mdi-chart-timeline-variant-shimmer" color="primary" class="mr-2"></v-icon>
              Proyección y Tendencia de Cosecha Semanal
            </v-card-title>
            <div class="chart-container-large py-4">
              <Line :data="chartDataProyeccion" :options="chartOptionsLine" />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else class="justify-center py-12">
        <v-col cols="12" sm="8" md="6" class="text-center">
          <v-empty-state
            icon="mdi-chart-box-outline"
            title="Datos Insuficientes"
            text="Aún no hay suficientes registros de nóminas, movimientos de bodega o tarjas registradas para este mes en su hacienda. Comience registrando movimientos o nóminas para ver el análisis."
            class="rounded-lg border border-grey-lighten-3 elevation-1 bg-white py-12"
          >
            <template v-slot:actions>
              <v-btn color="primary" variant="flat" class="text-white font-weight-bold rounded-lg px-6" @click="cargarDatos">
                Reintentar Cargar
              </v-btn>
            </template>
          </v-empty-state>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useFinanzaStore } from '@/stores/finanzaStore'
import { useTarjasStore } from '@/stores/tarjasStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { useDisplay } from 'vuetify'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler
)

const analyticsStore = useAnalyticsStore()
const finanzasStore = useFinanzaStore()
const tarjasStore = useTarjasStore()
const haciendaStore = useHaciendaStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { mobile } = useDisplay()
const { userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const loading = ref(false)
const hasData = ref(false)

const totalCostos = ref(0)
const totalNomina = ref(0)
const totalBodega = ref(0)
const totalFinanzas = ref(0)
const totalCosechaVolumen = ref(0)

// Data tables & charts references
const costoDistribucion = ref([0, 0, 0])
const proyeccionSemanas = ref([])

const chartDataCosto = computed(() => ({
  labels: ['Mano de Obra (Nómina)', 'Insumos (Bodega)', 'Gastos Generales (Finanzas)'],
  datasets: [{
    data: costoDistribucion.value,
    backgroundColor: ['#3f51b5', '#ff9800', '#009688'],
    hoverOffset: 8
  }]
}))

const chartDataPresupuesto = computed(() => ({
  labels: ['Mano de Obra', 'Insumos', 'Gastos Generales'],
  datasets: [
    {
      label: 'Presupuesto Proyectado',
      backgroundColor: '#b2dfdb',
      data: [
        costoDistribucion.value[0] * 1.1 || 1000,
        costoDistribucion.value[1] * 1.15 || 800,
        costoDistribucion.value[2] * 1.05 || 500
      ]
    },
    {
      label: 'Costo Real',
      backgroundColor: '#009688',
      data: costoDistribucion.value
    }
  ]
}))

const chartDataProyeccion = computed(() => {
  const labels = proyeccionSemanas.value.map(w => w.semana)
  const cajas = proyeccionSemanas.value.map(w => w.cajas)
  const racimos = proyeccionSemanas.value.map(w => w.racimos)

  return {
    labels: labels.length ? labels : ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
    datasets: [
      {
        label: 'Cajas Cosechadas',
        borderColor: '#009688',
        backgroundColor: 'rgba(0, 150, 136, 0.1)',
        fill: true,
        tension: 0.3,
        data: cajas.length ? cajas : [120, 150, 180, 220]
      },
      {
        label: 'Racimos Cosechados',
        borderColor: '#3f51b5',
        backgroundColor: 'rgba(63, 81, 181, 0.1)',
        fill: true,
        tension: 0.3,
        data: racimos.length ? racimos : [80, 95, 110, 130]
      }
    ]
  }
})

const chartOptionsDoughnut = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: {
          family: 'Plus Jakarta Sans',
          weight: 'bold'
        }
      }
    }
  }
}

const chartOptionsBar = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        font: {
          family: 'Plus Jakarta Sans',
          weight: 'bold'
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const chartOptionsLine = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        font: {
          family: 'Plus Jakarta Sans',
          weight: 'bold'
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const formatNumber = (val) => {
  return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const cargarDatos = async () => {
  loading.value = true
  try {
    const resumen = await analyticsStore.fetchResumenCostosOperativos()
    await tarjasStore.cargarTarjas()

    totalCostos.value = resumen.totalCostos || 0
    totalNomina.value = resumen.totalNomina || 0
    totalBodega.value = resumen.totalBodega || 0
    totalFinanzas.value = resumen.totalFinanzas || 0

    costoDistribucion.value = [totalNomina.value, totalBodega.value, totalFinanzas.value]

    totalCosechaVolumen.value = tarjasStore.tarjas.reduce((sum, t) => sum + (t.cantidad || 0), 0)

    const proy = await analyticsStore.proyeccionDeCosechaSemanal()
    proyeccionSemanas.value = proy || []

    hasData.value = totalCostos.value > 0 || totalCosechaVolumen.value > 0
  } catch (error) {
    console.error('Error al cargar métricas de BI', error)
  } finally {
    loading.value = false
  }
}

const exportarDatos = async () => {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    const kpis = [
      { Metrica: 'Costo Operativo Total', Valor: totalCostos.value },
      { Metrica: 'Mano de Obra (Nómina)', Valor: totalNomina.value },
      { Metrica: 'Insumos Consumidos', Valor: totalBodega.value },
      { Metrica: 'Otros Gastos (Finanzas)', Valor: totalFinanzas.value },
      { Metrica: 'Cosecha Total (Volumen)', Valor: totalCosechaVolumen.value }
    ];
    const wsKpis = XLSX.utils.json_to_sheet(kpis);
    XLSX.utils.book_append_sheet(workbook, wsKpis, 'KPIs Resumen');

    if (finanzasStore.registros && finanzasStore.registros.length > 0) {
      const fnData = finanzasStore.registros.map(r => ({
        Fecha: r.fecha?.split('T')[0] || '',
        Tipo: r.tipo,
        Monto: r.monto,
        Categoria: r.categoria,
        Descripcion: r.descripcion
      }));
      const wsFin = XLSX.utils.json_to_sheet(fnData);
      XLSX.utils.book_append_sheet(workbook, wsFin, 'Finanzas Detalle');
    }

    XLSX.writeFile(workbook, `Reporte_Gerencial_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Error exportando datos', error);
  }
}

onMounted(() => {
  cargarDatos()
})
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
}
.chart-container-large {
  position: relative;
  height: 400px;
}
.hover-card {
  transition: transform 0.2s, box-shadow 0.2s;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
}
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
}
</style>
