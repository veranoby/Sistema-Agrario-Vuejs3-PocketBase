<template>
  <v-container fluid class="pa-2">
    <div class="grid grid-cols-4 gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0 px-2 py-2">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                Zonas y logística de trabajo
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

            <!-- EXTRAS Section -->
            <div class="w-full sm:w-auto z-10 text-center">
              <!-- circular progress control-->
              <h4
                :class="{
                  'text-red font-extrabold pt-0 pb-2 text-xs sm:text-sm': promedioBpaEstado < 40,
                  'text-orange font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                    promedioBpaEstado >= 40 && promedioBpaEstado < 80,
                  'text-green font-extrabold pt-0 pb-2 text-xs sm:text-sm': promedioBpaEstado >= 80
                }"
              >
                Avance BPA:
                <span class="hidden sm:inline">Zonas y logística</span>
              </h4>
              <!-- Título agregado -->
              <v-progress-circular
                :model-value="promedioBpaEstado"
                :size="78"
                :width="8"
                :color="colorBpaEstado"
              >
                <template v-slot:default> {{ promedioBpaEstado }} % </template>
              </v-progress-circular>
            </div>
          </div>

          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <main class="flex-1 py-2">
      <v-container class="rounded-lg border-2 py-0 px-0">
        <v-tabs
          v-model="tab"
          bg-color="#6380a247"
          slider-color="green"
          stacked
          show-arrows
          density="compact"
          selected-class="bg-green-lighten-1"
          center-active
        >
          <v-tab v-for="tipoZona in tiposZonas" :key="tipoZona.id" :value="tipoZona.id">
            <v-icon>{{ tipoZona.icon }}</v-icon>
            <span class="text-xxs" style="max-width: 160px; white-space: normal">{{
              tipoZona.nombre
            }}</span>
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="tab">
          <v-tabs-window-item
            v-for="tipoZona in tiposZonas"
            :key="tipoZona.id"
            :value="tipoZona.id"
          >
            <v-card class="bg-dinamico">
              <v-card-title class="d-flex justify-space-between align-center">
                <span
                  class="hidden sm:inline text-sm truncate text-green-600"
                  style="max-width: 80%; white-space: normal"
                  v-html="tipoZona.descripcion || 'Sin descripcion disponible'"
                ></span>

                <v-btn
                  color="green-lighten-2"
                  icon="mdi-plus"
                  size="small"
                  @click="abrirDialogoCrear(tipoZona)"
                ></v-btn>
              </v-card-title>
              <!--
                                :items="getZonasPorTipo(tipoZona.id)"
                  :search="search"

              -->
              <v-card-text>
                <v-data-table
                  :headers="headers"
                  :items="filteredZonas(tipoZona.id)"
                  :items-per-page="15"
                  :loading="zonasStore.loading"
                  class="elevation-1 tabla-compacta"
                  density="compact"
                  item-value="id"
                  show-expand
                  v-model:expanded="expanded"
                  header-class="custom-header"
                >
                  <template #top>
                    <div class="flex space-x-4 m-0 p-0 pl-1 ml-1">
                      <v-text-field
                        prepend-inner-icon="mdi-map"
                        clearable
                        v-model="search.nombre"
                        label="BUSCAR NOMBRE"
                        variant="outlined"
                        class="compact-form-2"
                      ></v-text-field>
                      <v-text-field
                        clearable
                        prepend-inner-icon="mdi-sprout"
                        v-model="search.siembra"
                        label="BUSCAR SIEMBRA"
                        variant="outlined"
                        class="compact-form-2"
                      ></v-text-field>
                    </div>
                  </template>

                  <template #[`item.bpa_estado`]="{ item }">
                    <span
                      :class="{
                        'text-red font-extrabold': item.bpa_estado < 40,
                        'text-orange font-extrabold': item.bpa_estado >= 40 && item.bpa_estado < 80,
                        'text-green font-extrabold': item.bpa_estado >= 80
                      }"
                    >
                      {{ item.bpa_estado }}%
                    </span>
                  </template>

                  <template #[`item.siembra`]="{ item }">
                    <v-avatar :image="CargaImagenSiembra(item.siembra)" size="30"></v-avatar>
                    {{ getSiembraNombre(item.siembra) }}
                  </template>

                  <template #[`item.actions`]="{ item }">
                    <v-icon class="me-2" @click="editarZona(item)"> mdi-pencil </v-icon>
                    <v-icon @click="confirmarEliminarZona(item)"> mdi-delete </v-icon>
                  </template>

                  <template #expanded-row="{ columns, item }">
                    <td :colspan="columns.length">
                      <v-card flat class="pa-4">
                        <v-row no-gutters>
                          <v-col cols="9" class="pr-4">
                            <v-row no-gutters align="center" class="mb-2">
                              <v-col cols="auto" class="mr-2">
                                <v-icon>mdi-map-marker-radius</v-icon>
                              </v-col>
                              <v-col>
                                {{
                                  item.area
                                    ? `${item.area.area} ${item.area.unidad}`
                                    : 'Área no especificada'
                                }}
                              </v-col>
                              <v-col cols="auto" class="ml-4" v-if="item.gps">
                                <v-icon>mdi-crosshairs-gps</v-icon>
                              </v-col>
                              <v-col v-if="item.gps">
                                Lat: {{ item.gps.lat }}, Lng: {{ item.gps.lng }}
                              </v-col>
                            </v-row>
                            <v-row no-gutters align="center">
                              <v-col cols="auto" class="mr-2">
                                <v-icon>mdi-information-outline</v-icon>
                              </v-col>
                              <v-col>
                                <p
                                  class="ml-2 mr-0 p-0 text-xs"
                                  v-html="item.info || 'No disponible'"
                                ></p>
                              </v-col>
                            </v-row>
                            <v-row no-gutters align="center">
                              <v-chip
                                v-for="(metrica, key) in item.metricas"
                                :key="key"
                                color="blue-grey-lighten-1"
                                size="x-small"
                                variant="flat"
                                class="m-1"
                              >
                                {{ key.toUpperCase() }}:{{ metrica.valor }}
                              </v-chip>
                            </v-row>
                          </v-col>
                          <v-col cols="3" class="d-flex justify-center align-center">
                            <v-img
                              v-if="item.avatar"
                              :src="getAvatarUrl(item)"
                              max-width="150"
                              max-height="150"
                              contain
                            >
                              <template v-slot:placeholder>
                                <v-icon size="150" color="grey lighten-2">mdi-image-off</v-icon>
                              </template>
                            </v-img>
                            <v-icon v-else size="150" color="grey lighten-2">mdi-image-off</v-icon>
                          </v-col>
                        </v-row>
                      </v-card>
                    </td>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-container>
    </main>
    <v-dialog v-model="dialogoCrear" persistent max-width="1000px ">
      <ZonaForm
        :modo-edicion="modoEdicion"
        :zona-inicial="zonaEditando"
        :tipo-zona-actual="tipoZonaActual"
        :from-siembra-workspace="false"
        :siembras-activas="siembrasActivas"
        @close="cerrarDialogo"
        @saved="onZonaSaved"
      />
    </v-dialog>
    <!-- Diálogo para mostrar la imagen en grande -->
    <v-dialog v-model="dialogoImagenGrande" max-width="800px">
      <v-img :src="getAvatarUrl(zonaEditando)" />
      <v-card-actions>
        <v-btn @click="dialogoImagenGrande = false">Cerrar</v-btn>
      </v-card-actions>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useZonasStore } from '@/stores/zonasStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { storeToRefs } from 'pinia'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useAvatarStore } from '@/stores/avatarStore'

import ZonaForm from '@/components/forms/ZonaForm.vue'

const zonasStore = useZonasStore()
const siembrasStore = useSiembrasStore()
const snackbarStore = useSnackbarStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const avatarStore = useAvatarStore()

const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const userRole = computed(() => user.value.role)
const avatarUrl = computed(() => profileStore.avatarUrl)
//const getSiembraAvatarUrl = siembrasStore.getSiembraAvatarUrl

// Computed para obtener el promedio de bpa_estado
const promedioBpaEstado = computed(() => zonasStore.promedioBpaEstado)

// Computed para determinar el color basado en el promedio
const colorBpaEstado = computed(() => {
  if (promedioBpaEstado.value < 40) return 'red'
  if (promedioBpaEstado.value < 80) return 'orange'
  return 'green'
})

const { zonas, tiposZonas } = storeToRefs(zonasStore)
const { cargarZonas, cargarTiposZonas, eliminarZona } = zonasStore
/*const { cargarZonas, cargarTiposZonas, crearZona, eliminarZona } = zonasStore*/
const { siembras } = storeToRefs(siembrasStore)

const dialogoCrear = ref(false)
const modoEdicion = ref(false)
const zonaEditando = ref({
  nombre: '',
  area: { area: null, unidad: '' },
  info: '',
  tipos_zonas: null,
  hacienda: computed(() => mi_hacienda.value?.id),
  siembra: null,
  avatar: null,
  datos_bpa: [],
  metricas: {} // Añadimos este campo
})
/*const formularioValido = ref(true)
const form = ref(null)*/
const expanded = ref([])

const siembrasActivas = computed(() => {
  return siembras.value
    .filter((siembra) => siembra.estado !== 'finalizada')
    .map((siembra) => ({
      ...siembra,
      nombreCompleto: `${siembra.nombre} (${siembra.tipo})`
    }))
})

const search = ref({
  nombre: '',
  siembra: ''
})

const headers = [
  { title: 'Nombre', align: 'start', key: 'nombre' },
  { title: 'BPA', align: 'center', key: 'bpa_estado' },
  { title: 'Siembra', align: 'start', key: 'siembra' },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

// Initialize tab with null or the first tipoZona id if available
const tab = ref(null)

const getSiembraNombre = (siembraId) => {
  if (!siembraId) return 'General'
  const siembra = siembras.value.find((s) => s.id === siembraId)
  return siembra ? `${siembra.nombre} ${siembra.tipo}` : 'Siembra no encontrada'
}

const getSiembraId = (siembraNombre) => {
  const siembrasEncontradas = siembras.value.filter(
    (s) =>
      s.nombre.toUpperCase().includes(siembraNombre.toUpperCase()) ||
      s.tipo.toUpperCase().includes(siembraNombre.toUpperCase())
  )
  return siembrasEncontradas.map((siembra) => siembra.id) // Devuelve un array de IDs
}

const tipoZonaActual = ref({})

const getAvatarUrl = (zona) => {
  return avatarStore.getAvatarUrl({ ...zona, type: 'zona' }, 'zonas')
}

onMounted(async () => {
  try {
    await Promise.all([cargarTiposZonas(), cargarZonas(), siembrasStore.cargarSiembras()])

    // Set initial tab value to the first tipoZona id if available
    if (tiposZonas.value.length > 0) {
      tab.value = tiposZonas.value[0].id
    }
  } catch (error) {
    console.error('Error loading data:', error)
    snackbarStore.showError('Error al cargar los datos')
  }
})

const abrirDialogoCrear = (tipoZona) => {
  modoEdicion.value = false
  tipoZonaActual.value = tipoZona

  // Inicializar métricas correctamente
  const metricasInicializadas = {}
  if (tipoZona?.metricas?.metricas) {
    Object.entries(tipoZona.metricas.metricas).forEach(([key, value]) => {
      metricasInicializadas[key] = {
        ...value,
        valor: getDefaultMetricaValue(value.tipo)
      }
    })
  }

  zonaEditando.value = {
    nombre: '',
    area: { area: null, unidad: '' },
    info: '',
    tipos_zonas: tipoZona.id,
    hacienda: mi_hacienda.value?.id,
    siembra: null,
    contabilizable: true,
    datos_bpa: tipoZona.datos_bpa?.preguntas_bpa?.map(() => ({ respuesta: null })) || [],
    metricas: metricasInicializadas
  }

  dialogoCrear.value = true
}

const CargaImagenSiembra = (siembraId) => {
  const siembra = siembras.value.find((s) => s.id === siembraId)
  if (!siembra) return null
  return avatarStore.getAvatarUrl({ ...siembra, type: 'siembra' }, 'Siembras')
}

function getDefaultMetricaValue(tipo) {
  switch (tipo) {
    case 'checkbox':
      return []
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'select':
      return null
    default:
      return null
  }
}

const editarZona = (zona) => {
  modoEdicion.value = true
  tipoZonaActual.value = tiposZonas.value.find((tipo) => tipo.id === zona.tipos_zonas)

  zonaEditando.value = {
    ...zona,
    datos_bpa: zona.datos_bpa || [],
    metricas: zona.metricas || {}
  }

  console.log('metricas cargadas para edición:', zonaEditando.value.metricas)
  dialogoCrear.value = true
}

const cerrarDialogo = () => {
  dialogoCrear.value = false
  // form.value.reset()
  avatarFile.value = null // Limpiar el archivo después de la actualización
}

const confirmarEliminarZona = (zona) => {
  if (confirm(`¿Estás seguro de que quieres eliminar la zona "${zona.nombre}"?`)) {
    eliminarZona(zona.id)
      .then(() => cargarZonas())
      .catch(() => snackbarStore.showError('Error al eliminar la zona'))
  }
}

const avatarFile = ref(null) // Agregar ref para manejar el archivo del avatar

const dialogoImagenGrande = ref(false)

// Usar watch para observar cambios en zonas
watch(
  () => zonasStore.zonas,
  (newZonas) => {
    const updatedZona = newZonas.find((z) => z.id === zonaEditando.value.id)
    if (updatedZona) {
      zonaEditando.value = updatedZona // Actualiza zonaEditando si hay cambios
    }
  }
)

const onZonaSaved = async () => {
  dialogoCrear.value = false
  await cargarZonas() // Recargar zonas para reflejar los cambios
  snackbarStore.showSnackbar('Zona guardada exitosamente', 'success')
}

/*
const getZonasPorTipo = (tipoId) => {
  return zonas.value.filter((zona) => zona && zona.tipo === tipoId)
}
*/

const filteredZonas = (tipoId) => {
  let zonastemp = zonas.value.filter((zona) => zona && zona.tipos_zonas === tipoId)

  // Obtener los IDs de siembras que coinciden
  const siembraIdsTemp = search.value.siembra ? getSiembraId(search.value.siembra) : []

  return zonastemp.filter((zona) => {
    const matchesNombre = search.value.nombre
      ? zona.nombre.includes(search.value.nombre.toUpperCase())
      : true // Si no hay búsqueda, siempre coincide

    const matchesSiembra =
      siembraIdsTemp.length > 0
        ? siembraIdsTemp.includes(zona.siembra) // Verifica si el ID de la zona está en los IDs encontrados
        : true // Si no hay búsqueda, siempre coincide

    return matchesNombre && matchesSiembra
  })
}
</script>

<style scoped>
.v-tabs-window {
  @apply w-full;
}

.v-tabs-window-item {
  @apply w-full;
}
</style>
