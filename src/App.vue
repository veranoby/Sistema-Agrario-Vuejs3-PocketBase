<template>
  <v-app>
    <AuthModal
      v-model:isOpen="showAuthModal"
      :initialTab="authModalTab"
      @loginSuccess="handleLoginSuccess"
    />

    <header-comp @openAuthModal="handleOpenAuthModal" @HandleDrawer="mini = !mini"></header-comp>

    <v-navigation-drawer v-if="isLoggedIn" expand-on-hover rail v-model="mini" theme="dark">
      <sidebar-comp :navigation-links="navigationLinks"></sidebar-comp>
    </v-navigation-drawer>

    <v-main> <router-view></router-view> </v-main>

    <Snackbar />
  </v-app>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue'
import HeaderComp from '@/components/Header.vue'
import SidebarComp from '@/components/Sidebar.vue'
import AuthModal from '@/components/AuthModal.vue'
import Snackbar from '@/components/SnackbarComponent.vue'
import { useAuthStore } from '@/stores/authStore'

import { useThemeStore } from '@/stores/themeStore'
import { useRouter } from 'vue-router'

export default {
  components: {
    Snackbar,
    HeaderComp,
    SidebarComp,
    AuthModal
  },

  setup() {
    const authStore = useAuthStore()
    const themeStore = useThemeStore()
    const router = useRouter()
    const isLoggedIn = computed(() => authStore.isLoggedIn)
    const navigationLinks = ref([]) // Populate this with your navigation links
    const mini = ref(true)
    const showAuthModal = ref(false)
    const authModalTab = ref('login')
    const currentTheme = computed(() => themeStore.currentTheme)

    const handleOpenAuthModal = (tab) => {
      authModalTab.value = tab
      showAuthModal.value = true
    }

    const handleLoginSuccess = () => {
      showAuthModal.value = false
      // Update the sidebar and login button here
      navigationLinks.value = [
        { id: 1, to: '/dashboard', label: 'Dashboard', icon: 'mdi-view-dashboard' },
        { id: 2, to: '/siembras', label: 'Siembras', icon: 'mdi-sprout' },
        { id: 3, to: '/zonas', label: 'Zonas', icon: 'mdi-map-marker' },
        { id: 4, to: '/actividades', label: 'Actividades', icon: 'mdi-map-info' }
        // Add more navigation links as needed
      ]
    }

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

    router.beforeEach((to, from, next) => {
      if (to.matched.some((record) => record.meta.requiresAuth) && !isLoggedIn.value) {
        handleOpenAuthModal('login')
      } else {
        next()
      }
    })

    return {
      isLoggedIn,
      navigationLinks,
      mini,
      showAuthModal,
      authModalTab,
      handleOpenAuthModal,
      handleLoginSuccess,
      currentTheme
    }
  }
}
</script>
