<template>
  <!-- Diálogo para Crear/Editar Recordatorio -->
  <v-dialog
    :model-value="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    max-width="800"
    persistent
  >
    <v-card>
      <v-toolbar color="gray" dark>
        <v-toolbar-title>{{ formTitle }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-form @submit.prevent="handleSubmit">
        <v-card-text>
          <v-text-field
            v-model="formData.titulo"
            label="Título"
            :rules="[(v) => !!v || 'Título requerido']"
            required
            variant="outlined"
            density="compact"
            class="compact-form"
          ></v-text-field>

          <div class="grid grid-cols-2 gap-2 p-0 m-0">
            <div class="p-0 m-0">
              <v-textarea
                v-model="formData.descripcion"
                label="Descripción"
                rows="4"
                variant="outlined"
                density="compact"
                class="compact-form"
              ></v-textarea>
            </div>

            <div class="p-2 m-0">
              <v-text-field
                v-model="formData.fecha_recordatorio"
                label="Fecha Recordatorio"
                type="date"
                :min="new Date().toISOString().split('T')[0]"
                required
                variant="outlined"
                density="compact"
                class="compact-form p-0 m-0"
              ></v-text-field>

              <v-select
                v-model="formData.prioridad"
                :items="['baja', 'media', 'alta']"
                label="Prioridad"
                variant="outlined"
                density="compact"
                class="compact-form p-0 m-0"
              ></v-select>
            </div>
          </div>

          <!-- Prueba de chips-->

          <v-card class="siembra-info ml-1 mr-1 mb-3">
            <v-toolbar density="compact" color="siembra-info" dark>
              <v-toolbar-title class="text-sm">Siembras disponibles</v-toolbar-title>
              <v-spacer></v-spacer>
            </v-toolbar>

            <v-card-text>
              <v-chip-group column color="green-darken-3" multiple v-model="formData.siembras">
                <v-chip
                  v-for="siembra in siembras"
                  :key="siembra.id"
                  :text="`${siembra.nombre}-${siembra.tipo}`"
                  :value="siembra.id"
                  filter
                  size="small"
                  density="compact"
                ></v-chip>
              </v-chip-group>
            </v-card-text>
          </v-card>

          <v-card class="siembra-info ml-1 mr-1 mt-3">
            <v-toolbar density="compact" color="siembra-info" dark>
              <v-toolbar-title class="text-sm">Zonas disponibles</v-toolbar-title>
              <v-spacer></v-spacer>
            </v-toolbar>

            <v-card-text>
              <v-chip-group color="blue-darken-3" column multiple v-model="formData.zonas">
                <v-chip
                  v-for="zona in filteredZonas"
                  :key="zona.id"
                  :text="`${zona.nombre} (${getTipoZonasById(zona.tipos_zonas)})`"
                  :value="zona.id"
                  filter
                  size="small"
                  density="compact"
                  pill
                ></v-chip>
              </v-chip-group>
            </v-card-text>
          </v-card>

          <v-card class="siembra-info ml-1 mr-1 mt-3">
            <v-toolbar density="compact" color="siembra-info" dark>
              <v-toolbar-title class="text-sm">Actividades disponibles</v-toolbar-title>
              <v-spacer></v-spacer>
            </v-toolbar>

            <v-card-text>
              <v-chip-group color="orange-darken-3" column multiple v-model="formData.actividades">
                <v-chip
                  v-for="actividad in actividadesOptions"
                  :key="actividad.id"
                  :value="actividad.id"
                  filter
                  size="small"
                  density="compact"
                  pill
                >
                  {{ actividad.nombre }}
                </v-chip>
              </v-chip-group>
            </v-card-text>
          </v-card>

          <!--         <v-combobox
            v-model="formData.actividad"
            :items="actividadesOptions"
            item-title="nombre"
            label="Actividades relacionadas"
            multiple
            chips
          ></v-combobox>
          -->
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="$emit('update:modelValue', false)"
          >
            Cancelar
          </v-btn>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            type="submit"
            :loading="loading"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { handleError } from '@/utils/errorHandler'
import { storeToRefs } from 'pinia'

const props = defineProps({
  modelValue: Boolean,
  recordatorio: {
    type: Object,
    default: () => ({
      titulo: '',
      descripcion: '',
      fecha_recordatorio: new Date().toISOString().substr(0, 10),
      prioridad: 'media',
      estado: 'pendiente',
      siembras: [],
      actividades: [],
      zonas: []
    })
  },
  isEditing: Boolean
})

const emit = defineEmits(['submit', 'update:modelValue'])

// Stores
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const zonasStore = useZonasStore()

// Data
const formData = ref({ ...props.recordatorio })
const loading = ref(false)

// Options
const prioridades = ['baja', 'media', 'alta']
const { siembras } = storeToRefs(siembrasStore)
const actividadesOptions = computed(() => actividadesStore.actividades)
const { zonas, tiposZonas } = storeToRefs(zonasStore)

// Computed
const formTitle = computed(() => (props.isEditing ? 'Editar Recordatorio' : 'Nuevo Recordatorio'))

const formColor = computed(() => (props.isEditing ? 'amber' : 'green'))

const filteredZonas = computed(() => {
  const zonastemp = zonas.value.filter((zona) => !zona.siembra) // Filtrar zonas sin siembra
  console.log('zonasStore.zonas:', zonasStore.zonas)
  console.log('zonastemp:', zonastemp)
  return zonastemp
})

const getTipoZonasById = (tiposZonasId) => {
  const tipoZona = tiposZonas.value.find((tipo) => tipo.id === tiposZonasId)
  return tipoZona ? tipoZona.nombre : 'Tipo de zona no encontrado' // Retorna el nombre o un mensaje si no se encuentra
}

// Añadir esta función helper
const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  } catch (e) {
    return ''
  }
}

// Watchers
watch(
  () => props.recordatorio,
  (newVal) => {
    formData.value = {
      ...newVal,
      fecha_recordatorio: formatDateForInput(newVal.fecha_recordatorio)
    }
  }
)

// Methods
async function handleSubmit() {
  loading.value = true
  try {
    const data = {
      ...formData.value,
      fecha_recordatorio: `${formData.value.fecha_recordatorio}T00:00:00.000Z`,
      siembras: formData.value.siembras,
      actividades: formData.value.actividades,
      zonas: formData.value.zonas,
      estado: formData.value.estado
    }

    emit('submit', data)
    emit('update:modelValue', false)
  } catch (error) {
    handleError(error, 'Error al guardar')
  } finally {
    loading.value = false
  }
}
</script>
