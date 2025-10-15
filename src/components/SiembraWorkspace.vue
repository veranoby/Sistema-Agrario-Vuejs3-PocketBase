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
                    class="ml-3 text-sm font-extrabold hover:text-gray-700"
                    >{{ t('sowing_workspace.my_sowings') }}</router-link
                  >
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-chevron-right</v-icon>
                  <span class="ml-1 text-sm font-extrabold text-gray-600" aria-current="page">{{
                    siembraInfo.nombre
                  }}</span>
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <span class="ml-1 text-sm font-bold text-gray-700" aria-current="page">{{
                    siembraInfo.tipo
                  }}</span>
                </div>
              </li>
            </ol>
          </nav>

          <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
            {{ t('sowing_workspace.hacienda') }}: {{ mi_hacienda.name }}
          </v-chip>

          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
            {{ userRole }}
          </v-chip>

          <v-chip :color="getStatusColor(siembraInfo.estado)" size="x-small" variant="flat">
            {{ siembraInfo.estado }}
          </v-chip>

          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            {{ t('sowing_workspace.start') }}: {{ formatDate(siembraInfo.fecha_inicio) }}
          </v-chip>
        </h3>
        <div class="avatar-container">
          <img :src="siembraAvatarUrl" alt="Avatar de Siembra" class="avatar-image" />
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
              <span>{{ t('sowing_workspace.sowing_information') }}</span>
            </div>
            <v-btn
              class="agricultural-btn agricultural-btn--edit"
              @click="openEditDialog"
              @keydown.enter="openEditDialog"
              @keydown.space.prevent="openEditDialog"
              icon
              size="large"
              :aria-label="t('sowing_workspace.edit_sowing_info')"
              tabindex="0"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <div
                  class="flex-1 rounded-lg border-2 p-4 mt-2 mb-4 rich-text-content"
                  v-html="siembraInfo.info || t('sowing_workspace.not_available')"
                ></div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="bitacora-embedded-section mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ t('sowing_workspace.recent_log') }}</span>
            <v-btn
              class="agricultural-btn agricultural-btn--primary"
              @click="openNewBitacoraEntryDialog"
              @keydown.enter="openNewBitacoraEntryDialog"
              @keydown.space.prevent="openNewBitacoraEntryDialog"
              size="large"
              :aria-label="t('sowing_workspace.new_entry')"
              tabindex="0"
            >
              <v-icon start>mdi-plus-circle-outline</v-icon>
              {{ t('sowing_workspace.new_entry') }}
            </v-btn>
          </v-card-title>
          <v-card-text>
            <EmbeddedBitacoraList :siembraId="siembraId" title="" :itemLimit="5" />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Sidebar -->
      <v-col cols="12" md="4" class="px-0 py-4">
        <v-card class="zonas-section mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            {{ t('sowing_workspace.registered_zones') }}
            <v-btn
              class="agricultural-btn agricultural-btn--primary"
              @click="openAddZonaDialog"
              @keydown.enter="openAddZonaDialog"
              @keydown.space.prevent="openAddZonaDialog"
              icon
              size="large"
              :aria-label="t('sowing_workspace.add_new_zone')"
              tabindex="0"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="px-2 py-0">
            <v-chip
              variant="flat"
              :color="
                totalArea < siembraInfo.area_total / 3
                  ? 'red'
                  : totalArea < (2 * siembraInfo.area_total) / 3
                    ? 'orange'
                    : totalArea === siembraInfo.area_total
                      ? 'green'
                      : 'green-lighten-2'
              "
              size="x-small"
              class="mx-1"
              pill
            >
              {{ t('sowing_workspace.current_area') }}: {{ totalArea }} {{ areaUnit }}
            </v-chip>

            <v-chip variant="flat" size="x-small" color="green" class="mx-1" pill>
              {{ t('sowing_workspace.target_area') }}: {{ siembraInfo.area_total }} ha
            </v-chip>

            <v-data-table
              :headers="headers"
              :items="zonasfiltradas"
              class="elevation-1 tabla-compacta my-2 mx-0 py-0 px-0"
              density="compact"
              item-value="id"
              show-expand
              v-model:expanded="expanded"
              header-class="custom-header"
            >
              <template #[`item.area`]="{ item }">
                <span>{{ item.area.area }} {{ item.area.unidad }}</span>
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

              <template #[`item.actions`]="{ item }">
                <v-icon class="me-2" @click="editZona(item)"> mdi-pencil </v-icon>
                <v-icon @click="deleteZona(item)"> mdi-delete </v-icon>
              </template>

              <template v-slot:bottom> </template>

              <template #expanded-row="{ columns, item }">
                <td :colspan="columns.length" class="border-2 border-b-gray-400">
                  <v-card flat class="p-2 bg-transparent">
                    <v-row no-gutters>
                      <v-col cols="9" class="pr-4">
                        <p v-if="item.gps" class="ml-2 mr-0 p-0 text-xs">
                          <v-icon>mdi-map-marker-radius</v-icon>
                          {{ t('sowing_workspace.gps_info', { lat: item.gps.lat, lng: item.gps.lng }) }}
                        </p>
                        <p v-else class="ml-2 mr-0 mb-2 p-0 text-xs">
                          <v-icon>mdi-map-marker-radius</v-icon> {{ t('sowing_workspace.not_available') }}
                        </p>
                        <p class="ml-2 mr-0 mb-2 p-0 text-xs">
                          <v-icon>mdi-information-outline</v-icon> {{ t('sowing_workspace.information') }}:<label
                            class="rich-text-content"
                            v-html="item.info || t('sowing_workspace.not_available')"
                          ></label>
                        </p>
                        <p>
                          <v-chip
                            v-for="(metrica, key) in item.metricas"
                            :key="key"
                            color="blue-grey-lighten-1"
                            size="x-small"
                            variant="flat"
                            class="m-1"
                          >
                            {{ key.replace(/_/g, ' ').toUpperCase() }}:{{ metrica.valor }}
                          </v-chip>
                        </p>
                      </v-col>
                      <v-col cols="3" class="d-flex justify-center align-center">
                        <v-img
                          v-if="item.avatar"
                          :src="getAvatarUrl(item.id)"
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

        <v-card class="zonas-section mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            {{ t('sowing_workspace.related_activities') }}
            <v-btn
              class="agricultural-btn agricultural-btn--primary"
              @click="dialogNuevaActividad = true"
              @keydown.enter="dialogNuevaActividad = true"
              @keydown.space.prevent="dialogNuevaActividad = true"
              icon
              size="large"
              :aria-label="t('sowing_workspace.add_new_activity')"
              tabindex="0"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="px-2 py-0">
            <v-data-table
              :headers="headers_actividades"
              :items="actividadesfiltradas"
              class="elevation-1 tabla-compacta my-2 mx-0 py-0 px-0"
              density="compact"
              item-value="id"
              show-expand
              v-model:expanded="expanded"
              header-class="custom-header"
            >
              <template #[`item.tipo`]="{ item }">
                <span>{{ item.expand?.tipo_actividades?.nombre }}</span>
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

              <template #[`item.actions`]="{ item }">
                <v-icon size="large" color="primary" class="me-2" @click="editActividad(item)">
                  mdi-arrow-right-bold-circle-outline
                </v-icon>
                <v-icon @click="deleteActividad(item)"> mdi-delete </v-icon>
              </template>

              <template v-slot:bottom> </template>

              <template #expanded-row="{ columns, item }">
                <td :colspan="columns.length" class="border-2 border-b-gray-400">
                  <v-card flat class="p-2 bg-transparent">
                    <v-row no-gutters>
                      <v-col cols="9" class="pr-4">
                        <p>
                          <v-chip
                            v-for="(metrica, key) in item.metricas"
                            :key="key"
                            color="blue-grey-lighten-1"
                            size="x-small"
                            variant="flat"
                            class="m-1"
                          >
                            {{ key.replace(/_/g, ' ').toUpperCase() }}:{{ metrica.valor }}
                          </v-chip>
                        </p>
                        <hr />
                        <p class="ml-2 mr-0 mb-2 p-0 text-xs">
                          <v-icon>mdi-information-outline</v-icon> {{ t('sowing_workspace.information') }}:<label
                            class="rich-text-content"
                            v-html="item.descripcion || t('sowing_workspace.not_available')"
                          ></label>
                        </p>
                      </v-col>
                      <v-col cols="3" class="d-flex justify-center align-center">
                        <v-img
                          v-if="item.avatar"
                          :src="getAvatarUrl(item.id)"
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
      </v-col>
    </v-row>

    <v-dialog
      v-model="editSiembraDialog"
      max-width="800px"
      persistent
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card>
        <v-toolbar color="success" dark>
          <v-toolbar-title>{{ t('sowing_workspace.edit_sowing') }}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-form ref="editSiembraForm">
          <v-card-text>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <v-text-field
                  v-model="editedSiembra.nombre"
                  :label="t('sowing_workspace.name')"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
                <v-text-field
                  v-model="editedSiembra.tipo"
                  :label="t('sowing_workspace.type')"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
                <v-select
                  v-model="editedSiembra.estado"
                  :items="estadosSiembra"
                  :label="t('sowing_workspace.state')"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-select>
                <v-text-field
                  v-model="editedSiembra.area_total"
                  :label="t('sowing_workspace.objective_area')"
                  type="number"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
                <v-text-field
                  v-model="editedSiembra.fecha_inicio"
                  :label="t('sowing_workspace.start_date')"
                  type="date"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
              </div>
              <div>
                <AvatarForm
                  v-model="showAvatarDialog"
                  collection="Siembras"
                  :entityId="siembraInfo?.id"
                  :currentAvatarUrl="siembraAvatarUrl"
                  :hasCurrentAvatar="!!siembraInfo?.avatar"
                  @avatar-updated="handleAvatarUpdated"
                />
                <div class="flex items-center justify-center mt-0 relative">
                  <v-avatar size="192">
                    <v-img :src="siembraAvatarUrl" alt="Avatar de Siembra"></v-img>
                  </v-avatar>
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
            <div class="mt-4">
              <div class="mb-2">
                <v-icon class="mr-2">mdi-information</v-icon>
                {{ t('sowing_workspace.my_info') }}
              </div>
              <QuillEditor
                v-model:content="editedSiembra.info"
                contentType="html"
                toolbar="essential"
                theme="snow"
                class="quill-editor"
              />
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              size="large"
              variant="elevated"
              rounded="lg"
              prepend-icon="mdi-check-circle"
              class="agricultural-btn agricultural-btn--primary"
              @click="saveSiembraEdit"
              @keydown.enter="saveSiembraEdit"
              @keydown.space.prevent="saveSiembraEdit"
              :aria-label="t('sowing_workspace.save')"
              tabindex="0"
            >
              {{ t('sowing_workspace.save') }}
            </v-btn>
            <v-btn
              size="large"
              variant="elevated"
              rounded="lg"
              prepend-icon="mdi-cancel"
              class="agricultural-btn agricultural-btn--secondary"
              @click="editSiembraDialog = false"
              @keydown.enter="editSiembraDialog = false"
              @keydown.space.prevent="editSiembraDialog = false"
              :aria-label="t('sowing_workspace.cancel')"
              tabindex="0"
            >
              {{ t('sowing_workspace.cancel') }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addBitacoraDialog" max-width="600px">
      <v-card>
        <v-toolbar color="success" dark>
          <v-toolbar-title>{{ t('sowing_workspace.add_to_log') }}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-card-text>
          <v-form ref="addBitacoraForm">
            <v-text-field v-model="newBitacora.fecha" :label="t('sowing_workspace.date')" type="date"></v-text-field>
            <v-select
              v-model="newBitacora.actividad"
              :items="actividades"
              item-text="nombre"
              item-value="id"
              :label="t('sowing_workspace.activity')"
            ></v-select>
            <v-select
              v-model="newBitacora.zonas"
              :items="zonas"
              item-text="nombre"
              item-value="id"
              :label="t('sowing_workspace.zones')"
              multiple
              chips
            ></v-select>
            <v-textarea v-model="newBitacora.descripcion" :label="t('sowing_workspace.description')"></v-textarea>
            <v-select
              v-model="newBitacora.responsable"
              :items="usuarios"
              item-text="name"
              item-value="id"
              :label="t('sowing_workspace.responsible')"
            ></v-select>
            <v-select
              v-model="newBitacora.estado"
              :items="estadosBitacora"
              :label="t('sowing_workspace.state')"
            ></v-select>
            <v-textarea v-model="newBitacora.notas" :label="t('sowing_workspace.notes')"></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveBitacoraEntry">{{ t('sowing_workspace.save') }}</v-btn>
          <v-btn color="error" text @click="addBitacoraDialog = false">{{ t('sowing_workspace.cancel') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addZonaDialog" persistent max-width="1000px">
      <ZonaForm
        :modo-edicion="modoEdicionZona"
        :zona-inicial="zonaEditando"
        :tipo-zona-actual="tipoZonaActual"
        :siembra-context="siembraInfo"
        :from-siembra-workspace="true"
        @close="cerrarDialogoZona"
        @saved="onZonaSaved"
      />
    </v-dialog>

    <ActividadForm
      v-model="dialogNuevaActividad"
      :siembra-preseleccionada="siembraId"
      @actividad-creada="loadActividades"
    />

    <v-dialog v-model="showBitacoraFormDialog" max-width="800px" persistent scrollable>
      <BitacoraEntryForm
        v-if="showBitacoraFormDialog"
        :siembraIdContext="siembraId"
        @close="showBitacoraFormDialog = false"
        @save="handleBitacoraSave"
      />
    </v-dialog>
  </v-container>
  <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'
import { useZonasStore } from '@/stores/zonasStore'
import ZonaForm from '@/components/forms/ZonaForm.vue'
import AvatarForm from '@/components/forms/AvatarForm.vue'
import { useAvatarStore } from '@/stores/avatarStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import ActividadForm from '@/components/forms/ActividadForm.vue'
import EmbeddedBitacoraList from './EmbeddedBitacoraList.vue'
import BitacoraEntryForm from '@/components/forms/BitacoraEntryForm.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const siembrasStore = useSiembrasStore()
const bitacoraStore = useBitacoraStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const snackbarStore = useSnackbarStore()
const zonasStore = useZonasStore()
const avatarStore = useAvatarStore()
const actividadesStore = useActividadesStore()

const siembraId = ref(route.params.id)
const siembraInfo = ref({})
const dialogNuevaActividad = ref(false)
const showBitacoraFormDialog = ref(false)

const { zonas, tiposZonas } = storeToRefs(zonasStore)
const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const userRole = computed(() => user.value?.role || '')
const avatarUrl = computed(() => profileStore.avatarUrl)

const siembraAvatarUrl = computed(() => {
  return avatarStore.getAvatarUrl({ ...siembraInfo.value, type: 'siembra' }, 'Siembras')
})

const { actividades } = storeToRefs(actividadesStore)
const usuarios = ref([])
const isLoading = ref(true)

const totalArea = computed(() => {
  return zonas.value
    .filter((zona) => zona.contabilizable && zona.siembra === siembraId.value)
    .reduce((sum, zona) => sum + (parseFloat(zona.area.area) || 0), 0)
    .toFixed(2)
})

const headers = [
  { title: t('sowing_workspace.name'), align: 'start', key: 'nombre' },
  { title: t('sowing_workspace.area'), align: 'center', key: 'area' },
  { title: t('sowing_workspace.bpa'), align: 'center', key: 'bpa_estado' },
  { title: t('sowing_workspace.actions'), key: 'actions', sortable: false, align: 'end' }
]

const headers_actividades = [
  { title: t('sowing_workspace.name'), align: 'start', key: 'nombre' },
  { title: t('sowing_workspace.type'), align: 'center', key: 'tipo' },
  { title: t('sowing_workspace.bpa'), align: 'center', key: 'bpa_estado' },
  { title: t('sowing_workspace.actions'), key: 'actions', sortable: false, align: 'end' }
]

const expanded = ref([])
const areaUnit = ref('ha')
const itemsPerPage = ref(10)
const editSiembraDialog = ref(false)
const editedSiembra = ref({})
const addBitacoraDialog = ref(false)
const addZonaDialog = ref(false)

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

const modoEdicionZona = ref(false)
const zonaEditando = ref({
  nombre: '',
  area: { area: null, unidad: '' },
  info: '',
  contabilizable: false,
  gps: '',
  datos_bpa: [],
  metricas: {}
})
const avatarFileZona = ref(null)
const tipoZonaActual = ref(null)

const zonasfiltradas = computed(() => {
  return zonas.value?.filter((zona) => zona.siembra === siembraId.value) || []
})

const actividadesfiltradas = computed(() => {
  if (!actividades.value || !siembraId.value) return []
  return actividades.value.filter((actividad) => {
    const siembras = Array.isArray(actividad.siembras) ? actividad.siembras : []
    return siembras.includes(siembraId.value)
  })
})

const cerrarDialogoZona = () => {
  addZonaDialog.value = false
  avatarFileZona.value = null
}

async function loadSiembraInfo() {
  try {
    const siembra = await siembrasStore.fetchSiembraById(siembraId.value)
    siembraInfo.value = siembra
  } catch (error) {
    handleError(error, t('sowing_workspace.error_loading_sowing_info'))
  }
}

async function loadHacienda() {
  try {
    await haciendaStore.fetchHacienda(siembraInfo.value.hacienda)
  } catch (error) {
    handleError(error, t('sowing_workspace.error_loading_hacienda_info'))
  }
}

async function loadUsuarios() {
  try {
    usuarios.value = await haciendaStore.fetchHaciendaUsers()
  } catch (error) {
    handleError(error, t('sowing_workspace.error_loading_users'))
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

function openAddZonaDialog() {
  modoEdicionZona.value = false
  const tipoLote = tiposZonas.value.find((tipo) => tipo.nombre === 'Lotes')
  tipoZonaActual.value = tipoLote
  zonaEditando.value = {
    nombre: '',
    area: { area: null, unidad: 'ha' },
    info: '',
    contabilizable: true,
    gps: '',
    tipo: tipoLote?.id,
    datos_bpa: [],
    metricas: {},
    siembra: siembraId.value,
    hacienda: mi_hacienda.value?.id
  }
  addZonaDialog.value = true
}

async function saveSiembraEdit() {
  try {
    if (!editedSiembra.value.nombre || !editedSiembra.value.estado) {
      throw new Error(t('sowing_workspace.required_fields'))
    }
    editedSiembra.value.nombre = editedSiembra.value.nombre.toUpperCase()
    editedSiembra.value.tipo = editedSiembra.value.tipo.toUpperCase()
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
    await siembrasStore.updateSiembra(siembraId.value, siembraToUpdate)
    siembraInfo.value = await siembrasStore.fetchSiembraById(siembraId.value)
    editSiembraDialog.value = false
    snackbarStore.showSnackbar(t('sowing_workspace.sowing_updated_successfully'), 'success')
  } catch (error) {
    handleError(error, t('sowing_workspace.error_updating_sowing'))
  }
}

const editActividad = (item) => {
  router.push(`/Actividades/${item.id}`)
}

function editZona(zona) {
  modoEdicionZona.value = true
  const tipoZona = tiposZonas.value.find((tipo) => tipo.id === zona.tipo)
  tipoZonaActual.value = tipoZona
  const metricasInicializadas = {}
  if (tipoZona?.metricas?.metricas) {
    Object.entries(tipoZona.metricas.metricas).forEach(([key, value]) => {
      metricasInicializadas[key] = {
        ...value,
        valor:
          zona.metricas?.[key]?.valor ??
          (value.tipo === 'checkbox'
            ? []
            : value.tipo === 'string'
              ? null
              : value.tipo === 'number'
                ? 0
                : value.tipo === 'multi-select'
                  ? []
                  : value.tipo === 'select'
                    ? null
                    : value.tipo === 'boolean'
                      ? false
                      : null)
      }
    })
  }
  zonaEditando.value = {
    ...zona,
    datos_bpa: zona.datos_bpa || []
  }
  addZonaDialog.value = true
}

async function loadActividades() {
  try {
    await actividadesStore.cargarActividades()
  } catch (error) {
    handleError(error, t('sowing_workspace.error_loading_activities'))
  }
}

async function deleteZona(zona) {
  if (confirm(t('sowing_workspace.confirm_delete_zone'))) {
    try {
      await zonasStore.eliminarZona(zona.id)
      snackbarStore.showSnackbar(t('sowing_workspace.zone_deleted_successfully'), 'success')
    } catch (error) {
      handleError(error, t('sowing_workspace.error_deleting_zone'))
    }
  }
}

async function deleteActividad(actividad) {
  if (confirm(t('sowing_workspace.confirm_delete_activity'))) {
    try {
      await actividadesStore.deleteActividad(actividad.id)
      snackbarStore.showSnackbar(t('sowing_workspace.activity_deleted_successfully'), 'success')
    } catch (error) {
      handleError(error, t('sowing_workspace.error_deleting_activity'))
    }
  }
}

import placeholderZonas from '@/assets/placeholder-zonas.png'

const getAvatarUrl = (zonaId) => {
  const zona = zonas.value.find((s) => s.id === zonaId)
  if (!zona) return placeholderZonas
  return avatarStore.getAvatarUrl({ ...zona, type: 'zona' }, 'zonas')
}

onMounted(async () => {
  try {
    await loadSiembraInfo()
    await Promise.all([
      zonasStore.cargarZonas(),
      zonasStore.cargarTiposZonas(),
      loadActividades(),
      loadUsuarios(),
      loadHacienda()
    ])
  } catch (error) {
    handleError(error, t('sowing_workspace.error_loading_initial_data'))
  } finally {
    isLoading.value = false
  }
})

const onZonaSaved = async () => {
  addZonaDialog.value = false
  snackbarStore.showSnackbar(t('sowing_workspace.zone_saved_successfully'), 'success')
}

const handleAvatarUpdated = (updatedRecord) => {
  siembrasStore.$patch((state) => {
    const index = state.siembras.findIndex((s) => s.id === updatedRecord.id)
    if (index !== -1) {
      state.siembras[index] = { ...state.siembras[index], ...updatedRecord }
    }
  })
  siembraInfo.value = { ...siembraInfo.value, ...updatedRecord }
}

const showAvatarDialog = ref(false)

function openNewBitacoraEntryDialog() {
  showBitacoraFormDialog.value = true
}

async function handleBitacoraSave() {
  showBitacoraFormDialog.value = false
}
</script>

<style scoped>
:root {
  --agri-green-primary: #2e7d32;
  --agri-green-light: #4caf50;
  --agri-earth-brown: #5d4037;
  --agri-soil-dark: #3e2723;
  --agri-sunshine-yellow: #ffd54f;
  --agri-sky-blue: #1976d2;
  --agri-harvest-orange: #f57c00;
  --agri-warning-red: #d32f2f;
  --agri-surface-light: #f8f9fa;
  --agri-surface-card: #ffffff;
}
.agricultural-btn {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.025em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}
.agricultural-btn--primary {
  background: linear-gradient(45deg, var(--agri-green-primary), var(--agri-green-light));
  border: none;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
  color: white;
}
.agricultural-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.4);
}
.agricultural-btn--edit {
  border: 2px solid var(--agri-green-primary);
  color: var(--agri-green-primary);
  background: transparent;
}
.agricultural-btn--edit:hover {
  background: var(--agri-green-primary);
  color: white;
  transform: translateY(-1px);
}
.agricultural-btn--secondary {
  background: linear-gradient(45deg, var(--agri-warning-red), #e57373);
  border: none;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
  color: white;
}
.agricultural-btn--secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(211, 47, 47, 0.4);
}
.agricultural-btn:focus-visible {
  outline: 3px solid var(--agri-sky-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--agri-surface-card), 0 0 0 5px var(--agri-sky-blue);
}
.agricultural-btn:active {
  transform: translateY(0);
  transition: transform 0.1s;
}
@media (max-width: 1024px) {
  .agricultural-btn {
    min-height: 48px;
    font-size: 0.95rem;
  }
}
@media (max-width: 768px) {
  .agricultural-btn {
    min-height: 52px;
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>