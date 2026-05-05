<template>
  <v-container fluid class="flex flex-col min-h-screen pa-0" v-if="!isLoading">
    <!-- Header -->
    <div class="grid grid-cols-4 gap-2 p-0 m-2">
      <header role="banner" class="col-span-4 bg-background shadow-sm p-0">
        <ActividadesHeader
          :actividadInfo="actividadInfo"
          :avatarUrl="avatarUrl"
          :avatarHaciendaUrl="avatarHaciendaUrl"
          :mi_hacienda="mi_hacienda"
          :userRole="userRole"
          :actividadAvatarUrl="actividadAvatarUrl"
          :colorBpaEstado="colorBpaEstado"
        />
      </header>
    </div>

    <main role="main" aria-labelledby="actividad-title">
      <v-row no-gutters>
        <v-col cols="9" class="pa-4 pt-2">
          <v-row no-gutters>
            <v-col cols="6" class="pr-2">
              <ActividadesInfo :actividadInfo="actividadInfo" @open-edit-dialog="openEditDialog" />
            </v-col>

            <v-col cols="6" class="pl-2">
              <ActividadesSiembrasZonas
                :actividadInfo="actividadInfo"
                @open-add-siembras-zonas="openAddSiembrasZonas"
              />

              <ActividadesProgramaciones
                :programaciones="programacionesActividad"
                @abrir-nueva-programacion="abrirNuevaProgramacion"
                @editar-programacion="editarProgramacion"
                @request-single-execution="handleRequestSingleExecution"
              />
            </v-col>
          </v-row>

          <v-row no-gutters>
            <v-col cols="12" class="mt-4">
              <ActividadesBitacora
                :actividadId="actividadId"
                @open-new-bitacora-entry-dialog="openNewBitacoraEntryDialogActividad"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col cols="3" class="p-0 pr-4">
          <ActividadesRecordatorios
            :actividadId="actividadId"
            :dialogVisible="recordatoriosStore.dialog"
            :recordatorioEdit="recordatoriosStore.recordatorioEdit"
            :isEditing="recordatoriosStore.editando"
            :recordatoriosPendientes="recordatoriosStore.recordatoriosPendientes(actividadId)"
            :recordatoriosEnProgreso="recordatoriosStore.recordatoriosEnProgreso(actividadId)"
            @update:dialogVisible="recordatoriosStore.dialog = $event"
            @abrir-nuevo-recordatorio="recordatoriosStore.abrirNuevoRecordatorio(actividadId)"
            @actualizar-estado="recordatoriosStore.actualizarEstado"
            @editar-recordatorio="recordatoriosStore.editarRecordatorio"
            @eliminar-recordatorio="recordatoriosStore.eliminarRecordatorio"
            @submit-recordatorio="handleFormSubmit"
          />
        </v-col>
      </v-row>
    </main>

    <!-- Edit Dialog -->
    <ActividadesEditDialog
      v-model="editActividadDialog"
      :actividadInfo="actividadInfo"
      :editedActividad="editedActividad"
      :tipoActividadActual="tipoActividadActual"
      :getBpaPreguntas="getBpaPreguntas"
      :actividadAvatarUrl="actividadAvatarUrl"
      @save="saveActividad"
      @avatar-updated="handleAvatarUpdated"
    />

    <!-- Siembras/Zonas Selection Dialog -->
    <ActividadesSiembrasZonasDialog
      v-model="dialogSiembrasZonas"
      :siembras="siembras"
      :filteredZonas="filteredZonas"
      :selectedSiembras="selectedSiembras"
      :selectedZonas="selectedZonas"
      @update:selected-siembras="selectedSiembras = $event"
      @update:selected-zonas="selectedZonas = $event"
      @save="saveSelection"
    />

    <!-- Programación Form -->
    <ProgramacionForm
      v-model="mostrarFormProgramacion"
      :programacionActual="programacionEdit"
      :actividadPredefinida="actividadId"
      @guardado="handleGuardado"
    />

    <!-- Bitacora Form -->
    <v-dialog
      v-model="showBitacoraFormDialogActividad"
      max-width="800px"
      persistent
      scrollable
      role="dialog"
      aria-modal="true"
      aria-labelledby="bitacora-dialog-title"
      @keydown.esc="showBitacoraFormDialogActividad = false"
    >
      <BitacoraEntryForm
        v-if="showBitacoraFormDialogActividad"
        :actividadIdContext="actividadId"
        @close="showBitacoraFormDialogActividad = false"
        @save="handleBitacoraSaveActividad"
      />
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'

import { useActividadesData } from './composables/useActividadesData'
import { useActividadesMetrics } from './composables/useActividadesMetrics'

import ActividadesHeader from './ActividadesHeader.vue'
import ActividadesInfo from './ActividadesInfo.vue'
import ActividadesSiembrasZonas from './ActividadesSiembrasZonas.vue'
import ActividadesProgramaciones from './ActividadesProgramaciones.vue'
import ActividadesRecordatorios from './ActividadesRecordatorios.vue'
import ActividadesBitacora from './ActividadesBitacora.vue'
import ActividadesEditDialog from './ActividadesEditDialog.vue'
import ActividadesSiembrasZonasDialog from './ActividadesSiembrasZonasDialog.vue'
import ProgramacionForm from '@/components/forms/ProgramacionForm.vue'
import BitacoraEntryForm from '@/components/forms/BitacoraEntryForm.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const avatarStore = useAvatarStore()
const haciendaStore = useHaciendaStore()
const recordatoriosStore = useRecordatoriosStore()
const uiFeedbackStore = useUiFeedbackStore()

const actividadId = ref(route.params.id)

// Use composables
const {
  actividadInfo,
  editedActividad,
  isLoading,
  editActividadDialog,
  dialogSiembrasZonas,
  selectedSiembras,
  selectedZonas,
  showBitacoraFormDialogActividad,
  userRole,
  tipoActividadActual,
  getBpaPreguntas,
  filteredZonas,
  programacionesActividad,
  colorBpaEstado,
  mi_hacienda,
  avatarHaciendaUrl,
  siembras,
  zonas,
  loadInitialData,
  openEditDialog,
  openAddSiembrasZonas,
  saveSelection,
  handleAvatarUpdated,
  openNewBitacoraEntryDialogActividad,
  handleBitacoraSaveActividad
} = useActividadesData(actividadId)

const { user } = storeToRefs(authStore)
const avatarUrl = computed(() => authStore.avatarUrl)

const actividadAvatarUrl = computed(() => {
  return avatarStore.getAvatarUrl({ ...actividadInfo.value, type: 'actividades' }, 'actividades')
})

const mostrarFormProgramacion = ref(false)
const programacionEdit = ref(null)

// Methods
const abrirNuevaProgramacion = () => {
  programacionEdit.value = null
  mostrarFormProgramacion.value = true
}

const editarProgramacion = (programacion) => {
  programacionEdit.value = programacion
  mostrarFormProgramacion.value = true
}

const handleGuardado = async () => {
  mostrarFormProgramacion.value = false
  programacionEdit.value = null
}

const handleRequestSingleExecution = async (programacion) => {
  try {
    const { useProgramacionesStore } = await import('@/stores/programaciones')
    const programacionesStore = useProgramacionesStore()
    const success = await programacionesStore.prepareForBitacoraEntryFromProgramacion(programacion)
    if (success) {
      router.push({ name: 'Dashboard de Inicio' })
    } else {
      uiFeedbackStore.showSnackbar(
        'No se pudo preparar la entrada de bitácora desde la programación.',
        'warning'
      )
    }
  } catch (error) {
    console.error('Error preparing for bitacora entry from programacion:', error)
    uiFeedbackStore.showSnackbar('Error crítico preparando bitácora desde la programación.', 'error')
  }
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
    handleError(error, 'activity_workspace.error_saving_reminder')
  }
}

const saveActividad = async () => {
  try {
    if (!editedActividad.value.nombre) {
      throw new Error('activity_workspace.required_field')
    }
    editedActividad.value.nombre = editedActividad.value.nombre.toUpperCase()
    const { useActividadesStore } = await import('@/stores/actividadesStore')
    const actividadesStore = useActividadesStore()
    const actividadToUpdate = {
      nombre: editedActividad.value.nombre,
      activa: editedActividad.value.activa,
      metricas: editedActividad.value.metricas,
      descripcion: editedActividad.value.descripcion,
      datos_bpa: editedActividad.value.datos_bpa,
      bpa_estado: editedActividad.value.bpa_estado
    }
    await actividadesStore.updateActividad(actividadId.value, actividadToUpdate)
    actividadInfo.value = await actividadesStore.fetchActividadById(actividadId.value)
    editActividadDialog.value = false
    await loadInitialData()
  } catch (error) {
    handleError(error, 'activity_workspace.error_saving_activity')
  }
}

// Load data
onMounted(async () => {
  await loadInitialData()
})
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
