<template>
  <v-dialog v-model="isOpen" max-width="700" scrollable>
    <v-card v-if="orden" class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3 px-4">
        <div>
          <span class="text-h6 font-weight-bold">Detalle de Orden: {{ orden.codigo_orden }}</span>
          <v-chip size="x-small" :color="getStatusColor(orden.estado)" variant="flat" class="ml-2">
            {{ formatEstado(orden.estado) }}
          </v-chip>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeModal" />
      </v-card-title>

      <v-card-text class="pa-4 bg-background">
        <!-- 1. Resumen de Partes Involucradas -->
        <v-card variant="flat" border class="pa-3 mb-4 rounded-lg">
          <v-row dense>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Asesor / Proveedor:</div>
              <div class="font-weight-bold">{{ orden.expand?.asesor?.name || orden.expand?.asesor?.email || 'N/A' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">Hacienda Destino:</div>
              <div class="font-weight-bold">{{ orden.expand?.hacienda?.name || orden.expand?.hacienda?.nombre || 'Hacienda' }}</div>
            </v-col>
          </v-row>
        </v-card>

        <!-- 2. Ítems Comprados -->
        <v-card variant="flat" border class="pa-3 mb-4 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-2">Ítems de la Orden</div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center">Cant.</th>
                <th class="text-end">Precio Unit.</th>
                <th class="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in orden.items || []" :key="idx">
                <td class="font-weight-medium">{{ item.nombre }}</td>
                <td class="text-center">{{ item.cantidad }} {{ item.unidad }}</td>
                <td class="text-end">${{ item.precio_unitario?.toFixed(2) }}</td>
                <td class="text-end font-weight-bold">${{ item.subtotal?.toFixed(2) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-end font-weight-bold pt-2">Subtotal:</td>
                <td class="text-end font-weight-bold pt-2">${{ orden.subtotal?.toFixed(2) }}</td>
              </tr>
              <tr v-if="orden.costo_envio > 0">
                <td colspan="3" class="text-end font-weight-medium">Flete / Envío:</td>
                <td class="text-end">${{ orden.costo_envio?.toFixed(2) }}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-end text-subtitle-1 font-weight-bold text-primary">Total:</td>
                <td class="text-end text-subtitle-1 font-weight-bold text-primary">${{ orden.total?.toFixed(2) }}</td>
              </tr>
            </tfoot>
          </v-table>
        </v-card>

        <!-- 3. Datos de Entrega y Despacho -->
        <v-card variant="flat" border class="pa-3 mb-4 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
            <v-icon icon="mdi-truck-delivery" size="18" class="mr-1" color="info" />
            Información Logística y Entrega
          </div>
          <div class="text-body-2">
            <div><strong>Dirección:</strong> {{ orden.datos_entrega?.direccion || 'N/A' }}</div>
            <div><strong>Provincia / Ciudad:</strong> {{ orden.datos_entrega?.provincia || '' }}, {{ orden.datos_entrega?.ciudad || '' }}</div>
            <div><strong>Contacto Receptor:</strong> {{ orden.datos_entrega?.contacto || 'N/A' }} ({{ orden.datos_entrega?.telefono || '' }})</div>
            <div v-if="orden.numero_guia"><strong>N° Guía / Transportista:</strong> {{ orden.numero_guia }}</div>
          </div>

          <div v-if="orden.guia_despacho" class="mt-2">
            <v-btn
              color="info"
              variant="tonal"
              size="small"
              prepend-icon="mdi-file-download"
              :href="getFileUrl(orden, orden.guia_despacho)"
              target="_blank"
            >
              Ver Guía de Remisión Adjunta
            </v-btn>
          </div>
        </v-card>

        <!-- 4. Comprobante de Pago -->
        <v-card v-if="orden.comprobante_pago" variant="flat" border class="pa-3 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
            <v-icon icon="mdi-receipt" size="18" class="mr-1" color="success" />
            Comprobante de Pago
          </div>
          <v-btn
            color="success"
            variant="tonal"
            size="small"
            prepend-icon="mdi-eye"
            :href="getFileUrl(orden, orden.comprobante_pago)"
            target="_blank"
          >
            Ver Comprobante de Pago (Voucher)
          </v-btn>
        </v-card>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 px-4 bg-surface">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { pb } from '@/utils/pocketbase'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  orden: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function closeModal() {
  isOpen.value = false
}

function getFileUrl(record, filename) {
  if (!record || !filename) return '#'
  return pb.files.getURL(record, filename)
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
