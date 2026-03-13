/**
 * SecureLogger - Logger que filtra datos sensibles antes de output
 *
 * Características:
 * - Filtra tokens JWT, passwords, emails, y otros datos sensibles
 * - Mantiene compatibilidad con console.log para debugging
 * - Soporta sanitización recursiva de objetos
 */

// Claves sensibles que deben ser redactadas
const SENSITIVE_KEYS = [
  'token',
  'password',
  'password_confirmation',
  'email',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'auth',
  'credential'
]

// Patrones para detectar datos sensibles en valores
const SENSITIVE_PATTERNS = [
  // JWT tokens: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  // Email-like patterns (opcional, comentado por defecto)
  // /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
]

/**
 * Sanitiza un valor reemplazando datos sensibles
 */
function sanitizeValue(value, depth = 0) {
  // Prevenir recursión infinita
  if (depth > 10) {
    return '[Max depth reached]'
  }

  // Si es null o undefined, retornar tal cual
  if (value === null || value === undefined) {
    return value
  }

  // Si es un string, aplicar patrones de filtrado
  if (typeof value === 'string') {
    let sanitized = value
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
    return sanitized
  }

  // Si es un número o booleano, retornar tal cual
  if (typeof value !== 'object') {
    return value
  }

  // Si es un array, sanitizar cada elemento
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1))
  }

  // Si es un objeto, sanitizar cada propiedad
  const sanitized = {}
  for (const [key, val] of Object.entries(value)) {
    const lowerKey = key.toLowerCase()

    // Verificar si la clave es sensible
    const isSensitiveKey = SENSITIVE_KEYS.some(sensitive =>
      lowerKey.includes(sensitive.toLowerCase())
    )

    if (isSensitiveKey) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = sanitizeValue(val, depth + 1)
    }
  }

  return sanitized
}

/**
 * Convierte argumentos a string con sanitización
 */
function formatArgs(args) {
  return args.map(arg => {
    const sanitized = sanitizeValue(arg)

    if (typeof sanitized === 'object') {
      try {
        return JSON.stringify(sanitized, null, 2)
      } catch {
        return String(sanitized)
      }
    }

    return String(sanitized)
  })
}

/**
 * Logger seguro con filtrado de datos sensibles
 */
export const secureLogger = {
  /**
   * Log info con datos sensibles filtrados
   */
  log(...args) {
    const formatted = formatArgs(args)
    console.log(...formatted)
  },

  /**
   * Log warning con datos sensibles filtrados
   */
  warn(...args) {
    const formatted = formatArgs(args)
    console.warn(...formatted)
  },

  /**
   * Log error con datos sensibles filtrados
   */
  error(...args) {
    const formatted = formatArgs(args)
    console.error(...formatted)
  },

  /**
   * Log debug (solo en desarrollo) con datos sensibles filtrados
   */
  debug(...args) {
    if (import.meta.env.DEV) {
      const formatted = formatArgs(args)
      console.log('[DEBUG]', ...formatted)
    }
  },

  /**
   * Sanitiza un valor y lo retorna (útil para debugging)
   */
  sanitize(value) {
    return sanitizeValue(value)
  }
}

/**
 * Wrapper para console.log que filtra datos sensibles
 * Útil para reemplazar console.log existentes
 */
export function safeLog(...args) {
  secureLogger.log(...args)
}

/**
 * Wrapper para console.error que filtra datos sensibles
 */
export function safeError(...args) {
  secureLogger.error(...args)
}

export default secureLogger
