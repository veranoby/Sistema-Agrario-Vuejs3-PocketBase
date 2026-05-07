<template>
  <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSubmit">
    <v-card-text>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <v-text-field
          v-model="formData.firstname"
          label="Nombre"
          variant="outlined"
          density="compact"
          :rules="[rules.required]"
          @input="formData.firstname = formData.firstname.toUpperCase()"
        />
        <v-text-field
          v-model="formData.lastname"
          label="Apellido"
          variant="outlined"
          density="compact"
          :rules="[rules.required]"
          @input="formData.lastname = formData.lastname.toUpperCase()"
        />
        <v-text-field
          v-model="formData.username"
          label="Usuario"
          variant="outlined"
          density="compact"
          :rules="[rules.required, rules.minLength(3)]"
          @input="formData.username = formData.username.toUpperCase()"
        />
        <v-text-field
          v-model="formData.email"
          label="Email"
          type="email"
          variant="outlined"
          density="compact"
          :rules="[rules.required, rules.email]"
        />
        <v-text-field
          v-if="!isEditing"
          v-model="formData.password"
          label="Contraseña"
          :type="showPassword ? 'text' : 'password'"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-lock"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword"
          :rules="[rules.required, rules.minLength(8)]"
        />
        <v-select
          v-if="showRoleSelect"
          v-model="formData.role"
          :items="availableRoles"
          label="Rol"
          variant="outlined"
          density="compact"
          :rules="[rules.required]"
        />
        <v-select
          v-if="showHaciendaSelect"
          v-model="formData.haciendas"
          :items="haciendasList"
          label="Haciendas"
          multiple
          chips
          variant="outlined"
          density="compact"
        />
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        size="small"
        variant="flat"
        
        prepend-icon="mdi-cancel"
        color="red-lighten-3"
        @click="$emit('cancel')"
      >
        CANCELAR
      </v-btn>
      <v-btn color="success" variant="flat" type="submit" :loading="loading" :disabled="!formValid">
        {{ isEditing ? 'GUARDAR Cambios' : 'Crear Usuario' }}
      </v-btn>
    </v-card-actions>
  </v-form>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  initialData: { type: Object, default: () => ({}) },
  isEditing: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  showRoleSelect: { type: Boolean, default: true },
  showHaciendaSelect: { type: Boolean, default: false },
  availableRoles: { type: Array, default: () => [] },
  haciendasList: { type: Array, default: () => [] }
})

const emit = defineEmits(['submit', 'cancel'])

const formRef = ref(null)
const formValid = ref(false)
const showPassword = ref(false)

const formData = reactive({
  firstname: '',
  lastname: '',
  username: '',
  email: '',
  password: '',
  role: '',
  haciendas: [],
  ...props.initialData
})

const rules = {
  required: v => !!v || 'Requerido',
  email: v => /.+@.+\..+/.test(v) || 'Email inválido',
  minLength: min => v => (v && v.length >= min) || `Mínimo ${min} caracteres`
}

const handleSubmit = async () => {
  const { valid } = await formRef.value.validate()
  if (valid) {
    emit('submit', { ...formData })
  }
}

watch(() => props.initialData, (newVal) => {
  Object.assign(formData, newVal)
}, { deep: true })
</script>
