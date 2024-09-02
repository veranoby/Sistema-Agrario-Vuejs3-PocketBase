<template>
  <v-form @submit.prevent="saveProfileChanges">
    <div class="grid grid-cols-2 gap-2">
      <h2 class="text-xl font-bold">
        Mi Perfil
        <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1">
          {{ userRole }}
        </v-chip>
      </h2>
      <div class="align-top">
        <v-text-field
          v-model="email"
          variant="solo"
          disabled
          label="Email"
          density="compact"
          type="email"
          class="compact-form-2"
        ></v-text-field>
      </div>
    </div>

    <div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <v-text-field
          v-model="name"
          label="Nombre"
          variant="outlined"
          density="compact"
          class="compact-form-2"
        ></v-text-field>
        <v-text-field
          v-model="lastname"
          label="Apellido"
          variant="outlined"
          density="compact"
          class="compact-form-2"
        ></v-text-field>
      </div>
      <v-text-field
        v-model="username"
        label="Nombre de Usuario"
        variant="outlined"
        density="compact"
        class="compact-form-2"
      ></v-text-field>

      <v-textarea
        v-model="info"
        label="Informacion personal"
        variant="outlined"
        density="compact"
        class="compact-form-2"
      ></v-textarea>
      <div class="text-left">
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          color="green-lighten-3"
          type="submit"
          :loading="isLoading"
        >
          Guardar Cambios de Perfil
        </v-btn>
      </div>
    </div>
  </v-form>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

export default defineComponent({
  name: 'ProfileInfo',
  setup() {
    const profileStore = useProfileStore()
    const snackbarStore = useSnackbarStore()
    const { user } = storeToRefs(profileStore)

    const name = ref(user.value.name)
    const lastname = ref(user.value.lastname)
    const username = ref(user.value.username)
    const email = ref(user.value.email)
    const info = ref(user.value.info)
    const isLoading = ref(false)

    const userRole = computed(() => user.value.role)

    const saveProfileChanges = async () => {
      isLoading.value = true
      try {
        await profileStore.updateProfile({
          name: name.value,
          lastname: lastname.value,
          username: username.value,
          info: info.value
        })
        snackbarStore.showSnackbar('Profile updated successfully', 'success')
      } catch (error) {
        snackbarStore.showSnackbar('Failed to update profile', 'error')
      } finally {
        isLoading.value = false
      }
    }

    return {
      name,
      lastname,
      username,
      email,
      info,
      userRole,
      isLoading,
      saveProfileChanges
    }
  }
})
</script>
