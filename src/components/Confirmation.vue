<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Confirmación de correo electrónico</v-card-title>
          <v-card-text>
            <v-alert type="info" v-if="loading">Confirmando...</v-alert>
            <v-alert type="success" v-if="success"
              >¡Correo electrónico confirmado exitosamente!</v-alert
            >
            <v-alert type="error" v-if="error">Error al confirmar el correo electrónico.</v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

export default {
  name: 'EmailConfirmation', // Added component name
  setup() {
    const route = useRoute()
    const authStore = useAuthStore()
    const loading = ref(true)
    const success = ref(false)
    const error = ref(false)

    onMounted(async () => {
      const token = route.query.token
      if (token) {
        try {
          await authStore.confirmEmail(token)
          success.value = true
        } catch (err) {
          error.value = true
        } finally {
          loading.value = false
        }
      } else {
        error.value = true
        loading.value = false
      }
    })

    return {
      loading,
      success,
      error
    }
  }
}
</script>
