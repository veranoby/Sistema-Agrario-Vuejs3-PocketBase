<template>
  <div class="siembra-info mt-0 p-0">
    <v-card-title class="headline d-flex justify-between">
      <h2 class="text-md font-bold mt-2">
        <span v-if="actividadInfo.siembras.length > 0">{{ t('activity_workspace.associated_sowings') }}</span>
      </h2>
      <v-btn
        size="x-small"
        color="green-lighten-2"
        icon
        rounded="circle"
        class="ml-auto"
        @click="openAddSiembrasZonas"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <div class="flex flex-wrap">
        <v-chip
          v-for="siembraId in actividadInfo.siembras"
          size="x-small"
          :key="siembraId"
          class="m-1 p-1"
          :text="
            siembrasStore.getSiembraById(siembraId)?.nombre.toUpperCase() +
            ' ' +
            siembrasStore.getSiembraById(siembraId)?.tipo.toUpperCase()
          "
          pill
          color="green-lighten-3"
          variant="flat"
        >
        </v-chip>
      </div>
      <h2
        v-if="actividadInfo.zonas && actividadInfo.zonas.length > 0"
        class="text-l font-bold mt-2 mb-2"
      >
        {{ t('activity_workspace.other_associated_zones') }}
      </h2>

      <div class="flex flex-wrap">
        <v-chip
          v-for="zonasId in actividadInfo.zonas"
          size="x-small"
          :key="zonasId"
          class="m-1 p-1"
          :text="
            zonasStore.getZonaById(zonasId)?.nombre.toUpperCase() +
            ' - ' +
            zonasStore.getZonaById(zonasId)?.expand?.tipos_zonas?.nombre.toUpperCase()
          "
          pill
          color="blue-lighten-3"
          variant="flat"
        >
        </v-chip>
      </div>
    </v-card-text>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'

const props = defineProps({
  actividadInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-add-siembras-zonas'])

const { t } = useI18n()
const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()

const openAddSiembrasZonas = () => {
  emit('open-add-siembras-zonas')
}
</script>

<style scoped>
.siembra-info {
  background: transparent;
}
</style>
