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
        :src="avatarUrl"
        alt="Avatar de usuario"
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

  <div v-if="isHaciendaAdmin">
    <div
      class="d-flex justify-space-between align-center"
      style="background-color: #ecf2ff; padding: 16px; border-radius: 12px"
    >
      <h3 class="text-h5 font-bold mb-0">
        Perfil de la Hacienda
        <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1">
          {{ mi_hacienda.name }}
        </v-chip>
      </h3>
      <div class="d-none d-lg-block">
        <img
          :src="avatarHaciendaUrl"
          alt="Avatar de la hacienda"
          style="max-height: 75px"
        /><!-- Ajusta el tamaño de la imagen si es necesario -->
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 p-2 m-2">
      <div class="col-span-2 p-2 m-2">
        <!-- Placeholder for HaciendaInfo component -->
        <HaciendaInfo />
        <!-- Placeholder for UserManagement component (if user is admin) -->
      </div>
      <div>
        <PlanManagement />
        <br />
        <UserManagement />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import placeholderUser from '@/assets/placeholder-user.png' // Importar la imagen
import { pb } from '@/utils/pocketbase' // Asegúrate de importar PocketBase

// Importa los componentes aquí
import ProfileInfo from '@/components/ProfileInfo.vue'
import PasswordChange from '@/components/PasswordChange.vue'
import AvatarUpload from '@/components/AvatarUpload.vue'
import HaciendaInfo from '@/components/HaciendaInfo.vue'
import PlanManagement from '@/components/PlanManagement.vue'
import UserManagement from '@/components/UserManagement.vue'

const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const { user } = storeToRefs(profileStore)

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const userRole = computed(() => user.value?.role || '')

const avatarUrl = computed(() => {
  return user.value?.avatar ? pb.getFileUrl(user.value, user.value.avatar) : placeholderUser // Usar la imagen importada como placeholder
})

const isHaciendaAdmin = computed(() => {
  return user.value?.role === 'administrador' && user.value?.hacienda === mi_hacienda.value?.id
})
</script>
