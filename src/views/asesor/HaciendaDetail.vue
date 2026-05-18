<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <!-- Header -->
      <v-row class="mb-4">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between flex-wrap gap-4">
            <div>
              <div class="d-flex align-center gap-2 mb-1">
                <v-btn icon="mdi-arrow-left" variant="text" color="teal" @click="router.push('/asesor/haciendas')"></v-btn>
                <h1 class="text-h4 font-weight-bold text-teal-darken-3">
                  Expediente de {{ hacienda?.nombre || 'Hacienda' }}
                </h1>
              </div>
              <p class="text-subtitle-1 text-grey-darken-1 pl-12">
                Revisa bitácoras de campo, zonas geográficas y formula recetas técnicas personalizadas.
              </p>
            </div>
            
            <div class="pl-12 pl-sm-0">
              <v-btn
                color="teal"
                variant="flat"
                class="font-weight-bold text-white rounded-lg px-4"
                prepend-icon="mdi-file-document-edit"
                @click="openNewRecipe"
              >
                Crear Receta
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Main Tabs -->
      <v-tabs v-model="tab" color="teal" align-tabs="start" class="border-b border-grey-lighten-2 mb-6">
        <v-tab value="paquetes" class="font-weight-bold">
          <v-icon start icon="mdi-package-variant-closed"></v-icon>
          Paquetes de Evaluación
        </v-tab>
        <v-tab value="recetas" class="font-weight-bold">
          <v-icon start icon="mdi-file-document-multiple"></v-icon>
          Recetas Emitidas
        </v-tab>
      </v-tabs>

      <!-- Windows Content -->
      <v-window v-model="tab">
        <!-- TAB 1: PAQUETES DE EVALUACION -->
        <v-window-item value="paquetes">
          <v-row>
            <!-- Left Column: Packages List -->
            <v-col cols="12" md="4">
              <v-card class="elevation-2 rounded-lg border border-grey-lighten-3 h-100 d-flex flex-column" style="max-height: 600px;">
                <v-card-title class="bg-grey-lighten-4 py-3 px-4 text-subtitle-1 font-weight-bold text-grey-darken-3">
                  Paquetes Recibidos
                </v-card-title>
                
                <v-card-text class="pa-0 overflow-y-auto flex-grow-1">
                  <v-list v-if="paquetes.length > 0" class="py-0">
                    <template v-for="(pkg, idx) in paquetes" :key="pkg.id">
                      <v-list-item
                        :active="selectedPackage?.id === pkg.id"
                        active-color="teal"
                        class="py-3 px-4 cursor-pointer border-b border-grey-lighten-4"
                        @click="selectPackage(pkg)"
                      >
                        <template v-slot:prepend>
                          <v-icon
                            :icon="pkg.estado === 'pendiente' ? 'mdi-package-variant' : 'mdi-package-variant-closed'"
                            :color="pkg.estado === 'pendiente' ? 'orange' : 'grey-darken-1'"
                            class="mr-2"
                          ></v-icon>
                        </template>

                        <v-list-item-title class="font-weight-bold text-teal-darken-4">
                          Evaluación #{{ pkgsCount - idx }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-caption mt-1">
                          Enviado: {{ formatDate(pkg.created) }}
                        </v-list-item-subtitle>

                        <template v-slot:append>
                          <v-chip
                            size="x-small"
                            :color="pkg.estado === 'pendiente' ? 'orange' : 'teal'"
                            variant="flat"
                            class="text-white"
                          >
                            {{ pkg.estado === 'pendiente' ? 'Pendiente' : 'Revisado' }}
                          </v-chip>
                        </template>
                      </v-list-item>
                    </template>
                  </v-list>
                  
                  <div v-else class="text-center py-12 text-grey">
                    <v-icon icon="mdi-package-variant-outline" size="48" class="mb-2"></v-icon>
                    <p class="text-body-2">No se han recibido paquetes.</p>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Right Column: Package Detail -->
            <v-col cols="12" md="8">
              <v-card class="elevation-2 rounded-lg border border-grey-lighten-3 h-100" v-if="selectedPackage">
                <v-card-title class="bg-teal py-3 px-5 text-white font-weight-bold d-flex justify-space-between align-center">
                  <span>Detalle del Paquete de Evaluación</span>
                  <v-chip size="small" color="white" class="text-teal font-weight-bold">
                    {{ formatDate(selectedPackage.created) }}
                  </v-chip>
                </v-card-title>
                
                <v-card-text class="pa-5 overflow-y-auto" style="max-height: 550px;">
                  <!-- Notas Hacienda -->
                  <div class="mb-4">
                    <span class="text-subtitle-2 font-weight-bold text-teal-darken-4 d-block mb-1">
                      Mensaje / Notas del Agricultor:
                    </span>
                    <p class="text-body-2 bg-grey-lighten-4 pa-3 rounded text-grey-darken-3 whitespace-pre-line italic">
                      "{{ selectedPackage.notas_hacienda || 'Sin notas aclaratorias' }}"
                    </p>
                  </div>

                  <v-divider class="my-4"></v-divider>

                  <!-- Siembras Relacionadas -->
                  <div class="mb-4">
                    <span class="text-subtitle-2 font-weight-bold text-teal-darken-4 d-block mb-2">
                      Siembras Compartidas:
                    </span>
                    <v-card variant="outlined" class="rounded-lg border-grey-lighten-2 pa-3">
                      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                        <div>
                          <div class="text-subtitle-2 font-weight-bold">{{ packageSiembra?.nombre || 'Cargando Siembra...' }}</div>
                          <div class="text-caption text-grey">
                            Variedad: {{ packageSiembra?.variedad || 'N/A' }} | Tipo: {{ packageSiembra?.tipo }}
                          </div>
                        </div>
                        <v-chip size="small" color="teal" variant="flat" class="text-white">
                          Inicio: {{ formatDate(packageSiembra?.fecha_inicio) }}
                        </v-chip>
                      </div>
                    </v-card>
                  </div>

                  <!-- Zonas -->
                  <div class="mb-4">
                    <span class="text-subtitle-2 font-weight-bold text-teal-darken-4 d-block mb-2">
                      Zonas Geográficas Relacionadas ({{ packageZonas.length }}):
                    </span>
                    <div class="d-flex flex-wrap gap-2" v-if="packageZonas.length > 0">
                      <v-chip
                        v-for="zona in packageZonas"
                        :key="zona.id"
                        size="small"
                        color="blue-darken-2"
                        variant="outlined"
                        class="font-weight-medium"
                      >
                        {{ zona.nombre }} ({{ zona.tipo }})
                      </v-chip>
                    </div>
                    <div class="text-caption text-grey italic" v-else>
                      No se compartieron zonas en este paquete.
                    </div>
                  </div>

                  <!-- Bitacoras -->
                  <div>
                    <span class="text-subtitle-2 font-weight-bold text-teal-darken-4 d-block mb-2">
                      Entradas de Bitácora de Campo ({{ packageBitacoras.length }}):
                    </span>
                    <v-expansion-panels variant="accordion" v-if="packageBitacoras.length > 0">
                      <v-expansion-panel
                        v-for="entry in packageBitacoras"
                        :key="entry.id"
                      >
                        <v-expansion-panel-title class="py-2">
                          <div class="d-flex align-center justify-space-between w-100 pr-4">
                            <span class="font-weight-bold text-grey-darken-3">
                              {{ entry.expand?.actividad_realizada?.nombre || 'Registro Actividad' }}
                            </span>
                            <span class="text-caption text-grey">
                              {{ formatDate(entry.fecha_ejecucion) }}
                            </span>
                          </div>
                        </v-expansion-panel-title>
                        <v-expansion-panel-text class="bg-grey-lighten-5 pt-3">
                          <v-row class="text-caption text-grey-darken-3">
                            <v-col cols="6" class="py-1">
                              <strong>Responsable:</strong> {{ entry.user_responsable ? 'Operador Campo' : 'Sistema' }}
                            </v-col>
                            <v-col cols="6" class="py-1" v-if="entry.gps">
                              <strong>Ubicación GPS:</strong> {{ entry.gps.lat.toFixed(4) }}, {{ entry.gps.lng.toFixed(4) }}
                            </v-col>
                          </v-row>
                          <v-divider class="my-2"></v-divider>
                          <div class="text-body-2 mt-2">
                            <strong>Métricas de Trabajo:</strong>
                            <pre class="bg-grey-lighten-4 pa-2 rounded mt-1 overflow-x-auto text-caption">{{ entry.metricas || 'Sin métricas registradas' }}</pre>
                          </div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                    <div class="text-caption text-grey italic" v-else>
                      No se compartieron registros de bitácora en este paquete.
                    </div>
                  </div>
                </v-card-text>
              </v-card>

              <div class="h-100 d-flex align-center justify-center border border-dashed rounded-lg border-teal py-12" v-else>
                <div class="text-center text-teal-darken-3">
                  <v-icon icon="mdi-gesture-tap-select" size="64" class="mb-2"></v-icon>
                  <h3 class="text-h6 font-weight-bold">Selecciona un paquete</h3>
                  <p class="text-body-2">Elige un expediente de la izquierda para analizar sus bitácoras de campo.</p>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 2: RECETAS EMITIDAS -->
        <v-window-item value="recetas">
          <div v-if="recetas.length === 0" class="text-center py-12">
            <v-icon icon="mdi-file-document-outline" size="64" color="grey-lighten-1" class="mb-3"></v-icon>
            <h3 class="text-h6 text-grey-darken-2 font-weight-bold">No has emitido recetas aún</h3>
            <p class="text-body-2 text-grey mt-1">
              Haz clic en "Crear Receta" para emitir recomendaciones fitosanitarias.
            </p>
          </div>

          <v-row v-else>
            <v-col v-for="receta in recetas" :key="receta.id" cols="12" md="6">
              <v-card class="elevation-3 rounded-lg overflow-hidden border border-grey-lighten-3">
                <div :class="['py-3 px-4 text-white d-flex align-center justify-space-between', getRecipeHeaderBg(receta.estado)]">
                  <div>
                    <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ receta.nombre_receta || 'Receta Agrícola' }}</h3>
                    <span class="text-caption opacity-90">Emitida: {{ formatDate(receta.created) }}</span>
                  </div>
                  <v-chip size="small" :color="getRecipeStatusColor(receta.estado)" variant="flat" class="text-white font-weight-bold">
                    {{ getRecipeStatusLabel(receta.estado) }}
                  </v-chip>
                </div>

                <v-card-text class="pt-4">
                  <v-row class="mb-2">
                    <v-col cols="6" class="py-1">
                      <span class="text-caption text-grey d-block">Siembra</span>
                      <span class="text-body-2 font-weight-medium text-teal-darken-4">
                        {{ getSiembraName(receta.siembra_id) }}
                      </span>
                    </v-col>
                    <v-col cols="6" class="py-1">
                      <span class="text-caption text-grey d-block">Actividad</span>
                      <span class="text-body-2 font-weight-medium">
                        {{ getActividadName(receta.actividad_id) }}
                      </span>
                    </v-col>
                  </v-row>

                  <v-divider class="my-2"></v-divider>

                  <div class="mb-3">
                    <p class="text-body-2 mb-1"><strong>Producto:</strong> {{ receta.producto }}</p>
                    <p class="text-body-2"><strong>Dosis:</strong> {{ receta.dosis }} | <strong>Frecuencia:</strong> {{ getFrecuenciaLabel(receta.frecuencia) }}</p>
                  </div>

                  <div>
                    <span class="text-caption text-grey d-block">Instrucciones:</span>
                    <p class="text-body-2 bg-grey-lighten-4 pa-3 rounded text-grey-darken-3 whitespace-pre-line italic">
                      "{{ receta.instrucciones }}"
                    </p>
                  </div>

                  <!-- Reject details -->
                  <div v-if="receta.estado === 'rechazada' && receta.motivo_rechazo" class="bg-red-lighten-5 border-red-lighten-3 border pa-3 rounded mt-3 text-red-darken-4 text-body-2">
                    <strong>Motivo de Rechazo:</strong> {{ receta.motivo_rechazo }}
                  </div>
                </v-card-text>

                <!-- Actions for Drafts -->
                <v-divider v-if="receta.estado === 'borrador'"></v-divider>
                <v-card-actions class="px-4 py-3 bg-grey-lighten-5" v-if="receta.estado === 'borrador'">
                  <v-btn color="teal" variant="text" class="font-weight-bold" prepend-icon="mdi-pencil" @click="editRecipe(receta.id)">
                    Editar Borrador
                  </v-btn>
                  <v-spacer></v-spacer>
                  <v-btn color="teal" variant="flat" class="font-weight-bold text-white rounded-lg" prepend-icon="mdi-send" @click="sendDraft(receta)">
                    Enviar a Hacienda
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </div>

    <!-- Receta Editor Dialog -->
    <RecetaEditorDialog
      v-model="recipeDialogOpen"
      :vinculacionId="vinculacion?.id"
      :sharedSiembras="sharedSiembras"
      :actividades="actividades"
      :recipeId="selectedRecipeId"
      @save="onRecipeSaved"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pb } from '@/utils/pocketbase'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import RecetaEditorDialog from '@/components/asesores/RecetaEditorDialog.vue'

const route = useRoute()
const router = useRouter()
const actividadesStore = useActividadesStore()
const uiFeedback = useUiFeedbackStore()

const haciendaId = route.params.hacienda_id

const tab = ref('paquetes')
const loading = ref(false)

const hacienda = ref(null)
const vinculacion = ref(null)
const paquetes = ref([])
const recetas = ref([])
const sharedSiembras = ref([])

const pkgsCount = computed(() => paquetes.value.length)

// Selected Package Details
const selectedPackage = ref(null)
const packageSiembra = ref(null)
const packageZonas = ref([])
const packageBitacoras = ref([])

// Recipe Editor Dialog
const recipeDialogOpen = ref(false)
const selectedRecipeId = ref('')
const actividades = computed(() => actividadesStore.actividades || [])

onMounted(async () => {
  loading.value = true
  try {
    // 1. Fetch Hacienda details
    hacienda.value = await pb.collection('Haciendas').getOne(haciendaId)

    // 2. Fetch active Vinculacion
    vinculacion.value = await pb.collection('vinculaciones_asesor').getFirstListItem(
      `hacienda_id="${haciendaId}" && estado="activa"`
    )

    // 3. Load activities
    await actividadesStore.cargarActividades()

    // 4. Load packages and recipes
    await loadPackagesAndRecipes()
  } catch (error) {
    handleError(error, 'Error al inicializar el expediente de la hacienda')
  } finally {
    loading.value = false
  }
})

const loadPackagesAndRecipes = async () => {
  const [pkgs, recipes] = await Promise.all([
    pb.collection('paquetes_evaluacion').getFullList({
      filter: `vinculacion_id="${vinculacion.value.id}"`,
      sort: '-created'
    }),
    pb.collection('recetas').getFullList({
      filter: `vinculacion_id="${vinculacion.value.id}"`,
      sort: '-created'
    })
  ])

  paquetes.value = pkgs
  recetas.value = recipes

  // Extract shared siembras from packages
  const siembraIds = [...new Set(pkgs.flatMap(p => p.siembras_compartidas || []))]
  sharedSiembras.value = await Promise.all(siembraIds.map(async (id) => {
    try {
      const s = await pb.collection('Siembras').getOne(id)
      return { id: s.id, nombre: s.nombre }
    } catch {
      return { id, nombre: `Siembra #${id.substring(0, 4)}` }
    }
  }))
}

const selectPackage = async (pkg) => {
  selectedPackage.value = pkg
  packageSiembra.value = null
  packageZonas.value = []
  packageBitacoras.value = []

  // Auto-mark package as read if pending
  if (pkg.estado === 'pendiente') {
    try {
      await pb.collection('paquetes_evaluacion').update(pkg.id, { estado: 'visto' })
      pkg.estado = 'visto'
    } catch (e) {
      console.warn('Could not mark package as viewed:', e)
    }
  }

  // Load package details
  try {
    const siembraId = pkg.siembras_compartidas?.[0]
    if (siembraId) {
      packageSiembra.value = await pb.collection('Siembras').getOne(siembraId)
    }

    if (pkg.zonas_compartidas?.length > 0) {
      const filterZonas = pkg.zonas_compartidas.map(id => `id="${id}"`).join(' || ')
      packageZonas.value = await pb.collection('zonas').getFullList({ filter: filterZonas })
    }

    if (pkg.bitacoras_compartidas?.length > 0) {
      const filterBitacoras = pkg.bitacoras_compartidas.map(id => `id="${id}"`).join(' || ')
      packageBitacoras.value = await pb.collection('bitacora').getFullList({
        filter: filterBitacoras,
        expand: 'actividad_realizada'
      })
    }
  } catch (err) {
    handleError(err, 'Error al cargar los registros del paquete')
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

const getSiembraName = (id) => {
  const s = sharedSiembras.value.find(x => x.id === id)
  return s ? s.nombre : 'Siembra'
}

const getActividadName = (id) => {
  const a = actividades.value.find(x => x.id === id)
  return a ? a.nombre : 'Actividad'
}

const getFrecuenciaLabel = (freq) => {
  switch (freq) {
    case 'una_vez': return 'Una Sola Vez'
    case 'diario': return 'Diario'
    case 'semanal': return 'Semanal'
    case 'quincenal': return 'Quincenal'
    case 'mensual': return 'Mensual'
    default: return freq || 'Una Sola Vez'
  }
}

const getRecipeHeaderBg = (state) => {
  switch (state) {
    case 'borrador': return 'bg-gradient-blue'
    case 'enviada': return 'bg-gradient-orange'
    case 'aprobada': return 'bg-gradient-green'
    case 'rechazada': return 'bg-gradient-red'
    default: return 'bg-gradient-teal'
  }
}

const getRecipeStatusColor = (state) => {
  switch (state) {
    case 'borrador': return 'blue'
    case 'enviada': return 'orange'
    case 'aprobada': return 'green'
    case 'rechazada': return 'red'
    default: return 'grey'
  }
}

const getRecipeStatusLabel = (state) => {
  switch (state) {
    case 'borrador': return 'Borrador'
    case 'enviada': return 'Enviada'
    case 'aprobada': return 'Aprobada'
    case 'rechazada': return 'Rechazada'
    default: return state
  }
}

const openNewRecipe = () => {
  selectedRecipeId.value = ''
  recipeDialogOpen.value = true
}

const editRecipe = (id) => {
  selectedRecipeId.value = id
  recipeDialogOpen.value = true
}

const sendDraft = async (recipe) => {
  uiFeedback.showLoading()
  try {
    await pb.collection('recetas').update(recipe.id, { estado: 'enviada' })
    recipe.estado = 'enviada'
    uiFeedback.showSnackbar('Receta enviada con éxito a la hacienda', 'success')
  } catch (err) {
    handleError(err, 'Error al enviar borrador')
  } finally {
    uiFeedback.hideLoading()
  }
}

const onRecipeSaved = async () => {
  await loadPackagesAndRecipes()
}
</script>

<style scoped>
.bg-gradient-teal {
  background: linear-gradient(135deg, #00796B 0%, #004D40 100%);
}
.bg-gradient-blue {
  background: linear-gradient(135deg, #0D47A1 0%, #1976D2 100%);
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
.border-dashed {
  border-style: dashed !important;
}
.border-teal {
  border-color: #004D40 !important;
}
</style>
