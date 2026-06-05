<template>
  <v-container fluid class="pa-2">
    <div class="d-flex flex-column gap-4 w-100">
      <header class="w-100 bg-background shadow-sm p-0 mb-4">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0 text-uppercase">
                <v-icon icon="mdi-matrix" color="teal" class="mr-2"></v-icon> Rentabilidad por Siembras
                <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
                  {{ t('roles.' + userRole) }}
                </v-chip>
                <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
                  {{ t('dashboard.hacienda') }}: {{ mi_hacienda?.name }}
                </v-chip>
              </h3>
              <p class="text-caption text-grey-darken-3 mt-1">
                Análisis financiero detallado por lote/cultivo: cruce de costos de insumos, mano de obra y ganancias estimadas.
              </p>
            </div>

            <div class="w-full sm:w-auto z-10 d-flex gap-2">
              <v-btn
                color="green-darken-3"
                variant="flat"
                prepend-icon="mdi-refresh"
                class="font-weight-bold text-white elevation-2 rounded-lg"
                :loading="loading"
                @click="calcularRentabilidad"
              >
                Recalcular
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>

      <!-- Grid Analysis -->
      <v-alert
        v-if="!hasSaleRates"
        type="warning"
        variant="tonal"
        class="mt-4 mb-4"
        icon="mdi-alert"
      >
        Configure las tarifas de venta en Ajustes de Hacienda para ver estimaciones de ingresos reales.
      </v-alert>

      <v-card class="elevation-3 rounded-lg border border-grey-lighten-2 mt-4">
        <v-card-title class="pt-6 px-6 pb-2">
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Buscar siembra..."
                variant="outlined"
                density="compact"
                hide-details
                color="teal"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card-title>

        <v-card-text class="px-6 pb-6">
          <v-data-table
            :headers="headers"
            :items="rentabilidades"
            :search="search"
            :loading="loading"
            loading-text="Calculando rentabilidades de lotes..."
            no-data-text="No hay siembras registradas o datos financieros disponibles"
            class="elevation-0 mt-4 rounded-lg"
          >
            <!-- Siembra Column -->
            <template #[`item.nombre`]="{ item }">
              <div class="font-weight-bold text-teal-darken-4">{{ item.nombre }}</div>
              <div class="text-caption text-grey-darken-1 text-capitalize">{{ item.tipo }}</div>
            </template>

            <!-- Area Column -->
            <template #[`item.area`]="{ item }">
              <span>{{ item.area }} ha</span>
            </template>

            <!-- Costs Columns -->
            <template #[`item.insumosCosto`]="{ item }">
              <span>${{ formatNumber(item.insumosCosto) }}</span>
            </template>

            <template #[`item.manoObraCosto`]="{ item }">
              <span>${{ formatNumber(item.manoObraCosto) }}</span>
            </template>

            <template #[`item.costoTotal`]="{ item }">
              <span class="font-weight-bold text-red-darken-3">${{ formatNumber(item.costoTotal) }}</span>
            </template>

            <template #[`item.costoPorHectarea`]="{ item }">
              <span class="text-grey-darken-2">${{ formatNumber(item.costoPorHectarea) }}/ha</span>
            </template>

            <!-- Earnings Column -->
            <template #[`item.ingresosEstimados`]="{ item }">
              <span class="font-weight-bold text-green-darken-3">${{ formatNumber(item.ingresosEstimados) }}</span>
            </template>

            <!-- Margin Net Column -->
            <template #[`item.margenNeto`]="{ item }">
              <span :class="['font-weight-black', item.margenNeto >= 0 ? 'text-green-darken-4' : 'text-red-darken-4']">
                ${{ formatNumber(item.margenNeto) }}
              </span>
            </template>

            <!-- ROI Column -->
            <template #[`item.roi`]="{ item }">
              <v-chip
                size="small"
                :color="item.roi >= 20 ? 'green-darken-1' : item.roi >= 0 ? 'amber-darken-2' : 'red-darken-2'"
                class="font-weight-bold text-white"
              >
                {{ item.roi.toFixed(1) }}%
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useTarjasStore } from '@/stores/tarjasStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'

const siembrasStore = useSiembrasStore()
const analyticsStore = useAnalyticsStore()
const tarjasStore = useTarjasStore()
const haciendaStore = useHaciendaStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const search = ref('')
const loading = ref(false)
const rentabilidades = ref([])

const headers = [
  { title: 'Siembra / Lote', key: 'nombre', sortable: true },
  { title: 'Área', key: 'area', sortable: true },
  { title: 'Costo Insumos', key: 'insumosCosto', sortable: true },
  { title: 'Costo Mano Obra', key: 'manoObraCosto', sortable: true },
  { title: 'Costo Total', key: 'costoTotal', sortable: true },
  { title: 'Costo/Hectárea', key: 'costoPorHectarea', sortable: true },
  { title: 'Ingreso Est.', key: 'ingresosEstimados', sortable: true },
  { title: 'Margen Neto', key: 'margenNeto', sortable: true },
  { title: 'ROI', key: 'roi', sortable: true }
]

const saleRates = computed(() => {
  return haciendaStore.mi_hacienda?.config_tarifas_venta || {}
})

const hasSaleRates = computed(() => {
  return Object.keys(saleRates.value).length > 0
})

const formatNumber = (val) => {
  return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const calcularRentabilidad = async () => {
  loading.value = true
  try {
    await siembrasStore.cargarSiembras()
    await tarjasStore.cargarTarjas()

    const tempRentabilidades = []

    for (const siembra of siembrasStore.siembras) {
      // Calculate costs per siembra using analyticsStore
      const costos = await analyticsStore.calcularCostoPorHectarea(siembra.id)

      // Calculate estimated earnings from tarjas
      const siembraTarjas = tarjasStore.tarjas.filter(t => t.siembra === siembra.id)
      let ingresosEstimados = 0
      siembraTarjas.forEach(t => {
        const rate = saleRates.value[t.tipo_unidad] || 0
        ingresosEstimados += ((t.cantidad || 0) - (t.cantidad_merma || 0)) * rate
      })

      const costoTotal = costos.costoTotal || 0
      const margenNeto = ingresosEstimados - costoTotal
      const roi = costoTotal > 0 ? (margenNeto / costoTotal) * 100 : 0

      tempRentabilidades.push({
        id: siembra.id,
        nombre: siembra.nombre,
        tipo: siembra.tipo || 'General',
        area: costos.area,
        insumosCosto: costos.insumosCosto,
        manoObraCosto: costos.manoObraCosto,
        costoTotal,
        costoPorHectarea: costos.costoPorHectarea,
        ingresosEstimados,
        margenNeto,
        roi
      })
    }

    rentabilidades.value = tempRentabilidades
  } catch (error) {
    console.error('Error al calcular rentabilidades', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  calcularRentabilidad()
})
</script>

<style scoped>
.text-green-darken-4 {
  color: #1b5e20 !important;
}
.text-red-darken-4 {
  color: #b71c1c !important;
}
</style>
