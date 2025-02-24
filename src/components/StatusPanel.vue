<template>
  <v-card density="compact" class="m-1 p-0 siembra-info">
    <v-toolbar density="compact" class="m-0 siembra-info">
      <v-toolbar-title class="text-sm font-weight-bold m-0 ml-3">
        <!-- Icono de prioridad -->
        <v-icon
          :color="color"
          size="x-large"
          variant="outlined"
          :icon="statusIcon(color)"
          class="mr-3 lm-1"
        ></v-icon>
        {{ title }}
      </v-toolbar-title>

      <v-chip :color="color" variant="outlined" class="m-0 mr-2" size="small">
        {{ items.length }}
      </v-chip>
    </v-toolbar>

    <!--  <v-card-title
      density="compact"
      :class="[`text-${color}-darken-3`, 'text-lg', 'font-weight-bold']"
      >Recordatorios
      {{ title }}
      <v-chip :color="color" class="ml-2" text-color="white">
        {{ items.length }}
      </v-chip>
    </v-card-title>
-->

    <v-card-text density="compact" class="m-1 p-1 text-sm">
      <v-list>
        <transition-group name="list" tag="div">
          <v-list-item
            v-for="item in items"
            :key="item.id"
            class="list-item d-flex align-center m-1 p-1"
            @click="handleStatusClick(item)"
          >
            <div class="d-flex align-center flex-grow-1">
              <!-- Tooltip para descripción -->
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <div v-bind="props" class="flex-grow-1 cursor-pointer" @click.stop>
                    <v-list-item-title class="m-0 p-0 text-sm">
                      <!-- Icono de prioridad -->
                      <v-icon
                        :color="priorityColor(item.prioridad)"
                        class="mr-3"
                        variant="outlined"
                        :icon="priorityIcon(item.prioridad)"
                      ></v-icon>
                      {{ item.titulo }}</v-list-item-title
                    >
                    <v-list-item-subtitle class="m-0 p-0 text-xs">
                      {{ formatDate(item.fecha_recordatorio) }}
                    </v-list-item-subtitle>
                  </div>
                </template>
                <p>{{ item.descripcion || 'Sin descripción' }}</p>

                <!-- siembras -->
                <template v-if="item.siembras && item.siembras.length > 0">
                  <v-chip
                    v-for="siembraId in item.siembras"
                    :key="siembraId"
                    color="green-lighten-3"
                    size="x-small"
                    class="compact-chips"
                    pill
                    variant="flat"
                  >
                    {{ siembrasStore.getSiembraById(siembraId)?.nombre }}
                    {{ siembrasStore.getSiembraById(siembraId)?.tipo }}
                  </v-chip>
                  <br />
                </template>

                <!-- Zonas -->
                <template v-if="item.zonas && item.zonas.length > 0">
                  <v-chip
                    v-for="zonaId in item.zonas"
                    :key="zonaId"
                    color="blue-lighten-3"
                    size="x-small"
                    class="compact-chips"
                    pill
                    variant="flat"
                  >
                    {{ getZonaNombre(zonaId) }}
                  </v-chip>
                  <br />
                </template>

                <!-- Actividades -->
                <template v-if="item.expand?.actividades">
                  <v-chip
                    v-for="actividad in item.expand.actividades"
                    :key="actividad.id"
                    color="orange-lighten-3"
                    size="x-small"
                    class="compact-chips"
                    pill
                    variant="flat"
                  >
                    {{ actividad.nombre }}
                    <template v-if="actividad.expand?.tipo_actividades">
                      ({{ actividad.expand.tipo_actividades.nombre }})
                    </template>
                  </v-chip>
                </template>
              </v-tooltip>

              <!-- Botón de edición -->
              <v-btn
                icon
                variant="text"
                color="grey-darken-1"
                class="ml-2"
                size="xs"
                @click.stop="$emit('edit', item.id)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>

              <!-- Menú de acciones -->
              <v-menu location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn icon variant="tonal" size="sm" v-bind="props" class="ml-2">
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>

                <v-list density="compact">
                  <!-- Opciones de estado -->
                  <v-list-item
                    v-for="status in availableStatuses"
                    :key="status"
                    @click="updateStatus(item.id, status)"
                  >
                    <v-list-item-title density="compact" class="text-sm">{{
                      statusLabel(status)
                    }}</v-list-item-title>
                  </v-list-item>

                  <!-- Separador -->
                  <v-divider inset></v-divider>

                  <!-- Opción eliminar -->
                  <v-list-item @click="$emit('delete', item.id)">
                    <v-list-item-title class="text-red">
                      <v-icon color="error" small class="mr-2">mdi-delete</v-icon>
                      Eliminar
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </v-list-item>
        </transition-group>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'

const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()

const props = defineProps({
  title: String,
  color: String,
  items: Array
})

const emit = defineEmits(['update-status', 'delete', 'edit'])

const statusMap = {
  red: ['en_progreso', 'completado'],
  amber: ['pendiente', 'completado'],
  green: ['pendiente', 'en_progreso']
}

const availableStatuses = computed(() => statusMap[props.color] || [])

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  // Ajustar a UTC
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }
  return utcDate.toLocaleDateString('es-ES', options)
}

const statusLabel = (status) => {
  const labels = {
    pendiente: 'Marcar como Pendiente',
    en_progreso: 'Marcar como en Progreso',
    completado: 'Marcar como Completado'
  }
  return labels[status] || status
}

const statusIcon = (color) => {
  const icons = {
    red: 'mdi-alert-circle',
    amber: 'mdi-circle-slice-5',
    green: 'mdi-check-circle'
  }
  return icons[color] || 'mdi-alert'
}

const updateStatus = (id, newStatus) => {
  emit('update-status', id, newStatus)
}

const handleStatusClick = (item) => {
  // Lógica para abrir detalle del recordatorio
  console.log('Abrir detalle de:', item.id)
}

const priorityIcon = (prioridad) => {
  const icons = {
    alta: 'mdi-arrow-up-thin-circle-outline',
    media: 'mdi-adjust',
    baja: 'mdi-arrow-down-thin-circle-outline'
  }
  return icons[prioridad] || 'mdi-alert'
}

const priorityColor = (prioridad) => {
  const colors = {
    alta: 'red',
    media: '#ffc107',
    baja: '#0000007d'
  }
  return colors[prioridad] || 'grey'
}

const getZonaNombre = (zonaId) => {
  const zona = zonasStore.getZonaById(zonaId)
  if (!zona) return 'Zona no encontrada'
  return `${zona.nombre} (${zona.expand?.tipos_zonas?.nombre || 'Sin tipo'})`
}
</script>

<style scoped>
.v-list {
  background: none;
}

.list-item {
  transition: all 0.4s ease;
  margin-bottom: 8px;
  padding: 8px 0;
}

.v-list-item__prepend {
  align-self: center !important;
  margin-right: 16px !important;
}

.v-list-item__content {
  flex-grow: 1;
  min-width: 0;
}

.v-list-item__append {
  align-self: center !important;
  margin-left: auto !important;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-move {
  transition: transform 0.4s ease;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
