<template>
  <v-dialog v-model="dialogVisible" persistent max-width="900px">
    <v-form ref="editActividadForm">
      <v-card>
        <v-toolbar color="primary" dark>
          <v-toolbar-title>{{ t('activity_workspace.edit_activity') }}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>

        <v-card-text>
          <div class="grid grid-cols-3">
            <div class="grid col-span-2 grid-cols-3">
              <div class="col-span-2">
                <v-text-field
                  v-model="editedActividad.nombre"
                  :label="t('activity_workspace.name')"
                  class="compact-form"
                  variant="outlined"
                  density="compact"
                ></v-text-field>
              </div>
              <div class="col-span-1">
                <v-checkbox
                  v-model="editedActividad.activa"
                  density="compact"
                  class="compact-form"
                  :label="t('activity_workspace.active_state')"
                ></v-checkbox>
              </div>

              <div
                class="siembra-info col-span-3"
                v-if="tipoActividadActual?.metricas?.metricas"
              >
                <v-card-title class="headline d-flex justify-between">
                  <h3 class="text-xl font-bold mt-2">{{ t('activity_workspace.metrics') }}</h3>
                  <v-btn
                    size="small"
                    color="green-lighten-2"
                    @click="openAddMetricaDialog"
                    icon
                  >
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <div class="grid grid-cols-2 gap-0">
                    <div v-for="(metrica, key) in editedActividad.metricas" :key="key" cols="6">
                      <v-tooltip location="bottom">
                        <template v-slot:activator="{ props }">
                          <div v-bind="props">
                            <v-select
                              v-if="metrica.tipo === 'select'"
                              v-model="metrica.valor"
                              :label="key.replace(/_/g, ' ')"
                              :items="metrica.opciones"
                              variant="outlined"
                              density="compact"
                              class="compact-form"
                            >
                              <template v-slot:append>
                                <v-icon size="small" color="primary" class="mr-1" @click="editMetrica(key, metrica)">mdi-pencil</v-icon>
                                <v-icon size="small" color="error" @click="removeMetrica(key)">mdi-delete</v-icon>
                              </template>
                            </v-select>
                            <v-text-field
                              v-else-if="metrica.tipo === 'date'"
                              v-model="metrica.valor"
                              :label="key.replace(/_/g, ' ')"
                              type="date"
                              density="compact"
                              variant="outlined"
                              class="compact-form"
                              :rules="[validateDate]"
                            >
                              <template v-slot:append>
                                <v-icon size="small" color="primary" class="mr-1" @click="editMetrica(key, metrica)">mdi-pencil</v-icon>
                                <v-icon size="small" color="error" @click="removeMetrica(key)">mdi-delete</v-icon>
                              </template>
                            </v-text-field>
                            <v-text-field
                              v-else-if="metrica.tipo === 'string'"
                              v-model.number="metrica.valor"
                              :label="key.replace(/_/g, ' ')"
                              density="compact"
                              variant="outlined"
                              class="compact-form"
                            >
                              <template v-slot:append>
                                <v-icon size="small" color="primary" class="mr-1" @click="editMetrica(key, metrica)">mdi-pencil</v-icon>
                                <v-icon size="small" color="error" @click="removeMetrica(key)">mdi-delete</v-icon>
                              </template>
                            </v-text-field>
                            <v-text-field
                              v-else-if="metrica.tipo === 'number'"
                              v-model.number="metrica.valor"
                              :label="key.replace(/_/g, ' ')"
                              type="number"
                              density="compact"
                              variant="outlined"
                              class="compact-form"
                            >
                              <template v-slot:append>
                                <v-icon size="small" color="primary" class="mr-1" @click="editMetrica(key, metrica)">mdi-pencil</v-icon>
                                <v-icon size="small" color="error" @click="removeMetrica(key)">mdi-delete</v-icon>
                              </template>
                            </v-text-field>
                            <v-checkbox
                              v-else-if="metrica.tipo === 'boolean'"
                              v-model.number="metrica.valor"
                              :label="key.replace(/_/g, ' ')"
                              density="compact"
                              class="compact-form"
                            >
                              <template v-slot:append>
                                <v-icon size="small" color="primary" class="mr-1" @click="editMetrica(key, metrica)">mdi-pencil</v-icon>
                                <v-icon size="small" color="error" @click="removeMetrica(key)">mdi-delete</v-icon>
                              </template>
                            </v-checkbox>
                            <v-select
                              v-else-if="metrica.tipo === 'multi-select'"
                              v-model="metrica.valor"
                              :label="key"
                              :items="metrica.opciones || []"
                              multiple
                              chips
                              variant="outlined"
                              density="compact"
                              class="compact-form"
                            >
                              <template v-slot:append>
                                <v-icon size="small" color="primary" class="mr-1" @click="editMetrica(key, metrica)">mdi-pencil</v-icon>
                                <v-icon size="small" color="error" @click="removeMetrica(key)">mdi-delete</v-icon>
                              </template>
                            </v-select>
                            <v-checkbox
                              v-else-if="metrica.tipo === 'checkbox'"
                              v-model.number="metrica.valor"
                              :label="key.replace(/_/g, ' ')"
                              density="compact"
                              class="compact-form"
                            >
                              <template v-slot:append>
                                <v-icon size="small" color="primary" class="mr-1" @click="editMetrica(key, metrica)">mdi-pencil</v-icon>
                                <v-icon size="small" color="error" @click="removeMetrica(key)">mdi-delete</v-icon>
                              </template>
                            </v-checkbox>
                          </div>
                        </template>
                        <span>{{ metrica.descripcion }}</span>
                      </v-tooltip>
                    </div>
                  </div>
                </v-card-text>
              </div>
            </div>
            <div>
              <AvatarForm
                v-model="showAvatarDialog"
                collection="actividades"
                :entityId="editedActividad.id"
                :currentAvatarUrl="actividadAvatarUrl"
                :hasCurrentAvatar="!!editedActividad.avatar"
                @avatar-updated="handleAvatarUpdated"
              />
              <div class="flex items-center justify-center mt-0 relative">
                <v-avatar size="192">
                  <v-img :src="actividadAvatarUrl" alt="Avatar de Actividad"></v-img>
                </v-avatar>
                <v-btn
                  icon
                  size="small"
                  color="green-lighten-2"
                  class="absolute bottom-0 right-0"
                  @click="showAvatarDialog = true"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </div>
            </div>
          </div>

          <v-dialog v-model="addMetricaDialog" persistent max-width="400px">
            <v-card>
              <v-toolbar color="primary" dark>
                <v-toolbar-title>{{ isEditingMetrica ? t('activity_workspace.edit_metric') : t('activity_workspace.add_metric') }}</v-toolbar-title>
                <v-spacer></v-spacer>
              </v-toolbar>
              <v-card-text>
                <v-text-field
                  density="compact"
                  variant="outlined"
                  v-model="newMetrica.titulo"
                  :label="t('activity_workspace.title')"
                />
                <v-textarea
                  density="compact"
                  variant="outlined"
                  v-model="newMetrica.descripcion"
                  :label="t('activity_workspace.description')"
                />
                <v-select
                  density="compact"
                  variant="outlined"
                  v-model="newMetrica.tipo"
                  :items="['checkbox', 'number', 'string', 'select', 'multi-select']"
                  :label="t('activity_workspace.type')"
                  @update:model-value="handleTipoChange"
                />
                <v-textarea
                  v-if="showOpcionesField"
                  density="compact"
                  variant="outlined"
                  v-model="newMetrica.opcionesText"
                  :label="t('activity_workspace.options_placeholder')"
                  :placeholder="t('activity_workspace.options_placeholder')"
                  :hint="t('activity_workspace.options_hint')"
                  persistent-hint
                />
              </v-card-text>
              <v-card-actions>
                <v-btn
                  size="small"
                  variant="flat"
                  
                  prepend-icon="mdi-cancel"
                  color="red-lighten-3"
                  @click="addMetricaDialog = false"
                  >{{ t('activity_workspace.cancel') }}</v-btn
                >
                <v-btn
                  size="small"
                  variant="flat"
                  
                  prepend-icon="mdi-check"
                  color="green-lighten-3"
                  @click="saveMetrica"
                  >{{ isEditingMetrica ? t('activity_workspace.save') : t('activity_workspace.add') }}</v-btn
                >
              </v-card-actions>
            </v-card>
          </v-dialog>

          <div class="mt-2">
            <div class="mb-2">
              <v-icon class="mr-2">mdi-information</v-icon>
              {{ t('activity_workspace.details') }}
            </div>
            <div class="document-editor">
              <div ref="toolbar"></div>
              <QuillEditor
                v-model:content="editedActividad.descripcion"
                contentType="html"
                toolbar="essential"
                theme="snow"
                class="quill-editor"
              />
            </div>
          </div>

          <div class="siembra-info mt-4">
            <v-card-title class="headline">
              <h3 class="text-xl font-bold mt-2">{{ t('activity_workspace.bpa_tracking') }}</h3>
            </v-card-title>
            <v-card-text>
              <div class="grid grid-cols-3 gap-2">
                <div v-for="(pregunta, index) in getBpaPreguntas" :key="index">
                  <span class="text-xs font-black text-justify">
                    {{ pregunta.pregunta }}
                    <v-tooltip
                      width="300"
                      v-if="pregunta.descripcion"
                      activator="parent"
                      location="top"
                      density="compact"
                      variant="outlined"
                      class="text-xs text-justify"
                    >
                      {{ pregunta.descripcion }}
                    </v-tooltip>
                  </span>

                  <v-radio-group
                    v-if="editedActividad.datos_bpa && editedActividad.datos_bpa[index]"
                    v-model="editedActividad.datos_bpa[index].respuesta"
                    class="mt-2"
                  >
                    <v-radio
                      v-for="(opcion, opcionIndex) in pregunta.opciones || []"
                      :key="`${index}-${opcionIndex}`"
                      :label="opcion"
                      :value="opcion"
                      class="compact-form"
                      density="compact"
                    ></v-radio>
                  </v-radio-group>
                </div>
              </div>
            </v-card-text>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="flat"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="dialogVisible = false"
            >{{ t('activity_workspace.cancel') }}</v-btn
          >
          <v-btn
            variant="flat"            
            prepend-icon="mdi-check"
            color="green-lighten-3"
            @click="$emit('save')"
            >{{ t('activity_workspace.save') }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AvatarForm from '@/components/forms/AvatarForm.vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  actividadInfo: {
    type: Object,
    required: true
  },
  editedActividad: {
    type: Object,
    required: true
  },
  tipoActividadActual: {
    type: Object,
    default: null
  },
  getBpaPreguntas: {
    type: Array,
    default: () => []
  },
  actividadAvatarUrl: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'avatar-updated'])

const { t } = useI18n()

const dialogVisible = ref(props.modelValue)
const showAvatarDialog = ref(false)
const addMetricaDialog = ref(false)
const isEditingMetrica = ref(false)
const editingMetricaKey = ref('')
const showOpcionesField = ref(false)
const newMetrica = ref({
  titulo: '',
  descripcion: '',
  tipo: '',
  opcionesText: ''
})

watch(
  () => props.modelValue,
  (newVal) => {
    dialogVisible.value = newVal
  }
)

watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

const openAddMetricaDialog = () => {
  addMetricaDialog.value = true
  isEditingMetrica.value = false
  editingMetricaKey.value = ''
  showOpcionesField.value = false
  newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
}

const editMetrica = (key, metrica) => {
  isEditingMetrica.value = true
  editingMetricaKey.value = key
  newMetrica.value = {
    titulo: key.replace(/_/g, ' '),
    descripcion: metrica.descripcion || '',
    tipo: metrica.tipo || '',
    opcionesText: Array.isArray(metrica.opciones) ? metrica.opciones.join(', ') : ''
  }
  showOpcionesField.value = ['checkbox', 'select', 'multi-select'].includes(metrica.tipo)
  addMetricaDialog.value = true
}

const handleTipoChange = (value) => {
  showOpcionesField.value = ['checkbox', 'select', 'multi-select'].includes(value)
  if (!showOpcionesField.value) {
    newMetrica.value.opcionesText = ''
  }
}

const saveMetrica = () => {
  if (newMetrica.value.titulo && newMetrica.value.tipo) {
    const sanitizedTitulo = newMetrica.value.titulo.toUpperCase().replace(/\s+/g, '_')
    let opciones = []
    if (
      newMetrica.value.opcionesText &&
      ['checkbox', 'select', 'multi-select'].includes(newMetrica.value.tipo)
    ) {
      opciones = newMetrica.value.opcionesText
        .split(',')
        .map((opt) => opt.trim())
        .filter((opt) => opt)
    }

    const metricaData = {
      descripcion: newMetrica.value.descripcion,
      tipo: newMetrica.value.tipo,
      valor: newMetrica.value.tipo === 'multi-select' ? [] : (isEditingMetrica.value ? props.editedActividad.metricas[editingMetricaKey.value].valor : null),
      opciones: opciones.length > 0 ? opciones : undefined
    }

    if (isEditingMetrica.value && editingMetricaKey.value !== sanitizedTitulo) {
      delete props.editedActividad.metricas[editingMetricaKey.value]
    }

    props.editedActividad.metricas[sanitizedTitulo] = metricaData
    
    newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
    showOpcionesField.value = false
    addMetricaDialog.value = false
    isEditingMetrica.value = false
    editingMetricaKey.value = ''
  }
}

const removeMetrica = (index) => {
  delete props.editedActividad.metricas[index]
}

const validateDate = (value) => {
  if (!value) return true
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(value) || t('activity_workspace.invalid_date_format')
}

const handleAvatarUpdated = (updatedRecord) => {
  emit('avatar-updated', updatedRecord)
}
</script>

<style scoped>
.document-editor {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 1rem;
}

.siembra-info {
  background: transparent;
}
</style>
