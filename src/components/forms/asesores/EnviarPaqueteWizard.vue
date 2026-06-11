<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="850px" persistent>
    <v-card class="rounded-lg overflow-hidden elevation-5 border-teal-lighten-4 border">
      <!-- Title -->
      <v-card-title class="bg-gradient-teal py-4 px-6 text-white d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-package-variant-closed" size="28"></v-icon>
          <span class="text-h6 font-weight-bold">Enviar Paquete de Evaluación</span>
        </div>
        <span class="text-md text-primary-4" v-if="asesor">
          Asesor: {{ asesor.name }} {{ asesor.lastname }}
        </span>
        <v-btn icon="mdi-close" variant="text" color="white" density="compact" @click="close"></v-btn>
      </v-card-title>

      <!-- Content -->
      <v-card-text class="pa-6">
        <v-stepper v-model="step" :items="stepperItems" hide-actions>
          <template v-slot:item.1>
            <div class="py-4">
              <h3 class="text-h6 font-weight-bold text-primary-3 mb-2">Paso 1: Selecciona la Siembra</h3>
              <p class="text-smtext-grey-darken-1 mb-4">
                Elige la siembra activa que deseas compartir con el asesor para su análisis.
              </p>

              <!-- Loading Siembras -->
              <div v-if="loadingSiembras" class="d-flex justify-center py-6">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>

              <!-- Empty Siembras -->
              <div v-else-if="activeSiembras.length === 0" class="text-center py-6">
                <v-icon icon="mdi-alert-circle-outline" size="48" color="grey"></v-icon>
                <p class="  text-grey-darken-2 mt-2">No tienes siembras activas en esta hacienda.</p>
              </div>

              <!-- Siembras List -->
              <v-radio-group v-else v-model="selectedSiembraId" class="siembras-radio-group">
                <v-card
                  v-for="siembra in activeSiembras"
                  :key="siembra.id"
                  :class="['mb-2 border rounded-lg transition-all', selectedSiembraId === siembra.id ? 'border-teal bg-primary-5 elevation-1' : 'border-grey-lighten-3']"
                  @click="selectedSiembraId = siembra.id"
                  ripple
                >
                  <v-card-text class="d-flex align-center py-3 px-4">
                    <v-radio :value="siembra.id" color="primary" class="mr-3"></v-radio>
                    <div class="flex-grow-1">
                      <div class="font-weight-bold text-primary-4  ">{{ siembra.nombre }}</div>
                      <div class="d-flex gap-4 mt-1 text-caption text-grey-darken-1">
                        <span><strong>Variedad:</strong> {{ siembra.variedad || 'N/A' }}</span>
                        <span><strong>Tipo:</strong> {{ siembra.tipo }}</span>
                        <span><strong>Inicio:</strong> {{ formatDate(siembra.fecha_inicio) }}</span>
                      </div>
                    </div>
                    <v-chip size="small" color="primary" variant="flat" class="text-white">Activa</v-chip>
                  </v-card-text>
                </v-card>
              </v-radio-group>
            </div>
          </template>

          <template v-slot:item.2>
            <div class="py-4">
              <h3 class="text-h6 font-weight-bold text-primary-3 mb-1">Paso 2: Selecciona Zonas y Bitácoras</h3>
              <p class="text-smtext-grey-darken-1 mb-4">
                Elige qué zonas geográficas y qué entradas de bitácora quieres incluir en este paquete.
              </p>

              <!-- Loading Zonas/Bitacora -->
              <div v-if="loadingDetails" class="d-flex justify-center py-6">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>

              <v-row v-else>
                <!-- Zonas Column -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="rounded-lg h-100 border-grey-lighten-2">
                    <v-card-title class="bg-grey-lighten-4 py-2 px-4 d-flex align-center justify-space-between">
                      <span class="  font-weight-bold text-grey-darken-3">Zonas Geográficas</span>
                      <v-checkbox-btn
                        v-model="allZonasSelected"
                        color="primary"
                        density="compact"
                        :indeterminate="someZonasSelected"
                        @change="toggleAllZonas"
                      ></v-checkbox-btn>
                    </v-card-title>
                    <v-card-text class="pa-3 overflow-y-auto" style="max-height: 250px;">
                      <div v-if="availableZonas.length === 0" class="text-center py-6 text-grey text-caption">
                        No hay zonas vinculadas a esta siembra.
                      </div>
                      <v-checkbox
                        v-for="zona in availableZonas"
                        :key="zona.id"
                        v-model="selectedZonas"
                        :value="zona.id"
                        color="primary"
                        density="compact"
                        hide-details
                        class="mt-1"
                      >
                        <template v-slot:label>
                          <div class="d-flex flex-column">
                            <span class="text-smfont-weight-medium">{{ zona.nombre }}</span>
                            <span class="text-caption text-grey">{{ zona.tipo || 'Sin Tipo' }}</span>
                          </div>
                        </template>
                      </v-checkbox>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Bitacoras Column -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="rounded-lg h-100 border-grey-lighten-2">
                    <v-card-title class="bg-grey-lighten-4 py-2 px-4 d-flex align-center justify-space-between">
                      <span class="  font-weight-bold text-grey-darken-3">Entradas de Bitácora</span>
                      <v-checkbox-btn
                        v-model="allBitacorasSelected"
                        color="primary"
                        density="compact"
                        :indeterminate="someBitacorasSelected"
                        @change="toggleAllBitacoras"
                      ></v-checkbox-btn>
                    </v-card-title>
                    <v-card-text class="pa-3 overflow-y-auto" style="max-height: 250px;">
                      <div v-if="availableBitacoras.length === 0" class="text-center py-6 text-grey text-caption">
                        No hay bitácoras vinculadas a esta siembra.
                      </div>
                      <v-checkbox
                        v-for="entry in availableBitacoras"
                        :key="entry.id"
                        v-model="selectedBitacoras"
                        :value="entry.id"
                        color="primary"
                        density="compact"
                        hide-details
                        class="mt-1"
                      >
                        <template v-slot:label>
                          <div class="d-flex flex-column">
                            <span class="text-smfont-weight-medium text-truncate" style="max-width: 250px;">
                              {{ entry.expand?.actividad_realizada?.nombre || 'Actividad' }}
                            </span>
                            <span class="text-caption text-grey">
                              {{ formatDate(entry.fecha_ejecucion) }} - {{ entry.user_responsable ? 'Operador' : 'Sistema' }}
                            </span>
                          </div>
                        </template>
                      </v-checkbox>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </template>

          <template v-slot:item.3>
            <div class="py-4">
              <h3 class="text-h6 font-weight-bold text-primary-3 mb-2">Paso 3: Confirmación y Notas</h3>
              <p class="text-smtext-grey-darken-1 mb-4">
                Revisa el resumen de la información que vas a empaquetar y agrega notas aclaratorias para el asesor técnico.
              </p>

              <!-- Resumen -->
              <v-card class="bg-primary-5 border-teal-lighten-3 border mb-4 rounded-lg">
                <v-card-text class="py-3 px-4">
                  <div class="font-weight-bold text-primary-4 mb-2">Resumen del Paquete</div>
                  <v-row class="text-smtext-grey-darken-3">
                    <v-col cols="12" sm="4">
                      <strong>Siembra:</strong> {{ getSiembraName(selectedSiembraId) }}
                    </v-col>
                    <v-col cols="12" sm="4">
                      <strong>Zonas Compartidas:</strong> {{ selectedZonas.length }} seleccionadas
                    </v-col>
                    <v-col cols="12" sm="4">
                      <strong>Bitácoras Compartidas:</strong> {{ selectedBitacoras.length }} seleccionadas
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Notas Textarea -->
              <v-textarea
                v-model="notasHacienda"
                label="Notas Adicionales / Instrucciones para el Asesor"
                placeholder="Ej: Favor revisar la fertilización del lote 2, observo hojas amarillas..."
                variant="outlined"
                rows="4"
                maxlength="500"
                counter
                color="primary"
                required
              ></v-textarea>
            </div>
          </template>
        </v-stepper>
      </v-card-text>

      <!-- Footer Buttons -->
      <v-card-actions class="px-6 py-4 bg-grey-lighten-5 d-flex justify-space-between">
        <v-btn
          v-if="step > 1"
          variant="outlined"
          color="grey-darken-2"
          class="font-weight-bold rounded-lg"
          prepend-icon="mdi-arrow-left"
          @click="step--"
        >
          Atrás
        </v-btn>
        <div v-else></div>

        <div>
          <v-btn
            v-if="step < 3"
            color="primary"
            variant="flat"
            class="font-weight-bold text-white rounded-lg"
            append-icon="mdi-arrow-right"
            :disabled="isNextDisabled"
            @click="nextStep"
          >
            Siguiente
          </v-btn>
          <v-btn
            v-else
            color="teal-darken-1"
            variant="flat"
            class="font-weight-bold text-white rounded-lg"
            prepend-icon="mdi-send"
            :disabled="!notasHacienda"
            @click="enviarPaquete"
          >
            Enviar Paquete
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

const props = defineProps({
  modelValue: Boolean,
  asesor: Object,
  vinculacionId: String
})

const emit = defineEmits(['update:modelValue'])

const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()
const bitacoraStore = useBitacoraStore()
const uiFeedback = useUiFeedbackStore()

const step = ref(1)
const stepperItems = ['Siembra', 'Zonas & Bitácoras', 'Confirmar']

const selectedSiembraId = ref(null)
const selectedZonas = ref([])
const selectedBitacoras = ref([])
const notasHacienda = ref('')

const loadingSiembras = ref(false)
const loadingDetails = ref(false)

const activeSiembras = computed(() => siembrasStore.activeSiembras || [])
const availableZonas = ref([])
const availableBitacoras = ref([])

// Check if next button is disabled
const isNextDisabled = computed(() => {
  if (step.value === 1) {
    return !selectedSiembraId.value
  }
  if (step.value === 2) {
    return selectedZonas.value.length === 0 && selectedBitacoras.value.length === 0
  }
  return false
})

// Toggle selections
const allZonasSelected = computed({
  get: () => availableZonas.value.length > 0 && selectedZonas.value.length === availableZonas.value.length,
  set: (val) => {
    selectedZonas.value = val ? availableZonas.value.map(x => x.id) : []
  }
})
const someZonasSelected = computed(() => {
  return selectedZonas.value.length > 0 && selectedZonas.value.length < availableZonas.value.length
})
const toggleAllZonas = () => {
  allZonasSelected.value = !allZonasSelected.value
}

const allBitacorasSelected = computed({
  get: () => availableBitacoras.value.length > 0 && selectedBitacoras.value.length === availableBitacoras.value.length,
  set: (val) => {
    selectedBitacoras.value = val ? availableBitacoras.value.map(x => x.id) : []
  }
})
const someBitacorasSelected = computed(() => {
  return selectedBitacoras.value.length > 0 && selectedBitacoras.value.length < availableBitacoras.value.length
})
const toggleAllBitacoras = () => {
  allBitacorasSelected.value = !allBitacorasSelected.value
}

// Watch dialog open
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    step.value = 1
    selectedSiembraId.value = null
    selectedZonas.value = []
    selectedBitacoras.value = []
    notasHacienda.value = ''
    availableZonas.value = []
    availableBitacoras.value = []

    loadingSiembras.value = true
    try {
      await siembrasStore.cargarSiembras()
    } catch (e) {
      console.error(e)
    } finally {
      loadingSiembras.value = false
    }
  }
})

// Watch siembra selection to load details
const nextStep = async () => {
  if (step.value === 1) {
    step.value = 2
    loadingDetails.value = true
    try {
      // Fetch zones and bitacoras belonging to this sowing
      const [zones, bitacoras] = await Promise.all([
        zonasStore.cargarZonasPorSiembras([selectedSiembraId.value]),
        bitacoraStore.fetchBitacorasBySiembra(selectedSiembraId.value)
      ])
      availableZonas.value = zones || []
      availableBitacoras.value = bitacoras || []

      // Auto-select all by default for convenience
      selectedZonas.value = availableZonas.value.map(x => x.id)
      selectedBitacoras.value = availableBitacoras.value.map(x => x.id)
    } catch (e) {
      handleError(e, 'Error al cargar los detalles de la siembra')
    } finally {
      loadingDetails.value = false
    }
  } else if (step.value === 2) {
    step.value = 3
  }
}

const getSiembraName = (id) => {
  const s = activeSiembras.value.find(x => x.id === id)
  return s ? s.nombre : 'Sowing'
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

const close = () => {
  emit('update:modelValue', false)
}

const enviarPaquete = async () => {
  uiFeedback.showLoading()
  try {
    // Get the vinculacion record. If not provided, find one for this asesor & hacienda
    let finalVinculacionId = props.vinculacionId
    let finalAsesorId = props.asesor?.id
    const authStore = useAuthStore()

    if (!finalVinculacionId && props.asesor) {
      const v = await pb.collection('vinculaciones_asesor').getFirstListItem(
        `hacienda_id="${authStore.user.hacienda}" && asesor_id="${props.asesor.id}" && estado="activa"`
      )
      finalVinculacionId = v.id
    }

    if (!finalVinculacionId) {
      throw new Error('No se encontró una vinculación activa con este asesor.')
    }

    // Field names match paquetes_evaluacion PocketBase schema exactly
    await pb.collection('paquetes_evaluacion').create({
      vinculacion_id: finalVinculacionId,
      hacienda_id: authStore.user.hacienda,
      asesor_id: finalAsesorId,
      siembra_id: selectedSiembraId.value,
      zonas_ids: selectedZonas.value,
      bitacora_ids: selectedBitacoras.value,
      notas_hacienda: notasHacienda.value,
      estado: 'enviado'
    })

    uiFeedback.showSnackbar('Paquete de evaluación enviado con éxito', 'success')
    close()
  } catch (error) {
    handleError(error, 'Error al enviar el paquete de evaluación')
  } finally {
    uiFeedback.hideLoading()
  }
}
</script>

<style scoped>
.bg-gradient-teal {
  background: linear-gradient(135deg, #00796B 0%, #004D40 100%);
}
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}
.transition-all {
  transition: all 0.2s ease-in-out;
}
.border-teal {
  border-color: #00796B !important;
}
.siembras-radio-group :deep(.v-selection-control) {
  align-items: center;
}
</style>
