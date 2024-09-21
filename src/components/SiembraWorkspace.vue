<template>
  <v-container fluid class="flex flex-col min-h-screen pa-0" v-if="!isLoading">
    <!-- Header -->

    <header class="bg-background shadow-sm">
      <div class="profile-container">
        <h3 class="profile-title">
          <nav class="flex mb-3" aria-label="Breadcrumb">
            <ol class="flex items-center space-x-2 bg-green-lighten-4 py-2 px-4 rounded-r-full">
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-sprout</v-icon>
                  <router-link
                    to="/siembras"
                    class="ml-3 text-sm font-medium text-gray-600 hover:text-gray-700"
                    >SIEMBRAS</router-link
                  >
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-chevron-right</v-icon>
                  <span class="ml-1 text-sm font-bold text-gray-600" aria-current="page">{{
                    siembraInfo.nombre
                  }}</span>
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-chevron-right</v-icon>
                  <span class="ml-1 text-sm font-bold text-gray-700" aria-current="page">{{
                    siembraInfo.tipo
                  }}</span>
                </div>
              </li>
            </ol>
          </nav>

          <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
            HACIENDA: {{ mi_hacienda.name }}
          </v-chip>

          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
            {{ userRole }}
          </v-chip>

          <v-chip :color="getStatusColor(siembraInfo.estado)" size="x-small" variant="flat">
            {{ siembraInfo.estado }}
          </v-chip>

          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            PROGRAMADA: {{ siembraInfo.area_total }} ha
          </v-chip>

          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            INICIO: {{ formatDate(siembraInfo.fecha_inicio) }}
          </v-chip>
        </h3>
        <div class="avatar-container">
          <img
            :src="getSiembraAvatarUrl(siembraInfo)"
            alt="Avatar de Siembra"
            class="avatar-image"
          />
        </div>
      </div>
    </header>

    <v-row no-gutters>
      <!-- Main Content -->
      <v-col cols="12" md="8" class="pa-4">
        <v-card class="siembra-info mb-4" elevation="2">
          <v-card-title class="headline d-flex justify-between align-center">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-information</v-icon>
              <span>Información de la Siembra</span>
            </div>
            <v-btn color="green-lighten-2" @click="openEditDialog" icon>
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <div
                  class="flex-1 rounded-lg border-2 p-4 mt-2 mb-4"
                  v-html="siembraInfo.info || 'No disponible'"
                ></div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Bitácora -->
        <v-card class="bitacora-section" elevation="2">
          <v-card-title class="headline d-flex justify-space-between align-center">
            Bitácora de la Siembra
            <v-btn color="success" @click="openAddBitacoraDialog">
              <v-icon left>mdi-plus</v-icon>
              Agregar Entrada
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap align-center mb-4">
              <v-select
                v-model="itemsPerPage"
                :items="[5, 10, 20]"
                label="Elementos por página"
                dense
                outlined
                hide-details
                class="mr-4"
                style="max-width: 150px"
              ></v-select>
              <v-chip-group v-model="selectedZonas" column multiple>
                <v-chip v-for="zona in zonas" :key="zona.id" filter outlined>
                  {{ zona.nombre }}
                </v-chip>
              </v-chip-group>
            </div>
            <v-data-table
              :headers="bitacoraHeaders"
              :items="filteredBitacora"
              :items-per-page="itemsPerPage"
              :footer-props="{
                'items-per-page-options': [5, 10, 20],
                'items-per-page-text': 'Elementos por página'
              }"
              class="elevation-1"
            >
              <template #[`item.fecha`]="{ item }">
                {{ formatDate(item.fecha) }}
              </template>
              <template #[`item.actions`]="{ item }">
                <v-icon small class="mr-2" @click="editBitacoraItem(item)"> mdi-pencil </v-icon>
                <v-icon small @click="deleteBitacoraItem(item)"> mdi-delete </v-icon>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Sidebar -->
      <v-col cols="12" md="4" class="pa-4">
        <v-card class="zonas-section mb-4" elevation="2">
          <v-card-title class="headline d-flex justify-space-between align-center">
            Zonas Registradas
            <v-btn color="green-lighten-2" @click="openAddZonaDialog" icon>
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-chip class="mb-4" color="primary" text-color="white">
              Área Total: {{ totalArea }} {{ areaUnit }}
            </v-chip>
            <v-list>
              <v-list-item v-for="zona in zonas" :key="zona.id">
                <v-list-item-title>{{ zona.nombre }}</v-list-item-title>
                <v-list-item-subtitle>{{ zona.area }} {{ areaUnit }}</v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon small @click="editZona(zona)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon small @click="deleteZona(zona)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs -->

    <!-- Editar Siembra -->

    <v-dialog v-model="editSiembraDialog" max-width="800px">
      <v-card>
        <v-card-title class="headline">Editar Siembra</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-form ref="editSiembraForm">
                <v-text-field v-model="editedSiembra.nombre" label="Nombre"></v-text-field>
                <v-text-field v-model="editedSiembra.tipo" label="Tipo"></v-text-field>
                <v-select
                  v-model="editedSiembra.estado"
                  :items="estadosSiembra"
                  label="Estado"
                ></v-select>
                <v-text-field
                  v-model="editedSiembra.area_total"
                  label="Área Objetivo (ha)"
                  type="number"
                ></v-text-field>
                <v-text-field
                  v-model="editedSiembra.fecha_inicio"
                  label="Fecha de Inicio"
                  type="date"
                ></v-text-field>
              </v-form>
            </v-col>
            <v-col cols="12" md="6">
              <div class="flex justify-center items-center p-2">
                <v-card class="p-2 rounded-lg border-2">
                  <v-card-title class="compact-form-2">
                    <v-file-input
                      v-model="avatarFile"
                      rounded
                      variant="outlined"
                      color="green"
                      prepend-icon="mdi-camera"
                      label="Cambiar Avatar"
                      accept="image/*"
                      @change="handleAvatarUpload"
                      show-size
                    ></v-file-input>
                  </v-card-title>
                  <v-card-text>
                    <div class="flex items-center justify-center">
                      <v-avatar size="192" class="mr-4">
                        <v-img :src="siembraAvatarUrl" alt="Avatar de Siembra"></v-img>
                      </v-avatar>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-textarea v-model="editedSiembra.info" label="Información General"></v-textarea>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveSiembraEdit">Guardar</v-btn>
          <v-btn color="error" text @click="editSiembraDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!--editar bitacora-->

    <v-dialog v-model="addBitacoraDialog" max-width="600px">
      <v-card>
        <v-card-title class="headline">Agregar a Bitácora</v-card-title>
        <v-card-text>
          <v-form ref="addBitacoraForm">
            <v-text-field v-model="newBitacora.fecha" label="Fecha" type="date"></v-text-field>

            <v-select
              v-model="newBitacora.actividad"
              :items="actividades"
              item-text="nombre"
              item-value="id"
              label="Actividad"
            ></v-select>
            <v-select
              v-model="newBitacora.zonas"
              :items="zonas"
              item-text="nombre"
              item-value="id"
              label="Zonas"
              multiple
              chips
            ></v-select>
            <v-textarea v-model="newBitacora.descripcion" label="Descripción"></v-textarea>
            <v-select
              v-model="newBitacora.responsable"
              :items="usuarios"
              item-text="name"
              item-value="id"
              label="Responsable"
            ></v-select>
            <v-select
              v-model="newBitacora.estado"
              :items="estadosBitacora"
              label="Estado"
            ></v-select>
            <v-textarea v-model="newBitacora.notas" label="Notas"></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveBitacoraEntry">Guardar</v-btn>
          <v-btn color="error" text @click="addBitacoraDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addZonaDialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Agregar Zona</v-card-title>
        <v-card-text>
          <v-form ref="addZonaForm">
            <v-text-field v-model="newZona.nombre" label="Nombre"></v-text-field>
            <v-text-field v-model="newZona.area" label="Área" type="number"></v-text-field>
            <v-textarea v-model="newZona.info" label="Información"></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveZona">Guardar</v-btn>
          <v-btn color="error" text @click="addZonaDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
  <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useZonasStore } from '@/stores/zonasStore'

export default {
  name: 'SiembraWorkspace',
  setup() {
    const route = useRoute()
    const siembrasStore = useSiembrasStore()
    const bitacoraStore = useBitacoraStore()
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const snackbarStore = useSnackbarStore()
    const zonasStore = useZonasStore()

    const siembraId = ref(route.params.id)
    const siembraInfo = ref({})
    const zonas = ref([])
    const bitacora = ref([])

    const { user } = storeToRefs(profileStore)
    const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

    const userRole = computed(() => user.value?.role || '')

    const avatarUrl = computed(() => profileStore.avatarUrl)
    const avatarFile = ref(null)

    const siembraAvatarUrl = computed(() => {
      return siembrasStore.getSiembraAvatarUrl(siembraInfo.value)
    })
    const getSiembraAvatarUrl = siembrasStore.getSiembraAvatarUrl

    const actividades = ref([])
    const usuarios = ref([])

    const isLoading = ref(true)

    const totalArea = computed(() => {
      return zonas.value
        .filter((zona) => zona.contabilizable)
        .reduce((sum, zona) => sum + (parseFloat(zona.area) || 0), 0)
        .toFixed(2)
    })

    const areaUnit = ref('ha')
    const itemsPerPage = ref(10)
    const selectedZonas = ref([])
    const selectedActividades = ref([])

    const editSiembraDialog = ref(false)
    const editedSiembra = ref({})

    const addBitacoraDialog = ref(false)
    const addZonaDialog = ref(false)

    const newBitacora = ref({
      fecha: new Date().toISOString().split('T')[0],
      actividad: '',
      zonas: [],
      descripcion: '',
      responsable: '',
      estado: 'planificada',
      notas: ''
    })
    const newZona = ref({
      nombre: '',
      area: '',
      info: ''
    })

    const estadosSiembra = ['planificada', 'en_crecimiento', 'cosechada', 'finalizada']
    const getStatusColor = (status) => {
      const colors = {
        planificada: 'blue',
        en_crecimiento: 'green',
        cosechada: 'orange',
        finalizada: 'gray'
      }
      return colors[status] || 'gray'
    }

    const estadosBitacora = ['planificada', 'en_progreso', 'completada', 'cancelada']

    const bitacoraHeaders = [
      { text: 'Fecha', value: 'fecha' },
      { text: 'Actividad', value: 'actividad.nombre' },
      { text: 'Zona', value: 'zona.nombre' },
      { text: 'Responsable', value: 'responsable.name' },
      { text: 'Estado', value: 'estado' },
      { text: 'Acciones', value: 'actions', sortable: false }
    ]

    const filteredBitacora = computed(() => {
      return bitacora.value.filter((entry) => {
        const zonaMatch =
          selectedZonas.value.length === 0 ||
          entry.zonas.some((zona) => selectedZonas.value.includes(zona.id))
        const actividadMatch =
          selectedActividades.value.length === 0 ||
          selectedActividades.value.includes(entry.actividad.id)
        return zonaMatch && actividadMatch
      })
    })

    onMounted(async () => {
      try {
        await Promise.all([
          loadSiembraInfo(),
          loadZonas(),
          loadBitacora(),
          loadHacienda(),
          loadActividades(),
          loadUsuarios()
        ])
      } catch (error) {
        handleError(error, 'Error al cargar los datos iniciales')
      } finally {
        isLoading.value = false
      }
    })

    // En la función loadSiembraInfo, no es necesario forzar la actualización del avatar
    async function loadSiembraInfo() {
      try {
        const siembra = await siembrasStore.fetchSiembraById(siembraId.value)
        siembraInfo.value = siembra
      } catch (error) {
        handleError(error, 'Error al cargar la información de la siembra')
      }
    }

    async function loadZonas() {
      try {
        zonas.value = await zonasStore.fetchZonasBySiembraId(siembraId.value)
      } catch (error) {
        handleError(error, 'Error al cargar las zonas')
      }
    }

    async function loadBitacora() {
      try {
        bitacora.value = await bitacoraStore.fetchBitacoraBySiembraId(siembraId.value)
      } catch (error) {
        handleError(error, 'Error al cargar la bitácora')
      }
    }

    async function loadHacienda() {
      try {
        await haciendaStore.fetchHacienda(siembraInfo.value.hacienda)
      } catch (error) {
        handleError(error, 'Error al cargar la información de la hacienda')
      }
    }

    async function loadActividades() {
      try {
        actividades.value = await siembrasStore.fetchActividadesByHaciendaId(mi_hacienda.value.id)
      } catch (error) {
        handleError(error, 'Error al cargar las actividades')
      }
    }

    async function loadUsuarios() {
      try {
        usuarios.value = await haciendaStore.fetchHaciendaUsers()
      } catch (error) {
        handleError(error, 'Error al cargar los usuarios')
      }
    }

    function formatDate(date) {
      return new Date(date).toLocaleDateString()
    }

    function openEditDialog() {
      editedSiembra.value = {
        ...siembraInfo.value,
        fecha_inicio: siembraInfo.value.fecha_inicio
          ? new Date(siembraInfo.value.fecha_inicio).toISOString().split('T')[0]
          : ''
      }
      editSiembraDialog.value = true
    }

    function openAddBitacoraDialog() {
      newBitacora.value = {
        fecha: new Date().toISOString().split('T')[0],
        actividad: '',
        zonas: [],
        descripcion: '',
        responsable: '',
        estado: 'planificada',
        notas: ''
      }
      addBitacoraDialog.value = true
    }

    function openAddZonaDialog() {
      newZona.value = {
        nombre: '',
        area: '',
        info: ''
      }
      addZonaDialog.value = true
    }

    async function saveSiembraEdit() {
      try {
        if (!editedSiembra.value.nombre || !editedSiembra.value.estado) {
          throw new Error('Nombre y estado son campos requeridos')
        }

        editedSiembra.value.nombre = editedSiembra.value.nombre.toUpperCase()
        editedSiembra.value.tipo = editedSiembra.value.tipo.toUpperCase()

        // Crear un nuevo objeto con solo los campos necesarios
        const siembraToUpdate = {
          nombre: editedSiembra.value.nombre,
          tipo: editedSiembra.value.tipo,
          estado: editedSiembra.value.estado,
          area_total: editedSiembra.value.area_total,
          fecha_inicio: editedSiembra.value.fecha_inicio
            ? new Date(editedSiembra.value.fecha_inicio).toISOString()
            : null,
          info: editedSiembra.value.info
        }

        // Actualizar la siembra sin incluir información del avatar
        await siembrasStore.updateSiembra(siembraId.value, siembraToUpdate)

        // Recargar la información de la siembra
        siembraInfo.value = await siembrasStore.fetchSiembraById(siembraId.value)
        editSiembraDialog.value = false
        snackbarStore.showSnackbar('Siembra actualizada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al actualizar la siembra')
      }
    }

    async function saveBitacoraEntry() {
      try {
        const entry = {
          ...newBitacora.value,
          siembra: siembraId.value,
          hacienda: mi_hacienda.value.id
        }
        await bitacoraStore.addBitacoraEntry(entry)
        addBitacoraDialog.value = false
        loadBitacora()
        snackbarStore.showSnackbar('Entrada de bitácora agregada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al agregar entrada de bitácora')
      }
    }

    async function saveZona() {
      try {
        const zona = {
          ...newZona.value,
          siembra: siembraId.value,
          hacienda: mi_hacienda.value.id
        }
        await zonasStore.addZona(zona)
        addZonaDialog.value = false
        loadZonas()
        snackbarStore.showSnackbar('Zona agregada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al agregar zona')
      }
    }

    async function editBitacoraItem(item) {
      try {
        const updatedItem = await bitacoraStore.updateBitacoraEntry(item.id, item)
        const index = bitacora.value.findIndex((entry) => entry.id === item.id)
        if (index !== -1) {
          bitacora.value[index] = updatedItem
        }
        snackbarStore.showSnackbar('Entrada de bitácora actualizada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al actualizar entrada de bitácora')
      }
    }

    async function deleteBitacoraItem(item) {
      if (confirm('¿Está seguro de que desea eliminar esta entrada de la bitácora?')) {
        try {
          await bitacoraStore.deleteBitacoraEntry(item.id)
          bitacora.value = bitacora.value.filter((entry) => entry.id !== item.id)
          snackbarStore.showSnackbar('Entrada de bitácora eliminada con éxito', 'success')
        } catch (error) {
          handleError(error, 'Error al eliminar entrada de bitácora')
        }
      }
    }

    async function editZona(zona) {
      try {
        const updatedZona = await zonasStore.updateZona(zona.id, zona)
        const index = zonas.value.findIndex((z) => z.id === zona.id)
        if (index !== -1) {
          zonas.value[index] = updatedZona
        }
        snackbarStore.showSnackbar('Zona actualizada con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al actualizar zona')
      }
    }

    async function deleteZona(zona) {
      if (confirm('¿Está seguro de que desea eliminar esta zona?')) {
        try {
          await zonasStore.deleteZona(zona.id)
          zonas.value = zonas.value.filter((z) => z.id !== zona.id)
          snackbarStore.showSnackbar('Zona eliminada con éxito', 'success')
        } catch (error) {
          handleError(error, 'Error al eliminar zona')
        }
      }
    }

    async function uploadFile(file) {
      snackbarStore.showLoading()

      try {
        const formData = new FormData()
        formData.append('avatar', file)

        const updatedSiembra = await pb.collection('siembras').update(siembraId.value, formData)

        // Actualizar el estado local
        editedSiembra.value.avatar = updatedSiembra.avatar
        siembraInfo.value.avatar = updatedSiembra.avatar

        // Actualizar el store de siembras
        await siembrasStore.updateSiembraAvatar(siembraId.value, updatedSiembra.avatar)

        snackbarStore.showSnackbar('Avatar de siembra actualizado con éxito', 'success')
        return updatedSiembra.avatar
      } catch (error) {
        handleError(error, 'Error al actualizar el avatar de la siembra')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    }

    async function handleAvatarUpload() {
      if (avatarFile.value) {
        try {
          snackbarStore.showLoading()
          await siembrasStore.updateSiembraAvatar(siembraId.value, avatarFile.value)
          siembraInfo.value = await siembrasStore.fetchSiembraById(siembraId.value)
          snackbarStore.showSnackbar('Avatar de siembra actualizado con éxito', 'success')
        } catch (error) {
          handleError(error, 'Error al actualizar el avatar de la siembra')
        } finally {
          snackbarStore.hideLoading()
          avatarFile.value = null
        }
      }
    }

    watch([selectedZonas, selectedActividades], () => {
      loadBitacora()
    })

    return {
      siembraInfo,
      siembraAvatarUrl,
      editedSiembra,
      avatarFile,
      uploadFile,
      handleAvatarUpload,
      getSiembraAvatarUrl,
      siembrasStore, // Asegúrate de incluir esto

      saveSiembraEdit,
      getStatusColor,

      totalArea,
      editSiembraDialog,

      estadosSiembra,
      openEditDialog,

      formatDate,
      zonas,
      bitacora,
      user,
      mi_hacienda,
      avatarHaciendaUrl,
      actividades,
      usuarios,
      userRole,
      avatarUrl,

      areaUnit,
      itemsPerPage,
      selectedZonas,
      selectedActividades,
      addBitacoraDialog,
      addZonaDialog,
      newBitacora,
      newZona,
      estadosBitacora,
      bitacoraHeaders,
      filteredBitacora,
      openAddBitacoraDialog,
      openAddZonaDialog,
      saveBitacoraEntry,
      saveZona,
      editBitacoraItem,
      deleteBitacoraItem,
      editZona,
      deleteZona,
      zonasStore,
      isLoading
    }
  }
}
</script>

<style scoped></style>
