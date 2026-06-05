<template>
  <v-dialog v-model="dialog" max-width="800" persistent>
    <v-card>
      <v-card-title class="text-h6 bg-primary text-white">
        {{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}
      </v-card-title>
      <v-card-text class="pt-4">
        <v-form ref="form" v-model="isValid" @submit.prevent="submit">
          <!-- User Details -->
          <h3 class="text-subtitle-1 font-weight-bold mb-2">Datos del Usuario</h3>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.email"
                label="Email"
                type="email"
                :rules="[v => !!v || 'Requerido', v => /.+@.+\..+/.test(v) || 'Email inválido']"
                required
                variant="outlined"
                density="compact"
                :readonly="isEditing"
                :class="{ 'bg-grey-lighten-4': isEditing }"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.username"
                label="Username"
                :rules="[v => !!v || 'Requerido']"
                required
                variant="outlined"
                density="compact"
                :readonly="isEditing"
                :class="{ 'bg-grey-lighten-4': isEditing }"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.name"
                label="Nombre"
                :rules="[v => !!v || 'Requerido']"
                required
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.lastname"
                label="Apellido"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6" v-if="!isEditing">
              <v-text-field
                v-model="formData.password"
                label="Contraseña"
                type="password"
                :rules="[v => !!v || 'Requerido', v => v.length >= 8 || 'Mínimo 8 caracteres']"
                required
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6" v-if="isEditing">
              <v-text-field
                v-model="formData.newPassword"
                label="Nueva Contraseña (Opcional)"
                type="password"
                :rules="[v => !v || v.length >= 8 || 'Mínimo 8 caracteres']"
                variant="outlined"
                density="compact"
                hint="Déjelo en blanco si no desea cambiarla"
                persistent-hint
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6" v-if="isEditing && hasAvatar">
              <v-btn color="error" variant="outlined" @click="deleteAvatar" size="small" class="mt-2">
                Eliminar Avatar
              </v-btn>
            </v-col>
          </v-row>
          
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.cedula"
                label="Cédula"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.direccion"
                label="Dirección"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="formData.info"
                label="Información Adicional (Info)"
                variant="outlined"
                density="compact"
                rows="2"
              ></v-textarea>
            </v-col>
          </v-row>

          <v-divider class="mb-4"></v-divider>

          <!-- Roles y Estados -->
          <h3 class="text-subtitle-1 font-weight-bold mb-2">Configuración de Acceso</h3>
          <v-row>
            <v-col cols="12" md="6">
              <span class="text-caption">Rol</span>
              <v-radio-group v-model="formData.role" inline>
                <v-radio label="Admin" :value="USER_ROLES.ADMINISTRADOR"></v-radio>
                <v-radio label="Auditor" :value="USER_ROLES.AUDITOR"></v-radio>
                <v-radio label="Operador" :value="USER_ROLES.OPERADOR"></v-radio>
                <v-radio label="Asesor" :value="USER_ROLES.ASESOR"></v-radio>
              </v-radio-group>
            </v-col>
            <v-col cols="12" md="6">
              <span class="text-caption">Estado</span>
              <v-radio-group v-model="formData.status" inline>
                <v-radio label="Activo" :value="USER_STATUS.ACTIVE"></v-radio>
                <v-radio label="Suspendido" value="suspended"></v-radio>
              </v-radio-group>
            </v-col>
          </v-row>

          <v-divider class="mb-4"></v-divider>

          <!-- Hacienda Details -->
          <template v-if="formData.role !== USER_ROLES.ASESOR">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Vinculación de Hacienda</h3>
            <v-row v-if="isEditing || formData.role === USER_ROLES.OPERADOR || formData.role === USER_ROLES.AUDITOR">
              <v-col cols="12">
                <v-select
                  v-model="formData.haciendaId"
                  :items="haciendasList"
                  item-title="nombre"
                  item-value="id"
                  label="Hacienda Asignada"
                  variant="outlined"
                  density="compact"
                  clearable
                  :rules="(formData.role === USER_ROLES.OPERADOR || formData.role === USER_ROLES.AUDITOR) ? [v => !!v || 'Debe seleccionar una hacienda'] : []"
                ></v-select>
              </v-col>
            </v-row>
            <v-row v-else>
              <v-col cols="12">
                <v-radio-group v-model="formData.haciendaCreationOption" inline>
                  <v-radio label="Sin Hacienda" value="none"></v-radio>
                  <v-radio label="Nueva Hacienda" value="new"></v-radio>
                  <v-radio label="Asignar Existente" value="existing"></v-radio>
                </v-radio-group>
              </v-col>
              <v-col cols="12" v-if="formData.haciendaCreationOption === 'new'">
                <v-text-field
                  v-model="formData.newHaciendaName"
                  label="Nombre de la Nueva Hacienda"
                  :rules="[v => !!v || 'Requerido']"
                  required
                  variant="outlined"
                  density="compact"
                  hint="Se le asignará automáticamente el plan gratuito."
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" v-if="formData.haciendaCreationOption === 'existing'">
                <v-select
                  v-model="formData.haciendaId"
                  :items="haciendasList"
                  item-title="nombre"
                  item-value="id"
                  label="Hacienda a Asignar"
                  variant="outlined"
                  density="compact"
                  clearable
                  :rules="[v => !!v || 'Debe seleccionar una hacienda']"
                ></v-select>
              </v-col>
            </v-row>
          </template>
        </v-form>
      </v-card-text>
      <v-card-actions class="pb-4 pr-4">
        <v-spacer></v-spacer>
        <v-btn color="error" variant="elevated" @click="close" :disabled="loading">Cancelar</v-btn>
        <v-btn color="primary" variant="elevated" @click="submit" :loading="loading" :disabled="!isValid">Guardar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { pb } from '@/utils/pocketbase';
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore';
import { USER_ROLES, USER_STATUS } from '@/constants/roles';

const props = defineProps({
  modelValue: Boolean,
  editingUser: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'saved']);
const uiFeedbackStore = useUiFeedbackStore();

const dialog = ref(props.modelValue);
const isValid = ref(false);
const loading = ref(false);
const form = ref(null);

const haciendasList = ref([]);
const hasAvatar = ref(false);

const formData = ref({
  email: '',
  verified: false,
  username: '',
  name: '',
  lastname: '',
  password: '',
  role: USER_ROLES.OPERADOR,
  info: '',
  cedula: '',
  direccion: '',
  status: USER_STATUS.ACTIVE,
  haciendaId: null,
  haciendaCreationOption: 'none',
  newHaciendaName: '',
  newPassword: ''
});

const isEditing = ref(false);

watch(() => props.modelValue, async (val) => {
  dialog.value = val;
  if (val) {
    await loadHaciendas();
    if (props.editingUser) {
      isEditing.value = true;
      const u = props.editingUser;
      hasAvatar.value = !!u.avatar;
      formData.value = {
        email: u.email || '',
        verified: u.verified || false,
        username: u.username || '',
        name: u.name || u.firstname || '',
        lastname: u.lastname || '',
        password: '',
        role: u.role || USER_ROLES.OPERADOR,
        info: u.info || '',
        cedula: u.cedula || '',
        direccion: u.direccion || '',
        status: u.status || USER_STATUS.ACTIVE,
        haciendaId: u.hacienda || null,
        haciendaCreationOption: 'none',
        newHaciendaName: '',
        newPassword: ''
      };
    } else {
      isEditing.value = false;
      hasAvatar.value = false;
      form.value?.reset();
      formData.value = {
        email: '',
        verified: true,
        username: '',
        name: '',
        lastname: '',
        password: '',
        role: USER_ROLES.ADMINISTRADOR,
        info: '',
        cedula: '',
        direccion: '',
        status: USER_STATUS.ACTIVE,
        haciendaId: null,
        haciendaCreationOption: 'none',
        newHaciendaName: '',
        newPassword: ''
      };
    }
  }
});

watch(dialog, (val) => {
  emit('update:modelValue', val);
});

async function loadHaciendas() {
  try {
    const list = await pb.collection('Haciendas').getFullList({ fields: 'id,nombre,name' });
    haciendasList.value = list.map(h => ({
      id: h.id,
      nombre: h.nombre || h.name || 'Sin nombre'
    }));
  } catch (error) {
    console.error('Error cargando haciendas', error);
  }
}

async function deleteAvatar() {
  if (!props.editingUser) return;
  try {
    await pb.collection('users').update(props.editingUser.id, { 'avatar': null });
    hasAvatar.value = false;
    uiFeedbackStore.showSnackbar('Avatar eliminado', 'success');
  } catch(err) {
    uiFeedbackStore.showSnackbar('Error al eliminar avatar', 'error');
  }
}

function close() {
  dialog.value = false;
}

async function submit() {
  if (!form.value) return;
  const { valid } = await form.value.validate();
  if (!valid) return;

  loading.value = true;
  try {
    const payload = {
      email: formData.value.email,
      username: formData.value.username,
      name: formData.value.name,
      lastname: formData.value.lastname,
      role: formData.value.role,
      info: formData.value.info,
      cedula: formData.value.cedula,
      direccion: formData.value.direccion,
      status: formData.value.status,
    };

    if (isEditing.value) {
      const editPayload = { ...payload };
      if (editPayload.email === props.editingUser.email) delete editPayload.email;
      if (editPayload.username === props.editingUser.username) delete editPayload.username;
      
      delete editPayload.verified;
      
      editPayload.hacienda = formData.value.haciendaId || "";
      await pb.collection('users').update(props.editingUser.id, editPayload);

      // Si se provee una nueva contraseña, resetearla
      if (formData.value.newPassword) {
        await pb.send(`/api/admin/users/${props.editingUser.id}/reset-password`, {
          method: 'POST',
          body: { password: formData.value.newPassword }
        });
      }

      uiFeedbackStore.showSnackbar('Usuario actualizado', 'success');
    } else {
      payload.password = formData.value.password;
      payload.passwordConfirm = formData.value.password;
      payload.emailVisibility = true;
      delete payload.verified; // PocketBase rejects verified=true via client API on creation

      // Check hacienda logic
      let haciendaToAssign = "";
      let newHaciendaId = "";
      
      if (formData.value.role === USER_ROLES.OPERADOR || formData.value.role === USER_ROLES.AUDITOR) {
        haciendaToAssign = formData.value.haciendaId || "";
      } else if (formData.value.haciendaCreationOption === 'existing') {
        haciendaToAssign = formData.value.haciendaId || "";
      } else if (formData.value.haciendaCreationOption === 'new') {
        const gratisPlan = await pb.collection('planes').getFirstListItem(`nombre="gratis" || name="gratis"`);
        if (!gratisPlan) throw new Error("Plan gratuito no encontrado");

        const hData = {
          nombre: formData.value.newHaciendaName,
          plan: gratisPlan.id,
          status: 'active',
          metricas: {
            area_total: { tipo: 'text', valor: 'Por determinar', descripcion: 'Área total en hectáreas' },
            propietario: { tipo: 'text', valor: 'Por determinar', descripcion: 'Nombre del propietario' },
            administrador: { tipo: 'text', valor: 'Por determinar', descripcion: 'Nombre del administrador' },
            certificaciones: { tipo: 'text', valor: 'Por determinar', descripcion: 'Certificaciones de la hacienda' }
          }
        };
        const hacienda = await pb.collection('Haciendas').create(hData);
        newHaciendaId = hacienda.id;
        haciendaToAssign = newHaciendaId;
      }
      payload.hacienda = haciendaToAssign;

      const newUser = await pb.collection('users').create(payload);

      if (newHaciendaId) {
        await pb.collection('Haciendas').update(newHaciendaId, { owner: newUser.id });
      }

      uiFeedbackStore.showSnackbar('Usuario creado', 'success');
    }
    emit('saved');
    close();
  } catch (err) {
    console.error('Error saving user:', err, err?.response?.data);
    uiFeedbackStore.showSnackbar('Error al guardar: ' + (err?.response?.message || err.message), 'error');
  } finally {
    loading.value = false;
  }
}
</script>
