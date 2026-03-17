/**
 * Constantes de tipos de reportes
 * @module constants/reportTypes
 */

/**
 * Tipos de reportes disponibles
 */
export const REPORT_TYPES = {
  ACTIVIDADES: 'actividades',
  BITACORA: 'bitacora',
  PROGRAMACIONES: 'programaciones',
  SIEMBRAS: 'siembras',
  COSECHAS: 'cosechas',
  RENDIMIENTO: 'rendimiento',
  INVENTARIO: 'inventario',
  FINANZAS: 'finanzas',
  METEOROLOGIA: 'meteorologia'
}

/**
 * Formatos de exportación de reportes
 */
export const REPORT_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv',
  JSON: 'json',
  EXCEL: 'xlsx',
  HTML: 'html'
}

/**
 * Periodos de reportes
 */
export const REPORT_PERIODS = {
  DIARIO: 'diario',
  SEMANAL: 'semanal',
  MENSUAL: 'mensual',
  TRIMESTRAL: 'trimestral',
  ANUAL: 'anual',
  PERSONALIZADO: 'personalizado'
}

/**
 * Nombres legibles para tipos de reporte
 */
export const REPORT_TYPE_LABELS = {
  actividades: 'Reporte de Actividades',
  bitacora: 'Reporte de Bitácora',
  programaciones: 'Reporte de Programaciones',
  siembras: 'Reporte de Siembras',
  cosechas: 'Reporte de Cosechas',
  rendimiento: 'Reporte de Rendimiento',
  inventario: 'Reporte de Inventario',
  finanzas: 'Reporte Financiero',
  meteorologia: 'Reporte Meteorológico'
}

/**
 * Iconos para tipos de reporte
 */
export const REPORT_TYPE_ICONS = {
  actividades: 'mdi-clipboard-list',
  bitacora: 'mdi-book-open-page-variant',
  programaciones: 'mdi-calendar-clock',
  siembras: 'mdi-seed',
  cosechas: 'mdi-basket',
  rendimiento: 'mdi-chart-line',
  inventario: 'mdi-package-variant',
  finanzas: 'mdi-currency-usd',
  meteorologia: 'mdi-weather-sunny'
}

/**
 * Obtiene el label de un tipo de reporte
 */
export function getReportTypeLabel(type) {
  return REPORT_TYPE_LABELS[type] || type
}

/**
 * Obtiene el icono de un tipo de reporte
 */
export function getReportTypeIcon(type) {
  return REPORT_TYPE_ICONS[type] || 'mdi-file-chart'
}
