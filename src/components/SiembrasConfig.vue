<template>
  <div class="flex flex-col min-h-screen">
    <header class="bg-background shadow-sm">
      <div class="profile-container">
        <div class="grid grid-cols-4 gap-4">
          <h3 class="profile-title col-span-3">
            Gestión de Siembra
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
              HACIENDA: {{ mi_hacienda.name }}
            </v-chip>
          </h3>

          <v-btn
            min-width="210"
            max-width="210"
            size="small"
            variant="flat"
            rounded="lg"
            color="green-lighten-2"
            prepend-icon="mdi-plus"
            @click="nuevaSiembra"
          >
            Nueva Siembra
          </v-btn>
        </div>
        <div class="avatar-container">
          <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
        </div>
      </div>
    </header>

    <main class="flex-1 py-8">
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
          <v-col v-if="siembras.length === 0" cols="12" sm="6" md="4" lg="3">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :elevation="isHovering ? 6 : 2"
                :class="{ 'on-hover': isHovering }"
                class="transition-shadow duration-300 ease-in-out"
              >
                <v-card-text class="text-center">
                  <v-icon size="large" color="grey" class="mb-4">mdi-sprout</v-icon>
                  <p class="text-h6 font-weight-medium">No hay siembras registradas aún</p>
                  <p class="text-body-2 mt-2">Haga clic en "Nueva Siembra" para comenzar</p>
                </v-card-text>
              </v-card>
            </v-hover>
          </v-col>

          <v-col v-for="siembra in siembras" :key="siembra.id" cols="12" sm="6" md="4" lg="3">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :class="['siembra-card', { 'card-hover': isHovering }]"
                @click="abrirSiembra(siembra.id)"
              >
                <v-img
                  :src="getSiembraAvatarUrl(siembra)"
                  height="200px"
                  cover
                  class="siembra-image rounded-xl"
                >
                  <div class="fill-height card-overlay rounded-lg">
                    <v-card-title>
                      <p class="text-white text-xl">{{ siembra.nombre }}</p>
                      <p class="text-white text-sm font-weight-bold mb-2 mt-0">
                        {{ siembra.tipo }}
                      </p>
                      <div class="d-flex justify-space-between align-center mb-2">
                        <span class="text-caption">{{ formatDate(siembra.fecha_inicio) }}</span>
                        <v-chip
                          :color="getStatusColor(siembra.estado)"
                          size="x-small"
                          variant="flat"
                        >
                          {{ siembra.estado }}
                        </v-chip>
                      </div>
                      <p class="text-caption text-white">
                        <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
                        {{ getZoneNames(siembra) }}
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

    <v-dialog v-model="dialogNuevaSiembra" max-width="500px">
      <v-card>
        <v-card-title>Nueva Siembra</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="crearSiembra">
            <v-text-field
              v-model="nuevaSiembraData.nombre"
              label="Nombre (Ej: pitahaya, limon)"
              required
            ></v-text-field>
            <v-text-field
              v-model="nuevaSiembraData.tipo"
              label="Tipo (Ej: palora, sutil)"
              required
            ></v-text-field>
            <v-select
              v-model="nuevaSiembraData.estado"
              :items="estadoOptions"
              label="Estado"
              required
            ></v-select>
            <v-text-field
              v-model="nuevaSiembraData.fecha_inicio"
              label="Fecha de inicio"
              type="date"
              required
            ></v-text-field>
            <v-btn type="submit" color="primary" block class="mt-4">Crear Siembra</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import placeholderSiembras from '@/assets/placeholder-siembras.png'

export default {
  name: 'SiembrasComponent',
  setup() {
    const router = useRouter()
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const siembrasStore = useSiembrasStore()
    const snackbarStore = useSnackbarStore()

    const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
    const { siembras, loading, error } = storeToRefs(siembrasStore)

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
        await siembrasStore.fetchSiembras()
      } catch (error) {
        snackbarStore.showError('Error al cargar las siembras')
      }
    })

    const nuevaSiembra = () => {
      dialogNuevaSiembra.value = true
    }

    const crearSiembra = async () => {
      try {
        // Convertir nombre y tipo a mayúsculas antes de crear la siembra
        nuevaSiembraData.value.nombre = nuevaSiembraData.value.nombre.toUpperCase()
        nuevaSiembraData.value.tipo = nuevaSiembraData.value.tipo.toUpperCase()

        await siembrasStore.createSiembra(nuevaSiembraData.value)
        dialogNuevaSiembra.value = false
        snackbarStore.showSnackbar('Siembra creada exitosamente')
        // Reiniciar datos del formulario
        nuevaSiembraData.value = {
          nombre: '',
          tipo: '',
          estado: 'planificada',
          fecha_inicio: new Date().toISOString().substr(0, 10),
          hacienda: mi_hacienda.value.id
        }
        // Actualizar lista de siembras
        await siembrasStore.fetchSiembras()
      } catch (error) {
        handleError(error, 'Error al crear la siembra')
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
      return siembra.zonas?.map((zona) => zona.nombre).join(', ') || 'Sin zonas asignadas'
    }

    const getPlaceholderImage = () => placeholderSiembras

    const getSiembraAvatarUrl = siembrasStore.getSiembraAvatarUrl

    return {
      mi_hacienda,
      avatarHaciendaUrl,
      userRole,
      avatarUrl,
      siembras,
      loading,
      error,
      dialogNuevaSiembra,
      nuevaSiembraData,
      estadoOptions,
      nuevaSiembra,
      crearSiembra,
      abrirSiembra,
      getStatusColor,
      formatDate,
      getZoneNames,
      getPlaceholderImage,
      getSiembraAvatarUrl
    }
  }
}
</script>

<style scoped>
.siembra-card {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.siembra-image {
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

.siembra-card:hover .siembra-image {
  transform: scale(1.05);
}

.siembra-card:hover .card-overlay {
  background-color: rgba(0, 0, 0, 0.1);
}

.siembra-card .v-card__title {
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
