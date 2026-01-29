<template>
  <div class="notification-bell">
    <v-menu
      v-model="menuOpen"
      :close-on-content-click="false"
      location="bottom end"
      transition="slide-y-transition"
      min-width="320px"
      max-width="400px"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          variant="text"
          :color="unreadCount > 0 ? 'primary' : 'default'"
          class="notification-button"
        >
          <v-icon>mdi-bell</v-icon>
          <v-badge
            v-if="unreadCount > 0"
            :content="unreadCount > 99 ? '99+' : unreadCount"
            color="error"
            floating
            :offset-x="8"
            :offset-y="8"
          />
        </v-btn>
      </template>

      <v-card class="notification-card">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon start>mdi-bell-ring</v-icon>
          <span>Notificaciones</span>
          <v-spacer />
          <v-btn
            v-if="unreadCount > 0"
            size="small"
            variant="text"
            color="primary"
            @click="markAllAsRead"
          >
            Marcar todas como leídas
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-list
          v-if="sortedNotifications.length > 0"
          class="notification-list"
          max-height="400px"
          slim
        >
          <v-list-item
            v-for="notification in sortedNotifications"
            :key="notification.id"
            :class="{ 'unread': !notification.read }"
            class="notification-item"
            @click="handleNotificationClick(notification)"
          >
            <template #prepend>
              <v-avatar
                :color="getTypeColor(notification.type)"
                size="40"
                class="notification-avatar"
              >
                <v-icon :icon="getTypeIcon(notification.type)" />
              </v-avatar>
            </template>

            <v-list-item-title class="notification-title">
              {{ notification.title }}
            </v-list-item-title>

            <v-list-item-subtitle class="notification-message">
              {{ notification.message }}
            </v-list-item-subtitle>

            <v-list-item-subtitle class="notification-timestamp">
              {{ formatTimestamp(notification.timestamp) }}
            </v-list-item-subtitle>

            <template #append>
              <v-btn
                v-if="!notification.read"
                icon
                size="small"
                variant="text"
                @click.stop="markAsRead(notification.id)"
              >
                <v-icon size="16">mdi-check</v-icon>
              </v-btn>
              <v-btn
                icon
                size="small"
                variant="text"
                color="grey"
                @click.stop="removeNotification(notification.id)"
              >
                <v-icon size="16">mdi-close</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

        <v-list v-else class="pa-4">
          <v-list-item>
            <div class="text-center text-grey">
              <v-icon size="48" color="grey">mdi-bell-off</v-icon>
              <p class="mt-2">No hay notificaciones</p>
            </div>
          </v-list-item>
        </v-list>

        <v-divider />

        <v-card-actions class="pa-2">
          <v-btn
            v-if="!canShowBrowserNotifications"
            size="small"
            variant="text"
            color="primary"
            block
            @click="requestPermission"
          >
            <v-icon start>mdi-bell-alert</v-icon>
            Activar notificaciones del navegador
          </v-btn>
          <v-btn
            v-else
            size="small"
            variant="text"
            color="grey"
            block
            @click="clearAll"
          >
            Limpiar todas
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const notificationStore = useNotificationStore()
const menuOpen = ref(false)

const unreadCount = computed(() => notificationStore.unreadCount)
const sortedNotifications = computed(() => notificationStore.sortedNotifications)
const canShowBrowserNotifications = computed(() => notificationStore.canShowBrowserNotifications)

onMounted(() => {
  if (!notificationStore.initialized) {
    notificationStore.init()
  }
})

const handleNotificationClick = (notification) => {
  if (!notification.read) {
    notificationStore.markAsRead(notification.id)
  }
  // Aquí se podría agregar lógica para navegar a una vista específica
  // basada en el tipo de notificación
}

const markAsRead = (id) => {
  notificationStore.markAsRead(id)
}

const markAllAsRead = () => {
  notificationStore.markAllAsRead()
}

const removeNotification = (id) => {
  notificationStore.removeNotification(id)
}

const clearAll = () => {
  notificationStore.clearAll()
  menuOpen.value = false
}

const requestPermission = async () => {
  await notificationStore.requestPermission()
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  try {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: es
    })
  } catch (error) {
    return ''
  }
}

const getTypeColor = (type) => {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  }
  return colors[type] || 'grey'
}

const getTypeIcon = (type) => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  return icons[type] || 'mdi-bell'
}
</script>

<style scoped>
.notification-bell {
  display: inline-block;
}

.notification-button {
  position: relative;
}

.notification-card {
  overflow: hidden;
}

.notification-list {
  overflow-y: auto;
}

.notification-item {
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.notification-item.unread {
  background-color: rgba(25, 118, 210, 0.08);
  border-left: 3px solid rgb(25, 118, 210);
}

.notification-avatar {
  margin-right: 12px;
}

.notification-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 0.875rem;
  margin-bottom: 4px;
  white-space: normal;
  overflow-wrap: break-word;
}

.notification-timestamp {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

/* Dark theme adjustments */
.v-theme--dark .notification-item:hover {
  background-color: rgba(255, 255, 255, 0.04);
}

.v-theme--dark .notification-item.unread {
  background-color: rgba(25, 118, 210, 0.16);
}

.v-theme--dark .notification-timestamp {
  color: rgba(255, 255, 255, 0.6);
}
</style>
