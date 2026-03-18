/**
 * Constantes para Roles y Estados de Usuarios
 * Centraliza definiciones para evitar duplicación
 *
 * @module constants/roles
 */

/**
 * Roles de usuario disponibles
 * @enum {string}
 */
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMINISTRADOR: 'administrador',
  AUDITOR: 'auditor',
  OPERADOR: 'operador'
}

/**
 * Colores Vuetify para badges de roles
 * @enum {string}
 */
export const ROLE_COLORS = {
  [USER_ROLES.SUPERADMIN]: 'error',
  [USER_ROLES.ADMINISTRADOR]: 'primary',
  [USER_ROLES.AUDITOR]: 'info',
  [USER_ROLES.OPERADOR]: 'success'
}

/**
 * Etiquetas amigables para roles
 * @enum {string}
 */
export const ROLE_LABELS = {
  [USER_ROLES.SUPERADMIN]: 'Super Admin',
  [USER_ROLES.ADMINISTRADOR]: 'Administrador',
  [USER_ROLES.AUDITOR]: 'Auditor',
  [USER_ROLES.OPERADOR]: 'Operador'
}

/**
 * Opciones para selects Vuetify
 */
export const ROLE_OPTIONS = [
  { title: ROLE_LABELS[USER_ROLES.SUPERADMIN], value: USER_ROLES.SUPERADMIN },
  { title: ROLE_LABELS[USER_ROLES.ADMINISTRADOR], value: USER_ROLES.ADMINISTRADOR },
  { title: ROLE_LABELS[USER_ROLES.AUDITOR], value: USER_ROLES.AUDITOR },
  { title: ROLE_LABELS[USER_ROLES.OPERADOR], value: USER_ROLES.OPERADOR }
]

/**
 * Estados de usuario
 * @enum {string}
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
}

/**
 * Etiquetas para estados
 * @enum {string}
 */
export const STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: 'Activo',
  [USER_STATUS.INACTIVE]: 'Inactivo'
}

/**
 * Colores para badges de estado
 * @enum {string}
 */
export const STATUS_COLORS = {
  [USER_STATUS.ACTIVE]: 'success',
  [USER_STATUS.INACTIVE]: 'grey'
}
