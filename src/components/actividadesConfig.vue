<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                Gestión de Actividades
                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ userRole }}
                </v-chip>
                <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ mi_hacienda.name }}
                </v-chip>
              </h3>
            </div>

            <!-- Button Section -->
            <div class="w-full sm:w-auto z-10" v-if="siembrasStore.siembras.length > 0">
              <v-btn
                block
                sm:inline-flex
                size="small"
                variant="flat"
                rounded="lg"
                color="#6380a247"
                prepend-icon="mdi-plus"
                @click="NuevaActividad"
                class="min-w-[210px]"
              >
                Nueva Actividad
              </v-btn>
              <!--       @click="dialogNuevaActividad = true" 
                     @click:prepend="dialogNuevaActividad = true"
                     -->
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
          <v-alert v-if="!actividades?.length" type="info" class="mt-4">
            No hay Actividades registradas
          </v-alert>

          <v-col
            v-for="actividad in actividades"
            :key="actividad.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card class="Actividad-card" @click="abrirActividad(actividad.id)">
              <v-img
                :src="getActividadAvatarUrl(actividad)"
                height="200px"
                cover
                class="Actividad-image rounded-xl"
              >
                <div class="fill-height card-overlay rounded-lg">
                  <v-card-title class="px-1">
                    <p class="">
                      <v-chip
                        :color="getStatusColor(actividad.activa)"
                        size="x-small"
                        variant="flat"
                      >
                        {{ getActividadEstado(actividad.activa) }}
                      </v-chip>
                    </p>
                    <p class="text-white text-sm">{{ actividad.nombre }}</p>
                    <p class="text-white text-xs font-weight-bold mb-2 mt-0">
                      {{ ActividadesStore.getActividadTipo(actividad.tipo_actividades) }}
                    </p>

                    <p
                      class="flex flex-wrap"
                      v-for="siembraTemp in actividad.siembras"
                      :key="siembraTemp"
                    >
                      <v-chip
                        outlined
                        size="x-small"
                        class="compact-chips"
                        pill
                        color="green-lighten-3"
                        variant="flat"
                      >
                        {{ siembrasStore.getSiembraNombre(siembraTemp) }}
                      </v-chip>
                    </p>
                    <p class="flex flex-wrap" v-for="zonasId in actividad.zonas" :key="zonasId">
                      <v-chip
                        size="x-small"
                        :key="zonasId"
                        class="compact-chips"
                        :text="
                          zonasStore.getZonaById(zonasId)?.nombre.toUpperCase() +
                          ' - ' +
                          zonasStore.getZonaById(zonasId)?.expand?.tipos_zonas?.nombre.toUpperCase()
                        "
                        pill
                        color="blue-lighten-3"
                        variant="flat"
                      >
                      </v-chip>
                    </p>
                  </v-card-title>
                </div>
              </v-img>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <ActividadForm v-model="dialogNuevaActividad" @actividad-creada="onActividadCreada" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useSyncStore } from '@/stores/syncStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { useZonasStore } from '@/stores/zonasStore'
import ActividadForm from '@/components/forms/ActividadForm.vue'

const router = useRouter()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const ActividadesStore = useActividadesStore()
const ZonasStore = useZonasStore()

const snackbarStore = useSnackbarStore()
const siembrasStore = useSiembrasStore()
const syncStore = useSyncStore()
const avatarStore = useAvatarStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const { actividades, tiposActividades, getActividadTipo } = storeToRefs(ActividadesStore)

const { cargarActividades, cargarTiposActividades } = ActividadesStore
const { siembras } = storeToRefs(siembrasStore)

const userRole = computed(() => profileStore.user.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

const getActividadAvatarUrl = (actividad) => {
  return avatarStore.getAvatarUrl({ ...actividad, type: 'actividades' }, 'actividades')
}

const dialogNuevaActividad = ref(false)

const NuevaActividad = () => {
  dialogNuevaActividad.value = true
}

const nuevaActividadData = ref({
  nombre: '',
  tipo_actividades: null,
  bpa_estado: 0,
  datos_bpa: [],
  metricas: {},
  descripcion: '',
  siembras: [],
  activa: true
})
const zonasDisponibles = ref([])

onMounted(async () => {
  try {
    await Promise.all([cargarActividades(), cargarTiposActividades()])
  } catch (error) {
    snackbarStore.showError('Error al cargar las actividades')
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
  return isActive ? 'activa' : 'detenida'
}
</script>

<style scoped>
.Actividad-card {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.Actividad-image {
  transition: transform 0.3s ease;
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  transition: background-color 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
}

.Actividad-card:hover .Actividad-image {
  transform: scale(1.05);
}

.Actividad-card:hover .card-overlay {
  background-color: rgba(0, 0, 0, 0.1);
}

.Actividad-card .v-card__title {
  color: white !important;
}

.status-chip {
  z-index: 1;
}

.text-caption,
.text-body-1,
.text-body-2 {
  color: white !important;
  /* text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8); */
}

.v-card__title .text-h6 {
  font-size: 1.25rem !important;
  line-height: 1.5 !important;
}

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
