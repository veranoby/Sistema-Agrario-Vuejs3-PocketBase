<template>
  <v-container fluid class="pa-6">
    <div class="grid grid-cols-4 gap-2 p-2 m-2">
      <header class="col-span-3 p-2 bg-background shadow-sm">
        <div class="profile-container mt-0 ml-0">
          <h3 class="profile-title">
            Zonas y logística de trabajo
            <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
              {{ userRole }}
            </v-chip>
            <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
              HACIENDA: {{ mi_hacienda?.name }}
            </v-chip>
          </h3>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
      <!-- circular progress control-->
      <div class="mt-2 text-center">
        <!-- Centrado del contenido -->
        <h4
          :class="{
            'text-red font-extrabold pt-0 pb-2': promedioBpaEstado < 40,
            'text-orange font-extrabold pt-0 pb-2':
              promedioBpaEstado >= 40 && promedioBpaEstado < 80,
            'text-green font-extrabold pt-0 pb-2': promedioBpaEstado >= 80
          }"
        >
          Avance BPA: Zonas y logística
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

    <v-tabs v-model="tab" background-color="transparent" color="primary">
      <v-tab v-for="tipoZona in tiposZonas" :key="tipoZona.id" :value="tipoZona.id">
        {{ tipoZona.nombre }}
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="tab">
      <v-tabs-window-item v-for="tipoZona in tiposZonas" :key="tipoZona.id" :value="tipoZona.id">
        <v-card class="mb-6 bg-dinamico">
          <v-card-title class="d-flex justify-space-between align-center">
            <v-tooltip :text="tipoZona.descripcion || 'No disponible'" location="top">
              <template v-slot:activator="{ props }">
                <span class="text-base" v-bind="props">
                  <v-icon>{{ tipoZona.icon }}</v-icon> {{ tipoZona.nombre }}
                </span>
              </template>
              <template v-slot:default>
                <span v-html="tipoZona.descripcion || 'No disponible'"></span>
              </template>
            </v-tooltip>

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
              :items="getZonasPorTipo(tipoZona.id)"
              :search="search"
              :items-per-page="10"
              :loading="zonasStore.loading"
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
                  v-model="zonaEditando.nombre"
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
                      v-model.number="zonaEditando.area.area"
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
                      v-model="zonaEditando.area.unidad"
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
                  v-model="zonaEditando.siembra"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  :items="siembrasActivas"
                  item-title="nombreCompleto"
                  item-value="id"
                  label="Siembra"
                ></v-select>
                <v-text-field
                  v-model="zonaEditando.gps"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  label="GPS (Lat, Lng)"
                  placeholder="Ej: {lat: 0, lng: 0}"
                ></v-text-field>
                <v-checkbox
                  v-model="zonaEditando.contabilizable"
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
                  v-model="zonaEditando.info"
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
                    <v-col class="py-0" v-if="zonaEditando.avatar">
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
                  v-if="zonaEditando.avatar"
                  :src="getAvatarUrl(zonaEditando)"
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
                        v-model.number="zonaEditando.metricas[key].valor"
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
                            v-model="zonaEditando.metricas[key].valor"
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
                        v-model="zonaEditando.metricas[key].valor"
                        :items="metrica.opciones"
                        :label="metrica.descripcion"
                        variant="outlined"
                        class="compact-form"
                        density="compact"
                      ></v-select>

                      <!-- Campo para tipo 'boolean' -->
                      <v-checkbox
                        v-if="metrica.tipo === 'boolean'"
                        v-model="zonaEditando.metricas[key].valor"
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
                        v-model="zonaEditando.datos_bpa[index].respuesta"
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

import { pb } from '@/utils/pocketbase'

const zonasStore = useZonasStore()
const siembrasStore = useSiembrasStore()
const snackbarStore = useSnackbarStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()

const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const userRole = computed(() => user.value.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

// Computed para obtener el promedio de bpa_estado
const promedioBpaEstado = computed(() => zonasStore.promedioBpaEstado)

// Computed para determinar el color basado en el promedio
const colorBpaEstado = computed(() => {
  if (promedioBpaEstado.value < 40) return 'red'
  if (promedioBpaEstado.value < 80) return 'orange'
  return 'green'
})

const { zonas, tiposZonas } = storeToRefs(zonasStore)
const { cargarZonas, cargarTiposZonas, crearZona, eliminarZona } = zonasStore
const { siembras } = storeToRefs(siembrasStore)

const dialogoCrear = ref(false)
const modoEdicion = ref(false)
const zonaEditando = ref({
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

const getZonasPorTipo = (tipoId) => {
  return zonas.value.filter((zona) => zona && zona.tipo === tipoId)
}

const getSiembraNombre = (siembraId) => {
  if (!siembraId) return 'General'
  const siembra = siembras.value.find((s) => s.id === siembraId)
  return siembra ? `${siembra.nombre} ${siembra.tipo}` : 'Siembra no encontrada'
}

const tipoZonaActual = ref({})

const updateAvatar = async () => {
  if (avatarFile.value) {
    if (zonaEditando.value.id) {
      await zonasStore.updateZonaAvatar(zonaEditando.value.id, avatarFile.value)
      // Actualizar zonaEditando después de la carga
      zonaEditando.value = { ...zonasStore.zonas.find((z) => z.id === zonaEditando.value.id) }
      avatarFile.value = null // Limpiar el archivo después de la actualización
    }
  }
}

const getAvatarUrl = (zona) => {
  if (zona.avatar) {
    return pb.getFileUrl(zona, zona.avatar)
  }
  return null // This will activate the placeholder
}

onMounted(async () => {
  try {
    await Promise.all([cargarTiposZonas(), cargarZonas(), siembrasStore.fetchSiembras()])

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
  zonaEditando.value = {
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

  console.log('Abrir dialogo - tipoZonaActual.metricas:', zonaEditando.value.metricas)
  dialogoCrear.value = true
}

const editarZona = (zona) => {
  modoEdicion.value = true
  tipoZonaActual.value = tiposZonas.value.find((tipo) => tipo.id === zona.tipo)
  zonaEditando.value = {
    ...zona,
    datos_bpa: zona.datos_bpa || [],
    metricas: {
      ...zona.metricas
    }
  }
  console.log('metricas cargadas para edición:', zonaEditando.value.metricas)
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
      const zonaToSave = { ...zonaEditando.value }

      if (modoEdicion.value) {
        await zonasStore.updateZona(zonaToSave.id, zonaToSave)
      } else {
        const nuevaZona = await crearZona(zonaToSave)
        if (avatarFile.value) {
          await zonasStore.updateZonaAvatar(nuevaZona.id, avatarFile.value[0])
        }
      }

      cerrarDialogo()
      await zonasStore.cargarZonas() // Recargar las zonas después de guardar
    } catch (error) {
      snackbarStore.showError('Error al guardar la zona')
    }
  }
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

const abrirImagenGrande = () => {
  dialogoImagenGrande.value = true
}

const borrarAvatar = async () => {
  if (zonaEditando.value.avatar) {
    try {
      await zonasStore.updateZonaAvatar(zonaEditando.value.id, '')
      zonaEditando.value.avatar = null
      snackbarStore.showSnackbar('Avatar borrado exitosamente')
    } catch (error) {
      console.error('Error al borrar el avatar:', error)
      snackbarStore.showError('Error al borrar el avatar')
    }
  }
}

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
</script>

<style scoped>
.v-tabs-window {
  @apply w-full;
}

.v-tabs-window-item {
  @apply w-full;
}
</style>
