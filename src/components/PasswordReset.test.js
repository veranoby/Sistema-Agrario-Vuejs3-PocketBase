import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import PasswordReset from '@/components/PasswordReset.vue'
import { pb } from '@/utils/pocketbase'

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
      confirmPasswordReset: vi.fn()
    }))
  }
}))

// Mock de snackbarStore
vi.mock('@/stores/snackbarStore', () => ({
  useSnackbarStore: vi.fn(() => ({
    showSnackbar: vi.fn()
  }))
}))

// Crear router para pruebas
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    {
      path: '/auth/reset-password/:token',
      component: PasswordReset,
      name: 'PasswordReset'
    }
  ]
})

describe('PasswordReset.vue', () => {
  let wrapper
  let mockConfirmPasswordReset

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()

    // Mock de confirmPasswordReset
    mockConfirmPasswordReset = vi.fn()
    pb.collection.mockReturnValue({
      confirmPasswordReset: mockConfirmPasswordReset
    })

    // Navegar a la ruta de reset
    await router.push('/auth/reset-password/test-token-123')
  })

  describe('Renderizado del componente', () => {
    it('debe renderizar el formulario cuando hay un token válido', async () => {
      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-card-text': true,
            'v-form': true,
            'v-text-field': true,
            'v-progress-linear': true,
            'v-btn': true,
            'v-card-actions': true,
            'router-link': true
          }
        }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.find('[label="NUEVA CONTRASEÑA"]').exists()).toBe(true)
      expect(wrapper.find('[label="CONFIRMAR NUEVA CONTRASEÑA"]').exists()).toBe(true)
    })

    it('debe mostrar error cuando no hay token', async () => {
      await router.push('/auth/reset-password/')

      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-alert': true,
            'v-btn': true
          }
        }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.tokenError).toBeTruthy()
    })

    it('debe mostrar el indicador de fuerza de contraseña', async () => {
      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-card-text': true,
            'v-form': true,
            'v-text-field': true,
            'v-progress-linear': true,
            'v-btn': true
          }
        }
      })

      wrapper.vm.password = 'Test123!'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.passwordStrength).toBeGreaterThan(0)
    })
  })

  describe('Cálculo de fuerza de contraseña', () => {
    beforeEach(async () => {
      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-card-text': true,
            'v-form': true,
            'v-text-field': true,
            'v-progress-linear': true,
            'v-btn': true
          }
        }
      })
    })

    it('debe calcular fuerza 0 para contraseña vacía', () => {
      wrapper.vm.password = ''
      expect(wrapper.vm.passwordStrength).toBe(0)
    })

    it('debe calcular fuerza baja para contraseña simple', () => {
      wrapper.vm.password = 'abc'
      expect(wrapper.vm.passwordStrength).toBeLessThan(40)
      expect(wrapper.vm.strengthColor).toBe('error')
      expect(wrapper.vm.strengthLabel).toBe('Débil')
    })

    it('debe calcular fuerza media para contraseña decente', () => {
      wrapper.vm.password = 'abcd1234'
      expect(wrapper.vm.passwordStrength).toBeGreaterThanOrEqual(40)
      expect(wrapper.vm.passwordStrength).toBeLessThan(70)
    })

    it('debe calcular fuerza alta para contraseña fuerte', () => {
      wrapper.vm.password = 'Abcd1234!@#'
      expect(wrapper.vm.passwordStrength).toBeGreaterThanOrEqual(70)
      expect(wrapper.vm.strengthColor).toBe('success')
      expect(wrapper.vm.strengthLabel).toBe('Fuerte')
    })

    it('debe dar puntos por longitud mínima', () => {
      wrapper.vm.password = 'abcdefgh'
      expect(wrapper.vm.passwordStrength).toBeGreaterThanOrEqual(25)
    })

    it('debe dar puntos extras por longitud 12+', () => {
      wrapper.vm.password = 'abcdefgh1234'
      expect(wrapper.vm.passwordStrength).toBeGreaterThanOrEqual(40)
    })

    it('debe dar puntos por contener números', () => {
      wrapper.vm.password = 'abcd1234'
      const strengthWithNumbers = wrapper.vm.passwordStrength

      wrapper.vm.password = 'abcdefgh'
      const strengthWithoutNumbers = wrapper.vm.passwordStrength

      expect(strengthWithNumbers).toBeGreaterThan(strengthWithoutNumbers)
    })

    it('debe dar puntos por mayúsculas y minúsculas', () => {
      wrapper.vm.password = 'Abcd1234'
      const strengthWithMixedCase = wrapper.vm.passwordStrength

      wrapper.vm.password = 'abcd1234'
      const strengthWithoutMixedCase = wrapper.vm.passwordStrength

      expect(strengthWithMixedCase).toBeGreaterThan(strengthWithoutMixedCase)
    })

    it('debe dar puntos por caracteres especiales', () => {
      wrapper.vm.password = 'Abcd1234!'
      const strengthWithSpecial = wrapper.vm.passwordStrength

      wrapper.vm.password = 'Abcd1234'
      const strengthWithoutSpecial = wrapper.vm.passwordStrength

      expect(strengthWithSpecial).toBeGreaterThan(strengthWithoutSpecial)
    })
  })

  describe('Validación del formulario', () => {
    beforeEach(async () => {
      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-card-text': true,
            'v-form': true,
            'v-text-field': true,
            'v-progress-linear': true,
            'v-btn': true
          }
        }
      })
    })

    it('debe deshabilitar el botón cuando las contraseñas no coinciden', () => {
      wrapper.vm.password = 'Password123!'
      wrapper.vm.passwordConfirm = 'Different123!'
      expect(wrapper.vm.canSubmit).toBe(false)
    })

    it('debe deshabilitar el botón cuando la contraseña es muy corta', () => {
      wrapper.vm.password = 'Short1!'
      wrapper.vm.passwordConfirm = 'Short1!'
      expect(wrapper.vm.canSubmit).toBe(false)
    })

    it('debe habilitar el botón cuando todo es válido', () => {
      wrapper.vm.password = 'ValidPassword123!'
      wrapper.vm.passwordConfirm = 'ValidPassword123!'
      wrapper.vm.loading = false
      expect(wrapper.vm.canSubmit).toBe(true)
    })
  })

  describe('Manejo de errores', () => {
    beforeEach(async () => {
      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-card-text': true,
            'v-form': true,
            'v-text-field': true,
            'v-progress-linear': true,
            'v-alert': true,
            'v-btn': true
          }
        }
      })
    })

    it('debe manejar error de token inválido', async () => {
      mockConfirmPasswordReset.mockRejectedValue(new Error('invalid'))

      wrapper.vm.password = 'ValidPassword123!'
      wrapper.vm.passwordConfirm = 'ValidPassword123!'

      await wrapper.vm.handlePasswordReset()

      expect(wrapper.vm.resetError).toBeTruthy()
      expect(wrapper.vm.loading).toBe(false)
    })

    it('debe manejar error de token expirado', async () => {
      mockConfirmPasswordReset.mockRejectedValue(new Error('expired'))

      wrapper.vm.password = 'ValidPassword123!'
      wrapper.vm.passwordConfirm = 'ValidPassword123!'

      await wrapper.vm.handlePasswordReset()

      expect(wrapper.vm.resetError).toBeTruthy()
      expect(wrapper.vm.loading).toBe(false)
    })

    it('debe manejar errores genéricos', async () => {
      mockConfirmPasswordReset.mockRejectedValue(new Error('Network error'))

      wrapper.vm.password = 'ValidPassword123!'
      wrapper.vm.passwordConfirm = 'ValidPassword123!'

      await wrapper.vm.handlePasswordReset()

      expect(wrapper.vm.resetError).toBeTruthy()
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('Flujo de éxito', () => {
    beforeEach(async () => {
      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-card-text': true,
            'v-form': true,
            'v-text-field': true,
            'v-progress-linear': true,
            'v-btn': true
          }
        }
      })
    })

    it('debe llamar a confirmPasswordReset con los parámetros correctos', async () => {
      mockConfirmPasswordReset.mockResolvedValue({ success: true })

      wrapper.vm.password = 'ValidPassword123!'
      wrapper.vm.passwordConfirm = 'ValidPassword123!'

      await wrapper.vm.handlePasswordReset()

      expect(mockConfirmPasswordReset).toHaveBeenCalledWith(
        'test-token-123',
        'ValidPassword123!',
        'ValidPassword123!'
      )
    })

    it('debe mostrar éxito y redirigir tras reset exitoso', async () => {
      mockConfirmPasswordReset.mockResolvedValue({ success: true })

      wrapper.vm.password = 'ValidPassword123!'
      wrapper.vm.passwordConfirm = 'ValidPassword123!'

      await wrapper.vm.handlePasswordReset()

      expect(wrapper.vm.resetSuccess).toBe(true)
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('Toggle de visibilidad de contraseña', () => {
    beforeEach(async () => {
      wrapper = mount(PasswordReset, {
        global: {
          plugins: [router, createPinia()],
          stubs: {
            'v-container': true,
            'v-col': true,
            'v-card': true,
            'v-toolbar': true,
            'v-card-text': true,
            'v-form': true,
            'v-text-field': true,
            'v-progress-linear': true,
            'v-btn': true
          }
        }
      })
    })

    it('debe alternar visibilidad de contraseña', () => {
      expect(wrapper.vm.showPassword).toBe(false)
      wrapper.vm.showPassword = true
      expect(wrapper.vm.showPassword).toBe(true)
    })

    it('debe alternar visibilidad de confirmación', () => {
      expect(wrapper.vm.showConfirm).toBe(false)
      wrapper.vm.showConfirm = true
      expect(wrapper.vm.showConfirm).toBe(true)
    })
  })
})
