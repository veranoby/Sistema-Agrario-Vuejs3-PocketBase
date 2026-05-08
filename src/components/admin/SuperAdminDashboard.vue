<template>
  <v-container fluid class="pa-4">
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4">Panel de Super Admin</h1>
      <v-chip color="primary" size="large">
        <v-icon start>mdi-shield-star</v-icon>
        Super Admin
      </v-chip>
    </div>

    <!-- Navigation Cards -->
    <v-row>
      <v-col cols="12" md="4">
        <v-card
          variant="elevated"
          elevation="2"
          class="hover-card cursor-pointer"
          @click="$router.push('/admin/analytics')"
        >
          <v-card-text class="text-center py-6">
            <v-icon size="64" color="primary" class="mb-4">mdi-chart-timeline-variant</v-icon>
            <h3 class="text-h6 mb-2">Analytics</h3>
            <p class="text-subtitle-2 text-medium-emphasis">
              Métricas de usuarios, crecimiento y estadísticas generales
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card
          variant="elevated"
          elevation="2"
          class="hover-card cursor-pointer"
          @click="$router.push('/admin/metrics')"
        >
          <v-card-text class="text-center py-6">
            <v-icon size="64" color="success" class="mb-4">mdi-chart-pie</v-icon>
            <h3 class="text-h6 mb-2">Métricas de Uso</h3>
            <p class="text-subtitle-2 text-medium-emphasis">
              Análisis de uso por hacienda y tipo de actividad
            </p>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card
          variant="elevated"
          elevation="2"
          class="hover-card cursor-pointer"
          @click="$router.push('/admin/data-mining')"
        >
          <v-card-text class="text-center py-6">
            <v-icon size="64" color="info" class="mb-4">mdi-database-search</v-icon>
            <h3 class="text-h6 mb-2">Data Mining</h3>
            <p class="text-subtitle-2 text-medium-emphasis">
              Consultas avanzadas y exportación de datos
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Stats -->
    <v-divider class="my-6" />

    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 mb-4">Accesos Directos</h2>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-btn
          block
          variant="outlined"
          prepend-icon="mdi-account-group"
          @click="$router.push('/admin/users')"
        >
          Gestionar Usuarios
        </v-btn>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-btn
          block
          variant="outlined"
          prepend-icon="mdi-home-city"
          @click="$router.push('/admin/haciendas')"
        >
          Gestionar Haciendas
        </v-btn>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-btn
          block
          variant="outlined"
          prepend-icon="mdi-cog"
          @click="$router.push('/admin/settings')"
        >
          Configuración
        </v-btn>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-btn
          block
          variant="outlined"
          prepend-icon="mdi-file-document"
          @click="$router.push('/admin/logs')"
        >
          Ver Logs
        </v-btn>
      </v-col>
    </v-row>

    <!-- System Info -->
    <v-card variant="tonal" color="grey-lighten-4" class="mt-6">
      <v-card-text>
        <div class="d-flex justify-space-between align-center">
          <div>
            <strong>Estado del Sistema:</strong>
            <v-chip color="success" size="small" class="ml-2">
              <v-icon start>mdi-check-circle</v-icon>
              Operativo
            </v-chip>
          </div>
          <div class="">
            Última actualización: {{ new Date().toLocaleString('es-ES') }}
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { logger } from '@/utils/logger'

logger.info('[SUPER_ADMIN] Dashboard cargado')
</script>

<style scoped>
.hover-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.cursor-pointer {
  cursor: pointer;
}
</style>
