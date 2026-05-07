<template>
  <v-card class="zonas-section mb-4" elevation="2">
    <v-card-title class="d-flex justify-space-between align-center">
      {{ t('sowing_workspace.related_activities') }}
      <v-btn
        size="small"
        color="green-lighten-2"
        icon
        rounded="circle"
        class="ml-auto"
        @click="openAddActividad"
        @keydown.enter="openAddActividad"
        @keydown.space.prevent="openAddActividad"
        :aria-label="t('sowing_workspace.add_new_activity')"
        tabindex="0"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text class="px-2 py-0">
      <v-data-table
        :headers="headers"
        :items="actividadesfiltradas"
        :expanded="expanded"
        class="elevation-1 tabla-compacta my-2 mx-0 py-0 px-0"
        density="compact"
        item-value="id"
        show-expand
        header-class="custom-header"
        @update:expanded="$emit('update:expanded', $event)"
      >
        <template #[`item.tipo`]="{ item }">
          <span>{{ item.expand?.tipo_actividades?.nombre }}</span>
        </template>

        <template #[`item.bpa_estado`]="{ item }">
          <span
            :class="{
              'text-red font-extrabold': item.bpa_estado < 40,
              'text-orange font-extrabold': item.bpa_estado >= 40 && item.bpa_estado < 80,
              'text-green font-extrabold': item.bpa_estado >= 80
            }"
          >
            {{ item.bpa_estado }}%
          </span>
        </template>

        <template #[`item.actions`]="{ item }">
          <v-icon size="large" color="primary" class="me-2" @click="editActividad(item)">
            mdi-arrow-right-bold-circle-outline
          </v-icon>
          <v-icon v-role="['admin']" @click="deleteActividad(item)"> mdi-delete </v-icon>
        </template>

        <template v-slot:bottom> </template>

        <template #expanded-row="{ columns, item }">
          <td :colspan="columns.length" class="border-2 border-b-gray-400">
            <v-card flat class="p-2 bg-transparent">
              <v-row no-gutters>
                <v-col cols="9" class="pr-4">
                  <p>
                    <v-chip
                      v-for="(metrica, key) in item.metricas"
                      :key="key"
                      color="blue-grey-lighten-1"
                      size="small"
                      variant="flat"
                      class="m-1"
                    >
                      {{ key.replace(/_/g, ' ').toUpperCase() }}:{{ metrica.valor }}
                    </v-chip>
                  </p>
                  <hr />
                  <p class="ml-2 mr-0 mb-2 p-0 text-xs">
                    <v-icon>mdi-information-outline</v-icon> {{ t('sowing_workspace.information') }}:<label
                      class="rich-text-content"
                      v-html="item.descripcion || t('sowing_workspace.not_available')"
                    ></label>
                  </p>
                </v-col>
                <v-col cols="3" class="d-flex justify-center align-center">
                  <v-img
                    v-if="item.avatar"
                    :src="getAvatarUrl(item.id)"
                    max-width="150"
                    max-height="150"
                    contain
                  >
                    <template v-slot:placeholder>
                      <v-icon size="150" color="grey lighten-2">mdi-image-off</v-icon>
                    </template>
                  </v-img>
                  <v-icon v-else size="150" color="grey lighten-2">mdi-image-off</v-icon>
                </v-col>
              </v-row>
            </v-card>
          </td>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import placeholderActividades from '@/assets/placeholder-actividades.png'
import { useAvatarStore } from '@/stores/avatarStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { storeToRefs } from 'pinia'

const props = defineProps({
  actividadesfiltradas: {
    type: Array,
    required: true
  },
  headers: {
    type: Array,
    required: true
  },
  expanded: {
    type: Array,
    required: true
  },
  actividades: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['open-add-actividad', 'edit-actividad', 'delete-actividad', 'update:expanded'])

const { t } = useI18n()
const avatarStore = useAvatarStore()
const { actividades } = storeToRefs(useActividadesStore())

const openAddActividad = () => {
  emit('open-add-actividad')
}

const editActividad = (actividad) => {
  emit('edit-actividad', actividad)
}

const deleteActividad = (actividad) => {
  emit('delete-actividad', actividad)
}

const getAvatarUrl = (actividadId) => {
  const actividad = actividades.value.find((a) => a.id === actividadId)
  if (!actividad) return placeholderActividades
  return avatarStore.getAvatarUrl({ ...actividad, type: 'actividad' }, 'actividades')
}
</script>

<style scoped>
.rich-text-content {
  line-height: 1.6;
  color: #333;
}
</style>
