<template>
  <div class="status-bar" :class="{ 'offline': !isOnline, 'syncing': isSyncing }">
    <div class="status-indicator">
      <span v-if="isOnline && !isSyncing" class="online">✓ Online</span>
      <span v-else-if="isOnline && isSyncing" class="syncing">↻ Sincronizando...</span>
      <span v-else class="offline">✗ Offline</span>
    </div>
    <div v-if="pendingOperations > 0" class="pending-count">
      {{ pendingOperations }} operaciones pendientes
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSyncStore } from '@/stores/syncStore'

const syncStore = useSyncStore()

const isOnline = computed(() => syncStore.isOnline)
const isSyncing = computed(() => syncStore.syncStatus === 'syncing')
const pendingOperations = computed(() => syncStore.queue.queue.length)
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  font-size: 14px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.status-bar.offline {
  background-color: #f44336;
}

.status-bar.syncing {
  background-color: #ff9800;
}

.pending-count {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
}
</style>