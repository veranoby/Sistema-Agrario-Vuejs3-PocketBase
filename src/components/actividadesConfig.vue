<template>
  <div class="flex flex-col min-h-screen">
    <header class="bg-background shadow-sm">
      <div class="profile-container">
        <div class="grid grid-cols-4 gap-4">
          <h3 class="profile-title col-span-3">
            Gestión de Actividades
            <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
              <v-avatar start>
                <v-img :src="avatarUrl" alt="Avatar"></v-img>
              </v-avatar>
              {{ userRole }}
            </v-chip>
            <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
              <v-avatar start>
                <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
              </v-avatar>
              HACIENDA: {{ mi_hacienda.name }}
            </v-chip>
          </h3>

          <v-btn
            min-width="210"
            max-width="210"
            size="small"
            variant="flat"
            rounded="lg"
            color="green-lighten-2"
            prepend-icon="mdi-plus"
            @click="nuevaActividad"
          >
            Nueva Actividad
          </v-btn>
        </div>
        <div class="avatar-container">
          <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
        </div>
      </div>
    </header>

    <main class="flex-1 py-8">
      <v-container>
        <v-row v-if="loading">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
          </v-col>
        </v-row>
        <v-row v-else-if="error">
          <v-col cols="12">
            <v-alert type="error">{{ error }}</v-alert>
          </v-col>
        </v-row>
        <v-row v-else>
          <v-col v-if="actividades.length === 0" cols="12" sm="6" md="4" lg="3">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :elevation="isHovering ? 6 : 2"
                :class="{ 'on-hover': isHovering }"
                class="transition-shadow duration-300 ease-in-out"
              >
                <v-card-text class="text-center">
                  <v-icon size="large" color="grey" class="mb-4">mdi-clipboard-text</v-icon>
                  <p class="text-h6 font-weight-medium">No hay actividades registradas aún</p>
                  <p class="text-body-2 mt-2">Haga clic en "Nueva Actividad" para comenzar</p>
                </v-card-text>
              </v-card>
            </v-hover>
          </v-col>

          <v-col
            v-for="actividad in actividades"
            :key="actividad.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                :class="['actividad-card', { 'card-hover': isHovering }]"
                @click="abrirActividad(actividad.id)"
              >
                <v-card-title>
                  <v-icon :color="getColorByTipo(actividad.tipo)" size="large" class="mr-2">
                    {{ getIconByTipo(actividad.tipo) }}
                  </v-icon>
                  {{ actividad.nombre }}
                </v-card-title>
                <v-card-text>
                  <p class="text-body-2">{{ actividad.descripcion }}</p>
                  <v-chip
                    :color="actividad.activa ? 'success' : 'error'"
                    size="x-small"
                    class="mt-2"
                  >
                    {{ actividad.activa ? 'Activa' : 'Inactiva' }}
                  </v-chip>
                </v-card-text>
                <v-card-actions>
                  <v-btn icon @click.stop="editarActividad(actividad)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon @click.stop="eliminarActividad(actividad.id)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-hover>
          </v-col>
        </v-row>
      </v-container>
    </main>

    <v-dialog v-model="dialogNuevaActividad" max-width="500px">
      <v-card>
        <v-card-title>{{ modoEdicion ? 'Editar Actividad' : 'Nueva Actividad' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="guardarActividad">
            <v-text-field
              v-model="nuevaActividadData.nombre"
              label="Nombre"
              required
            ></v-text-field>
            <v-select
              v-model="nuevaActividadData.tipo"
              :items="tiposActividad"
              label="Tipo"
              required
            ></v-select>
            <v-textarea
              v-model="nuevaActividadData.descripcion"
              label="Descripción"
              required
            ></v-textarea>
            <v-switch v-model="nuevaActividadData.activa" label="Activa"></v-switch>
            <v-btn type="submit" color="primary" block class="mt-4">
              {{ modoEdicion ? 'Actualizar' : 'Crear' }} Actividad
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'

export default {
  name: 'ActividadesComponent',
  setup() {
    const router = useRouter()
    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const actividadesStore = useActividadesStore()
    const snackbarStore = useSnackbarStore()

    const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
    const { actividades, loading, error } = storeToRefs(actividadesStore)

    const userRole = computed(() => profileStore.user.role)
    const avatarUrl = computed(() => profileStore.avatarUrl)

    const dialogNuevaActividad = ref(false)
    const modoEdicion = ref(false)
    const nuevaActividadData = ref({
      nombre: '',
      tipo: '',
      descripcion: '',
      activa: true,
      hacienda: computed(() => mi_hacienda.value.id)
    })

    const tiposActividad = ['Riego', 'Fertilización', 'Fumigación', 'Poda', 'Cosecha', 'Otro']

    onMounted(async () => {
      try {
        await actividadesStore.fetchActividades()
      } catch (error) {
        snackbarStore.showError('Error al cargar las actividades')
      }
    })

    const nuevaActividad = () => {
      modoEdicion.value = false
      nuevaActividadData.value = {
        nombre: '',
        tipo: '',
        descripcion: '',
        activa: true,
        hacienda: mi_hacienda.value.id
      }
      dialogNuevaActividad.value = true
    }

    const guardarActividad = async () => {
      try {
        if (modoEdicion.value) {
          await actividadesStore.updateActividad(
            nuevaActividadData.value.id,
            nuevaActividadData.value
          )
          snackbarStore.showSnackbar('Actividad actualizada exitosamente')
        } else {
          await actividadesStore.createActividad(nuevaActividadData.value)
          snackbarStore.showSnackbar('Actividad creada exitosamente')
        }
        dialogNuevaActividad.value = false
        await actividadesStore.fetchActividades()
      } catch (error) {
        handleError(
          error,
          modoEdicion.value ? 'Error al actualizar la actividad' : 'Error al crear la actividad'
        )
      }
    }

    const abrirActividad = (id) => {
      router.push(`/actividades/${id}`)
    }

    const editarActividad = (actividad) => {
      modoEdicion.value = true
      nuevaActividadData.value = { ...actividad }
      dialogNuevaActividad.value = true
    }

    const eliminarActividad = async (id) => {
      if (confirm('¿Está seguro de que desea eliminar esta actividad?')) {
        try {
          await actividadesStore.deleteActividad(id)
          snackbarStore.showSnackbar('Actividad eliminada exitosamente')
          await actividadesStore.fetchActividades()
        } catch (error) {
          handleError(error, 'Error al eliminar la actividad')
        }
      }
    }

    const getIconByTipo = (tipo) => {
      const iconos = {
        Riego: 'mdi-water',
        Fertilización: 'mdi-leaf',
        Fumigación: 'mdi-spray',
        Poda: 'mdi-content-cut',
        Cosecha: 'mdi-basket',
        Otro: 'mdi-cog'
      }
      return iconos[tipo] || 'mdi-cog'
    }

    const getColorByTipo = (tipo) => {
      const colores = {
        Riego: 'blue',
        Fertilización: 'green',
        Fumigación: 'red',
        Poda: 'orange',
        Cosecha: 'purple',
        Otro: 'grey'
      }
      return colores[tipo] || 'grey'
    }

    return {
      mi_hacienda,
      avatarHaciendaUrl,
      userRole,
      avatarUrl,
      actividades,
      loading,
      error,
      dialogNuevaActividad,
      modoEdicion,
      nuevaActividadData,
      tiposActividad,
      nuevaActividad,
      guardarActividad,
      abrirActividad,
      editarActividad,
      eliminarActividad,
      getIconByTipo,
      getColorByTipo
    }
  }
}
</script>

<style scoped>
.actividad-card {
  transition: all 0.3s ease;
}

.card-hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 25px 0 rgba(0, 0, 0, 0.1);
}
</style>
