/**
 * Constantes para el Mercado de Módulos
 * 
 * @module constants/modules
 */

/**
 * Categorías de módulos disponibles
 * @enum {string}
 */
export const MODULE_CATEGORIES = {
  USERS: 'users',
  HACIENDAS: 'haciendas',
  AI: 'ai',
  REPORTS: 'reports',
  STORAGE: 'storage',
  SUPPORT: 'support',
  BITACORAS: 'bitacoras_avanzadas',
  PROGRAMACIONES: 'programaciones_inteligentes',
  ALERTAS: 'alertas_proactivas',
  AUDITORIA: 'auditoria_bpa'
}

/**
 * Iconos por categoría de módulo
 * @enum {string}
 */
export const MODULE_ICONS = {
  [MODULE_CATEGORIES.USERS]: 'mdi-account-group',
  [MODULE_CATEGORIES.HACIENDAS]: 'mdi-barn',
  [MODULE_CATEGORIES.AI]: 'mdi-brain',
  [MODULE_CATEGORIES.REPORTS]: 'mdi-file-chart',
  [MODULE_CATEGORIES.STORAGE]: 'mdi-cloud',
  [MODULE_CATEGORIES.SUPPORT]: 'mdi-headset',
  [MODULE_CATEGORIES.BITACORAS]: 'mdi-book-edit',
  [MODULE_CATEGORIES.PROGRAMACIONES]: 'mdi-calendar-clock',
  [MODULE_CATEGORIES.ALERTAS]: 'mdi-bell-ring',
  [MODULE_CATEGORIES.AUDITORIA]: 'mdi-clipboard-check'
}

/**
 * Títulos amigables por categoría
 * @enum {string}
 */
export const MODULE_TITLES = {
  [MODULE_CATEGORIES.USERS]: 'Usuarios Adicionales',
  [MODULE_CATEGORIES.HACIENDAS]: 'Haciendas Adicionales',
  [MODULE_CATEGORIES.AI]: 'IA Assistant',
  [MODULE_CATEGORIES.REPORTS]: 'Reportes Personalizados',
  [MODULE_CATEGORIES.STORAGE]: 'Almacenamiento Extendido',
  [MODULE_CATEGORIES.SUPPORT]: 'Soporte Prioritario',
  [MODULE_CATEGORIES.BITACORAS]: 'Bitácoras Avanzadas',
  [MODULE_CATEGORIES.PROGRAMACIONES]: 'Programaciones Inteligentes',
  [MODULE_CATEGORIES.ALERTAS]: 'Alertas Proactivas',
  [MODULE_CATEGORIES.AUDITORIA]: 'Auditoría BPA'
}

/**
 * Descripciones por categoría
 * @enum {string}
 */
export const MODULE_DESCRIPTIONS = {
  [MODULE_CATEGORIES.USERS]: 'Agrega usuarios adicionales a tu hacienda',
  [MODULE_CATEGORIES.HACIENDAS]: 'Gestiona múltiples haciendas',
  [MODULE_CATEGORIES.AI]: 'Asistente IA para recomendaciones de cultivos',
  [MODULE_CATEGORIES.REPORTS]: 'Crea reportes personalizados y exportables',
  [MODULE_CATEGORIES.STORAGE]: 'Amplía tu límite de almacenamiento en la nube',
  [MODULE_CATEGORIES.SUPPORT]: 'Soporte técnico prioritario 24/7',
  [MODULE_CATEGORIES.BITACORAS]: 'Funcionalidades avanzadas para bitácoras de campo',
  [MODULE_CATEGORIES.PROGRAMACIONES]: 'Optimización inteligente de programaciones',
  [MODULE_CATEGORIES.ALERTAS]: 'Alertas predictivas basadas en IA',
  [MODULE_CATEGORIES.AUDITORIA]: 'Herramientas completas de auditoría BPA'
}

/**
 * Ciclos de facturación disponibles
 * @enum {string}
 */
export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
}

/**
 * Descuento por pago anual (17%)
 * @type {number}
 */
export const ANNUAL_DISCOUNT = 0.17

/**
 * Estados de suscripción
 * @enum {string}
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
}
