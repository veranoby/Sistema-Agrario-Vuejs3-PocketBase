/**
 * Validation Utilities
 * Shared validation logic for password strength, email, and other form validations
 */

/**
 * Calculate password strength (0-100)
 * @param {string} password - The password to evaluate
 * @returns {number} Strength score from 0 to 100
 */
export function calculatePasswordStrength(password) {
  if (!password) return 0

  let strength = 0

  // Length criteria
  if (password.length >= 8) strength += 25
  if (password.length >= 12) strength += 15

  // Contains numbers
  if (/\d/.test(password)) strength += 20

  // Contains both lowercase and uppercase
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20

  // Contains special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20

  return Math.min(strength, 100)
}

/**
 * Get password strength color based on score
 * @param {number} strength - Strength score from calculatePasswordStrength
 * @returns {string} Vuetify color name ('error', 'warning', or 'success')
 */
export function getPasswordStrengthColor(strength) {
  if (strength < 40) return 'error'
  if (strength < 70) return 'warning'
  return 'success'
}

/**
 * Get password strength label based on score
 * @param {number} strength - Strength score from calculatePasswordStrength
 * @param {Function} t - i18n translation function
 * @returns {string} Localized strength label
 */
export function getPasswordStrengthLabel(strength, t) {
  if (strength < 40) return t('auth.password_weak')
  if (strength < 70) return t('auth.password_medium')
  return t('auth.password_strong')
}

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate username (no special characters)
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username format
 */
export function isValidUsername(username) {
  return !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(username)
}

/**
 * Convert value to uppercase safely
 * @param {string} value - Value to convert
 * @returns {string} Uppercase value or empty string if null/undefined
 */
export function toUpperCase(value) {
  return value ? value.toUpperCase() : ''
}
