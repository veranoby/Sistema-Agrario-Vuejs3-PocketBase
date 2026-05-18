<template>
  <v-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" max-width="700px" persistent>
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
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="nombreReceta"
                label="Nombre de la Receta"
                placeholder="Ej: Control de Sigatoka Negra - Lote A"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'El nombre es requerido']"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="selectedActividad"
                :items="actividades"
                item-title="nombre"
                item-value="id"
                label="Tipo de Actividad Agrícola"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'La actividad es requerida']"
                required
              ></v-select>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="producto"
                label="Producto / Fitosanitario Sugerido"
                placeholder="Ej: Mancozeb / Fungicida"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'El producto es requerido']"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="dosis"
                label="Dosis / Proporción de Aplicación"
                placeholder="Ej: 1.5 L/Ha"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'La dosis es requerida']"
                required
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="frecuencia"
                :items="frecuenciaOptions"
                label="Frecuencia Recomendada"
                variant="outlined"
                density="compact"
                color="teal"
              ></v-select>
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="selectedSiembra"
                :items="sharedSiembras"
                item-title="nombre"
                item-value="id"
                label="Siembra a Aplicar"
                variant="outlined"
                density="compact"
                color="teal"
                :rules="[v => !!v || 'La siembra es requerida']"
                required
              ></v-select>
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="instrucciones"
                label="Instrucciones Técnicas de Aplicación"
                placeholder="Ej: Realizar la aplicación temprano en la mañana con viento calmado. Usar equipo de protección adecuado. Mantener carencia de 7 días."
                variant="outlined"
                rows="4"
                maxlength="500"
                counter
                color="teal"
                :rules="[v => !!v || 'Las instrucciones son requeridas']"
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

const nombreReceta = ref('')
const selectedActividad = ref(null)
const producto = ref('')
const dosis = ref('')
const frecuencia = ref('una_vez')
const selectedSiembra = ref(null)
const instrucciones = ref('')

const frecuenciaOptions = [
  { title: 'Una Sola Vez', value: 'una_vez' },
  { title: 'Diario', value: 'diario' },
  { title: 'Semanal', value: 'semanal' },
  { title: 'Quincenal', value: 'quincenal' },
  { title: 'Mensual', value: 'mensual' }
]

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    if (props.recipeId) {
      // Edit mode: fetch recipe details
      try {
        const r = await pb.collection('recetas').getOne(props.recipeId)
        nombreReceta.value = r.nombre_receta || r.nombre || ''
        selectedActividad.value = r.actividad_id || r.actividad || null
        producto.value = r.producto || ''
        dosis.value = r.dosis || r.dosis_aplicacion || ''
        frecuencia.value = r.frecuencia || 'una_vez'
        selectedSiembra.value = r.siembra_id || r.siembra || null
        instrucciones.value = r.instrucciones || ''
      } catch (err) {
        console.error(err)
      }
    } else {
      // Create mode
      nombreReceta.value = ''
      selectedActividad.value = props.actividades?.length > 0 ? props.actividades[0].id : null
      producto.value = ''
      dosis.value = ''
      frecuencia.value = 'una_vez'
      selectedSiembra.value = props.sharedSiembras?.length > 0 ? props.sharedSiembras[0].id : null
      instrucciones.value = ''
    }
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const getPayload = (estado) => {
  return {
    vinculacion_id: props.vinculacionId,
    nombre_receta: nombreReceta.value,
    actividad_id: selectedActividad.value,
    siembra_id: selectedSiembra.value,
    producto: producto.value,
    dosis: dosis.value,
    frecuencia: frecuencia.value,
    instrucciones: instrucciones.value,
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
