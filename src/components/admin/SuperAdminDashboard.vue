<template>
  <v-container fluid class="pa-4">
    <div class="grid gap-4">
      <!-- Header -->
      <header class="col-span-12 bg-background shadow-sm p-4 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-primary">
              <v-icon class="mr-2">mdi-shield-account</v-icon>
              Super Admin Dashboard
            </h1>
            <p class="text-sm text-muted mt-1">
              Gestión global de haciendas y suscripciones
            </p>
          </div>
          <v-chip color="primary" variant="flat" size="large">
            <v-icon start>mdi-shield-check</v-icon>
            {{ userRole }}
          </v-chip>
        </div>
      </header>

      <!-- Stats Cards -->
      <v-row class="col-span-12">
        <v-col cols="12" md="3">
          <v-card variant="outlined" class="bg-surface">
            <v-card-title class="text-sm font-medium">Total Haciendas</v-card-title>
            <v-card-text>
              <div class="text-3xl font-bold">{{ stats.totalHaciendas }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="outlined" class="bg-surface">
            <v-card-title class="text-sm font-medium">Usuarios Activos</v-card-title>
            <v-card-text>
              <div class="text-3xl font-bold">{{ stats.totalUsuarios }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="outlined" class="bg-surface">
            <v-card-title class="text-sm font-medium">Planes Activos</v-card-title>
            <v-card-text>
              <div class="text-3xl font-bold">{{ stats.planesActivos }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="outlined" class="bg-surface">
            <v-card-title class="text-sm font-medium">Módulos Activos</v-card-title>
            <v-card-text>
              <div class="text-3xl font-bold">{{ stats.modulosActivos }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Haciendas Management -->
      <v-col cols="12" lg="8">
        <v-card variant="outlined" class="bg-surface">
          <v-card-title class="font-bold text-lg p-4 border-b">
            <v-icon class="mr-2">mdi-office-building</v-icon>
            Gestión de Haciendas
          </v-card-title>
          <v-card-text class="p-0">
            <v-data-table
              :headers="haciendasHeaders"
              :items="haciendas"
              :loading="loading"
              class="elevation-0"
              density="compact"
            >
              <template #item.name="{ item }">
                <div class="font-medium">{{ item.name }}</div>
              </template>
              
              <template #item.plan="{ item }">
                <v-chip 
                  v-if="item.plan"
                  size="small" 
                  color="primary" 
                  variant="tonal"
                  class="mr-2"
                >
                  {{ getPlanName(item.plan) }}
                </v-chip>
                <span v-else class="text-muted text-sm">Sin plan</span>
              </template>

              <template #item.active_modules="{ item }">
                <v-chip-group v-if="item.active_modules && item.active_modules.length > 0">
                  <v-chip
                    v-for="mod in item.active_modules"
                    :key="mod"
                    size="x-small"
                    color="success"
                    variant="flat"
                  >
                    {{ mod }}
                  </v-chip>
                </v-chip-group>
                <span v-else class="text-muted text-sm">Todos activos</span>
              </template>

              <template #item.user_limit="{ item }">
                <div class="text-sm">
                  <v-icon size="small" class="mr-1">mdi-account</v-icon>
                  {{ item.user_limit || '∞' }}
                </div>
              </template>

              <template #item.actions="{ item }">
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-pencil"
                  @click="openEditHacienda(item)"
                  class="mr-1"
                />
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-trash-can"
                  color="error"
                  @click="confirmDeleteHacienda(item)"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Quick Actions -->
      <v-col cols="12" lg="4">
        <v-card variant="outlined" class="bg-surface">
          <v-card-title class="font-bold text-lg p-4 border-b">
            <v-icon class="mr-2">mdi-lightning-bolt</v-icon>
            Acciones Rápidas
          </v-card-title>
          <v-card-text class="p-4">
            <v-btn
              block
              color="primary"
              variant="flat"
              rounded="lg"
              class="mb-3"
              prepend-icon="mdi-plus"
              @click="openCreateHacienda"
            >
              Nueva Hacienda
            </v-btn>
            
            <v-btn
              block
              color="secondary"
              variant="outlined"
              rounded="lg"
              class="mb-3"
              prepend-icon="mdi-refresh"
              @click="refreshData"
              :loading="loading"
            >
              Refrescar Datos
            </v-btn>

            <v-divider class="my-3" />

            <div class="text-sm font-medium mb-2">Estadísticas por Plan</div>
            <v-list density="compact" bg-color="transparent">
              <v-list-item
                v-for="planStats in stats.porPlan"
                :key="planStats.plan"
                :title="planStats.plan"
                :subtitle="`${planStats.count} haciendas`"
              >
                <template #prepend>
                  <v-icon color="primary">mdi-chart-pie</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </div>

    <!-- Edit/Create Hacienda Dialog -->
    <v-dialog v-model="dialogHacienda" max-width="600px" persistent>
      <v-card>
        <v-card-title class="font-bold text-lg">
          {{ editingHacienda ? 'Editar Hacienda' : 'Nueva Hacienda' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formHacienda" v-model="formValid" @submit.prevent="saveHacienda">
            <v-text-field
              v-model="haciendaForm.name"
              label="Nombre de Hacienda"
              :rules="[v => !!v || 'Nombre requerido']"
              required
              class="mb-3"
            />

            <v-select
              v-model="haciendaForm.plan"
              :items="plans"
              item-title="nombre"
              item-value="id"
              label="Plan"
              required
              class="mb-3"
            />

            <v-text-field
              v-model.number="haciendaForm.user_limit"
              label="Límite de Usuarios"
              type="number"
              min="1"
              hint="Dejar vacío para ilimitado"
              class="mb-3"
            />

            <div class="mb-3">
              <div class="text-sm font-medium mb-2">Módulos Activos</div>
              <v-checkbox
                v-for="module in availableModules"
                :key="module"
                v-model="haciendaForm.active_modules"
                :label="module"
                :value="module"
                density="compact"
                class="mb-1"
              />
              <v-checkbox
                v-model="allModulesActive"
                label="Todos los módulos activos"
                density="compact"
                @change="toggleAllModules"
              />
            </div>

            <v-text-field
              v-model="haciendaForm.location"
              label="Ubicación"
              class="mb-3"
            />

            <v-textarea
              v-model="haciendaForm.info"
              label="Información Adicional"
              rows="3"
              class="mb-3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="dialogHacienda = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!formValid"
            @click="saveHacienda"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="dialogDelete" max-width="400px">
      <v-card>
        <v-card-title class="font-bold text-lg text-error">
          Confirmar Eliminación
        </v-card-title>
        <v-card-text class="pt-4">
          ¿Está seguro de eliminar la hacienda <strong>{{ haciendaToDelete?.name }}</strong>?
          <p class="text-sm text-muted mt-2">
            Esta acción eliminará todos los datos asociados y no se puede deshacer.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogDelete = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" @click="deleteHacienda">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { computed, defineComponent, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { usePlanStore } from '@/stores/planStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

export default defineComponent({
  name: 'SuperAdminDashboard',
  
  setup() {
    const authStore = useAuthStore()
    const haciendaStore = useHaciendaStore()
    const planStore = usePlanStore()
    const snackbarStore = useSnackbarStore()
    
    // State
    const loading = ref(false)
    const formValid = ref(false)
    const dialogHacienda = ref(false)
    const dialogDelete = ref(false)
    const editingHacienda = ref(null)
    const haciendaToDelete = ref(null)
    const allModulesActive = ref(true)
    
    const haciendas = ref([])
    const plans = ref([])
    const stats = ref({
      totalHaciendas: 0,
      totalUsuarios: 0,
      planesActivos: 0,
      modulosActivos: 0,
      porPlan: []
    })
    
    const availableModules = [
      'finanzas',
      'reportes_avanzados',
      'exportacion_pdf',
      'notificaciones_email',
      'api_access',
      'integraciones'
    ]
    
    const haciendaForm = ref({
      name: '',
      plan: null,
      user_limit: null,
      active_modules: [],
      location: '',
      info: ''
    })
    
    const userRole = computed(() => authStore.user?.role || '')
    
    const haciendasHeaders = [
      { title: 'Hacienda', key: 'name', sortable: true },
      { title: 'Plan', key: 'plan', sortable: true },
      { title: 'Módulos', key: 'active_modules', sortable: false },
      { title: 'Usuarios', key: 'user_limit', sortable: true },
      { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
    ]
    
    // Methods
    const loadHaciendas = async () => {
      loading.value = true
      try {
        const records = await pb.collection('Haciendas').getFullList({
          sort: '-created',
          expand: 'plan'
        })
        haciendas.value = records
        calculateStats()
      } catch (error) {
        handleError(error, 'Error cargando haciendas')
      } finally {
        loading.value = false
      }
    }
    
    const loadPlans = async () => {
      try {
        const records = await pb.collection('planes').getFullList({ sort: 'precio' })
        plans.value = records
      } catch (error) {
        handleError(error, 'Error cargando planes')
      }
    }
    
    const calculateStats = () => {
      stats.value.totalHaciendas = haciendas.value.length
      
      // Count by plan
      const planCounts = {}
      let totalModules = 0
      
      haciendas.value.forEach(h => {
        const planName = getPlanName(h.plan)
        planCounts[planName] = (planCounts[planName] || 0) + 1
        
        if (h.active_modules && Array.isArray(h.active_modules)) {
          totalModules += h.active_modules.length
        }
      })
      
      stats.value.porPlan = Object.entries(planCounts).map(([plan, count]) => ({
        plan,
        count
      }))
      
      stats.value.planesActivos = Object.keys(planCounts).length
      stats.value.modulosActivos = totalModules
    }
    
    const getPlanName = (planId) => {
      if (!planId) return 'Sin plan'
      if (typeof planId === 'object' && planId.nombre) {
        return planId.nombre
      }
      const plan = plans.value.find(p => p.id === planId)
      return plan?.nombre || planId
    }
    
    const openCreateHacienda = () => {
      editingHacienda.value = null
      haciendaForm.value = {
        name: '',
        plan: plans.value[0]?.id || null,
        user_limit: null,
        active_modules: [],
        location: '',
        info: ''
      }
      allModulesActive.value = true
      dialogHacienda.value = true
    }
    
    const openEditHacienda = (hacienda) => {
      editingHacienda.value = hacienda
      haciendaForm.value = {
        name: hacienda.name,
        plan: typeof hacienda.plan === 'object' ? hacienda.plan.id : hacienda.plan,
        user_limit: hacienda.user_limit || null,
        active_modules: hacienda.active_modules || [],
        location: hacienda.location || '',
        info: hacienda.info || ''
      }
      allModulesActive.value = !hacienda.active_modules || hacienda.active_modules.length === 0
      dialogHacienda.value = true
    }
    
    const toggleAllModules = () => {
      if (allModulesActive.value) {
        haciendaForm.value.active_modules = []
      } else {
        haciendaForm.value.active_modules = [...availableModules]
      }
    }
    
    const saveHacienda = async () => {
      if (!formValid.value) return
      
      loading.value = true
      try {
        const dataToSave = {
          ...haciendaForm.value,
          active_modules: allModulesActive.value ? [] : haciendaForm.value.active_modules
        }
        
        if (editingHacienda.value) {
          // Update existing
          await pb.collection('Haciendas').update(editingHacienda.value.id, dataToSave)
          snackbarStore.showSnackbar('Hacienda actualizada correctamente', 'success')
        } else {
          // Create new
          await pb.collection('Haciendas').create(dataToSave)
          snackbarStore.showSnackbar('Hacienda creada correctamente', 'success')
        }
        
        dialogHacienda.value = false
        await loadHaciendas()
      } catch (error) {
        handleError(error, 'Error guardando hacienda')
      } finally {
        loading.value = false
      }
    }
    
    const confirmDeleteHacienda = (hacienda) => {
      haciendaToDelete.value = hacienda
      dialogDelete.value = true
    }
    
    const deleteHacienda = async () => {
      if (!haciendaToDelete.value) return
      
      loading.value = true
      try {
        await pb.collection('Haciendas').delete(haciendaToDelete.value.id)
        snackbarStore.showSnackbar('Hacienda eliminada correctamente', 'success')
        dialogDelete.value = false
        await loadHaciendas()
      } catch (error) {
        handleError(error, 'Error eliminando hacienda')
      } finally {
        loading.value = false
      }
    }
    
    const refreshData = () => {
      loadHaciendas()
      loadPlans()
      snackbarStore.showSnackbar('Datos actualizados', 'success')
    }
    
    // Lifecycle
    onMounted(() => {
      // Verify superadmin access
      if (userRole.value !== 'superadmin') {
        snackbarStore.showSnackbar('Acceso denegado. Se requiere rol de superadministrador.', 'error')
        return
      }
      
      loadHaciendas()
      loadPlans()
    })
    
    return {
      loading,
      formValid,
      dialogHacienda,
      dialogDelete,
      editingHacienda,
      haciendaToDelete,
      allModulesActive,
      haciendas,
      plans,
      stats,
      availableModules,
      haciendaForm,
      userRole,
      haciendasHeaders,
      getPlanName,
      openCreateHacienda,
      openEditHacienda,
      toggleAllModules,
      saveHacienda,
      confirmDeleteHacienda,
      deleteHacienda,
      refreshData
    }
  }
})
</script>

<style scoped>
.bg-surface {
  background-color: rgb(var(--v-theme-surface));
}
</style>
