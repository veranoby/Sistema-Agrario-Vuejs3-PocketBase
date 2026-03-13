/**
 * Constantes de paginación compartidas entre stores
 *
 * Estas constantes aseguran un comportamiento consistente
 * en todas las operaciones de paginación de la aplicación.
 */

/**
 * Tamaño máximo de página para prevenir la carga de todos los registros
 * Este límite equilibra el rendimiento del servidor con la experiencia de usuario
 */
export const MAX_PAGE_SIZE = 100

/**
 * Tamaño de página predeterminado para la mayoría de las vistas
 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * Tamaños de página disponibles para selectores de UI
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
