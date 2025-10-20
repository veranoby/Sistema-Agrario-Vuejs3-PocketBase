<template>
  <v-container fluid class="pa-2">
    <RecordatorioForm
      :model-value="recordatoriosStore.dialog"
      @update:modelValue="recordatoriosStore.dialog = $event"
      :recordatorio="recordatoriosStore.recordatorioEdit"
      :is-editing="recordatoriosStore.editando"
      @submit="handleFormSubmit"
    />
    <div class="grid gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0">
                {{ t('reminders.reminder_management') }}
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
                  {{ mi_hacienda.name }}
                </v-chip>
              </h3>
            </div>
            <div class="w-full sm:w-auto z-10">
              <v-btn
                block
                sm:inline-flex
                size="small"
                variant="flat"
                rounded="lg"
                color="#6380a247"
                prepend-icon="mdi-plus"
                @click="recordatoriosStore.abrirNuevoRecordatorio"
                class="min-w-[210px]"
              >
                {{ t('reminders.new_reminder') }}
              </v-btn>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
      <StatusPanel
        :title="t('reminders.pending')"
        color="red"
        :items="recordatoriosStore.recordatoriosPendientes()"
        @update-status="recordatoriosStore.actualizarEstado"
        @edit="recordatoriosStore.editarRecordatorio"
        @delete="recordatoriosStore.eliminarRecordatorio"
      />
      <StatusPanel
        :title="t('reminders.in_progress')"
        color="amber"
        :items="recordatoriosStore.recordatoriosEnProgreso()"
        @update-status="recordatoriosStore.actualizarEstado"
        @edit="recordatoriosStore.editarRecordatorio"
        @delete="recordatoriosStore.eliminarRecordatorio"
      />
      <StatusPanel
        :title="t('reminders.completed')"
        color="green"
        :items="recordatoriosStore.recordatoriosCompletados()"
        @update-status="recordatoriosStore.actualizarEstado"
        @edit="recordatoriosStore.editarRecordatorio"
        @delete="recordatoriosStore.eliminarRecordatorio"
      />
    </div>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { handleError } from '@/utils/errorHandler'
import StatusPanel from '@/components/RecordatoriosStatusPanel.vue'
import { useSnackbarStore } from '@/stores/snackbarStore'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'

const { t } = useI18n()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const recordatoriosStore = useRecordatoriosStore()
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const zonasStore = useZonasStore()
const snackbarStore = useSnackbarStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const userRole = computed(() => profileStore.user.role)
const avatarUrl = computed(() => profileStore.avatarUrl)

onMounted(async () => {
  await Promise.all([
    recordatoriosStore.cargarRecordatorios(),
    siembrasStore.cargarSiembras(),
    actividadesStore.cargarActividades(),
    zonasStore.cargarZonas()
  ])
})

async function handleFormSubmit(data) {
  try {
    if (recordatoriosStore.editando) {
      await recordatoriosStore.actualizarRecordatorio(data.id, data)
      await recordatoriosStore.cargarRecordatorios()
    } else {
      await recordatoriosStore.crearRecordatorio(data)
    }
    recordatoriosStore.dialog = false
    snackbarStore.showSnackbar(t('reminders.reminder_saved'))
  } catch (error) {
    handleError(error, t('reminders.error_saving_reminder'))
  }
}
</script>

<script>
export default {
  name: 'RecordatoriosPanel'
}
</script>

<style scoped>
.list-move {
  transition: all 0.5s ease;
}
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
.fab-button {
  bottom: 80px;
  right: 20px;
}
</style>