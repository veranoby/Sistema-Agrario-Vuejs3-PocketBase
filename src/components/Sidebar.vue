<template>
  <v-sheet v-if="isLoggedIn" class="d-flex flex-column" style="height: 90vh">
    <v-list v-if="groupedLinks && groupedLinks.length > 0" density="compact" nav class="overflow-y-auto">
      <template v-for="group in groupedLinks" :key="group.name">
        <v-list-subheader
          v-if="group.name !== 'General' && group.name !== 'Inicio'"
          class="text-xs font-weight-bold text-uppercase mt-2 mb-1 pl-2 text-primary"
          style="min-height: 24px; line-height: 24px;"
        >
          {{ group.name }}
        </v-list-subheader>
        
        <v-list-item
          v-for="link in group.links"
          :key="link.id"
          :to="link.to"
          link
          :class="{ 'active-link': isActive(link.to), 'vivid-hover': true }"
        >
          <template v-slot:prepend>
            <v-icon :icon="link.icon" size="small"></v-icon>
          </template>
          <v-list-item-title class="text-xs">{{ link.label }}</v-list-item-title>
        </v-list-item>
      </template>
    </v-list>
    <v-alert v-else type="error">
      Error: No se pudieron cargar los enlaces de navegación de pocketbase...
    </v-alert>

    <v-spacer></v-spacer>
    <!-- Asegúrate de que este esté aquí para empujar el contenido hacia abajo -->

    <v-divider></v-divider>

    <div class="flex flex-col">
      <v-list density="compact" nav>
        <v-list-item
          v-if="isLoggedIn && ['administrador', 'operador', 'auditor'].includes(authStore.user?.role)"
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
import { useRoute } from 'vue-router'

export default {
  name: 'AppSidebar',
  props: {
    navigationLinks: Array // Array of navigation links objects (see below)
  },
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const route = useRoute()
    const isLoggedIn = computed(() => authStore.isLoggedIn)

    const isActive = (linkPath) => {
      return route.path.startsWith(linkPath)
    }

    watch(isLoggedIn, (newValue) => {
      if (!newValue) {
        emit('updateSidebarVisibility', false) // Emitir evento para ocultar el sidebar
      }
    })

    const handleLogout = async () => {
      await authStore.logout()
      // Redirigir o realizar otras acciones necesarias
    }

    const groupedLinks = computed(() => {
      if (!props.navigationLinks) return []
      
      const groups = {}
      props.navigationLinks.forEach(link => {
        const groupName = link.group || 'General'
        if (!groups[groupName]) {
          groups[groupName] = []
        }
        groups[groupName].push(link)
      })
      
      // Convert object to array for easier iteration
      return Object.keys(groups).map(key => ({
        name: key,
        links: groups[key]
      }))
    })

    return { 
      isLoggedIn, 
      handleLogout, 
      isActive,
      authStore,
      groupedLinks
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
