import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSnackbarStore } from '@/stores/snackbarStore'

export function useActividadesMetrics(editedActividad) {
  const { t } = useI18n()
  const snackbarStore = useSnackbarStore()
  const addMetricaDialog = ref(false)
  const showOpcionesField = ref(false)
  const newMetrica = ref({
    titulo: '',
    descripcion: '',
    tipo: '',
    opcionesText: ''
  })

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

  const openAddMetricaDialog = () => {
    addMetricaDialog.value = true
    showOpcionesField.value = false
    newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
  }

  const handleTipoChange = (value) => {
    showOpcionesField.value = ['checkbox', 'select', 'multi-select'].includes(value)
    if (!showOpcionesField.value) {
      newMetrica.value.opcionesText = ''
    }
  }

  const addMetrica = () => {
    if (newMetrica.value.titulo && newMetrica.value.tipo) {
      const sanitizedTitulo = newMetrica.value.titulo.toUpperCase().replace(/\s+/g, '_')
      let opciones = []
      if (
        newMetrica.value.opcionesText &&
        ['checkbox', 'select', 'multi-select'].includes(newMetrica.value.tipo)
      ) {
        opciones = newMetrica.value.opcionesText
          .split(',')
          .map((opt) => opt.trim())
          .filter((opt) => opt)
      }
      editedActividad.value.metricas[sanitizedTitulo] = {
        descripcion: newMetrica.value.descripcion,
        tipo: newMetrica.value.tipo,
        valor: newMetrica.value.tipo === 'multi-select' ? [] : null,
        opciones: opciones.length > 0 ? opciones : undefined
      }
      newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
      showOpcionesField.value = false
      addMetricaDialog.value = false
    } else {
      snackbarStore.showError(t('activity_workspace.required_field', { field: 'Título y tipo' }))
    }
  }

  const removeMetrica = (index) => {
    delete editedActividad.value.metricas[index]
  }

  const formatMetricValue = (value) => {
    if (!value || value === null) return 'N/A'
    return Array.isArray(value) ? value[0] : value
  }

  const validateDate = (value) => {
    if (!value) return true
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    return dateRegex.test(value) || t('activity_workspace.invalid_date_format')
  }

  return {
    // State
    addMetricaDialog,
    showOpcionesField,
    newMetrica,

    // Methods
    openAddMetricaDialog,
    handleTipoChange,
    addMetrica,
    removeMetrica,
    formatMetricValue,
    validateDate
  }
}
