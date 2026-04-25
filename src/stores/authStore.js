import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useProfileStore } from './profileStore'
import { useHaciendaStore } from './haciendaStore'
import { usePlanStore } from './planStore'
import router from '@/router'
import { useSyncStore } from './syncStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { debounce } from '@/utils/debounce'
import { logger } from '@/utils/logger'
import { cache, CacheKeys } from '@/utils/cacheManager'
import { CACHE_LEVELS } from '@/constants/bpa'

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
    refreshTimer: null
  }),

  actions: {
    $dispose() {
      this.stopRefreshTimer()
    },

    async attemptTokenRefresh() {
      const syncStore = useSyncStore()
      logger.auth('Attempting token refresh...')

      try {
        const freshAuthData = await pb.collection('users').authRefresh()
        logger.auth('Token refresh successful - record ID:', freshAuthData.record?.id)

        this.setSession(freshAuthData.record)
        const authDataToStore = {
          token: pb.authStore.token,
          model: pb.authStore.model
        }
        syncStore.saveToLocalStorage('pocketbase_auth', authDataToStore)
        syncStore.saveToLocalStorage('last_auth_success', Date.now())

        return true
      } catch (error) {
        logger.auth('Token refresh failed:', error.message)
        return false
      }
    },

    async init() {
      const syncStore = useSyncStore()
      logger.auth('Starting initialization...')

      const loadedAuthData = syncStore.loadFromLocalStorage('pocketbase_auth')
      const rememberMeIsActive = syncStore.loadFromLocalStorage('rememberMe_active')

      logger.auth('Loaded auth data:', loadedAuthData ? 'found' : 'not found')
      logger.auth('Remember me active:', rememberMeIsActive)

      if (!loadedAuthData?.token || !loadedAuthData?.model) {
        logger.auth('No auth data found, clearing state')
        this.clearAuthState()
        this.initialized = true
        return false
      }

      pb.authStore.save(loadedAuthData.token, loadedAuthData.model)
      logger.auth('Session valid:', pb.authStore.isValid)

      if (pb.authStore.isValid) {
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
          this.setSession(pb.authStore.model)
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
      return pb.authStore.isValid
    },

    startRefreshTimer() {
      this.stopRefreshTimer()

      const debouncedRefresh = debounce(async () => {
        if (this.isLoggedIn && this.tokenNeedsRefresh()) {
          try {
            await this.refreshToken()
          } catch (error) {
            console.error('Error en refresco automático:', error)
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

        if (username) {
          try {
            authData = await pb
              .collection('users')
              .authWithPassword(username.toUpperCase(), password)
            console.log(
              '[AUTH] Datos de autenticación recibidos:',
              JSON.parse(
                JSON.stringify({
                  token: pb.authStore.token,
                  record: pb.authStore.model,
                  isValid: pb.authStore.isValid
                })
              )
            )
            if (pb.authStore.isValid) {
              this.handleSuccessfulLogin(authData, rememberMe)
              return true
            }
          } catch (error) {
            logger.auth('Error al intentar login con username:', error.message)
          }
        }

        if (email && !authData) {
          try {
            authData = await pb.collection('users').authWithPassword(email, password)
            if (pb.authStore.isValid) {
              this.handleSuccessfulLogin(authData, rememberMe)
              return true
            }
          } catch (error) {
            logger.auth('Error al intentar login con email:', error.message)
          }
        }

        if (!authData) {
          throw new Error('Credenciales incorrectas')
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
      logger.auth('Attempting to refresh token. Current pb.authStore.isValid:', pb.authStore.isValid)
      const syncStore = useSyncStore()

      if (!pb.authStore.isValid) {
        return false
      }

      if (this.tokenNeedsRefresh()) {
        try {
          const freshAuthData = await pb.collection('users').authRefresh()
          logger.auth('authRefresh successful - record ID:', freshAuthData.record?.id)
          this.setSession(freshAuthData.record)

          const authDataToStoreOnTokenRefresh = {
            token: pb.authStore.token,
            model: pb.authStore.model
          }
          syncStore.saveToLocalStorage('pocketbase_auth', authDataToStoreOnTokenRefresh)
          syncStore.saveToLocalStorage('last_auth_success', Date.now())

          return true
        } catch (error) {
          logger.auth('Error during token refresh:', error.message)
          return false
        }
      }

      return true
    },

    tokenNeedsRefresh() {
      const syncStore = useSyncStore()

      const lastSuccess = syncStore.loadFromLocalStorage('last_auth_success')

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

    async warmUpCache(user) {
      const startTime = Date.now()
      logger.info(`[CacheWarming] Iniciando para usuario ${user.id}`)

      try {
        const tiposActividadesStore = useActividadesStore()
        const tiposZonasStore = useZonasStore()

        await Promise.all([
          tiposActividadesStore.fetchTiposActividades({ requestKey: null }),
          tiposZonasStore.fetchTiposZonas({ requestKey: null })
        ])

        cache.setToLevel(
          CacheKeys.tiposActividades().key,
          tiposActividadesStore.tiposActividades,
          CACHE_LEVELS.LOOKUP
        )
        cache.setToLevel(
          CacheKeys.tiposZonas().key,
          tiposZonasStore.tiposZonas,
          CACHE_LEVELS.LOOKUP
        )

        const haciendaStore = useHaciendaStore()
        await haciendaStore.fetchHaciendas({ requestKey: null })

        const userHaciendas = haciendaStore.userHaciendas(user.id)

        userHaciendas.forEach(h => {
          cache.setToLevel(
            `hacienda:${h.id}`,
            h,
            CACHE_LEVELS.LOOKUP
          )
        })

        const programacionesStore = useProgramacionesStore()
        await Promise.all(
          userHaciendas.map(async (hacienda) => {
            await programacionesStore.fetchPage(1, 100, { hacienda: hacienda.id })
            cache.setToLevel(
              CacheKeys.programaciones(hacienda.id).key,
              [...programacionesStore.programaciones],
              CACHE_LEVELS.RECENT
            )
          })
        )

        const elapsed = Date.now() - startTime
        logger.info(`[CacheWarming] Completado en ${elapsed}ms`)

        return {
          success: true,
          elapsed,
          itemsCached: 2 + userHaciendas.length + userHaciendas.length
        }
      } catch (error) {
        logger.debug('[CacheWarming] Error (no crítico):', error?.message || error)
        return {
          success: false,
          error: error?.message || error
        }
      }
    },

    async handleSuccessfulLogin(authData, rememberMe = false) {
      logger.auth('Iniciando handleSuccessfulLogin, rememberMe:', rememberMe)

      this.setSession(authData.record)
      const syncStore = useSyncStore()

      const authDataToStore = { token: pb.authStore.token, model: pb.authStore.model }
      syncStore.saveToLocalStorage('pocketbase_auth', authDataToStore)
      syncStore.saveToLocalStorage('last_auth_success', Date.now())

      if (rememberMe) {
        syncStore.saveToLocalStorage('rememberMe_active', true)
        logger.auth('rememberMe_active guardado como true')
        this.startRefreshTimer()
      } else {
        syncStore.removeFromLocalStorage('rememberMe_active')
        logger.auth('rememberMe_active eliminado')
        this.stopRefreshTimer()
      }

      if (rememberMe) {
        const rememberedCredentials = {
          username: authData.record.username,
          email: authData.record.email
        }
        syncStore.saveToLocalStorage('rememberedUser', rememberedCredentials)
        logger.auth('Remembered user credentials saved for user:', authData.record.username)
      } else {
        syncStore.removeFromLocalStorage('rememberedUser')
        logger.auth('Cleared remembered user credentials.')
      }

      syncStore.init()

      const profileStore = useProfileStore()
      const haciendaStore = useHaciendaStore()

      await Promise.all([
        profileStore.setUser(authData.record),
        authData.record.hacienda
          ? haciendaStore.fetchHacienda(authData.record.hacienda)
          : Promise.resolve()
      ])

      logger.auth('Critical stores loaded, redirecting to dashboard')

      router.push('/dashboard')

      this.warmUpCache(authData.record).then(result => {
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
      this.token = pb.authStore.token
      this.isLoggedIn = true
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

        await pb.collection('users').create(userData)

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
        await pb.collection('users').requestVerification(email)
        return true
      } catch (error) {
        handleError(error, 'Failed to send verification email')
      }
    },

    async confirmEmail(token) {
      const snackbarStore = useSnackbarStore()

      try {
        await pb.collection('users').confirmVerification(token)
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
        await pb.collection('users').requestPasswordReset(email)
        return true
      } catch (error) {
        console.error('Error al solicitar restablecimiento de contraseña:', error)
        const message = error.message || 'No se pudo procesar la solicitud. Intente nuevamente.'
        snackbarStore.showSnackbar(message, 'error')
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

        pb.authStore.clear()
        this.user = null
        this.token = null
        this.isLoggedIn = false
        this.initialized = false

        syncStore.removeFromLocalStorage('pocketbase_auth')
        syncStore.removeFromLocalStorage('rememberMe_active')
        syncStore.removeFromLocalStorage('rememberedUser')
        logger.auth('Cleared remembered user credentials during logout.')
        syncStore.removeFromLocalStorage('last_auth_success')

        snackbarStore.showSnackbar('Logged out successfully', 'success')
      } catch (error) {
        console.error('Error during logout:', error)
        snackbarStore.showSnackbar('Error al cerrar sesión', 'error')
      }
    }
  }
})
