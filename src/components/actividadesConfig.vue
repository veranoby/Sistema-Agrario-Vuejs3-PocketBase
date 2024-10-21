<template>
  <v-container fluid class="pa-2">
    <div class="grid grid-cols-4 gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0 px-2 py-2">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                Actividades y Programas de trabajo
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
                <span class="hidden sm:inline">Actividades y Programas</span>
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
          align-tabs="center"
          bg-color="green-lighten-1"
          color="black"
          height="60"
          slider-color="black"
          stacked
          show-arrows
          class="rounded-lg"
        >
          <v-tab v-for="tipoZona in tiposActividades" :key="tipoZona.id" :value="tipoZona.id">
            <v-icon>{{ tipoZona.icon }}</v-icon>
            <span class="text-xxs truncate" style="max-width: 160px; white-space: normal">{{
              tipoZona.nombre
            }}</span>
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="tab">
          <v-tabs-window-item
            v-for="tipoZona in tiposActividades"
            :key="tipoZona.id"
            :value="tipoZona.id"
          >
            <v-card class="bg-dinamico">
              <v-card-title class="d-flex justify-space-between align-center">
                <span
                  class="hidden sm:inline text-sm truncate"
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
              <v-card-text>
                <v-data-table
                  :headers="headers"
                  :items="getActividadesPorTipo(tipoZona.id)"
                  :search="search"
                  :items-per-page="10"
                  :loading="actividadesStore.loading"
                  class="elevation-1 tabla-compacta"
                  density="compact"
                  item-value="id"
                  show-expand
                  v-model:expanded="expanded"
                  header-class="custom-header"
                >
                  <template #top>
                    <v-text-field
                      v-model="search"
                      label="Buscar"
                      variant="outlined"
                      class="mx-4 compact-form-2"
                    ></v-text-field>
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
                          <v-col cols="7" class="pr-4">
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
                                {{ item.info || 'Sin información adicional' }}
                              </v-col>
                            </v-row>
                          </v-col>
                          <v-col cols="5" class="d-flex justify-center align-center">
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
    <v-dialog v-model="dialogoCrear" max-width="900px">
      <v-card>
        <v-card-title>
          <span class="text-h5">
            {{ modoEdicion ? 'Editar' : 'Crear' }} {{ tipoZonaActual.nombre }}
          </span>
        </v-card-title>
        <v-card-text class="pr-0 pb-0">
          <v-form ref="form" v-model="formularioValido" lazy-validation>
            <v-row class="items-start">
              <v-col cols="6" class="flex flex-col justify-start">
                <!-- Columna izquierda -->
                <v-text-field
                  v-model="actividadEditando.nombre"
                  label="Nombre"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  required
                  :rules="[(v) => !!v || 'El nombre es requerido']"
                ></v-text-field>
                <v-row>
                  <v-col>
                    <v-text-field
                      v-model.number="actividadEditando.area.area"
                      label="Área"
                      type="number"
                      variant="outlined"
                      density="compact"
                      class="compact-form"
                      :rules="[(v) => !!v || 'El área es requerida']"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-select
                      v-model="actividadEditando.area.unidad"
                      variant="outlined"
                      density="compact"
                      class="compact-form"
                      :items="['m²', 'ha', 'km²']"
                      label="Unidad de área"
                      :rules="[(v) => !!v || 'La unidad es requerida']"
                    ></v-select>
                  </v-col>
                </v-row>
                <v-select
                  v-model="actividadEditando.siembra"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  :items="siembrasActivas"
                  item-title="nombreCompleto"
                  item-value="id"
                  label="Siembra"
                ></v-select>
                <v-text-field
                  v-model="actividadEditando.gps"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  label="GPS (Lat, Lng)"
                  placeholder="Ej: {lat: 0, lng: 0}"
                ></v-text-field>
                <v-checkbox
                  v-model="actividadEditando.contabilizable"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  label="Contabilizable"
                ></v-checkbox>
              </v-col>
              <v-col cols="6" class="flex flex-col justify-start py-0">
                <!-- Columna derecha -->
                <v-textarea
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  v-model="actividadEditando.info"
                  label="Información adicional"
                ></v-textarea>

                <!-- AREA DE CARGAR EL AVATAR -->
                <div>
                  <v-row align="center">
                    <v-col class="pb-0">
                      <v-file-input
                        v-model="avatarFile"
                        rounded
                        class="compact-form-2"
                        variant="outlined"
                        color="green"
                        prepend-icon="mdi-camera"
                        label="Upload Avatar"
                        accept="image/*"
                        @change="updateAvatar"
                        show-size
                      ></v-file-input>
                    </v-col>
                    <v-col class="py-0" v-if="actividadEditando.avatar">
                      <v-btn
                        icon
                        variant="outlined"
                        density="compact"
                        size="small"
                        @click="borrarAvatar"
                        color="red"
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                </div>
                <!-- Show current avatar -->
                <v-img
                  v-if="actividadEditando.avatar"
                  :src="getAvatarUrl(actividadEditando)"
                  max-width="150"
                  max-height="150"
                  contain
                  @click="abrirImagenGrande"
                >
                  <template v-slot:placeholder>
                    <v-icon size="150" color="grey lighten-2">mdi-image-off</v-icon>
                  </template>
                </v-img>
                <v-icon v-else size="150" color="grey lighten-2">mdi-image-off</v-icon>
              </v-col>
            </v-row>

            <!-- Formulario de Métricas -->

            <v-row class="mt-4">
              <v-col class="py-0">
                <h4 class="text-xl font-bold">MÉTRICAS</h4>

                <div class="bg-dinamico rounded-lg px-3 border-4 py-2 my-3 ml-0 mr-4">
                  <v-row>
                    <!-- Iteramos sobre las métricas -->
                    <v-col
                      v-for="(metrica, key) in tipoZonaActual.metricas.metricas"
                      :key="key"
                      cols="6"
                    >
                      <!-- Campo para tipo 'number' -->
                      <v-text-field
                        v-if="metrica.tipo === 'number'"
                        v-model.number="actividadEditando.metricas[key].valor"
                        :label="metrica.descripcion"
                        type="number"
                        variant="outlined"
                        density="compact"
                      ></v-text-field>

                      <!-- Campo para tipo 'checkbox' -->
                      <div v-if="metrica.tipo === 'checkbox'" class="checkbox-group">
                        <p class="text-xs">{{ metrica.descripcion }}</p>
                        <div class="checkbox-container">
                          <v-checkbox
                            v-for="opcion in metrica.opciones"
                            :key="opcion"
                            v-model="actividadEditando.metricas[key].valor"
                            :label="opcion"
                            :value="opcion"
                            density="compact"
                            hide-details
                            class="checkbox-item"
                          ></v-checkbox>
                        </div>
                      </div>

                      <!-- Campo para tipo 'select' -->
                      <v-select
                        v-if="metrica.tipo === 'select'"
                        v-model="actividadEditando.metricas[key].valor"
                        :items="metrica.opciones"
                        :label="metrica.descripcion"
                        variant="outlined"
                        class="compact-form"
                        density="compact"
                      ></v-select>

                      <!-- Campo para tipo 'boolean' -->
                      <v-checkbox
                        v-if="metrica.tipo === 'boolean'"
                        v-model="actividadEditando.metricas[key].valor"
                        :label="metrica.descripcion"
                        class="compact-form"
                      ></v-checkbox>
                    </v-col>
                  </v-row>
                </div>
              </v-col>
            </v-row>

            <!-- Formulario de BPA -->

            <v-row class="mt-4">
              <v-col class="py-0">
                <h4 class="text-xl font-bold">SEGUIMIENTO BPA</h4>

                <div
                  class="bg-dinamico rounded-lg px-3 border-4 py-2 my-3 ml-0 mr-4"
                  v-if="tipoZonaActual.datos_bpa && tipoZonaActual.datos_bpa.preguntas_bpa"
                >
                  <v-row>
                    <v-col
                      v-for="(pregunta, index) in tipoZonaActual.datos_bpa.preguntas_bpa"
                      :key="index"
                      cols="6"
                    >
                      <v-tooltip
                        v-if="pregunta.descripcion"
                        location="top"
                        width="400"
                        v-bind:text="pregunta.descripcion"
                      >
                        <template v-slot:activator="{ props }">
                          <p v-bind="props" class="font-extrabold text-xs">
                            {{ pregunta.pregunta }}
                          </p>
                        </template>
                      </v-tooltip>

                      <v-tooltip
                        v-else
                        location="top"
                        width="400"
                        text="La documentacion es OBLIGATORIA"
                      >
                        <template v-slot:activator="{ props }">
                          <p v-bind="props" class="font-extrabold text-xs">
                            {{ pregunta.pregunta }}
                          </p>
                        </template>
                      </v-tooltip>

                      <v-radio-group
                        inline
                        v-model="actividadEditando.datos_bpa[index].respuesta"
                        class="mt-2 compact-form"
                      >
                        <v-radio
                          v-for="(opcion, opcionIndex) in pregunta.opciones"
                          :key="`${index}-${opcionIndex}`"
                          :label="opcion"
                          :value="opcion"
                        ></v-radio>
                      </v-radio-group>
                    </v-col>
                  </v-row>
                </div>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="cerrarDialogo"
            >Cancelar</v-btn
          >
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            @click="guardarZona"
            :disabled="!formularioValido"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Diálogo para mostrar la imagen en grande -->
    <v-dialog v-model="dialogoImagenGrande" max-width="800px">
      <v-img :src="getAvatarUrl(actividadEditando)" />
      <v-card-actions>
        <v-btn @click="dialogoImagenGrande = false">Cerrar</v-btn>
      </v-card-actions>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { storeToRefs } from 'pinia'
import { useSnackbarStore } from '@/stores/snackbarStore'

import { pb } from '@/utils/pocketbase'

const actividadesStore = useActividadesStore()
const siembrasStore = useSiembrasStore()
const snackbarStore = useSnackbarStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()

const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const userRole = computed(() => user.value.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

// Computed para obtener el promedio de bpa_estado
const promedioBpaEstado = computed(() => actividadesStore.promedioBpaEstado)

// Computed para determinar el color basado en el promedio
const colorBpaEstado = computed(() => {
  if (promedioBpaEstado.value < 40) return 'red'
  if (promedioBpaEstado.value < 80) return 'orange'
  return 'green'
})

const { actividades, tiposActividades } = storeToRefs(actividadesStore)
const { cargarActividades, cargarTiposActividades, crearZona, eliminarZona } = actividadesStore
const { siembras } = storeToRefs(siembrasStore)

const dialogoCrear = ref(false)
const modoEdicion = ref(false)
const actividadEditando = ref({
  nombre: '',
  area: { area: null, unidad: '' },
  info: '',
  tipo: null,
  hacienda: computed(() => mi_hacienda.value?.id),
  siembra: null,
  avatar: null,
  datos_bpa: [],
  metricas: {} // Añadimos este campo
})
const formularioValido = ref(true)
const form = ref(null)
const expanded = ref([])

const siembrasActivas = computed(() => {
  return siembras.value
    .filter((siembra) => siembra.estado !== 'finalizada')
    .map((siembra) => ({
      ...siembra,
      nombreCompleto: `${siembra.nombre} (${siembra.tipo})`
    }))
})

const search = ref('')

const headers = [
  { title: 'Nombre', align: 'start', key: 'nombre' },
  { title: 'BPA', align: 'center', key: 'bpa_estado' },
  { title: 'Siembra', align: 'start', key: 'siembra' },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

// Initialize tab with null or the first tipoZona id if available
const tab = ref(null)

const getActividadesPorTipo = (tipoId) => {
  return actividades.value.filter((actividad) => actividad && actividad.tipo === tipoId)
}

const getSiembraNombre = (siembraId) => {
  if (!siembraId) return 'General'
  const siembra = siembras.value.find((s) => s.id === siembraId)
  return siembra ? `${siembra.nombre} ${siembra.tipo}` : 'Siembra no encontrada'
}

const tipoZonaActual = ref({})

const updateAvatar = async () => {
  if (avatarFile.value) {
    if (actividadEditando.value.id) {
      await actividadesStore.updateZonaAvatar(actividadEditando.value.id, avatarFile.value)
      // Actualizar actividadEditando después de la carga
      actividadEditando.value = {
        ...actividadesStore.actividades.find((z) => z.id === actividadEditando.value.id)
      }
      avatarFile.value = null // Limpiar el archivo después de la actualización
    }
  }
}

const getAvatarUrl = (actividad) => {
  if (actividad.avatar) {
    return pb.getFileUrl(actividad, actividad.avatar)
  }
  return null // This will activate the placeholder
}

onMounted(async () => {
  try {
    await Promise.all([
      cargarTiposActividades(),
      cargarActividades(),
      siembrasStore.fetchSiembras()
    ])

    // Set initial tab value to the first tipoZona id if available
    if (tiposActividades.value.length > 0) {
      tab.value = tiposActividades.value[0].id
    }
  } catch (error) {
    console.error('Error loading data:', error)
    snackbarStore.showError('Error al cargar los datos')
  }
})

const abrirDialogoCrear = (tipoZona) => {
  modoEdicion.value = false
  tipoZonaActual.value = tipoZona
  actividadEditando.value = {
    nombre: '',
    area: { area: null, unidad: '' },
    info: '',
    tipo: tipoZona.id,
    hacienda: mi_hacienda.value?.id,
    siembra: null,
    datos_bpa: (tipoZona.datos_bpa?.preguntas_bpa || []).map(() => ({ respuesta: null })),
    metricas: Object.fromEntries(
      Object.entries(tipoZona.metricas?.metricas || {}).map(([key, value]) => [
        key,
        {
          ...value,
          valor:
            value.tipo === 'checkbox'
              ? []
              : value.tipo === 'number'
                ? 0
                : value.tipo === 'select'
                  ? null
                  : value.tipo === 'boolean'
                    ? false
                    : null
        } // Inicializamos 'valor' según el tipo de métrica
      ])
    )
  }

  console.log('Abrir dialogo - tipoZonaActual.metricas:', actividadEditando.value.metricas)
  dialogoCrear.value = true
}

const editarZona = (actividad) => {
  modoEdicion.value = true
  tipoZonaActual.value = tiposActividades.value.find((tipo) => tipo.id === actividad.tipo)
  actividadEditando.value = {
    ...actividad,
    datos_bpa: actividad.datos_bpa || [],
    metricas: {
      ...actividad.metricas
    }
  }
  console.log('metricas cargadas para edición:', actividadEditando.value.metricas)
  dialogoCrear.value = true
}

const cerrarDialogo = () => {
  dialogoCrear.value = false
  // form.value.reset()
  avatarFile.value = null // Limpiar el archivo después de la actualización
}

const guardarZona = async () => {
  if (form.value.validate()) {
    try {
      const actividadToSave = { ...actividadEditando.value }

      if (modoEdicion.value) {
        await actividadesStore.updateZona(actividadToSave.id, actividadToSave)
      } else {
        const nuevaZona = await crearZona(actividadToSave)
        if (avatarFile.value) {
          await actividadesStore.updateZonaAvatar(nuevaZona.id, avatarFile.value[0])
        }
      }

      cerrarDialogo()
      await actividadesStore.cargarActividades() // Recargar las actividades después de guardar
    } catch (error) {
      snackbarStore.showError('Error al guardar la actividad')
    }
  }
}

const confirmarEliminarZona = (actividad) => {
  if (confirm(`¿Estás seguro de que quieres eliminar la actividad "${actividad.nombre}"?`)) {
    eliminarZona(actividad.id)
      .then(() => cargarActividades())
      .catch(() => snackbarStore.showError('Error al eliminar la actividad'))
  }
}

const avatarFile = ref(null) // Agregar ref para manejar el archivo del avatar

const dialogoImagenGrande = ref(false)

const abrirImagenGrande = () => {
  dialogoImagenGrande.value = true
}

const borrarAvatar = async () => {
  if (actividadEditando.value.avatar) {
    try {
      await actividadesStore.updateZonaAvatar(actividadEditando.value.id, '')
      actividadEditando.value.avatar = null
      snackbarStore.showSnackbar('Avatar borrado exitosamente')
    } catch (error) {
      console.error('Error al borrar el avatar:', error)
      snackbarStore.showError('Error al borrar el avatar')
    }
  }
}

// Usar watch para observar cambios en actividades
watch(
  () => actividadesStore.actividades,
  (newActividades) => {
    const updatedZona = newActividades.find((z) => z.id === actividadEditando.value.id)
    if (updatedZona) {
      actividadEditando.value = updatedZona // Actualiza actividadEditando si hay cambios
    }
  }
)
</script>

<style scoped>
.v-tabs-window {
  @apply w-full;
}

.v-tabs-window-item {
  @apply w-full;
}
</style>
