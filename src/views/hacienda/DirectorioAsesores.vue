<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <!-- Header -->

      <header role="banner" class="bg-background shadow-sm">
        <div class="profile-container">
          <h3 class="profile-title" id="dashboard-welcome-title">
           Directorio de Asesores Técnicos
            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
              {{ t('roles.' + userRole) }}
            </v-chip>

            <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
              {{ t('dashboard.hacienda') }}: {{ mi_hacienda.name }}
            </v-chip>
       
          </h3>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>

      <!-- Filtros -->
      <v-card class="m-4 rounded-lg">
        <v-card-text class="pt-6">
          <v-row>
            <v-col cols="12" md="4" lg="5">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                label="Buscar por nombre o apellido..."
                variant="outlined"
                density="compact"
                hide-details
                color="primary"
                @input="onSearchInput"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="4" lg="3">
              <v-select
                v-model="selectedEspecialidades"
                :items="ESPECIALIDADES"
                prepend-inner-icon="mdi-sprout"
                label="Especialidad"
                multiple
                chips
                clearable
                variant="outlined"
                density="compact"
                hide-details
                color="primary"
                @update:model-value="applyFilters"
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6" md="4" lg="4">
              <v-select
                v-model="selectedProvincias"
                :items="PROVINCIAS"
                prepend-inner-icon="mdi-map-marker"
                label="Provincias de Cobertura"
                multiple
                chips
                clearable
                variant="outlined"
                density="compact"
                hide-details
                color="primary"
                @update:model-value="applyFilters"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Cargando / Sin Resultados -->
      <div v-if="asesoresStore.loading" class="d-flex justify-center align-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" width="6"></v-progress-circular>
      </div>

      <div v-else-if="asesoresStore.asesores.length === 0" class="text-center py-12">
        <v-icon icon="mdi-account-question-outline" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-md text-grey-darken-2 font-weight-bold">No se encontraron asesores</h3>
        <p class="  text-grey-darken-1 mt-1">Prueba a ajustar los criterios de búsqueda o filtros.</p>
      </div>

      <!-- Grid de Asesores -->
      <v-row v-else>
        <v-col
          v-for="asesor in asesoresStore.asesores"
          :key="asesor.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card class="h-100 d-flex flex-column border rounded-xl overflow-hidden bg-surface" elevation="0">
            <!-- Header Elegante -->
            <div class="position-relative">
              <!-- Banner superior sutil (adaptable a oscuro/claro) -->
              <div class="w-100" style="height: 60px; background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.15) 0%, rgba(var(--v-theme-primary), 0.05) 100%);"></div>
              
              <div class="px-4 position-relative d-flex align-end" style="margin-top: -30px; gap: 12px;">
                <v-avatar size="64" class="border bg-surface elevation-1">
                  <v-img :src="getAvatar(asesor)" alt="Avatar">
                    <template v-slot:placeholder>
                      <div class="d-flex align-center justify-center bg-primary-lighten-4 text-h6 font-weight-bold fill-height text-primary">
                        {{ getInitials(asesor) }}
                      </div>
                    </template>
                  </v-img>
                </v-avatar>
                <div class="pb-1 overflow-hidden flex-grow-1">
                  <h3 class="  font-weight-bold text-truncate mb-0 text-high-emphasis">
                    {{ asesor.name }} {{ asesor.lastname }}
                  </h3>
                  <div class="text-xs text-medium-emphasis text-truncate">
                    Reg: {{ asesor.parsedInfo?.numero_colegiatura || 'N/A' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Body Card -->
            <v-card-text class="flex-grow-1 pt-4 pb-2">
              <!-- Especialidades -->
              <div class="mb-3">
                <div class="text-xs font-weight-bold text-medium-emphasis mb-1">Especialidades:</div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="(spec, idx) in limitItems(asesor.parsedInfo?.especialidades, 3)"
                    :key="spec"
                    size="x-small"
                    color="teal"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ spec }}
                  </v-chip>
                  <v-chip
                    v-if="asesor.parsedInfo?.especialidades?.length > 3"
                    size="x-small"
                    color="teal"
                    variant="outlined"
                    class="font-weight-bold"
                  >
                    +{{ asesor.parsedInfo.especialidades.length - 3 }}
                  </v-chip>
                </div>
              </div>

              <!-- Cobertura -->
              <div class="mb-3">
                <div class="text-xs font-weight-bold text-medium-emphasis mb-1">Zonas Cobertura:</div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="zone in limitItems(asesor.parsedInfo?.zonas_cobertura, 2)"
                    :key="zone"
                    size="x-small"
                    color="blue"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ zone }}
                  </v-chip>
                  <v-chip
                    v-if="asesor.parsedInfo?.zonas_cobertura?.length > 2"
                    size="x-small"
                    color="blue"
                    variant="outlined"
                    class="font-weight-bold"
                  >
                    +{{ asesor.parsedInfo.zonas_cobertura.length - 2 }}
                  </v-chip>
                </div>
              </div>

              <!-- Bio -->
              <div>
                <p class="text-xs text-medium-emphasis font-italic" style="line-height: 1.3;">
                  "{{ truncateText(asesor.parsedInfo?.bio_corta, 110) }}"
                </p>
              </div>
            </v-card-text>

            <!-- Acciones Card -->
            <v-divider></v-divider>
            <v-card-actions class="px-4 py-3">
              <v-btn
                v-if="getEstado(asesor.id) === 'ninguna'"
                block
                color="primary"
                variant="flat"
                class="font-weight-bold"
                prepend-icon="mdi-account-plus"
                @click="solicitar(asesor.id)"
              >
                Solicitar Vinculación
              </v-btn>
              
              <v-btn
                v-else-if="getEstado(asesor.id) === 'pendiente'"
                block
                disabled
                color="orange"
                variant="tonal"
                class="font-weight-bold"
                prepend-icon="mdi-clock-outline"
              >
                Solicitud Pendiente
              </v-btn>

              <v-btn
                v-else-if="getEstado(asesor.id) === 'activa'"
                block
                color="teal"
                variant="tonal"
                class="font-weight-bold"
                prepend-icon="mdi-card-account-mail"
                @click="verAsesor(asesor)"
              >
                Ver Asesor (Recetas)
              </v-btn>

              <v-btn
                v-else-if="getEstado(asesor.id) === 'revocada'"
                block
                color="grey"
                variant="tonal"
                class="font-weight-bold"
                prepend-icon="mdi-refresh"
                @click="reconectar(asesor.id)"
              >
                Reconectar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAsesoresStore } from '@/stores/asesoresStore'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { debounce } from '@/utils/debounce'
import EnviarPaqueteWizard from '@/components/forms/asesores/EnviarPaqueteWizard.vue'

const router = useRouter()
const { t } = useI18n()
const asesoresStore = useAsesoresStore()
const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()
const avatarStore = useAvatarStore()

const { userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const searchQuery = ref('')
const selectedEspecialidades = ref([])
const selectedProvincias = ref([])

// Wizard variables
const wizardOpen = ref(false)
const selectedAsesor = ref(null)
const selectedVinculacionId = ref('')

const PROVINCIAS = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"]
const ESPECIALIDADES = ["Banano", "Cacao", "Suelos", "Flores", "Frutales","Pitahaya","Riego", "Cítricos", "Hortalizas", "Ganadería", "Otro"]

onMounted(async () => {
  await asesoresStore.fetchMisVinculaciones(authStore.user?.hacienda)
  await asesoresStore.fetchAsesores()
})

const getAvatar = (user) => {
  return avatarStore.getAvatarUrl({ ...user, type: 'user' }, 'users')
}

const getInitials = (user) => {
  const first = user.name ? user.name[0] : ''
  const last = user.lastname ? user.lastname[0] : ''
  return (first + last).toUpperCase()
}

const limitItems = (arr, limit) => {
  return arr && Array.isArray(arr) ? arr.slice(0, limit) : []
}

const truncateText = (text, len) => {
  if (!text) return 'Sin descripción profesional registrada.'
  return text.length > len ? text.substring(0, len) + '...' : text
}

const getEstado = (asesorId) => {
  return asesoresStore.estadoVinculacion(asesorId)
}

const applyFilters = () => {
  asesoresStore.filtros.search = searchQuery.value
  asesoresStore.filtros.especialidad = selectedEspecialidades.value
  asesoresStore.filtros.provincia = selectedProvincias.value
  asesoresStore.fetchAsesores()
}

const onSearchInput = debounce(() => {
  applyFilters()
}, 300)

const solicitar = async (asesorId) => {
  await asesoresStore.solicitarVinculacion(asesorId, authStore.user?.hacienda)
}

const reconectar = async (asesorId) => {
  const vinc = asesoresStore.getVinculacion(asesorId)
  if (vinc) {
    await asesoresStore.revocarOReconectarVinculacion(vinc.id, 'pendiente')
  }
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
