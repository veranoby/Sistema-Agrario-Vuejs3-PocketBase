# Plan para Corregir Detección de Conexión Reestablecida

El sistema actualmente no detecta correctamente cuando la conexión a internet regresa, especialmente si el modo offline fue "forzado" por un error de red previo mientras el navegador aún reportaba estar online.

## Análisis de Causa Raíz
1. **Estado Offline Forzado:** El `handleError` dispara un evento `offline` manual cuando falla una petición. Si `navigator.onLine` ya era `true`, el navegador no disparará un evento `online` posterior porque para él nunca se perdió la conexión.
2. **Dependencia de Eventos del Navegador:** `networkMonitor.js` solo reacciona a eventos `online`/`offline` nativos, los cuales son insuficientes para detectar la recuperación en estados de desincronización interna.

## Cambios Propuestos

### 1. Núcleo de Sincronización
#### [MODIFY] [networkMonitor.js](file:///home/veranoby/sistema-agri/src/stores/sync/networkMonitor.js)
- Implementar `checkConnectivity` que realice una petición real (ping) para verificar acceso a internet.
- Escuchar evento `focus` para re-verificar conexión al volver a la pestaña.
- Agregar un **Heartbeat** (intervalo) que solo se activa cuando el sistema está en modo "offline" para intentar reconectar automáticamente cada 30 segundos.

#### [MODIFY] [index.js](file:///home/veranoby/sistema-agri/src/stores/sync/index.js) (Sync Store)
- Exponer una acción `checkConnection` para permitir re-verificación manual o programada.
- Asegurar que `init()` sea resiliente a fallos de red durante la carga de módulos.

### 2. Manejo de Errores
#### [MODIFY] [errorHandler.js](file:///home/veranoby/sistema-agri/src/utils/errorHandler.js)
- Mantener el disparo del evento `offline` pero asegurar que el monitor de red esté listo para recuperarse.

## Plan de Verificación

### Pruebas Manuales
1. Simular pérdida de internet (modo avión o desconectar cable).
2. Verificar que el sistema pase a modo "Sin conexión".
3. Provocar un error de red manual (por ejemplo, bloqueando una petición en DevTools) para forzar el estado offline.
4. Reestablecer la conexión.
5. Verificar que el sistema detecte el cambio a "Conectado" automáticamente sin refrescar la página.

### Verificación de Logs
- Observar en consola los mensajes de "Heartbeat" y "Connectivity Check" durante la transición.

- [ ] Implementar verificación de conectividad proactiva en `networkMonitor.js`
    - [ ] Agregar función `checkConnectivity` con ping real (fetch HEAD)
    - [ ] Escuchar eventos `focus` y `visibilitychange`
    - [ ] Implementar Heartbeat (intervalo) de recuperación automática
- [ ] Refactorizar `sync/index.js` para integrar mejoras
    - [ ] Exponer `checkConnection` en las acciones del store
    - [ ] Asegurar que `init()` maneje estados de carga parcial si falla la red
- [ ] Verificación y Pruebas
    - [ ] Simular modo offline forzado y validar auto-recuperación
    - [ ] Verificar que el UI (Header) se actualice en tiempo real
