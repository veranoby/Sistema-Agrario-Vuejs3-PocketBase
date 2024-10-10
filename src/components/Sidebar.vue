<template>
  <v-sheet v-if="isLoggedIn" class="d-flex flex-column" style="height: 90vh">
    <v-list v-if="navigationLinks && navigationLinks.length > 0" lines="two">
      <v-list-item v-for="link in navigationLinks" :key="link.id" :to="link.to" link>
        <template v-slot:prepend>
          <v-icon :icon="link.icon"></v-icon>
        </template>
        <v-list-item-title class="text-sm sm:text-base">{{ link.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
    <v-alert v-else type="error">
      Error: No se pudieron cargar los enlaces de navegación de pocketbase...
    </v-alert>

    <v-spacer></v-spacer>
    <!-- Asegúrate de que este esté aquí para empujar el contenido hacia abajo -->

    <v-divider></v-divider>

    <div class="flex flex-col">
      <v-list>
        <v-list-item v-if="isLoggedIn" @click="$router.push('/profile')" link>
          <template v-slot:prepend>
            <v-icon icon="mdi-account-circle"></v-icon>
          </template>

          <v-list-item-title class="text-sm sm:text-base">Mi Info / Hacienda</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="isLoggedIn" @click="handleLogout" link>
          <template v-slot:prepend>
            <v-icon icon="mdi-logout"></v-icon>
          </template>

          <v-list-item-title class="text-sm sm:text-base">Logout</v-list-item-title>
        </v-list-item>
      </v-list>
    </div>
  </v-sheet>
</template>

<script>
import { computed, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

export default {
  name: 'AppSidebar',
  props: {
    navigationLinks: Array // Array of navigation links objects (see below)
  },
  setup() {
    const authStore = useAuthStore()
    const isLoggedIn = computed(() => authStore.isLoggedIn)

    watch(isLoggedIn, (newValue) => {
      if (newValue) {
        // Refresh sidebar content if needed
      }
    })

    const handleLogout = async () => {
      await authStore.logout()
      // Redirigir o realizar otras acciones necesarias
    }

    return { isLoggedIn, handleLogout }
  }
}
</script>

<style scoped>
.sidebar-wrapper {
  /* Add your sidebar styles here */
}
</style>
