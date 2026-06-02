<template>
  <v-container fluid class="haciendas-management">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">Gestión de Haciendas</h2>
      <v-btn v-role="'HACIENDAS_MANAGE'" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Nueva Hacienda
      </v-btn>
    </div>

    <!-- Filtros y Búsqueda -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              label="Buscar por nombre"
              prepend-icon="mdi-magnify"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filterStatus"
              label="Estado"
              :items="[
                { title: 'Activas', value: 'active' },
                { title: 'Suspendidas', value: 'suspended' },
                { title: 'Inactivas', value: 'inactive' }
              ]"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn color="secondary" @click="exportToMarkdown" class="mr-2">
              <v-icon start>mdi-language-markdown</v-icon>
              Exportar MD
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Grid de Haciendas -->
    <v-row>
      <v-col
        v-for="hacienda in filteredHaciendas"
        :key="hacienda.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card hover class="hacienda-card">
          <v-card-text>
            <div class="d-flex justify-space-between align-start mb-2">
              <h3 class="text-h6">{{ hacienda.name || hacienda.nombre }}</h3>
              <v-chip :color="getStatusColor(hacienda.status)" size="small">
                {{ formatStatus(hacienda.status) }}
              </v-chip>
            </div>

            <p class="text-body-2 text-grey mb-2" v-html="hacienda.info || hacienda.descripcion || 'Sin descripción'"></p>

            <v-divider class="my-2" />

            <div class="text-body-2">
              <p><strong>Ubicación:</strong> {{ hacienda.location || hacienda.ubicacion || 'N/A' }}</p>
              <p><strong>Plan:</strong> {{ hacienda.plan?.name || hacienda.plan?.nombre || 'N/A' }}</p>
              <p><strong>Propietario/Admin:</strong> {{ getOwnerName(hacienda) }}</p>
              <p>
                <strong>Usuarios:</strong>
                {{ hacienda.users?.length || getHaciendaUsersCount(hacienda.id) || 0 }}
              </p>
              <p><strong>Creada:</strong> {{ formatDate(hacienda.created) }}</p>
            </div>

            <v-chip-group column v-if="hacienda.active_modules?.length" class="mt-2">
              <v-chip
                v-for="moduleId in hacienda.active_modules"
                :key="moduleId"
                size="small"
                color="primary"
                variant="outlined"
              >
                {{ getModuleName(moduleId) }}
              </v-chip>

            </v-chip-group>
          </v-card-text>

          <v-card-actions>
            <v-btn icon="mdi-eye" size="small" variant="text" @click="viewHacienda(hacienda)" />
            <v-btn v-role="'HACIENDAS_MANAGE'" icon="mdi-pencil" size="small" variant="text" @click="editHacienda(hacienda)" />
            <v-btn
              v-role="'HACIENDAS_MANAGE'"
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="confirmDelete(hacienda)"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- No Data -->
    <div v-if="!filteredHaciendas.length && !loading" class="text-center py-8">
      <v-icon size="64" color="grey">mdi-barn-off</v-icon>
      <p class="text-grey mt-2">No se encontraron haciendas</p>
    </div>

    <!-- Loading -->
    <v-overlay v-model="loading" class="align-center justify-center" contained>
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-overlay>

    <!-- Dialog: Crear/Editar Hacienda -->
    <v-dialog v-model="haciendaDialog" max-width="800" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          {{ editingHacienda ? 'Editar Hacienda' : 'Nueva Hacienda' }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-form ref="haciendaForm" v-model="formValid" @submit.prevent="saveHacienda">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Información Principal</h3>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.name"
                  label="Nombre"
                  :rules="[v => !!v || 'Nombre requerido']"
                  required
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="formData.administrador"
                  :items="usersList"
                  item-title="label"
                  item-value="id"
                  label="Propietario / Administrador"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="formData.descripcion"
                  label="Información Adicional (Descripción)"
                  rows="2"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.ubicacion"
                  label="Ubicación"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="formData.ai_config.provider"
                  :items="['custom', 'openrouter']"
                  label="AI Provider"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="formData.ai_config.model"
                  label="AI Model"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="formData.ai_config.base_url"
                  label="AI Base URL"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="formData.ai_config.auth_token"
                  label="AI Auth Token"
                  type="password"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6" v-if="editingHacienda && hasAvatar">
                <v-btn color="error" variant="outlined" size="small" @click="deleteAvatar">
                  Eliminar Avatar
                </v-btn>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <h3 class="text-subtitle-1 font-weight-bold mb-2">Configuración y Estado</h3>
            <v-row>
              <v-col cols="12" md="6">
                <span class="text-caption">Estado</span>
                <v-radio-group v-model="formData.status" inline>
                  <v-radio label="Activa" value="active"></v-radio>
                  <v-radio label="Suspendida" value="suspended"></v-radio>
                  <v-radio label="Inactiva" value="inactive"></v-radio>
                </v-radio-group>
              </v-col>
              <v-col cols="12" md="6" v-if="formData.status === 'suspended'">
                <v-text-field
                  v-model="formData.suspension_reason"
                  label="Razón de suspensión"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <template v-if="editingHacienda">
              <v-divider class="my-4"></v-divider>
              <h3 class="text-subtitle-1 font-weight-bold mb-2">Suscripción y Módulos</h3>
              <v-row>
                <v-col cols="12" md="6">
                  <span class="text-caption">Plan</span>
                <v-radio-group v-model="formData.plan" inline>
                  <v-radio
                    v-for="plan in planesList"
                    :key="plan.id"
                    :label="plan.nombre || plan.name"
                    :value="plan.id"
                  ></v-radio>
                </v-radio-group>
              </v-col>
              <v-col cols="12">
                <span class="text-caption">Módulos Activos</span>
                <v-row class="mt-1">
                  <v-col cols="12" sm="6" md="4" v-for="mod in modulosList" :key="mod.id">
                    <v-checkbox
                      v-model="formData.active_modules"
                      :value="mod.id"
                      hide-details
                      density="compact"
                    >
                      <template v-slot:label>
                        <span class="text-body-2">{{ mod.name || mod.nombre }}</span>
                      </template>
                    </v-checkbox>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </template>
            <template v-else>
              <v-alert type="info" class="mt-4" density="compact">
                Al crear la hacienda se asignará automáticamente el plan gratuito sin módulos extra.
              </v-alert>
            </template>

          </v-form>
        </v-card-text>
        <v-card-actions class="pb-4 pr-4">
          <v-spacer />
          <v-btn color="error" variant="elevated" @click="closeDialog">CANCELAR</v-btn>
          <v-btn color="success" variant="elevated" :disabled="!formValid" @click="saveHacienda">GUARDAR</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Ver Hacienda -->
    <v-dialog v-model="viewDialog" max-width="1000">
      <v-card>
        <v-card-title style="background-color: #3F51B5; color: white;">Detalles de: {{ selectedHacienda?.name || selectedHacienda?.nombre }} 
          <v-chip class="ml-4"
            color="primary"
            size="small"
            variant="flat"
          >
            <v-icon icon="mdi-label" start></v-icon>Plan: {{ selectedHacienda?.plan?.name || selectedHacienda?.plan?.nombre || 'N/A' }}</v-chip>
          
                          <v-chip class="ml-4"            variant="flat"
 :color="getStatusColor(selectedHacienda?.status)" size="small"><v-icon icon="mdi-information" start></v-icon>
                      {{ formatStatus(selectedHacienda?.status) }}
                    </v-chip>

                          <v-chip class="ml-4 " style="color: white;"       variant="flat"
 color="secondary" size="small"><v-icon icon="mdi-calendar-clock" start></v-icon>Creado:
                      {{ formatDate(selectedHacienda?.created) }}
                    </v-chip>

          </v-card-title>
        <v-card-text class="pt-4">
          <v-row>
            <!-- Columna Izquierda: Detalles Básicos -->
            <v-col cols="12" md="4">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Descripción</v-list-item-title>
                  <v-list-item-subtitle style="white-space: pre-wrap" v-html="selectedHacienda?.info || selectedHacienda?.descripcion || 'N/A'"></v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Ubicación</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedHacienda?.location || selectedHacienda?.ubicacion || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>

                  <v-list-item-subtitle>

                    <div v-if="selectedHacienda?.status === 'suspended'" class="text-caption mt-1 text-error">
                      Razón: {{ selectedHacienda?.suspension_reason || 'N/A' }}
                    </div>
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Módulos activos</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip-group column v-if="selectedHacienda?.active_modules?.length">
                      <v-chip
                        v-for="moduleId in selectedHacienda.active_modules"
                        :key="moduleId"
                        color="secondary"
                        size="small"
                      >
                        {{ getModuleName(moduleId) }}
                      </v-chip>
                    </v-chip-group>
                    <span v-else>Ninguno</span>
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title class="font-weight-bold mb-2">Operadores / Auditores</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-list density="compact" class="bg-transparent pa-0" v-if="getHaciendaUsers(selectedHacienda?.id).length">
                      <v-list-item
                        v-for="user in getHaciendaUsers(selectedHacienda?.id)"
                        :key="user.id"
                        class="px-0 py-1"
                      >
                        <template v-slot:prepend>
                          <v-icon icon="mdi-account-circle" color="primary" size="small" class="mr-2"></v-icon>
                        </template>
                        <v-list-item-title class="text-body-2">{{ user.label }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                    <span v-else class="text-caption">Ninguno</span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <!-- Columna Derecha: Tablas de Operación -->
            <v-col cols="12" md="8">
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">Vinculaciones Asesor</v-card-title>
                <v-data-table
                  :headers="[{ title: 'Asesor', key: 'asesorName' }, { title: 'Acciones', key: 'actions', align: 'end' }]"
                  :items="relaciones.vinculaciones"
                  density="compact"
                  hide-default-footer
                  :items-per-page="5"
                >
                  <template v-slot:item.asesorName="{ item }">
                    {{ item.expand?.asesor_id?.email || item.expand?.asesor_id?.username || 'Desconocido' }}
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="showDetailItem('vinculacion', item)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem('vinculaciones_asesor', item.id)" />
                  </template>
                </v-data-table>
              </v-card>

              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1">Paquetes de Evaluación</v-card-title>
                <v-data-table
                  :headers="[{ title: 'Título', key: 'titulo' }, { title: 'Estado', key: 'estado' }, { title: 'Acciones', key: 'actions', align: 'end' }]"
                  :items="relaciones.paquetes"
                  density="compact"
                  hide-default-footer
                  :items-per-page="5"
                >
                  <template v-slot:item.actions="{ item }">
                    <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="showDetailItem('paquete', item)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem('paquetes_evaluacion', item.id)" />
                  </template>
                </v-data-table>
              </v-card>

              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">Recetas</v-card-title>
                <v-data-table
                  :headers="[{ title: 'Código', key: 'codigo' }, { title: 'Asesor', key: 'asesorName' }, { title: 'Acciones', key: 'actions', align: 'end' }]"
                  :items="relaciones.recetas"
                  density="compact"
                  hide-default-footer
                  :items-per-page="5"
                >
                  <template v-slot:item.asesorName="{ item }">
                    {{ item.expand?.asesor_id?.email || 'Desconocido' }}
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="showDetailItem('receta', item)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteItem('recetas', item.id)" />
                  </template>
                </v-data-table>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pb-4 pr-4">
          <v-btn color="primary" variant="text" @click="exportHaciendaToMarkdown(selectedHacienda)">
            Exportar a MD
          </v-btn>
          <v-spacer />
          <v-btn color="grey" variant="elevated" @click="viewDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Eliminación -->
    <v-dialog v-model="deleteDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6 bg-error text-white">Confirmar Eliminación</v-card-title>
        <v-card-text class="pt-4">
          ¿Está seguro de eliminar la hacienda <strong>{{ selectedHacienda?.name || selectedHacienda?.nombre }}</strong>?
          <v-alert type="warning" class="mt-4" density="compact" variant="tonal">
            Esta acción eliminará al usuario admin de la hacienda, así como a los operadores, auditores y todos los datos asociados (siembras, recetas, actividades, etc.)
          </v-alert>
        </v-card-text>
        <v-card-actions class="pb-4 pr-4">
          <v-spacer />
          <v-btn color="grey" variant="elevated" @click="deleteDialog = false">CANCELAR</v-btn>
          <v-btn color="error" variant="elevated" @click="deleteHacienda">ELIMINAR</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Detalles de Item Operacional -->
    <v-dialog v-model="detailItemDialog" max-width="600">
      <v-card>
        <v-card-title class="bg-secondary text-white">
          Detalles de {{ clickedItemType === 'vinculacion' ? 'Vinculación de Asesor' : clickedItemType === 'paquete' ? 'Paquete de Evaluación' : 'Receta' }}
        </v-card-title>
        <v-card-text class="pt-4">
          <div v-if="clickedItem">
            <template v-if="clickedItemType === 'vinculacion'">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Asesor</v-list-item-title>
                  <v-list-item-subtitle>{{ clickedItem.expand?.asesor_id?.name || clickedItem.expand?.asesor_id?.username || 'Desconocido' }} ({{ clickedItem.expand?.asesor_id?.email || 'N/A' }})</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Fecha Vinculación</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(clickedItem.created) }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">ID Vinculación</v-list-item-title>
                  <v-list-item-subtitle>{{ clickedItem.id }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
            <template v-else-if="clickedItemType === 'paquete'">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Título</v-list-item-title>
                  <v-list-item-subtitle>{{ clickedItem.titulo || clickedItem.title }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Descripción</v-list-item-title>
                  <v-list-item-subtitle style="white-space: pre-wrap">{{ clickedItem.descripcion || 'Sin descripción' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Estado</v-list-item-title>
                  <v-list-item-subtitle>{{ clickedItem.estado || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Fecha Envío</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(clickedItem.created) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
            <template v-else-if="clickedItemType === 'receta'">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Código</v-list-item-title>
                  <v-list-item-subtitle>{{ clickedItem.codigo }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Asesor</v-list-item-title>
                  <v-list-item-subtitle>{{ clickedItem.expand?.asesor_id?.name || 'Desconocido' }} ({{ clickedItem.expand?.asesor_id?.email || 'N/A' }})</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Diagnóstico</v-list-item-title>
                  <v-list-item-subtitle style="white-space: pre-wrap">{{ clickedItem.diagnostico || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Prescripción</v-list-item-title>
                  <v-list-item-subtitle style="white-space: pre-wrap">{{ clickedItem.prescripcion || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Fecha Receta</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(clickedItem.created) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
          </div>
        </v-card-text>
        <v-card-actions class="pb-4 pr-4">
          <v-spacer />
          <v-btn color="grey" variant="elevated" @click="detailItemDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { exportHaciendasToMarkdown } from '@/utils/exporters/markdownExporter'
import { formatDate } from '@/utils/formatters'
import { useHaciendaManagementStore } from '@/stores/haciendaManagementStore'
import { usePlanStore } from '@/stores/planStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const uiFeedbackStore = useUiFeedbackStore()
const haciendaManagementStore = useHaciendaManagementStore()
const planStore = usePlanStore()

// Estado
const loading = ref(false)
const haciendas = ref([])
const planesList = ref([])
const modulosList = ref([])
const usersList = ref([])
const searchQuery = ref('')
const filterStatus = ref(null)
const haciendaDialog = ref(false)
const viewDialog = ref(false)
const deleteDialog = ref(false)
const editingHacienda = ref(null)
const selectedHacienda = ref(null)
const formValid = ref(false)
const haciendaForm = ref(null)
const hasAvatar = ref(false)

const relaciones = ref({
  vinculaciones: [],
  paquetes: [],
  recetas: []
})

// Dialog de detalle para items operacionales
const detailItemDialog = ref(false)
const clickedItem = ref(null)
const clickedItemType = ref('')

function showDetailItem(type, item) {
  clickedItemType.value = type
  clickedItem.value = item
  detailItemDialog.value = true
}

function getModuleName(id) {
  const mod = modulosList.value.find(m => m.id === id)
  return mod ? (mod.name || mod.nombre) : id
}

// Formulario
const formData = ref({
  name: '',
  descripcion: '',
  ubicacion: '',
  plan: null,
  status: 'active',
  suspension_reason: '',
  administrador: null,
  active_modules: [],
  ai_config: { provider: 'custom', base_url: '', model: '', auth_token: '' }
})

// Haciendas filtradas
const filteredHaciendas = computed(() => {
  let result = haciendas.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(h => (h.name || h.nombre || '').toLowerCase().includes(query))
  }
  if (filterStatus.value) {
    result = result.filter(h => h.status === filterStatus.value)
  }
  return result
})

// Cargar datos iniciales
onMounted(async () => {
  await Promise.all([fetchHaciendas(), fetchPlanes(), fetchModulos(), fetchUsers()])
})

// Obtener haciendas
async function fetchHaciendas() {
  loading.value = true
  try {
    await haciendaManagementStore.fetchHaciendas({ expand: 'plan,owner,users_via_hacienda,modulos' })
    haciendas.value = haciendaManagementStore.haciendas.map(h => ({
      ...h,
      users: h.expand?.users_via_hacienda || h.expand?.users || [],
      plan: h.expand?.plan || null
    }))
  } catch (error) {
    handleError(error, 'Error al cargar haciendas')
  } finally {
    loading.value = false
  }
}

// Obtener planes
async function fetchPlanes() {
  try {
    planesList.value = await planStore.fetchAvailablePlans()
  } catch (error) {
    handleError(error, 'Error al cargar planes')
  }
}

async function fetchModulos() {
  try {
    modulosList.value = await pb.collection('modulos').getFullList()
  } catch(error) {
    console.error(error)
  }
}

async function fetchUsers() {
  try {
    const records = await pb.collection('users').getFullList()
    usersList.value = records.map(u => ({
      id: u.id,
      label: `${u.name || u.firstname || u.email} (${u.role})`,
      role: u.role,
      hacienda: u.hacienda
    }))
  } catch(error) {
    console.error(error)
  }
}

// Abrir dialog de creación
function openCreateDialog() {
  editingHacienda.value = null
  hasAvatar.value = false
  formData.value = {
    name: '',
    descripcion: '',
    ubicacion: '',
    plan: null,
    status: 'active',
    suspension_reason: '',
    administrador: null,
    active_modules: [],
    ai_config: { provider: 'custom', base_url: '', model: '', auth_token: '' }
  }

  haciendaForm.value?.reset()
  haciendaDialog.value = true
}

// Editar hacienda
async function editHacienda(hacienda) {
  // Fetch datos frescos desde PocketBase para tener active_modules actualizado
  let h = hacienda
  try {
    const fresh = await pb.collection('Haciendas').getOne(hacienda.id, { expand: 'plan' })
    h = { ...fresh, plan: fresh.expand?.plan || hacienda.plan }
    // Actualizar copia local del store
    const idx = haciendaManagementStore.haciendas.findIndex(x => x.id === h.id)
    if (idx !== -1) haciendaManagementStore.haciendas[idx] = h
  } catch (e) {
    console.warn('No se pudo refrescar hacienda, usando copia local', e)
  }

  editingHacienda.value = h
  hasAvatar.value = !!h.avatar
  formData.value = {
    name: h.name || h.nombre,
    descripcion: h.info || h.descripcion || '',
    ubicacion: h.location || h.ubicacion || '',
    plan: h.plan?.id || h.plan || null,
    status: h.status || 'active',
    suspension_reason: h.suspension_reason || '',
    administrador: h.owner || h.administrador || null,
    active_modules: Array.isArray(h.active_modules) ? h.active_modules : (h.active_modules ? [h.active_modules] : []),
    ai_config: h.ai_config || { provider: 'custom', base_url: '', model: '', auth_token: '' }
  }
  haciendaDialog.value = true
}

// Ver hacienda
async function viewHacienda(hacienda) {
  // Fetch datos frescos desde PocketBase para tener active_modules actualizado
  try {
    const fresh = await pb.collection('Haciendas').getOne(hacienda.id, { expand: 'plan' })
    // Preservar el plan expandido si vino de la lista
    selectedHacienda.value = { ...fresh, plan: fresh.expand?.plan || hacienda.plan }
  } catch (e) {
    console.warn('No se pudo refrescar hacienda, usando copia local', e)
    selectedHacienda.value = hacienda
  }
  await fetchRelaciones(hacienda.id)
  viewDialog.value = true
}

async function fetchRelaciones(haciendaId) {
  try {
    const [vincs, packs, recs] = await Promise.all([
      pb.collection('vinculaciones_asesor').getFullList({ filter: `hacienda_id="${haciendaId}"`, expand: 'asesor_id' }).catch(()=>([])),
      pb.collection('paquetes_evaluacion').getFullList({ filter: `hacienda_id="${haciendaId}"` }).catch(()=>([])),
      pb.collection('recetas').getFullList({ filter: `hacienda_id="${haciendaId}"`, expand: 'asesor_id' }).catch(()=>([]))
    ])
    relaciones.value.vinculaciones = vincs
    relaciones.value.paquetes = packs
    relaciones.value.recetas = recs
  } catch (err) {
    console.error(err)
  }
}

async function deleteItem(collection, id) {
  if (!confirm('¿Seguro de eliminar este registro?')) return;
  try {
    await pb.collection(collection).delete(id);
    uiFeedbackStore.showSnackbar('Registro eliminado', 'success');
    if (selectedHacienda.value) {
      await fetchRelaciones(selectedHacienda.value.id);
    }
  } catch(err) {
    uiFeedbackStore.showSnackbar('Error al eliminar', 'error');
  }
}

// Confirmar eliminación
function confirmDelete(hacienda) {
  selectedHacienda.value = hacienda
  deleteDialog.value = true
}

// GUARDAR hacienda
async function saveHacienda() {
  const valid = await haciendaForm.value?.validate()
  if (!valid?.valid) return

  loading.value = true
  try {
    const data = {
      nombre: formData.value.name,
      name: formData.value.name,
      info: formData.value.descripcion,
      location: formData.value.ubicacion,
      descripcion: formData.value.descripcion,
      ubicacion: formData.value.ubicacion,
      status: formData.value.status,
      suspension_reason: formData.value.status === 'suspended' ? formData.value.suspension_reason : '',
      owner: formData.value.administrador,
      ai_config: formData.value.ai_config
    }

    if (editingHacienda.value) {
      data.plan = formData.value.plan;
      data.active_modules = formData.value.active_modules;
      await haciendaManagementStore.updateHacienda(editingHacienda.value.id, data)
      showSnackbar('Hacienda actualizada correctamente', 'success')
    } else {
      const gratisPlan = planesList.value.find(p => p.nombre === 'gratis' || p.name === 'gratis')
      if (gratisPlan) {
        data.plan = gratisPlan.id;
      }
      data.active_modules = [];
      data.metricas = {
        area_total: { tipo: 'text', valor: 'Por determinar', descripcion: 'Área total en hectáreas' },
        propietario: { tipo: 'text', valor: 'Por determinar', descripcion: 'Nombre del propietario' },
        administrador: { tipo: 'text', valor: 'Por determinar', descripcion: 'Nombre del administrador' },
        certificaciones: { tipo: 'text', valor: 'Por determinar', descripcion: 'Certificaciones de la hacienda' }
      };
      await haciendaManagementStore.createHacienda(data)
      showSnackbar('Hacienda creada correctamente', 'success')
    }

    closeDialog()
    await fetchHaciendas()
  } catch (error) {
    handleError(error, editingHacienda.value ? 'Error al actualizar hacienda' : 'Error al crear hacienda')
  } finally {
    loading.value = false
  }
}

async function deleteAvatar() {
  if (!editingHacienda.value) return;
  try {
    await haciendaManagementStore.updateHacienda(editingHacienda.value.id, { avatar: null });
    hasAvatar.value = false;
    showSnackbar('Avatar eliminado', 'success');
  } catch(err) {
    showSnackbar('Error al eliminar avatar', 'error');
  }
}

// Eliminar hacienda
async function deleteHacienda() {
  loading.value = true
  try {
    await haciendaManagementStore.deleteHacienda(selectedHacienda.value.id)
    showSnackbar('Hacienda eliminada correctamente', 'success')
    deleteDialog.value = false
    selectedHacienda.value = null
    await fetchHaciendas()
  } catch (error) {
    handleError(error, 'Error al eliminar hacienda')
  } finally {
    loading.value = false
  }
}

// Cerrar dialog
function closeDialog() {
  haciendaDialog.value = false
  editingHacienda.value = null
  formData.value = {
    name: '',
    descripcion: '',
    ubicacion: '',
    plan: null,
    status: 'active',
    suspension_reason: '',
    administrador: null,
    active_modules: [],
    ai_config: { provider: 'custom', base_url: '', model: '', auth_token: '' }
  }
}

// Exportar a Markdown
async function exportToMarkdown() {
  try {
    const markdown = exportHaciendasToMarkdown(filteredHaciendas.value)
    downloadMarkdown(markdown, 'haciendas.md')
    showSnackbar(`${filteredHaciendas.value.length} haciendas exportadas`, 'success')
  } catch (error) {
    handleError(error, 'Error al exportar haciendas')
  }
}

// Exportar hacienda individual
function exportHaciendaToMarkdown(hacienda) {
  try {
    const markdown = exportHaciendasToMarkdown([hacienda])
    downloadMarkdown(markdown, `hacienda_${(hacienda.name||hacienda.nombre).replace(/\s+/g, '_')}.md`)
    showSnackbar('Hacienda exportada', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar hacienda')
  }
}

// Descargar archivo MD
function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getStatusColor(status) {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'warning'
  return 'grey'
}

function formatStatus(status) {
  if (status === 'active') return 'Activa'
  if (status === 'suspended') return 'Suspendida'
  return 'Inactiva'
}

function getOwnerName(hacienda) {
  if (!hacienda) return 'N/A'
  const ownerId = hacienda.owner || hacienda.administrador
  if (!ownerId) return 'N/A'
  const user = usersList.value.find(u => u.id === ownerId)
  return user ? user.label : 'ID: ' + ownerId
}

function getHaciendaUsers(haciendaId) {
  if (!haciendaId) return []
  return usersList.value.filter(u => u.hacienda === haciendaId)
}

function getHaciendaUsersCount(haciendaId) {
  return getHaciendaUsers(haciendaId).length
}

function showSnackbar(message, color = 'success') {
  uiFeedbackStore.showSnackbar(message, color)
}
</script>

<style scoped>
.haciendas-management {
  max-width: 1400px;
  margin: 0 auto;
}

.hacienda-card {
  transition: transform 0.2s;
}

.hacienda-card:hover {
  transform: translateY(-2px);
}
</style>
