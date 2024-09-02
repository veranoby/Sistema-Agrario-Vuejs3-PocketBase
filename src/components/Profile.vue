<template>
  <div class="container mx-auto py-12 px-4 md:px-6 lg:px-8">
    <div class="grid grid-cols-1 rounded-lg border-4 px-2 py-2">
      <div class="grid gap-4 grid-cols-2 px-2 py-2">
        <ProfileInfo />
        <!-- Placeholder for AvatarUpload component -->
        <AvatarUpload />
      </div>
      <!-- Placeholder for PasswordChange component -->
      <PasswordChange />
    </div>

    <div
      v-if="isAdmin"
      class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 rounded-lg border-4 px-4 py-4"
    >
      <!-- Placeholder for HaciendaInfo component -->
      <HaciendaInfo />
      <!-- Placeholder for UserManagement component (if user is admin) -->
      <div>
        <PlanManagement />
        <br />
        <UserManagement />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { usePlanStore } from '@/stores/planStore'

//components
import ProfileInfo from './ProfileInfo.vue'
import AvatarUpload from './AvatarUpload.vue'
import PasswordChange from './PasswordChange.vue'

import HaciendaInfo from './HaciendaInfo.vue'
import UserManagement from './UserManagement.vue'
import PlanManagement from './PlanManagement.vue'

export default defineComponent({
  name: 'ProfileComponent',
  components: {
    ProfileInfo,
    AvatarUpload,
    PasswordChange,
    HaciendaInfo,
    UserManagement,
    PlanManagement
  },
  setup() {
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const planStore = usePlanStore()

    const { user } = storeToRefs(profileStore)
    const { mi_hacienda } = storeToRefs(haciendaStore)
    const { currentPlan } = storeToRefs(planStore)

    const isAdmin = computed(() => user.value?.role === 'administrador')

    return {
      user,
      mi_hacienda,
      currentPlan,
      isAdmin
    }
  }
})
</script>
