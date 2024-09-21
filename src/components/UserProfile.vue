<template>
  <div class="flex flex-col min-h-screen">
    <main class="">
      <div class="grid grid-cols-4 gap-4 p-2 m-2 mt-0">
        <div class="col-span-4 p-2 m-0 pt-0">
          <ProfileInfo />
          <PasswordChange />
        </div>
      </div>

      <div v-if="isHaciendaAdmin">
        <div class="grid grid-cols-4 gap-2 p-2 m-2">
          <div class="col-span-3 p-2">
            <HaciendaInfo />
            <!-- Placeholder for UserManagement component (if user is admin) -->
          </div>
          <div class="mt-2">
            <PlanManagement />
            <br />
            <UserManagement />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'

// Importa los componentes aquí
import ProfileInfo from '@/components/ProfileInfo.vue'
import PasswordChange from '@/components/PasswordChange.vue'
import HaciendaInfo from '@/components/HaciendaInfo.vue'
import PlanManagement from '@/components/PlanManagement.vue'
import UserManagement from '@/components/UserManagement.vue'

const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const { user } = storeToRefs(profileStore)

const { mi_hacienda } = storeToRefs(haciendaStore)

const isHaciendaAdmin = computed(() => {
  return user.value?.role === 'administrador' && user.value?.hacienda === mi_hacienda.value?.id
})
</script>

<style scoped></style>
