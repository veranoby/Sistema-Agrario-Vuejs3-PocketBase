<template>
  <div class="status-bar" :class="{ 'offline': !isOnline, 'syncing': isSyncing }">
    <div class="status-left">
      <!-- Conexión -->
      <div class="status-indicator">
        <span v-if="isOnline && !isSyncing" class="online">
          <v-icon size="small" start>mdi-check-circle</v-icon>
          Online
        </span>
        <span v-else-if="isOnline && isSyncing" class="syncing">
          <v-icon size="small" start>mdi-sync</v-icon>
          Sincronizando...
        </span>
        <span v-else class="offline">
          <v-icon size="small" start>mdi-alert-circle</v-icon>
          Offline
        </span>
      </div>

      <!-- Operaciones pendientes -->
      <v-chip
        v-if="pendingOperations > 0"
        size="small"
        color="warning"
        variant="tonal"
        class="ml-2"
      >
        <v-icon start size="small">mdi-cloud-upload</v-icon>
        {{ pendingOperations }} pendientes
      </v-chip>
    </div>

    <div class="status-right">
      <!-- Scheduler Status -->
      <v-chip
        size="small"
        :color="schedulerColor"
        variant="tonal"
        class="scheduler-chip"
      >
        <v-icon start size="small">{{ schedulerIcon }}</v-icon>
        {{ schedulerText }}
      </v-chip>

      <!-- Tareas Pendientes -->
      <v-btn
        v-if="pendingTasksCount > 0"
        icon
        size="small"
        variant="text"
        class="ml-2 pending-tasks-btn"
      >
        <v-icon>mdi-calendar-check</v-icon>
        <v-badge
          :content="pendingTasksCount > 99 ? '99+' : pendingTasksCount"
          color="warning"
          floating
        />
      </v-btn>

      <!-- Notification Bell -->
      <NotificationBell class="ml-2" />
    </div>
  </div>
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
const pendingOperations = computed(() => syncStore.queue.queue.length)

// Scheduler state
const schedulerText = computed(() => schedulerStore.statusText)
const schedulerColor = computed(() => schedulerStore.statusColor)
const schedulerIcon = computed(() => schedulerStore.statusIcon)

// Tareas pendientes desde schedulerStore
const pendingTasksCount = computed(() => schedulerStore.pendingTasksCount)

onMounted(() => {
  // Inicializar schedulerStore si no está inicializado
  if (!schedulerStore.initialized) {
    schedulerStore.init()
  }
})
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #4CAF50;
  background: linear-gradient(to bottom, white, #4CAF50, #4CAF50, white);
  color: white;
  font-size: 14px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  min-height: 48px;
}

.status-bar.offline {
  background-color: #f44336;
  background: linear-gradient(to bottom, white, #f44336, #f44336, white);


}

.status-bar.syncing {
  background-color: #ff9800;
  background: linear-gradient(to bottom, white, #ff9800, #ff9800, white);
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-indicator .online {
  display: flex;
  align-items: center;
}

.status-indicator .syncing {
  display: flex;
  align-items: center;
}

.status-indicator .offline {
  display: flex;
  align-items: center;
}

.scheduler-chip {
  font-weight: 600;
}

.pending-tasks-btn {
  color: white;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .status-bar {
    padding: 6px 12px;
    font-size: 12px;
    min-height: 44px;
  }

  .status-left,
  .status-right {
    gap: 4px;
  }
}
</style>
