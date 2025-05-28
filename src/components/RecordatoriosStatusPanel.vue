<template>
  <v-card density="compact" class="m-1 p-0 siembra-info">
    <!-- Toolbar mejorado -->
    <v-toolbar density="compact" class="m-0 px-3" :color="`${color}-lighten-4`">
      <v-badge :color="color" :content="items.length">
        <v-icon>mdi-bell-outline</v-icon>
      </v-badge>

      <v-toolbar-title class="font-weight-bold text-base" :style="`color: ${color}`">
        {{ title }}
      </v-toolbar-title>
    </v-toolbar>

    <!-- Lista de items mejorada -->
    <v-card-text class="pa-2">
      <v-list class="py-0">
        <transition-group name="list">
          <v-list-item
            v-for="item in items"
            :key="item.id"
            class="mb-3 rounded-sm"
            :style="`border-left: 3px solid ${color}; `"
          >
            <!-- Fila 1: Título y metadatos -->
            <div class="d-flex align-center w-100 mb-1">
              <p class="text-xs font-weight-bold flex-grow-1">
                {{ item.titulo }}
                <span class="text-xs font-weight-bold text-grey-darken-1 mr-2">
                  (Hace {{ getDaysAgo(item.fecha_creacion || item.created) }})</span
                >
              </p>

              <v-btn
                icon
                variant="text"
                class="mr-1"
                size="lg"
                @click.stop="$emit('edit', item.id)"
              >
                <v-icon color="grey-darken-1">mdi-pencil</v-icon>
              </v-btn>
              <!-- Menú de acciones -->
              <v-menu location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn icon variant="tonal" size="sm" v-bind="props" class="mr-1">
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
                    <v-list-item-title density="compact" class="text-xs">{{
                      statusLabel(status)
                    }}</v-list-item-title>
                  </v-list-item>

                  <v-divider inset></v-divider>

                  <!-- Opción eliminar -->
                  <v-list-item @click="$emit('delete', item.id)">
                    <v-list-item-title class="text-xs text-red">
                      <v-icon color="error" small class="mr-2">mdi-delete</v-icon>
                      Eliminar
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>

            <!-- Fila 2: Contenido usando v-row y v-col -->
            <v-row no-gutters>
              <!-- Columna Izquierda: Descripción -->
              <v-col cols="12" sm="9" class="pr-sm-3">
                <p class="text-xs text-grey-darken-1 mb-0">
                  {{ item.descripcion || 'Sin descripción' }}
                </p>
              </v-col>
              <v-col cols="12" sm="1" class="pr-sm-3"> </v-col>

              <!-- Columna Derecha: Metadatos -->
              <v-col cols="12" sm="2" class="mt-2 mt-sm-0">
                <div class="metadata-container">
                  <!-- Prioridad -->
                  <v-chip :color="`${priorityColor(item.prioridad)}`" size="x-small" class="mb-1">
                    <v-icon size="14" class="mr-1" :icon="priorityIcon(item.prioridad)"></v-icon>
                    {{ item.prioridad.toUpperCase() }}
                  </v-chip>

                  <!-- Fecha -->
                  <v-chip
                    v-if="item.fecha_recordatorio"
                    color="grey-lighten-2"
                    size="small"
                    class="mb-2 ml-1"
                    variant="flat"
                  >
                    <v-icon size="lg" class="mr-2" color="grey-darken-2"> mdi-calendar </v-icon>
                    PARA EL {{ formatDate(item.fecha_recordatorio) }}
                  </v-chip>
                </div>
              </v-col>
            </v-row>
            <!-- Contenedor de etiquetas -->
            <div class="d-flex flex-wrap mt-1">
              <!-- Siembras -->
              <v-chip
                v-for="siembraId in item.siembras"
                :key="`s-${siembraId}`"
                color="grey-lighten-2"
                size="x-small"
                class="mr-1 mb-1"
                variant="flat"
              >
                {{ siembrasStore.getSiembraById(siembraId)?.nombre.toUpperCase() }}
                {{ siembrasStore.getSiembraById(siembraId)?.tipo.toUpperCase() }}
              </v-chip>

              <!-- Zonas -->
              <v-chip
                v-for="zonaId in item.zonas"
                :key="`z-${zonaId}`"
                color="grey-lighten-2"
                size="x-small"
                class="mr-1 mb-1"
                variant="flat"
              >
                {{ getZonaNombre(zonaId).toUpperCase() }}
              </v-chip>

              <!-- Actividades -->
              <v-chip
                v-for="actividad in item.expand?.actividades || []"
                :key="`a-${actividad.id}`"
                color="grey-lighten-2"
                size="x-small"
                class="mr-1 mb-1"
                variant="flat"
              >
                {{ actividad.nombre.toUpperCase() }}
              </v-chip>
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

const getDaysAgo = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
}

const statusLabel = (status) => {
  const labels = {
    pendiente: 'Marcar como Pendiente',
    en_progreso: 'Marcar como en Progreso',
    completado: 'Marcar como Completado'
  }
  return labels[status] || status
}

const updateStatus = (id, newStatus) => {
  emit('update-status', id, newStatus)
}

const priorityIcon = (prioridad) => {
  const icons = {
    alta: 'mdi-flag',
    media: 'mdi-flag-outline',
    baja: 'mdi-flag-variant-outline'
  }
  return icons[prioridad] || 'mdi-flag-outline'
}

const priorityColor = (prioridad) => {
  const colors = {
    alta: 'red',
    media: 'amber-darken-2',
    baja: 'grey-darken-1'
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
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
}

.metadata-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.text-pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

/* Estilos responsivos */
@media (max-width: 600px) {
  .metadata-container {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
  }
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
</style>
