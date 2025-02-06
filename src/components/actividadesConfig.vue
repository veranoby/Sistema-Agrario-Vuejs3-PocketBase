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
            <div class="w-full sm:w-auto z-10">
              <v-btn
                block
                sm:inline-flex
                size="small"
                variant="flat"
                rounded="lg"
                color="green-lighten-2"
                prepend-icon="mdi-plus"
                @click="dialogNuevaActividad = true"
                class="min-w-[210px]"
              >
                Nueva Actividad
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
          <v-col v-if="actividades && actividades.length === 0" cols="12" sm="6" md="4" lg="3">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :elevation="isHovering ? 6 : 2"
                :class="{ 'on-hover': isHovering }"
                class="zonas-section transition-shadow duration-300 ease-in-out"
              >
                <v-card-text class="text-center">
                  <v-icon size="large" color="grey" class="mb-4">mdi-sprout</v-icon>
                  <p class="text-h6 font-weight-medium">No hay Actividades registradas aún</p>
                  <p class="text-body-2 mt-2">Haga clic en "Nueva Actividad" para comenzar</p>
                </v-card-text>
              </v-card>
            </v-hover>
          </v-col>

          <v-col
            v-for="actividad in actividades"
            :key="actividad.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :class="['Actividad-card', { 'card-hover': isHovering }]"
                @click="abrirActividad(actividad.id)"
              >
                <v-img
                  :src="getActividadAvatarUrl(actividad)"
                  height="200px"
                  cover
                  class="Actividad-image rounded-xl"
                >
                  <div class="fill-height card-overlay rounded-lg">
                    <v-card-title class="px-1">
                      <p class="text-white text-sm">{{ actividad.nombre }}</p>
                      <p class="text-white text-xs font-weight-bold mb-2 mt-0">
                        {{
                          actividad.expand?.tipo_actividades?.nombre.toUpperCase() ||
                          'Tipo no definido'
                        }}
                      </p>
                      <p class="text-caption flex flex-wrap">
                        <v-chip
                          :color="getStatusColor(actividad.activa)"
                          size="x-small"
                          variant="flat"
                        >
                          {{ getActividadEstado(actividad.activa) }}
                        </v-chip>
                      </p>
                      <p class="text-caption flex flex-wrap">
                        <span
                          class="mx-0 mt-1 mb-0 p-0"
                          v-for="siembraTemp in actividad.siembra"
                          :key="siembraTemp"
                        >
                          <v-chip outlined size="x-small" variant="flat">
                            {{ getSiembraNombre(siembraTemp) }}
                          </v-chip>
                        </span>
                      </p>
                    </v-card-title>
                  </div>
                </v-img>
              </v-card>
            </v-hover>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <ActividadForm v-model="dialogNuevaActividad" @actividad-creada="onActividadCreada" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'
import { editor, editorConfig } from '@/utils/ckeditorConfig'
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
const { actividades, tiposActividades } = storeToRefs(ActividadesStore)

const { cargarActividades, cargarTiposActividades } = ActividadesStore
const { siembras } = storeToRefs(siembrasStore)

const userRole = computed(() => profileStore.user.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

const getActividadAvatarUrl = (actividad) => {
  return avatarStore.getAvatarUrl({ ...actividad, type: 'actividades' }, 'actividades')
}

const dialogNuevaActividad = ref(false)
const nuevaActividadData = ref({
  nombre: '',
  tipo_actividades: null,
  bpa_estado: 0,
  datos_bpa: [],
  metricas: {},
  descripcion: '',
  siembra: [],
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

function getDefaultMetricaValue(tipo) {
  switch (tipo) {
    case 'checkbox':
      return []
    case 'number':
      return 0
    case 'text':
      return 'por determinar'

    case 'boolean':
      return false
    case 'select':
      return null
    default:
      return null
  }
}

const crearActividad = async () => {
  if (nuevaActividadData.value.nombre && nuevaActividadData.value.tipo_actividades) {
    // Inicializar métricas correctamente
    const metricasInicializadas = {}
    const tipoActividadSeleccionado = ActividadesStore.tiposActividades.find(
      (t) => t.id === nuevaActividadData.value.tipo_actividades
    )

    if (tipoActividadSeleccionado?.metricas?.metricas) {
      Object.entries(tipoActividadSeleccionado.metricas.metricas).forEach(([key, value]) => {
        metricasInicializadas[key] = {
          ...value,
          valor: getDefaultMetricaValue(value.tipo)
        }
      })
    }

    // Inicializar datos_bpa
    const datosBpaInicializados =
      tipoActividadSeleccionado?.datos_bpa?.preguntas_bpa?.map(() => ({
        respuesta: null
      })) || []

    try {
      nuevaActividadData.value.nombre = nuevaActividadData.value.nombre.toUpperCase()
      const actividadToCreate = {
        ...nuevaActividadData.value,
        hacienda: mi_hacienda.value.id,
        datos_bpa: datosBpaInicializados,
        metricas: metricasInicializadas
      }

      if (!syncStore.isOnline) {
        await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: actividadToCreate
        })
        ActividadesStore.actividades.push(actividadToCreate)
      } else {
        await ActividadesStore.crearActividad(actividadToCreate)
        snackbarStore.showSnackbar('Actividad creada exitosamente')
      }

      dialogNuevaActividad.value = false
      nuevaActividadData.value = {
        nombre: '',
        tipo_actividades: null,
        bpa_estado: 0,
        datos_bpa: [],
        metricas: {},
        descripcion: '',
        siembra: []
      }
      await ActividadesStore.cargarActividades()
    } catch (error) {
      handleError(error, 'Error al crear la Actividad')
    }
  } else {
    snackbarStore.showError('Nombre y tipo son requeridos')
  }
}

const abrirActividad = (id) => {
  router.push(`/Actividades/${id}`)
}

const cargarZonasPorSiembra = async () => {
  const selectedSiembras = nuevaActividadData.value.siembra
  if (selectedSiembras.length > 0) {
    zonasDisponibles.value = await ZonasStore.cargarZonasPorSiembras(selectedSiembras)
  } else {
    zonasDisponibles.value = await ZonasStore.cargarZonasPrecargadas()
  }
}

// Function to get the activity type based on the activity ID
const getSiembraNombre = (tipoId) => {
  const SiembraNombre = siembrasStore.siembras.find((tipo) => tipo.id === tipoId)
  return SiembraNombre
    ? SiembraNombre.nombre + '-' + SiembraNombre.tipo
    : 'Sin siembras registradas' // Return 'Desconocido' if not found
}

// Function to get the activity status
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
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.v-card__title .text-h6 {
  font-size: 1.25rem !important;
  line-height: 1.5 !important;
}
</style>
