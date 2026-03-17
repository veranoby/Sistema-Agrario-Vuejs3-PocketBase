/**
 * Constantes de colores para la UI
 * @module constants/uiColors
 */

/**
 * Colores por estado de ejecución
 */
export const STATUS_COLORS = {
  planificada: 'info',
  en_progreso: 'warning',
  completado: 'success',
  cancelada: 'error',
  pendiente: 'grey',
  fallida: 'error'
}

/**
 * Colores por prioridad
 */
export const PRIORITY_COLORS = {
  baja: 'success',
  media: 'warning',
  alta: 'error',
  critica: 'error'
}

/**
 * Colores para roles de usuario
 */
export const ROLE_COLORS = {
  superadmin: 'error',
  admin: 'primary',
  user: 'success',
  viewer: 'grey'
}

/**
 * Colores para estaciones/climas
 */
export const SEASON_COLORS = {
  primavera: 'green-lighten-1',
  verano: 'amber',
  otoño: 'orange',
  invierno: 'blue'
}

/**
 * Colores para categorías de cultivo
 */
export const CROP_CATEGORY_COLORS = {
  cereales: 'amber',
  legumbres: 'green',
  hortalizas: 'light-green',
  frutales: 'red',
  oleaginosas: 'yellow',
  tuberculos: 'orange',
  forrajes: 'lime',
  otros: 'grey'
}

/**
 * Gradientes predefinidos
 */
export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  info: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  warning: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  error: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
  sunset: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  ocean: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}

/**
 * Tema de colores para gráficos
 */
export const CHART_COLORS = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#4facfe',
  '#43e97b',
  '#fa709a',
  '#fee140',
  '#30cfd0',
  '#a8edea',
  '#fed6e3'
]

/**
 * Obtiene un color por estado
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || 'grey'
}

/**
 * Obtiene un color por prioridad
 */
export function getPriorityColor(priority) {
  return PRIORITY_COLORS[priority] || 'grey'
}

/**
 * Obtiene un color por rol
 */
export function getRoleColor(role) {
  return ROLE_COLORS[role] || 'grey'
}
