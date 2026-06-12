<template>
  <v-card>
    <v-card-title class="text-md">
      Resumen de Suscripción
      <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('close')" />
    </v-card-title>

    <v-card-text>
      <!-- Módulos Seleccionados -->
      <v-list v-if="modulosActivos.length" density="compact" class="mb-4">
        <v-list-subheader>Módulos Activos ({{ modulosActivos.length }})</v-list-subheader>
        
        <v-list-item
          v-for="modulo in modulosActivos"
          :key="modulo.id"
        >
          <template v-slot:prepend>
            <v-icon :color="modulo.color || 'primary'">{{ modulo.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ modulo.name }}</v-list-item-title>
          <v-list-item-subtitle>
            ${{ modulo.price_monthly }}/mes
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <v-alert v-else type="info" density="compact" class="mb-4">
        No hay módulos activos seleccionados
      </v-alert>

      <!-- Resumen de Costos -->
      <v-card variant="outlined" class="mb-4">
        <v-card-text>
          <div class="d-flex justify-space-between mb-2">
            <span class="text-md">Plan Base</span>
            <span class="font-weight-medium">$10.00/mes</span>
          </div>
          <div class="d-flex justify-space-between mb-2">
            <span class="text-md">Módulos ({{ modulosActivos.length }})</span>
            <span class="font-weight-medium">${{ modulesSubtotal.toFixed(2) }}/mes</span>
          </div>
          
          <v-divider class="my-2" />
          
          <div class="d-flex justify-space-between mb-2">
            <span class="text-h6">Total Mensual</span>
            <span class="text-md font-weight-bold text-primary">${{ totalMonthly.toFixed(2) }}</span>
          </div>

          <!-- Comparativa Anual -->
          <v-alert type="success" density="compact" class="mt-3" variant="tonal">
            <div class="d-flex justify-space-between align-center">
              <div>
                <p class="text-md font-weight-bold mb-1">Plan Anual</p>
                <p class="text-xs">${{ totalYearly.toFixed(2) }}/año (${{ (totalYearly / 12).toFixed(2) }}/mes)</p>
              </div>
              <div class="text-right">
                <p class="text-md font-weight-bold text-primary">Ahorras ${{ annualSavings.toFixed(2) }}</p>
                <p class="text-xs">({{ savingsPercent }}%)</p>
              </div>
            </div>
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- Desglose por Categoría -->
      <v-expansion-panels v-if="byCategory.length" variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>Desglose por Categoría</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                v-for="cat in byCategory"
                :key="cat.category"
              >
                <v-list-item-title>{{ cat.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ cat.count }} módulo(s) - ${{ cat.total.toFixed(2) }}/mes
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" @click="$emit('close')">CANCELAR</v-btn>
      <v-spacer />
      <v-btn color="primary" @click="$emit('save')">
        GUARDAR Cambios
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { MODULE_TITLES } from '@/constants/modules'
import { ModuleCalculator } from '@/utils/moduleCalculator'

const props = defineProps({
  modulos: {
    type: Array,
    required: true
  },
  modulosDisponibles: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

// Módulos activos (seleccionados)
const modulosActivos = computed(() => {
  return props.modulos.filter(m => m.is_active || props.modulos.find(sel => sel.id === m.id))
})

// Subtotal de módulos
const modulesSubtotal = computed(() => {
  return modulosActivos.value.reduce((sum, m) => sum + (m.price_monthly || 0), 0)
})

// Total mensual (base + módulos)
const totalMonthly = computed(() => {
  return 10 + modulesSubtotal.value
})

// Total anual con descuento
const totalYearly = computed(() => {
  const modulesYearly = ModuleCalculator.calculateModulePrice(modulosActivos.value, 'yearly')
  return (10 * 12) + modulesYearly
})

// Ahorro anual
const annualSavings = computed(() => {
  return (totalMonthly.value * 12) - totalYearly.value
})

// Porcentaje de ahorro
const savingsPercent = computed(() => {
  if (totalMonthly.value === 0) return 0
  return ((annualSavings.value / (totalMonthly.value * 12)) * 100).toFixed(0)
})

// Desglose por categoría
const byCategory = computed(() => {
  const categories = {}
  
  modulosActivos.value.forEach(m => {
    if (!categories[m.category]) {
      categories[m.category] = {
        category: m.category,
        title: MODULE_TITLES[m.category] || m.category,
        count: 0,
        total: 0
      }
    }
    categories[m.category].count++
    categories[m.category].total += m.price_monthly || 0
  })
  
  return Object.values(categories)
})
</script>
