<template>
  <v-dialog v-model="dialogVisible" max-width="800px" persistent>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>Importar desde Excel</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="dialogVisible = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text>
        <v-alert type="info" class="mb-4">
          El archivo Excel debe tener las siguientes columnas en el orden indicado, <br />INICIANDO
          DESDE LA CELDA A1:
          <ul class="mt-2">
            <li>Fecha (dd/MM/yyyy)</li>
            <li>Detalle</li>
            <li>Razón Social</li>
            <li>N° Factura</li>
            <li>Categoría</li>
            <li>Monto</li>
            <li>Comentarios</li>
            <li>Pagado por</li>
          </ul>
        </v-alert>

        <v-file-input
          v-model="selectedFile"
          label="Seleccionar archivo Excel"
          accept=".xlsx,.xls"
          :disabled="importing"
          @change="handleFileSelect"
          outlined
          dense
          hide-details
        ></v-file-input>

        <v-select
          v-model="selectedDateFormat"
          :items="dateFormats"
          label="Formato de fecha en el archivo"
          density="compact"
          variant="outlined"
          class="mt-4"
        ></v-select>

        <v-data-table
          v-if="previewData.length > 0"
          :headers="previewHeaders"
          :items="previewData"
          class="mt-4"
          hide-default-footer
          dense
        >
          <template v-slot:item.fecha="{ item }">
            {{ formatDate(item.fecha) }}
          </template>
          <template v-slot:item.monto="{ item }">
            {{ formatCurrency(item.monto) }}
          </template>
        </v-data-table>

        <v-progress-linear color="success" :value="importProgress" height="12">
          <strong>{{ importProgress }}%</strong>
        </v-progress-linear>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" :disabled="!selectedFile || importing" @click="startImport">
          Iniciar importación
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFinanzaStore } from '@/stores/finanzaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { read, utils } from 'xlsx'
import { format, parse } from 'date-fns'

const finanzaStore = useFinanzaStore()
const snackbarStore = useSnackbarStore()
const authStore = useAuthStore()
const haciendaStore = useHaciendaStore()

const dialogVisible = ref(false)
const selectedFile = ref(null)
const previewData = ref([])
const importing = ref(false)
const importProgress = ref(0)

const previewHeaders = [
  { text: 'Fecha', value: 'fecha' },
  { text: 'Detalle', value: 'detalle' },
  { text: 'Razón Social', value: 'razon_social' },
  { text: 'N° Factura', value: 'factura' },
  { text: 'Categoría', value: 'costo' },
  { text: 'Monto', value: 'monto' },
  { text: 'Comentarios', value: 'comentarios' },
  { text: 'Pagado por', value: 'pagado_por' }
]

const dateFormats = [
  { title: 'Día/Mes/Año (dd/MM/yyyy)', value: 'dd/MM/yyyy' },
  { title: 'Mes/Día/Año (MM/dd/yyyy)', value: 'MM/dd/yyyy' }
]

const selectedDateFormat = ref(null)

const formatDate = (dateString) => {
  try {
    return format(parse(dateString, 'dd/MM/yyyy', new Date()), 'dd/MM/yyyy')
  } catch {
    return dateString
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount || 0)
}

const parseDate = (dateString, userFormat = null) => {
  // Si es un número serial de Excel, convertirlo a fecha
  if (typeof dateString === 'number') {
    const excelEpoch = new Date(1899, 11, 30) // Fecha base de Excel (1/1/1900 es 1)
    const date = new Date(excelEpoch.getTime() + dateString * 24 * 60 * 60 * 1000)
    return date
  }

  const formats = [
    'MM/dd/yyyy', // 11/29/2021
    'dd/MM/yyyy', // 29/11/2021
    'dd MMMM, yyyy', // 12 noviembre, 2021
    'yyyy-MM-dd', // 2021-11-29
    'MMMM dd, yyyy', // noviembre 12, 2021
    'MM-dd-yyyy' // 11-29-2021
  ]

  // Si el usuario especificó un formato, intentar usarlo primero
  if (userFormat) {
    try {
      const parsedDate = parse(dateString, userFormat, new Date())
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }
    } catch {
      // Continuar con los otros formatos
    }
  }

  // Intentar detectar el formato basado en el valor
  const parts = dateString.split('/')
  if (parts.length === 3) {
    const [first, second] = parts
    // Si el primer valor es mayor a 12, asumir que es día
    if (first > 12) {
      return parse(dateString, 'dd/MM/yyyy', new Date())
    }
    // Si el segundo valor es mayor a 12, asumir que es mes
    if (second > 12) {
      return parse(dateString, 'MM/dd/yyyy', new Date())
    }
  }

  // Si no se pudo determinar, probar todos los formatos
  for (const format of formats) {
    try {
      const parsedDate = parse(dateString, format, new Date())
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }
    } catch {
      // Continuar con el siguiente formato
    }
  }

  throw new Error(`Formato de fecha no reconocido: ${dateString}`)
}

const handleFileSelect = async (file) => {
  if (!file || !file.length) {
    previewData.value = []
    return
  }

  try {
    console.log('Archivo seleccionado:', file[0])
    const data = await file[0].arrayBuffer()
    console.log('Datos del archivo convertidos a ArrayBuffer')

    const workbook = read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = utils.sheet_to_json(sheet, { header: 1 })
    console.log('Datos del Excel convertidos a JSON:', json)

    // Validar encabezados
    const headers = json[0]
    const expectedHeaders = [
      'Fecha',
      'Detalle',
      'Razón Social',
      'N° Factura',
      'Categoría',
      'Monto',
      'Comentarios',
      'Pagado por'
    ]

    if (!expectedHeaders.every((h, i) => h === headers[i])) {
      throw new Error('El formato de las columnas no coincide')
    }

    // Obtener usuarios de la hacienda desde localStorage
    const haciendaId = haciendaStore.mi_hacienda?.id
    const haciendaUsersJson = localStorage.getItem(`hacienda_users_${haciendaId}`)
    const haciendaUsers = haciendaUsersJson ? JSON.parse(haciendaUsersJson) : []
    console.log('Usuarios de la hacienda cargados:', haciendaUsers)

    // Convertir datos
    previewData.value = json.slice(1, 6).map((row) => {
      try {
        const fecha = parseDate(row[0], selectedDateFormat.value)
        const pagadoPorNombre = (row[7] || '').toUpperCase()
        const pagadoPorUsuario = haciendaUsers.find(
          (user) =>
            (user.name + ' ' + user.lastname).toUpperCase() === pagadoPorNombre ||
            user.username.toUpperCase() === pagadoPorNombre
        )

        return {
          fecha: format(fecha, 'yyyy-MM-dd'),
          detalle: (row[1] || '').toUpperCase(),
          razon_social: (row[2] || '').toUpperCase(),
          factura: row[3] || '',
          costo: (row[4] || '').toUpperCase(),
          monto: parseFloat(row[5]) || 0,
          comentarios: (row[6] || '').toUpperCase(),
          pagado_por: pagadoPorUsuario?.id || ''
        }
      } catch (error) {
        console.error(`Error en fila ${json.indexOf(row) + 1}:`, error)
        throw new Error(`Error en fila ${json.indexOf(row) + 1}: ${error.message}`)
      }
    })
  } catch (error) {
    console.error('Error al leer archivo:', error)
    snackbarStore.showSnackbar(`Error al leer archivo: ${error.message}`, 'error')
    selectedFile.value = null
    previewData.value = []
  }
}

const startImport = async () => {
  console.log('Valor de selectedFile:', selectedFile.value)

  if (!selectedFile.value) {
    console.log('No se ha seleccionado ningún archivo')
    return
  }

  importing.value = true
  importProgress.value = 0
  console.log('Importación iniciada')

  try {
    console.log('Archivo seleccionado:', selectedFile.value)
    const data = await selectedFile.value.arrayBuffer()
    console.log('Datos del archivo convertidos a ArrayBuffer')

    const workbook = read(data)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = utils.sheet_to_json(sheet, { header: 1 })
    console.log('Datos del Excel convertidos a JSON:', json)

    // Obtener usuarios de la hacienda desde el store
    const haciendaUsers = haciendaStore.haciendaUsers
    console.log('Usuarios de la hacienda cargados en FinanzasImportExcel:', haciendaUsers)

    // Si no hay usuarios, lanzar error
    if (!haciendaUsers.length) {
      throw new Error('No se encontraron usuarios de la hacienda')
    }

    // Omitir la primera fila (encabezados)
    const rows = json.slice(1)
    const totalRows = rows.length
    const batchSize = 2 // Reducir el tamaño del lote para evitar autocancelación
    console.log(`Total de filas a procesar: ${totalRows}`)

    let successCount = 0
    let errorCount = 0
    const errores = []

    // Preparar todos los registros primero para reducir procesamiento dentro del bucle
    const registros = rows
      .map((row, index) => {
        try {
          const fecha = parseDate(row[0], selectedDateFormat.value)
          const pagadoPorNombre = (row[7] || '').toUpperCase()
          const pagadoPorUsuario = haciendaUsers.find(
            (user) =>
              (user.name + ' ' + user.lastname).toUpperCase() === pagadoPorNombre ||
              user.username.toUpperCase() === pagadoPorNombre
          )

          if (!pagadoPorUsuario) {
            throw new Error(`Usuario no encontrado: ${pagadoPorNombre}`)
          }

          return {
            fecha: format(fecha, 'yyyy-MM-dd'),
            detalle: (row[1] || '').toUpperCase(),
            razon_social: (row[2] || '').toUpperCase(),
            factura: row[3] || '',
            costo: (row[4] || '').toUpperCase(),
            monto: parseFloat(row[5]) || 0,
            comentarios: (row[6] || '').toUpperCase(),
            pagado_por: pagadoPorUsuario.id,
            registro_por: authStore.user.id,
            _rowIndex: index + 2
          }
        } catch (error) {
          console.error(`Error en fila ${index + 2}:`, error)
          errorCount++
          errores.push(`Fila ${index + 2}: ${error.message}`)
          return null
        }
      })
      .filter(Boolean)

    console.log(`Registros preparados: ${registros.length}`)

    // Procesamiento por lotes optimizado
    for (let i = 0; i < registros.length; i += batchSize) {
      const batchRegistros = registros.slice(i, i + batchSize)
      console.log(
        `Procesando lote ${i / batchSize + 1} de ${Math.ceil(registros.length / batchSize)}`
      )

      // Usar Promise.allSettled con retraso entre solicitudes
      const results = await Promise.allSettled(
        batchRegistros.map((registro) => {
          const { _rowIndex, ...cleanRegistro } = registro // Eliminar el campo temporal
          return new Promise((resolve) => {
            setTimeout(
              async () => {
                try {
                  const result = await finanzaStore.crearRegistro(cleanRegistro)
                  resolve(result)
                } catch (error) {
                  resolve({ status: 'rejected', reason: error })
                }
              },
              100 * (i % batchSize)
            ) // Retraso entre solicitudes
          })
        })
      )

      // Procesar resultados de manera más eficiente
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successCount++
        } else {
          errorCount++
          errores.push(`Fila ${batchRegistros[idx]._rowIndex}: ${result.reason.message}`)
        }
      })

      // Actualizar progreso de manera más precisa
      importProgress.value = Math.round(((i + batchRegistros.length) / registros.length) * 100)
      console.log(`Progreso: ${importProgress.value}%`)
    }

    // Mostrar mensaje con detalles más claros
    let message = `Importación completada: ${successCount} registros exitosos`
    if (errorCount > 0) {
      message += `, ${errorCount} errores`

      // Limitar la cantidad de errores mostrados para evitar mensajes demasiado largos
      if (errores.length > 10) {
        message += `\nPrimeros 10 errores de ${errores.length}:\n` + errores.slice(0, 10).join('\n')
      } else {
        message += '\nErrores:\n' + errores.join('\n')
      }
    }

    console.log(message)
    snackbarStore.showSnackbar(message, successCount > 0 ? 'success' : 'error')
    dialogVisible.value = false

    // Eliminar el array de registros en localStorage para forzar una recarga desde PocketBase
    localStorage.removeItem('finanzas')

    // Forzar la recarga de registros en FinanzasConfig.vue
    await finanzaStore.cargarRegistros()
  } catch (error) {
    console.error('Error durante la importación:', error)
    snackbarStore.showSnackbar(`Error durante la importación: ${error.message}`, 'error')
  } finally {
    importing.value = false
    importProgress.value = 0
    selectedFile.value = null
    previewData.value = []
    console.log('Importación finalizada')
  }
}

defineExpose({
  open: () => (dialogVisible.value = true)
})
</script>
