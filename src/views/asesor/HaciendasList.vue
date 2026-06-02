<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <!-- Header -->
      <v-row class="mb-4">
        <v-col cols="12">
          <div>
            <h1 class="text-h4 font-weight-bold text-teal-darken-3 mb-1">
              <v-icon icon="mdi-barn" color="teal" size="36" class="mr-2"></v-icon>
              Mis Haciendas Vinculadas
            </h1>
            <p class="text-subtitle-1 text-grey-darken-1">
              Aquí puedes ver y gestionar las haciendas que te han concedido acceso a sus registros de siembra.
            </p>
          </div>
        </v-col>
      </v-row>

      <!-- Cargando / Sin Resultados -->
      <div v-if="loading" class="d-flex justify-center align-center py-12">
        <v-progress-circular indeterminate color="teal" size="64" width="6"></v-progress-circular>
      </div>

      <div v-else-if="haciendas.length === 0" class="text-center py-12">
        <v-icon icon="mdi-home-alert-outline" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h5 text-grey-darken-2 font-weight-bold">Aún no tienes haciendas vinculadas</h3>
        <p class="text-subtitle-1 text-grey-darken-1 mt-1">
          Las haciendas deben solicitar vinculación contigo desde su directorio usando tu número de colegiatura.
        </p>
      </div>

      <!-- Haciendas Grid -->
      <v-row v-else>
        <v-col
          v-for="hacienda in haciendas"
          :key="hacienda.id"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card class="h-100 d-flex flex-column elevation-3 hover-card rounded-lg overflow-hidden border border-grey-lighten-3">
            <!-- Header Card Gradient -->
            <div class="bg-gradient-teal py-4 px-5 text-white d-flex align-center justify-space-between position-relative">
              <div>
                <h3 class="text-h6 font-weight-bold text-truncate mb-0">
                  {{ hacienda.nombre }}
                </h3>
                <span class="text-caption text-teal-lighten-4 d-block">
                  Ubicación: {{ hacienda.provincia || 'Ecuador' }}
                </span>
              </div>
              <v-badge
                color="orange"
                :content="hacienda.pendingCount"
                :model-value="hacienda.pendingCount > 0"
                overlap
              >
                <v-icon icon="mdi-bell-outline" size="28"></v-icon>
              </v-badge>
            </div>

            <!-- Body Card -->
            <v-card-text class="flex-grow-1 pt-4 pb-2">
              <div class="d-flex align-center mb-3">
                <v-icon icon="mdi-account" color="teal" class="mr-2"></v-icon>
                <div>
                  <span class="text-caption text-grey d-block">Propietario / Administrador</span>
                  <span class="text-body-2 font-weight-medium">{{ hacienda.ownerName || 'N/A' }}</span>
                </div>
              </div>

              <div class="d-flex align-center mb-3">
                <v-icon icon="mdi-email" color="teal" class="mr-2"></v-icon>
                <div>
                  <span class="text-caption text-grey d-block">Email de Contacto</span>
                  <span class="text-body-2">{{ hacienda.ownerEmail || 'N/A' }}</span>
                </div>
              </div>

              <div class="d-flex align-center mb-3" v-if="hacienda.superficie">
                <v-icon icon="mdi-texture" color="teal" class="mr-2"></v-icon>
                <div>
                  <span class="text-caption text-grey d-block">Superficie Total</span>
                  <span class="text-body-2">{{ hacienda.superficie }} Hectáreas</span>
                </div>
              </div>

              <div class="mt-4 pt-2 border-t border-grey-lighten-4 d-flex justify-space-between align-center">
                <span class="text-caption font-weight-bold text-grey-darken-1">Paquetes Compartidos:</span>
                <v-chip size="small" color="teal-lighten-4" class="text-teal-darken-4 font-weight-bold">
                  {{ hacienda.totalPackages }} en total
                </v-chip>
              </div>
            </v-card-text>

            <!-- Acciones Card -->
            <v-divider></v-divider>
            <v-card-actions class="px-5 py-3 bg-grey-lighten-5">
              <v-btn
                block
                color="teal"
                variant="flat"
                class="font-weight-bold text-white"
                prepend-icon="mdi-eye"
                @click="goToHacienda(hacienda)"
              >
                Revisar Expedientes
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const haciendas = ref([])

onMounted(async () => {
  loading.value = true
  try {
    // 1. Fetch active vinculaciones for advisor
    const vinculaciones = await pb.collection('vinculaciones_asesor').getFullList({
      filter: `asesor_id="${authStore.user.id}" && estado="activa"`,
      sort: '-created'
    })

    // 2. Fetch details for each linked hacienda
    haciendas.value = await Promise.all(vinculaciones.map(async (v) => {
      let hDetails = {
        id: v.hacienda_id,
        nombre: 'Hacienda Vinculada',
        provincia: 'Ecuador',
        superficie: 0,
        ownerName: 'N/A',
        ownerEmail: 'N/A',
        pendingCount: 0,
        totalPackages: 0
      }

      try {
        // Fetch Hacienda record
        const h = await pb.collection('Haciendas').getOne(v.hacienda_id)
        hDetails.nombre = h.nombre
        hDetails.provincia = h.provincia
        hDetails.superficie = h.superficie

        // Fetch Owner User details
        const u = await pb.collection('users').getFirstListItem(`hacienda="${v.hacienda_id}" && role="administrador"`)
        hDetails.ownerName = `${u.name} ${u.lastname}`
        hDetails.ownerEmail = u.email
      } catch (err) {
        console.warn('Could not fetch all hacienda details:', err)
      }

      try {
        // Fetch Package stats
        const pkgs = await pb.collection('paquetes_evaluacion').getFullList({
          filter: `vinculacion_id="${v.id}"`
        })
        hDetails.totalPackages = pkgs.length
        hDetails.pendingCount = pkgs.filter(p => p.estado === 'enviado').length
      } catch (err) {
        console.warn('Could not fetch packages count:', err)
      }

      return hDetails
    }))
  } catch (error) {
    handleError(error, 'Error al cargar las haciendas vinculadas')
  } finally {
    loading.value = false
  }
})

const goToHacienda = (hacienda) => {
  router.push(`/asesor/haciendas/${hacienda.id}`)
}
</script>

<style scoped>
.bg-gradient-teal {
  background: linear-gradient(135deg, #00796B 0%, #004D40 100%);
}
.hover-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 77, 64, 0.15) !important;
}
</style>
