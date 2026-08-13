<template>
  <v-dialog v-model="isOpen" max-width="500">
    <v-card>
      <v-card-title class="bg-indigo text-white">Vincular Asesor Técnico</v-card-title>
      <v-card-text class="pt-4">
        <v-autocomplete
          v-model="selectedAsesorToVincular"
          :items="availableAsesoresList"
          :loading="fetchingAsesores"
          item-title="label"
          item-value="id"
          label="Seleccionar Asesor"
          variant="outlined"
          density="compact"
          clearable
        />
      </v-card-text>
      <v-card-actions class="pb-4 pr-4">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="indigo"
          variant="elevated"
          :disabled="!selectedAsesorToVincular"
          :loading="loading"
          @click="handleAddAsesorVinculacion"
        >
          Vincular
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { pb } from '@/utils/pocketbase'
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
  currentAsesorIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'linked'])

const haciendaManagementStore = useHaciendaManagementStore()
const uiFeedbackStore = useUiFeedbackStore()

const selectedAsesorToVincular = ref(null)
const allAsesoresList = ref([])
const loading = ref(false)
const fetchingAsesores = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const availableAsesoresList = computed(() => {
  if (!allAsesoresList.value.length) return []
  return allAsesoresList.value.filter(a => !props.currentAsesorIds.includes(a.id))
})

watch(() => props.modelValue, (val) => {
  if (val) {
    selectedAsesorToVincular.value = null
    fetchAsesores()
  }
})

async function fetchAsesores() {
  fetchingAsesores.value = true
  try {
    const asesores = await pb.collection('users').getFullList({ filter: 'role = "asesor"' })
    allAsesoresList.value = asesores.map(a => ({
      id: a.id,
      label: `${a.name || a.username || 'Asesor'} (${a.email || 'Sin email'})`
    }))
  } catch (err) {
    console.error('Error al cargar asesores:', err)
  } finally {
    fetchingAsesores.value = false
  }
}

function closeModal() {
  selectedAsesorToVincular.value = null
  isOpen.value = false
}

async function handleAddAsesorVinculacion() {
  if (!selectedAsesorToVincular.value || !props.haciendaId) return
  loading.value = true
  try {
    await haciendaManagementStore.addAsesorVinculacion(props.haciendaId, selectedAsesorToVincular.value)
    uiFeedbackStore.showSnackbar('Asesor vinculado exitosamente', 'success')
    emit('linked')
    closeModal()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al vincular asesor', 'error')
  } finally {
    loading.value = false
  }
}
</script>
