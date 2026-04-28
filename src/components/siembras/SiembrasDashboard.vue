<template>
  <v-container fluid class="pa-2 siembras-dashboard">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                Dashboard de Siembras
                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ userRole }}
                </v-chip>
                <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ mi_hacienda?.name }}
                </v-chip>

                <!-- Estadísticas como v-chips -->
                <v-chip variant="flat" size="x-small" color="success" class="mx-1" pill>
                  <v-icon start size="x-small">mdi-sprout</v-icon>
                  Activas: {{ metrics.activeSiembras }}
                </v-chip>
                <v-chip variant="flat" size="x-small" color="blue" class="mx-1" pill>
                  <v-icon start size="x-small">mdi-ruler</v-icon>
                  Área: {{ formatArea(metrics.totalArea) }}
                </v-chip>
                <v-chip variant="flat" size="x-small" color="orange" class="mx-1" pill>
                  <v-icon start size="x-small">mdi-calendar-clock</v-icon>
                  Cosechas: {{ metrics.upcomingHarvests }}
                </v-chip>
                <v-chip
                  v-if="metrics.alerts > 0"
                  variant="flat"
                  size="x-small"
                  color="error"
                  class="mx-1"
                  pill
                >
                  <v-icon start size="x-small">mdi-alert-circle</v-icon>
                  Alertas: {{ metrics.alerts }}
                </v-chip>
              </h3>
            </div>
            <div class="w-full sm:w-auto z-10">
              <v-btn
                block
                sm:inline-flex
                size="small"
                variant="flat"
                rounded="lg"
                color="#6380a247"
                prepend-icon="mdi-plus"
                @click="abrirDialogCreacion"
                class="min-w-[210px]"
              >
                Nueva Siembra
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <main class="flex-1 py-2">
      <v-container>
        <!-- Grid de Siembras con Cards Enriquecidas -->
        <v-row class="mb-6">
          <v-alert v-if="siembras.length === 0" type="info" class="mx-4">
            No hay siembras registradas
          </v-alert>

          <v-col v-for="siembra in siembras" :key="siembra.id" cols="12" sm="6" md="4" lg="3">
            <v-card
              elevation="2"
              class="siembra-card Actividad-card"
              :class="getSiembraCardClass(siembra)"
              @click="abrirSiembra(siembra.id)"
              hover
            >
              <!-- Header con color según estado -->
              <div class="card-header" :style="getCardHeaderStyle(siembra)">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon
                      :color="getSiembraStateColor(siembra.estado)"
                      size="large"
                      class="mr-2"
                    >
                      {{ getSiembraStateIcon(siembra.estado) }}
                    </v-icon>
                    <div>
                      <div class="font-weight-bold text-body-1">{{ siembra.nombre }}</div>
                      <div class="text-caption text-medium-emphasis">{{ siembra.tipo }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <v-divider></v-divider>

              <v-card-text>
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-caption text-medium-emphasis">Estado:</span>
                  <v-chip
                    :color="getStatusColor(siembra.estado)"
                    size="small"
                    variant="elevated"
                  >
                    <v-icon start size="small">mdi-leaf</v-icon>
                    {{ siembra.estado }}
                  </v-chip>
                </div>

                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-caption text-medium-emphasis">Inicio:</span>
                  <span class="text-body-2">{{ formatDate(siembra.fecha_inicio || siembra.created) }}</span>
                </div>

                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption text-medium-emphasis">Zonas:</span>
                  <v-chip
                    v-if="getZoneCount(siembra) > 0"
                    color="info"
                    size="small"
                    variant="outlined"
                  >
                    <v-icon start size="small">mdi-map-marker</v-icon>
                    {{ getZoneCount(siembra) }}
                  </v-chip>
                  <span v-else class="text-caption text-disabled">Sin zonas</span>
                </div>
              </v-card-text>

              <v-divider></v-divider>

              <v-card-actions>
                <v-btn
                  variant="text"
                  color="success"
                  block
                  @click.stop="abrirSiembra(siembra.id)"
                >
                  <v-icon start>mdi-open-in-app</v-icon>
                  Abrir Siembra
                </v-btn>
              </v-card-actions>
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
                <div class="map-container" style="height: 400px;">
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

          <!-- Ciclos de cultivo -->
          <v-col cols="12" lg="4">
            <v-card variant="elevated" elevation="2" class="h-100">
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
      </v-container>
    </main>

    <!-- Dialog de creación -->
    <SiembraCreateDialog v-model="dialogNuevaSiembra" @created="onSiembraCreada" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import GisMapComponent from '@/components/GisMapComponent.vue'
import CycleChart from './CycleChart.vue'
import SiembraCreateDialog from './SiembraCreateDialog.vue'

const router = useRouter()
const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const siembras = ref([])
const zonas = ref([])
const dialogNuevaSiembra = ref(false)

const userRole = computed(() => profileStore.user?.role || '')
const avatarUrl = computed(() => profileStore.avatarUrl)

// Cargar datos
onMounted(async () => {
  try {
    await Promise.all([
      siembrasStore.init(),
      zonasStore.cargarZonas()
    ])
    siembras.value = siembrasStore.siembras || []
    zonas.value = zonasStore.zonas || []
  } catch (error) {
    console.error('Error cargando datos:', error)
  }
})

// Métricas robustas basadas en datos reales
const metrics = computed(() => {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Estados activos: planificada y en_crecimiento
  const activeStatuses = ['planificada', 'en_crecimiento']
  const activeSiembras = siembras.value.filter(s => activeStatuses.includes(s.estado))

  // Área total: usar area_total si existe, sino 0
  const totalArea = activeSiembras.reduce((sum, s) => sum + (parseFloat(s.area_total) || 0), 0)

  // Cosechas próximas: estado 'cosechada' o fecha próxima
  const upcomingHarvests = siembras.value.filter(s => {
    if (s.estado === 'cosechada') return true
    if (s.fecha_cosecha_estimada) {
      const cosechaDate = new Date(s.fecha_cosecha_estimada)
      return cosechaDate >= now && cosechaDate <= thirtyDaysFromNow
    }
    return false
  })

  // Alertas: derivar de cosechas próximas (menos de 7 días) o siembras sin zonas
  const alerts = siembras.value.filter(s => {
    // Cosecha en menos de 7 días
    if (s.estado === 'cosechada' && s.fecha_cosecha_estimada) {
      const cosechaDate = new Date(s.fecha_cosecha_estimada)
      const daysUntilHarvest = Math.ceil((cosechaDate - now) / (1000 * 60 * 60 * 24))
      if (daysUntilHarvest <= 7 && daysUntilHarvest >= 0) return true
    }
    // Siembra activa sin zonas asignadas
    if (activeStatuses.includes(s.estado)) {
      const tieneZonas = zonas.value.some(z =>
        Array.isArray(z.siembra) ? z.siembra.includes(s.id) : z.siembra === s.id
      )
      if (!tieneZonas) return true
    }
    return false
  })

  return {
    activeSiembras: activeSiembras.length,
    totalArea,
    upcomingHarvests: upcomingHarvests.length,
    alerts: alerts.length
  }
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

const abrirDialogCreacion = () => {
  dialogNuevaSiembra.value = true
}

const onSiembraCreada = () => {
  // Recargar siembras
  siembras.value = siembrasStore.siembras || []
}

const abrirSiembra = (id) => {
  router.push(`/siembras/${id}`)
}

const getZoneCount = (siembra) => {
  return zonas.value.filter(z => {
    if (Array.isArray(z.siembra)) {
      return z.siembra.includes(siembra.id)
    }
    return z.siembra === siembra.id
  }).length
}

const getSiembraCardClass = (siembra) => {
  return `estado-${siembra.estado.replace('_', '-')}`
}

const getSiembraStateColor = (estado) => {
  const colors = {
    'planificada': 'info',
    'en_crecimiento': 'success',
    'cosechada': 'warning',
    'finalizada': 'error'
  }
  return colors[estado] || 'primary'
}

const getSiembraStateIcon = (estado) => {
  const icons = {
    'planificada': 'mdi-calendar-clock',
    'en_crecimiento': 'mdi-sprout',
    'cosechada': 'mdi-harvest',
    'finalizada': 'mdi-check-circle'
  }
  return icons[estado] || 'mdi-leaf'
}

const getStatusColor = (status) => {
  const colors = {
    planificada: 'blue',
    en_crecimiento: 'green',
    cosechada: 'orange',
    finalizada: 'grey'
  }
  return colors[status] || 'grey'
}

const getCardHeaderStyle = (siembra) => {
  const backgrounds = {
    'planificada': 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)',
    'en_crecimiento': 'linear-gradient(135deg, rgba(46, 125, 50, 0.1) 0%, rgba(46, 125, 50, 0.05) 100%)',
    'cosechada': 'linear-gradient(135deg, rgba(245, 124, 0, 0.1) 0%, rgba(245, 124, 0, 0.05) 100%)',
    'finalizada': 'linear-gradient(135deg, rgba(158, 158, 158, 0.1) 0%, rgba(158, 158, 158, 0.05) 100%)'
  }
  return {
    background: backgrounds[siembra.estado] || backgrounds['en_crecimiento'],
    padding: '16px',
    borderBottom: '1px solid rgba(0,0,0,0.1)'
  }
}

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
</script>

<style scoped>
.siembras-dashboard {
  background-color: var(--v-theme-background);
}

.map-container {
  border-radius: 8px;
  overflow: hidden;
}

.siembra-card {
  transition: all 0.3s ease;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.siembra-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
}

.siembra-card.estado-planificada {
  border-left: 4px solid #1976d2;
}

.siembra-card.estado-en-crecimiento {
  border-left: 4px solid #2e7d32;
}

.siembra-card.estado-cosechada {
  border-left: 4px solid #f57c00;
}

.siembra-card.estado-finalizada {
  border-left: 4px solid #9e9e9e;
}

.Actividad-card {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.h-100 {
  height: 100%;
}
</style>
