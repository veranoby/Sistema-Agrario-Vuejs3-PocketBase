<template>
  <v-container fluid class="superadmin-suscripciones">
    <h2 class="text-h5 mb-4">Gestión de Suscripciones</h2>

    <v-card class="mb-4">
      <v-tabs v-model="tab" bg-color="primary">
        <v-tab value="pendientes">Pendientes</v-tab>
        <v-tab value="historial">Historial</v-tab>
      </v-tabs>

      <v-card-text>
        <v-window v-model="tab">
          <!-- PENDIENTES -->
          <v-window-item value="pendientes">
            <v-data-table
              :headers="headers"
              :items="pendientes"
              :loading="loading"
              class="elevation-1"
            >
              <template v-slot:item.hacienda="{ item }">
                {{ item.expand?.hacienda?.name || 'Desconocida' }}
              </template>
              <template v-slot:item.solicitante="{ item }">
                {{ item.expand?.solicitante?.email || 'Desconocido' }}
              </template>
              <template v-slot:item.tipo="{ item }">
                <v-chip size="small" :color="item.tipo === 'plan_upgrade' ? 'primary' : 'secondary'">
                  {{ item.tipo === 'plan_upgrade' ? 'Mejora Plan' : 'Módulo Extra' }}
                </v-chip>
              </template>
              <template v-slot:item.detalle="{ item }">
                <span v-if="item.tipo === 'plan_upgrade'">
                  Plan: {{ item.expand?.plan_solicitado?.nombre || '?' }}
                </span>
                <span v-else>
                  Módulo: {{ item.modulo_solicitado }}
                </span>
              </template>
              <template v-slot:item.comprobante="{ item }">
                <v-btn size="small" color="info" variant="text" @click="viewReceipt(item)">
                  Ver Comprobante
                </v-btn>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn size="small" color="success" class="mr-2" @click="openApproveModal(item)">Aprobar</v-btn>
                <v-btn size="small" color="error" @click="openRejectModal(item)">Rechazar</v-btn>
              </template>
            </v-data-table>
          </v-window-item>

          <!-- HISTORIAL -->
          <v-window-item value="historial">
            <v-data-table
              :headers="historyHeaders"
              :items="historial"
              :loading="loading"
              class="elevation-1"
            >
              <template v-slot:item.hacienda="{ item }">
                {{ item.expand?.hacienda?.name || 'Desconocida' }}
              </template>
              <template v-slot:item.estado="{ item }">
                <v-chip size="small" :color="item.estado === 'aprobada' ? 'success' : 'error'">
                  {{ item.estado.toUpperCase() }}
                </v-chip>
              </template>
            </v-data-table>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <!-- Modal Visor Comprobante -->
    <v-dialog v-model="receiptModal" max-width="800">
      <v-card>
        <v-toolbar color="primary" title="Comprobante de Pago">
            <v-spacer></v-spacer>
            <v-btn icon @click="receiptModal = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-toolbar>
        <v-card-text class="text-center pa-4">
          <img v-if="isImage" :src="receiptUrl" style="max-width: 100%; max-height: 70vh;" />
          <iframe v-else-if="isPdf" :src="receiptUrl" style="width: 100%; height: 70vh;" frameborder="0"></iframe>
          <p v-else>Formato no soportado para previsualización.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" :href="receiptUrl" target="_blank" download>Descargar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Aprobar -->
    <v-dialog v-model="approveModal" max-width="500">
      <v-card>
        <v-card-title>Confirmar Aprobación</v-card-title>
        <v-card-text>
          ¿Estás seguro de aprobar esta solicitud?<br><br>
          <div v-if="selectedItem?.tipo === 'plan_upgrade'">
            Se cambiará el plan de la hacienda a <strong>{{ selectedItem?.expand?.plan_solicitado?.nombre }}</strong>.
          </div>
          <div v-else>
            Se añadirá el módulo <strong>{{ selectedItem?.modulo_solicitado }}</strong> a la hacienda.
          </div>
          <br>
          La suscripción se extenderá por 30 días a partir de hoy.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="approveModal = false">Cancelar</v-btn>
          <v-btn color="success" :loading="processing" @click="processApprove">Aprobar y Aplicar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Rechazar -->
    <v-dialog v-model="rejectModal" max-width="500">
      <v-card>
        <v-card-title>Rechazar Solicitud</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="rejectReason"
            label="Motivo del rechazo (opcional)"
            rows="3"
            variant="outlined"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="rejectModal = false">Cancelar</v-btn>
          <v-btn color="error" :loading="processing" @click="processReject">Rechazar Definitivamente</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'

const tab = ref('pendientes')
const loading = ref(false)
const pendientes = ref([])
const historial = ref([])
const processing = ref(false)

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

// Modals
const receiptModal = ref(false)
const receiptUrl = ref('')
const selectedItem = ref(null)
const isImage = ref(false)
const isPdf = ref(false)

const approveModal = ref(false)
const rejectModal = ref(false)
const rejectReason = ref('')

const headers = [
  { title: 'Fecha', key: 'created' },
  { title: 'Hacienda', key: 'hacienda' },
  { title: 'Solicitante', key: 'solicitante' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Detalle', key: 'detalle' },
  { title: 'Comprobante', key: 'comprobante' },
  { title: 'Acciones', key: 'actions', align: 'end' }
]

const historyHeaders = [
  { title: 'Fecha', key: 'created' },
  { title: 'Hacienda', key: 'hacienda' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Estado', key: 'estado' },
  { title: 'Notas Admin', key: 'notas_admin' }
]

onMounted(() => {
  fetchData()
})

const fetchData = async () => {
  loading.value = true
  try {
    const resPendientes = await pb.collection('solicitudes_suscripcion').getFullList({
      filter: 'estado = "pendiente"',
      expand: 'hacienda,solicitante,plan_solicitado',
      sort: '-created'
    })
    pendientes.value = resPendientes.map(item => {
        item.created = new Date(item.created).toLocaleDateString()
        return item
    })

    const resHistorial = await pb.collection('solicitudes_suscripcion').getFullList({
      filter: 'estado != "pendiente"',
      expand: 'hacienda,plan_solicitado',
      sort: '-updated'
    })
    historial.value = resHistorial.map(item => {
        item.created = new Date(item.created).toLocaleDateString()
        return item
    })
  } catch (error) {
    console.error("Error fetching", error)
    showSnackbar('Error al cargar datos', 'error')
  } finally {
    loading.value = false
  }
}

const viewReceipt = (item) => {
  selectedItem.value = item
  receiptUrl.value = pb.files.getUrl(item, item.comprobante)

  const ext = item.comprobante.split('.').pop().toLowerCase()
  isImage.value = ['jpg', 'jpeg', 'png'].includes(ext)
  isPdf.value = ext === 'pdf'

  receiptModal.value = true
}

const openApproveModal = (item) => {
  selectedItem.value = item
  approveModal.value = true
}

const openRejectModal = (item) => {
  selectedItem.value = item
  rejectReason.value = ''
  rejectModal.value = true
}

const processApprove = async () => {
  processing.value = true
  try {
    const haciendaId = selectedItem.value.hacienda
    const itemData = selectedItem.value

    // 1. Calcular nueva fecha de expiración (+30 días desde hoy)
    const newEndDate = new Date()
    newEndDate.setDate(newEndDate.getDate() + 30)

    // 2. Preparar payload de hacienda
    const haciendaPayload = {
      subscription_end: newEndDate.toISOString()
    }

    if (itemData.tipo === 'plan_upgrade') {
      haciendaPayload.plan = itemData.plan_solicitado
    } else if (itemData.tipo === 'modulo_addon') {
      // Necesitamos fetchear hacienda para obtener active_modules actual
      const hacienda = await pb.collection('Haciendas').getOne(haciendaId)
      const currentModules = hacienda.active_modules || []
      if (!currentModules.includes(itemData.modulo_solicitado)) {
          currentModules.push(itemData.modulo_solicitado)
          haciendaPayload.active_modules = currentModules
      }
    }

    // 3. Patch a Hacienda
    await pb.collection('Haciendas').update(haciendaId, haciendaPayload)

    // 4. Patch a Solicitud
    await pb.collection('solicitudes_suscripcion').update(itemData.id, {
      estado: 'aprobada',
      notas_admin: 'Aprobado automáticamente por SuperAdmin'
    })

    showSnackbar('Solicitud aprobada y hacienda actualizada', 'success')
    approveModal.value = false
    fetchData()
  } catch (e) {
    console.error(e)
    showSnackbar('Error al aprobar', 'error')
  } finally {
    processing.value = false
  }
}

const processReject = async () => {
  processing.value = true
  try {
    await pb.collection('solicitudes_suscripcion').update(selectedItem.value.id, {
      estado: 'rechazada',
      notas_admin: rejectReason.value || 'Rechazado sin motivo'
    })

    showSnackbar('Solicitud rechazada', 'success')
    rejectModal.value = false
    fetchData()
  } catch (e) {
    console.error(e)
    showSnackbar('Error al rechazar', 'error')
  } finally {
    processing.value = false
  }
}

const showSnackbar = (msg, color) => {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.superadmin-suscripciones {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
