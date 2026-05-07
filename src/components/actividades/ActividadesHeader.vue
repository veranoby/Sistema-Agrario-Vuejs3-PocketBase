<template>
  <header class="bg-background shadow-sm">
    <div class="profile-container">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="w-full sm:flex-grow">
          <h3 class="profile-title">
            <nav class="flex mb-3" aria-label="Breadcrumb">
              <ol class="flex items-center space-x-2 bg-green-lighten-4 py-2 px-4 rounded-r-full">
                <li>
                  <div class="flex items-center">
                    <v-icon>mdi-gesture-tap-button</v-icon>
                    <router-link
                      to="/actividades"
                      class="ml-3 text-sm font-extrabold hover:text-gray-700"
                    >
                      {{ t('activity_workspace.my_activities') }}
                    </router-link>
                  </div>
                </li>
                <li>
                  <div class="flex items-center">
                    <v-icon>mdi-chevron-right</v-icon>
                    <span class="ml-1 text-sm font-extrabold text-gray-600" aria-current="page">
                      {{ actividadInfo.nombre }}
                    </span>
                  </div>
                </li>
              </ol>
            </nav>

            <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start>
                <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
              </v-avatar>
              {{ t('activity_workspace.hacienda') }}: {{ mi_hacienda.name }}
            </v-chip>

            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start>
                <v-img :src="avatarUrl" alt="Avatar"></v-img>
              </v-avatar>
              {{ t('roles.' + userRole) }}
            </v-chip>


            <v-chip :color="getStatusColor(actividadInfo.activa)" size="small" variant="flat">
              {{ getStatusMsg(actividadInfo.activa) }}
            </v-chip>

            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
              {{ t('activity_workspace.type') }}:
              {{ actividadesStore.getActividadTipo(actividadInfo.tipo_actividades).toUpperCase() }}
            </v-chip>
          </h3>
        </div>

        <div class="w-full sm:w-auto z-10 text-center">
          <h4
            :class="{
              'text-red font-extrabold pt-0 pb-2 text-xs sm:text-sm': actividadInfo.bpa_estado < 40,
              'text-orange font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                actividadInfo.bpa_estado >= 40 && actividadInfo.bpa_estado < 80,
              'text-green font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                actividadInfo.bpa_estado >= 80
            }"
          >
            {{ t('activity_workspace.bpa_progress') }}:
          </h4>
          <v-progress-circular
            :model-value="actividadInfo.bpa_estado"
            :size="78"
            :width="8"
            :color="colorBpaEstado"
          >
            <template v-slot:default> {{ actividadInfo.bpa_estado }} % </template>
          </v-progress-circular>
        </div>
      </div>

      <div class="avatar-container">
        <img :src="actividadAvatarUrl" alt="Avatar de Actividad" class="avatar-image" />
      </div>
    </div>
  </header>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useActividadesStore } from '@/stores/actividadesStore'

const props = defineProps({
  actividadInfo: {
    type: Object,
    required: true
  },
  avatarUrl: {
    type: String,
    required: true
  },
  avatarHaciendaUrl: {
    type: String,
    required: true
  },
  mi_hacienda: {
    type: Object,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  actividadAvatarUrl: {
    type: String,
    required: true
  },
  colorBpaEstado: {
    type: String,
    required: true
  }
})

const emit = defineEmits([])

const { t } = useI18n()
const actividadesStore = useActividadesStore()

const getStatusColor = (status) => {
  const colors = {
    true: 'blue',
    false: 'orange'
  }
  return colors[status] || 'gray'
}

const getStatusMsg = (status) => {
  return status ? t('activities.active') : t('activities.stopped')
}

</script>

<style scoped>
.profile-container {
  position: relative;
  padding: 1rem;
}

.profile-title {
  margin: 0;
  padding-right: 100px;
}
</style>
