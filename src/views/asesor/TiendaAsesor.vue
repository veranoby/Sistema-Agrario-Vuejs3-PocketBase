<template>
  <v-container fluid class="pa-4 fade-in">
    <!-- Header Principal con KPIs Rápidos -->
    <UniversalHeader
      title="Mi Tienda de Insumos y Servicios"
      subtitle="Comercializa productos agronómicos, fitosanitarios acreditados y coordina despachos a haciendas"
      icon="mdi-storefront"
    >
      <template #chips>
        <v-chip color="teal-darken-3" variant="flat" size="small" class="mr-2" prepend-icon="mdi-cash-check">
          Facturado: ${{ totalFacturado.toFixed(2) }}
        </v-chip>
        <v-chip
          :color="ventasPendientesCount > 0 ? 'warning' : 'success'"
          variant="tonal"
          size="small"
          prepend-icon="mdi-clock-alert-outline"
        >
          {{ ventasPendientesCount }} por verificar
        </v-chip>
      </template>

      <template #actions>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-plus"
          class="font-weight-medium"
          @click="openCreateProductDialog"
        >
          Nuevo Producto
        </v-btn>
      </template>
    </UniversalHeader>

    <!-- Pestañas de Gestión -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4" density="comfortable">
      <v-tab value="catalogo" prepend-icon="mdi-format-list-bulleted">Catálogo de Productos ({{ misProductos.length }})</v-tab>
      <v-tab value="ventas" prepend-icon="mdi-truck-fast">Órdenes y Despachos ({{ misVentas.length }})</v-tab>
      <v-tab value="metricas" prepend-icon="mdi-chart-bar">Métricas Comerciales</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- ========================================== -->
      <!-- PESTAÑA 1: CATÁLOGO DE PRODUCTOS -->
      <!-- ========================================== -->
      <v-window-item value="catalogo">
        <v-row v-if="loadingProductos" justify="center" class="py-12">
          <v-progress-circular indeterminate color="primary" size="48" />
        </v-row>

        <v-row v-else-if="misProductos.length" dense>
          <v-col
            v-for="prod in misProductos"
            :key="prod.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card variant="flat" border class="h-100 d-flex flex-column rounded-lg">
              <!-- Foto o Placeholder -->
              <v-img
                :src="getProductPhotoUrl(prod)"
                height="160"
                cover
                class="bg-surface-light align-end text-white"
              >
                <div class="pa-2 d-flex justify-space-between w-100 bg-gradient-dark">
                  <v-chip size="x-small" color="surface" variant="flat" class="text-caption font-weight-bold">
                    {{ prod.categoria }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    :color="prod.estado === 'activo' ? 'success' : 'grey'"
                    variant="flat"
                  >
                    {{ prod.estado }}
                  </v-chip>
                </div>
              </v-img>

              <v-card-text class="pa-3 flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold text-truncate" :title="prod.nombre">
                  {{ prod.nombre }}
                </div>
                <div class="text-h6 text-primary font-weight-bold my-1">
                  ${{ prod.precio?.toFixed(2) }} <span class="text-caption text-medium-emphasis">/ {{ prod.unidad_medida }}</span>
                </div>

                <div class="d-flex align-center ga-1 my-2 flex-wrap">
                  <PhytosanitaryBadge
                    :country="prod.pais_origen"
                    :registro-numero="prod.registro_fitosanitario"
                    size="x-small"
                  />
                  <v-chip size="x-small" variant="outlined" color="info" prepend-icon="mdi-truck-delivery">
                    {{ prod.alcance_envio }}
                  </v-chip>
                </div>

                <div class="text-caption text-medium-emphasis text-truncate-2">
                  {{ prod.descripcion || 'Sin descripción adicional' }}
                </div>
              </v-card-text>

              <v-divider />

              <v-card-actions class="pa-2 px-3 bg-surface d-flex justify-space-between">
                <span class="text-caption font-weight-medium">
                  Stock: <strong>{{ prod.stock_disponible || '∞' }}</strong>
                </span>
                <div>
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    color="primary"
                    @click="openEditProductDialog(prod)"
                  />
                  <v-btn
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    color="error"
                    @click="handleDeleteProduct(prod)"
                  />
                </div>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-card v-else variant="flat" border class="pa-12 text-center rounded-lg">
          <v-icon icon="mdi-package-variant-closed" size="64" color="grey" class="mb-3" />
          <div class="text-h6 font-weight-medium">Aún no has publicado productos en tu tienda</div>
          <p class="text-caption text-medium-emphasis mb-4">
            Comienza a ofrecer insumos, bioestimulantes y servicios a las haciendas de tu red.
          </p>
          <v-btn color="primary" variant="elevated" prepend-icon="mdi-plus" @click="openCreateProductDialog">
            Publicar Primer Producto
          </v-btn>
        </v-card>
      </v-window-item>

      <!-- ========================================== -->
      <!-- PESTAÑA 2: ÓRDENES Y DESPACHOS -->
      <!-- ========================================== -->
      <v-window-item value="ventas">
        <v-card variant="flat" border class="rounded-lg">
          <v-data-table
            :headers="headersVentas"
            :items="misVentas"
            :loading="loadingVentas"
            density="comfortable"
            hover
            no-data-text="No hay órdenes de venta registradas"
          >
            <template v-slot:item.codigo_orden="{ item }">
              <span class="font-weight-bold text-primary">{{ item.codigo_orden }}</span>
            </template>

            <template v-slot:item.hacienda="{ item }">
              <div class="font-weight-medium">{{ item.expand?.hacienda?.name || item.expand?.hacienda?.nombre || 'Hacienda' }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.expand?.comprador?.name || item.expand?.comprador?.email }}</div>
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
                <!-- Ver Comprobante si está en verificación -->
                <v-btn
                  v-if="item.estado === 'pago_en_verificacion'"
                  color="success"
                  size="small"
                  variant="tonal"
                  prepend-icon="mdi-check-decagram"
                  @click="handleAprobarPago(item)"
                >
                  Aprobar Pago
                </v-btn>

                <!-- Despachar si está aprobado -->
                <v-btn
                  v-if="item.estado === 'pago_aprobado' || item.estado === 'en_preparacion'"
                  color="primary"
                  size="small"
                  variant="elevated"
                  prepend-icon="mdi-truck-fast"
                  @click="openDespachoDialog(item)"
                >
                  Despachar
                </v-btn>

                <!-- Ver detalles completos -->
                <v-btn
                  icon="mdi-eye-outline"
                  size="small"
                  variant="text"
                  color="grey-darken-1"
                  @click="openDetalleOrden(item)"
                />
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- ========================================== -->
      <!-- PESTAÑA 3: MÉTRICAS COMERCIALES -->
      <!-- ========================================== -->
      <v-window-item value="metricas">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-card variant="tonal" color="primary" class="rounded-lg pa-4">
              <div class="text-caption text-uppercase font-weight-bold">Volumen Total Vendido</div>
              <div class="text-h4 font-weight-bold mt-2">${{ totalFacturado.toFixed(2) }}</div>
              <div class="text-caption text-medium-emphasis mt-1">{{ misVentas.length }} órdenes procesadas</div>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card variant="tonal" color="teal" class="rounded-lg pa-4">
              <div class="text-caption text-uppercase font-weight-bold">Productos en Catálogo</div>
              <div class="text-h4 font-weight-bold mt-2">{{ misProductos.length }}</div>
              <div class="text-caption text-medium-emphasis mt-1">Insumos y servicios activos</div>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card variant="tonal" color="info" class="rounded-lg pa-4">
              <div class="text-caption text-uppercase font-weight-bold">Despachos Completados</div>
              <div class="text-h4 font-weight-bold mt-2">
                {{ misVentas.filter(v => v.estado === 'entregado' || v.estado === 'completado').length }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">Con acta de recepción conforme</div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Diálogo Crear/Editar Producto -->
    <TiendaProductoDialog
      v-model="productDialog"
      :producto="selectedProduct"
      @saved="onProductSaved"
    />

    <!-- Diálogo Despacho / Guía de Remisión -->
    <v-dialog v-model="despachoDialog" max-width="550">
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white py-3 px-4 d-flex align-center justify-space-between">
          <span class="text-h6">Registrar Despacho de Pedido</span>
          <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="despachoDialog = false" />
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="text-body-2 mb-3">
            Ingrese el número de guía o adjunte la foto de la guía de remisión / flete para notificar a la hacienda.
          </p>
          <v-text-field
            v-model="despachoForm.numero_guia"
            label="Número de Guía o Transportista"
            placeholder="Ej: Servientrega 123456789 / Camión propio"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-barcode"
            class="mb-2"
          />
          <v-file-input
            v-model="despachoForm.guia_file"
            label="Foto o PDF de Guía de Remisión"
            accept="image/*, application/pdf"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-camera"
            show-size
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3 px-4">
          <v-spacer />
          <v-btn color="grey" variant="text" @click="despachoDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="despachoLoading"
            prepend-icon="mdi-send"
            @click="handleConfirmarDespacho"
          >
            Confirmar Despacho
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
import { pb } from '@/utils/pocketbase'
import { formatDate } from '@/utils/formatters'
import { useTiendaAsesorStore } from '@/stores/tiendaAsesorStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import UniversalHeader from '@/components/UniversalHeader.vue'
import PhytosanitaryBadge from '@/components/common/PhytosanitaryBadge.vue'
import TiendaProductoDialog from '@/components/tienda/TiendaProductoDialog.vue'
import TiendaDetalleOrdenDialog from '@/components/tienda/TiendaDetalleOrdenDialog.vue'

const tiendaStore = useTiendaAsesorStore()
const uiFeedback = useUiFeedbackStore()

const activeTab = ref('catalogo')
const productDialog = ref(false)
const selectedProduct = ref(null)

const despachoDialog = ref(false)
const despachoLoading = ref(false)
const selectedOrdenParaDespacho = ref(null)
const despachoForm = ref({
  numero_guia: '',
  guia_file: null
})

const detalleOrdenDialog = ref(false)
const selectedOrden = ref(null)

const misProductos = computed(() => tiendaStore.misProductos)
const loadingProductos = computed(() => tiendaStore.loadingMisProductos)
const misVentas = computed(() => tiendaStore.misVentas)
const loadingVentas = computed(() => tiendaStore.loadingMisVentas)
const totalFacturado = computed(() => tiendaStore.totalFacturadoAsesor)
const ventasPendientesCount = computed(() => tiendaStore.ventasPorVerificar.length)

const headersVentas = [
  { title: 'N° Orden', key: 'codigo_orden' },
  { title: 'Hacienda Destino', key: 'hacienda' },
  { title: 'Total', key: 'total' },
  { title: 'Estado', key: 'estado' },
  { title: 'Fecha', key: 'created' },
  { title: 'Acciones', key: 'actions', align: 'end', sortable: false }
]

onMounted(async () => {
  await Promise.all([
    tiendaStore.fetchMisProductos(),
    tiendaStore.fetchMisVentas()
  ])
})

function getProductPhotoUrl(prod) {
  if (Array.isArray(prod.fotos) && prod.fotos.length > 0) {
    return pb.files.getURL(prod, prod.fotos[0])
  }
  return '/img/placeholder-agri.png'
}

function openCreateProductDialog() {
  selectedProduct.value = null
  productDialog.value = true
}

function openEditProductDialog(prod) {
  selectedProduct.value = prod
  productDialog.value = true
}

async function handleDeleteProduct(prod) {
  const confirmed = await uiFeedback.showConfirm(
    'Eliminar Producto',
    `¿Está seguro de eliminar ${prod.nombre} de su catálogo?`,
    'warning',
    'mdi-delete'
  )
  if (!confirmed) return

  await tiendaStore.deleteProducto(prod.id)
}

function onProductSaved() {
  tiendaStore.fetchMisProductos()
}

function openDespachoDialog(orden) {
  selectedOrdenParaDespacho.value = orden
  despachoForm.value = {
    numero_guia: '',
    guia_file: null
  }
  despachoDialog.value = true
}

async function handleConfirmarDespacho() {
  if (!selectedOrdenParaDespacho.value?.id) return

  despachoLoading.value = true
  try {
    const form = new FormData()
    form.append('numero_guia', despachoForm.value.numero_guia || '')
    if (despachoForm.value.guia_file) {
      form.append('guia_despacho', despachoForm.value.guia_file)
    }

    await tiendaStore.subirGuiaDespacho(selectedOrdenParaDespacho.value.id, form)
    despachoDialog.value = false
  } catch (err) {
    console.error('Error al despachar:', err)
  } finally {
    despachoLoading.value = false
  }
}

async function handleAprobarPago(orden) {
  const confirmed = await uiFeedback.showConfirm(
    'Aprobar Pago',
    `¿Confirmas que recibiste el pago de $${orden.total?.toFixed(2)} para la orden ${orden.codigo_orden}?`,
    'info',
    'mdi-check-decagram'
  )
  if (!confirmed) return

  await tiendaStore.actualizarEstadoPedido(orden.id, 'pago_aprobado')
}

function openDetalleOrden(orden) {
  selectedOrden.value = orden
  detalleOrdenDialog.value = true
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
    case 'en_despacho': return 'En Camino / Despachado'
    case 'entregado': return 'Entregado'
    case 'completado': return 'Completado'
    case 'cancelado': return 'Cancelado'
    default: return estado || 'N/A'
  }
}
</script>

<style scoped>
.bg-gradient-dark {
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%);
}
.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
