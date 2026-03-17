/**
 * Debounce helper nativo - sin dependencias externas
 * Reemplaza lodash.debounce con una implementación ligera
 */

/**
 * Crea una función debounced que retrasa la ejecución de `func`
 * hasta que hayan pasado `wait` milisegundos desde la última llamada.
 *
 * @param {Function} func - La función a debounce
 * @param {number} wait - Tiempo de espera en milisegundos
 * @returns {Function} Función debounced con método `.cancel()`
 *
 * @example
 * const debouncedFn = debounce(() => console.log('executed'), 500)
 * debouncedFn() // Se ejecutará después de 500ms
 * debouncedFn.cancel() // Cancela la ejecución pendiente
 */
export function debounce(func, wait = 0) {
  let timeoutId = null

  const debounced = function (...args) {
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      timeoutId = null
      return func.apply(this, args)
    }, wait)
  }

  // Método para cancelar la ejecución pendiente
  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  // Método para ejecutar inmediatamente (flush)
  debounced.flush = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
      return func.apply(this, arguments)
    }
  }

  return debounced
}

/**
 * Throttle helper nativo - asegura que una función se ejecute
 * como máximo una vez cada `wait` milisegundos
 *
 * @param {Function} func - La función a throttle
 * @param {number} wait - Tiempo mínimo entre ejecuciones en ms
 * @returns {Function} Función throttled con método `.cancel()`
 */
export function throttle(func, wait = 0) {
  let timeoutId = null
  let lastExecution = 0

  const throttled = function (...args) {
    const now = Date.now()
    const timeSinceLastExecution = now - lastExecution

    if (timeSinceLastExecution >= wait) {
      // Ejecutar inmediatamente si ha pasado suficiente tiempo
      lastExecution = now
      return func.apply(this, args)
    } else if (timeoutId === null) {
      // Programar ejecución para el próximo momento válido
      const remainingTime = wait - timeSinceLastExecution
      timeoutId = setTimeout(() => {
        lastExecution = Date.now()
        timeoutId = null
        return func.apply(this, args)
      }, remainingTime)
    }
  }

  throttled.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return throttled
}
