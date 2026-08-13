<template>
  <v-dialog v-model="isOpen" max-width="1000">
    <v-card v-if="hacienda">
      <v-card-title class="bg-indigo text-white d-flex align-center justify-space-between py-3">
        <div>
          <span class="text-h6">Detalles de: {{ hacienda.name || hacienda.nombre }}</span>
          <v-chip class="ml-3" color="white" size="small" variant="outlined">
            Plan: {{ hacienda.plan?.name || hacienda.plan?.nombre || 'N/A' }}
          </v-chip>
          <v-chip class="ml-2" :color="getStatusColor(hacienda.status)" size="small">
            {{ formatStatus(hacienda.status) }}
          </v-chip>
        </div>
        <div class="d-flex align-center">
          <v-btn
            color="white"
            variant="outlined"
            size="small"
            prepend-icon="mdi-pencil"
            class="mr-2"
            @click="triggerEdit"
          >
            Editar Configuración
          </v-btn>
          <v-btn icon="mdi-close" variant="text" color="white" @click="closeModal" />
        </div>
      </v-card-title>

      <v-tabs v-model="activeTab" bg-color="indigo-lighten-5" color="indigo" grow>
        <v-tab value="resumen" prepend-icon="mdi-view-dashboard">Resumen & Métricas</v-tab>
        <v-tab value="usuarios" prepend-icon="mdi-account-group">Usuarios</v-tab>
        <v-tab value="plan" prepend-icon="mdi-package-variant-closed">Plan & Módulos</v-tab>
        <v-tab value="asesores" prepend-icon="mdi-briefcase-account">Asesores</v-tab>
        <v-tab value="seguridad" prepend-icon="mdi-shield-alert">Seguridad</v-tab>
      </v-tabs>

      <v-card-text class="pt-4">
        <v-window v-model="activeTab">
          <!-- TAB 1: Resumen & Métricas -->
          <v-window-item value="resumen">
            <v-row class="mb-4">
              <v-col cols="12" md="6">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="d-flex align-center justify-space-between">
                    <div>
                      <div class="text-overline">Usuarios Activos</div>
                      <div class="text-h4 font-weight-bold">{{ haciendaMetrics?.userCount || 0 }}</div>
                    </div>
                    <v-icon size="48" opacity="0.6">mdi-account-multiple</v-icon>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card variant="tonal" color="secondary">
                  <v-card-text class="d-flex align-center justify-space-between">
                    <div>
                      <div class="text-overline">Módulos Activos</div>
                      <div class="text-h4 font-weight-bold">{{ haciendaMetrics?.activeModules || hacienda.active_modules?.length || 0 }}</div>
                    </div>
                    <v-icon size="48" opacity="0.6">mdi-view-module</v-icon>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-card variant="outlined" class="mb-4">
              <v-card-title class="text-subtitle-1 font-weight-bold">Información General</v-card-title>
              <v-card-text>
                <p><strong>Descripción:</strong> {{ hacienda.info || hacienda.descripcion || 'N/A' }}</p>
                <p><strong>Ubicación:</strong> {{ hacienda.location || hacienda.ubicacion || 'N/A' }}</p>
                <p><strong>Propietario / Admin:</strong> {{ ownerName }}</p>
                <p><strong>Fecha de Creación:</strong> {{ formatDate(hacienda.created) }}</p>
              </v-card-text>
            </v-card>

            <!-- Última Actividad del Sistema -->
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1 font-weight-bold">Últimos Eventos de Actividad</v-card-title>
              <v-data-table
                :headers="[
                  { title: 'Fecha', key: 'timestamp' },
                  { title: 'Usuario', key: 'user' },
                  { title: 'Acción', key: 'action' },
                  { title: 'Detalle', key: 'message' }
                ]"
                :items="haciendaActivity"
                density="compact"
                hide-default-footer
                :items-per-page="5"
                :loading="metricsLoading"
              >
                <template v-slot:item.timestamp="{ item }">
                  {{ formatDate(item.timestamp) }}
                </template>
              </v-data-table>
            </v-card>
          </v-window-item>

          <!-- TAB 2: Usuarios -->
          <v-window-item value="usuarios">
            <v-card variant="outlined">
              <v-card-title class="d-flex justify-space-between align-center py-2 px-4">
                <div class="d-flex align-center">
                  <span class="font-weight-bold">Roster de Usuarios</span>
                  <v-chip class="ml-3" size="small" color="primary" variant="outlined">
                    {{ currentHaciendaUsers.length }} / {{ haciendaQuota }} usuarios
                  </v-chip>
                </div>
                <v-btn
                  color="primary"
                  size="small"
                  prepend-icon="mdi-account-plus"
                  @click="addUserModal = true"
                >
                  Agregar Usuario
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-list density="compact" v-if="currentHaciendaUsers.length">
                <v-list-item
                  v-for="user in currentHaciendaUsers"
                  :key="user.id"
                >
                  <template v-slot:prepend>
                    <v-icon icon="mdi-account-circle" color="primary" class="mr-2" />
                  </template>
                  <v-list-item-title class="font-weight-medium">{{ user.label }}</v-list-item-title>
                  <v-list-item-subtitle>{{ user.email || 'Sin correo registrado' }}</v-list-item-subtitle>
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-account-remove"
                      size="small"
                      color="error"
                      variant="text"
                      title="Quitar de hacienda"
                      @click="handleRemoveUserFromHacienda(user.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>
              <div v-else class="pa-4 text-center text-grey">No hay usuarios vinculados a esta hacienda.</div>
            </v-card>
          </v-window-item>

          <!-- TAB 3: Plan & Módulos -->
          <v-window-item value="plan">
            <v-card variant="outlined" class="pa-4">
              <h4 class="font-weight-bold mb-3">Módulos Habilitados</h4>
              <v-chip-group column v-if="hacienda.active_modules?.length">
                <v-chip
                  v-for="moduleId in hacienda.active_modules"
                  :key="moduleId"
                  color="primary"
                  size="small"
                >
                  {{ getModuleName(moduleId) }}
                </v-chip>
              </v-chip-group>
              <p v-else class="text-grey">Sin módulos habilitados actualmente.</p>
            </v-card>
          </v-window-item>

          <!-- TAB 4: Asesores -->
          <v-window-item value="asesores">
            <v-card variant="outlined" class="mb-4">
              <v-card-title class="d-flex justify-space-between align-center py-2 px-4">
                <span class="font-weight-bold">Asesores Técnicos Vinculados</span>
                <v-btn
                  color="indigo"
                  size="small"
                  prepend-icon="mdi-link-plus"
                  @click="vincularAsesorModal = true"
                >
                  Vincular Asesor
                </v-btn>
              </v-card-title>
              <v-divider />
              <v-data-table
                :headers="[
                  { title: 'Asesor', key: 'asesorName' },
                  { title: 'Estado', key: 'estado' },
                  { title: 'Acciones', key: 'actions', align: 'end' }
                ]"
                :items="relaciones.vinculaciones"
                density="compact"
                hide-default-footer
                :items-per-page="10"
              >
                <template v-slot:item.asesorName="{ item }">
                  {{ item.expand?.asesor_id?.name || item.expand?.asesor_id?.username || 'Desconocido' }} ({{ item.expand?.asesor_id?.email || 'N/A' }})
                </template>
                <template v-slot:item.estado="{ item }">
                  <v-chip :color="item.estado === 'activa' ? 'success' : 'grey'" size="x-small">
                    {{ item.estado }}
                  </v-chip>
                </template>
                <template v-slot:item.actions="{ item }">
                  <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="showDetailItem('vinculacion', item)" />
                  <v-btn
                    v-if="item.estado === 'activa'"
                    icon="mdi-link-off"
                    size="small"
                    variant="text"
                    color="warning"
                    title="Revocar Vinculación"
                    @click="handleRevocarAsesorVinculacion(item.id)"
                  />
                </template>
              </v-data-table>
            </v-card>
          </v-window-item>

          <!-- TAB 5: Seguridad & Suspensión -->
          <v-window-item value="seguridad">
            <v-card variant="outlined" class="pa-4">
              <h4 class="font-weight-bold mb-2">Estado Operativo de la Hacienda</h4>

              <div v-if="hacienda.status === 'suspended'" class="mb-4">
                <v-alert type="error" variant="tonal" class="mb-3">
                  <strong>Hacienda Suspendida.</strong>
                  <div class="text-body-2 mt-1">Motivo: {{ hacienda.suspension_reason || 'Sin motivo registrado' }}</div>
                </v-alert>
                <v-btn
                  color="success"
                  variant="flat"
                  prepend-icon="mdi-check-circle"
                  @click="handleReactivateFromView"
                  :loading="suspensionLoading"
                >
                  Reactivar Hacienda
                </v-btn>
              </div>

              <div v-else class="mb-4">
                <v-alert type="success" variant="tonal" class="mb-3">
                  Esta hacienda se encuentra <strong>Activa</strong> y operando normalmente.
                </v-alert>
                <v-textarea
                  v-model="suspensionReason"
                  label="Motivo de suspensión"
                  rows="2"
                  variant="outlined"
                  density="compact"
                  placeholder="Escriba la razón de suspensión para notificar al administrador"
                  class="mb-2"
                />
                <v-btn
                  color="error"
                  variant="flat"
                  prepend-icon="mdi-pause-circle"
                  @click="handleSuspendFromView"
                  :loading="suspensionLoading"
                >
                  Suspender Hacienda
                </v-btn>
              </div>
            </v-card>
          </v-window-item>
        </v-window>
      </v-card-text>
      <v-card-actions class="pb-4 pr-4">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cerrar</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Sub-Modales Encapsulados -->
    <HaciendaAddUserDialog
      v-model="addUserModal"
      :hacienda-id="hacienda?.id"
      :current-member-ids="currentMemberIds"
      :all-users="usersList"
      @added="onDataUpdated"
    />

    <HaciendaAddAsesorDialog
      v-model="vincularAsesorModal"
      :hacienda-id="hacienda?.id"
      :current-asesor-ids="currentAsesorIds"
      @linked="onDataUpdated"
    />

    <HaciendaActivityDetailDialog
      v-model="detailItemDialog"
      :item="clickedItem"
      :type="clickedItemType"
    />
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatDate } from '@/utils/formatters'
import { useHaciendaManagementStore } from '@/stores/haciendaManagementStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import HaciendaAddUserDialog from './HaciendaAddUserDialog.vue'
import HaciendaAddAsesorDialog from './HaciendaAddAsesorDialog.vue'
import HaciendaActivityDetailDialog from './HaciendaActivityDetailDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  hacienda: {
    type: Object,
    default: null
  },
  usersList: {
    type: Array,
    default: () => []
  },
  planesList: {
    type: Array,
    default: () => []
  },
  modulosList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'updated', 'edit'])

function triggerEdit() {
  closeModal()
  emit('edit', props.hacienda)
}

const haciendaManagementStore = useHaciendaManagementStore()
const uiFeedbackStore = useUiFeedbackStore()

const activeTab = ref('resumen')
const haciendaMetrics = ref(null)
const metricsLoading = ref(false)
const haciendaActivity = ref([])
const relaciones = ref({ vinculaciones: [], paquetes: [], recetas: [] })
const suspensionReason = ref('')
const suspensionLoading = ref(false)

// Estados para sub-modales
const addUserModal = ref(false)
const vincularAsesorModal = ref(false)
const detailItemDialog = ref(false)
const clickedItem = ref(null)
const clickedItemType = ref('')

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const ownerName = computed(() => {
  if (!props.hacienda) return 'N/A'
  const ownerId = props.hacienda.owner || props.hacienda.administrador
  if (!ownerId) return 'Sin asignar'
  const user = props.usersList.find(u => u.id === ownerId)
  return user ? (user.label || `${user.name || user.nombre || user.email}`) : ownerId
})

const currentHaciendaUsers = computed(() => {
  if (!props.hacienda?.id) return []
  return props.usersList.filter(u => u.hacienda === props.hacienda.id)
})

const currentMemberIds = computed(() => {
  return currentHaciendaUsers.value.map(u => u.id)
})

const currentAsesorIds = computed(() => {
  return (relaciones.value.vinculaciones || [])
    .filter(v => v.estado === 'activa')
    .map(v => v.asesor_id || v.expand?.asesor_id?.id)
    .filter(Boolean)
})

const haciendaQuota = computed(() => {
  if (!props.hacienda) return '∞'
  const planId = props.hacienda.plan?.id || props.hacienda.plan
  if (!planId) return '∞'
  const plan = props.planesList.find(p => p.id === planId)
  if (!plan) return '∞'
  const limit = (plan.operadores || 0) + (plan.auditores || 0)
  return limit > 0 ? limit : '∞'
})

watch(() => props.modelValue, (val) => {
  if (val && props.hacienda?.id) {
    activeTab.value = 'resumen'
    loadHaciendaDetails(props.hacienda.id)
  }
})

async function loadHaciendaDetails(haciendaId) {
  metricsLoading.value = true
  try {
    const [metrics, activity, rels] = await Promise.all([
      haciendaManagementStore.fetchHaciendaMetrics(haciendaId),
      haciendaManagementStore.fetchHaciendaActivity(haciendaId),
      haciendaManagementStore.fetchRelaciones(haciendaId)
    ])
    haciendaMetrics.value = metrics
    haciendaActivity.value = activity || []
    relaciones.value = rels || { vinculaciones: [], paquetes: [], recetas: [] }
  } catch (err) {
    console.error('Error al cargar detalles de hacienda:', err)
  } finally {
    metricsLoading.value = false
  }
}

function getModuleName(id) {
  const mod = props.modulosList.find(m => m.id === id)
  return mod ? (mod.name || mod.nombre) : id
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return 'success'
    case 'suspended': return 'warning'
    case 'inactive': return 'error'
    default: return 'grey'
  }
}

function formatStatus(status) {
  switch (status) {
    case 'active': return 'Activa'
    case 'suspended': return 'Suspendida'
    case 'inactive': return 'Inactiva'
    default: return status || 'Desconocido'
  }
}

function showDetailItem(type, item) {
  clickedItemType.value = type
  clickedItem.value = item
  detailItemDialog.value = true
}

function closeModal() {
  isOpen.value = false
}

function onDataUpdated() {
  if (props.hacienda?.id) {
    loadHaciendaDetails(props.hacienda.id)
  }
  emit('updated')
}

async function handleRemoveUserFromHacienda(userId) {
  const confirmed = await uiFeedbackStore.showConfirm(
    'Remover Usuario',
    '¿Está seguro de remover este usuario de la hacienda?',
    'warning',
    'mdi-account-remove'
  )
  if (!confirmed) return
  try {
    await haciendaManagementStore.removeUserFromHacienda(userId)
    uiFeedbackStore.showSnackbar('Usuario removido de la hacienda', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al remover usuario de hacienda', 'error')
  }
}

async function handleRevocarAsesorVinculacion(vinculacionId) {
  const confirmed = await uiFeedbackStore.showConfirm(
    'Revocar Vinculación',
    '¿Está seguro de revocar la vinculación de este asesor?',
    'warning',
    'mdi-link-off'
  )
  if (!confirmed) return
  try {
    await haciendaManagementStore.revocarAsesorVinculacion(vinculacionId)
    uiFeedbackStore.showSnackbar('Vinculación revocada exitosamente', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al revocar vinculación', 'error')
  }
}

async function handleSuspendFromView() {
  if (!suspensionReason.value) {
    uiFeedbackStore.showSnackbar('Debe ingresar un motivo de suspensión', 'warning')
    return
  }
  suspensionLoading.value = true
  try {
    await haciendaManagementStore.suspendHacienda(props.hacienda.id, suspensionReason.value)
    uiFeedbackStore.showSnackbar('Hacienda suspendida exitosamente', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al suspender hacienda', 'error')
  } finally {
    suspensionLoading.value = false
  }
}

async function handleReactivateFromView() {
  suspensionLoading.value = true
  try {
    await haciendaManagementStore.reactivateHacienda(props.hacienda.id)
    uiFeedbackStore.showSnackbar('Hacienda reactivada exitosamente', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al reactivar hacienda', 'error')
  } finally {
    suspensionLoading.value = false
  }
}
</script>
