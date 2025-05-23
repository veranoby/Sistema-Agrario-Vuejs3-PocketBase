<template>
  <v-app :theme="themeStore.currentTheme">
    <Header
      v-if="showHeader"
      :PaginaActual="currentPage"
      @HandleDrawer="drawer = !drawer"
      @openAuthModal="showAuthModal = true"
    />

    <v-navigation-drawer v-if="isLoggedIn" expand-on-hover rail v-model="drawer" theme="dark">
      <!--  <v-navigation-drawer v-model="drawer" temporary>-->
      <Sidebar :navigationLinks="navigationLinks" />
    </v-navigation-drawer>

    <AuthModal
      v-model:isOpen="showAuthModal"
      @loginSuccess="handleLoginSuccess"
      @HandleDrawer="handleLoginSuccess"
    />

    <AuthModal
      v-model:isOpen="authStore.showLoginDialog"
      @update:isOpen="authStore.showLoginDialog = $event"
    />

    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <SnackbarComponent />
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
import AuthModal from './components/AuthModal.vue'
import { pb } from '@/utils/pocketbase'

import SnackbarComponent from '@/components/SnackbarComponent.vue'
import { useSyncStore } from '@/stores/syncStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const syncStore = useSyncStore()

const drawer = ref(true)
const showAuthModal = ref(false)

const isLoggedIn = computed(() => authStore.isLoggedIn)

const showHeader = computed(() => route.name !== 'login')
const currentPage = computed(() => route.name?.toUpperCase() || '')

const navigationLinks = [
  { id: 1, to: '/dashboard', icon: 'mdi-view-dashboard', label: 'D A S H B O A R D' },
  { id: 2, to: '/siembras', icon: 'mdi-sprout', label: 'Siembras/Proyectos' },
  { id: 3, to: '/actividades', icon: 'mdi-gesture-tap-button', label: 'Actividades' },
  { id: 4, to: '/programaciones', icon: 'mdi-alarm-check', label: 'Programaciones' },
  { id: 5, to: '/zonas', icon: 'mdi-map', label: 'Zonas' },
  { id: 6, to: '/finanzas', icon: 'mdi-cash-multiple', label: 'Finanzas' },
  { id: 7, to: '/recordatorios', icon: 'mdi-alarm-light-outline', label: 'Recordatorios' }
]

const handleLoginSuccess = () => {
  showAuthModal.value = false
  drawer.value = true
}

// Aplicar tema cuando cambie
watch(
  () => themeStore.currentTheme,
  (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  },
  { immediate: true }
)

watch(
  isLoggedIn,
  (newValue, oldValue) => {
    if (newValue) {
      handleLoginSuccess()
    } else if (oldValue) {
      nextTick(() => {
        navigationLinks.value = []
        if (router.currentRoute.value.meta.requiresAuth) {
          router.push('/')
        }
      })
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // Si auth no está inicializado, iniciarlo
  if (!authStore.initialized) {
    await authStore.init()
  }

  // Si sync no está inicializado y tenemos sesión, iniciarlo
  if (authStore.isLoggedIn && !syncStore.initialized) {
    await syncStore.init()
  }

  // Detectar cuando el usuario retoma la actividad
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  // Limpiar event listeners para evitar memory leaks
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  // Importante: detener el timer de refresco al desmontar el componente
  if (authStore.isLoggedIn) {
    authStore.stopRefreshTimer()
  }
})

const handleWindowFocus = () => {
  console.log('[APP] Ventana recuperó el foco')
  refreshTokenIfNeeded()
}

const handleVisibilityChange = () => {
  console.log('[APP] Cambio de visibilidad:', document.visibilityState)
  if (document.visibilityState === 'visible') {
    refreshTokenIfNeeded()
  }
}

const refreshTokenIfNeeded = async () => {
  console.log('[APP] Verificando si necesita refresh token...')
  if (authStore.isLoggedIn) {
    try {
      console.log('[APP] isLoggedIn=true, verificando tokenNeedsRefresh')
      if (authStore.tokenNeedsRefresh()) {
        console.log('[APP] Token necesita refresh, ejecutando...')
        await authStore.refreshToken()
        console.log('[APP] Refresh token completado')
      } else {
        console.log('[APP] Token no necesita refresh aún')
      }
    } catch (error) {
      console.error('[APP] Error en refreshTokenIfNeeded:', error)
      const syncStore = useSyncStore()
      const rememberMe = syncStore.loadFromLocalStorage('rememberMe')
      console.log('[APP] rememberMe después de error:', rememberMe)

      if (rememberMe) {
        authStore.showLoginDialog = true
      }
    }
  } else {
    console.log('[APP] No está logueado, omitiendo refresh')
  }
}

// Agregar verificación de autenticación antes de cada ruta
router.beforeEach((to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth) && !isLoggedIn.value) {
    showAuthModal.value = true // Mostrar el modal de autenticación
  } else {
    next()
  }
})
</script>

<style>
/* Clases de utilidad para temas */
.theme-light {
  --fondo_claro: #f5f5f5;
  --fondo_claro_tabla: #ffffff;
}

.theme-dark {
  --fondo_claro: #1e1e1e;
  --fondo_claro_tabla: #2d2d2d;
}

/* Estilos globales */
:root {
  --fondo_claro: #f5f5f5;
  --fondo_claro_tabla: #ffffff;
}

[data-theme='dark'] {
  --fondo_claro: #1e1e1e;
  --fondo_claro_tabla: #2d2d2d;
}
</style>
