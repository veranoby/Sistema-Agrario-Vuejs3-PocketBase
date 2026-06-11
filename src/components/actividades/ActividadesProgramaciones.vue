<template>
  <div class="siembra-info mt-4 p-0">
    <v-card-title class="headline d-flex justify-between">
      <h3 class=" text-sm font-bold mt-2">
        <span>{{ t('activity_workspace.schedules') }}</span>
      </h3>
      <v-btn
        size="small"
        color="green-lighten-2"
        @click="abrirNuevaProgramacion"
        icon
        rounded="circle"
        class="ml-auto"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text>
      <ProgramacionPanel
        v-for="programacion in programaciones"
        :key="programacion.id"
        :programacion="programacion"
        bg-color="#6e97b21c"
        text-color="color-text"
        @request-single-execution="handleRequestSingleExecution"
        @editar="editarProgramacion"
      />
    </v-card-text>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import ProgramacionPanel from '@/components/programaciones/ProgramacionPanel.vue'

const props = defineProps({
  programaciones: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['abrir-nueva-programacion', 'editar-programacion', 'request-single-execution'])

const { t } = useI18n()

const abrirNuevaProgramacion = () => {
  emit('abrir-nueva-programacion')
}

const editarProgramacion = (programacion) => {
  emit('editar-programacion', programacion)
}

const handleRequestSingleExecution = (programacion) => {
  emit('request-single-execution', programacion)
}
</script>

<style scoped>
.siembra-info {
  background: transparent;
}
</style>
