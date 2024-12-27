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
                @click="nuevaActividad"
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
        <v-row v-if="loading">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
          </v-col>
        </v-row>
        <v-row v-else-if="error">
          <v-col cols="12">
            <v-alert type="error">{{ error }}</v-alert>
          </v-col>
        </v-row>
        <v-row v-else>
          <v-col v-if="Actividades.length === 0" cols="12" sm="6" md="4" lg="3">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :elevation="isHovering ? 6 : 2"
                :class="{ 'on-hover': isHovering }"
                class="transition-shadow duration-300 ease-in-out"
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
            v-for="Actividad in Actividades"
            :key="Actividad.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :class="['Actividad-card', { 'card-hover': isHovering }]"
                @click="abrirActividad(Actividad.id)"
              >
                <v-img
                  :src="getActividadAvatarUrl(Actividad)"
                  height="200px"
                  cover
                  class="Actividad-image rounded-xl"
                >
                  <div class="fill-height card-overlay rounded-lg">
                    <v-card-title>
                      <p class="text-white text-xl">{{ Actividad.nombre }}</p>
                      <p class="text-white text-sm font-weight-bold mb-2 mt-0">
                        {{ Actividad.tipo }}
                      </p>
                      <div class="d-flex justify-space-between align-center mb-2">
                        <span class="text-caption">{{ formatDate(Actividad.fecha_inicio) }}</span>
                        <v-chip
                          :color="getStatusColor(Actividad.estado)"
                          size="x-small"
                          variant="flat"
                        >
                          {{ Actividad.estado }}
                        </v-chip>
                      </div>
                      <p class="text-caption text-white">
                        <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
                        {{ getZoneNames(Actividad) }}
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

    <v-dialog v-model="dialogNuevaActividad" persistent max-width="500px">
      <v-card>
        <v-form @submit.prevent="crearActividad">
          <v-card-title> <h2 class="text-xl font-bold mt-2">Nueva Actividad</h2> </v-card-title>
          <v-card-text>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaActividadData.nombre"
              label="Nombre (Ej: pitahaya, limon)"
              required
            ></v-text-field>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaActividadData.tipo"
              label="Tipo (Ej: palora, sutil)"
              required
            ></v-text-field>
            <v-select
              density="compact"
              class="compact-form"
              v-model="nuevaActividadData.estado"
              :items="estadoOptions"
              label="Estado"
              required
            ></v-select>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaActividadData.fecha_inicio"
              label="Fecha de inicio"
              type="date"
              required
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>

            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              @click="dialogNuevaActividad = false"
            >
              Cancelar
            </v-btn>
            <v-btn
              type="submit"
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              >Crear Actividad</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import placeholderActividades from '@/assets/placeholder-actividades.png'
import { useAvatarStore } from '@/stores/avatarStore'

export default {
  name: 'ActividadesComponent',
  setup() {
    const router = useRouter()
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const ActividadesStore = useActividadesStore()
    const snackbarStore = useSnackbarStore()
    const avatarStore = useAvatarStore()

    const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
    const { Actividades, loading, error } = storeToRefs(ActividadesStore)

    const userRole = computed(() => profileStore.user.role)
    const avatarUrl = computed(() => profileStore.avatarUrl)

    const dialogNuevaActividad = ref(false)
    const nuevaActividadData = ref({
      nombre: '',
      tipo: '',
      estado: 'planificada',
      fecha_inicio: new Date().toISOString().substr(0, 10),
      hacienda: computed(() => mi_hacienda.value.id)
    })

    const estadoOptions = ['planificada', 'en_crecimiento', 'cosechada', 'finalizada']

    onMounted(async () => {
      try {
        await ActividadesStore.cargarActividades()
      } catch (error) {
        snackbarStore.showError('Error al cargar las Actividades')
      }
    })

    const nuevaActividad = () => {
      dialogNuevaActividad.value = true
    }

    const crearActividad = async () => {
      try {
        // Convertir nombre y tipo a mayúsculas antes de crear la Actividad
        nuevaActividadData.value.nombre = nuevaActividadData.value.nombre.toUpperCase()
        nuevaActividadData.value.tipo = nuevaActividadData.value.tipo.toUpperCase()

        await ActividadesStore.createActividad(nuevaActividadData.value)
        dialogNuevaActividad.value = false
        snackbarStore.showSnackbar('Actividad creada exitosamente')
        // Reiniciar datos del formulario
        nuevaActividadData.value = {
          nombre: '',
          tipo: '',
          estado: 'planificada',
          fecha_inicio: new Date().toISOString().substr(0, 10),
          hacienda: mi_hacienda.value.id
        }
        // Actualizar lista de Actividades
        await ActividadesStore.fetchActividades()
      } catch (error) {
        handleError(error, 'Error al crear la Actividad')
      }
    }

    const abrirActividad = (id) => {
      router.push(`/Actividades/${id}`)
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

    const getZoneNames = (Actividad) => {
      return Actividad.zonas?.map((zona) => zona.nombre).join(', ') || 'Sin zonas asignadas'
    }

    const getPlaceholderImage = () => placeholderActividades

    const getActividadAvatarUrl = (Actividad) => {
      return avatarStore.getAvatarUrl({ ...Actividad, type: 'Actividad' }, 'Actividades')
    }

    return {
      mi_hacienda,
      avatarHaciendaUrl,
      userRole,
      avatarUrl,
      Actividades,
      loading,
      error,
      dialogNuevaActividad,
      nuevaActividadData,
      estadoOptions,
      nuevaActividad,
      crearActividad,
      abrirActividad,
      getStatusColor,
      formatDate,
      getZoneNames,
      getPlaceholderImage,
      getActividadAvatarUrl
    }
  }
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
