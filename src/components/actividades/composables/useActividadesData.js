import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'

export function useActividadesData(actividadId) {
  const { t } = useI18n()
  const actividadesStore = useActividadesStore()
  const siembrasStore = useSiembrasStore()
  const zonasStore = useZonasStore()
  const recordatoriosStore = useRecordatoriosStore()
  const programacionesStore = useProgramacionesStore()
  const snackbarStore = useSnackbarStore()

  const actividadInfo = ref({})
  const editedActividad = ref({ metricas: {} })
  const isLoading = ref(true)
  const editActividadDialog = ref(false)
  const dialogSiembrasZonas = ref(false)
  const selectedSiembras = ref([])
  const selectedZonas = ref([])
  const showBitacoraFormDialogActividad = ref(false)

  const { user } = storeToRefs(useProfileStore())
  const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(useHaciendaStore())
  const { tiposActividades } = storeToRefs(actividadesStore)
  const { siembras } = storeToRefs(siembrasStore)
  const { zonas } = storeToRefs(zonasStore)

  const userRole = computed(() => user.value?.role || '')

  const tipoActividadActual = computed(() => {
    return tiposActividades.value.find((tipo) => tipo.id === actividadInfo.value.tipo_actividades)
  })

  const getBpaPreguntas = computed(() => {
    const tipoActividadFiltrar = actividadesStore.tiposActividades.find(
      (t) => t.id === editedActividad.value.tipo_actividades
    )
    return tipoActividadFiltrar?.datos_bpa?.preguntas_bpa || []
  })

  const filteredZonas = computed(() => {
    return zonas.value.filter((zona) => !zona.siembra)
  })

  const programacionesActividad = computed(() => {
    return programacionesStore.programaciones.filter((p) => p.actividades.includes(actividadId.value))
  })

  const colorBpaEstado = computed(() => {
    if (actividadInfo.value.bpa_estado < 40) return 'red'
    if (actividadInfo.value.bpa_estado < 80) return 'orange'
    return 'green'
  })

  const loadActividadInfo = async () => {
    try {
      actividadInfo.value = await actividadesStore.fetchActividadById(actividadId.value, {
        expand: 'tipo_actividades, zonas.tipos_zonas'
      })
      if (!actividadInfo.value.datos_bpa) {
        actividadInfo.value.datos_bpa = []
      }
      if (!actividadInfo.value.metricas) {
        actividadInfo.value.metricas = {}
      }
    } catch (error) {
      console.error('Error cargando actividad:', error)
      const actividadLocal = actividadesStore.actividades.find((a) => a.id === actividadId.value)
      if (actividadLocal) {
        actividadInfo.value = { ...actividadLocal }
        if (!actividadInfo.value.datos_bpa) {
          actividadInfo.value.datos_bpa = []
        }
        if (!actividadInfo.value.metricas) {
          actividadInfo.value.metricas = {}
        }
      } else {
        snackbarStore.showError(t('activity_workspace.activity_not_loaded'))
      }
    }
  }

  const loadInitialData = async () => {
    try {
      await loadActividadInfo()
      await Promise.all([
        actividadesStore.cargarTiposActividades(),
        siembrasStore.cargarSiembras(),
        zonasStore.cargarZonas(),
        zonasStore.cargarTiposZonas(),
        recordatoriosStore.cargarRecordatorios(),
        programacionesStore.cargarProgramaciones()
      ])
    } catch (error) {
      handleError(error, t('activity_workspace.error_loading_activity_info'))
    } finally {
      isLoading.value = false
    }
  }

  const openEditDialog = () => {
    editedActividad.value = { ...actividadInfo.value }
    editActividadDialog.value = true
  }

  const openAddSiembrasZonas = () => {
    dialogSiembrasZonas.value = true
    selectedSiembras.value = actividadInfo.value.siembras || []
    selectedZonas.value = actividadInfo.value.zonas || []
  }

  const saveSelection = async () => {
    actividadInfo.value.siembras = selectedSiembras.value
    actividadInfo.value.zonas = selectedZonas.value
    dialogSiembrasZonas.value = false
    try {
      await actividadesStore.updateActividad(actividadId.value, {
        siembras: actividadInfo.value.siembras,
        zonas: actividadInfo.value.zonas
      })
      console.log('Actividad actualizada correctamente')
    } catch (error) {
      console.error('Error al actualizar la actividad:', error)
    }
  }

  const handleAvatarUpdated = (updatedRecord) => {
    actividadesStore.$patch((state) => {
      const index = state.actividades.findIndex((s) => s.id === updatedRecord.id)
      if (index !== -1) {
        state.actividades[index] = { ...state.actividades[index], ...updatedRecord }
      }
    })
    actividadInfo.value = { ...actividadInfo.value, ...updatedRecord }
  }

  const openNewBitacoraEntryDialogActividad = () => {
    showBitacoraFormDialogActividad.value = true
  }

  const handleBitacoraSaveActividad = () => {
    showBitacoraFormDialogActividad.value = false
  }

  return {
    // State
    actividadInfo,
    editedActividad,
    isLoading,
    editActividadDialog,
    dialogSiembrasZonas,
    selectedSiembras,
    selectedZonas,
    showBitacoraFormDialogActividad,

    // Computed
    userRole,
    tipoActividadActual,
    getBpaPreguntas,
    filteredZonas,
    programacionesActividad,
    colorBpaEstado,
    mi_hacienda,
    avatarHaciendaUrl,
    tiposActividades,
    siembras,
    zonas,

    // Methods
    loadActividadInfo,
    loadInitialData,
    openEditDialog,
    openAddSiembrasZonas,
    saveSelection,
    handleAvatarUpdated,
    openNewBitacoraEntryDialogActividad,
    handleBitacoraSaveActividad
  }
}
