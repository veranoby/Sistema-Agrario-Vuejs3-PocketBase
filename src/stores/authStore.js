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
      const syncStore = useSyncStore();
      console.log('[AUTH INIT] Starting initialization...'); // New log

      const model = syncStore.loadFromLocalStorage('pocketbase_auth');
      console.log('[AUTH INIT] Loaded pocketbase_auth model:', JSON.parse(JSON.stringify(model)));

      const rememberMeIsActive = syncStore.loadFromLocalStorage('rememberMe_active');
      console.log('[AUTH INIT] rememberMe_active loaded as:', rememberMeIsActive);

      if (model && model.token) { // Ensure model and token exist before trying to use them
        pb.authStore.save(model.token, model);
        console.log('[AUTH INIT] pb.authStore.isValid after loading model:', pb.authStore.isValid);

        if (pb.authStore.isValid) {
          console.log('[AUTH INIT] Path A: Session is valid after loading model.');
          if (this.tokenNeedsRefresh()) {
            console.log('[AUTH INIT] Path A.1: Token needs refresh.');
            try {
              const freshAuthData = await pb.collection('users').authRefresh();
              console.log('[AUTH INIT] authRefresh successful for Path A.1. Response:', JSON.parse(JSON.stringify(freshAuthData)));
              this.setSession(freshAuthData.record);
              syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model); // Persist refreshed token
              syncStore.saveToLocalStorage('last_auth_success', Date.now()); // Update last success time
            } catch (error) {
              console.error('[AUTH INIT] Error during authRefresh for Path A.1:', error);
              // If refresh fails, this valid-but-needs-refresh session might become invalid.
              // Consider if logout is needed here or if setSession simply won't be called.
              // For now, let it fall through; if setSession isn't called, isLoggedIn remains false.
              // Or, more robustly, logout if refresh fails:
              this.logout(); // Logout if token refresh fails for an existing valid session
              this.initialized = true;
              return false;
            }
          } else {
            console.log('[AUTH INIT] Path A.2: Token is fine, no refresh needed.');
            this.setSession(pb.authStore.model);
          }

          if (rememberMeIsActive) { // This check should be inside the valid session path
              console.log('[AUTH INIT] Path A: rememberMe is active, starting refresh timer.');
              this.startRefreshTimer();
          } else {
              // If not rememberMe, but session was valid (e.g. from a previous non-rememberMe session that hasn't expired)
              // ensure timer is stopped.
              this.stopRefreshTimer();
          }
          this.initialized = true;
          console.log('[AUTH INIT] Path A: Initialization successful. isLoggedIn:', this.isLoggedIn);
          return true;

        } else { // pb.authStore.isValid is FALSE after loading model
          console.log('[AUTH INIT] Path B: Session is INVALID after loading model.');
          if (rememberMeIsActive) {
            console.log('[AUTH INIT] Path B.1: rememberMe is active, attempting proactive authRefresh.');
            try {
              const freshAuthData = await pb.collection('users').authRefresh();
              console.log('[AUTH INIT] Proactive authRefresh successful for Path B.1. Response:', JSON.parse(JSON.stringify(freshAuthData)));
              this.setSession(freshAuthData.record);
              syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model); // Persist refreshed token
              syncStore.saveToLocalStorage('last_auth_success', Date.now());
              this.startRefreshTimer(); // Start timer as rememberMe is active
              this.initialized = true;
              console.log('[AUTH INIT] Path B.1: Initialization successful after proactive refresh. isLoggedIn:', this.isLoggedIn);
              return true;
            } catch (error) {
              console.error('[AUTH INIT] Error during proactive authRefresh for Path B.1:', error);
              // Proactive refresh failed, so now we must clear the invalid session.
              this.logout();
              this.initialized = true; // Mark initialized even if logout
              console.log('[AUTH INIT] Path B.1: Proactive refresh failed, user logged out.');
              return false;
            }
          } else {
            console.log('[AUTH INIT] Path B.2: rememberMe is NOT active. Clearing invalid session.');
            // No "Remember Me", and the loaded session is invalid. Clear it.
            this.logout(); // Perform full cleanup
            this.initialized = true; // Mark initialized even if logout
            console.log('[AUTH INIT] Path B.2: User logged out.');
            return false;
          }
        }
      } else {
        console.log('[AUTH INIT] Path C: No model or model.token found in localStorage.');
        // No model found, so no session to restore.
        // We shouldn't logout here as there's nothing to clear, just ensure clean state.
        this.user = null;
        this.token = null;
        this.isLoggedIn = false;
        // this.initialized = false; // This was in logout, ensure it's handled correctly.
        // Initialized should be true because we've completed the init process.
        this.initialized = true;
        console.log('[AUTH INIT] Path C: Initialization complete, no user session.');
        return false;
      }
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
      console.log('[AUTH REFRESH TOKEN] Attempting to refresh token. Current pb.authStore.isValid:', pb.authStore.isValid);
      const syncStore = useSyncStore()

      // Verificar si el token es válido antes de intentar refrescarlo
      if (!pb.authStore.isValid) {
        return false
      }

      // Verificar si el token está por expirar
      if (this.tokenNeedsRefresh()) {
        try {
          const freshAuthData = await pb.collection('users').authRefresh()
          console.log('[AUTH REFRESH TOKEN] authRefresh successful. Response:', JSON.parse(JSON.stringify(freshAuthData)));
          this.setSession(freshAuthData)

          // Actualizar token en syncStore
          syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model)
          console.log('[AUTH REFRESH TOKEN] Refreshed auth model saved to localStorage.');
          syncStore.saveToLocalStorage('last_auth_success', Date.now())

          return true
        } catch (error) {
          console.error('[AUTH REFRESH TOKEN] Error during token refresh:', error);
          console.error('Error al refrescar token:', error)
          return false
        }
      }

      // Token todavía válido y no necesita ser refrescado
      return true
    },

    // Método para determinar si el token necesita ser refrescado
    tokenNeedsRefresh() {
      console.log('[AUTH TOKEN NEEDS REFRESH] Checking if token needs refresh.');
      const syncStore = useSyncStore()

      // Obtener timestamp del último login exitoso
      const lastSuccess = syncStore.loadFromLocalStorage('last_auth_success')
      console.log('[AUTH TOKEN NEEDS REFRESH] last_auth_success:', lastSuccess);

      if (!lastSuccess) {
        console.log('[AUTH TOKEN NEEDS REFRESH] No last_auth_success found, returning true.');
        // Si no hay registro, asumimos que sí necesita refresco
        return true
      }

      const now = Date.now()
      const timeSinceLastSuccess = now - lastSuccess
      const refreshThreshold = 20 * 60 * 1000 // 20 minutos
      console.log('[AUTH TOKEN NEEDS REFRESH] Time since last success (ms):', timeSinceLastSuccess, 'Threshold (ms):', refreshThreshold);

      // Refrescar si han pasado más de 20 minutos desde el último éxito
      console.log('[AUTH TOKEN NEEDS REFRESH] Returning:', timeSinceLastSuccess > refreshThreshold);
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

      // Add logic for remembering user credentials
      if (rememberMe) {
        const rememberedCredentials = { username: authData.record.username, email: authData.record.email };
        syncStore.saveToLocalStorage('rememberedUser', rememberedCredentials);
        console.log('[AUTH] Remembered user credentials saved:', rememberedCredentials);
      } else {
        syncStore.removeFromLocalStorage('rememberedUser');
        console.log('[AUTH] Cleared remembered user credentials.');
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
        syncStore.removeFromLocalStorage('rememberedUser');
        console.log('[AUTH] Cleared remembered user credentials during logout.');
        syncStore.removeFromLocalStorage('last_auth_success')

        snackbarStore.showSnackbar('Logged out successfully', 'success')
      } catch (error) {
        console.error('Error during logout:', error)
        snackbarStore.showSnackbar('Error al cerrar sesión', 'error')
      }
    }
  }
})
