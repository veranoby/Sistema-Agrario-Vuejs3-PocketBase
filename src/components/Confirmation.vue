<template>
  <div class="w-full max-w-4xl mx-auto py-12">
    <v-container class="rounded-lg border-4" v-if="isOpen">
      <v-col cols="12">
        <v-card>
          <v-card-title> <h2 class="text-2xl font-bold">CONFIRME SU EMAIL..</h2></v-card-title>
          <v-card-text>
            <v-form @submit.prevent="confirmEmail">
              <v-text-field
                class="compact-form"
                v-model="token"
                label="Confirmation Token"
                hint="Paste the token here"
                required
              ></v-text-field>
              <v-btn
                type="submit"
                size="small"
                variant="flat"
                rounded="lg"
                prepend-icon="mdi-check"
                color="blue-lighten-3"
                block
              >
                Confirm Email
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-container>
    <v-container class="rounded-lg border-4" v-else>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5"> GRACIAS POR CONFIRMAR SU REGISTRO </v-card-title>
          <v-card-text>Proceda por favor a ingresar al sistema.. </v-card-text>
        </v-card>
      </v-col>
    </v-container>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

export default {
  name: 'EmailConfirmation',
  props: {
    isOpen: {
      type: Boolean,
      default: true
    }
  },

  setup(props) {
    const authStore = useAuthStore()
    const route = useRoute()
    const router = useRouter()
    const snackbarStore = useSnackbarStore()
    const token = ref('')
    const isOpenLocal = ref(props.isOpen)

    const confirmEmail = async () => {
      if (!token.value) {
        snackbarStore.showSnackbar('Please enter a confirmation token.', 'error')
        isOpenLocal.value = true
        return
      }

      try {
        await authStore.confirmEmail(token.value)
        snackbarStore.showSnackbar('Email confirmed successfully!', 'success')
        isOpenLocal.value = false
        router.push({ name: 'Login' })
      } catch (error) {
        snackbarStore.showSnackbar(
          'Failed to confirm email. Please check your token and try again.',
          'error'
        )
        isOpenLocal.value = true
      }
    }

    // Automatically extract the token from the query parameters
    onMounted(async () => {
      const queryToken = route.params.token || route.query.token
      if (queryToken) {
        token.value = queryToken
        try {
          await authStore.confirmEmail(token.value)
          snackbarStore.showSnackbar('Email confirmado exitosamente!', 'success')
          isOpenLocal.value = false
          router.push({ name: 'Login' })
        } catch (error) {
          snackbarStore.showSnackbar(
            'Error al confirmar el email. Por favor verifique el token e intente nuevamente.',
            'error'
          )
          isOpenLocal.value = true
        }
      }
    })

    return { token, isOpenLocal, confirmEmail }
  }
}
</script>
