/**
 * src/utils/geo/isoCountries.js
 * Catálogo estandarizado ISO 3166-1 de países con nombres en español,
 * código Alpha-2, prefijo telefónico y bandera emoji.
 */

export const ISO_COUNTRIES = [
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', phonePrefix: '+593', defaultCurrency: 'USD' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phonePrefix: '+57', defaultCurrency: 'COP' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', phonePrefix: '+51', defaultCurrency: 'PEN' },
  { code: 'MX', name: 'México', flag: '🇲🇽', phonePrefix: '+52', defaultCurrency: 'MXN' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phonePrefix: '+56', defaultCurrency: 'CLP' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phonePrefix: '+54', defaultCurrency: 'ARS' },
  { code: 'ES', name: 'España', flag: '🇪🇸', phonePrefix: '+34', defaultCurrency: 'EUR' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', phonePrefix: '+591', defaultCurrency: 'BOB' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', phonePrefix: '+55', defaultCurrency: 'BRL' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', phonePrefix: '+506', defaultCurrency: 'CRC' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', phonePrefix: '+507', defaultCurrency: 'USD' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', phonePrefix: '+502', defaultCurrency: 'GTQ' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', phonePrefix: '+504', defaultCurrency: 'HNL' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', phonePrefix: '+503', defaultCurrency: 'USD' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', phonePrefix: '+505', defaultCurrency: 'NIO' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', phonePrefix: '+595', defaultCurrency: 'PYG' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', phonePrefix: '+598', defaultCurrency: 'UYU' },
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', phonePrefix: '+1', defaultCurrency: 'DOP' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', phonePrefix: '+1', defaultCurrency: 'USD' }
]

export const DEFAULT_COUNTRY_CODE = 'EC'

/**
 * Obtiene el país por su código ISO-2
 * @param {string} code 
 * @returns {object|null}
 */
export function getCountryByCode(code) {
  if (!code) return null
  const upper = String(code).toUpperCase().trim()
  return ISO_COUNTRIES.find(c => c.code === upper) || null
}

/**
 * Obtiene el nombre del país formateado con bandera
 * @param {string} code 
 * @returns {string}
 */
export function getCountryDisplayName(code) {
  const country = getCountryByCode(code)
  return country ? `${country.flag} ${country.name}` : (code || 'N/A')
}
