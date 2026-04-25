<template>
  <div class="flex flex-col min-h-screen">
    <main class="">
      <div class="grid grid-cols-4 gap-2">
        <div class="col-span-3">
          <ProfileInfo />
          <PasswordChange />
          <HaciendaInfo v-if="isHaciendaAdmin" />
        </div>
        <div class="" v-if="isHaciendaAdmin">
          <PlanManagement />
          <HaciendaUserManagement />
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
import ProfileInfo from '@/components/forms/auth/ProfileInfo.vue'
import PasswordChange from '@/components/forms/auth/PasswordChange.vue'
import HaciendaInfo from '@/components/hacienda/HaciendaInfo.vue'
import PlanManagement from '@/components/hacienda/PlanManagement.vue'
import HaciendaUserManagement from '@/components/hacienda/HaciendaUserManagement.vue'

const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const { user } = storeToRefs(profileStore)

const { mi_hacienda } = storeToRefs(haciendaStore)

const isHaciendaAdmin = computed(() => {
  return user.value?.role === 'administrador' && user.value?.hacienda === mi_hacienda.value?.id
})
</script>

<style scoped></style>
