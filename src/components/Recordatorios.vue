<template>
  <v-container fluid class="pa-2">
    <RecordatorioForm
      :model-value="dialog"
      @update:modelValue="dialog = $event"
      :recordatorio="recordatorioEdit"
      :is-editing="editando"
      @submit="handleFormSubmit"
    />
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                Gestión de Recordatorios
                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ userRole }}
                </v-chip>
                <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ mi_hacienda.name }}
                </v-chip>
              </h3>
            </div>

            <!-- Button Section -->
            <div class="w-full sm:w-auto z-10">
              <v-btn
                block
                sm:inline-flex
                size="small"
                variant="flat"
                rounded="lg"
                color="green-lighten-2"
                prepend-icon="mdi-plus"
                @click="abrirNuevoRecordatorio"
                class="min-w-[210px]"
              >
                Nuevo recordatorio
              </v-btn>
            </div>
          </div>

          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <!-- Paneles de Estado -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
      <!-- Panel de Pendientes -->
      <StatusPanel
        title="Pendientes"
        color="red"
        :items="recordatoriosPendientes"
        @update-status="recordatoriosStore.actualizarEstado"
        @edit="editarRecordatorio"
        @delete="recordatoriosStore.eliminarRecordatorio"
      />

      <!-- Panel En Progreso -->
      <StatusPanel
        title="En Progreso"
        color="amber"
        :items="recordatoriosEnProgreso"
        @update-status="recordatoriosStore.actualizarEstado"
        @edit="editarRecordatorio"
        @delete="recordatoriosStore.eliminarRecordatorio"
      />

      <!-- Panel Completados -->
      <StatusPanel
        title="Completados"
        color="green"
        :items="recordatoriosCompletados"
        @update-status="recordatoriosStore.actualizarEstado"
        @edit="editarRecordatorio"
        @delete="recordatoriosStore.eliminarRecordatorio"
      />
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSyncStore } from '@/stores/syncStore'
import { handleError } from '@/utils/errorHandler'
import StatusPanel from '@/components/StatusPanel.vue'
import { useAvatarStore } from '@/stores/avatarStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'

const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const recordatoriosStore = useRecordatoriosStore()
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const zonasStore = useZonasStore()
const snackbarStore = useSnackbarStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const userRole = computed(() => profileStore.user.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

// Estados del componente
const dialog = ref(false)
//const guardando = ref(false)
const editando = ref(false)
const recordatorioEdit = ref(crearRecordatorioVacio())

// Cargar datos iniciales
onMounted(async () => {
  await Promise.all([
    recordatoriosStore.cargarRecordatorios(),
    siembrasStore.cargarSiembras(),
    actividadesStore.cargarActividades(),
    zonasStore.cargarZonas()
  ])
})

const recordatoriosPendientes = computed(() => {
  //  console.log('leer recordatoriosStore.recordatorios:', recordatoriosStore.recordatorios)
  let temp = recordatoriosStore.recordatorios.filter(
    (recordatorio) => recordatorio.estado === 'pendiente'
  )
  return temp
})

const recordatoriosEnProgreso = computed(() => {
  let temp = recordatoriosStore.recordatorios.filter(
    (recordatorio) => recordatorio.estado === 'en_progreso'
  )
  return temp
})

const recordatoriosCompletados = computed(() => {
  let temp = recordatoriosStore.recordatorios.filter(
    (recordatorio) => recordatorio.estado === 'completado'
  )
  return temp
})

// Métodos
function crearRecordatorioVacio() {
  return {
    titulo: '',
    descripcion: '',
    fecha_recordatorio: new Date().toISOString().substr(0, 10),
    prioridad: 'media',
    estado: 'pendiente',
    siembras: [],
    actividades: [],
    zonas: []
  }
}

function abrirNuevoRecordatorio() {
  editando.value = false
  recordatorioEdit.value = crearRecordatorioVacio()
  dialog.value = true
}

async function editarRecordatorio(id) {
  const recordatorio = recordatoriosStore.recordatorios.find((r) => r.id === id)
  if (recordatorio) {
    editando.value = true
    recordatorioEdit.value = {
      ...recordatorio,
      siembras: recordatorio.siembras || [],
      actividades: recordatorio.actividades || [],
      zonas: recordatorio.zonas || []
    }
    dialog.value = true
  }
}

async function handleFormSubmit(data) {
  try {
    if (editando.value) {
      await recordatoriosStore.actualizarRecordatorio(data.id, {
        ...data,
        siembras: data.siembras || [],
        zonas: data.zonas || [],
        actividades: data.actividades || []
      })
      // Forzar actualización completa con expand
      await recordatoriosStore.cargarRecordatorios()
      dialog.value = false
    } else {
      await recordatoriosStore.crearRecordatorio(data)
    }
    snackbarStore.showSnackbar('Recordatorio guardado')
  } catch (error) {
    handleError(error, 'Error al guardar recordatorio')
  }
}
</script>

<style scoped>
.list-move {
  transition: all 0.5s ease;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.fab-button {
  bottom: 80px;
  right: 20px;
}
</style>
