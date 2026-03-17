<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4">Dashboard Super Admin</h1>
      <div class="d-flex ga-2">
        <v-btn
          color="default"
          prepend-icon="mdi-refresh"
          @click="refreshData"
          :disabled="loading"
          variant="outlined"
        >
          Actualizar
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-download"
          @click="exportUsersToCSV"
          :disabled="loading || users.length === 0"
        >
          Exportar CSV
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- Stats Cards -->
    <v-row v-else>
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
              <v-avatar size="48" color="success" class="mr-4">
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
          show-select
        >
          <template v-slot:item.role="{ item }">
            <v-chip :color="getRoleColor(item.role)" size="small">
              {{ item.role }}
            </v-chip>
          </template>

          <template v-slot:item.created="{ item }">
            {{ formatDate(item.created) }}
          </template>

          <template v-slot:item.lastLogin="{ item }">
            {{ formatDate(item.updated || item.created) }}
          </template>
        </v-data-table-virtual>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'
import { cache, CacheKeys } from '@/utils/cacheManager'
import { formatDate } from '@/utils/formatters'
import { exportToCSV } from '@/utils/exporters'

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
  { key: 'hacienda', title: 'Hacienda', sortable: false },
  { key: 'created', title: 'Creado', sortable: true },
  { key: 'lastLogin', title: 'Último Login', sortable: false }
]

// Cache key
const USERS_CACHE_KEY = CacheKeys.users(1, 500)
const HACIENDAS_CACHE_KEY = CacheKeys.haciendas(1, 100)
const CACHE_TTL = 300000 // 5 minutos

onMounted(async () => {
  await loadData()
})

onUnmounted(() => {
  // EFICIENCIA: No destruir cache global, solo limpiar entradas específicas
  // cache.invalidatePattern(/^admin:/)
})

/**
 * ENHANCED: Carga datos en paralelo usando Promise.all
 * También implementa cache para evitar recargas innecesarias
 */
async function loadData() {
  loading.value = true
  try {
    // OPTIMIZACIÓN 1: Intentar obtener desde cache primero
    const cachedUsers = cache.get(USERS_CACHE_KEY)
    const cachedHaciendas = cache.get(HACIENDAS_CACHE_KEY)

    if (cachedUsers && cachedHaciendas) {
      logger.info('[ADMIN_ANALYTICS] Datos cargados desde cache')
      users.value = cachedUsers.items
      haciendas.value = cachedHaciendas.items
      calculateStats()
      return
    }

    // OPTIMIZACIÓN 2: Fetching paralelo en lugar de secuencial
    const [usersList, haciendasList] = await Promise.all([
      pb.collection('users').getList(1, 500, {
        sort: '-created'
      }),
      pb.collection('Haciendas').getList(1, 100)
    ])

    users.value = usersList.items
    haciendas.value = haciendasList.items

    // Guardar en cache
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
 * Calcula estadísticas (separado para reutilización)
 */
function calculateStats() {
  // OPTIMIZACIÓN 3: Usar memoization implícita calculando solo cuando cambia users
  stats.value = {
    totalUsers: users.value.length,
    totalHaciendas: haciendas.value.length,
    activeUsers: countActiveUsers(users.value),
    growthRate: calculateGrowthRate(users.value)
  }

  // Preparar datos para gráfico
  userGrowthData.value = prepareUserGrowthData(users.value)
}

/**
 * Cuenta usuarios activos (optimizado con loop simple)
 */
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

// Usa formatDate de @/utils/formatters (importado arriba)

function getRoleColor(role) {
  const colors = {
    superadmin: 'error',
    admin: 'primary',
    user: 'success',
    viewer: 'grey'
  }
  return colors[role] || 'grey'
}

// Usa exportToCSV de @/utils/exporters (importado arriba)

/**
 * Wrapper para exportar usuarios usando la utilidad compartida
 */
function exportUsersToCSV() {
  const data = users.value.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    hacienda: u.hacienda || 'N/A',
    created: u.created,
    lastLogin: u.updated || 'N/A'
  }))

  return exportToCSV(data, `usuarios_${new Date().toISOString().split('T')[0]}.csv`, {
    headers: ['ID', 'Username', 'Email', 'Role', 'Hacienda', 'Created', 'Last Login']
  })
}

/**
 * Recarga datos invalidando el cache
 */
async function refreshData() {
  // Invalidar cache específico
  cache.delete(USERS_CACHE_KEY)
  cache.delete(HACIENDAS_CACHE_KEY)
  await loadData()
}
</script>
