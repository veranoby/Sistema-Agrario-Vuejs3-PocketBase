<template>
  <div class="profile-container">
    <div class="flex justify-between items-start">
      <div>
        <h3 class="profile-title">
          {{ t('hacienda_info.hacienda_profile') }}
          <v-chip variant="flat" size="x-small" color="green-lighten-2" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
            {{ mi_hacienda.name }}
          </v-chip>
          <v-chip variant="flat" size="small" color="green-lighten-2" class="m-0 p-2">
            <v-icon class="m-0">mdi-map-marker-radius</v-icon>
            {{ mi_hacienda?.location || t('hacienda_info.not_available') }}
          </v-chip>
          <v-chip variant="flat" size="small" color="green-lighten-2" class="m-0 p-2">
            <v-icon class="m-0">mdi-map-marker-multiple</v-icon><strong>{{ t('hacienda_info.gps') }}:</strong>
            {{ formatGPS(mi_hacienda?.gps) }}
          </v-chip>
        </h3>

        <div class="mt-3 mb-1 text-xs">
          <v-tooltip v-for="(metrica, key) in mi_hacienda.metricas" :key="key" location="bottom">
            <template v-slot:activator="{ props }">
              <v-chip variant="flat" size="small" color="green-lighten-3" class="m-0 p-2" pill>
                {{ key.replace(/_/g, ' ').toUpperCase() }}:
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

  <div class="mx-4 p-2 my-2 flex items-center justify-between">
    <div class="flex items-center">
      <v-icon class="mr-2">mdi-information</v-icon>
      <strong>{{ t('hacienda_info.information_of', { hacienda_name: mi_hacienda.name }) }}</strong>
    </div>
    <v-btn color="green-lighten-2" @click="openEditDialog" icon size="x-small">
      <v-icon>mdi-pencil</v-icon>
    </v-btn>
  </div>
  <div
    class="bg-dinamico ml-6 flex-1 p-4 rich-text-content"
    v-html="mi_hacienda?.info || t('hacienda_info.not_available')"
  ></div>

  <v-dialog
    v-model="editDialog"
    max-width="800px"
    persistent
    transition="dialog-bottom-transition"
    scrollable
  >
    <v-card v-if="editedHacienda">
      <v-toolbar color="success" dark>
        <v-toolbar-title>{{ t('hacienda_info.edit_hacienda') }}</v-toolbar-title>
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
              :label="t('hacienda_info.name')"
            ></v-text-field>
            <v-text-field
              class="compact-form"
              type="text"
              density="compact"
              variant="outlined"
              v-model="editedHacienda.location"
              :label="t('hacienda_info.location')"
            ></v-text-field>
            <v-text-field
              class="compact-form"
              density="compact"
              variant="outlined"
              v-model="editedHacienda.gps.lat"
              :label="t('hacienda_info.latitude')"
              type="number"
            ></v-text-field>
            <v-text-field
              class="compact-form"
              variant="outlined"
              density="compact"
              v-model="editedHacienda.gps.lng"
              :label="t('hacienda_info.longitude')"
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
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
              <v-icon class="mr-2">mdi-chart-box</v-icon>
              <span class="font-bold">{{ t('hacienda_info.metrics') }}</span>
            </div>
            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-plus"
              color="green-lighten-3"
              @click="addMetricaDialog = true"
            >
              {{ t('hacienda_info.add_metric') }}
            </v-btn>
          </div>

          <div class="grid grid-cols-2 gap-0">
            <div v-for="(metrica, key) in editedHacienda.metricas" :key="key" cols="6">
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                  <div v-bind="props">
                    <v-select
                      v-if="metrica.tipo === 'select'"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ')"
                      :items="metrica.opciones"
                      variant="outlined"
                      density="compact"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-select>
                    <v-text-field
                      v-else-if="metrica.tipo === 'date'"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ')"
                      type="date"
                      density="compact"
                      variant="outlined"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-text-field>
                    <v-text-field
                      v-else-if="metrica.tipo === 'text'"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ')"
                      density="compact"
                      variant="outlined"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-text-field>
                    <v-text-field
                      v-else-if="metrica.tipo === 'number'"
                      v-model.number="metrica.valor"
                      :label="key.replace(/_/g, ' ')"
                      type="number"
                      density="compact"
                      variant="outlined"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-text-field>
                    <v-checkbox
                      v-else-if="metrica.tipo === 'boolean'"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ')"
                      density="compact"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-checkbox>
                    <v-checkbox
                      v-else-if="metrica.tipo === 'checkbox'"
                      v-model="metrica.valor"
                      :label="key.replace(/_/g, ' ')"
                      density="compact"
                      class="compact-form"
                    >
                      <template v-slot:append>
                        <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
                      </template>
                    </v-checkbox>
                  </div>
                </template>
                <span>{{ metrica.descripcion }}</span>
              </v-tooltip>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="mb-2">
            <v-icon class="mr-2">mdi-information</v-icon>
            {{ t('hacienda_info.my_info') }}
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
          >{{ t('hacienda_info.cancel') }}</v-btn
        >
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="saveHacienda"
        >
          {{ t('hacienda_info.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="addMetricaDialog" persistent max-width="300px">
    <v-card>
      <v-toolbar color="success" dark>
        <v-toolbar-title>{{ t('hacienda_info.add_metric') }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-card-text class="m-1 p-0 pl-2">
        <v-text-field
          density="compact"
          variant="outlined"
          class="compact-form"
          v-model="newMetrica.titulo"
          :label="t('hacienda_info.title')"
        />
        <v-textarea
          density="compact"
          variant="outlined"
          class="compact-form"
          v-model="newMetrica.descripcion"
          :label="t('hacienda_info.description')"
        />
        <v-select
          density="compact"
          variant="outlined"
          class="compact-form"
          v-model="newMetrica.tipo"
          :items="['checkbox', 'number', 'text', 'date', 'boolean', 'select']"
          :label="t('hacienda_info.type')"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="addMetricaDialog = false"
          >{{ t('hacienda_info.cancel') }}</v-btn
        >
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="addMetrica"
          >{{ t('hacienda_info.add') }}</v-btn
        >
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
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useHaciendaStore } from '@/stores/haciendaStore'
import AvatarForm from '@/components/forms/AvatarForm.vue'

const { t } = useI18n()
const haciendaStore = useHaciendaStore()
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const editDialog = ref(false)
const showAvatarDialog = ref(false)
const editedHacienda = ref(null)
const addMetricaDialog = ref(false)
const newMetrica = ref({
  titulo: '',
  descripcion: '',
  tipo: 'text'
})

const openEditDialog = () => {
  editedHacienda.value = mi_hacienda.value ? { ...mi_hacienda.value } : {}
  if (!editedHacienda.value.gps) {
    editedHacienda.value.gps = { lat: null, lng: null }
  }
  if (!editedHacienda.value.metricas) {
    editedHacienda.value.metricas = {}
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

const formatMetricValue = (value) => {
  if (!value || value === null) return 'N/A'
  return Array.isArray(value) ? value[0] : value
}

const addMetrica = async () => {
  if (!newMetrica.value.titulo) return

  const key = newMetrica.value.titulo.toLowerCase().replace(/\s+/g, '_')

  if (!editedHacienda.value.metricas) {
    editedHacienda.value.metricas = {}
  }

  editedHacienda.value.metricas[key] = {
    tipo: newMetrica.value.tipo,
    valor: haciendaStore.getDefaultMetricaValue(newMetrica.value.tipo),
    descripcion: newMetrica.value.descripcion
  }

  newMetrica.value = {
    titulo: '',
    descripcion: '',
    tipo: 'text'
  }

  addMetricaDialog.value = false
}

const removeMetrica = (key) => {
  if (editedHacienda.value && editedHacienda.value.metricas) {
    const metricas = { ...editedHacienda.value.metricas }
    delete metricas[key]
    editedHacienda.value.metricas = metricas
  }
}

const formatGPS = (gps) => {
  if (!gps || !gps.lat || !gps.lng) return t('hacienda_info.not_available')
  return `Lat: ${gps.lat}, Lng: ${gps.lng}`
}
</script>

<style scoped>
.compact-form {
  margin-bottom: 8px;
}
</style>