<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="800px" persistent>
    <v-card class="rounded-xl overflow-hidden border border-teal-lighten-4">
      <v-card-title class="bg-gradient-teal py-4 px-6 text-white d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-file-document-edit" size="28"></v-icon>
          <span class="text-h6 font-weight-bold">{{ recipeId ? 'Editar Receta Técnica' : 'Nueva Receta Fitosanitaria' }}</span>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" density="compact" @click="close"></v-btn>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="formValid">
          <v-row>
            <!-- Título -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="titulo"
                label="Nombre / Título de la Receta"
                placeholder="Ej: Control de Sigatoka Negra - Lote A"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'El título es requerido']"
                required
              ></v-text-field>
            </v-col>

            <!-- Siembra -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="selectedSiembra"
                :items="sharedSiembras"
                item-title="nombre"
                item-value="id"
                label="Siembra Objetivo"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'La siembra es requerida']"
                required
              ></v-select>
            </v-col>

            <!-- Blanco Biológico -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="blancoBiologico"
                label="Blanco Biológico (Plaga / Enfermedad)"
                placeholder="Ej: Sigatoka Negra (Mycosphaerella fijiensis)"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'El blanco biológico es requerido']"
                required
              ></v-text-field>
            </v-col>

            <!-- Producto Recomendado -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="productoRecomendado"
                label="Producto / Fitosanitario Recomendado"
                placeholder="Ej: Mancozeb 80 WP"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'El producto es requerido']"
                required
              ></v-text-field>
            </v-col>

            <!-- Ingrediente Activo -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="ingredienteActivo"
                label="Ingrediente Activo"
                placeholder="Ej: Mancozeb 80%"
                variant="outlined"
                density="compact"
                color="teal"
              ></v-text-field>
            </v-col>

            <!-- Dosis -->
            <v-col cols="12" sm="3">
              <v-text-field
                v-model.number="dosis"
                label="Dosis"
                placeholder="Ej: 1.5"
                type="number"
                min="0"
                step="0.1"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => (v !== '' && v !== null && v >= 0) || 'La dosis es requerida']"
                required
              ></v-text-field>
            </v-col>

            <!-- Unidad Dosis -->
            <v-col cols="12" sm="3">
              <v-select
                v-model="unidadDosis"
                :items="unidadDosisOptions"
                label="Unidad"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'La unidad es requerida']"
                required
              ></v-select>
            </v-col>

            <!-- PHI Días -->
            <v-col cols="12" sm="3">
              <v-text-field
                v-model.number="phiDias"
                label="PHI (días carencia)"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                color="teal"
                hint="Período de carencia antes de cosecha"
                persistent-hint
              ></v-text-field>
            </v-col>

            <!-- REI Horas -->
            <v-col cols="12" sm="3">
              <v-text-field
                v-model.number="reiHoras"
                label="REI (horas reingreso)"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                color="teal"
                hint="Período de reingreso al área"
                persistent-hint
              ></v-text-field>
            </v-col>

            <!-- Método de Aplicación -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="metodoAplicacion"
                label="Método de Aplicación"
                placeholder="Ej: Aspersión foliar con equipo de mochila"
                variant="outlined"
                density="compact"
                color="teal"
              ></v-text-field>
            </v-col>

            <!-- Observaciones Técnicas -->
            <v-col cols="12">
              <v-textarea
                v-model="observacionesTecnicas"
                label="Observaciones e Instrucciones Técnicas"
                placeholder="Ej: Aplicar temprano en la mañana con viento calmado. Usar EPP completo. Respetar carencia de PHI días antes de cosecha."
                variant="outlined"
                rows="4"
                maxlength="1000"
                counter
                color="teal"
                :rules="[v => !!v || 'Las instrucciones técnicas son requeridas']"
                required
              ></v-textarea>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="px-6 py-4 bg-grey-lighten-5 d-flex justify-space-between">
        <v-btn variant="outlined" color="grey-darken-2" class="font-weight-bold" @click="close">
          Cancelar
        </v-btn>

        <div class="d-flex gap-2">
          <v-btn
            color="blue-darken-2"
            variant="outlined"
            class="font-weight-bold rounded-lg"
            prepend-icon="mdi-content-save-edit"
            @click="guardarBorrador"
          >
            Guardar Borrador
          </v-btn>
          <v-btn
            color="teal"
            variant="flat"
            class="font-weight-bold text-white rounded-lg"
            prepend-icon="mdi-send"
            :disabled="!formValid"
            @click="enviarReceta"
          >
            Enviar a Hacienda
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'

const props = defineProps({
  modelValue: Boolean,
  vinculacionId: String,
  sharedSiembras: Array,
  actividades: Array,
  recipeId: String
})

const emit = defineEmits(['update:modelValue', 'save'])

const uiFeedback = useUiFeedbackStore()

const form = ref(null)
const formValid = ref(false)

// Fields aligned with recetas PocketBase schema
const titulo = ref('')
const selectedSiembra = ref(null)
const blancoBiologico = ref('')
const productoRecomendado = ref('')
const ingredienteActivo = ref('')
const dosis = ref(0)
const unidadDosis = ref('cc/L')
const phiDias = ref(null)
const reiHoras = ref(null)
const metodoAplicacion = ref('')
const observacionesTecnicas = ref('')

const unidadDosisOptions = ['cc/L', 'g/L', 'kg/ha', 'L/ha']

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    if (props.recipeId) {
      // Edit mode: fetch recipe details using real schema field names
      try {
        const r = await pb.collection('recetas').getOne(props.recipeId)
        titulo.value = r.titulo || ''
        selectedSiembra.value = r.siembra_id || null
        blancoBiologico.value = r.blanco_biologico || ''
        productoRecomendado.value = r.producto_recomendado || ''
        ingredienteActivo.value = r.ingrediente_activo || ''
        dosis.value = r.dosis ?? 0
        unidadDosis.value = r.unidad_dosis || 'cc/L'
        phiDias.value = r.phi_dias ?? null
        reiHoras.value = r.rei_horas ?? null
        metodoAplicacion.value = r.metodo_aplicacion || ''
        observacionesTecnicas.value = r.observaciones_tecnicas || ''
      } catch (err) {
        console.error(err)
      }
    } else {
      // Create mode: reset to defaults
      titulo.value = ''
      selectedSiembra.value = props.sharedSiembras?.length > 0 ? props.sharedSiembras[0].id : null
      blancoBiologico.value = ''
      productoRecomendado.value = ''
      ingredienteActivo.value = ''
      dosis.value = 0
      unidadDosis.value = 'cc/L'
      phiDias.value = null
      reiHoras.value = null
      metodoAplicacion.value = ''
      observacionesTecnicas.value = ''
    }
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const getPayload = (estado) => {
  // All field names match recetas PocketBase collection schema exactly
  return {
    vinculacion_id: props.vinculacionId,
    titulo: titulo.value,
    siembra_id: selectedSiembra.value,
    blanco_biologico: blancoBiologico.value,
    producto_recomendado: productoRecomendado.value,
    ingrediente_activo: ingredienteActivo.value,
    dosis: Number(dosis.value),
    unidad_dosis: unidadDosis.value,
    phi_dias: phiDias.value ? Number(phiDias.value) : null,
    rei_horas: reiHoras.value ? Number(reiHoras.value) : null,
    metodo_aplicacion: metodoAplicacion.value,
    observaciones_tecnicas: observacionesTecnicas.value,
    estado
  }
}

const saveRecipe = async (estado) => {
  uiFeedback.showLoading()
  try {
    const payload = getPayload(estado)
    let record
    if (props.recipeId) {
      record = await pb.collection('recetas').update(props.recipeId, payload)
    } else {
      record = await pb.collection('recetas').create(payload)
    }
    
    uiFeedback.showSnackbar(
      estado === 'borrador' ? 'Borrador guardado con éxito' : 'Receta enviada con éxito a la hacienda',
      'success'
    )
    emit('save', record)
    close()
  } catch (error) {
    handleError(error, 'Error al guardar la receta')
  } finally {
    uiFeedback.hideLoading()
  }
}

const guardarBorrador = () => {
  saveRecipe('borrador')
}

const enviarReceta = async () => {
  const { valid } = await form.value.validate()
  if (valid) {
    saveRecipe('enviada')
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
</style>
