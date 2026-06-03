<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid class="pa-2">
    <div class="d-flex flex-column gap-4 w-100">
      <header class="w-100 bg-background shadow-sm p-0 mb-4">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0 text-uppercase">
                <v-icon icon="mdi-warehouse" color="teal" class="mr-2"></v-icon> Bodega Especializada
                <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
                  {{ t('roles.' + userRole) }}
                </v-chip>
                <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
                  {{ t('dashboard.hacienda') }}: {{ mi_hacienda?.name }}
                </v-chip>
              </h3>
              <p class="text-caption text-grey-darken-3 mt-1">
                Control de inventarios, alerta por stock mínimo y registro histórico de movimientos en campo y bodega.
              </p>
            </div>

            <div class="w-full sm:w-auto z-10">
              <v-btn
                prepend-icon="mdi-plus-circle"
                color="success"
                variant="flat"
                class="font-weight-bold text-white elevation-2 rounded-lg"                @click="abrirModalNuevoItem"
              >
                Nuevo Insumo
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>

      <!-- Main Tabs: Inventory & Historical Movements -->
      <v-card class="elevation-4 rounded-xl border border-grey-lighten-3 mt-4">
        <v-tabs v-model="tab" color="teal" align-tabs="start" class="border-bottom">
          <v-tab value="inventario" class="font-weight-bold">
            <v-icon start icon="mdi-clipboard-list-outline"></v-icon>
            Inventario Disponible
          </v-tab>
          <v-tab value="movimientos" class="font-weight-bold">
            <v-icon start icon="mdi-history"></v-icon>
            Historial de Movimientos
          </v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <!-- Inventory Tab -->
          <v-window-item value="inventario">
            <v-card-title class="pt-6 px-6">
              <v-row>
                <v-col cols="12" sm="6" md="4">
                  <v-text-field
                    v-model="search"
                    prepend-inner-icon="mdi-magnify"
                    label="Buscar producto..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    color="teal"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="filtroTipo"
                    :items="[
                      { title: 'Todos los tipos', value: null },
                      { title: 'Plaguicida', value: 'plaguicida' },
                      { title: 'Fertilizante', value: 'fertilizante' },
                      { title: 'Material', value: 'material' }
                    ]"
                    label="Filtrar por Tipo"
                    variant="outlined"
                    density="compact"
                    hide-details
                    color="teal"
                  ></v-select>
                </v-col>
              </v-row>
            </v-card-title>

            <v-card-text class="px-6 pb-6">
              <v-data-table
                :headers="headersItems"
                :items="filteredItems"
                :search="search"
                :loading="bodegaStore.loading"
                loading-text="Cargando inventario..."
                no-data-text="No hay insumos registrados en bodega"
                class="elevation-0 mt-4 rounded-lg"
              >
                <!-- Tipo Column -->
                <template #[`item.tipo`]="{ item }">
                  <v-chip
                    size="small"
                    :color="getTipoColor(item.tipo)"
                    class="font-weight-bold text-capitalize text-white"
                  >
                    {{ item.tipo }}
                  </v-chip>
                </template>

                <!-- Stock Actual Column -->
                <template #[`item.stock_actual`]="{ item }">
                  <div class="d-flex align-center gap-2">
                    <span :class="{'text-red-darken-3 font-weight-bold': item.stock_actual <= item.stock_minimo, 'text-teal-darken-2 font-weight-medium': item.stock_actual > item.stock_minimo}">
                      {{ item.stock_actual }} {{ item.unidad }}
                    </span>
                    <v-icon
                      v-if="item.stock_actual <= item.stock_minimo"
                      icon="mdi-alert-circle"
                      color="red-darken-1"
                      size="18"
                    ></v-icon>
                  </div>
                </template>

                <!-- Stock Mínimo Column -->
                <template #[`item.stock_minimo`]="{ item }">
                  <span>{{ item.stock_minimo }} {{ item.unidad }}</span>
                </template>

                <!-- Acciones Column -->
                <template #[`item.acciones`]="{ item }">
                  <div class="d-flex align-center gap-2">
                    <v-tooltip text="Ingreso / Egreso Stock" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-swap-horizontal"
                          color="teal"
                          variant="text"
                          size="small"
                          @click="abrirModalMovimiento(item)"
                        ></v-btn>
                      </template>
                    </v-tooltip>

                    <v-tooltip text="Editar Insumo" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-pencil"
                          color="blue"
                          variant="text"
                          size="small"
                          @click="abrirModalEditarItem(item)"
                        ></v-btn>
                      </template>
                    </v-tooltip>

                    <v-tooltip text="Eliminar Insumo" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-delete"
                          color="red"
                          variant="text"
                          size="small"
                          @click="confirmarEliminarItem(item)"
                        ></v-btn>
                      </template>
                    </v-tooltip>
                  </div>
                </template>
              </v-data-table>
            </v-card-text>
          </v-window-item>

          <!-- Historical Movements Tab -->
          <v-window-item value="movimientos">
            <v-card-title class="pt-6 px-6">
              <v-row>
                <v-col cols="12" sm="6" md="4">
                  <v-text-field
                    v-model="searchMov"
                    prepend-inner-icon="mdi-magnify"
                    label="Buscar movimiento..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    color="teal"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-card-title>

            <v-card-text class="px-6 pb-6">
              <v-data-table
                :headers="headersMovimientos"
                :items="movimientos"
                :search="searchMov"
                :loading="movimientosStore.loading"
                loading-text="Cargando movimientos..."
                no-data-text="No hay movimientos registrados"
                class="elevation-0 mt-4 rounded-lg"
              >
                <!-- Tipo Column -->
                <template #[`item.tipo`]="{ item }">
                  <v-chip
                    size="small"
                    :color="item.tipo === 'ingreso' ? 'green-darken-1' : 'red-darken-1'"
                    class="font-weight-bold text-capitalize text-white"
                    :prepend-icon="item.tipo === 'ingreso' ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                  >
                    {{ item.tipo }}
                  </v-chip>
                </template>

                <!-- Item Column -->
                <template #[`item.expand.item`]="{ item }">
                  <span class="font-weight-bold">{{ item.expand?.item?.nombre || 'Insumo Eliminado' }}</span>
                  <span v-if="item.expand?.item?.codigo_sar" class="text-caption text-grey d-block">
                    SAR: {{ item.expand?.item?.codigo_sar }}
                  </span>
                </template>

                <!-- Cantidad Column -->
                <template #[`item.cantidad`]="{ item }">
                  <span :class="item.tipo === 'ingreso' ? 'text-green-darken-2 font-weight-bold' : 'text-red-darken-2 font-weight-bold'">
                    {{ item.tipo === 'ingreso' ? '+' : '-' }}{{ item.cantidad }} {{ item.expand?.item?.unidad || '' }}
                  </span>
                </template>

                <!-- Origen/Bitacora Column -->
                <template #[`item.origen`]="{ item }">
                  <div v-if="item.bitacora">
                    <v-chip size="x-small" color="teal-lighten-4" class="text-teal-darken-3 font-weight-medium">
                      Bitácora Campo
                    </v-chip>
                    <span class="text-caption text-grey d-block">ID: {{ item.bitacora }}</span>
                  </div>
                  <v-chip v-else size="x-small" color="blue-lighten-4" class="text-blue-darken-3 font-weight-medium">
                    Manual/Administración
                  </v-chip>
                </template>

                <!-- Fecha Column -->
                <template #[`item.created`]="{ item }">
                  <span>{{ formatFecha(item.created) }}</span>
                </template>
              </v-data-table>
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </div>

    <!-- Modal Nuevo / Editar Item -->
    <v-dialog v-model="modalItemOpen" max-width="600px">
      <v-card class="rounded-xl elevation-5">
        <v-card-title class="bg-gradient-teal text-white py-4 px-6">
          <span class="text-h5 font-weight-bold">
            {{ editMode ? 'Editar Insumo' : 'Registrar Nuevo Insumo' }}
          </span>
        </v-card-title>

        <v-card-text class="pt-6 px-6">
          <v-form ref="formItem" v-model="formItemValid">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formItemData.nombre"
                  label="Nombre del Producto *"
                  variant="outlined"
                  color="teal"
                  :rules="[v => !!v || 'El nombre es obligatorio']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formItemData.codigo_sar"
                  label="Código SAR (Opcional)"
                  variant="outlined"
                  color="teal"
                ></v-text-field>
              </v-col>

              <v-col cols="12" sm="6">
                <v-select
                  v-model="formItemData.tipo"
                  :items="['plaguicida', 'fertilizante', 'material']"
                  label="Tipo de Insumo *"
                  variant="outlined"
                  color="teal"
                  class="text-capitalize"
                  :rules="[v => !!v || 'El tipo es obligatorio']"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="formItemData.unidad"
                  :items="['kg', 'L', 'cc', 'unidad']"
                  label="Unidad de Medida *"
                  variant="outlined"
                  color="teal"
                  :rules="[v => !!v || 'La unidad es obligatoria']"
                ></v-select>
              </v-col>

              <v-col cols="12" sm="6" v-if="!editMode">
                <v-text-field
                  v-model.number="formItemData.stock_actual"
                  label="Stock Inicial *"
                  type="number"
                  variant="outlined"
                  color="teal"
                  min="0"
                  :rules="[
                    v => v !== null && v !== undefined || 'El stock inicial es obligatorio',
                    v => v >= 0 || 'El stock no puede ser negativo'
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="12" :sm="editMode ? 12 : 6">
                <v-text-field
                  v-model.number="formItemData.stock_minimo"
                  label="Stock Mínimo de Alerta *"
                  type="number"
                  variant="outlined"
                  color="teal"
                  min="0"
                  :rules="[
                    v => v !== null && v !== undefined || 'El stock mínimo es obligatorio',
                    v => v >= 0 || 'El stock no puede ser negativo'
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="formItemData.costo_adquisicion"
                  label="Costo Unitario de Compra ($) *"
                  type="number"
                  variant="outlined"
                  color="teal"
                  min="0"
                  step="0.01"
                  :rules="[
                    v => v !== null && v !== undefined && v !== '' || 'El costo es obligatorio',
                    v => v >= 0 || 'El costo no puede ser negativo'
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-6 py-4 justify-end gap-2 bg-grey-lighten-5">
          <v-btn variant="outlined" color="grey" @click="modalItemOpen = false" class="rounded-lg font-weight-bold">Cancelar</v-btn>
          <v-btn variant="flat" color="teal" class="text-white rounded-lg font-weight-bold" @click="guardarItem" :disabled="!formItemValid">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Registro Movimiento (Ingreso/Egreso Manual) -->
    <v-dialog v-model="modalMovOpen" max-width="500px">
      <v-card class="rounded-xl elevation-5">
        <v-card-title class="bg-gradient-teal text-white py-4 px-6">
          <span class="text-h5 font-weight-bold">Ajuste de Stock</span>
        </v-card-title>

        <v-card-text class="pt-6 px-6">
          <div class="mb-4 text-subtitle-1">
            Insumo: <strong class="text-teal-darken-3">{{ selectedItem?.nombre }}</strong>
            <span class="text-caption text-grey d-block">Stock Actual: {{ selectedItem?.stock_actual }} {{ selectedItem?.unidad }}</span>
          </div>

          <v-form ref="formMov" v-model="formMovValid">
            <v-select
              v-model="formMovData.tipo"
              :items="[
                { title: 'Ingreso (Entrada a bodega)', value: 'ingreso' },
                { title: 'Egreso (Consumo / Descarte)', value: 'egreso' }
              ]"
              label="Tipo de Movimiento *"
              variant="outlined"
              color="teal"
              :rules="[v => !!v || 'Seleccione el tipo de movimiento']"
            ></v-select>

            <v-text-field
              v-model.number="formMovData.cantidad"
              label="Cantidad *"
              type="number"
              variant="outlined"
              color="teal"
              min="0.01"
              step="any"
              :rules="[
                v => !!v || 'La cantidad es obligatoria',
                v => v > 0 || 'Debe ser mayor a 0',
                v => validarStockEgreso(v)
              ]"
            ></v-text-field>

            <v-text-field
              v-if="formMovData.tipo === 'ingreso'"
              v-model.number="formMovData.costo_unitario"
              label="Costo Unitario ($) *"
              type="number"
              variant="outlined"
              color="teal"
              min="0"
              step="0.01"
              :rules="[v => !!v || 'El costo unitario es obligatorio para ingresos']"
            ></v-text-field>

            <v-checkbox
              v-if="formMovData.tipo === 'ingreso' && haciendaStore.isModuleActive('kardex_bodega')"
              v-model="formMovData.registrarFinanzas"
              label="Registrar también como Egreso en Finanzas"
              color="teal"
              hide-details
              class="mb-2"
            ></v-checkbox>

            <v-textarea
              v-model="formMovData.notas"
              label="Notas / Justificación *"
              variant="outlined"
              color="teal"
              rows="3"
              placeholder="Describa el motivo del ajuste..."
              :rules="[v => !!v || 'Debe registrar una nota explicativa']"
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-6 py-4 justify-end gap-2 bg-grey-lighten-5">
          <v-btn variant="outlined" color="grey" @click="modalMovOpen = false" class="rounded-lg font-weight-bold">Cancelar</v-btn>
          <v-btn variant="flat" color="teal" class="text-white rounded-lg font-weight-bold" @click="registrarMovimiento" :disabled="!formMovValid">
            Registrar Ajuste
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Confirmación Eliminar -->
    <v-dialog v-model="dialogEliminar" max-width="400px">
      <v-card class="rounded-xl">
        <v-card-title class="bg-red-darken-1 text-white py-4 px-6">
          <span class="text-h6 font-weight-bold">¿Eliminar Insumo?</span>
        </v-card-title>
        <v-card-text class="pt-6 px-6">
          ¿Está seguro de que desea eliminar el insumo <strong>{{ selectedItem?.nombre }}</strong>? Esta acción no se puede deshacer y puede afectar los históricos.
        </v-card-text>
        <v-card-actions class="px-6 py-4 justify-end gap-2 bg-grey-lighten-5">
          <v-btn variant="outlined" color="grey" @click="dialogEliminar = false" class="rounded-lg font-weight-bold">Cancelar</v-btn>
          <v-btn variant="flat" color="red" class="text-white rounded-lg font-weight-bold" @click="eliminarItemConfirmado">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBodegaStore } from '@/stores/bodegaStore'
import { useBodegaMovimientosStore } from '@/stores/bodegaMovimientosStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'

const bodegaStore = useBodegaStore()
const movimientosStore = useBodegaMovimientosStore()
const haciendaStore = useHaciendaStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

const tab = ref('inventario')
const search = ref('')
const searchMov = ref('')
const filtroTipo = ref(null)

// Headers
const headersItems = [
  { title: 'Código SAR', key: 'codigo_sar', sortable: true },
  { title: 'Nombre', key: 'nombre', sortable: true },
  { title: 'Tipo', key: 'tipo', sortable: true },
  { title: 'Stock Actual', key: 'stock_actual', sortable: true },
  { title: 'Stock Mínimo', key: 'stock_minimo', sortable: true },
  { title: 'Acciones', key: 'acciones', sortable: false }
]

const headersMovimientos = [
  { title: 'Insumo', key: 'expand.item', sortable: true },
  { title: 'Tipo', key: 'tipo', sortable: true },
  { title: 'Cantidad', key: 'cantidad', sortable: true },
  { title: 'Origen', key: 'origen', sortable: false },
  { title: 'Notas', key: 'notas', sortable: false },
  { title: 'Fecha', key: 'created', sortable: true }
]

// Store Computed mappings
const items = computed(() => bodegaStore.items || [])
const criticalItems = computed(() => bodegaStore.criticalItems || [])
const movimientos = computed(() => movimientosStore.movimientos || [])

// Filtered Items
const filteredItems = computed(() => {
  let list = items.value
  if (filtroTipo.value) {
    list = list.filter(item => item.tipo === filtroTipo.value)
  }
  return list
})

// Lifecycle
onMounted(async () => {
  await bodegaStore.cargarItems()
  await movimientosStore.cargarMovimientos()
})

// Modals and Forms
const modalItemOpen = ref(false)
const editMode = ref(false)
const formItemValid = ref(false)
const formItem = ref(null)

const defaultItemData = () => ({
  nombre: '',
  codigo_sar: '',
  tipo: 'fertilizante',
  unidad: 'kg',
  stock_actual: 0,
  stock_minimo: 5,
  costo_adquisicion: null
})

const formItemData = ref(defaultItemData())
const selectedItem = ref(null)

// Modal Movimiento
const modalMovOpen = ref(false)
const formMovValid = ref(false)
const formMov = ref(null)

const defaultMovData = () => ({
  tipo: 'ingreso',
  cantidad: 1,
  costo_unitario: null,
  registrarFinanzas: false,
  notas: ''
})

const formMovData = ref(defaultMovData())

// Dialog Eliminar
const dialogEliminar = ref(false)

// Open Modal Nuevo Item
const abrirModalNuevoItem = () => {
  editMode.value = false
  formItemData.value = defaultItemData()
  modalItemOpen.value = true
  if (formItem.value) formItem.value.resetValidation()
}

// Open Modal Editar Item
const abrirModalEditarItem = (item) => {
  editMode.value = true
  selectedItem.value = item
  formItemData.value = {
    nombre: item.nombre,
    codigo_sar: item.codigo_sar || '',
    tipo: item.tipo,
    unidad: item.unidad,
    stock_minimo: item.stock_minimo,
    costo_adquisicion: item.costo_adquisicion || null
  }
  modalItemOpen.value = true
  if (formItem.value) formItem.value.resetValidation()
}

// Save Item
const guardarItem = async () => {
  if (!formItemValid.value) return

  try {
    if (editMode.value) {
      await bodegaStore.updateItem(selectedItem.value.id, formItemData.value)
    } else {
      await bodegaStore.crearItem(formItemData.value)
    }
    modalItemOpen.value = false
  } catch (e) {
    // handled by store
  }
}

// Open Modal Movimiento
const abrirModalMovimiento = (item) => {
  selectedItem.value = item
  formMovData.value = defaultMovData()
  modalMovOpen.value = true
  if (formMov.value) formMov.value.resetValidation()
}

// Register Movimiento
const registrarMovimiento = async () => {
  if (!formMovValid.value) return

  try {
    const payload = {
      item: selectedItem.value.id,
      tipo: formMovData.value.tipo,
      cantidad: Number(formMovData.value.cantidad),
      notas: formMovData.value.notas,
      costo_unitario: formMovData.value.tipo === 'ingreso' ? Number(formMovData.value.costo_unitario) : undefined
    }
    await movimientosStore.registrarMovimiento(payload)
    
    if (formMovData.value.tipo === 'ingreso' && formMovData.value.registrarFinanzas) {
      const { useFinanzaStore } = await import('@/stores/finanzaStore')
      const finanzasStore = useFinanzaStore()
      await finanzasStore.crearRegistro({
        tipo: 'egreso',
        monto: payload.cantidad * payload.costo_unitario,
        categoria: 'compra_insumos',
        descripcion: `Compra de ${payload.cantidad} ${selectedItem.value.unidad} de ${selectedItem.value.nombre}`,
        fecha: new Date().toISOString()
      })
    }
    
    modalMovOpen.value = false
  } catch (e) {
    // handled by store
  }
}

// Confirm Delete
const confirmarEliminarItem = (item) => {
  selectedItem.value = item
  dialogEliminar.value = true
}

// Perform Delete
const eliminarItemConfirmado = async () => {
  try {
    await bodegaStore.eliminarItem(selectedItem.value.id)
    dialogEliminar.value = false
  } catch (e) {
    // handled by store
  }
}

// Helpers
const getTipoColor = (tipo) => {
  if (tipo === 'plaguicida') return 'red-lighten-1'
  if (tipo === 'fertilizante') return 'green-lighten-1'
  return 'blue-grey-lighten-1'
}

const validarStockEgreso = (v) => {
  if (formMovData.value.tipo === 'egreso' && selectedItem.value) {
    if (Number(v) > selectedItem.value.stock_actual) {
      return `Egreso supera el stock disponible (${selectedItem.value.stock_actual} ${selectedItem.value.unidad})`
    }
  }
  return true
}

const formatFecha = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleString()
}
</script>

<style scoped>
.bg-gradient-teal {
  background: linear-gradient(135deg, #00796B 0%, #004D40 100%);
}
.hover-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 77, 64, 0.12) !important;
}
.gap-2 {
  gap: 8px;
}
.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}
.glass-card {
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.9);
}
</style>
