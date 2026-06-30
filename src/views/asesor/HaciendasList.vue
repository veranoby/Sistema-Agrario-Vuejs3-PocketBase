<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <!-- Header -->
      <UniversalHeader 
        title="Mis Haciendas Vinculadas"
        :bgImage="avatarUrl"
      >
        <template #chips>
          <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start>
              <v-img :src="avatarUrl" alt="Avatar"></v-img>
            </v-avatar>
            {{ userRole }}
          </v-chip>
        </template>
      </UniversalHeader>

      
      <v-tabs v-model="activeTab" color="indigo" class="mb-6">
        <v-tab value="activas">Vinculadas ({{ haciendasActivas.length }})</v-tab>
        <v-tab value="pendientes">
          Pendientes 
          <v-badge v-if="haciendasPendientes.length > 0" :content="haciendasPendientes.length" color="orange" inline class="ml-2"></v-badge>
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="bg-transparent">
        <v-window-item value="activas">
          <!-- Cargando / Sin Resultados -->
      <div v-if="loading" class="d-flex justify-center align-center py-12">
        <v-progress-circular indeterminate color="indigo" size="64" width="6"></v-progress-circular>
      </div>

      <div v-else-if="haciendasActivas.length === 0" class="text-center py-12">
        <v-icon icon="mdi-home-alert-outline" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-md text-grey-darken-2 font-weight-bold">Aún no tienes haciendas vinculadas</h3>
        <p class="  text-grey-darken-1 mt-1">
          Las haciendas deben solicitar vinculación contigo desde su directorio usando tu número de colegiatura.
        </p>
      </div>

      <!-- Haciendas Grid -->
      <v-row v-else>
        <v-col
          v-for="hacienda in haciendasActivas"
          :key="hacienda.id"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card class="h-100 d-flex flex-column border rounded-xl overflow-hidden bg-surface hover-card" elevation="2">
            <!-- Header Card Gradient and Avatar -->
            <div class="position-relative">
              <div class="w-100" style="height: 70px; background: linear-gradient(135deg, rgba(63,81,181,0.8) 0%, rgba(26,35,126,0.8) 100%);">
                <v-badge
                  color="orange"
                  :content="hacienda.pendingCount"
                  :model-value="hacienda.pendingCount > 0"
                  class="position-absolute top-0 right-0 ma-2"
                >
                  <v-icon v-if="hacienda.pendingCount > 0" icon="mdi-bell" color="white" size="20"></v-icon>
                </v-badge>
              </div>
              <div class="px-5 position-relative d-flex align-end" style="margin-top: -35px; gap: 16px;">
                <v-avatar size="70" class="border-md border-white bg-surface elevation-2">
                  <v-img v-if="hacienda.avatar" :src="pb.files.getUrl(hacienda, hacienda.avatar, { thumb: '100x100' })" alt="Avatar">
                    <template v-slot:placeholder>
                      <div class="d-flex align-center justify-center bg-indigo-lighten-4 text-h5 font-weight-bold fill-height text-indigo-darken-4 w-100">
                        {{ hacienda.nombre ? hacienda.nombre.charAt(0).toUpperCase() : 'H' }}
                      </div>
                    </template>
                  </v-img>
                  <div v-else class="d-flex align-center justify-center bg-indigo-lighten-4 text-h5 font-weight-bold fill-height text-indigo-darken-4 w-100">
                    {{ hacienda.nombre ? hacienda.nombre.charAt(0).toUpperCase() : 'H' }}
                  </div>
                </v-avatar>
                <div class="pb-1 overflow-hidden flex-grow-1">
                  <h3 class="font-weight-bold text-truncate mb-0 text-high-emphasis text-h6">
                    {{ hacienda.nombre }}
                  </h3>
                  <div class="text-xs text-medium-emphasis text-truncate d-flex align-center mt-1">
                    <v-icon icon="mdi-map-marker" size="small" class="mr-1" color="indigo-lighten-1"></v-icon>
                    {{ hacienda.provincia || 'Ecuador' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Body Card -->
            <v-card-text class="flex-grow-1 pt-5 pb-3">
              <v-row dense class="mb-2">
                <v-col cols="12">
                  <div class="d-flex align-center text-body-2">
                    <v-icon icon="mdi-account-tie" color="indigo-lighten-1" size="small" class="mr-2"></v-icon>
                    <span class="text-medium-emphasis mr-1">Propietario:</span>
                    <span class="font-weight-medium text-truncate">{{ hacienda.ownerName || 'N/A' }}</span>
                  </div>
                </v-col>
                <v-col cols="12" v-if="hacienda.superficie">
                  <div class="d-flex align-center text-body-2">
                    <v-icon icon="mdi-texture-box" color="indigo-lighten-1" size="small" class="mr-2"></v-icon>
                    <span class="font-weight-medium">{{ hacienda.superficie }} Hectáreas</span>
                  </div>
                </v-col>
                <v-col cols="12" v-if="hacienda.siembras && hacienda.siembras.length > 0">
                  <div class="d-flex flex-wrap mt-1" style="gap: 4px;">
                    <v-chip 
                      v-for="(siembra, idx) in hacienda.siembras" 
                      :key="idx"
                      size="x-small" 
                      color="green-darken-1" 
                      variant="flat"
                      class="text-white font-weight-bold"
                    >
                      {{ siembra.nombre }} <span v-if="siembra.tipo" class="ml-1 font-weight-regular" style="opacity: 0.85">({{ siembra.tipo }})</span>
                    </v-chip>
                  </div>
                </v-col>
              </v-row>

              <v-chip size="small" color="indigo" variant="tonal" class="mt-2 font-weight-bold w-100 justify-center">
                <v-icon start icon="mdi-package-variant-closed" size="small"></v-icon>
                {{ hacienda.totalPackages }} Paquetes Compartidos
              </v-chip>
            </v-card-text>

            <!-- Acciones Card -->
            <v-divider></v-divider>
            <v-card-actions class="px-4 py-3 bg-grey-lighten-5">
              <v-btn
                block
                color="indigo-darken-1"
                variant="flat"
                class="font-weight-bold text-white rounded-lg"
                prepend-icon="mdi-folder-open"
                @click="goToHacienda(hacienda)"
              >
                Abrir Expedientes
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
        </v-window-item>

        <v-window-item value="pendientes">
          <div v-if="loading" class="d-flex justify-center align-center py-12">
            <v-progress-circular indeterminate color="orange" size="64" width="6"></v-progress-circular>
          </div>
          <div v-else-if="haciendasPendientes.length === 0" class="text-center py-12">
            <v-icon icon="mdi-check-all" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
            <h3 class="text-md text-grey-darken-2 font-weight-bold">No tienes solicitudes pendientes</h3>
          </div>
          <v-row v-else>
            <v-col v-for="req in haciendasPendientes" :key="req.vinculacionId" cols="12" sm="6" md="4">
              <v-card class="h-100 d-flex flex-column elevation-3 hover-card rounded-lg overflow-hidden border border-orange-lighten-3">
                <div class="bg-orange-darken-2 py-4 px-5 text-white d-flex align-center justify-space-between">
                  <div>
                    <h3 class="text-h6 font-weight-bold text-truncate mb-0">{{ req.nombre }}</h3>
                    <span class="text-xs text-orange-lighten-4 d-block">Solicitud de Conexión</span>
                  </div>
                </div>
                <v-card-text class="flex-grow-1 pt-4 pb-2">
                  <div class="d-flex align-center mb-3">
                    <v-icon icon="mdi-account" color="orange" class="mr-2"></v-icon>
                    <div><span class="text-xs text-grey d-block">Propietario</span><span class="text-sm font-weight-medium">{{ req.ownerName }}</span></div>
                  </div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions class="px-5 py-3 bg-grey-lighten-5 d-flex gap-2">
                  <v-btn flex-grow-1 color="green" variant="flat" @click="responderSolicitud(req.vinculacionId, 'activa')">Aceptar</v-btn>
                  <v-btn flex-grow-1 color="red" variant="tonal" @click="responderSolicitud(req.vinculacionId, 'rechazada')">Rechazar</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import UniversalHeader from '@/components/UniversalHeader.vue'

const router = useRouter()
const authStore = useAuthStore()
const uiFeedback = useUiFeedbackStore()

const loading = ref(false)
const activeTab = ref('activas')
const haciendasActivas = ref([])
const haciendasPendientes = ref([])

const userRole = computed(() => {
  return authStore.user?.role === 'asesor' ? 'Asesor Técnico' : 'Superadmin'
})
const avatarUrl = computed(() => {
  return authStore.avatarUrl || 'https://ui-avatars.com/api/?name=Asesor&background=E8EAF6&color=3F51B5'
})

onMounted(async () => {
  await fetchHaciendas()
})

const fetchHaciendas = async () => {
  loading.value = true
  try {
    const vinculacionesAll = await pb.collection('vinculaciones_asesor').getFullList({
      filter: `asesor_id="${authStore.user.id}"`,
      sort: '-created'
    })

    const activas = vinculacionesAll.filter(v => v.estado === 'activa')
    const pendientes = vinculacionesAll.filter(v => v.estado === 'pendiente')

    haciendasActivas.value = await Promise.all(activas.map(async (v) => {
      let hDetails = {
        id: v.hacienda_id,
        nombre: 'Hacienda Vinculada',
        provincia: 'Ecuador',
        superficie: 0,
        ownerName: 'N/A',
        ownerEmail: 'N/A',
        pendingCount: 0,
        totalPackages: 0,
        avatar: null,
        collectionId: '',
        collectionName: '',
        siembras: []
      }

      try {
        // Fetch Hacienda record
        const h = await pb.collection('Haciendas').getOne(v.hacienda_id)
        hDetails.nombre = h.name || 'Hacienda Vinculada'
        hDetails.provincia = h.location || 'Ecuador'
        hDetails.superficie = h.area || 0
        hDetails.avatar = h.avatar
        hDetails.collectionId = h.collectionId
        hDetails.collectionName = h.collectionName

        // Fetch Owner User details
        const u = await pb.collection('users').getFirstListItem(`hacienda="${v.hacienda_id}" && role="administrador"`)
        hDetails.ownerName = `${u.name} ${u.lastname}`
        hDetails.ownerEmail = u?.email
      } catch (err) {
        console.warn('Could not fetch all hacienda details:', err)
      }

      try {
        const siembrasList = await pb.collection('Siembras').getFullList({
          filter: `hacienda="${v.hacienda_id}"`
        })
        hDetails.siembras = siembrasList.map(s => ({
          nombre: s.nombre,
          tipo: s.tipo
        }))
      } catch (err) {
        console.warn('Could not fetch siembras:', err)
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

    haciendasPendientes.value = await Promise.all(pendientes.map(async (v) => {
      let pDetails = { vinculacionId: v.id, hacienda_id: v.hacienda_id, nombre: 'Cargando...', ownerName: 'Cargando...' }
      try {
        const h = await pb.collection('Haciendas').getOne(v.hacienda_id)
        pDetails.nombre = h.name || 'Cargando...'
        const u = await pb.collection('users').getFirstListItem(`hacienda="${v.hacienda_id}" && role="administrador"`)
        pDetails.ownerName = `${u.name} ${u.lastname}`
      } catch (e) {
        console.warn(`No se pudo cargar detalles de hacienda pendiente ${v.hacienda_id}:`, e.message)
        pDetails.nombre = 'Hacienda no disponible / Eliminada'
        pDetails.ownerName = 'Sin información'
        pDetails.error = true
      }
      return pDetails
    }))

  } catch (error) {
    handleError(error, 'Error al cargar las haciendas vinculadas')
  } finally {
    loading.value = false
  }
}

const responderSolicitud = async (vinculacionId, nuevoEstado) => {
  uiFeedback.showLoading()
  try {
    await pb.collection('vinculaciones_asesor').update(vinculacionId, {
      estado: nuevoEstado,
      fecha_vinculacion: nuevoEstado === 'activa' ? new Date().toISOString() : null
    })
    uiFeedback.showSnackbar(`Solicitud ${nuevoEstado === 'activa' ? 'aceptada' : 'rechazada'}`, 'success')
    await fetchHaciendas()
  } catch (error) {
    handleError(error, 'Error al responder solicitud')
  } finally {
    uiFeedback.hideLoading()
  }
}

const goToHacienda = (hacienda) => {
  router.push(`/asesor/haciendas/${hacienda.id}`)
}
</script>

<style scoped>
.bg-gradient-indigo {
  background: linear-gradient(135deg, #3949AB 0%, #1A237E 100%);
}
.hover-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(26, 35, 126, 0.15) !important;
}
</style>
