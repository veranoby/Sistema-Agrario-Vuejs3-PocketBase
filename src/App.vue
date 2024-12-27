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

    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <Snackbar />
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

import Snackbar from '@/components/SnackbarComponent.vue'
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const drawer = ref(true)
const showAuthModal = ref(false)

const isLoggedIn = computed(() => authStore.isLoggedIn)

const showHeader = computed(() => route.name !== 'login')
const currentPage = computed(() => route.name?.toUpperCase() || '')

const navigationLinks = [
  { id: 1, to: '/dashboard', icon: 'mdi-view-dashboard', label: 'Dashboard' },
  { id: 2, to: '/siembras', icon: 'mdi-sprout', label: 'Siembras' },
  { id: 3, to: '/zonas', icon: 'mdi-map', label: 'Zonas' },
  { id: 4, to: '/actividades', icon: 'mdi-calendar-check', label: 'Actividades' }
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

onMounted(() => {
  const savedCredentials = localStorage.getItem('rememberMe')
  if (savedCredentials) {
    const { usernameOrEmail, password } = JSON.parse(savedCredentials)
    authStore.login(usernameOrEmail, password).catch(() => {
      localStorage.removeItem('rememberMe')
      localStorage.removeItem('token')
    })
  }
})

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
