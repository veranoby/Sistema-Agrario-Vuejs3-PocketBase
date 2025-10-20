<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                {{ t('sowings.sowing_management') }}
                <v-chip variant="flat" size="small" class="agricultural-chip agricultural-chip--info mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ userRole }}
                </v-chip>
                <v-chip variant="flat" size="small" class="agricultural-chip agricultural-chip--primary mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ mi_hacienda.name }}
                </v-chip>
              </h3>
            </div>
            <div class="w-full sm:w-auto z-10">
              <v-btn
                block
                sm:inline-flex
                size="large"
                variant="elevated"
                rounded="lg"
                prepend-icon="mdi-sprout"
                @click="nuevaSiembra"
                @keydown.enter="nuevaSiembra"
                @keydown.space.prevent="nuevaSiembra"
                class="agricultural-btn agricultural-btn--primary min-w-[210px]"
                :aria-label="t('sowings.new_sowing')"
                tabindex="0"
              >
                {{ t('sowings.new_sowing') }}
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <main class="flex-1 py-2">
      <v-container>
        <v-row>
          <v-alert v-if="siembras.length === 0" type="info" class="mt-4">
            {{ t('sowings.no_sowings') }}
          </v-alert>

          <v-col v-for="siembra in siembras" :key="siembra.id" cols="12" sm="6" md="4" lg="3">
            <v-card
              class="agricultural-card siembra-card"
              :class="getSiembraCardClass(siembra)"
              @click="abrirSiembra(siembra.id)"
              @keydown.enter="abrirSiembra(siembra.id)"
              @keydown.space.prevent="abrirSiembra(siembra.id)"
              elevation="2"
              :aria-label="`${t('sowings.sowing_status')}: ${siembra.nombre} ${siembra.tipo}, ${t('sowings.sowing_state')}: ${siembra.estado}`"
              role="button"
              tabindex="0"
            >
              <div class="compliance-header" :style="getSiembraHeaderStyle(siembra)">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon
                      :color="getSiembraStateColor(siembra.estado)"
                      size="large"
                      class="mr-3"
                      :aria-label="`${t('sowings.sowing_state')}: ${siembra.estado}`"
                    >
                      {{ getSiembraStateIcon(siembra.estado) }}
                    </v-icon>
                    <div>
                      <div class="compliance-title">{{ siembra.nombre }} {{ siembra.tipo }}</div>
                      <div class="compliance-subtitle">{{ t('sowings.initiated') }}: {{ formatDate(siembra.fecha_inicio) }}</div>
                    </div>
                  </div>
                  <div class="d-flex align-center ga-2 flex-wrap">
                    <v-chip
                      :color="getStatusColor(siembra.estado)"
                      size="small"
                      variant="elevated"
                      class="agricultural-chip"
                    >
                      <v-icon start size="small">mdi-leaf</v-icon>
                      {{ siembra.estado }}
                    </v-chip>
                    <v-chip
                      v-if="getZoneNames(siembra).length > 0 && !getZoneNames(siembra).includes(t('sowings.no_zones_assigned'))"
                      color="info"
                      size="small"
                      variant="outlined"
                      class="agricultural-chip"
                    >
                      <v-icon start size="small">mdi-map-marker</v-icon>
                      {{ getZoneNames(siembra).length }} {{ t('sowings.zones') }}
                    </v-chip>
                  </div>
                </div>
              </div>
              <v-card-text class="agricultural-content pa-0">
                <v-img
                  :src="getSiembraAvatarUrl(siembra)"
                  height="150px"
                  cover
                  class="siembra-image"
                >
                  <div
                    v-if="getZoneNames(siembra).length > 0 && !getZoneNames(siembra).includes(t('sowings.no_zones_assigned'))"
                    class="info-overlay"
                  >
                    <div class="d-flex flex-wrap ga-1">
                      <v-chip
                        v-for="(zona, index) in getZoneNames(siembra).slice(0, 3)"
                        :key="index"
                        size="x-small"
                        variant="flat"
                        class="agricultural-chip agricultural-chip--zone-overlay"
                      >
                        <v-icon start size="x-small">mdi-map-marker</v-icon>
                        {{ zona }}
                      </v-chip>
                      <v-chip
                        v-if="getZoneNames(siembra).length > 3"
                        size="x-small"
                        variant="flat"
                        class="agricultural-chip agricultural-chip--zone-overlay"
                      >
                        +{{ getZoneNames(siembra).length - 3 }} {{ t('sowings.more') }}
                      </v-chip>
                    </div>
                  </div>
                </v-img>
                <div class="pa-3">
                  <v-btn
                    variant="outlined"
                    block
                    @click.stop="abrirSiembra(siembra.id)"
                    class="agricultural-btn agricultural-btn--outline"
                    :aria-label="`${t('sowings.open_sowing')} ${siembra.nombre}`"
                  >
                    <v-icon start>mdi-open-in-app</v-icon>
                    {{ t('sowings.open_sowing') }}
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <v-dialog v-model="dialogNuevaSiembra" persistent max-width="500px">
      <v-card>
        <v-toolbar color="success" dark>
          <v-toolbar-title>{{ t('sowings.new_sowing') }}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-form @submit.prevent="crearSiembra">
          <v-card-text>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.nombre"
              :label="t('sowings.name_ex')"
              required
            ></v-text-field>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.tipo"
              :label="t('sowings.type_ex')"
              required
            ></v-text-field>
            <v-select
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.estado"
              :items="estadoOptions"
              :label="t('sowings.state')"
              required
            ></v-select>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.fecha_inicio"
              :label="t('sowings.start_date')"
              type="date"
              required
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              size="large"
              variant="elevated"
              rounded="lg"
              prepend-icon="mdi-cancel"
              @click="dialogNuevaSiembra = false"
              @keydown.enter="dialogNuevaSiembra = false"
              @keydown.space.prevent="dialogNuevaSiembra = false"
              class="agricultural-btn agricultural-btn--secondary"
              :aria-label="t('sowings.cancel')"
              tabindex="0"
            >
              {{ t('sowings.cancel') }}
            </v-btn>
            <v-btn
              type="submit"
              size="large"
              variant="elevated"
              rounded="lg"
              prepend-icon="mdi-check-circle"
              class="agricultural-btn agricultural-btn--primary"
              :aria-label="t('sowings.create_sowing')"
              tabindex="0"
            >
              {{ t('sowings.create_sowing') }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useAvatarStore } from '@/stores/avatarStore'

const { t } = useI18n()
const router = useRouter()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()
const snackbarStore = useSnackbarStore()
const avatarStore = useAvatarStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const { siembras } = storeToRefs(siembrasStore)

const userRole = computed(() => profileStore.user.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

const dialogNuevaSiembra = ref(false)
const nuevaSiembraData = ref({
  nombre: '',
  tipo: '',
  estado: 'planificada',
  fecha_inicio: new Date().toISOString().substr(0, 10),
  hacienda: computed(() => mi_hacienda.value.id)
})

const estadoOptions = ['planificada', 'en_crecimiento', 'cosechada', 'finalizada']

onMounted(async () => {
  try {
    await Promise.all([siembrasStore.cargarSiembras(), zonasStore.cargarZonas()])
  } catch (error) {
    snackbarStore.showError(t('sowings.error_loading_sowings'))
  }
})

const nuevaSiembra = () => {
  dialogNuevaSiembra.value = true
}

const crearSiembra = async () => {
  try {
    nuevaSiembraData.value.nombre = nuevaSiembraData.value.nombre.toUpperCase()
    nuevaSiembraData.value.tipo = nuevaSiembraData.value.tipo.toUpperCase()

    await siembrasStore.crearSiembra(nuevaSiembraData.value)
    dialogNuevaSiembra.value = false
    snackbarStore.showSnackbar(t('sowings.sowing_created_successfully'))
    nuevaSiembraData.value = {
      nombre: '',
      tipo: '',
      estado: 'planificada',
      fecha_inicio: new Date().toISOString().substr(0, 10),
      hacienda: mi_hacienda.value.id
    }
  } catch (error) {
    handleError(error, t('sowings.error_creating_sowing'))
  }
}

const abrirSiembra = (id) => {
  router.push(`/siembras/${id}`)
}

const getStatusColor = (status) => {
  const colors = {
    planificada: 'blue',
    en_crecimiento: 'green',
    cosechada: 'orange',
    finalizada: 'gray'
  }
  return colors[status] || 'gray'
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const getZoneNames = (siembra) => {
  const zonasFiltradas = zonasStore.zonas.filter((zona) => zona.siembra.includes(siembra.id))
  return zonasFiltradas.length > 0
    ? zonasFiltradas.map((zona) => zona.nombre)
    : [t('sowings.no_zones_assigned')]
}

const getSiembraAvatarUrl = (siembra) => {
  return avatarStore.getAvatarUrl({ ...siembra, type: 'siembra' }, 'Siembras')
}

const getSiembraCardClass = (siembra) => {
  return `estado-${siembra.estado.replace('_', '-')}`
}

const getSiembraStateColor = (estado) => {
  const colors = {
    'planificada': 'info',
    'en_crecimiento': 'success',
    'cosechada': 'warning',
    'finalizada': 'error'
  }
  return colors[estado] || 'primary'
}

const getSiembraHeaderStyle = (siembra) => {
  const backgrounds = {
    'planificada': 'rgba(25, 118, 210, 0.05)',
    'en_crecimiento': 'rgba(46, 125, 50, 0.05)',
    'cosechada': 'rgba(245, 124, 0, 0.05)',
    'finalizada': 'rgba(211, 47, 47, 0.05)'
  }
  return {
    backgroundColor: backgrounds[siembra.estado] || 'rgba(46, 125, 50, 0.05)'
  }
}

const getSiembraStateIcon = (estado) => {
  const icons = {
    'planificada': 'mdi-calendar-clock',
    'en_crecimiento': 'mdi-sprout',
    'cosechada': 'mdi-harvest',
    'finalizada': 'mdi-check-circle'
  }
  return icons[estado] || 'mdi-leaf'
}
</script>

<style scoped>
:root {
  --agri-green-primary: #2e7d32;
  --agri-green-light: #4caf50;
  --agri-earth-brown: #5d4037;
  --agri-soil-dark: #3e2723;
  --agri-sunshine-yellow: #ffd54f;
  --agri-sky-blue: #1976d2;
  --agri-harvest-orange: #f57c00;
  --agri-warning-red: #d32f2f;
  --agri-surface-light: #f8f9fa;
  --agri-surface-card: #ffffff;
}
.agricultural-card {
  background: var(--agri-surface-card);
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.agricultural-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(46, 125, 50, 0.15) !important;
  border-color: var(--agri-green-light);
}
.agricultural-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--agri-green-primary), var(--agri-green-light));
  z-index: 1;
}
.agricultural-card:focus-visible {
  outline: 3px solid var(--agri-sky-blue);
  outline-offset: 2px;
}
.agricultural-chip {
  font-weight: 500;
  letter-spacing: 0.025em;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.agricultural-chip:hover {
  transform: translateY(-1px);
}
.agricultural-chip--info {
  background-color: rgba(46, 125, 50, 0.1);
  border-color: var(--agri-green-primary);
  color: var(--agri-green-primary);
}
.agricultural-chip--primary {
  background: linear-gradient(45deg, var(--agri-green-primary), var(--agri-green-light));
  color: white;
}
.agricultural-chip--zone {
  background-color: rgba(25, 118, 210, 0.1);
  border-color: var(--agri-sky-blue);
  color: var(--agri-sky-blue);
}
.agricultural-btn {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.025em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}
.agricultural-btn--primary {
  background: linear-gradient(45deg, var(--agri-green-primary), var(--agri-green-light));
  border: none;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
  color: white;
}
.agricultural-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.4);
}
.agricultural-btn--secondary {
  background: linear-gradient(45deg, var(--agri-warning-red), #e57373);
  border: none;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
  color: white;
}
.agricultural-btn--secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(211, 47, 47, 0.4);
}
.agricultural-btn:focus-visible {
  outline: 3px solid var(--agri-sky-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--agri-surface-card), 0 0 0 5px var(--agri-sky-blue);
}
.agricultural-btn:active {
  transform: translateY(0);
  transition: transform 0.1s;
}
@media (max-width: 1024px) {
  .agricultural-btn {
    min-height: 48px;
    font-size: 0.95rem;
  }
  .agricultural-chip {
    font-size: 0.85rem;
  }
}
@media (max-width: 768px) {
  .agricultural-btn {
    min-height: 52px;
    width: 100%;
    margin-bottom: 8px;
  }
}
.compliance-header {
  background: linear-gradient(135deg, var(--agri-surface-light) 0%, #ffffff 100%);
  padding: 16px 20px;
  border-bottom: 1px solid rgba(46, 125, 50, 0.1);
  position: relative;
}
.compliance-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--agri-soil-dark);
  margin-bottom: 2px;
}
.compliance-subtitle {
  font-size: 0.875rem;
  color: var(--agri-earth-brown);
  opacity: 0.8;
}
.siembra-card .compliance-header {
  border-left: 4px solid var(--agri-green-primary);
}
.siembra-card.estado-planificada .compliance-header {
  border-left-color: var(--agri-sky-blue);
}
.siembra-card.estado-en-crecimiento .compliance-header {
  border-left-color: var(--agri-green-primary);
}
.siembra-card.estado-cosechada .compliance-header {
  border-left-color: var(--agri-harvest-orange);
}
.siembra-card.estado-finalizada .compliance-header {
  border-left-color: var(--agri-warning-red);
}
.siembra-card {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.siembra-image {
  transition: transform 0.3s ease;
  border-radius: 0;
}
.siembra-card:hover .siembra-image {
  transform: scale(1.05);
}
.info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 12px;
  color: white;
}
.agricultural-chip--zone-overlay {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(4px);
}
.agricultural-btn--outline {
  border: 2px solid var(--agri-green-primary);
  color: var(--agri-green-primary);
  background: transparent;
  transition: all 0.2s ease;
}
.agricultural-btn--outline:hover {
  background: var(--agri-green-primary);
  color: white;
  transform: translateY(-1px);
}
</style>