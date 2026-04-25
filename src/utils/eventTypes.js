/**
 * Constantes de tipos de eventos para el sistema de eventos centralizado
 * @module utils/eventTypes
 */

/**
 * Tipos de eventos disponibles en el sistema
 * @enum {string}
 */
export const EVENT_TYPES = {
  // Alertas
  ALERTA_ENVIADA: 'alerta:enviada',
  ALERT_CONFIG_UPDATED: 'alerta:config:updated',

  // Módulos
  MODULO_ACTIVADO: 'modulo:activado',
  MODULO_DESACTIVADO: 'modulo:desactivado',
  MODULO_LIMIT_REACHED: 'modulo:limit:reached',

  // Haciendas
  HACIENDA_UPDATED: 'hacienda:updated',
  USUARIO_ADDED: 'usuario:added',
  USUARIO_REMOVED: 'usuario:removed',

  // Programaciones
  PROGRAMACION_CREADA: 'programacion:creada',
  PROGRAMACION_ACTUALIZADA: 'programacion:actualizada',

  // Bitácora
  BITACORA_REGISTRO: 'bitacora:registro',
  BPA_VENCIDO: 'bpa:vencido'
}

/**
 * Alias para compatibilidad con eventBus.js
 */
export const EVENTS = EVENT_TYPES

export default EVENT_TYPES
