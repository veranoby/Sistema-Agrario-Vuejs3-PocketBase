<template>
  <v-container fluid class="pa-4 fade-in">
    <!-- Header Principal -->
    <UniversalHeader
      title="Tienda de Insumos y Servicios Técnicos"
      subtitle="Adquiere bioinsumos, fitosanitarios y fertilizantes certificados directamente de los ingenieros agrónomos"
      icon="mdi-cart"
    >
      <template #chips>
        <v-chip color="teal-darken-3" variant="flat" size="small" class="mr-2" prepend-icon="mdi-shield-check">
          Insumos Acreditados
        </v-chip>
        <v-chip
          v-if="cartCount > 0"
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-cart"
          class="font-weight-bold"
          @click="checkoutDialog = true"
        >
          {{ cartCount }} ítems (${{ cartSubtotal.toFixed(2) }})
        </v-chip>
      </template>

      <template #actions>
        <v-btn
          v-if="cartCount > 0"
          color="primary"
          variant="elevated"
          prepend-icon="mdi-cart-check"
          class="font-weight-bold"
          @click="checkoutDialog = true"
        >
          Finalizar Pedido (${{ cartSubtotal.toFixed(2) }})
        </v-btn>
      </template>
    </UniversalHeader>

    <!-- Barra de Búsqueda y Filtros -->
    <v-card variant="flat" border class="pa-4 mb-4 rounded-lg bg-surface">
      <v-row dense class="align-center">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="filtros.search"
            label="Buscar por insumo, marca o ingrediente activo..."
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            @update:model-value="debounceSearch"
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filtros.categoria"
            :items="categoriasList"
            label="Filtrar por Categoría"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            @update:model-value="onFilterChanged"
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-autocomplete
            v-model="filtros.pais"
            :items="paisesList"
            item-title="name"
            item-value="code"
            label="País de Despacho"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="onFilterChanged"
          />
        </v-col>

        <v-col cols="12" md="2">
          <v-btn
            color="primary"
            variant="tonal"
            block
            prepend-icon="mdi-refresh"
            @click="tiendaStore.fetchCatalogoPublico"
          >
            Actualizar
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Grid de Productos -->
    <v-row v-if="loadingProductos" justify="center" class="py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </v-row>

    <v-row v-else-if="productos.length" dense>
      <v-col
        v-for="prod in productos"
        :key="prod.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card variant="flat" border class="h-100 d-flex flex-column rounded-lg hover-card">
          <!-- Imagen de Insumo -->
          <v-img
            :src="getProductPhotoUrl(prod)"
            height="170"
            cover
            class="bg-surface-light align-end text-white"
          >
            <div class="pa-2 d-flex justify-space-between w-100 bg-gradient-dark">
              <v-chip size="x-small" color="surface" variant="flat" class="text-caption font-weight-bold">
                {{ prod.categoria }}
              </v-chip>
              <DeliveryFeasibilityBadge
                :product="prod"
                :hacienda-country="haciendaCountry"
                :hacienda-subdivision="haciendaSubdivision"
                size="x-small"
              />
            </div>
          </v-img>

          <v-card-text class="pa-3 flex-grow-1">
            <div class="text-subtitle-1 font-weight-bold text-truncate" :title="prod.nombre">
              {{ prod.nombre }}
            </div>

            <div class="text-h6 text-primary font-weight-bold my-1">
              ${{ prod.precio?.toFixed(2) }} <span class="text-caption text-medium-emphasis">/ {{ prod.unidad_medida }}</span>
            </div>

            <!-- Badges Fitosanitarios y Asesor -->
            <div class="d-flex align-center ga-1 my-2 flex-wrap">
              <PhytosanitaryBadge
                :country="prod.pais_origen"
                :registro-numero="prod.registro_fitosanitario"
                size="x-small"
              />
              <v-chip size="x-small" variant="tonal" color="teal" prepend-icon="mdi-account-tie">
                {{ prod.expand?.asesor?.name || 'Asesor Acreditado' }}
              </v-chip>
            </div>

            <p class="text-caption text-medium-emphasis text-truncate-3 mt-1">
              {{ prod.descripcion || 'Sin descripción detallada' }}
            </p>
          </v-card-text>

          <v-divider />

          <!-- Acción de Compra -->
          <v-card-actions class="pa-2 px-3 bg-surface">
            <v-btn
              color="primary"
              variant="elevated"
              block
              size="small"
              prepend-icon="mdi-cart-plus"
              class="font-weight-medium"
              @click="handleAddToCart(prod)"
            >
              Agregar al Pedido
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-card v-else variant="flat" border class="pa-12 text-center rounded-lg">
      <v-icon icon="mdi-cart-off" size="64" color="grey" class="mb-3" />
      <div class="text-h6 font-weight-medium">No se encontraron productos disponibles</div>
      <p class="text-caption text-medium-emphasis">
        Intenta ajustar los filtros de búsqueda o categoría.
      </p>
    </v-card>

    <!-- Modal de Checkout -->
    <TiendaCheckoutDialog
      v-model="checkoutDialog"
      :hacienda-actual="haciendaActual"
      @completed="onCheckoutCompleted"
    />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useTiendaAsesorStore } from '@/stores/tiendaAsesorStore'
import { useAuthStore } from '@/stores/authStore'
import { ISO_COUNTRIES } from '@/utils/geo/isoCountries'
import UniversalHeader from '@/components/UniversalHeader.vue'
import PhytosanitaryBadge from '@/components/common/PhytosanitaryBadge.vue'
import DeliveryFeasibilityBadge from '@/components/common/DeliveryFeasibilityBadge.vue'
import TiendaCheckoutDialog from '@/components/tienda/TiendaCheckoutDialog.vue'

const tiendaStore = useTiendaAsesorStore()
const authStore = useAuthStore()

const checkoutDialog = ref(false)
const searchTimer = ref(null)

const filtros = ref({
  search: '',
  categoria: null,
  pais: 'EC'
})

const productos = computed(() => tiendaStore.productos)
const loadingProductos = computed(() => tiendaStore.loadingProductos)
const cartCount = computed(() => tiendaStore.cartCount)
const cartSubtotal = computed(() => tiendaStore.cartSubtotal)

const haciendaActual = computed(() => {
  return authStore.user?.expand?.hacienda || null
})

const haciendaCountry = computed(() => {
  return haciendaActual.value?.pais || 'EC'
})

const haciendaSubdivision = computed(() => {
  return haciendaActual.value?.provincia || haciendaActual.value?.estado_provincia || ''
})

const paisesList = ISO_COUNTRIES.map(c => ({
  code: c.code,
  name: `${c.flag} ${c.name}`
}))

const categoriasList = [
  { title: 'Todas las Categorías', value: null },
  { title: 'Fertilizantes y Nutrición', value: 'fertilizantes' },
  { title: 'Abonos Foliares y Bioestimulantes', value: 'foliares' },
  { title: 'Fitosanitarios y Defensivos BPA', value: 'fitosanitarios' },
  { title: 'Bioinsumos y Extractos Orgánicos', value: 'bioinsumos' },
  { title: 'Semillas y Material Vegetal', value: 'semillas' },
  { title: 'Herramientas y Equipos de Riego', value: 'herramientas' },
  { title: 'Servicios Técnicos y Análisis de Suelo', value: 'servicios_analisis' },
  { title: 'Otros Insumos', value: 'otros' }
]

onMounted(async () => {
  await tiendaStore.fetchCatalogoPublico()
})

function getProductPhotoUrl(prod) {
  if (Array.isArray(prod.fotos) && prod.fotos.length > 0) {
    return pb.files.getURL(prod, prod.fotos[0])
  }
  return '/img/placeholder-agri.png'
}

function handleAddToCart(prod) {
  tiendaStore.addToCart(prod, 1)
}

function debounceSearch() {
  clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => {
    tiendaStore.filtros.search = filtros.value.search
    tiendaStore.fetchCatalogoPublico()
  }, 400)
}

function onFilterChanged() {
  tiendaStore.filtros.categoria = filtros.value.categoria
  tiendaStore.filtros.pais = filtros.value.pais
  tiendaStore.fetchCatalogoPublico()
}

function onCheckoutCompleted() {
  tiendaStore.fetchCatalogoPublico()
}
</script>

<style scoped>
.bg-gradient-dark {
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%);
}
.hover-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.text-truncate-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
