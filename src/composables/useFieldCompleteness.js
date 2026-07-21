import { useActividadesStore } from '@/stores/actividadesStore'

/**
 * Mapa predefinido de campos críticos por ID de tipo de actividad o palabra clave de categoría
 */
export const CRITICAL_FIELDS_MAP = {
  // Control de Plagas y Enfermedades (ID: nqoke21h1pvem5i)
  'nqoke21h1pvem5i': ['periodo_carencia_dias', 'ingrediente_activo', 'registro_oficial_agrocalidad'],
  'plagas': ['periodo_carencia_dias', 'ingrediente_activo', 'registro_oficial_agrocalidad'],
  'aplicacion': ['periodo_carencia_dias', 'ingrediente_activo', 'registro_oficial_agrocalidad'],

  // Fertilización y Nutrición (ID: fbb751efx9rkp3s)
  'fbb751efx9rkp3s': ['analisis_suelo_referencia', 'lote_fabricacion'],
  'fertilizacion': ['analisis_suelo_referencia', 'lote_fabricacion'],

  // Cosecha y Poscosecha (ID: yhtpctztpakym9h)
  'yhtpctztpakym9h': ['codigo_trazabilidad_lote', 'lote_origen'],
  'cosecha': ['codigo_trazabilidad_lote', 'lote_origen'],

  // Riego y Monitoreo de Agua (ID: jk8v864r1d42794)
  'jk8v864r1d42794': ['analisis_calidad_agua_fecha', 'volumen_agua_utilizada'],
  'riego': ['analisis_calidad_agua_fecha', 'volumen_agua_utilizada'],

  // Gestión de Residuos (ID: e2ml1o21cjggnvv)
  'e2ml1o21cjggnvv': ['metodo_disposicion'],
  'residuos': ['metodo_disposicion']
}

/**
 * Composable para calcular la completitud de campos en métricas de bitácora
 */
export function useFieldCompleteness() {
  const actividadesStore = useActividadesStore()

  /**
   * Auxiliar para verificar si un valor de métrica está completo
   */
  const isValueFilled = (val) => {
    if (val === null || val === undefined) return false
    if (typeof val === 'string') return val.trim() !== ''
    if (typeof val === 'number') return !isNaN(val)
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === 'boolean') return true
    if (typeof val === 'object') return Object.keys(val).length > 0
    return false
  }

  /**
   * Obtiene la estructura de definición del tipo de actividad
   */
  const getTipoActividadData = (actividadIdOrRecord) => {
    if (!actividadIdOrRecord) return null

    if (typeof actividadIdOrRecord === 'object') {
      if (actividadIdOrRecord.metricas) return actividadIdOrRecord
      if (actividadIdOrRecord.expand?.tipo_actividades) return actividadIdOrRecord.expand.tipo_actividades
    }

    const idOrSlug = typeof actividadIdOrRecord === 'string'
      ? actividadIdOrRecord
      : (actividadIdOrRecord?.id || actividadIdOrRecord?.tipo_actividades)

    if (!idOrSlug) return null

    const tipos = actividadesStore.tiposActividades || []
    return tipos.find(t => t.id === idOrSlug || t.nombre?.toLowerCase().includes(String(idOrSlug).toLowerCase())) || null
  }

  /**
   * Calcula el porcentaje y detalle de completitud de métricas
   * @param {string|Object} actividadIdOrRecord - ID o objeto del tipo de actividad
   * @param {Object} metricasObj - Objeto JSON de métricas de la entrada
   * @returns {Object} { porcentaje, camposCompletados, totalCampos, faltantes, criticosFaltantes, faltantesDetalle, nivelColor }
   */
  const calculateCompleteness = (actividadIdOrRecord, metricasObj = {}) => {
    const safeMetricas = metricasObj || {}
    const tipoData = getTipoActividadData(actividadIdOrRecord)

    let expectedMetricsMap = {}
    if (tipoData && tipoData.metricas) {
      if (tipoData.metricas.metricas && typeof tipoData.metricas.metricas === 'object') {
        expectedMetricsMap = tipoData.metricas.metricas
      } else if (typeof tipoData.metricas === 'object') {
        expectedMetricsMap = tipoData.metricas
      }
    }

    const expectedMetricKeys = Object.keys(expectedMetricsMap)

    const actividadId = (typeof actividadIdOrRecord === 'string'
      ? actividadIdOrRecord
      : (tipoData?.id || actividadIdOrRecord?.id || '')).toLowerCase()

    let criticalKeys = []
    for (const [key, fields] of Object.entries(CRITICAL_FIELDS_MAP)) {
      if (actividadId.includes(key) || (tipoData?.nombre && tipoData.nombre.toLowerCase().includes(key))) {
        criticalKeys = [...new Set([...criticalKeys, ...fields])]
      }
    }

    const allRelevantKeys = expectedMetricKeys.length > 0
      ? expectedMetricKeys
      : [...new Set([...Object.keys(safeMetricas), ...criticalKeys])]

    if (allRelevantKeys.length === 0) {
      return {
        porcentaje: 100,
        camposCompletados: 0,
        totalCampos: 0,
        faltantes: [],
        criticosFaltantes: [],
        faltantesDetalle: [],
        nivelColor: 'verde'
      }
    }

    let camposCompletados = 0
    const faltantes = []
    const criticosFaltantes = []
    const faltantesDetalle = []

    for (const key of allRelevantKeys) {
      const val = safeMetricas[key]
      const isFilled = isValueFilled(val)
      const isCritico = criticalKeys.includes(key)

      if (isFilled) {
        camposCompletados++
      } else {
        faltantes.push(key)
        if (isCritico) {
          criticosFaltantes.push(key)
        }

        const fieldMeta = expectedMetricsMap[key] || {}
        faltantesDetalle.push({
          key,
          label: fieldMeta.nombre || key.replace(/_/g, ' '),
          descripcion: fieldMeta.descripcion || 'Requerido para auditoría BPA.',
          isCritico
        })
      }
    }

    const totalCampos = allRelevantKeys.length
    const porcentaje = Math.round((camposCompletados / totalCampos) * 100)

    let nivelColor = 'verde'
    if (porcentaje <= 50) {
      nivelColor = 'rojo'
    } else if (porcentaje <= 80) {
      nivelColor = 'amarillo'
    }

    return {
      porcentaje,
      camposCompletados,
      totalCampos,
      faltantes,
      criticosFaltantes,
      faltantesDetalle,
      nivelColor
    }
  }

  return {
    calculateCompleteness,
    CRITICAL_FIELDS_MAP
  }
}
