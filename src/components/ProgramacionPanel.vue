<template>
  <v-card class="mb-4 siembra-info">
    <v-card-text>
      <div class="flex items-center justify-between mb-2">
        <div>
          <h3 class="text-lg font-semibold">{{ programacion.descripcion }}</h3>
          <div class="text-sm text-gray-600">
            {{ actividadTipo }}
          </div>
        </div>
        <v-chip :color="colorEstado" small>
          {{ programacion.estado }}
        </v-chip>
      </div>

      <v-divider class="my-2"></v-divider>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <v-icon small>mdi-calendar-clock</v-icon>
          Última ejecución: {{ formatFecha(programacion.ultima_ejecucion) }}
        </div>
        <div>
          <v-icon small>mdi-calendar-arrow-right</v-icon>
          Próxima ejecución: {{ formatFecha(programacion.proxima_ejecucion) }}
        </div>
        <div>
          <v-icon small>mdi-counter</v-icon>
          Ejecuciones: {{ programacion.ejecuciones_count || 0 }}
        </div>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn small @click="$emit('editar', programacion)">
        <v-icon left>mdi-pencil</v-icon>
        Editar
      </v-btn>
      <v-btn small :color="colorEstado" @click="$emit('ejecutar', programacion.id)">
        <v-icon left>mdi-play</v-icon>
        Ejecutar
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { defineProps, computed } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'

const props = defineProps({
  programacion: {
    type: Object,
    required: true
  }
})

const actividadesStore = useActividadesStore()

const colorEstado = computed(
  () =>
    ({
      activo: 'green',
      pausado: 'orange',
      finalizado: 'red'
    })[props.programacion.estado] || 'gray'
)

const actividadTipo = computed(() => {
  const actividadId = props.programacion.actividades?.[0]
  if (!actividadId) return ''
  return actividadesStore.getActividadTipo(actividadId) || ''
})

const formatFecha = (fecha) => {
  if (!fecha) return 'No programado'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(fecha))
}
</script>
