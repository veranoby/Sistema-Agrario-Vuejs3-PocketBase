<template>
  <v-card class="mb-4" :class="{ 'border-2 border-red': debeEjecutarHoy }">
    <v-card-text class="pt-0">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h3 class="text-md font-bold">
            {{ programacion.descripcion }}
          </h3>
          <div class="text-sm text-gray-600">
            {{ actividadTipo }}
          </div>
        </div>
        <div class="justify-items-end">
          <v-chip v-if="debeEjecutarHoy" color="red" variant="elevated" small class="ml-2">
            <v-icon small>mdi-alert</v-icon>
            Ejecutar hoy
          </v-chip>
          <v-chip v-if="esUrgente" color="red" small class="ml-2">
            <v-icon small>mdi-alert</v-icon>
            {{ ejecucionesPendientes }} pendiente(s)
          </v-chip>
          <v-chip :color="colorEstado" small class="ml-2">
            {{ programacion.estado }}
          </v-chip>
          <v-btn
            class="ml-2"
            size="x-small"
            icon="mdi-pencil"
            @click="$emit('editar', programacion)"
          >
          </v-btn>
        </div>
      </div>
      <v-divider class="my-2"></v-divider>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
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
        <div class="grid justify-items-end gap-2">
          <v-btn
            v-if="ejecucionesPendientes > 1"
            size="small"
            color="orange"
            @click="ejecutarEnBloque"
          >
            <v-icon left>mdi-play-multiple</v-icon>
            Ejecutar {{ ejecucionesPendientes }} pendientes
          </v-btn>
          <v-btn size="small" :color="colorEstado" @click="$emit('ejecutar', programacion.id)">
            <v-icon left>mdi-play</v-icon>
            Ejecutar
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { defineProps, computed } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'
import { differenceInDays, differenceInMonths, isBefore } from 'date-fns'
import { useProgramacionesStore } from '@/stores/programacionesStore'

const props = defineProps({
  programacion: {
    type: Object,
    required: true
  }
})

const actividadesStore = useActividadesStore()
const programacionesStore = useProgramacionesStore()

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

  const actividad = actividadesStore.actividades.find((a) => a.id === actividadId)
  if (!actividad) return 'Desconocido'

  return actividadesStore.getActividadTipo(actividad.tipo_actividades) || 'Desconocido'
})

const formatFecha = (fecha) => {
  if (!fecha) return 'No programado'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(fecha))
}

const ejecucionesPendientes = computed(() => {
  if (!props.programacion.ultima_ejecucion) return 1

  const hoy = new Date()
  const ultimaEjecucion = new Date(props.programacion.ultima_ejecucion)

  if (props.programacion.frecuencia === 'fecha_especifica') {
    const fechaEspecifica = new Date(props.programacion.frecuencia_personalizada?.fecha)
    return fechaEspecifica < hoy ? 1 : 0
  }

  const diasDesdeUltima = differenceInDays(hoy, ultimaEjecucion)

  switch (props.programacion.frecuencia) {
    case 'diaria':
      return diasDesdeUltima
    case 'semanal':
      return Math.floor(diasDesdeUltima / 7)
    case 'quincenal':
      return Math.floor(diasDesdeUltima / 15)
    case 'mensual':
      return differenceInMonths(hoy, ultimaEjecucion)
    case 'personalizada':
      const config = props.programacion.frecuencia_personalizada
      if (config.tipo === 'dias') return Math.floor(diasDesdeUltima / config.cantidad)
      if (config.tipo === 'semanas') return Math.floor(diasDesdeUltima / (7 * config.cantidad))
      if (config.tipo === 'meses') return differenceInMonths(hoy, ultimaEjecucion) / config.cantidad
      return 0
    default:
      return 0
  }
})

const esUrgente = computed(() => ejecucionesPendientes.value > 0)

const hoy = new Date()
const debeEjecutarHoy = computed(() => {
  // Si es fecha específica, comparar directamente con hoy
  if (props.programacion.frecuencia === 'fecha_especifica') {
    // Asegurarnos de que la fecha existe y es válida
    const fechaStr = props.programacion.frecuencia_personalizada?.fecha
    if (!fechaStr) return false

    // Parsear la fecha usando UTC para evitar problemas de zona horaria
    const [year, month, day] = fechaStr.split('-').map(Number)
    const fechaEspecifica = new Date(year, month - 1, day) // month es 0-based en JS

    const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const fechaEspecificaNormalizada = new Date(
      fechaEspecifica.getFullYear(),
      fechaEspecifica.getMonth(),
      fechaEspecifica.getDate()
    )

    return fechaEspecificaNormalizada.getTime() === hoyNormalizado.getTime()
  }

  // Para otras frecuencias, usar la próxima ejecución
  const proximaEjecucion = new Date(props.programacion.proxima_ejecucion)
  const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const proximaEjecucionNormalizada = new Date(
    proximaEjecucion.getFullYear(),
    proximaEjecucion.getMonth(),
    proximaEjecucion.getDate()
  )

  return proximaEjecucionNormalizada.getTime() === hoyNormalizado.getTime()
})

const esPendiente = computed(() => {
  const fechaEjecucion =
    props.programacion.frecuencia === 'fecha_especifica'
      ? new Date(props.programacion.frecuencia_personalizada?.fecha)
      : new Date(props.programacion.proxima_ejecucion)

  return isBefore(fechaEjecucion, hoy)
})

const ejecutarEnBloque = async () => {
  try {
    for (let i = 0; i < ejecucionesPendientes.value; i++) {
      await programacionesStore.ejecutarProgramacion(props.programacion.id)
    }
  } catch (error) {
    console.error('Error ejecutando en bloque:', error)
  }
}
</script>
