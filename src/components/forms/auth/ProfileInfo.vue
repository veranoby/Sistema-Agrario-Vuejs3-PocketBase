<template>
  <div class="profile-container">
    <div class="flex justify-between items-start">
      <div>
        <h3 class="profile-title">
          {{ t('profile.social_profile') }}
          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
            {{ userRole }}
          </v-chip>
        </h3>
        <div class="mt-0 text-xs">
          <v-chip variant="flat" size="small" color="teal-lighten-3" class="mx-1 mb-2 mt-2">
            <v-icon size="x-large" class="mr-2">mdi-account-circle</v-icon>
            {{ user?.username }}
          </v-chip>
          <v-chip variant="flat" size="small" color="teal-lighten-3" class="mx-1 mb-2 mt-2">
            {{ user?.name }} {{ user?.lastname }}
          </v-chip>

          <v-chip variant="flat" size="small" color="teal-lighten-3" class="mx-1 mb-2 mt-2">
            <v-icon class="mr-1">mdi-email</v-icon>
            {{ user?.email }}
            <v-icon
              v-if="user?.verified"
              class="ml-1"
              color="success"
              size="small"
              :title="t('profile.email_verified')"
            >mdi-check-circle</v-icon>
            <v-icon
              v-else
              class="ml-1"
              color="warning"
              size="small"
              :title="t('profile.email_not_verified')"
            >mdi-alert-circle</v-icon>
          </v-chip>
        </div>

        <!-- Email Verification Status -->
        <div v-if="!user?.verified" class="mt-2">
          <v-alert
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-2"
            :text="t('profile.verification_required_message')"
          ></v-alert>
          <v-btn
            size="small"
            color="success"
            variant="outlined"
            :loading="resendingEmail"
            @click="resendVerificationEmail"
            class="ml-1"
          >
            <v-icon start>mdi-email-sync</v-icon>
            {{ t('profile.resend_verification') }}
          </v-btn>
        </div>
      </div>
      <div class="avatar-container">
        <img :src="avatarUrl" alt="Avatar de usuario" class="avatar-image" />
      </div>
    </div>
  </div>

  <div class="mx-4 p-2 my-2 flex items-center justify-between">
    <div class="flex items-center">
      <v-icon class="mr-2">mdi-information</v-icon>
      <strong>{{ t('profile.my_information') }}</strong>
    </div>
    <v-btn color="green-lighten-2" @click="openDialog" icon size="x-small">
      <v-icon>mdi-pencil</v-icon>
    </v-btn>
  </div>

  <div
    class="bg-dinamico ml-6 flex-1 p-4 rich-text-content"
    v-html="user?.info || t('profile.not_available')"
  ></div>

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
        <v-toolbar color="success" dark>
          <v-toolbar-title>{{ t('profile.edit_profile') }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-chip variant="outlined" size="small" color="white" class="mr-6">
            {{ userRole }}
          </v-chip>
        </v-toolbar>

        <v-card-text>
          <div class="grid grid-cols-2 gap-4">
            <div class="m-0 mt-4">
              <v-text-field
                v-model="name"
                :label="t('profile.name')"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-account"
              ></v-text-field>
              <v-text-field
                v-model="lastname"
                :label="t('profile.lastname')"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-account-details"
              ></v-text-field>
              <v-text-field
                v-model="username"
                :label="t('profile.username')"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-account-circle"
              ></v-text-field>
              <v-text-field
                v-model="email"
                variant="solo"
                disabled
                :label="t('profile.email')"
                density="compact"
                type="email"
                prepend-icon="mdi-email"
              ></v-text-field>

              <v-text-field
                v-model="cedula"
                :label="t('profile.cedula')"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-account"
              ></v-text-field>

              <v-text-field
                v-model="direccion"
                :label="t('profile.address')"
                variant="outlined"
                density="compact"
                prepend-icon="mdi-map"
              ></v-text-field>
            </div>
            <div class="m-0">
              <AvatarForm
                v-model="showAvatarDialog"
                collection="users"
                :entityId="user?.id"
                :currentAvatarUrl="avatarUrl"
                :hasCurrentAvatar="!!user?.avatar"
                @avatar-updated="handleAvatarUpdated"
              />
              <div class="flex items-center justify-center mt-0 relative">
                <v-avatar size="192">
                  <v-img :src="avatarUrl" alt="Avatar"></v-img>
                </v-avatar>
                <!-- Botón para abrir el diálogo de avatar -->
                <v-btn
                  icon
                  size="small"
                  color="green-lighten-2"
                  class="absolute bottom-0 right-0"
                  @click="showAvatarDialog = true"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
          <div class="mt-4">
            <div class="mb-2">
              <v-icon class="mr-2">mdi-information</v-icon>
              {{ t('profile.my_info') }}
            </div>
            <QuillEditor
              contentType="html"
              v-model:content="info"
              toolbar="essential"
              theme="snow"
              class="quill-editor"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="dialogOpen = false"
          >
            {{ t('profile.cancel') }}
          </v-btn>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            type="submit"
            :loading="isLoading"
          >
            {{ t('profile.save') }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/authStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import AvatarForm from '@/components/forms/AvatarForm.vue'

const authStore = useAuthStore()
const uiFeedbackStore = useUiFeedbackStore()
const { t } = useI18n()
const { user } = storeToRefs(authStore)

const resendingEmail = ref(false)

const name = ref('')
const lastname = ref('')
const username = ref('')
const email = ref('')
const cedula = ref('')
const direccion = ref('')
const info = ref('')
const isLoading = ref(false)
const dialogOpen = ref(false)
const showAvatarDialog = ref(false)

const userRole = computed(() => user.value?.role || '')
const avatarUrl = computed(() => authStore.avatarUrl)

const openDialog = () => {
  if (user.value) {
    name.value = user.value.name
    lastname.value = user.value.lastname
    username.value = user.value.username
    email.value = user.value.email
    info.value = user.value.info
    cedula.value = user.value.cedula || ''
    direccion.value = user.value.direccion || ''
  }
  dialogOpen.value = true
}

const handleAvatarUpdated = (updatedRecord) => {
  authStore.setUser(updatedRecord)
}

const saveProfileChanges = async () => {
  isLoading.value = true
  try {
    await authStore.updateProfile({
      name: name.value,
      lastname: lastname.value,
      username: username.value,
      cedula: cedula.value,
      direccion: direccion.value,

      info: info.value
    })
    uiFeedbackStore.showSnackbar(t('profile.profile_updated_successfully'), 'success')
    dialogOpen.value = false
  } catch (error) {
    uiFeedbackStore.showSnackbar(t('profile.failed_to_update_profile'), 'error')
  } finally {
    isLoading.value = false
  }
}

const resendVerificationEmail = async () => {
  resendingEmail.value = true
  try {
    await authStore.sendVerificationEmail(user.value.email)
    uiFeedbackStore.showSnackbar(t('profile.verification_email_sent'), 'success')
  } catch (error) {
    uiFeedbackStore.showSnackbar(t('profile.verification_email_error'), 'error')
  } finally {
    resendingEmail.value = false
  }
}
</script>
