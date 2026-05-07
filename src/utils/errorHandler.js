import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'

// ============================================================================
// CLASES DE ERROR PERSONALIZADAS
// ============================================================================

export class AgriError extends Error {
  constructor(message, code = 'UNKNOWN', details = {}) {
    super(message)
    this.name = 'AgriError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

export class ValidationError extends AgriError {
  constructor(message, fields = []) {
    super(message, 'VALIDATION_ERROR', { fields })
    this.name = 'ValidationError'
  }
}

export class NetworkError extends AgriError {
  constructor(message, statusCode = null) {
    super(message, 'NETWORK_ERROR', { statusCode })
    this.name = 'NetworkError'
  }
}

export class AuthError extends AgriError {
  constructor(message, statusCode = null) {
    super(message, 'AUTH_ERROR', { statusCode })
    this.name = 'AuthError'
  }
}

export class PermissionError extends AgriError {
  constructor(message) {
    super(message, 'PERMISSION_ERROR')
    this.name = 'PermissionError'
  }
}

// ============================================================================
// MAPEO DE CÓDIGOS POCKETBASE A MENSAJES AMIGABLES
// ============================================================================

const POCKETBASE_ERROR_MAP = {
  400: 'Los datos enviados no son válidos',
  401: 'Tu sesión ha expirado. Inicia sesión nuevamente',
  403: 'No tienes permisos para realizar esta acción',
  404: 'El recurso solicitado no fue encontrado',
  409: 'El registro ya existe o hay un conflicto',
  429: 'Demasiadas solicitudes. Intenta en unos minutos',
  500: 'Error interno del servidor. Intenta más tarde'
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE MANEJO DE ERRORES
// ============================================================================

export function handleError(error, customMessage = null, options = { silent: false }) {
  const showMsg = (msg) => {
    if (!options.silent) showErrorMessage(msg)
  }

  // Si ya es un AgriError, usar su mensaje
  if (error instanceof AgriError) {
    showMsg(error.message)
    logError(error)
    return error
  }

  // Errores de PocketBase (status 0 es network error en PB)
  if (error?.status && error.status !== 0) {
    const friendlyMessage = POCKETBASE_ERROR_MAP[error.status] || error.message
    const agriError = mapPocketBaseError(error, friendlyMessage)
    showMsg(customMessage || friendlyMessage)
    logError(agriError)
    return agriError
  }

  // Errores de red (MANTENER la lógica original, pero usar showMsg y contemplar status === 0)
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || error?.status === 0) {
    const networkError = new NetworkError('Sin conexión a internet. Los cambios se guardarán localmente.')
    showMsg(networkError.message)
    logError(networkError)
    
    // Forzar evento offline para que el syncStore detecte el cambio si navigator.onLine falla
    window.dispatchEvent(new Event('offline'))
    
    return networkError
  }

  // Error genérico
  const genericError = new AgriError(
    customMessage || error?.message || 'Ha ocurrido un error inesperado',
    'UNKNOWN',
    { originalError: error?.message }
  )
  showMsg(genericError.message)
  logError(genericError)
  return genericError
}

function mapPocketBaseError(error, friendlyMessage) {
  const status = error.status

  if (status === 401) return new AuthError(friendlyMessage, status)
  if (status === 403) return new PermissionError(friendlyMessage)
  if (status === 400) return new ValidationError(friendlyMessage, extractValidationFields(error))
  return new AgriError(friendlyMessage, `PB_${status}`, { statusCode: status })
}

function extractValidationFields(error) {
  if (!error?.data?.data) return []
  return Object.keys(error.data.data)
}

function showErrorMessage(message) {
  try {
    const snackbar = useUiFeedbackStore()
    snackbar.showSnackbar(message, 'error')
  } catch {
    console.error('[AgriError]', message)
  }
}

function logError(error) {
  if (import.meta.env.DEV) {
    console.error(`[${error.name}]`, error.code, error.message, error.details)
  }
}
