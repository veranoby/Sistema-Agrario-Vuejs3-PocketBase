<template>
  <div class="flex justify-center items-center p-2">
    <v-card class="p-2 rounded-lg border-2">
      <v-card-title class="compact-form-2">
        <v-file-input
          v-model="avatarFile"
          prepend-icon="mdi-camera"
          label="Upload Avatar"
          accept="image/*"
          @change="handleAvatarUpload"
          show-size
        ></v-file-input>
      </v-card-title>
      <v-card-text>
        <div class="flex items-center">
          <v-avatar size="128" class="mr-4">
            <v-img :src="avatarUrl" alt="Avatar"></v-img>
          </v-avatar>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

export default defineComponent({
  name: 'AvatarUpload',
  setup() {
    const profileStore = useProfileStore()
    const snackbarStore = useSnackbarStore()
    const { avatarUrl } = storeToRefs(profileStore)

    const avatarFile = ref(null)

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

    return {
      avatarUrl,
      avatarFile,
      handleAvatarUpload
    }
  }
})
</script>
