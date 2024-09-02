<template>
  <v-snackbar
    v-model="isVisible"
    :color="color"
    :timeout="2000"
    multi-line
    @update:modelValue="closeSnackbar"
  >
    {{ message }}
    <template v-slot:actions>
      <v-btn color="white" variant="text" small @click="closeSnackbar" v-if="cloaseComp">
        Cerrar
      </v-btn>
      <v-progress-circular color="white" indeterminate v-if="loadComp"></v-progress-circular>
    </template>
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

    const loadComp = computed(() => snackbarStore.loading) // nuevo estado para mostrar un loading mientras se procesa algo
    const cloaseComp = computed(() => snackbarStore.closing) // nuevo estado para mostrar un CERRAR mientras sale mensaje

    const closeSnackbar = () => {
      snackbarStore.hideSnackbar()
      // snackbarStore.show = false
    }

    return {
      isVisible,
      message,
      color,
      loadComp,
      cloaseComp,
      closeSnackbar
    }
  }
}
</script>

<style scoped>
/* Your styles here */
</style>
