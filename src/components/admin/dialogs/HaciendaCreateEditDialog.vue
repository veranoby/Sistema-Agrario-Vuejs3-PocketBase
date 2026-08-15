<template>
  <v-dialog v-model="isOpen" max-width="700" persistent>
    <v-card>
      <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3">
        <span class="text-h6">Nueva Hacienda</span>
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeModal" />
      </v-card-title>

      <v-card-text class="pt-4">
        <v-form ref="haciendaForm" v-model="formValid" @submit.prevent="saveHacienda">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.name"
                label="Nombre de la Hacienda *"
                :rules="[v => !!v?.trim() || 'El nombre es obligatorio']"
                required
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-domain"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="formData.administrador"
                :items="usersList"
                item-title="label"
                item-value="id"
                label="Propietario / Administrador Principal"
                placeholder="Seleccionar usuario"
                variant="outlined"
                density="compact"
                clearable
                prepend-inner-icon="mdi-account-tie"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.ubicacion"
                label="Ubicación"
                placeholder="Ej: Cantón Durán, Guayas, Ecuador"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-map-marker"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.plan"
                :items="planesOptions"
                item-title="label"
                item-value="id"
                label="Plan Inicial"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-package-variant-closed"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.descripcion"
                label="Descripción / Información adicional"
                rows="3"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-text"
              />
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" density="compact" class="mt-3">
            <span class="text-caption">
              Una vez creada la hacienda, podrás gestionar usuarios, habilitar módulos específicos, vincular asesores técnicos y configurar parámetros de IA desde el panel de gestión detallada.
            </span>
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pb-4 pr-4">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!formValid"
          :loading="loading"
          prepend-icon="mdi-plus"
          @click="saveHacienda"
        >
          Crear Hacienda
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useHaciendaManagementStore } from '@/stores/haciendaManagementStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  usersList: {
    type: Array,
    default: () => []
  },
  planesList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const haciendaManagementStore = useHaciendaManagementStore()
const uiFeedbackStore = useUiFeedbackStore()

const haciendaForm = ref(null)
const formValid = ref(false)
const loading = ref(false)

const formData = ref({
  name: '',
  administrador: null,
  descripcion: '',
  ubicacion: '',
  plan: 'free'
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const planesOptions = computed(() => {
  if (props.planesList && props.planesList.length > 0) {
    return props.planesList.map(p => ({
      id: p.id,
      label: p.nombre || p.name || p.id
    }))
  }
  return [
    { id: 'free', label: 'Gratuito / Básico' },
    { id: 'pro', label: 'Profesional (Pro)' },
    { id: 'enterprise', label: 'Empresarial (Enterprise)' }
  ]
})

watch(() => props.modelValue, (val) => {
  if (val) {
    resetForm()
  }
})

function resetForm() {
  formData.value = {
    name: '',
    administrador: null,
    descripcion: '',
    ubicacion: '',
    plan: planesOptions.value[0]?.id || 'free'
  }
  formValid.value = false
  haciendaForm.value?.resetValidation()
}

function closeModal() {
  isOpen.value = false
}

async function saveHacienda() {
  if (!formData.value.name?.trim()) return
  loading.value = true

  const data = {
    nombre: formData.value.name.trim(),
    name: formData.value.name.trim(),
    info: formData.value.descripcion || '',
    descripcion: formData.value.descripcion || '',
    location: formData.value.ubicacion || '',
    ubicacion: formData.value.ubicacion || '',
    owner: formData.value.administrador || null,
    administrador: formData.value.administrador || null,
    plan: formData.value.plan,
    status: 'active'
  }

  try {
    await haciendaManagementStore.createHacienda(data)
    uiFeedbackStore.showSnackbar('Hacienda creada exitosamente', 'success')
    emit('saved')
    closeModal()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al crear hacienda', 'error')
  } finally {
    loading.value = false
  }
}
</script>
