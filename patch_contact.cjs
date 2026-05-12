const fs = require('fs');
const filePath = 'src/components/public/ContactUs.vue';

let content = fs.readFileSync(filePath, 'utf8');

// Añadir llamada real a Resend
const importSettings = `import { ref, onMounted } from 'vue'\nimport { useSettingsStore } from '@/stores/settingsStore'`;
content = content.replace(/import \{ ref \} from 'vue'/, importSettings);

const logic = `
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
  v => /.+@.+\..+/.test(v) || 'El e-mail debe ser válido',
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
            'Authorization': \`Bearer \${apiKey}\`
        },
        body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: toEmail,
            subject: \`Nuevo mensaje de contacto de \${nombre.value}\`,
            html: \`<p><strong>Nombre:</strong> \${nombre.value}</p><p><strong>Email:</strong> \${email.value}</p><p><strong>Mensaje:</strong></p><p>\${mensaje.value}</p>\`
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
`;

content = content.replace(/const valid = ref\(false\)[\s\S]*?\}\n/m, logic);

fs.writeFileSync(filePath, content);
console.log('ContactUs.vue patched to use Resend API.');
