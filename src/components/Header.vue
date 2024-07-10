<template>
  <v-app-bar app density="compact" :elevation="7">
    <template v-slot:prepend>
      <v-app-bar-nav-icon @click="$router.push('/'), $emit('HandleDrawer')"></v-app-bar-nav-icon>
    </template>
    <v-app-bar-title
      >Agro Assist <v-icon size="24" color="green">mdi-leaf</v-icon>
      {{ PaginaActual }}</v-app-bar-title
    >

    <v-spacer></v-spacer>

    <template v-slot:append>
      <v-btn text size="x-small" @click="$router.push('/about')">Quienes Somos</v-btn>
      <v-btn text size="x-small" @click="$router.push('/documentation')">Documentacion</v-btn>
      <v-btn text size="x-small" @click="$router.push('/contact')">Contactenos</v-btn>
      <v-btn text size="x-small" @click="$router.push('/faq')">FAQ</v-btn>

      <v-spacer></v-spacer>

      <v-btn size="small" variant="tonal" v-if="!isLoggedIn" @click="$emit('openAuthModal')"
        >INGRESAR</v-btn
      >

      <v-btn v-if="isLoggedIn" size="small" @click="$router.push('/profile')">
        Mi Info / Hacienda
      </v-btn>

      <v-btn v-if="isLoggedIn" size="small" prepend-icon="mdi-logout" @click="logout">
        Logout
      </v-btn>
      <v-spacer></v-spacer>

      <v-icon @click="toggleTheme" icon="mdi-brightness-4" />
    </template>
  </v-app-bar>
</template>

<script>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'

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

    const toggleTheme = () => {
      themeStore.toggleTheme()
    }

    const logout = () => {
      authStore.logout()
    }

    return { isLoggedIn, toggleTheme, logout }
  }
}
</script>

<style scoped>
.spacer {
  flex: 1 1 auto;
}
</style>
