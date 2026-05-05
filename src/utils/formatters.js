/**
 * Formatters reutilizables para datos comunes
 * @module utils/formatters
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/constants/roles'
export { downloadFile, downloadMarkdown } from './fileDownload'

/**
 * Cache memoizado para instancias de Intl.NumberFormat
 * Evita crear instancias repetidamente para same locale/options
 */
const formatterCache = new Map()

/**
 * Obtiene un formatter cacheado o crea uno nuevo
 * @param {string} locale - Locale a usar
 * @param {Object} options - Opciones de Intl.NumberFormat
 * @returns {Intl.NumberFormat} Formatter instance
 */
function getCachedFormatter(locale, options) {
  const key = JSON.stringify({ locale, options })
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat(locale, options))
  }
  return formatterCache.get(key)
}

/**
 * Formatea una fecha usando date-fns
 * @param {string|Date} date - Fecha a formatear
 * @param {string} [formatStr='yyyy-MM-dd'] - Formato deseado
 * @returns {string} Fecha formateada o 'N/A'
 */
export function formatDate(date, formatStr = 'yyyy-MM-dd') {
  if (!date) return 'N/A'

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'N/A'
    return format(dateObj, formatStr, { locale: es })
  } catch {
    return 'N/A'
  }
}

/**
 * Formatea una fecha y hora
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha y hora formateadas
 */
export function formatDateTime(date) {
  return formatDate(date, "dd MMM yyyy, HH:mm")
}

/**
 * Formatea una fecha relativa (hace X tiempo)
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha relativa
 */
export function formatRelativeTime(date) {
  if (!date) return 'N/A'

  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'hace un momento'
  if (diffMins < 60) return `hace ${diffMins} min`
  if (diffHours < 24) return `hace ${diffHours} h`
  if (diffDays < 7) return `hace ${diffDays} días`
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`
  return `hace ${Math.floor(diffDays / 365)} años`
}

/**
 * Formatea un número con separadores de miles
 * @param {number} num - Número a formatear
 * @param {string} [locale='es-ES'] - Locale a usar
 * @returns {string} Número formateado o 'N/A' si es inválido
 */
export function formatNumber(num, locale = 'es-ES') {
  if (num == null || Number.isNaN(Number(num))) return 'N/A'
  return getCachedFormatter(locale).format(num)
}

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @param {string} [currency='EUR'] - Moneda
 * @param {string} [locale='es-ES'] - Locale a usar
 * @returns {string} Cantidad formateada o 'N/A' si es inválida
 */
export function formatCurrency(amount, currency = 'EUR', locale = 'es-ES') {
  if (amount == null || Number.isNaN(Number(amount))) return 'N/A'
  return getCachedFormatter(locale, {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Formatea un número con unidades
 * @param {number} value - Valor a formatear
 * @param {string} unit - Unidad
 * @param {number} [decimals=2] - Decimales a mostrar
 * @returns {string} Valor formateado con unidades
 */
export function formatUnit(value, unit, decimals = 2) {
  if (value === null || value === undefined) return 'N/A'
  return `${Number(value).toFixed(decimals)} ${unit}`
}

/**
 * Formatea un porcentaje
 * @param {number} value - Valor a formatear (0-100)
 * @param {number} [decimals=1] - Decimales a mostrar
 * @returns {string} Porcentaje formateado
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return 'N/A'
  return `${Number(value).toFixed(decimals)}%`
}

/**
 * Formatea un número de teléfono
 * @param {string} phone - Teléfono a formatear
 * @returns {string} Teléfono formateado
 */
export function formatPhone(phone) {
  if (!phone) return 'N/A'

  // Eliminar caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '')

  // Formatear según longitud
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`
  }

  return phone
}

/**
 * Trunca texto a una longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} [maxLength=50] - Longitud máxima
 * @param {string} [suffix='...'] - Sufijo a añadir
 * @returns {string} Texto truncado
 */
export function truncate(text, maxLength = 50, suffix = '...') {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Capitaliza la primera letra de un texto
 * @param {string} text - Texto a capitalizar
 * @returns {string} Texto capitalizado
 */
export function capitalize(text) {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Convierte texto a title case
 * @param {string} text - Texto a convertir
 * @returns {string} Texto en title case
 */
export function titleCase(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Convierte un valor a formato clave legible
 * @param {string} key - Clave (ej: 'fecha_nacimiento')
 * @returns {string} Clave legible (ej: 'Fecha de nacimiento')
 */
export function keyToLabel(key) {
  if (!key) return ''
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Formatea un tamaño de archivo
 * @param {number} bytes - Bytes a formatear
 * @returns {string} Tamaño formateado
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Formatea duración en segundos a formato legible
 * @param {number} seconds - Segundos a formatear
 * @returns {string} Duración formateada
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

/**
 * Formatea coordenadas GPS
 * @param {number} coord - Coordenada
 * @param {string} type - 'lat' o 'lng'
 * @returns {string} Coordenada formateada
 */
export function formatGPSCoordinate(coord, type) {
  if (coord === null || coord === undefined) return 'N/A'

  const direction = type === 'lat'
    ? (coord >= 0 ? 'N' : 'S')
    : (coord >= 0 ? 'E' : 'W')

  const absolute = Math.abs(coord)
  const degrees = Math.floor(absolute)
  const minutes = Math.floor((absolute - degrees) * 60)
  const seconds = ((absolute - degrees) * 60 - minutes) * 60

  return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`
}

/**
 * Objeto con todos los formatters exportados
 */
export const formatters = {
  date: formatDate,
  dateTime: formatDateTime,
  relativeTime: formatRelativeTime,
  number: formatNumber,
  currency: formatCurrency,
  unit: formatUnit,
  percent: formatPercent,
  phone: formatPhone,
  truncate,
  capitalize,
  titleCase,
  keyToLabel,
  fileSize: formatFileSize,
  duration: formatDuration,
  gps: formatGPSCoordinate
}

// ============================================================================
// FUNCIONES PARA ROLES Y ESTADOS (Compartidas)
// ============================================================================

/**
 * Formatea el rol de usuario a etiqueta amigable
 * @param {string} role - Rol del usuario
 * @returns {string} Etiqueta formateada
 */
export function formatRole(role) {
  return ROLE_LABELS[role] || role
}

/**
 * Obtiene el color Vuetify para un rol
 * @param {string} role - Rol del usuario
 * @returns {string} Color Vuetify
 */
export function getRoleColor(role) {
  return ROLE_COLORS[role] || 'grey'
}

/**
 * Formatea el estado de usuario
 * @param {string} status - Estado del usuario
 * @returns {string} Etiqueta formateada
 */
export function formatUserStatus(status) {
  return STATUS_LABELS[status] || status
}

/**
 * Obtiene el color para un estado
 * @param {string} status - Estado del usuario
 * @returns {string} Color Vuetify
 */
export function getUserStatusColor(status) {
  return STATUS_COLORS[status] || 'grey'
}

