<template>
  <v-container fluid class="superadmin-dashboard pa-6">
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary mb-1">Dashboard Superadmin</h1>
        <p class="text-subtitle-1 text-grey">Visión global de infraestructura y rendimiento del sistema ConAgri</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-refresh" @click="loadDashboardData" :loading="loading">
        Actualizar Datos
      </v-btn>
    </div>

    <!-- Fila 1: KPI Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card color="success" class="text-white" elevation="2">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-overline">Haciendas Activas</div>
              <div class="text-h3 font-weight-bold">{{ stats.haciendasActivas }}</div>
            </div>
            <v-icon size="56" opacity="0.8">mdi-barn</v-icon>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" class="text-white" elevation="2">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-overline">Haciendas Suspendidas</div>
              <div class="text-h3 font-weight-bold">{{ stats.haciendasSuspendidas }}</div>
            </div>
            <v-icon size="56" opacity="0.8">mdi-alert-circle</v-icon>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" class="text-white" elevation="2">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-overline">Usuarios Totales</div>
              <div class="text-h3 font-weight-bold">{{ stats.usuariosTotales }}</div>
            </div>
            <v-icon size="56" opacity="0.8">mdi-account-group</v-icon>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="indigo" class="text-white" elevation="2">
          <v-card-text class="d-flex align-center justify-space-between">
            <div>
              <div class="text-overline">Asesores Técnicos</div>
              <div class="text-h3 font-weight-bold">{{ stats.asesoresTotales }}</div>
            </div>
            <v-icon size="56" opacity="0.8">mdi-account-tie-hat</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Fila 2: Accesos Rápidos y Suscripciones Pendientes -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <v-card variant="outlined" class="h-100">
          <v-card-title class="bg-grey-lighten-4 d-flex justify-space-between align-center py-3">
            <span class="text-subtitle-1 font-weight-bold">Solicitudes de Suscripción Pendientes</span>
            <v-chip color="warning" size="small" v-if="solicitudesPendientes.length">
              {{ solicitudesPendientes.length }} Pendientes
            </v-chip>
          </v-card-title>
          <v-card-text class="pt-3">
            <v-data-table
              v-if="solicitudesPendientes.length"
              :headers="[
                { title: 'Solicitante', key: 'solicitante' },
                { title: 'Plan Solicitado', key: 'plan' },
                { title: 'Fecha', key: 'created' },
                { title: 'Acción', key: 'action', align: 'end' }
              ]"
              :items="solicitudesPendientes"
              density="compact"
              hide-default-footer
            >
              <template v-slot:item.created="{ item }">
                {{ formatDate(item.created) }}
              </template>
              <template v-slot:item.action>
                <v-btn color="primary" size="small" variant="text" to="/admin">
                  Revisar en Panel
                </v-btn>
              </template>
            </v-data-table>
            <div v-else class="text-center py-8 text-grey">
              <v-icon size="48" class="mb-2">mdi-check-circle-outline</v-icon>
              <div>No hay solicitudes de suscripción pendientes de aprobación.</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card variant="outlined" class="h-100">
          <v-card-title class="bg-grey-lighten-4 py-3">
            <span class="text-subtitle-1 font-weight-bold">Accesos Rápidos</span>
          </v-card-title>
          <v-card-text class="pt-4">
            <div class="d-flex flex-column gap-3">
              <v-btn to="/admin/users" prepend-icon="mdi-account-cog" variant="tonal" color="primary" block class="justify-start">
                Gestión de Usuarios
              </v-btn>
              <v-btn to="/admin/haciendas" prepend-icon="mdi-barn" variant="tonal" color="success" block class="justify-start">
                Gestión de Haciendas
              </v-btn>
              <v-btn to="/admin/asesores" prepend-icon="mdi-briefcase-account" variant="tonal" color="indigo" block class="justify-start">
                Gestión de Asesores
              </v-btn>
              <v-btn to="/admin/logs" prepend-icon="mdi-format-list-bulleted" variant="tonal" color="secondary" block class="justify-start">
                Auditoría & Logs del Sistema
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Fila 3: Actividad Reciente en el Sistema -->
    <v-card variant="outlined">
      <v-card-title class="bg-grey-lighten-4 py-3">
        <span class="text-subtitle-1 font-weight-bold">Actividad Reciente del Sistema</span>
      </v-card-title>
      <v-card-text class="pt-3">
        <v-data-table
          :headers="[
            { title: 'Fecha', key: 'timestamp' },
            { title: 'Usuario', key: 'user' },
            { title: 'Módulo', key: 'module' },
            { title: 'Acción', key: 'action' },
            { title: 'Mensaje', key: 'message' }
          ]"
          :items="actividadReciente"
          density="compact"
          hide-default-footer
          :loading="loading"
        >
          <template v-slot:item.timestamp="{ item }">
            {{ formatDate(item.timestamp) }}
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { formatDate } from '@/utils/formatters'
import { handleError } from '@/utils/errorHandler'

const loading = ref(false)
const stats = ref({
  haciendasActivas: 0,
  haciendasSuspendidas: 0,
  usuariosTotales: 0,
  asesoresTotales: 0
})
const solicitudesPendientes = ref([])
const actividadReciente = ref([])

onMounted(async () => {
  await loadDashboardData()
})

async function loadDashboardData() {
  loading.value = true
  try {
    const [allHaciendas, uTotales, aTotales, solicitudes, logsRes] = await Promise.all([
      pb.collection('Haciendas').getFullList().catch(() => []),
      pb.collection('users').getFullList().catch(() => []),
      pb.collection('users').getFullList({ filter: 'role = "asesor"' }).catch(() => []),
      pb.collection('solicitudes_suscripcion').getFullList({ filter: 'estado = "pendiente"' }).catch(() => []),
      pb.send('/api/admin/logs?perPage=8', { method: 'GET' }).catch(() => ({ items: [] }))
    ])

    const hSuspendidasCount = allHaciendas.filter(h => h.status === 'suspended').length
    const hActivasCount = allHaciendas.filter(h => h.status !== 'suspended' && h.status !== 'inactive').length

    stats.value = {
      haciendasActivas: hActivasCount,
      haciendasSuspendidas: hSuspendidasCount,
      usuariosTotales: Array.isArray(uTotales) ? uTotales.length : (uTotales.totalItems || 0),
      asesoresTotales: Array.isArray(aTotales) ? aTotales.length : (aTotales.totalItems || 0)
    }

    solicitudesPendientes.value = solicitudes
    actividadReciente.value = logsRes.items || []
  } catch (err) {
    handleError(err, 'Error cargando datos del dashboard superadmin')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.superadmin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
