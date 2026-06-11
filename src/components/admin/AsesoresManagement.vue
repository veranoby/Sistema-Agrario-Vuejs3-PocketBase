<template>
  <v-container fluid class="asesores-management">
    <h3 class="text-md mb-4">Gestión de Asesores Técnicos</h3>

    <v-row>
      <!-- Listado de Asesores -->
      <v-col cols="12" md="5">
        <v-card class="mb-4">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Asesores Registrados</span>
            <v-text-field
              v-model="searchQuery"
              label="Buscar asesor..."
              prepend-inner-icon="mdi-magnify"
              dense
              hide-details
              variant="outlined"
              density="compact"
              style="max-width: 200px;"
            />
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="filteredAsesores"
            :loading="loading"
            class="elevation-0"
            hover
            density="comfortable"
            :items-per-page="10"
            @click:row="selectAsesor"
          >
            <template v-slot:item.fullName="{ item }">
              {{ item.name }} {{ item.lastname }}
            </template>
            <template v-slot:item.status="{ item }">
              <v-chip :color="item.status === 'active' ? 'success' : 'warning'" size="small">
                {{ item.status === 'active' ? 'Activo' : 'Suspendido' }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card>
      </v-col>

      <!-- Panel de Detalles y Operaciones -->
      <v-col cols="12" md="7">
        <v-card v-if="selectedAsesor" class="advisor-detail-card">
          <v-card-title class="bg-primary text-white d-flex align-center">
            <v-avatar color="white" class="mr-3" size="40">
              <v-icon color="primary">mdi-account-tie-hat</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6">{{ selectedAsesor.name }} {{ selectedAsesor.lastname }}</div>
              <span class="text-caption">{{ selectedAsesor.email }}</span>
            </div>
          </v-card-title>

          <v-card-text class="pt-4">
            <!-- Información del Perfil del Asesor (Info JSON parseada) -->
            <div class="mb-4 bg-grey-lighten-4 p-3 rounded-lg border">
              <h3 class="  font-weight-bold mb-2">Información del Asesor</h3>
              <v-row density="compact">
                <v-col cols="12" sm="6">
                  <strong>Colegiatura:</strong> {{ parsedInfo.numero_colegiatura || 'N/A' }}
                </v-col>
                <v-col cols="12" sm="6">
                  <strong>Zonas Cobertura:</strong> {{ parsedInfo.zonas_cobertura || 'N/A' }}
                </v-col>
                <v-col cols="12">
                  <strong>Especialidades:</strong> {{ parsedInfo.especialidades || 'N/A' }}
                </v-col>
                <v-col cols="12" v-if="parsedInfo.bio_corta">
                  <strong>Bio:</strong> 
                  <p class="text-smtext-grey-darken-2 mt-1">{{ parsedInfo.bio_corta }}</p>
                </v-col>
              </v-row>
            </div>

            <!-- Tabs de Relaciones Operacionales -->
            <v-tabs v-model="activeTab" bg-color="transparent" color="primary" grow>
              <v-tab value="vinculaciones">Vinculaciones ({{ relaciones.vinculaciones.length }})</v-tab>
              <v-tab value="paquetes">Paquetes ({{ relaciones.paquetes.length }})</v-tab>
              <v-tab value="recetas">Recetas ({{ relaciones.recetas.length }})</v-tab>
            </v-tabs>

            <v-window v-model="activeTab" class="mt-4">
              <!-- Window: Vinculaciones -->
              <v-window-item value="vinculaciones">
                <v-data-table
                  :headers="vincHeaders"
                  :items="relaciones.vinculaciones"
                  :loading="loadingRelaciones"
                  no-data-text="No hay vinculaciones activas"
                >
                  <template v-slot:item.hacienda="{ item }">
                    {{ item.expand?.hacienda_id?.nombre || item.expand?.hacienda_id?.name || 'Desconocida' }}
                  </template>
                  <template v-slot:item.fecha_vinculacion="{ item }">
                    {{ formatDate(item.fecha_vinculacion || item.created) }}
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="viewRelItem('vinculacion', item)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteRelItem('vinculaciones_asesor', item.id)" />
                  </template>
                </v-data-table>
              </v-window-item>

              <!-- Window: Paquetes -->
              <v-window-item value="paquetes">
                <v-data-table
                  :headers="paqHeaders"
                  :items="relaciones.paquetes"
                  :loading="loadingRelaciones"
                  no-data-text="No hay paquetes de evaluación"
                >
                  <template v-slot:item.hacienda="{ item }">
                    {{ item.expand?.hacienda_id?.nombre || item.expand?.hacienda_id?.name || 'Desconocida' }}
                  </template>
                  <template v-slot:item.fecha="{ item }">
                    {{ formatDate(item.created) }}
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="viewRelItem('paquete', item)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteRelItem('paquetes_evaluacion', item.id)" />
                  </template>
                </v-data-table>
              </v-window-item>

              <!-- Window: Recetas -->
              <v-window-item value="recetas">
                <v-data-table
                  :headers="recHeaders"
                  :items="relaciones.recetas"
                  :loading="loadingRelaciones"
                  no-data-text="No ha emitido recetas"
                >
                  <template v-slot:item.hacienda="{ item }">
                    {{ item.expand?.hacienda_id?.nombre || item.expand?.hacienda_id?.name || 'Desconocida' }}
                  </template>
                  <template v-slot:item.fecha="{ item }">
                    {{ formatDate(item.created) }}
                  </template>
                  <template v-slot:item.actions="{ item }">
                    <v-btn icon="mdi-eye" size="small" variant="text" color="primary" @click="viewRelItem('receta', item)" />
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteRelItem('recetas', item.id)" />
                  </template>
                </v-data-table>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>

        <!-- Placeholder -->
        <v-card v-else class="d-flex flex-column align-center justify-center py-12 bg-grey-lighten-4">
          <v-icon size="64" color="grey">mdi-account-tie-hat</v-icon>
          <span class="text-grey mt-2">Seleccione un asesor para administrar sus registros operativos</span>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog: Detalles de Item Operacional -->
    <v-dialog v-model="detailDialog" max-width="600">
      <v-card>
        <v-card-title class="bg-secondary text-white">
          Detalles de {{ detailType === 'vinculacion' ? 'Vinculación' : detailType === 'paquete' ? 'Paquete' : 'Receta' }}
        </v-card-title>
        <v-card-text class="pt-4">
          <div v-if="selectedItem">
            <template v-if="detailType === 'vinculacion'">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Hacienda</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.expand?.hacienda_id?.nombre || selectedItem.expand?.hacienda_id?.name || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Fecha Vinculación</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(selectedItem.fecha_vinculacion || selectedItem.created) }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Estado</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.estado || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Iniciada Por</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.iniciada_por || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
            <template v-else-if="detailType === 'paquete'">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Hacienda</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.expand?.hacienda_id?.nombre || selectedItem.expand?.hacienda_id?.name || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Estado</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.estado || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Notas de Hacienda</v-list-item-title>
                  <v-list-item-subtitle style="white-space: pre-wrap">{{ selectedItem.notas_hacienda || 'Sin notas' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Fecha Envío</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(selectedItem.created) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
            <template v-else-if="detailType === 'receta'">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Código</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.codigo }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Hacienda</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.expand?.hacienda_id?.nombre || selectedItem.expand?.hacienda_id?.name || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Producto Recomendado</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.producto_recomendado || 'N/A' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Dosis</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedItem.dosis }} {{ selectedItem.unidad_dosis }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Observaciones</v-list-item-title>
                  <v-list-item-subtitle style="white-space: pre-wrap">{{ selectedItem.observaciones_tecnicas || 'Sin observaciones' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Fecha Emisión</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(selectedItem.created) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </template>
          </div>
        </v-card-text>
        <v-card-actions class="pb-4 pr-4">
          <v-spacer />
          <v-btn color="grey" variant="elevated" @click="detailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { formatDate } from '@/utils/formatters'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const uiFeedbackStore = useUiFeedbackStore()

// Listado de Asesores
const loading = ref(false)
const asesores = ref([])
const searchQuery = ref('')
const selectedAsesor = ref(null)

// Relaciones
const activeTab = ref('vinculaciones')
const loadingRelaciones = ref(false)
const relaciones = ref({
  vinculaciones: [],
  paquetes: [],
  recetas: []
})

// Dialog Detalles
const detailDialog = ref(false)
const detailType = ref('')
const selectedItem = ref(null)

const headers = [
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Nombre', key: 'fullName', sortable: false },
  { title: 'Estado', key: 'status', sortable: true }
]

const vincHeaders = [
  { title: 'Hacienda', key: 'hacienda', sortable: true },
  { title: 'Fecha', key: 'fecha_vinculacion', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

const paqHeaders = [
  { title: 'Hacienda', key: 'hacienda', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Estado', key: 'estado', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

const recHeaders = [
  { title: 'Código', key: 'codigo', sortable: true },
  { title: 'Hacienda', key: 'hacienda', sortable: true },
  { title: 'Fecha', key: 'fecha', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

const filteredAsesores = computed(() => {
  let result = asesores.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.lastname?.toLowerCase().includes(q)
    )
  }
  return result
})

const parsedInfo = computed(() => {
  if (!selectedAsesor.value?.info) return {}
  try {
    return typeof selectedAsesor.value.info === 'string'
      ? JSON.parse(selectedAsesor.value.info)
      : selectedAsesor.value.info
  } catch (e) {
    return {}
  }
})

onMounted(async () => {
  await fetchAsesores()
})

async function fetchAsesores() {
  loading.value = true
  try {
    asesores.value = await pb.collection('users').getFullList({
      filter: 'role = "asesor"',
      sort: '-created'
    })
  } catch (err) {
    handleError(err, 'Error al cargar asesores')
  } finally {
    loading.value = false
  }
}

async function selectAsesor(event, { item }) {
  selectedAsesor.value = item
  await fetchRelaciones(item.id)
}

async function fetchRelaciones(asesorId) {
  loadingRelaciones.value = true
  try {
    const [vincs, packs, recs] = await Promise.all([
      pb.collection('vinculaciones_asesor').getFullList({
        filter: `asesor_id = "${asesorId}"`,
        expand: 'hacienda_id',
        sort: '-created'
      }).catch(() => []),
      pb.collection('paquetes_evaluacion').getFullList({
        filter: `asesor_id = "${asesorId}"`,
        expand: 'hacienda_id',
        sort: '-created'
      }).catch(() => []),
      pb.collection('recetas').getFullList({
        filter: `asesor_id = "${asesorId}"`,
        expand: 'hacienda_id',
        sort: '-created'
      }).catch(() => [])
    ])
    relaciones.value.vinculaciones = vincs
    relaciones.value.paquetes = packs
    relaciones.value.recetas = recs
  } catch (err) {
    console.error('Error cargando relaciones del asesor:', err)
  } finally {
    loadingRelaciones.value = false
  }
}

function viewRelItem(type, item) {
  detailType.value = type
  selectedItem.value = item
  detailDialog.value = true
}

async function deleteRelItem(collection, id) {
  if (!confirm('¿Está seguro de eliminar este registro operacional?')) return
  try {
    await pb.collection(collection).delete(id)
    uiFeedbackStore.showSnackbar('Registro eliminado correctamente', 'success')
    if (selectedAsesor.value) {
      await fetchRelaciones(selectedAsesor.value.id)
    }
  } catch (err) {
    handleError(err, 'Error al eliminar el registro')
  }
}
</script>

<style scoped>
.asesores-management {
  max-width: 1400px;
  margin: 0 auto;
}
.advisor-detail-card {
  border-radius: 8px;
}
</style>
