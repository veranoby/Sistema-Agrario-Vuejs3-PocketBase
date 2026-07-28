<template>
  <v-container fluid class="module-marketplace">
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h3 class="text-h4 mb-2">Mercado de Módulos</h3>
        <p class="  text-grey">
          Personaliza tu suscripción activando módulos según tus necesidades
        </p>
      </div>
      <v-btn color="primary" size="large" @click="showCostSummary = !showCostSummary">
        <v-icon start>mdi-calculator</v-icon>
        Ver Resumen
      </v-btn>
    </div>

    <!-- Filtros -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Buscar módulos"
              prepend-icon="mdi-magnify"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filterCategory"
              label="Filtrar por categoría"
              :items="categories"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-chip color="primary" label>
              {{ filteredModules.length }} módulos
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Grid de Módulos -->
    <v-row>
      <v-col
        v-for="modulo in filteredModules"
        :key="modulo.id"
        cols="12"
        md="6"
        lg="4"
      >
        <ModuleCard
          :modulo="modulo"
          :is-active="planStore.isModuleActive(modulo.id)"
          :is-pending="isModulePending(modulo.id)"
          @toggle="toggleModule"
        />
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-empty-state
      v-if="!filteredModules.length"
      title="No se encontraron módulos"
      text="Intenta con otros filtros o términos de búsqueda"
      icon="mdi-puzzle-off"
    />

    <!-- Resumen de Costos -->
    <v-dialog v-model="showCostSummary" max-width="600">
      <CostSummary
        :modulos="selectedModules"
        :modulos-disponibles="modules"
        @close="showCostSummary = false"
        @save="saveChanges"
      />
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MODULE_CATEGORIES, MODULE_TITLES } from '@/constants/modules'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventBus'
import ModuleCard from './ModuleCard.vue'
import CostSummary from './CostSummary.vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { usePlanStore } from '@/stores/planStore'

const router = useRouter()
const haciendaStore = useHaciendaStore()
const planStore = usePlanStore()
const { emit } = useEvents()

// Estado
const search = ref('')
const filterCategory = ref(null)
const showCostSummary = ref(false)
const snackbar = ref(false)
const snackbarColor = ref('success')
const snackbarMessage = ref('')

// Categorías disponibles
const categories = computed(() => {
  return Object.values(MODULE_CATEGORIES).map(cat => ({
    title: MODULE_TITLES[cat] || cat,
    value: cat
  }))
})

// Módulos filtrados
const filteredModules = computed(() => {
  let result = planStore.availableModules.filter(m => m.is_active)

  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(m =>
      m.name?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
    )
  }

  if (filterCategory.value) {
    result = result.filter(m => m.category === filterCategory.value)
  }

  return result
})

// Módulos seleccionados (activos)
const selectedModules = computed(() => {
  return planStore.availableModules.filter(m => planStore.isModuleActive(m.id))
})

onMounted(async () => {
  const haciendaId = haciendaStore.mi_hacienda?.id
  await Promise.all([
    planStore.fetchModules(),
    planStore.fetchSubscriptions(haciendaId),
    planStore.fetchPendingRequests(haciendaId)
  ])
})

function isModulePending(moduleId) {
  if (!planStore.pendingRequests?.length) return false
  return planStore.pendingRequests.some(r => {
    if (!r.modulo_solicitado) return false
    try {
      const ids = r.modulo_solicitado.startsWith('[') ? JSON.parse(r.modulo_solicitado) : [r.modulo_solicitado]
      return ids.includes(moduleId)
    } catch (e) {
      return r.modulo_solicitado === moduleId
    }
  })
}

// Redirección segura a la vista de planes y comprobantes
async function toggleModule(moduleId, activate) {
  if (activate) {
    showSnackbar('Redirigiendo a la plataforma de pago y carga de comprobante...', 'info')
    setTimeout(() => {
      router.push({
        path: '/hacienda/plan-suscripcion',
        query: { openModules: 'true', selectedModule: moduleId }
      })
    }, 600)
  } else {
    showSnackbar('Las solicitudes de cancelación deben gestionarse desde la administración de planes.', 'warning')
  }
}

// GUARDAR cambios
async function saveChanges() {
  showSnackbar('Cambios guardados exitosamente', 'success')
  showCostSummary.value = false
}

function showSnackbar(message, color = 'success') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.module-marketplace {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
