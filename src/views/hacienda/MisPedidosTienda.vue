<template>
  <v-container fluid class="pa-4 fade-in">
    <UniversalHeader
      title="Mis Compras y Pedidos de Insumos"
      subtitle="Historial de órdenes, seguimiento de despachos en camino y actas de recepción digital"
      icon="mdi-package-variant"
    >
      <template #chips>
        <v-chip color="primary" variant="flat" size="small" class="mr-2">
          {{ misCompras.length }} Pedidos Totales
        </v-chip>
      </template>
    </UniversalHeader>

    <v-card variant="flat" border class="rounded-lg mt-4">
      <v-data-table
        :headers="headers"
        :items="misCompras"
        :loading="loading"
        density="comfortable"
        hover
        no-data-text="No has realizado pedidos en la tienda aún"
      >
        <template v-slot:item.codigo_orden="{ item }">
          <span class="font-weight-bold text-primary">{{ item.codigo_orden }}</span>
        </template>

        <template v-slot:item.asesor="{ item }">
          <div class="font-weight-medium">{{ item.expand?.asesor?.name || item.expand?.asesor?.email || 'Asesor' }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.expand?.asesor?.telefono || '' }}</div>
        </template>

        <template v-slot:item.itemsCount="{ item }">
          <span>{{ (item.items || []).length }} productos</span>
        </template>

        <template v-slot:item.total="{ item }">
          <span class="font-weight-bold">${{ item.total?.toFixed(2) }}</span>
        </template>

        <template v-slot:item.estado="{ item }">
          <v-chip :color="getStatusColor(item.estado)" size="small" variant="tonal" class="font-weight-medium">
            {{ formatEstado(item.estado) }}
          </v-chip>
        </template>

        <template v-slot:item.created="{ item }">
          <span class="text-caption">{{ formatDate(item.created) }}</span>
        </template>

        <template v-slot:item.actions="{ item }">
          <div class="d-flex align-center ga-1 justify-end">
            <!-- Botón Firmar Recepción si está en camino / despacho -->
            <v-btn
              v-if="item.estado === 'en_despacho'"
              color="success"
              size="small"
              variant="elevated"
              prepend-icon="mdi-draw"
              @click="openFirmaRecepcion(item)"
            >
              Firmar Recepción
            </v-btn>

            <!-- Ver detalle completo -->
            <v-btn
              icon="mdi-eye-outline"
              size="small"
              variant="text"
              color="primary"
              @click="openDetalleOrden(item)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo de Firma Digital de Recepción Conforme -->
    <v-dialog v-model="firmaDialog" max-width="600" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3 px-4">
          <div class="d-flex align-center">
            <v-icon icon="mdi-draw" class="mr-2" size="small" />
            <span class="text-h6 font-weight-bold">Acta de Recepción Conforme</span>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="firmaDialog = false" />
        </v-card-title>

        <v-card-text class="pa-4">
          <v-alert type="info" variant="tonal" density="compact" class="text-caption mb-3">
            Al estampar tu firma, confirmas que recibiste físicamente los insumos de la orden <strong>{{ ordenParaFirma?.codigo_orden }}</strong> en buen estado.
          </v-alert>

          <!-- Componente de Firma Universal -->
          <div class="border rounded pa-2 bg-surface">
            <UniversalSignature
              ref="signatureRef"
              @signature-saved="onSignatureSaved"
            />
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3 px-4 bg-surface">
          <v-spacer />
          <v-btn color="grey" variant="text" @click="firmaDialog = false">Cancelar</v-btn>
          <v-btn
            color="success"
            variant="elevated"
            :loading="confirmandoFirma"
            prepend-icon="mdi-check-circle"
            @click="handleGuardarFirma"
          >
            Confirmar y Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo Detalle de Orden -->
    <TiendaDetalleOrdenDialog
      v-model="detalleOrdenDialog"
      :orden="selectedOrden"
    />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatDate } from '@/utils/formatters'
import { useTiendaAsesorStore } from '@/stores/tiendaAsesorStore'
import UniversalHeader from '@/components/UniversalHeader.vue'
import UniversalSignature from '@/components/common/UniversalSignature.vue'
import TiendaDetalleOrdenDialog from '@/components/tienda/TiendaDetalleOrdenDialog.vue'

const tiendaStore = useTiendaAsesorStore()

const detalleOrdenDialog = ref(false)
const selectedOrden = ref(null)

const firmaDialog = ref(false)
const confirmandoFirma = ref(false)
const ordenParaFirma = ref(null)
const signatureRef = ref(null)

const misCompras = computed(() => tiendaStore.misCompras)
const loading = computed(() => tiendaStore.loadingMisCompras)

const headers = [
  { title: 'N° Orden', key: 'codigo_orden' },
  { title: 'Asesor Proveedor', key: 'asesor' },
  { title: 'Ítems', key: 'itemsCount' },
  { title: 'Total', key: 'total' },
  { title: 'Estado de Despacho', key: 'estado' },
  { title: 'Fecha', key: 'created' },
  { title: 'Acciones', key: 'actions', align: 'end', sortable: false }
]

onMounted(async () => {
  await tiendaStore.fetchMisCompras()
})

function openDetalleOrden(orden) {
  selectedOrden.value = orden
  detalleOrdenDialog.value = true
}

function openFirmaRecepcion(orden) {
  ordenParaFirma.value = orden
  firmaDialog.value = true
}

function handleGuardarFirma() {
  if (signatureRef.value) {
    signatureRef.value.saveSignature()
  }
}

async function onSignatureSaved(signatureDataUrl) {
  if (!ordenParaFirma.value?.id) return

  confirmandoFirma.value = true
  try {
    await tiendaStore.confirmarRecepcionFirma(ordenParaFirma.value.id, signatureDataUrl)
    firmaDialog.value = false
  } catch (err) {
    console.error('Error confirmando firma:', err)
  } finally {
    confirmandoFirma.value = false
  }
}

function getStatusColor(estado) {
  switch (estado) {
    case 'pago_aprobado':
    case 'entregado':
    case 'completado':
      return 'success'
    case 'pago_en_verificacion':
    case 'en_preparacion':
      return 'warning'
    case 'en_despacho':
      return 'info'
    case 'cancelado':
      return 'error'
    default:
      return 'grey'
  }
}

function formatEstado(estado) {
  switch (estado) {
    case 'pendiente_pago': return 'Pendiente Pago'
    case 'pago_en_verificacion': return 'Pago por Verificar'
    case 'pago_aprobado': return 'Pago Aprobado'
    case 'en_preparacion': return 'En Preparación'
    case 'en_despacho': return 'En Despacho / Camino'
    case 'entregado': return 'Entregado Conforme'
    case 'completado': return 'Completado'
    case 'cancelado': return 'Cancelado'
    default: return estado || 'N/A'
  }
}
</script>
