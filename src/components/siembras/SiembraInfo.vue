<template>
  <v-card class="siembra-info mb-4" elevation="2">
    <v-card-title class="headline d-flex justify-between align-center">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-information</v-icon>
        <span>{{ t('sowing_workspace.sowing_information') }}</span>
      </div>
      <v-btn
        size="x-small"
        color="green-lighten-2"
        icon
        rounded="circle"
        class="ml-auto"
        @click="openEditDialog"
        @keydown.enter="openEditDialog"
        @keydown.space.prevent="openEditDialog"
        :aria-label="t('sowing_workspace.edit_sowing_info')"
        tabindex="0"
      >
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <div
            class="flex-1 rounded-lg border-2 p-4 mt-2 mb-4 rich-text-content"
            v-html="siembraInfo.info || t('sowing_workspace.not_available')"
          ></div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const props = defineProps({
  siembraInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-edit-dialog'])

const { t } = useI18n()

const openEditDialog = () => {
  emit('open-edit-dialog')
}
</script>

<style scoped>
.rich-text-content {
  line-height: 1.6;
  color: #333;
}

</style>
