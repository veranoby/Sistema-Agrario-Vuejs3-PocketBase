<template>
  <!--  <v-card class="pt-2 bg-transparent" border="false">-->

  <v-card variant="flat" :color="bgColor" class="pt-1" border="false">
    <v-card-text class="p-2">
      <div class="flex min-w-0 pt-0 pb-2">
        <!-- Estado y alertas -->
        <div class="flex min-w-0">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-icon
                v-bind="props"
                :color="colorEstado"
                size="small"
                class="cursor-help"
                outline
                icon="mdi-circle"
              />
            </template>

            <span class="capitalize">{{ programacion.estado }}</span>
          </v-tooltip>

          <!-- Descripción con truncate -->

          <span class="ml-2 truncate text-shadow-lg text-shadow-black-300">{{
            programacion.descripcion
          }}</span>
        </div>

        <div class="flex items-center gap-2 ml-auto"></div>
      </div>

      <!-- Fila principal con descripción y botones -->
      <div class="flex min-w-0 pt-0 pb-2">
        <!-- Chip de pendientes -->
        <v-tooltip location="top">
          <template v-slot:activator="{ props }">
            <v-chip
              v-bind="props"
              v-if="esUrgente"
              color="red"
              size="x-small"
              variant="flat"
              class="mr-1 py-3"
            >
              <v-icon small>mdi-alert</v-icon>
              {{ ejecucionesPendientes }}
            </v-chip>
          </template>
          <span>{{ ejecucionesPendientes }} pendiente(s)</span>
        </v-tooltip>
        <!-- Tipo actividad -->
        <v-chip color="blue-grey-lighten-1" size="small" variant="flat" class="mr-2">
          <v-icon class="mr-2 text-white">mdi-folder-outline</v-icon>
          <span class="capitalize text-white">{{ actividadTipo }}</span>
        </v-chip>
        <v-btn
          size="small"
          variant="outlined"
          icon="mdi-pencil"
          density="comfortable"
          @click="$emit('editar', programacion)"
        />
        <!-- Botones de ejecución -->
        <v-chip v-if="debeEjecutarHoy" color="red" variant="elevated" size="small">
          <v-icon small>mdi-alert</v-icon>
          Ejecutar hoy
        </v-chip>
        <!--          
         v-if="ejecucionesPendientes > 1"
-->
        <v-btn
          v-if="props.programacion.estado === 'activo' && ejecucionesPendientes > 1"
          size="small"
          variant="flat"
          color="orange-lighten-1"
          density="comfortable"
          @click="showPendientesDialog = true"
          class="transition-all duration-300 ease-in-out rounded-pill overflow-hidden ml-1 pt-2 pb-5"
          :style="{ width: isHoveredMultiple ? '120px' : '36px' }"
          @mouseenter="isHoveredMultiple = true"
          @mouseleave="isHoveredMultiple = false"
        >
          <v-icon size="small" :class="{ 'mr-1 ': isHoveredMultiple }">mdi-play-outline</v-icon>
          <span
            v-show="isHoveredMultiple"
            class="text-shadow-lg/20 transition-opacity duration-3000 pb-0"
            >Ejecutar {{ ejecucionesPendientes }}
          </span>
        </v-btn>

        <v-btn
          v-if="canExecuteSingle"
          size="small"
          variant="flat"
          color="green"
          density="comfortable"
          @click="$emit('request-single-execution', programacion)"
          class="transition-all duration-300 ease-in-out rounded-pill overflow-hidden ml-1 pt-2 pb-5"
          :style="{ width: isHoveredSingle ? '100px' : '36px' }"
          @mouseenter="isHoveredSingle = true"
          @mouseleave="isHoveredSingle = false"
        >
          <v-icon size="small" :class="{ 'mr-1': isHoveredSingle }">mdi-play</v-icon>
          <span v-show="isHoveredSingle" class="transition-opacity duration-3000 pb-0">
            Ejecutar
          </span>
        </v-btn>
      </div>

      <ProgramacionesPendientesDialog 
        v-if="showPendientesDialog" 
        v-model="showPendientesDialog" 
        :programacion="programacion" 
      />

      <!-- Fila de información adicional -->
      <div class="flex gap-4 mt-2 text-xs">
        <v-chip color="blue-grey-lighten-1" size="small" variant="flat">
          <v-icon class="mr-2 text-white">mdi-calendar-clock</v-icon>
          <span class="capitalize text-shadow-lg/20" :style="{ color: textColor }"
            >Última: {{ formatFecha(programacion.ultima_ejecucion) }}</span
          >
        </v-chip>

        <v-chip color="blue-grey-darken-1" size="small" variant="flat">
          <v-icon class="mr-2 text-white">mdi-calendar-clock</v-icon>
          <span class="capitalize text-shadow-lg/20" :style="{ color: textColor }"
            >Próxima: {{ formatFecha(programacion.proxima_ejecucion) }}</span
          >
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { defineProps, computed, ref } from 'vue'
import { useActividadesStore } from '@/stores/actividadesStore'
import { differenceInDays, differenceInMonths, isBefore, isValid } from 'date-fns'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import ProgramacionesPendientesDialog from '@/components/dialogs/ProgramacionesPendientesDialog.vue';

const props = defineProps({
  programacion: {
    type: Object,
    required: true
  },
  bgColor: {
    type: String,
    default: '#001f2f94'
  },
  textColor: {
    type: String,
    default: 'white'
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

  try {
    // Verificar que la fecha sea válida
    const fechaObj = new Date(fecha)
    if (isNaN(fechaObj.getTime())) {
      console.warn(`Fecha inválida: ${fecha}`)
      return 'Pendiente'
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(fechaObj)
  } catch (error) {
    console.error(`Error formateando fecha: ${fecha}`, error)
    return 'Pendiente'
  }
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

const canExecuteSingle = computed(() => {
  if (props.programacion.estado !== 'activo') {
    return false
  }
  const proximaEjecucionDate = new Date(props.programacion.proxima_ejecucion)
  // Gracefully handle invalid dates: if proxima_ejecucion is invalid, proximaIsValid will be false.
  const proximaIsValid = isValid(proximaEjecucionDate)

  // Condition: isPastDue OR debeEjecutarHoy OR hasPending
  const isPastDue = proximaIsValid && isBefore(proximaEjecucionDate, new Date())
  const hasPending = ejecucionesPendientes.value > 0

  return isPastDue || debeEjecutarHoy.value || hasPending
})

const isHoveredMultiple = ref(false)
const isHoveredSingle = ref(false)
const showPendientesDialog = ref(false)

// const ejecutarEnBloque = async () => { // Method is no longer needed as per new requirements
//   // try {
//   //   for (let i = 0; i < ejecucionesPendientes.value; i++) {
//   //     await programacionesStore.ejecutarProgramacion(props.programacion.id)
//   //   }
//   // } catch (error) {
//   //   console.error('Error ejecutando en bloque:', error)
//   // }
// }
</script>
