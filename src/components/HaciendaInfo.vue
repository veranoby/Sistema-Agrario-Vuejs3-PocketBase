<template>
  <div class="grid grid-cols-3 gap-4">
    <div class="col-span-2">
      <div class="mb-2">
        <v-icon class="mr-2">mdi-map-marker-radius</v-icon> <strong>Localización:</strong>
        {{ mi_hacienda?.location || 'No disponible' }}
      </div>
      <div class="mb-2">
        <v-icon class="mr-2">mdi-map-marker-multiple</v-icon><strong>GPS:</strong>
        {{ formatGPS(mi_hacienda?.gps) }}
      </div>
      <div class="mb-2">
        <v-icon class="mr-2">mdi-information</v-icon>
        <strong>Información:</strong><br /><br />
        <p class="text-xs">{{ mi_hacienda?.info || 'No disponible' }}</p>
      </div>
      <br />
      <v-btn
        @click="openEditDialog"
        class="w-full p-2"
        variant="outlined"
        rounded="lg"
        color="green-lighten-1"
        prepend-icon="mdi-pencil"
        >Editar</v-btn
      >
    </div>

    <!--seccion de cambio de avatar de hacienda-->

    <div class="flex justify-center items-center p-2">
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
          <div class="flex items-center">
            <v-avatar size="128" class="mr-4">
              <v-img :src="avatarHaciendaUrl" alt="Avatar de Hacienda"></v-img>
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-dialog v-model="editDialog" max-width="500px">
      <v-card v-if="editedHacienda">
        <v-card-title>Editar Hacienda</v-card-title>
        <v-card-text>
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
          <v-textarea
            class="compact-form"
            v-model="editedHacienda.info"
            label="Información"
          ></v-textarea>
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
//import { pb } from '@/utils/pocketbase' // Asegúrate de importar PocketBase

import { useHaciendaStore } from '@/stores/haciendaStore'

const haciendaStore = useHaciendaStore()
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const editDialog = ref(false)
const editedHacienda = ref(null)
const avatarFile = ref(null) // Agregar ref para manejar el archivo del avatar

/*
const avatarHaciendaUrl = computed(() => {
  return mi_hacienda.value?.avatar
    ? pb.getFileUrl(mi_hacienda.value, mi_hacienda.value.avatar)
    : placeholderHacienda // Usar la imagen importada como placeholder
})
*/

//const { avatarHaciendaUrl } = storeToRefs(useHaciendaStore)

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

const formatGPS = (gps) => {
  if (!gps || !gps.lat || !gps.lng) return 'No disponible'
  return `Lat: ${gps.lat}, Lng: ${gps.lng}`
}
</script>
