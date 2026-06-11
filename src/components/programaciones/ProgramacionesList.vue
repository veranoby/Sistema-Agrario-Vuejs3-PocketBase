<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                {{ t('schedules.schedule_management') }}
                <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ userRole }}
                </v-chip>
                <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start>
                    <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
                  </v-avatar>
                  {{ mi_hacienda.name }}
                </v-chip>
              </h3>
            </div>
            <div class="w-full sm:w-auto z-10 hidden-sm-and-down" v-if="actividadesStore.actividades.length > 0 && !mobile">
              <v-btn
                prepend-icon="mdi-plus-circle"
                color="primary"
                variant="flat"
                class="font-weight-bold text-white elevation-2 rounded-lg"

                @click="openNuevaProgramacion"
              >
                {{ t('schedules.new_schedule') }}
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <main class="flex-1 py-2">
      <v-container class="p-0">
        <v-row>
          <v-col
            cols="12"
            sm="6"
            md="4"
            lg="4"
            class="p-1"
            v-for="(grupo, nombreSiembra) in groupedProgramaciones.siembras"
            :key="'siembra-' + nombreSiembra"
          >
            <v-card-title class="font-bold text-sm bg-green-lighten-4 p-2 pb-1">
              <v-chip color="light-green" size="small" variant="flat" class="mr-2">
                <v-icon class="mr-2 text-white">mdi-sprout</v-icon>
                <span
                  ><router-link
                    :to="{
                      name: 'Ver Siembra/Proyecto',
                      params: { id: grupo[0].siembras[0] }
                    }"
                    class="text-white"
                  >
                    {{ t('schedules.sowing_project') }}: {{ nombreSiembra }}
                  </router-link></span
                >
              </v-chip>
            </v-card-title>

            <ProgramacionPanel
              v-for="programacion in grupo"
              :key="programacion.id"
              :programacion="programacion"
              bg-color="#5757572e"
              text-color="white"
              @editar="openEditarProgramacion"
              @ejecutar="ejecutarProgramacion"
              @request-single-execution="handleRequestSingleExecution"
            />
          </v-col>

          <v-col
            cols="12"
            sm="6"
            md="4"
            lg="4"
            class="p-1"
            v-for="(grupo, nombreActividad) in groupedProgramaciones.actividades"
            :key="'actividad-' + nombreActividad"
          >
            <v-card-title class="font-bold text-sm p-2 pb-1 bg-cyan-lighten-4">
              <v-icon left>mdi-tools</v-icon>
              <router-link
                :to="{ name: 'Ver Actividad', params: { id: grupo[0].actividades[0] } }"
                class="text-inherit hover:text-primary"
              >
                {{ t('schedules.activity') }}: {{ nombreActividad }}
              </router-link>
            </v-card-title>

            <ProgramacionPanel
              v-for="programacion in grupo"
              :key="programacion.id"
              :programacion="programacion"
              bg-color="#5757577d"
              text-color="white"
              @editar="openEditarProgramacion"
              @ejecutar="ejecutarProgramacion"
              @request-single-execution="handleRequestSingleExecution"
            />
          </v-col>

          <v-col v-if="!programacionesStore.loading && programacionesStore.programacionesPorHacienda?.length === 0" cols="12" md="10" offset-md="1" class="mt-4">
            <v-card class="pa-6 text-center rounded-xl elevation-0 border bg-surface">
              <v-icon size="48" color="primary" class="mb-3">mdi-calendar-alert</v-icon>
              <h3 class="text-md font-weight-bold mb-1">Fase 3: Control y Programación</h3>
              <p class="text-smtext-medium-emphasis mb-6">
                Aún no tienes programaciones. Asegúrate de haber completado las fases anteriores para poder planificar tus labores.
              </p>
              
              <v-timeline align="start" side="end" density="compact" class="text-left mt-4 mb-4">
                <v-timeline-item dot-color="success" size="small">
                  <template v-slot:icon><v-icon color="white" size="small">mdi-check</v-icon></template>
                  <div class="mb-1">
                    <div class="  font-weight-bold text-success">Fase 1 y 2: Estructura</div>
                    <div class="text-caption text-medium-emphasis">Se espera que ya existan Siembras, Zonas y Actividades.</div>
                  </div>
                </v-timeline-item>

                <v-timeline-item dot-color="primary" size="small">
                  <div class="mb-1">
                    <div class="  font-weight-bold">Fase 3: Programaciones (Estás aquí)</div>
                    <div class="text-caption text-medium-emphasis">Programa las actividades a ejecutar.</div>
                  </div>
                  <v-btn v-if="actividadesStore.actividades?.length > 0" size="small" variant="flat" color="primary" class="mt-2" @click="openNuevaProgramacion">Crear Programación</v-btn>
                  <v-btn v-else size="small" variant="outlined" color="primary" class="mt-2" to="/actividades">Ir a crear Actividades</v-btn>
                </v-timeline-item>

                <v-timeline-item dot-color="grey-lighten-2" size="small">
                  <div class="mb-1">
                    <div class="  font-weight-bold text-grey">Siguiente: Bitácora</div>
                    <div class="text-caption text-medium-emphasis">Al reportar una programación, se guardará en tu Libro Diario.</div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <ProgramacionForm
      v-model="showForm"
      :programacion-actual="programacionEditando"
      @guardado="handleGuardado"
    />

    <v-btn
      v-if="actividadesStore.actividades.length > 0 && mobile"
      color="primary"
      icon="mdi-plus"
      size="x-large"
      position="fixed"
      location="bottom right"
      class="mb-4 mr-4 elevation-8"
      style="z-index: 100"
      @click="openNuevaProgramacion"
    ></v-btn>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useProgramacionesStore } from '@/stores/programaciones'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSyncStore } from '@/stores/sync'
import ProgramacionForm from '@/components/forms/ProgramacionForm.vue'
import ProgramacionPanel from './ProgramacionPanel.vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useAuthStore } from '@/stores/authStore'
import { storeToRefs } from 'pinia'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useDisplay } from 'vuetify'

const { t } = useI18n()
const authStore = useAuthStore()
const { mobile } = useDisplay()
const siembrasStore = useSiembrasStore()
const haciendaStore = useHaciendaStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const userRole = computed(() => authStore.user.role)
const avatarUrl = computed(() => authStore.avatarUrl)

const router = useRouter()
const programacionesStore = useProgramacionesStore()
const actividadesStore = useActividadesStore()
const syncStore = useSyncStore()
const showForm = ref(false)
const programacionEditando = ref(null)

onMounted(async () => {
  await syncStore.init()
  await programacionesStore.cargarProgramaciones()
  if (!actividadesStore.actividades.length) {
    await actividadesStore.cargarActividades()
  }
})

const { programacionesPorHacienda } = storeToRefs(programacionesStore)

const groupedProgramaciones = computed(() => {
  const grupos = {
    siembras: {},
    actividades: {}
  }
  programacionesPorHacienda.value?.forEach((programacion) => {
    if (programacion.siembras?.length > 0) {
      programacion.siembras.forEach((siembraId) => {
        const nombreSiembra = siembrasStore.getSiembraNombre(siembraId)
        ;(grupos.siembras[nombreSiembra] ??= []).push(programacion)
      })
    } else {
      const actividadesNames = programacion.actividades
        .map(actividadesStore.getNombreActividad)
        .join(', ')
      ;(grupos.actividades[actividadesNames] ??= []).push(programacion)
    }
  })
  return grupos
})

const openNuevaProgramacion = () => {
  programacionEditando.value = null
  showForm.value = true
}

const openEditarProgramacion = (programacion) => {
  programacionEditando.value = programacion
  showForm.value = true
}

const ejecutarProgramacion = async (id) => {
  await programacionesStore.ejecutarProgramacion(id)
}

const handleGuardado = () => {
  showForm.value = false
  programacionEditando.value = null
}

const handleRequestSingleExecution = async (programacion) => {
  const success = await programacionesStore.prepareForBitacoraEntryFromProgramacion(programacion)
  if (success) {
    router.push({ name: 'Bitácora' })
  }
}
</script>