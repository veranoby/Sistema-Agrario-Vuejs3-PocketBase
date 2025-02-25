<template>
  <div>
    <div class="profile-container mt-0 ml-3 mb-4">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="profile-title">
            Perfil de la Hacienda
            <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
              HACIENDA: {{ mi_hacienda.name }}
            </v-chip>
          </h3>

          <div class="mt-3 mb-1 text-xs">
            <v-icon class="mr-2">mdi-map-marker-radius</v-icon>
            {{ mi_hacienda?.location || 'No disponible' }}

            <v-icon class="mr-2 ml-2">mdi-map-marker-multiple</v-icon><strong>GPS:</strong>
            {{ formatGPS(mi_hacienda?.gps) }}
          </div>
        </div>
        <div class="avatar-container">
          <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
        </div>
      </div>
    </div>

    <div class="mb-2">
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center">
          <v-icon class="mr-2">mdi-information</v-icon>
          <strong>Información:</strong>
        </div>
        <v-btn color="green-lighten-2" @click="openEditDialog" icon size="x-small">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </div>
      <div
        class="bg-dinamico border-1 p-4 mt-2 mb-4"
        v-html="mi_hacienda?.info || 'No disponible'"
      ></div>
    </div>

    <v-dialog
      v-model="editDialog"
      max-width="800px"
      persistent
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card v-if="editedHacienda">
        <v-toolbar color="success" dark>
          <v-toolbar-title>Editar Hacienda</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card-text>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <v-text-field
                class="compact-form"
                type="text"
                density="compact"
                variant="outlined"
                v-model="editedHacienda.name"
                label="Nombre"
              ></v-text-field>
              <v-text-field
                class="compact-form"
                type="text"
                density="compact"
                variant="outlined"
                v-model="editedHacienda.location"
                label="Localización"
              ></v-text-field>
              <v-text-field
                class="compact-form"
                density="compact"
                variant="outlined"
                v-model="editedHacienda.gps.lat"
                label="Latitud"
                type="number"
              ></v-text-field>
              <v-text-field
                class="compact-form"
                variant="outlined"
                density="compact"
                v-model="editedHacienda.gps.lng"
                label="Longitud"
                type="number"
              ></v-text-field>
            </div>
            <div>
              <AvatarForm
                v-model="showAvatarDialog"
                collection="Haciendas"
                :entityId="mi_hacienda?.id"
                :currentAvatarUrl="avatarHaciendaUrl"
                :hasCurrentAvatar="!!mi_hacienda?.avatar"
                @avatar-updated="handleAvatarUpdated"
              />
              <div class="flex items-center justify-center mt-0 relative">
                <v-avatar size="192">
                  <v-img :src="avatarHaciendaUrl" alt="Avatar de Hacienda"></v-img>
                </v-avatar>
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
              Mi Info
            </div>
            <QuillEditor
              contentType="html"
              v-model:content="editedHacienda.info"
              toolbar="essential"
              theme="snow"
              class="quill-editor"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="closeEditDialog"
            >Cancelar</v-btn
          >
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            @click="saveHacienda"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showAvatarDialog" max-width="500px">
      <AvatarForm
        v-model="showAvatarDialog"
        collection="Haciendas"
        :entityId="mi_hacienda?.id"
        :currentAvatarUrl="avatarHaciendaUrl"
        :hasCurrentAvatar="!!mi_hacienda?.avatar"
        @avatar-updated="handleAvatarUpdated"
      />
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useHaciendaStore } from '@/stores/haciendaStore'
import AvatarForm from '@/components/forms/AvatarForm.vue'

const haciendaStore = useHaciendaStore()
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const editDialog = ref(false)
const showAvatarDialog = ref(false)
const editedHacienda = ref(null)

const openEditDialog = () => {
  editedHacienda.value = mi_hacienda.value ? { ...mi_hacienda.value } : {}
  if (!editedHacienda.value.gps) {
    editedHacienda.value.gps = { lat: null, lng: null }
  }
  editDialog.value = true
}

const closeEditDialog = () => {
  editDialog.value = false
  editedHacienda.value = null
}

const saveHacienda = async () => {
  if (editedHacienda.value) {
    const dataToUpdate = {
      ...editedHacienda.value,
      avatar: mi_hacienda.value.avatar
    }
    await haciendaStore.updateHacienda(dataToUpdate)
    closeEditDialog()
  }
}

const handleAvatarUpdated = (updatedRecord) => {
  haciendaStore.$patch({ mi_hacienda: updatedRecord })
  if (editedHacienda.value) {
    editedHacienda.value = {
      ...editedHacienda.value,
      avatar: updatedRecord.avatar
    }
  }
}

// Agregar la función formatGPS
const formatGPS = (gps) => {
  if (!gps || !gps.lat || !gps.lng) return 'No disponible'
  return `Lat: ${gps.lat}, Lng: ${gps.lng}`
}
</script>
