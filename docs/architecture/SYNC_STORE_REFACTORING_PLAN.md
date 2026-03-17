# Plan de Refactorización: syncStore.js

## Resumen Ejecutivo

El archivo `syncStore.js` actual (2,413 líneas) contiene múltiples responsabilidades que violan el principio de separación de concerns. Este documento analiza la estructura actual y propone una arquitectura modularizada que mejora:

- **Mantenibilidad**: Módulos enfocados con responsabilidades claras
- **Testabilidad**: Unidades más pequeñas y aisladas
- **Performance**: Optimizaciones especializadas por módulo
- **Escalabilidad**: Fácil adición de funcionalidades nuevas

**Métricas Actuales:**
- Total líneas: 2,413
- Actions: 80+ métodos
- State properties: 25+
- Responsabilidades: 7+ dominios diferentes

**Meta Post-Refactorización:**
- Módulo principal: ~300 líneas (orchestrator)
- Módulos especializados: ~300-400 líneas cada uno
- Módulo de tipos: ~100 líneas
- Total: ~2,000 líneas distribuidas en 6 archivos

---

## Análisis de Métodos por Responsabilidad

### 1. Queue Operations (Gestión de Cola)
**Líneas aproximadas:** 191-338, 556-598, 716-730

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `queueOperation` | 191-224 | Agregar operaciones a la cola |
| `processPendingQueue` | 226-338 | Procesar cola de sincronización |
| `persistQueueState` | 556-559 | Persistir estado de cola |
| `optimisticOperation` | 716-730 | Operaciones optimistas con cola |
| `cleanupOldData` | 600-611 | Limpieza de datos antiguos |

**Estado relacionado:**
- `queue`: SyncQueue instance
- `tempToRealIdMap`: Mapeo de IDs temporales
- `lastSyncTime`: Timestamp de última sincronización
- `syncInProgress`: Flag de proceso activo

---

### 2. Conflict Resolution (Resolución de Conflictos)
**Líneas aproximadas:** 899-980, 1996-2213

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `trackLocalChange` | 902-909 | Trackear cambios locales |
| `getChangeHistory` | 912-919 | Obtener historial de cambios |
| `resolveConflictWithContext` | 922-930 | Resolver conflicto con contexto |
| `getConflictResolutionHistory` | 933-943 | Historial de resoluciones |
| `cleanupOldHistory` | 946-952 | Limpiar historial antiguo |
| `exportChangeHistory` | 955-980 | Exportar historial completo |
| `addConflict` | 1996-2018 | Agregar conflicto a UI |
| `resolveConflict` | 2023-2051 | Resolver conflicto específico |
| `resolveMultipleConflicts` | 2056-2072 | Resolver múltiples conflictos |
| `forceLocalVersion` | 2077-2109 | Forzar versión local |
| `acceptServerVersion` | 2114-2149 | Aceptar versión servidor |
| `cleanupResolvedConflicts` | 2154-2157 | Limpiar conflictos resueltos |
| `saveConflictsToStorage` | 2162-2178 | Guardar conflictos en localStorage |
| `loadConflictsFromStorage` | 2183-2199 | Cargar conflictos desde localStorage |
| `closeConflictDialog` | 2204-2206 | Cerrar dialog de conflictos |
| `openConflictDialog` | 2211-2213 | Abrir dialog de conflictos |

**Estado relacionado:**
- `conflicts`: Array de conflictos activos
- `conflictDialog`: Flag de estado del dialog
- `conflictResolution`: Estrategia de resolución

---

### 3. Offline Search/Indexing (Búsqueda y Indexado)
**Líneas aproximadas:** 1013-1167

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `searchOffline` | 1013-1079 | Búsqueda offline en colecciones |
| `fuzzyMatch` | 1082-1087 | Coincidencia difusa |
| `levenshteinDistance` | 1090-1116 | Distancia de Levenshtein |
| `buildSearchIndex` | 1119-1167 | Construir índice de búsqueda |

**Estado relacionado:**
- `offlineFeatures.searchIndexEnabled`: Flag de búsqueda habilitada
- `offlineFeatures.searchIndexLastUpdate`: Timestamp de última actualización
- `intelligentCache.searchIndex`: Map con índice de búsqueda
- `cacheLimits.maxSearchIndexEntries`: Límite de entradas en índice

---

### 4. Cache Management (Gestión de Caché)
**Líneas aproximadas:** 82-101, 1367-1411, 2369-2387

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `enforceCacheLimit` | 82-94 | Forzar límite de caché LRU |
| `setWithCacheLimit` | 97-101 | Agregar a caché con límite |
| `cleanupIntelligentCache` | 1368-1394 | Limpiar caché inteligente |
| `initializeAnalytics` | 1397-1411 | Inicializar analytics de caché |
| `initOfflineFeatures` | 1414-1446 | Inicializar funcionalidades offline |
| `enableOfflineFeatures` | 985-1010 | Habilitar/deshabilitar features |
| `getPrefetchedData` | 2372-2387 | Obtener datos precargados |
| `prefetchCollection` | 2296-2367 | Precargar colección específica |
| `prefetchBasedOnPatterns` | 2246-2291 | Prefetch basado en patrones |
| `trackUserAction` | 2222-2241 | Trackear acción del usuario |

**Estado relacionado:**
- `intelligentCache.frequentData`: Map de datos frecuentes
- `intelligentCache.reports`: Map de reportes cacheados
- `intelligentCache.analytics`: Objeto con stats cacheados
- `cacheLimits`: Límites de caché
- `offlineFeatures`: Configuración de features offline

---

### 5. Sync Orchestration (Orquestación de Sincronización)
**Líneas aproximadas:** 116-189, 1558-1987

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `init` | 116-162 | Inicializar store de sincronización |
| `handleOnline` | 164-181 | Manejar reconexión |
| `handleOffline` | 183-189 | Manejar desconexión |
| `configureSelectiveSync` | 795-816 | Configurar sincronización selectiva |
| `getSelectiveSyncConfig` | 819-821 | Obtener configuración selectiva |
| `shouldSyncImmediately` | 824-829 | Verificar si debe sync inmediato |
| `getCollectionPriority` | 832-837 | Obtener prioridad de colección |
| `isCollectionSyncEnabled` | 840-845 | Verificar si colección habilitada |
| `processDeferredSync` | 848-878 | Procesar sincronización diferida |
| `initSelectiveSyncConfig` | 881-897 | Inicializar config selectiva |
| `loadDashboardWithParallelRequests` | 1561-1657 | Cargar dashboard con paralelismo |
| `processBatchResults` | 1660-1680 | Procesar resultados de batch |
| `batchInitializeDashboard` | 1683-1869 | Inicializar dashboard en batch |
| `applyBatchDataToStores` | 1872-1948 | Aplicar datos batch a stores |
| `initializeDashboardWithBatch` | 1951-1987 | Inicializar dashboard con batch |

**Estado relacionado:**
- `isOnline`: Flag de estado de conexión
- `syncStatus`: Estado de sincronización
- `selectiveSyncConfig`: Configuración de sync selectiva
- `lastSyncTime`: Timestamp de última sincronización
- `initialized`: Flag de inicialización

---

### 6. CRUD Helpers (Helpers de Operaciones CRUD)
**Líneas aproximadas:** 341-553

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `updateLocalItem` | 341-422 | Actualizar elemento local |
| `updateAllReferencesInStore` | 425-478 | Actualizar referencias en store |
| `updateReferencesToItem` | 481-511 | Actualizar referencias a item |
| `removeLocalItem` | 514-526 | Eliminar elemento local |
| `isRelatedTempId` | 529-538 | Verificar IDs temporales relacionados |
| `normalizeCollectionName` | 541-547 | Normalizar nombre de colección |
| `generateConsistentTempId` | 550-553 | Generar ID temporal consistente |
| `generateTempId` | 595-598 | Generar ID temporal (público) |
| `updateCrossStoreReferences` | 614-673 | Actualizar referencias entre stores |
| `refreshAllStores` | 675-711 | Refrescar todos los stores |

**Estado relacionado:**
- `tempToRealIdMap`: Mapeo de IDs temporales a reales
- `queue`: Cola de sincronización

---

### 7. Performance Monitoring (Monitoreo de Performance)
**Líneas aproximadas:** 732-790, 1169-1553

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `getPerformanceMetrics` | 736-738 | Obtener métricas de rendimiento |
| `resetPerformanceMetrics` | 741-743 | Resetear métricas |
| `getMetricsHistory` | 746-749 | Obtener historial de métricas |
| `checkPerformanceAlerts` | 752-790 | Verificar alertas de rendimiento |
| `generateOfflineReport` | 1170-1227 | Generar reporte offline |
| `generateBPAComplianceReport` | 1230-1271 | Generar reporte BPA |
| `calculateBPAScore` | 1274-1288 | Calcular score BPA |
| `generateOfflineAnalytics` | 1291-1337 | Generar analytics offline |
| `calculateDataVolume` | 1340-1365 | Calcular volumen de datos |
| `generateActivitySummaryReport` | 1449-1482 | Generar reporte de actividades |
| `generateProductivityReport` | 1484-1508 | Generar reporte de productividad |
| `calculateReportSummary` | 1510-1553 | Calcular resumen de reporte |

**Estado relacionado:**
- `errors`: Array de errores
- `intelligentCache.analytics`: Analytics cacheados
- `offlineFeatures`: Configuración de features offline

---

### 8. Storage Utilities (Utilidades de Almacenamiento)
**Líneas aproximadas:** 577-592

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `loadFromLocalStorage` | 578-580 | Cargar desde localStorage |
| `saveToLocalStorage` | 582-588 | Guardar en localStorage |
| `removeFromLocalStorage` | 590-592 | Remover de localStorage |
| `handleSyncError` | 561-575 | Manejar errores de sincronización |
| `getStoreByCollectionName` | 102-114 | Obtener store por nombre |

**Estado relacionado:**
- Ninguno (métodos utilitarios)

---

### 9. Lifecycle Management (Gestión de Ciclo de Vida)
**Líneas aproximadas:** 2389-2411

| Método | Líneas | Responsabilidad |
|--------|--------|-----------------|
| `cleanup` | 2390-2406 | Limpiar recursos y prevenir memory leaks |
| `$dispose` | 2409-2411 | Hook de Pinia para cleanup automático |

**Estado relacionado:**
- `cleanupIntervalId`: ID del intervalo de cleanup

---

## Tabla de Agrupación de Métodos por Módulo

### syncQueueManager.js (~400 líneas)
**Responsabilidad:** Gestión de cola de operaciones de sincronización

```javascript
// Queue Operations
queueOperation()
processPendingQueue()
persistQueueState()
optimisticOperation()
cleanupOldData()
```

**Dependencias:**
- `SyncQueue` class (de utils/syncQueue)
- `useAuthStore` (para userId)
- `logger` (para logging)

**Exporta:**
- `useSyncQueueManager` (store)

**Estado a migrar:**
```javascript
{
  queue: new SyncQueue(),
  tempToRealIdMap: {},
  lastSyncTime: null,
  syncStatus: 'idle',
  syncInProgress: false
}
```

---

### conflictResolver.js (~300 líneas)
**Responsabilidad:** Detección, gestión y resolución de conflictos

```javascript
// Change Tracking
trackLocalChange()
getChangeHistory()
resolveConflictWithContext()
getConflictResolutionHistory()
cleanupOldHistory()
exportChangeHistory()

// UI Conflict Management
addConflict()
resolveConflict()
resolveMultipleConflicts()
forceLocalVersion()
acceptServerVersion()
cleanupResolvedConflicts()
saveConflictsToStorage()
loadConflictsFromStorage()
closeConflictDialog()
openConflictDialog()
```

**Dependencias:**
- `SyncQueue` (para historial de cambios)
- `logger` (para logging)
- `localStorage` (para persistencia)

**Exporta:**
- `useConflictResolver` (store)

**Estado a migrar:**
```javascript
{
  conflicts: [],
  conflictDialog: false,
  conflictResolution: 'user-choice'
}
```

---

### offlineIndexer.js (~300 líneas)
**Responsabilidad:** Indexación y búsqueda offline

```javascript
// Search & Indexing
searchOffline()
fuzzyMatch()
levenshteinDistance()
buildSearchIndex()

// Report Generation
generateOfflineReport()
generateBPAComplianceReport()
calculateBPAScore()
generateActivitySummaryReport()
generateProductivityReport()
calculateReportSummary()
```

**Dependencias:**
- `useZonasStore`, `useActividadesStore`, `useBitacoraStore` (para datos de reportes)
- `logger` (para logging)
- `cacheManager` (para caché de índices)

**Exporta:**
- `useOfflineIndexer` (store)

**Estado a migrar:**
```javascript
{
  offlineFeatures: {
    searchIndexEnabled: true,
    searchIndexLastUpdate: null
  },
  intelligentCache: {
    searchIndex: new Map(),
    reports: new Map()
  },
  cacheLimits: {
    maxSearchIndexEntries: 1000,
    maxReportsEntries: 100
  }
}
```

---

### cacheManager.js (~300 líneas)
**Responsabilidad:** Gestión de caché inteligente y prefetch

```javascript
// Cache Management
enforceCacheLimit()
setWithCacheLimit()
cleanupIntelligentCache()
initializeAnalytics()

// Offline Features
enableOfflineFeatures()
initOfflineFeatures()

// Prefetch
prefetchBasedOnPatterns()
prefetchCollection()
getPrefetchedData()
trackUserAction()

// Analytics
generateOfflineAnalytics()
calculateDataVolume()
getPerformanceMetrics()
resetPerformanceMetrics()
getMetricsHistory()
checkPerformanceAlerts()
```

**Dependencias:**
- `logger` (para logging)
- `localStorage` (para persistencia de caché)
- `pb` (para prefetch)

**Exporta:**
- `useCacheManager` (store)

**Estado a migrar:**
```javascript
{
  offlineFeatures: {
    reportsEnabled: true,
    analyticsEnabled: true,
    cacheEnabled: true,
    maxCacheSize: 50 * 1024 * 1024,
    cacheExpiryTime: 24 * 60 * 60 * 1000,
    lastReportGeneration: null
  },
  cacheLimits: {
    maxFrequentDataEntries: 500,
    maxAnalyticsEntries: 100
  },
  intelligentCache: {
    frequentData: new Map(),
    analytics: {
      dailyStats: new Map(),
      weeklyStats: new Map(),
      monthlyStats: new Map()
    }
  },
  cleanupIntervalId: null
}
```

---

### syncStore.js (Main Orchestrator, ~300 líneas)
**Responsabilidad:** Orquestación de sincronización y coordinación

```javascript
// Initialization & Lifecycle
init()
cleanup()
$dispose()

// Connection Management
handleOnline()
handleOffline()

// Sync Orchestration
configureSelectiveSync()
getSelectiveSyncConfig()
shouldSyncImmediately()
getCollectionPriority()
isCollectionSyncEnabled()
processDeferredSync()
initSelectiveSyncConfig()

// Batch Operations
loadDashboardWithParallelRequests()
processBatchResults()
batchInitializeDashboard()
applyBatchDataToStores()
initializeDashboardWithBatch()

// CRUD Coordination
updateLocalItem()
updateAllReferencesInStore()
updateReferencesToItem()
removeLocalItem()
isRelatedTempId()
normalizeCollectionName()
generateConsistentTempId()
generateTempId()
updateCrossStoreReferences()
refreshAllStores()

// Utilities
loadFromLocalStorage()
saveToLocalStorage()
removeFromLocalStorage()
handleSyncError()
getStoreByCollectionName()
```

**Dependencias:**
- `useSyncQueueManager` (para operaciones de cola)
- `useConflictResolver` (para gestión de conflictos)
- `useOfflineIndexer` (para búsqueda offline)
- `useCacheManager` (para caché inteligente)
- Todos los domain stores (zonas, siembras, etc.)
- `logger`, `pb`, `useSnackbarStore`, `useAuthStore`

**Exporta:**
- `useSyncStore` (store principal)

**Estado a migrar:**
```javascript
{
  isOnline: navigator.onLine,
  initialized: false,
  errors: [],
  selectiveSyncConfig: {
    enabled: false,
    collections: { /* ... */ },
    deferredSyncInterval: 30000,
    lastDeferredSync: null
  }
}
```

---

### types.js (~100 líneas)
**Responsabilidad:** Tipos TypeScript/JSDoc compartidos

```javascript
// Tipos de operaciones
export const SYNC_OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
}

// Tipos de conflictos
export const CONFLICT_TYPES = {
  VERSION_MISMATCH: 'version_mismatch',
  CONCURRENT_UPDATE: 'concurrent_update',
  DELETE_CONFLICT: 'delete_conflict'
}

// Estrategias de resolución
export const RESOLUTION_STRATEGIES = {
  LOCAL_WINS: 'local',
  SERVER_WINS: 'server',
  USER_CHOICE: 'user-choice',
  MERGE: 'merge'
}

// Prioridades de colección
export const COLLECTION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

// Estados de sincronización
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error',
  OFFLINE: 'offline'
}

// Interfaces para TypeScript
// (si se migra a TypeScript en el futuro)
```

**Dependencias:**
- Ninguna

**Exporta:**
- Constantes y tipos

---

## Plan de Migración Paso a Paso

### FASE 1: Preparación (Días 1-2)

**Objetivo:** Establecer infraestructura para migración

1. **Crear estructura de directorios**
   ```bash
   mkdir -p src/stores/sync
   ```

2. **Crear módulo de tipos** (`types.js`)
   - Extraer constantes y tipos
   - No tiene dependencias, se puede crear primero

3. **Validar tests existentes**
   - Correr test suite completo
   - Documentar tests que fallan
   - Crear baseline de performance

4. **Branch de migración**
   ```bash
   git checkout -b feature/sync-store-refactoring
   ```

**Entregables:**
- Estructura de directorios creada
- `types.js` implementado
- Baseline de tests documentado

---

### FASE 2: Extraer syncQueueManager (Días 3-5)

**Objetivo:** Isolar operaciones de cola

1. **Crear `syncQueueManager.js`**
   - Migrar métodos de Queue Operations
   - Migrar estado relacionado
   - Implementar API limpia

2. **Actualizar `syncStore.js`**
   - Importar `useSyncQueueManager`
   - Reemplazar llamadas directas a cola
   - Mantener compatibilidad hacia atrás

3. **Tests**
   - Tests unitarios para `syncQueueManager`
   - Tests de integración con `syncStore`
   - Verificar que todas las operaciones de cola funcionan

**Riesgos:**
- **Alto:** Cambios en cómo se procesa la cola pueden afectar sincronización
- **Mitigación:** Implementar feature flags para volver al código antiguo

**Validación:**
- ✅ Todas las operaciones de cola funcionan
- ✅ Tests de sincronización pasan
- ✅ No hay regresiones en funcionalidad

---

### FASE 3: Extraer conflictResolver (Días 6-8)

**Objetivo:** Isolar gestión de conflictos

1. **Crear `conflictResolver.js`**
   - Migrar métodos de conflict resolution
   - Migrar estado relacionado
   - Implementar callbacks para UI

2. **Actualizar `syncStore.js`**
   - Importar `useConflictResolver`
   - Reemplazar métodos de conflictos
   - Mantener compatibilidad con UI

3. **Tests**
   - Tests unitarios para detección de conflictos
   - Tests para estrategias de resolución
   - Tests de integración con UI

**Riesgos:**
- **Medio:** La UI depende de los métodos de conflictos
- **Mitigación:** Mantener signatures de métodos compatibles

**Validación:**
- ✅ Detección de conflictos funciona
- ✅ UI de resolución de conflictos funciona
- ✅ Historial de cambios se mantiene

---

### FASE 4: Extraer offlineIndexer (Días 9-11)

**Objetivo:** Isolar búsqueda y reportes offline

1. **Crear `offlineIndexer.js`**
   - Migrar métodos de búsqueda
   - Migrar generación de reportes
   - Migrar estado de índices

2. **Actualizar `syncStore.js`**
   - Importar `useOfflineIndexer`
   - Reemplazar métodos de búsqueda
   - Actualizar referencias a reportes

3. **Tests**
   - Tests para búsqueda offline
   - Tests para generación de reportes
   - Tests de fuzzy matching

**Riesgos:**
- **Bajo:** Búsqueda offline es una feature, no core
- **Mitigación:** Feature flag para deshabilitar si hay problemas

**Validación:**
- ✅ Búsqueda offline funciona
- ✅ Reportes se generan correctamente
- ✅ Índices se construyen exitosamente

---

### FASE 5: Extraer cacheManager (Días 12-14)

**Objetivo:** Isolar gestión de caché inteligente

1. **Crear `cacheManager.js`**
   - Migrar métodos de caché
   - Migrar funcionalidad de prefetch
   - Migrar analytics de performance

2. **Actualizar `syncStore.js`**
   - Importar `useCacheManager`
   - Reemplazar métodos de caché
   - Actualizar lógica de prefetch

3. **Tests**
   - Tests para límites de caché LRU
   - Tests para prefetch inteligente
   - Tests para analytics

**Riesgos:**
- **Medio:** El caché afecta performance de toda la app
- **Mitigación:** Monitorear métricas de performance antes/después

**Validación:**
- ✅ Límites de caché se respetan
- ✅ Prefetch mejora performance
- ✅ No hay memory leaks

---

### FASE 6: Refactor syncStore (Días 15-17)

**Objetivo:** Convertir syncStore en orchestrator ligero

1. **Limpiar `syncStore.js`**
   - Remover código migrado
   - Simplificar orchestration
   - Mejorar claridad de código

2. **Actualizar imports**
   - Asegurar que todos los módulos se importan
   - Verificar circular dependencies
   - Optimizar tree-shaking

3. **Tests**
   - Tests de integración completa
   - Tests de orquestación
   - Tests end-to-end

**Riesgos:**
- **Alto:** Cambios en el core pueden afectar todo
- **Mitigación:** Rollback rápido si hay problemas críticos

**Validación:**
- ✅ Toda la funcionalidad trabaja junto
- ✅ Performance se mantiene o mejora
- ✅ Código es más mantenible

---

### FASE 7: Optimización y Documentación (Días 18-20)

**Objetivo:** Pulir refactorización

1. **Optimización**
   - Revisar performance de cada módulo
   - Optimizar imports
   - Mejorar tree-shaking

2. **Documentación**
   - Documentar API de cada módulo
   - Crear diagramas de arquitectura
   - Actualizar README

3. **Clean up**
   - Remover código muerto
   - Remover feature flags
   - Actualizar tests

**Validación:**
- ✅ Performance mejoró o se mantuvo
- ✅ Documentación completa
- ✅ Código limpio y mantenible

---

## Diagrama de Dependencias

```
┌─────────────────────────────────────────────────────────────┐
│                        syncStore.js                         │
│                    (Main Orchestrator)                      │
│                                                              │
│  Responsibilities:                                          │
│  - Sync orchestration                                       │
│  - Lifecycle management                                     │
│  - CRUD coordination                                        │
│  - Connection management                                    │
└─────────────┬────────────────────────────────────────────────┘
              │
              │ Dependencies
              │
    ┌─────────┼─────────┬──────────┬──────────┐
    │         │         │          │          │
    ▼         ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────┐
│  sync  │ │conf- │ │off-  │ │  cache  │ │types │
│QueueMgr│ │lict  │ │line  │ │Manager  │ │.js   │
│        │ │Res-  │ │Indexer│ │         │ │      │
│        │ │olver │ │      │ │         │ │      │
└────────┘ └──────┘ └──────┘ └─────────┘ └──────┘
    │         │         │          │
    │         │         │          │
    ▼         ▼         ▼          ▼
┌────────┐ ┌──────┐ ┌──────┐ ┌─────────┐
│SyncQueue│ │local-│ │Domain│ │ Pocket- │
│(utils) │ │Storage│ │Stores│ │  Base   │
└────────┘ └──────┘ └──────┘ └─────────┘

External Dependencies:
- PocketBase (pb)
- Logger utilities
- Domain stores (zonas, siembras, etc.)
- UI stores (snackbar, auth)
```

**Flujo de Datos:**

1. **Usuario → syncStore:** Operación CRUD
2. **syncStore → syncQueueManager:** Encolar operación
3. **syncQueueManager → conflictResolver:** Detectar conflictos
4. **conflictResolver → UI:** Mostrar diálogo si hay conflicto
5. **syncQueueManager → syncStore:** Procesar cola
6. **syncStore → cacheManager:** Actualizar caché
7. **cacheManager → offlineIndexer:** Actualizar índices
8. **offlineIndexer → Usuario:** Búsqueda offline disponible

---

## Riesgos y Consideraciones

### Riesgos Críticos 🔴

1. ** Pérdida de datos durante sincronización**
   - **Probabilidad:** Media
   - **Impacto:** Crítico
   - **Mitigación:**
     - Tests exhaustivos antes/después
     - Feature flags para rollback rápido
     - Backups automáticos durante migración
     - Monitoreo en producción

2. **Regresiones en funcionalidad existente**
   - **Probabilidad:** Alta
   - **Impacto:** Alto
   - **Mitigación:**
     - Test suite completo antes de empezar
     - Tests de integración para cada fase
     - Beta testing con subset de usuarios
     - Canary deployment

3. **Memory leaks en nuevos módulos**
   - **Probabilidad:** Media
   - **Impacto:** Alto
   - **Mitigación:**
     - Perfiles de memoria antes/después
     - Tests de carga prolongada
     - Monitoreo de memoria en producción
     - Cleanup hooks en todos los módulos

---

### Riesgos Moderados 🟡

4. **Circular dependencies entre módulos**
   - **Probabilidad:** Alta
   - **Impacto:** Medio
   - **Mitigación:**
     - Arquitectura bien definida antes de implementar
     - Herramientas de análisis de dependencias (madge)
     - Inyección de dependencias en lugar de imports directos
     - Tests de cyclic dependencies

5. **Degración de performance**
   - **Probabilidad:** Media
   - **Impacto:** Medio
   - **Mitigación:**
     - Benchmarks antes/después
     - Perfiles de performance
     - Optimización crítica en hot paths
     - Monitoreo de métricas

6. **Break de compatibilidad con UI**
   - **Probabilidad:** Media
   - **Impacto:** Medio
   - **Mitigación:**
     - Mantener signatures de métodos
     - Adaptadores para API antigua
     - Documentación de cambios
     - Coordinación con equipo frontend

---

### Riesgos Bajos 🟢

7. **Aumento de complejidad temporal**
   - **Probabilidad:** Alta
   - **Impacto:** Bajo
   - **Mitigación:**
     - Plan de comunicación claro
     - Daily syncs del equipo
     - Documentación continua
     - Code reviews frecuentes

8. **Dificultad en debugging**
   - **Probabilidad:** Media
   - **Impacto:** Bajo
   - **Mitigación:**
     - Logging mejorado en cada módulo
     - Trace IDs para operaciones
     - Herramientas de debugging
     - Documentación de arquitectura

---

## Consideraciones de Implementación

### Compatibilidad Hacia Atrás

1. **Mantener API pública existente**
   ```javascript
   // syncStore.js - MODO COMPATIBILIDAD
   export const useSyncStore = defineStore('sync', {
     actions: {
       // Wrapper methods para backward compatibility
       async queueOperation(operation) {
         return useSyncQueueManager().queueOperation(operation)
       },

       searchOffline(query, collections, options) {
         return useOfflineIndexer().searchOffline(query, collections, options)
       },

       // ... más wrappers
     }
   })
   ```

2. **Deprecation warnings**
   ```javascript
   // Marcar métodos como deprecated
     searchOffline(query, collections, options) {
       logger.warn('[DEPRECATED] Use useOfflineIndexer().searchOffline() directly')
       return useOfflineIndexer().searchOffline(query, collections, options)
     }
   ```

3. **Feature flags**
   ```javascript
   const featureFlags = {
     useNewSyncQueueManager: true,
     useNewConflictResolver: true,
     useNewOfflineIndexer: false, // Disabled initially
     useNewCacheManager: false
   }

   // Condicionales para cambio gradual
   async queueOperation(operation) {
     if (featureFlags.useNewSyncQueueManager) {
       return useSyncQueueManager().queueOperation(operation)
     } else {
       return oldQueueOperation(operation)
     }
   }
   ```

---

### Estrategia de Testing

1. **Unit Tests por Módulo**
   - Cada módulo tiene su suite de tests
   - Mock de dependencias externas
   - Cobertura > 80% objetivo

2. **Integration Tests**
   - Tests de interacción entre módulos
   - Tests de syncStore con todos los módulos
   - Tests end-to-end de flujos críticos

3. **Regression Tests**
   - Tests de funcionalidad existente
   - Comparar comportamiento antes/después
   - Tests de performance (benchmarks)

4. **Contract Tests**
   - Verificar que APIs se mantienen compatibles
   - Tests de signatures de métodos
   - Tests de tipos de datos

---

### Monitoreo y Observabilidad

1. **Métricas de Performance**
   - Tiempo de procesamiento de cola
   - Tasa de éxito/fallo de operaciones
   - Tamaño de cola en el tiempo
   - Uso de memoria por módulo

2. **Logging Mejorado**
   ```javascript
   // Añadir contexto a logs
   logSync('[SyncQueueManager] Operation queued', {
     operationId: op.id,
     collection: op.collection,
     queueSize: this.queue.length,
     timestamp: Date.now()
   })
   ```

3. **Error Tracking**
   - Trackear errores por módulo
   - Alertas para errores críticos
   - Dashboards de errores

4. **Health Checks**
   - Health check para cada módulo
   - Health check del sistema completo
   - Alertas si un módulo falla

---

## Validación y Criterios de Éxito

### Criterios de Éxito

✅ **Funcionalidad**
- [ ] Todas las features existentes funcionan
- [ ] No hay regresiones en funcionalidad crítica
- [ ] Tests pasan al 100%
- [ ] QA aprueba la migración

✅ **Performance**
- [ ] Performance se mantiene o mejora
- [ ] No hay memory leaks
- [ ] Tamaño de bundle no aumenta significativamente
- [ ] Tiempo de inicialización no empeora

✅ **Mantenibilidad**
- [ ] Código es más fácil de entender
- [ ] Cada módulo tiene responsabilidad clara
- [ ] Documentación está completa
- [ ] Code reviews son más rápidos

✅ **Escalabilidad**
- [ ] Fácil agregar nuevos módulos
- [ ] Fácil extender funcionalidad existente
- [ ] Arquitectura soporta crecimiento
- [ ] Technical debt reducido

---

### Métricas de Éxito

| Métrica | Antes | Después | Meta |
|---------|-------|---------|------|
| Líneas por archivo | 2,413 | ~300 | <500 |
| Tiempo de build | X seg | Y seg | ≤ X |
| Tamaño de bundle | X KB | Y KB | ≤ X * 1.1 |
| Cobertura de tests | % | % | ≥ 80% |
| Memory leak score | 0 | 0 | 0 |
| Bugs críticos | 0 | 0 | 0 |
| Tiempo de code review | X min | Y min | ≤ X |
| Tiempo de onboarding | X días | Y días | ≤ X |

---

## Recursos y Estimación

### Recursos Necesarios

- **1 Senior Backend Developer** (líder técnico)
- **1 Backend Developer** (implementación)
- **1 QA Engineer** (testing y validación)
- **1 Technical Writer** (documentación)

**Total:** 4 personas

### Estimación de Tiempo

- **Fase 1 (Preparación):** 2 días
- **Fase 2 (syncQueueManager):** 3 días
- **Fase 3 (conflictResolver):** 3 días
- **Fase 4 (offlineIndexer):** 3 días
- **Fase 5 (cacheManager):** 3 días
- **Fase 6 (syncStore refactor):** 3 días
- **Fase 7 (Optimización):** 3 días

**Total:** 20 días hábiles (~4 semanas)

### Buffer para Imprevistos

- **20% buffer:** 4 días
- **Total con buffer:** 24 días hábiles (~5 semanas)

---

## Próximos Pasos

1. **Revisión del plan** por el equipo técnico
2. **Aprobación** de stakeholders
3. **Asignación de recursos** y fechas
4. **Setup del entorno** de desarrollo
5. **Inicio de Fase 1**

---

## Conclusión

Este plan de refactorización transforma `syncStore.js` de un monolito de 2,413 líneas en una arquitectura modular de 6 componentes especializados. Los beneficios incluyen:

- **Mejor mantenibilidad:** Responsabilidades claras y aisladas
- **Mayor testabilidad:** Unidades más pequeñas y enfocadas
- **Performance optimizada:** Especialización por módulo
- **Escalabilidad:** Fácil adición de funcionalidades
- **Developer experience:** Código más fácil de entender y modificar

El plan está diseñado para minimizar riesgos mediante:
- Migración incremental por fases
- Feature flags para rollback
- Tests exhaustivos en cada fase
- Monitoreo continuo de métricas

La refactorización es una inversión que reducirá technical debt y mejorará la velocidad de desarrollo a largo plazo.

---

**Documento Version:** 1.0
**Fecha:** 2025-01-14
**Autor:** Backend Architecture Team
**Estado:** Pending Approval
