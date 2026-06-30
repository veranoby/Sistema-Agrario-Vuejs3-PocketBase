<template>
  <div class="flex flex-col min-h-screen">
    <main class="p-2 md:p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-3 space-y-4">
          <ProfileInfo />
          <PasswordChange />
          <HaciendaInfo v-if="isHaciendaAdmin" />
        </div>
        <div class="space-y-4" v-if="isHaciendaAdmin">
          <PlanManagement />
          <NotificationSettings />
          <HaciendaUserManagement />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'

// Importa los componentes aquí
import ProfileInfo from '@/components/forms/auth/ProfileInfo.vue'
import PasswordChange from '@/components/forms/auth/PasswordChange.vue'
import HaciendaInfo from '@/components/hacienda/HaciendaInfo.vue'
import PlanManagement from '@/components/hacienda/PlanManagement.vue'
import HaciendaUserManagement from '@/components/hacienda/HaciendaUserManagement.vue'
import NotificationSettings from '@/components/hacienda/NotificationSettings.vue'

const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()
const { user } = storeToRefs(authStore)

const { mi_hacienda } = storeToRefs(haciendaStore)

const isHaciendaAdmin = computed(() => {
  return user.value?.role === 'administrador' && user.value?.hacienda === mi_hacienda.value?.id
})
</script>

<style scoped></style>
