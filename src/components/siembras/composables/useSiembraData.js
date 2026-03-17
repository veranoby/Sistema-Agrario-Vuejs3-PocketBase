import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useProfileStore } from '@/stores/profileStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'

export function useSiembraData(siembraId) {
  const { t } = useI18n()
  const siembrasStore = useSiembrasStore()
  const zonasStore = useZonasStore()
  const actividadesStore = useActividadesStore()
  const haciendaStore = useHaciendaStore()
  const snackbarStore = useSnackbarStore()

  const siembraInfo = ref({})
  const isLoading = ref(true)
  const editSiembraDialog = ref(false)
  const editedSiembra = ref({})
  const addBitacoraDialog = ref(false)
  const addZonaDialog = ref(false)
  const dialogNuevaActividad = ref(false)
  const showBitacoraFormDialog = ref(false)
  const showAvatarDialog = ref(false)

  const { zonas, tiposZonas } = storeToRefs(zonasStore)
  const { user } = storeToRefs(useProfileStore())
  const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
  const { actividades } = storeToRefs(actividadesStore)

  const userRole = computed(() => user.value?.role || '')
  const avatarUrl = computed(() => useProfileStore().avatarUrl)

  const totalArea = computed(() => {
    return zonas.value
      .filter((zona) => zona.contabilizable && zona.siembra === siembraId.value)
      .reduce((sum, zona) => sum + (parseFloat(zona.area.area) || 0), 0)
      .toFixed(2)
  })

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

  const siembraAvatarUrl = computed(() => {
    return useAvatarStore().getAvatarUrl({ ...siembraInfo.value, type: 'siembra' }, 'Siembras')
  })

  const loadSiembraInfo = async () => {
    try {
      const siembra = await siembrasStore.fetchSiembraById(siembraId.value)
      siembraInfo.value = siembra
    } catch (error) {
      handleError(error, t('sowing_workspace.error_loading_sowing_info'))
    }
  }

  const loadHacienda = async () => {
    try {
      await haciendaStore.fetchHacienda(siembraInfo.value.hacienda)
    } catch (error) {
      handleError(error, t('sowing_workspace.error_loading_hacienda_info'))
    }
  }

  const loadUsuarios = async () => {
    try {
      return await haciendaStore.fetchHaciendaUsers()
    } catch (error) {
      handleError(error, t('sowing_workspace.error_loading_users'))
      return []
    }
  }

  const loadActividades = async () => {
    try {
      await actividadesStore.cargarActividades()
    } catch (error) {
      handleError(error, t('sowing_workspace.error_loading_activities'))
    }
  }

  const loadInitialData = async () => {
    try {
      await loadSiembraInfo()
      await Promise.all([
        zonasStore.cargarZonas(),
        zonasStore.cargarTiposZonas(),
        loadActividades(),
        loadHacienda()
      ])
    } catch (error) {
      handleError(error, t('sowing_workspace.error_loading_initial_data'))
    } finally {
      isLoading.value = false
    }
  }

  const openEditDialog = () => {
    editedSiembra.value = {
      ...siembraInfo.value,
      fecha_inicio: siembraInfo.value.fecha_inicio
        ? new Date(siembraInfo.value.fecha_inicio).toISOString().split('T')[0]
        : ''
    }
    editSiembraDialog.value = true
  }

  const saveSiembraEdit = async () => {
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

  const handleAvatarUpdated = (updatedRecord) => {
    siembrasStore.$patch((state) => {
      const index = state.siembras.findIndex((s) => s.id === updatedRecord.id)
      if (index !== -1) {
        state.siembras[index] = { ...state.siembras[index], ...updatedRecord }
      }
    })
    siembraInfo.value = { ...siembraInfo.value, ...updatedRecord }
  }

  const openNewBitacoraEntryDialog = () => {
    showBitacoraFormDialog.value = true
  }

  const handleBitacoraSave = () => {
    showBitacoraFormDialog.value = false
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString()
  }

  const getStatusColor = (status) => {
    const colors = {
      planificada: 'blue',
      en_crecimiento: 'green',
      cosechada: 'orange',
      finalizada: 'gray'
    }
    return colors[status] || 'gray'
  }

  return {
    // State
    siembraInfo,
    isLoading,
    editSiembraDialog,
    editedSiembra,
    addBitacoraDialog,
    addZonaDialog,
    dialogNuevaActividad,
    showBitacoraFormDialog,
    showAvatarDialog,

    // Computed
    userRole,
    avatarUrl,
    totalArea,
    zonasfiltradas,
    actividadesfiltradas,
    siembraAvatarUrl,
    mi_hacienda,
    avatarHaciendaUrl,
    zonas,
    tiposZonas,
    actividades,

    // Methods
    loadSiembraInfo,
    loadHacienda,
    loadUsuarios,
    loadActividades,
    loadInitialData,
    openEditDialog,
    saveSiembraEdit,
    handleAvatarUpdated,
    openNewBitacoraEntryDialog,
    handleBitacoraSave,
    formatDate,
    getStatusColor
  }
}
