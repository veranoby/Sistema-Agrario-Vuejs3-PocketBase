<template>
  <v-dialog v-model="visible" max-width="600px" persistent>
    <v-card :loading="isLoading || isDeleting">
      <v-toolbar color="error" dark>
        <v-toolbar-title class="text-h6 d-flex align-center">
          <v-icon start>mdi-alert-octagon</v-icon>
          Eliminación Inteligente de Siembra
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="close" :disabled="isDeleting">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <div v-if="isLoading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <div class="mt-4 ">Analizando dependencias...</div>
        </div>

        <div v-else-if="error" class="py-4">
          <v-alert type="error" variant="tonal" border="start">
            {{ error }}
          </v-alert>
        </div>

        <div v-else-if="analysisResult">
          <!-- Advertencia General -->
          <div class="mb-6  ">
            Estás a punto de eliminar la siembra <strong>{{ siembraNombre }}</strong>. 
            Define qué hacer con los elementos que dependen únicamente de esta siembra:
          </div>

          <!-- Elementos Exclusivos -->
          <div v-if="analysisResult.exclusive.length > 0" class="mb-6">
            <div class="text-md font-weight-bold mb-2 d-flex align-center text-error">
              <v-icon start size="small">mdi-shield-alert</v-icon>
              DEPENDENCIAS EXCLUSIVAS:
            </div>
            <v-list density="compact" class="bg-red-lighten-5 rounded-lg border pa-0">
              <v-list-item v-for="item in groupedExclusive" :key="item.type" class="py-3 border-b last:border-0">
                <template v-slot:prepend>
                  <v-icon :icon="item.icon" color="error" class="mr-2"></v-icon>
                </template>
                
                <v-list-item-title class="text-md font-weight-bold">
                  {{ item.count }} {{ item.label }}
                </v-list-item-title>

                <template v-slot:append>
                  <v-radio-group
                    v-model="exclusiveActions[item.type]"
                    inline
                    density="compact"
                    hide-details
                    class="mt-0"
                  >
                    <v-radio label="Eliminar" value="delete" color="error" class="mr-4"></v-radio>
                    <v-radio label="Desvincular" value="detach" color="warning"></v-radio>
                  </v-radio-group>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- Elementos Compartidos -->
          <div v-if="analysisResult.shared.length > 0" class="mb-6">
            <div class="text-md font-weight-bold mb-2 d-flex align-center text-warning">
              <v-icon start size="small">mdi-link-off</v-icon>
              ELEMENTOS COMPARTIDOS (SE DESVINCULARÁN):
            </div>
            <v-list density="compact" class="bg-orange-lighten-5 rounded-lg border">
              <v-list-item v-for="item in groupedShared" :key="item.type">
                <template v-slot:prepend>
                  <v-icon :icon="item.icon" size="small" color="warning"></v-icon>
                </template>
                <v-list-item-title class="text-xs">
                  {{ item.count }} {{ item.label }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </div>

          <v-alert
            v-if="analysisResult.exclusive.length === 0 && analysisResult.shared.length === 0"
            type="info"
            variant="tonal"
          >
            Esta siembra no tiene dependencias registradas.
          </v-alert>

          <!-- Barrera de Seguridad -->
          <div v-if="requiresHardConfirmation" class="mt-8">
            <div class="text-xs mb-2 text-medium-emphasis">
              Para confirmar la eliminación masiva ({{ totalImpact }} elementos), escribe <strong>ELIMINAR</strong>:
            </div>
            <v-text-field
              v-model="confirmationText"
              placeholder="ELIMINAR"
              variant="outlined"
              density="compact"
              hide-details
              color="error"
              autocomplete="off"
            ></v-text-field>
          </div>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4 bg-grey-lighten-4">
        <v-btn
          variant="text"
          @click="close"
          :disabled="isDeleting"
        >
          CANCELAR
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="error"
          variant="flat"
          prepend-icon="mdi-delete"
          @click="handleDelete"
          :loading="isDeleting"
          :disabled="isLoading || !!error || !isConfirmationValid"
        >
          Confirmar Eliminación
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSiembrasStore } from '@/stores/siembrasStore'

const props = defineProps({
  modelValue: Boolean,
  siembraId: String,
  siembraNombre: String
})

const emit = defineEmits(['update:modelValue', 'deleted'])

const siembrasStore = useSiembrasStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isLoading = ref(false)
const isDeleting = ref(false)
const error = ref(null)
const analysisResult = ref(null)
const confirmationText = ref('')
const exclusiveActions = ref({}) // Almacena 'delete' o 'detach' por categoría

const typeLabels = {
  zonas: { label: 'Zonas/Lotes', icon: 'mdi-map' },
  bitacora: { label: 'Actividades (Bitácora)', icon: 'mdi-notebook' },
  programaciones: { label: 'Programaciones', icon: 'mdi-calendar-clock' },
  recordatorios: { label: 'Recordatorios', icon: 'mdi-bell' }
}

watch(() => props.modelValue, async (val) => {
  if (val && props.siembraId) {
    resetState()
    await performAnalysis()
  }
})

const resetState = () => {
  analysisResult.value = null
  error.value = null
  confirmationText.value = ''
  exclusiveActions.value = {}
}

const performAnalysis = async () => {
  isLoading.value = true
  try {
    const result = await siembrasStore.analyzeDependencies(props.siembraId)
    if (result) {
      analysisResult.value = result
      // Inicializar acciones por defecto como 'delete' para cada categoría
      result.exclusive.forEach(item => {
        if (!exclusiveActions.value[item.type]) {
          exclusiveActions.value[item.type] = 'delete'
        }
      })
    } else {
      error.value = 'No se pudo obtener el análisis de la siembra.'
    }
  } catch (err) {
    error.value = 'Fallo crítico durante el análisis.'
  } finally {
    isLoading.value = false
  }
}

const groupedExclusive = computed(() => groupItems(analysisResult.value?.exclusive || []))
const groupedShared = computed(() => groupItems(analysisResult.value?.shared || []))

const groupItems = (items) => {
  const groups = {}
  items.forEach(item => {
    if (!groups[item.type]) {
      groups[item.type] = { 
        ...typeLabels[item.type], 
        count: 0, 
        type: item.type 
      }
    }
    groups[item.type].count++
  })
  return Object.values(groups)
}

const totalImpact = computed(() => {
  return (analysisResult.value?.exclusive.length || 0) + (analysisResult.value?.shared.length || 0)
})

const requiresHardConfirmation = computed(() => {
  return (analysisResult.value?.exclusive.length || 0) > 5
})

const isConfirmationValid = computed(() => {
  if (!requiresHardConfirmation.value) return true
  return confirmationText.value.toUpperCase() === 'ELIMINAR'
})

const handleDelete = async () => {
  isDeleting.value = true
  try {
    const success = await siembrasStore.executeSmartDeletion(
      props.siembraId, 
      analysisResult.value,
      exclusiveActions.value
    )
    if (success) {
      emit('deleted', props.siembraId)
      close()
    }
  } finally {
    isDeleting.value = false
  }
}

const close = () => {
  visible.value = false
}
</script>
