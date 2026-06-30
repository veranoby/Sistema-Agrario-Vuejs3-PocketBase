<template>
  <div class="comunicaciones-thread d-flex flex-column h-100">
    <div v-if="comunicacionesStore.loading && comunicacionesStore.mensajes.length === 0" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <!-- Lista de mensajes -->
    <div class="mensajes-container flex-grow-1 overflow-y-auto pa-4" ref="mensajesContainer" style="max-height: 500px;">
      <div v-if="comunicacionesStore.mensajes.length === 0 && !comunicacionesStore.loading" class="text-center py-8 text-grey">
        <v-icon icon="mdi-message-text-outline" size="48" class="mb-2"></v-icon>
        <p>No hay mensajes en este hilo. Escribe el primero.</p>
      </div>

      <div 
        v-for="msg in comunicacionesStore.mensajesOrdenados" 
        :key="msg.id" 
        :class="['d-flex mb-4', msg.emisor_id === authStore.user?.id ? 'justify-end' : 'justify-start']"
      >
        <div 
          :class="['mensaje-bubble rounded-xl pa-3 elevation-1', msg.emisor_id === authStore.user?.id ? 'bg-primary text-white text-right rounded-br-0' : 'bg-white text-left rounded-bl-0']"
          style="max-width: 80%;"
        >
          <div class="text-xs opacity-70 mb-1 d-flex justify-space-between align-center">
            <span class="font-weight-bold">{{ msg.expand?.emisor_id?.name || 'Usuario' }}</span>
            <span class="ml-4">{{ formatDate(msg.created) }}</span>
          </div>

          <div v-if="msg.expand?.paquete_id" class="paquete-ref bg-surface-variant text-high-emphasis rounded pa-2 mb-2 text-xs d-flex align-center border">
            <v-icon icon="mdi-package-variant-closed" size="small" class="mr-2"></v-icon>
            <strong>Ref: Paquete {{ formatDate(msg.expand.paquete_id.created) }}</strong>
          </div>

          <div class="mensaje-texto whitespace-pre-line text-body-2" v-html="formatMessage(msg.mensaje)"></div>

          <!-- Fotos adjuntas en el mensaje -->
          <div v-if="msg.fotos && msg.fotos.length > 0" class="mt-2 d-flex flex-wrap gap-2">
            <v-card 
              v-for="(foto, idx) in msg.fotos" 
              :key="idx"
              class="rounded cursor-pointer overflow-hidden border"
              style="width: 80px; height: 80px;"
              @click="openImagePreview(pb.files.getUrl(msg, foto))"
            >
              <v-img :src="pb.files.getUrl(msg, foto, { thumb: '100x100' })" cover height="100%"></v-img>
            </v-card>
          </div>
        </div>
      </div>
    </div>

    <v-divider></v-divider>

    <!-- Caja de texto para enviar -->
    <div class="composer-container pa-4 bg-grey-lighten-4">
      <v-form @submit.prevent="sendMessage">
        <v-textarea
          v-model="newMessage"
          variant="outlined"
          density="comfortable"
          placeholder="Escribe un mensaje o reporte técnico..."
          hide-details
          auto-grow
          rows="2"
          max-rows="6"
          bg-color="white"
          class="mb-2"
        ></v-textarea>
        
        <EvidenciasImageUpload 
          v-model="fotosAdjuntas" 
          :max-files="5" 
          class="mb-3 mt-2" 
        />
        
        <div class="d-flex justify-end align-center">
          <v-btn
            color="primary"
            variant="flat"
            class="font-weight-bold rounded-pill px-6"
            prepend-icon="mdi-send"
            type="submit"
            :loading="sending"
            :disabled="!newMessage.trim() && fotosAdjuntas.length === 0"
          >
            Enviar
          </v-btn>
        </div>
      </v-form>
    </div>

    <!-- Image Preview Dialog -->
    <v-dialog v-model="imagePreviewDialog" max-width="800px">
      <v-card class="bg-black">
        <v-toolbar color="transparent" dark>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="imagePreviewDialog = false"></v-btn>
        </v-toolbar>
        <v-img :src="previewImageUrl" max-height="80vh" contain></v-img>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useComunicacionesStore } from '@/stores/comunicacionesStore'
import { useAuthStore } from '@/stores/authStore'
import { pb } from '@/utils/pocketbase'
import EvidenciasImageUpload from '@/components/common/EvidenciasImageUpload.vue'

const props = defineProps({
  vinculacionId: {
    type: String,
    required: true
  },
  prefilledPaquete: {
    type: Object,
    default: null
  }
})

const comunicacionesStore = useComunicacionesStore()
const authStore = useAuthStore()

const newMessage = ref('')
const fotosAdjuntas = ref([])
const sending = ref(false)
const mensajesContainer = ref(null)

// Image Preview State
const imagePreviewDialog = ref(false)
const previewImageUrl = ref('')

const openImagePreview = (url) => {
  previewImageUrl.value = url
  imagePreviewDialog.value = true
}

onMounted(async () => {
  if (props.vinculacionId) {
    await loadMessages()
  }
})

watch(() => props.vinculacionId, async (newVal) => {
  if (newVal) {
    await loadMessages()
  }
})

const loadMessages = async () => {
  await comunicacionesStore.fetchMensajesByVinculacion(props.vinculacionId)
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (mensajesContainer.value) {
      mensajesContainer.value.scrollTop = mensajesContainer.value.scrollHeight
    }
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
}

const formatMessage = (msg) => {
  if (!msg) return ''
  // Basic XSS protection and newline to br
  return msg.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
}

const sendMessage = async () => {
  if ((!newMessage.value.trim() && fotosAdjuntas.value.length === 0) || !props.vinculacionId) return
  
  sending.value = true
  try {
    const paqueteId = props.prefilledPaquete?.id || null
    await comunicacionesStore.enviarMensaje(props.vinculacionId, newMessage.value, paqueteId, fotosAdjuntas.value)
    newMessage.value = ''
    fotosAdjuntas.value = []
    scrollToBottom()
  } catch (error) {
    console.error('Failed to send message', error)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.whitespace-pre-line {
  white-space: pre-line;
}
.mensaje-bubble {
  word-break: break-word;
  border: 1px solid rgba(0,0,0,0.05);
}
.paquete-ref {
  border-color: rgba(255,255,255,0.3) !important;
  background-color: rgba(255,255,255,0.15) !important;
}
.gap-2 {
  gap: 8px;
}
</style>
