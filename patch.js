const fs = require('fs');

// Patch HaciendasList.vue
let hl = fs.readFileSync('src/views/asesor/HaciendasList.vue', 'utf8');

// 1. Template Tabs
hl = hl.replace('<!-- Cargando / Sin Resultados -->', `
      <v-tabs v-model="activeTab" color="indigo" class="mb-6">
        <v-tab value="activas">Vinculadas ({{ haciendasActivas.length }})</v-tab>
        <v-tab value="pendientes">
          Pendientes 
          <v-badge v-if="haciendasPendientes.length > 0" :content="haciendasPendientes.length" color="orange" inline class="ml-2"></v-badge>
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="bg-transparent">
        <v-window-item value="activas">
          <!-- Cargando / Sin Resultados -->`);

hl = hl.replace('v-else-if="haciendas.length === 0"', 'v-else-if="haciendasActivas.length === 0"');
hl = hl.replace('v-for="hacienda in haciendas"', 'v-for="hacienda in haciendasActivas"');
hl = hl.replace('</v-row>\n    </div>\n  </v-container>', `</v-row>
        </v-window-item>

        <v-window-item value="pendientes">
          <div v-if="loading" class="d-flex justify-center align-center py-12">
            <v-progress-circular indeterminate color="orange" size="64" width="6"></v-progress-circular>
          </div>
          <div v-else-if="haciendasPendientes.length === 0" class="text-center py-12">
            <v-icon icon="mdi-check-all" size="80" color="grey-lighten-1" class="mb-4"></v-icon>
            <h3 class="text-md text-grey-darken-2 font-weight-bold">No tienes solicitudes pendientes</h3>
          </div>
          <v-row v-else>
            <v-col v-for="req in haciendasPendientes" :key="req.vinculacionId" cols="12" sm="6" md="4">
              <v-card class="h-100 d-flex flex-column elevation-3 hover-card rounded-lg overflow-hidden border border-orange-lighten-3">
                <div class="bg-orange-darken-2 py-4 px-5 text-white d-flex align-center justify-space-between">
                  <div>
                    <h3 class="text-h6 font-weight-bold text-truncate mb-0">{{ req.nombre }}</h3>
                    <span class="text-caption text-orange-lighten-4 d-block">Solicitud de Conexión</span>
                  </div>
                </div>
                <v-card-text class="flex-grow-1 pt-4 pb-2">
                  <div class="d-flex align-center mb-3">
                    <v-icon icon="mdi-account" color="orange" class="mr-2"></v-icon>
                    <div><span class="text-caption text-grey d-block">Propietario</span><span class="text-sm font-weight-medium">{{ req.ownerName }}</span></div>
                  </div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions class="px-5 py-3 bg-grey-lighten-5 d-flex gap-2">
                  <v-btn flex-grow-1 color="green" variant="flat" @click="responderSolicitud(req.vinculacionId, 'activa')">Aceptar</v-btn>
                  <v-btn flex-grow-1 color="red" variant="tonal" @click="responderSolicitud(req.vinculacionId, 'rechazada')">Rechazar</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </div>
  </v-container>`);

// 2. Script
hl = hl.replace('const haciendas = ref([])', `const activeTab = ref('activas')
const haciendasActivas = ref([])
const haciendasPendientes = ref([])`);

hl = hl.replace("import { handleError } from '@/utils/errorHandler'", "import { handleError } from '@/utils/errorHandler'\nimport { useUiFeedbackStore } from '@/stores/uiFeedbackStore'");
hl = hl.replace("const authStore = useAuthStore()", "const authStore = useAuthStore()\nconst uiFeedback = useUiFeedbackStore()");

const onMountedOld = `  loading.value = true
  try {
    // 1. Fetch active vinculaciones for advisor
    const vinculaciones = await pb.collection('vinculaciones_asesor').getFullList({
      filter: \`asesor_id="\${authStore.user.id}" && estado="activa"\`,
      sort: '-created'
    })

    // 2. Fetch details for each linked hacienda
    haciendas.value = await Promise.all(vinculaciones.map(async (v) => {`;

const fetchLogicReplacement = `  await fetchHaciendas()
})

const fetchHaciendas = async () => {
  loading.value = true
  try {
    const vinculacionesAll = await pb.collection('vinculaciones_asesor').getFullList({
      filter: \`asesor_id="\${authStore.user.id}"\`,
      sort: '-created'
    })

    const activas = vinculacionesAll.filter(v => v.estado === 'activa')
    const pendientes = vinculacionesAll.filter(v => v.estado === 'pendiente')

    haciendasActivas.value = await Promise.all(activas.map(async (v) => {`;

hl = hl.replace(onMountedOld, fetchLogicReplacement);
hl = hl.replace('hDetails.ownerEmail = u.email\n      } catch (err)', 'hDetails.ownerEmail = u?.email\n      } catch (err)'); // safe traversal

const promiseAllEnd = `      return hDetails
    }))
  } catch (error) {`;

const pendientesLogic = `      return hDetails
    }))

    haciendasPendientes.value = await Promise.all(pendientes.map(async (v) => {
      let pDetails = { vinculacionId: v.id, hacienda_id: v.hacienda_id, nombre: 'Hacienda', ownerName: 'N/A' }
      try {
        const h = await pb.collection('Haciendas').getOne(v.hacienda_id)
        pDetails.nombre = h.nombre
        const u = await pb.collection('users').getFirstListItem(\`hacienda="\${v.hacienda_id}" && role="administrador"\`)
        pDetails.ownerName = \`\${u.name} \${u.lastname}\`
      } catch (e) {}
      return pDetails
    }))

  } catch (error) {`;

hl = hl.replace(promiseAllEnd, pendientesLogic);

const finalScriptEnd = `const goToHacienda = (hacienda) => {`;
const newFunctions = `const responderSolicitud = async (vinculacionId, nuevoEstado) => {
  uiFeedback.showLoading()
  try {
    await pb.collection('vinculaciones_asesor').update(vinculacionId, {
      estado: nuevoEstado,
      fecha_vinculacion: nuevoEstado === 'activa' ? new Date().toISOString() : null
    })
    uiFeedback.showSnackbar(\`Solicitud \${nuevoEstado === 'activa' ? 'aceptada' : 'rechazada'}\`, 'success')
    await fetchHaciendas()
  } catch (error) {
    handleError(error, 'Error al responder solicitud')
  } finally {
    uiFeedback.hideLoading()
  }
}

const goToHacienda = (hacienda) => {`;
hl = hl.replace(finalScriptEnd, newFunctions);


// Patch Dashboard.vue
let dash = fs.readFileSync('src/views/asesor/Dashboard.vue', 'utf8');

dash = dash.replace('<!-- Alertas de suscripción -->', `<!-- Alertas de vinculaciones pendientes -->
      <v-alert
        v-if="pendingVinculacionesCount > 0"
        type="warning"
        variant="tonal"
        class="mb-6 rounded-lg"
        border="start"
      >
        <template v-slot:prepend>
          <v-icon icon="mdi-account-clock" size="28" class="mr-2"></v-icon>
        </template>
        <div class="d-flex align-center justify-space-between w-100">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Tienes {{ pendingVinculacionesCount }} solicitud(es) de vinculación pendiente(s)</div>
            <div class="text-body-2">Haciendas están esperando que apruebes su conexión.</div>
          </div>
          <v-btn color="orange-darken-3" variant="flat" to="/asesor/haciendas" size="small">Revisar</v-btn>
        </div>
      </v-alert>

      <!-- Alertas de suscripción -->`);

dash = dash.replace('const activeFarmsCount = ref(0)', 'const activeFarmsCount = ref(0)\nconst pendingVinculacionesCount = ref(0)');

dash = dash.replace('const activeVinculaciones = vinculaciones.filter(v => v.estado === \'activa\')', `const activeVinculaciones = vinculaciones.filter(v => v.estado === 'activa')
    pendingVinculacionesCount.value = vinculaciones.filter(v => v.estado === 'pendiente').length`);

fs.writeFileSync('src/views/asesor/HaciendasList.vue', hl);
fs.writeFileSync('src/views/asesor/Dashboard.vue', dash);
console.log('Patched correctly');
