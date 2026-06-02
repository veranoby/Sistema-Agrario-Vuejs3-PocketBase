const fs = require('fs');
let content = fs.readFileSync('/home/veranoby/sistema-agri/src/views/hacienda/Nomina.vue', 'utf8');

// 1. Add Plantilla Tab
content = content.replace(
  /(\s*<\/v-tabs>)/,
  `\n      <v-tab value="plantilla" @click="cargarPlantilla">
        <v-icon start>mdi-account-group</v-icon>
        Plantilla de Personal
      </v-tab>$1`
);

// 2. Add Plantilla Window Item
const plantillaHTML = `
      <!-- PESTAÑA 3: PLANTILLA DE PERSONAL -->
      <v-window-item value="plantilla">
        <v-card class="rounded-xl bg-white shadow-sm border overflow-hidden">
          <v-toolbar color="transparent" flat class="px-4">
            <v-toolbar-title class="font-weight-bold text-grey-darken-4">
              Gestión de Trabajadores
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn color="green-darken-3" variant="flat" prepend-icon="mdi-plus" @click="abrirDialogoTrabajador()">
              Nuevo Trabajador
            </v-btn>
          </v-toolbar>
          <v-divider></v-divider>

          <v-data-table
            :headers="headersPlantilla"
            :items="nominaStore.plantilla"
            :loading="nominaStore.loading"
            class="elevation-0"
          >
            <template #[` + '`item.activo`' + `]="{ item }">
              <v-switch
                :model-value="item.activo"
                color="green-darken-3"
                density="compact"
                hide-details
                @update:model-value="nominaStore.toggleActivoTrabajador(item.id, $event)"
              ></v-switch>
            </template>
            <template #[` + '`item.valor_jornal`' + `]="{ item }">
              $\{{ item.valor_jornal.toFixed(2) }}
            </template>
            <template #[` + '`item.acciones`' + `]="{ item }">
              <v-btn icon="mdi-pencil" variant="text" color="blue" size="small" @click="abrirDialogoTrabajador(item)"></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
`;
content = content.replace(
  /(\s*<\/v-window>)/,
  `\n${plantillaHTML}$1`
);

// 3. Add Modal Trabajador & Checkbox to Dialog
const modalHTML = `
    <!-- Modal Trabajador -->
    <v-dialog v-model="dialogoTrabajador" max-width="500">
      <v-card class="rounded-xl">
        <v-card-title class="bg-green-darken-3 text-white pa-4">
          {{ formTrabajador.id ? 'Editar Trabajador' : 'Nuevo Trabajador' }}
        </v-card-title>
        <v-card-text class="pa-6">
          <v-form ref="formPlantillaRef" v-model="formPlantillaValid">
            <v-text-field v-model="formTrabajador.nombre" label="Nombre Completo *" :rules="[v => !!v || 'Obligatorio']" variant="outlined"></v-text-field>
            <v-text-field v-model="formTrabajador.identificacion" label="Identificación / Cédula" variant="outlined"></v-text-field>
            <v-text-field v-model.number="formTrabajador.valor_jornal" type="number" label="Valor Jornal ($) *" :rules="[v => !!v || 'Obligatorio']" variant="outlined"></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="outlined" color="grey" @click="dialogoTrabajador = false">Cancelar</v-btn>
          <v-btn color="green-darken-3" variant="flat" :disabled="!formPlantillaValid" @click="guardarTrabajador">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
`;
content = content.replace(
  /(Al cerrar la nómina se guardarán todos los importes calculados de forma inmutable. Ya no podrá editar días trabajados ni salarios de esta semana.)/,
  `$1
          <v-checkbox
            v-if="haciendaStore.isModuleActive('finanzas')"
            v-model="importarAFinanzas"
            label="Importar costos automáticamente a Finanzas"
            color="green-darken-4"
            class="mt-4"
            hide-details
          ></v-checkbox>`
);
content = content.replace(
  /(\s*<\/v-container>)/,
  `\n${modalHTML}$1`
);

// 4. Update JS
content = content.replace(
  /(import \{ useNominaStore \} from '@\/stores\/nominaStore')/,
  `$1\nimport { useHaciendaStore } from '@/stores/haciendaStore'\nimport { useUiFeedbackStore } from '@/stores/uiFeedbackStore'`
);
content = content.replace(
  /(const nominaStore = useNominaStore\(\))/,
  `$1\nconst haciendaStore = useHaciendaStore()\nconst uiFeedbackStore = useUiFeedbackStore()`
);
content = content.replace(
  /(const cerrarConfirmDialog = ref\(false\))/,
  `$1\nconst importarAFinanzas = ref(true)\nconst dialogoTrabajador = ref(false)\nconst formPlantillaValid = ref(false)\nconst formTrabajador = ref({ id: null, nombre: '', identificacion: '', valor_jornal: 15 })`
);

const headersPlantillaJS = `
const headersPlantilla = [
  { title: 'Nombre Completo', key: 'nombre' },
  { title: 'Identificación', key: 'identificacion' },
  { title: 'Jornal ($)', key: 'valor_jornal' },
  { title: 'Activo', key: 'activo' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' }
]

const cargarPlantilla = async () => {
  await nominaStore.cargarPlantilla()
}

const abrirDialogoTrabajador = (trabajador = null) => {
  if (trabajador) {
    formTrabajador.value = { ...trabajador }
  } else {
    formTrabajador.value = { id: null, nombre: '', identificacion: '', valor_jornal: nominaStore.defaultJornal }
  }
  dialogoTrabajador.value = true
}

const guardarTrabajador = async () => {
  if (!formPlantillaValid.value) return
  if (formTrabajador.value.id) {
    await nominaStore.actualizarTrabajador(formTrabajador.value.id, formTrabajador.value)
  } else {
    await nominaStore.crearTrabajador(formTrabajador.value)
  }
  dialogoTrabajador.value = false
}
`;
content = content.replace(
  /(const headersHistorial = \[[\s\S]*?\])/,
  `$1\n${headersPlantillaJS}`
);

// Update cerrarNomina
const cerrarNominaJS = `const cerrarNomina = async () => {
  cerrarConfirmDialog.value = false
  await guardarBorrador('cerrada')
  
  if (importarAFinanzas.value && haciendaStore.isModuleActive('finanzas')) {
    try {
      const { useFinanzaStore } = await import('@/stores/finanzaStore')
      const finanzaStore = useFinanzaStore()
      await finanzaStore.importarCostosNomina(rango.value.inicio, rango.value.fin)
      uiFeedbackStore.showSnackbar('Costos de nómina importados a Finanzas')
    } catch (e) {
      uiFeedbackStore.showSnackbar('Error importando a finanzas', 'error')
    }
  }
}`;
content = content.replace(
  /const cerrarNomina = async \(\) => \{\s*cerrarConfirmDialog\.value = false\s*await guardarBorrador\('cerrada'\)\s*\}/,
  cerrarNominaJS
);

fs.writeFileSync('/home/veranoby/sistema-agri/src/views/hacienda/Nomina.vue', content);
console.log("Patched Nomina.vue successfully.");
