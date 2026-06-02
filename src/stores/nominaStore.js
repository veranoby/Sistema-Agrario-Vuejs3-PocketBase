import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUserStore } from '@/stores/userStore'
export const useNominaStore = defineStore('nomina', {
  state: () => ({
    nominas: [],
    plantilla: [],
    loading: false,
    error: null,
    rates: {
      cajas: 0.50,
      racimos: 0.20,
      kilos: 0.10,
      unidades: 0.05
    },
    defaultJornal: 15.00
  }),

  actions: {
    async cargarHistoricoNomina() {
      const haciendaStore = useHaciendaStore()
      this.loading = true
      try {
        const records = await pb.collection('nomina_semanas').getFullList({
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          sort: '-semana_fin'
        })
        this.nominas = records
        return this.nominas
      } catch (e) {
        handleError(e, 'Error al cargar historial de nóminas')
        throw e
      } finally {
        this.loading = false
      }
    },

    async guardarNomina(nominaData) {
      const haciendaStore = useHaciendaStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      
      const payload = {
        hacienda: haciendaStore.mi_hacienda?.id,
        semana_inicio: nominaData.semana_inicio,
        semana_fin: nominaData.semana_fin,
        estado: nominaData.estado,
        total_pagado: Number(nominaData.total_pagado),
        detalles: JSON.parse(JSON.stringify(nominaData.detalles))
      }

      try {
        let record
        if (nominaData.id) {
          record = await pb.collection('nomina_semanas').update(nominaData.id, payload)
          const idx = this.nominas.findIndex(n => n.id === record.id)
          if (idx !== -1) this.nominas[idx] = record
        } else {
          record = await pb.collection('nomina_semanas').create(payload)
          this.nominas.unshift(record)
        }
        uiFeedbackStore.showSnackbar('Nómina guardada con éxito')
        return record
      } catch (e) {
        handleError(e, 'Error al guardar la nómina')
        throw e
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async eliminarNomina(id) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      try {
        await pb.collection('nomina_semanas').delete(id)
        this.nominas = this.nominas.filter(n => n.id !== id)
        uiFeedbackStore.showSnackbar('Nómina eliminada con éxito')
        return true
      } catch (e) {
        handleError(e, 'Error al eliminar nómina')
        throw e
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async cargarPlantilla() {
      const haciendaStore = useHaciendaStore()
      this.loading = true
      try {
        const records = await pb.collection('plantilla_nomina').getFullList({
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          sort: 'nombre'
        })
        this.plantilla = records
        return this.plantilla
      } catch (e) {
        handleError(e, 'Error al cargar plantilla de nómina')
        throw e
      } finally {
        this.loading = false
      }
    },

    async crearTrabajador(trabajadorData) {
      const haciendaStore = useHaciendaStore()
      const payload = {
        hacienda: haciendaStore.mi_hacienda?.id,
        nombre: trabajadorData.nombre,
        identificacion: trabajadorData.identificacion || '',
        valor_jornal: Number(trabajadorData.valor_jornal),
        activo: true,
        user_link: trabajadorData.user_link || null
      }
      try {
        const record = await pb.collection('plantilla_nomina').create(payload)
        this.plantilla.push(record)
        return record
      } catch (e) {
        handleError(e, 'Error al crear trabajador')
        throw e
      }
    },

    async actualizarTrabajador(id, trabajadorData) {
      try {
        const record = await pb.collection('plantilla_nomina').update(id, trabajadorData)
        const idx = this.plantilla.findIndex(t => t.id === id)
        if (idx !== -1) this.plantilla[idx] = record
        return record
      } catch (e) {
        handleError(e, 'Error al actualizar trabajador')
        throw e
      }
    },

    async toggleActivoTrabajador(id, activo) {
      return this.actualizarTrabajador(id, { activo })
    },

    async generarBorradorSemana(semanaInicio, semanaFin) {
      const userStore = useUserStore()
      const haciendaStore = useHaciendaStore()
      
      const haciendaId = haciendaStore.mi_hacienda?.id
      if (!haciendaId) throw new Error('Hacienda no seleccionada')

      this.loading = true
      try {
        // 1. Obtener operarios desde la plantilla (solo activos)
        const operarios = await pb.collection('plantilla_nomina').getFullList({
          filter: `hacienda="${haciendaId}" && activo=true`
        })

        // 2. Obtener bitácora del rango
        const bitacoraList = await pb.collection('bitacora').getFullList({
          filter: `hacienda="${haciendaId}" && fecha >= "${semanaInicio}T00:00:00.000Z" && fecha <= "${semanaFin}T23:59:59.999Z"`
        })

        // 3. Obtener tarjas del rango
        const tarjasList = await pb.collection('tarjas').getFullList({
          filter: `hacienda="${haciendaId}" && fecha >= "${semanaInicio}T00:00:00.000Z" && fecha <= "${semanaFin}T23:59:59.999Z"`,
          expand: 'operario'
        })

        // 4. Calcular detalles por operario
        const detalles = operarios.map(op => {
          // Calcular días sugeridos desde bitácoras (asistencia = día con al menos 1 labor registrada)
          const opBitacoras = bitacoraList.filter(b => {
             const invols = b.trabajadores_involucrados || []
             return Array.isArray(invols) ? invols.includes(op.id) : invols === op.id
          })
          const uniqueDays = new Set()
          opBitacoras.forEach(b => {
            const dateStr = b.fecha ? b.fecha.split('T')[0] : b.created.split('T')[0]
            uniqueDays.add(dateStr)
          })
          const diasSugeridos = uniqueDays.size

          // Calcular cantidades cosechadas desde tarjas
          const opTarjas = tarjasList.filter(t => t.operario === op.user_link || (t.expand && t.expand.operario && t.expand.operario.id === op.user_link))
          const cosechas = { cajas: 0, racimos: 0, kilos: 0, unidades: 0 }
          opTarjas.forEach(t => {
            if (cosechas[t.tipo_unidad] !== undefined) {
              cosechas[t.tipo_unidad] += t.cantidad
            }
          })

          // Calcular pago de destajo inicial
          let pagoDestajo = 0
          Object.keys(cosechas).forEach(unit => {
            const qty = cosechas[unit]
            const rate = this.rates[unit] || 0
            pagoDestajo += qty * rate
          })

          // Tarifa jornal base sugerida (por operario)
          const valorJornal = Number(op.valor_jornal) || this.defaultJornal

          return {
            operario_id: op.id,
            operario_nombre: op.nombre || 'Trabajador sin nombre',
            dias_trabajados: diasSugeridos, // editable inline
            valor_jornal: valorJornal,      // editable inline
            pago_jornal: Number((diasSugeridos * valorJornal).toFixed(2)),
            cosechas,
            pago_destajo: Number(pagoDestajo.toFixed(2)),
            ajustes: 0,                     // editable inline
            total_neto: Number((diasSugeridos * valorJornal + pagoDestajo).toFixed(2))
          }
        })

        return detalles
      } catch (e) {
        handleError(e, 'Error al generar el borrador de nómina')
        throw e
      } finally {
        this.loading = false
      }
    },

    async exportarNominaExcel(semanaInfo, detalles) {
      try {
        const XLSX = await import('xlsx')
        
        // Formatear filas para SheetJS
        const rows = detalles.map(d => {
          const cosechaPartes = []
          Object.entries(d.cosechas).forEach(([unit, val]) => {
            if (val > 0) cosechaPartes.push(`${val} ${unit}`)
          })
          const cosechaStr = cosechaPartes.join(', ') || 'Sin cosechas'

          return {
            'Operario': d.operario_nombre,
            'Días Trabajados': d.dias_trabajados,
            'Valor Jornal ($)': d.valor_jornal,
            'Pago Jornal ($)': d.pago_jornal,
            'Cosechas Registradas': cosechaStr,
            'Pago Destajo ($)': d.pago_destajo,
            'Ajustes ($)': d.ajustes,
            'Total Neto ($)': d.total_neto
          }
        })

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Nómina')

        // Anchuras de columnas
        worksheet['!cols'] = [
          { wch: 25 }, // Operario
          { wch: 15 }, // Días Trabajados
          { wch: 15 }, // Valor Jornal
          { wch: 15 }, // Pago Jornal
          { wch: 30 }, // Cosechas Registradas
          { wch: 15 }, // Pago Destajo
          { wch: 12 }, // Ajustes
          { wch: 15 }  // Total Neto
        ]

        XLSX.writeFile(workbook, `Nomina_Semana_${semanaInfo.inicio}_al_${semanaInfo.fin}.xlsx`)
        return true
      } catch (e) {
        handleError(e, 'Error al exportar planilla a Excel')
        throw e
      }
    }
  }
})
