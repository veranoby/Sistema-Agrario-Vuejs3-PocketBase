<template>
  <v-app-bar app density="compact" :elevation="7">
    <template v-slot:prepend>
      <v-app-bar-nav-icon @click="$emit('HandleDrawer')"></v-app-bar-nav-icon>
    </template>
    <v-app-bar-title @click="$router.push('/')" style="cursor: pointer;">
      <span class="hidden sm:inline font-weight-bold mr-1">ConAgri</span>
      <v-icon size="24" color="primary">mdi-leaf</v-icon>
    </v-app-bar-title>

    <v-spacer></v-spacer>

    <template v-slot:append>
      <div class="flex flex-row sm:flex-row text-sm sm:text-base">
        <v-btn
          text
          size="small"
          @click="$router.push('/documentation')"
          class="flex items-center"
        >
          <v-icon class="mr-2" icon="mdi-book"></v-icon>
          <span class="hidden sm:inline">{{ $t('header.documentation') }}</span>
        </v-btn>
        <v-btn text size="small" @click="scrollToContact" class="flex items-center">
          <v-icon class="mr-2" icon="mdi-email"></v-icon>
          <span class="hidden sm:inline">{{ $t('header.contact_us') }}</span>
        </v-btn>
      </div>

      <v-spacer></v-spacer>

      <div class="flex flex-col sm:flex-row">
        <!-- Desktop Button -->
        <v-btn
          variant="flat"
          prepend-icon="mdi-login"
          color="primary"
          v-if="!isLoggedIn"
          @click="$emit('openAuthModal')"
          class="hidden-xs"
        > {{ $t('header.login') }}</v-btn>
        
        <!-- Mobile Icon Button -->
        <v-btn
          icon
          variant="flat"
          color="primary"
          v-if="!isLoggedIn"
          @click="$emit('openAuthModal')"
          class="hidden-sm-and-up"
          size="small"
        >
          <v-icon>mdi-login</v-icon>
        </v-btn>
      </div>
      <v-spacer></v-spacer>

      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn text v-bind="props" class="ml-1 sm:ml-2 px-1 sm:px-2" size="small" style="min-width: 0;">
            <v-icon icon="mdi-web" :class="{'mr-1': true, 'mr-sm-1': true}"></v-icon>
            <span class="text-uppercase hidden-xs">{{ currentLocale }}</span>
            <v-icon icon="mdi-chevron-down" size="x-small"></v-icon>
          </v-btn>
        </template>
        <v-list density="compact" min-width="120">
          <v-list-item
            v-for="lang in languages"
            :key="lang.code"
            @click="setLanguage(lang.code)"
            :active="currentLocale === lang.code"
            color="primary"
          >
            <template v-slot:prepend>
              <v-icon v-if="currentLocale === lang.code" size="small" color="primary">mdi-check</v-icon>
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
        class="ml-1 sm:ml-2"
        :color="currentTheme === 'dark' ? 'yellow' : 'grey'"
      >
        <v-icon>{{ currentTheme === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
      </v-btn>

      <NotificationBell class="ml-1 sm:ml-2" color="white" />

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
          <v-icon v-bind="props" :color="connectionStatus.color" class="ml-1 sm:ml-2">
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

    const scrollToContact = () => {
      if (router.currentRoute.value.path !== '/') {
        router.push('/').then(() => {
          setTimeout(() => {
            const el = document.getElementById('contact-section')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }, 300)
        })
      } else {
        const el = document.getElementById('contact-section')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
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
      isSyncing,
      scrollToContact
    }
  }
}
</script>

<style scoped>
.spacer {
  flex: 1 1 auto;
}
</style>
