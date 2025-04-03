import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useHaciendaStore } from './haciendaStore'
import { useSyncStore } from './syncStore'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  parseISO,
  getMonth,
  getYear
} from 'date-fns'

export const useFinanzaStore = defineStore('finanzas', {
  state: () => ({
    registros: [],
    loading: false,
    error: null,
    version: 1,
    lastSync: null,
    currentMonth: new Date(),
    filterStatus: 'all', // 'all', 'paid', 'pending'
    cachedMonths: {} // Caché para registros por mes
  }),

  persist: {
    key: 'finanzas',
    storage: sessionStorage,
    paths: ['registros', 'currentMonth', 'filterStatus', 'cachedMonths']
  },

  getters: {
    registrosPorMes: (state) => {
      const start = startOfMonth(state.currentMonth)
      const end = endOfMonth(state.currentMonth)

      return state.registros.filter((registro) => {
        const fecha = parseISO(registro.fecha)
        return fecha >= start && fecha <= end
      })
    },

    totalMes: (state) => {
      return state.registrosPorMes.reduce((total, registro) => total + (registro.monto || 0), 0)
    },

    registrosPorCategoria: (state) => {
      const categorias = {}
      state.registrosPorMes.forEach((registro) => {
        const categoria = registro.costo || 'sin_categoria'
        if (!categorias[categoria]) {
          categorias[categoria] = 0
        }
        categorias[categoria] += registro.monto || 0
      })
      return categorias
    },

    mesActual: (state) => {
      return format(state.currentMonth, 'MMMM yyyy')
    }
  },

  actions: {
    async init() {
      try {
        await this.cargarRegistros()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar finanzas')
        return false
      }
    },

    async cargarRegistros() {
      const syncStore = useSyncStore()
      this.loading = true

      try {
        // Cargar todos los registros, no solo los del mes actual
        const registros = syncStore.loadFromLocalStorage('finanzas')
        if (registros?.length) {
          this.registros = registros
          return registros
        }

        if (!syncStore.isOnline) {
          this.registros = []
          return []
        }

        const records = await pb.collection('finanzas').getFullList({
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'registro_por,pagado_por' // Asegurar que se expandan las relaciones
        })
        this.registros = records
        syncStore.saveToLocalStorage('finanzas', records)
        return records
      } catch (error) {
        handleError(error, 'Error al cargar registros financieros')
        return []
      } finally {
        this.loading = false
      }
    },

    // Nuevo método para cargar registros por mes específico
    async cargarRegistrosPorMes(year, month) {
      const cacheKey = `${year}-${month}`

      // Si ya tenemos este mes en caché, no hacer nada
      if (this.cachedMonths[cacheKey]) {
        return this.registros
      }

      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.loading = true

      try {
        if (!syncStore.isOnline) {
          return this.registros
        }

        // Construir fechas de inicio y fin del mes
        const startDate = new Date(year, Number(month), 1)
        const endDate = new Date(year, Number(month) + 1, 0)

        // Filtrar por fecha y hacienda
        const records = await pb.collection('finanzas').getList(1, 100, {
          filter: `Haciendas="${haciendaStore.mi_hacienda?.id}" && fecha >= "${format(startDate, 'yyyy-MM-dd')}" && fecha <= "${format(endDate, 'yyyy-MM-dd')}"`,
          sort: '-fecha',
          expand: 'registro_por,pagado_por'
        })

        // Combinar con registros existentes, evitando duplicados
        const existingIds = this.registros.map((r) => r.id)
        const newRecords = records.items.filter((r) => !existingIds.includes(r.id))

        if (newRecords.length > 0) {
          this.registros = [...this.registros, ...newRecords]
          syncStore.saveToLocalStorage('finanzas', this.registros)
        }

        // Marcar este mes como cacheado
        this.cachedMonths[cacheKey] = true

        return this.registros
      } catch (error) {
        handleError(error, `Error al cargar registros de ${month + 1}/${year}`)
        return this.registros
      } finally {
        this.loading = false
      }
    },

    // Método para actualizar caché por mes
    updateMonthCache(records) {
      if (!records || !records.length) return

      records.forEach((record) => {
        if (record.fecha) {
          try {
            const fecha = parseISO(record.fecha)
            const year = getYear(fecha)
            const month = getMonth(fecha)
            const cacheKey = `${year}-${month}`
            this.cachedMonths[cacheKey] = true
          } catch (e) {
            console.error('Error parseando fecha:', e)
          }
        }
      })
    },

    // Modificar changeMonth para cargar datos del nuevo mes seleccionado
    async changeMonth(direction) {
      this.currentMonth =
        direction === 'next' ? addMonths(this.currentMonth, 1) : subMonths(this.currentMonth, 1)

      // Cargar datos del nuevo mes si no están en caché
      const year = getYear(this.currentMonth)
      const month = getMonth(this.currentMonth)

      await this.cargarRegistrosPorMes(year, month)
    },

    async crearRegistro(registroData) {
      const syncStore = useSyncStore()
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      // Enriquecer datos con contexto de hacienda
      const enrichedData = {
        ...registroData,
        Haciendas: haciendaStore.mi_hacienda?.id,
        version: this.version
      }

      if (!syncStore.isOnline) {
        // Usar la función unificada para generar ID temporal
        const tempId = syncStore.generateTempId()

        const tempRegistro = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true // Marcar como temporal
        }

        this.registros.unshift(tempRegistro)
        syncStore.saveToLocalStorage('finanzas', this.registros)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'finanzas',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        return tempRegistro
      }

      try {
        const record = await pb.collection('finanzas').create(enrichedData)
        this.registros.unshift(record)
        syncStore.saveToLocalStorage('finanzas', this.registros)
        return record
      } catch (error) {
        handleError(error, 'Error al crear registro')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateRegistro(id, updateData) {
      const syncStore = useSyncStore()
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de registro no proporcionado para actualización')
      }

      const registro = this.registros.find((r) => r.id === id)
      if (!registro) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró registro con ID: ${id}`)
      }

      if (!syncStore.isOnline) {
        const index = this.registros.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.registros[index] = {
            ...this.registros[index],
            ...updateData,
            updated: new Date().toISOString()
          }
          syncStore.saveToLocalStorage('finanzas', this.registros)
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'finanzas',
          id,
          data: updateData
        })

        snackbarStore.hideLoading()
        return this.registros[index]
      }

      try {
        const record = await pb.collection('finanzas').update(id, updateData)
        const index = this.registros.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.registros[index] = record
        }
        syncStore.saveToLocalStorage('finanzas', this.registros)
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar registro')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async eliminarRegistro(id) {
      const syncStore = useSyncStore()
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de registro no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        this.registros = this.registros.filter((r) => r.id !== id)
        syncStore.saveToLocalStorage('finanzas', this.registros)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'finanzas',
          id
        })

        snackbarStore.hideLoading()
        return true
      }

      try {
        await pb.collection('finanzas').delete(id)
        this.registros = this.registros.filter((r) => r.id !== id)
        syncStore.saveToLocalStorage('finanzas', this.registros)
        useSnackbarStore().showSnackbar('Registro financiero eliminado exitosamente')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar registro financiero')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    setFilterStatus(status) {
      this.filterStatus = status
    },

    // Métodos para Excel import/export
    async exportToExcel(yearParam = null, monthParam = null) {
      const snackbarStore = useSnackbarStore()
      const haciendaStore = useHaciendaStore()

      // Definir los nombres de los meses en español
      const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre'
      ]

      snackbarStore.showLoading()

      try {
        // Si no se especifican año y mes, usar el mes actual
        // Asegurarse de que los parámetros son números, no eventos de interfaz
        let year = yearParam
        let month = monthParam

        if (year === null || typeof year === 'object') {
          year = getYear(this.currentMonth)
        }

        if (month === null || typeof month === 'object') {
          month = getMonth(this.currentMonth)
        }

        // Asegurarnos que sean números
        year = Number(year)
        month = Number(month)

        // Verificar si los datos del mes están en caché, si no, cargarlos
        const cacheKey = `${year}-${month}`
        if (!this.cachedMonths[cacheKey]) {
          await this.cargarRegistrosPorMes(year, month)
        }

        // Filtrar los registros del mes seleccionado
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)

        const registrosDelMes = this.registros.filter((reg) => {
          try {
            const fecha = parseISO(reg.fecha)
            return fecha >= startDate && fecha <= endDate
          } catch (e) {
            return false
          }
        })

        // Importar XLSX dinámicamente
        const { utils, writeFile } = await import('xlsx')

        // Crear un libro de Excel
        const wb = utils.book_new()

        // Información de cabecera
        const haciendaInfo = [
          ['REPORTE FINANCIERO'],
          [`Hacienda: ${haciendaStore.mi_hacienda?.name || 'N/A'}`],
          [`Período: ${meses[month]} ${year}`],
          [`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
          [''],
          [''] // Fila en blanco para separar
        ]

        // Headers para el caso de que no haya registros
        const defaultHeaders = [
          'Fecha',
          'Detalle',
          'Razón Social',
          'N° Factura',
          'Categoría',
          'Monto',
          'Comentarios',
          'Registrado por',
          'Pagado por'
        ]

        // Datos de los registros
        const registrosData =
          registrosDelMes.length > 0
            ? registrosDelMes.map((reg) => ({
                Fecha: format(parseISO(reg.fecha), 'dd/MM/yyyy'),
                Detalle: reg.detalle || '',
                'Razón Social': reg.razon_social || '',
                'N° Factura': reg.factura || '',
                Categoría: reg.costo || '',
                Monto: reg.monto || 0,
                Comentarios: reg.comentarios || '',
                'Registrado por': reg.expand?.registro_por?.name || '',
                'Pagado por': reg.expand?.pagado_por?.name || ''
              }))
            : [{}] // Objeto vacío si no hay registros

        // Agrupar montos por categoría
        const totalsPorCategoria = {}
        registrosDelMes.forEach((reg) => {
          const categoria = reg.costo || 'Sin categoría'
          totalsPorCategoria[categoria] = (totalsPorCategoria[categoria] || 0) + (reg.monto || 0)
        })

        // Convertir los totales a un formato para Excel
        const totalesData = [[''], ['TOTALES POR CATEGORÍA'], ['']]

        Object.entries(totalsPorCategoria).forEach(([categoria, monto]) => {
          totalesData.push([categoria, '', '', '', '', monto])
        })

        totalesData.push([''])
        totalesData.push([
          'TOTAL GENERAL',
          '',
          '',
          '',
          '',
          registrosDelMes.reduce((sum, reg) => sum + (reg.monto || 0), 0)
        ])

        // Crear hoja con cabecera e información
        const headerRow =
          registrosDelMes.length > 0 ? Object.keys(registrosData[0]) : defaultHeaders

        const wsData = [
          ...haciendaInfo,
          headerRow, // Nombres de columnas
          ...(registrosDelMes.length > 0 ? registrosData.map(Object.values) : [[]]),
          ...totalesData
        ]

        const ws = utils.aoa_to_sheet(wsData)

        // Agregar estilos (ancho de columnas)
        const colWidths = [
          { wch: 12 }, // Fecha
          { wch: 40 }, // Detalle
          { wch: 30 }, // Razón Social
          { wch: 15 }, // N° Factura
          { wch: 20 }, // Categoría
          { wch: 15 }, // Monto
          { wch: 40 }, // Comentarios
          { wch: 20 }, // Registrado por
          { wch: 20 } // Pagado por
        ]

        ws['!cols'] = colWidths

        // Añadir hoja al libro
        utils.book_append_sheet(wb, ws, 'Finanzas')

        // Generar nombre de archivo con fecha
        const fileName = `Finanzas_${haciendaStore.mi_hacienda?.name || 'Hacienda'}_${meses[month].substring(0, 3)}_${year}.xlsx`

        // Guardar archivo
        writeFile(wb, fileName)

        snackbarStore.showSnackbar('Datos exportados exitosamente', 'success')
      } catch (error) {
        handleError(error, 'Error al exportar datos')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    // Método para actualizar un elemento local
    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('finanzas', tempId, newItem, this.registros)
    },

    // Método para actualizar referencias
    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem('finanzas', tempId, realId, this.registros)
    },

    // Método para eliminar un elemento local
    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('finanzas', id, this.registros)
    }
  }
})
