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
import { useSyncStore } from '@/stores/sync/index'
import { handleError } from '@/utils/errorHandler'
import { useActividadesStore } from '@/stores/actividadesStore';
import { useHaciendaStore } from './haciendaStore';
import { useSnackbarStore } from './snackbarStore';
import { useBitacoraStore } from './bitacoraStore';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { logger } from '@/utils/logger';
import { useAlertTriggers } from '@/composables/useAlertTriggers'

export const useProgramacionesStore = defineStore('programaciones', {
  state: () => ({
    programaciones: [],
    loading: false,
    error: null,
    lastCalculated: null,
    version: 1,
    lastSync: null,
    pendingBitacoraFromProgramacionData: null,
    loaded: false,
    pagination: {
      page: 1,
      perPage: 50,
      totalItems: 0,
      totalPages: 0,
      hasMore: false
    },
    filters: {
      hacienda: null,
      actividad: null,
      siembra: null,
      estado: null
    }
  }),

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
      return this.fetchPage(1, 100, {});
    },

    async fetchPage(page = 1, perPage = 50, filters = {}) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      
      const targetHacienda = filters.hacienda || haciendaStore.mi_hacienda?.id;

      if (!targetHacienda) {
        logger.warn('[PROGRAMACIONES_STORE] No haciendaId provided to fetchPage.');
        return { items: [], pagination: this.pagination };
      }

      this.error = null;
      this.loading = true;

      logger.debug(`[PROGRAMACIONES_STORE] Fetching page ${page} with ${perPage} items per page for hacienda: ${targetHacienda}`);

      try {
        const filterParts = [`hacienda="${targetHacienda}"`];

        if (filters.actividad) {
          filterParts.push(`actividad="${filters.actividad}"`);
        }
        if (filters.siembra) {
          filterParts.push(`siembras ~ "${filters.siembra}"`);
        }

        const filterString = filterParts.join(' && ');

        const result = await pb.collection('programaciones').getList(page, perPage, {
          filter: filterString,
          sort: '-created',
          expand: 'actividad,siembras'
        });

        this.pagination = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        };

        this.filters = { ...this.filters, ...filters };

        const programaciones = result.items.map(this.enriquecerProgramacion.bind(this));

        if (page === 1) {
          this.programaciones = programaciones;
        } else {
          this.programaciones = [...this.programaciones, ...programaciones];
        }

        this.lastSync = Date.now();
        this.saveToStorage();

        logger.debug(`[PROGRAMACIONES_STORE] Fetched page ${page}: ${programaciones.length} items (Total: ${result.totalItems})`);

        return {
          items: programaciones,
          pagination: this.pagination
        };
      } catch (error) {
        handleError(error, 'Error cargando página de programaciones');
        return { items: [], pagination: this.pagination };
      } finally {
        this.loading = false;
      }
    },

    async loadNextPage() {
      if (!this.pagination.hasMore || this.loading) {
        return { items: [], pagination: this.pagination };
      }
      
      const nextPage = this.pagination.page + 1;
      return this.fetchPage(nextPage, this.pagination.perPage, this.filters);
    },

    async refreshPage() {
      return this.fetchPage(1, this.pagination.perPage, this.filters);
    },

    async fetchProgramacionById(id) {
      if (!id) throw new Error('ID de programación no proporcionado')

      // Buscar en array local primero
      const local = this.programaciones.find((p) => p.id === id)
      if (local) return this.enriquecerProgramacion(local)

      // Fallback a PocketBase
      const syncStore = useSyncStore()
      if (syncStore.isOnline) {
        const record = await pb.collection('programaciones').getOne(id, {
          expand: 'actividad,siembras'
        })
        const enriched = this.enriquecerProgramacion(record)
        if (!this.programaciones.some(p => p.id === record.id)) {
          this.programaciones.push(enriched)
          syncStore.saveToLocalStorage('programaciones', this.programaciones)
        }
        return enriched
      }

      throw new Error('Programación no encontrada y sin conexión')
    },

    async fetchProgramacionesBySiembra(siembraId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return this.programaciones.filter(p => p.siembras?.includes(siembraId))
      }
      return pb.collection('programaciones').getFullList({
        filter: `siembras ~ "${siembraId}"`,
        sort: '-created'
      })
    },

    async fetchEjecuciones(programacionId) {
      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        return []
      }
      return pb.collection('programaciones_ejecuciones').getFullList({
        filter: `programacion = "${programacionId}"`,
        sort: '-fecha'
      }).catch(() => [])
    },

    clearProgramaciones() {
      this.programaciones = [];
      this.pagination = {
        page: 1,
        perPage: 50,
        totalItems: 0,
        totalPages: 0,
        hasMore: false
      };
      this.filters = {
        hacienda: null,
        actividad: null,
        siembra: null,
        estado: null
      };
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
            return differenceInMonths(hoy, ultimaEjecucion) / config.cantidad;
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

      const fechaActual = new Date().toISOString()

      let proximaEjecucion
      try {
        if (nuevaProgramacion.frecuencia === 'fecha_especifica' && 
            nuevaProgramacion.frecuencia_personalizada) {
          const fechaEspecifica = nuevaProgramacion.frecuencia_personalizada.fecha;
          proximaEjecucion = fechaEspecifica ? new Date(fechaEspecifica).toISOString() : fechaActual
        } else if (nuevaProgramacion.frecuencia === 'personalizada' && 
                  nuevaProgramacion.frecuencia_personalizada) {
          const config = nuevaProgramacion.frecuencia_personalizada;
          const addFunctions = {
            dias: addDays,
            semanas: addWeeks,
            meses: addMonths,
            años: addYears
          }
          proximaEjecucion = addFunctions[config.tipo]?.(new Date(), config.cantidad).toISOString() || fechaActual
        } else {
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
        logger.error('Error calculando próxima ejecución:', error)
        proximaEjecucion = fechaActual
      }

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
        const tempId = syncStore.generateTempId()

        const tempProgramacion = {
          ...enrichedData,
          id: tempId,
          created: fechaActual,
          updated: fechaActual,
          _isTemp: true
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
      const siembras = new Set()

      const missingIds = []
      for (const id of actividadesIds) {
        const actividad = actividadesStore.actividades.find(a => a.id === id)
        if (actividad?.siembras) {
          actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
        } else if (!actividad) {
          missingIds.push(id)
        }
      }

      if (missingIds.length > 0) {
        try {
          const filter = missingIds.map(id => `id="${id}"`).join(' || ')

          const actividades = await pb.collection('actividades')
            .getFullList({ filter, batch: 100 })

          for (const actividad of actividades) {
            if (actividad?.siembras) {
              actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
            }
          }
        } catch (error) {
          logger.error('Error obteniendo actividades faltantes en batch:', error)
          const failedIds = []
          for (const id of missingIds) {
            try {
              const actividad = await actividadesStore.fetchActividadById(id)
              if (actividad?.siembras) {
                actividad.siembras.forEach((siembraId) => siembras.add(siembraId))
              }
            } catch (err) {
              failedIds.push(id)
              logger.error(`Error procesando actividad ${id}:`, err)
            }
          }
          if (failedIds.length > 0) {
            logger.warn(`[obtenerSiembrasRelacionadas] No se pudieron obtener ${failedIds.length} de ${missingIds.length} actividades`)
          }
        }
      }

      return Array.from(siembras)
    },

    async actualizarProgramacion(id, datosActualizados) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de programación no proporcionado para actualización')
      }

      const programacion = this.programaciones.find((p) => p.id === id)
      if (!programacion) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró programación con ID: ${id}`)
      }

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

      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de programación no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
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
        logger.error(`Programacion con ID ${id} no encontrada.`)
        return
      }

      const actividadesParaRegistrar = Array.isArray(programacion.actividades) ? programacion.actividades : [];
      if(actividadesParaRegistrar.length === 0) {
        logger.warn(`Programacion ${id} no tiene actividades asociadas para registrar en bitácora.`);
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
          logger.debug('Creando entrada en bitácora:', entryData)
          await bitacoraStore.crearBitacoraEntry(entryData)
        } catch (error) {
          logger.error(`Error creando entrada en bitácora para actividad ${actividadId} de programacion ${id}:`, error)
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
        logger.error(`Error actualizando la programacion ${id} después de la ejecución:`, error);
      }
    },

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

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'programaciones',
        tempId,
        realId,
        this.programaciones,
        ['programacion', 'programaciones']
      )
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem(
        'programaciones',
        id,
        this.programaciones
      )
    },

    applySyncedCreate(tempId, realItem) {
      const syncStore = useSyncStore();
      logger.debug(`[PROGRAMACIONES_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`);
      const index = this.programaciones.findIndex(p => p.id === tempId && p._isTemp);
      if (index !== -1) {
        this.programaciones[index] = { ...realItem, _isTemp: false };
      } else {
        if (!this.programaciones.some(p => p.id === realItem.id)) {
            this.programaciones.unshift({ ...realItem, _isTemp: false });
        } else {
            logger.debug('[PROGRAMACIONES_STORE] Synced item already exists by realId.');
        }
      }
      syncStore.saveToLocalStorage('programaciones', this.programaciones);
      logger.debug('[PROGRAMACIONES_STORE] Synced create applied, localStorage updated.');
    },

    applySyncedUpdate(id, updatedItemData) {
      const syncStore = useSyncStore();
      logger.debug(`[PROGRAMACIONES_STORE] Applying synced update for id: ${id}`);
      const index = this.programaciones.findIndex(p => p.id === id);
      if (index !== -1) {
        this.programaciones[index] = { ...this.programaciones[index], ...updatedItemData, _isTemp: false };
        syncStore.saveToLocalStorage('programaciones', this.programaciones);
        logger.debug('[PROGRAMACIONES_STORE] Synced update applied, localStorage updated.');
      } else {
         logger.warn(`[PROGRAMACIONES_STORE] Could not find item with id ${id} to apply update.`);
      }
    },

    applySyncedDelete(id) {
      const syncStore = useSyncStore();
      logger.debug(`[PROGRAMACIONES_STORE] Applying synced delete for id: ${id}`);
      const initialLength = this.programaciones.length;
      this.programaciones = this.programaciones.filter(p => p.id !== id);
      if (this.programaciones.length < initialLength) {
        syncStore.saveToLocalStorage('programaciones', this.programaciones);
        logger.debug('[PROGRAMACIONES_STORE] Synced delete applied, localStorage updated.');
      } else {
        logger.warn(`[PROGRAMACIONES_STORE] Could not find item with id ${id} to apply delete.`);
      }
    },

    async prepareForBitacoraEntryFromProgramacion(programacion) {
      const actividadesStore = useActividadesStore()
      this.pendingBitacoraFromProgramacionData = null

      if (!programacion || !programacion.actividades || programacion.actividades.length === 0) {
        logger.error('[ProgramacionesStore] No activities found in the programacion object.')
        return false
      }

      const primaryActivityId = programacion.actividades[0]
      let actividad = actividadesStore.actividades.find(a => a.id === primaryActivityId)

      if (!actividad) {
        try {
          logger.warn(`[ProgramacionesStore] Activity ${primaryActivityId} not found in store, attempting fetch.`);
          actividad = await actividadesStore.fetchActividadById(primaryActivityId); 
        } catch (error) {
          logger.error(`[ProgramacionesStore] Error fetching activity ${primaryActivityId}:`, error)
          handleError(error, `Error fetching activity ${primaryActivityId}`)
          return false
        }
      }
      
      if (!actividad) {
        logger.error(`[ProgramacionesStore] Activity ${primaryActivityId} could not be found or fetched.`)
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
          logger.error('[ProgramacionesStore] Error generating observacionesPreload:', error);
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
      logger.debug('[ProgramacionesStore] Prepared data for Bitacora Entry:', this.pendingBitacoraFromProgramacionData);
      return true;
    },

    clearPendingBitacoraData() {
      this.pendingBitacoraFromProgramacionData = null;
      logger.debug('[ProgramacionesStore] Cleared pending bitacora data.');
    },

    async finalizeProgramacionExecution(payload) {
      const { programacionId, fechaEjecucionReal } = payload;
      const programacionIndex = this.programaciones.findIndex(p => p.id === programacionId);

      if (programacionIndex === -1) {
        logger.error(`[ProgramacionesStore] Programacion with ID ${programacionId} not found for finalization.`);
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
        logger.debug(`[ProgramacionesStore] Finalized execution for programacion ${programacionId}.`);
      } catch (error) {
        logger.error(`[ProgramacionesStore] Error finalizing programacion execution for ${programacionId}:`, error);
        throw error; 
      }
    },

    async ejecutarProgramacionesBatch(payload) {
      const { programacionId, fechasEjecucion, observacionesAdicionales = '', siembraId = null, metricasSeleccionadas = [] } = payload;

      const actividadesStore = useActividadesStore();
      const bitacoraStore = useBitacoraStore();
      const snackbarStore = useSnackbarStore();

      if (!siembraId) {
        logger.warn('[Store] No siembraId provided for batch execution - proceeding without siembra isolation');
      }

      const programacion = this.programaciones.find(p => p.id === programacionId);
      if (!programacion) {
        logger.error(`[Store] Programacion ${programacionId} no encontrada.`);
        snackbarStore.showSnackbar(`Error: Programación ${programacionId} no encontrada.`, 'error');
        return;
      }

      if (siembraId && programacion.siembras && Array.isArray(programacion.siembras)) {
        if (!programacion.siembras.includes(siembraId)) {
          logger.error(`[Store] SiembraId ${siembraId} not associated with programacion ${programacionId}`);
          snackbarStore.showSnackbar(`Error: La siembra especificada no está asociada a esta programación.`, 'error');
          return;
        }
      }

      if (!programacion.actividades || programacion.actividades.length === 0) {
        logger.error(`[Store] Programacion ${programacionId} no tiene actividades asociadas.`);
        snackbarStore.showSnackbar(`Error: Programación ${programacionId} no tiene actividades.`, 'error');
        return;
      }

      const primaryActivityId = programacion.actividades[0];
      let actividad;
      try {
        actividad = await actividadesStore.fetchActividadById(primaryActivityId, { expand: 'tipo_actividades' });
      } catch (error) {
        logger.error(`[Store] Error fetching actividad ${primaryActivityId}:`, error);
        snackbarStore.showSnackbar(`Error cargando actividad ${primaryActivityId}.`, 'error');
        return;
      }

      if (!actividad) {
        logger.error(`[Store] Actividad ${primaryActivityId} no pudo ser cargada.`);
        snackbarStore.showSnackbar(`Error: Actividad ${primaryActivityId} no pudo ser cargada.`, 'error');
        return;
      }

      const metricasToSubmit = {};
      if (actividad.metricas && typeof actividad.metricas === 'object') {
        for (const key in actividad.metricas) {
          if (Object.prototype.hasOwnProperty.call(actividad.metricas, key) && actividad.metricas[key] && typeof actividad.metricas[key].valor !== 'undefined') {
            if (metricasSeleccionadas.length > 0) {
              if (metricasSeleccionadas.includes(key)) {
                metricasToSubmit[key] = actividad.metricas[key].valor;
              }
            } else {
              metricasToSubmit[key] = actividad.metricas[key].valor;
            }
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
        logger.error('[Store] Error generando observacionesContent para batch:', error);
      }

      const finalObservaciones = [observacionesContent, observacionesAdicionales]
        .filter(obs => obs && obs.trim())
        .join('\n\n');

      let successfulExecutions = 0;
      let latestSuccessfullyExecutedDate = null;

      const sortedDates = [...fechasEjecucion].sort((a, b) => new Date(a) - new Date(b));

      for (const dateString of sortedDates) {
        const entryData = {
          programacion_origen: programacionId,
          actividad_realizada: primaryActivityId,
          fecha_ejecucion: new Date(dateString + 'T00:00:00.000Z').toISOString(),
          estado_ejecucion: 'completado',
          siembra_asociada: siembraId || (programacion.siembras && programacion.siembras.length > 0 ? programacion.siembras[0] : null),
          siembras: siembraId ? [siembraId] : (programacion.siembras || []),
          metricas: { ...metricasToSubmit },
          notas: finalObservaciones,
        };

        try {
          await bitacoraStore.crearBitacoraEntry(entryData);
          successfulExecutions++;
          latestSuccessfullyExecutedDate = dateString;
        } catch (error) {
          logger.error(`[Store] Error creando entrada de bitácora para fecha ${dateString}:`, error);
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

          const siembraContext = siembraId ? ` (Siembra: ${siembraId})` : '';
          snackbarStore.showSnackbar(`${successfulExecutions} de ${sortedDates.length} programaciones ejecutadas y registradas${siembraContext}. Programación actualizada.`, 'success');
        } catch (updateError) {
          logger.error(`[Store] Error actualizando programacion ${programacionId} post-batch:`, updateError);
          snackbarStore.showSnackbar('Bitácoras registradas, pero falló la actualización de la programación.', 'warning');
        }
      } else if (fechasEjecucion.length > 0 && successfulExecutions === 0) {
        snackbarStore.showSnackbar('Ninguna de las programaciones seleccionadas pudo ser registrada.', 'error');
      } else if (fechasEjecucion.length === 0) {
        snackbarStore.showSnackbar('No se seleccionaron fechas para ejecutar.', 'info');
      }
    },

    getFechasPendientes(programacion, siembraId = null) {
      if (!programacion) {
        logger.warn('[ProgramacionesStore] No programacion provided to getFechasPendientes');
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const fechas = [];

      if (programacion.frecuencia === 'fecha_especifica') {
        if (programacion.frecuencia_personalizada?.fecha) {
          const fechaEspecifica = new Date(programacion.frecuencia_personalizada.fecha);
          fechaEspecifica.setHours(0, 0, 0, 0);

          if (fechaEspecifica <= today) {
            if (!this.isFechaProcessedInBitacora(programacion.id, fechaEspecifica, siembraId)) {
              fechas.push(format(fechaEspecifica, 'yyyy-MM-dd'));
            }
          }
        }
        return fechas;
      }

      const ultimaEjecucion = programacion.ultima_ejecucion
        ? new Date(programacion.ultima_ejecucion)
        : new Date(programacion.created || programacion.proxima_ejecucion);
      ultimaEjecucion.setHours(0, 0, 0, 0);

      let currentDate = new Date(ultimaEjecucion);

      while (currentDate < today) {
        const nextDate = this.calcularSiguienteFecha(currentDate, programacion);

        if (nextDate <= today) {
          if (!this.isFechaProcessedInBitacora(programacion.id, nextDate, siembraId)) {
            fechas.push(format(nextDate, 'yyyy-MM-dd'));
          }
        }

        currentDate = nextDate;

        if (fechas.length >= 100) {
          logger.warn('[ProgramacionesStore] Hit safety limit generating pending dates');
          break;
        }
      }

      return fechas.sort();
    },

    isFechaProcessedInBitacora(programacionId, fecha, siembraId = null) {
      const bitacoraStore = useBitacoraStore();

      if (!bitacoraStore.bitacoraEntries || !Array.isArray(bitacoraStore.bitacoraEntries)) {
        return false;
      }

      const fechaStr = format(fecha, 'yyyy-MM-dd');

      return bitacoraStore.bitacoraEntries.some(bitacora => {
        if (bitacora.programaciones !== programacionId) {
          return false;
        }

        const bitacoraFecha = bitacora.fecha ? format(new Date(bitacora.fecha), 'yyyy-MM-dd') : null;
        if (bitacoraFecha !== fechaStr) {
          return false;
        }

        if (siembraId) {
          const bitacoraSiembras = Array.isArray(bitacora.siembras) ? bitacora.siembras : [];
          return bitacoraSiembras.includes(siembraId);
        }

        return true;
      });
    },

    calcularSiguienteFecha(baseDate, programacion) {
      const config = programacion.frecuencia_personalizada || {};

      switch (programacion.frecuencia) {
        case 'diaria':
          return addDays(baseDate, 1);
        case 'semanal':
          return addWeeks(baseDate, 1);
        case 'quincenal':
          return addDays(baseDate, 15);
        case 'mensual':
          return addMonths(baseDate, 1);
        case 'personalizada':
          const addFunctions = {
            dias: addDays,
            semanas: addWeeks,
            meses: addMonths,
            años: addYears
          };
          return addFunctions[config.tipo]?.(baseDate, config.cantidad) || addDays(baseDate, 1);
        default:
          return addDays(baseDate, 1);
      }
    },

    getComplianceState(programacion, siembraId = null) {
      if (!programacion) return 'PROGRAMADO'

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const fechaProgramada = programacion.proxima_ejecucion
        ? new Date(programacion.proxima_ejecucion)
        : new Date()
      fechaProgramada.setHours(0, 0, 0, 0)

      const bitacoraStore = useBitacoraStore()
      const hasBitacoraEntry = this.hasBitacoraEntryForSiembra(programacion.id, siembraId)

      if (hasBitacoraEntry) {
        return 'REGISTRADO'
      }

      if (fechaProgramada > today) {
        return 'PROGRAMADO'
      }

      if (fechaProgramada.getTime() === today.getTime()) {
        return 'PENDIENTE'
      }

      const daysDiff = Math.floor((today - fechaProgramada) / (1000 * 60 * 60 * 24))
      if (daysDiff > 2) {
        return 'ACUMULADO'
      }

      return 'VENCIDO'
    },

    hasBitacoraEntryForSiembra(programacionId, siembraId = null) {
      const bitacoraStore = useBitacoraStore()

      if (!bitacoraStore.bitacoraEntries || !Array.isArray(bitacoraStore.bitacoraEntries)) {
        return false
      }

      return bitacoraStore.bitacoraEntries.some(bitacora => {
        if (bitacora.programaciones !== programacionId) {
          return false
        }

        if (siembraId) {
          const bitacoraSiembras = Array.isArray(bitacora.siembras) ? bitacora.siembras : []
          return bitacoraSiembras.includes(siembraId)
        }

        return true
      })
    },

    getComplianceStateColor(programacion, siembraId = null) {
      const state = this.getComplianceState(programacion, siembraId)
      const colors = {
        'REGISTRADO': 'success',
        'PENDIENTE': 'warning',
        'ACUMULADO': 'error',
        'PROGRAMADO': 'info',
        'VENCIDO': 'orange'
      }
      return colors[state] || 'grey'
    },

    getComplianceStateIcon(programacion, siembraId = null) {
      const state = this.getComplianceState(programacion, siembraId)
      const icons = {
        'REGISTRADO': 'mdi-check-circle',
        'PENDIENTE': 'mdi-clock-alert-outline',
        'ACUMULADO': 'mdi-alert-circle',
        'PROGRAMADO': 'mdi-calendar-clock',
        'VENCIDO': 'mdi-alert-outline'
      }
      return icons[state] || 'mdi-help-circle'
    },

    getComplianceStateTooltip(programacion, siembraId = null) {
      const state = this.getComplianceState(programacion, siembraId)
      const today = new Date()

      const fechaProgramada = programacion.proxima_ejecucion
        ? new Date(programacion.proxima_ejecucion)
        : new Date()

      const daysDiff = fechaProgramada && !isNaN(fechaProgramada)
        ? Math.floor((today - fechaProgramada) / (1000 * 60 * 60 * 24))
        : 0

      const siembraContext = siembraId ? ` (Siembra: ${siembraId})` : ''
      const tooltips = {
        'REGISTRADO': `Cumplimiento registrado en bitácora${siembraContext}`,
        'PENDIENTE': `Requiere documentación hoy${siembraContext}`,
        'ACUMULADO': `${Math.abs(daysDiff)} días sin documentar - riesgo de cumplimiento${siembraContext}`,
        'PROGRAMADO': `Programado para fecha futura${siembraContext}`,
        'VENCIDO': `Vencido hace ${Math.abs(daysDiff)} días${siembraContext}`
      }
      return tooltips[state] || state
    },

    getFechasPendientesWithValidation(programacion, siembraId = null) {
      try {
        if (!programacion) {
          logger.warn('[ProgramacionesStore] No programacion provided to getFechasPendientesWithValidation')
          return []
        }

        const fechas = this.getFechasPendientes(programacion, siembraId)

        if (!Array.isArray(fechas)) {
          logger.error('[ProgramacionesStore] getFechasPendientes returned non-array result')
          return []
        }

        const validFechas = fechas.filter(fecha => {
          try {
            const dateObj = new Date(fecha)
            return !isNaN(dateObj.getTime())
          } catch (error) {
            logger.warn(`[ProgramacionesStore] Invalid date found: ${fecha}`)
            return false
          }
        })

        logger.debug(`[ProgramacionesStore] Generated ${validFechas.length} valid pending dates for programacion ${programacion.id}${siembraId ? ` (siembra: ${siembraId})` : ''}`)
        return validFechas

      } catch (error) {
        logger.error('[ProgramacionesStore] Error in getFechasPendientesWithValidation:', error)
        handleError(error, 'Error calculating pending dates')
        return []
      }
    },

    validateSiembraContext(programacionId, siembraId) {
      if (!siembraId) {
        logger.warn('[ProgramacionesStore] No siembraId provided for validation')
        return { valid: true, warning: 'No siembra context specified' }
      }

      const programacion = this.programaciones.find(p => p.id === programacionId)
      if (!programacion) {
        return { valid: false, error: `Programación ${programacionId} no encontrada` }
      }

      if (!programacion.siembras || !Array.isArray(programacion.siembras)) {
        return { valid: false, error: 'Programación no tiene siembras asociadas' }
      }

      if (!programacion.siembras.includes(siembraId)) {
        return {
          valid: false,
          error: `Siembra ${siembraId} no está asociada a la programación ${programacionId}`
        }
      }

      return { valid: true, message: 'Siembra context validated successfully' }
    },

    clearComplianceStateCache() {
      logger.debug('[ProgramacionesStore] Compliance state cache cleared (bitacora changed).')
    },

    saveToStorage() {
      try {
        safeLocalStorage.saveToLocalStorage('programaciones', this.programaciones)
      } catch (error) {
        logger.error('[ProgramacionesStore] Error guardando en localStorage:', error)
      }
    },

    loadFromStorage() {
      try {
        const data = safeLocalStorage.loadFromLocalStorage('programaciones')
        if (data && Array.isArray(data)) {
          this.programaciones = data.map(this.enriquecerProgramacion)
          this.loaded = true
          return true
        }
        return false
      } catch (error) {
        logger.error('[ProgramacionesStore] Error cargando desde localStorage:', error)
        return false
      }
    }
  }
})

export async function checkProximoActivities(haciendaId) {
  if (!haciendaId) return

  const { triggerAlert } = useAlertTriggers()
  const programacionesStore = useProgramacionesStore()

  try {
    const hoy = new Date()
    const en7Dias = addDays(hoy, 7)

    const { items } = await programacionesStore.fetchPage(1, 100, {
      hacienda: haciendaId
    })

    if (!items || items.length === 0) return

    const proximas = items.filter(act => {
      const fechaAct = act.proxima_ejecucion ? new Date(act.proxima_ejecucion) : new Date(act.created)
      const horas = differenceInDays(fechaAct, hoy) * 24
      return horas > 0 && horas <= 24
    })

    for (const act of proximas) {
      await triggerAlert('recordatorio', {
        actividades: [{
          nombre: act.nombre || 'Actividad',
          fecha: format(new Date(act.proxima_ejecucion || act.created), 'dd/MM/yyyy'),
          responsable: act.responsable || 'No asignado',
          notas: act.notas || 'Sin notas'
        }]
      }, haciendaId)
    }

  } catch (error) {
    handleError(error, 'Error en checkProximoActivities')
  }
}
