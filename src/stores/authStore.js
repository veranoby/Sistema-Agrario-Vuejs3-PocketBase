import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useProfileStore } from './profileStore'
import { useHaciendaStore } from './haciendaStore'
import { usePlanStore } from './planStore'
import { useValidationStore } from './validationStore'
import router from '@/router'
import { useSyncStore } from './syncStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { debounce } from 'lodash'

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
    async init() {
      const syncStore = useSyncStore()
      const model = syncStore.loadFromLocalStorage('pocketbase_auth');

      if (model) {
        try {
          // Restore the auth store from the loaded model
          pb.authStore.save(model.token, model); // model.token is the token, model is the user model

          if (pb.authStore.isValid) {
            if (this.tokenNeedsRefresh()) { // tokenNeedsRefresh might need pb.authStore.model if it relied on authData.record
              const freshAuthData = await pb.collection('users').authRefresh(); // freshAuthData is { token, record }
              this.setSession(freshAuthData.record); // setSession expects the record
            } else {
              this.setSession(pb.authStore.model); // pb.authStore.model is the record
            }

            const rememberMeIsActive = syncStore.loadFromLocalStorage('rememberMe_active');
            if (rememberMeIsActive) {
              this.startRefreshTimer()
            }
            this.initialized = true; // Successfully initialized with a valid session
            return true;
          } else {
            // Auth store not valid after loading from model, treat as corrupted/invalid
            console.warn('Session restored from localStorage was invalid.');
            this.logout(); // Perform full cleanup
            // this.initialized is set to true at the end, indicating an attempt was made.
            return false;
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          this.logout(); // Perform full cleanup
          return false;
        }
      }

      this.initialized = true; // Mark as initialization attempted, even if no data found
      return false
    },

    async ensureAuthInitialized() {
      if (!this.initialized) {
        console.log('[AUTH_STORE] ensureAuthInitialized: Not initialized, calling init().');
        await this.init(); // init() will set this.initialized = true after its attempt
      } else {
        console.log('[AUTH_STORE] ensureAuthInitialized: Already attempted initialization.');
      }
      // The source of truth for auth status is pb.authStore.isValid after init has run
      return pb.authStore.isValid;
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
            console.log('[AUTH] Datos de autenticación recibidos:', {
              token: pb.authStore.token,
              record: pb.authStore.record,
              isValid: pb.authStore.isValid
            })
            if (pb.authStore.isValid) {
              this.handleSuccessfulLogin(authData, rememberMe)
              return true
            }
          } catch (error) {
            console.log('Error al intentar login con username:', error)
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
            console.log('Error al intentar login con email:', error)
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
      const syncStore = useSyncStore()

      // Verificar si el token es válido antes de intentar refrescarlo
      if (!pb.authStore.isValid) {
        return false
      }

      // Verificar si el token está por expirar
      if (this.tokenNeedsRefresh()) {
        try {
          const freshAuthData = await pb.collection('users').authRefresh()
          this.setSession(freshAuthData)

          // Actualizar token en syncStore
          syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model)
          syncStore.saveToLocalStorage('last_auth_success', Date.now())

          return true
        } catch (error) {
          console.error('Error al refrescar token:', error)
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

      // Refrescar si han pasado más de 20 minutos desde el último éxito
      const refreshThreshold = 20 * 60 * 1000 // 20 minutos

      return timeSinceLastSuccess > refreshThreshold
    },

    async handleSuccessfulLogin(authData, rememberMe = false) {
      console.log('[AUTH] Iniciando handleSuccessfulLogin, rememberMe:', rememberMe)

      // Set auth state
      this.setSession(authData.record) // authData from pb.authWithPassword is { token, record }
      const syncStore = useSyncStore()

      // Guardar datos de autenticación usando syncStore
      syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model);
      syncStore.saveToLocalStorage('last_auth_success', Date.now())
      console.log('[AUTH] Datos de autenticación (model) guardados en localStorage:', pb.authStore.model)

      if (rememberMe) {
        syncStore.saveToLocalStorage('rememberMe_active', true);
        console.log('[AUTH] rememberMe_active guardado como true')
        this.startRefreshTimer()
      } else {
        syncStore.removeFromLocalStorage('rememberMe_active');
        console.log('[AUTH] rememberMe_active eliminado')
        this.stopRefreshTimer()
      }

      // RESTAURAR EL FLUJO ORIGINAL: primero inicializar syncStore
      // y luego cargar los demás stores
      syncStore.init()

      const profileStore = useProfileStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()
      const actividadesStore = useActividadesStore()
      const zonasStore = useZonasStore()
      const siembrasStore = useSiembrasStore()
      const recordatoriosStore = useRecordatoriosStore()
      const programacionesStore = useProgramacionesStore()

      // Load user profile
      profileStore.setUser(authData.record)

      // Load hacienda data
      if (authData.record.hacienda) {
        await haciendaStore.fetchHacienda(authData.record.hacienda)
      }

      // Load other necessary data in sequence to avoid race conditions
      try {
        await planStore.fetchAvailablePlans()
        await actividadesStore.init()
        await zonasStore.init()
        await siembrasStore.init()
        await recordatoriosStore.init()
        await programacionesStore.init()
      } catch (error) {
        handleError(error, 'Error loading initial data')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    },

    setSession(record) { // record is pb.authStore.model or freshAuthData.record
      this.user = record
      this.token = pb.authStore.token // pb.authStore is the source of truth for the token
      this.isLoggedIn = true
    },

    async register(formData, new_role) {
      const snackbarStore = useSnackbarStore()
      const validationStore = useValidationStore()
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

    // async checkAuth() { ... } // Method removed

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
        this.initialized = false; // Reset initialized state for next app load/user

        // Limpiar datos en syncStore
        syncStore.removeFromLocalStorage('pocketbase_auth')
        syncStore.removeFromLocalStorage('rememberMe_active') // Updated key
        syncStore.removeFromLocalStorage('last_auth_success')

        snackbarStore.showSnackbar('Logged out successfully', 'success')
      } catch (error) {
        console.error('Error during logout:', error)
        snackbarStore.showSnackbar('Error al cerrar sesión', 'error')
      }
    }
  }
})
