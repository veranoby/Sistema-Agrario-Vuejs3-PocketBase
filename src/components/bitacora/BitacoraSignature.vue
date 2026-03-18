<template>
  <div class="bitacora-signature">
    <v-btn
      v-if="!isSigned"
      @click="handleSign"
      :loading="signing"
      color="primary"
      prepend-icon="mdi-signature"
      :disabled="!isWebCryptoSupported"
    >
      {{ !isWebCryptoSupported ? 'Navegador no soportado' : 'Firmar Digitalmente' }}
    </v-btn>

    <v-chip v-else color="success" prepend-icon="mdi-check-circle">
      Firmado el {{ signatureDate }}
    </v-chip>

    <v-alert
      v-if="error"
      type="error"
      closable
      class="mt-2"
    >
      {{ error }}
    </v-alert>

    <v-alert
      v-if="showVerifyResult"
      :type="verified ? 'success' : 'error'"
      closable
      class="mt-2"
    >
      {{ verified ? 'Firma verificada correctamente' : 'Firma NO verificada - Datos pueden estar comprometidos' }}
    </v-alert>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { digitalSignature, isWebCryptoSupported } from '@/utils/digitalSignature'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'

const props = defineProps({
  bitacoraId: {
    type: String,
    required: true
  },
  existingSignature: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['signed'])

const isSigned = ref(false)
const signatureDate = ref(null)
const signing = ref(false)
const error = ref(null)
const verified = ref(false)
const showVerifyResult = ref(false)

onMounted(() => {
  if (props.existingSignature) {
    isSigned.value = true
    signatureDate.value = new Date(
      props.existingSignature.timestamp
    ).toLocaleString()
    
    // Verificar firma existente
    verifyExistingSignature()
  }
})

/**
 * Verifica la firma existente al cargar
 */
async function verifyExistingSignature() {
  try {
    const isValid = await digitalSignature.verify(props.existingSignature)
    verified.value = isValid
    showVerifyResult.value = !isValid // Solo mostrar si es inválida
  } catch (err) {
    logger.error('[BitacoraSignature] Error verificando firma:', err)
  }
}

/**
 * Maneja la firma digital
 */
async function handleSign() {
  signing.value = true
  error.value = null

  try {
    // Asegurar que tenemos par de claves
    if (!digitalSignature.keyPair) {
      try {
        await digitalSignature.loadKeyPair()
      } catch {
        logger.info('[BitacoraSignature] Generando nuevo par de claves...')
        await digitalSignature.generateKeyPair()
      }
    }

    // Crear datos a firmar
    const dataToSign = {
      bitacoraId: props.bitacoraId,
      timestamp: new Date().toISOString(),
      userId: pb.authStore.model?.id
    }

    // Firmar
    const signature = await digitalSignature.sign(dataToSign)

    isSigned.value = true
    signatureDate.value = new Date().toLocaleString()
    verified.value = true

    logger.info('[BitacoraSignature] Documento firmado exitosamente')
    emit('signed', signature)
  } catch (err) {
    error.value = err.message || 'Error al firmar. Intente nuevamente.'
    logger.error('[BitacoraSignature] Error firmando:', err)
  } finally {
    signing.value = false
  }
}
</script>

<style scoped>
.bitacora-signature {
  display: inline-block;
}
</style>
