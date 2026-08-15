<template>
  <v-chip
    :color="agencia.color || 'primary'"
    :variant="variant"
    :size="size"
    class="font-weight-medium"
    :prepend-icon="agencia.logoIcon || 'mdi-shield-check'"
  >
    <span v-if="showFull">
      {{ agencia.sigla }} — {{ registroNumero ? `Reg: ${registroNumero}` : agencia.normativaBase }}
    </span>
    <span v-else>
      {{ agencia.sigla }}{{ registroNumero ? `: ${registroNumero}` : '' }}
    </span>
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'
import { getAgenciaFitosanitaria } from '@/constants/agenciasReguladoras'

const props = defineProps({
  country: {
    type: String,
    default: 'EC'
  },
  registroNumero: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'tonal'
  },
  size: {
    type: String,
    default: 'small'
  },
  showFull: {
    type: Boolean,
    default: false
  }
})

const agencia = computed(() => {
  return getAgenciaFitosanitaria(props.country)
})
</script>
