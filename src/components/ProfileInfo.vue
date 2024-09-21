<template>
  <div class="bg-background shadow-sm mb-4">
    <div class="profile-container">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="profile-title">
            Perfil Social
            <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
              {{ userRole }}
            </v-chip>
          </h3>
          <div class="mt-0 text-xs">
            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1 mb-2 mt-2">
              <v-icon size="x-large" class="mr-2">mdi-account-circle</v-icon>
              {{ user?.username }}
            </v-chip>
            {{ user?.name }} {{ user?.lastname }}

            <v-icon class="mr-1">mdi-email</v-icon>
            {{ user?.email }}
          </div>
        </div>
        <div class="avatar-container">
          <img :src="avatarUrl" alt="Avatar de usuario" class="avatar-image" />
        </div>
      </div>
    </div>
  </div>

  <div class="mb-2 pl-3 flex items-center justify-between">
    <div class="flex items-center">
      <v-icon class="mr-2">mdi-information</v-icon>
      <strong>Mi Info:</strong>
    </div>
    <v-btn color="green-lighten-2" @click="openDialog" icon>
      <v-icon>mdi-pencil</v-icon>
    </v-btn>
  </div>

  <div class="flex-1 rounded-lg border-2 p-4" v-html="user?.info || 'No disponible'"></div>

  <!-- Diálogo para editar el perfil -->
  <v-dialog
    v-model="dialogOpen"
    max-width="800px"
    persistent
    transition="dialog-bottom-transition"
    scrollable
  >
    <v-card>
      <v-form @submit.prevent="saveProfileChanges">
        <v-card-title>
          <h2 class="text-xl font-bold mt-2">
            Editar Perfil
            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1">
              {{ userRole }}
            </v-chip>
          </h2>
        </v-card-title>
        <v-card-text>
          <div class="grid grid-cols-2 gap-4">
            <div>
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
            <div>
              <v-file-input
                class="compact-form-2"
                v-model="avatarFile"
                rounded
                variant="outlined"
                color="green"
                prepend-icon="mdi-camera"
                label="Upload Avatar"
                accept="image/*"
                @change="handleAvatarUpload"
                show-size
              ></v-file-input>
              <div class="flex items-center justify-center mt-0">
                <v-avatar size="192">
                  <v-img :src="avatarUrl" alt="Avatar"></v-img>
                </v-avatar>
              </div>
            </div>
          </div>
          <div class="mt-4">
            <div class="mb-2">
              <v-icon class="mr-2">mdi-information</v-icon>
              Mi Info
            </div>
            <ckeditor v-model="info" :editor="editor" :config="editorConfig" />
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
import { editor, editorConfig } from '@/utils/ckeditorConfig'
import placeholderUser from '@/assets/placeholder-user.png'
import { pb } from '@/utils/pocketbase'

export default defineComponent({
  name: 'ProfileInfo',

  data() {
    return {
      editor,
      editorConfig
    }
  },

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
    const avatarFile = ref(null)

    const userRole = computed(() => user.value?.role || '')
    const avatarUrl = computed(() => {
      return user.value?.avatar ? pb.getFileUrl(user.value, user.value.avatar) : placeholderUser
    })

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

    const handleAvatarUpload = async () => {
      if (avatarFile.value) {
        snackbarStore.showLoading()
        try {
          await profileStore.updateAvatar(avatarFile.value)
          snackbarStore.showSnackbar('Avatar updated successfully', 'success')
        } catch (error) {
          snackbarStore.showSnackbar('Failed to update avatar', 'error')
        } finally {
          snackbarStore.hideLoading()
          avatarFile.value = null
        }
      }
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
      openDialog,
      avatarUrl,
      avatarFile,
      handleAvatarUpload
    }
  }
})
</script>
