/**
 * networkMonitor.js
 * Stateful monitor de conexión
 * Detecta cambios de online/offline y notifica vía callback
 */

import { ref } from 'vue'

/**
 * Inicializa el monitor de red
 * @param {Function} onStatusChange - Callback que recibe (isOnline: boolean)
 * @returns {Object} - { isOnline: Ref<boolean>, cleanup: Function }
 */
export function initNetworkMonitor(onStatusChange) {
  const isOnline = ref(navigator.onLine)

  const handleOnline = () => {
    isOnline.value = true
    onStatusChange?.(true)
  }

  const handleOffline = () => {
    isOnline.value = false
    onStatusChange?.(false)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  function cleanup() {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  return { isOnline, cleanup }
}
