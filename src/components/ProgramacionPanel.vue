<template>
  <v-card class="mb-4 bg-transparent" :class="{ 'border-2 border-red': debeEjecutarHoy }">
    <v-card-text class="p-2">
      <!-- Fila principal con descripción y botones -->
      <div class="flex min-w-0">
        <!-- Estado y alertas -->
        <div class="flex min-w-0">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-icon
                v-bind="props"
                :color="colorEstado"
                size="x-small"
                class="cursor-help"
                icon="mdi-circle"
              />
            </template>
            <span class="capitalize">{{ programacion.estado }}</span>
          </v-tooltip>

          <!-- Chip de pendientes -->
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-chip
                v-bind="props"
                v-if="esUrgente"
                color="red"
                size="x-small"
                variant="flat"
                class="ml-2"
              >
                <v-icon small>mdi-alert</v-icon>
                {{ ejecucionesPendientes }}
              </v-chip>
            </template>
            <span>{{ ejecucionesPendientes }} pendiente(s)</span>
          </v-tooltip>

          <!-- Descripción con truncate -->
          <span class="ml-2 truncate">{{ programacion.descripcion }}</span>

          <v-btn
            size="small"
            variant="text"
            color="grey-darken-1"
            icon="mdi-pencil"
            density="comfortable"
            @click="$emit('editar', programacion)"
          />
        </div>

        <!-- Botones de ejecución -->
        <div class="flex items-center gap-2 ml-auto">
          <v-chip v-if="debeEjecutarHoy" color="red" variant="elevated" size="small">
            <v-icon small>mdi-alert</v-icon>
            Ejecutar hoy
          </v-chip>

          <v-btn
            v-if="ejecucionesPendientes > 1"
            size="small"
            variant="flat"
            color="orange"
            density="comfortable"
            @click="ejecutarEnBloque"
            class="transition-all duration-300 ease-in-out rounded-pill overflow-hidden"
            :style="{ width: isHoveredMultiple ? '120px' : '36px' }"
            @mouseenter="isHoveredMultiple = true"
            @mouseleave="isHoveredMultiple = false"
          >
            <v-icon size="small" :class="{ 'mr-2': isHoveredMultiple }">mdi-play-multiple</v-icon>
            <span v-show="isHoveredMultiple" class="transition-opacity duration-3000">
              {{ ejecucionesPendientes }}
            </span>
          </v-btn>

          <v-btn
            size="small"
            variant="flat"
            color="green"
            density="comfortable"
            @click="$emit('ejecutar', programacion.id)"
            class="transition-all duration-300 ease-in-out rounded-pill overflow-hidden"
            :style="{ width: isHoveredSingle ? '100px' : '36px' }"
            @mouseenter="isHoveredSingle = true"
            @mouseleave="isHoveredSingle = false"
          >
            <v-icon size="small" :class="{ 'mr-2': isHoveredSingle }">mdi-play</v-icon>
            <span v-show="isHoveredSingle" class="transition-opacity duration-3000">
              Ejecutar
            </span>
          </v-btn>
        </div>
      </div>

      <!-- Fila de información adicional -->
      <div class="flex gap-4 mt-2 text-xs text-gray-600">
        <div class="flex items-center gap-1">
          <v-icon size="small" color="gray">mdi-folder-outline</v-icon>
          <span class="capitalize">{{ actividadTipo }}</span>
        </div>
        <div class="flex items-center gap-1">
          <v-icon size="small" color="gray">mdi-calendar-clock</v-icon>
          <span>Última: {{ formatFecha(programacion.ultima_ejecucion) }}</span>
        </div>
        <div class="flex items-center gap-1">
          <v-icon size="small" color="gray">mdi-calendar-arrow-right</v-icon>
          <span>Próxima: {{ formatFecha(programacion.proxima_ejecucion) }}</span>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { defineProps, computed, ref } from 'vue'
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
  if (!fecha) return 'N/A'
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

const isHoveredMultiple = ref(false)
const isHoveredSingle = ref(false)

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
