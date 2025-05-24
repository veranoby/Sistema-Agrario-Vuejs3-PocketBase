import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  differenceInDays,
  differenceInMonths
} from 'date-fns'
import { useSyncStore } from './syncStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'
import { useSnackbarStore } from './snackbarStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useBitacoraStore } from './bitacoraStore';

export const useProgramacionesStore = defineStore('programaciones', {
  state: () => ({
    programaciones: [],
    loading: false,
    error: null,
    lastCalculated: null,
    version: 1,
    lastSync: null
  }),

  persist: {
    key: 'programaciones',
    storage: sessionStorage,
    paths: ['programaciones']
  },

  getters: {
    programacionesPorHacienda: (state) => {
      const haciendaStore = useHaciendaStore()
      return state.programaciones.filter((p) => p.hacienda === haciendaStore.mi_hacienda?.id)
    },

    programacionesAgrupadas: (state) => {
      const grouped = {}
      state.programaciones.forEach((p) => {
        if (!grouped[p.actividad]) grouped[p.actividad] = []
        grouped[p.actividad].push(p)
      })
      return grouped
    },

    programacionesParaHoy: (state) => {
      const hoy = new Date()
      const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

      return state.programaciones.filter((p) => {
        const fechaEjecucion =
          p.frecuencia === 'fecha_especifica'
            ? new Date(p.frecuencia_personalizada?.fecha)
            : new Date(p.proxima_ejecucion)

        const fechaEjecucionNormalizada = new Date(
          fechaEjecucion.getFullYear(),
          fechaEjecucion.getMonth(),
          fechaEjecucion.getDate()
        )

        return fechaEjecucionNormalizada.getTime() === hoyNormalizado.getTime()
      })
    },

    programacionesPendientes: (state) => {
      const hoy = new Date()
      return state.programaciones.filter((p) => {
        const fechaEjecucion =
          p.frecuencia === 'fecha_especifica'
            ? new Date(p.frecuencia_personalizada?.fecha)
            : new Date(p.proxima_ejecucion)

        return isBefore(fechaEjecucion, hoy)
      })
    }
  },

  actions: {
    async init() {
      try {
        await this.cargarProgramaciones()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar programaciones')
        return false
      }
    },

    async cargarProgramaciones() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      // Cargar datos locales primero
      const programacionesLocal = syncStore.loadFromLocalStorage('programaciones')
      if (programacionesLocal) {
        this.programaciones = programacionesLocal.map(this.enriquecerProgramacion)

        this.loading = false
        return this.programaciones
      }

      try {
        const records = await pb.collection('programaciones').getFullList({
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'actividad,siembras'
        })

        this.lastSync = Date.now()

        this.programaciones = records.map(this.enriquecerProgramacion)
        // Guardar zonas en localStorage para uso offline
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
      } catch (error) {
        handleError(error, 'Error al cargar programaciones')
      } finally {
        this.loading = false
      }
    },

    enriquecerProgramacion(programacion) {
      if (!programacion) return null

      const proximaEjecucion = this.calcularProximaEjecucion(programacion)
      const estadoVisual = this.obtenerEstadoVisual(programacion)
      const ejecucionesPendientes = this.calcularEjecucionesPendientes(programacion)

      return {
        ...programacion,
        actividades: programacion.actividades || [],
        siembras: programacion.siembras || [],
        proximaEjecucion,
        estadoVisual,
        ejecucionesPendientes
      }
    },

    calcularProximaEjecucion(programacion) {
      if (programacion.frecuencia === 'fecha_especifica') {
        return new Date(programacion.frecuencia_personalizada?.fecha)
      }

      if (!programacion.ultima_ejecucion) return new Date(programacion.created)

      const baseDate = new Date(programacion.ultima_ejecucion)
      const config = programacion.frecuencia_personalizada || {}

      switch (programacion.frecuencia) {
        case 'diaria':
          return addDays(baseDate, 1)
        case 'semanal':
          return addWeeks(baseDate, 1)
        case 'quincenal':
          return addDays(baseDate, 15)
        case 'mensual':
          return addMonths(baseDate, 1)
        case 'personalizada':
          return this.calcularFrecuenciaPersonalizada(baseDate, config)
        default:
          return addDays(baseDate, 1)
      }
    },

    calcularFrecuenciaPersonalizada(baseDate, config) {
      const addFunctions = {
        dias: addDays,
        semanas: addWeeks,
        meses: addMonths,
        años: addYears
      }

      return addFunctions[config.tipo]?.(baseDate, config.cantidad) || addDays(baseDate, 1)
    },

    obtenerEstadoVisual(programacion) {
      const hoy = new Date()
      const fechaTarget =
        programacion.frecuencia === 'fecha_especifica'
          ? new Date(programacion.frecuencia_personalizada?.fecha)
          : new Date(programacion.proxima_ejecucion)

      if (isBefore(fechaTarget, hoy)) return 'vencida'

      const diff = differenceInDays(fechaTarget, hoy)
      if (diff <= 3) return 'proxima'
      return 'al-dia'
    },

    calcularEjecucionesPendientes(programacion) {
      if (!programacion.ultima_ejecucion) return 1

      const hoy = new Date()
      const ultimaEjecucion = new Date(programacion.ultima_ejecucion)

      if (programacion.frecuencia === 'fecha_especifica') {
        const fechaEspecifica = new Date(programacion.frecuencia_personalizada?.fecha)
        return fechaEspecifica < hoy ? 1 : 0
      }

      const diasDesdeUltima = differenceInDays(hoy, ultimaEjecucion)

      switch (programacion.frecuencia) {
        case 'diaria':
          return diasDesdeUltima
        case 'semanal':
          return Math.floor(diasDesdeUltima / 7)
        case 'quincenal':
          return Math.floor(diasDesdeUltima / 15)
        case 'mensual':
          return differenceInMonths(hoy, ultimaEjecucion)
        case 'personalizada':
          const config = programacion.frecuencia_personalizada
          if (config.tipo === 'dias') return Math.floor(diasDesdeUltima / config.cantidad)
          if (config.tipo === 'semanas') return Math.floor(diasDesdeUltima / (7 * config.cantidad))
          if (config.tipo === 'meses')
            return differenceInMonths(hoy, ultimaEjecucion) / config.cantidad
          return 0
        default:
          return 0
      }
    },

    async crearProgramacion(nuevaProgramacion) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      // Establecer fecha actual como referencia
      const fechaActual = new Date().toISOString()

      // Calcular próxima ejecución antes de enriquecer datos
      let proximaEjecucion
      try {
        if (nuevaProgramacion.frecuencia === 'fecha_especifica' && 
            nuevaProgramacion.frecuencia_personalizada) {
          // Si es una fecha específica, usar esa fecha (frecuencia_personalizada is now an object)
          const fechaEspecifica = nuevaProgramacion.frecuencia_personalizada.fecha;
          proximaEjecucion = fechaEspecifica ? new Date(fechaEspecifica).toISOString() : fechaActual
        } else if (nuevaProgramacion.frecuencia === 'personalizada' && 
                  nuevaProgramacion.frecuencia_personalizada) {
          // Si es personalizada, calcular basado en la configuración (frecuencia_personalizada is now an object)
          const config = nuevaProgramacion.frecuencia_personalizada;
          const addFunctions = {
            dias: addDays,
            semanas: addWeeks,
            meses: addMonths,
            años: addYears
          }
          proximaEjecucion = addFunctions[config.tipo]?.(new Date(), config.cantidad).toISOString() || fechaActual
        } else {
          // Para frecuencias estándar
          switch (nuevaProgramacion.frecuencia) {
            case 'diaria':
              proximaEjecucion = addDays(new Date(), 1).toISOString()
              break
            case 'semanal':
              proximaEjecucion = addWeeks(new Date(), 1).toISOString()
              break
            case 'quincenal':
              proximaEjecucion = addDays(new Date(), 15).toISOString()
              break
            case 'mensual':
              proximaEjecucion = addMonths(new Date(), 1).toISOString()
              break
            default:
              proximaEjecucion = fechaActual
          }
        }
      } catch (error) {
        console.error('Error calculando próxima ejecución:', error)
        proximaEjecucion = fechaActual
      }

      // Enriquecer datos con contexto de hacienda
      const enrichedData = {
        ...nuevaProgramacion,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version,
        ultima_ejecucion: null,
        actividades: nuevaProgramacion.actividadesSeleccionadas,
        siembras: await this.obtenerSiembrasRelacionadas(
          nuevaProgramacion.actividadesSeleccionadas
        ),
        proxima_ejecucion: proximaEjecucion,
        created: fechaActual
      }

      if (!syncStore.isOnline) {
        // Usar la función unificada para generar ID temporal
        const tempId = syncStore.generateTempId()

        const tempProgramacion = {
          ...enrichedData,
          id: tempId,
          created: fechaActual,
          updated: fechaActual,
          _isTemp: true // Marcar como temporal para mejor seguimiento
        }

        this.programaciones.unshift(tempProgramacion)
        syncStore.saveToLocalStorage('programaciones', this.programaciones)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'programaciones',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        return tempProgramacion
      }

      try {
        const record = await pb.collection('programaciones').create(enrichedData, {
          expand: 'actividad,siembras'
        })
        this.programaciones.push(record)
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return record
      } catch (error) {
        handleError(error, 'Error al crear programación')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async obtenerSiembrasRelacionadas(actividadesIds) {
      const actividadesStore = useActividadesStore()
      // const siembrasStore = useSiembrasStore(); // siembrasStore no parece usarse aquí directamente
      const siembras = new Set()

      for (const id of actividadesIds) {
        try {
          let actividad = actividadesStore.actividades.find(a => a.id === id);
          if (!actividad) {
            console.log(`Actividad ${id} no encontrada localmente, buscando en DB...`)
            actividad = await actividadesStore.fetchActividadById(id)
          }

          if (actividad?.siembras) {
            actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
          }
        } catch (error) {
          console.error(`Error procesando actividad ${id} para obtener siembras relacionadas:`, error)
        }
      }

      return Array.from(siembras)
    },

    async actualizarProgramacion(id, datosActualizados) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de programación no proporcionado para actualización')
      }

      const programacion = this.programaciones.find((p) => p.id === id)
      if (!programacion) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró programación con ID: ${id}`)
      }

      // Calcular la próxima ejecución basada en los datos actualizados
      const dataToUpdate = {
        ...datosActualizados,
        actividades: datosActualizados.actividades || programacion?.actividades || [],
        siembras: datosActualizados.siembras || programacion?.siembras || [],
        proxima_ejecucion: this.calcularProximaEjecucion({
          ...programacion,
          ...datosActualizados
        })
      }

      if (!syncStore.isOnline) {
        const index = this.programaciones.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.programaciones[index] = {
            ...this.programaciones[index],
            ...dataToUpdate,
            updated: new Date().toISOString()
          }
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'programaciones',
          id,
          data: dataToUpdate
        })

        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return this.programaciones[index]
      }

      try {
        const record = await pb.collection('programaciones').update(id, dataToUpdate, {
          expand: 'actividad,siembras'
        })
        const index = this.programaciones.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.programaciones[index] = record
        }
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar programación')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async eliminarProgramacion(id) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de programación no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        // Verificar si la programación existe antes de eliminarla
        const programacionExiste = this.programaciones.some((p) => p.id === id)
        if (!programacionExiste) {
          snackbarStore.hideLoading()
          throw new Error(`No se encontró programación con ID: ${id}`)
        }

        this.programaciones = this.programaciones.filter((p) => p.id !== id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'programaciones',
          id
        })
        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return true
      }

      try {
        await pb.collection('programaciones').delete(id)
        this.programaciones = this.programaciones.filter((p) => p.id !== id)
        syncStore.saveToLocalStorage('programaciones', this.programaciones)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar programación')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async ejecutarProgramacion(id) {
      const bitacoraStore = useBitacoraStore();
      const programacion = this.programaciones.find((p) => p.id === id)

      if (!programacion) {
        console.error(`Programacion con ID ${id} no encontrada.`)
        return
      }

      const actividadesParaRegistrar = Array.isArray(programacion.actividades) ? programacion.actividades : [];
      if(actividadesParaRegistrar.length === 0) {
        console.warn(`Programacion ${id} no tiene actividades asociadas para registrar en bitácora.`);
        // Aún así, actualizaremos la fecha de ejecución de la programación.
      }

      for (const actividadId of actividadesParaRegistrar) {
        const entryData = {
          programacion_origen: programacion.id,
          actividad_realizada: actividadId,
          fecha_ejecucion: new Date().toISOString(),
          estado_ejecucion: 'completado',
          siembra_asociada: programacion.siembras && programacion.siembras.length > 0 ? programacion.siembras[0] : null
        }
        try {
          console.log('Creando entrada en bitácora:', entryData)
          await bitacoraStore.crearBitacoraEntry(entryData)
        } catch (error) {
          console.error(`Error creando entrada en bitácora para actividad ${actividadId} de programacion ${id}:`, error)
          // Continuar con la siguiente actividad
        }
      }

      const nuevaUltimaEjecucion = new Date().toISOString();
      const nuevaProximaEjecucionObj = this.calcularProximaEjecucion({ 
        ...programacion, 
        ultima_ejecucion: nuevaUltimaEjecucion 
      });

      try {
        await this.actualizarProgramacion(id, {
          ultima_ejecucion: nuevaUltimaEjecucion,
          proxima_ejecucion: nuevaProximaEjecucionObj.toISOString()
        })
      } catch (error) {
        // handleError ya es llamado por actualizarProgramacion, pero podemos loggear contexto adicional si es necesario.
        console.error(`Error actualizando la programacion ${id} después de la ejecución:`, error);
        // No re-lanzar para no romper el flujo si la bitácora se creó parcialmente.
      }
    },

    // Método para actualizar un elemento local
    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem(
        'programaciones',
        tempId,
        newItem,
        this.programaciones,
        {
          referenceFields: ['programacion', 'programaciones'],
          executionFields: ['proxima_ejecucion']
        }
      )
    },

    // Método para actualizar referencias
    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'programaciones',
        tempId,
        realId,
        this.programaciones,
        ['programacion', 'programaciones']
      )
    },

    // Método para eliminar un elemento local
    removeLocalItem(id) {
      return useSyncStore().removeLocalItem(
        'programaciones',
        id,
        this.programaciones
      )
    }
  }
})
