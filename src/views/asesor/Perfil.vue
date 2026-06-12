<template>
  <v-container fluid class="px-6 py-6 fill-height align-start">
    <div class="w-100">
      <!-- Header Estandarizado -->
      <div class="profile-container mt-0 ml-0 mb-4">
        <div>
          <h3 class="profile-title text-h6 sm:text-md font-weight-bold mb-1" style="color: var(--color_titulo)">
            <v-icon icon="mdi-account-circle" color="primary" size="32" class="mr-2"></v-icon>
            Mi Perfil Profesional
          </h3>
          <p class="text-md sm:  text-grey-darken-1" style="margin-top: 8px;">
            Administra tus especialidades, provincias de cobertura y biografía corta para darte a conocer en el directorio de haciendas.
          </p>
        </div>
        <div class="avatar-container">
          <img v-if="authStore.user?.avatar" :src="avatarUrl" alt="Perfil Asesor" class="avatar-image" />
          <img v-else src="@/assets/placeholder-user.png" alt="Perfil Asesor" class="avatar-image" />
        </div>
      </div>

      <v-row>
        <!-- Form Column -->
        <v-col cols="12" md="8">
          <v-card class="elevation-3 rounded-lg border border-grey-lighten-3 pa-6">
            <v-card-title class="pa-0 mb-4 text-h6 font-weight-bold text-indigo-darken-4">
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
                    color="indigo"
                    disabled
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="lastname"
                    label="Apellido"
                    variant="outlined"
                    density="compact"
                    color="indigo"
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
                    color="indigo"
                    disabled
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="numeroColegiatura"
                    label="Número de Colegiatura (SENESCYT / Colegiado)"
                    variant="outlined"
                    density="compact"
                    color="indigo"
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
                    color="indigo"
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
                    color="indigo"
                    :rules="[v => v.length > 0 || 'Debes seleccionar al menos una provincia de cobertura']"
                    required
                  ></v-select>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="cedula"
                    label="Cédula o RUC (Opcional)"
                    variant="outlined"
                    density="compact"
                    color="indigo"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="direccion"
                    label="Dirección Física"
                    variant="outlined"
                    density="compact"
                    color="indigo"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="ciudad"
                    label="Ciudad"
                    variant="outlined"
                    density="compact"
                    color="indigo"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="pais"
                    label="País"
                    variant="outlined"
                    density="compact"
                    color="indigo"
                  ></v-text-field>
                </v-col>

                <!-- Professional Bio -->
                <v-col cols="12">
                  <p class="text-xs mb-2 text-grey-darken-1">Breve Resumen Profesional / Biografía</p>
                  <div class="border rounded" style="min-height: 200px">
                    <QuillEditor
                      v-model:content="bioCorta"
                      contentType="html"
                      theme="snow"
                      toolbar="essential"
                      placeholder="Ingeniero agrónomo con más de 10 años de experiencia..."
                    />
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-4"></v-divider>
              <div class="d-flex justify-end">
                <v-btn
                  type="submit"
                  color="indigo"
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
          <v-card class="elevation-3 rounded-lg border border-grey-lighten-3 pa-6 h-100">
            <v-card-title class="pa-0 mb-4 text-h6 font-weight-bold text-indigo-darken-4">
              Vista Previa en Directorio
            </v-card-title>
            
            <p class="text-xs text-grey-darken-1 mb-4">
              Así es como aparecerá tu perfil ante los administradores de haciendas en su buscador.
            </p>

            <!-- Card Preview Model -->
            <v-card class="elevation-4 rounded-lg overflow-hidden border border-grey-lighten-2 w-100">
              <div class="bg-gradient-indigo py-4 px-4 text-white d-flex align-center gap-3">
                <v-avatar size="56" class="border border-white border-2 elevation-2 position-relative hover-avatar" @click="triggerAvatarUpload">
                  <v-img v-if="authStore.user?.avatar" :src="avatarUrl"></v-img>
                  <div v-else class="d-flex align-center justify-center bg-indigo-darken-1 text-h6 font-weight-bold fill-height text-white w-100 h-100">
                    {{ initials }}
                  </div>
                  <div class="avatar-overlay d-flex align-center justify-center text-center">
                    <v-icon color="white" size="24">mdi-camera</v-icon>
                  </div>
                </v-avatar>
                <!-- Input oculto para cambiar imagen de perfil -->
                <input ref="avatarInput" type="file" class="d-none" accept="image/*" @change="onAvatarChange">

                <div class="overflow-hidden">
                  <h3 class="  font-weight-bold text-truncate mb-0">
                    {{ name }} {{ lastname }}
                  </h3>
                  <span class="text-xs text-indigo-lighten-5 d-block">
                    Reg: {{ numeroColegiatura || 'N/A' }}
                  </span>
                </div>
              </div>

              <v-card-text class="pt-4 pb-2">
                <!-- Specialties -->
                <div class="mb-3">
                  <div class="text-xs font-weight-bold text-grey-darken-1 mb-1">Especialidades:</div>
                  <div class="d-flex flex-wrap gap-1">
                    <v-chip
                      v-for="(spec, idx) in limitItems(selectedEspecialidades, 3)"
                      :key="spec"
                      size="x-small"
                      color="indigo-darken-1"
                      variant="flat"
                      class="font-weight-medium text-white"
                    >
                      {{ spec }}
                    </v-chip>
                    <v-chip
                      v-if="selectedEspecialidades.length > 3"
                      size="x-small"
                      color="indigo-lighten-4"
                      variant="flat"
                      class="font-weight-bold text-indigo-darken-3"
                    >
                      +{{ selectedEspecialidades.length - 3 }}
                    </v-chip>
                    <span v-if="selectedEspecialidades.length === 0" class="text-xs text-grey italic">Ninguna seleccionada</span>
                  </div>
                </div>

                <!-- Cobertura -->
                <div class="mb-3">
                  <div class="text-xs font-weight-bold text-grey-darken-1 mb-1">Zonas Cobertura:</div>
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
                    <span v-if="selectedProvincias.length === 0" class="text-xs text-grey italic">Ninguna seleccionada</span>
                  </div>
                </div>

                <!-- Bio -->
                <div>
                  <p class="text-xs text-grey-darken-2 italic-bio">
                    "{{ truncateText(bioCorta, 110) }}"
                  </p>
                </div>
              </v-card-text>
            </v-card>
            
            <!-- Suscripcion de Asesor -->
            <v-card class="mt-6 rounded-lg border" :color="subscriptionActive ? 'primary' : 'warning'" variant="tonal">
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <v-icon :color="subscriptionActive ? 'primary' : 'warning'" class="mr-2">
                    {{ subscriptionActive ? 'mdi-check-decagram' : 'mdi-alert-circle-outline' }}
                  </v-icon>
                  <h3 class="  font-weight-bold" :class="subscriptionActive ? 'text-primary' : 'text-warning'">
                    Estado de Suscripción
                  </h3>
                </div>
                
                <p v-if="subscriptionActive" class="text-xs mb-2" :style="{ opacity: 0.8 }">
                  Tu entorno profesional está activo. Las haciendas pueden vincularte a sus proyectos.
                </p>
                <v-alert
                  v-if="subscriptionActive && daysUntilExpiration !== null"
                  :type="daysUntilExpiration <= 5 ? 'warning' : 'success'"
                  variant="tonal"
                  density="compact"
                  class="mb-3"
                >
                  <template v-slot:prepend>
                    <v-icon>{{ daysUntilExpiration <= 5 ? 'mdi-alert-circle' : 'mdi-clock-outline' }}</v-icon>
                  </template>
                  Quedan {{ daysUntilExpiration }} días de suscripción
                </v-alert>
                
                <v-btn
                  v-if="subscriptionActive"
                  color="primary"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-history"
                  @click="openHistoryModal"
                  class="text-none w-100"
                >
                  Ver Historial de Solicitudes
                </v-btn>
                <div v-else>
                  <p class="text-xs text-warning mb-3">
                    Tu entorno está en modo restringido. Para habilitar tu portafolio y ser visible para todas las haciendas, requieres activar tu plan profesional.
                  </p>
                  
                  <v-btn
                    v-if="!pendingRequest"
                    color="orange-darken-2"
                    variant="flat"
                    size="small"
                    prepend-icon="mdi-credit-card-outline"
                    @click="openSubscriptionDialog"
                    class="text-none mb-2 w-100"
                  >
                    Suscribirse ($5/mes)
                  </v-btn>
                  
                  <v-alert v-else type="info" density="compact" variant="tonal" class="text-xs mt-2 mb-2">
                    Tienes una solicitud de pago pendiente de revisión.
                  </v-alert>

                  <v-btn
                    color="info"
                    variant="tonal"
                    size="small"
                    prepend-icon="mdi-history"
                    @click="openHistoryModal"
                    class="text-none w-100 mb-2"
                  >
                    Ver Historial de Solicitudes
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-card>
        </v-col>
      </v-row>
    </div>
    
    <!-- Modal Suscripción -->
    <v-dialog v-model="subscriptionDialog" max-width="600">
      <v-card class="rounded-lg">
        <v-card-title class="bg-indigo-darken-3 text-white px-4 py-3 d-flex align-center">
          <v-icon start>mdi-account-hard-hat</v-icon>
          Activar Entorno Profesional
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" color="white" @click="subscriptionDialog = false"></v-btn>
        </v-card-title>
        
        <v-card-text class="pt-6">
          <v-row>
            <v-col cols="12" sm="6">
              <div class="bg-grey-lighten-4 pa-3 rounded-lg border h-100">
                <div class="text-xs text-grey-darken-1 font-weight-bold mb-1">Estado Actual</div>
                <div class="d-flex align-center">
                  <v-icon :color="subscriptionActive ? 'green' : 'orange'" size="small" class="mr-1">
                    {{ subscriptionActive ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                  </v-icon>
                  <span class="font-weight-bold" :class="subscriptionActive ? 'text-primary-3' : 'text-orange-darken-3'">
                    {{ subscriptionActive ? 'Suscripción Activa' : 'Suscripción Inactiva' }}
                  </span>
                </div>
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="bg-indigo-lighten-5 pa-3 rounded-lg border border-indigo-lighten-3 h-100">
                <div class="text-xs text-indigo-darken-2 font-weight-bold mb-1">Período de Activación (Estimado)</div>
                <div class="text-smtext-indigo-darken-4 font-weight-medium">
                  {{ new Date().toLocaleDateString() }} - {{ new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString() }}
                </div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <h3 class="  font-weight-bold text-indigo-darken-4 mb-2">Instrucciones Bancarias</h3>
          <p class="text-smtext-grey-darken-2 mb-4">
            Para desbloquear tu portafolio y aparecer en el directorio de búsqueda, realiza el pago mensual de $5 USD y sube el comprobante.
          </p>
          
          <v-card variant="outlined" class="rounded-lg border-indigo pa-4 bg-indigo-lighten-5 mb-6 text-indigo-darken-4">
            <v-row dense>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Banco:</strong> Banco Pichincha
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Tipo de Cuenta:</strong> Ahorros
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Número de Cuenta:</strong> 2208574932
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Razón Social:</strong> Soluciones Agrícolas ConAgri S.A.
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>RUC:</strong> 1792837492001
              </v-col>
              <v-col cols="12" sm="6" class="py-1">
                <strong>Monto a Transferir:</strong> $5.00 USD
              </v-col>
            </v-row>
          </v-card>
          
          <v-file-input
            v-model="comprobanteFile"
            label="Comprobante de Pago"
            accept="image/*,.pdf"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-receipt"
            prepend-icon=""
            color="indigo"
            :rules="[v => !!v || 'Debe adjuntar un comprobante']"
          ></v-file-input>
        </v-card-text>
        
        <v-card-actions class="px-6 pb-6 bg-grey-lighten-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey-darken-1" @click="subscriptionDialog = false">Cancelar</v-btn>
          <v-btn variant="flat" color="indigo" :loading="submittingSub" @click="submitSubscription" :disabled="!comprobanteFile">Enviar Comprobante</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Historial -->
    <v-dialog v-model="historyModalOpen" max-width="800px" scrollable>
      <v-card class="rounded-lg">
        <v-toolbar color="info" dark>
          <v-toolbar-title>Historial de Solicitudes</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon @click="historyModalOpen = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-toolbar>
        <v-card-text class="pa-0">
          <v-data-table
            :headers="historyHeaders"
            :items="solicitudesHistory"
            :loading="loadingHistory"
            class="elevation-0"
          >
            <template v-slot:item.fecha_solicitud="{ item }">
              {{ new Date(item.created).toLocaleDateString('es-EC', {day:'2-digit', month:'2-digit', year:'numeric'}) }}
            </template>
            <template v-slot:item.estado="{ item }">
              <v-chip size="small" :color="item.estado === 'aprobada' ? 'success' : item.estado === 'rechazada' ? 'error' : 'warning'">
                {{ item.estado.toUpperCase() }}
              </v-chip>
            </template>
            <template v-slot:item.monto_notas="{ item }">
              <span class="text-xs text-grey-darken-2">{{ item.notas_admin || 'N/A' }}</span>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions class="px-6 pb-6 bg-grey-lighten-5">
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="historyModalOpen = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { handleError } from '@/utils/errorHandler'

const authStore = useAuthStore()
const uiFeedback = useUiFeedbackStore()
const avatarStore = useAvatarStore()

const formValid = ref(false)
const loading = ref(false)
const subscriptionDialog = ref(false)
const submittingSub = ref(false)
const comprobanteFile = ref(null)
const subscriptionActive = ref(false)
const pendingRequest = ref(false)
const asesorPlanId = ref(null)

const historyModalOpen = ref(false)
const solicitudesHistory = ref([])
const loadingHistory = ref(false)
const historyHeaders = [
  { title: 'Fecha', key: 'fecha_solicitud' },
  { title: 'Estado', key: 'estado' },
  { title: 'Notas', key: 'monto_notas' }
]
const daysUntilExpiration = ref(null)

const name = ref('')
const lastname = ref('')
const email = ref('')
const numeroColegiatura = ref('')
const cedula = ref('')
const direccion = ref('')
const ciudad = ref('')
const pais = ref('')
const selectedEspecialidades = ref([])
const selectedProvincias = ref([])
const bioCorta = ref('')

const PROVINCIAS = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"]
const ESPECIALIDADES = ["Banano", "Cacao", "Suelos", "Flores", "Frutales","Pitahaya","Riego", "Cítricos", "Hortalizas", "Ganadería", "Otro"]

const initials = computed(() => {
  const first = name.value ? name.value[0] : ''
  const last = lastname.value ? lastname.value[0] : ''
  return (first + last).toUpperCase()
})

const avatarUrl = computed(() => {
  return avatarStore.getAvatarUrl(authStore.user, authStore.user?.collectionId)
})

const avatarInput = ref(null)

const triggerAvatarUpload = () => {
  avatarInput.value.click()
}

const onAvatarChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  try {
    uiFeedback.showLoading()
    const updatedUser = await avatarStore.saveAvatar('users', authStore.user.id, file)
    authStore.user = updatedUser
    uiFeedback.showSnackbar('Foto de perfil actualizada exitosamente', 'success')
  } catch (error) {
    handleError(error, 'Error al actualizar la foto de perfil')
  } finally {
    uiFeedback.hideLoading()
    e.target.value = '' // reset
  }
}

onMounted(async () => {
  name.value = authStore.user?.name || ''
  lastname.value = authStore.user?.lastname || ''
  email.value = authStore.user?.email || ''
  
  const parsed = authStore.asesorInfo || {}
  numeroColegiatura.value = parsed.numero_colegiatura || ''
  cedula.value = parsed.cedula || ''
  direccion.value = parsed.direccion || ''
  ciudad.value = parsed.ciudad || ''
  pais.value = parsed.pais || ''
  selectedEspecialidades.value = parsed.especialidades || []
  selectedProvincias.value = parsed.zonas_cobertura || []
  bioCorta.value = parsed.bio_corta || ''
  
  // Check subscription status
  try {
    const asesorPlan = await pb.collection('modulos').getFirstListItem(`code="asesor_plan"`)
    asesorPlanId.value = asesorPlan.id
    
    // Check if there is an active subscription
    const activeSubs = await pb.collection('subscriptions').getList(1, 1, {
      filter: `modulo="${asesorPlan.id}" && is_active=true && user="${authStore.user.id}"`
    })
    
    if (activeSubs.items.length > 0) {
      subscriptionActive.value = true
      const end = new Date(activeSubs.items[0].end_date)
      const now = new Date()
      const diffTime = end - now
      daysUntilExpiration.value = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } else {
      // Check if there's a pending request
      const pendingReqs = await pb.collection('solicitudes_suscripcion').getList(1, 1, {
        filter: `solicitante="${authStore.user.id}" && estado="pendiente" && modulo_solicitado~"${asesorPlan.id}"`
      })
      if (pendingReqs.items.length > 0) {
        pendingRequest.value = true
      }
    }
  } catch (e) {
    console.warn("Could not load subscription status", e)
  }
})

const openSubscriptionDialog = () => {
  comprobanteFile.value = null
  subscriptionDialog.value = true
}

const submitSubscription = async () => {
  if (!comprobanteFile.value || !asesorPlanId.value) return
  submittingSub.value = true
  try {
    const formData = new FormData()
    formData.append('solicitante', authStore.user.id)
    formData.append('tipo', 'modulo_addon')
    formData.append('modulo_solicitado', JSON.stringify([asesorPlanId.value]))
    formData.append('estado', 'pendiente')
    formData.append('comprobante', Array.isArray(comprobanteFile.value) ? comprobanteFile.value[0] : comprobanteFile.value)
    formData.append('notas_admin', 'Pago subido desde el perfil del asesor')
    formData.append('fecha_solicitud', new Date().toISOString())

    await pb.collection('solicitudes_suscripcion').create(formData)
    
    uiFeedback.showSnackbar('Comprobante enviado exitosamente', 'success')
    pendingRequest.value = true
    subscriptionDialog.value = false
  } catch (error) {
    handleError(error, 'Error al enviar la solicitud')
  } finally {
    submittingSub.value = false
  }
}

const openHistoryModal = async () => {
  historyModalOpen.value = true
  loadingHistory.value = true
  try {
    const res = await pb.collection('solicitudes_suscripcion').getFullList({
      filter: `solicitante = "${authStore.user.id}"`,
      sort: '-fecha_solicitud'
    })
    solicitudesHistory.value = res
  } catch (error) {
    uiFeedback.showSnackbar('Error cargando el historial', 'error')
    console.error(error)
  } finally {
    loadingHistory.value = false
  }
}

const limitItems = (arr, limit) => {
  return arr ? arr.slice(0, limit) : []
}

// Ensure html text truncation ignores tags roughly
const truncateText = (text, len) => {
  if (!text) return 'Sin descripción profesional registrada.'
  const stripped = text.replace(/(<([^>]+)>)/gi, "")
  return stripped.length > len ? stripped.substring(0, len) + '...' : stripped
}

const saveProfile = async () => {
  loading.value = true
  uiFeedback.showLoading()
  try {
    const updatedInfo = {
      numero_colegiatura: numeroColegiatura.value,
      cedula: cedula.value,
      direccion: direccion.value,
      ciudad: ciudad.value,
      pais: pais.value,
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
.bg-gradient-indigo {
  background: linear-gradient(135deg, #3949AB 0%, #1A237E 100%);
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
.hover-avatar {
  cursor: pointer;
  overflow: hidden;
}
.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}
.hover-avatar:hover .avatar-overlay {
  opacity: 1;
}
</style>
