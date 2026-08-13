<template>
  <v-dialog v-model="isOpen" max-width="500">
    <v-card>
      <v-card-title class="bg-primary text-white">Agregar Usuario a Hacienda</v-card-title>
      <v-card-text class="pt-4">
        <v-autocomplete
          v-model="selectedUserToAdd"
          :items="availableUsersToAdd"
          item-title="label"
          item-value="id"
          label="Seleccionar Usuario"
          variant="outlined"
          density="compact"
          clearable
        />
      </v-card-text>
      <v-card-actions class="pb-4 pr-4">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!selectedUserToAdd"
          :loading="loading"
          @click="handleAddUserToHacienda"
        >
          Asociar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useHaciendaManagementStore } from '@/stores/haciendaManagementStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  haciendaId: {
    type: String,
    default: ''
  },
  currentMemberIds: {
    type: Array,
    default: () => []
  },
  allUsers: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'added'])

const haciendaManagementStore = useHaciendaManagementStore()
const uiFeedbackStore = useUiFeedbackStore()

const selectedUserToAdd = ref(null)
const loading = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const availableUsersToAdd = computed(() => {
  if (!props.allUsers.length) return []
  return props.allUsers
    .filter(u => !props.currentMemberIds.includes(u.id))
    .map(u => ({
      id: u.id,
      label: u.label || `${u.name || u.nombre || u.email || 'Sin nombre'} (${u.email || 'N/A'})`
    }))
})

function closeModal() {
  selectedUserToAdd.value = null
  isOpen.value = false
}

async function handleAddUserToHacienda() {
  if (!selectedUserToAdd.value || !props.haciendaId) return
  loading.value = true
  try {
    await haciendaManagementStore.addUserToHacienda(selectedUserToAdd.value, props.haciendaId)
    uiFeedbackStore.showSnackbar('Usuario asociado a la hacienda exitosamente', 'success')
    emit('added')
    closeModal()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al asociar usuario a hacienda', 'error')
  } finally {
    loading.value = false
  }
}
</script>
