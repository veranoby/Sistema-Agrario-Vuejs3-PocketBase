<template>
  <div class="bpa-checklist bg-dinamico p-4 rounded-lg">
    <div class="flex items-center mb-4">
      <v-icon color="primary" class="mr-2">mdi-check-all</v-icon>
      <h4 class="font-weight-bold">Checklist BPA (Buenas Prácticas Agrícolas)</h4>
    </div>
    
    <div class="ml-8 flex flex-col gap-3">
      <div v-for="pregunta in preguntas" :key="pregunta.id" class="d-flex flex-column mb-2">
        <span class="text-body-2 font-weight-medium mb-2">{{ pregunta.pregunta }}</span>
        <div class="d-flex gap-2">
          <v-chip
            :color="respuestas[pregunta.id] === true ? 'success' : 'grey-lighten-2'"
            :variant="respuestas[pregunta.id] === true ? 'flat' : 'outlined'"
            @click="setRespuesta(pregunta.id, true)"
            class="cursor-pointer font-weight-medium"
            size="small"
          >
            <v-icon start size="small">mdi-check-circle</v-icon>
            CUMPLE
          </v-chip>
          
          <v-chip
            :color="respuestas[pregunta.id] === false ? 'error' : 'grey-lighten-2'"
            :variant="respuestas[pregunta.id] === false ? 'flat' : 'outlined'"
            @click="setRespuesta(pregunta.id, false)"
            class="cursor-pointer font-weight-medium"
            size="small"
          >
            <v-icon start size="small">mdi-close-circle</v-icon>
            NO CUMPLE
          </v-chip>

          <v-chip
            :color="respuestas[pregunta.id] === null || respuestas[pregunta.id] === undefined ? 'grey-darken-1' : 'grey-lighten-2'"
            :variant="respuestas[pregunta.id] === null || respuestas[pregunta.id] === undefined ? 'flat' : 'outlined'"
            @click="setRespuesta(pregunta.id, null)"
            class="cursor-pointer font-weight-medium"
            size="small"
          >
            <v-icon start size="small">mdi-minus-circle</v-icon>
            N/A
          </v-chip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  preguntas: {
    type: Array,
    required: true,
    default: () => []
  },
  modelValue: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

// Local state for answers
const respuestas = reactive({ ...props.modelValue });

watch(() => props.modelValue, (newVal) => {
  for (const key in newVal) {
    respuestas[key] = newVal[key];
  }
}, { deep: true });

function setRespuesta(preguntaId, valor) {
  respuestas[preguntaId] = valor;
  emit('update:modelValue', { ...respuestas });
}
</script>
