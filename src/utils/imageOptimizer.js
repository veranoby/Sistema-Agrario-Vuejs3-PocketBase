/**
 * ImageOptimizer - Compresión y optimización de imágenes
 * 
 * Proporciona compresión automática de imágenes para reducir
 * el tamaño de archivos manteniendo calidad aceptable.
 * 
 * @module utils/imageOptimizer
 */

import { logger } from './logger'

/**
 * @typedef {Object} ImageOptimizerOptions
 * @property {number} [maxWidth=1920] - Ancho máximo en píxeles
 * @property {number} [maxHeight=1080] - Alto máximo en píxeles
 * @property {number} [quality=0.8] - Calidad de compresión (0-1)
 * @property {number} [maxSizeMB=2] - Tamaño máximo en MB
 * @property {string} [format='image/jpeg'] - Formato de salida
 */

/**
 * @typedef {Object} OptimizedImage
 * @property {File} file - Archivo optimizado
 * @property {number} originalSize - Tamaño original en bytes
 * @property {number} newSize - Nuevo tamaño en bytes
 * @property {number} compressionRatio - Porcentaje de compresión
 * @property {number} width - Ancho final
 * @property {number} height - Alto final
 */

export class ImageOptimizer {
  constructor(options = {}) {
    this.options = {
      maxWidth: options.maxWidth || 1920,
      maxHeight: options.maxHeight || 1080,
      quality: options.quality || 0.8,
      maxSizeMB: options.maxSizeMB || 0.5,
      maxInputSizeMB: options.maxInputSizeMB || 10,
      format: options.format || 'image/jpeg',
      ...options
    }

    this.maxInputSizeBytes = this.options.maxInputSizeMB * 1024 * 1024
    this.maxSizeBytes = this.options.maxSizeMB * 1024 * 1024
  }

  /**
   * Valida si un archivo es una imagen válida
   * 
   * @param {File} file - Archivo a validar
   * @returns {Promise<boolean>}
   * @throws {Error} Si la validación falla
   */
  async validate(file) {
    // Validar tipo mínimo
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo no es una imagen válida')
    }

    // Validar tipos soportados por canvas (excluye HEIC/HEIF que los navegadores no pueden dibujar)
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Formato no soportado: ${file.type}. Use JPEG, PNG o WebP`)
    }

    // Validar tamaño de entrada
    if (file.size > this.maxInputSizeBytes) {
      const maxSizeFormatted = this.formatBytes(this.maxInputSizeBytes)
      const fileSizeFormatted = this.formatBytes(file.size)
      throw new Error(`Imagen muy grande. Máximo ${maxSizeFormatted}, recibido ${fileSizeFormatted}`)
    }

    // Nota: No llamamos getImageDimensions() aqui — compress() ya lo hace.
    // Evita doble carga del archivo en el ciclo iterativo de compressToSize.
    return true
  }

  /**
   * Obtiene dimensiones de una imagen
   * 
   * @param {File} file - Archivo de imagen
   * @returns {Promise<{width: number, height: number}>}
   * @private
   */
  async getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        const dimensions = { width: img.width, height: img.height }
        URL.revokeObjectURL(url)
        resolve(dimensions)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Error cargando imagen'))
      }

      img.src = url
    })
  }

  /**
   * Comprime una imagen manteniendo calidad aceptable
   * 
   * @param {File} file - Archivo de imagen original
   * @returns {Promise<OptimizedImage>}
   * 
   * @example
   * const optimizer = new ImageOptimizer({ maxSizeMB: 2, quality: 0.75 })
   * const result = await optimizer.compress(imageFile)
   * console.log(`Compresión: ${result.compressionRatio}%`)
   */
  async compress(file) {
    try {
      const originalSize = file.size
      logger.debug('[ImageOptimizer] Iniciando compresión...', {
        originalSize: this.formatBytes(originalSize),
        type: file.type
      })

      // Validar archivo
      await this.validate(file)

      // Obtener dimensiones originales
      const dimensions = await this.getImageDimensions(file)
      logger.debug('[ImageOptimizer] Dimensiones originales:', dimensions)

      // Calcular nuevas dimensiones
      const newDimensions = this.calculateDimensions(dimensions.width, dimensions.height)
      logger.debug('[ImageOptimizer] Nuevas dimensiones:', newDimensions)

      // Crear canvas y comprimir
      const compressedBlob = await this.createCompressedBlob(file, newDimensions)

      // Crear File optimizado
      const optimizedFile = new File(
        [compressedBlob],
        this.getOptimizedFilename(file.name),
        { type: this.options.format }
      )

      const newSize = optimizedFile.size
      const compressionRatio = Math.round((1 - newSize / originalSize) * 100)

      logger.debug('[ImageOptimizer] Compresión completada:', {
        originalSize: this.formatBytes(originalSize),
        newSize: this.formatBytes(newSize),
        compressionRatio: `${compressionRatio}%`
      })

      return {
        file: optimizedFile,
        originalSize,
        newSize,
        compressionRatio,
        width: newDimensions.width,
        height: newDimensions.height
      }
    } catch (error) {
      logger.error('[ImageOptimizer] Error comprimiendo imagen:', error.message || error, { type: file?.type, size: file?.size })
      throw error
    }
  }

  /**
   * Comprime una imagen iterativamente hasta alcanzar el tamaño objetivo
   * 
   * @param {File} file - Archivo de imagen original
   * @param {number} targetSizeMB - Tamaño objetivo en MB
   * @returns {Promise<OptimizedImage>}
   */
  async compressToSize(file, targetSizeMB = null) {
    const targetSize = (targetSizeMB || this.options.maxSizeMB) * 1024 * 1024
    let quality = this.options.quality
    let result = null
    let lastError = null

    logger.debug('[ImageOptimizer] Compresión iterativa hasta', this.formatBytes(targetSize))

    // Intentar comprimir con calidad decreciente
    while (quality >= 0.3) {
      try {
        const tempOptimizer = new ImageOptimizer({
          ...this.options,
          quality: quality
        })

        result = await tempOptimizer.compress(file)
        lastError = null

        if (result.newSize <= targetSize) {
          logger.debug('[ImageOptimizer] Tamaño objetivo alcanzado con calidad', quality.toFixed(2))
          break
        }
      } catch (err) {
        lastError = err
        logger.warn('[ImageOptimizer] Fallo en pase de calidad', quality.toFixed(2), ':', err.message)
        // Si el primer pase falla por validación, no tiene sentido reintentar
        if (err.message.includes('Formato') || err.message.includes('grande')) throw err
      }

      quality -= 0.1
    }

    if (lastError && !result) throw lastError

    if (result && result.newSize > targetSize) {
      logger.warn('[ImageOptimizer] No se pudo alcanzar el tamaño objetivo')
    }

    return result
  }

  /**
   * Redimensiona una imagen sin compresión
   * 
   * @param {File} file - Archivo de imagen original
   * @param {number} maxWidth - Ancho máximo
   * @param {number} maxHeight - Alto máximo
   * @returns {Promise<File>}
   */
  async resize(file, maxWidth, maxHeight) {
    const dimensions = await this.getImageDimensions(file)

    // Si ya es más pequeña, devolver original
    if (dimensions.width <= maxWidth && dimensions.height <= maxHeight) {
      return file
    }

    const newDimensions = this.calculateDimensions(dimensions.width, dimensions.height, maxWidth, maxHeight)

    const resizedBlob = await this.createCompressedBlob(file, newDimensions, 1.0)

    return new File([resizedBlob], file.name, { type: file.type })
  }

  /**
   * Convierte una imagen a otro formato
   * 
   * @param {File} file - Archivo de imagen original
   * @param {string} format - Formato de destino (image/jpeg, image/png, image/webp)
   * @param {number} quality - Calidad (0-1)
   * @returns {Promise<File>}
   */
  async convertFormat(file, format = 'image/jpeg', quality = 0.9) {
    const dimensions = await this.getImageDimensions(file)

    const tempOptimizer = new ImageOptimizer({
      maxWidth: dimensions.width,
      maxHeight: dimensions.height,
      quality: quality,
      format: format
    })

    const result = await tempOptimizer.compress(file)
    return result.file
  }

  /**
   * Crea un thumbnail de la imagen
   * 
   * @param {File} file - Archivo de imagen original
   * @param {number} size - Tamaño del thumbnail (cuadrado)
   * @returns {Promise<File>}
   */
  async createThumbnail(file, size = 200) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const img = new Image()

        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size

          const ctx = canvas.getContext('2d')

          // Calcular crop centrado
          const minDim = Math.min(img.width, img.height)
          const sx = (img.width - minDim) / 2
          const sy = (img.height - minDim) / 2

          // Dibujar imagen recortada y escalada
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const thumbnail = new File([blob], `thumb_${file.name}`, {
                  type: 'image/jpeg'
                })
                resolve(thumbnail)
              } else {
                reject(new Error('Error creando thumbnail'))
              }
            },
            'image/jpeg',
            0.8
          )
        }

        img.onerror = () => reject(new Error('Error cargando imagen'))
        img.src = event.target.result
      }

      reader.onerror = () => reject(new Error('Error leyendo archivo'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Calcula nuevas dimensiones manteniendo aspect ratio
   * 
   * @param {number} width - Ancho original
   * @param {number} height - Alto original
   * @param {number} maxWidth - Ancho máximo
   * @param {number} maxHeight - Alto máximo
   * @returns {{width: number, height: number}}
   * @private
   */
  calculateDimensions(width, height, maxWidth = null, maxHeight = null) {
    const maxW = maxWidth || this.options.maxWidth
    const maxH = maxHeight || this.options.maxHeight

    let newWidth = width
    let newHeight = height

    // Calcular ratio
    const ratio = Math.min(maxW / width, maxH / height)

    // Solo escalar si es más grande que el máximo
    if (ratio < 1) {
      newWidth = Math.round(width * ratio)
      newHeight = Math.round(height * ratio)
    }

    return { width: newWidth, height: newHeight }
  }

  /**
   * Crea un Blob comprimido desde una imagen
   * 
   * @param {File} file - Archivo de imagen original
   * @param {{width: number, height: number}} dimensions - Nuevas dimensiones
   * @param {number} quality - Calidad de compresión
   * @returns {Promise<Blob>}
   * @private
   */
  async createCompressedBlob(file, dimensions, quality = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const img = new Image()

        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = dimensions.width
          canvas.height = dimensions.height

          const ctx = canvas.getContext('2d')

          // Fondo blanco para JPEG (evitar transparencia negra)
          if (this.options.format === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }

          // Dibujar imagen redimensionada con smoothing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)

          // Convertir a blob con compresión
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Error comprimiendo imagen'))
              }
            },
            this.options.format,
            quality !== null ? quality : this.options.quality
          )
        }

        img.onerror = () => reject(new Error('Error cargando imagen'))
        img.src = event.target.result
      }

      reader.onerror = () => reject(new Error('Error leyendo archivo'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Genera nombre de archivo optimizado
   * 
   * @param {string} originalName - Nombre original
   * @returns {string}
   * @private
   */
  getOptimizedFilename(originalName) {
    const lastDot = originalName.lastIndexOf('.')
    const nameWithoutExt = lastDot > 0 ? originalName.substring(0, lastDot) : originalName
    const ext = this.options.format.split('/')[1] || 'jpg'

    return `${nameWithoutExt}_optimized.${ext}`
  }

  /**
   * Formatea bytes a string legible
   * 
   * @param {number} bytes - Bytes a formatear
   * @returns {string}
   * @private
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Obtiene información de una imagen sin comprimirla
   * 
   * @param {File} file - Archivo de imagen
   * @returns {Promise<Object>}
   */
  async getImageInfo(file) {
    const dimensions = await this.getImageDimensions(file)

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeFormatted: this.formatBytes(file.size),
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio: (dimensions.width / dimensions.height).toFixed(2),
      isPortrait: dimensions.height > dimensions.width,
      isLandscape: dimensions.width > dimensions.height,
      isSquare: dimensions.width === dimensions.height
    }
  }
}

// Exportar instancia singleton con configuración por defecto
export const imageOptimizer = new ImageOptimizer({
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeMB: 0.5,
  format: 'image/jpeg'
})

/**
 * Hook conveniente para Vue 3 Composition API
 * 
 * @example
 * // En un componente Vue
 * import { useImageOptimizer } from '@/utils/imageOptimizer'
 * 
 * setup() {
 *   const { compress, isOptimizing, error } = useImageOptimizer()
 *   
 *   const handleFileSelect = async (file) => {
 *     try {
 *       const result = await compress(file)
 *       console.log(`Compresión: ${result.compressionRatio}%`)
 *     } catch (err) {
 *       console.error('Error:', err)
 *     }
 *   }
 *   
 *   return { handleFileSelect, isOptimizing, error }
 * }
 */
export function useImageOptimizer() {
  const optimizer = new ImageOptimizer()

  let isOptimizing = false
  let error = null
  let progress = 0

  const compress = async (file, options = null) => {
    isOptimizing = true
    error = null
    progress = 0

    try {
      if (options) {
        const tempOptimizer = new ImageOptimizer(options)
        const result = await tempOptimizer.compress(file)
        progress = 100
        return result
      }

      const result = await optimizer.compress(file)
      progress = 100
      return result
    } catch (err) {
      error = err
      throw err
    } finally {
      isOptimizing = false
    }
  }

  const compressToSize = async (file, targetSizeMB) => {
    isOptimizing = true
    error = null

    try {
      const result = await optimizer.compressToSize(file, targetSizeMB)
      return result
    } catch (err) {
      error = err
      throw err
    } finally {
      isOptimizing = false
    }
  }

  const createThumbnail = async (file, size = 200) => {
    isOptimizing = true
    error = null

    try {
      const thumbnail = await optimizer.createThumbnail(file, size)
      return thumbnail
    } catch (err) {
      error = err
      throw err
    } finally {
      isOptimizing = false
    }
  }

  const getImageInfo = async (file) => {
    return optimizer.getImageInfo(file)
  }

  return {
    compress,
    compressToSize,
    createThumbnail,
    getImageInfo,
    isOptimizing,
    error,
    progress
  }
}
