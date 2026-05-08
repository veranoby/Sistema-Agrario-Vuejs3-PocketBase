import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { computed } from 'vue'

export function useMetrics() {
  const bitacoraStore = useBitacoraStore()

  /**
   * Filtra las bitácoras según los parámetros (opcionales)
   */
  const getFilteredEntries = (siembrasIds = [], actividadId = null, dateRange = null) => {
    let entries = bitacoraStore.getEnrichedBitacoraEntries

    if (siembrasIds && siembrasIds.length > 0) {
      entries = entries.filter(e => {
        if (Array.isArray(e.siembras)) {
          return e.siembras.some(s => siembrasIds.includes(s));
        }
        return siembrasIds.includes(e.siembras);
      })
    }

    if (actividadId) {
      entries = entries.filter(e => 
        e.actividad_realizada === actividadId || 
        e.expand?.actividad_realizada?.id === actividadId
      )
    }

    if (dateRange && dateRange.start) {
      const start = new Date(dateRange.start)
      entries = entries.filter(e => {
        const d = new Date(e.fecha_ejecucion || e.created)
        return d >= start
      })
    }

    if (dateRange && dateRange.end) {
      const end = new Date(dateRange.end)
      entries = entries.filter(e => {
        const d = new Date(e.fecha_ejecucion || e.created)
        return d <= end
      })
    }

    return entries
  }

  /**
   * Normaliza un valor numérico basándose en su unidad asociada (Fase 2)
   */
  const getNormalizedValue = (entry, metricKey) => {
    let val = Number(entry.metricas[metricKey])
    if (isNaN(val)) return 0

    // Mapa de emparejamiento de llaves: métrica -> unidad
    const unitMap = {
      'tiempo_riego': 'unidad_tiempo_riego',
      'volumen_agua_utilizada': 'unidad_volumen_agua',
      'dosis_aplicada': 'unidad_dosis',
      'cantidad_total_utilizada': 'unidad_total',
      'cantidad_cosechada': 'unidad_cosecha',
      'cantidad_residuo': 'unidad_residuo',
      'duracion_capacitacion': 'unidad_duracion',
      'temperatura_almacenamiento': 'unidad_temperatura',
      'cantidad_material': 'unidad_material',
      'densidad_siembra': 'unidad_densidad',
      'area_preparada': 'unidad_area',
      'cantidad_producto': 'unidad_producto'
    }

    const unitKey = unitMap[metricKey]
    const unitValue = unitKey ? entry.metricas[unitKey] : null

    if (!unitValue) return val

    // Conversiones a unidad estándar (kg, Litros, m³, Hectáreas)
    const conversions = {
      // Masas a kg
      'Quintales (100lb)': 45.3592,
      'Quintales': 45.3592,
      'Libras': 0.453592,
      'Toneladas': 1000,
      'g': 0.001,
      'kg': 1,
      // Volumen a Litros (General)
      'Galones': 3.78541,
      'ml': 0.001,
      'Litros': 1,
      // Tiempos a Horas
      'Minutos': 1/60,
      'Días': 24,
      'Horas': 1
    }

    // Lógicas especiales de normalización por métrica
    if (metricKey === 'volumen_agua_utilizada') {
      // Estándar a m³
      if (unitValue === 'Litros') val = val / 1000
      else if (unitValue === 'Galones') val = val * 3.78541 / 1000
    } else if (metricKey === 'area_preparada' || metricKey === 'area_lote') {
      // Estándar a Hectáreas
      if (unitValue === 'm²') val = val / 10000
      else if (unitValue === 'Cuadras') val = val * 0.705
    } else {
      if (conversions[unitValue] !== undefined) {
        val = val * conversions[unitValue]
      }
    }

    return val
  }

  /**
   * Obtiene la suma total de una métrica cuantitativa (Ej: cantidad_cosechada)
   */
  const getTotalSum = (metricKey, siembrasIds = [], actividadId = null, dateRange = null) => {
    const entries = getFilteredEntries(siembrasIds, actividadId, dateRange)
    return entries.reduce((total, entry) => {
      if (entry.metricas && typeof entry.metricas === 'object' && entry.metricas[metricKey] !== undefined) {
        const val = getNormalizedValue(entry, metricKey)
        return total + val
      }
      return total
    }, 0)
  }

  /**
   * Obtiene la distribución para gráficos de pastel (Ej: clasificacion_producto -> "Primera": 10, "Segunda": 5)
   */
  const getDistribution = (metricKey, weightMetricKey = null, siembrasIds = [], actividadId = null, dateRange = null) => {
    const entries = getFilteredEntries(siembrasIds, actividadId, dateRange)
    const distribution = {}
    
    entries.forEach(entry => {
      if (entry.metricas && typeof entry.metricas === 'object' && entry.metricas[metricKey] !== undefined) {
        const category = entry.metricas[metricKey]
        
        // Si hay una métrica de peso (ej. clasificacion_producto ponderado por cantidad_cosechada)
        let weight = 1
        if (weightMetricKey && entry.metricas[weightMetricKey] !== undefined) {
          const val = Number(entry.metricas[weightMetricKey])
          if (!isNaN(val)) weight = val
        }
        
        distribution[category] = (distribution[category] || 0) + weight
      }
    })
    
    return distribution
  }

  /**
   * Obtiene datos temporales para gráficos de líneas/barras
   */
  const getTimeSeries = (metricKey, siembrasIds = [], actividadId = null, dateRange = null) => {
    const entries = getFilteredEntries(siembrasIds, actividadId, dateRange)
    const series = []
    
    entries.forEach(entry => {
      if (entry.metricas && typeof entry.metricas === 'object' && entry.metricas[metricKey] !== undefined) {
        const val = getNormalizedValue(entry, metricKey)
        if (!isNaN(val)) {
          series.push({
            x: entry.fecha_ejecucion || entry.created,
            y: val,
            actividad: entry.expand?.actividad_realizada?.nombre || 'Desconocida',
            notas: entry.notas
          })
        }
      }
    })
    
    // Ordenar por fecha ascendente
    return series.sort((a, b) => new Date(a.x) - new Date(b.x))
  }

  /**
   * Calcula el Índice de Salud basado en 'nivel_afectacion'
   * "Bajo" = 1, "Moderado" = 2, "Alto" = 3
   */
  const getIndiceSaludTimeSeries = (siembrasIds = [], dateRange = null) => {
    const entries = getFilteredEntries(siembrasIds, null, dateRange)
    const series = []
    
    const mapAfectacion = {
      'Bajo': 1,
      'Moderado': 2,
      'Alto': 3
    }

    entries.forEach(entry => {
      if (entry.metricas && typeof entry.metricas === 'object' && entry.metricas['nivel_afectacion']) {
        const levelStr = entry.metricas['nivel_afectacion']
        if (mapAfectacion[levelStr]) {
          series.push({
            x: entry.fecha_ejecucion || entry.created,
            y: mapAfectacion[levelStr],
            label: levelStr,
            actividad: entry.expand?.actividad_realizada?.nombre || 'Control de Plagas'
          })
        }
      }
    })
    
    return series.sort((a, b) => new Date(a.x) - new Date(b.x))
  }

  /**
   * Calcula Rendimiento por Planta (Cruza total cosechado con densidad de la zona)
   */
  const getRendimientoPorPlanta = (siembraId) => {
    if (!siembraId) return 0
    
    const siembrasStore = useSiembrasStore()
    const siembra = siembrasStore.siembras.find(s => s.id === siembraId)
    
    if (!siembra) return 0
    
    // Obtener lotes y sumar densidad de plantas (asumiendo que viene en expand.lotes)
    let totalPlantas = 0
    if (siembra.expand?.lotes) {
      const lotes = Array.isArray(siembra.expand.lotes) ? siembra.expand.lotes : [siembra.expand.lotes]
      lotes.forEach(lote => {
        if (lote.densidad_siembra) totalPlantas += Number(lote.densidad_siembra)
      })
    }
    
    if (totalPlantas <= 0) return 0
    
    const totalCosechado = getTotalSum('cantidad_cosechada', [siembraId])
    return totalCosechado / totalPlantas
  }

  return {
    getFilteredEntries,
    getTotalSum,
    getDistribution,
    getTimeSeries,
    getIndiceSaludTimeSeries,
    getRendimientoPorPlanta
  }
}
