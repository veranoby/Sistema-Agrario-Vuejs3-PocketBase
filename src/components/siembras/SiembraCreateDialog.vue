<template>
  <v-dialog v-model="dialog" persistent max-width="500px">
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>{{ t('sowings.new_sowing') }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-form @submit.prevent="crearSiembra" ref="form">
        <v-card-text>
          <v-text-field
            v-model="nuevaSiembraData.nombre"
            :label="t('sowings.name_ex')"
            variant="outlined"
            density="compact"
            required
          ></v-text-field>
          <v-text-field
            v-model="nuevaSiembraData.tipo"
            :label="t('sowings.type_ex')"
            variant="outlined"
            density="compact"
            required
          ></v-text-field>
          <v-select
            v-model="nuevaSiembraData.estado"
            :items="estadoOptions"
            :label="t('sowings.state')"
            variant="outlined"
            density="compact"
            required
          ></v-select>
          <v-text-field
            v-model="nuevaSiembraData.fecha_inicio"
            :label="t('sowings.start_date')"
            type="date"
            variant="outlined"
            density="compact"
            required
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            size="small"
            variant="flat"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="cerrarDialog"
          >
            {{ t('sowings.cancel') }}
          </v-btn>
          <v-btn
            type="submit"
            variant="flat"            
            prepend-icon="mdi-check"
            color="green-lighten-3"
          >
            {{ t('sowings.create_sowing') }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
const router = useRouter()
const siembrasStore = useSiembrasStore()
const haciendaStore = useHaciendaStore()

const { mi_hacienda } = storeToRefs(haciendaStore)

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'created'])

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const form = ref(null)

const nuevaSiembraData = ref({
  nombre: '',
  tipo: '',
  estado: 'planificada',
  fecha_inicio: new Date().toISOString().substr(0, 10),
  hacienda: mi_hacienda.value?.id
})

const estadoOptions = ['planificada', 'en_crecimiento', 'cosechada', 'finalizada']

const cerrarDialog = () => {
  dialog.value = false
  resetForm()
}

const resetForm = () => {
  nuevaSiembraData.value = {
    nombre: '',
    tipo: '',
    estado: 'planificada',
    fecha_inicio: new Date().toISOString().substr(0, 10),
    hacienda: mi_hacienda.value?.id
  }
}

const crearSiembra = async () => {
  try {
    const { valid } = await form.value.validate()
    if (!valid) return

    nuevaSiembraData.value.nombre = nuevaSiembraData.value.nombre.toUpperCase()
    nuevaSiembraData.value.tipo = nuevaSiembraData.value.tipo.toUpperCase()

    const nuevaSiembra = await siembrasStore.crearSiembra(nuevaSiembraData.value)
    
    dialog.value = false
    resetForm()
    
    // Redirigir al workspace de la nueva siembra
    if (nuevaSiembra?.id) {
      router.push(`/siembras/${nuevaSiembra.id}`)
    }
    
    emit('created', nuevaSiembra)
  } catch (error) {
    console.error('Error creando siembra:', error)
  }
}
</script>

<style scoped>
</style>
