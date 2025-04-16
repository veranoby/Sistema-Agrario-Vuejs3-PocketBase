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
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
import AuthModal from './components/AuthModal.vue'

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

watch(isLoggedIn, (newValue) => {
  if (newValue) {
    handleLoginSuccess()
  } else {
    navigationLinks.value = []
    router.push('/')
  }
})

onMounted(async () => {
  // Eliminar el intento de login automático que está fallando
  // Ahora usaremos la lógica de init() de authStore que ya modificamos

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
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const handleWindowFocus = () => {
  // Cuando la ventana recupera el foco
  refreshTokenIfNeeded()
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // Cuando la pestaña se vuelve visible
    refreshTokenIfNeeded()
  }
}

const refreshTokenIfNeeded = async () => {
  if (authStore.isLoggedIn) {
    try {
      await authStore.refreshToken()
    } catch (error) {
      console.error('Error al verificar/refrescar token:', error)

      // Si el token no se pudo refrescar, pero tenemos rememberMe,
      // mostramos el diálogo de login
      const syncStore = useSyncStore()
      const rememberMe = syncStore.loadFromLocalStorage('rememberMe')

      if (rememberMe) {
        showAuthModal.value = true
      }
    }
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
