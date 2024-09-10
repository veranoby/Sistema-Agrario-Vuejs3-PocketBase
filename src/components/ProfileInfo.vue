<template>
  <!-- Visualización de la información del perfil ALTERNA-->

  <div class="flex">
    <div class="flex-1 pr-4">
      <div class="mb-2">
        <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1"
          ><v-icon size="x-large" class="mr-2">mdi-account-circle</v-icon>
          {{ user.username }}
        </v-chip>
        {{ user.name }} {{ user.lastname }}
      </div>
      <div>
        <v-icon class="ml-4 mr-1">mdi-email</v-icon>
        {{ user.email }}
      </div>
    </div>

    <div class="flex-1">
      <div class="mb-2">
        <v-icon class="mr-2">mdi-information</v-icon>

        Mi Info
      </div>
      <p class="text-xs">{{ user.info }}</p>
    </div>
  </div>
  <br />
  <v-btn
    class="w-full p-2"
    variant="outlined"
    rounded="lg"
    color="green-lighten-1"
    prepend-icon="mdi-pencil"
    @click="openDialog"
  >
    Editar Perfil
  </v-btn>
  <br /><br />

  <!-- Diálogo para editar el perfil -->
  <v-dialog v-model="dialogOpen" max-width="600px">
    <v-card>
      <v-form @submit.prevent="saveProfileChanges">
        <v-card-title>
          <h2 class="text-xl font-bold mt-2">
            Editar Perfil
            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1">
              {{ userRole }}
            </v-chip>
          </h2>
          <br
        /></v-card-title>
        <v-card-text>
          <div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <v-text-field
                v-model="name"
                label="Nombre"
                variant="outlined"
                density="compact"
                class="compact-form"
              ></v-text-field>
              <v-text-field
                v-model="lastname"
                label="Apellido"
                variant="outlined"
                density="compact"
                class="compact-form"
              ></v-text-field>
              <v-text-field
                v-model="username"
                label="Nombre de Usuario"
                variant="outlined"
                density="compact"
                class="compact-form"
              ></v-text-field>
              <v-text-field
                v-model="email"
                variant="solo"
                disabled
                label="Email"
                density="compact"
                type="email"
                class="compact-form"
              ></v-text-field>
            </div>

            <v-textarea
              v-model="info"
              label="Informacion personal"
              variant="outlined"
              density="compact"
              class="compact-form"
            ></v-textarea>
          </div>
        </v-card-text>
        <v-card-actions>
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
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="dialogOpen = false"
          >
            Cancelar
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
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

    const name = ref('')
    const lastname = ref('')
    const username = ref('')
    const email = ref('')
    const info = ref('')
    const isLoading = ref(false)

    const userRole = computed(() => user.value?.role || '')

    const dialogOpen = ref(false)

    const openDialog = () => {
      if (user.value) {
        name.value = user.value.name
        lastname.value = user.value.lastname
        username.value = user.value.username
        email.value = user.value.email
        info.value = user.value.info
      }
      dialogOpen.value = true
    }

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
        dialogOpen.value = false
      } catch (error) {
        snackbarStore.showSnackbar('Failed to update profile', 'error')
      } finally {
        isLoading.value = false
      }
    }

    return {
      user,
      name,
      lastname,
      username,
      email,
      info,
      userRole,
      isLoading,
      saveProfileChanges,
      dialogOpen,
      openDialog
    }
  }
})
</script>
