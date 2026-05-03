import { defineStore } from 'pinia'
import { authProvider } from '@/services/authProvider'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useHaciendaStore } from './haciendaStore'
import { usePlanStore } from './planStore'
import router from '@/router'
import { useSyncStore } from '@/stores/sync/index'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programaciones'
import { debounce } from '@/utils/debounce'
import { logger } from '@/utils/logger'
import { warmUpCache } from '@/services/cacheWarmingService'
import { useAvatarStore } from './avatarStore'
import { profileService } from '@/services/profileService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    registrationSuccess: false,
    loading: false,
    user: null,
    token: null,
    isLoggedIn: false,
    rememberMe: null,
    showLoginDialog: false,
    initialized: false,
    refreshTimer: null,
    version: 1
  }),

  getters: {
    avatarUrl: (state) => {
      const avatarStore = useAvatarStore()
      return avatarStore.getAvatarUrl({ ...state.user, type: 'user' }, 'users')
    },
    userRole: (state) => (state.user ? state.user.role : ''),
    fullName: (state) => (state.user ? `${state.user.name} ${state.user.lastname}` : '')
  },

  actions: {
    $dispose() {
      this.stopRefreshTimer()
    },

    async changePassword(oldPassword, newPassword) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      try {
        await profileService.changePassword(this.user?.id, oldPassword, newPassword)
        snackbarStore.showSnackbar('Password changed successfully', 'success')
      } catch (error) {
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateProfile(profileData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      try {
        const updatedUser = await profileService.updateProfile(this.user, profileData)
        this.user = updatedUser
        localStorage.setItem('user', JSON.stringify(this.user))
        snackbarStore.showSnackbar('Perfil actualizado con éxito', 'success')
        return updatedUser
      } catch (error) {
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async attemptTokenRefresh() {
      const syncStore = useSyncStore()
      logger.auth('Attempting token refresh...')

      try {
        const freshAuthData = await authProvider.refreshSession()
        logger.auth('Token refresh successful - record ID:', freshAuthData.record?.id)

        this.setSession(freshAuthData.record)
        const authDataToStore = {
          token: authProvider.authStore.token,
          model: authProvider.authStore.model
        }
        localStorage.setItem('pocketbase_auth', JSON.stringify(authDataToStore))
        localStorage.setItem('last_auth_success', Date.now().toString())

        return true
      } catch (error) {
        logger.auth('Token refresh failed:', error.message)
        return false
      }
    },

    async init() {
      logger.auth('Starting initialization...')

      let loadedAuthData = null
      try {
        const authJson = localStorage.getItem('pocketbase_auth')
        if (authJson) loadedAuthData = JSON.parse(authJson)
      } catch (e) {
        logger.auth('Error parsing pocketbase_auth from localStorage:', e)
      }
      const rememberMeIsActive = localStorage.getItem('rememberMe_active') === 'true'

      logger.auth('Loaded auth data:', loadedAuthData ? 'found' : 'not found')
      logger.auth('Remember me active:', rememberMeIsActive)

      if (!loadedAuthData?.token || !loadedAuthData?.model) {
        logger.auth('No auth data found, clearing state')
        this.clearAuthState()
        this.initialized = true
        return false
      }

      authProvider.authStore.save(loadedAuthData.token, loadedAuthData.model)
      logger.auth('Session valid:', authProvider.authStore.isValid)

      if (authProvider.authStore.isValid) {
        logger.auth('Valid session, setting up user')

        if (this.tokenNeedsRefresh()) {
          logger.auth('Token needs refresh, attempting...')
          const refreshed = await this.attemptTokenRefresh()
          if (!refreshed) {
            logger.auth('Refresh failed, logging out')
            this.logout()
            this.initialized = true
            return false
          }
        } else {
          this.setSession(authProvider.authStore.model)
        }

        this.startRefreshTimerIfNeeded(rememberMeIsActive)
        this.initialized = true
        logger.auth('Init successful, user logged in')
        return true

      } else {
        logger.auth('Invalid session')

        if (!rememberMeIsActive) {
          logger.auth('Remember me not active, logging out')
          this.logout()
          this.initialized = true
          return false
        }

        logger.auth('Remember me active, attempting refresh')
        const refreshed = await this.attemptTokenRefresh()
        if (!refreshed) {
          logger.auth('Refresh failed, logging out')
          this.logout()
          this.initialized = true
          return false
        }

        this.startRefreshTimer()
        this.initialized = true
        logger.auth('Init successful after refresh')
        return true
      }
    },

    clearAuthState() {
      this.user = null
      this.token = null
      this.isLoggedIn = false
      this.stopRefreshTimer()
    },

    startRefreshTimerIfNeeded(rememberMeIsActive) {
      if (rememberMeIsActive) {
        this.startRefreshTimer()
      } else {
        this.stopRefreshTimer()
      }
    },

    async ensureAuthInitialized() {
      if (!this.initialized) {
        logger.auth('ensureAuthInitialized: Not initialized, calling init().')
        await this.init()
      } else {
        logger.auth('ensureAuthInitialized: Already attempted initialization.')
      }
      return authProvider.authStore.isValid
    },

    startRefreshTimer() {
      this.stopRefreshTimer()

      const debouncedRefresh = debounce(async () => {
        if (this.isLoggedIn && this.tokenNeedsRefresh()) {
          try {
            await this.refreshToken()
          } catch (error) {
            handleError(error, 'Error en refresco automático')
          }
        }
      }, 2000)

      this.refreshTimer = setInterval(debouncedRefresh, 15 * 60 * 1000)
    },

    stopRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    async login(username, email, password, rememberMe = false) {
      const syncStore = useSyncStore()
      if (this.loading) return
      this.loading = true

      const snackbarStore = useSnackbarStore()

      if (!syncStore.isOnline) {
        this.loading = false
        throw new Error('Se requiere conexión a internet para el primer inicio de sesión')
      }

      snackbarStore.showLoading()

      try {
        let authData = null

        try {
          authData = await authProvider.login(username, email, password)
          if (authProvider.authStore.isValid) {
            this.handleSuccessfulLogin(authData, rememberMe)
            return true
          }
        } catch (error) {
          logger.auth('Error al intentar login:', error.message)
        }

        return true
      } catch (error) {
        handleError(error, 'Credenciales incorrectas')
        return false
      } finally {
        this.loading = false
        snackbarStore.hideLoading()
      }
    },

    async refreshToken() {
      logger.auth('Attempting to refresh token. Current authProvider.authStore.isValid:', authProvider.authStore.isValid)
      const syncStore = useSyncStore()

      if (!authProvider.authStore.isValid) {
        return false
      }

      if (this.tokenNeedsRefresh()) {
        try {
          const freshAuthData = await authProvider.refreshSession()
          logger.auth('authRefresh successful - record ID:', freshAuthData.record?.id)
          this.setSession(freshAuthData.record)

          const authDataToStoreOnTokenRefresh = {
            token: authProvider.authStore.token,
            model: authProvider.authStore.model
          }
          localStorage.setItem('pocketbase_auth', JSON.stringify(authDataToStoreOnTokenRefresh))
          localStorage.setItem('last_auth_success', Date.now().toString())

          return true
        } catch (error) {
          logger.auth('Error during token refresh:', error.message)
          return false
        }
      }

      return true
    },

    tokenNeedsRefresh() {
      const lastSuccessStr = localStorage.getItem('last_auth_success')
      const lastSuccess = lastSuccessStr ? parseInt(lastSuccessStr, 10) : null

      if (!lastSuccess) {
        return true
      }

      const now = Date.now()
      const timeSinceLastSuccess = now - lastSuccess
      const refreshThreshold = 20 * 60 * 1000

      const shouldRefresh = timeSinceLastSuccess > refreshThreshold
      if (shouldRefresh || import.meta.env.DEV && timeSinceLastSuccess > 30 * 60 * 1000) {
        logger.auth(
          'Token refresh check:',
          shouldRefresh ? 'NEEDS REFRESH' : 'DEBUG',
          `(${Math.round(timeSinceLastSuccess / 60000)}min ago)`
        )
      }

      return timeSinceLastSuccess > refreshThreshold
    },

    async handleSuccessfulLogin(authData, rememberMe = false) {
      logger.auth('Iniciando handleSuccessfulLogin, rememberMe:', rememberMe)

      this.setSession(authData.record)
      const syncStore = useSyncStore()

      const authDataToStore = { token: authProvider.authStore.token, model: authProvider.authStore.model }
      localStorage.setItem('pocketbase_auth', JSON.stringify(authDataToStore))
      localStorage.setItem('last_auth_success', Date.now().toString())

      if (rememberMe) {
        localStorage.setItem('rememberMe_active', 'true')
        logger.auth('rememberMe_active guardado como true')
        this.startRefreshTimer()
      } else {
        localStorage.removeItem('rememberMe_active')
        logger.auth('rememberMe_active eliminado')
        this.stopRefreshTimer()
      }

      if (rememberMe) {
        const rememberedCredentials = {
          username: authData.record.username,
          email: authData.record.email
        }
        localStorage.setItem('rememberedUser', JSON.stringify(rememberedCredentials))
        logger.auth('Remembered user credentials saved for user:', authData.record.username)
      } else {
        localStorage.removeItem('rememberedUser')
        logger.auth('Cleared remembered user credentials.')
      }

      syncStore.init()

      const haciendaStore = useHaciendaStore()

      await Promise.all([
        this.setUser(authData.record),
        authData.record.hacienda
          ? haciendaStore.fetchHacienda(authData.record.hacienda)
          : Promise.resolve()
      ])

      logger.auth('Critical stores loaded, redirecting to dashboard')

      router.push('/dashboard')

      warmUpCache(authData.record).then(result => {
        if (result.success) {
          logger.auth(`Cache warming completado en ${result.elapsed}ms, ${result.itemsCached} items`)
        } else {
          logger.auth('Cache warming falló (no crítico):', result.error)
        }
      }).catch(err => {
        logger.auth('Error en cache warming (no crítico):', err?.message || err)
      })

      setTimeout(async () => {
        logger.auth('Loading deferred stores in background')
        const planStore = usePlanStore()
        const actividadesStore = useActividadesStore()
        const zonasStore = useZonasStore()
        const siembrasStore = useSiembrasStore()
        const recordatoriosStore = useRecordatoriosStore()
        const programacionesStore = useProgramacionesStore()

        try {
          await Promise.all([
            planStore.fetchAvailablePlans(),
            actividadesStore.init(),
            zonasStore.init(),
            siembrasStore.init(),
            recordatoriosStore.init(),
            programacionesStore.init()
          ])
          logger.auth('Deferred stores loaded successfully')
        } catch (error) {
          logger.auth('Error loading deferred stores:', error.message)
          handleError(error, 'Error loading initial data')
        }
      }, 100)
    },

    setSession(record) {
      this.user = record
      this.token = authProvider.authStore.token
      this.isLoggedIn = true
    },

    setUser(record) {
      this.user = record
    },

    async register(formData, new_role) {
      const snackbarStore = useSnackbarStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()

      snackbarStore.showLoading()

      try {
        const gratisPlan = await planStore.getGratisPlan()
        if (!gratisPlan || !gratisPlan.id) {
          throw new Error('No se pudo obtener el plan gratuito')
        }

        if (!formData.hacienda) {
          const newHacienda = await haciendaStore.createHacienda(formData.hacienda, gratisPlan.id)
          formData.hacienda = newHacienda.id
        }

        const userData = this.createUserData(
          formData.username,
          formData.email,
          formData.firstname,
          formData.lastname,
          formData.password,
          new_role,
          formData.hacienda,
          false
        )

        await authProvider.register(userData)

        await this.sendVerificationEmail(formData.email)

        snackbarStore.showSnackbar(
          'Registrado con éxito. Por favor, verifique su email.',
          'success'
        )
        this.registrationSuccess = true
      } catch (error) {
        this.registrationSuccess = false
        handleError(error, 'Error en el registro')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    createUserData(
      username,
      email,
      firstname,
      lastname,
      password,
      new_role,
      new_hacienda,
      verified
    ) {
      return {
        username,
        email,
        emailVisibility: true,
        password,
        passwordConfirm: password,
        name: firstname,
        lastname,
        role: new_role,
        info: 'Usuario de hacienda',
        hacienda: new_hacienda,
        verified: verified
      }
    },

    async sendVerificationEmail(email) {
      try {
        await authProvider.requestVerification(email)
        return true
      } catch (error) {
        handleError(error, 'Failed to send verification email')
      }
    },

    async confirmEmail(token) {
      const snackbarStore = useSnackbarStore()

      try {
        await authProvider.confirmVerification(token)
        snackbarStore.showSnackbar(
          'Email confirmado exitosamente! Ya puede iniciar sesión.',
          'success'
        )
        return true
      } catch (error) {
        handleError(error, 'Error al confirmar el email')
        throw error
      }
    },

    async requestPasswordReset(email) {
      const snackbarStore = useSnackbarStore()
      try {
        await authProvider.requestPasswordReset(email)
        return true
      } catch (error) {
        handleError(error, 'Error al solicitar restablecimiento de contraseña')
        const message = error.message || 'No se pudo procesar la solicitud. Intente nuevamente.'
        snackbarStore.showSnackbar(message, 'error')
        throw error
      }
    },

    async confirmPasswordReset(token, password, passwordConfirm) {
      try {
        await authProvider.confirmPasswordReset(token, password, passwordConfirm)
        return true
      } catch (error) {
        handleError(error, 'Error al confirmar reset de contraseña')
        throw error
      }
    },

    async logout() {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore()

      try {
        this.stopRefreshTimer()

        if (router.currentRoute.value.path !== '/') {
          await router.push('/')
        }

        authProvider.logout()
        this.user = null
        this.token = null
        this.isLoggedIn = false
        this.initialized = false

        localStorage.removeItem('pocketbase_auth')
        localStorage.removeItem('rememberMe_active')
        localStorage.removeItem('rememberedUser')
        logger.auth('Cleared remembered user credentials during logout.')
        localStorage.removeItem('last_auth_success')

        snackbarStore.showSnackbar('Logged out successfully', 'success')
      } catch (error) {
        handleError(error, 'Error al cerrar sesión')
        snackbarStore.showSnackbar('Error al cerrar sesión', 'error')
      }
    }
  }
})
