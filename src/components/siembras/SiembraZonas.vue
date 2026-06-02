<template>
  <v-card class="zonas-section mb-4" elevation="2">
    <v-card-title class="d-flex justify-space-between align-center">
      {{ title || t('sowing_workspace.registered_zones') }}
      <v-btn
        size="small"
        color="green-lighten-2"
        icon
        rounded="circle"
        class="ml-auto"
        @click="openAddZona"
        @keydown.enter="openAddZona"
        @keydown.space.prevent="openAddZona"
        :aria-label="t('sowing_workspace.add_new_zone')"
        tabindex="0"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text class="px-2 py-0">
      <div v-if="esLote" class="mb-2">
      <v-chip
        variant="flat"
        :color="
          totalArea < (siembraInfo?.area_total || 0) / 3
            ? 'red'
            : totalArea < (2 * (siembraInfo?.area_total || 0)) / 3
              ? 'orange'
              : totalArea === (siembraInfo?.area_total || 0)
                ? 'green'
                : 'green-lighten-2'
        "
        size="small"
        class="mx-1"
        pill
      >
        {{ t('sowing_workspace.current_area') }}: {{ totalArea }} {{ areaUnit }}
      </v-chip>

      <v-chip variant="flat" size="small" color="green" class="mx-1" pill>
        {{ t('sowing_workspace.target_area') }}: {{ siembraInfo?.area_total || 0 }} ha
      </v-chip>
      </div>

      <v-data-table
        :headers="headers"
        :items="zonasfiltradas"
        :expanded="expanded"
        class="elevation-1 tabla-compacta my-2 mx-0 py-0 px-0"
        density="compact"
        item-value="id"
        show-expand
        header-class="custom-header"
        @update:expanded="$emit('update:expanded', $event)"
      >
        <template #[`item.area`]="{ item }">
          <span>{{ item.area.area }} {{ item.area.unidad }}</span>
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
          <v-icon class="me-2" @click="editZona(item)"> mdi-pencil </v-icon>
          <v-icon v-role="['admin']" @click="deleteZona(item)"> mdi-delete </v-icon>
        </template>

        <template v-slot:bottom> </template>

        <template #expanded-row="{ columns, item }">
          <td :colspan="columns.length" class="border-2 border-b-gray-400">
            <v-card flat class="p-2 bg-transparent">
              <v-row no-gutters>
                <v-col cols="9" class="pr-4">
                  <p v-if="item.gps" class="ml-2 mr-0 p-0 text-xs">
                    <v-icon>mdi-map-marker-radius</v-icon>
                    {{ t('sowing_workspace.gps_info', { lat: item.gps.lat, lng: item.gps.lng }) }}
                  </p>
                  <p v-else class="ml-2 mr-0 mb-2 p-0 text-xs">
                    <v-icon>mdi-map-marker-radius</v-icon> {{ t('sowing_workspace.not_available') }}
                  </p>
                  <p class="ml-2 mr-0 mb-2 p-0 text-xs">
                    <v-icon>mdi-information-outline</v-icon> {{ t('sowing_workspace.information') }}:<label
                      class="rich-text-content"
                      v-html="item.info || t('sowing_workspace.not_available')"
                    ></label>
                  </p>
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
import placeholderZonas from '@/assets/placeholder-zonas.png'
import { useAvatarStore } from '@/stores/avatarStore'
import { useZonasStore } from '@/stores/zonasStore'
import { storeToRefs } from 'pinia'

const props = defineProps({
  siembraInfo: {
    type: Object,
    required: true
  },
  totalArea: {
    type: String,
    required: true
  },
  areaUnit: {
    type: String,
    required: true
  },
  zonasfiltradas: {
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
  zonas: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  esLote: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['open-add-zona', 'edit-zona', 'delete-zona', 'update:expanded'])

const { t } = useI18n()
const avatarStore = useAvatarStore()
const { zonas } = storeToRefs(useZonasStore())

const openAddZona = () => {
  emit('open-add-zona', props.esLote ? 'lote' : 'otro')
}

const editZona = (zona) => {
  emit('edit-zona', zona)
}

const deleteZona = (zona) => {
  emit('delete-zona', zona)
}

const getAvatarUrl = (zonaId) => {
  const zona = zonas.value.find((s) => s.id === zonaId)
  if (!zona) return placeholderZonas
  return avatarStore.getAvatarUrl({ ...zona, type: 'zona' }, 'zonas')
}
</script>

<style scoped>
.rich-text-content {
  line-height: 1.6;
  color: #333;
}
</style>
