<template>
  <v-sheet v-if="isLoggedIn">
    <v-list class="d-flex flex-wrap" v-if="navigationLinks && navigationLinks.length > 0">
      <v-list-item v-for="link in navigationLinks" :key="link.id">
        <v-list-item-link :to="link.to">{{ link.label }}</v-list-item-link>
      </v-list-item>
    </v-list>
    <v-alert v-else type="error" style="margin: 10px">
      Error: Failed to load navigation links.
    </v-alert>
  </v-sheet>
</template>

<script>
import { ref, computed } from 'vue'
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

    return { isLoggedIn, menu }
  }
}
</script>

<style scoped>
.sidebar-wrapper {
  /* Add your sidebar styles here */
}
</style>
