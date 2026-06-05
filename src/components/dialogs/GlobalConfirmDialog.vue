<template>
  <v-dialog v-model="uiStore.confirm.show" persistent max-width="450px" class="rounded-lg overflow-hidden">
    <v-card class="rounded-lg">
      <v-toolbar :color="uiStore.confirm.color" dark flat density="compact">
        <v-icon start class="ml-4">{{ uiStore.confirm.icon }}</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          {{ uiStore.confirm.title }}
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-6 text-body-1">
        <div class="d-flex align-center">
          <div class="flex-grow-1">{{ uiStore.confirm.message }}</div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-5">
        <v-spacer />
        <v-btn
          variant="text"
          color="grey-darken-1"
          class="px-6"
          @click="uiStore.resolveConfirm(false)"
        >
          CANCELAR
        </v-btn>
        <v-btn
          variant="flat"
          :color="uiStore.confirm.color"
          class="px-8 font-weight-bold"
          @click="uiStore.resolveConfirm(true)"
        >
          CONFIRMAR
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const uiStore = useUiFeedbackStore()
</script>

<style scoped>
.v-dialog > .v-overlay__content > .v-card {
  border-radius: 24px !important;
}
</style>
