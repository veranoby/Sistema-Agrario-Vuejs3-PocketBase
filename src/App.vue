<template>
  <v-app :theme="themeStore.currentTheme">
    <v-system-bar
      v-if="isLoggedIn && !authStore.isAsesor && !authStore.isSuperAdmin && haciendaStore.daysUntilExpiration !== null && haciendaStore.daysUntilExpiration <= 3"
      :color="haciendaStore.daysUntilExpiration <= 0 ? 'error' : 'warning'"
      class="text-white font-weight-bold justify-center"
      height="32"
    >
      <v-icon start size="small">{{ haciendaStore.daysUntilExpiration <= 0 ? 'mdi-alert-circle' : 'mdi-clock-outline' }}</v-icon>
      <span class="text-caption text-sm-body-2">
        {{ haciendaStore.daysUntilExpiration <= 0 ? 'Suscripción expirada. Acceso limitado.' : `Tu suscripción expira en ${haciendaStore.daysUntilExpiration} días.` }}
      </span>
      <v-btn 
        v-if="authStore.user?.role === 'administrador'" 
        size="x-small" 
        variant="flat" 
        color="white" 
        class="ml-4 text-black font-weight-black" 
        @click="router.push('/profile')"
      >
        RENOVAR AHORA
      </v-btn>
    </v-system-bar>

    <Header
      v-if="showHeader"
      :PaginaActual="currentPage"
      @HandleDrawer="drawer = !drawer"
      @openAuthModal="showAuthModal = true"
    />

    <v-navigation-drawer v-if="isLoggedIn" expand-on-hover rail v-model="drawer" theme="dark">
      <Sidebar :navigationLinks="navigationLinks" />
    </v-navigation-drawer>

    <AuthModal
      v-model:isOpen="showAuthModal"
      @loginSuccess="handleLoginSuccess"
      @HandleDrawer="handleLoginSuccess"
    />

    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <SnackbarComponent />

    <GlobalConfirmDialog />

    <ConflictResolutionDialog
      v-model="syncStore.conflictDialog"
      :conflicts="syncStore.conflicts"
      @resolve="handleConflictResolution"
    />

    <v-snackbar
      v-model="pwaStore.installPromptVisible"
      timeout="-1"
      color="primary"
      elevation="24"
      location="bottom"
    >
      <div class="d-flex align-center">
        <v-icon start icon="mdi-cellphone-arrow-down"></v-icon>
        <span class="font-weight-bold">Instala Sistema Agrario en tu dispositivo para acceso rápido y modo offline.</span>
      </div>
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="pwaStore.clearPrompt()">Ahora no</v-btn>
        <v-btn color="white" variant="elevated" class="font-weight-bold text-primary ml-2" @click="pwaStore.promptInstall()">Instalar</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from './stores/themeStore'
import { usePwaStore } from '@/stores/pwaStore'
import { useAuthStore } from '@/stores/authStore'
import { checkProximoActivities } from '@/stores/programaciones'
import { checkBPACertificados } from '@/stores/bitacoraStore'
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'

const AuthModal = defineAsyncComponent(() => import('./components/forms/auth/AuthModal.vue'))
const ConflictResolutionDialog = defineAsyncComponent(() => import('./components/dialogs/ConflictResolutionDialog.vue'))
const GlobalConfirmDialog = defineAsyncComponent(() => import('./components/dialogs/GlobalConfirmDialog.vue'))

import SnackbarComponent from '@/components/SnackbarComponent.vue'
import { useSyncStore } from '@/stores/sync'
import { useSchedulerStore } from '@/stores/schedulerStore'
import { useHaciendaStore } from '@/stores/haciendaStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const syncStore = useSyncStore()
const schedulerStore = useSchedulerStore()
const haciendaStore = useHaciendaStore()
const pwaStore = usePwaStore()
const { t } = useI18n()

const drawer = ref(true)
const showAuthModal = ref(false)

import { USER_ROLES } from '@/constants/roles'

const isLoggedIn = computed(() => authStore.isLoggedIn)
const showHeader = computed(() => route.name !== 'login')
const currentPage = computed(() => route.name?.toUpperCase() || '')

const navigationLinks = computed(() => {
  const role = authStore.user?.role

  if (role === USER_ROLES.SUPERADMIN) {
    return [
      { id: 'sa1', to: '/admin', icon: 'mdi-shield-crown', label: 'Admin Dashboard' },
      { id: 'sa2', to: '/admin/users', icon: 'mdi-account-group', label: 'Gestión de Usuarios' },
      { id: 'sa3', to: '/admin/haciendas', icon: 'mdi-home-group', label: 'Gestión de Haciendas' },
      { id: 'sa11', to: '/admin/asesores', icon: 'mdi-account-tie-hat', label: 'Gestión de Asesores' },
      { id: 'sa12', to: '/admin/suscripciones', icon: 'mdi-cash-register', label: 'Solicitudes y Pagos' },
      { id: 'sa4', to: '/admin/settings', icon: 'mdi-cog', label: 'Configuración del Sistema' },
      { id: 'sa5', to: '/admin/logs', icon: 'mdi-text-box-search', label: 'Visor de Logs' },
      { id: 'sa6', to: '/admin/exports', icon: 'mdi-export', label: 'Exportaciones' },
      { id: 'sa7', to: '/admin/analytics', icon: 'mdi-chart-bar', label: 'Super Admin Analytics' },
      { id: 'sa9', to: '/admin/data-mining', icon: 'mdi-database-search', label: 'Data Mining Tools' },
      { id: 'sa10', to: '/knowledge/search', icon: 'mdi-magnify', label: 'Búsqueda Unificada' },
    ]
  }

  if (role === USER_ROLES.ASESOR) {
    return [
      { id: 'a1', to: '/asesor/dashboard', icon: 'mdi-view-dashboard', label: 'Dashboard' },
      { id: 'a2', to: '/asesor/haciendas', icon: 'mdi-barn', label: 'Mis Haciendas' },
      { id: 'a3', to: '/asesor/perfil', icon: 'mdi-account-circle', label: 'Mi Perfil' }
    ]
  }

  const links = [
    { id: 1, to: '/dashboard', icon: 'mdi-view-dashboard', label: t('sidebar.dashboard'), group: 'Inicio' },
    { id: 2, to: '/siembras', icon: 'mdi-sprout', label: t('sidebar.sowings'), group: 'Fase 1: Siembras' },
    { id: 6, to: '/zonas', icon: 'mdi-map', label: t('sidebar.zones'), group: 'Fase 2: Zonas y Actividades' },
    { id: 3, to: '/actividades', icon: 'mdi-gesture-tap-button', label: t('sidebar.activities'), group: 'Fase 2: Zonas y Actividades' },
    { id: 4, to: '/programaciones', icon: 'mdi-alarm-check', label: t('sidebar.schedules'), group: 'Fase 3: Control' },
    { id: 5, to: '/bitacora', icon: 'mdi-book-open-variant', label: t('sidebar.bitacora'), group: 'Fase 3: Control' }
  ]

  if (haciendaStore.isModuleActive('tarjas_campo')) {
    links.push({ id: 12, to: '/hacienda/tarjas', icon: 'mdi-dolly', label: 'Cosechas (Tarjas)', group: 'Operación' })
  }

  if (role !== USER_ROLES.OPERADOR) {
    links.push({ id: 7, to: '/metricas', icon: 'mdi-chart-areaspline', label: t('sidebar.metrics'), group: 'Análisis' })
    links.push({ id: 8, to: '/finanzas', icon: 'mdi-cash-multiple', label: t('sidebar.finances'), group: 'Análisis' })
    links.push({ id: 9, to: '/recordatorios', icon: 'mdi-alarm-light-outline', label: t('sidebar.reminders'), group: 'Extra' })
    links.push({ id: 10, to: '/hacienda/directorio-asesores', icon: 'mdi-account-search', label: 'Asesores', group: 'Extra' })
    if (haciendaStore.isModuleActive('kardex_bodega')) {
      links.push({ id: 11, to: '/hacienda/bodega', icon: 'mdi-warehouse', label: 'Bodega', group: 'Operación' })
    }
    if (haciendaStore.isModuleActive('nomina_express')) {
      links.push({ id: 13, to: '/hacienda/nomina', icon: 'mdi-file-percent', label: 'Nómina Express', group: 'Operación' })
    }
    if (role === USER_ROLES.ADMINISTRADOR && haciendaStore.isModuleActive('costo_por_hectarea')) {
      links.push({ id: 14, to: '/hacienda/dashboard', icon: 'mdi-chart-bar', label: 'Dashboard Gerencial', group: 'Gerencia' })
      links.push({ id: 15, to: '/hacienda/rentabilidad', icon: 'mdi-matrix', label: 'Rentabilidad Siembras', group: 'Gerencia' })
    }
  }

  return links
})

let checkInterval = null
let lastFocusRefresh = 0
const FOCUS_REFRESH_COOLDOWN_MS = 5 * 60 * 1000 // 5 min — evita requests en cada cambio de tab

const handleLoginSuccess = () => {
  showAuthModal.value = false
  drawer.value = true
}

watch(
  () => themeStore.currentTheme,
  (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  },
  { immediate: true }
)

watch(
  isLoggedIn,
  async (newValue) => {
    if (newValue) {
      handleLoginSuccess()
      
      // Mostrar prompt de PWA si está pendiente
      if (pwaStore.deferredPrompt) {
        pwaStore.showInstallPrompt()
      }

      if (!schedulerStore.initialized) {
        await schedulerStore.init()
      }
    } else {
      if (authStore.initialized) {
        navigationLinks.value = []
        schedulerStore.reset()
        if (router.currentRoute.value.meta.requiresAuth) {
          router.push('/')
        }
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  const pwaStore = usePwaStore()

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pwaStore.setDeferredPrompt(e)
    if (authStore.isLoggedIn) {
      pwaStore.showInstallPrompt()
    }
  })

  window.addEventListener('openAuthModal', () => {
    showAuthModal.value = true
  })

  if (!authStore.initialized) {
    await authStore.init()
  }

  if (authStore.isLoggedIn && !syncStore.initialized) {
    await syncStore.init()
  }

  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const CHECK_INTERVAL = 3600000
  checkInterval = setInterval(async () => {
    if (authStore.isAsesor) return
    const haciendaActual = authStore.haciendaActual
    if (haciendaActual) {
       // console.log('[App] Verificando alertas para', haciendaActual.nombre)
      await Promise.all([
        checkProximoActivities(haciendaActual.id),
        checkBPACertificados(haciendaActual.id)
      ])
    }
  }, CHECK_INTERVAL)

  setTimeout(async () => {
    if (authStore.isAsesor) return
    const haciendaActual = authStore.haciendaActual
    if (haciendaActual) {
      await Promise.all([
        checkProximoActivities(haciendaActual.id),
        checkBPACertificados(haciendaActual.id)
      ])
    }
  }, 5000)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (authStore.isLoggedIn) {
    authStore.stopRefreshTimer()
  }
  schedulerStore.reset()
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})

const handleWindowFocus = () => {
  if (import.meta.env.DEV) {
     // console.log('[APP] Ventana recuperó el foco')
  }
  refreshTokenIfNeeded()
}

const handleVisibilityChange = () => {
  if (import.meta.env.DEV) {
     // console.log('[APP] Cambio de visibilidad:', document.visibilityState)
  }
  if (document.visibilityState === 'visible') {
    refreshTokenIfNeeded()
  }
}

const refreshTokenIfNeeded = async () => {
  if (!authStore.isLoggedIn) return

  // Cooldown: máx 1 refresh de token cada 5 min por foco/visibilidad
  const now = Date.now()
  if (now - lastFocusRefresh < FOCUS_REFRESH_COOLDOWN_MS) return
  lastFocusRefresh = now

  try {
    // Validar sesión al recuperar foco para detectar doble sesión
    const syncStore = useSyncStore()
    if (syncStore.isOnline) {
      await authStore.refreshToken(true)
    }
  } catch (error) {
    const syncStore = useSyncStore()
    const rememberMe = syncStore.loadFromLocalStorage('rememberMe')
    if (rememberMe) {
      authStore.showLoginDialog = true
    }
  }
}

function handleConflictResolution(resolvedConflicts) {
   // console.log('[APP] Resolviendo conflictos:', resolvedConflicts)
  syncStore.resolveMultipleConflicts(resolvedConflicts)
}
</script>

<style>
.theme-light {
  --fondo_claro: #f5f5f5;
  --fondo_claro_tabla: #ffffff;
}

.theme-dark {
  --fondo_claro: #1e1e1e;
  --fondo_claro_tabla: #2d2d2d;
}

:root {
  --fondo_claro: #f5f5f5;
  --fondo_claro_tabla: #ffffff;
}

[data-theme='dark'] {
  --fondo_claro: #1e1e1e;
  --fondo_claro_tabla: #2d2d2d;
}
</style>
