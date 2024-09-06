<template>
  <br />
  <div
    class="d-flex justify-space-between align-center"
    style="background-color: #ecf2ff; padding: 16px; border-radius: 12px"
  >
    <h3 class="text-h5 font-bold mb-0">
      Perfil Social
      <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1">
        {{ userRole }}
      </v-chip>
    </h3>
    <div class="d-none d-lg-block">
      <img
        src="https://modernize-vuejs.adminmart.com/assets/ChatBc-DjKi8DA-.png"
        alt="breadcrumb"
        style="max-height: 75px"
      /><!-- Ajusta el tamaño de la imagen si es necesario -->
    </div>
  </div>

  <div class="grid grid-cols-3 gap-4 p-2 m-2">
    <div class="col-span-2 p-2 m-2">
      <ProfileInfo />
      <!-- Placeholder for PasswordChange component -->
      <PasswordChange />
    </div>
    <!-- Placeholder for AvatarUpload component -->
    <AvatarUpload />
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
    const userRole = computed(() => user.value?.role || '')

    return {
      user,
      mi_hacienda,
      currentPlan,
      isAdmin,
      userRole
    }
  }
})
</script>
