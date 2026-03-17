<template>
  <header class="bg-background shadow-sm">
    <div class="profile-container">
      <h3 class="profile-title">
        <nav class="flex mb-3" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-2 bg-green-lighten-4 py-2 px-4 rounded-r-full">
            <li>
              <div class="flex items-center">
                <v-icon>mdi-sprout</v-icon>
                <router-link
                  to="/siembras"
                  class="ml-3 text-sm font-extrabold hover:text-gray-700"
                >
                  {{ t('sowing_workspace.my_sowings') }}
                </router-link>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <v-icon>mdi-chevron-right</v-icon>
                <span class="ml-1 text-sm font-extrabold text-gray-600" aria-current="page">
                  {{ siembraInfo.nombre }}
                </span>
              </div>
            </li>
            <li>
              <div class="flex items-center">
                <span class="ml-1 text-sm font-bold text-gray-700" aria-current="page">
                  {{ siembraInfo.tipo }}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
          <v-avatar start>
            <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
          </v-avatar>
          {{ t('sowing_workspace.hacienda') }}: {{ mi_hacienda.name }}
        </v-chip>

        <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
          <v-avatar start>
            <v-img :src="avatarUrl" alt="Avatar"></v-img>
          </v-avatar>
          {{ userRole }}
        </v-chip>

        <v-chip :color="getStatusColor(siembraInfo.estado)" size="x-small" variant="flat">
          {{ siembraInfo.estado }}
        </v-chip>

        <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
          {{ t('sowing_workspace.start') }}: {{ formatDate(siembraInfo.fecha_inicio) }}
        </v-chip>
      </h3>
      <div class="avatar-container">
        <img :src="siembraAvatarUrl" alt="Avatar de Siembra" class="avatar-image" />
      </div>
    </div>
  </header>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
  siembraInfo: {
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
  siembraAvatarUrl: {
    type: String,
    required: true
  }
})

const emit = defineEmits([])

const { t } = useI18n()

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const getStatusColor = (status) => {
  const colors = {
    planificada: 'blue',
    en_crecimiento: 'green',
    cosechada: 'orange',
    finalizada: 'gray'
  }
  return colors[status] || 'gray'
}
</script>

<style scoped>
.profile-container {
  position: relative;
  padding: 1rem;
}

.avatar-container {
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.profile-title {
  margin: 0;
  padding-right: 100px;
}
</style>
