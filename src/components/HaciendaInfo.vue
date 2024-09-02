<template>
  <div class="rounded-lg border-2 px-4 py-4">
    <h2 class="text-xl font-bold mb-4">
      Mi Hacienda:

      <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1">
        {{ haciendaName }}
      </v-chip>
    </h2>
    <v-form @submit.prevent="saveHaciendaChanges">
      <v-text-field
        v-model="haciendaForm.name"
        @input="updateInput"
        label="Nombre"
        variant="outlined"
        density="compact"
        class="compact-form-2"
      ></v-text-field>
      <v-text-field
        v-model="haciendaForm.location"
        label="Localizacion/Direccion"
        variant="outlined"
        density="compact"
        class="compact-form-2"
      ></v-text-field>
      <v-textarea
        v-model="haciendaForm.info"
        label="Informacion General"
        variant="outlined"
        density="compact"
        auto-grow
        rows="4"
        class="compact-form-2"
      ></v-textarea>
      <v-btn
        size="small"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-check"
        color="green-lighten-3"
        type="submit"
        :loading="isLoading"
      >
        Guardar Cambios de Hacienda
      </v-btn>
    </v-form>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'

export default {
  name: 'HaciendaInfo',

  setup() {
    const haciendaStore = useHaciendaStore()
    const { mi_hacienda } = storeToRefs(haciendaStore)

    const haciendaForm = ref({
      name: mi_hacienda.value.name,
      location: mi_hacienda.value.location,
      info: mi_hacienda.value.info
    })

    const haciendaName = computed(() => haciendaStore.haciendaName)
    const isLoading = ref(false)

    const saveHaciendaChanges = async () => {
      isLoading.value = true
      try {
        await haciendaStore.updateHacienda(haciendaForm.value)
      } catch (error) {
        console.error('Error updating hacienda:', error)
      } finally {
        isLoading.value = false
      }
    }

    const updateInput = (event) => {
      haciendaForm.value.name = event.target.value.toUpperCase()
    }
    return {
      haciendaForm,
      haciendaName,
      isLoading,
      saveHaciendaChanges,
      updateInput
    }
  }
}
</script>
