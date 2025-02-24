<template>
  <v-container fluid class="pa-2">
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                Gestión de Programaciones
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
                color="#6380a247"
                prepend-icon="mdi-plus"
                @click="openNuevaProgramacion"
                class="min-w-[210px]"
              >
                Nueva Programacion
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
      <v-container>
        <!-- Grupo por Siembras -->
        <div
          v-for="(grupo, nombreSiembra) in groupedProgramaciones.siembras"
          :key="'siembra-' + nombreSiembra"
        >
          <v-card-title class="text-h6 mb-4 bg-green-lighten-5">
            <v-icon left>mdi-sprout</v-icon>
            Siembra: {{ nombreSiembra }}
          </v-card-title>

          <ProgramacionPanel
            v-for="programacion in grupo"
            :key="programacion.id"
            :programacion="programacion"
            @editar="openEditarProgramacion"
            @ejecutar="ejecutarProgramacion"
          />
        </div>

        <!-- Grupo por Actividades sin Siembra -->
        <div
          v-for="(grupo, nombreActividad) in groupedProgramaciones.actividades"
          :key="'actividad-' + nombreActividad"
        >
          <v-card-title class="text-h6 mb-4 bg-blue-lighten-5">
            <v-icon left>mdi-tools</v-icon>
            Actividad: {{ nombreActividad }}
          </v-card-title>

          <ProgramacionPanel
            v-for="programacion in grupo"
            :key="programacion.id"
            :programacion="programacion"
            @editar="openEditarProgramacion"
            @ejecutar="ejecutarProgramacion"
          />
        </div>

        <v-alert
          v-if="
            !programacionesStore.loading &&
            programacionesStore.programacionesPorHacienda.length === 0
          "
          type="info"
          class="mt-4"
        >
          No hay programaciones registradas
        </v-alert>
      </v-container>
    </main>

    <ProgramacionForm
      v-model="showForm"
      :programacion-actual="programacionEditando"
      @guardado="handleGuardado"
    />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSyncStore } from '@/stores/syncStore'
import ProgramacionForm from '@/components/forms/ProgramacionForm.vue'
import ProgramacionPanel from '@/components/ProgramacionPanel.vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useProfileStore } from '@/stores/profileStore'
import { storeToRefs } from 'pinia'
import { useSiembrasStore } from '@/stores/siembrasStore'

const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const siembrasStore = useSiembrasStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const userRole = computed(() => profileStore.user.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

const programacionesStore = useProgramacionesStore()
const actividadesStore = useActividadesStore()
const syncStore = useSyncStore()
const showForm = ref(false)
const programacionEditando = ref(null)

const { tiposActividades } = storeToRefs(actividadesStore)

onMounted(async () => {
  // Asegurar que syncStore está inicializado
  await syncStore.init()

  // Intentar cargar desde caché primero
  await programacionesStore.cargarProgramaciones()

  // Cargar actividades si no están en caché
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

  programacionesPorHacienda.value.forEach((programacion) => {
    const siembrasRelacionadas = programacion.siembras
    const actividadesNames = programacion.actividades
      .map((id) => actividadesStore.getNombreActividad(id))
      .join(', ')

    if (siembrasRelacionadas?.length > 0) {
      siembrasRelacionadas.forEach((siembraId) => {
        const nombreSiembra = siembrasStore.getSiembraNombre(siembraId)
        if (!grupos.siembras[nombreSiembra]) {
          grupos.siembras[nombreSiembra] = []
        }
        grupos.siembras[nombreSiembra].push(programacion)
      })
    } else {
      if (!grupos.actividades[actividadesNames]) {
        grupos.actividades[actividadesNames] = []
      }
      grupos.actividades[actividadesNames].push(programacion)
    }
  })

  return grupos
})

const getEstadoColor = (estado) => {
  const colors = {
    activo: 'green',
    pausado: 'orange',
    finalizado: 'red'
  }
  return colors[estado] || 'gray'
}

const getNombreActividad = (actividadId) => {
  const actividad = actividadesStore.actividades.find((a) => a.id === actividadId)
  return actividad?.nombre || 'Actividad no encontrada'
}

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

const getActividadTipo = (actividadId) => {
  const actividad = actividadesStore.actividades.find((a) => a.id === actividadId)
  if (actividad?.tipo_actividades?.length > 0) {
    const tipo = tiposActividades.value.find((t) => t.id === actividad.tipo_actividades[0])
    return tipo?.nombre || ''
  }
  return ''
}
</script>
