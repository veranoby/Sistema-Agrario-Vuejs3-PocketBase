<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <!-- Header -->

      <UniversalHeader 
        title="Directorio de Asesores Técnicos"
        :bgImage="avatarHaciendaUrl"
        icon="mdi-account-group"
      >
        <template #chips>
          <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
            {{ t('roles.' + userRole) }}
          </v-chip>

          <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
            {{ t('dashboard.hacienda') }}: {{ mi_hacienda.name }}
          </v-chip>
        </template>
      </UniversalHeader>

      <!-- Tabs de Navegación -->
      <v-tabs v-model="tab" color="primary" class="border-b border-grey-lighten-2 mb-4 mt-2">
        <v-tab value="mis-asesores" class="font-weight-bold">
          <v-icon start icon="mdi-account-star"></v-icon>
          Mis Asesores
        </v-tab>
        <v-tab value="marketplace" class="font-weight-bold">
          <v-icon start icon="mdi-store-search"></v-icon>
          Marketplace & Búsqueda
        </v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- PESTAÑA 1: MIS ASESORES -->
        <v-window-item value="mis-asesores">
          <div v-if="asesoresVinculados.length === 0" class="text-center py-12">
            <v-icon icon="mdi-account-group-outline" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
            <h3 class="text-md text-grey-darken-2 font-weight-bold">Aún no tienes asesores vinculados</h3>
            <p class="text-grey-darken-1 mt-1">Busca y solicita vinculación a agrónomos acreditados en nuestro Marketplace.</p>
            <v-btn
              color="teal-darken-3"
              variant="flat"
              class="mt-3 font-weight-bold text-white rounded-lg"
              prepend-icon="mdi-store-search"
              @click="tab = 'marketplace'"
            >
              Explorar Marketplace & Búsqueda
            </v-btn>
          </div>
          <v-row v-else>
            <v-col v-for="asesor in asesoresVinculados" :key="asesor.id" cols="12" sm="6" md="4" lg="3">
              <v-card class="h-100 d-flex flex-column border rounded-xl overflow-hidden bg-surface hover-card" elevation="1">
                <div class="position-relative">
                  <div class="w-100" style="height: 60px; background: linear-gradient(135deg, rgba(0,121,107,0.8) 0%, rgba(0,77,64,0.8) 100%);"></div>
                  <div class="px-4 position-relative d-flex align-end" style="margin-top: -30px; gap: 12px;">
                    <v-avatar size="64" class="border bg-surface elevation-1">
                      <v-img :src="getAvatar(asesor)" alt="Avatar">
                        <template v-slot:placeholder>
                          <div class="d-flex align-center justify-center bg-teal-lighten-4 text-h6 font-weight-bold fill-height text-teal-darken-4">
                            {{ getInitials(asesor) }}
                          </div>
                        </template>
                      </v-img>
                    </v-avatar>
                    <div class="pb-1 overflow-hidden flex-grow-1">
                      <h3 class="font-weight-bold text-truncate mb-0 text-high-emphasis">
                        {{ asesor.name }} {{ asesor.lastname }}
                      </h3>
                      <div class="text-xs text-medium-emphasis text-truncate">
                        Reg: {{ asesor.parsedInfo?.numero_colegiatura || 'N/A' }}
                      </div>
                    </div>
                  </div>
                </div>
                <v-card-text class="flex-grow-1 pt-4 pb-2">
                  <v-chip 
                    size="small" 
                    :color="getEstado(asesor.id) === 'activa' ? 'teal' : 'orange-darken-2'" 
                    variant="flat" 
                    class="mb-2 font-weight-bold text-white"
                  >
                    {{ getEstado(asesor.id) === 'activa' ? 'Vinculación Activa' : 'Solicitud Pendiente' }}
                  </v-chip>
                  
                  <v-chip
                    v-if="getUnreadMessages(asesor.id) > 0"
                    size="small"
                    color="red-darken-1"
                    variant="flat"
                    class="mb-2 ml-1 font-weight-bold text-white"
                  >
                    {{ getUnreadMessages(asesor.id) }} nuevo{{ getUnreadMessages(asesor.id) > 1 ? 's' : '' }}
                  </v-chip>
                  <p class="text-xs text-medium-emphasis italic-bio">
                    "{{ truncateText(asesor.parsedInfo?.bio_corta, 80) }}"
                  </p>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions class="px-4 py-3 bg-grey-lighten-5">
                  <v-btn 
                    block 
                    color="teal-darken-2" 
                    variant="flat" 
                    class="font-weight-bold text-white rounded-lg" 
                    prepend-icon="mdi-forum" 
                    :disabled="getEstado(asesor.id) !== 'activa'"
                    @click="verAsesor(asesor)"
                  >
                    Comunicaciones y Paquetes
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- PESTAÑA 2: MARKETPLACE & BÚSQUEDA -->
        <v-window-item value="marketplace">
          <MarketplaceAsesores />
        </v-window-item>
      </v-window>
    </div>

    <!-- Wizard de Envío (Dialog) -->
    <EnviarPaqueteWizard
      v-model="wizardOpen"
      :asesor="selectedAsesor"
      :vinculacionId="selectedVinculacionId"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAsesoresStore } from '@/stores/asesoresStore'
import { useAuthStore } from '@/stores/authStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { pb } from '@/utils/pocketbase'
import EnviarPaqueteWizard from '@/components/forms/asesores/EnviarPaqueteWizard.vue'
import MarketplaceAsesores from '@/views/asesores/MarketplaceAsesores.vue'
import UniversalHeader from '@/components/UniversalHeader.vue'

const router = useRouter()
const asesoresStore = useAsesoresStore()
const authStore = useAuthStore()
const avatarStore = useAvatarStore()

// Wizard variables
const wizardOpen = ref(false)
const selectedAsesor = ref(null)
const selectedVinculacionId = ref('')

const tab = ref('mis-asesores')

const asesoresVinculados = computed(() => {
  return asesoresStore.asesores.filter(a => ['activa', 'pendiente'].includes(getEstado(a.id)))
})

const unreadMessagesMap = ref({})

onMounted(async () => {
  await asesoresStore.fetchMisVinculaciones(authStore.user?.hacienda)
  await asesoresStore.fetchAsesores()

  if (asesoresVinculados.value.length > 0) {
    try {
      const vincIds = asesoresVinculados.value.map(a => asesoresStore.getVinculacion(a.id)?.id).filter(Boolean)
      if (vincIds.length > 0) {
        const filterStr = vincIds.map(id => `vinculacion_id="${id}"`).join(' || ')
        const msgs = await pb.collection('comunicaciones_asesoria').getFullList({
          filter: `leido=false && emisor_id!="${authStore.user.id}" && (${filterStr})`
        })
        
        const map = {}
        msgs.forEach(m => {
          const vinculacion = asesoresStore.vinculaciones.find(v => v.id === m.vinculacion_id)
          if (vinculacion && vinculacion.asesor_id) {
            map[vinculacion.asesor_id] = (map[vinculacion.asesor_id] || 0) + 1
          }
        })
        unreadMessagesMap.value = map
      }
    } catch(e) {
      console.warn('Could not load unread messages', e)
    }
  }
})

const getUnreadMessages = (asesorId) => {
  return unreadMessagesMap.value[asesorId] || 0
}

const getAvatar = (user) => {
  return avatarStore.getAvatarUrl({ ...user, type: 'user' }, 'users')
}

const getInitials = (user) => {
  const first = user.name ? user.name[0] : ''
  const last = user.lastname ? user.lastname[0] : ''
  return (first + last).toUpperCase()
}

const truncateText = (text, len) => {
  if (!text) return 'Sin descripción profesional registrada.'
  return text.length > len ? text.substring(0, len) + '...' : text
}

const getEstado = (asesorId) => {
  return asesoresStore.estadoVinculacion(asesorId)
}

const verAsesor = (asesor) => {
  router.push(`/hacienda/mis-asesores/${asesor.id}/recetas`)
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
.gap-1 {
  gap: 4px;
}
.gap-3 {
  gap: 12px;
}
.gap-4 {
  gap: 16px;
}
.italic-bio {
  font-style: italic;
  line-height: 1.4;
  color: #555;
}
.border-2 {
  border-width: 2px !important;
}
</style>
