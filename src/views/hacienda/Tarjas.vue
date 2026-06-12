<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid class="pa-2">
    <div class="d-flex flex-column gap-4 w-100">
      <header class="w-100 bg-background shadow-sm p-0 mb-4">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0 text-uppercase">
                <v-icon icon="mdi-dolly" color="green-darken-3" class="mr-2"></v-icon> Registro de Cosechas (Tarjas)
                <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
                  {{ t('roles.' + userRole) }}
                </v-chip>
                <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
                  {{ t('dashboard.hacienda') }}: {{ mi_hacienda?.name }}
                </v-chip>
                <v-chip v-if="haciendaStore.isModuleActive('nomina_express')" color="indigo-darken-1" size="small" variant="flat" class="ml-2">
                  <v-icon start size="small">mdi-account-cash</v-icon>
                  Alimenta Nómina Express
                </v-chip>
              </h3>
              <p class="text-xs text-grey-darken-3 mt-1">
                Registro de volumen cosechado por lote y operario en tiempo real. Soporta funcionamiento offline.
              </p>
            </div>

            <div class="w-full sm:w-auto z-10 d-flex gap-2 hidden-sm-and-down" v-if="!mobile">
              <v-btn
                prepend-icon="mdi-plus-circle"
                color="primary"
                variant="flat"
                class="font-weight-bold text-white elevation-2 rounded-lg"
                @click="abrirRegistroForm"
              >
                Registrar Cosecha
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>



    <!-- Tabla principal -->
    <v-row>
      <v-col cols="12">
        <v-card class="rounded-lg bg-white shadow-sm border overflow-hidden">
          <v-toolbar color="transparent" flat class="px-4">
            <v-toolbar-title class="font-weight-bold text-grey-darken-4">
              Historial Reciente de Cosecha
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              icon="mdi-refresh"
              variant="text"
              color="green-darken-3"
              @click="recargarDatos"
              :loading="tarjasStore.loading"
            ></v-btn>
          </v-toolbar>
          <v-divider></v-divider>

          <v-data-table
            v-if="!mobile"
            :headers="headers"
            :items="filteredTarjas"
            :loading="tarjasStore.loading"
            loading-text="Cargando cosechas..."
            no-data-text="No hay registros de cosecha ingresados"
            class="elevation-0"
          >
            <!-- Fecha -->
            <template #[`item.fecha`]="{ item }">
              <span class="font-weight-medium">
                {{ formatFecha(item.fecha) }}
              </span>
            </template>

            <!-- Operario -->
            <template #[`item.operario`]="{ item }">
              <span class="font-weight-medium text-grey-darken-4">
                {{ getOperarioNombre(item) }}
              </span>
            </template>

            <!-- Siembra -->
            <template #[`item.siembra`]="{ item }">
              <span class="text-grey-darken-3">
                {{ getSiembraNombre(item) }}
              </span>
            </template>

            <!-- Cantidad y Unidad -->
            <template #[`item.cantidad`]="{ item }">
              <v-chip color="green-darken-2" variant="flat" size="small" class="font-weight-bold mr-2">
                {{ item.cantidad }} {{ item.tipo_unidad }}
              </v-chip>
              <v-chip v-if="item.cantidad_merma" color="red-darken-3" variant="outlined" size="small" class="font-weight-bold">
                -{{ item.cantidad_merma }} merma
              </v-chip>
            </template>

            <!-- Estado de Sincronización -->
            <template #[`item.sync`]="{ item }">
              <v-chip
                v-if="item._isTemp"
                color="amber-darken-2"
                variant="tonal"
                size="small"
                prepend-icon="mdi-cloud-off-outline"
                class="font-weight-bold"
              >
                Local (Offline)
              </v-chip>
              <v-chip
                v-else
                color="green-darken-3"
                variant="tonal"
                size="small"
                prepend-icon="mdi-cloud-check-outline"
                class="font-weight-bold"
              >
                Sincronizado
              </v-chip>
            </template>

            <!-- Acciones -->
            <template #[`item.acciones`]="{ item }">
              <v-btn
                v-if="puedeEliminar(item)"
                icon="mdi-delete"
                variant="text"
                color="red-darken-3"
                size="small"
                @click="eliminarRegistro(item)"
              ></v-btn>
              <span v-else class="text-xs text-grey-darken-1">-</span>
            </template>
          </v-data-table>
          
          <div v-else>
            <v-list class="bg-transparent pa-0" lines="three">
              <template v-if="filteredTarjas.length === 0">
                <div class="d-flex flex-column align-center pa-4 text-center">
                  <v-icon size="large" color="grey-lighten-1">mdi-dolly</v-icon>
                  <span class="text-grey-lighten-1 mt-2">No hay registros de cosecha</span>
                </div>
              </template>
              <template v-for="item in filteredTarjas" :key="item.id">
                <v-card class="mb-2 mx-2 rounded-lg elevation-1">
                  <v-list-item>
                    <template v-slot:prepend>
                      <v-avatar color="green-lighten-4" size="40">
                        <v-icon color="green-darken-3">mdi-basket</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-bold text-md">{{ getOperarioNombre(item) }}</v-list-item-title>
                    <v-list-item-subtitle class="text-xs text-grey-darken-1 d-flex flex-column">
                      <span>{{ formatFecha(item.fecha) }} &bull; {{ getSiembraNombre(item) }}</span>
                      <span class="d-flex align-center gap-1 mt-1">
                        <v-chip
                          v-if="item._isTemp"
                          color="amber-darken-2"
                          variant="tonal"
                          size="x-small"
                          prepend-icon="mdi-cloud-off-outline"
                        >Local</v-chip>
                        <v-chip
                          v-else
                          color="green-darken-3"
                          variant="tonal"
                          size="x-small"
                          prepend-icon="mdi-cloud-check-outline"
                        >Sync</v-chip>
                      </span>
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="d-flex flex-column align-end">
                        <div class="font-weight-bold   text-primary-3">
                          {{ item.cantidad }} {{ item.tipo_unidad }}
                        </div>
                        <div v-if="item.cantidad_merma" class="text-xs text-red-darken-3">
                          -{{ item.cantidad_merma }} merma
                        </div>
                        <v-btn
                          v-if="puedeEliminar(item)"
                          icon="mdi-delete"
                          variant="text"
                          color="red-darken-3"
                          size="small"
                          class="mt-1"
                          @click.stop="eliminarRegistro(item)"
                        ></v-btn>
                      </div>
                    </template>
                  </v-list-item>
                </v-card>
              </template>
            </v-list>
          </div>
        </v-card>
        <v-btn
          v-if="mobile"
          color="primary"
          icon="mdi-plus"
          size="x-large"
          position="fixed"
          location="bottom right"
          class="mb-4 mr-4 elevation-8"
          style="z-index: 100"
          @click="abrirRegistroForm"
        ></v-btn>
      </v-col>
    </v-row>

    <!-- Modal Formulario de Registro -->
    <RegistroTarjaForm
      v-model="registroDialog"
      @saved="onTarjaSaved"
    />
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTarjasStore } from '@/stores/tarjasStore'
import { useAuthStore } from '@/stores/authStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useUserStore } from '@/stores/userStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import RegistroTarjaForm from '@/components/tarjas/RegistroTarjaForm.vue'
import { logger } from '@/utils/logger'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

// Stores
const tarjasStore = useTarjasStore()
const authStore = useAuthStore()
const siembrasStore = useSiembrasStore()
const userStore = useUserStore()
const haciendaStore = useHaciendaStore()
const { mobile } = useDisplay()
const { t } = useI18n()
const { userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

// State
const registroDialog = ref(false)
const operadoresCatalogo = ref([])

// Headers de la tabla
const headers = [
  { title: 'Fecha', key: 'fecha', align: 'start', sortable: true },
  { title: 'Operario', key: 'operario', align: 'start', sortable: true },
  { title: 'Siembra / Lote', key: 'siembra', align: 'start', sortable: true },
  { title: 'Cosecha', key: 'cantidad', align: 'center', sortable: true },
  { title: 'Estado', key: 'sync', align: 'center', sortable: false },
  { title: 'Acciones', key: 'acciones', align: 'center', sortable: false }
]

// Computed: Filtrar según rol de operador
const filteredTarjas = computed(() => {
  const allTarjas = tarjasStore.tarjas || []
  if (authStore.user?.role === 'operador') {
    // El operador solo ve sus propias tarjas
    return allTarjas.filter(t => t.operario === authStore.user.id)
  }
  return allTarjas
})

const offlineCount = computed(() => {
  return filteredTarjas.value.filter(t => t._isTemp).length
})

// Acciones
const abrirRegistroForm = () => {
  registroDialog.value = true
}

const onTarjaSaved = async () => {
  // Recargar localmente por si acaso
  await tarjasStore.cargarTarjas().catch(e => logger.warn(e))
}

const recargarDatos = async () => {
  try {
    await tarjasStore.cargarTarjas()
  } catch (e) {
    logger.error('Error al recargar tarjas:', e)
  }
}

// Helpers formatters
const formatFecha = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

const getOperarioNombre = (item) => {
  if (item.expand?.operario?.name) {
    return item.expand.operario.name
  }
  // Buscar en el catálogo local de usuarios si no está expandido
  const matched = operadoresCatalogo.value.find(u => u.id === item.operario)
  if (matched) return matched.name
  
  if (item.operario === authStore.user?.id) {
    return authStore.user.name || 'Mi Registro'
  }
  return item.operario || 'Cargando...'
}

const getSiembraNombre = (item) => {
  if (item.expand?.siembra?.nombre) {
    return item.expand.siembra.nombre
  }
  // Buscar en el store de siembras
  const matched = siembrasStore.siembras.find(s => s.id === item.siembra)
  return matched ? matched.nombre : (item.siembra || 'Cargando...')
}

const formatTotalCosecha = (tipo) => {
  const sum = filteredTarjas.value
    .filter(t => t.tipo_unidad === tipo)
    .reduce((acc, t) => acc + ((Number(t.cantidad) || 0) - (Number(t.cantidad_merma) || 0)), 0)
  return sum > 0 ? sum : 0
}

const puedeEliminar = (item) => {
  // El administrador puede borrar cualquier registro
  if (authStore.user?.role === 'administrador') return true
  // El operador solo puede borrar sus propios registros temporales (offline pendientes de sync)
  return item._isTemp && item.operario === authStore.user?.id
}

const eliminarRegistro = async (item) => {
  if (confirm(`¿Está seguro que desea eliminar este registro de ${item.cantidad} ${item.tipo_unidad}?`)) {
    try {
      await tarjasStore.eliminarTarja(item.id)
    } catch (e) {
      logger.error('Error al eliminar registro:', e)
    }
  }
}

// Carga inicial
onMounted(async () => {
  // Inicializar store de siembras si está vacío
  if (siembrasStore.siembras.length === 0) {
    await siembrasStore.cargarSiembras().catch(e => logger.warn(e))
  }
  
  // Cargar tarjas
  await tarjasStore.cargarTarjas().catch(e => logger.warn(e))

  // Cargar usuarios para resolver nombres
  if (authStore.user?.role === 'administrador' && authStore.user?.hacienda) {
    try {
      const users = await userStore.fetchHaciendaUsers(authStore.user.hacienda)
      operadoresCatalogo.value = users.filter(u => u.role === 'operador')
    } catch (e) {
      logger.warn('No se pudo cargar el catálogo de operarios:', e)
    }
  }
})
</script>

<style scoped>
.rounded-lg {
  border-radius: 16px !important;
}
</style>
