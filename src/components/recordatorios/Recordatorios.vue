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
      <UniversalHeader 
        :title="t('reminders.reminder_management')"
        :bgImage="avatarHaciendaUrl"
      >
        <template #chips>
          <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
            <v-avatar start>
              <v-img :src="avatarUrl" alt="Avatar"></v-img>
            </v-avatar>
            {{ userRole }}
          </v-chip>
          <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
            <v-avatar start>
              <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img>
            </v-avatar>
            {{ mi_hacienda.name }}
          </v-chip>
        </template>

        <template #actions>
          <div class="w-full sm:w-auto z-10" v-if="canCreate">
            <v-btn
              prepend-icon="mdi-plus-circle"
              color="primary"
              variant="flat"
              class="font-weight-bold text-white elevation-2 rounded-lg"
              @click="recordatoriosStore.abrirNuevoRecordatorio"
            >
              {{ t('reminders.new_reminder') }}
            </v-btn>
          </div>
        </template>
      </UniversalHeader>
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
        color="primary"
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
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { handleError } from '@/utils/errorHandler'
import StatusPanel from './RecordatoriosStatusPanel.vue'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'
import UniversalHeader from '@/components/UniversalHeader.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()
const recordatoriosStore = useRecordatoriosStore()
const siembrasStore = useSiembrasStore()
const actividadesStore = useActividadesStore()
const zonasStore = useZonasStore()
const uiFeedbackStore = useUiFeedbackStore()

const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const userRole = computed(() => authStore.user.role)
const canCreate = computed(() => authStore.canCreate)
const avatarUrl = computed(() => authStore.avatarUrl)

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
    uiFeedbackStore.showSnackbar(t('reminders.reminder_saved'))
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