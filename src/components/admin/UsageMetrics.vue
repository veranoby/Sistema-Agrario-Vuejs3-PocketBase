<template>
  <v-card variant="elevated" elevation="2">
    <v-card-title>Métricas de Uso</v-card-title>
    <v-card-subtitle>Estadísticas detalladas del sistema</v-card-subtitle>

    <v-card-text>
      <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

      <v-row v-else>
        <!-- Top 10 Haciendas por Actividad -->
        <v-col cols="12" md="6">
          <h3 class=" mb-3">Top 10 Haciendas por Actividad</h3>
          <v-table density="compact" hover>
            <thead>
              <tr>
                <th class="text-left">Rank</th>
                <th class="text-left">Hacienda</th>
                <th class="text-right">Actividades</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(h, index) in topHaciendas" :key="h.id">
                <td>
                  <v-chip
                    :color="getRankColor(index)"
                    size="small"
                    class="font-weight-bold"
                  >
                    #{{ index + 1 }}
                  </v-chip>
                </td>
                <td>
                  <div class="text-truncate" style="max-width: 200px;">
                    {{ h.name || 'Cargando...' }}
                  </div>
                </td>
                <td class="text-right">
                  <v-chip color="primary" size="small">
                    {{ h.count }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-empty-state
            v-if="topHaciendas.length === 0"
            title="Sin datos"
            text="No hay actividades registradas"
            icon="mdi-chart-bar"
            class="mt-4"
          />
        </v-col>

        <!-- Uso por Tipo de Actividad -->
        <v-col cols="12" md="6">
          <h3 class=" mb-3">Uso por Tipo de Actividad</h3>
          <v-table density="compact" hover>
            <thead>
              <tr>
                <th class="text-left">Tipo</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">% del Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(count, tipo) in sortedModuleUsage" :key="tipo">
                <td>
                  <div class="d-flex align-center">
                    <v-icon :color="getActivityTypeColor(tipo)" class="mr-2">
                      {{ getActivityTypeIcon(tipo) }}
                    </v-icon>
                    {{ formatActivityType(tipo) }}
                  </div>
                </td>
                <td class="text-right">
                  <v-chip size="small" variant="outlined">
                    {{ count }}
                  </v-chip>
                </td>
                <td class="text-right">
                  <v-progress-linear
                    :model-value="getPercentage(count)"
                    :color="getActivityTypeColor(tipo)"
                    height="6"
                    rounded
                    class="mt-2"
                  />
                  <span class="text-caption">{{ getPercentage(count).toFixed(1) }}%</span>
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-empty-state
            v-if="Object.keys(moduleUsage).length === 0"
            title="Sin datos"
            text="No hay actividades por tipo"
            icon="mdi-chart-pie"
            class="mt-4"
          />
        </v-col>
      </v-row>

      <!-- Resumen Estadístico -->
      <v-divider class="my-4" />

      <v-row>
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-h3 font-weight-bold">{{ totalActividades }}</div>
              <div class="text-subtitle-2">Total Actividades</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center">
              <div class="text-h3 font-weight-bold">{{ topHaciendas.length }}</div>
              <div class="text-subtitle-2">Haciendas Activas</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center">
              <div class="text-h3 font-weight-bold">{{ Object.keys(moduleUsage).length }}</div>
              <div class="text-subtitle-2">Tipos de Actividad</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { logger } from '@/utils/logger'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useHaciendaStore } from '@/stores/haciendaStore'

const actividadesStore = useActividadesStore()
const haciendaStore = useHaciendaStore()

const loading = ref(false)
const topHaciendas = ref([])
const moduleUsage = ref({})
const haciendaNames = ref({})

onMounted(async () => {
  await loadMetrics()
})

async function loadMetrics() {
  loading.value = true
  try {
    // Top 10 haciendas por actividad
    await actividadesStore.fetchPage(1, 1000)
    const actividades = actividadesStore.actividades

    const actividadPorHacienda = {}
    actividades.forEach(a => {
      actividadPorHacienda[a.hacienda] = (actividadPorHacienda[a.hacienda] || 0) + 1
    })

    // Obtener nombres de haciendas desde el store
    const haciendaIds = Object.keys(actividadPorHacienda)
    for (const haciendaId of haciendaIds) {
      const hacienda = haciendaStore.haciendas.find(h => h.id === haciendaId)
      if (hacienda) {
        haciendaNames.value[haciendaId] = hacienda.name
      } else {
        // Si no está en el store, intentar cargarla
        try {
          await haciendaStore.fetchHacienda(haciendaId)
          const loadedHacienda = haciendaStore.haciendas.find(h => h.id === haciendaId)
          haciendaNames.value[haciendaId] = loadedHacienda?.name || 'Hacienda eliminada'
        } catch (error) {
          haciendaNames.value[haciendaId] = 'Hacienda eliminada'
        }
      }
    }

    topHaciendas.value = Object.entries(actividadPorHacienda)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([haciendaId, count]) => ({
        id: haciendaId,
        count,
        name: haciendaNames.value[haciendaId] || 'Cargando...'
      }))

    // Uso de módulos (contar actividades por tipo)
    const tipos = {}
    actividades.forEach(a => {
      const tipo = a.tipo_actividades || 'Sin tipo'
      tipos[tipo] = (tipos[tipo] || 0) + 1
    })

    moduleUsage.value = tipos

    logger.info('[USAGE_METRICS] Métricas cargadas exitosamente')
  } catch (error) {
    logger.error('[USAGE_METRICS] Error cargando métricas', error)
  } finally {
    loading.value = false
  }
}

const sortedModuleUsage = computed(() => {
  return Object.entries(moduleUsage.value)
    .sort((a, b) => b[1] - a[1])
    .reduce((obj, [key, value]) => {
      obj[key] = value
      return obj
    }, {})
})

const totalActividades = computed(() => {
  return Object.values(moduleUsage.value).reduce((sum, count) => sum + count, 0)
})

function getRankColor(index) {
  if (index === 0) return 'success'
  if (index === 1) return 'primary'
  if (index === 2) return 'amber'
  return 'grey'
}

function getActivityTypeColor(tipo) {
  const colors = {
    'siembra': 'success',
    'cosecha': 'amber',
    'mantenimiento': 'blue',
    'riego': 'cyan',
    'fumigacion': 'purple',
    'fertilizacion': 'brown'
  }
  return colors[tipo?.toLowerCase()] || 'grey'
}

function getActivityTypeIcon(tipo) {
  const icons = {
    'siembra': 'mdi-seed',
    'cosecha': 'mdi-fruit-cherries',
    'mantenimiento': 'mdi-tools',
    'riego': 'mdi-water',
    'fumigacion': 'mdi-spray-bottle',
    'fertilizacion': 'mdi-flower'
  }
  return icons[tipo?.toLowerCase()] || 'mdi-alert-circle'
}

function formatActivityType(tipo) {
  if (!tipo || tipo === 'Sin tipo') return 'Sin tipo'
  return tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' ')
}

function getPercentage(count) {
  const total = totalActividades.value
  return total > 0 ? (count / total) * 100 : 0
}
</script>
