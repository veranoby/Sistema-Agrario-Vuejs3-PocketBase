<template>
  <v-container class="fill-height justify-center align-center py-10 px-4 verification-view-bg">
    <v-row justify="center" class="w-100">
      <v-col cols="12" sm="10" md="8" lg="6">
        
        <!-- Header Branding (Visible on mobile/standalone) -->
        <div class="text-center mb-8 fade-in-down">
          <div class="d-inline-flex align-center justify-center rounded-circle bg-primary-5 pa-3 mb-3 shadow-soft">
            <v-icon size="40" color="primary">mdi-shield-check</v-icon>
          </div>
          <h3 class="text-h4 font-weight-black text-primary-4 text-tracking-tight">ConAgri Oráculo</h3>
          <p class="text-md text-grey-darken-1 mt-1">Plataforma Pública de Validación Criptográfica</p>
        </div>

        <!-- Main Content Card -->
        <v-card class="elevation-10 rounded-lg glass-card overflow-hidden transition-all duration-300">
          <!-- Top Decorative Accent Bar -->
          <div class="h-2 w-100" :class="accentBarClass"></div>

          <!-- Loading State -->
          <v-card-text v-if="loading" class="text-center py-12 px-6">
            <div class="pulse-loader mb-6">
              <v-progress-circular
                indeterminate
                :size="72"
                :width="6"
                color="primary"
              ></v-progress-circular>
            </div>
            <h3 class="text-h6 font-weight-bold text-grey-darken-3">Consultando el Oráculo</h3>
            <p class="text-smtext-grey-darken-1 mt-2">
              Verificando firma digital y validez del hash SHA-256 en la base inmutable...
            </p>
          </v-card-text>

          <!-- Error / Invalid Hash State -->
          <v-card-text v-else-if="error || !verificationData?.valid" class="py-10 px-6 text-center">
            <div class="d-inline-flex justify-center align-center rounded-circle bg-red-lighten-5 pa-4 mb-4 animate-bounce">
              <v-icon size="64" color="error">mdi-shield-alert-outline</v-icon>
            </div>
            
            <h3 class="text-md font-weight-black text-red-darken-4 mb-3">Firma Digital Inválida</h3>
            
            <v-alert
              type="error"
              variant="tonal"
              density="comfortable"
              class="mb-6 rounded-lg text-left"
            >
              {{ errorMessage }}
            </v-alert>

            <p class="text-smtext-grey-darken-2 mb-8">
              Este hash no está registrado en el oráculo público o el documento asociado ha sufrido modificaciones, lo que invalida su integridad criptográfica.
            </p>

            <div class="text-xs text-grey bg-grey-lighten-4 pa-3 rounded-lg font-mono text-break mb-6">
              HASH CONSULTADO: <br>{{ currentHash || 'NINGUNO' }}
            </div>

            <v-btn
              color="grey-darken-3"
              variant="flat"
              prepend-icon="mdi-home"
              size="large"
              class="rounded-lg px-6"
              to="/"
            >
              Ir al Inicio
            </v-btn>
          </v-card-text>

          <!-- Success / Authenticated State -->
          <v-card-text v-else class="py-8 px-6">
            <!-- Sello Grande de Éxito -->
            <div class="text-center mb-6">
              <div class="d-inline-flex justify-center align-center rounded-circle bg-primary-5 border-success-glow pa-4 mb-3 scale-up">
                <v-icon size="64" color="primary">mdi-check-decagram</v-icon>
              </div>
              <h3 class="text-md font-weight-black text-primary-4">DOCUMENTO AUTÉNTICO</h3>
              <v-chip color="primary" size="small" class="font-weight-bold px-4 mt-2" variant="flat">
                Verificación Exitosa
              </v-chip>
            </div>

            <v-divider class="mb-6"></v-divider>

            <!-- Metadata List -->
            <div class="metadata-grid">
              <div class="metadata-item d-flex align-start mb-4">
                <div class="bg-grey-lighten-4 rounded-lg pa-2 mr-3 mt-1">
                  <v-icon color="green-darken-3">mdi-home-map-marker</v-icon>
                </div>
                <div>
                  <span class="text-xs text-grey font-weight-bold uppercase-tracking">Hacienda Productora</span>
                  <div class="  font-weight-black text-grey-darken-3">{{ verificationData.hacienda || 'No especificada' }}</div>
                </div>
              </div>

              <div class="metadata-item d-flex align-start mb-4">
                <div class="bg-grey-lighten-4 rounded-lg pa-2 mr-3 mt-1">
                  <v-icon color="green-darken-3">mdi-playlist-check</v-icon>
                </div>
                <div>
                  <span class="text-xs text-grey font-weight-bold uppercase-tracking">Actividad Certificada</span>
                  <div class="  font-weight-black text-grey-darken-3">{{ verificationData.actividad || 'No especificada' }}</div>
                </div>
              </div>

              <div class="metadata-item d-flex align-start mb-4">
                <div class="bg-grey-lighten-4 rounded-lg pa-2 mr-3 mt-1">
                  <v-icon color="green-darken-3">mdi-account-check</v-icon>
                </div>
                <div>
                  <span class="text-xs text-grey font-weight-bold uppercase-tracking">Responsable Técnico</span>
                  <div class="  font-weight-black text-grey-darken-3">{{ verificationData.operario || 'No especificado' }}</div>
                </div>
              </div>

              <div class="metadata-item d-flex align-start mb-4">
                <div class="bg-grey-lighten-4 rounded-lg pa-2 mr-3 mt-1">
                  <v-icon color="green-darken-3">mdi-calendar-clock</v-icon>
                </div>
                <div>
                  <span class="text-xs text-grey font-weight-bold uppercase-tracking">Fecha de Ejecución</span>
                  <div class="  font-weight-bold text-grey-darken-3">{{ formatDateTime(verificationData.fecha_ejecucion) }}</div>
                </div>
              </div>

              <div class="metadata-item d-flex align-start mb-4">
                <div class="bg-grey-lighten-4 rounded-lg pa-2 mr-3 mt-1">
                  <v-icon color="green-darken-3">mdi-clock-check-outline</v-icon>
                </div>
                <div>
                  <span class="text-xs text-grey font-weight-bold uppercase-tracking">Sello de Tiempo de Firma</span>
                  <div class="  font-weight-bold text-grey-darken-3">{{ formatDateTime(verificationData.timestamp) }}</div>
                </div>
              </div>
            </div>

            <v-divider class="my-6"></v-divider>

            <!-- Hash SHA-256 Box -->
            <div class="bg-primary-5 border border-green-lighten-3 pa-4 rounded-lg mb-6">
              <div class="d-flex align-center mb-1">
                <v-icon color="primary" size="small" class="mr-1">mdi-key-variant</v-icon>
                <span class="text-xs font-weight-black text-primary-4 uppercase-tracking">Integridad de Firma Criptográfica</span>
              </div>
              <div class="text-xs font-mono text-grey-darken-2 text-break select-all mt-1">
                {{ verificationData.hash }}
              </div>
            </div>

            <!-- Footer checks -->
            <div class="d-flex flex-column gap-2 text-xs text-grey-darken-1 mb-8">
              <div class="d-flex align-center">
                <v-icon color="primary" size="16" class="mr-2">mdi-check-circle</v-icon>
                Firma criptográfica generada con clave privada RSA verificada.
              </div>
              <div class="d-flex align-center">
                <v-icon color="primary" size="16" class="mr-2">mdi-check-circle</v-icon>
                Registro inmutable auditado sin alteraciones.
              </div>
              <div class="d-flex align-center">
                <v-icon color="primary" size="16" class="mr-2">mdi-check-circle</v-icon>
                BPA ConAgri - Registro de control oficial Agrocalidad.
              </div>
            </div>

            <div class="d-flex flex-column flex-sm-row gap-3 justify-center">
              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-printer"
                size="large"
                class="rounded-lg px-6 shadow-btn"
                @click="printReceipt"
              >
                Imprimir Validación
              </v-btn>
              <v-btn
                color="grey-darken-2"
                variant="outlined"
                prepend-icon="mdi-home"
                size="large"
                class="rounded-lg px-6"
                to="/"
              >
                Ir al Inicio
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Technical disclaimer -->
        <p class="text-center text-xs text-grey-darken-1 mt-6 px-4">
          ConAgri utiliza criptografía asimétrica e infraestructura de clave pública local. Esta página garantiza la correspondencia matemática de las firmas sin almacenar archivos en servidores (Zero-Storage).
        </p>

      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { pb } from '@/utils/pocketbase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const route = useRoute()
const currentHash = computed(() => route.query.hash || '')

const loading = ref(true)
const error = ref(false)
const errorMessage = ref('')
const verificationData = ref(null)

const accentBarClass = computed(() => {
  if (loading.value) return 'bg-grey-lighten-1'
  if (error.value || !verificationData.value?.valid) return 'bg-red-darken-4'
  return 'bg-primary-4'
})

onMounted(async () => {
  await verifyHash()
})

async function verifyHash() {
  const hash = currentHash.value
  if (!hash) {
    loading.value = false
    error.value = true
    errorMessage.value = 'No se ha proporcionado ningún hash de firma para verificar.'
    return
  }

  try {
    loading.value = true
    error.value = false
    
    // Llamar al oráculo seguro usando la instancia pb
    const data = await pb.send('/api/verify-signature', {
      query: { hash: hash }
    })
    
    if (data && data.valid) {
      verificationData.value = data
    } else {
      error.value = true
      errorMessage.value = data?.error || 'La firma consultada no es válida o fue modificada.'
    }
  } catch (err) {
    error.value = true
    // Manejar errores de respuesta de PocketBase
    if (err.status === 404) {
      errorMessage.value = 'Firma digital inexistente. El documento de campo no tiene un registro auténtico de firma válido en Agroassist.'
    } else if (err.status === 400) {
      errorMessage.value = err.response?.error || 'Parámetro de verificación incorrecto.'
    } else {
      errorMessage.value = 'Error al conectarse con el servidor de auditoría. Verifique su conexión.'
    }
  } finally {
    loading.value = false
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es })
  } catch {
    return dateStr
  }
}

function printReceipt() {
  window.print()
}
</script>

<style scoped>
.verification-view-bg {
  background: radial-gradient(circle at 50% 50%, #f4fbf7 0%, #e8f5e9 100%);
  min-height: 85vh;
}

.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
}

.border-success-glow {
  border: 4px solid #c8e6c9;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.uppercase-tracking {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.7rem;
}

.text-tracking-tight {
  letter-spacing: -0.02em;
}

/* Animations */
.fade-in-down {
  animation: fadeInDown 0.8s ease-out forwards;
}

.scale-up {
  animation: scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.animate-bounce {
  animation: bounce 2s infinite;
}

.pulse-loader {
  animation: pulse 1.8s ease-in-out infinite;
}

.shadow-soft {
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.shadow-btn {
  box-shadow: 0 4px 14px rgba(76, 175, 80, 0.4);
}

.select-all {
  user-select: all;
  -webkit-user-select: all;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleUp {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.03);
    opacity: 0.85;
  }
}

@media print {
  /* Hide headers/navs and background of standard layouts on print */
  header, nav, .v-navigation-drawer, .v-btn, p.text-center {
    display: none !important;
  }
  .verification-view-bg {
    background: white !important;
    min-height: auto !important;
    padding: 0 !important;
  }
  .glass-card {
    box-shadow: none !important;
    border: none !important;
  }
}
</style>
