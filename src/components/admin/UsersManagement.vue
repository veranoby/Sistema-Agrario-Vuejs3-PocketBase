<template>
  <v-container fluid class="users-management">
    <div class="d-flex justify-space-between align-center mb-4">
      <h2 class="text-h5">Gestión de Usuarios</h2>
      <v-btn v-role="'USERS_MANAGE'" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Nuevo Usuario
      </v-btn>


    </div>

    <!-- Filtros y Búsqueda -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="searchQuery"
              label="Buscar por email o nombre"
              prepend-icon="mdi-magnify"
              clearable
              dense
              outlined
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filterRole"
              label="Filtrar por rol"
              :items="roles"
              clearable
              dense
              outlined
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filterStatus"
              label="Estado"
              :items="[
                { title: 'Activos', value: 'active' },
                { title: 'Suspendidos', value: 'suspended' }
              ]"
              clearable
              dense
              outlined
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filterHacienda"
              label="Filtrar por hacienda"
              :items="haciendasList"
              item-title="title"
              item-value="value"
              clearable
              dense
              outlined
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center justify-end">
            <v-btn color="secondary" @click="exportToMarkdown" class="w-100">
              <v-icon start>mdi-language-markdown</v-icon>
              Exportar MD
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Tabla de Usuarios -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredUsers"
        :loading="loading"
        :items-per-page="10"
        show-select
        @update:model-value="onSelectionChange"
      >
        <!-- Name -->
        <template v-slot:item.name="{ item }">
          {{ item.name || item.firstname }} {{ item.lastname }}
        </template>

        <!-- Role Badge -->
        <template v-slot:item.role="{ item }">
          <v-chip :color="getRoleColor(item.role)" size="small" label>
            {{ formatRole(item.role) }}
          </v-chip>
        </template>

        <!-- Verified Badge -->
        <template v-slot:item.verified="{ item }">
          <v-chip :color="item.verified ? 'success' : 'warning'" size="small">
            {{ item.verified ? 'Sí' : 'No' }}
          </v-chip>
        </template>

        <!-- Status Badge -->
        <template v-slot:item.status="{ item }">
          <v-chip :color="getUserStatusColor(item.status)" size="small">
            {{ formatUserStatus(item.status) || 'Activo' }}
          </v-chip>
        </template>

        <!-- Haciendas -->
        <template v-slot:item.haciendas="{ item }">
          {{ item.expand?.hacienda?.nombre || item.expand?.hacienda?.name || 'Sin Hacienda' }}
        </template>

        <!-- Actions -->
        <template v-slot:item.actions="{ item }">
          <v-btn icon="mdi-eye" size="small" variant="text" @click="viewUser(item)" />
          <v-btn v-role="'USERS_MANAGE'" icon="mdi-pencil" size="small" variant="text" @click="editUser(item)" />
          <v-btn
            v-role="'USERS_MANAGE'"
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          />


        </template>

        <!-- No Data -->
        <template #no-data>
          <div class="text-center py-4">
            <v-icon size="64" color="grey">mdi-account-off</v-icon>
            <p class="text-grey mt-2">No se encontraron usuarios</p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog: Crear/Editar Usuario -->
    <UserAdminDialog v-model="userDialog" :editing-user="editingUser" @saved="fetchUsers" />

    <!-- Dialog: Ver Usuario -->
    <v-dialog v-model="viewDialog" max-width="800">
      <v-card>
        <v-card-title class="bg-primary text-white">Detalles del Usuario</v-card-title>
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Email</v-list-item-title>
                <v-list-item-subtitle>{{ selectedUser?.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Nombre de usuario</v-list-item-title>
                <v-list-item-subtitle>{{ selectedUser?.username }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Nombre completo</v-list-item-title>
                <v-list-item-subtitle>{{ selectedUser?.name || selectedUser?.firstname }} {{ selectedUser?.lastname }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Cédula</v-list-item-title>
                <v-list-item-subtitle>{{ selectedUser?.cedula || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Dirección</v-list-item-title>
                <v-list-item-subtitle>{{ selectedUser?.direccion || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Información adicional</v-list-item-title>
                <v-list-item-subtitle>{{ selectedUser?.info || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
            </v-col>
            <v-col cols="12" md="6">
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Rol</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip :color="getRoleColor(selectedUser?.role)" size="small">
                    {{ formatRole(selectedUser?.role) }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Estado</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip :color="getUserStatusColor(selectedUser?.status)" size="small">
                    {{ formatUserStatus(selectedUser?.status) }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Email Verificado</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip :color="selectedUser?.verified ? 'success' : 'warning'" size="small">
                    {{ selectedUser?.verified ? 'Sí' : 'No' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Fecha de creación</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(selectedUser?.created) }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="selectedUser?.haciendas?.length">
                <v-list-item-title class="font-weight-bold">Haciendas asignadas</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip-group>
                    <v-chip
                      v-for="hacienda in selectedUser.haciendas"
                      :key="hacienda.id"
                      color="primary"
                      size="small"
                    >
                      {{ hacienda.name || hacienda.nombre }}
                    </v-chip>
                  </v-chip-group>
                </v-list-item-subtitle>
              </v-list-item>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pb-4 pr-4">
          <v-btn color="primary" variant="text" @click="exportUserToMarkdown(selectedUser)">
            Exportar a MD
          </v-btn>
          <v-spacer />
          <v-btn color="grey" variant="elevated" @click="viewDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirmar Eliminación</v-card-title>
        <v-card-text>
          ¿Está seguro de eliminar al usuario <strong>{{ selectedUser?.email }}</strong>?
          <v-alert type="warning" class="mt-2" density="compact">
            Esta acción eliminará también la hacienda vinculada, así como a los usuarios operadores y auditores, y las recetas entregadas a la hacienda. No se eliminarán los asesores.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" @click="deleteDialog = false">CANCELAR</v-btn>
          <v-btn color="error" @click="deleteUser">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { handleError } from '@/utils/errorHandler'
import { exportUsersToMarkdown } from '@/utils/exporters/markdownExporter'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useUserStore } from '@/stores/userStore'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventBus'
import UserAdminDialog from '@/components/admin/dialogs/UserAdminDialog.vue'
import { USER_ROLES, USER_STATUS, ROLE_OPTIONS } from '@/constants/roles'
import { formatRole, getRoleColor, formatDate, downloadMarkdown, getUserStatusColor, formatUserStatus } from '@/utils/formatters'

const localUserStatus = USER_STATUS;

const uiFeedbackStore = useUiFeedbackStore()
const userStore = useUserStore()
const { emit } = useEvents()

// Estado
const loading = ref(false)
const users = ref([])
const haciendas = ref([])
const searchQuery = ref('')
const filterRole = ref(null)
const filterStatus = ref(null)
const filterHacienda = ref(null)
const userDialog = ref(false)
const viewDialog = ref(false)
const deleteDialog = ref(false)
const editingUser = ref(null)
const selectedUser = ref(null)
const selectedUsers = ref([])
const userForm = ref(null)

// Formulario
const formData = ref({
  email: '',
  username: '',
  name: '',
  lastname: '',
  password: '',
  role: USER_ROLES.OPERADOR,
  haciendas: [],
  status: USER_STATUS.ACTIVE
})

// Roles disponibles (importados de constantes)
const roles = ROLE_OPTIONS

// Headers de tabla
const headers = [
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Usuario', key: 'username', sortable: true },
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Rol', key: 'role', sortable: true },
  { title: 'Email Verificado', key: 'verified', sortable: true },
  { title: 'Haciendas', key: 'haciendas', sortable: false },
  { title: 'Estado', key: 'status', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

// Usuarios filtrados
const filteredUsers = computed(() => {
  let result = users.value

  // Filtro por búsqueda
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.email?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.name?.toLowerCase().includes(query) ||
      u.firstname?.toLowerCase().includes(query) ||
      u.lastname?.toLowerCase().includes(query)
    )
  }

  // Filtro por rol
  if (filterRole.value) {
    result = result.filter(u => u.role === filterRole.value)
  }

  // Filtro por estado
  if (filterStatus.value) {
    result = result.filter(u => {
      const s = Array.isArray(u.status) ? u.status[0] : u.status
      return s === filterStatus.value || (s === undefined && filterStatus.value === 'active')
    })
  }

  // Filtro por hacienda
  if (filterHacienda.value) {
    result = result.filter(u => u.hacienda === filterHacienda.value || (u.haciendas && u.haciendas.some(h => h.id === filterHacienda.value)))
  }

  return result
})

// Lista de haciendas para UserForm (formato: title/value)
const haciendasList = computed(() => {
  return haciendas.value.map(h => ({ title: h.nombre || h.name || 'Sin nombre', value: h.id }))
})

// Cargar datos iniciales
onMounted(async () => {
  await Promise.all([fetchUsers(), fetchHaciendas()])
})

// Obtener usuarios
async function fetchUsers() {
  loading.value = true
  try {
    const records = await userStore.fetchUsers({ expand: 'hacienda' })
    // Mapear haciendas
    users.value = records.map(u => ({
      ...u,
      haciendas: u.expand?.hacienda ? [u.expand.hacienda] : [],
      status: u.status ?? 'active'
    }))
  } catch (error) {
    handleError(error, 'Error al cargar usuarios')
  } finally {
    loading.value = false
  }
}

// Obtener haciendas
async function fetchHaciendas() {
  try {
    haciendas.value = await userStore.fetchHaciendas()
  } catch (error) {
    handleError(error, 'Error al cargar haciendas')
  }
}

// Abrir dialog de creación
function openCreateDialog() {
  editingUser.value = null
  formData.value = {
    email: '',
    username: '',
    name: '',
    lastname: '',
    password: '',
    role: USER_ROLES.OPERADOR,
    haciendas: [],
    status: USER_STATUS.ACTIVE
  }
  userForm.value?.reset()
  userDialog.value = true
}

// Editar usuario
function editUser(user) {
  editingUser.value = user
  formData.value = {
    email: user.email,
    username: user.username,
    name: user.name || user.firstname,
    lastname: user.lastname,
    password: '',
    role: user.role,
    haciendas: user.haciendas?.map(h => h.id) || [],
    status: user.status || USER_STATUS.ACTIVE
  }
  userDialog.value = true
}

// Ver usuario
function viewUser(user) {
  selectedUser.value = user
  viewDialog.value = true
}

// Confirmar eliminación
function confirmDelete(user) {
  selectedUser.value = user
  deleteDialog.value = true
}

// GUARDAR usuario (recibe datos de UserForm)
async function saveUser(userFormData) {
  loading.value = true
  try {
    const haciendaId = userFormData.haciendas?.[0] || null

    if (editingUser.value) {
      // Actualizar
      const user = await userStore.updateUserWithForm(
        editingUser.value.id,
        userFormData,
        userFormData.role,
        haciendaId
      )
      emit(EVENTS.HACIENDA_UPDATED, { userId: user.id, haciendaId, role: userFormData.role })
      showSnackbar('Usuario actualizado correctamente', 'success')
    } else {
      // Crear
      const user = await userStore.registerUser(userFormData, userFormData.role, haciendaId)
      emit(EVENTS.USUARIO_ADDED, { userId: user.id, haciendaId, role: userFormData.role })
      showSnackbar('Usuario creado correctamente', 'success')
    }

    closeDialog()
    await fetchUsers()
  } catch (error) {
    handleError(error, editingUser.value ? 'Error al actualizar usuario' : 'Error al crear usuario')
  } finally {
    loading.value = false
  }
}

// Eliminar usuario
async function deleteUser() {
  loading.value = true
  try {
    await userStore.deleteUser(selectedUser.value.id, { soft: true })
    emit(EVENTS.USUARIO_REMOVED, { userId: selectedUser.value.id, soft: true })
    showSnackbar('Usuario eliminado correctamente', 'success')
    deleteDialog.value = false
    selectedUser.value = null
    await fetchUsers()
  } catch (error) {
    handleError(error, 'Error al eliminar usuario')
  } finally {
    loading.value = false
  }
}

// Cerrar dialog
function closeDialog() {
  userDialog.value = false
  editingUser.value = null
  formData.value = {}
}

// Selección múltiple
function onSelectionChange(selection) {
  selectedUsers.value = selection
}

// Exportar a Markdown
async function exportToMarkdown() {
  try {
    const usersToExport = selectedUsers.value.length ? selectedUsers.value : filteredUsers.value
    const markdown = exportUsersToMarkdown(usersToExport)
    downloadMarkdown(markdown, 'usuarios.md')
    showSnackbar(`${usersToExport.length} usuarios exportados`, 'success')
  } catch (error) {
    handleError(error, 'Error al exportar usuarios')
  }
}

// Exportar usuario individual
function exportUserToMarkdown(user) {
  try {
    const markdown = exportUsersToMarkdown([user])
    downloadMarkdown(markdown, `usuario_${user.username}.md`)
    showSnackbar('Usuario exportado', 'success')
  } catch (error) {
    handleError(error, 'Error al exportar usuario')
  }
}

// Utilidades (ahora importadas de @/utils/formatters)
function showSnackbar(message, color = 'success') {
  uiFeedbackStore.showSnackbar(message, color)
}
</script>

<style scoped>
.users-management {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
