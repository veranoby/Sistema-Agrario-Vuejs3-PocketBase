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
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              label="Buscar por email o nombre"
              prepend-icon="mdi-magnify"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filterRole"
              label="Filtrar por rol"
              :items="roles"
              clearable
              dense
              outlined
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filterStatus"
              label="Estado"
              :items="[
                { title: 'Activos', value: USER_STATUS.ACTIVE },
                { title: 'Inactivos', value: USER_STATUS.INACTIVE }
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
        <!-- Role Badge -->
        <template v-slot:item_role="{ item }">
          <v-chip :color="getRoleColor(item.role)" size="small" label>
            {{ formatRole(item.role) }}
          </v-chip>
        </template>

        <!-- Status Badge -->
        <template v-slot:item_status="{ item }">
          <v-chip :color="getUserStatusColor(item.status)" size="small">
            {{ formatUserStatus(item.status) }}
          </v-chip>
        </template>

        <!-- Haciendas -->
        <template v-slot:item_haciendas="{ item }">
          <v-chip-group v-if="item.haciendas?.length" column>
            <v-chip
              v-for="hacienda in item.haciendas.slice(0, 2)"
              :key="hacienda.id"
              size="small"
              color="primary"
              variant="outlined"
            >
              {{ hacienda.name }}
            </v-chip>
            <v-chip v-if="item.haciendas.length > 2" size="small">
              +{{ item.haciendas.length - 2 }} más
            </v-chip>
          </v-chip-group>
          <span v-else class="text-grey">Sin haciendas</span>
        </template>

        <!-- Actions -->
        <template v-slot:item_actions="{ item }">
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
    <v-dialog v-model="userDialog" max-width="600" persistent>
      <v-card>
        <v-card-title>
          {{ editingUser ? 'Editar Usuario' : 'Nuevo Usuario' }}
        </v-card-title>
        <UserForm
          :is-editing="!!editingUser"
          :loading="loading"
          :show-role-select="true"
          :show-hacienda-select="true"
          :available-roles="roles"
          :haciendas-list="haciendasList"
          :initial-data="formData"
          @submit="saveUser"
          @cancel="closeDialog"
        />
      </v-card>
    </v-dialog>

    <!-- Dialog: Ver Usuario -->
    <v-dialog v-model="viewDialog" max-width="700">
      <v-card>
        <v-card-title>Detalles del Usuario</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item>
              <v-list-item-title>Email</v-list-item-title>
              <v-list-item-subtitle>{{ selectedUser?.email }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Nombre de usuario</v-list-item-title>
              <v-list-item-subtitle>{{ selectedUser?.username }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Nombre completo</v-list-item-title>
              <v-list-item-subtitle>{{ selectedUser?.firstname }} {{ selectedUser?.lastname }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Rol</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getRoleColor(selectedUser?.role)" size="small">
                  {{ formatRole(selectedUser?.role) }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Estado</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="getUserStatusColor(selectedUser?.status)" size="small">
                  {{ formatUserStatus(selectedUser?.status) }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedUser?.haciendas?.length">
              <v-list-item-title>Haciendas asignadas</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip-group>
                  <v-chip
                    v-for="hacienda in selectedUser.haciendas"
                    :key="hacienda.id"
                    color="primary"
                    size="small"
                  >
                    {{ hacienda.name }}
                  </v-chip>
                </v-chip-group>
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Fecha de creación</v-list-item-title>
              <v-list-item-subtitle>{{ formatDate(selectedUser?.created) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" variant="text" @click="exportUserToMarkdown(selectedUser)">
            Exportar a MD
          </v-btn>
          <v-spacer />
          <v-btn color="grey" @click="viewDialog = false">Cerrar</v-btn>
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
            Esta acción no se puede deshacer.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" @click="deleteDialog = false">CANCELAR</v-btn>
          <v-btn color="error" @click="deleteUser">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
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
import UserForm from '@/components/forms/auth/UserForm.vue'
import { USER_ROLES, USER_STATUS, ROLE_OPTIONS } from '@/constants/roles'
import { formatRole, getRoleColor, formatDate, downloadMarkdown, getUserStatusColor, formatUserStatus } from '@/utils/formatters'

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
  firstname: '',
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
  { title: 'Nombre', key: 'firstname', sortable: true },
  { title: 'Rol', key: 'role', sortable: true },
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
    result = result.filter(u => u.status === filterStatus.value)
  }

  return result
})

// Lista de haciendas para UserForm (formato: title/value)
const haciendasList = computed(() => {
  return haciendas.value.map(h => ({ title: h.name, value: h.id }))
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
    firstname: '',
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
    firstname: user.firstname,
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
