import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  differenceInDays,
  differenceInMonths,
  format
} from 'date-fns'
import { useSyncStore } from './syncStore'
import { handleError } from '@/utils/errorHandler'
import { useActividadesStore } from '@/stores/actividadesStore';
import { useHaciendaStore } from './haciendaStore';
import { useSnackbarStore } from './snackbarStore';
import { useBitacoraStore } from './bitacoraStore';

export const useProgramacionesStore = defineStore('programaciones', {
  state: () => ({
    programaciones: [],
    loading: false,
    error: null,
    lastCalculated: null,
    version: 1,
    lastSync: null,
    pendingBitacoraFromProgramacionData: null
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
        case 'personalizada': {
          const config = programacion.frecuencia_personalizada;
          if (config.tipo === 'dias') return Math.floor(diasDesdeUltima / config.cantidad);
          if (config.tipo === 'semanas') return Math.floor(diasDesdeUltima / (7 * config.cantidad));
          if (config.tipo === 'meses') {
            return Math.floor(differenceInMonths(hoy, ultimaEjecucion) / config.cantidad);
          }
          return 0;
        }
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
            // console.log(`Actividad ${id} no encontrada localmente, buscando en DB...`) // Removed
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

  // Original execution logic. Superseded by prepareForBitacoraEntryFromProgramacion and ejecutarProgramacionesBatch flows as of 2023-12-08 (Task: Final Cleanup).
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
          // console.log('Creando entrada en bitácora:', entryData) // Removed
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
    },

    // Standard sync methods
    applySyncedCreate(tempId, realItem) {
      const syncStore = useSyncStore();
      console.log(`[PROGRAMACIONES_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`);
      const index = this.programaciones.findIndex(p => p.id === tempId && p._isTemp);
      if (index !== -1) {
        this.programaciones[index] = { ...realItem, _isTemp: false };
      } else {
        // If not found by tempId (e.g., page reloaded), add if it's not already present by realId
        if (!this.programaciones.some(p => p.id === realItem.id)) {
            this.programaciones.unshift({ ...realItem, _isTemp: false }); // Or push, unshift to show newest first
            console.log('[PROGRAMACIONES_STORE] Synced item added as new (was not found by tempId).');
        } else {
            console.log('[PROGRAMACIONES_STORE] Synced item already exists by realId.');
        }
      }
      syncStore.saveToLocalStorage('programaciones', this.programaciones);
      console.log('[PROGRAMACIONES_STORE] Synced create applied, localStorage updated.');
    },

    applySyncedUpdate(id, updatedItemData) {
      const syncStore = useSyncStore();
      console.log(`[PROGRAMACIONES_STORE] Applying synced update for id: ${id}`);
      const index = this.programaciones.findIndex(p => p.id === id);
      if (index !== -1) {
        this.programaciones[index] = { ...this.programaciones[index], ...updatedItemData, _isTemp: false };
        syncStore.saveToLocalStorage('programaciones', this.programaciones);
        console.log('[PROGRAMACIONES_STORE] Synced update applied, localStorage updated.');
      } else {
         console.warn(`[PROGRAMACIONES_STORE] Could not find item with id ${id} to apply update.`);
      }
    },

    applySyncedDelete(id) {
      const syncStore = useSyncStore();
      console.log(`[PROGRAMACIONES_STORE] Applying synced delete for id: ${id}`);
      const initialLength = this.programaciones.length;
      this.programaciones = this.programaciones.filter(p => p.id !== id);
      if (this.programaciones.length < initialLength) {
        syncStore.saveToLocalStorage('programaciones', this.programaciones);
        console.log('[PROGRAMACIONES_STORE] Synced delete applied, localStorage updated.');
      } else {
        console.warn(`[PROGRAMACIONES_STORE] Could not find item with id ${id} to apply delete.`);
      }}, // End of applySyncedDelete, ensure comma if more actions follow in 'actions'

      // === Start of moved actions ===
      async prepareForBitacoraEntryFromProgramacion(programacion) {
        const actividadesStore = useActividadesStore()
        this.pendingBitacoraFromProgramacionData = null // Reset previous state

        if (!programacion || !programacion.actividades || programacion.actividades.length === 0) {
          console.error('[ProgramacionesStore] No activities found in the programacion object.')
          return false
        }

        const primaryActivityId = programacion.actividades[0]
        let actividad = actividadesStore.actividades.find(a => a.id === primaryActivityId)

        if (!actividad) {
          try {
            console.warn(`[ProgramacionesStore] Activity ${primaryActivityId} not found in store, attempting fetch.`);
            actividad = await actividadesStore.fetchActividadById(primaryActivityId); 
          } catch (error) {
            console.error(`[ProgramacionesStore] Error fetching activity ${primaryActivityId}:`, error)
            handleError(error, `Error fetching activity ${primaryActivityId}`)
            return false
          }
        }
        
        if (!actividad) {
          console.error(`[ProgramacionesStore] Activity ${primaryActivityId} could not be found or fetched.`)
          return false
        }

        const actividadMetricas = actividad.metricas && typeof actividad.metricas === 'object' ? actividad.metricas : {};
        const metricasToPreload = {};
        for (const key in actividadMetricas) {
          if (Object.prototype.hasOwnProperty.call(actividadMetricas, key) && actividadMetricas[key] && typeof actividadMetricas[key].valor !== 'undefined') {
            metricasToPreload[key] = actividadMetricas[key].valor;
          }
        }
        
        let observacionesPreload = '';
        try {
          const tipoActividadId = actividad.tipo_actividades;
          if (tipoActividadId) {
            if (actividadesStore.tiposActividades.length === 0) {
                await actividadesStore.cargarTiposActividades(); 
            }
            const tipoActividad = actividadesStore.tiposActividades.find(ta => ta.id === tipoActividadId);
            
            if (tipoActividad && tipoActividad.formato_reporte && tipoActividad.formato_reporte.columnas) {
              const mappedMetricaKeys = new Set();
              tipoActividad.formato_reporte.columnas.forEach(col => {
                if (col.metrica && col.titulo !== 'Observaciones') { 
                  mappedMetricaKeys.add(col.metrica);
                }
              });

              const unmappedMetricasContent = [];
              for (const metricaKey in actividadMetricas) {
                if (Object.prototype.hasOwnProperty.call(actividadMetricas, metricaKey) && !mappedMetricaKeys.has(metricaKey)) {
                  const metrica = actividadMetricas[metricaKey];
                  const desc = metrica.descripcion || metricaKey;
                  const val = metrica.valor !== undefined && metrica.valor !== null ? metrica.valor : 'N/A';
                  const unit = metrica.unidad || '';
                  unmappedMetricasContent.push(`${desc}: ${val} ${unit}`.trim());
                }
              }
              observacionesPreload = unmappedMetricasContent.join('\n');
            }
          }
        } catch (error) {
            console.error('[ProgramacionesStore] Error generating observacionesPreload:', error);
        }

        const prefillDataObject = {
          actividadRealizadaId: primaryActivityId,
          programacionOrigenId: programacion.id,
          fechaEjecucion: format(new Date(), 'yyyy-MM-dd'),
          metricasToPreload: metricasToPreload,
          observacionesPreload: observacionesPreload,
          siembraAsociadaId: programacion.siembras && programacion.siembras.length > 0 ? programacion.siembras[0] : null
        };

        this.pendingBitacoraFromProgramacionData = prefillDataObject;
        // console.log('[ProgramacionesStore] Prepared data for Bitacora Entry:', this.pendingBitacoraFromProgramacionData); // Removed
        return true;
      },

      clearPendingBitacoraData() {
        this.pendingBitacoraFromProgramacionData = null;
        // console.log('[ProgramacionesStore] Cleared pending bitacora data.'); // Removed
      },

      async finalizeProgramacionExecution(payload) {
        const { programacionId, fechaEjecucionReal } = payload;
        const programacionIndex = this.programaciones.findIndex(p => p.id === programacionId);

        if (programacionIndex === -1) {
          console.error(`[ProgramacionesStore] Programacion with ID ${programacionId} not found for finalization.`);
          return;
        }
        
        const dateParts = fechaEjecucionReal.split('T')[0].split('-'); 
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) -1; 
        const day = parseInt(dateParts[2], 10);
        
        const newUltimaEjecucionDate = new Date(Date.UTC(year, month, day, 0, 0, 0));
        const newUltimaEjecucionISO = newUltimaEjecucionDate.toISOString();

        const originalProgramacion = this.programaciones[programacionIndex];
        const tempProgForCalc = { 
          ...originalProgramacion, 
          ultima_ejecucion: newUltimaEjecucionISO 
        };
        
        const proximaEjecucionDate = this.calcularProximaEjecucion(tempProgForCalc);
        const proxima_ejecucion_iso = proximaEjecucionDate.toISOString();
        const ejecucionesPendientes = 0;

        try {
          await this.actualizarProgramacion(programacionId, { 
            ultima_ejecucion: newUltimaEjecucionISO, 
            proxima_ejecucion: proxima_ejecucion_iso, 
            ejecucionesPendientes: ejecucionesPendientes 
          });
          console.log(`[ProgramacionesStore] Finalized execution for programacion ${programacionId}. New ultima_ejecucion: ${newUltimaEjecucionISO}, new proxima_ejecucion: ${proxima_ejecucion_iso}`);
        } catch (error) {
          console.error(`[ProgramacionesStore] Error finalizing programacion execution for ${programacionId}:`, error);
          throw error; 
        }
      },

      async ejecutarProgramacionesBatch(payload) {
        const { programacionId, fechasEjecucion } = payload; 
        
        const actividadesStore = useActividadesStore();
        const bitacoraStore = useBitacoraStore();
        const snackbarStore = useSnackbarStore();

        const programacion = this.programaciones.find(p => p.id === programacionId);
        if (!programacion) {
          console.error(`[Store] Programacion ${programacionId} no encontrada.`);
          snackbarStore.showSnackbar(`Error: Programación ${programacionId} no encontrada.`, 'error');
          return;
        }

        if (!programacion.actividades || programacion.actividades.length === 0) {
          console.error(`[Store] Programacion ${programacionId} no tiene actividades asociadas.`);
          snackbarStore.showSnackbar(`Error: Programación ${programacionId} no tiene actividades.`, 'error');
          return;
        }

        const primaryActivityId = programacion.actividades[0];
        let actividad;
        try {
          actividad = await actividadesStore.fetchActividadById(primaryActivityId, { expand: 'tipo_actividades' });
        } catch (error) {
          console.error(`[Store] Error fetching actividad ${primaryActivityId}:`, error);
          snackbarStore.showSnackbar(`Error cargando actividad ${primaryActivityId}.`, 'error');
          return;
        }

        if (!actividad) {
          console.error(`[Store] Actividad ${primaryActivityId} no pudo ser cargada.`);
          snackbarStore.showSnackbar(`Error: Actividad ${primaryActivityId} no pudo ser cargada.`, 'error');
          return;
        }

        const metricasToSubmit = {};
        if (actividad.metricas && typeof actividad.metricas === 'object') {
          for (const key in actividad.metricas) {
            if (Object.prototype.hasOwnProperty.call(actividad.metricas, key) && actividad.metricas[key] && typeof actividad.metricas[key].valor !== 'undefined') {
              metricasToSubmit[key] = actividad.metricas[key].valor;
            }
          }
        }
        
        let observacionesContent = '';
        try {
          const tipoActividad = actividad.expand?.tipo_actividades; 
          if (tipoActividad && tipoActividad.formato_reporte && tipoActividad.formato_reporte.columnas) {
            const mappedMetricaKeys = new Set();
            tipoActividad.formato_reporte.columnas.forEach(col => {
              if (col.metrica && col.titulo !== 'Observaciones') { 
                mappedMetricaKeys.add(col.metrica);
              }
            });

            const unmappedMetricasContent = [];
            if (actividad.metricas && typeof actividad.metricas === 'object') {
              for (const metricaKey in actividad.metricas) {
                if (Object.prototype.hasOwnProperty.call(actividad.metricas, metricaKey) && !mappedMetricaKeys.has(metricaKey)) {
                  const metrica = actividad.metricas[metricaKey];
                  const desc = metrica.descripcion || metricaKey;
                  const val = metrica.valor !== undefined && metrica.valor !== null ? metrica.valor : 'N/A';
                  const unit = metrica.unidad || '';
                  unmappedMetricasContent.push(`${desc}: ${val} ${unit}`.trim());
                }
              }
            }
            observacionesContent = unmappedMetricasContent.join('\n');
          }
        } catch (error) {
          console.error('[Store] Error generando observacionesContent para batch:', error);
        }

        let successfulExecutions = 0;
        let latestSuccessfullyExecutedDate = null;
        
        const sortedDates = [...fechasEjecucion].sort((a, b) => new Date(a) - new Date(b));

        for (const dateString of sortedDates) {
          const entryData = {
            programacion_origen: programacionId,
            actividad_realizada: primaryActivityId,
            fecha_ejecucion: new Date(dateString + 'T00:00:00.000Z').toISOString(),
            estado_ejecucion: 'completado',
            siembra_asociada: programacion.siembras && programacion.siembras.length > 0 ? programacion.siembras[0] : null,
            metricas: { ...metricasToSubmit }, 
            notas: observacionesContent, 
          };

          try {
            await bitacoraStore.crearBitacoraEntry(entryData);
            successfulExecutions++;
            latestSuccessfullyExecutedDate = dateString;
          } catch (error) {
            console.error(`[Store] Error creando entrada de bitácora para fecha ${dateString}:`, error);
            snackbarStore.showSnackbar(`Error registrando bitácora para ${dateString}.`, 'error');
          }
        }

        if (successfulExecutions > 0 && latestSuccessfullyExecutedDate) {
          const dateParts = latestSuccessfullyExecutedDate.split('-');
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; 
          const day = parseInt(dateParts[2], 10);
          const latestDateObj = new Date(Date.UTC(year, month, day, 0, 0, 0));
          const latestSuccessfullyExecutedDateISO = latestDateObj.toISOString();

          const tempProgForCalc = { 
            ...programacion, 
            ultima_ejecucion: latestSuccessfullyExecutedDateISO 
          };
          
          const proximaEjecucionDate = this.calcularProximaEjecucion(tempProgForCalc);
          const proxima_ejecucion_iso = proximaEjecucionDate.toISOString();
          const ejecuciones_pendientes = this.calcularEjecucionesPendientes(tempProgForCalc);

          try {
            await this.actualizarProgramacion(programacionId, { 
              ultima_ejecucion: latestSuccessfullyExecutedDateISO, 
              proxima_ejecucion: proxima_ejecucion_iso, 
              ejecucionesPendientes: ejecuciones_pendientes 
            });
            snackbarStore.showSnackbar(`${successfulExecutions} de ${sortedDates.length} programaciones ejecutadas y registradas. Programación actualizada.`, 'success');
          } catch (updateError) {
            console.error(`[Store] Error actualizando programacion ${programacionId} post-batch:`, updateError);
            snackbarStore.showSnackbar('Bitácoras registradas, pero falló la actualización de la programación.', 'warning');
          }
        } else if (fechasEjecucion.length > 0 && successfulExecutions === 0) {
          snackbarStore.showSnackbar('Ninguna de las programaciones seleccionadas pudo ser registrada.', 'error');
        } else if (fechasEjecucion.length === 0) {
          snackbarStore.showSnackbar('No se seleccionaron fechas para ejecutar.', 'info');
        }
      },
      // === End of moved actions ===
      
      // Aquí se pueden agregar más acciones si es necesario
      
    } // Fin del objeto actions
  }) // Fin de defineStore

// Las siguientes funciones ya están definidas dentro del store:
// - prepareForBitacoraEntryFromProgramacion
// - clearPendingBitacoraData
// - finalizeProgramacionExecution
// - ejecutarProgramacionesBatch