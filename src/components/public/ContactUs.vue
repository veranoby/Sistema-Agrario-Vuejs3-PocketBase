<template>
  <v-container class="py-12 fill-height">
    <v-row align="center" justify="center" class="w-full">
      <!-- Columna Izquierda: Información de Compromiso y Soporte -->
      <v-col cols="12" md="6" class="pr-md-8 mb-8 mb-md-0">
        <div class="space-y-6">
          <div class="inline-block bg-green-100 text-green-800 px-3 py-1 text-sm font-semibold rounded-full mb-4">
            Soporte y Compromiso
          </div>
          <h1 class="text-4xl font-bold text-green-950 tracking-tight leading-tight mb-4">
            Estamos aquí para impulsar su certificación
          </h1>
          <p class="text-lg text-grey-darken-2 leading-relaxed">
            En ConAgri nos apasiona el éxito de su hacienda. No solo proporcionamos una plataforma de software; ofrecemos un compromiso real para simplificar y agilizar sus auditorías de Buenas Prácticas Agrícolas (BPA).
          </p>

          <v-divider class="my-6"></v-divider>

          <!-- Bloques de contacto y valor -->
          <div class="space-y-6 mt-6">
            <div class="d-flex align-start mb-4">
              <v-icon color="success" size="36" class="mr-4 mt-1">mdi-headset</v-icon>
              <div>
                <h3 class="text-h6 font-weight-bold text-grey-darken-3">Soporte Técnico de Primera Clase</h3>
                <p class="text-body-2 text-grey-darken-1">
                  Nuestro equipo técnico y de asesores agrónomos está disponible para resolver sus dudas de integración, firma RSA y sincronización offline en menos de 24 horas hábiles.
                </p>
              </div>
            </div>

            <div class="d-flex align-start mb-4">
              <v-icon color="success" size="36" class="mr-4 mt-1">mdi-shield-check</v-icon>
              <div>
                <h3 class="text-h6 font-weight-bold text-grey-darken-3">Compromiso de Trazabilidad e Integridad</h3>
                <p class="text-body-2 text-grey-darken-1">
                  Garantizamos que todos sus datos locales y en la nube permanecen resguardados bajo los más altos estándares de seguridad y protección de datos.
                </p>
              </div>
            </div>

            <div class="d-flex align-start mb-4">
              <v-icon color="success" size="36" class="mr-4 mt-1">mdi-email-outline</v-icon>
              <div>
                <h3 class="text-h6 font-weight-bold text-grey-darken-3">Contacto Directo</h3>
                <p class="text-body-2 text-grey-darken-1">
                  ¿Prefiere enviarnos un correo electrónico directo? Escríbanos a:
                  <span class="font-weight-bold text-green-700 block mt-1">soporte@conagri.com</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </v-col>

      <!-- Columna Derecha: Formulario de Contacto -->
      <v-col cols="12" md="6">
        <v-card class="elevation-12 rounded-xl border">
          <v-toolbar color="success" dark class="px-2">
            <v-toolbar-title class="font-weight-bold text-white">Contáctenos</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon to="/" exact color="white"><v-icon>mdi-home</v-icon></v-btn>
          </v-toolbar>
          <v-card-text class="pa-6">
            <p class="mb-6 text-body-1 text-grey-darken-1">
              ¿Tiene dudas sobre el sistema ConAgri? Envíenos un mensaje y nuestro equipo de soporte se pondrá en contacto pronto.
            </p>
            <v-form ref="form" v-model="valid">
              <v-text-field
                v-model="nombre"
                label="Nombre"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                color="success"
                :rules="[v => !!v || 'Requerido']"
                required
                class="mb-3"
              ></v-text-field>

              <v-text-field
                v-model="email"
                label="Correo Electrónico"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                color="success"
                :rules="emailRules"
                required
                class="mb-3"
              ></v-text-field>

              <v-textarea
                v-model="mensaje"
                label="Mensaje"
                prepend-inner-icon="mdi-message"
                variant="outlined"
                color="success"
                :rules="[v => !!v || 'Requerido']"
                required
                rows="4"
              ></v-textarea>
            </v-form>
          </v-card-text>
          <v-card-actions class="pa-6 pt-0">
            <v-btn
              color="success"
              variant="elevated"
              size="large"
              block
              :disabled="!valid"
              :loading="loading"
              @click="submitForm"
              class="text-capitalize font-weight-bold"
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
