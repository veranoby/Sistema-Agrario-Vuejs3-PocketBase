<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12 rounded-xl">
          <v-toolbar color="primary" dark>
            <v-toolbar-title class="font-weight-bold">Contáctenos</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon to="/" exact><v-icon>mdi-home</v-icon></v-btn>
          </v-toolbar>
          <v-card-text class="pa-6">
            <p class="mb-4 text-body-1 text-grey-darken-1">
              ¿Tiene dudas sobre el sistema ConAgri? Envíenos un mensaje y nuestro equipo de soporte se pondrá en contacto pronto.
            </p>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="nombre"
                label="Nombre"
                prepend-icon="mdi-account"
                :rules="[v => !!v || 'Requerido']"
                required
              ></v-text-field>

              <v-text-field
                v-model="email"
                label="Correo Electrónico"
                prepend-icon="mdi-email"
                :rules="emailRules"
                required
              ></v-text-field>

              <v-textarea
                v-model="mensaje"
                label="Mensaje"
                prepend-icon="mdi-message"
                :rules="[v => !!v || 'Requerido']"
                required
                rows="4"
              ></v-textarea>
            </v-form>
          </v-card-text>
          <v-card-actions class="pa-6 pt-0">
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              variant="elevated"
              size="large"
              :disabled="!valid"
              :loading="loading"
              @click="submitForm"
            >
              Enviar Mensaje
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'


const valid = ref(false)
const form = ref(null)
const nombre = ref('')
const email = ref('')
const mensaje = ref('')
const loading = ref(false)

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const settingsStore = useSettingsStore()

onMounted(async () => {
  await settingsStore.fetchConfig()
})

const emailRules = [
  v => !!v || 'El e-mail es requerido',
  v => /.+@.+..+/.test(v) || 'El e-mail debe ser válido',
]

const submitForm = async () => {
  if (!valid.value) return
  loading.value = true

  const apiKey = settingsStore.resendApiKey
  const toEmail = settingsStore.config.support_email || 'soporte@conagri.com'

  if (!apiKey) {
      setTimeout(() => {
          loading.value = false
          snackbarMsg.value = 'Mensaje enviado. Nos pondremos en contacto pronto (Simulado por falta de API Key).'
          snackbarColor.value = 'success'
          snackbar.value = true
          form.value.reset()
      }, 1000)
      return
  }

  try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: toEmail,
            subject: `Nuevo mensaje de contacto de ${nombre.value}`,
            html: `<p><strong>Nombre:</strong> ${nombre.value}</p><p><strong>Email:</strong> ${email.value}</p><p><strong>Mensaje:</strong></p><p>${mensaje.value}</p>`
        })
      })

      if (!res.ok) throw new Error('Fallo al enviar correo')

      snackbarMsg.value = 'Mensaje enviado. Nos pondremos en contacto pronto.'
      snackbarColor.value = 'success'
      snackbar.value = true
      form.value.reset()
  } catch (error) {
      console.error(error)
      snackbarMsg.value = 'Error al enviar el mensaje. Intente más tarde.'
      snackbarColor.value = 'error'
      snackbar.value = true
  } finally {
      loading.value = false
  }
}
</script>
