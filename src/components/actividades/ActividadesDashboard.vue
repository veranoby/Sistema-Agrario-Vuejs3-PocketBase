<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <UniversalHeader 
        :title="t('activities.activity_management')"
        :bgImage="avatarHaciendaUrl"
      >
        <template #chips>
          <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start>
              <v-img :src="avatarUrl" alt="Avatar"></v-img>
            </v-avatar>
            {{ userRole }}
          </v-chip>
          <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start>
              <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
            </v-avatar>
            {{ mi_hacienda.name }}
          </v-chip>
        </template>

        <template #actions>
          <div class="w-full sm:w-auto z-10 hidden-sm-and-down" v-if="siembrasStore.siembras.length > 0 && canCreate && !mobile">
            <v-btn
              prepend-icon="mdi-plus-circle"
              color="primary"
              variant="flat"
              class="font-weight-bold text-white elevation-2 rounded-lg"
              @click="NuevaActividad"
            >
              {{ t('activities.new_activity') }}
            </v-btn>
          </div>
        </template>
      </UniversalHeader>
    </div>

    <main class="flex-1 py-2">
      <v-container>
        <v-row>
          <v-col v-if="!actividades?.length" cols="12" md="10" offset-md="1" class="mt-4">
            <v-card class="pa-6 text-center rounded-xl elevation-0 border bg-surface">
              <v-icon size="48" color="primary" class="mb-3">mdi-gesture-tap-button</v-icon>
              <h3 class="text-md font-weight-bold mb-1">Fase 2: Zonas y Actividades</h3>
              <p class="text-smtext-medium-emphasis mb-6">
                Aún no tienes actividades registradas. Configura las labores ("el qué se hace") para asociarlas a tus siembras y zonas.
              </p>
              
              <v-timeline align="start" side="end" density="compact" class="text-left mt-4 mb-4">
                <v-timeline-item dot-color="success" size="small">
                  <template v-slot:icon><v-icon color="white" size="small">mdi-check</v-icon></template>
                  <div class="mb-1">
                    <div class="  font-weight-bold text-success">Fase 1: Siembras</div>
                    <div class="text-xs text-medium-emphasis">Se recomienda haber creado previamente el proyecto de siembra.</div>
                  </div>
                </v-timeline-item>

                <v-timeline-item dot-color="primary" size="small">
                  <div class="mb-1">
                    <div class="  font-weight-bold">Fase 2: Actividades (Estás aquí)</div>
                    <div class="text-xs text-medium-emphasis">Registra las labores a ejecutar en las zonas (ej. fertilización, riego).</div>
                  </div>
                  <v-btn size="small" variant="flat" color="primary" class="mt-2" @click="NuevaActividad">Crear Actividad</v-btn>
                </v-timeline-item>

                <v-timeline-item dot-color="grey-lighten-2" size="small">
                  <div class="mb-1">
                    <div class="  font-weight-bold text-grey">Siguiente: Fase 3 (Programaciones)</div>
                    <div class="text-xs text-medium-emphasis">Programa estas actividades en el calendario.</div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card>
          </v-col>

          <v-col
            v-for="actividad in actividades"
            :key="actividad.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card class="Actividad-card siembra-card" @click="abrirActividad(actividad.id)">
              <v-img
                :src="getActividadAvatarUrl(actividad)"
                height="220px"
                cover
                class="siembra-image"
              >
                <div class="fill-height card-overlay">
                  <!-- Barra de estado lateral -->
                  <div class="estado-bar" :class="`estado-${actividad.activa ? 'activa' : 'pausada'}`"></div>

                  <v-card-title class="px-2 py-0 w-full">
                    <div class="d-flex align-center gap-2 mb-1 w-full">
                      <v-icon :color="actividad.activa ? 'success' : 'warning'" size="18">
                        {{ actividad.activa ? 'mdi-check-circle' : 'mdi-pause-circle' }}
                      </v-icon>
                      <span class="siembra-title flex-grow-1 text-white">{{ actividad.nombre }}</span>
                    </div>

                    <div class="d-flex align-center flex-wrap gap-1 mb-2">
                      <v-chip
                        :color="getStatusColor(actividad.activa)"
                        size="x-small"
                        variant="flat"
                        class="text-uppercase font-weight-bold"
                      >
                        {{ getActividadEstado(actividad.activa) }}
                      </v-chip>

                      <v-chip size="x-small" variant="tonal" color="green-lighten-4" class="text-white">
                        <v-icon start size="10">mdi-layers-outline</v-icon>
                        {{ ActividadesStore.getActividadTipo(actividad.tipo_actividades) }}
                      </v-chip>
                    </div>

                    <div class="d-flex align-center flex-wrap gap-1 mt-auto">
                      <!-- Chips para siembras -->
                      <v-chip
                        v-for="siembraId in (actividad.siembras || []).slice(0, 2)"
                        :key="siembraId"
                        variant="tonal"
                        size="x-small"
                        color="white"
                        class="text-white"
                      >
                        <v-icon start size="10">mdi-sprout</v-icon>
                        {{ siembrasStore.getSiembraNombre(siembraId) }}
                      </v-chip>
                      <v-chip v-if="actividad.siembras?.length > 2" variant="tonal" size="x-small" color="white" class="text-white">
                        +{{ actividad.siembras.length - 2 }}
                      </v-chip>

                      <!-- Chips para zonas -->
                      <v-chip
                        v-for="zonaId in (actividad.zonas || []).slice(0, 1)"
                        :key="zonaId"
                        color="blue-lighten-4"
                        size="x-small"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        <v-icon start size="10">mdi-map-marker</v-icon>
                        {{ zonasStore.getZonaById(zonaId)?.nombre }}
                      </v-chip>
                    </div>
                  </v-card-title>
                </div>
              </v-img>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <ActividadForm v-model="dialogNuevaActividad" @actividad-creada="onActividadCreada" />

    <v-btn
      v-if="siembrasStore.siembras.length > 0 && canCreate && mobile"
      color="primary"
      icon="mdi-plus"
      size="x-large"
      position="fixed"
      location="bottom right"
      class="mb-4 mr-4 elevation-8"
      style="z-index: 100"
      @click="NuevaActividad"
    ></v-btn>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { storeToRefs } from 'pinia'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { useZonasStore } from '@/stores/zonasStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ActividadForm from '../forms/ActividadForm.vue'
import UniversalHeader from '@/components/UniversalHeader.vue'
import { useDisplay } from 'vuetify'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const { mobile } = useDisplay()
const haciendaStore = useHaciendaStore()
const ActividadesStore = useActividadesStore()
const zonasStore = useZonasStore()
const uiFeedbackStore = useUiFeedbackStore()
const siembrasStore = useSiembrasStore()
const avatarStore = useAvatarStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const { actividades } = storeToRefs(ActividadesStore)
const { cargarActividades, cargarTiposActividades } = ActividadesStore
const { siembras } = storeToRefs(siembrasStore)

const userRole = computed(() => authStore.user.role)
const canCreate = computed(() => authStore.canCreate)
const avatarUrl = computed(() => authStore.avatarUrl)

const getActividadAvatarUrl = (actividad) => {
  return avatarStore.getAvatarUrl({ ...actividad, type: 'actividades' }, 'actividades')
}

const dialogNuevaActividad = ref(false)

const NuevaActividad = () => {
  dialogNuevaActividad.value = true
}

onMounted(async () => {
  try {
    await Promise.all([cargarActividades(), cargarTiposActividades()])
  } catch (error) {
    uiFeedbackStore.showError(t('activities.error_loading_activities'))
  }
  await siembrasStore.cargarSiembras()
  siembras.value = siembrasStore.siembras
})

const onActividadCreada = async () => {
  await ActividadesStore.cargarActividades()
}

const getStatusColor = (status) => {
  const colors = {
    true: 'blue',
    false: 'orange'
  }
  return colors[status] || 'gray'
}

const abrirActividad = (id) => {
  router.push(`/Actividades/${id}`)
}

const getActividadEstado = (isActive) => {
  return isActive ? t('activities.active') : t('activities.stopped')
}
</script>

<style scoped>
.siembra-card {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border-radius: 12px !important;
}

.siembra-image {
  transition: transform 0.5s ease;
}

.siembra-card:hover .siembra-image {
  transform: scale(1.1);
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.1) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 12px;
  transition: background 0.3s ease;
}

.siembra-card:hover .card-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.2) 100%);
}

.estado-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  z-index: 2;
}

.estado-bar.estado-activa { background-color: #4CAF50; }
.estado-bar.estado-pausada { background-color: #FF9800; }

.siembra-title {
  font-size: 1rem;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }

.document-editor {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 1rem;
}
.document-editor .ck-editor__editable {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  border: 0;
  border-top: 1px solid #e2e8f0;
}
</style>
