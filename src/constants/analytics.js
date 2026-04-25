/**
 * Constantes para el sistema de Analytics
 * @module constants/analytics
 */

/**
 * Roles de usuario
 * @enum {string}
 */
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  OPERADOR: 'operador',
  VIEWER: 'viewer'
}

/**
 * Tipos de plan de hacienda
 * @enum {string}
 */
export const PLAN_TYPES = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
}

/**
 * Rangos de tiempo para métricas
 * @enum {string}
 */
export const TIME_RANGES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  CUSTOM: 'custom'
}

/**
 * Tipos de patrones para data mining
 * @enum {string}
 */
export const PATTERN_TYPES = {
  SIEMBRA: 'siembra',
  FERTILIZACION: 'fertilizacion',
  RENDIMIENTO: 'rendimiento'
}

/**
 * Tipos de acción para métricas de uso
 * @enum {string}
 */
export const ACTION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
}

/**
 * TTL de caché para métricas globales (5 minutos)
 * @type {number}
 */
export const ANALYTICS_CACHE_TTL = 5 * 60 * 1000
