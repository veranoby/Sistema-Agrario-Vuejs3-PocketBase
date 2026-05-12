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
  let heartbeatTimer = null
  let backoffMs = 30000 // Inicia en 30s
  const MAX_BACKOFF = 300000 // Máximo 5 minutos
  let isChecking = false
  let debounceTimer = null

  const updateStatus = (status) => {
    if (isOnline.value !== status) {
      isOnline.value = status
      if (status) {
        backoffMs = 30000 // Reset backoff al recuperar conexión
        stopHeartbeat()
      } else {
        startHeartbeat() // Iniciar ciclo de recuperación si pasamos a offline
      }
      onStatusChange?.(status)
    }
  }

  const checkConnectivity = async () => {
    if (isChecking) return
    
    // Si el navegador dice que estamos offline, no intentamos ping
    if (!navigator.onLine) {
      updateStatus(false)
      return
    }

    isChecking = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // Timeout de 5s

    try {
      // Intentar una petición HEAD ligera para verificar internet real
      // Añadimos un timestamp para evitar cache de Service Workers
      await fetch(`/favicon.ico?t=${Date.now()}`, { 
        method: 'HEAD', 
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      updateStatus(true)
    } catch (e) {
      clearTimeout(timeoutId)
      // Si falla el fetch y ya estamos en offline, incrementamos backoff
      if (!isOnline.value) {
        backoffMs = Math.min(backoffMs * 1.5, MAX_BACKOFF)
        startHeartbeat() // Programar siguiente intento con nuevo backoff
      }
      console.warn('[NetworkMonitor] Conectividad real no disponible, reintentando en:', Math.round(backoffMs/1000), 's')
    } finally {
      isChecking = false
    }
  }

  const startHeartbeat = () => {
    stopHeartbeat()
    if (!isOnline.value) {
      heartbeatTimer = setTimeout(checkConnectivity, backoffMs)
    }
  }

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  const handleOnline = () => {
    checkConnectivity()
  }

  const handleOffline = () => {
    updateStatus(false)
  }

  const debouncedCheck = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (!isOnline.value) checkConnectivity()
    }, 1000)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('focus', debouncedCheck)
  document.addEventListener('visibilitychange', debouncedCheck)

  // Iniciar heartbeat si arrancamos offline
  if (!isOnline.value) {
    startHeartbeat()
  }

  function cleanup() {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    window.removeEventListener('focus', debouncedCheck)
    document.removeEventListener('visibilitychange', debouncedCheck)
    stopHeartbeat()
    if (debounceTimer) clearTimeout(debounceTimer)
  }

  return { isOnline, cleanup, checkConnectivity }
}
