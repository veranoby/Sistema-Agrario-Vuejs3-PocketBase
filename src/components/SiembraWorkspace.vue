<template>
  <v-container fluid class="flex flex-col min-h-screen pa-0" v-if="!isLoading">
    <!-- Header -->

    <header class="bg-background shadow-sm">
      <div class="profile-container">
        <h3 class="profile-title">
          <nav class="flex mb-3" aria-label="Breadcrumb">
            <ol class="flex items-center space-x-2 bg-green-lighten-4 py-2 px-4 rounded-r-full">
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-sprout</v-icon>
                  <router-link
                    to="/siembras"
                    class="ml-3 text-sm font-medium text-gray-600 hover:text-gray-700"
                    >SIEMBRAS</router-link
                  >
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-chevron-right</v-icon>
                  <span class="ml-1 text-sm font-bold text-gray-600" aria-current="page">{{
                    siembraInfo.nombre
                  }}</span>
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-chevron-right</v-icon>
                  <span class="ml-1 text-sm font-bold text-gray-700" aria-current="page">{{
                    siembraInfo.tipo
                  }}</span>
                </div>
              </li>
            </ol>
          </nav>

          <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
            HACIENDA: {{ mi_hacienda.name }}
          </v-chip>

          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
            {{ userRole }}
          </v-chip>

          <v-chip :color="getStatusColor(siembraInfo.estado)" size="x-small" variant="flat">
            {{ siembraInfo.estado }}
          </v-chip>

          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            INICIO: {{ formatDate(siembraInfo.fecha_inicio) }}
          </v-chip>
        </h3>
        <div class="avatar-container">
          <img
            :src="getSiembraAvatarUrl(siembraInfo)"
            alt="Avatar de Siembra"
            class="avatar-image"
          />
        </div>
      </div>
    </header>

    <v-row no-gutters>
      <!-- Main Content -->
      <v-col cols="12" md="8" class="pa-4">
        <v-card class="siembra-info mb-4" elevation="2">
          <v-card-title class="headline d-flex justify-between align-center">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-information</v-icon>
              <span>Información de la Siembra</span>
            </div>
            <v-btn color="green-lighten-2" @click="openEditDialog" icon>
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <div
                  class="flex-1 rounded-lg border-2 p-4 mt-2 mb-4"
                  v-html="siembraInfo.info || 'No disponible'"
                ></div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Bitácora -->
        <v-card class="bitacora-section" elevation="2">
          <v-card-title class="headline d-flex justify-space-between align-center">
            Bitácora de la Siembra

            <v-btn color="green-lighten-2" @click="openAddBitacoraDialog" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap align-center mb-0">
              FILTRAR POR ZONAS:
              <v-chip-group v-model="selectedZonas" column multiple>
                <v-chip v-for="zona in zonas" :key="zona.id" filter outlined size="small">
                  {{ zona.nombre }}
                </v-chip>
              </v-chip-group>
            </div>
            <div class="d-flex flex-wrap align-center mb-0">
              FILTRAR POR ACTIVIDAD:
              <v-chip-group v-model="selectedZonas" column multiple>
                <v-chip v-for="zona in zonas" :key="zona.id" filter outlined size="small">
                  {{ zona.nombre }}
                </v-chip>
              </v-chip-group>
            </div>
            <v-data-table
              :headers="bitacoraHeaders"
              :items="filteredBitacora"
              :items-per-page="itemsPerPage"
              :footer-props="{
                'items-per-page-options': [5, 10, 20],
                'items-per-page-text': 'Elementos por página'
              }"
              class="elevation-1 tabla-compacta"
              density="compact"
            >
              <template #[`item.fecha`]="{ item }">
                {{ formatDate(item.fecha) }}
              </template>
              <template #[`item.actions`]="{ item }">
                <v-icon small class="mr-2" @click="editBitacoraItem(item)"> mdi-pencil </v-icon>
                <v-icon small @click="deleteBitacoraItem(item)"> mdi-delete </v-icon>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Sidebar -->
      <v-col cols="12" md="4" class="px-0 py-4">
        <v-card class="zonas-section mb-4" elevation="2">
          <v-card-title class="headline d-flex justify-space-between align-center">
            Zonas Registradas
            <v-btn color="green-lighten-2" @click="openAddZonaDialog" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="px-2 py-0">
            <v-chip variant="flat" size="x-small" color="green-lighten-1" class="mx-1" pill>
              ÁREA TOTAL: {{ totalArea }} {{ areaUnit }}
            </v-chip>
            <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
              PROGRAMADA: {{ siembraInfo.area_total }} ha
            </v-chip>

            <!-- v-data-table de zonas-->

            <v-data-table
              :headers="headers"
              :items="zonas"
              class="elevation-1 tabla-compacta my-2 mx-0 py-0 px-0"
              density="compact"
              item-value="id"
              show-expand
              v-model:expanded="expanded"
              header-class="custom-header"
            >
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

              <template #[`item.actions`]="{ item }">
                <v-icon class="me-2" @click="editZona(item)"> mdi-pencil </v-icon>
                <v-icon @click="deleteZona(item)"> mdi-delete </v-icon>
              </template>

              <template v-slot:bottom> </template>
              <!-- eliminar el footer d ela tabla-->

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

            <!-- fin v-data table-->
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs -->

    <!-- Editar Siembra -->

    <v-dialog v-model="editSiembraDialog" max-width="800px">
      <v-card>
        <v-card-title class="headline">Editar Siembra</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-form ref="editSiembraForm">
                <v-text-field
                  v-model="editedSiembra.nombre"
                  label="Nombre"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
                <v-text-field
                  v-model="editedSiembra.tipo"
                  label="Tipo"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
                <v-select
                  v-model="editedSiembra.estado"
                  :items="estadosSiembra"
                  label="Estado"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-select>
                <v-text-field
                  v-model="editedSiembra.area_total"
                  label="Área Objetivo (ha)"
                  type="number"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
                <v-text-field
                  v-model="editedSiembra.fecha_inicio"
                  label="Fecha de Inicio"
                  type="date"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
              </v-form>
            </v-col>
            <v-col cols="12" md="6">
              <div class="flex justify-center items-center p-2">
                <v-card class="p-2 rounded-lg border-2">
                  <v-card-title class="compact-form-2">
                    <v-file-input
                      v-model="avatarFile"
                      rounded
                      variant="outlined"
                      color="green"
                      prepend-icon="mdi-camera"
                      label="Cambiar Avatar"
                      accept="image/*"
                      @change="handleAvatarUpload"
                      show-size
                    ></v-file-input>
                  </v-card-title>
                  <v-card-text>
                    <div class="flex items-center justify-center">
                      <v-avatar size="192" class="mr-4">
                        <v-img :src="siembraAvatarUrl" alt="Avatar de Siembra"></v-img>
                      </v-avatar>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-textarea
                variant="outlined"
                density="compact"
                class="compact-form"
                v-model="editedSiembra.info"
                label="Información General"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            @click="saveSiembraEdit"
            >Guardar</v-btn
          >
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="editSiembraDialog = false"
            >Cancelar</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!--editar bitacora-->

    <v-dialog v-model="addBitacoraDialog" max-width="600px">
      <v-card>
        <v-card-title class="headline">Agregar a Bitácora</v-card-title>
        <v-card-text>
          <v-form ref="addBitacoraForm">
            <v-text-field v-model="newBitacora.fecha" label="Fecha" type="date"></v-text-field>

            <v-select
              v-model="newBitacora.actividad"
              :items="actividades"
              item-text="nombre"
              item-value="id"
              label="Actividad"
            ></v-select>
            <v-select
              v-model="newBitacora.zonas"
              :items="zonas"
              item-text="nombre"
              item-value="id"
              label="Zonas"
              multiple
              chips
            ></v-select>
            <v-textarea v-model="newBitacora.descripcion" label="Descripción"></v-textarea>
            <v-select
              v-model="newBitacora.responsable"
              :items="usuarios"
              item-text="name"
              item-value="id"
              label="Responsable"
            ></v-select>
            <v-select
              v-model="newBitacora.estado"
              :items="estadosBitacora"
              label="Estado"
            ></v-select>
            <v-textarea v-model="newBitacora.notas" label="Notas"></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveBitacoraEntry">Guardar</v-btn>
          <v-btn color="error" text @click="addBitacoraDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CREAR ZONAS EN ESTA SIEMBRA-->
    <v-dialog v-model="addZonaDialog" max-width="900px">
      <v-card>
        <v-card-title class="pb-0 pt-4">
          <span class="text-h5">{{ modoEdicionZona ? 'Editar' : 'Crear' }} Zona</span>
        </v-card-title>
        <v-card-text class="py-0">
          <v-form ref="form" v-model="formularioValidoZona" lazy-validation>
            <v-row class="compact-form">
              <v-col cols="6" class="pb-0 mb-0">
                <!-- Nombre de la Zona -->
                <v-text-field
                  v-model="zonaEditando.nombre"
                  label="Nombre"
                  variant="outlined"
                  required
                  :rules="[(v) => !!v || 'El nombre es requerido']"
                ></v-text-field>

                <!-- Área y Unidad de la Zona -->
                <v-row>
                  <v-col>
                    <v-text-field
                      v-model.number="zonaEditando.area.area"
                      label="Área"
                      type="number"
                      variant="outlined"
                      required
                      :rules="[(v) => !!v || 'El área es requerida']"
                    ></v-text-field>
                  </v-col>
                  <v-col>
                    <v-select
                      v-model="zonaEditando.area.unidad"
                      variant="outlined"
                      :items="['m²', 'ha', 'km²']"
                      label="Unidad de área"
                      required
                      :rules="[(v) => !!v || 'La unidad es requerida']"
                    ></v-select>
                  </v-col>
                </v-row>

                <!-- Selector de Tipo de Zona -->
                <v-select
                  v-model="zonaEditando.tipo"
                  :disabled="modoEdicionZona"
                  :items="tiposZonas"
                  item-title="nombre"
                  item-value="id"
                  label="Tipo de Zona"
                  variant="outlined"
                  @update:modelValue="onTipoZonaChange(zonaEditando.tipo)"
                  required
                  :rules="[(v) => !!v || 'Seleccione un tipo de zona']"
                ></v-select>

                <!-- GPS -->
                <v-text-field
                  v-model="zonaEditando.gps"
                  variant="outlined"
                  label="GPS (Lat, Lng)"
                  placeholder="Ej: {lat: 0, lng: 0}"
                ></v-text-field>

                <!-- Checkbox Contabilizable -->
                <v-checkbox
                  v-model="zonaEditando.contabilizable"
                  label="Contabilizable"
                ></v-checkbox>
              </v-col>

              <v-col cols="6" class="pb-0 mb-0">
                <!-- Información Adicional -->
                <v-textarea
                  variant="outlined"
                  density="compact"
                  v-model="zonaEditando.info"
                  label="Información adicional"
                ></v-textarea>

                <!-- Avatar -->
                <v-file-input
                  v-model="avatarFileZona"
                  rounded
                  variant="outlined"
                  label="Cargar Avatar"
                  accept="image/*"
                  @change="updateAvatarZona"
                ></v-file-input>
              </v-col>
            </v-row>

            <!-- Formulario de Seguimiento BPA (solo si se ha seleccionado un tipo de zona) -->
            <v-row v-if="zonaEditando.tipo" class="mt-0">
              <v-col class="py-0">
                <div class="compact-form bg-dinamico rounded-lg px-3 border-4 py-0">
                  <h4 class="text-2xl font-bold py-4">SEGUIMIENTO BPA</h4>

                  <v-row>
                    <v-col
                      v-for="(pregunta, index) in tiposZonas.find((z) => z.id === zonaEditando.tipo)
                        .datos_bpa.preguntas_bpa"
                      :key="index"
                      cols="6"
                    >
                      <p class="font-extrabold">{{ pregunta.pregunta }}</p>
                      <p v-if="pregunta.descripcion" class="mb-2 text-slate-800 font-extralight">
                        {{ pregunta.descripcion }}
                      </p>
                      <v-radio-group v-model="zonaEditando.datos_bpa[index].respuesta" class="mt-2">
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
            @click="cerrarDialogoZona"
            >Cancelar</v-btn
          >
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            @click="guardarZona"
            :disabled="!formularioValidoZona"
            >Guardar</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
  <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useZonasStore } from '@/stores/zonasStore'

export default {
  name: 'SiembraWorkspace',
  setup() {
    const route = useRoute()
    const siembrasStore = useSiembrasStore()
    const bitacoraStore = useBitacoraStore()
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const snackbarStore = useSnackbarStore()
    const zonasStore = useZonasStore()

    const siembraId = ref(route.params.id)
    const siembraInfo = ref({})
    const bitacora = ref([])

    const { zonas, tiposZonas, eliminarZona } = storeToRefs(zonasStore)

    const { user } = storeToRefs(profileStore)
    const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

    const userRole = computed(() => user.value?.role || '')

    const avatarUrl = computed(() => profileStore.avatarUrl)
    const avatarFile = ref(null)

    const siembraAvatarUrl = computed(() => {
      return siembrasStore.getSiembraAvatarUrl(siembraInfo.value)
    })
    const getSiembraAvatarUrl = siembrasStore.getSiembraAvatarUrl

    const actividades = ref([])
    const usuarios = ref([])

    const isLoading = ref(true)

    const totalArea = computed(() => {
      return zonas.value
        .filter((zona) => zona.contabilizable)
        .reduce((sum, zona) => sum + (parseFloat(zona.area.area) || 0), 0)
        .toFixed(2)
    })

    const headers = [
      { title: 'Nombre', align: 'start', key: 'nombre' },
      { title: 'BPA', align: 'center', key: 'bpa_estado' },
      { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
    ]

    const expanded = ref([])

    const areaUnit = ref('ha')
    const itemsPerPage = ref(10)
    const selectedZonas = ref([])
    const selectedActividades = ref([])

    const editSiembraDialog = ref(false)
    const editedSiembra = ref({})

    const addBitacoraDialog = ref(false)
    const addZonaDialog = ref(false)

    const newBitacora = ref({
      fecha: new Date().toISOString().split('T')[0],
      actividad: '',
      zonas: [],
      descripcion: '',
      responsable: '',
      estado: 'planificada',
      notas: ''
    })

    const estadosSiembra = ['planificada', 'en_crecimiento', 'cosechada', 'finalizada']
    const getStatusColor = (status) => {
      const colors = {
        planificada: 'blue',
        en_crecimiento: 'green',
        cosechada: 'orange',
        finalizada: 'gray'
      }
      return colors[status] || 'gray'
    }

    const estadosBitacora = ['planificada', 'en_progreso', 'completada', 'cancelada']

    const bitacoraHeaders = [
      { text: 'Fecha', value: 'fecha' },
      { text: 'Actividad', value: 'actividad.nombre' },
      { text: 'Zona', value: 'zona.nombre' },
      { text: 'Responsable', value: 'responsable.name' },
      { text: 'Estado', value: 'estado' },
      { text: 'Acciones', value: 'actions', sortable: false }
    ]

    const filteredBitacora = computed(() => {
      return bitacora.value.filter((entry) => {
        const zonaMatch =
          selectedZonas.value.length === 0 ||
          entry.zonas.some((zona) => selectedZonas.value.includes(zona.id))
        const actividadMatch =
          selectedActividades.value.length === 0 ||
          selectedActividades.value.includes(entry.actividad.id)
        return zonaMatch && actividadMatch
      })
    })

    const tipoZonaActual = ref(null)

    const modoEdicionZona = ref(false)
    const zonaEditando = ref({
      nombre: '',
      area: { area: null, unidad: '' },
      info: '',
      contabilizable: false,
      gps: '',
      datos_bpa: []
    })
    const avatarFileZona = ref(null)
    const formularioValidoZona = ref(true)
    const form = ref(null)

    async function guardarZona() {
      if (form.value.validate()) {
        try {
          zonaEditando.value.siembra = siembraId.value
          zonaEditando.value.hacienda = mi_hacienda.value.id

          if (modoEdicionZona.value) {
            await zonasStore.updateZona(zonaEditando.value.id, zonaEditando.value)
          } else {
            await zonasStore.crearZona(zonaEditando.value)
          }

          cerrarDialogoZona()
          snackbarStore.showSnackbar('Zona guardada exitosamente', 'success')
        } catch (error) {
          handleError(error, 'Error al guardar la zona')
        }
      }
    }

    const cerrarDialogoZona = () => {
      addZonaDialog.value = false
      avatarFileZona.value = null // Limpiar el archivo después de la actualización
    }

    const updateAvatarZona = async () => {
      if (avatarFileZona.value) {
        if (zonaEditando.value.id) {
          await zonasStore.updateZonaAvatar(zonaEditando.value.id, avatarFileZona.value)
          zonaEditando.value = { ...zonasStore.zonas.find((z) => z.id === zonaEditando.value.id) }
          avatarFileZona.value = null // Limpiar el archivo después de la actualización
        }
      }
    }

    function onTipoZonaChange(tipoZonaId) {
      const tipoZonaSeleccionado = tiposZonas.value.find((tipo) => tipo.id === tipoZonaId)
      if (tipoZonaSeleccionado && tipoZonaSeleccionado.datos_bpa) {
        zonaEditando.value.datos_bpa = tipoZonaSeleccionado.datos_bpa.preguntas_bpa.map(() => ({
          respuesta: null
        }))
      }
    }

    // En la función loadSiembraInfo, no es necesario forzar la actualización del avatar
    async function loadSiembraInfo() {
      try {
        const siembra = await siembrasStore.fetchSiembraById(siembraId.value)
        siembraInfo.value = siembra
      } catch (error) {
        handleError(error, 'Error al cargar la información de la siembra')
      }
    }

    async function loadBitacora() {
      try {
        bitacora.value = await bitacoraStore.fetchBitacoraBySiembraId(siembraId.value)
      } catch (error) {
        handleError(error, 'Error al cargar la bitácora')
      }
    }

    async function loadHacienda() {
      try {
        await haciendaStore.fetchHacienda(siembraInfo.value.hacienda)
      } catch (error) {
        handleError(error, 'Error al cargar la información de la hacienda')
      }
    }

    async function loadActividades() {
      try {
        actividades.value = await siembrasStore.fetchActividadesByHaciendaId(mi_hacienda.value.id)
      } catch (error) {
        handleError(error, 'Error al cargar las actividades')
      }
    }

    async function loadUsuarios() {
      try {
        usuarios.value = await haciendaStore.fetchHaciendaUsers()
      } catch (error) {
        handleError(error, 'Error al cargar los usuarios')
      }
    }

    function formatDate(date) {
      return new Date(date).toLocaleDateString()
    }

    function openEditDialog() {
      editedSiembra.value = {
        ...siembraInfo.value,
        fecha_inicio: siembraInfo.value.fecha_inicio
          ? new Date(siembraInfo.value.fecha_inicio).toISOString().split('T')[0]
          : ''
      }
      editSiembraDialog.value = true
    }

    function openAddBitacoraDialog() {
      newBitacora.value = {
        fecha: new Date().toISOString().split('T')[0],
        actividad: '',
        zonas: [],
        descripcion: '',
        responsable: '',
        estado: 'planificada',
        notas: ''
      }
      addBitacoraDialog.value = true
    }

    function openAddZonaDialog() {
      modoEdicionZona.value = false
      zonaEditando.value = {
        nombre: '',
        area: { area: null, unidad: 'ha' },
        info: '',
        contabilizable: false,
        gps: '',
        datos_bpa: [],
        siembra: siembraId.value,
        hacienda: mi_hacienda.value.id
      }
      addZonaDialog.value = true
    }

    async function saveSiembraEdit() {
      try {
        if (!editedSiembra.value.nombre || !editedSiembra.value.estado) {
          throw new Error('Nombre y estado son campos requeridos')
        }

        editedSiembra.value.nombre = editedSiembra.value.nombre.toUpperCase()
        editedSiembra.value.tipo = editedSiembra.value.tipo.toUpperCase()

        // Crear un nuevo objeto con solo los campos necesarios
        const siembraToUpdate = {
          nombre: editedSiembra.value.nombre,
          tipo: editedSiembra.value.tipo,
          estado: editedSiembra.value.estado,
          area_total: editedSiembra.value.area_total,
          fecha_inicio: editedSiembra.value.fecha_inicio
            ? new Date(editedSiembra.value.fecha_inicio).toISOString()
            : null,
          info: editedSiembra.value.info
        }

        // Actualizar la siembra sin incluir información del avatar
        await siembrasStore.updateSiembra(siembraId.value, siembraToUpdate)

        // Recargar la información de la siembra
        siembraInfo.value = await siembrasStore.fetchSiembraById(siembraId.value)
        editSiembraDialog.value = false
        snackbarStore.showSnackbar('Siembra actualizada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al actualizar la siembra')
      }
    }

    async function saveBitacoraEntry() {
      try {
        const entry = {
          ...newBitacora.value,
          siembra: siembraId.value,
          hacienda: mi_hacienda.value.id
        }
        await bitacoraStore.addBitacoraEntry(entry)
        addBitacoraDialog.value = false
        loadBitacora()
        snackbarStore.showSnackbar('Entrada de bitácora agregada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al agregar entrada de bitácora')
      }
    }

    async function editBitacoraItem(item) {
      try {
        const updatedItem = await bitacoraStore.updateBitacoraEntry(item.id, item)
        const index = bitacora.value.findIndex((entry) => entry.id === item.id)
        if (index !== -1) {
          bitacora.value[index] = updatedItem
        }
        snackbarStore.showSnackbar('Entrada de bitácora actualizada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al actualizar entrada de bitácora')
      }
    }

    async function deleteBitacoraItem(item) {
      if (confirm('¿Está seguro de que desea eliminar esta entrada de la bitácora?')) {
        try {
          await bitacoraStore.deleteBitacoraEntry(item.id)
          bitacora.value = bitacora.value.filter((entry) => entry.id !== item.id)
          snackbarStore.showSnackbar('Entrada de bitácora eliminada con éxito', 'success')
        } catch (error) {
          handleError(error, 'Error al eliminar entrada de bitácora')
        }
      }
    }

    function editZona(zona) {
      modoEdicionZona.value = true
      zonaEditando.value = { ...zona }
      addZonaDialog.value = true
      tipoZonaActual.value = zona // Asignar el tipo de zona actual
    }

    async function deleteZona(zona) {
      if (confirm('¿Está seguro de que desea eliminar esta zona?')) {
        try {
          await eliminarZona(zona.id)
          zonas.value = zonas.value.filter((z) => z.id !== zona.id)
          snackbarStore.showSnackbar('Zona eliminada con éxito', 'success')
        } catch (error) {
          handleError(error, 'Error al eliminar zona')
        }
      }
    }

    async function handleAvatarUpload() {
      if (avatarFile.value) {
        try {
          snackbarStore.showLoading()
          await siembrasStore.updateSiembraAvatar(siembraId.value, avatarFile.value)
          siembraInfo.value = await siembrasStore.fetchSiembraById(siembraId.value)
          snackbarStore.showSnackbar('Avatar de siembra actualizado con éxito', 'success')
        } catch (error) {
          handleError(error, 'Error al actualizar el avatar de la siembra')
        } finally {
          snackbarStore.hideLoading()
          avatarFile.value = null
        }
      }
    }

    const getAvatarUrl = (zona) => {
      if (zona.avatar) {
        return pb.getFileUrl(zona, zona.avatar)
      }
      return null // This will activate the placeholder
    }

    watch([selectedZonas, selectedActividades], () => {
      loadBitacora()
    })

    onMounted(async () => {
      try {
        await loadSiembraInfo() // Asegúrate de que esto se complete primero
        await Promise.all([
          zonasStore.cargarTiposZonas(),
          loadBitacora(),
          loadActividades(),
          loadUsuarios(),
          loadHacienda(),
          zonasStore.fetchZonasBySiembraId(siembraId.value) // Ahora siembraId debería estar definido
        ])
      } catch (error) {
        handleError(error, 'Error al cargar los datos iniciales')
      } finally {
        isLoading.value = false
      }
    })

    return {
      siembraInfo,
      siembraAvatarUrl,
      editedSiembra,
      avatarFile,
      handleAvatarUpload,
      getSiembraAvatarUrl,
      saveSiembraEdit,
      getStatusColor,
      totalArea,
      editSiembraDialog,
      estadosSiembra,
      openEditDialog,
      formatDate,
      form,
      zonas,
      bitacora,
      user,
      mi_hacienda,
      avatarHaciendaUrl,
      actividades,
      usuarios,
      userRole,
      avatarUrl,
      areaUnit,
      itemsPerPage,
      selectedZonas,
      addBitacoraDialog,
      addZonaDialog,
      newBitacora,
      estadosBitacora,
      bitacoraHeaders,
      filteredBitacora,
      openAddBitacoraDialog,
      openAddZonaDialog,
      saveBitacoraEntry,
      editBitacoraItem,
      deleteBitacoraItem,
      editZona,
      deleteZona,
      isLoading,
      modoEdicionZona,
      zonaEditando,
      avatarFileZona,
      formularioValidoZona,
      guardarZona,
      cerrarDialogoZona,
      updateAvatarZona,
      onTipoZonaChange,
      tiposZonas,
      headers,
      getAvatarUrl,
      expanded
    }
  }
}
</script>

<style scoped></style>
