import mitt from 'mitt'

const eventBus = mitt()

// Tipos de eventos (centralizados)
export const EVENTS = {
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

export default eventBus
export { EVENTS }
