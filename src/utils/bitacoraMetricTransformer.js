/**
 * Transformador de métricas de bitácora por tipo de actividad
 * @module utils/bitacoraMetricTransformer
 */

import { logger } from '@/utils/logger'
import { formatDate } from '@/utils/formatters'

/**
 * Mapeo de transformaciones específicas por tipo de actividad
 * Define cómo se transforman las métricas crudas en formato legible
 */
const TRANSFORM_RULES = {
  siembra: {
    nombre: 'Siembra',
    transformaciones: {
      variedad: (val, metrica) => ({
        key: 'variedad_semilla',
        label: 'Variedad',
        value: val,
        unit: null,
        category: 'general'
      }),
      densidad: (val, metrica) => ({
        key: 'densidad_siembra',
        label: 'Densidad de Siembra',
        value: val,
        unit: metrica.unidad || 'plants/ha',
        category: 'cantidades'
      }),
      densidad_plantas: (val, metrica) => ({
        key: 'plantas_por_hectarea',
        label: 'Plantas por Hectárea',
        value: val,
        unit: 'plants/ha',
        category: 'cantidades'
      }),
      fecha_siembra: (val, metrica) => ({
        key: 'fecha_siembra',
        label: 'Fecha de Siembra',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      }),
      metodo_siembra: (val, metrica) => ({
        key: 'metodo_siembra',
        label: 'Método de Siembra',
        value: val,
        unit: null,
        category: 'general'
      })
    }
  },

  cosecha: {
    nombre: 'Cosecha',
    transformaciones: {
      rendimiento_kg: (val, metrica) => ({
        key: 'rendimiento_total_kg',
        label: 'Rendimiento Total',
        value: val,
        unit: 'kg',
        category: 'cantidades'
      }),
      rendimiento_por_hectarea: (val, metrica) => ({
        key: 'rendimiento_ha',
        label: 'Rendimiento por Hectárea',
        value: val,
        unit: 'ton/ha',
        category: 'cantidades'
      }),
      calidad: (val, metrica) => ({
        key: 'calidad_cosecha',
        label: 'Calidad',
        value: val,
        unit: null,
        category: 'calidad'
      }),
      fecha_cosecha: (val, metrica) => ({
        key: 'fecha_cosecha',
        label: 'Fecha de Cosecha',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      }),
      porcentaje_humedad: (val, metrica) => ({
        key: 'humedad_cosecha',
        label: 'Humedad al Cosechar',
        value: val,
        unit: '%',
        category: 'calidad'
      })
    }
  },

  aplicacion: {
    nombre: 'Aplicación',
    transformaciones: {
      producto: (val, metrica) => ({
        key: 'producto_aplicado',
        label: 'Producto Aplicado',
        value: val,
        unit: null,
        category: 'producto'
      }),
      dosis: (val, metrica) => ({
        key: 'dosis_aplicada',
        label: 'Dosis Aplicada',
        value: val,
        unit: metrica.unidad || 'L/ha',
        category: 'cantidades'
      }),
      cantidad: (val, metrica) => ({
        key: 'cantidad_total',
        label: 'Cantidad Total',
        value: val,
        unit: metrica.unidad || 'L',
        category: 'cantidades'
      }),
      metodo: (val, metrica) => ({
        key: 'metodo_aplicacion',
        label: 'Método de Aplicación',
        value: val,
        unit: null,
        category: 'general'
      }),
      fecha_aplicacion: (val, metrica) => ({
        key: 'fecha_aplicacion',
        label: 'Fecha de Aplicación',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      }),
      condiciones_climaticas: (val, metrica) => ({
        key: 'condiciones_aplicacion',
        label: 'Condiciones Climáticas',
        value: val,
        unit: null,
        category: 'observaciones'
      })
    }
  },

  monitoreo: {
    nombre: 'Monitoreo',
    transformaciones: {
      temperatura: (val, metrica) => ({
        key: 'temperatura_ambiente',
        label: 'Temperatura',
        value: val,
        unit: '°C',
        category: 'clima'
      }),
      humedad: (val, metrica) => ({
        key: 'humedad_relativa',
        label: 'Humedad Relativa',
        value: val,
        unit: '%',
        category: 'clima'
      }),
      precipitacion: (val, metrica) => ({
        key: 'precipitacion_mm',
        label: 'Precipitación',
        value: val,
        unit: 'mm',
        category: 'clima'
      }),
      ph: (val, metrica) => ({
        key: 'ph_suelo',
        label: 'pH del Suelo',
        value: val,
        unit: 'pH',
        category: 'suelo'
      }),
      fecha_monitoreo: (val, metrica) => ({
        key: 'fecha_monitoreo',
        label: 'Fecha de Monitoreo',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      }),
      observaciones: (val, metrica) => ({
        key: 'observaciones_monitoreo',
        label: 'Observaciones',
        value: val,
        unit: null,
        category: 'observaciones'
      })
    }
  },

  riego: {
    nombre: 'Riego',
    transformaciones: {
      dosis_agua: (val, metrica) => ({
        key: 'volumen_agua',
        label: 'Volumen de Agua',
        value: val,
        unit: metrica.unidad || 'm³',
        category: 'cantidades'
      }),
      volumen_m3: (val, metrica) => ({
        key: 'volumen_m3',
        label: 'Volumen (m³)',
        value: val,
        unit: 'm³',
        category: 'cantidades'
      }),
      tiempo_horas: (val, metrica) => ({
        key: 'duracion_riego',
        label: 'Duración del Riego',
        value: val,
        unit: 'horas',
        category: 'tiempo'
      }),
      metodo: (val, metrica) => ({
        key: 'metodo_riego',
        label: 'Método de Riego',
        value: val,
        unit: null,
        category: 'general'
      }),
      fecha_riego: (val, metrica) => ({
        key: 'fecha_riego',
        label: 'Fecha de Riego',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      }),
      fuente_agua: (val, metrica) => ({
        key: 'fuente_riego',
        label: 'Fuente de Agua',
        value: val,
        unit: null,
        category: 'general'
      })
    }
  },

  fertilizacion: {
    nombre: 'Fertilización',
    transformaciones: {
      tipo_fertilizante: (val, metrica) => ({
        key: 'fertilizante_tipo',
        label: 'Tipo de Fertilizante',
        value: val,
        unit: null,
        category: 'producto'
      }),
      dosis: (val, metrica) => ({
        key: 'dosis_fertilizante',
        label: 'Dosis',
        value: val,
        unit: metrica.unidad || 'kg/ha',
        category: 'cantidades'
      }),
      cantidad_kg: (val, metrica) => ({
        key: 'cantidad_total_kg',
        label: 'Cantidad Total',
        value: val,
        unit: 'kg',
        category: 'cantidades'
      }),
      metodo_aplicacion: (val, metrica) => ({
        key: 'metodo_aplicacion',
        label: 'Método de Aplicación',
        value: val,
        unit: null,
        category: 'general'
      }),
      fecha_fertilizacion: (val, metrica) => ({
        key: 'fecha_fertilizacion',
        label: 'Fecha de Fertilizacion',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      }),
      formula: (val, metrica) => ({
        key: 'formula_npk',
        label: 'Fórmula NPK',
        value: val,
        unit: null,
        category: 'producto'
      })
    }
  },

  labranza: {
    nombre: 'Labranza',
    transformaciones: {
      tipo_labranza: (val, metrica) => ({
        key: 'tipo_labranza',
        label: 'Tipo de Labranza',
        value: val,
        unit: null,
        category: 'general'
      }),
      profundidad_cm: (val, metrica) => ({
        key: 'profundidad_labranza',
        label: 'Profundidad',
        value: val,
        unit: 'cm',
        category: 'cantidades'
      }),
      horas_maquina: (val, metrica) => ({
        key: 'horas_maquina',
        label: 'Horas de Máquina',
        value: val,
        unit: 'h',
        category: 'tiempo'
      }),
      fecha_labranza: (val, metrica) => ({
        key: 'fecha_labranza',
        label: 'Fecha de Labranza',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      })
    }
  },

  poda: {
    nombre: 'Poda',
    transformaciones: {
      tipo_poda: (val, metrica) => ({
        key: 'tipo_poda',
        label: 'Tipo de Poda',
        value: val,
        unit: null,
        category: 'general'
      }),
      porcentaje_elim: (val, metrica) => ({
        key: 'porcentaje_eliminado',
        label: 'Porcentaje Eliminado',
        value: val,
        unit: '%',
        category: 'cantidades'
      }),
      numero_plantas: (val, metrica) => ({
        key: 'plantas_podadas',
        label: 'Plantas Podadas',
        value: val,
        unit: 'unidades',
        category: 'cantidades'
      }),
      fecha_poda: (val, metrica) => ({
        key: 'fecha_poda',
        label: 'Fecha de Poda',
        value: formatDate(val, 'dd MMM yyyy'),
        unit: null,
        category: 'fechas'
      })
    }
  }
}

/**
 * Categorías para organizar las métricas transformadas
 */
const METRIC_CATEGORIES = {
  general: { label: 'General', icon: 'mdi-information', order: 1 },
  fechas: { label: 'Fechas', icon: 'mdi-calendar', order: 2 },
  cantidades: { label: 'Cantidades', icon: 'mdi-scale', order: 3 },
  producto: { label: 'Producto', icon: 'mdi-box', order: 4 },
  calidad: { label: 'Calidad', icon: 'mdi-star', order: 5 },
  clima: { label: 'Clima', icon: 'mdi-weather-sunny', order: 6 },
  suelo: { label: 'Suelo', icon: 'mdi-ground', order: 7 },
  tiempo: { label: 'Tiempo', icon: 'mdi-clock', order: 8 },
  observaciones: { label: 'Observaciones', icon: 'mdi-note-text', order: 9 }
}

/**
 * Transforma las métricas de una actividad según su tipo
 * @param {Object} metricas - Objeto de métricas crudas { key: { valor, unidad, descripcion } }
 * @param {string|Object} tipoActividad - Tipo de actividad (nombre u objeto completo)
 * @param {Object} formatoReporte - Formato de reporte del tipo de actividad
 * @returns {Object} Métricas transformadas y organizadas
 */
export function transformMetricasByTipo(metricas, tipoActividad, formatoReporte = null) {
  // Normalizar el tipo de actividad
  const tipoNormalizado = normalizeTipoActividad(
    typeof tipoActividad === 'object' ? tipoActividad.nombre : tipoActividad
  )

  // Obtener reglas de transformación
  const rules = TRANSFORM_RULES[tipoNormalizado]

  if (!rules) {
    logger.warn(`[bitacoraMetricTransformer] No hay reglas para tipo: ${tipoNormalizado}, usando transformación genérica`)
    return transformMetricasGenericas(metricas)
  }

  const transformed = {
    raw: metricas,
    items: [],
    byCategory: {},
    flat: {},
    summary: ''
  }

  // Procesar cada métrica
  for (const [key, metrica] of Object.entries(metricas)) {
    const valor = metrica?.valor !== undefined ? metrica.valor : metrica

    // Aplicar transformación específica si existe
    const transformFn = rules.transformaciones[key]
    let transformedItem

    if (transformFn) {
      transformedItem = transformFn(valor, metrica)
    } else {
      // Transformación genérica para métricas sin regla específica
      transformedItem = {
        key: key,
        label: metrica?.descripcion || key.replace(/_/g, ' '),
        value: valor,
        unit: metrica?.unidad || null,
        category: 'general'
      }
    }

    transformed.items.push(transformedItem)
    transformed.flat[transformedItem.key] = transformedItem.value

    // Organizar por categoría
    if (!transformed.byCategory[transformedItem.category]) {
      transformed.byCategory[transformedItem.category] = []
    }
    transformed.byCategory[transformedItem.category].push(transformedItem)
  }

  // Ordenar categorías según orden predefinido
  const sortedCategories = Object.entries(transformed.byCategory)
    .sort((a, b) => {
      const orderA = METRIC_CATEGORIES[a[0]]?.order || 999
      const orderB = METRIC_CATEGORIES[b[0]]?.order || 999
      return orderA - orderB
    })

  transformed.byCategory = Object.fromEntries(sortedCategories)

  // Generar resumen
  transformed.summary = generateMetricasSummary(transformed.items)

  return transformed
}

/**
 * Transformación genérica para tipos sin reglas específicas
 * @param {Object} metricas - Métricas crudas
 * @returns {Object} Métricas transformadas genéricamente
 */
function transformMetricasGenericas(metricas) {
  const transformed = {
    raw: metricas,
    items: [],
    byCategory: { general: [] },
    flat: {},
    summary: ''
  }

  for (const [key, metrica] of Object.entries(metricas)) {
    const valor = metrica?.valor !== undefined ? metrica.valor : metrica
    const item = {
      key: key,
      label: metrica?.descripcion || key.replace(/_/g, ' '),
      value: valor,
      unit: metrica?.unidad || null,
      category: 'general'
    }

    transformed.items.push(item)
    transformed.flat[item.key] = item.value
    transformed.byCategory.general.push(item)
  }

  transformed.summary = generateMetricasSummary(transformed.items)

  return transformed
}

/**
 * Genera un resumen de texto de las métricas
 * @param {Array} items - Items de métricas transformadas
 * @returns {string} Resumen de texto
 */
function generateMetricasSummary(items) {
  if (!items || items.length === 0) return ''

  const summaryLines = items
    .filter(item => item.value !== undefined && item.value !== null && item.value !== '')
    .map(item => {
      const unit = item.unit ? ` ${item.unit}` : ''
      return `${item.label}: ${item.value}${unit}`
    })

  return summaryLines.join('\n')
}

/**
 * Transforma métricas para el formato de observaciones automáticas
 * @param {Object} metricas - Métricas crudas
 * @param {Object} formatoReporte - Formato de reporte con columnas
 * @returns {string} Texto de observaciones automáticas
 */
export function generateObservacionesFromMetricas(metricas, formatoReporte) {
  if (!formatoReporte?.columnas || !metricas) return ''

  const mappedKeys = new Set()
  formatoReporte.columnas.forEach(col => {
    if (col.metrica && col.nombre !== 'Observaciones') {
      mappedKeys.add(col.metrica)
    }
  })

  const unmappedLines = []
  for (const [key, metrica] of Object.entries(metricas)) {
    if (!mappedKeys.has(key)) {
      const desc = metrica?.descripcion || key
      const val = metrica?.valor !== undefined ? metrica.valor : 'N/A'
      const unit = metrica?.unidad || ''
      unmappedLines.push(`${desc}: ${val} ${unit}`.trim())
    }
  }

  return unmappedLines.join('\n')
}

/**
 * Convierte métricas transformadas a formato plano para guardar en bitácora
 * @param {Object} metricasTransformadas - Métricas ya transformadas
 * @returns {Object} Objeto plano con valores
 */
export function flattenMetricas(metricasTransformadas) {
  if (!metricasTransformadas) return {}

  // Si ya tiene propiedad flat, devolverla
  if (metricasTransformadas.flat) {
    return metricasTransformadas.flat
  }

  // Si es un objeto de métricas crudas, extraer valores
  const flattened = {}
  for (const [key, metrica] of Object.entries(metricasTransformadas)) {
    if (typeof metrica === 'object' && metrica !== null && 'valor' in metrica) {
      flattened[key] = metrica.valor
    } else {
      flattened[key] = metrica
    }
  }

  return flattened
}

/**
 * Normaliza el nombre del tipo de actividad
 * @param {string} tipo - Tipo de actividad
 * @returns {string} Tipo normalizado
 */
function normalizeTipoActividad(tipo) {
  if (!tipo) return 'desconocido'

  return tipo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
}

/**
 * Obtiene las categorías disponibles con sus metadatos
 * @returns {Object} Categorías de métricas
 */
export function getMetricCategories() {
  return METRIC_CATEGORIES
}

/**
 * Obtiene los tipos de actividad soportados
 * @returns {Array} Lista de tipos soportados
 */
export function getSupportedTypes() {
  return Object.keys(TRANSFORM_RULES).map(key => ({
    key: key,
    nombre: TRANSFORM_RULES[key].nombre
  }))
}
