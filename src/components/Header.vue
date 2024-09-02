<template>
  <v-app-bar app density="compact" :elevation="7">
    <template v-slot:prepend>
      <v-app-bar-nav-icon @click="$emit('HandleDrawer')"></v-app-bar-nav-icon>
    </template>
    <v-app-bar-title @click="$router.push('/')"
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

      <v-btn
        size="small"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-login"
        color="grey-lighten-2"
        class="mx-2"
        v-if="!isLoggedIn"
        @click="$emit('openAuthModal')"
        >INGRESAR</v-btn
      >

      <v-btn
        v-if="isLoggedIn"
        size="small"
        variant="flat"
        rounded="lg"
        color="grey-lighten-2"
        prepend-icon="mdi-user"
        class="mx-2"
        @click="$router.push('/profile')"
      >
        Mi Info / Hacienda
      </v-btn>

      <v-btn
        v-if="isLoggedIn"
        size="small"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-logout"
        color="grey-lighten-2"
        @click="handleLogout"
        class="mx-2"
      >
        Logout
      </v-btn>
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
