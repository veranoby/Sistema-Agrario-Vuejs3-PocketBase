<template>
  <v-snackbar v-model="isVisible" :color="color" :timeout="timeout" multi-line>
    {{ message }}
    <template v-slot:actions>
      <v-btn color="white" variant="text" size="small" @click="closeSnackbar" v-if="cloaseComp">
        Cerrar
      </v-btn>
      <v-progress-circular color="white" indeterminate v-if="loadComp"></v-progress-circular>
    </template>
  </v-snackbar>
</template>

<script>
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { computed } from 'vue'

export default {
  setup() {
    const uiFeedbackStore = useUiFeedbackStore()

    const isVisible = computed({
      get: () => uiFeedbackStore.toast.show,
      set: (val) => { if (!val) uiFeedbackStore.hideSnackbar() }
    })
    const message = computed(() => uiFeedbackStore.toast.text)
    const color = computed(() => uiFeedbackStore.toast.color)
    const timeout = computed(() => uiFeedbackStore.toast.timeout || 3000)

    const loadComp = computed(() => uiFeedbackStore.globalLoading) // globalLoading state
    const cloaseComp = computed(() => true) // Siempre mostrar cerrar

    const closeSnackbar = () => {
      uiFeedbackStore.hideSnackbar()
    }

    return {
      isVisible,
      message,
      color,
      timeout,
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
