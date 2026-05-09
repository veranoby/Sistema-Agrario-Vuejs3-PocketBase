<template>
  <div>
    <!-- Botón flotante para activar el asistente -->
    <v-btn
      color="agricultural-primary"
      icon="mdi-robot"
      size="large"
      class="ai-assistant-fab"
      @click="drawer = !drawer"
      elevation="4"
      :title="t('ai_assistant.open_assistant')"
    >
      <v-icon>mdi-robot-outline</v-icon>
    </v-btn>

    <!-- Panel Lateral (Drawer) -->
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      temporary
      width="450"
      class="ai-assistant-drawer"
    >
      <v-toolbar color="green-darken-3" dark>
        <v-icon start class="ml-4">mdi-robot-outline</v-icon>
        <v-toolbar-title class=" font-weight-bold">
          {{ t('ai_assistant.title') }}
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="drawer = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <div class="pa-4 flex flex-col h-full bg-grey-lighten-4 overflow-y-auto">
        <v-alert
          type="success"
          variant="tonal"
          class="mb-4 text-caption"
          density="compact"
          border="start"
        >
          {{ t('ai_assistant.analyzing_context', { name: siembra?.nombre }) }}
        </v-alert>

        <v-alert
          v-if="isUsingGlobalKey"
          type="info"
          variant="tonal"
          class="mb-4 text-caption"
          density="compact"
          border="start"
        >
          Usando clave global. Consultas restantes: {{ remainingQuota }} de {{ settingsStore.aiRateLimit || 5 }}
        </v-alert>

        <v-card v-if="loading" class="d-flex flex-column align-center justify-center pa-8 mb-4" flat bg-color="transparent">
          <v-progress-circular indeterminate color="green-darken-2" size="64" width="6"></v-progress-circular>
          <p class="mt-4 text-body-2 text-grey-darken-1 font-weight-medium">
            {{ t('ai_assistant.consulting') }}
          </p>
        </v-card>

        <div v-else-if="suggestion" class="ai-response-container">
          <v-card class="suggestion-card mb-4" elevation="1">
            <v-card-text class="pa-4">
              <div class="rich-text-content" v-html="formattedSuggestion"></div>
            </v-card-text>
          </v-card>
          
          <v-card variant="flat" class="legal-disclaimer-card mb-4 pa-3" border>
            <div class="d-flex">
              <v-icon color="warning" class="mr-3" size="small">mdi-alert-decagram</v-icon>
              <p class="text-caption font-italic text-grey-darken-2">
                {{ t('ai_assistant.disclaimer') }}
              </p>
            </div>
          </v-card>
        </div>

        <v-card v-else class="d-flex flex-column align-center justify-center pa-8 mb-4 text-center" flat bg-color="transparent">
          <v-icon size="80" color="grey-lighten-1">mdi-robot-happy-outline</v-icon>
          <p class="mt-4 text-body-2 text-grey-darken-1">
            {{ t('ai_assistant.welcome_msg') }}
          </p>
        </v-card>

        <div class="mt-auto pt-4">
          <v-btn
            block
            color="green-darken-2"
            size="large"
            prepend-icon="mdi-sparkles"
            :loading="loading"
            @click="generateSuggestion"
            class="text-none font-weight-bold"
            elevation="2"
          >
            {{ suggestion ? t('ai_assistant.regenerate') : t('ai_assistant.generate') }}
          </v-btn>
        </div>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAiUsageStore } from '@/stores/aiUsageStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useI18n } from 'vue-i18n'
import { generateAIResponse } from '@/services/aiService'
import { buildSiembraContext } from '@/services/aiContextBuilder'

const { t } = useI18n()

const props = defineProps({
  siembra: { type: Object, required: true },
  actividades: { type: Array, default: () => [] },
  zonas: { type: Array, default: () => [] }
})

const settingsStore = useSettingsStore()
const aiUsageStore = useAiUsageStore()
const haciendaStore = useHaciendaStore()

const isUsingGlobalKey = computed(() => !haciendaStore.mi_hacienda?.openrouter_key)
const remainingQuota = computed(() => {
    const limit = settingsStore.aiRateLimit || 5
    const used = aiUsageStore.getUsage
    return Math.max(0, limit - used)
})

onMounted(async () => {
    await settingsStore.fetchConfig()
    aiUsageStore.loadFromLocal()
})

const drawer = ref(false)
const loading = ref(false)
const suggestion = ref('')

/**
 * Formatea la sugerencia de Markdown a HTML básico
 * Utiliza clases existentes para el estilo agrícola
 */
const formattedSuggestion = computed(() => {
  if (!suggestion.value) return ''
  
  let html = suggestion.value
    // Encabezados (h3 para recomendaciones)
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-green-darken-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-3 text-green-darken-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-green-darken-4">$1</h1>')
    
    // Negrita
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-green-darken-4">$1</strong>')
    
    // Listas con viñetas
    .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    
    // Enlaces de salto de línea
    .replace(/\n/g, '<br>')

  // Envolver listas
  if (html.includes('<li')) {
    // Intento básico de envolver grupos de <li> en <ul>
    // Esto es rudimentario pero funciona para el contexto del asistente
    html = html.replace(/(<li.*<\/li>)/gms, '<ul class="list-disc my-2">$1</ul>')
  }

  return html
})

const generateSuggestion = async () => {
  loading.value = true
  try {
    const context = buildSiembraContext(
      props.siembra,
      props.actividades,
      props.zonas
    )
    const result = await generateAIResponse(
      `Genera una recomendación agrícola estructurada para el siguiente contexto: ${context}`,
      'recomendacion_agricola',
      { priority: 'local' }
    )
    if (result) {
      suggestion.value = result
    }
  } catch (error) {
    console.error('[AiAssistant] Error generating suggestion:', error)
  } finally {
    loading.value = false
  }
}
</script>

<script>
// I18n translations needed for this component:
/*
  "ai_assistant": {
    "title": "Asistente de IA Agri",
    "open_assistant": "Abrir Asistente de IA",
    "analyzing_context": "Analizando contexto de siembra: {name}",
    "consulting": "Consultando con expertos agrícolas...",
    "generate": "Generar Recomendación de IA",
    "regenerate": "Actualizar Recomendación",
    "welcome_msg": "Pulsa el botón para obtener recomendaciones personalizadas basadas en tus datos actuales.",
    "disclaimer": "Sugerencia basada en promedios; valide con un técnico agrícola calificado antes de tomar decisiones críticas."
  }
*/
</script>

<style scoped>
/* VARIABLES CSS OBLIGATORIAS - COMPLETE SET */
:root {
  --agricultural-primary: #2e7d32;
  --agricultural-success: #4caf50;
  --agricultural-earth-brown: #5d4037;
  --agricultural-soil-dark: #3e2723;
  --agricultural-sky-blue: #1976d2;
  --agricultural-surface-light: #f8f9fa;
  --agricultural-surface-card: #ffffff;
  --agricultural-warning: #ff9800;
  --agricultural-error: #f44336;
  --agricultural-info: #2196f3;
  --agricultural-compliance: #4caf50;
  --agricultural-pending: #ff9800;
  --agricultural-overdue: #f44336;
}

.ai-assistant-fab {
  position: fixed;
  bottom: 25px;
  right: 25px;
  z-index: 99;
  border: 2px solid white;
}

.ai-assistant-drawer {
  z-index: 1000 !important;
}

.suggestion-card {
  border-radius: 12px;
  border-left: 4px solid #2e7d32;
}

.legal-disclaimer-card {
  background-color: #fff9c4 !important; /* Yellow lighten-4 */
  border: 1px solid #fbc02d !important;
  border-radius: 8px;
}

.rich-text-content {
  background-color: transparent !important;
  padding: 0 !important;
  height: auto !important;
  font-size: 0.9rem;
  line-height: 1.6;
}

:deep(ul) {
  padding-left: 20px;
}

:deep(strong) {
  display: inline;
}
</style>
