<template>
  <v-snackbar v-model="isVisible" :color="color" :timeout="2000" @update:modelValue="closeSnackbar">
    {{ message }}
  </v-snackbar>
</template>

<script>
import { useSnackbarStore } from '../stores/snackbarStore'
import { computed } from 'vue'

export default {
  setup() {
    const snackbarStore = useSnackbarStore()

    const isVisible = computed(() => snackbarStore.show)
    const message = computed(() => snackbarStore.message)
    const color = computed(() => snackbarStore.color)

    const closeSnackbar = () => {
      snackbarStore.show = false
    }

    return {
      isVisible,
      message,
      color,
      closeSnackbar
    }
  }
}
</script>

<style scoped>
/* Your styles here */
</style>
