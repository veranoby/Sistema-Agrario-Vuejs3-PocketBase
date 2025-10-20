<template>
  <v-container fluid class="flex flex-col min-h-screen pa-0" v-if="!isLoading">
    <!-- Header -->
    <div class="grid grid-cols-4 gap-2 p-0 m-2">
      <header class="col-span-4 bg-background shadow-sm p-0">
        <div class="profile-container mt-0 ml-0 px-2 py-2">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <!-- Title and Chips Section -->
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title">
                <nav class="flex mb-3" aria-label="Breadcrumb">
                  <ol
                    class="flex items-center space-x-2 bg-green-lighten-4 py-2 px-4 rounded-r-full"
                  >
                    <li>
                      <div class="flex items-center">
                        <v-icon>mdi-gesture-tap-button</v-icon>
                        <router-link
                          to="/actividades"
                          class="ml-3 text-sm font-extrabold hover:text-gray-700"
                          >{{ t('activity_workspace.my_activities') }}</router-link
                        >
                      </div>
                    </li>
                    <li>
                      <div class="flex items-center">
                        <v-icon>mdi-chevron-right</v-icon>
                        <span
                          class="ml-1 text-sm font-extrabold text-gray-600"
                          aria-current="page"
                          >{{ actividadInfo.nombre }}</span
                        >
                      </div>
                    </li>
                  </ol>
                </nav>

                <v-chip variant="flat" size="x-small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar"></v-img> </v-avatar>
                  {{ t('activity_workspace.hacienda') }}: {{ mi_hacienda.name }}
                </v-chip>

                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarUrl" alt="Avatar"></v-img> </v-avatar>
                  {{ userRole }}
                </v-chip>

                <v-chip :color="getStatusColor(actividadInfo.activa)" size="x-small" variant="flat">
                  {{ getStatusMsg(actividadInfo.activa) }}
                </v-chip>

                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1" pill>
                  {{ t('activity_workspace.type') }}:{{
                    actividadesStore.getActividadTipo(actividadInfo.tipo_actividades).toUpperCase()
                  }}
                </v-chip>
              </h3>
            </div>

            <!-- EXTRAS Section -->
            <div class="w-full sm:w-auto z-10 text-center">
              <h4
                :class="{
                  'text-red font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                    actividadInfo.bpa_estado < 40,
                  'text-orange font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                    actividadInfo.bpa_estado >= 40 && actividadInfo.bpa_estado < 80,
                  'text-green font-extrabold pt-0 pb-2 text-xs sm:text-sm':
                    actividadInfo.bpa_estado >= 80
                }"
              >
                {{ t('activity_workspace.bpa_progress') }}:
              </h4>
              <v-progress-circular
                :model-value="actividadInfo.bpa_estado"
                :size="78"
                :width="8"
                :color="colorBpaEstado"
              >
                <template v-slot:default> {{ actividadInfo.bpa_estado }} % </template>
              </v-progress-circular>
            </div>
          </div>

          <div class="avatar-container">
            <img :src="actividadAvatarUrl" alt="Avatar de Actividad" class="avatar-image" />
          </div>
        </div>
      </header>
    </div>

    <v-row no-gutters>
      <v-col cols="9" class="pa-4 pt-2">
        <v-row no-gutters>
          <v-col cols="6" class="pr-2">
            <v-card class="actividad-info mb-4" elevation="2">
              <v-card-title class="headline d-flex flex-column">
                <div class="d-flex justify-space-between align-center w-100">
                  <span>{{ t('activity_workspace.activity_information') }}</span>
                  <v-btn color="green-lighten-2" @click="openEditDialog" icon>
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                </div>
                <div class="w-100 mt-2 flex flex-wrap gap-1">
                  <v-tooltip
                    v-for="(metrica, key) in actividadInfo.metricas"
                    :key="key"
                    location="bottom"
                  >
                    <template v-slot:activator="{ props }">
                      <v-chip
                        variant="flat"
                        size="x-small"
                        color="green-lighten-3"
                        class="m-0 p-1"
                        pill
                      >
                        {{ key.replace(/_/g, ' ').toUpperCase() }}:
                        {{ formatMetricValue(metrica.valor) }}
                      </v-chip>
                    </template>
                    <span>{{ metrica.descripcion }}</span>
                  </v-tooltip>
                </div>
              </v-card-title>
              <v-card-text>
                <div
                  class="rich-text-content"
                  v-html="actividadInfo.descripcion || t('activity_workspace.not_available')"
                ></div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="6" class="pl-2">
            <div class="siembra-info mt-0 p-0">
              <v-card-title class="headline d-flex justify-between">
                <h2 class="text-md font-bold mt-2">
                  <span v-if="actividadInfo.siembras.length > 0">{{ t('activity_workspace.associated_sowings') }}</span>
                </h2>
                <v-btn size="x-small" color="green-lighten-2" @click="openAddSiembrasZonas" icon>
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div class="flex flex-wrap">
                  <v-chip
                    v-for="siembraId in actividadInfo.siembras"
                    size="x-small"
                    :key="siembraId"
                    class="m-1 p-1"
                    :text="
                      siembrasStore.getSiembraById(siembraId)?.nombre.toUpperCase() +
                      ' ' +
                      siembrasStore.getSiembraById(siembraId)?.tipo.toUpperCase()
                    "
                    pill
                    color="green-lighten-3"
                    variant="flat"
                  >
                  </v-chip>
                </div>
                <h2
                  v-if="actividadInfo.zonas & (actividadInfo.zonas.length > 0)"
                  class="text-l font-bold mt-2 mb-2"
                >
                  {{ t('activity_workspace.other_associated_zones') }}
                </h2>

                <div class="flex flex-wrap">
                  <v-chip
                    v-for="zonasId in actividadInfo.zonas"
                    size="x-small"
                    :key="zonasId"
                    class="m-1 p-1"
                    :text="
                      zonasStore.getZonaById(zonasId)?.nombre.toUpperCase() +
                      ' - ' +
                      zonasStore.getZonaById(zonasId)?.expand?.tipos_zonas?.nombre.toUpperCase()
                    "
                    pill
                    color="blue-lighten-3"
                    variant="flat"
                  >
                  </v-chip>
                </div>
              </v-card-text>
            </div>

            <div class="siembra-info mt-4 p-0">
              <v-card-title class="headline d-flex justify-between">
                <h2 class="text-md font-bold mt-2">
                  <span>{{ t('activity_workspace.schedules') }}</span>
                </h2>
                <v-btn
                  size="x-small"
                  color="green-lighten-2"
                  @click="abrirNuevaProgramacion"
                  icon
                  rounded="circle"
                  class="ml-auto"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </v-card-title>

              <v-card-text>
                <ProgramacionPanel
                  v-for="programacion in programacionesActividad"
                  :key="programacion.id"
                  :programacion="programacion"
                  bg-color="#6e97b21c"
                  text-color="color-text"
                  @request-single-execution="handleRequestSingleExecution"
                  @editar="editarProgramacion"
                />
              </v-card-text>
            </div>
          </v-col>
        </v-row>

        <v-row no-gutters>
          <v-col cols="12" class="mt-4">
            <v-card class="bitacora-embedded-section" elevation="2">
              <v-card-title class="d-flex justify-space-between align-center text-body-1">
                <span>{{ t('activity_workspace.recent_log') }}</span>
                <v-btn
                  color="secondary"
                  @click="openNewBitacoraEntryDialogActividad"
                  size="small"
                  variant="elevated"
                >
                  <v-icon start>mdi-plus-box-outline</v-icon>
                  {{ t('activity_workspace.new_entry') }}
                </v-btn>
              </v-card-title>
              <v-card-text class="pa-2">
                <EmbeddedBitacoraList :actividadId="actividadId" title="" :itemLimit="5" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="3" class="p-0 pr-4">
        <div class="siembra-info mt-2 p-2">
          <v-card-title class="headline d-flex justify-between">
            <h2 class="text-md font-bold mt-2">{{ t('activity_workspace.reminders') }}</h2>
            <v-btn
              size="x-small"
              color="green-lighten-2"
              @click="recordatoriosStore.abrirNuevoRecordatorio(actividadId)"
              icon
              rounded="circle"
              class="ml-auto"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-card-title>

          <RecordatorioForm
            :model-value="recordatoriosStore.dialog"
            @update:modelValue="recordatoriosStore.dialog = $event"
            :recordatorio="recordatoriosStore.recordatorioEdit"
            :is-editing="recordatoriosStore.editando"
            @submit="handleFormSubmit"
          />

          <StatusPanel
            :title="t('activity_workspace.pending')"
            color="red"
            :items="recordatoriosStore.recordatoriosPendientes(actividadId)"
            @update-status="recordatoriosStore.actualizarEstado"
            @edit="recordatoriosStore.editarRecordatorio"
            @delete="recordatoriosStore.eliminarRecordatorio"
          />
          <br />
          <StatusPanel
            :title="t('activity_workspace.in_progress')"
            color="amber"
            :items="recordatoriosStore.recordatoriosEnProgreso(actividadId)"
            @update-status="recordatoriosStore.actualizarEstado"
            @edit="recordatoriosStore.editarRecordatorio"
            @delete="recordatoriosStore.eliminarRecordatorio"
          />
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="editActividadDialog" persistent max-width="900px">
      <v-form ref="editActividadForm">
        <v-card>
          <v-toolbar color="success" dark>
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

                <div class="siembra-info col-span-3" v-if="tipoActividadActual?.metricas?.metricas">
                  <v-card-title class="headline d-flex justify-between">
                    <h2 class="text-xl font-bold mt-2">{{ t('activity_workspace.metrics') }}</h2>
                    <v-btn
                      size="x-small"
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
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
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
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
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
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
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
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
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
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
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
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
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
                                  <v-icon @click="removeMetrica(key)">mdi-delete</v-icon>
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
                <v-toolbar color="success" dark>
                  <v-toolbar-title>{{ t('activity_workspace.add_metric') }}</v-toolbar-title>
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
                    rounded="lg"
                    prepend-icon="mdi-cancel"
                    color="red-lighten-3"
                    @click="addMetricaDialog = false"
                    >{{ t('activity_workspace.cancel') }}</v-btn
                  >
                  <v-btn
                    size="small"
                    variant="flat"
                    rounded="lg"
                    prepend-icon="mdi-check"
                    color="green-lighten-3"
                    @click="addMetrica"
                    >{{ t('activity_workspace.add') }}</v-btn
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
                <h2 class="text-xl font-bold mt-2">{{ t('activity_workspace.bpa_tracking') }}</h2>
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
                        {{ pregunta.descripcion }}</v-tooltip
                      >
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
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              @click="editActividadDialog = false"
              >{{ t('activity_workspace.cancel') }}</v-btn
            >
            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              @click="saveActividad"
              >{{ t('activity_workspace.save') }}</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>

    <v-dialog v-model="dialogSiembrasZonas" persistent max-width="900px">
      <div class="grid grid-cols-2 gap-2 p-0 m-2 bg-white">
        <v-card>
          <v-toolbar color="success" dark density="compact">
            <v-toolbar-title small
              ><span class="text-sm"
                ><v-icon class="mr-2">mdi-sprout</v-icon>{{ t('activity_workspace.sowings_projects') }}</span
              ></v-toolbar-title
            >
            <v-spacer></v-spacer>
          </v-toolbar>

          <v-card-text class="ml-4 mr-4">
            <v-chip-group column color="green-darken-4" multiple v-model="selectedSiembras">
              <v-chip
                v-for="siembra in siembras"
                :key="siembra.id"
                :text="`${siembra.nombre}-${siembra.tipo}`"
                :value="siembra.id"
                filter
                density="compact"
              ></v-chip>
            </v-chip-group>
          </v-card-text>
        </v-card>
        <v-card>
          <v-toolbar color="primary" dark density="compact">
            <v-toolbar-title
              ><span class="text-sm"
                ><v-icon class="mr-2">mdi-map</v-icon>{{ t('activity_workspace.available_zones') }}</span
              ></v-toolbar-title
            >
            <v-spacer></v-spacer>
          </v-toolbar>

          <v-card-text class="ml-4 mr-4">
            <v-chip-group color="blue-darken-4" column multiple v-model="selectedZonas">
              <v-chip
                v-for="zona in filteredZonas"
                :key="zona.id"
                :text="`${zona.nombre}(${zonasStore.getZonaById(zona.id)?.expand?.tipos_zonas?.nombre.toUpperCase()})`"
                :value="zona.id"
                filter
                size="small"
                density="compact"
                pill
              ></v-chip>
            </v-chip-group>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              @click="dialogSiembrasZonas = false"
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              >{{ t('activity_workspace.cancel') }}</v-btn
            >
            <v-btn
              @click="saveSelection"
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              >{{ t('activity_workspace.save') }}</v-btn
            >
          </v-card-actions>
        </v-card>
      </div>
    </v-dialog>

    <ProgramacionForm
      v-model="mostrarFormProgramacion"
      :programacionActual="programacionEdit"
      :actividadPredefinida="actividadId"
      @guardado="handleGuardado"
    />

    <v-dialog v-model="showBitacoraFormDialogActividad" max-width="800px" persistent scrollable>
      <BitacoraEntryForm
        v-if="showBitacoraFormDialogActividad"
        :actividadIdContext="actividadId"
        @close="showBitacoraFormDialogActividad = false"
        @save="handleBitacoraSaveActividad"
      />
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useActividadesStore } from '@/stores/actividadesStore'
import { handleError } from '@/utils/errorHandler'
import { useProfileStore } from '@/stores/profileStore'
import { useAvatarStore } from '@/stores/avatarStore'
import { storeToRefs } from 'pinia'
import { useHaciendaStore } from '@/stores/haciendaStore'
import AvatarForm from '@/components/forms/AvatarForm.vue'
import StatusPanel from '@/components/RecordatoriosStatusPanel.vue'
import RecordatorioForm from '@/components/forms/RecordatorioForm.vue'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import ProgramacionPanel from '@/components/ProgramacionPanel.vue'
import ProgramacionForm from '@/components/forms/ProgramacionForm.vue'
import { useSnackbarStore } from '@/stores/snackbarStore'
import EmbeddedBitacoraList from './EmbeddedBitacoraList.vue'
import BitacoraEntryForm from '@/components/forms/BitacoraEntryForm.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const actividadesStore = useActividadesStore()
const avatarStore = useAvatarStore()
const profileStore = useProfileStore()
const haciendaStore = useHaciendaStore()
const siembrasStore = useSiembrasStore()
const zonasStore = useZonasStore()
const recordatoriosStore = useRecordatoriosStore()
const programacionesStore = useProgramacionesStore()
const snackbarStore = useSnackbarStore()

const actividadId = ref(route.params.id)
const actividadInfo = ref({})
const editActividadDialog = ref(false)
const addMetricaDialog = ref(false)
const showOpcionesField = ref(false)

const editedActividad = ref({
  metricas: {}
})
const newMetrica = ref({
  titulo: '',
  descripcion: '',
  tipo: ''
})

const avatarUrl = computed(() => profileStore.avatarUrl)
const dialogSiembrasZonas = ref(false)
const selectedSiembras = ref([])
const selectedZonas = ref([])
const showAvatarDialog = ref(false)
const mostrarFormProgramacion = ref(false)
const programacionEdit = ref(null)

const isLoading = ref(true)
const showBitacoraFormDialogActividad = ref(false)

const { user } = storeToRefs(profileStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)
const { tiposActividades } = storeToRefs(actividadesStore)

const { siembras } = storeToRefs(siembrasStore)
const { zonas } = storeToRefs(zonasStore)

const userRole = computed(() => user.value?.role || '')

const colorBpaEstado = computed(() => {
  if (actividadInfo.value.bpa_estado < 40) return 'red'
  if (actividadInfo.value.bpa_estado < 80) return 'orange'
  return 'green'
})

const actividadAvatarUrl = computed(() => {
  return avatarStore.getAvatarUrl({ ...actividadInfo.value, type: 'actividades' }, 'actividades')
})

const tipoActividadActual = computed(() => {
  return tiposActividades.value.find((tipo) => tipo.id === actividadInfo.value.tipo_actividades)
})

const getBpaPreguntas = computed(() => {
  const tipoActividadFiltrar = actividadesStore.tiposActividades.find(
    (t) => t.id === editedActividad.value.tipo_actividades
  )
  return tipoActividadFiltrar?.datos_bpa?.preguntas_bpa || []
})

const getStatusColor = (status) => {
  const colors = {
    true: 'blue',
    false: 'orange'
  }
  return colors[status] || 'gray'
}
const getStatusMsg = (status) => {
  const colors = {
    true: 'ACTIVA',
    false: 'DETENIDA'
  }
  return colors[status] || 'gray'
}

onMounted(async () => {
  try {
    await loadActividadInfo()
    await actividadesStore.cargarTiposActividades()
    await siembrasStore.cargarSiembras()
    await zonasStore.cargarZonas()
    await zonasStore.cargarTiposZonas()
    await recordatoriosStore.cargarRecordatorios()
    await programacionesStore.cargarProgramaciones()
  } catch (error) {
    handleError(error, t('activity_workspace.error_loading_activity_info'))
  } finally {
    isLoading.value = false
  }
})

const loadActividadInfo = async () => {
  try {
    actividadInfo.value = await actividadesStore.fetchActividadById(actividadId.value, {
      expand: 'tipo_actividades, zonas.tipos_zonas'
    })
    if (!actividadInfo.value.datos_bpa) {
      actividadInfo.value.datos_bpa = []
    }
    if (!actividadInfo.value.metricas) {
      actividadInfo.value.metricas = {}
    }
  } catch (error) {
    console.error('Error cargando actividad:', error)
    const actividadLocal = actividadesStore.actividades.find((a) => a.id === actividadId.value)
    if (actividadLocal) {
      actividadInfo.value = { ...actividadLocal }
      if (!actividadInfo.value.datos_bpa) {
        actividadInfo.value.datos_bpa = []
      }
      if (!actividadInfo.value.metricas) {
        actividadInfo.value.metricas = {}
      }
    } else {
      snackbarStore.showError(t('activity_workspace.activity_not_loaded'))
    }
  }
}

function openEditDialog() {
  editedActividad.value = { ...actividadInfo.value }
  editActividadDialog.value = true
}

function openAddMetricaDialog() {
  addMetricaDialog.value = true
  showOpcionesField.value = false
  newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
}

function handleTipoChange(value) {
  showOpcionesField.value = ['checkbox', 'select', 'multi-select'].includes(value)
  if (!showOpcionesField.value) {
    newMetrica.value.opcionesText = ''
  }
}

const metricasHandler = {
  getInitialValue(tipo) {
    const initialValues = {
      number: 0,
      text: '',
      select: [],
      checkbox: false
    }
    return initialValues[tipo] ?? ''
  },
  validateMetrica(metrica) {
    return metrica.titulo && metrica.descripcion && metrica.tipo
  }
}

function addMetrica() {
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
    editedActividad.value.metricas[sanitizedTitulo] = {
      descripcion: newMetrica.value.descripcion,
      tipo: newMetrica.value.tipo,
      valor: newMetrica.value.tipo === 'multi-select' ? [] : null,
      opciones: opciones.length > 0 ? opciones : undefined
    }
    newMetrica.value = { titulo: '', descripcion: '', tipo: '', opcionesText: '' }
    showOpcionesField.value = false
    addMetricaDialog.value = false
  } else {
    snackbarStore.showError(t('activity_workspace.required_field', { field: 'Título y tipo' }))
  }
}

function removeMetrica(index) {
  delete editedActividad.value.metricas[index]
}

async function saveActividad() {
  try {
    if (!editedActividad.value.nombre) {
      throw new Error(t('activity_workspace.required_field', { field: 'Nombre' }))
    }
    editedActividad.value.nombre = editedActividad.value.nombre.toUpperCase()
    const actividadToUpdate = {
      nombre: editedActividad.value.nombre,
      activa: editedActividad.value.activa,
      metricas: editedActividad.value.metricas,
      descripcion: editedActividad.value.descripcion,
      datos_bpa: editedActividad.value.datos_bpa,
      bpa_estado: editedActividad.value.bpa_estado
    }
    await actividadesStore.updateActividad(actividadId.value, actividadToUpdate)
    actividadInfo.value = await actividadesStore.fetchActividadById(actividadId.value)
    editActividadDialog.value = false
    await loadActividadInfo()
  } catch (error) {
    handleError(error, t('activity_workspace.error_saving_activity'))
  }
}

const handleAvatarUpdated = (updatedRecord) => {
  actividadesStore.$patch((state) => {
    const index = state.actividades.findIndex((s) => s.id === updatedRecord.id)
    if (index !== -1) {
      state.actividades[index] = { ...state.actividades[index], ...updatedRecord }
    }
  })
  actividadInfo.value = { ...actividadInfo.value, ...updatedRecord }
}

const filteredZonas = computed(() => {
  return zonas.value.filter((zona) => !zona.siembra)
})

const openAddSiembrasZonas = () => {
  dialogSiembrasZonas.value = true
  selectedSiembras.value = actividadInfo.value.siembras || []
  selectedZonas.value = actividadInfo.value.zonas || []
}

const saveSelection = async () => {
  actividadInfo.value.siembras = selectedSiembras.value
  actividadInfo.value.zonas = selectedZonas.value
  dialogSiembrasZonas.value = false
  try {
    await actividadesStore.updateActividad(actividadId.value, {
      siembras: actividadInfo.value.siembras,
      zonas: actividadInfo.value.zonas
    })
    console.log('Actividad actualizada correctamente')
  } catch (error) {
    console.error('Error al actualizar la actividad:', error)
  }
}

const validateDate = (value) => {
  if (!value) return true
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(value) || t('activity_workspace.invalid_date_format')
}

const formatMetricValue = (value) => {
  if (!value || value === null) return 'N/A'
  return Array.isArray(value) ? value[0] : value
}

async function handleFormSubmit(data) {
  try {
    if (recordatoriosStore.editando) {
      await recordatoriosStore.actualizarRecordatorio(data.id, data)
    } else {
      await recordatoriosStore.crearRecordatorio(data)
    }
    recordatoriosStore.dialog = false
  } catch (error) {
    handleError(error, t('activity_workspace.error_saving_reminder'))
  }
}

const programacionesActividad = computed(() => {
  return programacionesStore.programaciones.filter((p) => p.actividades.includes(actividadId.value))
})

const abrirNuevaProgramacion = () => {
  programacionEdit.value = null
  mostrarFormProgramacion.value = true
}

const editarProgramacion = (programacion) => {
  programacionEdit.value = programacion
  mostrarFormProgramacion.value = true
}

const cargarProgramaciones = async () => {
  await programacionesStore.cargarProgramaciones()
}

const handleGuardado = async () => {
  mostrarFormProgramacion.value = false
  programacionEdit.value = null
  await cargarProgramaciones()
}

async function handleRequestSingleExecution(programacion) {
  if (!programacionesStore) {
    console.error("Programaciones store is not available.");
    snackbarStore.showSnackbar('Error: No se pudo acceder al store de programaciones.', 'error');
    return;
  }
  try {
    const success = await programacionesStore.prepareForBitacoraEntryFromProgramacion(programacion);
    if (success) {
      router.push({ name: 'Dashboard de Inicio' });
    } else {
      snackbarStore.showSnackbar('No se pudo preparar la entrada de bitácora desde la programación.', 'warning');
    }
  } catch (error) {
    console.error("Error preparing for bitacora entry from programacion:", error);
    snackbarStore.showSnackbar('Error crítico preparando bitácora desde la programación.', 'error');
  }
}

function openNewBitacoraEntryDialogActividad() {
  showBitacoraFormDialogActividad.value = true
}

async function handleBitacoraSaveActividad() {
  showBitacoraFormDialogActividad.value = false
}
</script>

<style scoped>
.document-editor {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 1rem;
}
.document-editor .ck-editor__editable {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  border: 0;
  border-top: 1px solid #e2e8f0;
}
</style>