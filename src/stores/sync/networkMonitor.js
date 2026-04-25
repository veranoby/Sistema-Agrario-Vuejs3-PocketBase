/**
 * networkMonitor.js
 * Stateful monitor de conexión
 * Detecta cambios de online/offline y notifica vía callback
 */

import { ref } from 'vue'

/**
 * Inicializa el monitor de red
 * @param {Function} onStatusChange - Callback que recibe (isOnline: boolean)
 * @returns {Object} - { isOnline: Ref<boolean> }
 */
export function initNetworkMonitor(onStatusChange) {
  const isOnline = ref(navigator.onLine)

  window.addEventListener('online', () => {
    isOnline.value = true
    onStatusChange?.(true)
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
    onStatusChange?.(false)
  })

  return { isOnline }
}
