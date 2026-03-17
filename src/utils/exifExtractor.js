/**
 * ExifExtractor - Extracción de metadatos EXIF de imágenes
 * 
 * Extrae metadatos EXIF incluyendo geolocalización, timestamp
 * y información de cámara de fotografías.
 * 
 * @module utils/exifExtractor
 */

import { logger } from './logger'

/**
 * @typedef {Object} ExifData
 * @property {Object|null} gps - Coordenadas GPS si están disponibles
 * @property {number|null} gps.latitude - Latitud en grados decimales
 * @property {number|null} gps.longitude - Longitud en grados decimales
 * @property {number|null} gps.altitude - Altitud en metros
 * @property {string|null} dateTime - Fecha y hora de captura
 * @property {Object|null} camera - Información de la cámara
 * @property {string|null} camera.make - Marca de la cámara
 * @property {string|null} camera.model - Modelo de la cámara
 * @property {Object|null} settings - Configuración de captura
 * @property {number|null} settings.exposureTime - Tiempo de exposición
 * @property {number|null} settings.fNumber - Número f
 * @property {number|null} settings.iso - ISO
 * @property {number|null} settings.focalLength - Distancia focal
 */

/**
 * Tags EXIF comunes
 */
const EXIF_TAGS = {
  // Image
  Make: 0x010F,
  Model: 0x0110,
  DateTime: 0x0132,
  
  // GPS
  GPSLatitudeRef: 0x0001,
  GPSLatitude: 0x0002,
  GPSLongitudeRef: 0x0003,
  GPSLongitude: 0x0004,
  GPSAltitudeRef: 0x0005,
  GPSAltitude: 0x0006,
  GPSTimeStamp: 0x0007,
  
  // Exif
  DateTimeOriginal: 0x9003,
  DateTimeDigitized: 0x9004,
  ExposureTime: 0x829A,
  FNumber: 0x829D,
  ISOSpeedRatings: 0x8827,
  FocalLength: 0x920A,
  Flash: 0x9209
}

export class ExifExtractor {
  constructor() {
    this.buffer = null
    this.view = null
  }

  /**
   * Extrae metadatos EXIF de un archivo de imagen
   * 
   * @param {File} file - Archivo de imagen
   * @returns {Promise<ExifData|null>} Metadatos EXIF o null si no tiene
   * 
   * @example
   * const extractor = new ExifExtractor()
   * const exif = await extractor.extract(imageFile)
   * if (exif?.gps) {
   *   console.log(`Foto tomada en: ${exif.gps.latitude}, ${exif.gps.longitude}`)
   * }
   */
  async extract(file) {
    try {
      logger.debug('[ExifExtractor] Extrayendo EXIF...', file.name)

      // Solo JPEG soporta EXIF
      if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
        logger.debug('[ExifExtractor] Formato no soporta EXIF:', file.type)
        return null
      }

      const arrayBuffer = await file.arrayBuffer()
      this.buffer = arrayBuffer
      this.view = new DataView(arrayBuffer)

      // Verificar marker SOI (Start Of Image)
      if (this.view.getUint16(0, false) !== 0xFFD8) {
        logger.debug('[ExifExtractor] No es un JPEG válido')
        return null
      }

      // Buscar segmento APP1 (EXIF)
      const exifOffset = this.findExifSegment()
      
      if (exifOffset === -1) {
        logger.debug('[ExifExtractor] No se encontró segmento EXIF')
        return null
      }

      // Extraer datos EXIF
      const exifData = this.parseExif(exifOffset)

      logger.debug('[ExifExtractor] EXIF extraído:', {
        hasGPS: !!exifData?.gps,
        hasDateTime: !!exifData?.dateTime,
        hasCamera: !!exifData?.camera
      })

      return exifData
    } catch (error) {
      logger.error('[ExifExtractor] Error extrayendo EXIF:', error)
      return null
    }
  }

  /**
   * Encuentra el offset del segmento APP1 (EXIF)
   * 
   * @returns {number} Offset del segmento EXIF o -1 si no se encuentra
   * @private
   */
  findExifSegment() {
    let offset = 2
    const length = this.view.byteLength

    while (offset < length) {
      // Verificar marker
      if (this.view.getUint8(offset) !== 0xFF) {
        logger.debug('[ExifExtractor] Marker no encontrado en offset', offset)
        return -1
      }

      const marker = this.view.getUint8(offset + 1)

      // SOI, RST, TEM
      if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
        offset += 2
        continue
      }

      // SOS (Start Of Scan) - fin de headers
      if (marker === 0xDA) {
        logger.debug('[ExifExtractor] Fin de headers, no se encontró EXIF')
        return -1
      }

      // APP1 (EXIF)
      if (marker === 0xE1) {
        // Verificar header EXIF
        if (this.view.getUint32(offset + 4, false) === 0x45786966) { // "Exif"
          logger.debug('[ExifExtractor] Segmento EXIF encontrado en offset', offset)
          return offset + 10 // Saltar header EXIF
        }
      }

      // Saltar al siguiente segmento
      const segmentLength = this.view.getUint16(offset + 2, false)
      offset += 2 + segmentLength
    }

    return -1
  }

  /**
   * Parsea datos EXIF desde el offset encontrado
   * 
   * @param {number} offset - Offset del segmento EXIF
   * @returns {ExifData|null}
   * @private
   */
  parseExif(offset) {
    try {
      // Leer byte order (II = Intel little-endian, MM = Motorola big-endian)
      const byteOrder = this.view.getUint16(offset, false)
      const isLittleEndian = byteOrder === 0x4949 // "II"

      // Verificar tag 0x002A (42 en decimal)
      if (this.view.getUint16(offset + 2, isLittleEndian) !== 0x002A) {
        return null
      }

      // Offset al primer IFD (Image File Directory)
      const ifdOffset = this.view.getUint32(offset + 4, isLittleEndian)
      
      // Parsear IFD0
      const ifd0Tags = this.parseIFD(offset + ifdOffset, isLittleEndian)

      // Buscar sub-IFDs
      let gpsData = null
      let exifData = null

      if (ifd0Tags[EXIF_TAGS.GPSInfo]) {
        const gpsOffset = ifd0Tags[EXIF_TAGS.GPSInfo]
        gpsData = this.parseGPSIFD(offset + gpsOffset, isLittleEndian)
      }

      if (ifd0Tags[EXIF_TAGS.ExifIFDPointer]) {
        const exifOffset = ifd0Tags[EXIF_TAGS.ExifIFDPointer]
        exifData = this.parseExifIFD(offset + exifOffset, isLittleEndian)
      }

      // Combinar resultados
      return {
        gps: gpsData,
        dateTime: ifd0Tags[EXIF_TAGS.DateTime] || exifData?.dateTime,
        camera: {
          make: ifd0Tags[EXIF_TAGS.Make],
          model: ifd0Tags[EXIF_TAGS.Model]
        },
        settings: exifData?.settings || null
      }
    } catch (error) {
      logger.error('[ExifExtractor] Error parseando EXIF:', error)
      return null
    }
  }

  /**
   * Parsea un IFD (Image File Directory)
   * 
   * @param {number} offset - Offset del IFD
   * @param {boolean} isLittleEndian - Byte order
   * @returns {Object} Tags parseados
   * @private
   */
  parseIFD(offset, isLittleEndian) {
    const tags = {}
    const numEntries = this.view.getUint16(offset, isLittleEndian)
    
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = offset + 2 + (i * 12)
      
      const tag = this.view.getUint16(entryOffset, isLittleEndian)
      const type = this.view.getUint16(entryOffset + 2, isLittleEndian)
      const count = this.view.getUint32(entryOffset + 4, isLittleEndian)
      
      let valueOffset = entryOffset + 8
      let value
      
      // Si el valor cabe en 4 bytes, está inline
      if (this.getTypeSize(type) * count <= 4) {
        value = this.read_value(valueOffset, type, count, isLittleEndian)
      } else {
        // Si no, es un offset
        const absOffset = offset + this.view.getUint32(entryOffset + 8, isLittleEndian)
        value = this.read_value(absOffset, type, count, isLittleEndian)
      }

      tags[tag] = value
    }

    return tags
  }

  /**
   * Parsea IFD de GPS
   * 
   * @param {number} offset - Offset del GPS IFD
   * @param {boolean} isLittleEndian - Byte order
   * @returns {Object|null} Datos GPS
   * @private
   */
  parseGPSIFD(offset, isLittleEndian) {
    try {
      const tags = this.parseIFD(offset, isLittleEndian)

      const gps = {
        latitude: null,
        longitude: null,
        altitude: null
      }

      // Latitude
      if (tags[EXIF_TAGS.GPSLatitude] && tags[EXIF_TAGS.GPSLatitudeRef]) {
        const ref = tags[EXIF_TAGS.GPSLatitudeRef] === 'N' ? 1 : -1
        const coords = tags[EXIF_TAGS.GPSLatitude]
        gps.latitude = ref * this.dmsToDegrees(coords)
      }

      // Longitude
      if (tags[EXIF_TAGS.GPSLongitude] && tags[EXIF_TAGS.GPSLongitudeRef]) {
        const ref = tags[EXIF_TAGS.GPSLongitudeRef] === 'E' ? 1 : -1
        const coords = tags[EXIF_TAGS.GPSLongitude]
        gps.longitude = ref * this.dmsToDegrees(coords)
      }

      // Altitude
      if (tags[EXIF_TAGS.GPSAltitude]) {
        const ref = tags[EXIF_TAGS.GPSAltitudeRef] === 1 ? -1 : 1
        gps.altitude = ref * this.rationalToFloat(tags[EXIF_TAGS.GPSAltitude])
      }

      // Validar coordenadas
      if (gps.latitude !== null && gps.longitude !== null) {
        return gps
      }

      return null
    } catch (error) {
      logger.error('[ExifExtractor] Error parseando GPS:', error)
      return null
    }
  }

  /**
   * Parsea IFD de EXIF (configuración de cámara)
   * 
   * @param {number} offset - Offset del Exif IFD
   * @param {boolean} isLittleEndian - Byte order
   * @returns {Object|null} Datos EXIF
   * @private
   */
  parseExifIFD(offset, isLittleEndian) {
    try {
      const tags = this.parseIFD(offset, isLittleEndian)

      const settings = {}

      // DateTimeOriginal
      if (tags[EXIF_TAGS.DateTimeOriginal]) {
        settings.dateTime = tags[EXIF_TAGS.DateTimeOriginal]
      }

      // Exposure Time
      if (tags[EXIF_TAGS.ExposureTime]) {
        settings.exposureTime = this.rationalToFloat(tags[EXIF_TAGS.ExposureTime])
      }

      // F-Number
      if (tags[EXIF_TAGS.FNumber]) {
        settings.fNumber = this.rationalToFloat(tags[EXIF_TAGS.FNumber])
      }

      // ISO
      if (tags[EXIF_TAGS.ISOSpeedRatings]) {
        settings.iso = tags[EXIF_TAGS.ISOSpeedRatings]
      }

      // Focal Length
      if (tags[EXIF_TAGS.FocalLength]) {
        settings.focalLength = this.rationalToFloat(tags[EXIF_TAGS.FocalLength])
      }

      // Flash
      if (tags[EXIF_TAGS.Flash]) {
        settings.flash = (tags[EXIF_TAGS.Flash] & 0x01) !== 0
      }

      return {
        dateTime: settings.dateTime,
        settings: Object.keys(settings).length > 0 ? settings : null
      }
    } catch (error) {
      logger.error('[ExifExtractor] Error parseando Exif IFD:', error)
      return null
    }
  }

  /**
   * Convierte coordenadas DMS (grados, minutos, segundos) a grados decimales
   * 
   * @param {Array} coords - Array de 3 racionales [grados, minutos, segundos]
   * @returns {number} Grados decimales
   * @private
   */
  dmsToDegrees(coords) {
    if (!Array.isArray(coords) || coords.length < 3) {
      return 0
    }

    const degrees = this.rationalToFloat(coords[0])
    const minutes = this.rationalToFloat(coords[1])
    const seconds = this.rationalToFloat(coords[2])

    return degrees + minutes / 60 + seconds / 3600
  }

  /**
   * Convierte un racional (numerador/denominador) a float
   * 
   * @param {Array} rational - [numerador, denominador]
   * @returns {number}
   * @private
   */
  rationalToFloat(rational) {
    if (!Array.isArray(rational) || rational.length < 2) {
      return 0
    }
    return rational[0] / rational[1]
  }

  /**
   * Lee un valor según el tipo EXIF
   * 
   * @param {number} offset - Offset del valor
   * @param {number} type - Tipo EXIF
   * @param {number} count - Número de valores
   * @param {boolean} isLittleEndian - Byte order
   * @returns {any} Valor leído
   * @private
   */
  read_value(offset, type, count, isLittleEndian) {
    switch (type) {
      case 1: // BYTE
        return this.view.getUint8(offset)
      
      case 2: // ASCII
        return this.readString(offset, count)
      
      case 3: // SHORT
        if (count === 1) {
          return this.view.getUint16(offset, isLittleEndian)
        }
        return Array.from({ length: count }, (_, i) =>
          this.view.getUint16(offset + i * 2, isLittleEndian)
        )
      
      case 4: // LONG
        if (count === 1) {
          return this.view.getUint32(offset, isLittleEndian)
        }
        return Array.from({ length: count }, (_, i) =>
          this.view.getUint32(offset + i * 4, isLittleEndian)
        )
      
      case 5: // RATIONAL
        if (count === 1) {
          const num = this.view.getUint32(offset, isLittleEndian)
          const den = this.view.getUint32(offset + 4, isLittleEndian)
          return [num, den]
        }
        return Array.from({ length: count }, (_, i) => {
          const num = this.view.getUint32(offset + i * 8, isLittleEndian)
          const den = this.view.getUint32(offset + i * 8 + 4, isLittleEndian)
          return [num, den]
        })
      
      case 7: // UNDEFINED
        return this.view.getUint8(offset)
      
      default:
        return null
    }
  }

  /**
   * Obtiene el tamaño en bytes de un tipo EXIF
   * 
   * @param {number} type - Tipo EXIF
   * @returns {number}
   * @private
   */
  getTypeSize(type) {
    const sizes = {
      1: 1, // BYTE
      2: 1, // ASCII
      3: 2, // SHORT
      4: 4, // LONG
      5: 8, // RATIONAL
      7: 1  // UNDEFINED
    }
    return sizes[type] || 1
  }

  /**
   * Lee un string ASCII
   * 
   * @param {number} offset - Offset del string
   * @param {number} length - Longitud del string
   * @returns {string}
   * @private
   */
  readString(offset, length) {
    let str = ''
    for (let i = 0; i < length; i++) {
      const char = String.fromCharCode(this.view.getUint8(offset + i))
      if (char === '\x00') break // Null terminator
      str += char
    }
    return str.trim()
  }

  /**
   * Formatea coordenadas GPS para visualización
   * 
   * @param {Object} gps - Datos GPS
   * @returns {string} Coordenadas formateadas
   */
  formatGPSCoordinates(gps) {
    if (!gps || gps.latitude === null || gps.longitude === null) {
      return 'Sin coordenadas GPS'
    }

    const lat = gps.latitude.toFixed(6)
    const lng = gps.longitude.toFixed(6)
    const latRef = gps.latitude >= 0 ? 'N' : 'S'
    const lngRef = gps.longitude >= 0 ? 'E' : 'W'

    return `${Math.abs(gps.latitude).toFixed(4)}°${latRef}, ${Math.abs(gps.longitude).toFixed(4)}°${lngRef}`
  }

  /**
   * Formatea fecha EXIF
   * 
   * @param {string} dateTime - String de fecha EXIF (YYYY:MM:DD HH:MM:SS)
   * @returns {Date|null}
   */
  parseDateTime(dateTime) {
    if (!dateTime || typeof dateTime !== 'string') {
      return null
    }

    // Formato EXIF: "YYYY:MM:DD HH:MM:SS"
    const parts = dateTime.split(' ')
    if (parts.length !== 2) {
      return null
    }

    const dateParts = parts[0].split(':')
    const timeParts = parts[1].split(':')

    if (dateParts.length !== 3 || timeParts.length !== 3) {
      return null
    }

    return new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2]),
      parseInt(timeParts[0]),
      parseInt(timeParts[1]),
      parseInt(timeParts[2])
    )
  }
}

// Exportar instancia singleton
export const exifExtractor = new ExifExtractor()

/**
 * Hook conveniente para Vue 3 Composition API
 * 
 * @example
 * // En un componente Vue
 * import { useExifExtractor } from '@/utils/exifExtractor'
 * 
 * setup() {
 *   const { extract, isExtracting, error } = useExifExtractor()
 *   
 *   const handleFileSelect = async (file) => {
 *     const exif = await extract(file)
 *     if (exif?.gps) {
 *       console.log('Coordenadas:', exif.gps.latitude, exif.gps.longitude)
 *     }
 *   }
 *   
 *   return { handleFileSelect, isExtracting, error }
 * }
 */
export function useExifExtractor() {
  const extractor = new ExifExtractor()

  let isExtracting = false
  let error = null

  const extract = async (file) => {
    isExtracting = true
    error = null

    try {
      const exif = await extractor.extract(file)
      return exif
    } catch (err) {
      error = err
      throw err
    } finally {
      isExtracting = false
    }
  }

  const formatGPSCoordinates = (gps) => {
    return extractor.formatGPSCoordinates(gps)
  }

  const parseDateTime = (dateTime) => {
    return extractor.parseDateTime(dateTime)
  }

  return {
    extract,
    formatGPSCoordinates,
    parseDateTime,
    isExtracting,
    error
  }
}
