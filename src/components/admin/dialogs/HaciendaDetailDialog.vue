<template>
  <v-dialog v-model="isOpen" max-width="1050" scrollable>
    <v-card v-if="hacienda" class="rounded-lg">
      <!-- Header Principal -->
      <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3 px-4">
        <div class="d-flex align-center flex-wrap ga-2">
          <v-icon icon="mdi-domain" size="small" />
          <span class="text-h6 font-weight-bold">{{ hacienda.name || hacienda.nombre }}</span>
          <v-chip class="ml-2" color="white" size="small" variant="outlined">
            Plan: {{ currentPlanName }}
          </v-chip>
          <v-chip size="small" :color="getStatusColor(hacienda.status)" variant="flat">
            {{ formatStatus(hacienda.status) }}
          </v-chip>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeModal" />
      </v-card-title>

      <!-- Barra de Pestañas Unificada (4 Pestañas Claras) -->
      <v-tabs
        v-model="activeTab"
        bg-color="surface-light"
        color="primary"
        grow
        density="comfortable"
      >
        <v-tab value="general" prepend-icon="mdi-tune">General & Configuración</v-tab>
        <v-tab value="usuarios" prepend-icon="mdi-account-group">Usuarios & Roles</v-tab>
        <v-tab value="plan" prepend-icon="mdi-package-variant-closed">Plan & Módulos</v-tab>
        <v-tab value="asesores" prepend-icon="mdi-briefcase-account">Asesores Técnicos</v-tab>
      </v-tabs>

      <v-divider />

      <v-card-text class="pa-4 bg-background">
        <v-window v-model="activeTab">
          <!-- ========================================== -->
          <!-- PESTAÑA 1: GENERAL & CONFIGURACIÓN (UNIFICADA) -->
          <!-- ========================================== -->
          <v-window-item value="general">
            <!-- 1. KPIs Rápidos y Métricas -->
            <v-row dense class="mb-4">
              <v-col cols="12" sm="4">
                <v-card variant="tonal" color="primary" class="rounded-lg">
                  <v-card-text class="d-flex align-center justify-space-between pa-3">
                    <div>
                      <div class="text-caption text-uppercase font-weight-bold">Usuarios Vinculados</div>
                      <div class="text-h5 font-weight-bold mt-1">
                        {{ currentHaciendaUsers.length }} <span class="text-caption text-medium-emphasis">/ {{ totalQuotaLimit }}</span>
                      </div>
                    </div>
                    <v-avatar color="primary" variant="flat" size="42">
                      <v-icon icon="mdi-account-multiple" size="24" color="white" />
                    </v-avatar>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" sm="4">
                <v-card variant="tonal" color="secondary" class="rounded-lg">
                  <v-card-text class="d-flex align-center justify-space-between pa-3">
                    <div>
                      <div class="text-caption text-uppercase font-weight-bold">Módulos Habilitados</div>
                      <div class="text-h5 font-weight-bold mt-1">
                        {{ (hacienda.active_modules || []).length }}
                      </div>
                    </div>
                    <v-avatar color="secondary" variant="flat" size="42">
                      <v-icon icon="mdi-view-module" size="24" color="white" />
                    </v-avatar>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" sm="4">
                <v-card
                  variant="tonal"
                  :color="hacienda.status === 'active' ? 'success' : 'error'"
                  class="rounded-lg"
                >
                  <v-card-text class="d-flex align-center justify-space-between pa-3">
                    <div>
                      <div class="text-caption text-uppercase font-weight-bold">Estado Operativo</div>
                      <div class="text-h5 font-weight-bold mt-1">
                        {{ formatStatus(hacienda.status) }}
                      </div>
                    </div>
                    <v-avatar :color="hacienda.status === 'active' ? 'success' : 'error'" variant="flat" size="42">
                      <v-icon :icon="hacienda.status === 'active' ? 'mdi-check-circle' : 'mdi-alert-circle'" size="24" color="white" />
                    </v-avatar>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- 2. Formulario de Datos Generales -->
            <v-form ref="generalFormRef" v-model="generalFormValid" @submit.prevent="handleSaveGeneralInfo">
              <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
                <div class="d-flex justify-space-between align-center mb-3">
                  <div>
                    <h4 class="text-subtitle-1 font-weight-bold">Datos Principales</h4>
                    <span class="text-caption text-medium-emphasis">Información general y de contacto de la hacienda</span>
                  </div>
                  <v-btn
                    color="primary"
                    variant="elevated"
                    size="small"
                    prepend-icon="mdi-content-save"
                    :loading="generalSaving"
                    type="submit"
                  >
                    Guardar Datos Generales
                  </v-btn>
                </div>

                <v-row dense>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="generalForm.name"
                      label="Nombre de la Hacienda *"
                      :rules="[v => !!v?.trim() || 'El nombre es obligatorio']"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-domain"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-autocomplete
                      v-model="generalForm.administrador"
                      :items="usersList"
                      item-title="label"
                      item-value="id"
                      label="Propietario / Administrador Principal"
                      placeholder="Seleccionar usuario"
                      variant="outlined"
                      density="comfortable"
                      clearable
                      prepend-inner-icon="mdi-account-tie"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="generalForm.ubicacion"
                      label="Ubicación Geográfica"
                      placeholder="Ej: Cantón Durán, Guayas, Ecuador"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-map-marker"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <div class="d-flex align-center h-100 pl-2">
                      <div v-if="hacienda.avatar" class="d-flex align-center ga-2">
                        <v-chip color="info" size="small" variant="tonal" prepend-icon="mdi-image">
                          Avatar cargado
                        </v-chip>
                        <v-btn
                          color="error"
                          variant="outlined"
                          size="small"
                          prepend-icon="mdi-delete"
                          :loading="avatarDeleting"
                          @click="handleDeleteAvatar"
                        >
                          Eliminar Avatar
                        </v-btn>
                      </div>
                      <div v-else class="text-caption text-medium-emphasis">
                        <v-icon icon="mdi-image-off-outline" size="16" class="mr-1" />
                        Sin avatar asignado
                      </div>
                    </div>
                  </v-col>

                  <v-col cols="12">
                    <v-textarea
                      v-model="generalForm.descripcion"
                      label="Descripción / Información adicional"
                      rows="2"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-text"
                    />
                  </v-col>
                </v-row>
              </v-card>

              <!-- 3. Configuración de Inteligencia Artificial (IA) -->
              <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
                <div class="mb-3">
                  <h4 class="text-subtitle-1 font-weight-bold">Asistente de Inteligencia Artificial</h4>
                  <span class="text-caption text-medium-emphasis">
                    Parámetros del modelo LLM configurado para procesamiento agronómico y consultas de esta hacienda.
                  </span>
                </div>
                <v-row dense>
                  <v-col cols="12" md="3">
                    <v-select
                      v-model="generalForm.ai_config.provider"
                      :items="[
                        { title: 'OpenRouter', value: 'openrouter' },
                        { title: 'OpenAI', value: 'openai' },
                        { title: 'Anthropic', value: 'anthropic' },
                        { title: 'Personalizado', value: 'custom' }
                      ]"
                      label="Proveedor IA"
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="generalForm.ai_config.model"
                      label="Modelo LLM"
                      placeholder="anthropic/claude-3.5-sonnet"
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="generalForm.ai_config.base_url"
                      label="Base URL (Opcional)"
                      placeholder="https://openrouter.ai/api/v1"
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="generalForm.ai_config.auth_token"
                      label="API Auth Token"
                      type="password"
                      placeholder="sk-or-v1-..."
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                </v-row>
              </v-card>
            </v-form>

            <!-- 4. Estado Operativo & Seguridad -->
            <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
              <div class="mb-3">
                <h4 class="text-subtitle-1 font-weight-bold">Seguridad & Estado Operativo</h4>
                <span class="text-caption text-medium-emphasis">Control del acceso y disponibilidad de la hacienda</span>
              </div>

              <div v-if="hacienda.status === 'suspended'">
                <v-alert type="warning" variant="tonal" class="mb-3">
                  <div class="font-weight-bold">Hacienda Suspendida Temporalmente</div>
                  <div class="text-body-2 mt-1">Motivo registrado: {{ hacienda.suspension_reason || 'Sin motivo especificado' }}</div>
                </v-alert>
                <v-btn
                  color="success"
                  variant="elevated"
                  prepend-icon="mdi-check-circle"
                  :loading="suspensionLoading"
                  @click="handleReactivateFromView"
                >
                  Reactivar Operaciones de la Hacienda
                </v-btn>
              </div>

              <div v-else>
                <v-alert type="success" variant="tonal" density="compact" class="mb-3">
                  Esta hacienda se encuentra <strong>Activa</strong> y en pleno funcionamiento.
                </v-alert>
                <v-row dense class="align-center">
                  <v-col cols="12" md="9">
                    <v-text-field
                      v-model="suspensionReason"
                      label="Motivo para suspender hacienda (si se requiere)"
                      placeholder="Describa la razón administrativa o técnica de suspensión..."
                      variant="outlined"
                      density="comfortable"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-btn
                      color="error"
                      variant="tonal"
                      block
                      prepend-icon="mdi-pause-circle"
                      :loading="suspensionLoading"
                      @click="handleSuspendFromView"
                    >
                      Suspender Hacienda
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
            </v-card>

            <!-- 5. Registro de Actividad Reciente -->
            <v-card variant="flat" border class="pa-4 rounded-lg">
              <div class="d-flex justify-space-between align-center mb-3">
                <h4 class="text-subtitle-1 font-weight-bold">Últimos Eventos de Actividad</h4>
                <span class="text-caption text-medium-emphasis">Registro de auditoría del sistema</span>
              </div>
              <v-data-table
                :headers="[
                  { title: 'Fecha', key: 'timestamp', width: '180px' },
                  { title: 'Usuario', key: 'user' },
                  { title: 'Acción', key: 'action' },
                  { title: 'Detalle', key: 'message' }
                ]"
                :items="haciendaActivity"
                density="comfortable"
                hide-default-footer
                :items-per-page="5"
                :loading="metricsLoading"
                no-data-text="No hay registros de actividad recientes"
              >
                <template v-slot:item.timestamp="{ item }">
                  <span class="text-caption font-weight-medium">{{ formatDate(item.timestamp) }}</span>
                </template>
                <template v-slot:item.action="{ item }">
                  <v-chip size="x-small" color="primary" variant="tonal">{{ item.action || 'Evento' }}</v-chip>
                </template>
              </v-data-table>
            </v-card>
          </v-window-item>

          <!-- ========================================== -->
          <!-- PESTAÑA 2: USUARIOS & ROLES -->
          <!-- ========================================== -->
          <v-window-item value="usuarios">
            <!-- Desglose de Cuotas por Rol del Plan -->
            <v-sheet border rounded-lg class="pa-4 mb-4 bg-surface-light">
              <div class="d-flex justify-space-between align-center mb-3 flex-wrap ga-2">
                <div>
                  <h4 class="text-subtitle-1 font-weight-bold">Capacidad y Roles del Equipo</h4>
                  <span class="text-caption text-medium-emphasis">
                    Plan contratado: <strong>{{ currentPlanName }}</strong>
                  </span>
                </div>
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="small"
                  prepend-icon="mdi-account-plus"
                  @click="addUserModal = true"
                >
                  Agregar Usuario
                </v-btn>
              </div>

              <!-- Indicadores de Cuotas por Rol -->
              <v-row dense>
                <v-col cols="12" sm="4">
                  <v-card variant="flat" border class="pa-3 rounded">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <span class="text-caption font-weight-medium">Operadores</span>
                      <v-chip
                        size="x-small"
                        :color="currentRoleCounts.operadores >= planLimits.operadores ? 'error' : 'success'"
                        variant="tonal"
                      >
                        {{ currentRoleCounts.operadores }} / {{ planLimits.operadores }}
                      </v-chip>
                    </div>
                    <v-progress-linear
                      :model-value="(currentRoleCounts.operadores / (planLimits.operadores || 1)) * 100"
                      :color="currentRoleCounts.operadores >= planLimits.operadores ? 'error' : 'success'"
                      height="6"
                      rounded
                    />
                  </v-card>
                </v-col>

                <v-col cols="12" sm="4">
                  <v-card variant="flat" border class="pa-3 rounded">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <span class="text-caption font-weight-medium">Auditores</span>
                      <v-chip
                        size="x-small"
                        :color="currentRoleCounts.auditores >= planLimits.auditores ? 'error' : 'info'"
                        variant="tonal"
                      >
                        {{ currentRoleCounts.auditores }} / {{ planLimits.auditores }}
                      </v-chip>
                    </div>
                    <v-progress-linear
                      :model-value="(currentRoleCounts.auditores / (planLimits.auditores || 1)) * 100"
                      :color="currentRoleCounts.auditores >= planLimits.auditores ? 'error' : 'info'"
                      height="6"
                      rounded
                    />
                  </v-card>
                </v-col>

                <v-col cols="12" sm="4">
                  <v-card variant="flat" border class="pa-3 rounded">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <span class="text-caption font-weight-medium">Administrador</span>
                      <v-chip
                        size="x-small"
                        :color="currentRoleCounts.administradores >= 1 ? 'primary' : 'warning'"
                        variant="tonal"
                      >
                        {{ currentRoleCounts.administradores }} / 1
                      </v-chip>
                    </div>
                    <v-progress-linear
                      :model-value="currentRoleCounts.administradores * 100"
                      color="primary"
                      height="6"
                      rounded
                    />
                  </v-card>
                </v-col>
              </v-row>
            </v-sheet>

            <!-- Roster de Usuarios Vinculados -->
            <v-card variant="flat" border class="rounded-lg">
              <v-card-title class="text-subtitle-1 font-weight-bold px-4 py-3 border-b">
                Roster de Usuarios Asignados ({{ currentHaciendaUsers.length }})
              </v-card-title>
              <v-list v-if="currentHaciendaUsers.length" lines="two">
                <v-list-item
                  v-for="user in currentHaciendaUsers"
                  :key="user.id"
                  class="px-4 border-b"
                >
                  <template v-slot:prepend>
                    <v-avatar :color="getRoleColor(user.role)" variant="tonal" size="40" class="mr-3">
                      <v-icon size="20">
                        {{ user.role === 'administrador' ? 'mdi-account-tie' : user.role === 'auditor' ? 'mdi-clipboard-check' : 'mdi-account' }}
                      </v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-bold">
                    {{ user.name || user.nombre || 'Sin nombre' }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ user.email || 'Sin correo' }}
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <div class="d-flex align-center ga-2">
                      <v-chip
                        size="small"
                        :color="getRoleColor(user.role)"
                        variant="tonal"
                        class="font-weight-medium"
                      >
                        {{ getRoleLabel(user.role) }}
                      </v-chip>
                      <v-btn
                        icon="mdi-account-remove"
                        size="small"
                        color="error"
                        variant="text"
                        title="Desvincular de la hacienda"
                        @click="handleRemoveUserFromHacienda(user.id)"
                      />
                    </div>
                  </template>
                </v-list-item>
              </v-list>
              <div v-else class="pa-6 text-center text-medium-emphasis">
                <v-icon icon="mdi-account-multiple-outline" size="48" class="mb-2" />
                <div>No hay usuarios vinculados a esta hacienda.</div>
              </div>
            </v-card>
          </v-window-item>

          <!-- ========================================== -->
          <!-- PESTAÑA 3: PLAN & MÓDULOS -->
          <!-- ========================================== -->
          <v-window-item value="plan">
            <!-- Plan de Suscripción -->
            <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
              <div class="d-flex justify-space-between align-center mb-3">
                <div>
                  <h4 class="text-subtitle-1 font-weight-bold">Plan de Suscripción</h4>
                  <span class="text-caption text-medium-emphasis">Nivel de servicio y capacidad contratada</span>
                </div>
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="small"
                  prepend-icon="mdi-content-save"
                  :loading="planSaving"
                  @click="handleSavePlan"
                >
                  Guardar Plan
                </v-btn>
              </div>

              <v-radio-group v-model="selectedPlan" inline density="comfortable" class="mt-2">
                <v-radio
                  v-for="planItem in (planesList && planesList.length ? planesList : [
                    { id: 'free', name: 'Gratuito / Básico' },
                    { id: 'pro', name: 'Profesional (Pro)' },
                    { id: 'enterprise', name: 'Empresarial (Enterprise)' }
                  ])"
                  :key="planItem.id"
                  :label="planItem.name || planItem.nombre || planItem.id"
                  :value="planItem.id"
                  color="primary"
                  class="mr-4"
                />
              </v-radio-group>
            </v-card>

            <!-- Módulos Habilitados -->
            <v-card variant="flat" border class="pa-4 rounded-lg">
              <div class="d-flex justify-space-between align-center mb-3">
                <div>
                  <h4 class="text-subtitle-1 font-weight-bold">Módulos de Plataforma</h4>
                  <span class="text-caption text-medium-emphasis">Active o desactive los módulos autorizados para esta hacienda</span>
                </div>
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="small"
                  prepend-icon="mdi-content-save"
                  :loading="modulesSaving"
                  @click="handleSaveModules"
                >
                  Guardar Módulos
                </v-btn>
              </div>

              <v-row dense>
                <v-col
                  v-for="mod in (modulosList && modulosList.length ? modulosList : [
                    { id: 'siembras', name: 'Siembras y Lotes' },
                    { id: 'actividades', name: 'Bitácora y Actividades' },
                    { id: 'finanzas', name: 'Finanzas y Costos' },
                    { id: 'bodega', name: 'Bodega e Inventario' },
                    { id: 'nomina', name: 'Nómina y Mano de Obra' },
                    { id: 'reportes', name: 'Reportes y Analítica' }
                  ])"
                  :key="mod.id"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <v-card variant="outlined" class="pa-3 rounded">
                    <v-checkbox
                      v-model="selectedModules"
                      :label="mod.name || mod.nombre || mod.id"
                      :value="mod.id"
                      color="primary"
                      density="compact"
                      hide-details
                    />
                  </v-card>
                </v-col>
              </v-row>
            </v-card>
          </v-window-item>

          <!-- ========================================== -->
          <!-- PESTAÑA 4: ASESORES TÉCNICOS -->
          <!-- ========================================== -->
          <v-window-item value="asesores">
            <v-card variant="flat" border class="rounded-lg">
              <v-card-title class="d-flex justify-space-between align-center px-4 py-3 border-b">
                <div>
                  <span class="text-subtitle-1 font-weight-bold">Asesores Técnicos Vinculados</span>
                  <div class="text-caption text-medium-emphasis">Asesores agronómicos autorizados para supervisión</div>
                </div>
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="small"
                  prepend-icon="mdi-link-plus"
                  @click="vincularAsesorModal = true"
                >
                  Vincular Asesor
                </v-btn>
              </v-card-title>

              <v-data-table
                :headers="[
                  { title: 'Asesor', key: 'asesorName' },
                  { title: 'Estado', key: 'estado' },
                  { title: 'Acciones', key: 'actions', align: 'end' }
                ]"
                :items="relaciones.vinculaciones"
                density="comfortable"
                hide-default-footer
                :items-per-page="10"
                no-data-text="No hay asesores técnicos vinculados a esta hacienda"
              >
                <template v-slot:item.asesorName="{ item }">
                  <div class="font-weight-medium">
                    {{ item.expand?.asesor_id?.name || item.expand?.asesor_id?.username || 'Desconocido' }}
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ item.expand?.asesor_id?.email || 'N/A' }}</div>
                </template>
                <template v-slot:item.estado="{ item }">
                  <v-chip :color="item.estado === 'activa' ? 'success' : 'grey'" size="small" variant="tonal">
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
        </v-window>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 px-4 bg-surface">
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
      :plan-limits="planLimits"
      :current-role-counts="currentRoleCounts"
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
import { USER_ROLES, ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
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

const emit = defineEmits(['update:modelValue', 'updated'])

const haciendaManagementStore = useHaciendaManagementStore()
const uiFeedbackStore = useUiFeedbackStore()

const activeTab = ref('general')
const haciendaMetrics = ref(null)
const metricsLoading = ref(false)
const haciendaActivity = ref([])
const relaciones = ref({ vinculaciones: [], paquetes: [], recetas: [] })
const suspensionReason = ref('')
const suspensionLoading = ref(false)

// Estados para edición en Tab 1 (General & Configuración)
const generalFormRef = ref(null)
const generalFormValid = ref(true)
const generalSaving = ref(false)
const avatarDeleting = ref(false)
const generalForm = ref({
  name: '',
  administrador: null,
  descripcion: '',
  ubicacion: '',
  ai_config: {
    provider: 'openrouter',
    model: '',
    base_url: '',
    auth_token: ''
  }
})

// Estados para edición inline en Tab 3 (Plan & Módulos)
const selectedPlan = ref('free')
const selectedModules = ref([])
const planSaving = ref(false)
const modulesSaving = ref(false)

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

const currentPlanObj = computed(() => {
  if (!props.hacienda) return null
  const planId = props.hacienda.plan?.id || props.hacienda.plan
  return props.planesList.find(p => p.id === planId) || props.hacienda.plan || null
})

const currentPlanName = computed(() => {
  if (!currentPlanObj.value) return 'N/A'
  return currentPlanObj.value.name || currentPlanObj.value.nombre || currentPlanObj.value.id || 'N/A'
})

const currentHaciendaUsers = computed(() => {
  if (!props.hacienda?.id) return []
  return props.usersList.filter(u => u.hacienda === props.hacienda.id)
})

const currentMemberIds = computed(() => {
  return currentHaciendaUsers.value.map(u => u.id)
})

const planLimits = computed(() => {
  const plan = currentPlanObj.value || {}
  return {
    operadores: plan.operadores || 0,
    auditores: plan.auditores || 0,
    maxAdmin: 1
  }
})

const currentRoleCounts = computed(() => {
  const users = currentHaciendaUsers.value
  return {
    operadores: users.filter(u => (u.role || USER_ROLES.OPERADOR) === USER_ROLES.OPERADOR).length,
    auditores: users.filter(u => u.role === USER_ROLES.AUDITOR).length,
    administradores: users.filter(u => u.role === USER_ROLES.ADMINISTRADOR).length
  }
})

const totalQuotaLimit = computed(() => {
  const limit = (planLimits.value.operadores || 0) + (planLimits.value.auditores || 0) + 1
  return limit > 1 ? limit : '∞'
})

const currentAsesorIds = computed(() => {
  return (relaciones.value.vinculaciones || [])
    .filter(v => v.estado === 'activa')
    .map(v => v.asesor_id || v.expand?.asesor_id?.id)
    .filter(Boolean)
})

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Operador'
}

function getRoleColor(role) {
  return ROLE_COLORS[role] || 'grey'
}

function initForms() {
  if (!props.hacienda) return

  generalForm.value = {
    name: props.hacienda.name || props.hacienda.nombre || '',
    administrador: props.hacienda.owner || props.hacienda.administrador || null,
    descripcion: props.hacienda.descripcion || props.hacienda.info || '',
    ubicacion: props.hacienda.ubicacion || props.hacienda.location || '',
    ai_config: {
      provider: props.hacienda.ai_config?.provider || 'openrouter',
      model: props.hacienda.ai_config?.model || '',
      base_url: props.hacienda.ai_config?.base_url || '',
      auth_token: props.hacienda.ai_config?.auth_token || ''
    }
  }

  selectedPlan.value = props.hacienda.plan?.id || props.hacienda.plan || 'free'
  selectedModules.value = Array.isArray(props.hacienda.active_modules) ? [...props.hacienda.active_modules] : []
}

watch(() => props.modelValue, (val) => {
  if (val && props.hacienda?.id) {
    activeTab.value = 'general'
    initForms()
    loadHaciendaDetails(props.hacienda.id)
  }
})

watch(() => props.hacienda, (newHacienda) => {
  if (newHacienda && props.modelValue) {
    initForms()
  }
}, { deep: true })

async function handleSaveGeneralInfo() {
  if (!generalForm.value.name?.trim()) {
    uiFeedbackStore.showSnackbar('El nombre de la hacienda es obligatorio', 'warning')
    return
  }

  generalSaving.value = true
  try {
    const payload = {
      name: generalForm.value.name.trim(),
      nombre: generalForm.value.name.trim(),
      descripcion: generalForm.value.descripcion || '',
      info: generalForm.value.descripcion || '',
      ubicacion: generalForm.value.ubicacion || '',
      location: generalForm.value.ubicacion || '',
      owner: generalForm.value.administrador || null,
      administrador: generalForm.value.administrador || null,
      ai_config: generalForm.value.ai_config
    }

    await haciendaManagementStore.updateHacienda(props.hacienda.id, payload)
    uiFeedbackStore.showSnackbar('Configuración general actualizada exitosamente', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al actualizar configuración general', 'error')
  } finally {
    generalSaving.value = false
  }
}

async function handleDeleteAvatar() {
  if (!props.hacienda?.id) return
  const confirmed = await uiFeedbackStore.showConfirm(
    'Eliminar Avatar',
    '¿Está seguro de eliminar el avatar de esta hacienda?',
    'warning',
    'mdi-delete'
  )
  if (!confirmed) return

  avatarDeleting.value = true
  try {
    await haciendaManagementStore.updateHacienda(props.hacienda.id, { avatar: null })
    uiFeedbackStore.showSnackbar('Avatar eliminado exitosamente', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al eliminar avatar', 'error')
  } finally {
    avatarDeleting.value = false
  }
}

async function handleSavePlan() {
  if (!props.hacienda?.id) return
  planSaving.value = true
  try {
    await haciendaManagementStore.configurePlan(props.hacienda.id, { plan: selectedPlan.value })
    uiFeedbackStore.showSnackbar('Plan actualizado correctamente', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al actualizar el plan', 'error')
  } finally {
    planSaving.value = false
  }
}

async function handleSaveModules() {
  if (!props.hacienda?.id) return
  modulesSaving.value = true
  try {
    await haciendaManagementStore.toggleModules(props.hacienda.id, selectedModules.value)
    uiFeedbackStore.showSnackbar('Módulos actualizados correctamente', 'success')
    onDataUpdated()
  } catch (err) {
    uiFeedbackStore.showSnackbar(err.message || 'Error al actualizar los módulos', 'error')
  } finally {
    modulesSaving.value = false
  }
}

async function loadHaciendaDetails(haciendaId) {
  metricsLoading.value = true
  try {
    const [metrics, activity, vincs] = await Promise.all([
      haciendaManagementStore.getHaciendaMetrics(haciendaId),
      haciendaManagementStore.fetchHaciendaActivity(haciendaId),
      haciendaManagementStore.fetchVinculacionesHacienda(haciendaId)
    ])
    haciendaMetrics.value = metrics
    haciendaActivity.value = activity || []
    relaciones.value = { vinculaciones: vincs || [], paquetes: [], recetas: [] }
  } catch (err) {
    console.error('Error al cargar detalles de hacienda:', err)
  } finally {
    metricsLoading.value = false
  }
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
