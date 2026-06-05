import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { authProvider } from '@/services/authProvider'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from './uiFeedbackStore'
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
    initPromise: null,
    refreshTimer: null,
    _sessionSubscription: null, // ID del usuario suscrito para detección de sesión remota
    version: 1
  }),

  getters: {
    avatarUrl: (state) => {
      const avatarStore = useAvatarStore()
      return avatarStore.getAvatarUrl({ ...state.user, type: 'user' }, 'users')
    },
    userRole: (state) => (state.user ? state.user.role : ''),
    fullName: (state) => (state.user ? `${state.user.name} ${state.user.lastname}` : ''),

    // RBAC Helpers
    isSuperAdmin: (state) => state.user?.role === 'superadmin',
    isAdministrador: (state) => state.user?.role === 'administrador',
    isAuditor: (state) => state.user?.role === 'auditor',
    isOperador: (state) => state.user?.role === 'operador',
    isAsesor: (state) => state.user?.role === 'asesor',

    // Perfil público del asesor (campo info como JSON)
    asesorInfo: (state) => {
      if (state.user?.role !== 'asesor') return null
      try { return JSON.parse(state.user?.info || '{}') } catch { return {} }
    },

    canEdit: (state) => {
      return ['superadmin', 'administrador', 'auditor'].includes(state.user?.role)
    },
    canCreate: (state) => {
      return ['superadmin', 'administrador', 'auditor'].includes(state.user?.role)
    },
    canDelete: (state) => {
      return ['superadmin', 'administrador', 'auditor'].includes(state.user?.role)
    }
  },

  actions: {
    $dispose() {
      this.stopRefreshTimer()
    },

    async changePassword(oldPassword, newPassword) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      try {
        await profileService.changePassword(this.user?.id, oldPassword, newPassword)
        uiFeedbackStore.showSnackbar('Password changed successfully', 'success')
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async updateProfile(profileData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      try {
        const updatedUser = await profileService.updateProfile(this.user, profileData)
        this.user = updatedUser
        localStorage.setItem('user', JSON.stringify(this.user))
        uiFeedbackStore.showSnackbar('Perfil actualizado con éxito', 'success')
        return updatedUser
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async attemptTokenRefresh() {

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
      // Timer siempre activo — independiente de rememberMe.
      // Sin timer, una sesión invalidada remotamente nunca se detecta.
      this.startRefreshTimer()
    },

    async ensureAuthInitialized() {
      if (this.initialized) {
        logger.auth('ensureAuthInitialized: Already initialized.')
        return authProvider.authStore.isValid
      }
      if (!this.initPromise) {
        logger.auth('ensureAuthInitialized: Not initialized, calling init().')
        this.initPromise = this.init()
      } else {
        logger.auth('ensureAuthInitialized: Initialization in progress, awaiting...')
      }
      await this.initPromise
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

      this.refreshTimer = setInterval(debouncedRefresh, 2 * 60 * 1000) // cada 2 min
    },

    stopRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    async login(username, email, password, rememberMe = false) {
      if (this.loading) return
      this.loading = true

      const uiFeedbackStore = useUiFeedbackStore()

      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        this.loading = false
        uiFeedbackStore.hideLoading()
        throw new Error('Se requiere conexión a internet para el primer inicio de sesión')
      }

      uiFeedbackStore.showLoading()

      try {
        const authData = await authProvider.login(username, email, password)
        
        if (!authProvider.authStore.isValid) {
          throw new Error('Credenciales incorrectas')
        }

        await this.handleSuccessfulLogin(authData, rememberMe)
        return true
      } catch (error) {
        const isAuthError = error?.status === 400 || error?.code === 'VALIDATION_ERROR'
        handleError(
          error,
          isAuthError ? 'Credenciales incorrectas' : `Error al iniciar sesión: ${error.message}`
        )
        return false
      } finally {
        this.loading = false
        uiFeedbackStore.hideLoading()
      }
    },

    async refreshToken(force = false) {
      logger.auth('Attempting to refresh token. Current authProvider.authStore.isValid:', authProvider.authStore.isValid)
      if (!authProvider.authStore.isValid) {
        return false
      }

      if (force || this.tokenNeedsRefresh()) {
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
            // 401 = token inválido (sesión iniciada en otro dispositivo)
            if (error?.status === 401) {
              const uiFeedbackStore = useUiFeedbackStore()
              uiFeedbackStore.showSnackbar(
                'Sesión terminada. Es posible que se haya iniciado sesión en otro dispositivo.',
                'error'
              )
              await this.logout(true) // silent=true para no sobrescribir el mensaje anterior
            }
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
      const refreshThreshold = 5 * 60 * 1000 // 5 min: ventana máxima de sesión concurrente

      const shouldRefresh = timeSinceLastSuccess > refreshThreshold
      if (shouldRefresh || (import.meta.env.DEV && timeSinceLastSuccess > 30 * 60 * 1000)) {
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

      // Validar si la cuenta está suspendida directamente
      if (authData.record.status === 'suspended') {
        await this.logout()
        throw new Error('Cuenta suspendida')
      }

      // Validar cascada si no es superadmin
      if (authData.record.role !== 'superadmin' && authData.record.hacienda) {
        try {
          const haciendaId = typeof authData.record.hacienda === 'object' ? authData.record.hacienda.id : authData.record.hacienda
          const adminQuery = await pb.collection('users').getFirstListItem(`hacienda="${haciendaId}" && role="administrador"`)

          if (adminQuery && adminQuery.status === 'suspended') {
            await this.logout()
            throw new Error('La cuenta principal de su hacienda se encuentra suspendida')
          }
        } catch (err) {
          // Si el error es de tipo NotFound, significa que no hay administrador o no se encontró.
          // Solo relanzamos si el error es explícitamente nuestra excepción de "cuenta suspendida".
          if (err.message === 'La cuenta principal de su hacienda se encuentra suspendida') {
            throw err
          }
          logger.warn('Error al verificar el estado del administrador de la hacienda:', err.message)
        }
      }

      // Asesor: redirigir a su panel sin cargar hacienda ni stores de campo
      if (authData.record.role === 'asesor') {
        this.setSession(authData.record)
        const authDataToStore = { token: authProvider.authStore.token, model: authProvider.authStore.model }
        localStorage.setItem('pocketbase_auth', JSON.stringify(authDataToStore))
        localStorage.setItem('last_auth_success', Date.now().toString())
        if (rememberMe) {
          localStorage.setItem('rememberMe_active', 'true')
          this.startRefreshTimer()
          const rememberedCredentials = { username: authData.record.username, email: authData.record.email }
          localStorage.setItem('rememberedUser', JSON.stringify(rememberedCredentials))
        } else {
          localStorage.removeItem('rememberMe_active')
          localStorage.removeItem('rememberedUser')
        }
        await this.setUser(authData.record)
        router.push('/asesor/dashboard')
        return
      }

      this.setSession(authData.record)


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

      const syncStore = useSyncStore()
      syncStore.init()

      const haciendaStore = useHaciendaStore()

      // Normalizar haciendaId (soporta string ID o objeto expandido de PocketBase)
      const rawHacienda = authData.record.hacienda
      const haciendaId = typeof rawHacienda === 'object' && rawHacienda?.id 
        ? rawHacienda.id 
        : rawHacienda

      if (!haciendaId && authData.record.role !== 'superadmin') {
        const uiFeedbackStore = useUiFeedbackStore()
        uiFeedbackStore.showSnackbar('No tienes una hacienda asignada. Contacta al administrador.', 'warning')
      }

      await Promise.all([
        this.setUser(authData.record),
        haciendaId ? haciendaStore.fetchHacienda(haciendaId) : Promise.resolve()
      ])

      logger.auth('Critical stores loaded, redirecting to dashboard')

      if (authData.record.role === 'superadmin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }

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
      this.subscribeToSessionEvents()
    },

    setUser(record) {
      this.user = record
    },

    /**
     * Suscribe al registro propio del usuario vía PocketBase Realtime.
     * Cuando otro dispositivo inicia sesión (rotando el tokenKey), el update
     * del registro dispara este handler. Se usa getOne (NO authRefresh) para
     * verificar el token sin volver a rotar el tokenKey (evita ping-pong).
     */
    subscribeToSessionEvents() {
      if (!this.user?.id || !this.isLoggedIn) return

      // No re-suscribir si ya estamos suscritos al mismo usuario
      if (this._sessionSubscription === this.user.id) return

      // Limpiar suscripción anterior si existía (cambio de usuario)
      if (this._sessionSubscription) {
        try { pb.collection('users').unsubscribe(this._sessionSubscription) } catch { /* ignorar */ }
        this._sessionSubscription = null
      }

      const userId = this.user.id
      this._sessionSubscription = userId

      pb.collection('users').subscribe(userId, async (event) => {
        if (event.action !== 'update' || !this.isLoggedIn) return
        try {
          // getOne verifica el token SIN disparar onRecordAuthRequest
          // (a diferencia de authRefresh, que rotaría el tokenKey de nuevo)
          await pb.collection('users').getOne(userId)
          // Token válido — fue una actualización legítima (perfil, etc.)
          this.setUser(event.record)
        } catch (error) {
          if (error?.status === 401) {
            logger.auth('[AUTH] Sesión invalidada remotamente — otro dispositivo inició sesión')
            const uiFeedbackStore = useUiFeedbackStore()
            const syncStore = useSyncStore()
            // Proteger la cola antes del logout
            syncStore.resetForLogout()
            await this.logout(true)
            uiFeedbackStore.showSnackbar(
              'Sesión cerrada: se detectó acceso desde otro dispositivo. Tus cambios offline están guardados.',
              'warning',
              8000
            )
          }
        }
      }).catch(err => {
        logger.auth('[AUTH] Error al suscribirse a eventos de sesión:', err?.message)
        this._sessionSubscription = null
      })
    },

    async registerAsesor(formData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      try {
        const infoJson = JSON.stringify({
          numero_colegiatura: formData.numero_colegiatura,
          especialidades: formData.especialidades,
          zonas_cobertura: formData.zonas_cobertura,
          bio_corta: formData.bio_corta
        })

        const userData = this.createUserData(
          formData.username,
          formData.email,
          formData.firstname,
          formData.lastname,
          formData.password,
          'asesor',
          null, // No hacienda for asesor
          false,
          infoJson
        )

        const newUser = await authProvider.register(userData)

        // Get ASESOR_PLAN modulo ID from PB and create subscription request
        try {
          const moduloPlan = await pb.collection('modulos').getFirstListItem(`code="asesor_plan"`)
          if (moduloPlan) {
            await pb.collection('solicitudes_suscripcion').create({
              solicitante: newUser.id,
              tipo: 'modulo_addon',
              modulo_solicitado: moduloPlan.id,
              estado: 'pendiente',
              notas_admin: 'Registro nuevo asesor — pendiente verificación de pago del entorno.',
              fecha_solicitud: new Date().toISOString()
            })
          }
        } catch (e) {
          console.warn('Could not create subscription request automatically:', e)
        }

        await this.sendVerificationEmail(formData.email)

        uiFeedbackStore.showSnackbar(
          'Registrado con éxito. Tu cuenta está pendiente de activación.',
          'success'
        )
        this.registrationSuccess = true
      } catch (error) {
        this.registrationSuccess = false
        handleError(error, 'Error en el registro del asesor')
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async register(formData, new_role) {
      const uiFeedbackStore = useUiFeedbackStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()

      uiFeedbackStore.showLoading()

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

        uiFeedbackStore.showSnackbar(
          'Registrado con éxito. Por favor, verifique su email.',
          'success'
        )
        this.registrationSuccess = true
      } catch (error) {
        this.registrationSuccess = false
        handleError(error, 'Error en el registro')
      } finally {
        uiFeedbackStore.hideLoading()
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
      verified,
      infoJson = null
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
        info: infoJson || 'Usuario de hacienda',
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
      const uiFeedbackStore = useUiFeedbackStore()

      try {
        await authProvider.confirmVerification(token)
        uiFeedbackStore.showSnackbar(
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
      const uiFeedbackStore = useUiFeedbackStore()
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const error = new Error('Formato de correo electrónico inválido')
        uiFeedbackStore.showSnackbar(error.message, 'error')
        throw error
      }
      try {
        await authProvider.requestPasswordReset(email)
        return true
      } catch (error) {
        handleError(error, 'Error al solicitar restablecimiento de contraseña')
        const message = error.message || 'No se pudo procesar la solicitud. Intente nuevamente.'
        uiFeedbackStore.showSnackbar(message, 'error')
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

    async logout(silent = false) {
      const uiFeedbackStore = useUiFeedbackStore()

      try {
        this.stopRefreshTimer()

        // Desuscribir del realtime antes de perder el token
        if (this._sessionSubscription) {
          try { pb.collection('users').unsubscribe(this._sessionSubscription) } catch { /* ignorar */ }
          this._sessionSubscription = null
        }

        if (router.currentRoute.value.path !== '/') {
          await router.push('/')
        }

        authProvider.logout()
        const syncStore = useSyncStore()
        // Proteger ops en vuelo antes de disponer el store
        syncStore.resetForLogout()
        syncStore.dispose()

        this.user = null
        this.token = null
        this.isLoggedIn = false
        this.initialized = false

        localStorage.removeItem('pocketbase_auth')
        localStorage.removeItem('rememberMe_active')
        localStorage.removeItem('rememberedUser')
        logger.auth('Cleared remembered user credentials during logout.')
        localStorage.removeItem('last_auth_success')

        if (!silent) {
          uiFeedbackStore.showSnackbar('Logged out successfully', 'success')
        }
      } catch (error) {
        handleError(error, 'Error al cerrar sesión')
        uiFeedbackStore.showSnackbar('Error al cerrar sesión', 'error')
      }
    }
  }
})
