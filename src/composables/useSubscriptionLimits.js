import { ref } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

/**
 * Composable para validar límites de suscripción por hacienda
 * Reutilizable para límites de usuarios, módulos o funcionalidades futuras
 */
export function useSubscriptionLimits() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Verifica si se ha alcanzado el límite de usuarios para una hacienda
   * @param {string} haciendaId - ID de la hacienda
   * @param {Object} options - { excludeUserId: string } - Excluir usuario de la cuenta (para edición)
   * @throws {Error} Si se excede el límite
   */
  async function checkUserLimit(haciendaId, options = {}) {
    const { excludeUserId = null } = options

    loading.value = true
    error.value = null

    try {
      // 1. Obtener suscripción activa de la hacienda o el plan de la hacienda
      let subscription = null
      let plan = null
      try {
        subscription = await pb.collection('subscriptions').getFirstListItem(
          `hacienda = "${haciendaId}" && is_active = true`,
          { expand: 'plan' }
        )
        plan = subscription.expand?.plan || {}
      } catch (e) {
        try {
          const hacienda = await pb.collection('Haciendas').getOne(haciendaId, { expand: 'plan' })
          plan = hacienda.expand?.plan || null
        } catch(err) {
          plan = null
        }
      }

      if (!plan) {
        logger.warn('[SUBSCRIPTION_LIMITS] No hay suscripción ni plan base activo para hacienda:', haciendaId)
        return { limited: false, limit: Infinity, current: 0 }
      }

      // 2. Obtener el límite de usuarios del plan
      const userLimit = (plan.auditores || 0) + (plan.operadores || 0) + (subscription?.users_limit || 0)

      if (userLimit === 0 && (!plan.auditores && !plan.operadores)) {
        logger.info('[SUBSCRIPTION_LIMITS] Suscripción sin límite de usuarios definido')
        return { limited: false, limit: Infinity, current: 0 }
      }

      const users = await pb.collection('users').getFullList({
        filter: `hacienda = "${haciendaId}"`,
        fields: 'id,status,role' // Solo traer IDs, status y role
      })

      const activeUsers = users.filter(u => {
        const isActive = Array.isArray(u.status) ? u.status.includes('active') : u.status === 'active'
        const isAuditorOrOperador = u.role === 'auditor' || u.role === 'operador'
        return isActive && isAuditorOrOperador && (!excludeUserId || u.id !== excludeUserId)
      })

      const currentCount = activeUsers.length

      // 4. Verificar si se excede el límite
      if (currentCount >= userLimit) {
        const message = `Límite de usuarios alcanzado (${currentCount}/${userLimit})`
        logger.warn('[SUBSCRIPTION_LIMITS] ' + message, { haciendaId, current: currentCount, limit: userLimit })
        throw new Error(message)
      }

      logger.debug('[SUBSCRIPTION_LIMITS] Dentro del límite:', {
        haciendaId,
        current: currentCount,
        limit: userLimit,
        remaining: userLimit - currentCount
      })

      return {
        limited: false,
        limit: userLimit,
        current: currentCount,
        remaining: userLimit - currentCount
      }
    } catch (err) {
      if (err.message.includes('Límite de usuarios')) {
        error.value = err.message
        throw err
      }

      // Otros errores (ej: campo no existe) - no bloquear
      logger.warn('[SUBSCRIPTION_LIMITS] Error en validación (no bloqueante):', err.message)
      return { limited: false, limit: Infinity, current: 0 }
    } finally {
      loading.value = false
    }
  }

  /**
   * Obtiene información completa de los límites de una hacienda
   * @param {string} haciendaId - ID de la hacienda
   * @returns {Object} - { hasSubscription, userLimit, currentUsers, auditoresLimit, operadoresLimit, ... }
   */
  async function getHaciendaLimits(haciendaId) {
    loading.value = true

    try {
      // Obtener suscripción con plan expandido
      // Obtener suscripción con plan expandido o fallback al plan de la hacienda
      let subscription = null
      let plan = null
      try {
        subscription = await pb.collection('subscriptions').getFirstListItem(
          `hacienda = "${haciendaId}" && is_active = true`,
          { expand: 'plan' }
        )
        plan = subscription.expand?.plan || {}
      } catch (e) {
        // Fallback: Si no hay suscripción, intentar leer el plan directo de la hacienda
        try {
          const hacienda = await pb.collection('Haciendas').getOne(haciendaId, { expand: 'plan' })
          plan = hacienda.expand?.plan || null
        } catch(err) {
          plan = null
        }
        
        if (!plan) {
          return {
            hasSubscription: false,
            userLimit: 0,
            currentUsers: 0,
            auditoresLimit: 0,
            operadoresLimit: 0
          }
        }
      }

      // Contar usuarios por rol
      const users = await pb.collection('users').getFullList({
        filter: `hacienda = "${haciendaId}"`,
        fields: 'id,role,status'
      })

      const activeUsers = users.filter(u => {
        const isActive = Array.isArray(u.status) ? u.status.includes('active') : u.status === 'active'
        return isActive
      })

      const auditores = activeUsers.filter(u => u.role === 'auditor').length
      const operadores = activeUsers.filter(u => u.role === 'operador').length
      
      const totalUserLimit = (plan.auditores || 0) + (plan.operadores || 0)
      const totalCurrentUsers = auditores + operadores

      return {
        hasSubscription: true,
        userLimit: totalUserLimit,
        currentUsers: totalCurrentUsers,
        remainingUsers: totalUserLimit - totalCurrentUsers,
        auditoresLimit: plan.auditores || 0,
        currentAuditores: auditores,
        remainingAuditores: (plan.auditores || 0) - auditores,
        operadoresLimit: plan.operadores || 0,
        currentOperadores: operadores,
        remainingOperadores: (plan.operadores || 0) - operadores,
        planName: plan.name || 'Desconocido'
      }
    } catch (err) {
      handleError(err, 'Error obteniendo límites de suscripción')
      return {
        hasSubscription: false,
        userLimit: 0,
        currentUsers: 0,
        error: err.message
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Verifica si se puede agregar un usuario específico (por rol)
   * @param {string} haciendaId - ID de la hacienda
   * @param {string} role - Rol del usuario a agregar ('auditor' | 'operador')
   * @returns {Object} - { canAdd: boolean, reason: string }
   */
  async function canAddUser(haciendaId, role) {
    try {
      const limits = await getHaciendaLimits(haciendaId)

      if (!limits.hasSubscription) {
        return { canAdd: true, reason: 'Sin suscripción - sin restricciones' }
      }

      // Verificar límite general
      if (limits.remainingUsers <= 0) {
        return {
          canAdd: false,
          reason: `Límite de usuarios alcanzado (${limits.currentUsers}/${limits.userLimit})`
        }
      }

      // Verificar límite específico por rol
      if (role === 'auditor' && limits.remainingAuditores <= 0) {
        return {
          canAdd: false,
          reason: `Límite de auditores alcanzado (${limits.currentAuditores}/${limits.auditoresLimit})`
        }
      }

      if (role === 'operador' && limits.remainingOperadores <= 0) {
        return {
          canAdd: false,
          reason: `Límite de operadores alcanzado (${limits.currentOperadores}/${limits.operadoresLimit})`
        }
      }

      return { canAdd: true, reason: 'Dentro de los límites' }
    } catch (err) {
      logger.error('[SUBSCRIPTION_LIMITS] Error verificando capacidad:', err)
      return { canAdd: true, reason: 'Error en validación - permitiendo por defecto' }
    }
  }

  return {
    loading,
    error,
    checkUserLimit,
    getHaciendaLimits,
    canAddUser
  }
}
