<template>
  <v-dialog v-model="isOpen" max-width="850" scrollable persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-primary text-white d-flex align-center justify-space-between py-3 px-4">
        <div class="d-flex align-center">
          <v-icon :icon="isEdit ? 'mdi-pencil-box' : 'mdi-plus-box'" class="mr-2" size="small" />
          <span class="text-h6 font-weight-bold">{{ isEdit ? 'Editar Producto / Insumo' : 'Publicar Nuevo Producto' }}</span>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeModal" />
      </v-card-title>

      <v-card-text class="pa-4 bg-background">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSave">
          <!-- 1. Información General del Producto -->
          <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
            <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon icon="mdi-information-outline" size="18" class="mr-1" color="primary" />
              Datos del Insumo / Producto
            </h4>
            <v-row dense>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="form.nombre"
                  label="Nombre Comercial del Producto *"
                  placeholder="Ej: Fertilizante Foliar Bio-K 500, Mancozeb 80 WP..."
                  :rules="[v => !!v?.trim() || 'El nombre es obligatorio']"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-tag-outline"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="form.categoria"
                  :items="categoriasList"
                  item-title="title"
                  item-value="value"
                  label="Categoría *"
                  :rules="[v => !!v || 'Seleccione una categoría']"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.precio"
                  type="number"
                  step="0.01"
                  min="0"
                  label="Precio Unitario (USD) *"
                  placeholder="0.00"
                  :rules="[v => v > 0 || 'Ingrese un precio válido mayor a 0']"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-currency-usd"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="form.unidad_medida"
                  :items="unidadesList"
                  label="Unidad de Medida *"
                  :rules="[v => !!v || 'Seleccione unidad']"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.stock_disponible"
                  type="number"
                  min="0"
                  label="Stock Disponible (Unidades)"
                  placeholder="Ej: 50"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-warehouse"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="form.descripcion"
                  label="Descripción, Ingrediente Activo y Dosis Recomendada"
                  placeholder="Detalle ingredientes activos, modo de acción, cultivos recomendados y precauciones..."
                  rows="3"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-card>

          <!-- 2. Registro Fitosanitario & Compliance Oficial -->
          <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
            <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon icon="mdi-shield-check-outline" size="18" class="mr-1" color="teal-darken-2" />
              Cumplimiento Normativo y Registro Fitosanitario
            </h4>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.registro_fitosanitario"
                  :label="registroLabelComputed"
                  placeholder="Ej: 045-F-AGR / REG-ICA-1234..."
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-certificate-outline"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-file-input
                  v-model="fichaTecnicaFile"
                  label="Ficha Técnica Oficial (PDF)"
                  accept="application/pdf"
                  variant="outlined"
                  density="comfortable"
                  prepend-icon=""
                  prepend-inner-icon="mdi-file-pdf-box"
                  show-size
                />
              </v-col>
            </v-row>
          </v-card>

          <!-- 3. Cobertura Geográfica y Logística de Despacho -->
          <v-card variant="flat" border class="pa-4 mb-4 rounded-lg">
            <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon icon="mdi-truck-delivery-outline" size="18" class="mr-1" color="info" />
              Alcance Logístico y Despacho
            </h4>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.alcance_envio"
                  :items="[
                    { title: 'Nacional (Todo el país)', value: 'nacional' },
                    { title: 'Regional (Provincias seleccionadas)', value: 'regional' },
                    { title: 'Local (Solo provincia base)', value: 'local' },
                    { title: 'Internacional', value: 'internacional' }
                  ]"
                  label="Alcance de Envío *"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.tiempo_entrega_dias"
                  type="number"
                  min="1"
                  max="30"
                  label="Tiempo Estimado de Entrega (Días)"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-clock-outline"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="form.costo_envio_base"
                  type="number"
                  step="0.01"
                  min="0"
                  label="Flete / Costo de Envío Base ($)"
                  placeholder="0.00 (Gratis si es 0)"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-cash"
                />
              </v-col>

              <!-- Selector Geográfico Universal para Zonas Permitidas -->
              <v-col cols="12" class="mt-2">
                <UniversalGeoSelector
                  v-model:country="form.pais_origen"
                  v-model:subdivision="form.estados_envio_permitidos"
                  :show-subdivision="form.alcance_envio === 'regional' || form.alcance_envio === 'local'"
                  :multi-subdivision="form.alcance_envio === 'regional'"
                  country-label="País de Origen del Despacho"
                  subdivision-label="Provincias con Cobertura de Despacho"
                />
              </v-col>
            </v-row>
          </v-card>

          <!-- 4. Fotos y Estado de Publicación -->
          <v-card variant="flat" border class="pa-4 rounded-lg">
            <v-row dense>
              <v-col cols="12" md="8">
                <v-file-input
                  v-model="fotosFiles"
                  multiple
                  chips
                  label="Fotos del Producto (Hasta 5 imágenes)"
                  accept="image/png, image/jpeg, image/webp"
                  variant="outlined"
                  density="comfortable"
                  prepend-icon=""
                  prepend-inner-icon="mdi-camera"
                  show-size
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="form.estado"
                  :items="[
                    { title: 'Activo (Visible en tienda)', value: 'activo' },
                    { title: 'Pausado (Oculto temporalmente)', value: 'pausado' },
                    { title: 'Agotado', value: 'agotado' }
                  ]"
                  label="Estado de Publicación"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-card>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3 px-4 bg-surface">
        <v-spacer />
        <v-btn color="grey" variant="text" @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="saving"
          :disabled="!form.nombre?.trim() || !form.precio"
          prepend-icon="mdi-content-save"
          @click="handleSave"
        >
          {{ isEdit ? 'Actualizar Producto' : 'Publicar Producto' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTiendaAsesorStore } from '@/stores/tiendaAsesorStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { getAgenciaFitosanitaria } from '@/constants/agenciasReguladoras'
import UniversalGeoSelector from '@/components/common/UniversalGeoSelector.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  producto: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const tiendaStore = useTiendaAsesorStore()
const uiFeedback = useUiFeedbackStore()

const formRef = ref(null)
const formValid = ref(true)
const saving = ref(false)

const fotosFiles = ref([])
const fichaTecnicaFile = ref(null)

const form = ref({
  nombre: '',
  categoria: 'fertilizantes',
  descripcion: '',
  precio: null,
  unidad_medida: 'litro',
  stock_disponible: 0,
  registro_fitosanitario: '',
  pais_origen: 'EC',
  alcance_envio: 'nacional',
  estados_envio_permitidos: [],
  tiempo_entrega_dias: 3,
  costo_envio_base: 0,
  estado: 'activo',
  visibilidad: 'publico'
})

const isEdit = computed(() => !!props.producto?.id)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const registroLabelComputed = computed(() => {
  const ag = getAgenciaFitosanitaria(form.value.pais_origen)
  return `${ag.registroLabel} (${ag.sigla})`
})

const categoriasList = [
  { title: 'Fertilizantes y Nutrición', value: 'fertilizantes' },
  { title: 'Abonos Foliares y Bioestimulantes', value: 'foliares' },
  { title: 'Fitosanitarios y Defensivos BPA', value: 'fitosanitarios' },
  { title: 'Bioinsumos y Extractos Orgánicos', value: 'bioinsumos' },
  { title: 'Semillas y Material Vegetal', value: 'semillas' },
  { title: 'Herramientas y Equipos de Riego', value: 'herramientas' },
  { title: 'Servicios Técnicos y Análisis de Suelo', value: 'servicios_analisis' },
  { title: 'Otros Insumos Agronómicos', value: 'otros' }
]

const unidadesList = [
  { title: 'Litro (L)', value: 'litro' },
  { title: 'Galón (3.78 L)', value: 'galon' },
  { title: 'Caneca (20 L)', value: 'caneca_20l' },
  { title: 'Kilogramo (kg)', value: 'kg' },
  { title: 'Saco 50 kg', value: 'saco_50kg' },
  { title: 'Frasco 500 ml', value: 'frasco_500ml' },
  { title: 'Dosis / Hectárea', value: 'dosis_ha' },
  { title: 'Unidad / Pieza', value: 'unidad' },
  { title: 'Servicio / Paquete', value: 'servicio' }
]

watch(() => props.modelValue, (val) => {
  if (val) {
    initForm()
  }
})

function initForm() {
  fotosFiles.value = []
  fichaTecnicaFile.value = null

  if (props.producto) {
    form.value = {
      nombre: props.producto.nombre || '',
      categoria: props.producto.categoria || 'fertilizantes',
      descripcion: props.producto.descripcion || '',
      precio: props.producto.precio || 0,
      unidad_medida: props.producto.unidad_medida || 'litro',
      stock_disponible: props.producto.stock_disponible || 0,
      registro_fitosanitario: props.producto.registro_fitosanitario || '',
      pais_origen: props.producto.pais_origen || 'EC',
      alcance_envio: props.producto.alcance_envio || 'nacional',
      estados_envio_permitidos: Array.isArray(props.producto.estados_envio_permitidos) ? [...props.producto.estados_envio_permitidos] : [],
      tiempo_entrega_dias: props.producto.tiempo_entrega_dias || 3,
      costo_envio_base: props.producto.costo_envio_base || 0,
      estado: props.producto.estado || 'activo',
      visibilidad: props.producto.visibilidad || 'publico'
    }
  } else {
    form.value = {
      nombre: '',
      categoria: 'fertilizantes',
      descripcion: '',
      precio: null,
      unidad_medida: 'litro',
      stock_disponible: 0,
      registro_fitosanitario: '',
      pais_origen: 'EC',
      alcance_envio: 'nacional',
      estados_envio_permitidos: [],
      tiempo_entrega_dias: 3,
      costo_envio_base: 0,
      estado: 'activo',
      visibilidad: 'publico'
    }
  }
}

function closeModal() {
  isOpen.value = false
}

async function handleSave() {
  if (!form.value.nombre?.trim() || !form.value.precio) {
    uiFeedback.showSnackbar('Complete los campos obligatorios (*)', 'warning')
    return
  }

  saving.value = true
  try {
    const formData = new FormData()
    formData.append('nombre', form.value.nombre.trim())
    formData.append('categoria', form.value.categoria)
    formData.append('descripcion', form.value.descripcion || '')
    formData.append('precio', form.value.precio)
    formData.append('unidad_medida', form.value.unidad_medida)
    formData.append('stock_disponible', form.value.stock_disponible || 0)
    formData.append('registro_fitosanitario', form.value.registro_fitosanitario || '')
    formData.append('pais_origen', form.value.pais_origen || 'EC')
    formData.append('alcance_envio', form.value.alcance_envio || 'nacional')
    formData.append('estados_envio_permitidos', JSON.stringify(form.value.estados_envio_permitidos || []))
    formData.append('tiempo_entrega_dias', form.value.tiempo_entrega_dias || 3)
    formData.append('costo_envio_base', form.value.costo_envio_base || 0)
    formData.append('estado', form.value.estado || 'activo')
    formData.append('visibilidad', form.value.visibilidad || 'publico')

    // Archivos
    if (Array.isArray(fotosFiles.value) && fotosFiles.value.length > 0) {
      fotosFiles.value.forEach(file => {
        formData.append('fotos', file)
      })
    }

    if (fichaTecnicaFile.value) {
      formData.append('ficha_tecnica', fichaTecnicaFile.value)
    }

    if (isEdit.value) {
      await tiendaStore.updateProducto(props.producto.id, formData)
    } else {
      await tiendaStore.createProducto(formData)
    }

    emit('saved')
    closeModal()
  } catch (err) {
    console.error('Error guardando producto:', err)
  } finally {
    saving.value = false
  }
}
</script>
