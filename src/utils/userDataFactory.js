/**
 * Factory para crear objetos de datos de usuario
 * Centraliza la lógica de transformación de formulario a formato PocketBase
 * Evita acoplamiento circular entre authStore y userStore
 */

/**
 * Crea objeto de datos de usuario para PocketBase
 * @param {Object} formData - Datos del formulario
 * @param {string} role - Rol del usuario
 * @param {string} haciendaId - ID de la hacienda
 * @param {boolean} isNewHacienda - Si es creación de hacienda nueva
 * @returns {Object} Datos formateados para PocketBase
 */
export function createUserData(formData, role, haciendaId, isNewHacienda = false) {
  return {
    username: formData.username.toUpperCase(),
    email: formData.email.toLowerCase(),
    firstname: formData.firstname?.toUpperCase() || '',
    lastname: formData.lastname?.toUpperCase() || '',
    name: `${formData.firstname || ''} ${formData.lastname || ''}`.trim().toUpperCase(),
    password: formData.password,
    passwordConfirm: formData.password,
    role: role,
    hacienda: haciendaId,
    status: 'active',
    emailVisibility: true,
    isNewHacienda
  }
}

/**
 * Crea objeto de datos para actualización (sin password por defecto)
 * @param {Object} formData - Datos del formulario
 * @param {string} role - Rol del usuario
 * @param {string} haciendaId - ID de la hacienda
 * @returns {Object} Datos formateados para actualización
 */
export function createUserUpdateData(formData, role, haciendaId) {
  const data = {
    email: formData.email.toLowerCase(),
    username: formData.username.toUpperCase(),
    firstname: formData.firstname?.toUpperCase() || '',
    lastname: formData.lastname?.toUpperCase() || '',
    name: `${formData.firstname || ''} ${formData.lastname || ''}`.trim().toUpperCase(),
    role: role,
    hacienda: haciendaId,
    status: formData.status || 'active'
  }

  // Solo incluir password si se proporciona
  if (formData.password) {
    data.password = formData.password
    data.passwordConfirm = formData.password
  }

  return data
}

/**
 * Genera nombre completo en mayúsculas
 * @param {string} firstname - Nombre
 * @param {string} lastname - Apellido
 * @returns {string} Nombre completo en mayúsculas
 */
export function generateFullName(firstname = '', lastname = '') {
  return `${firstname} ${lastname}`.trim().toUpperCase()
}

/**
 * Normaliza username (mayúsculas, sin espacios)
 * @param {string} username - Username crudo
 * @returns {string} Username normalizado
 */
export function normalizeUsername(username) {
  return username.toUpperCase().replace(/\s/g, '')
}

/**
 * Normaliza email (minúsculas, sin espacios)
 * @param {string} email - Email crudo
 * @returns {string} Email normalizado
 */
export function normalizeEmail(email) {
  return email.toLowerCase().trim()
}
