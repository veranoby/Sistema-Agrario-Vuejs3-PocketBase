<template>
  <v-app :theme="themeStore.currentTheme">
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
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from './stores/themeStore'
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

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const syncStore = useSyncStore()
const schedulerStore = useSchedulerStore()
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
      { id: 'sa4', to: '/admin/settings', icon: 'mdi-cog', label: 'Configuración del Sistema' },
      { id: 'sa5', to: '/admin/logs', icon: 'mdi-text-box-search', label: 'Visor de Logs' },
      { id: 'sa6', to: '/admin/exports', icon: 'mdi-export', label: 'Exportaciones' },
      { id: 'sa7', to: '/admin/analytics', icon: 'mdi-chart-bar', label: 'Super Admin Analytics' },
      { id: 'sa8', to: '/admin/metrics', icon: 'mdi-chart-line', label: 'Usage Metrics' },
      { id: 'sa9', to: '/admin/data-mining', icon: 'mdi-database-search', label: 'Data Mining Tools' },
      { id: 'sa10', to: '/knowledge/search', icon: 'mdi-magnify', label: 'Búsqueda Unificada' },
    ]
  }

  const links = [
    { id: 1, to: '/dashboard', icon: 'mdi-view-dashboard', label: t('sidebar.dashboard') },
    { id: 2, to: '/siembras', icon: 'mdi-sprout', label: t('sidebar.sowings') },
    { id: 3, to: '/actividades', icon: 'mdi-gesture-tap-button', label: t('sidebar.activities') },
    { id: 4, to: '/programaciones', icon: 'mdi-alarm-check', label: t('sidebar.schedules') },
    { id: 5, to: '/bitacora', icon: 'mdi-book-open-variant', label: t('sidebar.bitacora') },
    { id: 6, to: '/zonas', icon: 'mdi-map', label: t('sidebar.zones') }
  ]

  if (role !== USER_ROLES.OPERADOR) {
    links.push({ id: 7, to: '/metricas', icon: 'mdi-chart-areaspline', label: t('sidebar.metrics') })
    links.push({ id: 8, to: '/finanzas', icon: 'mdi-cash-multiple', label: t('sidebar.finances') })
    links.push({ id: 9, to: '/recordatorios', icon: 'mdi-alarm-light-outline', label: t('sidebar.reminders') })
  }

  return links
})

let checkInterval = null

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
      if (!schedulerStore.initialized) {
        await schedulerStore.init()
      }
    } else {
      navigationLinks.value = []
      schedulerStore.reset()
      if (router.currentRoute.value.meta.requiresAuth) {
        router.push('/')
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
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
  if (authStore.isLoggedIn) {
    try {
      if (authStore.tokenNeedsRefresh()) {
         // console.log('[APP] Ejecutando refresh token...')
        await authStore.refreshToken()
         // console.log('[APP] Refresh token completado')
      }
    } catch (error) {
       // console.error('[APP] Error en refreshTokenIfNeeded:', error)
      const syncStore = useSyncStore()
      const rememberMe = syncStore.loadFromLocalStorage('rememberMe')
      if (rememberMe) {
        authStore.showLoginDialog = true
      }
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
