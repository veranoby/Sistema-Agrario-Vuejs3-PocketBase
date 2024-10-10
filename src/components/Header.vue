<template>
  <v-app-bar app density="compact" :elevation="7">
    <template v-slot:prepend>
      <v-app-bar-nav-icon @click="$emit('HandleDrawer')"></v-app-bar-nav-icon>
    </template>
    <v-app-bar-title @click="$router.push('/')"
      ><span class="hidden sm:inline">Agro Assist </span
      ><v-icon size="24" color="green">mdi-leaf</v-icon> {{ PaginaActual }}</v-app-bar-title
    >

    <v-spacer></v-spacer>

    <template v-slot:append>
      <div class="flex flex-row sm:flex-row text-sm sm:text-base">
        <!-- Cambiar a flex-row para mantener horizontal -->
        <v-btn text size="x-small" @click="$router.push('/about')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-information"></v-icon>
          <!-- Icono para "Quienes Somos" -->
          <span class="hidden sm:inline">Quienes Somos</span>
          <!-- Ocultar texto en pantallas pequeñas -->
        </v-btn>
        <v-btn
          text
          size="x-small"
          @click="$router.push('/documentation')"
          class="flex items-center"
        >
          <v-icon class="mr-2" icon="mdi-book"></v-icon>
          <!-- Icono para "Documentacion" -->
          <span class="hidden sm:inline">Documentacion</span>
        </v-btn>
        <v-btn text size="x-small" @click="$router.push('/contact')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-email"></v-icon>
          <!-- Icono para "Contactenos" -->
          <span class="hidden sm:inline">Contactenos</span>
        </v-btn>
        <v-btn text size="x-small" @click="$router.push('/faq')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-help-circle"></v-icon>
          <!-- Icono para "FAQ" -->
          <span class="hidden sm:inline">FAQ</span>
        </v-btn>
      </div>

      <v-spacer></v-spacer>

      <div class="flex flex-col sm:flex-row">
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-login"
          color="grey-lighten-2"
          class="mx-2"
          v-if="!isLoggedIn"
          @click="$emit('openAuthModal')"
        >
          <span class="text-xs sm:text-sm">INGRESAR</span></v-btn
        >
      </div>
      <v-spacer></v-spacer>

      <v-icon @click="toggleTheme" icon="mdi-brightness-4" />
    </template>
  </v-app-bar>
</template>

<script>
import { computed, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'

import { useRouter } from 'vue-router'

export default {
  name: 'AppHeader',
  props: {
    PaginaActual: String
  },
  emits: ['HandleDrawer', 'openAuthModal'],
  setup() {
    const authStore = useAuthStore()
    const themeStore = useThemeStore()
    const isLoggedIn = computed(() => authStore.isLoggedIn)

    watch(isLoggedIn, (newValue) => {
      if (newValue) {
        // Update header content if needed
      }
    })

    const router = useRouter()

    const toggleTheme = () => {
      themeStore.toggleTheme()
    }

    const handleLogout = async () => {
      await authStore.logout()
      router.push('/')
    }

    return { isLoggedIn, toggleTheme, handleLogout }
  }
}
</script>

<style scoped>
.spacer {
  flex: 1 1 auto;
}
</style>
