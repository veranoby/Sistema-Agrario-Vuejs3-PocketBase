<template>
  <v-dialog v-model="dialog" max-width="550px">
    <v-card>
      <v-toolbar color="success" dark>
        <v-toolbar-title>Editar Avatar</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12" class="text-center">
              <v-avatar size="384">
                <v-img :src="previewUrl || currentAvatarUrl"></v-img>
              </v-avatar>
            </v-col>
            <v-col cols="12">
              <v-file-input
                v-model="avatarFile"
                accept="image/*"
                label="Seleccionar imagen"
                @update:model-value="handleFileChange"
                :rules="fileRules"
                :show-size="true"
                prepend-icon="none"
                prepend-inner-icon="mdi-file"
                :error="!!fileError"
                :error-messages="fileError"
                capture="environment"
                :loading="isLoading"
                density="compact"
                variant="outlined"
                class="compact-form"
              >
                <template v-slot:prepend>
                  <v-btn
                    icon
                    size="large"
                    @click.prevent="toggleCamera"
                    :color="isCameraActive ? 'success' : undefined"
                  >
                    <v-icon>mdi-camera</v-icon>
                  </v-btn>
                </template>
                <template v-slot:append>
                  <v-icon
                    v-if="isValidFile"
                    size="x-large"
                    color="success"
                    icon="mdi-check-circle"
                  ></v-icon>
                </template>
              </v-file-input>
            </v-col>
            <v-col v-if="isCameraActive" cols="12">
              <video ref="videoRef" autoplay playsinline style="width: 100%; height: auto"></video>
              <v-btn block color="success" @click="captureImage" :disabled="!isCameraActive">
                Capturar Foto
              </v-btn>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-alert"
          color="red-lighten-1"
          @click="handleDelete"
          :disabled="!hasCurrentAvatar"
        >
          Eliminar Avatar
        </v-btn>
        <v-spacer></v-spacer>

        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="handleSubmit"
          :disabled="!avatarFile"
        >
          Guardar
        </v-btn>

        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="closeDialog"
        >
          Cancelar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useAvatarStore } from '@/stores/avatarStore'

const props = defineProps({
  modelValue: Boolean,
  collection: String,
  entityId: String,
  currentAvatarUrl: String,
  hasCurrentAvatar: Boolean
})

const emit = defineEmits(['update:modelValue', 'avatar-updated'])

const avatarStore = useAvatarStore()
const avatarFile = ref(null)
const previewUrl = ref(null)
const fileError = ref('')
const isLoading = ref(false)
const isCameraActive = ref(false)
const videoRef = ref(null)
const mediaStream = ref(null)

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isValidFile = computed(() => {
  return avatarFile.value && !fileError.value
})

const fileRules = [
  (file) => {
    if (!file) return true
    if (file.size > MAX_FILE_SIZE) {
      fileError.value = 'El archivo no debe superar 5MB'
      return false
    }

    fileError.value = ''
    return true
  }
]

const handleFileChange = (file) => {
  if (file) {
    if (file instanceof File) {
      if (fileRules[0](file)) {
        previewUrl.value = URL.createObjectURL(file)
      }
    }
  } else {
    previewUrl.value = null
  }
}

const toggleCamera = async () => {
  if (isCameraActive.value) {
    await stopCamera()
  } else {
    await startCamera()
  }
}

const startCamera = async () => {
  try {
    mediaStream.value = await navigator.mediaDevices.getUserMedia({
      video: true
    })
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream.value
    }
    isCameraActive.value = true
  } catch (error) {
    console.error('Error accessing camera:', error)
    fileError.value = 'No se pudo acceder a la cámara'
  }
}

const stopCamera = async () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop())
    mediaStream.value = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
  isCameraActive.value = false
}

const captureImage = () => {
  if (!videoRef.value) return

  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth
  canvas.height = videoRef.value.videoHeight
  const context = canvas.getContext('2d')
  context.drawImage(videoRef.value, 0, 0)

  canvas.toBlob((blob) => {
    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
    avatarFile.value = file
    handleFileChange(file)
    stopCamera()
  }, 'image/jpeg')
}

const handleSubmit = async () => {
  if (!isValidFile.value) return

  isLoading.value = true
  try {
    const operation = props.hasCurrentAvatar ? 'update' : 'create'
    const updatedRecord = await avatarStore.handleAvatarOperation(
      operation,
      props.collection,
      props.entityId,
      avatarFile.value
    )
    emit('avatar-updated', updatedRecord)
    closeDialog()
  } catch (error) {
    console.error('Error handling avatar:', error)
    fileError.value = 'Error al procesar la imagen'
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async () => {
  isLoading.value = true
  try {
    const updatedRecord = await avatarStore.handleAvatarOperation(
      'delete',
      props.collection,
      props.entityId
    )
    emit('avatar-updated', updatedRecord)
    closeDialog()
  } catch (error) {
    console.error('Error deleting avatar:', error)
  } finally {
    isLoading.value = false
  }
}

const closeDialog = () => {
  dialog.value = false
  avatarFile.value = null
  previewUrl.value = null
  fileError.value = ''
  stopCamera()
}

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
/* Add any necessary styles here */
</style>
