<template>
  <v-dialog
    :model-value="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    max-width="500"
    persistent
  >
    <v-card class="rounded-xl overflow-hidden shadow-2xl">
      <v-toolbar color="green-darken-3" dark class="px-4">
        <v-icon start size="large">mdi-dolly</v-icon>
        <v-toolbar-title class="font-weight-bold text-h6">
          Registrar Cosecha (Tarja)
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="$emit('update:modelValue', false)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-form ref="formRef" @submit.prevent="handleSubmit" v-model="formValid">
        <v-card-text class="pa-6">
          <!-- Alerta Offline si corresponde -->
          <v-alert
            v-if="!syncStore.isOnline"
            type="info"
            variant="tonal"
            density="compact"
            icon="mdi-cloud-off-outline"
            class="mb-4 text-caption rounded-lg"
          >
            Modo offline activo. El registro se guardará localmente y se sincronizará automáticamente al detectar conexión.
          </v-alert>

          <!-- Campo Operario (Solo editable por admin, autocompletado y bloqueado para operadores) -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Operario / Jornalero
            </label>
            <v-select
              v-if="isAdmin"
              v-model="formData.operario"
              :items="operadores"
              item-title="name"
              item-value="id"
              placeholder="Seleccione el operario"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || 'Debe seleccionar un operario']"
              required
              class="rounded-lg"
              prepend-inner-icon="mdi-account-outline"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :title="item.raw.name" :subtitle="item.raw.email">
                  <template v-slot:prepend>
                    <v-avatar size="32" color="green-lighten-4" class="text-green-darken-3 font-weight-bold text-caption">
                      {{ getInitials(item.raw.name) }}
                    </v-avatar>
                  </template>
                </v-list-item>
              </template>
            </v-select>
            <div v-else class="d-flex align-center pa-3 bg-grey-lighten-4 rounded-lg border">
              <v-avatar size="40" color="green-darken-3" class="text-white font-weight-bold mr-3">
                {{ getInitials(currentUser?.name) }}
              </v-avatar>
              <div>
                <div class="font-weight-bold text-body-1 text-grey-darken-4">
                  {{ currentUser?.name }}
                </div>
                <div class="text-caption text-grey-darken-1">
                  Usuario Activo (Operador)
                </div>
              </div>
            </div>
          </div>

          <!-- Selector de Siembra Activa -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Siembra / Lote de Cosecha
            </label>
            <v-select
              v-model="formData.siembra"
              :items="siembrasActivas"
              item-title="nombre"
              item-value="id"
              placeholder="Seleccione la siembra"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || 'Debe seleccionar una siembra']"
              required
              class="rounded-lg"
              prepend-inner-icon="mdi-sprout-outline"
            ></v-select>
          </div>

          <!-- Fecha de Labor -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Fecha de Registro
            </label>
            <v-text-field
              v-model="formData.fecha"
              type="date"
              variant="outlined"
              density="comfortable"
              :rules="[(v) => !!v || 'La fecha es requerida']"
              required
              class="rounded-lg"
              prepend-inner-icon="mdi-calendar-outline"
            ></v-text-field>
          </div>

          <v-row>
            <!-- Tipo de Unidad -->
            <v-col cols="6" class="py-0">
              <div class="mb-4">
                <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                  Unidad
                </label>
                <v-select
                  v-model="formData.tipo_unidad"
                  :items="['cajas', 'racimos', 'kilos', 'unidades']"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Requerido']"
                  required
                  class="rounded-lg"
                ></v-select>
              </div>
            </v-col>

            <!-- Cantidad Cosechada -->
            <v-col cols="6" class="py-0">
              <div class="mb-4">
                <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                  Cantidad (Bruta)
                </label>
                <v-text-field
                  v-model.number="formData.cantidad"
                  type="number"
                  min="0.1"
                  step="any"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    (v) => !!v || 'Requerido',
                    (v) => Number(v) > 0 || 'Debe ser mayor a 0'
                  ]"
                  required
                  class="rounded-lg font-weight-bold"
                ></v-text-field>
              </div>
            </v-col>

            <!-- Merma -->
            <v-col cols="12" class="py-0">
              <div class="mb-4">
                <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                  Cantidad de Merma (Descarte)
                </label>
                <v-text-field
                  v-model.number="formData.cantidad_merma"
                  type="number"
                  min="0"
                  step="any"
                  variant="outlined"
                  density="comfortable"
                  :rules="[
                    (v) => Number(v) >= 0 || 'No puede ser negativo',
                    (v) => (Number(v) || 0) < (Number(formData.cantidad) || 0) || 'La merma no puede superar la cantidad'
                  ]"
                  class="rounded-lg text-red-darken-3"
                  prepend-inner-icon="mdi-delete-empty-outline"
                ></v-text-field>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="px-4 rounded-lg"
            @click="$emit('update:modelValue', false)"
          >
            Cancelar
          </v-btn>
          <v-btn
            type="submit"
            color="green-darken-3"
            variant="flat"
            class="px-6 rounded-lg font-weight-bold"
            :loading="loading"
            :disabled="!formValid"
          >
            Guardar Tarja
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useUserStore } from '@/stores/userStore'
import { useTarjasStore } from '@/stores/tarjasStore'
import { useSyncStore } from '@/stores/sync'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { handleError } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'saved'])

// Stores
const authStore = useAuthStore()
const siembrasStore = useSiembrasStore()
const userStore = useUserStore()
const tarjasStore = useTarjasStore()
const syncStore = useSyncStore()
const haciendaStore = useHaciendaStore()

// State
const formRef = ref(null)
const formValid = ref(false)
const loading = ref(false)
const operadores = ref([])

const initialForm = () => ({
  operario: authStore.user?.role === 'operador' ? authStore.user?.id : '',
  siembra: '',
  fecha: new Date().toISOString().split('T')[0],
  tipo_unidad: 'cajas',
  cantidad: null,
  cantidad_merma: 0
})

const formData = ref(initialForm())

// Computed
const currentUser = computed(() => authStore.user)
const isAdmin = computed(() => currentUser.value?.role === 'administrador')

const siembrasActivas = computed(() => {
  return siembrasStore.siembras.filter(s => s.estado === 'activa' || s.estado === 'cosecha')
})

// Helpers
const getInitials = (name) => {
  if (!name) return 'OP'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// Cargar catálogo de operarios si es administrador
const loadCatalogos = async () => {
  if (isAdmin.value && haciendaStore.mi_hacienda?.id) {
    try {
      const users = await userStore.fetchHaciendaUsers(haciendaStore.mi_hacienda.id)
      // Filtrar operarios
      operadores.value = users.filter(u => u.role === 'operador')
    } catch (e) {
      handleError(e, 'Error al cargar listado de operarios')
    }
  }
}

// Watchers
watch(() => props.modelValue, async (newVal) => {
  if (newVal) {
    formData.value = initialForm()
    if (formRef.value) formRef.value.resetValidation()
    
    // Cargar siembras si no están inicializadas
    if (siembrasStore.siembras.length === 0) {
      await siembrasStore.cargarSiembras().catch(e => logger.warn(e))
    }
    
    await loadCatalogos()
  }
})

// Submit
const handleSubmit = async () => {
  if (!formValid.value) return
  loading.value = true
  try {
    const payload = {
      operario: formData.value.operario,
      siembra: formData.value.siembra,
      fecha: `${formData.value.fecha}T12:00:00.000Z`, // Forzar hora media para evitar desvíos UTC
      tipo_unidad: formData.value.tipo_unidad,
      cantidad: Number(formData.value.cantidad),
      cantidad_merma: Number(formData.value.cantidad_merma) || 0
    }
    
    await tarjasStore.crearTarja(payload)
    emit('saved')
    emit('update:modelValue', false)
  } catch (error) {
    handleError(error, 'Error al guardar el registro de cosecha')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.rounded-xl {
  border-radius: 16px !important;
}
.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}
</style>
