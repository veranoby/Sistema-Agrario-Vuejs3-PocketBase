<template>
  <v-sheet v-if="isLoggedIn">
    <v-list>
      <v-list-item to="/dashboard" link>
        <v-list-item-title>Dashboard</v-list-item-title>
      </v-list-item>
    </v-list>
    <v-list v-if="navigationLinks && navigationLinks.length > 0">
      <v-list-item v-for="link in navigationLinks" :key="link.id" :to="link.to" link>
        <v-list-item-title>{{ link.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
    <v-alert v-else type="error"> Error: Failed to load pocketbase navigation links... </v-alert>
  </v-sheet>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

export default {
  name: 'AppSidebar',
  props: {
    navigationLinks: Array // Array of navigation links objects (see below)
  },
  setup() {
    const authStore = useAuthStore()
    const menu = ref(false)
    const isLoggedIn = computed(() => authStore.isLoggedIn)

    watch(isLoggedIn, (newValue) => {
      if (newValue) {
        // Refresh sidebar content if needed
      }
    })

    return { isLoggedIn, menu }
  }
}
</script>

<style scoped>
.sidebar-wrapper {
  /* Add your sidebar styles here */
}
</style>
