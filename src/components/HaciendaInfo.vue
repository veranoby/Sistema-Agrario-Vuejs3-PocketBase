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
        <v-btn color="green-lighten-2" @click="openEditDialog" icon>
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </div>
      <div
        class="rounded-lg border-2 p-4 mt-2 mb-4"
        v-html="mi_hacienda?.info || 'No disponible'"
      ></div>
    </div>

    <v-dialog
      v-model="editDialog"
      max-width="1000px"
      persistent
      transition="dialog-bottom-transition"
      scrollable
      class="flex items-center"
    >
      <v-card v-if="editedHacienda">
        <v-card-title>Editar Hacienda</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-text-field
                class="compact-form"
                v-model="editedHacienda.name"
                label="Nombre"
              ></v-text-field>
              <v-text-field
                class="compact-form"
                v-model="editedHacienda.location"
                label="Localización"
              ></v-text-field>
              <v-text-field
                class="compact-form"
                v-model="editedHacienda.gps.lat"
                label="Latitud"
                type="number"
              ></v-text-field>
              <v-text-field
                class="compact-form"
                v-model="editedHacienda.gps.lng"
                label="Longitud"
                type="number"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-card class="p-2 rounded-lg border-2">
                <v-card-title class="compact-form-2">
                  <v-file-input
                    v-model="avatarFile"
                    rounded
                    variant="outlined"
                    color="green"
                    prepend-icon="mdi-camera"
                    label="Upload Avatar"
                    accept="image/*"
                    @change="updateAvatar"
                    show-size
                  ></v-file-input>
                </v-card-title>
                <v-card-text>
                  <div class="flex items-center justify-center">
                    <v-avatar size="192" class="mr-4">
                      <v-img :src="avatarHaciendaUrl" alt="Avatar de Hacienda"></v-img>
                    </v-avatar>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <div class="mb-2 mt-4">
                <v-icon class="mr-2">mdi-information</v-icon>
                Mi Info
              </div>
              <ckeditor v-model="editedHacienda.info" :editor="editor" :config="editorConfig" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
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
            >Guardar</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useHaciendaStore } from '@/stores/haciendaStore'

import { editor, editorConfig } from '@/utils/ckeditorConfig'

const haciendaStore = useHaciendaStore()
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const editDialog = ref(false)
const editedHacienda = ref(null)
const avatarFile = ref(null) // Agregar ref para manejar el archivo del avatar

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
    await haciendaStore.updateHacienda(editedHacienda.value)
    closeEditDialog()
  }
}

const updateAvatar = async () => {
  if (avatarFile.value) {
    await haciendaStore.updateHaciendaAvatar(avatarFile.value)
    avatarFile.value = null // Limpiar el archivo después de la actualización
  }
}

// Agregar la función formatGPS
const formatGPS = (gps) => {
  if (!gps || !gps.lat || !gps.lng) return 'No disponible'
  return `Lat: ${gps.lat}, Lng: ${gps.lng}`
}
</script>
