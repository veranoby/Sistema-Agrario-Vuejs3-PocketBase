<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid class="pa-2">
    <div class="d-flex flex-column gap-4 w-100">
      <header class="w-100 bg-background shadow-sm p-0 mb-4">
        <div class="profile-container mt-0 ml-0">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="w-full sm:flex-grow">
              <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0 text-uppercase">
                <v-icon icon="mdi-file-percent" color="green-darken-3" class="mr-2"></v-icon> Nómina Agrícola Express
                <v-chip variant="flat" size="small" color="grey-lighten-2" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarUrl" alt="Avatar del usuario"></v-img> </v-avatar>
                  {{ t('roles.' + userRole) }}
                </v-chip>
                <v-chip variant="flat" size="small" color="green-lighten-3" class="mx-1" pill>
                  <v-avatar start> <v-img :src="avatarHaciendaUrl" alt="Avatar de hacienda"></v-img> </v-avatar>
                  {{ t('dashboard.hacienda') }}: {{ mi_hacienda?.name }}
                </v-chip>
              </h3>
              <p class="text-caption text-grey-darken-3 mt-1">
                Conciliación semanal de jornales, cosechas y destajos para el sábado de raya.
              </p>
            </div>
          </div>
          <div class="avatar-container">
            <img :src="avatarHaciendaUrl" alt="Avatar de hacienda" class="avatar-image" />
          </div>
        </div>
      </header>

    <v-tabs v-model="tab" color="green-darken-3" class="mb-6 bg-white rounded-lg shadow-sm">
      <v-tab value="calculo">
        <v-icon start>mdi-calculator</v-icon>
        Cálculo Semanal
      </v-tab>
      <v-tab value="historial" @click="cargarHistorial">
        <v-icon start>mdi-history</v-icon>
        Historial de Cerradas
      </v-tab>
      <v-tab value="asistencia" @click="cargarAsistencia">
        <v-icon start>mdi-calendar-check</v-icon>
        Asistencia Diaria
      </v-tab>
      <v-tab value="plantilla" @click="cargarPlantilla">
        <v-icon start>mdi-account-group</v-icon>
        Plantilla de Personal
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- PESTAÑA 1: CÁLCULO SEMANAL -->
      <v-window-item value="calculo">
        <!-- Panel de Filtros & Configuración de Tarifas -->
        <v-row class="mb-6">
          <v-col cols="12" lg="8">
            <v-card class="rounded-xl pa-5 bg-white shadow-sm border h-100">
              <h3 class="text-h6 font-weight-bold text-grey-darken-3 mb-4 d-flex align-center gap-2">
                <v-icon icon="mdi-calendar-range" color="green-darken-2"></v-icon>
                Periodo de Nómina
              </h3>
              
              <v-row align="center">
                <v-col cols="12" sm="5">
                  <v-text-field
                    v-model="rango.inicio"
                    label="Fecha de Inicio"
                    type="date"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    :readonly="isSavedPayrollClosed"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="5">
                  <v-text-field
                    v-model="rango.fin"
                    label="Fecha de Fin"
                    type="date"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    :readonly="isSavedPayrollClosed"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="2" class="d-flex flex-column gap-2">
                  <v-btn
                    color="green-darken-3"
                    block
                    variant="flat"
                    @click="calcularBorrador"
                    :disabled="isSavedPayrollClosed"
                  >
                    Generar
                  </v-btn>
                </v-col>
              </v-row>

              <div class="d-flex gap-2 mt-4 flex-wrap" v-if="!isSavedPayrollClosed">
                <v-btn
                  size="small"
                  variant="outlined"
                  color="green-darken-2"
                  class="rounded-lg"
                  @click="setPresetPeriod('current')"
                >
                  Esta Semana
                </v-btn>
                <v-btn
                  size="small"
                  variant="outlined"
                  color="green-darken-2"
                  class="rounded-lg"
                  @click="setPresetPeriod('prev')"
                >
                  Semana Anterior
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <v-card class="rounded-xl pa-5 bg-white shadow-sm border h-100">
              <div class="d-flex align-center justify-between mb-4">
                <h3 class="text-h6 font-weight-bold text-grey-darken-3 d-flex align-center gap-2">
                  <v-icon icon="mdi-cog-outline" color="green-darken-2"></v-icon>
                  Tarifas Oficiales
                </h3>
                <v-chip size="x-small" color="success" class="font-weight-bold">Configuración</v-chip>
              </div>
              
              <v-row class="dense">
                <v-col cols="6" class="py-1">
                  <v-text-field
                    v-model.number="nominaStore.defaultJornal"
                    label="Jornal Diario ($)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @input="recalculateAll"
                    :readonly="isSavedPayrollClosed"
                  ></v-text-field>
                </v-col>
                <v-col cols="6" class="py-1">
                  <v-text-field
                    v-model.number="nominaStore.rates.cajas"
                    label="Caja destajo ($)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @input="recalculateAll"
                    :readonly="isSavedPayrollClosed"
                  ></v-text-field>
                </v-col>
                <v-col cols="6" class="py-1">
                  <v-text-field
                    v-model.number="nominaStore.rates.racimos"
                    label="Racimo destajo ($)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @input="recalculateAll"
                    :readonly="isSavedPayrollClosed"
                  ></v-text-field>
                </v-col>
                <v-col cols="6" class="py-1">
                  <v-text-field
                    v-model.number="nominaStore.rates.kilos"
                    label="Kilo destajo ($)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @input="recalculateAll"
                    :readonly="isSavedPayrollClosed"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>

        <!-- Resumen General KPIs -->
        <v-row class="mb-6" v-if="detallesBorrador.length > 0">
          <v-col cols="12" sm="6" md="3">
            <v-card class="rounded-xl bg-green-darken-3 text-white pa-4 shadow-sm">
              <div class="text-caption font-weight-bold text-green-lighten-3">TOTAL NETO A PAGAR</div>
              <div class="text-h4 font-weight-black mt-1">${{ totalNeto.toFixed(2) }}</div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="rounded-xl bg-white pa-4 shadow-sm border">
              <div class="text-caption font-weight-bold text-grey-darken-1">TOTAL EN JORNALES</div>
              <div class="text-h4 font-weight-black mt-1 text-green-darken-4">${{ totalJornal.toFixed(2) }}</div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="rounded-xl bg-white pa-4 shadow-sm border">
              <div class="text-caption font-weight-bold text-grey-darken-1">TOTAL EN DESTAJOS</div>
              <div class="text-h4 font-weight-black mt-1 text-green-darken-4">${{ totalDestajo.toFixed(2) }}</div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="rounded-xl bg-white pa-4 shadow-sm border">
              <div class="text-caption font-weight-bold text-grey-darken-1">TRABAJADORES</div>
              <div class="text-h4 font-weight-black mt-1 text-grey-darken-4">{{ detallesBorrador.length }}</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Tabla de Nómina Activa -->
        <v-row v-if="detallesBorrador.length > 0">
          <v-col cols="12">
            <v-card class="rounded-xl bg-white shadow-sm border overflow-hidden">
              <v-toolbar color="transparent" flat class="px-4">
                <v-toolbar-title class="font-weight-bold text-grey-darken-4">
                  Cálculo de Haberes de la Semana
                </v-toolbar-title>
                <v-spacer></v-spacer>
                <v-chip
                  v-if="payrollStatus"
                  :color="getStatusColor(payrollStatus)"
                  class="font-weight-bold mr-4 text-uppercase"
                  variant="flat"
                >
                  {{ payrollStatus }}
                </v-chip>
                <v-btn
                  prepend-icon="mdi-export"
                  color="green-darken-3"
                  variant="outlined"
                  class="rounded-lg mr-2"
                  @click="exportarExcel"
                >
                  Exportar Excel
                </v-btn>
              </v-toolbar>
              <v-divider></v-divider>

              <v-table class="payroll-table">
                <thead>
                  <tr>
                    <th class="text-left font-weight-bold text-subtitle-2">Operario</th>
                    <th class="text-center font-weight-bold text-subtitle-2" style="width: 110px;">Días Trab.</th>
                    <th class="text-center font-weight-bold text-subtitle-2" style="width: 110px;">Jornal ($)</th>
                    <th class="text-right font-weight-bold text-subtitle-2">Subtotal Jornal</th>
                    <th class="text-left font-weight-bold text-subtitle-2">Cosechas (Destajo)</th>
                    <th class="text-right font-weight-bold text-subtitle-2">Subtotal Destajo</th>
                    <th class="text-center font-weight-bold text-subtitle-2" style="width: 110px;">Ajustes ($)</th>
                    <th class="text-right font-weight-bold text-subtitle-2 font-weight-black">Total Neto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in detallesBorrador" :key="row.operario_id">
                    <td class="font-weight-bold text-grey-darken-4 py-3">
                      <div class="d-flex align-center gap-2">
                        <v-avatar color="green-lighten-4" size="32" class="text-green-darken-4 font-weight-bold">
                          {{ getInitials(row.operario_nombre) }}
                        </v-avatar>
                        {{ row.operario_nombre }}
                      </div>
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.dias_trabajados"
                        type="number"
                        min="0"
                        max="7"
                        step="0.5"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="centered-input rounded-lg"
                        @input="recalculateRow(row)"
                        :readonly="isSavedPayrollClosed"
                      ></v-text-field>
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.valor_jornal"
                        type="number"
                        min="0"
                        step="0.5"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="centered-input rounded-lg"
                        @input="recalculateRow(row)"
                        :readonly="isSavedPayrollClosed"
                      ></v-text-field>
                    </td>
                    <td class="text-right font-weight-medium text-grey-darken-3">
                      ${{ row.pago_jornal.toFixed(2) }}
                    </td>
                    <td class="py-2">
                      <div class="d-flex flex-wrap gap-1">
                        <template v-for="(val, unit) in row.cosechas" :key="unit">
                          <v-chip
                            v-if="val > 0"
                            size="x-small"
                            color="green-darken-1"
                            variant="flat"
                            class="font-weight-bold"
                          >
                            {{ val }} {{ unit }}
                          </v-chip>
                        </template>
                        <span v-if="!hasCosechas(row.cosechas)" class="text-caption text-grey">
                          Sin cosechas
                        </span>
                      </div>
                    </td>
                    <td class="text-right font-weight-medium text-grey-darken-3">
                      ${{ row.pago_destajo.toFixed(2) }}
                    </td>
                    <td>
                      <v-text-field
                        v-model.number="row.ajustes"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="centered-input rounded-lg"
                        @input="recalculateRow(row)"
                        :readonly="isSavedPayrollClosed"
                      ></v-text-field>
                    </td>
                    <td class="text-right font-weight-black text-green-darken-4">
                      ${{ row.total_neto.toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <v-divider></v-divider>

              <!-- Panel de Acciones de Estado -->
              <v-card-actions class="pa-4 bg-grey-lighten-4 d-flex justify-between flex-wrap gap-4">
                <div>
                  <v-btn
                    v-if="savedNominaId"
                    color="red-darken-3"
                    variant="text"
                    prepend-icon="mdi-delete"
                    class="rounded-lg"
                    @click="confirmEliminarNomina"
                    :disabled="isSavedPayrollClosed"
                  >
                    Eliminar Borrador
                  </v-btn>
                </div>
                
                <div class="d-flex gap-2">
                  <v-btn
                    color="grey-darken-2"
                    variant="flat"
                    class="px-6 rounded-lg font-weight-bold"
                    @click="guardarBorrador('borrador')"
                    v-if="!isSavedPayrollClosed"
                  >
                    Guardar Borrador
                  </v-btn>
                  
                  <v-btn
                    color="green-darken-4"
                    variant="flat"
                    class="px-6 rounded-lg font-weight-bold"
                    prepend-icon="mdi-lock"
                    @click="confirmCerrarNomina"
                    v-if="payrollStatus === 'borrador' || !savedNominaId"
                  >
                    Cerrar Nómina
                  </v-btn>

                  <v-btn
                    color="blue-darken-3"
                    variant="flat"
                    class="px-6 rounded-lg font-weight-bold"
                    prepend-icon="mdi-currency-usd"
                    @click="marcarComoPagada"
                    v-if="payrollStatus === 'cerrada'"
                  >
                    Marcar como Pagada
                  </v-btn>
                </div>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-else class="my-10 justify-center">
          <v-col cols="12" md="6" class="text-center">
            <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-calculator-variant_outline</v-icon>
            <h3 class="text-h5 font-weight-bold text-grey-darken-3 mb-2">No hay nómina cargada</h3>
            <p class="text-body-1 text-grey-darken-1 mb-4">
              Seleccione un rango de fechas de arriba y haga clic en "Generar" para construir el borrador de la semana.
            </p>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- PESTAÑA 2: HISTORIAL DE NÓMINAS -->
      <v-window-item value="historial">
        <v-card class="rounded-xl bg-white shadow-sm border overflow-hidden">
          <v-toolbar color="transparent" flat class="px-4">
            <v-toolbar-title class="font-weight-bold text-grey-darken-4">
              Historial de Cierres de Nómina
            </v-toolbar-title>
          </v-toolbar>
          <v-divider></v-divider>

          <v-data-table
            :headers="headersHistorial"
            :items="nominaStore.nominas"
            :loading="nominaStore.loading"
            loading-text="Cargando historial..."
            no-data-text="No hay nóminas cerradas registradas"
            class="elevation-0"
          >
            <!-- Periodo Column -->
            <template #[`item.periodo`]="{ item }">
              <span class="font-weight-medium">
                {{ formatFechaSimple(item.semana_inicio) }} al {{ formatFechaSimple(item.semana_fin) }}
              </span>
            </template>

            <!-- Total Pagado Column -->
            <template #[`item.total_pagado`]="{ item }">
              <span class="font-weight-bold text-green-darken-4">
                ${{ item.total_pagado.toFixed(2) }}
              </span>
            </template>

            <!-- Estado Column -->
            <template #[`item.estado`]="{ item }">
              <v-chip
                size="small"
                :color="getStatusColor(item.estado)"
                class="font-weight-bold text-uppercase"
                variant="flat"
              >
                {{ item.estado }}
              </v-chip>
            </template>

            <!-- Acciones Column -->
            <template #[`item.acciones`]="{ item }">
              <div class="d-flex align-center gap-2">
                <v-btn
                  size="small"
                  variant="outlined"
                  color="green-darken-3"
                  prepend-icon="mdi-eye"
                  @click="cargarNominaHistorica(item)"
                >
                  Cargar
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  color="green-darken-3"
                  icon="mdi-file-excel"
                  @click="exportarExcelHistorica(item)"
                >
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- PESTAÑA 3: ASISTENCIA DIARIA -->
      <v-window-item value="asistencia">
        <v-card class="rounded-xl bg-white shadow-sm border overflow-hidden">
          <v-toolbar color="transparent" flat class="px-4">
            <v-toolbar-title class="font-weight-bold text-grey-darken-4">
              Asistencia Diaria
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="fechaAsistencia"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              class="mr-4 rounded-lg"
              style="max-width: 200px"
              @change="cargarAsistencia"
            ></v-text-field>
            <v-btn color="green-darken-3" variant="flat" prepend-icon="mdi-content-save" @click="guardarAsistencia">
              Guardar Asistencia
            </v-btn>
          </v-toolbar>
          <v-divider></v-divider>

          <v-data-table
            :headers="headersAsistencia"
            :items="registrosAsistencia"
            :loading="nominaStore.loading"
            class="elevation-0"
            no-data-text="No hay operarios activos para mostrar"
          >
            <!-- Operario -->
            <template #[`item.operario_nombre`]="{ item }">
              <span class="font-weight-medium">{{ item.operario_nombre }}</span>
            </template>
            
            <!-- Jornada -->
            <template #[`item.tipo_jornada`]="{ item }">
              <v-btn-toggle
                v-model="item.tipo_jornada"
                color="green-darken-3"
                mandatory
                class="rounded-lg border"
                density="compact"
              >
                <v-btn value="completa" class="px-4">
                  <v-icon start size="small">mdi-circle-slice-8</v-icon> Completa
                </v-btn>
                <v-btn value="media" class="px-4">
                  <v-icon start size="small">mdi-circle-slice-4</v-icon> Media
                </v-btn>
                <v-btn value="ausente" class="px-4 text-red-darken-2">
                  <v-icon start size="small" color="red-darken-2">mdi-close-circle-outline</v-icon> Ausente
                </v-btn>
              </v-btn-toggle>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- PESTAÑA 4: PLANTILLA DE PERSONAL -->
      <v-window-item value="plantilla">
        <v-card class="rounded-xl bg-white shadow-sm border overflow-hidden">
          <v-toolbar color="transparent" flat class="px-4">
            <v-toolbar-title class="font-weight-bold text-grey-darken-4">
              Gestión de Trabajadores
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn color="green-darken-3" variant="flat" prepend-icon="mdi-plus" @click="abrirDialogoTrabajador()">
              Nuevo Trabajador
            </v-btn>
          </v-toolbar>
          <v-divider></v-divider>

          <v-data-table
            :headers="headersPlantilla"
            :items="nominaStore.plantilla"
            :loading="nominaStore.loading"
            class="elevation-0"
          >
            <template #[`item.activo`]="{ item }">
              <v-switch
                :model-value="item.activo"
                color="green-darken-3"
                density="compact"
                hide-details
                @update:model-value="nominaStore.toggleActivoTrabajador(item.id, $event)"
              ></v-switch>
            </template>
            <template #[`item.valor_jornal`]="{ item }">
              ${{ item.valor_jornal.toFixed(2) }}
            </template>
            <template #[`item.acciones`]="{ item }">
              <v-btn icon="mdi-pencil" variant="text" color="blue" size="small" @click="abrirDialogoTrabajador(item)"></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Modal para Confirmar Cierre -->
    <v-dialog v-model="cerrarConfirmDialog" max-width="400">
      <v-card class="rounded-xl">
        <v-card-title class="bg-green-darken-3 text-white pa-4">
          <v-icon start>mdi-lock</v-icon>
          ¿Cerrar esta Nómina?
        </v-card-title>
        <v-card-text class="pa-6">
          Al cerrar la nómina se guardarán todos los importes calculados de forma inmutable. Ya no podrá editar días trabajados ni salarios de esta semana.
          <v-checkbox
            v-if="haciendaStore.isModuleActive('finanzas')"
            v-model="importarAFinanzas"
            label="Importar costos automáticamente a Finanzas"
            color="green-darken-4"
            class="mt-4"
            hide-details
          ></v-checkbox>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn variant="outlined" color="grey-darken-1" @click="cerrarConfirmDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="green-darken-4" variant="flat" class="font-weight-bold" @click="cerrarNomina">
            Confirmar Cierre
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Trabajador -->
    <v-dialog v-model="dialogoTrabajador" max-width="500">
      <v-card class="rounded-xl">
        <v-card-title class="bg-green-darken-3 text-white pa-4">
          {{ formTrabajador.id ? 'Editar Trabajador' : 'Nuevo Trabajador' }}
        </v-card-title>
        <v-card-text class="pa-6">
          <v-form ref="formPlantillaRef" v-model="formPlantillaValid">
            <v-text-field v-model="formTrabajador.nombre" label="Nombre Completo *" :rules="[v => !!v || 'Obligatorio']" variant="outlined"></v-text-field>
            <v-text-field v-model="formTrabajador.identificacion" label="Identificación / Cédula" variant="outlined"></v-text-field>
            <v-text-field v-model.number="formTrabajador.valor_jornal" type="number" label="Valor Jornal ($) *" :rules="[v => !!v || 'Obligatorio']" variant="outlined"></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="outlined" color="grey" @click="dialogoTrabajador = false">Cancelar</v-btn>
          <v-btn color="green-darken-3" variant="flat" :disabled="!formPlantillaValid" @click="guardarTrabajador">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNominaStore } from '@/stores/nominaStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { logger } from '@/utils/logger'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'

// Stores
const nominaStore = useNominaStore()
const haciendaStore = useHaciendaStore()
const uiFeedbackStore = useUiFeedbackStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { userRole, avatarUrl } = storeToRefs(authStore)
const { mi_hacienda, avatarHaciendaUrl } = storeToRefs(haciendaStore)

// State
const tab = ref('calculo')
const savedNominaId = ref(null)
const payrollStatus = ref('')
const cerrarConfirmDialog = ref(false)
const importarAFinanzas = ref(true)

const dialogoTrabajador = ref(false)
const formPlantillaValid = ref(false)
const formTrabajador = ref({ id: null, nombre: '', identificacion: '', valor_jornal: 15 })

const getWeekRanges = () => {
  const now = new Date()
  const currentDay = now.getDay()
  const currentMonday = new Date(now)
  const diffMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
  currentMonday.setDate(diffMonday)
  currentMonday.setHours(0,0,0,0)

  const currentSunday = new Date(currentMonday)
  currentSunday.setDate(currentMonday.getDate() + 6)
  currentSunday.setHours(23,59,59,999)

  const prevMonday = new Date(currentMonday)
  prevMonday.setDate(currentMonday.getDate() - 7)

  const prevSunday = new Date(prevMonday)
  prevSunday.setDate(prevMonday.getDate() + 6)

  return {
    current: {
      inicio: currentMonday.toISOString().split('T')[0],
      fin: currentSunday.toISOString().split('T')[0]
    },
    prev: {
      inicio: prevMonday.toISOString().split('T')[0],
      fin: prevSunday.toISOString().split('T')[0]
    }
  }
}

const rango = ref(getWeekRanges().current)
const detallesBorrador = ref([])

const fechaAsistencia = ref(new Date().toISOString().split('T')[0])
const registrosAsistencia = ref([])

// Computed
const totalNeto = computed(() => {
  return detallesBorrador.value.reduce((sum, row) => sum + row.total_neto, 0)
})

const totalJornal = computed(() => {
  return detallesBorrador.value.reduce((sum, row) => sum + row.pago_jornal, 0)
})

const totalDestajo = computed(() => {
  return detallesBorrador.value.reduce((sum, row) => sum + row.pago_destajo, 0)
})

const isSavedPayrollClosed = computed(() => {
  return payrollStatus.value === 'cerrada' || payrollStatus.value === 'pagada'
})

const headersHistorial = [
  { title: 'Periodo Semanal', key: 'periodo', align: 'start', sortable: false },
  { title: 'Total Pagado', key: 'total_pagado', align: 'end', sortable: true },
  { title: 'Estado', key: 'estado', align: 'center', sortable: true },
  { title: 'Acciones', key: 'acciones', align: 'center', sortable: false }
]

const headersPlantilla = [
  { title: 'Nombre Completo', key: 'nombre' },
  { title: 'Identificación', key: 'identificacion' },
  { title: 'Jornal ($)', key: 'valor_jornal' },
  { title: 'Activo', key: 'activo' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' }
]

const headersAsistencia = [
  { title: 'Operario', key: 'operario_nombre', sortable: true },
  { title: 'Jornada Trabajada', key: 'tipo_jornada', sortable: false, align: 'center' }
]

// Methods
const setPresetPeriod = (preset) => {
  const ranges = getWeekRanges()
  if (preset === 'current') {
    rango.value = ranges.current
  } else if (preset === 'prev') {
    rango.value = ranges.prev
  }
}

const formatFechaSimple = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

const getInitials = (name) => {
  if (!name) return 'OP'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const getStatusColor = (status) => {
  if (status === 'borrador') return 'grey-darken-1'
  if (status === 'cerrada') return 'amber-darken-3'
  if (status === 'pagada') return 'green-darken-3'
  return 'grey'
}

const hasCosechas = (cosechas) => {
  return Object.values(cosechas).some(v => v > 0)
}

const recalculateRow = (row) => {
  const dias = Number(row.dias_trabajados) || 0
  const rate = Number(row.valor_jornal) || 0
  const adj = Number(row.ajustes) || 0
  
  row.pago_jornal = Number((dias * rate).toFixed(2))

  // Destajos
  let destajo = 0
  Object.entries(row.cosechas).forEach(([unit, qty]) => {
    destajo += qty * (nominaStore.rates[unit] || 0)
  })
  row.pago_destajo = Number(destajo.toFixed(2))

  row.total_neto = Number((row.pago_jornal + row.pago_destajo + adj).toFixed(2))
}

const recalculateAll = () => {
  detallesBorrador.value.forEach(row => recalculateRow(row))
}

// Actions
const calcularBorrador = async () => {
  try {
    savedNominaId.value = null
    payrollStatus.value = ''
    const detalles = await nominaStore.generarBorradorSemana(rango.value.inicio, rango.value.fin)
    detallesBorrador.value = detalles
  } catch (e) {
    logger.error('Error calculando borrador:', e)
  }
}

const guardarBorrador = async (statusOverride = 'borrador') => {
  if (detallesBorrador.value.length === 0) return
  
  const payload = {
    id: savedNominaId.value,
    semana_inicio: `${rango.value.inicio}T00:00:00.000Z`,
    semana_fin: `${rango.value.fin}T23:59:59.000Z`,
    estado: statusOverride,
    total_pagado: totalNeto.value,
    detalles: detallesBorrador.value
  }

  try {
    const record = await nominaStore.guardarNomina(payload)
    savedNominaId.value = record.id
    payrollStatus.value = record.estado
  } catch (e) {
    logger.error(e)
  }
}

const confirmCerrarNomina = () => {
  cerrarConfirmDialog.value = true
}

const cerrarNomina = async () => {
  cerrarConfirmDialog.value = false
  await guardarBorrador('cerrada')
  
  if (importarAFinanzas.value && haciendaStore.isModuleActive('finanzas')) {
    try {
      const { useFinanzaStore } = await import('@/stores/finanzaStore')
      const finanzaStore = useFinanzaStore()
      await finanzaStore.importarCostosNomina(rango.value.inicio, rango.value.fin)
      uiFeedbackStore.showSnackbar('Costos de nómina importados a Finanzas')
    } catch (e) {
      uiFeedbackStore.showSnackbar('Error importando a finanzas', 'error')
    }
  }
}

const marcarComoPagada = async () => {
  await guardarBorrador('pagada')
}

const confirmEliminarNomina = () => {
  if (!savedNominaId.value) return
  
  if (confirm('¿Está seguro de que desea eliminar este borrador de nómina?')) {
    nominaStore.eliminarNomina(savedNominaId.value).then(() => {
      savedNominaId.value = null
      payrollStatus.value = ''
      detallesBorrador.value = []
    })
  }
}

const cargarHistorial = async () => {
  await nominaStore.cargarHistoricoNomina()
}

const cargarPlantilla = async () => {
  await nominaStore.cargarPlantilla()
}

const cargarAsistencia = async () => {
  try {
    const registros = await nominaStore.cargarAsistenciaDia(fechaAsistencia.value)
    registrosAsistencia.value = registros
  } catch (e) {
    logger.error('Error cargando asistencia:', e)
  }
}

const guardarAsistencia = async () => {
  if (registrosAsistencia.value.length === 0) return
  await nominaStore.guardarAsistenciaDia(fechaAsistencia.value, registrosAsistencia.value)
}

const abrirDialogoTrabajador = (trabajador = null) => {
  if (trabajador) {
    formTrabajador.value = { ...trabajador }
  } else {
    formTrabajador.value = { id: null, nombre: '', identificacion: '', valor_jornal: nominaStore.defaultJornal }
  }
  dialogoTrabajador.value = true
}

const guardarTrabajador = async () => {
  if (!formPlantillaValid.value) return
  if (formTrabajador.value.id) {
    await nominaStore.actualizarTrabajador(formTrabajador.value.id, formTrabajador.value)
  } else {
    await nominaStore.crearTrabajador(formTrabajador.value)
  }
  dialogoTrabajador.value = false
}

const cargarNominaHistorica = (nomina) => {
  savedNominaId.value = nomina.id
  payrollStatus.value = nomina.estado
  
  rango.value = {
    inicio: nomina.semana_inicio.split('T')[0],
    fin: nomina.semana_fin.split('T')[0]
  }
  
  detallesBorrador.value = nomina.detalles
  tab.value = 'calculo'
}

const exportarExcel = async () => {
  const semInfo = { inicio: rango.value.inicio, fin: rango.value.fin }
  await nominaStore.exportarNominaExcel(semInfo, detallesBorrador.value)
}

const exportarExcelHistorica = async (nomina) => {
  const semInfo = { inicio: nomina.semana_inicio.split('T')[0], fin: nomina.semana_fin.split('T')[0] }
  await nominaStore.exportarNominaExcel(semInfo, nomina.detalles)
}

onMounted(() => {
  // Inicialización limpia
})
</script>

<style scoped>
.centered-input :deep(input) {
  text-align: center;
}
.payroll-table {
  border-collapse: collapse;
  width: 100%;
}
.payroll-table th, .payroll-table td {
  padding: 12px 16px;
}
.payroll-table tbody tr:hover {
  background-color: #f1f8e9;
}
</style>
