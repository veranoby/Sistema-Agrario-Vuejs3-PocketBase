# Bug: Pérdida de Datos de Hacienda en Refresh

## Root Cause Analysis

El bug tiene **dos causas concurrentes** que convergen para producir el fallo:

---

### Causa #1: Race Condition — `batchInitializeDashboard` inexistente

En `Dashboard.vue:194` se llama a `syncStore.batchInitializeDashboard()`, pero **este método no existe en `sync/index.js`**. Esto provoca que el `try/catch` siempre active el `catch` y caiga a `loadWithTraditionalMethod()`.

```
// Dashboard.vue:192-198
onMounted(async () => {
  try {
    await syncStore.batchInitializeDashboard() // ← SIEMPRE FALLA (no existe)
  } catch (err) {
    await loadWithTraditionalMethod() // ← siempre termina aquí
  }
})
```

`loadWithTraditionalMethod` llama a `haciendaStore.init()` que a su vez llama a `fetchHaciendaFromCache()`, que necesita `syncStore.loadFromLocalStorage('mi_hacienda')`. Esto es una operación **asíncrona sobre IndexedDB**. 

---

### Causa #2: Secuencia de init — La hacienda se inicializa en flujo de login, no en refresh

En `authStore.init()` (línea 100), el flujo de restauración de sesión:
1. Valida el token de `localStorage`
2. Llama a `setSession(record)` — solo fija `user`, `token`, `isLoggedIn`
3. **NUNCA llama a `haciendaStore.fetchHacienda()`**

El `haciendaId` existe en `authProvider.authStore.model` (el record del usuario restaurado), pero nadie lo usa para cargar la hacienda durante el init post-refresh.

Comparación:
| Flujo | ¿Carga hacienda? |
|---|---|
| Login normal (`handleSuccessfulLogin`) | ✅ `haciendaStore.fetchHacienda(haciendaId)` |
| Refresh del navegador (`init()`) | ❌ Solo restaura `user`/`token` |

---

### Causa #3: `fetchHaciendaFromCache` depende de IndexedDB (async)

`haciendaStore.fetchHaciendaFromCache()` llama a `syncStore.loadFromLocalStorage('mi_hacienda')`, que internamente usa **IndexedDB** (async). Si el `syncStore` aún no está inicializado cuando llega el `onMounted` del Dashboard, `loadFromLocalStorage` retorna `null` y `mi_hacienda` queda en `null`.

---

## Secuencia del bug post-refresh:

```
1. Browser refresh
2. main.js: initApp() → authStore.ensureAuthInitialized() → authStore.init()
3. authStore.init(): restaura token → setSession(record) → isLoggedIn=true  
4. authStore.init(): NI llama fetchHacienda NI espera syncStore.init()
5. App.vue: watch(isLoggedIn) detecta true, router avanza
6. Dashboard.vue: onMounted → batchInitializeDashboard() → THROW (no existe)
7. Dashboard.vue: catch → loadWithTraditionalMethod() → haciendaStore.init()
8. haciendaStore.init(): fetchHaciendaFromCache() → syncStore.loadFromLocalStorage()
9. syncStore aún no inicializado (o IndexedDB aún cargando) → retorna null
10. mi_hacienda = null → UI muestra error "No se encontró hacienda"
```

---

## Fix Propuesto

> [!IMPORTANT]
> El fix correcto es en `authStore.init()` — restaurar la hacienda durante la reinicialización de sesión, igual que ocurre en el login.
> No hay que tocar Dashboard.vue excepto para limpiar el método inexistente.

---

## Proposed Changes

### [MODIFY] [authStore.js](file:///home/veranoby/sistema-agri/src/stores/authStore.js)

En `setSession()` o después de validar la sesión en `init()`, extraer el `haciendaId` del modelo y llamar `haciendaStore.fetchHacienda(haciendaId)`.

```javascript
// En authStore.init(), después de setSession() exitoso (línea ~138):
const rawHacienda = authProvider.authStore.model?.hacienda
const haciendaId = typeof rawHacienda === 'object' && rawHacienda?.id
  ? rawHacienda.id
  : rawHacienda

if (haciendaId) {
  const haciendaStore = useHaciendaStore()
  // No-await: dejar que cargue en background, Dashboard tiene guard v-if
  haciendaStore.fetchHacienda(haciendaId).catch(err => 
    logger.auth('Error cargando hacienda en init:', err.message)
  )
}
```

> [!WARNING]
> Usamos fire-and-forget aquí para no bloquear el mount de la app. El Dashboard ya tiene `v-if="!mi_hacienda"` con un mensaje de advertencia. El timing entre mount y load de hacienda puede mejorarse con un watcher, pero el error actual desaparece con esta corrección.

### [MODIFY] [Dashboard.vue](file:///home/veranoby/sistema-agri/src/components/Dashboard.vue)

Limpiar `batchInitializeDashboard()` que no existe. Simplificar el `onMounted`:

```javascript
onMounted(async () => {
  await loadWithTraditionalMethod()
})
```

### [MODIFY] [syncStore/index.js](file:///home/veranoby/sistema-agri/src/stores/sync/index.js) (opcional/menor)

Si se quiere agregar `batchInitializeDashboard`, se puede en el futuro. Por ahora simplemente se elimina la referencia errónea del Dashboard.

---

## Verification Plan

1. Login normal → navegar → hacer refresh → verificar que la hacienda carga correctamente.
2. Verificar consola: no debe aparecer `[ZONAS_STORE] No haciendaId provided`.
3. Verificar que `haciendaStore.mi_hacienda` no es null después del refresh.
4. Testear con `rememberMe` activo y sin él.
