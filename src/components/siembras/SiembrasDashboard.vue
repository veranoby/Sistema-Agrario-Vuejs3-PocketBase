<template>
  <v-container fluid class="pa-2 siembras-dashboard">
    <div class="grid gap-2 p-0 m-2">
      <UniversalHeader 
        title="Dashboard de Siembras"
        :bgImage="avatarHaciendaUrl"
      >
        <template #chips>
          <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start>
              <v-img :src="avatarUrl" alt="Avatar"></v-img>
            </v-avatar>
            {{ userRole }}
          </v-chip>
          <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start>
              <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
            </v-avatar>
            {{ mi_hacienda?.name }}
          </v-chip>

          <!-- Estadísticas como v-chips -->
          <v-chip variant="flat" size="small" color="primary" class="mx-1" pill>
            <v-icon start size="small">mdi-sprout</v-icon>
            Activas: {{ metrics.activeSiembras }}
          </v-chip>
          <v-chip variant="flat" size="small" color="blue" class="mx-1" pill>
            <v-icon start size="small">mdi-ruler</v-icon>
            Área: {{ formatArea(metrics.totalArea) }}
          </v-chip>
          <v-chip variant="flat" size="small" color="orange" class="mx-1" pill>
            <v-icon start size="small">mdi-calendar-clock</v-icon>
            Cosechas: {{ metrics.upcomingHarvests }}
          </v-chip>
          <v-chip
            v-if="metrics.alerts > 0"
            variant="flat"
            size="small"
            color="error"
            class="mx-1"
            pill
          >
            <v-icon start size="small">mdi-alert-circle</v-icon>
            Alertas: {{ metrics.alerts }}
          </v-chip>
        </template>

        <template #actions>
          <div class="w-full sm:w-auto z-10 hidden-sm-and-down" v-if="canCreate && !mobile">
            <v-btn
              prepend-icon="mdi-plus-circle"
              color="primary"
              variant="flat"
              class="font-weight-bold text-white elevation-2 rounded-lg"
              @click="abrirDialogCreacion"
            >
              {{ $t('sowings.new_sowing') }}
            </v-btn>
          </div>
        </template>
      </UniversalHeader>
    </div>

    <main class="flex-1 py-2">
      <v-container>
        <!-- Grid de Siembras con Cards Enriquecidas -->
        <v-row class="mb-6">
          <v-col v-if="siembras.length === 0" cols="12" md="10" offset-md="1">
            <v-card class="pa-6 text-center rounded-xl elevation-0 border bg-surface">
              <v-icon size="48" color="primary" class="mb-3">mdi-sprout-outline</v-icon>
              <h3 class="text-md font-weight-bold mb-1">Estructura tu trazabilidad</h3>
              <p class="text-smtext-medium-emphasis mb-6">
                El flujo de información exacto requiere 3 pasos fundamentales.
              </p>
              
              <v-timeline align="start" side="end" density="compact" class="text-left mt-4 mb-4">
                <!-- Paso 1 -->
                <v-timeline-item :dot-color="siembras.length > 0 ? 'success' : 'primary'" size="small">
                  <template v-slot:icon v-if="siembras.length > 0">
                    <v-icon color="white" size="small">mdi-check</v-icon>
                  </template>
                  <div class="mb-1">
                    <div class="  font-weight-bold" :class="{'text-success': siembras.length > 0}">
                      1. Fase 1: Tu Primera Siembra
                    </div>
                    <div class="text-xs text-medium-emphasis">
                      El "qué". Crea el concepto general de tu cultivo.
                    </div>
                  </div>
                  <v-btn v-if="siembras.length === 0" size="small" variant="flat" color="primary" class="mt-2" @click="abrirDialogCreacion">
                    Crear Siembra
                  </v-btn>
                </v-timeline-item>

                <!-- Paso 2 -->
                <v-timeline-item :dot-color="siembras.length > 0 ? 'primary' : 'grey-lighten-2'" size="small">
                  <div class="mb-1">
                    <div class="  font-weight-bold" :class="{'text-grey': siembras.length === 0}">
                      2. Fase 2: Zonas y Actividades
                    </div>
                    <div class="text-xs text-medium-emphasis">
                      El "dónde" y "cómo". Dibuja los lotes y define las labores asociadas a la siembra.
                    </div>
                  </div>
                  <v-btn v-if="siembras.length > 0" size="small" variant="outlined" color="primary" class="mt-2" to="/zonas">
                    Configurar Zonas
                  </v-btn>
                </v-timeline-item>

                <!-- Paso 3 -->
                <v-timeline-item dot-color="grey-lighten-2" size="small">
                  <div>
                    <div class="  font-weight-bold text-grey">
                      3. Fase 3: Control y Bitácora
                    </div>
                    <div class="text-xs text-medium-emphasis">
                      El "cuándo". Genera programaciones para el control diario.
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card>
          </v-col>

          <v-col v-for="siembra in siembras" :key="siembra.id" cols="12" sm="6" md="4" lg="3">
            <v-card
              elevation="2"
              class="siembra-card Actividad-card"
              @click="abrirSiembra(siembra.id)"
              hover
            >
              <v-img
                :src="getSiembraAvatarUrl(siembra)"
                height="220px"
                cover
                class="siembra-image"
              >
                <div class="fill-height card-overlay">
                  <!-- Barra de estado lateral -->
                  <div class="estado-bar" :class="`estado-${siembra.estado?.replace('_', '-')}`"></div>
                  
                  <!-- Menú de acciones (Kebab) -->
                  <div v-if="canDelete" class="absolute top-2 right-2 z-20">
                    <v-menu location="bottom end">
                      <template v-slot:activator="{ props }">
                        <v-btn
                          icon="mdi-dots-vertical"
                          variant="text"
                          color="white"
                          size="small"
                          v-bind="props"
                          @click.stop
                        ></v-btn>
                      </template>
                      <v-list density="compact">
                        <v-list-item
                          prepend-icon="mdi-delete"
                          :title="$t('sowings.delete_sowing')"
                          base-color="error"
                          @click.stop="confirmarEliminacion(siembra)"
                        ></v-list-item>
                      </v-list>
                    </v-menu>
                  </div>

                  <v-card-title class="px-2 py-0 w-full">
                    <div class="d-flex align-center gap-2 mb-1 w-full">
                      <v-icon :color="getSiembraStateColor(siembra.estado)" size="18">{{ getSiembraStateIcon(siembra.estado) }}</v-icon>
                      <span class="siembra-title flex-grow-1 text-white">{{ siembra.nombre }}</span>
                    </div>
                    
                    <div class="d-flex align-center flex-wrap gap-1 mb-2">
 
                      
                      <v-chip size="x-small" variant="flat" color="green-darken-3" class="text-white">
                        <v-icon start size="10">mdi-sprout</v-icon>
                        {{ siembra.tipo }}
                      </v-chip>

                     <v-chip
                        :color="getStatusColor(siembra.estado)"
                        size="x-small"
                        variant="flat"
                        class="text-uppercase font-weight-bold"
                      >
                        {{ siembra.estado }}
                      </v-chip>

                    </div>

                    <div class="d-flex align-center flex-wrap gap-1 mt-auto">
                      <v-chip variant="tonal" size="x-small" color="white" class="text-white">
                        <v-icon start size="10">mdi-calendar</v-icon>
                        {{ formatDate(siembra.fecha_inicio || siembra.created) }}
                      </v-chip>

                      <v-chip
                        v-if="getZoneCount(siembra) > 0"
                        color="blue-lighten-4"
                        size="x-small"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        <v-icon start size="10">mdi-map-marker</v-icon>
                        {{ getZoneCount(siembra) }} zonas
                      </v-chip>

                      <v-chip v-if="siembra.area_total > 0" variant="tonal" size="x-small" color="white" class="text-white">
                        <v-icon start size="10">mdi-ruler</v-icon>
                        {{ formatArea(siembra.area_total) }}
                      </v-chip>
                    </div>
                  </v-card-title>
                </div>
              </v-img>
            </v-card>
          </v-col>
        </v-row>

        <!-- Mapa de siembras -->
        <v-row>
          <v-col cols="12">
            <v-card variant="elevated" elevation="2" class="h-100">
              <v-card-title class="pa-4">
                <v-icon start color="primary">mdi-map</v-icon>
                {{ $t('sowings.sowings_map') }}
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-0">
                <div class="map-container" style="height: 600px;">
                  <GisMapComponent
                    v-if="siembrasGeoJSON"
                    :initialGeoJSON="siembrasGeoJSON"
                    :center="mapCenter"
                    :readonly="true"
                    :loading="mapLoading"
                    :hacienda-gps="mi_hacienda?.gps"
                  />
                  <div v-if="!siembrasGeoJSON && !mapLoading" class="map-overlay-empty d-flex flex-column align-center justify-center">
                    <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-map-off</v-icon>
                    <div class="text-xs text-medium-emphasis">{{ $t('sowings.no_geometries_detected') }}</div>
                    <div class="text-xxs text-grey mt-1">{{ $t('sowings.requires_lote_zones') }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <!-- Dialog de creación -->
    <SiembraCreateDialog v-model="dialogNuevaSiembra" @created="onSiembraCreada" />

    <!-- Modal de eliminación inteligente -->
    <SiembraDeleteModal
      v-model="showDeleteModal"
      :siembra-id="selectedSiembra?.id"
      :siembra-nombre="selectedSiembra?.nombre"
      @deleted="onSiembraEliminada"
    />

    <v-btn
      v-if="canCreate && mobile"
      color="primary"
      icon="mdi-plus"
      size="x-large"
      position="fixed"
      location="bottom right"
      class="mb-4 mr-4 elevation-8"
      style="z-index: 100"
      @click="abrirDialogCreacion"
    ></v-btn>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import GisMapComponent from '@/components/GisMapComponent.vue'
import { SIEMBRA_COLORS } from '@/constants/mapColors'
import SiembraCreateDialog from './SiembraCreateDialog.vue'
import SiembraDeleteModal from './SiembraDeleteModal.vue'
import { useAvatarStore } from '@/stores/avatarStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { logger } from '@/utils/logger'
import { useDisplay } from 'vuetify'
import UniversalHeader from '@/components/UniversalHeader.vue'

const router = useRouter()
const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()
const authStore = useAuthStore()
const { mobile } = useDisplay()
const haciendaStore = useHaciendaStore()
const avatarStore = useAvatarStore()
const uiFeedbackStore = useUiFeedbackStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
// Reactividad directa con los stores
const { siembras } = storeToRefs(siembrasStore)
const { zonas } = storeToRefs(zonasStore)

const dialogNuevaSiembra = ref(false)

// Estado para eliminación
const showDeleteModal = ref(false)
const selectedSiembra = ref(null)

const userRole = computed(() => authStore.user?.role || '')
const canCreate = computed(() => authStore.canCreate)
const canDelete = computed(() => authStore.canDelete)
const avatarUrl = computed(() => authStore.avatarUrl)
const mapLoading = ref(true)

// Centrado del mapa: Hacienda como fallback
const mapCenter = computed(() => {
  if (mi_hacienda.value?.gps) {
    const gps = mi_hacienda.value.gps
    return [gps.lat, gps.lng]
  }
  return [4.5709, -74.2973] // Default Colombia
})

const getSiembraAvatarUrl = (siembra) => {
  return avatarStore.getAvatarUrl({ ...siembra, type: 'siembra' }, 'Siembras')
}

// Cargar datos
onMounted(async () => {
  try {
    mapLoading.value = true

    // CARGA SECUENCIAL: Asegurar ID de hacienda primero
    await haciendaStore.init()

    if (haciendaStore.mi_hacienda?.id) {
      await Promise.all([
        siembrasStore.cargarSiembras(),
        zonasStore.init()
      ])
      logger.debug('[SiembrasDashboard] Datos cargados con éxito')
    }
  } catch (error) {
    console.error('Error cargando datos:', error)
    uiFeedbackStore.showError('Error cargando datos del dashboard')
  } finally {
    mapLoading.value = false
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

const parseGeometry = (geo) => {
  if (!geo) return null
  try {
    let parsed = typeof geo === 'string' ? JSON.parse(geo) : geo
    return JSON.parse(JSON.stringify(parsed))
  } catch (e) {
    console.warn('[SIEMBRAS_DASHBOARD] Error parsing geometry', e)
    return null
  }
}

// GeoJSON para mapa
const siembrasGeoJSON = computed(() => {
  const features = []

  // 0. Polígono de la Hacienda (Delimitador sin relleno)
  if (mi_hacienda.value?.geometria) {
    const haciendaGeom = parseGeometry(mi_hacienda.value.geometria)
    if (haciendaGeom) {
      features.push({
        type: 'Feature',
        properties: {
          id: mi_hacienda.value.id,
          nombre: `Perímetro: ${mi_hacienda.value.name}`,
          type: 'hacienda-boundary',
          noFill: true,
          color: '#4CAF50'
        },
        geometry: haciendaGeom
      })
    }
  }

  if (siembras.value && siembras.value.length > 0) {
    siembras.value.forEach(s => {
      const siembraColor = SIEMBRA_COLORS[s.estado] || SIEMBRA_COLORS.finalizada

      // 1. Geometría directa de la siembra (prioridad alta)
      const directGeom = parseGeometry(s.geometria)
      if (directGeom) {
        features.push({
          type: 'Feature',
          properties: { 
            id: s.id, 
            nombre: s.nombre, 
            estado: s.estado, 
            area: s.area_total, 
            source: 'direct',
            color: siembraColor
          },
          geometry: directGeom
        })
      } 

      // 2. Geometrías de zonas vinculadas (siempre buscamos, por si la siembra es compuesta)
      if (zonas.value) {
        const lotesAsociados = zonas.value.filter(z => {
          const matchesSiembra = Array.isArray(z.siembra) ? z.siembra.includes(s.id) : z.siembra === s.id
          return matchesSiembra && (z.geometria || z.gps)
        })

        lotesAsociados.forEach(lote => {
          let loteGeom = parseGeometry(lote.geometria)
          const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(lote.color)
          const finalColor = isValidHex ? lote.color : siembraColor
          
          // Fallback: Si no hay geometría, intentar usar el campo gps como Point
          if (!loteGeom && lote.gps) {
            try {
              const gps = typeof lote.gps === 'string' ? JSON.parse(lote.gps) : lote.gps
              if (gps?.lat && gps?.lng) {
                loteGeom = {
                  type: 'Point',
                  coordinates: [Number(gps.lng), Number(gps.lat)] // GeoJSON usa [lng, lat]
                }
              }
            } catch (e) {
              console.warn('[SIEMBRAS_DASHBOARD] Error parsing GPS to Point for lote', e)
            }
          }

          if (loteGeom) {
            features.push({
              type: 'Feature',
              properties: { 
                id: s.id, 
                nombre: `${s.nombre} (${lote.nombre})`, 
                estado: s.estado,
                area: lote.area?.area,
                source: 'zone',
                color: finalColor
              },
              geometry: loteGeom
            })
          }
        })
      }
    })
  }

  return features.length > 0 ? { type: 'FeatureCollection', features } : null
})


const abrirDialogCreacion = () => {
  dialogNuevaSiembra.value = true
}

const onSiembraCreada = () => {
  // El store ya actualiza la lista automáticamente por reactividad
}

// Acciones de eliminación
const confirmarEliminacion = (siembra) => {
  selectedSiembra.value = siembra
  showDeleteModal.value = true
}

const onSiembraEliminada = async (id) => {
  try {
    // Analizar dependencias de la siembra
    const analysis = await siembrasStore.analyzeDependencies(id)
    
    if (analysis && (analysis.exclusive.length > 0 || analysis.shared.length > 0)) {
      // Acciones por defecto: desvincular dependencias en lugar de eliminarlas
      const userActions = {
        zonas: 'detach',
        bitacora: 'detach',
        programaciones: 'detach',
        recordatorios: 'detach'
      }
      await siembrasStore.executeSmartDeletion(id, analysis, userActions)
    } else {
      // Sin dependencias, usar borrado básico
      await siembrasStore.eliminarSiembra(id)
    }
    
    selectedSiembra.value = null
    uiFeedbackStore.showSnackbar('Siembra eliminada correctamente', 'success')
  } catch (error) {
    logger.error('[SiembrasDashboard] Error al eliminar siembra:', error)
    uiFeedbackStore.showError('Error al eliminar la siembra')
  }
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
  position: relative;
}

.map-overlay-empty {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 10;
  pointer-events: none;
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
  border-radius: 12px !important;
}

.siembra-image {
  transition: transform 0.5s ease;
}

.siembra-card:hover .siembra-image {
  transform: scale(1.1);
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.1) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 12px;
  transition: background 0.3s ease;
}

.siembra-card:hover .card-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.2) 100%);
}

.estado-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  z-index: 2;
}

.estado-bar.estado-planificada { background-color: #2196F3; }
.estado-bar.estado-en-crecimiento { background-color: #4CAF50; }
.estado-bar.estado-cosechada { background-color: #FF9800; }
.estado-bar.estado-finalizada { background-color: #9E9E9E; }

.siembra-title {
  font-size: 1rem;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }

.h-100 {
  height: 100%;
}

.text-xxs {
  font-size: 0.65rem;
}
</style>
