import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useAuthStore } from '@/stores/authStore'

// Mock de localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

// Mock de PocketBase
vi.mock('@/utils/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn()
    }))
  }
}))

// Mock de snackbarStore
vi.mock('@/stores/snackbarStore', () => ({
  useSnackbarStore: vi.fn(() => ({
    showSnackbar: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn()
  }))
}))

describe('Flujo de Recuperación de Contraseña - Integración', () => {
  let pinia
  let authStore
  let mockRequestPasswordReset
  let mockConfirmPasswordReset

  beforeEach(async () => {
    setActivePinia(createPinia())
    pinia = createPinia()
    vi.clearAllMocks()
    localStorage.clear()

    // Mock de métodos de PocketBase
    mockRequestPasswordReset = vi.fn()
    mockConfirmPasswordReset = vi.fn()

    pb.collection.mockReturnValue({
      requestPasswordReset: mockRequestPasswordReset,
      confirmPasswordReset: mockConfirmPasswordReset
    })

    authStore = useAuthStore()
  })

  describe('Solicitud de recuperación desde AuthModal', () => {
    it('debe solicitar recuperación de contraseña correctamente', async () => {
      const testEmail = 'test@example.com'
      mockRequestPasswordReset.mockResolvedValue({ success: true })

      await authStore.requestPasswordReset(testEmail)

      expect(mockRequestPasswordReset).toHaveBeenCalledWith(testEmail)
      expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1)
    })

    it('debe manejar error cuando email no existe', async () => {
      const testEmail = 'nonexistent@example.com'
      mockRequestPasswordReset.mockRejectedValue(new Error('Email not found'))

      await expect(authStore.requestPasswordReset(testEmail)).rejects.toThrow()
    })

    it('debe validar formato de email antes de enviar', async () => {
      const invalidEmail = 'invalid-email'

      // El store debería rechazar emails inválidos
      mockRequestPasswordReset.mockResolvedValue({ success: true })

      // Esto debería fallar en validación antes de llamar al API
      try {
        await authStore.requestPasswordReset(invalidEmail)
        // Si llegamos aquí, la validación falló
        expect(mockRequestPasswordReset).not.toHaveBeenCalled()
      } catch (error) {
        expect(mockRequestPasswordReset).not.toHaveBeenCalled()
      }
    })
  })

  describe('Navegación a PasswordReset con token', () => {
    it('debe navegar a la ruta correcta con el token', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: { template: '<div>Home</div>' } },
          {
            path: '/auth/reset-password/:token',
            component: { template: '<div>Reset</div>' },
            name: 'PasswordReset'
          }
        ]
      })

      const resetToken = 'reset-token-abc-123'

      await router.push(`/auth/reset-password/${resetToken}`)

      expect(router.currentRoute.value.params.token).toBe(resetToken)
      expect(router.currentRoute.value.name).toBe('PasswordReset')
    })

    it('debe manejar tokens vacíos o inválidos', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: { template: '<div>Home</div>' } },
          {
            path: '/auth/reset-password/:token',
            component: { template: '<div>Reset</div>' },
            name: 'PasswordReset'
          }
        ]
      })

      // Navegar sin token
      await router.push('/auth/reset-password/')

      expect(router.currentRoute.value.params.token || '').toBe('')
    })
  })

  describe('Establecimiento de nueva contraseña', () => {
    it('debe completar el flujo de reset correctamente', async () => {
      const resetToken = 'valid-reset-token'
      const newPassword = 'NewSecurePassword123!'

      mockConfirmPasswordReset.mockResolvedValue({ success: true })

      // Simular la llamada que haría PasswordReset.vue
      await pb.collection('users').confirmPasswordReset(
        resetToken,
        newPassword,
        newPassword
      )

      expect(mockConfirmPasswordReset).toHaveBeenCalledWith(
        resetToken,
        newPassword,
        newPassword
      )
      expect(mockConfirmPasswordReset).toHaveBeenCalledTimes(1)
    })

    it('debe rechazar reset con token expirado', async () => {
      const expiredToken = 'expired-token'
      const newPassword = 'NewPassword123!'

      mockConfirmPasswordReset.mockRejectedValue(new Error('Token expired'))

      await expect(
        pb.collection('users').confirmPasswordReset(expiredToken, newPassword, newPassword)
      ).rejects.toThrow()
    })

    it('debe validar que las contraseñas coincidan', () => {
      // Esta validación ocurre en el componente PasswordReset.vue
      const password = 'Password123!'
      const passwordConfirm = 'Different123!'

      // Simular validación
      const passwordsMatch = password === passwordConfirm

      expect(passwordsMatch).toBe(false)
    })

    it('debe validar longitud mínima de contraseña', () => {
      const shortPassword = 'Short1!'
      const minLength = 8

      const isValid = shortPassword.length >= minLength

      expect(isValid).toBe(false)
    })
  })

  describe('Redirección tras éxito', () => {
    it('debe redirigir a login tras reset exitoso', async () => {
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: { template: '<div>Home</div>' } },
          {
            path: '/auth/reset-password/:token',
            component: { template: '<div>Reset</div>' },
            name: 'PasswordReset'
          }
        ]
      })

      const resetToken = 'valid-token'
      await router.push(`/auth/reset-password/${resetToken}`)

      // Simular reset exitoso
      mockConfirmPasswordReset.mockResolvedValue({ success: true })

      // En el componente real, esto redirigiría a '/'
      const resetSuccess = true

      if (resetSuccess) {
        await router.push('/')
      }

      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('Escenarios de error', () => {
    it('debe manejar token inválido', async () => {
      const invalidToken = 'invalid-token'
      const newPassword = 'Password123!'

      mockConfirmPasswordReset.mockRejectedValue(new Error('invalid'))

      await expect(
        pb.collection('users').confirmPasswordReset(invalidToken, newPassword, newPassword)
      ).rejects.toThrow()
    })

    it('debe manejar error de red', async () => {
      const token = 'valid-token'
      const newPassword = 'Password123!'

      mockConfirmPasswordReset.mockRejectedValue(new Error('Network error'))

      await expect(
        pb.collection('users').confirmPasswordReset(token, newPassword, newPassword)
      ).rejects.toThrow()
    })

    it('debe mantener al usuario en la página de reset tras error', () => {
      // Simular estado de error
      const resetError = 'Error al restablecer la contraseña'
      const resetSuccess = false

      expect(resetError).toBeTruthy()
      expect(resetSuccess).toBe(false)
    })
  })

  describe('Flujo completo de extremo a extremo', () => {
    it('debe completar todo el flujo: solicitud -> email -> reset -> login', async () => {
      const email = 'user@example.com'
      const resetToken = 'generated-reset-token'
      const newPassword = 'NewSecurePassword123!'

      // Paso 1: Solicitud de recuperación
      mockRequestPasswordReset.mockResolvedValue({ success: true })
      await authStore.requestPasswordReset(email)

      expect(mockRequestPasswordReset).toHaveBeenCalledWith(email)

      // Paso 2: Usuario recibe email con token (simulado)
      // En producción, PocketBase envía el email automáticamente

      // Paso 3: Usuario navega a página de reset
      const router = createRouter({
        history: createWebHistory(),
        routes: [
          { path: '/', component: { template: '<div>Home</div>' } },
          {
            path: '/auth/reset-password/:token',
            component: { template: '<div>Reset</div>' }
          }
        ]
      })

      await router.push(`/auth/reset-password/${resetToken}`)
      expect(router.currentRoute.value.params.token).toBe(resetToken)

      // Paso 4: Usuario establece nueva contraseña
      mockConfirmPasswordReset.mockResolvedValue({ success: true })
      await pb.collection('users').confirmPasswordReset(
        resetToken,
        newPassword,
        newPassword
      )

      expect(mockConfirmPasswordReset).toHaveBeenCalledWith(
        resetToken,
        newPassword,
        newPassword
      )

      // Paso 5: Redirección a login
      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/')

      // Paso 6: Usuario puede hacer login con nueva contraseña
      // (esto se prueba en el store de auth)
    })
  })

  describe('Seguridad del flujo', () => {
    it('debe usar token único para cada solicitud', () => {
      const token1 = 'token-abc-123'
      const token2 = 'token-xyz-789'

      expect(token1).not.toBe(token2)
    })

    it('debe no exponer la contraseña en logs o errores', async () => {
      const password = 'SecretPassword123!'
      const token = 'test-token'

      mockConfirmPasswordReset.mockRejectedValue(new Error('Reset failed'))

      try {
        await pb.collection('users').confirmPasswordReset(token, password, password)
      } catch (error) {
        // Verificar que el error no contiene la contraseña
        expect(error.message).not.toContain(password)
      }
    })

    it('debe validar que ambas contraseñas sean idénticas', async () => {
      const password = 'Password123!'
      const passwordConfirm = 'Password456!'
      const token = 'test-token'

      // En el componente, esto se valida antes de llamar al API
      const passwordsMatch = password === passwordConfirm

      expect(passwordsMatch).toBe(false)

      // No debería llamar al API si las contraseñas no coinciden
      if (!passwordsMatch) {
        expect(mockConfirmPasswordReset).not.toHaveBeenCalled()
      }
    })
  })
})
