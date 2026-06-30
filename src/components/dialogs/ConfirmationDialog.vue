<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-6 relative overflow-hidden">
    <!-- Círculos decorativos de fondo -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

    <v-card
      class="backdrop-blur-xl bg-white/80 border border-white/40 shadow-2xl rounded-3xl overflow-hidden z-10 w-full max-w-lg transition-all duration-500 hover:shadow-3xl"
      elevation="0"
    >
      <!-- Estado: Esperando Acción / Cargando / Error -->
      <div v-if="isOpenLocal" class="p-10 text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-full mb-6 shadow-inner">
          <v-icon size="40" class="animate-pulse">mdi-email-check-outline</v-icon>
        </div>
        <h2 class="text-3xl font-extrabold text-gray-800 mb-3 tracking-tight">Verifica tu cuenta</h2>
        <p class="text-gray-500 mb-8 text-sm leading-relaxed">
          Pega el código de seguridad que recibiste en tu correo electrónico para activar tu cuenta de forma segura.
        </p>

        <v-form @submit.prevent="confirmEmail" class="space-y-6">
          <v-text-field
            v-model="token"
            label="Código de Verificación (Token)"
            variant="outlined"
            color="primary"
            bg-color="white"
            hide-details
            class="shadow-sm rounded-xl"
            prepend-inner-icon="mdi-shield-key-outline"
          ></v-text-field>

          <v-btn
            type="submit"
            :loading="isLoading"
            block
            size="x-large"
            color="primary"
            class="rounded-xl font-bold tracking-wide shadow-lg hover:scale-[1.02] transition-transform duration-300"
            elevation="0"
          >
            Confirmar Identidad
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </v-form>
      </div>

      <!-- Estado: Éxito -->
      <div v-else class="p-12 text-center bg-gradient-to-b from-green-50/50 to-transparent">
        <div class="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-500 text-white rounded-full mb-6 shadow-xl transform hover:rotate-12 transition-transform duration-500">
          <v-icon size="50">mdi-check-decagram</v-icon>
        </div>
        <h2 class="text-3xl font-extrabold text-gray-800 mb-2">¡Identidad Confirmada!</h2>
        <p class="text-gray-600 mb-8 font-medium">
          Tu registro ha sido validado exitosamente. 
          <br/><br/>
          Por favor, usa el botón de <strong>"Ingresar"</strong> en la barra de navegación superior para acceder al sistema.
        </p>
      </div>
    </v-card>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

export default {
  name: 'EmailConfirmation',
  props: {
    isOpen: { type: Boolean, default: true }
  },
  setup(props) {
    const authStore = useAuthStore()
    const route = useRoute()
    const uiFeedbackStore = useUiFeedbackStore()
    
    const token = ref('')
    const isOpenLocal = ref(props.isOpen)
    const isLoading = ref(false)

    const confirmEmail = async () => {
      if (!token.value) {
        uiFeedbackStore.showSnackbar('Por favor ingresa tu token de seguridad.', 'warning')
        return
      }

      isLoading.value = true
      try {
        await authStore.confirmEmail(token.value)
        uiFeedbackStore.showSnackbar('¡Identidad validada con éxito!', 'success')
        isOpenLocal.value = false
      } catch (error) {
        uiFeedbackStore.showSnackbar('El código ha expirado o ya fue utilizado. Solicita uno nuevo.', 'error')
        isOpenLocal.value = true
      } finally {
        isLoading.value = false
      }
    }

    onMounted(async () => {
      const queryToken = route.params.token || route.query.token
      if (queryToken) {
        token.value = queryToken
        await confirmEmail()
      }
    })

    return { token, isOpenLocal, isLoading, confirmEmail }
  }
}
</script>

<style scoped>
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
</style>
