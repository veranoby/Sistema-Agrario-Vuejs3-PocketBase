/**
 * Constantes para características BPA
 * Centraliza magic strings y thresholds para mantener consistencia
 * 
 * @module constants/bpa
 */

/**
 * Niveles de cache
 * @enum {string}
 */
export const CACHE_LEVELS = {
  /** Lookup Data - TTL: 1 hora (tipos, configuraciones) */
  LOOKUP: 'l1',
  /** Recent Entries - TTL: 10 minutos (datos recientes) */
  RECENT: 'l2',
  /** Pagination - TTL: 5 minutos (resultados paginados) */
  PAGINATION: 'l3'
}

/**
 * Umbrales de cumplimiento BPA
 * @enum {number}
 */
export const COMPLIANCE_THRESHOLDS = {
  /** Excelente: >= 90% */
  EXCELLENT: 90,
  /** Bueno: >= 70% */
  GOOD: 70,
  /** Aceptable: >= 50% */
  ACCEPTABLE: 50
  /** Crítico: < 50% */
}

/**
 * Niveles de cumplimiento (texto)
 * @enum {string}
 */
export const COMPLIANCE_LEVELS = {
  EXCELLENT: 'Excelente',
  GOOD: 'Bueno',
  ACCEPTABLE: 'Aceptable',
  CRITICAL: 'Crítico'
}

/**
 * Estados de vencimiento de documentos
 * @enum {string}
 */
export const EXPIRATION_STATUS = {
  EXPIRED: 'Vencido',
  CRITICAL: 'Crítico',
  UPCOMING: 'Próximo',
  VALID: 'Vigente'
}

/**
 * Umbrales de días para vencimientos
 * @enum {number}
 */
export const EXPIRATION_THRESHOLDS = {
  CRITICAL: 30,  // < 30 días = crítico
  UPCOMING: 90   // < 90 días = próximo
}

/**
 * Generador de claves de cache
 */
export const CACHE_KEYS = {
  /**
   * Clave para hacienda
   * @param {string} id - ID de hacienda
   * @returns {string}
   */
  HACIENDA: (id) => `hacienda:${id}`,
  
  /**
   * Clave para actividades de hacienda
   * @param {string} id - ID de hacienda
   * @returns {string}
   */
  ACTIVIDADES: (id) => `actividades:hacienda:${id}`,
  
  /**
   * Clave para bitácoras de hacienda
   * @param {string} id - ID de hacienda
   * @returns {string}
   */
  BITACORAS: (id) => `bitacoras:hacienda:${id}`,
  
  /**
   * Clave para siembras de hacienda
   * @param {string} id - ID de hacienda
   * @returns {string}
   */
  SIEMBRAS: (id) => `siembras:hacienda:${id}`,
  
  /**
   * Clave para programaciones de hacienda
   * @param {string} id - ID de hacienda
   * @returns {string}
   */
  PROGRAMACIONES: (id) => `programaciones:hacienda:${id}`,
  
  /**
   * Clave para tipos de actividades
   * @returns {string}
   */
  TIPOS_ACTIVIDADES: 'tipos:actividades',
  
  /**
   * Clave para tipos de zonas
   * @returns {string}
   */
  TIPOS_ZONAS: 'tipos:zonas',
  
  /**
   * Clave para configuración de planes
   * @returns {string}
   */
  PLANES_CONFIG: 'planes:config'
}

/**
 * Templates de reportes BPA
 * @enum {string}
 */
export const REPORT_TEMPLATES = {
  LIBRO_DIARIO: 'libro_diario_bpa',
  CERTIFICACION: 'bpa_certificacion',
  TRAZABILIDAD: 'trazabilidad',
  VENCIMIENTOS: 'vencimientos'
}
