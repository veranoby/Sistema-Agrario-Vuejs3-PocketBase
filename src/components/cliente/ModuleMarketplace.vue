<template>
  <v-container fluid class="module-marketplace">
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h2 class="text-h4 mb-2">Mercado de Módulos</h2>
        <p class="text-body-1 text-grey">
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
          :is-active="isModuleActive(modulo.id)"
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
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { MODULE_CATEGORIES, MODULE_ICONS, MODULE_TITLES, BILLING_CYCLES } from '@/constants/modules'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventBus'
import ModuleCard from './ModuleCard.vue'
import CostSummary from './CostSummary.vue'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useHaciendaStore } from '@/stores/haciendaStore'

const snackbarStore = useSnackbarStore()
const haciendaStore = useHaciendaStore()
const { emit } = useEvents()

// Estado
const modules = ref([])
const activeModules = ref([])
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
  let result = modules.value.filter(m => m.is_active)

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
  return modules.value.filter(m => isModuleActive(m.id))
})

onMounted(async () => {
  await Promise.all([fetchModules(), fetchActiveModules()])
})

// Obtener módulos disponibles
async function fetchModules() {
  try {
    modules.value = await pb.collection('modulos').getFullList({
      sort: 'category, name'
    })
  } catch (error) {
    handleError(error, 'Error al cargar módulos')
  }
}

// Obtener módulos activos de la hacienda
async function fetchActiveModules() {
  try {
    // En producción, filtrar por hacienda del usuario actual
    const subscriptions = await pb.collection('subscriptions').getFullList({
      filter: 'is_active = true',
      expand: 'modulo'
    })
    
    activeModules.value = subscriptions.map(s => s.expand.modulo.id)
  } catch (error) {
    // Si no existe la colección, usar array vacío
    activeModules.value = []
  }
}

// Verificar si un módulo está activo
function isModuleActive(moduleId) {
  return activeModules.value.includes(moduleId)
}

// Toggle de módulo
async function toggleModule(moduleId, activate) {
  try {
    const haciendaId = haciendaStore.mi_hacienda?.id

    if (!haciendaId) {
      showSnackbar('No hay hacienda seleccionada', 'error')
      return
    }

    if (activate) {
      // Activar módulo usando endpoint backend
      const response = await fetch(`/api/modulos/${moduleId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pb.authStore.token}`
        },
        body: JSON.stringify({ haciendaId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al activar módulo')
      }

      const result = await response.json()
      activeModules.value.push(moduleId)
      
      // Emitir evento
      emit(EVENTS.MODULO_ACTIVADO, { moduleId, haciendaId })
      
      showSnackbar('Módulo activado', 'success')
    } else {
      // Desactivar módulo usando endpoint backend
      const response = await fetch(`/api/modulos/${moduleId}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pb.authStore.token}`
        },
        body: JSON.stringify({ haciendaId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al desactivar módulo')
      }

      activeModules.value = activeModules.value.filter(id => id !== moduleId)
      
      // Emitir evento
      emit(EVENTS.MODULO_DESACTIVADO, { moduleId, haciendaId })
      
      showSnackbar('Módulo desactivado', 'success')
    }
  } catch (error) {
    handleError(error, activate ? 'Error al activar módulo' : 'Error al desactivar módulo')
  }
}

// Guardar cambios
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
