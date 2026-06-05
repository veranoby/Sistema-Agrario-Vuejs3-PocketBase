<template>
  <v-container fluid class="pa-4">
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4">Analytics y Métricas</h1>
      <v-btn
        color="primary"
        prepend-icon="mdi-export"
        @click="exportUsersToCSV"
        :loading="loading"
      >
        Exportar Usuarios
      </v-btn>
    </div>

    <!-- Pestañas para dividir la vista -->
    <v-tabs v-model="tab" color="primary" class="mb-6">
      <v-tab value="growth">Crecimiento y Usuarios</v-tab>
      <v-tab value="operations">Métricas Operativas</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- PESTAÑA: CRECIMIENTO Y USUARIOS (Logica original) -->
      <v-window-item value="growth">
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-avatar size="48" color="primary" class="mr-4">
                    <v-icon color="white">mdi-account-group</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-h4">{{ stats.totalUsers }}</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Total Usuarios</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-avatar size="48" color="primary" class="mr-4">
                    <v-icon color="white">mdi-home-city</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-h4">{{ stats.totalHaciendas }}</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Total Haciendas</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-avatar size="48" color="info" class="mr-4">
                    <v-icon color="white">mdi-account-check</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-h4">{{ stats.activeUsers }}</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Usuarios Activos</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="elevated" elevation="2">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-avatar size="48" :color="stats.growthRate >= 0 ? 'success' : 'error'" class="mr-4">
                    <v-icon color="white">{{ stats.growthRate >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-h4">{{ stats.growthRate }}%</div>
                    <div class="text-subtitle-2 text-medium-emphasis">Crecimiento Mensual</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Chart -->
        <v-card class="mt-6" variant="elevated" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Crecimiento de Usuarios</span>
            <v-btn-toggle v-model="timeRange" variant="outlined" density="compact" mandatory>
              <v-btn value="7d">7 días</v-btn>
              <v-btn value="30d">30 días</v-btn>
              <v-btn value="90d">90 días</v-btn>
            </v-btn-toggle>
          </v-card-title>

          <v-card-text>
            <div style="height: 300px;" class="overflow-auto">
              <v-table density="compact" v-if="userGrowthData.length > 0">
                <thead>
                  <tr>
                    <th class="text-left">Fecha</th>
                    <th class="text-left">Nuevos Usuarios</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredGrowthData" :key="item.date">
                    <td>{{ formatDate(item.date) }}</td>
                    <td>{{ item.count }}</td>
                  </tr>
                </tbody>
              </v-table>

              <v-empty-state
                v-else
                title="Sin datos"
                text="No hay datos de crecimiento disponibles"
                icon="mdi-chart-line"
              />
            </div>
          </v-card-text>
        </v-card>

        <!-- Users Table -->
        <v-card class="mt-6" variant="elevated" elevation="2">
          <v-card-title>Usuarios Recientes</v-card-title>

          <v-card-text>
            <v-data-table-virtual
              :headers="userHeaders"
              :items="users"
              :loading="loading"
              height="600"
              fixed-header
              density="compact"
            >
              <template v-slot:item_role="{ item }">
                <v-chip :color="getRoleColor(item.role)" size="small">
                  {{ item.role }}
                </v-chip>
              </template>

              <template v-slot:item_created="{ item }">
                {{ formatDate(item.created) }}
              </template>

              <template v-slot:item_lastLogin="{ item }">
                {{ formatDate(item.updated || item.created) }}
              </template>
            </v-data-table-virtual>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- PESTAÑA: MÉTRICAS OPERATIVAS (Logica de UsageMetrics) -->
      <v-window-item value="operations">
        <v-card variant="elevated" elevation="2">
          <v-card-text>
            <v-progress-linear v-if="loadingMetrics" indeterminate color="primary" class="mb-4" />

            <v-row v-else>
              <!-- Top 10 Haciendas por Actividad -->
              <v-col cols="12" md="6">
                <h3 class="mb-3">Top 10 Haciendas por Actividad</h3>
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
                <h3 class="mb-3">Uso por Tipo de Actividad</h3>
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

            <!-- Resumen Estadístico Operativo -->
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
                <v-card variant="tonal" color="primary">
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
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'
import { cache, CacheKeys } from '@/utils/cacheManager'
import { formatDate } from '@/utils/formatters'
import { exportToCSV } from '@/utils/exporters'

const tab = ref('growth')
const loading = ref(false)
const users = ref([])
const haciendas = ref([])
const stats = ref({
  totalUsers: 0,
  totalHaciendas: 0,
  activeUsers: 0,
  growthRate: 0
})

const userGrowthData = ref([])
const timeRange = ref('30d')

const userHeaders = [
  { key: 'username', title: 'Usuario', sortable: true },
  { key: 'email', title: 'Email', sortable: true },
  { key: 'role', title: 'Rol', sortable: true },
  { key: 'created', title: 'Creado', sortable: true },
  { key: 'lastLogin', title: 'Último Login', sortable: false }
]

// Cache key
const USERS_CACHE_KEY = CacheKeys.users(1, 500)
const HACIENDAS_CACHE_KEY = CacheKeys.haciendas(1, 100)
const CACHE_TTL = 300000 // 5 minutos

// Variables para Métricas Operativas
const loadingMetrics = ref(false)
const topHaciendas = ref([])
const moduleUsage = ref({})
const haciendaNames = ref({})
const hasLoadedMetrics = ref(false)

onMounted(async () => {
  await loadData()
})

watch(tab, async (newVal) => {
  if (newVal === 'operations' && !hasLoadedMetrics.value) {
    await loadMetrics()
    hasLoadedMetrics.value = true
  }
})

/**
 * Carga de datos principales
 */
async function loadData() {
  loading.value = true
  try {
    const cachedUsers = cache.get(USERS_CACHE_KEY)
    const cachedHaciendas = cache.get(HACIENDAS_CACHE_KEY)

    if (cachedUsers && cachedHaciendas) {
      logger.info('[ADMIN_ANALYTICS] Datos cargados desde cache')
      users.value = cachedUsers.items
      haciendas.value = cachedHaciendas.items
      calculateStats()
      return
    }

    const [usersList, haciendasList] = await Promise.all([
      pb.collection('users').getList(1, 500, { sort: '-created' }),
      pb.collection('Haciendas').getList(1, 100)
    ])

    users.value = usersList.items
    haciendas.value = haciendasList.items

    cache.set(USERS_CACHE_KEY, usersList, CACHE_TTL)
    cache.set(HACIENDAS_CACHE_KEY, haciendasList, CACHE_TTL)

    calculateStats()

    logger.info('[ADMIN_ANALYTICS] Datos cargados exitosamente')
  } catch (error) {
    logger.error('[ADMIN_ANALYTICS] Error cargando datos', error)
  } finally {
    loading.value = false
  }
}

/**
 * Carga de métricas operativas
 */
async function loadMetrics() {
  loadingMetrics.value = true
  try {
    const actividades = await pb.collection('actividades').getFullList()

    const actividadPorHacienda = {}
    actividades.forEach(a => {
      actividadPorHacienda[a.hacienda] = (actividadPorHacienda[a.hacienda] || 0) + 1
    })

    const haciendaIds = Object.keys(actividadPorHacienda)
    for (const haciendaId of haciendaIds) {
      const hacienda = haciendas.value.find(h => h.id === haciendaId)
      if (hacienda) {
        haciendaNames.value[haciendaId] = hacienda.name
      } else {
        try {
          const loadedHacienda = await pb.collection('Haciendas').getOne(haciendaId)
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

    const tipos = {}
    actividades.forEach(a => {
      const tipo = a.tipo_actividades || 'Sin tipo'
      tipos[tipo] = (tipos[tipo] || 0) + 1
    })

    moduleUsage.value = tipos

    logger.info('[ADMIN_ANALYTICS] Métricas operativas cargadas')
  } catch (error) {
    logger.error('[ADMIN_ANALYTICS] Error cargando métricas operativas', error)
  } finally {
    loadingMetrics.value = false
  }
}

/**
 * Calcula estadísticas (separado para reutilización)
 */
function calculateStats() {
  stats.value = {
    totalUsers: users.value.length,
    totalHaciendas: haciendas.value.length,
    activeUsers: countActiveUsers(users.value),
    growthRate: calculateGrowthRate(users.value)
  }
  userGrowthData.value = prepareUserGrowthData(users.value)
}

function countActiveUsers(usersList) {
  let count = 0
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
  const now = Date.now()

  for (const u of usersList) {
    const lastLogin = new Date(u.updated || u.created).getTime()
    if (now - lastLogin <= thirtyDaysInMs) {
      count++
    }
  }

  return count
}

function calculateGrowthRate(users) {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const usersThisMonth = users.filter(u => new Date(u.created) >= lastMonth).length
  const usersBeforeMonth = users.length - usersThisMonth

  return usersBeforeMonth > 0
    ? ((usersThisMonth / usersBeforeMonth) * 100).toFixed(1)
    : usersThisMonth > 0
      ? 100
      : 0
}

function prepareUserGrowthData(users) {
  const grouped = {}

  users.forEach(user => {
    const date = new Date(user.created).toISOString().split('T')[0]
    grouped[date] = (grouped[date] || 0) + 1
  })

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

const filteredGrowthData = computed(() => {
  const now = new Date()
  const daysFilter = {
    '7d': 7,
    '30d': 30,
    '90d': 90
  }

  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() - daysFilter[timeRange.value])

  return userGrowthData.value.filter(item => new Date(item.date) >= cutoffDate)
})

function getRoleColor(role) {
  const colors = {
    superadmin: 'error',
    admin: 'primary',
    user: 'success',
    viewer: 'grey'
  }
  return colors[role] || 'grey'
}

function exportUsersToCSV() {
  const data = users.value.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    created: u.created,
    lastLogin: u.updated || 'N/A'
  }))

  return exportToCSV(data, `usuarios_${new Date().toISOString().split('T')[0]}.csv`, {
    headers: ['ID', 'Username', 'Email', 'Role', 'Created', 'Last Login']
  })
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

// eslint-disable-next-line no-unused-vars
async function refreshData() {
  cache.delete(USERS_CACHE_KEY)
  cache.delete(HACIENDAS_CACHE_KEY)
  await loadData()
  if (tab.value === 'operations') {
    await loadMetrics()
  }
}
</script>
