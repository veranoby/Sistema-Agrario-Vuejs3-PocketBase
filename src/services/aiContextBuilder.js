/**
 * aiContextBuilder.js
 * Servicio para construir contexto enriquecido para el asistente de IA
 * Transforma datos crudos en información estructurada y relevante para análisis agrícola
 */

import { transformMetricasByTipo } from '@/utils/bitacoraMetricTransformer'
import { differenceInDays, parseISO } from 'date-fns'

/**
 * Construye contexto completo de siembra para el asistente AI
 * @param {Object} siembra - Datos de la siembra
 * @param {Array} actividades - Lista de actividades asociadas
 * @param {Array} zonas - Lista de zonas asociadas
 * @returns {Object} Contexto enriquecido para la IA
 */
export function buildSiembraContext(siembra, actividades, zonas) {
  if (!siembra) return null

  return {
    siembra: {
      nombre: siembra.nombre,
      area: siembra.area_total,
      estado: siembra.estado,
      dias_cultivo: calculateDaysSince(siembra.fecha_siembra),
      tipo_cultivo: siembra.tipo_cultivo,
      fecha_siembra: siembra.fecha_siembra,
      expected_harvest: siembra.fecha_cosecha_esperada
    },
    metricas_enriquecidas: (actividades || []).map(act => ({
      nombre: act.nombre,
      tipo: act.tipo_actividad,
      estado: act.estado,
      metricas: transformMetricasByTipo(act.metricas || {}, act.tipo_actividad)
    })),
    zonas_resumen: (zonas || []).map(z => ({
      nombre: z.nombre,
      bpa_estado: z.bpa_estado,
      area: z.area,
      tipo: z.tipo
    })),
    alertas: detectAlerts(siembra, actividades, zonas)
  }
}

/**
 * Calcula días transcurridos desde una fecha
 * @param {string} fecha - Fecha ISO
 * @returns {number} Días transcurridos
 */
function calculateDaysSince(fecha) {
  if (!fecha) return 0
  try {
    const date = typeof fecha === 'string' ? parseISO(fecha) : fecha
    return differenceInDays(new Date(), date)
  } catch {
    return 0
  }
}

/**
 * Detecta alertas y anomalías en los datos
 * @param {Object} siembra - Datos de siembra
 * @param {Array} actividades - Lista de actividades
 * @param {Array} zonas - Lista de zonas
 * @returns {Array} Lista de alertas detectadas
 */
function detectAlerts(siembra, actividades, zonas) {
  const alerts = []

  // BPA bajo en zonas
  const zonasBpaBajo = (zonas || []).filter(z => (z.bpa_estado || 0) < 70)
  zonasBpaBajo.forEach(z => {
    alerts.push({
      tipo: 'bpa_bajo',
      zona: z.nombre,
      valor: z.bpa_estado,
      severidad: z.bpa_estado < 50 ? 'alta' : 'media'
    })
  })

  // Actividades vencidas o pendientes críticas
  const actividadesCriticas = (actividades || []).filter(a => {
    const isVencida = a.estado === 'vencida'
    const isPendienteVieja = a.estado === 'pendiente' &&
      a.fecha_programada &&
      differenceInDays(new Date(), parseISO(a.fecha_programada)) > 7
    return isVencida || isPendienteVieja
  })

  actividadesCriticas.forEach(a => {
    alerts.push({
      tipo: a.estado === 'vencida' ? 'actividad_vencida' : 'actividad_retrasada',
      actividad: a.nombre,
      fecha_programada: a.fecha_programada,
      severidad: a.estado === 'vencida' ? 'alta' : 'media'
    })
  })

  // Siembra sin avance reciente
  if (siembra && siembra.fecha_siembra) {
    const diasSiembra = calculateDaysSince(siembra.fecha_siembra)
    if (diasSiembra > 30 && (!actividades || actividades.length === 0)) {
      alerts.push({
        tipo: 'siembra_sin_actividad',
        dias_transcurridos: diasSiembra,
        severidad: 'alta'
      })
    }
  }

  return alerts
}
