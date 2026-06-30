<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <UniversalHeader 
        title="Buzón del Asesor Técnico"
        :bgImage="avatarHaciendaUrl"
        icon="mdi-account-tie"
        showBack
        @back="router.push('/hacienda/directorio-asesores')"
      >
        <template #chips>
          <v-chip variant="flat" size="small" color="teal-lighten-4" class="mx-1" pill v-if="asesor">
            <v-avatar start>
              <v-icon icon="mdi-account-tie" color="teal-darken-3"></v-icon>
            </v-avatar>
            Asesor: {{ asesor.name }} {{ asesor.lastname }}
          </v-chip>
          <v-btn
            v-if="!mobile"
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold text-white rounded-lg px-4 ml-2"
            prepend-icon="mdi-package-variant"
            @click="openShareWizard"
          >
            Enviar Nuevo Paquete
          </v-btn>
        </template>
      </UniversalHeader>

      <!-- Tabs Navigation -->
      <v-tabs v-model="tab" color="primary" align-tabs="start" class="border-b border-grey-lighten-2 mb-6">
        <v-tab value="comunicaciones" class="font-weight-bold">
          <v-icon start icon="mdi-forum"></v-icon>
          Hilo de Comunicación
        </v-tab>
        <v-tab value="recetas" class="font-weight-bold">
          <v-icon start icon="mdi-file-document-edit"></v-icon>
          Recetas Recibidas
        </v-tab>
        <v-tab value="paquetes" class="font-weight-bold">
          <v-icon start icon="mdi-package-variant-closed"></v-icon>
          Paquetes Enviados
        </v-tab>
      </v-tabs>

      <!-- Tab Items -->
      <v-window v-model="tab">
        <!-- TAB 0: COMUNICACIONES -->
        <v-window-item value="comunicaciones">
          <v-card class="elevation-2 rounded-lg border border-grey-lighten-3 bg-white" style="height: 600px;">
            <ComunicacionesThread v-if="vinculacion?.id" :vinculacionId="vinculacion?.id" />
          </v-card>
        </v-window-item>

        <!-- TAB 1: RECETAS -->
        <v-window-item value="recetas">
          <div v-if="loading" class="d-flex justify-center align-center py-12">
            <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
          </div>

          <div v-else-if="recetas.length === 0" class="text-center py-12">
            <v-icon icon="mdi-file-document-outline" size="64" color="grey-lighten-1" class="mb-3"></v-icon>
            <h3 class="text-h6 text-grey-darken-2 font-weight-bold">No has recibido recetas</h3>
            <p class="text-smtext-grey mt-1">
              Envía un paquete de evaluación para que tu asesor pueda recetarte actividades profesionales.
            </p>
          </div>

          <v-row v-else>
            <v-col v-for="receta in recetas" :key="receta.id" cols="12" md="6">
              <v-card class="elevation-3 rounded-lg overflow-hidden border border-grey-lighten-3 d-flex flex-column h-100">
                <!-- Recipe Header -->
                <div :class="['py-3 px-4 text-white d-flex align-center justify-space-between', getRecipeHeaderBg(receta.estado)]">
                  <div>
                    <h3 class="  font-weight-bold mb-0">{{ receta.titulo || 'Receta Agrícola' }}</h3>
                    <span class="text-xs opacity-90">
                      Fecha: {{ formatDate(receta.created) }}
                    </span>
                  </div>
                  <v-chip size="small" :color="getRecipeStatusColor(receta.estado)" variant="flat" class="text-white font-weight-bold">
                    {{ getRecipeStatusLabel(receta.estado) }}
                  </v-chip>
                </div>

                <!-- Recipe Details -->
                <v-card-text class="flex-grow-1 pt-4">
                  <v-row class="mb-2">
                    <v-col cols="6" class="py-1">
                      <span class="text-xs text-grey d-block">Siembra Relacionada</span>
                      <span class="text-smfont-weight-medium text-primary-4">
                        {{ getSiembraName(receta.siembra_id) }}
                      </span>
                    </v-col>
                    <v-col cols="6" class="py-1">
                      <span class="text-xs text-grey d-block">Blanco Biológico</span>
                      <span class="text-smfont-weight-medium">
                        {{ receta.blanco_biologico || 'N/A' }}
                      </span>
                    </v-col>
                  </v-row>

                  <v-divider class="my-2"></v-divider>

                  <div class="mb-3">
                    <span class="text-xs text-grey d-block">Prescripción Técnica</span>
                    <p class="text-smmb-1"><strong>Producto:</strong> {{ receta.producto_recomendado || 'N/A' }}</p>
                    <p class="text-md"><strong>Dosis:</strong> {{ receta.dosis }} {{ receta.unidad_dosis }}<span v-if="receta.phi_dias"> | <strong>PHI:</strong> {{ receta.phi_dias }}d</span><span v-if="receta.rei_horas"> | <strong>REI:</strong> {{ receta.rei_horas }}h</span></p>
                  </div>

                  <div class="mb-3">
                    <span class="text-xs text-grey d-block">Instrucciones Técnicas</span>
                    <p class="text-smbg-grey-lighten-4 pa-3 rounded text-grey-darken-3 whitespace-pre-line italic">
                      "{{ receta.observaciones_tecnicas || 'Sin instrucciones adicionales' }}"
                    </p>
                  </div>

                  <!-- Rejection Reason if applicable -->
                  <div v-if="receta.estado === 'rechazada' && receta.motivo_rechazo" class="bg-red-lighten-5 border-red-lighten-3 border pa-3 rounded mb-2 text-red-darken-4 text-md">
                    <strong>Motivo de Rechazo:</strong> {{ receta.motivo_rechazo }}
                  </div>
                </v-card-text>

                <!-- Actions -->
                <v-divider></v-divider>
                <v-card-actions class="px-4 py-3 bg-grey-lighten-5" v-if="receta.estado === 'enviada' || receta.estado === 'vista'">
                  <v-btn
                    color="red-darken-1"
                    variant="text"
                    class="font-weight-bold"
                    prepend-icon="mdi-close-circle-outline"
                    @click="openRejectDialog(receta)"
                  >
                    Rechazar
                  </v-btn>
                  <v-spacer></v-spacer>
                  <v-btn
                    color="primary"
                    variant="flat"
                    class="font-weight-bold text-white rounded-lg"
                    prepend-icon="mdi-check-circle"
                    @click="openApproveDialog(receta)"
                  >
                    Aprobar y Programar
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 2: PAQUETES -->
        <v-window-item value="paquetes">
          <div v-if="loading" class="d-flex justify-center align-center py-12">
            <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
          </div>

          <div v-else-if="paquetes.length === 0" class="text-center py-12">
            <v-icon icon="mdi-package-variant-outline" size="64" color="grey-lighten-1" class="mb-3"></v-icon>
            <h3 class="text-h6 text-grey-darken-2 font-weight-bold">No has enviado paquetes</h3>
            <p class="text-smtext-grey mt-1">
              Envía tus bitácoras y zonas de siembra para que el asesor pueda revisar las recetas.
            </p>
          </div>

          <v-row v-else>
            <v-col v-for="paquete in paquetes" :key="paquete.id" cols="12" md="6">
              <v-card class="elevation-2 rounded-lg border border-grey-lighten-3">
                <v-card-text class="pt-4">
                  <div class="d-flex justify-space-between align-center mb-3">
                    <span class="text-md font-weight-bold text-primary-3">
                      Paquete de Evaluación
                    </span>
                    <div class="d-flex gap-2">
                      <v-chip size="small" :color="paquete.estado === 'enviado' ? 'orange' : 'teal'" variant="flat" class="text-white">
                        {{ paquete.estado === 'enviado' ? 'Nuevo' : 'Revisado' }}
                      </v-chip>
                      <v-chip size="small" color="blue" variant="flat" class="text-white" v-if="hasRecetaFor(paquete.id)">
                        <v-icon start icon="mdi-file-document-check" size="14"></v-icon>
                        Receta Recibida
                      </v-chip>
                    </div>
                  </div>

                  <p class="text-xs text-grey mb-1">Enviado el: {{ formatDate(paquete.created) }}</p>
                  
                  <div class="mb-3">
                    <span class="text-xs text-grey d-block">Resumen de Contenido</span>
                    <div class="d-flex flex-wrap gap-2 mt-1">
                      <v-chip size="x-small" color="teal-lighten-4" class="text-primary-4">
                        Siembra: {{ paquete.siembra_id ? '1' : '0' }}
                      </v-chip>
                      <v-chip size="x-small" color="blue-lighten-4" class="text-blue-darken-4">
                        Zonas: {{ Array.isArray(paquete.zonas_ids) ? paquete.zonas_ids.length : 0 }}
                      </v-chip>
                      <v-chip size="x-small" color="grey-lighten-3" class="text-grey-darken-4">
                        Bitácoras: {{ Array.isArray(paquete.bitacora_ids) ? paquete.bitacora_ids.length : 0 }}
                      </v-chip>
                    </div>
                  </div>

                  <v-divider class="my-2"></v-divider>

                  <div>
                    <span class="text-xs text-grey d-block">Notas Enviadas</span>
                    <p class="text-smitalic text-grey-darken-2">
                      "{{ paquete.notas_hacienda || 'Sin notas adicionales' }}"
                    </p>
                  </div>

                  <!-- Respuesta / Notas del Asesor -->
                  <div class="mt-3" v-if="paquete.notas_asesor">
                    <span class="text-xs font-weight-bold text-teal-darken-3 d-block mb-1">
                      Respuesta del Asesor:
                    </span>
                    <v-card variant="flat" color="teal-lighten-5" class="pa-3 rounded">
                      <!-- Render HTML content directly from editor -->
                      <div class="text-smtext-grey-darken-3" v-html="paquete.notas_asesor"></div>
                    </v-card>
                  </div>

                  <!-- Evidencias Fotográficas -->
                  <div class="mt-4" v-if="paquete.evidencias && paquete.evidencias.length > 0">
                    <span class="text-xs text-grey d-block mb-1">
                      Evidencias Fotográficas ({{ paquete.evidencias.length }}):
                    </span>
                    <v-row dense>
                      <v-col
                        v-for="(evidencia, index) in paquete.evidencias"
                        :key="index"
                        cols="4"
                        sm="3"
                      >
                        <v-card class="position-relative cursor-pointer" variant="outlined" @click="openImagePreview(pb.files.getUrl(paquete, evidencia))">
                          <v-img
                            :src="pb.files.getUrl(paquete, evidencia, { thumb: '300x300' })"
                            height="80"
                            cover
                            class="bg-grey-lighten-2"
                          >
                            <template v-slot:placeholder>
                              <div class="d-flex align-center justify-center fill-height">
                                <v-progress-circular indeterminate color="grey-lighten-4" size="20"></v-progress-circular>
                              </div>
                            </template>
                          </v-img>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </div>

    <!-- Dialog Aprobar y Programar -->
    <v-dialog v-model="approveDialog" max-width="500px">
      <v-card class="rounded-lg border border-teal-lighten-4">
        <v-card-title class="bg-primary py-4 px-6 text-white font-weight-bold">
          Aprobar y Programar Actividad
        </v-card-title>
        <v-card-text class="pa-6">
          <p class="text-smtext-grey-darken-2 mb-4">
            Al aprobar esta receta, se creará automáticamente una nueva <strong>Programación de Trabajo</strong> en tu calendario agrícola.
          </p>

          <v-text-field
            v-model="programacionDate"
            label="Fecha de Ejecución Programada"
            type="date"
            variant="outlined"
            density="compact"
            color="primary"
            :min="todayStr"
            class="mb-4"
          ></v-text-field>

          <v-select
            v-model="programacionFrecuencia"
            :items="frecuenciaOptions"
            label="Frecuencia"
            variant="outlined"
            density="compact"
            color="primary"
          ></v-select>
        </v-card-text>
        <v-card-actions class="px-6 py-4 bg-grey-lighten-5">
          <v-btn variant="outlined" color="grey-darken-1" class="font-weight-bold" @click="approveDialog = false">
            Cancelar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="flat" class="font-weight-bold text-white rounded-lg" @click="confirmApprove">
            Confirmar y Programar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Rechazar -->
    <v-dialog v-model="rejectDialog" max-width="500px">
      <v-card class="rounded-lg border border-red-lighten-4">
        <v-card-title class="bg-red-darken-1 py-4 px-6 text-white font-weight-bold">
          Rechazar Receta Técnica
        </v-card-title>
        <v-card-text class="pa-6">
          <p class="text-smtext-grey-darken-2 mb-4">
            Por favor, explica el motivo por el cual rechazas esta prescripción técnica para que el asesor pueda emitir una nueva versión.
          </p>

          <v-textarea
            v-model="motivoRechazo"
            label="Motivo del Rechazo"
            placeholder="Ej: No contamos con el stock de ese producto, favor recetar una alternativa..."
            variant="outlined"
            rows="4"
            maxlength="250"
            counter
            color="red"
            required
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-6 py-4 bg-grey-lighten-5">
          <v-btn variant="outlined" color="grey-darken-1" class="font-weight-bold" @click="rejectDialog = false">
            Cancelar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="red-darken-1" variant="flat" class="font-weight-bold text-white rounded-lg" :disabled="!motivoRechazo" @click="confirmReject">
            Rechazar Receta
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Share Wizard Dialog -->
    <EnviarPaqueteWizard
      v-model="wizardOpen"
      :asesor="asesor"
      :vinculacionId="vinculacion?.id"
    />

    <v-btn
      v-if="mobile"
      color="primary"
      icon="mdi-package-variant"
      size="x-large"
      position="fixed"
      location="bottom right"
      class="mb-4 mr-4 elevation-8"
      style="z-index: 100"
      @click="openShareWizard"
    ></v-btn>

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
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pb } from '@/utils/pocketbase'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useProgramacionesStore } from '@/stores/programaciones/programacionesStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import EnviarPaqueteWizard from '@/components/forms/asesores/EnviarPaqueteWizard.vue'
import ComunicacionesThread from '@/components/asesores/ComunicacionesThread.vue'
import UniversalHeader from '@/components/UniversalHeader.vue'
import { useDisplay } from 'vuetify'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const programacionesStore = useProgramacionesStore()
const uiFeedback = useUiFeedbackStore()
const haciendaStore = useHaciendaStore()
const { mobile } = useDisplay()
const { avatarHaciendaUrl } = storeToRefs(haciendaStore)

const advisorUserId = route.params.asesor_user_id

const tab = ref('comunicaciones')
const loading = ref(false)

const asesor = ref(null)
const vinculacion = ref(null)
const recetas = ref([])
const paquetes = ref([])

// Approve state
const approveDialog = ref(false)
const selectedRecipe = ref(null)
const programacionDate = ref('')
const programacionFrecuencia = ref('una_vez')
const todayStr = new Date().toISOString().split('T')[0]

// Reject state
const rejectDialog = ref(false)
const motivoRechazo = ref('')

const stepperItems = ['Siembra', 'Zonas & Bitácoras', 'Confirmar']
const wizardOpen = ref(false)

const frecuenciaOptions = [
  { title: 'Una Sola Vez', value: 'una_vez' },
  { title: 'Diario', value: 'diario' },
  { title: 'Semanal', value: 'semanal' },
  { title: 'Quincenal', value: 'quincenal' },
  { title: 'Mensual', value: 'mensual' }
]

// Image Preview
const imagePreviewDialog = ref(false)
const previewImageUrl = ref('')

const openImagePreview = (url) => {
  previewImageUrl.value = url
  imagePreviewDialog.value = true
}

onMounted(async () => {
  loading.value = true
  try {
    // 1. Fetch Advisor Profile details
    const advisorUser = await pb.collection('users').getOne(advisorUserId)
    let info = {}
    try {
      info = typeof advisorUser.info === 'string' ? JSON.parse(advisorUser.info || '{}') : (advisorUser.info || {})
    } catch {
      info = {}
    }
    asesor.value = { ...advisorUser, parsedInfo: info }

    // 2. Fetch Vinculacion details
    const vinc = await pb.collection('vinculaciones_asesor').getFirstListItem(
      `asesor_id="${advisorUserId}" && estado="activa"`
    )
    vinculacion.value = vinc

    // 3. Load other required stores
    await Promise.all([
      siembrasStore.cargarSiembras(),
      actividadesStore.cargarActividades(),
      loadRecetasAndPaquetes(vinc)
    ])
  } catch (error) {
    handleError(error, 'Error al inicializar la bandeja del asesor')
  } finally {
    loading.value = false
  }
})

const loadRecetasAndPaquetes = async (vinc) => {
  const [recipes, packages] = await Promise.all([
    pb.collection('recetas').getFullList({
      filter: `hacienda_id="${vinc.hacienda_id}" && asesor_id="${vinc.asesor_id}"`,
      sort: '-created'
    }),
    pb.collection('paquetes_evaluacion').getFullList({
      filter: `vinculacion_id="${vinc.id}"`,
      sort: '-created'
    })
  ])
  
  recetas.value = recipes
  paquetes.value = packages

  // Mark pending recipes as seen if they render
  recipes.forEach(async (recipe) => {
    if (recipe.estado === 'enviada') {
      try {
        await pb.collection('recetas').update(recipe.id, { estado: 'vista' })
        recipe.estado = 'vista'
      } catch (err) {
        console.warn('Could not mark recipe as seen:', err)
      }
    }
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

const hasRecetaFor = (paqueteId) => {
  return recetas.value.some(r => r.paquete_id === paqueteId)
}

const getSiembraName = (id) => {
  const s = siembrasStore.siembras.find(x => x.id === id)
  return s ? s.nombre : 'Siembra'
}

const getActividadName = (id) => {
  const a = actividadesStore.actividades.find(x => x.id === id)
  return a ? a.nombre : 'Actividad Agrícola'
}

const getRecipeHeaderBg = (state) => {
  switch (state) {
    case 'pendiente':
    case 'enviada':
      return 'bg-gradient-orange'
    case 'vista':
      return 'bg-gradient-teal'
    case 'aprobada':
    case 'ejecutada':
      return 'bg-gradient-green'
    case 'rechazada':
      return 'bg-gradient-red'
    default:
      return 'bg-gradient-teal'
  }
}

const getRecipeStatusColor = (state) => {
  switch (state) {
    case 'pendiente':
    case 'enviada':
      return 'orange'
    case 'vista':
      return 'teal'
    case 'aprobada':
    case 'ejecutada':
      return 'green'
    case 'rechazada':
      return 'red'
    default:
      return 'grey'
  }
}

const getRecipeStatusLabel = (state) => {
  switch (state) {
    case 'pendiente':
    case 'enviada':
      return 'Nueva'
    case 'vista':
      return 'Vista'
    case 'aprobada':
    case 'ejecutada':
      return 'Aprobada'
    case 'rechazada':
      return 'Rechazada'
    default:
      return state
  }
}

const openShareWizard = () => {
  wizardOpen.value = true
}

const openApproveDialog = (recipe) => {
  selectedRecipe.value = recipe
  programacionDate.value = new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  programacionFrecuencia.value = recipe.frecuencia || 'una_vez'
  approveDialog.value = true
}

const confirmApprove = async () => {
  approveDialog.value = false
  uiFeedback.showLoading()
  try {
    const recipe = selectedRecipe.value
    
    // Create new programacion. Field 'actividades' is array, use siembra_id from real schema
    const progData = {
      actividades: recipe.siembra_id ? [] : [],  // actividades is activity IDs, recipe doesn't store one
      siembras: [recipe.siembra_id].filter(Boolean),
      frecuencia: programacionFrecuencia.value,
      proxima_ejecucion: new Date(programacionDate.value).toISOString(),
      estado: 'activo',
      frecuencia_personalizada: {
        intervalo: 1,
        unidad: 'dias',
        diasSemana: []
      },
      descripcion: `Receta Técnica: ${recipe.titulo || 'Receta'}. Producto: ${recipe.producto_recomendado || 'N/A'}, Dosis: ${recipe.dosis || ''} ${recipe.unidad_dosis || ''}.`,
      observaciones: recipe.observaciones_tecnicas || ''
    }

    await programacionesStore.crearProgramacion(progData)

    // Update recipe state to 'ejecutada' (the real valid terminal state for approved recipes)
    await pb.collection('recetas').update(recipe.id, { estado: 'ejecutada' })
    recipe.estado = 'ejecutada'

    uiFeedback.showSnackbar('Receta aprobada y programada en tu calendario', 'success')
  } catch (error) {
    handleError(error, 'Error al aprobar y programar la receta')
  } finally {
    uiFeedback.hideLoading()
  }
}

const openRejectDialog = (recipe) => {
  selectedRecipe.value = recipe
  motivoRechazo.value = ''
  rejectDialog.value = true
}

const confirmReject = async () => {
  rejectDialog.value = false
  uiFeedback.showLoading()
  try {
    const recipe = selectedRecipe.value
    await pb.collection('recetas').update(recipe.id, {
      estado: 'rechazada',
      motivo_rechazo: motivoRechazo.value
    })
    recipe.estado = 'rechazada'
    recipe.motivo_rechazo = motivoRechazo.value

    uiFeedback.showSnackbar('Receta rechazada con éxito', 'success')
  } catch (error) {
    handleError(error, 'Error al rechazar la receta')
  } finally {
    uiFeedback.hideLoading()
  }
}
</script>

<style scoped>
.bg-gradient-teal {
  background: linear-gradient(135deg, #00796B 0%, #004D40 100%);
}
.bg-gradient-orange {
  background: linear-gradient(135deg, #E65100 0%, #FF9800 100%);
}
.bg-gradient-green {
  background: linear-gradient(135deg, #1B5E20 0%, #4CAF50 100%);
}
.bg-gradient-red {
  background: linear-gradient(135deg, #B71C1C 0%, #F44336 100%);
}
.gap-2 {
  gap: 8px;
}
.gap-4 {
  gap: 16px;
}
.whitespace-pre-line {
  white-space: pre-line;
}
</style>
