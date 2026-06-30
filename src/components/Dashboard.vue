<template>
  <div class="flex flex-col min-h-screen">
    <div v-if="!mi_hacienda" class="text-center p-4">
      <v-alert type="warning" class="mx-auto max-w-md">
        {{ t('dashboard.no_hacienda_info') }}
      </v-alert>

    </div>
    <template v-else>
      <UniversalHeader 
        :title="t('dashboard.welcome_back', { fullName: fullName })"
        :bgImage="avatarHaciendaUrl"
      >
        <template #chips>
          <v-chip variant="flat" size="small" color="grey-lighten-2" pill>
            <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
            {{ t('roles.' + userRole) }}
          </v-chip>

          <v-chip variant="flat" size="small" color="green-lighten-3" pill>
            <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
            {{ t('dashboard.hacienda') }}: {{ mi_hacienda.name }}
          </v-chip>
        </template>

        <template #actions>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" prepend-icon="mdi-export" color="primary" variant="flat"
                class="font-weight-bold text-white elevation-2 rounded-lg">
                {{ t('dashboard.export') }}
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="exportReport('json')"><v-list-item-title>JSON</v-list-item-title></v-list-item>
              <v-list-item @click="exportReport('csv')"><v-list-item-title>CSV</v-list-item-title></v-list-item>
              <v-list-item @click="exportReport('md')"><v-list-item-title>Markdown (MD)</v-list-item-title></v-list-item>
            </v-list>
          </v-menu>
        </template>
      </UniversalHeader>

      <main role="main" aria-labelledby="dashboard-welcome-title" class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
        <div class="bg-card text-card-foreground">
          <div class="d-flex align-center justify-space-between mb-4 mt-2 px-2 border-b pb-2">
            <div class="  font-weight-bold text-medium-emphasis">Recordatorios</div>
            <v-btn
              size="small"
              variant="text"
              color="primary"
              prepend-icon="mdi-plus"
              @click="recordatoriosStore.abrirNuevoRecordatorio"
              aria-label="Crear nuevo recordatorio"
            >
              Nuevo
            </v-btn>
          </div>          <RecordatorioForm
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
          <!-- Funnel de Acción Inicial (UI/UX Refinado) -->
          <v-alert
            v-if="siembrasStore.siembras?.length === 0"
            color="indigo-darken-2"
            variant="tonal"
            icon="mdi-sprout"
            border="start"
            class="mb-4 rounded-lg"
          >
            <div class="d-flex align-center justify-space-between flex-wrap gap-4">
              <div class="text-md">
                <span class="font-weight-bold">Fase 1: Siembras.</span> Aún no tienes siembras. Crea el concepto general de tu proyecto para iniciar la trazabilidad.
              </div>
              <v-btn size="small" variant="elevated" color="indigo-darken-2" class="font-weight-bold" to="/siembras">
                Crear Siembra
              </v-btn>
            </div>
          </v-alert>
          
          <v-alert
            v-else-if="siembrasStore.siembras?.length > 0 && programacionesStore.programacionesPorHacienda?.length === 0"
            color="orange-darken-2"
            variant="tonal"
            icon="mdi-calendar-plus"
            border="start"
            class="mb-4 rounded-lg"
          >
            <div class="d-flex align-center justify-space-between flex-wrap gap-4">
              <div class="text-md">
                <span class="font-weight-bold">Fase 3: Control.</span> Tienes siembras activas pero sin programación futura. Planifica tus labores.
              </div>
              <v-btn size="small" variant="elevated" color="orange-darken-2" class="font-weight-bold" to="/programaciones">
                Planificar
              </v-btn>
            </div>
          </v-alert>

          <!-- SECCIÓN: Programaciones Vencidas (Nuevo) -->
          <div class="d-flex align-center justify-space-between mb-4 mt-2 px-2 border-b pb-2">
            <div class="  font-weight-bold text-medium-emphasis">Programaciones</div>
            <v-btn
              size="small"
              variant="text"
              color="primary"
              to="/programaciones"
            >
              Ver Todas
            </v-btn>
          </div>

          <v-card v-if="programacionesVencidas.length" class="bg-dinamico p-4 rounded-lg" color="transparent" flat>
            <v-card-title class="px-0 pb-4 d-flex align-center">
              <v-icon start color="error">mdi-clock-alert-outline</v-icon>
              <span class="text-h6 font-weight-bold text-error">{{ $t('dashboard.overdue_schedules') }}</span>
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
          
          <div v-else class="px-4 py-6 text-center rounded-lg mb-4 bg-transparent">
            <v-icon color="grey-lighten-1" size="32" class="mb-2">mdi-calendar-check</v-icon>
            <div class="text-smtext-medium-emphasis">No tienes programaciones pendientes para hoy.</div>
          </div>

        </div>


        <!-- Mapa Total de la Hacienda -->
        <div class="col-span-1 md:col-span-2 mt-4">
          <v-card variant="elevated" elevation="2" class="overflow-hidden border">
            <v-card-text class="pa-0">
              <div style="height: 1000px;">
                <GisMapComponent
                  v-if="haciendaGeoJSON || haciendaCenter"
                  :initialGeoJSON="haciendaGeoJSON"
                  :center="haciendaCenter || undefined"
                  :readonly="true"
                  :hacienda-name="mi_hacienda?.name"
                  :hacienda-gps="mi_hacienda?.gps"
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
import { useRouter } from 'vue-router'
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
import UniversalHeader from '@/components/UniversalHeader.vue'


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
const router = useRouter()

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

const parseGeometry = (geo) => {
  if (!geo) return null
  try {
    let parsed = typeof geo === 'string' ? JSON.parse(geo) : geo
    // Clonación profunda para asegurar objeto plano sin Proxies de Vue
    return JSON.parse(JSON.stringify(parsed))
  } catch (e) {
    console.warn('[DASHBOARD] Error parsing geometry', e)
    return null
  }
}

const haciendaGeoJSON = computed(() => {
  const features = []
  const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i

  // 0. Polígono de la Hacienda (Delimitador sin relleno)
  if (mi_hacienda.value?.geometria) {
    const haciendaGeom = parseGeometry(mi_hacienda.value.geometria)
    if (haciendaGeom) {
      features.push({
        type: 'Feature',
        properties: {
          id: mi_hacienda.value.id,
          nombre: `Perímetro: ${mi_hacienda.value.name}`,
          type: 'hacienda-boundary',
          noFill: true,
          color: '#4CAF50'
        },
        geometry: haciendaGeom
      })
    }
  }

  // 1. Procesar TODAS las zonas registradas (Lotes y Puntos de Interés)
  if (zonasStore.zonas && zonasStore.zonas.length > 0) {
    zonasStore.zonas.forEach(z => {
      let geom = parseGeometry(z.geometria)
      
      // Fallback: Si no hay geometría, intentar usar el campo gps como Point
      if (!geom && z.gps) {
        try {
          const gps = typeof z.gps === 'string' ? JSON.parse(z.gps) : z.gps
          if (gps?.lat && gps?.lng) {
            geom = {
              type: 'Point',
              coordinates: [Number(gps.lng), Number(gps.lat)] // GeoJSON usa [lng, lat]
            }
          }
        } catch (e) {
          console.warn('[DASHBOARD] Error parsing GPS to Point', e)
        }
      }

      if (!geom) {
        return
      }

      const tipo = zonasStore.tiposZonas?.find(t => t.id === z.tipos_zonas)
      const esLote = tipo?.nombre?.toLowerCase().includes('lote') || z.nombre?.toLowerCase().includes('lote')
      
      // Buscar si hay una siembra vinculada a esta zona
      let siembraVinculada = null
      if (z.siembra && siembrasStore.siembras) {
        siembraVinculada = siembrasStore.siembras.find(s => 
          Array.isArray(z.siembra) ? z.siembra.includes(s.id) : s.id === z.siembra
        )
      }

      if (esLote) {
         // El color prioriza el configurado en la zona, o depende del estado de la siembra, o café suave si está vacío
         const loteColor = (z.color && hexColorRegex.test(z.color)) ? z.color : (siembraVinculada 
           ? (SIEMBRA_COLORS[siembraVinculada.estado] || SIEMBRA_COLORS.finalizada) 
           : '#8d6e63') // Color tierra para lotes sin siembra
           
         features.push({
           type: 'Feature',
           properties: {
             id: z.id,
             nombre: siembraVinculada ? `${siembraVinculada.nombre} (${z.nombre})` : z.nombre,
             type: siembraVinculada ? 'siembra-lote' : 'lote',
             estado: siembraVinculada?.estado || 'Disponible',
             color: loteColor
           },
           geometry: geom
         })
      } else {
         // Es un Punto de Interés (Pin)
         const poiColor = hexColorRegex.test(z.color) ? z.color : POI_FALLBACK_COLOR
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
           geometry: geom
         })
      }
    })
  }

  // 2. Procesar Siembras con geometría directa (legado)
  if (siembrasStore.siembras) {
    siembrasStore.siembras.forEach(s => {
      const geom = parseGeometry(s.geometria)
      if (geom) {
         features.push({
           type: 'Feature',
           properties: { 
             id: s.id, 
             nombre: s.nombre, 
             type: 'siembra', 
             estado: s.estado, 
             color: SIEMBRA_COLORS[s.estado] || SIEMBRA_COLORS.finalizada 
           },
           geometry: geom
         })
      }
    })
  }

  return features.length > 0 ? { type: 'FeatureCollection', features } : null
})


onMounted(async () => {
  // Si la hacienda ya fue cargada en main.js (refresh flow), 
  // loadWithTraditionalMethod hace fetch idempotente (no duplica peticiones).
  await loadWithTraditionalMethod()
})

async function loadWithTraditionalMethod() {
  // CARGA SECUENCIAL: Evita race conditions con el ID de la hacienda
  await haciendaStore.init()
  
  const haciendaId = haciendaStore.mi_hacienda?.id
  if (haciendaId) {
    await Promise.all([
      bitacoraStore.cargarBitacoraEntries(haciendaId),
      recordatoriosStore.cargarRecordatorios(),
      siembrasStore.cargarSiembras(),
      actividadesStore.cargarActividades(),
      zonasStore.init(),
      programacionesStore.cargarProgramaciones()
    ])
  }
}

async function handleRequestSingleExecution(programacion) {
  const success = await programacionesStore.prepareForBitacoraEntryFromProgramacion(programacion)
  if (success) {
    router.push({ name: 'Bitácora' })
  }
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
