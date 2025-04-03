<template>
  <div class="flex flex-col min-h-screen">
    <header class="bg-background shadow-sm">
      <div class="profile-container">
        <h3 class="profile-title">
          Bienvenido de nuevo, {{ fullName }}!
          <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
            {{ userRole }}
          </v-chip>
          <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
            HACIENDA: {{ mi_hacienda.name }}
          </v-chip>
        </h3>
        <div class="avatar-container">
          <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
        </div>
      </div>
    </header>
    <main class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
      <div class="bg-card text-card-foreground">
        <v-btn
          block
          sm:inline-flex
          size="small"
          variant="flat"
          rounded="lg"
          color="#6380a247"
          prepend-icon="mdi-plus"
          @click="recordatoriosStore.abrirNuevoRecordatorio"
          class="min-w-[210px] m-2"
        >
          Nuevo recordatorio
        </v-btn>

        <!-- Panel de editar recordatorios -->
        <RecordatorioForm
          :model-value="recordatoriosStore.dialog"
          @update:modelValue="recordatoriosStore.dialog = $event"
          :recordatorio="recordatoriosStore.recordatorioEdit"
          :is-editing="recordatoriosStore.editando"
          @submit="handleFormSubmit"
        />

        <!-- Panel de Pendientes -->
        <StatusPanel
          title="Pendientes"
          color="red"
          :items="recordatoriosStore.recordatoriosPendientes()"
          @update-status="recordatoriosStore.actualizarEstado"
          @edit="recordatoriosStore.editarRecordatorio"
          @delete="recordatoriosStore.eliminarRecordatorio"
        />
        <br />
        <!-- Panel En Progreso -->
        <StatusPanel
          title="En Progreso"
          color="amber"
          :items="recordatoriosStore.recordatoriosEnProgreso()"
          @update-status="recordatoriosStore.actualizarEstado"
          @edit="recordatoriosStore.editarRecordatorio"
          @delete="recordatoriosStore.eliminarRecordatorio"
        />
      </div>

      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="flex flex-col space-y-1.5 p-6">
          <h3 class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight">
            Last Activities
          </h3>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="flex items-start gap-4">
              <div class="bg-muted rounded-md flex items-center justify-center aspect-square w-10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5 text-muted-foreground"
                >
                  <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10"></path>
                  <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                  <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"></path>
                </svg>
              </div>
              <div class="grid gap-1">
                <div class="flex items-center gap-2">
                  <div class="font-medium">John Doe</div>
                  <div class="text-xs text-muted-foreground">Edited a post</div>
                </div>
                <p class="text-sm">Updated the team's project roadmap.</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="bg-muted rounded-md flex items-center justify-center aspect-square w-10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5 text-muted-foreground"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" x2="12" y1="3" y2="15"></line>
                </svg>
              </div>
              <div class="grid gap-1">
                <div class="flex items-center gap-2">
                  <div class="font-medium">Jane Smith</div>
                  <div class="text-xs text-muted-foreground">Uploaded a file</div>
                </div>
                <p class="text-sm">Shared the latest design mockups.</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="bg-muted rounded-md flex items-center justify-center aspect-square w-10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-5 h-5 text-muted-foreground"
                >
                  <path d="M8 2v4"></path>
                  <path d="M16 2v4"></path>
                  <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                  <path d="M3 10h18"></path>
                </svg>
              </div>
              <div class="grid gap-1">
                <div class="flex items-center gap-2">
                  <div class="font-medium">Sarah Lee</div>
                  <div class="text-xs text-muted-foreground">Created an event</div>
                </div>
                <p class="text-sm">Scheduled a team meeting for next week.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
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
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from '@/stores/snackbarStore'

import StatusPanel from '@/components/StatusPanel.vue'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'

// Stores
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const recordatoriosStore = useRecordatoriosStore()
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const zonasStore = useZonasStore()
const snackbarStore = useSnackbarStore()

// Cargar datos iniciales
onMounted(async () => {
  await Promise.all([
    haciendaStore.init(),
    recordatoriosStore.cargarRecordatorios(),
    siembrasStore.cargarSiembras(),
    actividadesStore.cargarActividades(),
    zonasStore.cargarZonas()
  ])
})

// Destructurar stores reactivos
const { fullName, userRole, avatarUrl } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

// Métodos
function abrirNuevoRecordatorio() {
  recordatoriosStore.abrirNuevoRecordatorio()
}

async function handleFormSubmit(data) {
  try {
    if (recordatoriosStore.editando) {
      await recordatoriosStore.actualizarRecordatorio(data.id, data)
      await recordatoriosStore.cargarRecordatorios()
    } else {
      await recordatoriosStore.crearRecordatorio(data)
    }
    recordatoriosStore.dialog = false
    snackbarStore.showSnackbar('Recordatorio guardado')
  } catch (error) {
    handleError(error, 'Error al guardar recordatorio')
  }
}
</script>
