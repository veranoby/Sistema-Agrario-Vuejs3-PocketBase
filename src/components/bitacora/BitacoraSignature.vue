<template>
  <div class="bitacora-signature-container d-flex flex-col gap-3 my-4">
    <div class="text-subtitle-1 font-weight-bold mb-1 text-grey-darken-3 d-flex align-center">
      <v-icon color="primary" class="mr-2">mdi-draw-pen</v-icon>
      Firma del Operador / Responsable
    </div>

    <!-- Lienzo de Dibujo interactivo -->
    <div 
      v-if="!isSigned"
      class="canvas-wrapper position-relative bg-white rounded-lg border-2 border-dashed"
      :class="hasDrawn ? 'border-success' : 'border-grey-lighten-1'"
      style="overflow: hidden; max-width: 420px; width: 100%;"
    >
      <canvas 
        ref="canvasRef" 
        width="400" 
        height="180" 
        style="display: block; cursor: crosshair; touch-action: none; width: 100%; height: 180px;"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart="startDrawingTouch"
        @touchmove="drawTouch"
        @touchend="stopDrawing"
      ></canvas>
      
      <div 
        v-if="!hasDrawn" 
        class="position-absolute d-flex flex-column align-center justify-center pointer-events-none"
        style="top: 0; left: 0; right: 0; bottom: 0; color: #9e9e9e; pointer-events: none;"
      >
        <v-icon size="36" color="grey-lighten-1">mdi-gesture-swipe</v-icon>
        <span class="text-caption mt-1">Dibuje su firma en esta zona</span>
      </div>
    </div>

    <!-- Firma existente en modo lectura -->
    <div 
      v-else-if="existingSignature?.trazo" 
      class="existing-signature-preview border rounded-lg pa-3 bg-grey-lighten-4 d-flex flex-column align-center"
      style="max-width: 420px; width: 100%;"
    >
      <div class="text-caption text-grey-darken-1 mb-2 font-weight-bold">Firma registrada físicamente:</div>
      <img 
        :src="existingSignature.trazo" 
        alt="Firma del operador"
        style="max-height: 100px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" 
      />
      <v-chip color="primary" size="small" variant="tonal" class="mt-3 font-weight-bold" prepend-icon="mdi-check-decagram">
        Criptográficamente Firmado
      </v-chip>
    </div>

    <!-- Controles del lienzo -->
    <div class="d-flex justify-space-between align-center mt-1" style="max-width: 420px; width: 100%;">
      <div>
        <v-btn
          v-if="!isSigned"
          size="small"
          variant="tonal"
          color="warning"
          prepend-icon="mdi-eraser"
          @click="clearCanvas"
          :disabled="!hasDrawn || signing"
        >
          Limpiar
        </v-btn>
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          v-if="!isSigned"
          size="small"
          color="primary"
          prepend-icon="mdi-signature"
          @click="handleSign"
          :loading="signing"
          :disabled="requireDrawing && !hasDrawn"
        >
          Confirmar Firma
        </v-btn>
        
        <v-chip 
          v-else-if="!existingSignature" 
          color="primary" 
          prepend-icon="mdi-check-circle" 
          class="font-weight-bold"
          variant="flat"
        >
          Firmado el {{ signatureDate }}
        </v-chip>
      </div>
    </div>

    <!-- Mensajes de Estado/Error -->
    <v-alert
      v-if="error"
      type="error"
      density="compact"
      variant="tonal"
      closable
      class="mt-2"
      style="max-width: 420px; width: 100%;"
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <v-alert
      v-if="showVerifyResult"
      :type="verified ? 'success' : 'error'"
      density="compact"
      variant="tonal"
      closable
      class="mt-2"
      style="max-width: 420px; width: 100%;"
      @click:close="showVerifyResult = false"
    >
      {{ verified ? 'Verificación criptográfica: Firma VÁLIDA y datos íntegros.' : 'Firma INVÁLIDA - Los datos pueden estar alterados.' }}
    </v-alert>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { digitalSignature, isWebCryptoSupported } from '@/services/digitalSignature'
import { useAuthStore } from '@/stores/authStore'
import { logger } from '@/utils/logger'

const props = defineProps({
  bitacoraId: {
    type: String,
    default: ''
  },
  existingSignature: {
    type: Object,
    default: null
  },
  dataToSign: {
    type: Object,
    default: null
  },
  requireDrawing: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['signed'])

const authStore = useAuthStore()

const canvasRef = ref(null)
const isDrawing = ref(false)
const hasDrawn = ref(false)
let ctx = null

const isSigned = ref(false)
const signatureDate = ref(null)
const signing = ref(false)
const error = ref(null)
const verified = ref(false)
const showVerifyResult = ref(false)

onMounted(() => {
  initCanvas()
  
  if (props.existingSignature) {
    isSigned.value = true
    signatureDate.value = new Date(props.existingSignature.timestamp || new Date()).toLocaleString()
    verifyExistingSignature()
  }
})

// Escuchar cambios en props para re-inicializar
watch(() => props.existingSignature, (newVal) => {
  if (newVal) {
    isSigned.value = true
    signatureDate.value = new Date(newVal.timestamp || new Date()).toLocaleString()
    verifyExistingSignature()
  } else {
    isSigned.value = false
    signatureDate.value = null
    clearCanvas()
  }
}, { deep: true })

function initCanvas() {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    ctx.strokeStyle = '#1b5e20' // Verde oscuro
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
}

function clearCanvas() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  hasDrawn.value = false
}

// Mouse events
function startDrawing(e) {
  if (isSigned.value || !ctx) return
  isDrawing.value = true
  hasDrawn.value = true
  const { x, y } = getCoordinates(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e) {
  if (!isDrawing.value || isSigned.value || !ctx) return
  const { x, y } = getCoordinates(e)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function stopDrawing() {
  isDrawing.value = false
}

// Touch events
function startDrawingTouch(e) {
  if (isSigned.value || !ctx) return
  e.preventDefault()
  const touch = e.touches[0]
  isDrawing.value = true
  hasDrawn.value = true
  const { x, y } = getCoordinates(touch)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function drawTouch(e) {
  if (!isDrawing.value || isSigned.value || !ctx) return
  e.preventDefault()
  const touch = e.touches[0]
  const { x, y } = getCoordinates(touch)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function getCoordinates(event) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  
  const clientX = event.clientX
  const clientY = event.clientY
  
  const x = (clientX - rect.left) * (canvasRef.value.width / rect.width)
  const y = (clientY - rect.top) * (canvasRef.value.height / rect.height)
  
  return { x, y }
}

/**
 * Verifica la firma existente al cargar
 */
async function verifyExistingSignature() {
  try {
    const isValid = await digitalSignature.verify(props.existingSignature)
    verified.value = isValid
    // Mostrar resultado si falla o loguear
    if (!isValid) {
      showVerifyResult.value = true
    }
  } catch (err) {
    logger.error('[BitacoraSignature] Error verificando firma:', err)
  }
}

/**
 * Maneja la firma digital híbrida (Trazo + Criptográfica)
 */
async function handleSign() {
  if (!isWebCryptoSupported()) {
    error.value = 'Su navegador no soporta firma criptográfica de seguridad.'
    return
  }

  signing.value = true
  error.value = null

  try {
    // 1. Asegurar par de claves cargado
    if (!digitalSignature.keyPair) {
      try {
        await digitalSignature.loadKeyPair()
      } catch {
        logger.info('[BitacoraSignature] Generando par de claves RSA en IndexedDB...')
        await digitalSignature.generateKeyPair()
      }
    }

    // 2. Extraer trazo de dibujo
    let trazoDataUrl = ''
    if (canvasRef.value && hasDrawn.value) {
      trazoDataUrl = canvasRef.value.toDataURL('image/png')
    }

    if (props.requireDrawing && !trazoDataUrl) {
      throw new Error('Es obligatorio dibujar su firma física antes de confirmar.')
    }

    // 3. Preparar payload a firmar
    const baseData = props.dataToSign || {
      bitacoraId: props.bitacoraId || 'temp_' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: authStore.user?.id
    }

    // Calcular hash SHA-256 de los datos incluyendo el trazo para inmutabilidad completa
    const encoder = new TextEncoder()
    const contentToHash = JSON.stringify({
      data: baseData,
      trazo: trazoDataUrl,
      userId: authStore.user?.id
    })
    
    const dataBuffer = encoder.encode(contentToHash)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 4. Firmar el hash con clave privada RSA
    const signatureObj = await digitalSignature.sign({
      hash: hashHex,
      userId: authStore.user?.id,
      timestamp: new Date().toISOString()
    })

    // 5. Exportar la clave pública para amparar auditoría externa
    let publicKeyBase64 = ''
    try {
      const pubKeyExported = await window.crypto.subtle.exportKey('spki', digitalSignature.keyPair.publicKey)
      const pubKeyArray = Array.from(new Uint8Array(pubKeyExported))
      publicKeyBase64 = btoa(String.fromCharCode.apply(null, pubKeyArray))
    } catch (e) {
      logger.warn('[BitacoraSignature] Error exportando clave pública:', e)
    }

    const fullSignaturePayload = {
      hash: hashHex,
      trazo: trazoDataUrl,
      signature: signatureObj.signature,
      publicKey: publicKeyBase64,
      timestamp: new Date().toISOString()
    }

    isSigned.value = true
    signatureDate.value = new Date().toLocaleString()
    verified.value = true

    logger.info('[BitacoraSignature] Documento firmado y trazo guardado.')
    emit('signed', fullSignaturePayload)
  } catch (err) {
    error.value = err.message || 'Error al firmar. Intente nuevamente.'
    logger.error('[BitacoraSignature] Error firmando:', err)
  } finally {
    signing.value = false
  }
}
</script>

<style scoped>
.bitacora-signature-container {
  display: flex;
  flex-direction: column;
}

.canvas-wrapper {
  background-color: #fff;
  border-width: 2px;
  position: relative;
  transition: all 0.2s ease-in-out;
}

.border-success {
  border-color: #4caf50 !important;
}

.border-grey-lighten-1 {
  border-color: #bdbdbd !important;
}

.existing-signature-preview {
  border: 1px solid #e0e0e0;
}
</style>
