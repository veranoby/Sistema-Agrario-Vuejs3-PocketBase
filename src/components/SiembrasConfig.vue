<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
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
                color="#6380a247"
                prepend-icon="mdi-plus"
                @click="nuevaSiembra"
                class="min-w-[210px]"
              >
                Nueva Siembra
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
          <v-col v-if="siembras.length === 0" cols="12" sm="6" md="4" lg="3">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :elevation="isHovering ? 6 : 2"
                :class="{ 'on-hover': isHovering }"
                class="zonas-section transition-shadow duration-300 ease-in-out"
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
                  <div class="fill-height card-overlay rounded-lg p-2">
                    <v-card-title class="px-1">
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
                      <span class="text-white text-xl whitespace-normal"
                        >{{ siembra.nombre }} &nbsp;</span
                      >
                      <span class="text-white text-sm font-weight-bold mb-2 mt-0 whitespace-normal">
                        {{ siembra.tipo }}
                      </span>

                      <p class="text-caption flex flex-wrap">
                        <span v-for="(zona, index) in getZoneNames(siembra)" :key="index">
                          <v-chip
                            size="x-small"
                            pill
                            color="blue-lighten-3"
                            variant="flat"
                            class="m-0 compact-chips"
                            >{{ zona }}
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

    <v-dialog v-model="dialogNuevaSiembra" persistent max-width="500px">
      <v-card>
        <v-toolbar color="success" dark>
          <v-toolbar-title>Nueva Siembra</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-form @submit.prevent="crearSiembra">
          <v-card-text>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.nombre"
              label="Nombre (Ej: pitahaya, limon)"
              required
            ></v-text-field>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.tipo"
              label="Tipo (Ej: palora, sutil)"
              required
            ></v-text-field>
            <v-select
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.estado"
              :items="estadoOptions"
              label="Estado"
              required
            ></v-select>
            <v-text-field
              density="compact"
              class="compact-form"
              v-model="nuevaSiembraData.fecha_inicio"
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
              @click="dialogNuevaSiembra = false"
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
              >Crear Siembra</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useAvatarStore } from '@/stores/avatarStore'

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
    snackbarStore.showError('Error al cargar las siembras o zonas')
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
    snackbarStore.showSnackbar('Siembra creada exitosamente')
    nuevaSiembraData.value = {
      nombre: '',
      tipo: '',
      estado: 'planificada',
      fecha_inicio: new Date().toISOString().substr(0, 10),
      hacienda: mi_hacienda.value.id
    }
    // await siembrasStore.fetchSiembras()
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
  const zonasFiltradas = zonasStore.zonas.filter((zona) => zona.siembra.includes(siembra.id))
  return zonasFiltradas.length > 0
    ? zonasFiltradas.map((zona) => zona.nombre)
    : ['Sin zonas asignadas']
}

const getSiembraAvatarUrl = (siembra) => {
  return avatarStore.getAvatarUrl({ ...siembra, type: 'siembra' }, 'Siembras')
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
  /* text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);*/
}

.v-card__title .text-h6 {
  font-size: 1.25rem !important;
  line-height: 1.5 !important;
}
</style>
