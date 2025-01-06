<template>
  <v-dialog v-model="dialog" max-width="550px">
    <v-card>
      <v-card-title> <h2 class="text-xl font-bold mt-2">Editar Avatar</h2> </v-card-title>

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
                :show-size="true"
                prepend-icon="mdi-camera"
                capture="camera"
              ></v-file-input>
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
import { ref, computed } from 'vue'
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

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleFileChange = (event) => {
  const file = event
  if (file) {
    if (file instanceof File) {
      previewUrl.value = URL.createObjectURL(file)
    }
  } else {
    previewUrl.value = null
  }
}

const handleSubmit = async () => {
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
  }
}

const handleDelete = async () => {
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
  }
}

const closeDialog = () => {
  dialog.value = false
  avatarFile.value = null
  previewUrl.value = null
}
</script>
