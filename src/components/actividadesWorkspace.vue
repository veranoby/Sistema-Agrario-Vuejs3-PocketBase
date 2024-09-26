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
                  <v-icon>mdi-clipboard-text</v-icon>
                  <router-link
                    to="/actividades"
                    class="ml-3 text-sm font-medium text-gray-600 hover:text-gray-700"
                    >ACTIVIDADES</router-link
                  >
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-chevron-right</v-icon>
                  <span class="ml-1 text-sm font-bold text-gray-600" aria-current="page">{{
                    actividadInfo.nombre
                  }}</span>
                </div>
              </li>
              <li>
                <div class="flex items-center">
                  <v-icon>mdi-chevron-right</v-icon>
                  <span class="ml-1 text-sm font-bold text-gray-700" aria-current="page">{{
                    actividadInfo.tipo.nombre
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

          <v-chip :color="actividadInfo.activa ? 'success' : 'error'" size="x-small" variant="flat">
            {{ actividadInfo.activa ? 'Activa' : 'Inactiva' }}
          </v-chip>
        </h3>
        <div class="avatar-container">
          <v-icon size="64" :color="getColorByTipo(actividadInfo.tipo.nombre)">
            {{ getIconByTipo(actividadInfo.tipo.nombre) }}
          </v-icon>
        </div>
      </div>
    </header>

    <v-row no-gutters>
      <!-- Main Content -->
      <v-col cols="12" md="8" class="pa-4">
        <v-card class="actividad-info mb-4" elevation="2">
          <v-card-title class="headline d-flex justify-between align-center">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-information</v-icon>
              <span>Información de la Actividad</span>
            </div>
            <v-btn color="green-lighten-2" @click="openEditDialog" icon>
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <p><strong>Nombre:</strong> {{ actividadInfo.nombre }}</p>
                <p><strong>Tipo:</strong> {{ actividadInfo.tipo.nombre }}</p>
                <p><strong>Estado:</strong> {{ actividadInfo.activa ? 'Activa' : 'Inactiva' }}</p>
              </v-col>
              <v-col cols="12" md="6">
                <p><strong>Descripción:</strong></p>
                <p>{{ actividadInfo.descripcion }}</p>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <p><strong>Métricas requeridas:</strong></p>
                <v-chip-group>
                  <v-chip v-for="metrica in actividadInfo.metricas_requeridas" :key="metrica">
                    {{ metrica }}
                  </v-chip>
                </v-chip-group>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Bitácora -->
        <v-card class="bitacora-section" elevation="2">
          <v-card-title class="headline d-flex justify-space-between align-center">
            Bitácora de la Actividad
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
          <v-card-title class="headline">Zonas Asociadas</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item v-for="zona in actividadInfo.zonas" :key="zona.id">
                <v-list-item-title>{{ zona.nombre }}</v-list-item-title>
                <v-list-item-subtitle
                  >{{ zona.area.area }} {{ zona.area.unidad }}</v-list-item-subtitle
                >
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card class="recordatorio-section" elevation="2">
          <v-card-title class="headline">Recordatorio</v-card-title>
          <v-card-text v-if="actividadInfo.recordatorio">
            <p>
              <strong>Última ejecución:</strong>
              {{ formatDate(actividadInfo.recordatorio.ultima_ejecucion) }}
            </p>
            <p>
              <strong>Próximo recordatorio:</strong>
              {{ formatDate(actividadInfo.recordatorio.proximo_recordatorio) }}
            </p>
            <p><strong>Frecuencia:</strong> {{ actividadInfo.recordatorio.frecuencia }}</p>
            <p><strong>Estado:</strong> {{ actividadInfo.recordatorio.estado }}</p>
          </v-card-text>
          <v-card-text v-else>
            <p>No hay recordatorio configurado para esta actividad.</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs -->

    <!-- Editar Actividad -->
    <v-dialog v-model="editActividadDialog" max-width="800px">
      <v-card>
        <v-card-title class="headline">Editar Actividad</v-card-title>
        <v-card-text>
          <v-form ref="editActividadForm">
            <v-text-field v-model="editedActividad.nombre" label="Nombre"></v-text-field>
            <v-select
              v-model="editedActividad.tipo"
              :items="tiposActividad"
              item-text="nombre"
              item-value="id"
              label="Tipo"
            ></v-select>
            <v-textarea v-model="editedActividad.descripcion" label="Descripción"></v-textarea>
            <v-switch v-model="editedActividad.activa" label="Activa"></v-switch>
            <v-combobox
              v-model="editedActividad.metricas_requeridas"
              :items="metricasDisponibles"
              label="Métricas requeridas"
              multiple
              chips
            ></v-combobox>
            <v-select
              v-model="editedActividad.zonas"
              :items="zonas"
              item-text="nombre"
              item-value="id"
              label="Zonas"
              multiple
              chips
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveActividadEdit">Guardar</v-btn>
          <v-btn color="error" text @click="editActividadDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Agregar Bitácora -->
    <v-dialog v-model="addBitacoraDialog" max-width="600px">
      <v-card>
        <v-card-title class="headline">Agregar a Bitácora</v-card-title>
        <v-card-text>
          <v-form ref="addBitacoraForm">
            <v-text-field v-model="newBitacora.fecha" label="Fecha" type="date"></v-text-field>
            <v-select
              v-model="newBitacora.zona"
              :items="actividadInfo.zonas"
              item-text="nombre"
              item-value="id"
              label="Zona"
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
  </v-container>
  <v-progress-circular v-else indeterminate color="primary"></v-progress-circular>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'

export default {
  name: 'ActividadWorkspace',
  setup() {
    const route = useRoute()
    const actividadesStore = useActividadesStore()
    const bitacoraStore = useBitacoraStore()
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const snackbarStore = useSnackbarStore()

    const actividadId = ref(route.params.id)
    const actividadInfo = ref({})
    const bitacora = ref([])

    const { user } = storeToRefs(profileStore)
    const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

    const userRole = computed(() => user.value?.role || '')
    const avatarUrl = computed(() => profileStore.avatarUrl)

    const isLoading = ref(true)
    const itemsPerPage = ref(10)
    const selectedZonas = ref([])

    const editActividadDialog = ref(false)
    const editedActividad = ref({})

    const addBitacoraDialog = ref(false)
    const newBitacora = ref({
      fecha: new Date().toISOString().split('T')[0],
      zona: '',
      descripcion: '',
      responsable: '',
      estado: 'planificada',
      notas: ''
    })

    const zonas = computed(() => actividadInfo.value.zonas || [])
    const usuarios = ref([]) // This should be populated with users from the hacienda
    const estadosBitacora = ['planificada', 'en_progreso', 'completada', 'cancelada']
    const metricasDisponibles = ref([]) // This should be populated with available metrics

    const tiposActividad = ref([])

    const bitacoraHeaders = [
      { text: 'Fecha', value: 'fecha' },
      { text: 'Zona', value: 'zona.nombre' },
      { text: 'Descripción', value: 'descripcion' },
      { text: 'Responsable', value: 'responsable.name' },
      { text: 'Estado', value: 'estado' },
      { text: 'Acciones', value: 'actions', sortable: false }
    ]

    const filteredBitacora = computed(() => {
      if (selectedZonas.value.length === 0) return bitacora.value
      return bitacora.value.filter((entry) => selectedZonas.value.includes(entry.zona.id))
    })

    onMounted(async () => {
      try {
        isLoading.value = true
        await fetchActividadInfo()
        await fetchBitacora()
        await fetchTiposActividad()
        await fetchUsuarios()
        await fetchMetricasDisponibles()
      } catch (error) {
        handleError(error, 'Error al cargar la información de la actividad')
      } finally {
        isLoading.value = false
      }
    })

    const fetchActividadInfo = async () => {
      actividadInfo.value = await actividadesStore.fetchActividadById(actividadId.value)
    }

    const fetchBitacora = async () => {
      bitacora.value = await bitacoraStore.fetchBitacoraByActividad(actividadId.value)
    }

    const fetchTiposActividad = async () => {
      tiposActividad.value = await actividadesStore.fetchTiposActividad()
    }

    const fetchUsuarios = async () => {
      usuarios.value = await profileStore.fetchUsuariosByHacienda(mi_hacienda.value.id)
    }

    const fetchMetricasDisponibles = async () => {
      metricasDisponibles.value = await actividadesStore.fetchMetricasDisponibles()
    }

    const openEditDialog = () => {
      editedActividad.value = { ...actividadInfo.value }
      editActividadDialog.value = true
    }

    const saveActividadEdit = async () => {
      try {
        await actividadesStore.updateActividad(editedActividad.value)
        await fetchActividadInfo()
        editActividadDialog.value = false
        snackbarStore.showSnackbar('Actividad actualizada exitosamente')
      } catch (error) {
        handleError(error, 'Error al actualizar la actividad')
      }
    }

    const openAddBitacoraDialog = () => {
      newBitacora.value = {
        fecha: new Date().toISOString().split('T')[0],
        zona: '',
        descripcion: '',
        responsable: '',
        estado: 'planificada',
        notas: ''
      }
      addBitacoraDialog.value = true
    }

    const saveBitacoraEntry = async () => {
      try {
        await bitacoraStore.addBitacoraEntry({
          ...newBitacora.value,
          actividad: actividadId.value,
          hacienda: mi_hacienda.value.id
        })
        await fetchBitacora()
        addBitacoraDialog.value = false
        snackbarStore.showSnackbar('Entrada de bitácora agregada exitosamente')
      } catch (error) {
        handleError(error, 'Error al agregar entrada de bitácora')
      }
    }

    const editBitacoraItem = () => {
      // Implement edit bitacora item functionality
    }

    const deleteBitacoraItem = async (item) => {
      if (confirm('¿Está seguro de que desea eliminar esta entrada de bitácora?')) {
        try {
          await bitacoraStore.deleteBitacoraEntry(item.id)
          await fetchBitacora()
          snackbarStore.showSnackbar('Entrada de bitácora eliminada exitosamente')
        } catch (error) {
          handleError(error, 'Error al eliminar entrada de bitácora')
        }
      }
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString()
    }

    const getIconByTipo = (tipo) => {
      const iconos = {
        Riego: 'mdi-water',
        Fertilización: 'mdi-leaf',
        Fumigación: 'mdi-spray',
        Poda: 'mdi-content-cut',
        Cosecha: 'mdi-basket',
        Otro: 'mdi-cog'
      }
      return iconos[tipo] || 'mdi-cog'
    }

    const getColorByTipo = (tipo) => {
      const colores = {
        Riego: 'blue',
        Fertilización: 'green',
        Fumigación: 'red',
        Poda: 'orange',
        Cosecha: 'purple',
        Otro: 'grey'
      }
      return colores[tipo] || 'grey'
    }

    return {
      actividadInfo,
      bitacora,
      userRole,
      avatarUrl,
      mi_hacienda,
      avatarHaciendaUrl,
      isLoading,
      itemsPerPage,
      selectedZonas,
      editActividadDialog,
      editedActividad,
      addBitacoraDialog,
      newBitacora,
      zonas,
      usuarios,
      estadosBitacora,
      metricasDisponibles,
      tiposActividad,
      bitacoraHeaders,
      filteredBitacora,
      openEditDialog,
      saveActividadEdit,
      openAddBitacoraDialog,
      saveBitacoraEntry,
      editBitacoraItem,
      deleteBitacoraItem,
      formatDate,
      getIconByTipo,
      getColorByTipo
    }
  }
}
</script>
