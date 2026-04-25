<template>
  <v-card class="bitacora-embedded-section" elevation="2">
    <v-card-title class="d-flex justify-space-between align-center text-body-1">
      <span>{{ t('activity_workspace.recent_log') }}</span>
      <v-btn
        color="secondary"
        @click="openNewBitacoraEntryDialog"
        size="small"
        variant="elevated"
      >
        <v-icon start>mdi-plus-box-outline</v-icon>
        {{ t('activity_workspace.new_entry') }}
      </v-btn>
    </v-card-title>
    <v-card-text class="pa-2">
      <EmbeddedBitacoraList :actividadId="actividadId" title="" :itemLimit="5" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import EmbeddedBitacoraList from '@/components/bitacora/EmbeddedBitacoraList.vue'

const props = defineProps({
  actividadId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['open-new-bitacora-entry-dialog'])

const { t } = useI18n()

const openNewBitacoraEntryDialog = () => {
  emit('open-new-bitacora-entry-dialog')
}
</script>

<style scoped>
.bitacora-embedded-section {
  background: white;
}
</style>
