<template>
  <v-app-bar app density="compact" :elevation="7">
    <template v-slot:prepend>
      <v-app-bar-nav-icon @click="$emit('HandleDrawer')"></v-app-bar-nav-icon>
    </template>
    <v-app-bar-title @click="$router.push('/')"
      ><span class="hidden sm:inline"
        >ConAgri <v-icon size="24" color="green">mdi-leaf</v-icon
        ></span
      ></v-app-bar-title
    >

    <v-spacer></v-spacer>

    <template v-slot:append>
      <div class="flex flex-row sm:flex-row text-sm sm:text-base">
        <v-btn text size="small" @click="$router.push('/about')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-information"></v-icon>
          <span class="hidden sm:inline">{{ $t('header.about_us') }}</span>
        </v-btn>
        <v-btn
          text
          size="small"
          @click="$router.push('/documentation')"
          class="flex items-center"
        >
          <v-icon class="mr-2" icon="mdi-book"></v-icon>
          <span class="hidden sm:inline">{{ $t('header.documentation') }}</span>
        </v-btn>
        <v-btn text size="small" @click="$router.push('/contact')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-email"></v-icon>
          <span class="hidden sm:inline">{{ $t('header.contact_us') }}</span>
        </v-btn>
        <v-btn text size="small" @click="$router.push('/faq')" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-help-circle"></v-icon>
          <span class="hidden sm:inline">{{ $t('header.faq') }}</span>
        </v-btn>
      </div>

      <v-spacer></v-spacer>

      <div class="flex flex-col sm:flex-row">
        <v-btn
          variant="flat"
          prepend-icon="mdi-login"
          color="success"
          v-if="!isLoggedIn"
          @click="$emit('openAuthModal')"
        > {{ $t('header.login') }}</v-btn
        >
      </div>
      <v-spacer></v-spacer>

      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props" class="ml-2 px-2" size="small">
            <v-icon start icon="mdi-web"></v-icon>
            <span class="text-uppercase">{{ currentLocale }}</span>
            <v-icon end icon="mdi-chevron-down" size="x-small"></v-icon>
          </v-btn>
        </template>
        <v-list density="compact" min-width="120">
          <v-list-item
            v-for="lang in languages"
            :key="lang.code"
            @click="setLanguage(lang.code)"
            :active="currentLocale === lang.code"
            color="success"
          >
            <template v-slot:prepend>
              <v-icon v-if="currentLocale === lang.code" size="small" color="success">mdi-check</v-icon>
              <v-icon v-else size="small" class="opacity-0">mdi-check</v-icon>
            </template>
            <v-list-item-title>{{ lang.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn
        icon
        size="small"
        @click="toggleTheme"
        class="ml-2"
        :color="currentTheme === 'dark' ? 'yellow' : 'grey'"
      >
        <v-icon>{{ currentTheme === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
      </v-btn>

      <NotificationBell class="ml-2" color="white" />

      <v-chip
        v-if="pendingOperations > 0"
        size="x-small"
        variant="tonal"
        color="warning"
        class="ml-2"
      >
        <v-icon start size="16">mdi-cloud-upload</v-icon>
        {{ pendingOperations }}
        <v-tooltip activator="parent" location="bottom">
          {{ pendingOperations }} operaciones pendientes de sincronizar
        </v-tooltip>
      </v-chip>

      <v-btn
        v-if="pendingTasksCount > 0"
        icon
        size="x-small"
        variant="text"
        class="ml-2"
      >
        <v-badge
          :content="pendingTasksCount > 99 ? '99+' : pendingTasksCount"
          color="warning"
          offset-x="4"
          offset-y="4"
        >
          <v-icon>mdi-calendar-check</v-icon>
        </v-badge>
        <v-tooltip activator="parent" location="bottom">
          {{ pendingTasksCount }} tareas pendientes
        </v-tooltip>
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
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useSyncStore } from '@/stores/sync'
import { useRouter } from 'vue-router'
import NotificationBell from '@/components/NotificationBell.vue'
import { useSchedulerStore } from '@/stores/schedulerStore'

export default {
  name: 'AppHeader',
  components: {
    NotificationBell
  },
  props: {
    PaginaActual: String
  },
  emits: ['HandleDrawer', 'openAuthModal', 'updateSidebarVisibility'],

  setup() {
    const authStore = useAuthStore()
    const themeStore = useThemeStore()
    const syncStore = useSyncStore()
    const schedulerStore = useSchedulerStore()
    const router = useRouter()
    const { locale } = useI18n()

    const currentLocale = computed(() => locale.value)
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' }
    ]

    const setLanguage = (lang) => {
      locale.value = lang
      localStorage.setItem('user-lang', lang)
    }

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

    const pendingOperations = computed(() => syncStore.queue?.length || 0)
    const pendingTasksCount = computed(() => schedulerStore.pendingTasksCount)
    const isSyncing = computed(() => syncStore.syncStatus === 'syncing')

    onMounted(() => {
      if (!schedulerStore.initialized) {
        schedulerStore.init()
      }
    })

    return {
      isLoggedIn,
      toggleTheme,
      handleLogout,
      connectionStatus,
      currentTheme,
      setLanguage,
      currentLocale,
      languages,
      pendingOperations,
      pendingTasksCount,
      isSyncing
    }
  }
}
</script>

<style scoped>
.spacer {
  flex: 1 1 auto;
}
</style>
