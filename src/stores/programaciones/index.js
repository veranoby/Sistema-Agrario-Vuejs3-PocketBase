/**
 * programaciones/index.js
 * Main export point for programaciones module
 */

export { useProgramacionesStore } from './programacionesStore'

// Export utilities for external use if needed
export * from './utils/dateCalculators'
export * from './utils/frequencyHandlers'
export * from './recurrenceCalculator'
export * from './complianceChecker'
export * from './batchOperations'

export async function checkProximoActivities(haciendaId) {
  if (!haciendaId) return

  const { useAlertTriggers } = await import('@/composables/useAlertTriggers')
  const { differenceInDays, format } = await import('date-fns')
  const { handleError } = await import('@/utils/errorHandler')
  const { useProgramacionesStore } = await import('./programacionesStore')

  const { triggerAlert } = useAlertTriggers()
  const programacionesStore = useProgramacionesStore()

  try {
    const hoy = new Date()
    const { items } = await programacionesStore.fetchPage(1, 100, {
      hacienda: haciendaId
    })

    if (!items || items.length === 0) return

    const proximas = items.filter(act => {
      const fechaAct = act.proxima_ejecucion
        ? new Date(act.proxima_ejecucion)
        : new Date(act.created)
      const horas = differenceInDays(fechaAct, hoy) * 24
      return horas > 0 && horas <= 24
    })

    for (const act of proximas) {
      await triggerAlert('recordatorio', {
        actividades: [{
          nombre: act.nombre || 'Actividad',
          fecha: format(new Date(act.proxima_ejecucion || act.created), 'dd/MM/yyyy'),
          responsable: act.responsable || 'No asignado',
          notas: act.notas || 'Sin notas'
        }]
      }, haciendaId)
    }
  } catch (error) {
    handleError(error, 'Error en checkProximoActivities')
  }
}
