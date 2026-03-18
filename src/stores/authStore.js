import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useProfileStore } from './profileStore'
import { useHaciendaStore } from './haciendaStore'
import { usePlanStore } from './planStore'
//import { useValidationStore } from './validationStore'
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
      // Cleanup timer when store is disposed to prevent memory leaks
      this.stopRefreshTimer()
    },

    /**
     * Intenta refrescar el token de autenticación (incluso si expiró)
     * A diferencia de refreshToken(), esta función no verifica pb.authStore.isValid primero,
     * lo que la hace adecuada para el caso de rememberMe donde el token puede haber expirado.
     * @returns {boolean} true si el refresh fue exitoso, false en caso contrario
     */
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

      // CAMINO 2: No hay auth data en localStorage
      if (!loadedAuthData?.token || !loadedAuthData?.model) {
        logger.auth('No auth data found, clearing state')
        this.clearAuthState()
        this.initialized = true
        return false
      }

      // Cargar auth data en PocketBase
      pb.authStore.save(loadedAuthData.token, loadedAuthData.model)
      logger.auth('Session valid:', pb.authStore.isValid)

      // CAMINO 1: Auth data existe
      if (pb.authStore.isValid) {
        // Session válida: setSession + refresh si es necesario
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
        // Session inválida: verificar rememberMe
        logger.auth('Invalid session')

        if (!rememberMeIsActive) {
          logger.auth('Remember me not active, logging out')
          this.logout()
          this.initialized = true
          return false
        }

        // Intentar refresh con rememberMe
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

    /**
     * Limpia el estado de autenticación sin hacer logout completo
     */
    clearAuthState() {
      this.user = null
      this.token = null
      this.isLoggedIn = false
      this.stopRefreshTimer()
    },

    /**
     * Inicia el timer de refresh solo si rememberMe está activo
     */
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
        await this.init() // init() will set this.initialized = true after its attempt
      } else {
        logger.auth('ensureAuthInitialized: Already attempted initialization.')
      }
      // The source of truth for auth status is pb.authStore.isValid after init has run
      return pb.authStore.isValid
    },

    // Método para iniciar el timer de refresco
    startRefreshTimer() {
      // Detener cualquier timer existente primero
      this.stopRefreshTimer()

      // Crear un método debounce para evitar múltiples refrescos simultáneos
      const debouncedRefresh = debounce(async () => {
        if (this.isLoggedIn && this.tokenNeedsRefresh()) {
          try {
            await this.refreshToken()
          } catch (error) {
            console.error('Error en refresco automático:', error)
          }
        }
      }, 2000) // 2 segundos de debounce

      // Refrescar cada 15 minutos
      this.refreshTimer = setInterval(debouncedRefresh, 15 * 60 * 1000) // 15 minutos
    },

    // Método para detener el timer de refresco
    stopRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    async login(username, email, password, rememberMe = false) {
      const syncStore = useSyncStore()
      if (this.loading) return // Prevent multiple calls while loading
      this.loading = true

      const snackbarStore = useSnackbarStore()

      if (!syncStore.isOnline) {
        this.loading = false
        throw new Error('Se requiere conexión a internet para el primer inicio de sesión')
      }

      snackbarStore.showLoading()

      try {
        let authData = null

        // Intentar login con username primero
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
                  record: pb.authStore.model, // PocketBase typically uses pb.authStore.model for the user record
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
            // Continuamos intentando con email
          }
        }

        // Si falla con username o no se proporcionó username, intentar con email
        if (email && !authData) {
          try {
            authData = await pb.collection('users').authWithPassword(email, password)
            if (pb.authStore.isValid) {
              this.handleSuccessfulLogin(authData, rememberMe)
              return true
            }
          } catch (error) {
            logger.auth('Error al intentar login con email:', error.message)
            // Si llegamos aquí, ambos intentos fallaron
          }
        }

        // Si llegamos aquí sin haber obtenido authData, es porque fallaron ambos intentos
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

      // Verificar si el token es válido antes de intentar refrescarlo
      if (!pb.authStore.isValid) {
        return false
      }

      // Verificar si el token está por expirar
      if (this.tokenNeedsRefresh()) {
        try {
          const freshAuthData = await pb.collection('users').authRefresh()
          logger.auth('authRefresh successful - record ID:', freshAuthData.record?.id)
          this.setSession(freshAuthData.record) // freshAuthData from authRefresh is { token, record }

          // Actualizar token en syncStore
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

      // Token todavía válido y no necesita ser refrescado
      return true
    },

    // Método para determinar si el token necesita ser refrescado
    tokenNeedsRefresh() {
      const syncStore = useSyncStore()

      // Obtener timestamp del último login exitoso
      const lastSuccess = syncStore.loadFromLocalStorage('last_auth_success')

      if (!lastSuccess) {
        // Si no hay registro, asumimos que sí necesita refresco
        return true
      }

      const now = Date.now()
      const timeSinceLastSuccess = now - lastSuccess
      const refreshThreshold = 20 * 60 * 1000 // 20 minutos

      // Solo log si necesita refresh o si ha pasado más de 30 minutos (debug mode)
      const shouldRefresh = timeSinceLastSuccess > refreshThreshold
      if (shouldRefresh || import.meta.env.DEV && timeSinceLastSuccess > 30 * 60 * 1000) {
        logger.auth(
          'Token refresh check:',
          shouldRefresh ? 'NEEDS REFRESH' : 'DEBUG',
          `(${Math.round(timeSinceLastSuccess / 60000)}min ago)`
        )
      }

      // Refrescar si han pasado más de 20 minutos desde el último éxito
      return timeSinceLastSuccess > refreshThreshold
    },

    /**
     * Cache warming al login - precarga datos críticos
     * @param {Object} user - Usuario autenticado
     * @returns {Promise<Object>} Resultado del cache warming
     */
    async warmUpCache(user) {
      const startTime = Date.now()
      logger.info(`[CacheWarming] Iniciando para usuario ${user.id}`)

      try {
        // 1. Datos de lookup (L1 - más larga duración)
        const tiposActividadesStore = useActividadesStore()
        const tiposZonasStore = useZonasStore()

        await Promise.all([
          tiposActividadesStore.fetchTiposActividades(),
          tiposZonasStore.fetchTiposZonas()
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

        // 2. Datos de hacienda del usuario (L1)
        const haciendaStore = useHaciendaStore()
        await haciendaStore.fetchHaciendas()

        // Usar getter reutilizable en lugar de filtro inline
        const userHaciendas = haciendaStore.userHaciendas(user.id)

        userHaciendas.forEach(h => {
          cache.setToLevel(
            `hacienda:${h.id}`,
            h,
            CACHE_LEVELS.LOOKUP
          )
        })

        // 3. Programaciones activas (L2 - duración media)
        // Parallelizar fetch para mejor performance
        const programacionesStore = useProgramacionesStore()
        await Promise.all(
          userHaciendas.map(async (hacienda) => {
            await programacionesStore.fetchProgramaciones(hacienda.id)
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
        logger.error('[CacheWarming] Error:', error)
        return {
          success: false,
          error: error.message
        }
      }
    },

    async handleSuccessfulLogin(authData, rememberMe = false) {
      logger.auth('Iniciando handleSuccessfulLogin, rememberMe:', rememberMe)

      // Set auth state
      this.setSession(authData.record) // authData from pb.authWithPassword is { token, record }
      const syncStore = useSyncStore()

      // Guardar datos de autenticación usando syncStore
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

      // Add logic for remembering user credentials
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

      // RESTAURAR EL FLUJO ORIGINAL: primero inicializar syncStore
      // y luego cargar los demás stores
      syncStore.init()

      const profileStore = useProfileStore()
      const haciendaStore = useHaciendaStore()

      // Cargar datos críticos en paralelo (bloquean UI)
      // Estos son necesarios para mostrar el dashboard correctamente
      await Promise.all([
        profileStore.setUser(authData.record),
        authData.record.hacienda
          ? haciendaStore.fetchHacienda(authData.record.hacienda)
          : Promise.resolve()
      ])

      logger.auth('Critical stores loaded, redirecting to dashboard')

      // Redirigir inmediatamente al dashboard
      router.push('/dashboard')

      // Cache warming: precargar datos críticos en segundo plano
      // No bloquea la navegación pero mejora rendimiento de siguientes cargas
      this.warmUpCache(authData.record).then(result => {
        if (result.success) {
          logger.auth(`Cache warming completado en ${result.elapsed}ms, ${result.itemsCached} items`)
        } else {
          logger.auth('Cache warming falló (no crítico):', result.error)
        }
      }).catch(err => {
        logger.auth('Error en cache warming:', err)
      })

      // Cargar datos diferidos después de la redirección
      // Estos no bloquean la UI y se cargan en segundo plano
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
      }, 100) // 100ms delay para no bloquear la transición de ruta
    },

    setSession(record) {
      // record is pb.authStore.model or freshAuthData.record
      this.user = record
      this.token = pb.authStore.token // pb.authStore is the source of truth for the token
      this.isLoggedIn = true
    },

    async register(formData, new_role) {
      const snackbarStore = useSnackbarStore()
      //   const validationStore = useValidationStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()

      snackbarStore.showLoading()

      try {
        // Obtener plan gratuito
        const gratisPlan = await planStore.getGratisPlan()
        if (!gratisPlan || !gratisPlan.id) {
          throw new Error('No se pudo obtener el plan gratuito')
        }

        // Crear hacienda
        if (!formData.hacienda) {
          const newHacienda = await haciendaStore.createHacienda(formData.hacienda, gratisPlan.id)
          formData.hacienda = newHacienda.id
        }

        // Crear usuario
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

        // Enviar email de verificación
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
      //listo
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
        throw error // Opcional: relanzar el error si se necesita manejar en el componente
      }
    },

    async logout() {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore() // Ensure syncStore is available

      try {
        // Detener el timer de refresco si está activo
        this.stopRefreshTimer()

        // Redirigir PRIMERO para evitar errores de componentes
        // que intentan renderizar mientras el estado se está limpiando
        // Consider if router navigation should be here or handled by the caller
        // For now, keeping it as it was.
        if (router.currentRoute.value.path !== '/') {
          await router.push('/')
        }

        // Luego limpiar datos de autenticación
        pb.authStore.clear()
        this.user = null
        this.token = null
        this.isLoggedIn = false
        this.initialized = false // Reset initialized state for next app load/user

        // Limpiar datos en syncStore
        syncStore.removeFromLocalStorage('pocketbase_auth')
        syncStore.removeFromLocalStorage('rememberMe_active') // Updated key
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
