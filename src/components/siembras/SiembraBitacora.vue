<template>
  <v-card class="mb-4" elevation="2">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>{{ t('sowing_workspace.recent_log') }}</span>
      <v-btn
        size="small"
        color="green-lighten-2"
        icon
        rounded="circle"
        class="ml-auto"
        @click="openNewBitacoraEntryDialog"
        @keydown.enter="openNewBitacoraEntryDialog"
        @keydown.space.prevent="openNewBitacoraEntryDialog"
        :aria-label="t('sowing_workspace.new_entry')"
        tabindex="0"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <EmbeddedBitacoraList :siembraId="siembraId" title="" :itemLimit="5" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import EmbeddedBitacoraList from '@/components/bitacora/EmbeddedBitacoraList.vue'

const props = defineProps({
  siembraId: {
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
