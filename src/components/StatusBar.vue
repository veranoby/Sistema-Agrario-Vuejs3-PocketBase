<template>
  <v-app-bar
    flat
    density="compact"
    :color="statusBgColor"
    class="border-b transition-colors duration-300"
    height="48"
  >
    <v-container fluid class="flex items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <!-- Conexión -->
        <div class="flex items-center">
          <v-chip
            size="small"
            variant="flat"
            :color="statusChipColor"
            class="font-weight-bold"
          >
            <v-icon start size="16">{{ statusIcon }}</v-icon>
            <span class="hidden sm:inline">{{ statusText }}</span>
          </v-chip>
        </div>

        <!-- Operaciones pendientes -->
        <v-chip
          v-if="pendingOperations > 0"
          size="small"
          color="white"
          variant="tonal"
          class="font-weight-bold"
        >
          <v-icon start size="16">mdi-cloud-upload</v-icon>
          {{ pendingOperations }}
        </v-chip>
      </div>

      <div class="flex items-center gap-2">
        <!-- Scheduler Status -->
        <v-chip
          size="small"
          :color="schedulerColor"
          variant="flat"
          class="font-weight-bold hidden xs:flex"
        >
          <v-icon start size="16">{{ schedulerIcon }}</v-icon>
          {{ schedulerText }}
        </v-chip>

        <!-- Tareas Pendientes -->
        <v-btn
          v-if="pendingTasksCount > 0"
          icon
          size="small"
          variant="text"
          color="white"
        >
          <v-badge
            :content="pendingTasksCount > 99 ? '99+' : pendingTasksCount"
            color="warning"
            offset-x="4"
            offset-y="4"
          >
            <v-icon>mdi-calendar-check</v-icon>
          </v-badge>
        </v-btn>

        <!-- Notification Bell -->
        <NotificationBell color="white" />
      </div>
    </v-container>
  </v-app-bar>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useSyncStore } from '@/stores/sync'
import { useSchedulerStore } from '@/stores/schedulerStore'
import NotificationBell from '@/components/NotificationBell.vue'

const syncStore = useSyncStore()
const schedulerStore = useSchedulerStore()

const isOnline = computed(() => syncStore.isOnline)
const isSyncing = computed(() => syncStore.syncStatus === 'syncing')
const pendingOperations = computed(() => syncStore.queue?.length || 0)

const statusBgColor = computed(() => {
  if (!isOnline.value) return 'error'
  if (isSyncing.value) return 'warning'
  return 'success'
})

const statusChipColor = computed(() => 'rgba(255, 255, 255, 0.2)')

const statusIcon = computed(() => {
  if (!isOnline.value) return 'mdi-alert-circle'
  if (isSyncing.value) return 'mdi-sync'
  return 'mdi-check-circle'
})

const statusText = computed(() => {
  if (!isOnline.value) return 'Offline'
  if (isSyncing.value) return 'Sincronizando...'
  return 'En línea'
})

// Scheduler state
const schedulerText = computed(() => schedulerStore.statusText)
const schedulerColor = computed(() => schedulerStore.statusColor)
const schedulerIcon = computed(() => schedulerStore.statusIcon)

const pendingTasksCount = computed(() => schedulerStore.pendingTasksCount)

onMounted(() => {
  if (!schedulerStore.initialized) {
    schedulerStore.init()
  }
})
</script>

<style scoped>
/* Scoped styles removed in favor of v-app-bar and Tailwind utility classes */
</style>

