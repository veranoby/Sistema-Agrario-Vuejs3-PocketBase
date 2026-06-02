<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <!-- Subscription Checking Loader -->
    <div v-if="checkingSubscription" class="w-100 d-flex justify-center align-center py-12">
      <v-progress-circular indeterminate color="teal" size="64" width="6"></v-progress-circular>
    </div>

    <!-- Payment Required Overlay (Subscription Inactive) -->
    <div v-else-if="!subscriptionActive" class="w-100 max-width-800 mx-auto py-6">
      <v-card class="elevation-4 rounded-xl overflow-hidden border border-orange-lighten-4">
        <div class="bg-gradient-orange py-6 px-6 text-white text-center">
          <v-icon icon="mdi-credit-card-off-outline" size="72" class="mb-3"></v-icon>
          <h2 class="text-h4 font-weight-black">Suscripción Inactiva</h2>
          <p class="text-subtitle-1 opacity-90 mt-2">
            Tu cuenta de Asesor Técnico requiere una suscripción mensual activa de <strong>$5.00 USD</strong>.
          </p>
        </div>

        <v-card-text class="pa-6">
          <h3 class="text-h6 font-weight-bold text-teal-darken-3 mb-4">Instrucciones de Pago</h3>
          
          <p class="text-body-1 text-grey-darken-3 mb-4">
            Para activar tu perfil y aparecer en el directorio visible para todas las haciendas asociadas de ConAgri, realiza el depósito o transferencia bancaria mensual:
          </p>

          <v-card variant="outlined" class="rounded-lg border-teal pa-4 bg-teal-lighten-5 mb-6 text-teal-darken-4">
            <v-row>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Banco:</strong> Banco Pichincha
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Tipo de Cuenta:</strong> Ahorros
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Número de Cuenta:</strong> 2208574932
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Beneficiario:</strong> Soluciones Agrícolas ConAgri S.A.
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>RUC:</strong> 1792837492001
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Monto Mensual:</strong> $5.00 USD
              </v-col>
            </v-row>
          </v-card>

          <div class="bg-grey-lighten-4 pa-4 rounded-lg border border-grey-lighten-3 mb-4">
            <span class="text-subtitle-2 font-weight-bold text-grey-darken-3 d-block mb-1">
              ¿Ya realizaste tu transferencia?
            </span>
            <p class="text-body-2 text-grey-darken-2 mb-3">
              Envía el comprobante digital de pago a <strong>pagos@conagri.com</strong> o súbelo directamente en tu perfil para agilizar el proceso. El equipo administrativo validará tu transacción y activará tu cuenta en un lapso menor a 2 horas.
            </p>
            <v-btn
              color="teal-darken-2"
              variant="flat"
              class="font-weight-bold text-white rounded-lg px-6"
              prepend-icon="mdi-account-circle"
              @click="router.push('/asesor/perfil')"
            >
              Ir a Mi Perfil a Enviar Comprobante
            </v-btn>
          </div>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="px-6 py-4 bg-grey-lighten-5 d-flex justify-space-between align-center">
          <span class="text-caption text-grey-darken-1">
            Soporte Administrativo: +593 99 999 9999
          </span>
          <v-btn
            color="orange-darken-2"
            variant="flat"
            class="font-weight-bold text-white rounded-lg px-6"
            prepend-icon="mdi-whatsapp"
            href="https://wa.me/593999999999"
            target="_blank"
          >
            Reportar Pago Vía WhatsApp
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <!-- Active Subscription Dashboard -->
    <div v-else class="w-100">
      <!-- Header -->
      <v-row class="mb-4">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between flex-wrap gap-4">
            <div>
              <h1 class="text-h4 font-weight-bold text-teal-darken-3 mb-1">
                Panel de Control de Asesoría
              </h1>
              <p class="text-subtitle-1 text-grey-darken-1">
                Bienvenido, Dr. {{ authStore.user?.name }} {{ authStore.user?.lastname }}. Gestiona tus haciendas vinculadas y emite recetas técnicas fitosanitarias.
              </p>
            </div>
            
            <v-chip color="teal-darken-2" variant="flat" class="text-white font-weight-bold px-4 py-2">
              <v-icon start icon="mdi-shield-check" class="mr-1"></v-icon>
              Profesional Agrícola Certificado
            </v-chip>
          </div>
        </v-col>
      </v-row>

      <!-- Metricas -->
      <v-row class="mb-6">
        <v-col cols="12" sm="4">
          <v-card class="elevation-3 hover-card rounded-xl bg-gradient-teal text-white">
            <v-card-text class="d-flex align-center justify-space-between pa-6">
              <div>
                <span class="text-subtitle-1 opacity-90 font-weight-medium">Mis Haciendas Activas</span>
                <h2 class="text-h3 font-weight-black mt-2">{{ activeFarmsCount }}</h2>
              </div>
              <v-icon icon="mdi-barn" size="56" class="opacity-80"></v-icon>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card class="elevation-3 hover-card rounded-xl bg-gradient-orange text-white">
            <v-card-text class="d-flex align-center justify-space-between pa-6">
              <div>
                <span class="text-subtitle-1 opacity-90 font-weight-medium">Paquetes Pendientes</span>
                <h2 class="text-h3 font-weight-black mt-2">{{ pendingPackagesCount }}</h2>
              </div>
              <v-icon icon="mdi-package-variant-closed" size="56" class="opacity-80"></v-icon>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card class="elevation-3 hover-card rounded-xl bg-gradient-blue text-white">
            <v-card-text class="d-flex align-center justify-space-between pa-6">
              <div>
                <span class="text-subtitle-1 opacity-90 font-weight-medium">Recetas en Borrador</span>
                <h2 class="text-h3 font-weight-black mt-2">{{ draftPrescriptionsCount }}</h2>
              </div>
              <v-icon icon="mdi-file-document-edit" size="56" class="opacity-80"></v-icon>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Activity Section -->
      <v-row>
        <!-- Left: Pending Packages -->
        <v-col cols="12" md="6">
          <v-card class="elevation-3 rounded-xl h-100 border border-grey-lighten-3">
            <v-card-title class="bg-grey-lighten-4 py-4 px-6 d-flex align-center justify-space-between">
              <span class="text-h6 font-weight-bold text-grey-darken-3">Últimos Paquetes Recibidos</span>
              <v-btn size="small" variant="text" color="teal" class="font-weight-bold" @click="router.push('/asesor/haciendas')">
                Ver Todas
              </v-btn>
            </v-card-title>
            <v-card-text class="pa-0">
              <v-list v-if="recentPackages.length > 0" class="py-0">
                <template v-for="(pkg, idx) in recentPackages" :key="pkg.id">
                  <v-list-item class="py-4 px-6 hover-list" @click="goToHacienda(pkg.haciendaId)">
                    <template v-slot:prepend>
                      <v-avatar color="orange-lighten-5" class="mr-3">
                        <v-icon icon="mdi-package-variant" color="orange-darken-2"></v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-bold text-teal-darken-4 text-subtitle-1">
                      {{ pkg.haciendaNombre }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-body-2 mt-1">
                      {{ pkg.notas_hacienda ? `"${pkg.notas_hacienda}"` : 'Sin notas aclaratorias' }}
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="text-right">
                        <v-chip size="x-small" :color="pkg.estado === 'enviado' ? 'orange' : 'teal'" class="text-white font-weight-bold mb-1">
                          {{ pkg.estado === 'enviado' ? 'Nuevo' : 'Revisado' }}
                        </v-chip>
                        <span class="text-caption text-grey d-block">{{ formatDate(pkg.created) }}</span>
                      </div>
                    </template>
                  </v-list-item>
                  <v-divider v-if="idx < recentPackages.length - 1"></v-divider>
                </template>
              </v-list>
              <div v-else class="text-center py-12">
                <v-icon icon="mdi-package-variant-outline" size="64" color="grey-lighten-1" class="mb-2"></v-icon>
                <p class="text-body-1 text-grey-darken-2">No has recibido paquetes de evaluación todavía.</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right: Recent Recipes -->
        <v-col cols="12" md="6">
          <v-card class="elevation-3 rounded-xl h-100 border border-grey-lighten-3">
            <v-card-title class="bg-grey-lighten-4 py-4 px-6 d-flex align-center justify-space-between">
              <span class="text-h6 font-weight-bold text-grey-darken-3">Últimas Recetas Emitidas</span>
            </v-card-title>
            <v-card-text class="pa-0">
              <v-list v-if="recentPrescriptions.length > 0" class="py-0">
                <template v-for="(receta, idx) in recentPrescriptions" :key="receta.id">
                  <v-list-item class="py-4 px-6 hover-list" @click="goToHacienda(receta.haciendaId)">
                    <template v-slot:prepend>
                      <v-avatar color="teal-lighten-5" class="mr-3">
                        <v-icon icon="mdi-file-document-edit" color="teal-darken-2"></v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-bold text-grey-darken-4 text-subtitle-1">
                      {{ receta.titulo || 'Receta Agrícola' }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-body-2 mt-1">
                      {{ receta.producto_recomendado || 'N/A' }} — Dosis: {{ receta.dosis }} {{ receta.unidad_dosis }}
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="text-right">
                        <v-chip size="x-small" :color="getRecipeStatusColor(receta.estado)" class="text-white font-weight-bold mb-1">
                          {{ getRecipeStatusLabel(receta.estado) }}
                        </v-chip>
                        <span class="text-caption text-grey d-block">{{ formatDate(receta.created) }}</span>
                      </div>
                    </template>
                  </v-list-item>
                  <v-divider v-if="idx < recentPrescriptions.length - 1"></v-divider>
                </template>
              </v-list>
              <div v-else class="text-center py-12">
                <v-icon icon="mdi-file-document-outline" size="64" color="grey-lighten-1" class="mb-2"></v-icon>
                <p class="text-body-1 text-grey-darken-2">No has emitido recetas agrícolas todavía.</p>
              </div>
            </v-card-text>
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

const checkingSubscription = ref(true)
const subscriptionActive = ref(false)

const activeFarmsCount = ref(0)
const pendingPackagesCount = ref(0)
const draftPrescriptionsCount = ref(0)

const recentPackages = ref([])
const recentPrescriptions = ref([])

onMounted(async () => {
  try {
    // 0. Check subscription status in solicitudes_suscripcion
    try {
      const sub = await pb.collection('solicitudes_suscripcion').getFirstListItem(
        `solicitante="${authStore.user.id}"`
      )
      subscriptionActive.value = sub.estado === 'activa'
    } catch {
      subscriptionActive.value = false
    } finally {
      checkingSubscription.value = false
    }

    if (!subscriptionActive.value) return

    // 1. Fetch active vinculaciones count
    const vinculaciones = await pb.collection('vinculaciones_asesor').getFullList({
      filter: `asesor_id="${authStore.user.id}"`
    })
    
    const activeVinculaciones = vinculaciones.filter(v => v.estado === 'activa')
    activeFarmsCount.value = activeVinculaciones.length
    
    const activeVincIds = activeVinculaciones.map(v => v.id)

    if (activeVincIds.length > 0) {
      // Create pocketbase filter string for active vinculaciones
      const vincFilter = activeVincIds.map(id => `vinculacion_id="${id}"`).join(' || ')

      // 2. Fetch packages (evaluaciones)
      const pkgs = await pb.collection('paquetes_evaluacion').getFullList({
        filter: `(${vincFilter})`,
        sort: '-created'
      })
      
      pendingPackagesCount.value = pkgs.filter(p => p.estado === 'enviado').length
      
      // Enriquecer paquetes con nombre de hacienda
      recentPackages.value = await Promise.all(pkgs.slice(0, 5).map(async (p) => {
        const v = activeVinculaciones.find(x => x.id === p.vinculacion_id)
        let haciendaNombre = 'Hacienda'
        let haciendaId = ''
        if (v) {
          try {
            const h = await pb.collection('Haciendas').getOne(v.hacienda_id)
            haciendaNombre = h.nombre
            haciendaId = h.id
          } catch {}
        }
        return {
          ...p,
          haciendaNombre,
          haciendaId
        }
      }))

      // 3. Fetch recetas
      const recipes = await pb.collection('recetas').getFullList({
        filter: `(${vincFilter})`,
        sort: '-created'
      })

      draftPrescriptionsCount.value = recipes.filter(r => r.estado === 'borrador').length

      recentPrescriptions.value = recipes.slice(0, 5).map(r => {
        const v = activeVinculaciones.find(x => x.id === r.vinculacion_id)
        return {
          ...r,
          haciendaId: v ? v.hacienda_id : ''
        }
      })
    }
  } catch (error) {
    handleError(error, 'Error al cargar las métricas de asesoría')
  }
})

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

const goToHacienda = (haciendaId) => {
  if (haciendaId) {
    router.push(`/asesor/haciendas/${haciendaId}`)
  }
}

const getRecipeStatusColor = (state) => {
  switch (state) {
    case 'borrador':
      return 'blue'
    case 'enviada':
      return 'orange'
    case 'aprobada':
      return 'green'
    case 'rechazada':
      return 'red'
    default:
      return 'grey'
  }
}

const getRecipeStatusLabel = (state) => {
  switch (state) {
    case 'borrador':
      return 'Borrador'
    case 'enviada':
      return 'Enviada'
    case 'aprobada':
      return 'Aprobada'
    case 'rechazada':
      return 'Rechazada'
    default:
      return state
  }
}
</script>

<style scoped>
.bg-gradient-teal {
  background: linear-gradient(135deg, #00796B 0%, #004D40 100%);
}
.bg-gradient-orange {
  background: linear-gradient(135deg, #E65100 0%, #FF9800 100%);
}
.bg-gradient-blue {
  background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%);
}
.hover-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15) !important;
}
.hover-list {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.hover-list:hover {
  background-color: #F5F5F5;
}
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}
</style>
