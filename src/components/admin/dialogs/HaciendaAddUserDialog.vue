<template>
  <v-dialog v-model="isOpen" max-width="600" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3 px-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-account-plus" class="mr-2" size="small" />
          <span class="text-h6">Vincular Usuario a Hacienda</span>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeModal" />
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Resumen de Cuotas Disponibles del Plan -->
        <v-sheet border rounded class="pa-3 mb-4 bg-surface-light">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-2 d-flex align-center">
            <v-icon icon="mdi-chart-pie" size="16" class="mr-1" />
            ESTADO DE CUOTAS DEL PLAN ACTUAL
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              size="small"
              variant="tonal"
              :color="isOperadoresFull ? 'error' : 'success'"
              prepend-icon="mdi-account-hard-hat"
            >
              Operadores: {{ currentRoleCounts.operadores || 0 }} / {{ planLimits.operadores || 0 }}
            </v-chip>
            <v-chip
              size="small"
              variant="tonal"
              :color="isAuditoresFull ? 'error' : 'info'"
              prepend-icon="mdi-clipboard-check"
            >
              Auditores: {{ currentRoleCounts.auditores || 0 }} / {{ planLimits.auditores || 0 }}
            </v-chip>
            <v-chip
              size="small"
              variant="tonal"
              :color="currentRoleCounts.administradores >= 1 ? 'warning' : 'primary'"
              prepend-icon="mdi-account-tie"
            >
              Admin: {{ currentRoleCounts.administradores || 0 }} / 1
            </v-chip>
          </div>
        </v-sheet>

        <!-- Selector de Usuario con Rol y Estado de Cuota -->
        <v-autocomplete
          v-model="selectedUserToAdd"
          :items="availableUsersToAdd"
          item-title="label"
          item-value="id"
          item-disabled="disabled"
          label="Seleccionar Usuario a Vincular"
          placeholder="Escriba el nombre o correo del usuario..."
          variant="outlined"
          density="comfortable"
          clearable
          prepend-inner-icon="mdi-account-search"
          :no-data-text="'No hay usuarios disponibles para vincular'"
        >
          <template v-slot:item="{ props: itemProps, item }">
            <v-list-item
              v-bind="itemProps"
              :disabled="item.raw.disabled"
              class="py-2"
            >
              <template v-slot:prepend>
                <v-avatar size="32" :color="item.raw.roleColor" variant="tonal" class="mr-3">
                  <v-icon size="18">
                    {{ item.raw.role === 'administrador' ? 'mdi-account-tie' : item.raw.role === 'auditor' ? 'mdi-clipboard-check' : 'mdi-account' }}
                  </v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ item.raw.name }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ item.raw.email }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <div class="d-flex flex-column align-end">
                  <v-chip
                    size="x-small"
                    :color="item.raw.roleColor"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ item.raw.roleLabel }}
                  </v-chip>
                  <span v-if="item.raw.disabled" class="text-caption text-error mt-1 font-weight-medium">
                    {{ item.raw.reason }}
                  </span>
                </div>
              </template>
            </v-list-item>
          </template>

          <template v-slot:selection="{ item }">
            <div class="d-flex align-center ga-2">
              <span class="font-weight-medium">{{ item.raw.name }}</span>
              <v-chip size="x-small" :color="item.raw.roleColor" variant="tonal">
                {{ item.raw.roleLabel }}
              </v-chip>
            </div>
          </template>
        </v-autocomplete>

        <v-alert
          v-if="selectedUserObj && selectedUserObj.disabled"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ selectedUserObj.reason }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-surface">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!selectedUserToAdd || (selectedUserObj && selectedUserObj.disabled)"
          :loading="loading"
          prepend-icon="mdi-account-plus"
          @click="handleAddUserToHacienda"
        >
          Vincular Usuario
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useHaciendaManagementStore } from '@/stores/haciendaManagementStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { USER_ROLES, ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  haciendaId: {
    type: String,
    default: ''
  },
  currentMemberIds: {
    type: Array,
    default: () => []
  },
  allUsers: {
    type: Array,
    default: () => []
  },
  planLimits: {
    type: Object,
    default: () => ({ operadores: 0, auditores: 0, maxAdmin: 1 })
  },
  currentRoleCounts: {
    type: Object,
    default: () => ({ operadores: 0, auditores: 0, administradores: 0 })
  }
})

const emit = defineEmits(['update:modelValue', 'added'])

const haciendaManagementStore = useHaciendaManagementStore()
const uiFeedbackStore = useUiFeedbackStore()

const selectedUserToAdd = ref(null)
const loading = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isOperadoresFull = computed(() => {
  return (props.currentRoleCounts.operadores || 0) >= (props.planLimits.operadores || 0)
})

const isAuditoresFull = computed(() => {
  return (props.currentRoleCounts.auditores || 0) >= (props.planLimits.auditores || 0)
})

const availableUsersToAdd = computed(() => {
  if (!props.allUsers.length) return []
  return props.allUsers
    .filter(u => !props.currentMemberIds.includes(u.id))
    .map(u => {
      const role = u.role || USER_ROLES.OPERADOR
      const roleLabel = ROLE_LABELS[role] || role
      const roleColor = ROLE_COLORS[role] || 'grey'
      let disabled = false
      let reason = ''

      if (role === USER_ROLES.ASESOR) {
        disabled = true
        reason = 'Vincular vía pestaña Asesores'
      } else if (role === USER_ROLES.OPERADOR && isOperadoresFull.value) {
        disabled = true
        reason = `Límite alcanzado (${props.currentRoleCounts.operadores}/${props.planLimits.operadores})`
      } else if (role === USER_ROLES.AUDITOR && isAuditoresFull.value) {
        disabled = true
        reason = `Límite alcanzado (${props.currentRoleCounts.auditores}/${props.planLimits.auditores})`
      } else if (role === USER_ROLES.ADMINISTRADOR && (props.currentRoleCounts.administradores || 0) >= 1) {
        disabled = true
        reason = 'Ya existe un Administrador'
      }

      return {
        id: u.id,
        name: u.name || u.nombre || u.email || 'Sin nombre',
        email: u.email || 'Sin correo',
        label: `${u.name || u.nombre || u.email || 'Sin nombre'} (${roleLabel})`,
        role,
        roleLabel,
        roleColor,
        disabled,
        reason
      }
    })
})

const selectedUserObj = computed(() => {
  if (!selectedUserToAdd.value) return null
  return availableUsersToAdd.value.find(u => u.id === selectedUserToAdd.value) || null
})

function closeModal() {
  selectedUserToAdd.value = null
  isOpen.value = false
}

async function handleAddUserToHacienda() {
  if (!selectedUserToAdd.value || !props.haciendaId) return
  if (selectedUserObj.value?.disabled) {
    uiFeedbackStore.showSnackbar(selectedUserObj.value.reason || 'No se puede vincular este usuario', 'warning')
    return
  }

  loading.value = true
  try {
    await haciendaManagementStore.addUserToHacienda(selectedUserToAdd.value, props.haciendaId)
    uiFeedbackStore.showSnackbar('Usuario vinculado a la hacienda exitosamente', 'success')
    emit('added')
    closeModal()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al vincular usuario a hacienda', 'error')
  } finally {
    loading.value = false
  }
}
</script>
