<template>
  <v-container fluid class="flex flex-col min-h-screen pa-0" v-if="!isLoading">
    <!-- Header -->
    <header class="bg-background shadow-sm">
      <SiembraHeader
        :siembraInfo="siembraInfo"
        :avatarUrl="avatarUrl"
        :avatarHaciendaUrl="avatarHaciendaUrl"
        :mi_hacienda="mi_hacienda"
        :userRole="userRole"
        :siembraAvatarUrl="siembraAvatarUrl"
      />
    </header>

    <v-row no-gutters>
      <!-- Main Content -->
      <v-col cols="12" md="8" class="pa-4">
        <SiembraInfo :siembraInfo="siembraInfo" @open-edit-dialog="openEditDialog" />

        <!-- Mapa de la Siembra (Agregación de Lotes) -->
        <v-card class="mb-4 overflow-hidden border">
          <v-toolbar density="compact" flat color="grey-lighten-4">
            <v-icon start size="small" class="ml-2">mdi-map-marker-radius</v-icon>
            <span class="text-caption font-weight-bold">Mapa de Áreas de Siembra (Lotes)</span>
            <v-spacer></v-spacer>
          </v-toolbar>
          <v-card-text class="pa-0">
            <GisMapComponent
              v-if="siembraFeatureCollection"
              :readonly="true"
              :initialGeoJSON="siembraFeatureCollection"
              style="height: 350px;"
            />
            <div v-else class="pa-4 text-center text-caption text-grey">
              No hay áreas dibujadas para esta siembra
            </div>
          </v-card-text>
        </v-card>

        <SiembraBitacora
          :siembraId="siembraId"
          @open-new-bitacora-entry-dialog="openNewBitacoraEntryDialog"
        />
      </v-col>


      <!-- Sidebar -->
      <v-col cols="12" md="4" class="px-0 py-4">
        <SiembraZonas
          title="ZONAS REGISTRADAS (LOTES)"
          :esLote="true"
          :siembraInfo="siembraInfo"
          :totalArea="totalArea"
          :areaUnit="areaUnit"
          :zonasfiltradas="zonasLotes"
          :headers="headers"
          v-model:expanded="expandedZonas"
          :zonas="zonas"
          @open-add-zona="handleOpenAddZona"
          @edit-zona="handleEditZona"
          @delete-zona="handleDeleteZona"
        />

        <SiembraZonas
          title="PUNTOS DE INTERÉS Y OTRAS ZONAS"
          :esLote="false"
          :siembraInfo="siembraInfo"
          :totalArea="totalArea"
          :areaUnit="areaUnit"
          :zonasfiltradas="zonasOtras"
          :headers="headers"
          v-model:expanded="expandedZonas"
          :zonas="zonas"
          @open-add-zona="handleOpenAddZona"
          @edit-zona="handleEditZona"
          @delete-zona="handleDeleteZona"
        />

        <SiembraActividades
          :actividadesfiltradas="actividadesfiltradas"
          :headers="headers_actividades"
          v-model:expanded="expandedActividades"
          :actividades="actividades"
          @open-add-actividad="handleOpenAddActividad"
          @edit-actividad="handleEditActividad"
          @delete-actividad="handleDeleteActividad"
        />
      </v-col>
    </v-row>

    <!-- Edit Siembra Dialog -->
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
                  size="small"
                  color="green-lighten-2"
                  icon
                  rounded="circle"
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
              variant="flat"              
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              @click="editSiembraDialog = false"
            >
              {{ t('sowing_workspace.cancel') }}
            </v-btn>
            <v-btn
              variant="flat"              
              prepend-icon="mdi-check"
              color="green-lighten-3"
              @click="saveSiembraEdit"
            >
              {{ t('sowing_workspace.save') }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <!-- Add Bitacora Dialog -->
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

    <!-- Add Zona Dialog -->
    <v-dialog v-model="addZonaDialog" persistent max-width="1400px">
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

    <!-- Add Actividad Form -->
    <ActividadForm
      v-model="dialogNuevaActividad"
      :siembra-preseleccionada="siembraId"
      @actividad-creada="loadActividades"
    />

    <!-- Bitacora Form Dialog -->
    <v-dialog v-model="showBitacoraFormDialog" max-width="800px" persistent scrollable>
      <BitacoraEntryForm
        v-if="showBitacoraFormDialog"
        :siembraIdContext="siembraId"
        @close="showBitacoraFormDialog = false"
        @save="handleBitacoraSave"
      />
    </v-dialog>

    <!-- AI Assistant -->
    <AiAssistant
      v-if="!isLoading"
      :siembra="siembraInfo"
      :actividades="actividadesfiltradas"
      :zonas="zonasfiltradas"
    />
  </v-container>
  <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'

import { useSiembraData } from './composables/useSiembraData'
import { useSiembraMetrics } from './composables/useSiembraMetrics'

import SiembraHeader from './SiembraHeader.vue'
import SiembraInfo from './SiembraInfo.vue'
import SiembraZonas from './SiembraZonas.vue'
import SiembraActividades from './SiembraActividades.vue'
import SiembraBitacora from './SiembraBitacora.vue'

import ZonaForm from '@/components/forms/ZonaForm.vue'
import AvatarForm from '@/components/forms/AvatarForm.vue'
import ActividadForm from '@/components/forms/ActividadForm.vue'
import BitacoraEntryForm from '@/components/forms/BitacoraEntryForm.vue'
import GisMapComponent from '@/components/GisMapComponent.vue'
import AiAssistant from '@/components/AiAssistant.vue'

import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const zonasStore = useZonasStore()
const actividadesStore = useActividadesStore()
const uiFeedbackStore = useUiFeedbackStore()

const siembraId = ref(route.params.id)

// Use composables
const {
  siembraInfo,
  isLoading,
  editSiembraDialog,
  editedSiembra,
  addBitacoraDialog,
  addZonaDialog,
  dialogNuevaActividad,
  showBitacoraFormDialog,
  showAvatarDialog,
  userRole,
  avatarUrl,
  totalArea,
  zonasfiltradas,
  zonasLotes,
  zonasOtras,
  actividadesfiltradas,
  siembraAvatarUrl,
  mi_hacienda,
  avatarHaciendaUrl,
  zonas,
  tiposZonas,
  actividades,
  loadSiembraInfo,
  loadHacienda,
  loadUsuarios,
  loadActividades,
  loadInitialData,
  openEditDialog,
  saveSiembraEdit,
  handleAvatarUpdated,
  openNewBitacoraEntryDialog,
  handleBitacoraSave
} = useSiembraData(siembraId)

const { expandedZonas, expandedActividades, areaUnit, estadosSiembra, headers, headers_actividades } = useSiembraMetrics()

const siembraFeatureCollection = computed(() => {
  if (!zonasfiltradas.value) return null
  
  const features = []
  
  zonasfiltradas.value.forEach(z => {
    const tipo = tiposZonas.value.find(t => t.id === z.tipos_zonas)
    const esLote = tipo?.nombre?.toLowerCase().includes('lote') || z.nombre?.toLowerCase().includes('lote')
    
    let geom = null
    if (z.geometria) {
      try {
        geom = typeof z.geometria === 'string' ? JSON.parse(z.geometria) : z.geometria
      } catch (e) {
        console.warn('[SIEMBRA_WORKSPACE] Error parsing geometry', e)
      }
    } else if (z.gps) {
      try {
        const gps = typeof z.gps === 'string' ? JSON.parse(z.gps) : z.gps
        if (gps?.lat && gps?.lng) {
          geom = {
            type: 'Point',
            coordinates: [Number(gps.lng), Number(gps.lat)]
          }
        }
      } catch (e) {
        console.warn('[SIEMBRA_WORKSPACE] Error parsing GPS', e)
      }
    }

    if (geom) {
      features.push({
        type: 'Feature',
        geometry: geom,
        properties: {
          nombre: z.nombre,
          area: z.area?.area,
          unidad: z.area?.unidad,
          type: esLote ? 'lote' : 'punto-interes',
          color: z.color || null
        }
      })
    }
  })
  
  return features.length > 0 ? {
    type: 'FeatureCollection',
    features
  } : null
})


// Additional state
const usuarios = ref([])
const newBitacora = ref({
  fecha: '',
  actividad: '',
  zonas: [],
  descripcion: '',
  responsable: '',
  estado: '',
  notas: ''
})
const estadosBitacora = ['pendiente', 'en_progreso', 'completada']
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
const tipoZonaActual = ref(null)

// Methods
const handleOpenAddZona = (tipo) => {
  modoEdicionZona.value = false
  let tipoId = null
  
  if (tipo === 'lote') {
    const tipoLote = tiposZonas.value.find((t) => t.nombre === 'Lotes')
    tipoZonaActual.value = tipoLote
    tipoId = tipoLote?.id
  } else {
    tipoZonaActual.value = null
  }
  
  zonaEditando.value = {
    nombre: '',
    area: { area: null, unidad: 'ha' },
    info: '',
    contabilizable: tipo === 'lote',
    gps: '',
    tipo: tipoId,
    datos_bpa: [],
    metricas: {},
    siembra: siembraId.value,
    hacienda: mi_hacienda.value?.id
  }
  addZonaDialog.value = true
}

const handleEditZona = (zona) => {
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

const handleDeleteZona = async (zona) => {
  if (confirm(t('sowing_workspace.confirm_delete_zone'))) {
    try {
      await zonasStore.eliminarZona(zona.id)
      uiFeedbackStore.showSnackbar(t('sowing_workspace.zone_deleted_successfully'), 'success')
    } catch (error) {
      handleError(error, t('sowing_workspace.error_deleting_zone'))
    }
  }
}

const handleOpenAddActividad = () => {
  dialogNuevaActividad.value = true
}

const handleEditActividad = (item) => {
  router.push(`/Actividades/${item.id}`)
}

const handleDeleteActividad = async (actividad) => {
  if (confirm(t('sowing_workspace.confirm_delete_activity'))) {
    try {
      await actividadesStore.deleteActividad(actividad.id)
      uiFeedbackStore.showSnackbar(t('sowing_workspace.activity_deleted_successfully'), 'success')
    } catch (error) {
      handleError(error, t('sowing_workspace.error_deleting_activity'))
    }
  }
}

const cerrarDialogoZona = () => {
  addZonaDialog.value = false
}

const onZonaSaved = async () => {
  addZonaDialog.value = false
  uiFeedbackStore.showSnackbar(t('sowing_workspace.zone_saved_successfully'), 'success')
}

const saveBitacoraEntry = async () => {
  // Implementation for saving bitacora entry
  addBitacoraDialog.value = false
}

// Load data
onMounted(async () => {
  try {
    await loadInitialData()
    usuarios.value = await loadUsuarios()
  } catch (error) {
    handleError(error, t('sowing_workspace.error_loading_initial_data'))
  }
})
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

</style>
