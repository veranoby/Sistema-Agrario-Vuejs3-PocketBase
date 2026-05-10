<template>
  <v-sheet v-if="isLoggedIn" class="d-flex flex-column" style="height: 90vh">
    <v-list v-if="filteredNavigationLinks && filteredNavigationLinks.length > 0" lines="two">
      <v-list-item
        v-for="link in filteredNavigationLinks"
        :key="link.id"
        :to="link.to"
        link
        :class="{ 'active-link': isActive(link.to), 'vivid-hover': true }"
      >
        <template v-slot:prepend>
          <v-icon :icon="link.icon"></v-icon>
        </template>
        <v-list-item-title class="text-xs">{{ link.label }}</v-list-item-title>
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
        <v-list-item
          v-if="isLoggedIn && authStore.user?.role !== 'superadmin'"
          @click="$router.push('/profile')"
          link
          :class="{ 'active-link': isActive('/profile'), 'vivid-hover': true }"
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-account-circle"></v-icon>
          </template>

          <v-list-item-title class="text-xs"> {{ $t('sidebar.profile_hacienda') }} </v-list-item-title>
        </v-list-item>

        <v-list-item v-if="isLoggedIn" @click="handleLogout" link class="vivid-hover">
          <template v-slot:prepend>
            <v-icon icon="mdi-logout"></v-icon>
          </template>

          <v-list-item-title class="text-xs"> {{ $t('sidebar.logout') }} </v-list-item-title>
        </v-list-item>
      </v-list>
    </div>
  </v-sheet>
</template>

<script>
import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useRoute } from 'vue-router'

// Module mapping for navigation links
const MODULE_MAP = {
  'Finanzas': 'finanzas',
  'Recordatorios': 'recordatorios'
}

export default {
  name: 'AppSidebar',
  props: {
    navigationLinks: Array // Array of navigation links objects (see below)
  },
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const haciendaStore = useHaciendaStore()
    const route = useRoute()
    const isLoggedIn = computed(() => authStore.isLoggedIn)

    const isActive = (linkPath) => {
      return route.path.startsWith(linkPath)
    }

    // Filter navigation links based on module access
    const filteredNavigationLinks = computed(() => {
      if (!props.navigationLinks) return []
      
      return props.navigationLinks.filter(link => {
        // Check if link has associated module
        const moduleName = MODULE_MAP[link.label]
        
        // If no module mapping, show link (core feature)
        if (!moduleName) return true
        
        // Check if module is active for current hacienda
        return haciendaStore.isModuleActive(moduleName)
      })
    })

    watch(isLoggedIn, (newValue) => {
      if (!newValue) {
        emit('updateSidebarVisibility', false) // Emitir evento para ocultar el sidebar
      }
    })

    const handleLogout = async () => {
      await authStore.logout()
      // Redirigir o realizar otras acciones necesarias
    }

    return { 
      isLoggedIn, 
      handleLogout, 
      isActive,
      filteredNavigationLinks,
      authStore
    }
  }
}
</script>

<style scoped>
.sidebar-wrapper {
  /* Add your sidebar styles here */
}

.active-link {
  background-color: white !important;
  color: black !important;
  border-radius: 4px;
  margin: 2px;
}

.active-link .v-icon {
  color: black !important;
}

.vivid-hover:hover {
  background-color: #4caf50 !important; /* Verde más intenso */
  color: white !important;
  transition: background-color 0.3s ease;
}

.vivid-hover:hover .v-icon {
  color: white !important;
}
</style>
