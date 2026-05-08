<template>
  <v-container fluid class="pa-4">
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4">Monitorización Financiera Global</h1>
      <v-chip color="primary" size="large">
        <v-icon start>mdi-cash-multiple</v-icon>
        Super Admin
      </v-chip>
    </div>

    <v-card variant="elevated" elevation="2" class="mb-6">
      <v-card-title>Seleccionar Hacienda a Auditar</v-card-title>
      <v-card-text>
        <v-autocomplete
          v-model="selectedHaciendaId"
          :items="haciendas"
          item-title="name"
          item-value="id"
          label="Buscar Hacienda"
          variant="outlined"
          prepend-inner-icon="mdi-domain"
          :loading="loadingHaciendas"
          clearable
          @update:modelValue="onHaciendaSelect"
        >
          <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props">
              <template v-slot:prepend>
                <v-icon>mdi-home-city</v-icon>
              </template>
              <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.raw.id }}</v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-autocomplete>
      </v-card-text>
    </v-card>

    <!-- Inyectamos el componente nativo de finanzas -->
    <v-card v-if="selectedHaciendaId" variant="elevated" elevation="2">
      <v-card-title class="bg-primary text-white py-3">
        Entorno Financiero: {{ selectedHaciendaName }}
      </v-card-title>
      <v-divider></v-divider>
      <div class="pa-4">
        <FinanzasConfig :key="selectedHaciendaId" />
      </div>
    </v-card>

    <v-empty-state
      v-else
      title="Ninguna hacienda seleccionada"
      text="Por favor, seleccione una hacienda del buscador de arriba para visualizar y administrar sus finanzas."
      icon="mdi-cash-search"
      class="mt-6"
    />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'
import { useHaciendaStore } from '@/stores/haciendaStore'
import FinanzasConfig from '@/components/FinanzasConfig.vue'

const haciendaStore = useHaciendaStore()

const haciendas = ref([])
const selectedHaciendaId = ref(null)
const loadingHaciendas = ref(false)

// Backup del ID original en caso de que Superadmin lo necesitara
const originalHaciendaId = ref(null)

onMounted(async () => {
  originalHaciendaId.value = haciendaStore.mi_hacienda
  await fetchHaciendas()
})

onUnmounted(() => {
  // Restauramos el ID de la hacienda original al salir
  if (originalHaciendaId.value) {
    haciendaStore.mi_hacienda = originalHaciendaId.value
  } else {
    haciendaStore.mi_hacienda = null
  }
})

const selectedHaciendaName = computed(() => {
  if (!selectedHaciendaId.value) return ''
  const h = haciendas.value.find(h => h.id === selectedHaciendaId.value)
  return h ? h.name : ''
})

async function fetchHaciendas() {
  loadingHaciendas.value = true
  try {
    const records = await pb.collection('Haciendas').getFullList({
      sort: 'name',
    })
    haciendas.value = records
  } catch (error) {
    logger.error('Error fetching haciendas for finanzas', error)
  } finally {
    loadingHaciendas.value = false
  }
}

function onHaciendaSelect(newId) {
  if (newId) {
    logger.info(`[SUPERADMIN_FINANZAS] Cambiando contexto a hacienda: ${newId}`)
    haciendaStore.mi_hacienda = newId
  } else {
    haciendaStore.mi_hacienda = originalHaciendaId.value
  }
}
</script>
