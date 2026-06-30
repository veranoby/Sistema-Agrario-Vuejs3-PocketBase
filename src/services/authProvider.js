import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'

/**
 * Proveedor de autenticación - maneja toda la lógica de red de auth.
 */
export const authProvider = {
  async login(username, email, password) {
    if (username) {
      try {
        const authData = await pb.collection('users').authWithPassword(username.toUpperCase(), password)
        if (pb.authStore.isValid) return authData
      } catch (e) { logger.auth('Error username:', e.message) }
    }
    if (email) {
      try {
        const authData = await pb.collection('users').authWithPassword(email, password)
        if (pb.authStore.isValid) return authData
      } catch (e) { logger.auth('Error email:', e.message) }
    }
    throw new Error('Credenciales incorrectas')
  },

  async refreshSession() {
    return await pb.collection('users').authRefresh()
  },

  async register(userData, headers = {}) {
    return await pb.collection('users').create(userData, { headers })
  },

  async requestVerification(email) {
    return await pb.collection('users').requestVerification(email)
  },

  async confirmVerification(token) {
    return await pb.collection('users').confirmVerification(token)
  },

  async requestPasswordReset(email) {
    return await pb.collection('users').requestPasswordReset(email)
  },

  async confirmPasswordReset(token, password, passwordConfirm) {
    return await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
  },

  logout() {
    pb.authStore.clear()
  },

  // Exponer estado de authStore para uso en authStore
  get authStore() {
    return pb.authStore
  }
}
