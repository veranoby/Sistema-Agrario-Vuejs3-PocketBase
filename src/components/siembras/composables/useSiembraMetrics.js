import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export function useSiembraMetrics() {
  const { t } = useI18n()

  const expandedZonas = ref([])
  const expandedActividades = ref([])
  const areaUnit = ref('ha')
  const itemsPerPage = ref(10)

  const estadosSiembra = ['planificada', 'en_crecimiento', 'cosechada', 'finalizada']

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

  return {
    expandedZonas,
    expandedActividades,
    areaUnit,
    itemsPerPage,
    estadosSiembra,
    headers,
    headers_actividades
  }
}
