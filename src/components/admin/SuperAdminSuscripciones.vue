<template>
  <v-container fluid class="superadmin-suscripciones">
    <h2 class="text-h5 mb-4">Gestión de Suscripciones</h2>

    <v-card class="mb-4">
      <v-toolbar color="transparent" density="compact">
        <v-btn icon="mdi-chevron-left" variant="text" @click="prevMonth"></v-btn>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold text-center">
          {{ monthName }} {{ currentYear }}
        </v-toolbar-title>
        <v-btn icon="mdi-chevron-right" variant="text" @click="nextMonth"></v-btn>
        <v-spacer></v-spacer>
        <div class="mr-4 text-subtitle-2 font-weight-bold text-success">
          Ingreso Mensual: ${{ totalMensual.toFixed(2) }}
        </div>
        <v-btn color="primary" variant="outlined" size="small" class="mr-2" @click="exportToExcel">
          <v-icon left>mdi-file-excel</v-icon> Exportar Excel
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="transacciones"
          :loading="loading"
          class="elevation-1"
        >
          <template v-slot:item.hacienda_solicitante="{ item }">
            <div class="font-weight-bold">{{ item.expand?.hacienda?.name || 'Desconocida' }}</div>
            <div class="text-caption text-grey-darken-1">{{ item.expand?.solicitante?.email || 'Desconocido' }}</div>
          </template>
          <template v-slot:item.solicitud="{ item }">
            <div class="mb-1">
              <v-chip size="x-small" :color="item.tipo === 'plan_upgrade' ? 'primary' : 'secondary'">
                {{ item.tipo === 'plan_upgrade' ? 'Mejora Plan' : 'Módulo Extra' }}
              </v-chip>
            </div>
            <div v-if="item.tipo === 'plan_upgrade'" class="text-caption">
              <strong>Plan:</strong> {{ item.expand?.plan_solicitado?.nombre || '?' }}
            </div>
            <div v-if="item.modulo_solicitado && item.modulo_solicitado !== '[]'" class="text-caption">
              <strong>Módulos:</strong> {{ parseModules(item.modulo_solicitado) }}
            </div>
          </template>
          <template v-slot:item.estado="{ item }">
            <v-chip size="small" :color="item.estado === 'aprobada' ? 'success' : item.estado === 'rechazada' ? 'error' : 'warning'">
              {{ item.estado.toUpperCase() }}
            </v-chip>
          </template>
          <template v-slot:item.monto_notas="{ item }">
            <span class="text-caption text-grey-darken-2">{{ item.notas_admin || 'N/A' }}</span>
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center justify-end">
              <v-tooltip text="Ver Comprobante" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn icon="mdi-eye" size="small" color="info" variant="text" class="mr-2" v-bind="props" @click="viewReceipt(item)"></v-btn>
                </template>
              </v-tooltip>
              <template v-if="item.estado === 'pendiente'">
                <v-btn size="small" color="success" class="mr-2" @click="openApproveModal(item)">Aprobar</v-btn>
                <v-btn size="small" color="error" @click="openRejectModal(item)">Rechazar</v-btn>
              </template>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Modal Visor Comprobante -->
    <v-dialog v-model="receiptModal" max-width="800">
      <v-card>
        <v-toolbar color="primary" title="Comprobante de Pago">
            <v-spacer></v-spacer>
            <v-btn icon @click="receiptModal = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-toolbar>
        <v-card-text class="text-center pa-4">
          <img v-if="isImage" :src="receiptUrl" style="max-width: 100%; max-height: 70vh;" />
          <iframe v-else-if="isPdf" :src="receiptUrl" style="width: 100%; height: 70vh;" frameborder="0"></iframe>
          <p v-else>Formato no soportado para previsualización.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" :href="receiptUrl" target="_blank" download>Descargar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Aprobar -->
    <v-dialog v-model="approveModal" max-width="500">
      <v-card>  
        <v-card-title class="bg-green justify-center">Confirmar Aprobación</v-card-title>
        <v-card-text>
          ¿Estás seguro de aprobar esta solicitud?<br><br>
          <div v-if="selectedItem?.tipo === 'plan_upgrade'">
            Se cambiará el plan de la hacienda a <v-chip color="primary" variant="flat">{{ selectedItem?.expand?.plan_solicitado?.nombre }}</v-chip>.
          </div>
          <br>          <div v-if="selectedItem?.modulo_solicitado && selectedItem?.modulo_solicitado !== '[]'">
            Se añadirán los módulos:
            <ul class="ml-6 mt-2 text-left" style="list-style-type: disc;">
              <li v-for="(modName, idx) in parseModulesArray(selectedItem?.modulo_solicitado)" :key="idx">
                <strong>{{ modName }}</strong>
              </li>
            </ul>
          </div>
          <br>
         <p class="text-grey-darken-1">La suscripción se extenderá por 30 días a partir de hoy.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="red" variant="flat" @click="approveModal = false">Cancelar</v-btn>
          <v-btn variant="flat" color="success" :loading="processing" @click="processApprove">Aprobar y Aplicar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Rechazar -->
    <v-dialog v-model="rejectModal" max-width="500">
      <v-card>
        <v-card-title>Rechazar Solicitud</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="rejectReason"
            label="Motivo del rechazo (opcional)"
            rows="3"
            variant="outlined"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="rejectModal = false">Cancelar</v-btn>
          <v-btn color="error" :loading="processing" @click="processReject">Rechazar Definitivamente</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMsg }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'

const currentDate = ref(new Date())
const loading = ref(false)
const todasTransacciones = ref([])
const processing = ref(false)
const modulesMap = ref({})
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const currentYear = computed(() => currentDate.value.getFullYear())
const monthName = computed(() => monthNames[currentDate.value.getMonth()])

const prevMonth = () => {
  const prev = new Date(currentDate.value)
  prev.setMonth(prev.getMonth() - 1)
  currentDate.value = prev
  fetchData()
}

const nextMonth = () => {
  const nxt = new Date(currentDate.value)
  nxt.setMonth(nxt.getMonth() + 1)
  currentDate.value = nxt
  fetchData()
}

const extractAmount = (notas) => {
  if (!notas) return 0
  const match = notas.match(/Monto Total:\s*(\d+(\.\d+)?)/i)
  return match ? parseFloat(match[1]) : 0
}

const showSnackbar = (msg, color = 'success') => {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

const exportToExcel = () => {
  if (transacciones.value.length === 0) {
    showSnackbar('No hay datos para exportar', 'warning')
    return
  }
  
  let csv = 'Fecha,Hacienda,Solicitante,Tipo,Estado,Monto\n'
  transacciones.value.forEach(item => {
    const hacienda = item.expand?.hacienda?.name || 'N/A'
    const solicitante = item.expand?.solicitante?.email || 'N/A'
    const tipo = item.tipo === 'plan_upgrade' ? 'Mejora Plan' : 'Módulo Extra'
    const estado = item.estado.toUpperCase()
    const monto = extractAmount(item.notas_admin)
    csv += `"${item.created}","${hacienda}","${solicitante}","${tipo}","${estado}","${monto}"\n`
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `Suscripciones_${monthName.value}_${currentYear.value}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

// Modals
const receiptModal = ref(false)
const receiptUrl = ref('')
const selectedItem = ref(null)
const isImage = ref(false)
const isPdf = ref(false)

const approveModal = ref(false)
const rejectModal = ref(false)
const rejectReason = ref('')

const headers = [
  { title: 'Fecha', key: 'fecha_solicitud' },
  { title: 'Hacienda / Solicitante', key: 'hacienda_solicitante' },
  { title: 'Solicitud', key: 'solicitud' },
  { title: 'Estado', key: 'estado' },
  { title: 'Monto / Notas', key: 'monto_notas' },
  { title: 'Acciones', key: 'actions', align: 'end' }
]

onMounted(() => {
  fetchData()
})

const fetchData = async () => {
  loading.value = true
  try {
    const modulosRes = await pb.collection('modulos').getList(1, 200)
    const map = {}
    modulosRes.items.forEach(m => { map[m.id] = m.name })
    modulesMap.value = map

    const res = await pb.collection('solicitudes_suscripcion').getList(1, 500, {
      sort: '-fecha_solicitud'
    })

    const [haciendasRes, planesRes] = await Promise.all([
      pb.collection('Haciendas').getList(1, 500).catch(() => ({ items: [] })),
      pb.collection('planes').getList(1, 200).catch(() => ({ items: [] }))
    ])
    const haciendasMap = {}
    haciendasRes.items.forEach(h => { haciendasMap[h.id] = h })
    const planesMap = {}
    planesRes.items.forEach(p => { planesMap[p.id] = p })

    todasTransacciones.value = res.items.map(item => ({
      ...item,
      expand: {
        hacienda: haciendasMap[item.hacienda] || null,
        plan_solicitado: planesMap[item.plan_solicitado] || null
      }
    }))
  } catch (error) {
    console.error("Error fetching", error)
    showSnackbar('Error al cargar datos', 'error')
  } finally {
    loading.value = false
  }
}

const transacciones = computed(() => {
  const y = currentYear.value
  const m = currentDate.value.getMonth()
  
  return todasTransacciones.value.filter(item => {
    const itemDateStr = item.fecha_solicitud || item.created || new Date().toISOString()
    const itemDate = new Date(itemDateStr)
    const isCurrentMonth = itemDate.getFullYear() === y && itemDate.getMonth() === m
    
    return isCurrentMonth
  }).map(item => {
    return {
      ...item,
      fecha_solicitud: new Date(item.fecha_solicitud || item.created || new Date()).toLocaleDateString()
    }
  })
})

const totalMensual = computed(() => {
  const y = currentYear.value
  const m = currentDate.value.getMonth()
  
  let tempMensual = 0
  todasTransacciones.value.forEach(item => {
    const itemDateStr = item.fecha_solicitud || item.created || new Date().toISOString()
    const itemDate = new Date(itemDateStr)
    const isCurrentMonth = itemDate.getFullYear() === y && itemDate.getMonth() === m
    
    if (isCurrentMonth && item.estado === 'aprobada') {
      tempMensual += extractAmount(item.notas_admin)
    }
  })
  
  return tempMensual
})

const parseModulesArray = (jsonString) => {
  if (!jsonString) return []
  try {
    // Handle legacy simple string IDs or JSON array
    let ids = []
    if (jsonString.startsWith('[')) {
      ids = JSON.parse(jsonString)
    } else {
      ids = [jsonString]
    }
    return ids.map(id => modulesMap.value[id] || id)
  } catch (e) {
    return [jsonString]
  }
}

const parseModules = (jsonString) => {
  const names = parseModulesArray(jsonString)
  return names.join(', ')
}

const viewReceipt = (item) => {
  selectedItem.value = item
  receiptUrl.value = pb.files.getUrl(item, item.comprobante)

  const ext = item.comprobante.split('.').pop().toLowerCase()
  isImage.value = ['jpg', 'jpeg', 'png'].includes(ext)
  isPdf.value = ext === 'pdf'

  receiptModal.value = true
}

const openApproveModal = (item) => {
  selectedItem.value = item
  approveModal.value = true
}

const openRejectModal = (item) => {
  selectedItem.value = item
  rejectReason.value = ''
  rejectModal.value = true
}

const processApprove = async () => {
  processing.value = true
  try {
    const haciendaId = selectedItem.value.hacienda
    const itemData = selectedItem.value

    if (haciendaId) {
      // Flujo Normal para Haciendas
      const hacienda = await pb.collection('Haciendas').getOne(haciendaId)
      const haciendaPayload = {}

      if (itemData.tipo === 'plan_upgrade') {
        haciendaPayload.plan = itemData.plan_solicitado

        // 1. Cálculo de Co-Terming / Prorrateo Directo
        const currentEndStr = hacienda.subscription_end
        const now = new Date()
        let baseDate = now
        if (currentEndStr) {
            const currentEnd = new Date(currentEndStr)
            if (currentEnd > now) {
                baseDate = currentEnd
            }
        }
        const newEndDate = new Date(baseDate)
        
        // Detectar si es ciclo anual desde las notas
        let extraDays = 30
        if (itemData.notas_admin && itemData.notas_admin.toLowerCase().includes('anual')) {
            extraDays = 365
        }
        newEndDate.setDate(newEndDate.getDate() + extraDays)
        
        haciendaPayload.subscription_end = newEndDate.toISOString()
        
        // 2. Validación y Ejecución de Downgrade
        const currentPlanId = hacienda.plan
        if (currentPlanId) {
            const currentPlan = await pb.collection('Planes').getOne(currentPlanId)
            const newPlan = await pb.collection('Planes').getOne(itemData.plan_solicitado)
            
            const isDowngrade = (newPlan.operadores < currentPlan.operadores) || (newPlan.auditores < currentPlan.auditores)
            
            if (isDowngrade) {
                const usersToSuspend = await pb.collection('users').getFullList({
                    filter: `hacienda = "${haciendaId}" && role != "administrador" && role != "asesor"`
                })
                for (const u of usersToSuspend) {
                    await pb.collection('users').update(u.id, { status: 'suspended' })
                }
                itemData.notas_admin = (itemData.notas_admin || '') + '\n[Downgrade: Se suspendieron operadores/auditores excedentes]'
            }
        }
      }

      // Actualización de Módulos (tanto en plan_upgrade unificado como modulo_addon)
      if (itemData.modulo_solicitado !== undefined && itemData.modulo_solicitado !== null) {
        const currentModules = hacienda.active_modules || []
        let newModules = []
        try {
          newModules = itemData.modulo_solicitado.startsWith('[') ? JSON.parse(itemData.modulo_solicitado) : [itemData.modulo_solicitado]
        } catch (e) {
          if (itemData.modulo_solicitado.trim() !== '') {
            newModules = [itemData.modulo_solicitado]
          }
        }
        
        if (itemData.notas_admin && itemData.notas_admin.includes('Unificada')) {
          haciendaPayload.active_modules = newModules
        } else {
          newModules.forEach(modId => {
            if (!currentModules.includes(modId)) {
                currentModules.push(modId)
            }
          })
          haciendaPayload.active_modules = currentModules
        }
      }

      await pb.collection('Haciendas').update(haciendaId, haciendaPayload)

    } else {
      // Flujo para Asesores o Usuarios SIN Hacienda (Creación en coleccion subscriptions)
      if (itemData.modulo_solicitado) {
        let newModules = []
        try {
          newModules = itemData.modulo_solicitado.startsWith('[') ? JSON.parse(itemData.modulo_solicitado) : [itemData.modulo_solicitado]
        } catch (e) {
          if (itemData.modulo_solicitado.trim() !== '') {
            newModules = [itemData.modulo_solicitado]
          }
        }

        const start = new Date()
        let extraDays = 30
        if (itemData.notas_admin && itemData.notas_admin.toLowerCase().includes('anual')) {
          extraDays = 365
        }
        const end = new Date(start)
        end.setDate(end.getDate() + extraDays)

        for (const modId of newModules) {
          await pb.collection('subscriptions').create({
            user: itemData.solicitante,
            modulo: modId,
            is_active: true,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            billing_cycle: extraDays === 365 ? 'yearly' : 'monthly'
          })
        }
      }
    }

    // 4. Patch a Solicitud (marcar como aprobada)
    await pb.collection('solicitudes_suscripcion').update(itemData.id, {
      estado: 'aprobada',
      notas_admin: (itemData.notas_admin || '') + '\n[Aprobado por SuperAdmin]',
      fecha_resolucion: new Date().toISOString()
    })

    showSnackbar('Solicitud aprobada y procesada correctamente', 'success')
    approveModal.value = false
    fetchData()
  } catch (e) {
    console.error(e)
    showSnackbar('Error al aprobar', 'error')
  } finally {
    processing.value = false
  }
}

const processReject = async () => {
  processing.value = true
  try {
    await pb.collection('solicitudes_suscripcion').update(selectedItem.value.id, {
      estado: 'rechazada',
      notas_admin: (selectedItem.value.notas_admin || '') + '\n[Rechazado]: ' + (rejectReason.value || 'Sin motivo'),
      fecha_resolucion: new Date().toISOString()
    })

    showSnackbar('Solicitud rechazada', 'success')
    rejectModal.value = false
    fetchData()
  } catch (e) {
    console.error(e)
    showSnackbar('Error al rechazar', 'error')
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.superadmin-suscripciones {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
