<template>
  <div class="siembra-info mt-2 p-2">
    <v-card-title class="headline d-flex justify-between">
      <h3 class=" text-sm font-bold mt-2">{{ t('activity_workspace.reminders') }}</h3>
      <v-btn
        size="small"
        color="green-lighten-2"
        @click="abrirNuevoRecordatorio"
        icon
        rounded="circle"
        class="ml-auto"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-card-title>

    <RecordatorioForm
      :model-value="dialogVisible"
      @update:modelValue="emit('update:dialogVisible', $event)"
      :recordatorio="recordatorioEdit"
      :is-editing="isEditing"
      @submit="handleFormSubmit"
    />

    <StatusPanel
      :title="t('activity_workspace.pending')"
      color="red"
      :items="recordatoriosPendientes"
      @update-status="actualizarEstado"
      @edit="editarRecordatorio"
      @delete="eliminarRecordatorio"
    />
    <br />
    <StatusPanel
      :title="t('activity_workspace.in_progress')"
      color="amber"
      :items="recordatoriosEnProgreso"
      @update-status="actualizarEstado"
      @edit="editarRecordatorio"
      @delete="eliminarRecordatorio"
    />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'
import StatusPanel from '@/components/recordatorios/RecordatoriosStatusPanel.vue'

const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true
  },
  recordatorioEdit: {
    type: Object,
    default: () => ({})
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  recordatoriosPendientes: {
    type: Array,
    required: true
  },
  recordatoriosEnProgreso: {
    type: Array,
    required: true
  },
  actividadId: {
    type: String,
    required: true
  }
})

const emit = defineEmits([
  'update:dialogVisible',
  'abrir-nuevo-recordatorio',
  'actualizar-estado',
  'editar-recordatorio',
  'eliminar-recordatorio',
  'submit-recordatorio'
])

const { t } = useI18n()

const abrirNuevoRecordatorio = () => {
  emit('abrir-nuevo-recordatorio')
}

const actualizarEstado = (...args) => {
  emit('actualizar-estado', ...args)
}

const editarRecordatorio = (...args) => {
  emit('editar-recordatorio', ...args)
}

const eliminarRecordatorio = (...args) => {
  emit('eliminar-recordatorio', ...args)
}

const handleFormSubmit = (data) => {
  emit('submit-recordatorio', data)
}
</script>

<style scoped>
.siembra-info {
  background: transparent;
}
</style>
