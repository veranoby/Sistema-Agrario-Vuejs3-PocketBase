<template>
  <div class="flex flex-col min-h-screen">
    <div v-if="!mi_hacienda" class="text-center p-4">
      <v-alert type="warning" class="mx-auto max-w-md">
        {{ t('dashboard.no_hacienda_info') }}
      </v-alert>

    </div>
    <template v-else>
      <header role="banner" class="bg-background shadow-sm">
        <div class="profile-container">
          <h3 class="profile-title" id="dashboard-welcome-title">
            {{ t('dashboard.welcome_back', { fullName: fullName }) }}
            <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
              {{ t('roles.' + userRole) }}
            </v-chip>

            <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
              {{ t('dashboard.hacienda') }}: {{ mi_hacienda.name }}
            </v-chip>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" color="primary" variant="tonal" size="small">
                  <v-icon start>mdi-export</v-icon>
                  {{ t('dashboard.export') }}
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

        <div class=" bg-card text-card-foreground shadow-sm" aria-label="Secciones de acción">
          <!-- SECCIÓN: Programaciones Vencidas (Nuevo) -->
          <v-card v-if="programacionesVencidas.length" class="bg-dinamico p-4 rounded-xl" color="transparent" flat>
            <v-card-title class="px-0 pb-4 d-flex align-center">
              <v-icon start color="error">mdi-clock-alert-outline</v-icon>
              <span class="text-h6 font-weight-bold text-error">Programaciones Vencidas</span>
              <v-spacer />
              <v-chip size="x-small" color="error" variant="flat">{{ programacionesVencidas.length }}</v-chip>
            </v-card-title>

            <div class="flex flex-col gap-3">
              <ProgramacionPanel
                v-for="prog in programacionesVencidas"
                :key="prog.id"
                :programacion="prog"
                @request-single-execution="handleRequestSingleExecution"
              />
            </div>
            
            <v-btn
              variant="text"
              color="primary"
              block
              class="mt-4"
              prepend-icon="mdi-arrow-right"
              to="/programaciones"
            >
              Ver todas las programaciones
            </v-btn>
          </v-card>

          <v-card v-if="recentBitacoras.length" class="mt-4">
            <v-card-title>
              <v-icon start>mdi-shield-check</v-icon>
              {{ t('dashboard.signature_audit') }}
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
                    {{ b.expand?.actividad_realizada?.nombre || t('dashboard.no_activity') }}
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    {{ new Date(b.created).toLocaleString() }}
                    {{ b.signature ? '✓ ' + t('dashboard.signed') : '⚠ ' + t('dashboard.unsigned') }}
                  </v-list-item-subtitle>

                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </div>


        <!-- Mapa Total de la Hacienda -->
        <div class="col-span-1 md:col-span-2 mt-4">
          <v-card variant="elevated" elevation="2" class="overflow-hidden border">
            <v-card-title class="pa-4 d-flex align-center">
              <v-icon start color="success">mdi-map-legend</v-icon>
              {{ t('dashboard.hacienda_map') }}
              <v-spacer />

              <v-chip size="small" variant="tonal" color="success">
                {{ mi_hacienda.name }}
              </v-chip>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-0">
              <div style="height: 1000px;">
                <GisMapComponent
                  v-if="haciendaGeoJSON || haciendaCenter"
                  :initial-geo-json="haciendaGeoJSON"
                  :center="haciendaCenter || undefined"
                  :readonly="true"
                  :hacienda-name="mi_hacienda?.name"
                />
                <div v-else class="d-flex flex-column align-center justify-center pa-10 text-grey" style="min-height: 600px;">
                  <v-icon size="64" class="mb-4">mdi-map-marker-off</v-icon>
                  <p>{{ t('dashboard.no_geo_data') }}</p>
                  <v-btn variant="text" color="primary" class="mt-2" to="/siembras">
                    {{ t('dashboard.go_to_sowings') }}
                  </v-btn>
                </div>

              </div>
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
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useSyncStore } from '@/stores/sync'
import { useProgramacionesStore } from '@/stores/programaciones/programacionesStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { reportingModule } from '@/modules/reporting'
import { SIEMBRA_COLORS, POI_FALLBACK_COLOR } from '@/constants/mapColors'

import StatusPanel from '@/components/recordatorios/RecordatoriosStatusPanel.vue'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'
import GisMapComponent from '@/components/GisMapComponent.vue'
import ProgramacionPanel from '@/components/programaciones/ProgramacionPanel.vue'


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
const programacionesStore = useProgramacionesStore()

const recentBitacoras = computed(() => {
  return bitacoraStore.bitacoraEntries.slice(0, 5)
})

const notifications = computed(() => {
  return notificationStore.recentNotifications(5)
})

const programacionesVencidas = computed(() => {
  return programacionesStore.programacionesPorHacienda.filter(p => {
    const state = programacionesStore.getComplianceState(p)
    return state === 'VENCIDO' || state === 'ACUMULADO'
  })
})

/**
 * Extrae el centro geográfico de la hacienda (Prioridad 3).
 * Devuelve [lat, lng] o null.
 */
const haciendaCenter = computed(() => {
  let gpsData = mi_hacienda.value?.gps
  if (!gpsData) return null
  
  if (typeof gpsData === 'string') {
    try {
      gpsData = JSON.parse(gpsData)
    } catch (e) {
      return null
    }
  }

  if (gpsData && gpsData.lat && gpsData.lng) {
    return [Number(gpsData.lat), Number(gpsData.lng)]
  }
  return null
})

const haciendaGeoJSON = computed(() => {
  if (!siembrasStore.siembras || !zonasStore.zonas) return null

  const features = []
  const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i

  // El GPS Principal de la Hacienda ahora se maneja directamente
  // vía props.center en GisMapComponent para garantizar visibilidad permanente
  // y evitar bugs del parseador de GeoJSON.

  // 1. Siembras (Polígonos de lotes)
  siembrasStore.siembras.forEach(s => {
    if (s.geometria) {
      features.push({
        type: 'Feature',
        properties: { 
          id: s.id, 
          nombre: s.nombre, 
          type: 'siembra', 
          source: 'direct', 
          estado: s.estado,
          color: SIEMBRA_COLORS[s.estado] || SIEMBRA_COLORS.finalizada
        },
        geometry: s.geometria
      })
    } else {
      // Agregación de zonas lote asociadas
      const lotes = zonasStore.zonas.filter(z => {
        const matchesSiembra = Array.isArray(z.siembra) ? z.siembra.includes(s.id) : z.siembra === s.id
        const tipo = zonasStore.tiposZonas.find(t => t.id === z.tipos_zonas)
        const esLote = tipo?.nombre?.toLowerCase().includes('lote') || z.nombre?.toLowerCase().includes('lote')
        return matchesSiembra && esLote && z.geometria
      })
      
      lotes.forEach(lote => {
        features.push({
          type: 'Feature',
          properties: { 
            id: s.id, 
            nombre: `${s.nombre} (${lote.nombre})`, 
            type: 'siembra-lote', 
            source: 'zone', 
            estado: s.estado,
            color: SIEMBRA_COLORS[s.estado] || SIEMBRA_COLORS.finalizada
          },
          geometry: lote.geometria
        })
      })
    }
  })

  // 3. Otras Zonas (No Lotes -> Markers)
  zonasStore.zonas.forEach(z => {
    const tipo = zonasStore.tiposZonas.find(t => t.id === z.tipos_zonas)
    const isLote = tipo?.nombre?.toLowerCase().includes('lote') || z.nombre?.toLowerCase().includes('lote')
    
    if (!isLote && z.geometria) {
      const isValidHex = hexColorRegex.test(z.color)
      const poiColor = isValidHex ? z.color : POI_FALLBACK_COLOR
      features.push({
        type: 'Feature',
        properties: { 
          id: z.id, 
          nombre: z.nombre, 
          type: 'punto-interes', 
          tipoNombre: tipo?.nombre || 'Zona',
          source: 'zone-point',
          color: poiColor
        },
        geometry: z.geometria
      })
    }
  })

  return features.length > 0 ? { type: 'FeatureCollection', features } : null
})


onMounted(async () => {
  // Si la hacienda ya fue cargada en main.js (refresh flow), 
  // loadWithTraditionalMethod hace fetch idempotente (no duplica peticiones).
  await loadWithTraditionalMethod()
})

async function loadWithTraditionalMethod() {
  await Promise.all([
    haciendaStore.init(),
    bitacoraStore.cargarBitacoraEntries(haciendaStore.mi_hacienda?.id), // Correcto
    recordatoriosStore.cargarRecordatorios(),
    siembrasStore.cargarSiembras(),
    actividadesStore.cargarActividades(),
    zonasStore.cargarZonas(),
    programacionesStore.cargarProgramaciones()
  ])
}

async function handleRequestSingleExecution(programacion) {
  await programacionesStore.prepareForBitacoraEntryFromProgramacion(programacion)
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
