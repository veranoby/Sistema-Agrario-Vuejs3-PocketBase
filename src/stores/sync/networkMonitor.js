/**
 * networkMonitor.js
 * Stateful monitor de conexión
 * Detecta cambios de online/offline y notifica vía callback
 */

import { ref } from 'vue'
import { pb } from '@/utils/pocketbase'

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
      startHeartbeat() // REAGENDAR incondicionalmente
      return
    }

    isChecking = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // Timeout de 5s

    let hasConnectivity = false

    try {
      // 1. Intentar conectividad real con Google (CORS transparente/no-cors)
      await fetch('https://clients3.google.com/generate_204', { 
        method: 'HEAD', 
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      })
      hasConnectivity = true
    } catch (e) {
      // 2. Si falla el internet general, comprobar si nuestro servidor PocketBase es accesible (ej. LAN o local)
      try {
        await fetch(`${pb.baseUrl}/api/health`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        })
        hasConnectivity = true
      } catch (pbErr) {
        // 3. Fallback final local por si acaso
        try {
          await fetch(`/favicon.ico?t=${Date.now()}`, { 
            method: 'HEAD', 
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
          })
          hasConnectivity = true
        } catch (localErr) {
          hasConnectivity = false
        }
      }
    } finally {
      clearTimeout(timeoutId)
      isChecking = false
    }

    if (hasConnectivity) {
      updateStatus(true)
    } else {
      // Forzar transición de estado si el ping falló pero el navegador no se enteró
      updateStatus(false)
      
      // Si falla el fetch y estamos en offline, incrementamos backoff y reagendamos
      backoffMs = Math.min(backoffMs * 1.5, MAX_BACKOFF)
      startHeartbeat() // Programar siguiente intento con nuevo backoff
      
      console.warn('[NetworkMonitor] Conectividad real no disponible, reintentando en:', Math.round(backoffMs/1000), 's')
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
