import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { useHaciendaStore } from './haciendaStore'
import { useSyncStore } from '@/stores/sync/index'
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
    filterStatus: 'all',
    cachedMonths: {}
  }),

  persist: {
    key: 'finanzas',
    storage: localStorage,
    paths: ['registros', 'currentMonth', 'filterStatus', 'cachedMonths']
  },

  sync: {
    collectionName: 'finanzas',
    stateProp: 'registros',
    hooks: {
      onCreate: function(item) {
        this.updateMonthCache([item])
      },
      onUpdate: function(id, data) {
        this.updateMonthCache([data])
      }
    }
  },

  getters: {
    _registrosPorMesCache: (state) => {
      const start = startOfMonth(state.currentMonth)
      const end = endOfMonth(state.currentMonth)

      return state.registros.filter((registro) => {
        const fecha = parseISO(registro.fecha)
        return fecha >= start && fecha <= end
      })
    },

    registrosPorMes: (state) => {
      return state._registrosPorMesCache || []
    },

    totalMes: (state) => {
      const start = startOfMonth(state.currentMonth)
      const end = endOfMonth(state.currentMonth)

      return state.registros
        .filter((registro) => {
          const fecha = parseISO(registro.fecha)
          return fecha >= start && fecha <= end
        })
        .reduce((total, registro) => total + (registro.monto || 0), 0)
    },

    registrosPorCategoria: (state) => {
      const categorias = {}
      const start = startOfMonth(state.currentMonth)
      const end = endOfMonth(state.currentMonth)

      state.registros
        .filter((registro) => {
          const fecha = parseISO(registro.fecha)
          return fecha >= start && fecha <= end
        })
        .forEach((registro) => {
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
    },

    totalesPorUsuario: (state) => {
      const totales = {}
      const start = startOfMonth(state.currentMonth)
      const end = endOfMonth(state.currentMonth)

      state.registros
        .filter((registro) => {
          const fecha = parseISO(registro.fecha)
          return fecha >= start && fecha <= end
        })
        .forEach((registro) => {
          const userId = registro.pagado_por
          const userName = registro.expand?.pagado_por?.name || 'Usuario sin nombre'

          if (!totales[userId]) {
            totales[userId] = {
              nombre: userName,
              total: 0,
              registros: 0
            }
          }

          totales[userId].total += registro.monto || 0
          totales[userId].registros += 1
        })

      return Object.entries(totales)
        .map(([userId, data]) => ({
          userId,
          nombre: data.nombre,
          total: data.total,
          registros: data.registros
        }))
        .sort((a, b) => b.total - a.total)
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
      const haciendaStore = useHaciendaStore()

      this.loading = true

      try {
        const registros = await syncStore.loadFromLocalStorage('finanzas')
        if (registros?.length) {
          this.registros = registros
          return registros
        }

        if (!syncStore.isOnline) {
          this.registros = []
          return []
        }

        const records = await pb.collection('finanzas').getFullList({
          filter: `Haciendas='${haciendaStore.mi_hacienda?.id}'`,
          expand: 'registro_por,pagado_por'
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

    async cargarRegistrosPorMes(year, month) {
      const cacheKey = `${year}-${month}`

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

        const startDate = new Date(year, Number(month), 1)
        const endDate = new Date(year, Number(month) + 1, 0)

        const records = await pb.collection('finanzas').getList(1, 100, {
          filter: `Haciendas='${haciendaStore.mi_hacienda?.id}' && fecha >= '${startDate.toISOString()}' && fecha <= '${endDate.toISOString()}'`,
          sort: '-fecha',
          expand: 'registro_por,pagado_por'
        })

        const existingIds = this.registros.map((r) => r.id)
        const newRecords = records.items.filter((r) => !existingIds.includes(r.id))

        if (newRecords.length > 0) {
          this.registros = [...this.registros, ...newRecords]
          syncStore.saveToLocalStorage('finanzas', this.registros)
        }

        this.cachedMonths[cacheKey] = true

        return this.registros
      } catch (error) {
        handleError(error, `Error al cargar registros de ${month + 1}/${year}`)
        return this.registros
      } finally {
        this.loading = false
      }
    },

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
            handleError(e, 'Error parseando fecha')
          }
        }
      })
    },

    async changeMonth(direction) {
      this.currentMonth =
        direction === 'next' ? addMonths(this.currentMonth, 1) : subMonths(this.currentMonth, 1)

      const year = getYear(this.currentMonth)
      const month = getMonth(this.currentMonth)

      await this.cargarRegistrosPorMes(year, month)
    },

    async crearRegistro(registroData) {
      const syncStore = useSyncStore()
      const uiFeedbackStore = useUiFeedbackStore()
      const haciendaStore = useHaciendaStore()
      uiFeedbackStore.showLoading()

      const processedData = { ...registroData }

      if (processedData.fecha) {
        try {
          let dateStr = processedData.fecha
          if (dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0]
          }

          const dateObj = parseISO(dateStr)
          const nextDay = new Date(dateObj)
          nextDay.setDate(nextDay.getDate() + 1)
          processedData.fecha = format(nextDay, 'yyyy-MM-dd')
        } catch (error) {
          handleError(error, 'Error processing date')
        }
      }

      const enrichedData = {
        ...processedData,
        Haciendas: haciendaStore.mi_hacienda?.id,
        version: this.version
      }

      if (!syncStore.isOnline) {
        const tempId = syncStore.generateTempId()

        const tempRegistro = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.registros.unshift(tempRegistro)
        syncStore.saveToLocalStorage('finanzas', this.registros)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'finanzas',
          data: enrichedData,
          tempId
        })

        uiFeedbackStore.hideLoading()
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
        uiFeedbackStore.hideLoading()
      }
    },

    async updateRegistro(id, updateData) {
      const syncStore = useSyncStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      const processedData = { ...updateData }

      if (processedData.fecha) {
        try {
          let dateStr = processedData.fecha
          if (dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0]
          }

          const dateObj = parseISO(dateStr)
          const nextDay = new Date(dateObj)
          nextDay.setDate(nextDay.getDate() + 1)
          processedData.fecha = format(nextDay, 'yyyy-MM-dd')
        } catch (error) {
          handleError(error, 'Error processing date')
        }
      }

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de registro no proporcionado para actualización')
      }

      const registro = this.registros.find((r) => r.id === id)
      if (!registro) {
        uiFeedbackStore.hideLoading()
        throw new Error(`No se encontró registro con ID: ${id}`)
      }

      if (!syncStore.isOnline) {
        const index = this.registros.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.registros[index] = {
            ...this.registros[index],
            ...processedData,
            updated: new Date().toISOString()
          }
          syncStore.saveToLocalStorage('finanzas', this.registros)
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'finanzas',
          id,
          data: processedData
        })

        uiFeedbackStore.hideLoading()
        return this.registros[index]
      }

      try {
        const record = await pb.collection('finanzas').update(id, processedData)
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
        uiFeedbackStore.hideLoading()
      }
    },

    async eliminarRegistro(id) {
      const syncStore = useSyncStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      if (!id) {
        uiFeedbackStore.hideLoading()
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

        uiFeedbackStore.hideLoading()
        return true
      }

      try {
        await pb.collection('finanzas').delete(id)
        this.registros = this.registros.filter((r) => r.id !== id)
        syncStore.saveToLocalStorage('finanzas', this.registros)
        useUiFeedbackStore().showSnackbar('Registro financiero eliminado exitosamente')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar registro financiero')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    setFilterStatus(status) {
      this.filterStatus = status
    },

    async exportToExcel(yearParam = null, monthParam = null) {
      const uiFeedbackStore = useUiFeedbackStore()
      const haciendaStore = useHaciendaStore()

      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ]

      uiFeedbackStore.showLoading()

      try {
        let year = yearParam
        let month = monthParam

        if (year === null || typeof year === 'object') {
          year = getYear(this.currentMonth)
        }

        if (month === null || typeof month === 'object') {
          month = getMonth(this.currentMonth)
        }

        year = Number(year)
        month = Number(month)

        const cacheKey = `${year}-${month}`
        if (!this.cachedMonths[cacheKey]) {
          await this.cargarRegistrosPorMes(year, month)
        }

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

        registrosDelMes.sort((a, b) => {
          const fechaA = parseISO(a.fecha)
          const fechaB = parseISO(b.fecha)
          return fechaA - fechaB
        })

        const { utils, writeFile } = await import('xlsx')

        const wb = utils.book_new()

        const haciendaInfo = [
          ['REPORTE FINANCIERO'],
          [`Hacienda: ${haciendaStore.mi_hacienda?.name || 'N/A'}`],
          [`Período: ${meses[month]} ${year}`],
          [`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
          [''],
          ['']
        ]

        const defaultHeaders = [
          'Fecha', 'Detalle', 'Razón Social', 'Factura o Recibo',
          'Centro de Costo', 'Pagado por', 'Monto'
        ]

        const userMap = new Map(
          haciendaStore.haciendaUsers.map(u => [
            u.id,
            {
              ...u,
              fullName: `${u.name || ''} ${u.lastname || ''}`.trim()
            }
          ])
        )

        const registrosData =
          registrosDelMes.length > 0
            ? registrosDelMes.map((reg) => {
                const pagadoPorUser = userMap.get(reg.pagado_por)
                const nombrePagadoPor = pagadoPorUser?.fullName || reg.expand?.pagado_por?.name || ''

                return {
                  Fecha: format(parseISO(reg.fecha), 'dd/MM/yyyy'),
                  Detalle: reg.detalle + (reg.comentarios ? ' | ' + reg.comentarios : '') || '',
                  'Razón Social': reg.razon_social || '',
                  'Factura o Recibo': reg.factura || '',
                  'Centro de Costo': reg.costo || '',
                  'Pagado por': nombrePagadoPor,
                  Monto: reg.monto || 0
                }
              })
            : [{}]

        const totalsPorCategoria = {}
        registrosDelMes.forEach((reg) => {
          const categoria = reg.costo || 'Sin categoría'
          totalsPorCategoria[categoria] = (totalsPorCategoria[categoria] || 0) + (reg.monto || 0)
        })

        const totalsPorUsuario = {}
        registrosDelMes.forEach((reg) => {
          const pagadoPorUser = userMap.get(reg.pagado_por)
          const nombrePagadoPor = pagadoPorUser?.fullName || reg.expand?.pagado_por?.name || 'Usuario sin nombre'

          if (!totalsPorUsuario[nombrePagadoPor]) {
            totalsPorUsuario[nombrePagadoPor] = 0
          }
          totalsPorUsuario[nombrePagadoPor] += reg.monto || 0
        })

        const totalesData = [[''], ['TOTALES POR CATEGORÍA'], ['']]

        Object.entries(totalsPorCategoria).forEach(([categoria, monto]) => {
          totalesData.push([categoria, '', '', '', '', '', monto])
        })

        totalesData.push([''])
        totalesData.push(['TOTALES POR USUARIO'])
        totalesData.push([''])

        Object.entries(totalsPorUsuario)
          .sort(([,a], [,b]) => b - a)
          .forEach(([usuario, monto]) => {
            totalesData.push([usuario, '', '', '', '', '', monto])
          })

        totalesData.push([''])
        totalesData.push([
          'TOTAL GENERAL', '', '', '', '',
          registrosDelMes.reduce((sum, reg) => sum + (reg.monto || 0), 0)
        ])

        totalesData.push(
          [''],
          [`solicitado por :`],
          [`aprobado por gerencia:`],
          [`aprobado por gerencia:`],
          ['aprobado por contabilidad:'],
          ['']
        )

        const headerRow =
          registrosDelMes.length > 0 ? Object.keys(registrosData[0]) : defaultHeaders

        const wsData = [
          ...haciendaInfo,
          headerRow,
          ...(registrosDelMes.length > 0 ? registrosData.map(Object.values) : [[]]),
          ...totalesData
        ]

        const ws = utils.aoa_to_sheet(wsData)

        const colWidths = [
          { wch: 12 }, { wch: 40 }, { wch: 30 }, { wch: 15 },
          { wch: 20 }, { wch: 20 }, { wch: 15 }
        ]

        ws['!cols'] = colWidths

        utils.book_append_sheet(wb, ws, 'Finanzas')

        const fileName = `Finanzas_${haciendaStore.mi_hacienda?.name || 'Hacienda'}_${meses[month].substring(0, 3)}_${year}.xlsx`

        writeFile(wb, fileName)

        uiFeedbackStore.showSnackbar('Datos exportados exitosamente', 'success')
      } catch (error) {
        handleError(error, 'Error al exportar datos')
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async importarCostosNomina(semanaInicio, semanaFin) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      try {
        const { useNominaStore } = await import('./nominaStore')
        const nominaStore = useNominaStore()
        await nominaStore.cargarHistoricoNomina()

        const nominasAImportar = nominaStore.nominas.filter(n => {
          const fin = n.semana_fin ? n.semana_fin.split('T')[0] : ''
          return fin >= semanaInicio && fin <= semanaFin
        })

        let creados = 0
        for (const nomina of nominasAImportar) {
          const facturaRef = `NOM-${nomina.id}`
          const existe = this.registros.some(r => r.factura === facturaRef)
          if (!existe) {
            await this.crearRegistro({
              fecha: nomina.semana_fin,
              detalle: `Costo Mano de Obra: Nómina del ${nomina.semana_inicio} al ${nomina.semana_fin}`,
              razon_social: 'Planilla de Operarios',
              factura: facturaRef,
              costo: 'HONORARIOS',
              monto: Number(nomina.total_pagado) || 0
            })
            creados++
          }
        }

        uiFeedbackStore.showSnackbar(`Se importaron ${creados} nóminas a finanzas`, 'success')
        return creados
      } catch (error) {
        handleError(error, 'Error al importar costos de nómina')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('finanzas', tempId, newItem, this.registros)
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem('finanzas', tempId, realId, this.registros)
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('finanzas', id, this.registros)
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore()
      const localRegistros = await syncStore.loadFromLocalStorage('finanzas')
      this.registros = localRegistros || []
      console.log('[FINANZA_STORE] Initialized from localStorage. Registros:', this.registros.length)
    }
  }
})
