<template>
  <div v-if="isModuleActive">
    <!-- FAB -->
    <v-btn
      color="agricultural-primary"
      icon
      size="large"
      class="ai-assistant-fab"
      @click="drawer = !drawer"
      elevation="4"
    >
      <v-icon>mdi-robot-outline</v-icon>
    </v-btn>

    <v-navigation-drawer
      v-model="drawer"
      location="right"
      temporary
      width="460"
      class="ai-assistant-drawer"
    >
      <!-- Header -->
      <v-toolbar color="green-darken-3" dark density="comfortable">
        <v-icon start class="ml-3">mdi-robot-outline</v-icon>
        <v-toolbar-title class="font-weight-bold text-body-1">Asistente IA</v-toolbar-title>
        <v-spacer />
        <!-- Badge de key -->
        <v-chip
          size="x-small"
          :color="keyInfo.color"
          variant="elevated"
          class="mr-2"
        >
          <v-icon start size="10">{{ keyInfo.icon }}</v-icon>
          {{ keyInfo.label }}
        </v-chip>
        <v-btn icon size="small" @click="drawer = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <div class="pa-4 d-flex flex-column" style="height: calc(100% - 56px); overflow-y: auto;">

        <!-- Info de uso (solo key global) -->
        <v-alert
          v-if="!hasBYOK"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3 text-caption"
          border="start"
        >
          Tokens usados hoy: <strong>{{ usageDisplay }}</strong>
        </v-alert>

        <!-- Contexto activo -->
        <v-chip
          size="small"
          color="green-lighten-4"
          class="mb-4 align-self-start"
          label
        >
          <v-icon start size="14">mdi-leaf</v-icon>
          {{ contextLabel }}
        </v-chip>

        <!-- Loading -->
        <div v-if="loading" class="d-flex flex-column align-center justify-center py-10">
          <v-progress-circular indeterminate color="green-darken-2" size="56" width="5" />
          <p class="mt-4 text-body-2 text-grey-darken-1">Analizando con IA...</p>
        </div>

        <!-- Error -->
        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>

        <!-- Resultado -->
        <template v-else-if="result">
          <!-- Diagnóstico -->
          <v-card class="mb-4" elevation="1" rounded="lg">
            <v-card-text class="pa-4">
              <div class="d-flex align-start mb-2">
                <v-icon color="green-darken-3" size="18" class="mr-2 mt-1">mdi-clipboard-text-outline</v-icon>
                <span class="text-caption font-weight-bold text-primary-3 text-uppercase">Diagnóstico</span>
              </div>
              <p class="text-body-2 text-grey-darken-3 mb-0" style="line-height:1.6">
                {{ result.diagnostico }}
              </p>
            </v-card-text>
          </v-card>

          <!-- Action Cards -->
          <div v-if="result.acciones?.length" class="mb-4">
            <p class="text-caption font-weight-bold text-grey-darken-1 text-uppercase mb-2">
              Acciones propuestas
            </p>

            <v-card
              v-for="accion in result.acciones"
              :key="accion.id"
              class="mb-2 action-card"
              :class="`priority-${accion.prioridad}`"
              elevation="0"
              border
              rounded="lg"
            >
              <v-card-text class="pa-3">
                <div class="d-flex align-start justify-space-between">
                  <div class="flex-grow-1 mr-2">
                    <div class="d-flex align-center mb-1">
                      <v-icon size="14" :color="actionIconColor(accion)" class="mr-1">
                        {{ actionIcon(accion.tipo) }}
                      </v-icon>
                      <span class="text-caption font-weight-bold">{{ accion.titulo }}</span>
                      <v-chip
                        v-if="accion.tipo !== 'info'"
                        size="x-small"
                        :color="prioridadColor(accion.prioridad)"
                        variant="tonal"
                        class="ml-2"
                      >
                        {{ accion.prioridad }}
                      </v-chip>
                    </div>
                    <p class="text-caption text-grey-darken-1 mb-0">{{ accion.descripcion }}</p>
                  </div>
                  <v-btn
                    v-if="accion.tipo !== 'info'"
                    size="x-small"
                    color="green-darken-2"
                    variant="elevated"
                    :loading="executing === accion.id"
                    :disabled="executed.has(accion.id)"
                    @click="executeAction(accion)"
                    class="text-none flex-shrink-0"
                  >
                    {{ executed.has(accion.id) ? '✓ Hecho' : 'Aplicar' }}
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Disclaimer -->
          <v-card variant="flat" border rounded="lg" class="mb-4 pa-3" style="background:#fff9c4">
            <div class="d-flex align-start">
              <v-icon color="warning" size="16" class="mr-2 mt-1">mdi-alert-decagram</v-icon>
              <p class="text-caption font-italic text-grey-darken-2 mb-0">
                Valide con un técnico agrícola antes de tomar decisiones críticas.
              </p>
            </div>
          </v-card>
        </template>

        <!-- Estado vacío -->
        <div v-else class="d-flex flex-column align-center justify-center py-10 text-center">
          <v-icon size="72" color="grey-lighten-2">mdi-robot-happy-outline</v-icon>
          <p class="mt-4 text-body-2 text-grey-darken-1 px-4">
            Analiza el contexto actual y obtén recomendaciones accionables.
          </p>
        </div>

        <!-- Botón principal -->
        <div class="mt-auto pt-2">
          <v-btn
            block
            color="green-darken-2"
            size="large"
            prepend-icon="mdi-sparkles"
            :loading="loading"
            :disabled="loading"
            @click="analyze"
            class="text-none font-weight-bold"
            elevation="2"
          >
            {{ result ? 'Reanalizar' : 'Analizar con IA' }}
          </v-btn>
        </div>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { pb } from '@/utils/pocketbase'
import { usePlanStore } from '@/stores/planStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programaciones/programacionesStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { buildSiembraContext } from '@/services/aiContextBuilder'

const props = defineProps({
  siembra:    { type: Object, default: null },
  actividad:  { type: Object, default: null },
  zona:       { type: Object, default: null },
  actividades:{ type: Array,  default: () => [] },
  zonas:      { type: Array,  default: () => [] }
})

// Stores
const planStore        = usePlanStore()
const haciendaStore    = useHaciendaStore()
const recordatoriosStore = useRecordatoriosStore()
const programacionesStore = useProgramacionesStore()
const actividadesStore = useActividadesStore()
const uiFeedback       = useUiFeedbackStore()

// State
const drawer    = ref(false)
const loading   = ref(false)
const error     = ref(null)
const result    = ref(null)   // { diagnostico, acciones[] }
const executing = ref(null)   // accion.id en ejecución
const executed  = ref(new Set())
const usageDisplay = ref('...')

// Computed
const hasBYOK        = computed(() => !!haciendaStore.mi_hacienda?.ai_config?.auth_token)
const isModuleActive = computed(() => {
  return haciendaStore.isModuleActive('ai_assistant_premium');
})

const keyInfo = computed(() => hasBYOK.value
  ? { label: 'Tu API Key', color: 'purple', icon: 'mdi-key' }
  : { label: 'ConAgri AI', color: 'blue', icon: 'mdi-cloud' }
)

const contextLabel = computed(() => {
  if (props.actividad) return `Actividad: ${props.actividad.nombre}`
  if (props.zona)      return `Zona: ${props.zona.nombre}`
  if (props.siembra)   return `Siembra: ${props.siembra.nombre}`
  return 'Contexto general'
})

// Helpers UI
const actionIcon = (tipo) => ({
  create_recordatorio:  'mdi-bell-plus-outline',
  create_programacion:  'mdi-calendar-plus',
  create_actividad:     'mdi-plus-circle-outline',
  update_actividad:     'mdi-pencil-outline',
  info:                 'mdi-information-outline'
}[tipo] || 'mdi-chevron-right')

const actionIconColor = (accion) => accion.tipo === 'info' ? 'blue' : 'green-darken-2'

const prioridadColor = (p) => ({ alta: 'error', media: 'warning', baja: 'success' }[p] || 'grey')

// ── Análisis principal ──
const analyze = async () => {
  loading.value = true
  error.value   = null
  result.value  = null
  executed.value = new Set()

  try {
    // Construir contexto según prop disponible
    let context = null
    if (props.siembra) {
      context = buildSiembraContext(props.siembra, props.actividades, props.zonas)
    } else if (props.actividad) {
      context = { actividad: props.actividad, siembra: props.siembra }
    } else if (props.zona) {
      context = { zona: props.zona, bpa_estado: props.zona.bpa_estado }
    }

    const prompt = props.actividad
      ? `Analiza esta actividad agrícola y recomienda acciones.`
      : props.zona
        ? `Analiza el estado de esta zona agrícola (BPA: ${props.zona.bpa_estado}%) y recomienda acciones.`
        : `Analiza el estado de esta siembra y recomienda acciones prioritarias.`

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
      },
      body: JSON.stringify({
        prompt,
        context,
        haciendaId: haciendaStore.mi_hacienda?.id
      })
    })

    if (res.status === 429) {
      const data = await res.json()
      error.value = data.error
      return
    }
    if (!res.ok) throw new Error('Error en servicio de IA')

    const data = await res.json()
    usageDisplay.value = `${data.tokens_used} tokens usados`

    // Parsear JSON estructurado
    try {
      const parsed = typeof data.response === 'string'
        ? JSON.parse(data.response)
        : data.response
      result.value = parsed
    } catch {
      // Fallback si la IA no devolvió JSON puro
      result.value = {
        diagnostico: data.response,
        acciones: [{ id: 'info_1', tipo: 'info', titulo: 'Información', descripcion: data.response, prioridad: 'media', data: {} }]
      }
    }
  } catch (err) {
    error.value = err.message || 'Error conectando con IA'
  } finally {
    loading.value = false
  }
}

// ── Ejecutar acción aprobada por usuario ──
const executeAction = async (accion) => {
  executing.value = accion.id
  try {
    const haciendaId = haciendaStore.mi_hacienda?.id

    switch (accion.tipo) {
      case 'create_recordatorio':
        await recordatoriosStore.crearRecordatorio({
          ...accion.data,
          hacienda: haciendaId,
          siembra: props.siembra?.id || null,
          fuente: 'ia'
        })
        break

      case 'create_programacion':
        await programacionesStore.crearProgramacion({
          ...accion.data,
          hacienda: haciendaId,
          siembra: props.siembra?.id || null,
          fuente: 'ia'
        })
        break

      case 'create_actividad':
        await actividadesStore.crearActividad({
          ...accion.data,
          siembra: props.siembra?.id || null,
          hacienda: haciendaId,
          fuente: 'ia'
        })
        break

      case 'update_actividad':
        if (props.actividad?.id) {
          await actividadesStore.updateActividad(props.actividad.id, accion.data)
        }
        break
    }

    executed.value = new Set([...executed.value, accion.id])
    uiFeedback.showSnackbar(`"${accion.titulo}" aplicado correctamente`, 'success')

  } catch (err) {
    uiFeedback.showSnackbar(`Error: ${err.message}`, 'error')
  } finally {
    executing.value = null
  }
}
</script>

<style scoped>
.ai-assistant-fab {
  position: fixed;
  bottom: 25px;
  right: 25px;
  z-index: 99;
}
.ai-assistant-drawer { z-index: 1000 !important; }

.action-card { transition: box-shadow 0.2s; }
.action-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important; }
.action-card.priority-alta  { border-left: 3px solid #f44336 !important; }
.action-card.priority-media { border-left: 3px solid #ff9800 !important; }
.action-card.priority-baja  { border-left: 3px solid #4caf50 !important; }
</style>
