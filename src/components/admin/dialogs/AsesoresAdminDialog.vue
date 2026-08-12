<template>
  <v-dialog v-model="dialog" max-width="900" persistent>
    <v-card v-if="asesor">
      <v-card-title class="bg-indigo-darken-2 text-white d-flex align-center justify-space-between py-3">
        <div>
          <span class="text-h6 font-weight-bold">{{ asesor.name || asesor.firstname }} {{ asesor.lastname }}</span>
          <v-chip class="ml-3" :color="asesor.status === 'active' ? 'success' : 'error'" size="small">
            {{ asesor.status === 'active' ? 'Activo' : 'Suspendido' }}
          </v-chip>
          <v-chip class="ml-2" color="white" variant="outlined" size="small">
            {{ asesor.email }}
          </v-chip>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="close"></v-btn>
      </v-card-title>

      <v-tabs v-model="activeTab" bg-color="indigo-lighten-5" color="indigo" grow>
        <v-tab value="perfil" prepend-icon="mdi-account">Perfil</v-tab>
        <v-tab value="metricas" prepend-icon="mdi-chart-bar">Métricas</v-tab>
        <v-tab value="vinculaciones" prepend-icon="mdi-link-variant">Haciendas Vinculadas</v-tab>
        <v-tab value="seguridad" prepend-icon="mdi-shield-lock">Seguridad & Sesión</v-tab>
      </v-tabs>

      <v-card-text class="pt-4">
        <v-window v-model="activeTab">
          <!-- TAB 1: Perfil -->
          <v-window-item value="perfil">
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-subtitle-1 font-weight-bold">Información Profesional & Personal</span>
              <v-btn
                v-if="!editMode"
                color="indigo"
                size="small"
                variant="outlined"
                prepend-icon="mdi-account-edit"
                @click="openEditMode"
              >
                Editar Perfil
              </v-btn>
              <div v-else class="d-flex gap-2">
                <v-btn size="small" variant="text" color="grey" @click="editMode = false">Cancelar</v-btn>
                <v-btn size="small" color="indigo" variant="elevated" :loading="saveLoading" @click="saveProfile">Guardar</v-btn>
              </div>
            </div>

            <!-- MODO LECTURA -->
            <v-row v-if="!editMode">
              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Nombre Completo</v-list-item-title>
                    <v-list-item-subtitle>{{ asesor.name || asesor.firstname }} {{ asesor.lastname }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Correo Electrónico</v-list-item-title>
                    <v-list-item-subtitle>{{ asesor.email }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Nombre de Usuario</v-list-item-title>
                    <v-list-item-subtitle>{{ asesor.username }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Nº Colegiatura</v-list-item-title>
                    <v-list-item-subtitle>{{ parsedInfo.colegiatura || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
              <v-col cols="12" md="6">
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Cédula / Identificación</v-list-item-title>
                    <v-list-item-subtitle>{{ asesor.cedula || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Dirección</v-list-item-title>
                    <v-list-item-subtitle>{{ asesor.direccion || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Bio / Perfil Técnico</v-list-item-title>
                    <v-list-item-subtitle>{{ parsedInfo.bio || 'N/A' }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Última actualización</v-list-item-title>
                    <v-list-item-subtitle>{{ formatDate(asesor.updated) }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>

            <!-- MODO EDICIÓN -->
            <v-row v-else class="pt-2">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.name"
                  label="Nombre"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.lastname"
                  label="Apellido"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.cedula"
                  label="Cédula / Identificación"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.colegiatura"
                  label="Nº Colegiatura Profesional"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="editForm.bio"
                  label="Bio / Perfil Técnico Profesional"
                  rows="3"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
          </v-window-item>

          <!-- TAB 2: Métricas -->
          <v-window-item value="metricas">
            <v-row class="mb-3">
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="text-center">
                    <div class="text-overline">Haciendas Vinculadas</div>
                    <div class="text-h4 font-weight-bold">{{ stats?.haciendas_activas || 0 }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="success">
                  <v-card-text class="text-center">
                    <div class="text-overline">Recetas Emitidas</div>
                    <div class="text-h4 font-weight-bold">{{ stats?.recetas_emitidas || 0 }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card variant="tonal" color="warning">
                  <v-card-text class="text-center">
                    <div class="text-overline">Paquetes de Evaluación</div>
                    <div class="text-h4 font-weight-bold">{{ stats?.paquetes_enviados || 0 }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- TAB 3: Vinculaciones -->
          <v-window-item value="vinculaciones">
            <v-card variant="outlined">
              <v-card-title class="text-subtitle-1 font-weight-bold">Lista de Haciendas Atendidas por el Asesor</v-card-title>
              <v-data-table
                :headers="[
                  { title: 'Hacienda', key: 'haciendaName' },
                  { title: 'Estado Vinculación', key: 'estado' },
                  { title: 'Fecha', key: 'created' },
                  { title: 'Acciones', key: 'actions', align: 'end' }
                ]"
                :items="vinculaciones"
                density="compact"
                hide-default-footer
              >
                <template v-slot:item.haciendaName="{ item }">
                  {{ item.expand?.hacienda_id?.nombre || item.expand?.hacienda_id?.name || item.hacienda_id }}
                </template>
                <template v-slot:item.estado="{ item }">
                  <v-chip size="small" :color="item.estado === 'activa' ? 'success' : 'warning'">
                    {{ item.estado }}
                  </v-chip>
                </template>
                <template v-slot:item.created="{ item }">
                  {{ formatDate(item.created) }}
                </template>
                <template v-slot:item.actions="{ item }">
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    title="Eliminar vinculación"
                    @click="$emit('delete-vinculacion', item.id)"
                  ></v-btn>
                </template>
              </v-data-table>
            </v-card>
          </v-window-item>

          <!-- TAB 4: Seguridad -->
          <v-window-item value="seguridad">
            <v-card variant="outlined" class="pa-4">
              <h4 class="font-weight-bold mb-3">Acciones de Seguridad y Cuenta</h4>
              <v-row align="center">
                <v-col cols="12" md="6">
                  <p class="text-caption mb-1"><strong>Estado de la Cuenta:</strong></p>
                  <v-chip :color="asesor.status === 'active' ? 'success' : 'error'" class="mb-3">
                    {{ asesor.status === 'active' ? 'Cuenta Activa' : 'Cuenta Suspendida' }}
                  </v-chip>
                  <p class="text-caption mb-1"><strong>Verificación de Correo:</strong></p>
                  <v-chip :color="asesor.verified ? 'success' : 'warning'">
                    {{ asesor.verified ? 'Verificado' : 'No Verificado' }}
                  </v-chip>
                </v-col>

                <v-col cols="12" md="6" class="d-flex flex-column gap-2">
                  <v-btn
                    color="info"
                    variant="tonal"
                    prepend-icon="mdi-email-sync"
                    class="mb-2"
                    @click="resendVerification"
                    :loading="loadingAction === 'verify'"
                  >
                    Reenviar Correo de Verificación
                  </v-btn>

                  <v-btn
                    color="warning"
                    variant="tonal"
                    prepend-icon="mdi-account-off"
                    class="mb-2"
                    @click="disconnectSession"
                    :loading="loadingAction === 'disconnect'"
                  >
                    Forzar Cierre de Sesión (Rotar Token)
                  </v-btn>

                  <v-btn
                    :color="asesor.status === 'active' ? 'error' : 'success'"
                    variant="flat"
                    :prepend-icon="asesor.status === 'active' ? 'mdi-pause-circle' : 'mdi-play-circle'"
                    @click="toggleStatus"
                    :loading="loadingAction === 'toggle'"
                  >
                    {{ asesor.status === 'active' ? 'Suspender Asesor' : 'Reactivar Asesor' }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-card>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions class="pb-4 pr-4">
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="close">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatDate } from '@/utils/formatters'
import { useAsesoresStore } from '@/stores/asesoresStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  asesor: { type: Object, default: null },
  stats: { type: Object, default: () => ({ haciendas_activas: 0, recetas_emitidas: 0, paquetes_enviados: 0 }) },
  vinculaciones: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'updated', 'delete-vinculacion'])

const asesoresStore = useAsesoresStore()
const uiFeedbackStore = useUiFeedbackStore()

const dialog = ref(props.modelValue)
const activeTab = ref('perfil')
const loadingAction = ref('')
const editMode = ref(false)
const saveLoading = ref(false)
const editForm = ref({ name: '', lastname: '', cedula: '', colegiatura: '', bio: '' })

const parsedInfo = computed(() => {
  if (!props.asesor?.info) return {}
  try {
    return typeof props.asesor.info === 'string' ? JSON.parse(props.asesor.info) : props.asesor.info
  } catch (e) {
    return { bio: props.asesor.info }
  }
})

function openEditMode() {
  const infoData = parsedInfo.value
  editForm.value = {
    name: props.asesor?.name || props.asesor?.firstname || '',
    lastname: props.asesor?.lastname || '',
    cedula: props.asesor?.cedula || '',
    colegiatura: infoData.colegiatura || '',
    bio: infoData.bio || '',
    infoRaw: props.asesor?.info || ''
  }
  editMode.value = true
}

async function saveProfile() {
  if (!props.asesor?.id) return
  saveLoading.value = true
  try {
    await asesoresStore.updateAsesor(props.asesor.id, editForm.value)
    uiFeedbackStore.showSnackbar('Perfil de asesor actualizado exitosamente', 'success')
    editMode.value = false
    emit('updated')
  } catch (err) {
    uiFeedbackStore.showSnackbar('Error al actualizar el perfil del asesor', 'error')
  } finally {
    saveLoading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  dialog.value = val
  if (val) {
    activeTab.value = 'perfil'
    editMode.value = false
  }
})

watch(dialog, (val) => {
  emit('update:modelValue', val)
})

function close() {
  dialog.value = false
}

async function resendVerification() {
  if (!props.asesor?.id) return
  loadingAction.value = 'verify'
  try {
    await asesoresStore.resendVerificationAsesor(props.asesor.id)
    uiFeedbackStore.showSnackbar(`Correo de verificación enviado a ${props.asesor.email}`, 'success')
  } catch (err) {
    uiFeedbackStore.showSnackbar('Error enviando verificación', 'error')
  } finally {
    loadingAction.value = ''
  }
}

async function disconnectSession() {
  if (!props.asesor?.id) return
  loadingAction.value = 'disconnect'
  try {
    await asesoresStore.disconnectAsesor(props.asesor.id)
    uiFeedbackStore.showSnackbar(`Sesión desconectada para ${props.asesor.email}`, 'success')
  } catch (err) {
    uiFeedbackStore.showSnackbar('Error desconectando sesión', 'error')
  } finally {
    loadingAction.value = ''
  }
}

async function toggleStatus() {
  if (!props.asesor?.id) return
  const newStatus = props.asesor.status === 'active' ? 'suspended' : 'active'
  loadingAction.value = 'toggle'
  try {
    await asesoresStore.toggleAsesorStatus(props.asesor.id, newStatus)
    emit('updated')
    uiFeedbackStore.showSnackbar(`Estado del asesor cambiado a: ${newStatus}`, 'success')
  } catch (err) {
    uiFeedbackStore.showSnackbar('Error cambiando estado del asesor', 'error')
  } finally {
    loadingAction.value = ''
  }
}
</script>
