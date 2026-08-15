<template>
  <v-card variant="flat" class="rounded-lg">
    <v-card-title class="d-flex justify-space-between align-center px-4 py-3 border-b">
      <div>
        <span class="text-h6 font-weight-bold">Supervisión de Tienda & Marketplace de Asesores</span>
        <div class="text-caption text-medium-emphasis">Auditoría de insumos publicados, volumen de ventas y resolución de disputas</div>
      </div>
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-refresh"
        @click="loadAllData"
      >
        Actualizar
      </v-btn>
    </v-card-title>

    <!-- Métricas Globales (GMV) -->
    <v-card-text class="pa-4">
      <v-row dense class="mb-4">
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="primary" class="rounded-lg pa-3">
            <div class="text-caption text-uppercase font-weight-bold">Volumen Transaccionado (GMV)</div>
            <div class="text-h5 font-weight-bold mt-1">${{ totalGMV.toFixed(2) }}</div>
          </v-card>
        </v-col>

        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="teal" class="rounded-lg pa-3">
            <div class="text-caption text-uppercase font-weight-bold">Total Insumos Publicados</div>
            <div class="text-h5 font-weight-bold mt-1">{{ totalProductosCount }}</div>
          </v-card>
        </v-col>

        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="warning" class="rounded-lg pa-3">
            <div class="text-caption text-uppercase font-weight-bold">Órdenes en Proceso</div>
            <div class="text-h5 font-weight-bold mt-1">{{ ordenesEnProcesoCount }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Pestañas de Supervisión -->
      <v-tabs v-model="adminTab" color="primary" density="comfortable" class="mb-3">
        <v-tab value="pedidos" prepend-icon="mdi-format-list-checks">Todas las Órdenes</v-tab>
        <v-tab value="catalogo" prepend-icon="mdi-shield-search">Catálogo Global & Moderación</v-tab>
      </v-tabs>

      <v-window v-model="adminTab">
        <!-- Pestaña Órdenes Globales -->
        <v-window-item value="pedidos">
          <v-data-table
            :headers="headersPedidos"
            :items="allPedidos"
            :loading="loading"
            density="compact"
            no-data-text="No hay órdenes registradas en la plataforma"
          >
            <template v-slot:item.codigo_orden="{ item }">
              <span class="font-weight-bold text-primary">{{ item.codigo_orden }}</span>
            </template>

            <template v-slot:item.asesor="{ item }">
              {{ item.expand?.asesor?.name || item.expand?.asesor?.email || 'Asesor' }}
            </template>

            <template v-slot:item.hacienda="{ item }">
              {{ item.expand?.hacienda?.name || item.expand?.hacienda?.nombre || 'Hacienda' }}
            </template>

            <template v-slot:item.total="{ item }">
              <span class="font-weight-bold">${{ item.total?.toFixed(2) }}</span>
            </template>

            <template v-slot:item.estado="{ item }">
              <v-chip :color="getStatusColor(item.estado)" size="x-small" variant="tonal">
                {{ item.estado }}
              </v-chip>
            </template>

            <template v-slot:item.created="{ item }">
              {{ formatDate(item.created) }}
            </template>
          </v-data-table>
        </v-window-item>

        <!-- Pestaña Catálogo Global -->
        <v-window-item value="catalogo">
          <v-data-table
            :headers="headersProductos"
            :items="allProductos"
            :loading="loading"
            density="compact"
            no-data-text="No hay productos registrados"
          >
            <template v-slot:item.nombre="{ item }">
              <span class="font-weight-medium">{{ item.nombre }}</span>
            </template>

            <template v-slot:item.precio="{ item }">
              ${{ item.precio?.toFixed(2) }} / {{ item.unidad_medida }}
            </template>

            <template v-slot:item.asesor="{ item }">
              {{ item.expand?.asesor?.name || item.expand?.asesor?.email || 'N/A' }}
            </template>

            <template v-slot:item.estado="{ item }">
              <v-chip :color="item.estado === 'activo' ? 'success' : 'grey'" size="x-small">
                {{ item.estado }}
              </v-chip>
            </template>

            <template v-slot:item.actions="{ item }">
              <v-btn
                :color="item.estado === 'activo' ? 'warning' : 'success'"
                size="x-small"
                variant="tonal"
                @click="toggleEstadoProducto(item)"
              >
                {{ item.estado === 'activo' ? 'Pausar' : 'Activar' }}
              </v-btn>
            </template>
          </v-data-table>
        </v-window-item>
      </v-window>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { formatDate } from '@/utils/formatters'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const uiFeedback = useUiFeedbackStore()

const adminTab = ref('pedidos')
const loading = ref(false)
const allPedidos = ref([])
const allProductos = ref([])

const headersPedidos = [
  { title: 'N° Orden', key: 'codigo_orden' },
  { title: 'Asesor', key: 'asesor' },
  { title: 'Hacienda', key: 'hacienda' },
  { title: 'Total ($)', key: 'total' },
  { title: 'Estado', key: 'estado' },
  { title: 'Fecha', key: 'created' }
]

const headersProductos = [
  { title: 'Producto', key: 'nombre' },
  { title: 'Categoría', key: 'categoria' },
  { title: 'Precio', key: 'precio' },
  { title: 'Asesor Vendedor', key: 'asesor' },
  { title: 'Reg. Fitosanitario', key: 'registro_fitosanitario' },
  { title: 'Estado', key: 'estado' },
  { title: 'Acción', key: 'actions', align: 'end', sortable: false }
]

const totalGMV = computed(() => {
  return allPedidos.value
    .filter(p => ['pago_aprobado', 'en_despacho', 'entregado', 'completado'].includes(p.estado))
    .reduce((acc, p) => acc + (p.total || 0), 0)
})

const totalProductosCount = computed(() => allProductos.value.length)

const ordenesEnProcesoCount = computed(() => {
  return allPedidos.value.filter(p => ['pago_en_verificacion', 'pago_aprobado', 'en_despacho'].includes(p.estado)).length
})

onMounted(async () => {
  await loadAllData()
})

async function loadAllData() {
  loading.value = true
  try {
    const [pedidosRes, productosRes] = await Promise.all([
      pb.collection('asesor_pedidos').getFullList({
        sort: '-created',
        expand: 'asesor,hacienda,comprador'
      }),
      pb.collection('asesor_productos').getFullList({
        sort: '-created',
        expand: 'asesor'
      })
    ])
    allPedidos.value = pedidosRes || []
    allProductos.value = productosRes || []
  } catch (err) {
    console.warn('Error cargando datos de tienda admin:', err)
  } finally {
    loading.value = false
  }
}

async function toggleEstadoProducto(prod) {
  const nuevoEstado = prod.estado === 'activo' ? 'pausado' : 'activo'
  try {
    await pb.collection('asesor_productos').update(prod.id, { estado: nuevoEstado })
    prod.estado = nuevoEstado
    uiFeedback.showSnackbar(`Producto actualizado a: ${nuevoEstado}`, 'info')
  } catch (err) {
    uiFeedback.showSnackbar('Error al cambiar estado del producto', 'error')
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
</script>
