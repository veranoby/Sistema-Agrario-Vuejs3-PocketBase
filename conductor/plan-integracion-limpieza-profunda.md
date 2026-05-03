# Diagnóstico y Feedback

El diagnóstico que has realizado es excelente al identificar que un fallo de inicialización está filtrándose como un `NetworkError` visible para el usuario. Sin embargo, hay un detalle crítico con respecto a la detección de errores de red y la librería de PocketBase.

**Feedback sobre tu plan:**
1. **`errorHandler.js`**: El cambio propuesto a `error?.name === 'TypeError'` **romperá la detección de desconexión de PocketBase**. Cuando PocketBase falla por red, lanza una clase `ClientResponseError` (no `TypeError`) con `status: 0`. Si restringimos la detección solo a `TypeError`, la app dejará de mostrar el mensaje de "Sin conexión a internet" cuando realmente el usuario intente realizar una acción (como guardar) sin conexión.
2. **`main.js`**: El stack trace indica que el error está llegando a `handleError` a través del listener global `unhandledrejection` (línea ~106). Esto significa que hay promesas asíncronas (probablemente dentro de `syncStore.init()`) que fallan en background y no están siendo esperadas (`await`), por lo que escapan del `try/catch` principal de `initApp` y disparan el error global no manejado.

---

# Plan de Implementación Optimizado

Vamos a optimizar el manejador de errores para que soporte un "modo silencioso" y vamos a ignorar visualmente los errores de red que ocurren en background, manteniendo la UI limpia pero registrando todo en consola para el debugging.

### Archivo: `src/utils/errorHandler.js`

**Cambio:** Permitir que `handleError` reciba un parámetro de opciones para silenciar el error, evitando mostrar el snackbar pero manteniendo el log.

```javascript
// MODIFICAR FIRMA DE LA FUNCIÓN
export function handleError(error, customMessage = null, options = { silent: false }) {
  
  const showMsg = (msg) => {
    if (!options.silent) showErrorMessage(msg);
  };

  // Si ya es un AgriError
  if (error instanceof AgriError) {
    showMsg(error.message)
    logError(error)
    return error
  }

  // Errores de PocketBase (status 0 es network error en PB)
  if (error?.status && error.status !== 0) {
    const friendlyMessage = POCKETBASE_ERROR_MAP[error.status] || error.message
    const agriError = mapPocketBaseError(error, friendlyMessage)
    showMsg(customMessage || friendlyMessage)
    logError(agriError)
    return agriError
  }

  // Errores de red (MANTENER la lógica original, pero usar showMsg y contemplar status === 0)
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || error?.status === 0) {
    const networkError = new NetworkError('Sin conexión a internet. Los cambios se guardarán localmente.')
    showMsg(networkError.message)
    logError(networkError)
    return networkError
  }

  // Error genérico
  const genericError = new AgriError(
    customMessage || error?.message || 'Ha ocurrido un error inesperado',
    'UNKNOWN',
    { originalError: error?.message }
  )
  showMsg(genericError.message)
  logError(genericError)
  return genericError
}
```

### Archivo: `src/main.js`

**Cambio:** Configurar los manejadores globales para que los fallos de red asíncronos (como inicializaciones de stores o background syncs) no interrumpan la UI.

```javascript
// 1. Mejorar el listener de unhandledrejection
window.addEventListener('unhandledrejection', (event) => {
  const isNetworkError = event.reason?.message?.includes('Failed to fetch') || 
                         event.reason?.message?.includes('NetworkError') ||
                         event.reason?.status === 0;

  // Silenciar visualmente errores de red huérfanos (típicos de syncStore o background)
  handleError(event.reason, 'Error no manejado', { silent: isNetworkError })
  event.preventDefault()
})

// 2. Refinar initApp (similar a tu propuesta)
const initApp = async () => {
  const authStore = useAuthStore()
  const syncStore = useSyncStore()
  const themeStore = useThemeStore()

  try {
    const currentTheme = themeStore.currentTheme
    document.documentElement.setAttribute('data-theme', currentTheme)

    const isAuthenticated = await authStore.ensureAuthInitialized()
    
    if (isAuthenticated) {
      try {
        await syncStore.init()
      } catch (syncError) {
        console.warn('[App] Sync init falló o estamos offline, continuando...', syncError.message)
      }
    }
  } catch (error) {
    // Enviar a handleError pero en modo silencioso si es de red
    const isNetworkError = error?.message?.includes('Failed to fetch') || 
                           error?.message?.includes('NetworkError') || 
                           error?.status === 0;
    handleError(error, 'Error durante inicialización', { silent: isNetworkError })
  } finally {
    app.mount('#app')
  }
}
```

---

### Resumen de Beneficios
1. **Robustez**: PocketBase sigue alertando de falta de red cuando el usuario hace acciones directas (con `status: 0`), sin quedar censurado por la validación de `TypeError`.
2. **Resiliencia Offline**: Los procesos asíncronos en segundo plano que rebotan por red no contaminarán la UI con notificaciones de error.
3. **Mantenibilidad**: Se centraliza la regla de notificaciones en `errorHandler.js` vía el parámetro de modo silencioso.
