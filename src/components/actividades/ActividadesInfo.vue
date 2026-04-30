<template>
  <v-card class="actividad-info mb-4" elevation="2">
    <v-card-title class="headline d-flex flex-column">
      <div class="d-flex justify-space-between align-center w-100">
        <span>{{ t('activity_workspace.activity_information') }}</span>
        <v-btn
          size="x-small"
          color="green-lighten-2"
          icon
          rounded="circle"
          class="ml-auto"
          @click="openEditDialog"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </div>
      <div class="w-100 mt-2 flex flex-wrap gap-1">
        <v-tooltip
          v-for="(metrica, key) in actividadInfo.metricas"
          :key="key"
          location="bottom"
        >
          <template v-slot:activator="{ props }">
            <v-chip
              variant="flat"
              size="x-small"
              color="green-lighten-3"
              class="m-0 p-1"
              pill
            >
              {{ key.replace(/_/g, ' ').toUpperCase() }}:
              {{ formatMetricValue(metrica.valor) }}
            </v-chip>
          </template>
          <span>{{ metrica.descripcion }}</span>
        </v-tooltip>
      </div>
    </v-card-title>
    <v-card-text>
      <div
        class="rich-text-content"
        v-html="actividadInfo.descripcion || t('activity_workspace.not_available')"
      ></div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
  actividadInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-edit-dialog'])

const { t } = useI18n()

const openEditDialog = () => {
  emit('open-edit-dialog')
}

const formatMetricValue = (value) => {
  if (!value || value === null) return 'N/A'
  return Array.isArray(value) ? value[0] : value
}
</script>

<style scoped>
.rich-text-content {
  line-height: 1.6;
  color: #333;
}

.rich-text-content:empty:before {
  content: attr(data-placeholder);
  color: #999;
  font-style: italic;
}
</style>
