export const ROLES = {
  ADMIN: 'admin',
  TECNICO: 'tecnico',
  OPERADOR: 'operador'
}

export const PERMISSIONS = {
  // FINANZAS
  FINANZAS_VIEW: [ROLES.ADMIN],
  FINANZAS_EDIT: [ROLES.ADMIN],
  
  // ACTIVIDADES
  ACTIVIDADES_VIEW: [ROLES.ADMIN, ROLES.TECNICO, ROLES.OPERADOR],
  ACTIVIDADES_CREATE: [ROLES.ADMIN, ROLES.TECNICO],
  ACTIVIDADES_EDIT: [ROLES.ADMIN, ROLES.TECNICO],
  ACTIVIDADES_EXECUTE: [ROLES.ADMIN, ROLES.TECNICO, ROLES.OPERADOR], // Bitacora

  // PROGRAMACIONES
  PROGRAMACIONES_VIEW: [ROLES.ADMIN, ROLES.TECNICO, ROLES.OPERADOR],
  PROGRAMACIONES_EDIT: [ROLES.ADMIN, ROLES.TECNICO],

  // CONFIGURACION
  CONFIG_HACIENDA: [ROLES.ADMIN],

  // MAPAS Y ZONAS
  ZONAS_VIEW: [ROLES.ADMIN, ROLES.TECNICO, ROLES.OPERADOR],
  ZONAS_EDIT: [ROLES.ADMIN, ROLES.TECNICO]
}

export function hasPermission(userRole, requiredRoles) {
  if (!userRole) return false
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles]
  }
  // El admin siempre tiene acceso a todo de manera implícita, pero explícitamente es mejor
  return requiredRoles.includes(userRole) || userRole === ROLES.ADMIN
}
