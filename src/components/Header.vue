<template>
  <!-- <v-app-bar color="primary" density="compact" :elevation="7"> -->
  <v-app-bar app density="compact" :elevation="7">
    <template v-slot:prepend>
      <v-app-bar-nav-icon
        v-on:click="$router.push('/'), $emit('HandleDrawer')"
      ></v-app-bar-nav-icon>
    </template>
    <v-app-bar-title>Sistema Agrario - {{ PaginaActual }}</v-app-bar-title>

    <v-spacer></v-spacer>

    <template v-slot:append>
      <v-btn text size="x-small" v-on:click="$router.push('/about')">About Us</v-btn>
      <v-btn text size="x-small" v-on:click="$router.push('/documentation')">Documentation</v-btn>
      <v-btn text size="x-small" v-on:click="$router.push('/contact')">Contact Us</v-btn>
      <v-btn text size="x-small" v-on:click="$router.push('/faq')">FAQ</v-btn>

      <v-spacer></v-spacer>

      <!--<div v-if="isLoggedIn" class="spacer"></div>
<v-spacer v-else></v-spacer>-->

      <v-btn v-if="!isLoggedIn" v-on:click="$emit('openLoginModal')">Login</v-btn>
      <v-btn v-if="!isLoggedIn" v-on:click="$emit('openRegisterModal')">Register</v-btn>

      <v-btn v-if="isLoggedIn" size="small" v-on:click="$router.push('/profile')"
        >Mi Info / Hacienda</v-btn
      >

      <v-btn v-if="isLoggedIn" size="small" prepend-icon="mdi-logout" v-on:click="logout"
        >Logout</v-btn
      >
      <v-spacer></v-spacer>

      <v-icon @click="toggleTheme" icon="mdi-brightness-4" />
    </template>
  </v-app-bar>
</template>

<script>
import { computed } from 'vue'
//import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'

export default {
  name: 'AppHeader',
  props: {},
  data() {
    return {
      isDark: false
    }
  },
  methods: {
    toggleTheme() {
      this.isDark = !this.isDark
      const themeName = this.isDark ? 'darkTheme' : 'lightTheme'
      this.$vuetify.theme.global.name = themeName // Update the theme name correctly
    }
  },
  setup() {
    const authStore = useAuthStore()
    //  const menu = ref(false)
    const isLoggedIn = computed(() => authStore.isLoggedIn)

    const logout = () => {
      authStore.logout()
    }
    return { isLoggedIn, logout }

    // return { isLoggedIn, menu, logout }
  }
}
</script>

<style scoped>
.spacer {
  flex: 1 1 auto;
}
</style>
