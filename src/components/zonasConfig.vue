<template>
  <v-container fluid class="pa-6">
    <header class="bg-background shadow-sm">
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

    <v-row>
      <v-col v-for="tipoZona in tiposZonas" :key="tipoZona.id" cols="12" md="6">
        <v-card class="mb-6 bg-dinamico">
          <v-card-title class="d-flex justify-space-between align-center">
            <v-tooltip :text="tipoZona.descripcion || 'No disponible'" location="top">
              <template v-slot:activator="{ props }">
                <span v-bind="props"> {{ tipoZona.nombre }}</span>
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
                    'text-red-500': item.bpa_estado < 40,
                    'text-orange-500': item.bpa_estado >= 40 && item.bpa_estado < 80,
                    'text-green-500': item.bpa_estado >= 80
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
                          :src="item.avatar"
                          max-width="150"
                          max-height="150"
                          contain
                        ></v-img>
                        <v-icon v-else size="150" color="grey lighten-1">mdi-image-off</v-icon>
                      </v-col>
                    </v-row>
                  </v-card>
                </td>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialogoCrear" max-width="850px">
      <v-card>
        <v-card-title>
          <span class="text-h5">
            {{ modoEdicion ? 'Editar' : 'Crear' }} {{ tipoZonaActual.nombre }}
          </span>
        </v-card-title>
        <v-card-text>
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
                <v-textarea
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  v-model="zonaEditando.info"
                  label="Información adicional"
                ></v-textarea>
                <v-text-field
                  v-model.number="zonaEditando.area.area"
                  label="Área"
                  type="number"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  required
                  :rules="[(v) => !!v || 'El área es requerida']"
                ></v-text-field>
                <v-select
                  v-model="zonaEditando.area.unidad"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  :items="['m²', 'ha', 'km²']"
                  label="Unidad de área"
                  required
                  :rules="[(v) => !!v || 'La unidad es requerida']"
                ></v-select>
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
                <v-file-input
                  v-model="zonaEditando.avatar"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                  label="Avatar"
                  accept="image/*"
                ></v-file-input>
              </v-col>
              <v-col cols="6" class="flex flex-col justify-start">
                <!-- Sección para mostrar preguntas de datos_bpa -->
                <div
                  class="compact-form bg-dinamico rounded-lg p-3 border-4"
                  v-if="tipoZonaActual.datos_bpa && tipoZonaActual.datos_bpa.preguntas_bpa"
                >
                  <h4 class="text-xl font-bold">SEGUIMIENTO BPA <br /><br /></h4>
                  <div
                    v-for="(pregunta, index) in tipoZonaActual.datos_bpa.preguntas_bpa"
                    :key="index"
                    class="mb-4"
                  >
                    <p class="font-bold">{{ pregunta.pregunta }}</p>
                    <p v-if="pregunta.descripcion" class="mb-2 text-slate-800 font-extralight">
                      {{ pregunta.descripcion }}
                    </p>
                    <!-- Solo muestra si existe -->
                    <v-radio-group v-model="zonaEditando.datos_bpa[index].respuesta" class="mt-2">
                      <v-radio
                        v-for="(opcion, opcionIndex) in pregunta.opciones"
                        :key="`${index}-${opcionIndex}`"
                        :label="opcion"
                        :value="opcion"
                      ></v-radio>
                    </v-radio-group>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" text @click="cerrarDialogo">Cancelar</v-btn>
          <v-btn color="blue-darken-1" text @click="guardarZona" :disabled="!formularioValido">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useZonasStore } from '@/stores/zonasStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { storeToRefs } from 'pinia'
import { useSnackbarStore } from '@/stores/snackbarStore'

const zonasStore = useZonasStore()
const siembrasStore = useSiembrasStore()
const snackbarStore = useSnackbarStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()

const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const userRole = computed(() => user.value.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

const { zonas, tiposZonas } = storeToRefs(zonasStore)
const { cargarZonas, cargarTiposZonas, crearZona, actualizarZona, eliminarZona } = zonasStore
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
  datos_bpa: []
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

const getZonasPorTipo = (tipoId) => {
  return zonas.value.filter((zona) => zona && zona.tipo === tipoId)
}

const getSiembraNombre = (siembraId) => {
  if (!siembraId) return 'General'
  const siembra = siembras.value.find((s) => s.id === siembraId)
  return siembra ? siembra.nombre + ' ' + siembra.tipo : 'Siembra no encontrada'
}

const tipoZonaActual = ref({})

onMounted(async () => {
  try {
    await Promise.all([cargarTiposZonas(), cargarZonas(), siembrasStore.fetchSiembras()])
  } catch (error) {
    console.error('Error loading data:', error)
    snackbarStore.showError('Error al cargar los datos')
  }
})

const abrirDialogoCrear = (tipoZona) => {
  modoEdicion.value = false
  tipoZonaActual.value = tipoZona // Asignar el tipo de zona actual
  zonaEditando.value = {
    nombre: '',
    area: { area: null, unidad: '' },
    info: '',
    tipo: tipoZona.id,
    hacienda: mi_hacienda.value?.id,
    siembra: null,
    datos_bpa: (tipoZona.datos_bpa?.preguntas_bpa || []).map(() => ({ respuesta: null })) // Inicializar datos_bpa
  }
  dialogoCrear.value = true
}

const editarZona = (zona) => {
  modoEdicion.value = true
  tipoZonaActual.value = tiposZonas.value.find((tipo) => tipo.id === zona.tipo)
  zonaEditando.value = { ...zona, datos_bpa: zona.datos_bpa || [] } // Asegurarse de que datos_bpa esté inicializado
  dialogoCrear.value = true
}

const cerrarDialogo = () => {
  dialogoCrear.value = false
  form.value.reset()
}

const guardarZona = async () => {
  if (form.value.validate()) {
    try {
      const zonaToSave = { ...zonaEditando.value }
      if (modoEdicion.value) {
        await actualizarZona(zonaToSave.id, zonaToSave)
      } else {
        await crearZona(zonaToSave)
      }
      cerrarDialogo()
      await cargarZonas()
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
</script>

<style scoped></style>
