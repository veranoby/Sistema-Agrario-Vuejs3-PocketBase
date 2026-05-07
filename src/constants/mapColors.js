/**
 * Constantes de colores para mapas de ConAgri
 * @module constants/mapColors
 */

/**
 * Colores para estados de siembras (mapeo 1:1 con estados válidos de useSiembraMetrics.js)
 * @type {Object.<string, string>}
 */
export const SIEMBRA_COLORS = {
  en_crecimiento: '#4CAF50', // Verde
  planificada: '#FFEB3B',     // Amarillo
  cosechada: '#FF9800',       // Naranja
  finalizada: '#9E9E9E'       // Gris
}

/**
 * Color de fallback para Puntos de Interés (POI) si el color de zona no es válido
 * @type {string}
 */
export const POI_FALLBACK_COLOR = '#FF8F00' // Ámbar

/**
 * Color por defecto para el círculo central de la hacienda
 * @type {string}
 */
export const HACIENDA_CENTER_COLOR = '#d32f2f' // Rojo
