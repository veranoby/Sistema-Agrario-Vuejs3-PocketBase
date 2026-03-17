<template>
  <v-card class="bitacora-embedded-section mb-4" elevation="2">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>{{ t('sowing_workspace.recent_log') }}</span>
      <v-btn
        class="agricultural-btn agricultural-btn--primary"
        @click="openNewBitacoraEntryDialog"
        @keydown.enter="openNewBitacoraEntryDialog"
        @keydown.space.prevent="openNewBitacoraEntryDialog"
        size="large"
        :aria-label="t('sowing_workspace.new_entry')"
        tabindex="0"
      >
        <v-icon start>mdi-plus-circle-outline</v-icon>
        {{ t('sowing_workspace.new_entry') }}
      </v-btn>
    </v-card-title>
    <v-card-text>
      <EmbeddedBitacoraList :siembraId="siembraId" title="" :itemLimit="5" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import EmbeddedBitacoraList from '@/components/EmbeddedBitacoraList.vue'

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

<style scoped>
.agricultural-btn {
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.025em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}

.agricultural-btn--primary {
  background: linear-gradient(45deg, var(--agri-green-primary, #2e7d32), var(--agri-green-light, #4caf50));
  border: none;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
  color: white;
}

.agricultural-btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(46, 125, 50, 0.4);
}

.bitacora-embedded-section {
  background: white;
}
</style>
