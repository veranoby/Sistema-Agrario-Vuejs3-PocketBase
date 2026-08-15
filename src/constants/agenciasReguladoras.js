/**
 * src/constants/agenciasReguladoras.js
 * Mapeo oficial de agencias y entidades fitosanitarias reguladoras por país.
 */

export const AGENCIAS_FITOSANITARIAS = {
  EC: {
    pais: 'Ecuador',
    sigla: 'AGROCALIDAD',
    nombreCompleto: 'Agencia de Regulación y Control Fito y Zoosanitario',
    normativaBase: 'Buenas Prácticas Agrícolas (BPA Ecuador)',
    registroLabel: 'N° Registro Agrocalidad',
    logoIcon: 'mdi-shield-check',
    color: 'teal-darken-2'
  },
  CO: {
    pais: 'Colombia',
    sigla: 'ICA',
    nombreCompleto: 'Instituto Colombiano Agropecuario',
    normativaBase: 'Resolución ICA Buenas Prácticas Agrícolas',
    registroLabel: 'N° Registro ICA',
    logoIcon: 'mdi-shield-check',
    color: 'green-darken-2'
  },
  PE: {
    pais: 'Perú',
    sigla: 'SENASA',
    nombreCompleto: 'Servicio Nacional de Sanidad Agraria',
    normativaBase: 'Reglamento de Inocuidad Agroalimentaria SENASA',
    registroLabel: 'N° Registro SENASA',
    logoIcon: 'mdi-shield-check',
    color: 'indigo-darken-2'
  },
  MX: {
    pais: 'México',
    sigla: 'SENASICA',
    nombreCompleto: 'Servicio Nacional de Sanidad, Inocuidad y Calidad Agroalimentaria',
    normativaBase: 'Sistemas de Reducción de Riesgos de Contaminación (SRRC)',
    registroLabel: 'N° Registro SAGARPA / SENASICA',
    logoIcon: 'mdi-shield-check',
    color: 'deep-orange-darken-2'
  },
  CL: {
    pais: 'Chile',
    sigla: 'SAG',
    nombreCompleto: 'Servicio Agrícola y Ganadero',
    normativaBase: 'Norma de Buenas Prácticas Agrícolas SAG',
    registroLabel: 'N° Registro SAG',
    logoIcon: 'mdi-shield-check',
    color: 'blue-darken-3'
  },
  ES: {
    pais: 'España',
    sigla: 'MAPA',
    nombreCompleto: 'Ministerio de Agricultura, Pesca y Alimentación',
    normativaBase: 'Registro Oficial de Productores y Operadores (ROPO)',
    registroLabel: 'N° Registro ROPO / MAPA',
    logoIcon: 'mdi-shield-check',
    color: 'amber-darken-3'
  },
  AR: {
    pais: 'Argentina',
    sigla: 'SENASA',
    nombreCompleto: 'Servicio Nacional de Sanidad y Calidad Agroalimentaria',
    normativaBase: 'BPA Obligatorias SENASA',
    registroLabel: 'N° Registro SENASA',
    logoIcon: 'mdi-shield-check',
    color: 'light-blue-darken-3'
  },
  DEFAULT: {
    pais: 'Internacional',
    sigla: 'BPA OFICIAL',
    nombreCompleto: 'Autoridad Fitosanitaria Nacional Acreditada',
    normativaBase: 'Buenas Prácticas Agrícolas Oficiales',
    registroLabel: 'N° Registro Sanitario Oficial',
    logoIcon: 'mdi-shield-check',
    color: 'primary'
  }
}

/**
 * Obtiene los metadatos de la agencia reguladora para un país dado
 * @param {string} countryCode - Código ISO-2 (ej. 'EC', 'CO', 'PE')
 * @returns {object}
 */
export function getAgenciaFitosanitaria(countryCode) {
  if (!countryCode) return AGENCIAS_FITOSANITARIAS.DEFAULT
  const upper = String(countryCode).toUpperCase().trim()
  return AGENCIAS_FITOSANITARIAS[upper] || AGENCIAS_FITOSANITARIAS.DEFAULT
}
