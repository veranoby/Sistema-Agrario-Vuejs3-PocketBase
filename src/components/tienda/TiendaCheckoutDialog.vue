<template>
  <v-dialog v-model="isOpen" max-width="650" persistent scrollable>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3 px-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-cart-check" class="mr-2" size="small" />
          <span class="text-h6 font-weight-bold">Finalizar Pedido de Insumos</span>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeModal" />
      </v-card-title>

      <v-card-text class="pa-4 bg-background">
        <!-- 1. Resumen de Productos en Carrito -->
        <v-card variant="flat" border class="pa-3 mb-4 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-2">Productos a Comprar</div>
          <v-list density="compact" lines="one">
            <v-list-item v-for="item in cartItems" :key="item.id" class="px-0">
              <v-list-item-title class="font-weight-medium text-body-2">
                {{ item.cantidad }}x {{ item.nombre }} ({{ item.unidad_medida }})
              </v-list-item-title>
              <template v-slot:append>
                <span class="font-weight-bold">${{ (item.precio * item.cantidad).toFixed(2) }}</span>
              </template>
            </v-list-item>
          </v-list>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between text-h6 font-weight-bold text-primary">
            <span>Total a Transferir:</span>
            <span>${{ cartSubtotal.toFixed(2) }} USD</span>
          </div>
        </v-card>

        <!-- 2. Datos de Envío y Entrega en Hacienda -->
        <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
            <v-icon icon="mdi-map-marker-radius" size="18" class="mr-1" color="primary" />
            Lugar de Entrega en Hacienda
          </div>
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="form.direccion"
                label="Dirección / Referencia de la Hacienda *"
                placeholder="Ej: Km 12 Vía a Naranjal, Entrada Lote 4"
                :rules="[v => !!v?.trim() || 'Dirección requerida']"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.provincia"
                label="Provincia / Estado *"
                placeholder="Ej: Guayas"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.ciudad"
                label="Cantón / Ciudad"
                placeholder="Ej: Naranjal / Durán"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.contacto"
                label="Persona que recibe en campo *"
                placeholder="Nombre del bodeguero o admin"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.telefono"
                label="Teléfono de Contacto *"
                placeholder="Ej: 0991234567"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12">
              <v-checkbox
                v-model="form.ingresoBodegaAuto"
                label="Ingresar automáticamente estos insumos al Kardex de Bodega al confirmar la entrega"
                color="primary"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card>

        <!-- 3. Pago B2B / Subida de Comprobante -->
        <v-card variant="flat" border class="pa-4 rounded-lg">
          <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
            <v-icon icon="mdi-bank-transfer" size="18" class="mr-1" color="success" />
            Pago por Transferencia Bancaria
          </div>
          <v-alert type="info" variant="tonal" density="compact" class="text-caption mb-3">
            Transfiera el valor total a los datos bancarios acordados con el asesor y suba el comprobante digital para iniciar el despacho inmediato.
          </v-alert>

          <v-file-input
            v-model="comprobanteFile"
            label="Comprobante de Transferencia / Voucher (Opcional ahora, requerido para despacho)"
            accept="image/*, application/pdf"
            variant="outlined"
            density="comfortable"
            prepend-icon=""
            prepend-inner-icon="mdi-receipt"
            show-size
          />
        </v-card>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 px-4 bg-surface">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!form.direccion?.trim() || !form.contacto?.trim() || !form.telefono?.trim()"
          prepend-icon="mdi-send"
          @click="handleCheckout"
        >
          Confirmar y Emitir Orden
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTiendaAsesorStore } from '@/stores/tiendaAsesorStore'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  haciendaActual: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'completed'])

const tiendaStore = useTiendaAsesorStore()
const authStore = useAuthStore()

const loading = ref(false)
const comprobanteFile = ref(null)

const form = ref({
  direccion: '',
  provincia: '',
  ciudad: '',
  contacto: '',
  telefono: '',
  ingresoBodegaAuto: true
})

const cartItems = computed(() => tiendaStore.cartItems)
const cartSubtotal = computed(() => tiendaStore.cartSubtotal)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

watch(() => props.modelValue, (val) => {
  if (val) {
    initForm()
  }
})

function initForm() {
  comprobanteFile.value = null
  const h = props.haciendaActual || {}
  const u = authStore.user || {}

  form.value = {
    direccion: h.ubicacion || h.location || '',
    provincia: h.provincia || h.estado_provincia || '',
    ciudad: h.ciudad || '',
    contacto: u.name || u.nombre || '',
    telefono: u.telefono || u.phone || '',
    ingresoBodegaAuto: true
  }
}

function closeModal() {
  isOpen.value = false
}

async function handleCheckout() {
  loading.value = true
  try {
    const haciendaId = props.haciendaActual?.id || authStore.user?.hacienda || ''

    await tiendaStore.crearOrdenPedido({
      haciendaId,
      costoEnvio: 0,
      comprobanteFile: comprobanteFile.value,
      metodoPago: 'transferencia',
      ingresoBodegaAuto: form.value.ingresoBodegaAuto,
      datosEntrega: {
        direccion: form.value.direccion,
        provincia: form.value.provincia,
        ciudad: form.value.ciudad,
        contacto: form.value.contacto,
        telefono: form.value.telefono
      }
    })

    emit('completed')
    closeModal()
  } catch (err) {
    console.error('Error al procesar orden:', err)
  } finally {
    loading.value = false
  }
}
</script>
