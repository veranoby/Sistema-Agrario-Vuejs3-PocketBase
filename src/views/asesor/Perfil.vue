<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <!-- Header -->
      <v-row class="mb-4">
        <v-col cols="12">
          <div>
            <h1 class="text-h4 font-weight-bold text-teal-darken-3 mb-1">
              <v-icon icon="mdi-account-circle" color="teal" size="36" class="mr-2"></v-icon>
              Mi Perfil Profesional
            </h1>
            <p class="text-subtitle-1 text-grey-darken-1">
              Administra tus especialidades, provincias de cobertura y biografía corta para darte a conocer en el directorio de haciendas.
            </p>
          </div>
        </v-col>
      </v-row>

      <v-row>
        <!-- Form Column -->
        <v-col cols="12" md="8">
          <v-card class="elevation-3 rounded-xl border border-grey-lighten-3 pa-6">
            <v-card-title class="pa-0 mb-4 text-h6 font-weight-bold text-teal-darken-4">
              Datos del Asesor Técnico
            </v-card-title>
            
            <v-form ref="form" v-model="formValid" @submit.prevent="saveProfile">
              <v-row>
                <!-- Names (Read-only for billing integrity) -->
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="name"
                    label="Nombre"
                    variant="outlined"
                    density="compact"
                    color="teal"
                    disabled
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="lastname"
                    label="Apellido"
                    variant="outlined"
                    density="compact"
                    color="teal"
                    disabled
                  ></v-text-field>
                </v-col>

                <!-- Professional Credentials (Read-only) -->
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="email"
                    label="Correo Electrónico"
                    variant="outlined"
                    density="compact"
                    color="teal"
                    disabled
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="numeroColegiatura"
                    label="Número de Colegiatura (SENESCYT / Colegiado)"
                    variant="outlined"
                    density="compact"
                    color="teal"
                    disabled
                    prepend-inner-icon="mdi-certificate"
                  ></v-text-field>
                </v-col>

                <!-- Specialties (Editable) -->
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="selectedEspecialidades"
                    :items="ESPECIALIDADES"
                    prepend-inner-icon="mdi-sprout"
                    label="Especialidades"
                    multiple
                    chips
                    variant="outlined"
                    density="compact"
                    color="teal"
                    :rules="[v => v.length > 0 || 'Debes seleccionar al menos una especialidad']"
                    required
                  ></v-select>
                </v-col>

                <!-- Coverage Areas (Editable) -->
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="selectedProvincias"
                    :items="PROVINCIAS"
                    prepend-inner-icon="mdi-map-marker"
                    label="Provincias de Cobertura"
                    multiple
                    chips
                    variant="outlined"
                    density="compact"
                    color="teal"
                    :rules="[v => v.length > 0 || 'Debes seleccionar al menos una provincia de cobertura']"
                    required
                  ></v-select>
                </v-col>

                <!-- Professional Bio -->
                <v-col cols="12">
                  <v-textarea
                    v-model="bioCorta"
                    label="Breve Resumen Profesional / Biografía"
                    placeholder="Ingeniero agrónomo con más de 10 años de experiencia en control de fitosanitarios de banano orgánico y cacao..."
                    variant="outlined"
                    rows="4"
                    maxlength="500"
                    counter
                    color="teal"
                    :rules="[v => !!v || 'La biografía profesional es requerida']"
                    required
                  ></v-textarea>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>
              <div class="d-flex justify-end">
                <v-btn
                  type="submit"
                  color="teal"
                  variant="flat"
                  class="font-weight-bold text-white rounded-lg px-6"
                  prepend-icon="mdi-content-save"
                  :disabled="!formValid || loading"
                >
                  Guardar Perfil
                </v-btn>
              </div>
            </v-form>
          </v-card>
        </v-col>

        <!-- Preview Column -->
        <v-col cols="12" md="4">
          <v-card class="elevation-3 rounded-xl border border-grey-lighten-3 pa-6 h-100">
            <v-card-title class="pa-0 mb-4 text-h6 font-weight-bold text-teal-darken-4">
              Vista Previa en Directorio
            </v-card-title>
            
            <p class="text-caption text-grey-darken-1 mb-4">
              Así es como aparecerá tu perfil ante los administradores de haciendas en su buscador.
            </p>

            <!-- Card Preview Model -->
            <v-card class="elevation-4 rounded-lg overflow-hidden border border-grey-lighten-2 w-100">
              <div class="bg-gradient-teal py-4 px-4 text-white d-flex align-center gap-3">
                <v-avatar size="56" class="border border-white border-2 elevation-2">
                  <div class="d-flex align-center justify-center bg-teal-darken-1 text-h6 font-weight-bold fill-height text-white w-100 h-100">
                    {{ initials }}
                  </div>
                </v-avatar>
                <div class="overflow-hidden">
                  <h3 class="text-subtitle-1 font-weight-bold text-truncate mb-0">
                    {{ name }} {{ lastname }}
                  </h3>
                  <span class="text-caption text-teal-lighten-5 d-block">
                    Reg: {{ numeroColegiatura || 'N/A' }}
                  </span>
                </div>
              </div>

              <v-card-text class="pt-4 pb-2">
                <!-- Specialties -->
                <div class="mb-3">
                  <div class="text-caption font-weight-bold text-grey-darken-1 mb-1">Especialidades:</div>
                  <div class="d-flex flex-wrap gap-1">
                    <v-chip
                      v-for="(spec, idx) in limitItems(selectedEspecialidades, 3)"
                      :key="spec"
                      size="x-small"
                      color="teal-darken-1"
                      variant="flat"
                      class="font-weight-medium text-white"
                    >
                      {{ spec }}
                    </v-chip>
                    <v-chip
                      v-if="selectedEspecialidades.length > 3"
                      size="x-small"
                      color="teal-lighten-4"
                      variant="flat"
                      class="font-weight-bold text-teal-darken-3"
                    >
                      +{{ selectedEspecialidades.length - 3 }}
                    </v-chip>
                    <span v-if="selectedEspecialidades.length === 0" class="text-caption text-grey italic">Ninguna seleccionada</span>
                  </div>
                </div>

                <!-- Cobertura -->
                <div class="mb-3">
                  <div class="text-caption font-weight-bold text-grey-darken-1 mb-1">Zonas Cobertura:</div>
                  <div class="d-flex flex-wrap gap-1">
                    <v-chip
                      v-for="zone in limitItems(selectedProvincias, 2)"
                      :key="zone"
                      size="x-small"
                      color="blue-darken-1"
                      variant="flat"
                      class="font-weight-medium text-white"
                    >
                      {{ zone }}
                    </v-chip>
                    <v-chip
                      v-if="selectedProvincias.length > 2"
                      size="x-small"
                      color="blue-lighten-4"
                      variant="flat"
                      class="font-weight-bold text-blue-darken-3"
                    >
                      +{{ selectedProvincias.length - 2 }}
                    </v-chip>
                    <span v-if="selectedProvincias.length === 0" class="text-caption text-grey italic">Ninguna seleccionada</span>
                  </div>
                </div>

                <!-- Bio -->
                <div>
                  <p class="text-caption text-grey-darken-2 italic-bio">
                    "{{ truncateText(bioCorta, 110) }}"
                  </p>
                </div>
              </v-card-text>
            </v-card>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'

const authStore = useAuthStore()
const uiFeedback = useUiFeedbackStore()

const formValid = ref(false)
const loading = ref(false)

const name = ref('')
const lastname = ref('')
const email = ref('')
const numeroColegiatura = ref('')
const selectedEspecialidades = ref([])
const selectedProvincias = ref([])
const bioCorta = ref('')

const PROVINCIAS = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"]
const ESPECIALIDADES = ["Banano", "Cacao", "Suelos", "Flores", "Frutales", "Cítricos", "Hortalizas", "Ganadería", "Otro"]

const initials = computed(() => {
  const first = name.value ? name.value[0] : ''
  const last = lastname.value ? lastname.value[0] : ''
  return (first + last).toUpperCase()
})

onMounted(() => {
  name.value = authStore.user?.name || ''
  lastname.value = authStore.user?.lastname || ''
  email.value = authStore.user?.email || ''
  
  const parsed = authStore.asesorInfo || {}
  numeroColegiatura.value = parsed.numero_colegiatura || ''
  selectedEspecialidades.value = parsed.especialidades || []
  selectedProvincias.value = parsed.zonas_cobertura || []
  bioCorta.value = parsed.bio_corta || ''
})

const limitItems = (arr, limit) => {
  return arr ? arr.slice(0, limit) : []
}

const truncateText = (text, len) => {
  if (!text) return 'Sin descripción profesional registrada.'
  return text.length > len ? text.substring(0, len) + '...' : text
}

const saveProfile = async () => {
  loading.value = true
  uiFeedback.showLoading()
  try {
    const updatedInfo = {
      numero_colegiatura: numeroColegiatura.value,
      especialidades: selectedEspecialidades.value,
      zonas_cobertura: selectedProvincias.value,
      bio_corta: bioCorta.value
    }

    const payload = {
      info: JSON.stringify(updatedInfo)
    }

    const record = await pb.collection('users').update(authStore.user.id, payload)
    authStore.user = record

    uiFeedback.showSnackbar('Perfil actualizado con éxito', 'success')
  } catch (error) {
    handleError(error, 'Error al guardar el perfil del asesor')
  } finally {
    loading.value = false
    uiFeedback.hideLoading()
  }
}
</script>

<style scoped>
.bg-gradient-teal {
  background: linear-gradient(135deg, #00796B 0%, #004D40 100%);
}
.italic-bio {
  font-style: italic;
  line-height: 1.4;
  color: #555;
}
.gap-1 {
  gap: 4px;
}
.gap-3 {
  gap: 12px;
}
.border-2 {
  border-width: 2px !important;
}
</style>
