import { ref } from 'vue'
import { sendAlert, alertTypes } from '@/services/emailAlertService'
import { useAuthStore } from '@/stores/authStore'

const ALERT_TYPES = {
  ACTIVIDAD_CRITICA: 'actividad_critica',
  BPA_VENCIDO: 'bpa_vencido',
  RECORDATORIO: 'recordatorio',
  ACTIVIDAD_ASIGNADA: 'actividad_asignada',
  ZONA_ATENCION: 'zona_atencion'
}

export function useAlertTriggers() {
  const authStore = useAuthStore()
  const triggersConfig = ref({})
  const isLoading = ref(false)

  /**
   * Carga configuración de triggers desde backend
   * GET /api/haciendas/{haciendaId}/alerts
   */
  async function loadConfig(haciendaId) {
    if (!haciendaId) return

    isLoading.value = true
    try {
      const response = await fetch(`/api/haciendas/${haciendaId}/alerts`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      })

      if (response.ok) {
        const data = await response.json()
        triggersConfig.value[haciendaId] = {
          enabledTypes: data.enabled_types || [],
          recipients: data.recipients || [],
          frequency: data.frequency || 'immediate'
        }
      }
    } catch (error) {
      console.error('[useAlertTriggers] Error loading config:', error)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Envía alerta si está habilitada en configuración
   * @returns {Promise<{sent: boolean, skipped: boolean, error?: string}>}
   */
  async function triggerAlert(type, data, haciendaId) {
    if (!haciendaId) {
      return { sent: false, skipped: true, error: 'No haciendaId' }
    }

    // Asegurar que la config está cargada
    if (!triggersConfig.value[haciendaId]) {
      await loadConfig(haciendaId)
    }

    const config = triggersConfig.value[haciendaId]

    // Verificar si el tipo está habilitado
    if (!config?.enabledTypes?.includes(type)) {
      console.log(`[AlertTrigger] ${type} no habilitado para ${haciendaId}`)
      return { sent: false, skipped: true, reason: 'not_enabled' }
    }

    // Verificar que haya recipients
    if (!config?.recipients || config.recipients.length === 0) {
      console.log(`[AlertTrigger] No recipients para ${haciendaId}`)
      return { sent: false, skipped: true, reason: 'no_recipients' }
    }

    // Enviar alerta
    try {
      const result = await sendAlert({
        type,
        recipients: config.recipients,
        data: { ...data, hacienda: haciendaId },
        hacienda: haciendaId
      })

      console.log(`[AlertTrigger] ✅ ${type} enviada a ${config.recipients.length} recipients`)
      return { sent: true, result }

    } catch (error) {
      console.error(`[AlertTrigger] ❌ Error enviando ${type}:`, error)
      return { sent: false, error: error.message }
    }
  }

  return {
    triggersConfig,
    isLoading,
    loadConfig,
    triggerAlert,
    ALERT_TYPES
  }
}
