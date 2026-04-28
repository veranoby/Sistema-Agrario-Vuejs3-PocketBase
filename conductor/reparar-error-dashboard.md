# Plan: Reparar error de carga en Dashboard

## Objetivo
Solucionar el error `syncStore.loadDashboardWithParallelRequests is not a function` que ocurre al cargar el Dashboard.

## Análisis
- `Dashboard.vue` intenta llamar a `syncStore.loadDashboardWithParallelRequests()`, pero esta función no existe en `src/stores/sync/index.js`.
- `syncStore` tiene una acción similar llamada `batchInitializeDashboard` que usa el composable `useDashboardLoader`.
- `Dashboard.vue` también tiene una función de fallback `loadWithTraditionalMethod`.

## Cambios Propuestos

### 1. `src/components/Dashboard.vue`
- Actualizar `onMounted` para usar `batchInitializeDashboard` en lugar del método inexistente.
- Simplificar la lógica de carga para usar el orquestador de `syncStore`.

```javascript
onMounted(async () => {
  const startTime = performance.now()
  try {
    // Cambiar el método inexistente por el correcto
    await syncStore.batchInitializeDashboard()
    
    const endTime = performance.now()
    loadingMetrics.value = {
      method: 'batch_initialization',
      duration: Math.round(endTime - startTime)
    }
  } catch (error) {
    handleError(error, t('dashboard.error_loading_dashboard'))
    // Fallback manual si el batch falla
    await loadWithTraditionalMethod()
  }
})
```

## Verificación
1. Cargar la aplicación y navegar al Dashboard.
2. Verificar en la consola que no aparezca el error `syncStore.loadDashboardWithParallelRequests is not a function`.
3. Confirmar que los datos de Hacienda, Recordatorios, Siembras, Actividades y Zonas se carguen correctamente.
