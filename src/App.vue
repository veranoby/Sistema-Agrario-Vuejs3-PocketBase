<template>
  <v-app>
    <header-comp
      @openLoginModal="handleOpenLoginModal"
      @openRegisterModal="handleOpenRegisterModal"
      @HandleDrawer="mini = !mini"
    ></header-comp>
    <LoginModal
      v-if="showLoginModal"
      :isOpen="showLoginModal"
      @update:isOpen="showLoginModal = $event"
    />
    <RegisterModal
      v-if="showRegisterModal"
      :isOpen="showRegisterModal"
      @update:isOpen="showRegisterModal = $event"
    />
    <v-navigation-drawer v-if="isLoggedIn" expand-on-hover rail v-model="mini" theme="dark">
      <sidebar-comp :navigation-links="navigationLinks"></sidebar-comp>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <!--      <v-content>-->
        <content-area-comp></content-area-comp>
        <!--      </v-content> -->
      </v-container>
    </v-main>
    <Snackbar />
  </v-app>
</template>

<script>
import { computed, ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import HeaderComp from '@/components/Header.vue' // Assuming Header.vue is in the components folder
import SidebarComp from '@/components/Sidebar.vue' // Assuming Sidebar.vue is in the components folder
import ContentAreaComp from '@/components/ContentArea.vue' // Assuming ContentArea.vue is in the components folder
import LoginModal from '@/components/LoginModal.vue' // Register LoginModal component
import RegisterModal from '@/components/RegisterModal.vue' // Register LoginModal component
import Snackbar from '@/components/SnackbarComponent.vue' // Register LoginModal component

import { useAuthStore } from '@/stores/authStore' // Using the root directory alias (`@`)

// Define routes (without data fetching for now)
const routes = [
  { path: '/', component: () => import('@/components/LandingPage.vue') }, // Lazy loading
  { path: '/login', component: () => import('@/components/LoginModal.vue') }, // Lazy loading
  { path: '/register', component: () => import('@/components/RegisterModal.vue') }, // Lazy loading
  {
    path: '/dashboard',
    component: () => import('@/components/Dashboard.vue'), // Lazy loading
    children: [
      { path: '', redirect: '/dashboard/siembras' }, // Redirect to default section
      { path: 'siembras', component: () => import('./components/Siembras.vue') }, // Lazy loading
      { path: 'hacienda', component: () => import('./components/Hacienda.vue') } // Lazy loading
      // ... Add more nested routes for other sections
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default {
  components: {
    Snackbar,
    HeaderComp,
    SidebarComp,
    ContentAreaComp,
    LoginModal, // Add LoginModal to components
    RegisterModal // Add RegisterModal to components
  },
  data() {
    return {
      showLoginModal: false,
      showRegisterModal: false
    }
  },

  methods: {
    handleOpenLoginModal() {
      this.showLoginModal = true
    },
    handleOpenRegisterModal() {
      this.showRegisterModal = true
    }
  },
  setup() {
    const authStore = useAuthStore()
    const isLoggedIn = computed(() => authStore.isLoggedIn)
    const navigationLinks = ref([]) // Placeholder for navigation links (populated later)
    const mini = ref(true) // For controlling sidebar visibility

    router.beforeEach((to, from, next) => {
      // Reset login modal visibility on route changes
      this.showLoginModal = false
      this.showRegisterModal = false

      next()
    })

    return {
      isLoggedIn,
      navigationLinks,
      mini
    }
  }
}
</script>

<style>
/* Add your global styles here */
</style>
