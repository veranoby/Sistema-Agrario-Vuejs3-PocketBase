/**
 * Validadores genéricos reutilizables
 * @module utils/validators
 */

/**
 * Valida que un valor no esté vacío
 * @param {*} value - Valor a validar
 * @returns {boolean} True si es válido
 */
export function required(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * Valida que un valor sea un email válido
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
export function email(email) {
  if (!email) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Valida que un valor sea un número
 * @param {*} value - Valor a validar
 * @param {Object} options - Opciones de validación
 * @returns {boolean} True si es válido
 */
export function number(value, options = {}) {
  if (typeof value !== 'number') return false
  if (isNaN(value)) return false

  const { min, max, integer = false } = options

  if (integer && !Number.isInteger(value)) return false
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false

  return true
}

/**
 * Valida que una fecha sea válida
 * @param {*} value - Valor a validar
 * @param {Object} options - Opciones de validación
 * @returns {boolean} True si es válida
 */
export function date(value, options = {}) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return false

  const { minDate, maxDate } = options

  if (minDate && date < new Date(minDate)) return false
  if (maxDate && date > new Date(maxDate)) return false

  return true
}

/**
 * Valida que un valor tenga una longitud mínima
 * @param {*} value - Valor a validar
 * @param {number} min - Longitud mínima
 * @returns {boolean} True si es válido
 */
export function minLength(value, min) {
  if (!value) return false
  return String(value).length >= min
}

/**
 * Valida que un valor tenga una longitud máxima
 * @param {*} value - Valor a validar
 * @param {number} max - Longitud máxima
 * @returns {boolean} True si es válido
 */
export function maxLength(value, max) {
  if (!value) return true
  return String(value).length <= max
}

/**
 * Valida que un valor esté en una lista de valores permitidos
 * @param {*} value - Valor a validar
 * @param {Array} allowedValues - Valores permitidos
 * @returns {boolean} True si es válido
 */
export function oneOf(value, allowedValues) {
  return allowedValues.includes(value)
}

/**
 * Valida un objeto con múltiples reglas
 * @param {Object} data - Objeto a validar
 * @param {Object} schema - Esquema de validación
 * @returns {Object} Resultado de validación { valid, errors }
 */
export function validate(data, schema) {
  const errors = []

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]

    for (const rule of rules) {
      let isValid = true
      let message = ''

      if (typeof rule === 'function') {
        isValid = rule(value)
        message = `Campo ${field} inválido`
      } else if (typeof rule === 'object') {
        isValid = rule.validator(value)
        message = rule.message || `Campo ${field} inválido`
      }

      if (!isValid) {
        errors.push({ field, message })
        break // Parar en el primer error de este campo
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Crea un validador de reglas para Vuetify
 * @param {Function} validator - Función de validación
 * @param {string} message - Mensaje de error
 * @returns {Function} Validador para Vuetify
 */
export function createRule(validator, message) {
  return (value) => {
    if (value === null || value === undefined || value === '') {
      return true // Los required se manejan separadamente
    }
    return validator(value) || message
  }
}

/**
 * Reglas comunes predefinidas para Vuetify
 */
export const Rules = {
  required: (msg = 'Campo requerido') => (v) => required(v) || msg,
  email: (msg = 'Email inválido') => (v) => !v || email(v) || msg,
  min: (min, msg) => (v) => !v || v >= min || msg,
  max: (max, msg) => (v) => !v || v <= max || msg,
  minLength: (min, msg) => (v) => !v || String(v).length >= min || msg,
  maxLength: (max, msg) => (v) => !v || String(v).length <= max || msg,
  phone: (msg = 'Teléfono inválido') => (v) => !v || /^\+?[\d\s\-()]+$/.test(v) || msg
}

// ============================================================================
// FUNCIONES MIGRADAS DESDE validationUtils.js
// ============================================================================

/**
 * Calcula fortaleza de contraseña (0-100)
 * @param {string} password
 * @returns {number}
 */
export function calculatePasswordStrength(password) {
  if (!password) return 0
  let strength = 0
  if (password.length >= 8) strength += 25
  if (password.length >= 12) strength += 15
  if (/\d/.test(password)) strength += 20
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20
  return Math.min(strength, 100)
}

/**
 * Obtiene color según fortaleza de contraseña
 * @param {number} strength
 * @returns {string}
 */
export function getPasswordStrengthColor(strength) {
  if (strength < 40) return 'error'
  if (strength < 70) return 'warning'
  return 'success'
}

/**
 * Obtiene label según fortaleza de contraseña
 * @param {number} strength
 * @param {Function} t - función de traducción i18n
 * @returns {string}
 */
export function getPasswordStrengthLabel(strength, t) {
  if (strength < 40) return t('auth.password_weak')
  if (strength < 70) return t('auth.password_medium')
  return t('auth.password_strong')
}

/**
 * Valida formato de username (sin caracteres especiales)
 * @param {string} username
 * @returns {boolean}
 */
export function isValidUsername(username) {
  return !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(username)
}

/**
 * Convierte valor a mayúsculas de forma segura
 * @param {string} value
 * @returns {string}
 */
export function toUpperCase(value) {
  return value ? value.toUpperCase() : ''
}
