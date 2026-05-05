<template>
  <v-snackbar v-model="isVisible" :color="color" :timeout="2000" multi-line>
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
      get: () => uiFeedbackStore.show,
      set: (val) => (val ? uiFeedbackStore.showSnackbar() : uiFeedbackStore.hideSnackbar())
    })
    const message = computed(() => uiFeedbackStore.message)
    const color = computed(() => uiFeedbackStore.color)

    const loadComp = computed(() => uiFeedbackStore.loading) // nuevo estado para mostrar un loading mientras se procesa algo
    const cloaseComp = computed(() => uiFeedbackStore.closing) // nuevo estado para mostrar un CERRAR mientras sale mensaje

    const closeSnackbar = () => {
      uiFeedbackStore.hideSnackbar()
      // uiFeedbackStore.show = false
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
