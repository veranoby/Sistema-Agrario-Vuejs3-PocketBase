<template>
  <v-container fluid class="pa-4 fade-in">
    <!-- Header Principal -->
    <UniversalHeader
      title="Marketplace de Asesores Agrónomos BPA"
      subtitle="Conecta con ingenieros agrónomos acreditados por Agrocalidad para avalar tus cuadernos de campo"
    >
      <template #chips>
        <v-chip color="teal-darken-3" variant="flat" size="small" class="mr-2">
          <v-icon start size="small">mdi-shield-check</v-icon>
          Red Acreditada Agrocalidad
        </v-chip>
        <v-chip color="primary" variant="tonal" size="small">
          Plan Freemium Activo
        </v-chip>
      </template>
    </UniversalHeader>

    <!-- Banner de Garantía Anti-Churn y Propiedad de Datos -->
    <v-card
      variant="flat"
      class="mt-4 pa-4 rounded-xl border border-teal-lighten-3 bg-teal-lighten-5 elevation-1"
    >
      <div class="d-flex align-start gap-3">
        <v-icon color="teal-darken-3" size="32" class="mt-1">mdi-lock-check</v-icon>
        <div>
          <h4 class="text-subtitle-1 font-weight-bold text-teal-darken-4 mb-1">
            🔒 Garantía de Propiedad Digital de Datos y Aval Anti-Churn
          </h4>
          <p class="text-caption text-teal-darken-3 mb-0 leading-relaxed">
            Todas las recomendaciones, informes de dosificación y firmas digitales de los asesores contratados quedan respaldadas con sello RSA y vinculadas directamente a la cuenta de tu hacienda. Si decides cambiar de asesor técnico o prescindir de sus servicios, <strong>conservas el 100% de tus certificados e historial de auditoría BPA respaldados para Agrocalidad</strong>.
          </p>
        </div>
      </div>
    </v-card>

    <!-- Sección de Asesores Destacados -->
    <div class="mt-6">
      <div class="d-flex align-center justify-between mb-4">
        <div>
          <h3 class="text-h6 font-weight-bold text-grey-darken-3">Asesores Técnicos Disponibles en Ecuador</h3>
          <span class="text-caption text-grey-darken-1">Asesoría presencial en finca y revisión remota de bitácoras en plataforma</span>
        </div>
      </div>

      <v-row class="mt-1">
        <v-col
          v-for="asesor in asesores"
          :key="asesor.id"
          cols="12"
          md="6"
        >
          <v-card
            variant="flat"
            class="rounded-xl border pa-4 h-100 d-flex flex-column transition-all hover-elevation"
          >
            <div class="d-flex align-start gap-4">
              <v-avatar size="72" class="elevation-2 border-2 border-white">
                <v-img :src="asesor.avatar" :alt="asesor.nombre"></v-img>
              </v-avatar>
              
              <div class="flex-grow-1">
                <div class="d-flex align-center justify-between">
                  <h4 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0">
                    {{ asesor.nombre }}
                  </h4>
                  <v-chip color="amber-darken-2" size="x-small" variant="tonal" class="font-weight-bold">
                    ⭐ {{ asesor.calificacion }} ({{ asesor.resenasCount }})
                  </v-chip>
                </div>
                
                <div class="text-caption text-primary font-weight-medium mb-1">
                  {{ asesor.titulo }}
                </div>
                
                <v-chip size="x-small" color="grey-darken-2" variant="outlined" class="mb-2">
                  <v-icon start size="x-small">mdi-badge-account</v-icon>
                  Reg. Agrocalidad: {{ asesor.registroAgrocalidad }}
                </v-chip>
              </div>
            </div>

            <v-divider class="my-3"></v-divider>

            <!-- Especialidades & Cobertura -->
            <div class="mb-3">
              <div class="text-caption font-weight-bold text-grey-darken-2 mb-1">Especialidad Cultivos:</div>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="cultivo in asesor.especialidades"
                  :key="cultivo"
                  size="x-small"
                  color="teal-darken-2"
                  variant="tonal"
                >
                  {{ cultivo }}
                </v-chip>
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption font-weight-bold text-grey-darken-2 mb-1">Zonas de Cobertura:</div>
              <span class="text-caption text-grey-darken-1">
                <v-icon size="x-small" color="primary" class="mr-1">mdi-map-marker</v-icon>
                {{ asesor.cobertura.join(', ') }}
              </span>
            </div>

            <v-spacer></v-spacer>

            <!-- Servicios ofrecidos y Acción -->
            <div class="bg-grey-lighten-4 pa-3 rounded-lg mb-4">
              <div class="text-caption font-weight-bold text-grey-darken-3 mb-1">Servicios Incluidos:</div>
              <ul class="text-caption text-grey-darken-2 pl-4 mb-0">
                <li v-for="servicio in asesor.servicios" :key="servicio">{{ servicio }}</li>
              </ul>
            </div>

            <v-btn
              color="primary"
              variant="flat"
              block
              class="rounded-lg font-weight-bold text-none"
              prepend-icon="mdi-calendar-check"
              @click="abrirSolicitudModal(asesor)"
            >
              Solicitar Visita / Consulta Tech
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Modal de Solicitud de Consulta -->
    <v-dialog v-model="showSolicitudModal" max-width="550px">
      <v-card class="rounded-xl pa-2">
        <v-card-title class="d-flex align-center justify-between pa-4">
          <div class="d-flex align-center gap-2">
            <v-icon color="primary">mdi-card-account-mail-outline</v-icon>
            <span class="text-h6 font-weight-bold">Solicitar Asesoría Agrónoma</span>
          </div>
          <v-btn icon size="small" variant="text" @click="showSolicitudModal = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-4 pt-0" v-if="asesorSeleccionado">
          <v-alert color="primary" variant="tonal" class="mb-4 rounded-lg" density="compact">
            <div class="text-xs">
              <strong>Asesor Destino:</strong> {{ asesorSeleccionado.nombre }}<br/>
              <strong>Registro Agrocalidad:</strong> {{ asesorSeleccionado.registroAgrocalidad }}
            </div>
          </v-alert>

          <v-form ref="solicitudFormRef" v-model="solicitudValid">
            <v-select
              v-model="formSolicitud.servicio"
              :items="asesorSeleccionado.servicios"
              label="Tipo de Servicio Requerido"
              variant="outlined"
              density="compact"
              class="rounded-lg mb-3"
              :rules="[v => !!v || 'Selecciona un servicio']"
            ></v-select>

            <v-select
              v-model="formSolicitud.haciendaId"
              :items="haciendasUsuario"
              item-title="nombre"
              item-value="id"
              label="Hacienda a Inspeccionar"
              variant="outlined"
              density="compact"
              class="rounded-lg mb-3"
              :rules="[v => !!v || 'Selecciona tu hacienda']"
            ></v-select>

            <v-textarea
              v-model="formSolicitud.mensaje"
              label="Detalles de la consulta / Problema observado en campo"
              placeholder="Ej: Requiero firma de bitácoras del último mes para auditoría BPA de Agrocalidad y plan de fertilización."
              variant="outlined"
              rows="3"
              density="compact"
              class="rounded-lg mb-2"
            ></v-textarea>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey" @click="showSolicitudModal = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="rounded-lg font-weight-bold"
            :loading="enviandoSolicitud"
            @click="enviarSolicitud"
          >
            Enviar Solicitud
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import UniversalHeader from '@/components/UniversalHeader.vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

const haciendaStore = useHaciendaStore()
const uiFeedbackStore = useUiFeedbackStore()

const showSolicitudModal = ref(false)
const asesorSeleccionado = ref(null)
const enviandoSolicitud = ref(false)
const solicitudValid = ref(false)

const formSolicitud = ref({
  servicio: null,
  haciendaId: null,
  mensaje: ''
})

const haciendasUsuario = computed(() => {
  if (haciendaStore.mi_hacienda) {
    return [{ id: haciendaStore.mi_hacienda.id, nombre: haciendaStore.mi_hacienda.name || haciendaStore.mi_hacienda.nombre }]
  }
  return [{ id: 'hacienda_demo', nombre: 'Hacienda Principal' }]
})

const asesores = ref([
  {
    id: 'asesor_1',
    nombre: 'Ing. Agr. Carlos Mendoza Velásquez',
    titulo: 'Especialista en Banano, Cacao y Frutales Tropicales',
    registroAgrocalidad: 'AGRO-EC-84920',
    calificacion: '4.9',
    resenasCount: 28,
    avatar: 'https://cdn.vuetifyjs.com/images/john.jpg',
    especialidades: ['Banano', 'Cacao', 'Plátano', 'Palma'],
    cobertura: ['El Oro', 'Guayas', 'Los Ríos'],
    servicios: [
      'Auditoría y Certificación BPA Agrocalidad',
      'Plan de Nutrición y Balance de Suelo',
      'Firma Digital de Cuadernos de Campo'
    ]
  },
  {
    id: 'asesor_2',
    nombre: 'Ing. Agr. María Elena Viteri',
    titulo: 'Especialista en Flores, Hortalizas y Cereales',
    registroAgrocalidad: 'AGRO-EC-61049',
    calificacion: '4.9',
    resenasCount: 34,
    avatar: 'https://cdn.vuetifyjs.com/images/lists/2.jpg',
    especialidades: ['Flores', 'Hortalizas', 'Maíz', 'Papa'],
    cobertura: ['Pichincha', 'Cotopaxi', 'Tungurahua'],
    servicios: [
      'Manejo Integrado de Plagas (MIP)',
      'Inspección Pre-Auditoría BPA Presencial',
      'Análisis Microbiológico de Agua de Riego'
    ]
  }
])

function abrirSolicitudModal(asesor) {
  asesorSeleccionado.value = asesor
  formSolicitud.value.servicio = asesor.servicios[0] || null
  formSolicitud.value.haciendaId = haciendasUsuario.value[0]?.id || null
  formSolicitud.value.mensaje = ''
  showSolicitudModal.value = true
}

async function enviarSolicitud() {
  if (!formSolicitud.value.servicio || !formSolicitud.value.haciendaId) {
    uiFeedbackStore.showSnackbar('Por favor completa los campos requeridos', 'warning')
    return
  }

  enviandoSolicitud.value = true
  try {
    // Simulación de envío interno de solicitud en plataforma freemium
    await new Promise(resolve => setTimeout(resolve, 800))
    uiFeedbackStore.showSnackbar(
      `Solicitud de asesoría enviada con éxito a ${asesorSeleccionado.value.nombre}. Te contactará a través de AgroAssist.`,
      'success'
    )
    showSolicitudModal.value = false
  } catch (error) {
    uiFeedbackStore.showSnackbar(`Error enviando solicitud: ${error.message}`, 'error')
  } finally {
    enviandoSolicitud.value = false
  }
}
</script>

<style scoped>
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hover-elevation:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08) !important;
}
</style>
