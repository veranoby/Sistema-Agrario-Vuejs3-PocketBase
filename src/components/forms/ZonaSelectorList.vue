<template>
  <div class="zona-selector">
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-grey-darken-3 flex items-center">
        <v-icon start color="primary" class="mr-2">mdi-map-marker-outline</v-icon>
        Zonas Involucradas
      </h4>
      <div v-if="hasAnyZonas" class="flex gap-2">
        <v-btn
          size="x-small"
          variant="tonal"
          color="primary"
          @click="selectAll"
          :disabled="allSelected"
        >
          Todas
        </v-btn>
        <v-btn
          size="x-small"
          variant="tonal"
          color="error"
          @click="clearAll"
          :disabled="modelValue.length === 0"
        >
          Ninguna
        </v-btn>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <v-progress-circular indeterminate color="primary" size="24" />
    </div>

    <div v-else-if="hasAnyZonas" class="flex flex-col gap-6">
      
      <!-- Bloque: Zonas de la Actividad (Específicas) -->
      <div v-if="zonasToDisplay.asociadas.length > 0">
        <h5 class="text-caption font-weight-bold text-primary mb-3 uppercase tracking-wider">
          Zonas Fijas de Actividad
        </h5>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <v-card
            v-for="zona in zonasToDisplay.asociadas"
            :key="zona.id"
            variant="flat"
            class="transition-all rounded-lg bg-grey-lighten-4 border border-transparent"
            :class="{ 'bg-green-lighten-4 shadow-md border-solid border-success': modelValue.includes(zona.id) }"
            @click="toggleSelection(zona.id)"
          >
            <v-card-text class="pa-3 flex items-center">
              <v-checkbox-btn
                :model-value="modelValue.includes(zona.id)"
                color="primary"
                density="compact"
                class="mr-2"
              />
              <div class="flex flex-col">
                <span class="text-md" :class="modelValue.includes(zona.id) ? 'text-primary font-weight-bold' : 'text-grey-darken-3'">
                  {{ zona.nombre }}
                </span>
                <span class="text-xs text-grey-darken-1">
                  {{ getTipoZona(zona.id) }}
                </span>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <v-divider v-if="zonasToDisplay.asociadas.length > 0 && (zonasToDisplay.deSiembras.length > 0 || zonasToDisplay.independientes.length > 0)" class="border-opacity-50"></v-divider>

      <!-- Bloque: Zonas Dinámicas de Siembras -->
      <div v-if="zonasToDisplay.deSiembras.length > 0">
        <h5 class="text-caption font-weight-bold text-green-darken-2 mb-3 uppercase tracking-wider flex items-center">
          <v-icon size="14" class="mr-1">mdi-sprout</v-icon> Zonas de Siembras
        </h5>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <v-card
            v-for="zona in zonasToDisplay.deSiembras"
            :key="zona.id"
            variant="flat"
            class="transition-all rounded-lg bg-grey-lighten-4 border border-transparent"
            :class="{ 'bg-blue-lighten-4 shadow-md border-solid border-info': modelValue.includes(zona.id) }"
            @click="toggleSelection(zona.id)"
          >
            <v-card-text class="p-3 flex items-center">
              <v-checkbox-btn
                :model-value="modelValue.includes(zona.id)"
                color="green-darken-2"
                density="compact"
                class="mr-2"
              />
              <div class="flex flex-col">
                <span class="text-md" :class="modelValue.includes(zona.id) ? 'text-green-darken-3 font-weight-bold' : 'text-grey-darken-3'">
                  {{ zona.nombre }}
                </span>
                <span class="text-xs text-green-darken-2">
                  {{ getTipoZona(zona.id) }}
                </span>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <v-divider v-if="zonasToDisplay.deSiembras.length > 0 && zonasToDisplay.independientes.length > 0" class="border-opacity-50"></v-divider>

      <!-- Bloque: Zonas Generales -->
      <div v-if="zonasToDisplay.independientes.length > 0">
        <h5 class="text-caption font-weight-bold text-grey-darken-1 mb-3 uppercase tracking-wider">
          Zonas Generales (Sin Siembra)
        </h5>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <v-card
            v-for="zona in zonasToDisplay.independientes"
            :key="zona.id"
            variant="flat"
            class="transition-all rounded-lg bg-grey-lighten-4 border border-transparent"
            :class="{ 'bg-orange-lighten-4 shadow-md border-solid border-warning': modelValue.includes(zona.id) }"
            @click="toggleSelection(zona.id)"
          >
            <v-card-text class="pa-3 flex items-center">
              <v-checkbox-btn
                :model-value="modelValue.includes(zona.id)"
                color="primary"
                density="compact"
                class="mr-2"
              />
              <div class="flex flex-col">
                <span class="text-md" :class="modelValue.includes(zona.id) ? 'text-primary font-weight-bold' : 'text-grey-darken-3'">
                  {{ zona.nombre }}
                </span>
                <span class="text-xs text-grey-darken-1">
                  {{ getTipoZona(zona.id) }}
                </span>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

    </div>

    <div v-else class="text-xs text-grey-darken-1 pa-4 bg-grey-lighten-5 rounded-lg text-center">
      <v-icon start size="16">mdi-information-outline</v-icon>
      No hay zonas disponibles para esta selección.
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useZonasStore } from '@/stores/zonasStore';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  availableIds: {
    type: Array,
    default: null // IDs of explicitly associated zones
  },
  selectedSiembras: {
    type: Array,
    default: () => [] // IDs of currently selected siembras to auto-suggest their zones
  },
  readonly: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);
const zonasStore = useZonasStore();
const loading = ref(false);

const zonasToDisplay = computed(() => {
  const allZonas = zonasStore.zonas;
  const independientes = [];
  const asociadas = [];
  const deSiembras = [];

  for (const zona of allZonas) {
    if (props.availableIds && props.availableIds.includes(zona.id)) {
      // Prioridad 1: Si es fijamente atada a la actividad o contexto
      asociadas.push(zona);
    } else if (zona.siembra && props.selectedSiembras.includes(zona.siembra)) {
      // Prioridad 2: Es una zona atada a una de las siembras que el usuario marcó
      deSiembras.push(zona);
    } else if (!zona.siembra) {
      // Prioridad 3: Es una zona genérica
      independientes.push(zona);
    } else if (!props.availableIds && !zona.siembra) {
       // fallback general
       independientes.push(zona);
    }
  }

  return { asociadas, deSiembras, independientes };
});

const hasAnyZonas = computed(() => {
  return zonasToDisplay.value.asociadas.length > 0 || 
         zonasToDisplay.value.deSiembras.length > 0 || 
         zonasToDisplay.value.independientes.length > 0;
});

const allSelected = computed(() => {
  const total = zonasToDisplay.value.asociadas.length + 
                zonasToDisplay.value.deSiembras.length + 
                zonasToDisplay.value.independientes.length;
  return total > 0 && props.modelValue.length === total;
});

onMounted(async () => {
  if (zonasStore.zonas.length === 0) {
    loading.value = true;
    try {
      await zonasStore.init();
    } finally {
      loading.value = false;
    }
  }

  // Auto-select ALL available ones if no previous selection exists
  if (props.modelValue.length === 0 && props.availableIds && props.availableIds.length > 0) {
    emit('update:modelValue', [...props.availableIds]);
  }
});

// Watch for availableIds in case they are loaded asynchronously
watch(() => props.availableIds, (newIds) => {
  if (props.modelValue.length === 0 && newIds && newIds.length > 0) {
    emit('update:modelValue', [...newIds]);
  }
}, { immediate: true });

// Optionally, we could auto-select deSiembras when selectedSiembras changes, but it's better to let user pick.

const toggleSelection = (id) => {
  if (props.readonly) return;
  const newSelection = [...props.modelValue];
  const index = newSelection.indexOf(id);
  if (index > -1) {
    newSelection.splice(index, 1);
  } else {
    newSelection.push(id);
  }
  emit('update:modelValue', newSelection);
};

const selectAll = () => {
  const allIds = [
    ...zonasToDisplay.value.asociadas.map(z => z.id),
    ...zonasToDisplay.value.deSiembras.map(z => z.id),
    ...zonasToDisplay.value.independientes.map(z => z.id)
  ];
  emit('update:modelValue', allIds);
};

const clearAll = () => {
  emit('update:modelValue', []);
};

const getTipoZona = (id) => {
  return zonasStore.getTipoZonaNombreByZonaId(id) || 'Zona';
};
</script>

<style scoped>
.zona-selector {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
