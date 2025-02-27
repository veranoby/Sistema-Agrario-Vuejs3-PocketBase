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
                  TIPO:{{ actividadesStore.getActividadTipo(actividadInfo.tipo_actividades) }}
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
      <v-col cols="12" md="9" class="pa-4 pt-2">
        <v-row no-gutters>
          <!-- Datos Actividad -->
          <v-col cols="8" class="pr-2">
            <v-card class="actividad-info mb-4" elevation="2">
              <v-card-title class="headline d-flex flex-column">
                <!-- Primera línea: Título y botón -->
                <div class="d-flex justify-space-between align-center w-100">
                  <span>Información de la Actividad</span>
                  <v-btn color="green-lighten-2" @click="openEditDialog" icon>
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </div>

                <!-- Segunda línea: Chips -->
                <div class="w-100 mt-2">
                  <v-tooltip
                    v-for="(metrica, key) in actividadInfo.metricas"
                    :key="key"
                    location="bottom"
                  >
                    <template v-slot:activator="{ props }">
                      <v-chip
                        v-bind="props"
                        variant="flat"
                        size="x-small"
                        color="green-lighten-3"
                        class="m-1 p-1"
                        pill
                      >
                        {{ key.replace(/_/g, ' ').toUpperCase() }}:
                        {{ formatMetricValue(metrica.valor) }}
                      </v-chip>
                    </template>
                    <span>{{ metrica.descripcion }}</span>
                  </v-tooltip>
                </div>
              </v-card-title>
              <v-card-text>
                <div
                  class="rich-text-content"
                  v-html="actividadInfo.descripcion || 'No disponible'"
                ></div>
              </v-card-text> </v-card
          ></v-col>

          <!-- Siembras y Zonas -->
          <v-col cols="4" class="pl-2">
            <div class="siembra-info mt-0 p-0">
              <v-card-title class="headline d-flex justify-between">
                <h2 class="text-md font-bold mt-2">
                  <span v-if="actividadInfo.siembras.length > 0">Siembras/Proyectos Asociados</span>
                </h2>
                <v-btn size="x-small" color="green-lighten-2" @click="openAddSiembrasZonas" icon>
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div class="flex flex-wrap">
                  <v-chip
                    v-for="siembraId in actividadInfo.siembras"
                    size="x-small"
                    :key="siembraId"
                    class="m-1 p-1"
                    :text="
                      siembrasStore.getSiembraById(siembraId)?.nombre.toUpperCase() +
                      ' ' +
                      siembrasStore.getSiembraById(siembraId)?.tipo.toUpperCase()
                    "
                    pill
                    color="green-lighten-3"
                    variant="flat"
                  >
                  </v-chip>
                </div>
                <h2 v-if="actividadInfo.zonas.length > 0" class="text-l font-bold mt-2 mb-2">
                  Otras Zonas Asociadas
                </h2>

                <div class="flex flex-wrap">
                  <v-chip
                    v-for="zonasId in actividadInfo.zonas"
                    size="x-small"
                    :key="zonasId"
                    class="m-1 p-1"
                    :text="
                      zonasStore.getZonaById(zonasId)?.nombre.toUpperCase() +
                      ' - ' +
                      zonasStore.getZonaById(zonasId)?.expand?.tipos_zonas?.nombre.toUpperCase()
                    "
                    pill
                    color="blue-lighten-3"
                    variant="flat"
                  >
                  </v-chip>
                </div>
              </v-card-text>
            </div>

            <!-- SECCION PROGRAMACIONES -->
            <div class="siembra-info mt-0 p-0">
              <v-card-title class="headline d-flex justify-between">
                <h2 class="text-md font-bold mt-2">
                  <span>Programaciones</span>
                </h2>
                <v-btn
                  size="x-small"
                  color="green-lighten-2"
                  @click="abrirNuevaProgramacion"
                  icon
                  rounded="circle"
                  class="ml-auto"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </v-card-title>

              <v-card-text>
                <ProgramacionPanel
                  v-for="programacion in programacionesActividad"
                  :key="programacion.id"
                  :programacion="programacion"
                  @ejecutar="ejecutarProgramacion"
                  @editar="editarProgramacion"
                />
              </v-card-text>
            </div>
          </v-col>
        </v-row>

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

      <!-- SIDEBAR  -->
      <v-col cols="3" md="3" class="p-0 pr-4">
        <!-- RECORDATORIOS -->

        <div class="siembra-info mt-2 p-2">
          <v-card-title class="headline d-flex justify-between">
            <h2 class="text-md font-bold mt-2">Recordatorios</h2>
            <v-btn
              size="x-small"
              color="green-lighten-2"
              @click="recordatoriosStore.abrirNuevoRecordatorio(actividadId)"
              icon
              rounded="circle"
              class="ml-auto"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>

          <!-- Panel de editar recordatorios -->
          <RecordatorioForm
            :model-value="recordatoriosStore.dialog"
            @update:modelValue="recordatoriosStore.dialog = $event"
            :recordatorio="recordatoriosStore.recordatorioEdit"
            :is-editing="recordatoriosStore.editando"
            @submit="handleFormSubmit"
          />

          <!-- Panel de Pendientes -->
          <StatusPanel
            title="Pendientes"
            color="red"
            :items="recordatoriosStore.recordatoriosPendientes(actividadId)"
            @update-status="recordatoriosStore.actualizarEstado"
            @edit="recordatoriosStore.editarRecordatorio"
            @delete="recordatoriosStore.eliminarRecordatorio"
          />
          <br />
          <!-- Panel En Progreso -->
          <StatusPanel
            title="En Progreso"
            color="amber"
            :items="recordatoriosStore.recordatoriosEnProgreso(actividadId)"
            @update-status="recordatoriosStore.actualizarEstado"
            @edit="recordatoriosStore.editarRecordatorio"
            @delete="recordatoriosStore.eliminarRecordatorio"
          />
        </div>
      </v-col>
    </v-row>

    <!-- Dialogo de Edición de Actividad -->
    <v-dialog v-model="editActividadDialog" persistent max-width="900px">
      <v-form ref="editActividadForm">
        <v-card>
          <v-toolbar color="success" dark>
            <v-toolbar-title>Editar Actividad</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>

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
                        <v-tooltip location="bottom">
                          <template v-slot:activator="{ props }">
                            <div v-bind="props">
                              <!-- Select para tipo "select" -->
                              <v-select
                                v-if="metrica.tipo === 'select'"
                                v-model="metrica.valor"
                                :label="key.replace(/_/g, ' ')"
                                :items="metrica.opciones"
                                variant="outlined"
                                density="compact"
                                class="compact-form"
                              >
                                <template v-slot:append>
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                                </template>
                              </v-select>

                              <!-- Input number para tipo "date" -->
                              <v-text-field
                                v-else-if="metrica.tipo === 'date'"
                                v-model="metrica.valor"
                                :label="key.replace(/_/g, ' ')"
                                type="date"
                                density="compact"
                                variant="outlined"
                                class="compact-form"
                                :rules="[validateDate]"
                              >
                                <template v-slot:append>
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                                </template>
                              </v-text-field>

                              <!-- Input number para tipo "text" -->
                              <v-text-field
                                v-else-if="metrica.tipo === 'text'"
                                v-model.number="metrica.valor"
                                :label="key.replace(/_/g, ' ')"
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
                                :label="key.replace(/_/g, ' ')"
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
                                :label="key.replace(/_/g, ' ')"
                                density="compact"
                                class="compact-form"
                              >
                                <template v-slot:append>
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                                </template>
                              </v-checkbox>

                              <!-- Input number para tipo "checkbox" -->
                              <v-checkbox
                                v-else-if="metrica.tipo === 'checkbox'"
                                v-model.number="metrica.valor"
                                :label="key.replace(/_/g, ' ')"
                                density="compact"
                                class="compact-form"
                              >
                                <template v-slot:append>
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                                </template>
                              </v-checkbox>
                            </div>
                          </template>
                          <span>{{ metrica.descripcion }}</span>
                        </v-tooltip>
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
                <v-toolbar color="success" dark>
                  <v-toolbar-title>Agregar Métrica</v-toolbar-title>
                  <v-spacer></v-spacer>
                </v-toolbar>
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
              <div class="document-editor">
                <div ref="toolbar"></div>
                <QuillEditor
                  v-model:content="editedActividad.descripcion"
                  contentType="html"
                  toolbar="essential"
                  theme="snow"
                  class="quill-editor"
                />
              </div>
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
          <v-toolbar color="success" dark density="compact">
            <v-toolbar-title small
              ><span class="text-sm"
                ><v-icon class="mr-2">mdi-sprout</v-icon>Siembras/Proyectos</span
              ></v-toolbar-title
            >
            <v-spacer></v-spacer>
          </v-toolbar>

          <v-card-text class="ml-4 mr-4">
            <v-chip-group column color="green-darken-4" multiple v-model="selectedSiembras">
              <v-chip
                v-for="siembra in siembras"
                :key="siembra.id"
                :text="`${siembra.nombre}-${siembra.tipo}`"
                :value="siembra.id"
                filter
                density="compact"
              ></v-chip>
            </v-chip-group>
          </v-card-text>
        </v-card>
        <v-card>
          <v-toolbar color="primary" dark density="compact">
            <v-toolbar-title
              ><span class="text-sm"
                ><v-icon class="mr-2">mdi-map</v-icon>Zonas disponibles</span
              ></v-toolbar-title
            >
            <v-spacer></v-spacer>
          </v-toolbar>

          <v-card-text class="ml-4 mr-4">
            <v-chip-group color="blue-darken-4" column multiple v-model="selectedZonas">
              <v-chip
                v-for="zona in filteredZonas"
                :key="zona.id"
                :text="`${zona.nombre}(${zonasStore.getZonaById(zona.id)?.expand?.tipos_zonas?.nombre.toUpperCase()})`"
                :value="zona.id"
                filter
                size="small"
                density="compact"
                pill
              ></v-chip>
            </v-chip-group>
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

    <ProgramacionForm
      v-model="mostrarFormProgramacion"
      :programacionActual="programacionEdit"
      :actividadPredefinida="actividadId"
      @guardado="cargarProgramaciones"
    />
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

import StatusPanel from '@/components/StatusPanel.vue'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'

import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import ProgramacionPanel from '@/components/ProgramacionPanel.vue'
import ProgramacionForm from '@/components/forms/ProgramacionForm.vue'

const route = useRoute()
const actividadesStore = useActividadesStore()
const avatarStore = useAvatarStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()
const recordatoriosStore = useRecordatoriosStore()
const programacionesStore = useProgramacionesStore()

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
const mostrarFormProgramacion = ref(false)
const programacionEdit = ref(null)

const isLoading = ref(true)

const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const { tiposActividades } = storeToRefs(actividadesStore)

const { siembras } = storeToRefs(siembrasStore)
const { zonas, tiposZonas } = storeToRefs(zonasStore)

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
  return tiposActividades.value.find((tipo) => tipo.id === actividadInfo.value.tipo_actividades)
})

//const tipoActividadNombre = computed(() => actividadInfo.value.expand.tipo_actividades.nombre)

const getBpaPreguntas = computed(() => {
  const tipoActividadFiltrar = actividadesStore.tiposActividades.find(
    (t) => t.id === editedActividad.value.tipo_actividades
  )
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
    await recordatoriosStore.cargarRecordatorios()
    await programacionesStore.cargarProgramaciones()
  } catch (error) {
    handleError(error, 'Error al cargar la información de la actividad')
  } finally {
    isLoading.value = false
  }
})

const loadActividadInfo = async () => {
  actividadInfo.value = await actividadesStore.fetchActividadById(actividadId.value, {
    expand: 'tipo_actividades, zonas.tipos_zonas'
  })
}

function openEditDialog() {
  editedActividad.value = { ...actividadInfo.value }
  editActividadDialog.value = true
}

function openAddMetricaDialog() {
  addMetricaDialog.value = true
}

// Optimizar manejo de métricas
const metricasHandler = {
  getInitialValue(tipo) {
    const initialValues = {
      number: 0,
      text: '',
      select: [],
      checkbox: false
    }
    return initialValues[tipo] ?? ''
  },

  validateMetrica(metrica) {
    return metrica.titulo && metrica.descripcion && metrica.tipo
  }
}

// Optimizar addMetrica
function addMetrica() {
  if (!metricasHandler.validateMetrica(newMetrica.value)) {
    snackbarStore.showError('Por favor complete todos los campos')
    return
  }

  const metricaKey = newMetrica.value.titulo.toLowerCase().replace(/ /g, '_')
  const valorInicial = metricasHandler.getInitialValue(newMetrica.value.tipo)

  editedActividad.value.metricas = {
    ...editedActividad.value.metricas,
    [metricaKey]: {
      descripcion: newMetrica.value.descripcion,
      tipo: newMetrica.value.tipo,
      valor: valorInicial
    }
  }

  addMetricaDialog.value = false
  newMetrica.value = { titulo: '', descripcion: '', tipo: '' }
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

/* Function to get the activity type based on the activity ID
const getActividadTipo = (tipoId) => {
  const tipoActividad = actividadesStore.tiposActividades.find((tipo) => tipo.id === tipoId)
  return tipoActividad ? tipoActividad.nombre.toUpperCase() : 'Desconocido'
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

const filteredZonas = computed(() => {
  const zonastemp = zonas.value.filter((zona) => !zona.siembra) // Filtrar zonas sin siembra
  return zonastemp
})

// Función para abrir el diálogo
const openAddSiembrasZonas = () => {
  dialogSiembrasZonas.value = true
  selectedSiembras.value = actividadInfo.value.siembras || [] // Asignar siembras existentes
  selectedZonas.value = actividadInfo.value.zonas || [] // Asignar zonas existentes
}

const saveSelection = async () => {
  actividadInfo.value.siembras = selectedSiembras.value // Guardar las siembras seleccionadas en la actividad
  actividadInfo.value.zonas = selectedZonas.value // Guardar las siembras seleccionadas en la actividad
  dialogSiembrasZonas.value = false // Cerrar el diálogo

  // Llama a updateActividad para guardar los cambios
  try {
    await actividadesStore.updateActividad(actividadId.value, {
      siembras: actividadInfo.value.siembra,
      zonas: actividadInfo.value.zonas
    })
    console.log('Actividad actualizada correctamente')
  } catch (error) {
    console.error('Error al actualizar la actividad:', error)
  }
}

const validateDate = (value) => {
  if (!value) return true
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(value) || 'Formato inválido (yyyy-MM-dd)'
}

const formatMetricValue = (value) => {
  if (!value || value === null) return 'N/A'
  return Array.isArray(value) ? value[0] : value
}

async function handleFormSubmit(data) {
  try {
    if (recordatoriosStore.editando) {
      await recordatoriosStore.actualizarRecordatorio(data.id, data)
    } else {
      await recordatoriosStore.crearRecordatorio(data)
    }
    recordatoriosStore.dialog = false
  } catch (error) {
    handleError(error, 'Error al guardar recordatorio')
  }
}

const onEditorReady = (editor) => {
  // Insert the toolbar before the editable area
  document
    .querySelector('.document-editor')
    .insertBefore(
      editor.ui.view.toolbar.element,
      document.querySelector('.document-editor .ck-editor__editable')
    )
}

const programacionesActividad = computed(() => {
  return programacionesStore.programaciones.filter((p) => p.actividades.includes(actividadId.value))
})

const abrirNuevaProgramacion = () => {
  programacionEdit.value = null
  mostrarFormProgramacion.value = true
}

const editarProgramacion = (programacion) => {
  programacionEdit.value = programacion
  mostrarFormProgramacion.value = true
}

const ejecutarProgramacion = async (id) => {
  await programacionesStore.ejecutarProgramacion(id)
  await cargarProgramaciones()
}

const cargarProgramaciones = async () => {
  await programacionesStore.cargarProgramaciones()
}
</script>

<style scoped>
.document-editor {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 1rem;
}

.document-editor .ck-editor__editable {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  border: 0;
  border-top: 1px solid #e2e8f0;
}
</style>
