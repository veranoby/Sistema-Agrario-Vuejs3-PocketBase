import { pb } from '@/utils/pocketbase'
import { useSyncStore } from '@/stores/sync/index'
import { handleError } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

/**
 * profileService
 * Maneja la lógica de actualización del perfil del usuario, cambio de contraseña
 * y tareas relacionadas para evitar sobrecargar el authStore.
 */
export const profileService = {
  /**
   * Cambia la contraseña del usuario autenticado
   */
  async changePassword(userId, oldPassword, newPassword) {
    if (!userId) {
      throw new Error('No hay usuario autenticado para cambiar la contraseña.')
    }

    const syncStore = useSyncStore()
    
    if (!syncStore.isOnline) {
      await syncStore.queueOperation({
        type: 'changePassword',
        collection: 'users',
        id: userId,
        data: { oldPassword, newPassword }
      })
      return true
    }

    try {
      await pb.collection('users').update(userId, {
        oldPassword,
        password: newPassword,
        passwordConfirm: newPassword
      })
      return true
    } catch (error) {
      handleError(error, 'Failed to change password')
      throw error
    }
  },

  /**
   * Actualiza los datos del perfil del usuario
   */
  async updateProfile(user, profileData) {
    if (!user || !user.id) {
      throw new Error('No hay usuario autenticado para actualizar')
    }

    const syncStore = useSyncStore()

    if (!syncStore.isOnline) {
      // Encolar para sincronización
      await syncStore.queueOperation({
        type: 'updateProfile',
        collection: 'users',
        id: user.id,
        data: profileData
      })
      
      return { 
        ...user, 
        ...profileData,
        updated: new Date().toISOString()
      }
    }

    try {
      const updatedUser = await pb.collection('users').update(user.id, profileData)
      logger.info('[ProfileService] Perfil actualizado con éxito', { userId: user.id })
      return updatedUser
    } catch (error) {
      handleError(error, 'Error al actualizar el perfil')
      throw error
    }
  }
}
