<template>
  <v-dialog v-model="isOpen" max-width="800" persistent>
    <v-card>
      <v-card-title class="bg-primary text-white">
        {{ isEdit ? 'Editar Hacienda' : 'Nueva Hacienda' }}
      </v-card-title>
      <v-card-text class="pt-4">
        <v-form ref="haciendaForm" v-model="formValid" @submit.prevent="saveHacienda">
          <h3 class="font-weight-bold mb-2">Información Principal</h3>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.name"
                label="Nombre"
                :rules="[v => !!v || 'Nombre requerido']"
                required
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="formData.administrador"
                :items="usersList"
                item-title="label"
                item-value="id"
                label="Propietario / Administrador"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="formData.descripcion"
                label="Información Adicional (Descripción)"
                rows="2"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.ubicacion"
                label="Ubicación"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="formData.ai_config.provider"
                :items="['custom', 'openrouter']"
                label="AI Provider"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="formData.ai_config.model"
                label="AI Model"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="formData.ai_config.base_url"
                label="AI Base URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="formData.ai_config.auth_token"
                label="AI Auth Token"
                type="password"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6" v-if="isEdit && hasAvatar">
              <v-btn color="error" variant="outlined" size="small" @click="handleDeleteAvatar">
                Eliminar Avatar
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <h3 class="font-weight-bold mb-2">Configuración y Estado</h3>
          <v-row>
            <v-col cols="12" md="6">
              <span class="text-xs">Estado</span>
              <v-radio-group v-model="formData.status" inline>
                <v-radio label="Activa" value="active" />
                <v-radio label="Suspendida" value="suspended" />
                <v-radio label="Inactiva" value="inactive" />
              </v-radio-group>
            </v-col>
            <v-col cols="12" md="6" v-if="formData.status === 'suspended'">
              <v-text-field
                v-model="formData.suspension_reason"
                label="Razón de suspensión"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <template v-if="isEdit">
            <v-divider class="my-4" />
            <h3 class="font-weight-bold mb-2">Suscripción y Módulos</h3>
            <v-row>
              <v-col cols="12" md="6">
                <span class="text-xs">Plan</span>
                <v-radio-group v-model="formData.plan" inline>
                  <v-radio
                    v-for="plan in planesList"
                    :key="plan.id"
                    :label="plan.nombre || plan.name"
                    :value="plan.id"
                  />
                </v-radio-group>
              </v-col>
              <v-col cols="12">
                <span class="text-xs">Módulos Activos</span>
                <v-row class="mt-1">
                  <v-col cols="12" sm="6" md="4" v-for="mod in modulosList" :key="mod.id">
                    <v-checkbox
                      v-model="formData.active_modules"
                      :value="mod.id"
                      hide-details
                      density="compact"
                    >
                      <template v-slot:label>
                        <span class="text-md">{{ mod.name || mod.nombre }}</span>
                      </template>
                    </v-checkbox>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </template>
          <template v-else>
            <v-alert type="info" class="mt-4" density="compact">
              Al crear la hacienda se asignará automáticamente el plan gratuito sin módulos extra.
            </v-alert>
          </template>
        </v-form>
      </v-card-text>
      <v-card-actions class="pb-4 pr-4">
        <v-spacer />
        <v-btn color="error" variant="elevated" @click="closeModal">CANCELAR</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!formValid"
          :loading="loading"
          @click="saveHacienda"
        >
          GUARDAR
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
  haciendaData: {
    type: Object,
    default: null
  },
  usersList: {
    type: Array,
    default: () => []
  },
  planesList: {
    type: Array,
    default: () => []
  },
  modulosList: {
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
const hasAvatar = ref(false)

const formData = ref({
  name: '',
  descripcion: '',
  ubicacion: '',
  plan: null,
  status: 'active',
  suspension_reason: '',
  administrador: null,
  active_modules: [],
  ai_config: { provider: 'custom', base_url: '', model: '', auth_token: '' }
})

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.haciendaData?.id)

watch(() => props.modelValue, (val) => {
  if (val) {
    initForm()
  }
})

function initForm() {
  const h = props.haciendaData
  if (h) {
    hasAvatar.value = !!h.avatar
    formData.value = {
      name: h.name || h.nombre || '',
      descripcion: h.info || h.descripcion || '',
      ubicacion: h.location || h.ubicacion || '',
      plan: h.plan?.id || h.plan || null,
      status: h.status || 'active',
      suspension_reason: h.suspension_reason || '',
      administrador: h.owner || h.administrador || null,
      active_modules: Array.isArray(h.active_modules) ? h.active_modules : (h.active_modules ? [h.active_modules] : []),
      ai_config: h.ai_config || { provider: 'custom', base_url: '', model: '', auth_token: '' }
    }
  } else {
    hasAvatar.value = false
    formData.value = {
      name: '',
      descripcion: '',
      ubicacion: '',
      plan: null,
      status: 'active',
      suspension_reason: '',
      administrador: null,
      active_modules: [],
      ai_config: { provider: 'custom', base_url: '', model: '', auth_token: '' }
    }
    haciendaForm.value?.reset()
  }
}

function closeModal() {
  isOpen.value = false
}

async function saveHacienda() {
  if (!formData.value.name) return
  loading.value = true
  const data = {
    nombre: formData.value.name,
    name: formData.value.name,
    info: formData.value.descripcion,
    location: formData.value.ubicacion,
    descripcion: formData.value.descripcion,
    ubicacion: formData.value.ubicacion,
    status: formData.value.status,
    suspension_reason: formData.value.status === 'suspended' ? formData.value.suspension_reason : '',
    owner: formData.value.administrador,
    ai_config: formData.value.ai_config
  }

  if (isEdit.value) {
    data.plan = formData.value.plan
    data.active_modules = formData.value.active_modules
  }

  try {
    if (isEdit.value) {
      await haciendaManagementStore.updateHacienda(props.haciendaData.id, data)
      uiFeedbackStore.showSnackbar('Hacienda actualizada exitosamente', 'success')
    } else {
      await haciendaManagementStore.createHacienda(data)
      uiFeedbackStore.showSnackbar('Hacienda creada exitosamente', 'success')
    }
    emit('saved')
    closeModal()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al guardar hacienda', 'error')
  } finally {
    loading.value = false
  }
}

async function handleDeleteAvatar() {
  if (!props.haciendaData?.id) return
  try {
    await haciendaManagementStore.updateHacienda(props.haciendaData.id, { avatar: null })
    hasAvatar.value = false
    uiFeedbackStore.showSnackbar('Avatar eliminado exitosamente', 'success')
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al eliminar avatar', 'error')
  }
}
</script>
