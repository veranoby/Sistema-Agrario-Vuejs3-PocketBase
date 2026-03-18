<template>
  <v-card
    :class="['module-card', { 'is-active': isActive }]"
    :color="isActive ? 'primary-lighten-5' : undefined"
    hover
    flat
  >
    <v-card-text>
      <!-- Header -->
      <div class="d-flex justify-space-between align-start mb-3">
        <div class="d-flex align-center">
          <v-avatar :color="modulo.color || 'primary'" size="48" class="mr-3">
            <v-icon color="white">{{ modulo.icon || getIcon() }}</v-icon>
          </v-avatar>
          <div>
            <h3 class="text-h6 mb-1">{{ modulo.name }}</h3>
            <v-chip size="x-small" color="primary" variant="outlined">
              {{ getCategoryTitle(modulo.category) }}
            </v-chip>
          </div>
        </div>
        <v-chip v-if="isActive" color="success" size="small">
          <v-icon start size="small">mdi-check-circle</v-icon>
          ACTIVO
        </v-chip>
      </div>

      <!-- Descripción -->
      <p class="text-body-2 text-grey mb-4">
        {{ modulo.description }}
      </p>

      <!-- Precio -->
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <span class="text-h5 font-weight-bold">${{ modulo.price_monthly }}</span>
          <span class="text-body-2 text-grey">/mes</span>
        </div>
        <div class="text-right">
          <p class="text-caption text-grey">Precio anual</p>
          <p class="text-subtitle-2 font-weight-bold">${{ modulo.price_yearly }}</p>
        </div>
      </div>

      <v-divider class="mb-4" />

      <!-- Toggle Switch -->
      <div class="d-flex justify-space-between align-center">
        <span class="text-body-2">
          {{ isActive ? 'Módulo activado' : 'Activar módulo' }}
        </span>
        <v-switch
          v-model="isActiveLocal"
          color="primary"
          hide-details
          @update:model-value="$emit('toggle', modulo.id, $event)"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { MODULE_ICONS, MODULE_TITLES } from '@/constants/modules'

const props = defineProps({
  modulo: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle'])

// Estado local del switch
const isActiveLocal = ref(props.isActive)

watch(() => props.isActive, (newVal) => {
  isActiveLocal.value = newVal
})

// Obtener ícono por categoría
function getIcon() {
  return MODULE_ICONS[props.modulo.category] || 'mdi-puzzle'
}

// Obtener título de categoría
function getCategoryTitle(category) {
  return MODULE_TITLES[category] || category
}
</script>

<style scoped>
.module-card {
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.module-card.is-active {
  border-color: rgb(var(--v-theme-primary));
}

.module-card:hover {
  transform: translateY(-4px);
}
</style>
