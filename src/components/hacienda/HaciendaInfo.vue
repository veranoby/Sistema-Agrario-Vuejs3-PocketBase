<template>
  <div class="hacienda-workspace">
    <v-alert v-if="!mi_hacienda" type="warning" class="mx-auto max-w-md mt-4">
      No se encontró información de la hacienda. Contacta al administrador.
    </v-alert>

    <template v-else>
      <!-- Standard Profile-style Header -->
      <div class="profile-container">
        <div class="flex justify-between items-start w-full">
          <div>
            <h3 class="profile-title">
              {{ t('hacienda_info.hacienda_profile') }}
              <v-chip variant="flat" size="small" color="green-lighten-2" class="mx-1" pill>
                <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
                {{ mi_hacienda.name }}
              </v-chip>
            </h3>
            
            <div class="mt-2 text-xs">
              <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1 mb-1 mt-1">
                <v-icon size="small" class="mr-1">mdi-map-marker-radius</v-icon>
                {{ mi_hacienda?.location || t('hacienda_info.not_available') }}
              </v-chip>
              <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1 mb-1 mt-1">
                <v-icon size="small" class="mr-1">mdi-map-marker-multiple</v-icon>
                {{ formatGPS(mi_hacienda?.gps) }}
              </v-chip>
              
              <v-chip v-if="mi_hacienda?.contacto_email" variant="flat" size="small" color="green-lighten-3" class="mx-1 mb-1 mt-1">
                <v-icon size="small" class="mr-1">mdi-email</v-icon>
                {{ mi_hacienda.contacto_email }}
              </v-chip>
              <v-chip v-if="mi_hacienda?.contacto_telefono" variant="flat" size="small" color="green-lighten-3" class="mx-1 mb-1 mt-1">
                <v-icon size="small" class="mr-1">mdi-phone</v-icon>
                {{ mi_hacienda.contacto_telefono }}
              </v-chip>
            </div>

            <!-- Metrics row -->
            <div class="mt-3 flex flex-wrap gap-1">
              <v-tooltip v-for="(metrica, key) in mi_hacienda.metricas" :key="key" location="bottom">
                <template v-slot:activator="{ props }">
                  <v-chip
                    v-bind="props"
                    variant="flat"
                    size="x-small"
                    color="green-lighten-4"
                    class="mx-1 mb-1"
                    pill
                  >
                    <span class="font-weight-bold mr-1">{{ key.replace(/_/g, ' ').toUpperCase() }}:</span>
                    {{ formatMetricValue(metrica.valor) }}
                  </v-chip>
                </template>
                <span>{{ metrica.descripcion }}</span>
              </v-tooltip>
            </div>
          </div>
          
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="mx-4 p-2 my-2 flex items-center justify-between">
        <div class="flex items-center">
          <v-icon class="mr-2">mdi-information</v-icon>
          <strong>{{ t('hacienda_info.information_of', { hacienda_name: mi_hacienda.name }) }}</strong>
        </div>
        <div class="flex gap-2">
          <v-btn color="green-lighten-2" @click="showAvatarDialog = true" icon size="small">
            <v-icon>mdi-camera</v-icon>
          </v-btn>
          <v-btn color="green-lighten-2" @click="openEditDialog" icon size="small">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Content Area -->
      <div
        class="bg-dinamico ml-6 flex-1 p-4 rich-text-content"
        v-html="mi_hacienda?.info || t('hacienda_info.not_available')"
      ></div>

      <!-- Edit Dialog -->
      <v-dialog
        v-model="editDialog"
        max-width="1600px"
        persistent
        transition="dialog-bottom-transition"
        scrollable
      >
        <v-card rounded="xl">
          <v-toolbar color="primary" dark>
            <v-toolbar-title>{{ t('hacienda_info.edit_hacienda') }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon @click="closeEditDialog">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-toolbar>
          
          <v-card-text class="pa-4">
            <HaciendaForm
              v-if="editedHacienda"
              v-model="editedHacienda"
              :initial-data="mi_hacienda"
            />
          </v-card-text>

          <v-card-actions class="pa-4">
            <v-spacer></v-spacer>
            <v-btn
              variant="flat"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              @click="closeEditDialog"
            >
              {{ t('hacienda_info.cancel') }}
            </v-btn>
            <v-btn
              variant="flat"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              @click="saveHacienda"
            >
              {{ t('hacienda_info.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Avatar Upload Dialog -->
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
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useHaciendaStore } from '@/stores/haciendaStore'
import HaciendaForm from '@/components/forms/HaciendaForm.vue'
import AvatarForm from '@/components/forms/AvatarForm.vue'

const { t } = useI18n()
const haciendaStore = useHaciendaStore()
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const editDialog = ref(false)
const showAvatarDialog = ref(false)
const editedHacienda = ref(null)

const openEditDialog = () => {
  editedHacienda.value = mi_hacienda.value ? JSON.parse(JSON.stringify(mi_hacienda.value)) : {}
  editDialog.value = true
}

const closeEditDialog = () => {
  editDialog.value = false
  editedHacienda.value = null
}

const saveHacienda = async () => {
  if (editedHacienda.value) {
    const dataToUpdate = {
      name: editedHacienda.value.name,
      location: editedHacienda.value.location,
      gps: editedHacienda.value.gps || { lat: null, lng: null },
      geometria: editedHacienda.value.geometria || null,
      info: editedHacienda.value.info,
      plan: editedHacienda.value.plan?.id || editedHacienda.value.plan,
      metricas: editedHacienda.value.metricas || {},
      contacto_email: editedHacienda.value.contacto_email,
      contacto_telefono: editedHacienda.value.contacto_telefono,
      openrouter_key: editedHacienda.value.openrouter_key,
      config_tarifas_venta: editedHacienda.value.config_tarifas_venta
    }
    await haciendaStore.updateHacienda(dataToUpdate)
    closeEditDialog()
  }
}

const handleAvatarUpdated = (updatedRecord) => {
  haciendaStore.$patch({ mi_hacienda: updatedRecord })
}

const formatMetricValue = (value) => {
  if (!value && value !== 0) return 'N/A'
  return Array.isArray(value) ? value[0] : value
}

const formatGPS = (gps) => {
  if (!gps || !gps.lat || !gps.lng) return t('hacienda_info.not_available')
  return `Lat: ${gps.lat}, Lng: ${gps.lng}`
}
</script>

<style scoped>
.rich-text-content {
  min-height: 100px;
  border-radius: 4px;
}
</style>
