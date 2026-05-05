<template>
  <div class="flex flex-col min-h-screen">
    <div v-if="!mi_hacienda" class="text-center p-4">
      <v-alert type="warning" class="mx-auto max-w-md">
        No se encontró información de tu hacienda. Contacta al administrador.
      </v-alert>
    </div>
    <template v-else>
      <header role="banner" class="bg-background shadow-sm">
        <div class="profile-container">
          <h3 class="profile-title" id="dashboard-welcome-title">
            {{ t('dashboard.welcome_back', { fullName: fullName }) }}
            <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
              {{ userRole }}
            </v-chip>
            <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
              {{ t('dashboard.hacienda') }}: {{ mi_hacienda.name }}
            </v-chip>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" color="primary" variant="tonal" size="small">
                  <v-icon start>mdi-export</v-icon>
                  Exportar
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="exportReport('json')">
                  <v-list-item-title>JSON</v-list-item-title>
                </v-list-item>
                <v-list-item @click="exportReport('csv')">
                  <v-list-item-title>CSV</v-list-item-title>
                </v-list-item>
                <v-list-item @click="exportReport('txt')">
                  <v-list-item-title>Texto</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </h3>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>

      <main role="main" aria-labelledby="dashboard-welcome-title" class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
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
            class="min-w-[210px] mt-0 m-1 mb-4"
            aria-label="Crear nuevo recordatorio"
          >
            {{ t('dashboard.new_reminder') }}
          </v-btn>

          <RecordatorioForm
            :model-value="recordatoriosStore.dialog"
            @update:modelValue="recordatoriosStore.dialog = $event"
            :recordatorio="recordatoriosStore.recordatorioEdit"
            :is-editing="recordatoriosStore.editando"
            @submit="handleFormSubmit"
            role="dialog"
            aria-label="Formulario de recordatorio"
          />

          <StatusPanel
            v-if="recordatoriosStore.recordatoriosPendientes().length > 0"
            :title="t('dashboard.pending')"
            color="red"
            :items="recordatoriosStore.recordatoriosPendientes()"
            @update-status="recordatoriosStore.actualizarEstado"
            @edit="recordatoriosStore.editarRecordatorio"
            @delete="recordatoriosStore.eliminarRecordatorio"
            aria-label="Recordatorios pendientes"
          />
          <br />
          <StatusPanel
            v-if="recordatoriosStore.recordatoriosEnProgreso().length > 0"
            :title="t('dashboard.in_progress')"
            color="amber"
            :items="recordatoriosStore.recordatoriosEnProgreso()"
            @update-status="recordatoriosStore.actualizarEstado"
            @edit="recordatoriosStore.editarRecordatorio"
            @delete="recordatoriosStore.eliminarRecordatorio"
            aria-label="Recordatorios en progreso"
          />
        </div>

        <div class="rounded-lg border bg-card text-card-foreground shadow-sm" aria-label="Últimas actividades">
          <v-card v-if="notifications.length" class="mt-4" color="grey-lighten-4">
            <v-card-title class="text-subtitle-1">
              <v-icon start color="amber-darken-2">mdi-bell-ring</v-icon>
              Alertas del Sistema
            </v-card-title>
            <v-card-text>
              <v-list density="compact" bg-color="transparent">
                <v-list-item v-for="n in notifications" :key="n.id" :active="!n.read">
                  <template v-slot:prepend>
                    <v-icon :color="n.type === 'error' ? 'error' : 'warning'">
                      {{ n.type === 'error' ? 'mdi-alert-decagram' : 'mdi-alert' }}
                    </v-icon>
                  </template>
                  <v-list-item-title class="text-caption font-weight-bold">
                    {{ n.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-wrap text-caption">
                    {{ n.message }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <v-card v-if="recentBitacoras.length" class="mt-4">
            <v-card-title>
              <v-icon start>mdi-shield-check</v-icon>
              Auditoría de Firmas
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item v-for="b in recentBitacoras" :key="b.id">
                  <template v-slot:prepend>
                    <v-icon :color="b.signature ? 'success' : 'warning'">
                      {{ b.signature ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                    </v-icon>
                  </template>
                  <v-list-item-title>
                    {{ b.expand?.actividad_realizada?.nombre || 'Sin actividad' }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ new Date(b.created).toLocaleString() }}
                    {{ b.signature ? '✓ Firmado' : '⚠ Sin firma' }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useSyncStore } from '@/stores/sync'
import { useNotificationStore } from '@/stores/notificationStore'
import { reportingModule } from '@/modules/reporting'

import StatusPanel from '@/components/recordatorios/RecordatoriosStatusPanel.vue'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()
const recordatoriosStore = useRecordatoriosStore()
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const zonasStore = useZonasStore()
const bitacoraStore = useBitacoraStore()
const uiFeedbackStore = useUiFeedbackStore()
const syncStore = useSyncStore()
const notificationStore = useNotificationStore()

const recentBitacoras = computed(() => {
  return bitacoraStore.bitacoraEntries.slice(0, 5)
})

const notifications = computed(() => {
  return notificationStore.recentNotifications(5)
})

onMounted(async () => {
  // Si la hacienda ya fue cargada en main.js (refresh flow), 
  // loadWithTraditionalMethod hace fetch idempotente (no duplica peticiones).
  await loadWithTraditionalMethod()
})

async function loadWithTraditionalMethod() {
  await Promise.all([
    haciendaStore.init(),
    recordatoriosStore.cargarRecordatorios(),
    siembrasStore.cargarSiembras(),
    actividadesStore.cargarActividades(),
    zonasStore.cargarZonas()
  ])
}

async function exportReport(format = 'json') {
  const config = { haciendaId: haciendaStore.mi_hacienda?.id }
  const report = await reportingModule.generate('bpa_compliance', config)
  if (report) {
    await reportingModule.export(report, format)
  }
}

const { fullName, userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

async function handleFormSubmit(data) {
  try {
    if (recordatoriosStore.editando) {
      await recordatoriosStore.actualizarRecordatorio(data.id, data)
      await recordatoriosStore.cargarRecordatorios()
    } else {
      await recordatoriosStore.crearRecordatorio(data)
    }
    recordatoriosStore.dialog = false
    uiFeedbackStore.showSnackbar(t('dashboard.reminder_saved'))
  } catch (error) {
    handleError(error, t('dashboard.error_saving_reminder'))
  }
}
</script>
