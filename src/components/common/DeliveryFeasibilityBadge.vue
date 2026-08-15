<template>
  <v-chip
    :color="statusColor"
    :variant="variant"
    :size="size"
    :prepend-icon="statusIcon"
    class="font-weight-medium"
  >
    {{ statusLabel }}
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    default: () => ({})
  },
  haciendaCountry: {
    type: String,
    default: ''
  },
  haciendaSubdivision: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'x-small'
  },
  variant: {
    type: String,
    default: 'tonal'
  }
})

const feasibility = computed(() => {
  const p = props.product || {}
  const alcance = p.alcance_envio || 'nacional'
  const estadosPermitidos = Array.isArray(p.estados_envio_permitidos) ? p.estados_envio_permitidos : []
  const paisOrigen = p.pais_origen || 'EC'

  // Si no hay datos de hacienda para contrastar
  if (!props.haciendaSubdivision) {
    if (alcance === 'nacional') return { color: 'info', icon: 'mdi-truck-fast', label: 'Envío Nacional' }
    if (alcance === 'local') return { color: 'grey', icon: 'mdi-map-marker-radius', label: 'Envío Local' }
    return { color: 'grey', icon: 'mdi-truck-delivery', label: `Cobertura (${estadosPermitidos.length} zonas)` }
  }

  // Validación de País
  if (props.haciendaCountry && paisOrigen && props.haciendaCountry.toUpperCase() !== paisOrigen.toUpperCase()) {
    if (alcance === 'internacional') {
      return { color: 'info', icon: 'mdi-airplane', label: 'Envío Internacional' }
    }
    return { color: 'error', icon: 'mdi-close-circle', label: 'Sin envío a tu país' }
  }

  // Validación de Alcance dentro del mismo país
  if (alcance === 'nacional' || alcance === 'internacional') {
    return { color: 'success', icon: 'mdi-check-circle', label: 'Envío disponible a tu zona' }
  }

  // Alcance regional / local
  const match = estadosPermitidos.some(e => String(e).toLowerCase().trim() === String(props.haciendaSubdivision).toLowerCase().trim())
  if (match) {
    return { color: 'success', icon: 'mdi-check-circle', label: `Envío directo a ${props.haciendaSubdivision}` }
  }

  return { color: 'warning', icon: 'mdi-alert-circle', label: `Sin cobertura en ${props.haciendaSubdivision}` }
})

const statusColor = computed(() => feasibility.value.color)
const statusIcon = computed(() => feasibility.value.icon)
const statusLabel = computed(() => feasibility.value.label)
</script>
