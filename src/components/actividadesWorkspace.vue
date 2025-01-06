<template>
  <v-container fluid class="flex flex-col min-h-screen pa-0" v-if="!isLoading">
    <!-- Header -->
    <div class="grid grid-cols-4 gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0 px-2 py-2">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title">
                <nav class="flex mb-3" aria-label="Breadcrumb">
                  <ol
                    class="flex items-center space-x-2 bg-green-lighten-4 py-2 px-4 rounded-r-full"
                  >
                    <li>
                      <div class="flex items-center">
                        <v-icon>mdi-gesture-tap-button</v-icon>
                        <router-link
                          to="/actividades"
                          class="ml-3 text-sm font-medium text-gray-600 hover:text-gray-700"
                          >ACTIVIDADES</router-link
                        >
                      </div>
                    </li>
                    <li>
                      <div class="flex items-center">
                        <v-icon>mdi-chevron-right</v-icon>
                        <span class="ml-1 text-sm font-bold text-gray-600" aria-current="page">{{
                          actividadInfo.nombre
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

                <v-chip :color="getStatusColor(actividadInfo.activa)" size="x-small" variant="flat">
                  {{ getStatusMsg(actividadInfo.activa) }}
                </v-chip>

                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
                  {{ getActividadTipo(actividadInfo.tipo) }}
                </v-chip>
              </h3>
            </div>

            <!-- EXTRAS Section -->
            <div class="w-full sm:w-auto z-10 text-center">
              <!-- circular progress control-->
              <h4
                :class="{
                  'text-red font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                    actividadInfo.bpa_estado < 40,
                  'text-orange font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                    actividadInfo.bpa_estado >= 40 && actividadInfo.bpa_estado < 80,
                  'text-green font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                    actividadInfo.bpa_estado >= 80
                }"
              >
                Avance BPA:
              </h4>
              <!-- Título agregado -->
              <v-progress-circular
                :model-value="actividadInfo.bpa_estado"
                :size="78"
                :width="8"
                :color="colorBpaEstado"
              >
                <template v-slot:default> {{ actividadInfo.bpa_estado }} % </template>
              </v-progress-circular>
            </div>
          </div>

          <div class="avatar-container">
            <img :src="actividadAvatarUrl" alt="Avatar de Actividad" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <v-row no-gutters>
      <v-col cols="12" md="8" class="pa-4">
        <v-card class="actividad-info mb-4" elevation="2">
          <v-card-title class="headline d-flex justify-between align-center">
            <span>Información de la Actividad</span>

            <span>
              <v-chip
                v-for="(metrica, key) in actividadInfo.metricas"
                :key="key"
                variant="flat"
                size="x-small"
                color="green-lighten-3"
                class="m-1 p-1"
                pill
              >
                {{ key.toUpperCase() }}:{{ metrica.valor }}
              </v-chip>
            </span>

            <v-btn color="green-lighten-2" @click="openEditDialog" icon>
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-html="actividadInfo.descripcion || 'No disponible'"></div>
          </v-card-text>
        </v-card>

        <!-- Bitácora 
        <v-card class="bitacora-section" elevation="2">
          <v-card-title class="headline">Bitácora de la Actividad</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="bitacoraHeaders"
              :items="filteredBitacora"
              :items-per-page="itemsPerPage"
              class="elevation-1"
            >
              <template #[`item.fecha`]="{ item }">
                {{ formatDate(item.fecha) }}
              </template>
              <template #[`item.actions`]="{ item }">
                <v-icon small @click="editBitacoraItem(item)">mdi-pencil</v-icon>
                <v-icon small @click="deleteBitacoraItem(item)">mdi-delete</v-icon>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card> -->
      </v-col>

      <!-- SIDEBAR SIEMBRAS Y ZONAS -->
      <v-col cols="4" md="4" class="p-0 pr-4">
        <div class="siembra-info mt-4 p-2">
          <v-card-title class="headline d-flex justify-between">
            <h2 class="text-xl font-bold mt-2">Siembras y Zonas Asociadas</h2>
            <v-btn size="x-small" color="green-lighten-2" @click="openAddSiembrasZonas" icon>
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div class="flex flex-wrap">
              <v-chip
                v-for="siembraId in actividadInfo.siembra"
                size="x-small"
                :key="siembraId"
                class="m-1 p-1"
                :text="getSiembraName(siembraId)"
                pill
                color="green-lighten-3"
                variant="flat"
              >
              </v-chip>
            </div>
          </v-card-text>
        </div>
      </v-col>
    </v-row>

    <!-- Dialogo de Edición de Actividad -->
    <v-dialog v-model="editActividadDialog" persistent max-width="900px">
      <v-form ref="editActividadForm">
        <v-card>
          <v-card-title class="headline">Editar Actividad</v-card-title>
          <v-card-text>
            <div class="grid grid-cols-3">
              <div class="grid col-span-2 grid-cols-3">
                <div class="col-span-2">
                  <v-text-field
                    v-model="editedActividad.nombre"
                    label="Nombre"
                    class="compact-form"
                    variant="outlined"
                    density="compact"
                  ></v-text-field>
                </div>
                <div class="col-span-1">
                  <v-checkbox
                    v-model="editedActividad.activa"
                    density="compact"
                    class="compact-form"
                    label="estado activo"
                  ></v-checkbox>
                </div>

                <!-- Sección para métricas -->
                <div class="siembra-info col-span-3" v-if="tipoActividadActual?.metricas?.metricas">
                  <v-card-title class="headline d-flex justify-between">
                    <h2 class="text-xl font-bold mt-2">Métricas</h2>
                    <v-btn
                      size="x-small"
                      color="green-lighten-2"
                      @click="openAddMetricaDialog"
                      icon
                    >
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <div class="grid grid-cols-2 gap-0">
                      <div v-for="(metrica, key) in editedActividad.metricas" :key="key" cols="6">
                        <!-- Select para tipo "select" -->
                        <v-select
                          v-if="metrica.tipo === 'select'"
                          v-model="metrica.valor"
                          :label="key"
                          :items="metrica.opciones"
                          variant="outlined"
                          density="compact"
                          class="compact-form"
                        >
                          <template v-slot:append>
                            <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                          </template>
                        </v-select>
                        <!-- Input number para tipo "text" -->
                        <v-text-field
                          v-else-if="metrica.tipo === 'text'"
                          v-model.number="metrica.valor"
                          :label="key"
                          density="compact"
                          variant="outlined"
                          class="compact-form"
                        >
                          <template v-slot:append>
                            <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                          </template>
                        </v-text-field>
                        <!-- Input number para tipo "number" -->
                        <v-text-field
                          v-else-if="metrica.tipo === 'number'"
                          v-model.number="metrica.valor"
                          :label="key"
                          type="number"
                          density="compact"
                          variant="outlined"
                          class="compact-form"
                        >
                          <template v-slot:append>
                            <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                          </template>
                        </v-text-field>
                        <!-- Input number para tipo "boolean" -->
                        <v-checkbox
                          v-else-if="metrica.tipo === 'boolean'"
                          v-model.number="metrica.valor"
                          :label="key"
                          density="compact"
                          class="compact-form"
                        >
                          <template v-slot:append>
                            <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                          </template></v-checkbox
                        >
                        <!-- Input number para tipo "checkbox" -->
                        <v-checkbox
                          v-else-if="metrica.tipo === 'checkbox'"
                          v-model.number="metrica.valor"
                          :label="key"
                          density="compact"
                          class="compact-form"
                        >
                          <template v-slot:append>
                            <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                          </template></v-checkbox
                        >
                      </div>
                    </div>
                  </v-card-text>
                </div>
              </div>
              <div>
                <!-- Componente para editar el avatar -->
                <AvatarForm
                  v-model="showAvatarDialog"
                  collection="actividades"
                  :entityId="editedActividad.id"
                  :currentAvatarUrl="actividadAvatarUrl"
                  :hasCurrentAvatar="!!editedActividad.avatar"
                  @avatar-updated="handleAvatarUpdated"
                />
                <div class="flex items-center justify-center mt-0 relative">
                  <v-avatar size="192">
                    <v-img :src="actividadAvatarUrl" alt="Avatar de Actividad"></v-img>
                  </v-avatar>
                  <!-- Botón para abrir el diálogo de avatar -->
                  <v-btn
                    icon
                    size="small"
                    color="green-lighten-2"
                    class="absolute bottom-0 right-0"
                    @click="showAvatarDialog = true"
                  >
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </div>
              </div>
            </div>

            <!-- Diálogo para agregar métrica personalizada -->
            <v-dialog v-model="addMetricaDialog" persistent max-width="300px">
              <v-card>
                <v-card-title class="headline">Agregar Métrica </v-card-title>
                <v-card-text class="m-1 p-0 pl-2">
                  <v-text-field
                    density="compact"
                    variant="outlined"
                    class="compact-form"
                    v-model="newMetrica.titulo"
                    label="Título"
                  />
                  <v-textarea
                    density="compact"
                    variant="outlined"
                    class="compact-form"
                    v-model="newMetrica.descripcion"
                    label="Descripción"
                  />
                  <v-select
                    density="compact"
                    variant="outlined"
                    class="compact-form"
                    v-model="newMetrica.tipo"
                    :items="['checkbox', 'number', 'text']"
                    label="Tipo"
                  />
                </v-card-text>
                <v-card-actions>
                  <v-btn
                    size="small"
                    variant="flat"
                    rounded="lg"
                    prepend-icon="mdi-cancel"
                    color="red-lighten-3"
                    @click="addMetricaDialog = false"
                    >Cancelar</v-btn
                  >
                  <v-btn
                    size="small"
                    variant="flat"
                    rounded="lg"
                    prepend-icon="mdi-check"
                    color="green-lighten-3"
                    @click="addMetrica"
                    >Agregar</v-btn
                  >
                </v-card-actions>
              </v-card>
            </v-dialog>

            <!-- Información Adicional -->
            <div class="mt-2">
              <div class="mb-2">
                <v-icon class="mr-2">mdi-information</v-icon>
                Detalles
              </div>
              <ckeditor
                v-model="editedActividad.descripcion"
                :editor="editor"
                :config="editorConfig"
              />
            </div>

            <!-- Formulario de Seguimiento BPA -->

            <div class="siembra-info mt-4">
              <v-card-title class="headline">
                <h2 class="text-xl font-bold mt-2">Seguimiento BPA</h2>
              </v-card-title>
              <v-card-text>
                <div class="grid grid-cols-3 gap-2">
                  <div v-for="(pregunta, index) in getBpaPreguntas" :key="index">
                    <span class="text-xs font-black text-justify">
                      {{ pregunta.pregunta }}
                      <v-tooltip
                        width="300"
                        v-if="pregunta.descripcion"
                        activator="parent"
                        location="top"
                        density="compact"
                        variant="outlined"
                        class="text-xs text-justify"
                      >
                        {{ pregunta.descripcion }}</v-tooltip
                      >
                    </span>

                    <v-radio-group
                      v-if="editedActividad.datos_bpa && editedActividad.datos_bpa[index]"
                      v-model="editedActividad.datos_bpa[index].respuesta"
                      class="mt-2"
                    >
                      <v-radio
                        v-for="(opcion, opcionIndex) in pregunta.opciones"
                        :key="`${index}-${opcionIndex}`"
                        :label="opcion"
                        :value="opcion"
                        class="compact-form"
                        density="compact"
                      ></v-radio>
                    </v-radio-group>
                  </div>
                </div>
              </v-card-text>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              @click="editActividadDialog = false"
              >Cancelar</v-btn
            >
            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              @click="saveActividad"
              >Guardar</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>

    <!-- Dialogo para seleccionar Siembras y Zonas -->
    <v-dialog v-model="dialogSiembrasZonas" persistent max-width="900px">
      <div class="grid grid-cols-2 gap-2 p-0 m-2 bg-white">
        <v-card>
          <v-card-title>
            <h2 class="text-xl font-bold mt-2">Siembras disponibles</h2>
          </v-card-title>
          <v-card-text class="siembra-info ml-4 mr-4">
            <v-chip-group column color="blue-darken-4" multiple v-model="selectedSiembras">
              <v-chip
                v-for="siembra in siembras"
                :key="siembra.id"
                :text="`${siembra.nombre}-${siembra.tipo}`"
                :value="siembra.id"
                filter
                density="compact"
              ></v-chip>
            </v-chip-group>

            <!--
            <v-checkbox
              color="indigo"
              class="compact-form"
              density="compact"
              v-for="siembra in siembras"
              :key="siembra.id"
              v-model="selectedSiembras"
              :value="siembra.id"
              :label="`${siembra.nombre} - ${siembra.tipo}`"
            ></v-checkbox>
            -->
          </v-card-text>
        </v-card>
        <v-card>
          <v-card-title>
            <h2 class="text-xl font-bold mt-2">Zonas disponibles</h2>
          </v-card-title>
          <v-card-text class="siembra-info ml-4 mr-4">
            <v-chip-group color="green-darken-4" column multiple v-model="selectedZonas">
              <v-chip
                v-for="zona in filteredZonas"
                :key="zona.id"
                :text="`${zona.nombre}(${getTipoZonasById(zona.tipo)})`"
                :value="zona.id"
                filter
                density="compact"
                pill
              ></v-chip>
            </v-chip-group>

            <!--
            <v-checkbox
              color="success"
              class="text-sm"
              density="compact"
              v-for="zona in filteredZonas"
              :key="zona.id"
              v-model="selectedZonas"
              :value="zona.id"
              :label="zona.nombre"
            ></v-checkbox>
             -->
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              @click="dialogSiembrasZonas = false"
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              >Cancelar</v-btn
            >
            <v-btn
              @click="saveSelection"
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              >Guardar</v-btn
            >
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

import { useRoute } from 'vue-router'
import { useActividadesStore } from '@/stores/actividadesStore'
import { handleError } from '@/utils/errorHandler'
import { useProfileStore } from '@/stores/profileStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { storeToRefs } from 'pinia'
import { useHaciendaStore } from '@/stores/haciendaStore'
import AvatarForm from '@/components/forms/AvatarForm.vue'
import { editor, editorConfig } from '@/utils/ckeditorConfig'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'

const route = useRoute()
const actividadesStore = useActividadesStore()
const avatarStore = useAvatarStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()

const actividadId = ref(route.params.id)
const actividadInfo = ref({})
const editActividadDialog = ref(false)
const addMetricaDialog = ref(false)
const editedActividad = ref({
  metricas: {}
})
const newMetrica = ref({
  titulo: '',
  descripcion: '',
  tipo: ''
})

const avatarUrl = computed(() => profileStore.avatarUrl)
const dialogSiembrasZonas = ref(false)
const selectedSiembras = ref([])
const selectedZonas = ref([])
const showAvatarDialog = ref(false)

const isLoading = ref(true)

const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const { tiposActividades } = storeToRefs(actividadesStore)

const { siembras } = storeToRefs(siembrasStore)
const { zonas, tiposZonas } = storeToRefs(zonasStore)

/*const siembras = computed(() => siembrasStore.siembras)
const zonas = computed(() => zonasStore.zonas)*/

const userRole = computed(() => user.value?.role || '')

// Computed para determinar el color basado en el promedio
const colorBpaEstado = computed(() => {
  if (actividadInfo.value.bpa_estado < 40) return 'red'
  if (actividadInfo.value.bpa_estado < 80) return 'orange'
  return 'green'
})

const actividadAvatarUrl = computed(() => {
  return avatarStore.getAvatarUrl({ ...actividadInfo.value, type: 'actividades' }, 'actividades')
})

const tipoActividadActual = computed(() => {
  return tiposActividades.value.find((tipo) => tipo.id === actividadInfo.value.tipo)
})

const getBpaPreguntas = computed(() => {
  const tipoActividadFiltrar = actividadesStore.tiposActividades.find(
    (t) => t.id === editedActividad.value.tipo
  )

  console.log('getBpaPreguntas-mostrar tipoActividadFiltrar:', tipoActividadFiltrar)
  return tipoActividadFiltrar?.datos_bpa?.preguntas_bpa || []
})

const getStatusColor = (status) => {
  const colors = {
    true: 'blue',
    false: 'orange'
  }
  return colors[status] || 'gray'
}
const getStatusMsg = (status) => {
  const colors = {
    true: 'ACTIVA',
    false: 'DETENIDA'
  }
  return colors[status] || 'gray'
}

/*
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
  // Implementar lógica para filtrar la bitácora según la actividad
  return [] // Placeholder
})
*/
onMounted(async () => {
  try {
    await loadActividadInfo()
    await actividadesStore.cargarTiposActividades()
    await siembrasStore.cargarSiembras()

    await zonasStore.cargarZonas()
    await zonasStore.cargarTiposZonas() // Asegúrate de cargar los tipos de zonas
    console.log('Zonas cargadas:', zonasStore.zonas)
    console.log('Tipos de zonas cargados:', tiposZonas.value) // Verifica que se carguen correctamente
  } catch (error) {
    handleError(error, 'Error al cargar la información de la actividad')
  } finally {
    isLoading.value = false
  }
})

async function loadActividadInfo() {
  try {
    const actividad = await actividadesStore.fetchActividadById(actividadId.value)
    actividadInfo.value = actividad
  } catch (error) {
    handleError(error, 'Error al cargar la actividad')
  }
}

function openEditDialog() {
  editedActividad.value = { ...actividadInfo.value }
  editActividadDialog.value = true
}

function openAddMetricaDialog() {
  addMetricaDialog.value = true
}
function addMetrica() {
  if (newMetrica.value.titulo && newMetrica.value.tipo) {
    // Reemplazar espacios en blanco por guiones bajos en el título
    const sanitizedTitulo = newMetrica.value.titulo.replace(/\s+/g, '_')

    editedActividad.value.metricas[sanitizedTitulo] = {
      descripcion: newMetrica.value.descripcion,
      tipo: newMetrica.value.tipo,
      valor: null // Inicializar valor como null
    }
    newMetrica.value = { titulo: '', descripcion: '', tipo: '' } // Resetear
    addMetricaDialog.value = false
  }
}

function removeMetrica(index) {
  delete editedActividad.value.metricas[index]
}

async function saveActividad() {
  try {
    if (!editedActividad.value.nombre) {
      throw new Error('Nombre es un campo requerido')
    }

    editedActividad.value.nombre = editedActividad.value.nombre.toUpperCase()

    // Calcular bpa_estado antes de guardar
    editedActividad.value.bpa_estado = actividadesStore.calcularBpaEstado(
      editedActividad.value.datos_bpa
    )

    // Crear un nuevo objeto con solo los campos necesarios
    const actividadToUpdate = {
      nombre: editedActividad.value.nombre,
      activa: editedActividad.value.activa,
      metricas: editedActividad.value.metricas,
      descripcion: editedActividad.value.descripcion,
      datos_bpa: editedActividad.value.datos_bpa,
      bpa_estado: editedActividad.value.bpa_estado
    }

    // Actualizar la siembra sin incluir información del avatar

    await actividadesStore.updateActividad(actividadId.value, actividadToUpdate)

    // Recargar la información de la siembra
    actividadInfo.value = await actividadesStore.fetchActividadById(actividadId.value)
    editActividadDialog.value = false
    await loadActividadInfo() // Reload the activity info
  } catch (error) {
    handleError(error, 'Error al guardar la actividad')
  }
}

// Function to get the activity type based on the activity ID
const getActividadTipo = (tipoId) => {
  const tipoActividad = actividadesStore.tiposActividades.find((tipo) => tipo.id === tipoId)
  return tipoActividad ? tipoActividad.nombre.toUpperCase() : 'Desconocido' // Return 'Desconocido' if not found
}

/*function handleAvatarUpdated(updatedRecord) {
  editedActividad.value.avatarUrl = updatedRecord.avatarUrl
}*/

const handleAvatarUpdated = (updatedRecord) => {
  actividadesStore.$patch((state) => {
    const index = state.actividades.findIndex((s) => s.id === updatedRecord.id)
    if (index !== -1) {
      state.actividades[index] = { ...state.actividades[index], ...updatedRecord }
    }
  })
  actividadInfo.value = { ...actividadInfo.value, ...updatedRecord }
}

// Función para obtener el nombre de la siembra por ID
const getSiembraName = (id) => {
  const siembra = siembrasStore.siembras.find((siembra) => siembra.id === id)

  return siembra ? siembra.nombre.toUpperCase() + '-' + siembra.tipo : 'Siembra no encontrada'
}

/*const getZonasBySiembraId = (siembraId) => {
  // Filtrar las zonas que pertenecen a la siembra y a la actividad actual
  return zonasStore.zonas.filter(
    (zona) => zona.siembra === siembraId && actividadInfo.value.zonas.includes(zona.id)
  )
}*/

const getTipoZonasById = (tiposZonasId) => {
  const tipoZona = tiposZonas.value.find((tipo) => tipo.id === tiposZonasId)
  return tipoZona ? tipoZona.nombre : 'Tipo de zona no encontrado' // Retorna el nombre o un mensaje si no se encuentra
}

const filteredZonas = computed(() => {
  const zonastemp = zonas.value.filter((zona) => !zona.siembra) // Filtrar zonas sin siembra
  console.log('zonasStore.zonas:', zonasStore.zonas)
  console.log('zonastemp:', zonastemp)
  return zonastemp
})

// Función para abrir el diálogo
const openAddSiembrasZonas = () => {
  dialogSiembrasZonas.value = true
  selectedSiembras.value = actividadInfo.value.siembra || [] // Asignar siembras existentes
  selectedZonas.value = actividadInfo.value.zonas || [] // Asignar zonas existentes
}

const saveSelection = () => {
  actividadInfo.value.siembra = selectedSiembras.value // Guardar las siembras seleccionadas en la actividad
  dialogSiembrasZonas.value = false // Cerrar el diálogo
}
</script>

<style scoped>
/* Add any necessary styles here */
</style>
