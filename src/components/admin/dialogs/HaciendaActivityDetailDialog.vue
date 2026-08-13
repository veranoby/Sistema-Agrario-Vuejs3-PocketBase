<template>
  <v-dialog v-model="isOpen" max-width="600">
    <v-card>
      <v-card-title class="bg-secondary text-white">
        Detalles de {{ dialogTitle }}
      </v-card-title>
      <v-card-text class="pt-4">
        <div v-if="item">
          <!-- Vinculación -->
          <template v-if="type === 'vinculacion'">
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Asesor</v-list-item-title>
                <v-list-item-subtitle>
                  {{ item.expand?.asesor_id?.name || item.expand?.asesor_id?.username || 'Desconocido' }} ({{ item.expand?.asesor_id?.email || 'N/A' }})
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Fecha Vinculación</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(item.created) }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">ID Vinculación</v-list-item-title>
                <v-list-item-subtitle>{{ item.id }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </template>

          <!-- Paquete -->
          <template v-else-if="type === 'paquete'">
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Título</v-list-item-title>
                <v-list-item-subtitle>{{ item.titulo || item.title }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Descripción</v-list-item-title>
                <v-list-item-subtitle style="white-space: pre-wrap">{{ item.descripcion || 'Sin descripción' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Estado</v-list-item-title>
                <v-list-item-subtitle>{{ item.estado || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Fecha Envío</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(item.created) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </template>

          <!-- Receta -->
          <template v-else-if="type === 'receta'">
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Código</v-list-item-title>
                <v-list-item-subtitle>{{ item.codigo }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Asesor</v-list-item-title>
                <v-list-item-subtitle>
                  {{ item.expand?.asesor_id?.name || 'Desconocido' }} ({{ item.expand?.asesor_id?.email || 'N/A' }})
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Diagnóstico</v-list-item-title>
                <v-list-item-subtitle style="white-space: pre-wrap">{{ item.diagnostico || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Prescripción</v-list-item-title>
                <v-list-item-subtitle style="white-space: pre-wrap">{{ item.prescripcion || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Fecha Receta</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(item.created) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </template>
        </div>
      </v-card-text>
      <v-card-actions class="pb-4 pr-4">
        <v-spacer />
        <v-btn color="grey" variant="elevated" @click="closeModal">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils/formatters'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  item: {
    type: Object,
    default: null
  },
  type: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const dialogTitle = computed(() => {
  if (props.type === 'vinculacion') return 'Vinculación de Asesor'
  if (props.type === 'paquete') return 'Paquete de Evaluación'
  if (props.type === 'receta') return 'Receta'
  return 'Elemento'
})

function closeModal() {
  isOpen.value = false
}
</script>
