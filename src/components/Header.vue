<template>
  <v-app-bar app density="compact" :elevation="7">
    <template v-slot:prepend>
      <v-app-bar-nav-icon @click="$emit('HandleDrawer')"></v-app-bar-nav-icon>
    </template>
    <v-app-bar-title @click="$router.push('/')"
      ><span class="hidden sm:inline"
        >Agro Assist <v-icon size="24" color="green">mdi-leaf</v-icon
        ><!-- {{ PaginaActual }} --></span
      ></v-app-bar-title
    >

    <v-spacer></v-spacer>

    <template v-slot:append>
      <div class="flex flex-row sm:flex-row text-sm sm:text-base">
        <v-btn text size="x-small" @click="$router.push('/about')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-information"></v-icon>
          <span class="hidden sm:inline">Quienes Somos</span>
        </v-btn>
        <v-btn
          text
          size="x-small"
          @click="$router.push('/documentation')"
          class="flex items-center"
        >
          <v-icon class="mr-2" icon="mdi-book"></v-icon>
          <span class="hidden sm:inline">Documentacion</span>
        </v-btn>
        <v-btn text size="x-small" @click="$router.push('/contact')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-email"></v-icon>
          <span class="hidden sm:inline">Contactenos</span>
        </v-btn>
        <v-btn text size="x-small" @click="$router.push('/faq')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-help-circle"></v-icon>
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
          color="success"
          class="mx-2"
          v-if="!isLoggedIn"
          @click="$emit('openAuthModal')"
        >
          <span class="text-xs sm:text-sm">INGRESAR</span></v-btn
        >
      </div>
      <v-spacer></v-spacer>

      <v-btn
        icon
        size="small"
        @click="toggleTheme"
        class="ml-2"
        :color="currentTheme === 'dark' ? 'yellow' : 'grey'"
      >
        <v-icon>{{ currentTheme === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
      </v-btn>

      <v-tooltip bottom>
        <template v-slot:activator="{ props }">
          <v-icon v-bind="props" :color="connectionStatus.color" class="ml-2">
            {{ connectionStatus.icon }}
          </v-icon>
        </template>
        {{ connectionStatus.text }}
      </v-tooltip>
    </template>
  </v-app-bar>
</template>

<script>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { useSyncStore } from '@/stores/syncStore'
import { useRouter } from 'vue-router'

export default {
  name: 'AppHeader',
  props: {
    PaginaActual: String
  },
  emits: ['HandleDrawer', 'openAuthModal', 'updateSidebarVisibility'],

  setup() {
    const authStore = useAuthStore()
    const themeStore = useThemeStore()
    const syncStore = useSyncStore()
    const router = useRouter()

    const isLoggedIn = computed(() => authStore.isLoggedIn)
    const currentTheme = computed(() => themeStore.currentTheme)

    const toggleTheme = () => {
      themeStore.toggleTheme()
    }

    const handleLogout = async () => {
      await authStore.logout()
      router.push('/')
      this.$emit('updateSidebarVisibility', false)
    }

    const connectionStatus = computed(() => ({
      color: syncStore.isOnline ? 'success' : 'error',
      icon: syncStore.isOnline ? 'mdi-wifi' : 'mdi-wifi-off',
      text: syncStore.isOnline ? 'Conectado' : 'Sin conexión'
    }))

    return {
      isLoggedIn,
      toggleTheme,
      handleLogout,
      connectionStatus,
      currentTheme
    }
  }
}
</script>

<style scoped>
.spacer {
  flex: 1 1 auto;
}
</style>
