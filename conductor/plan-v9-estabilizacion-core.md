# Plan Maestro: Estabilización, Consolidación e Integración (v9.3)
> **Versión**: 9.3 (Rigor Arquitectónico y Valor de Producto - 29/04/2026)
> **Estado**: EN EJECUCIÓN (Fase 28-30)

## ⚠️ INDICACIONES NO NEGOCIABLES (ACTUALIZADO)
1. **Unificación de Fuentes de Verdad**: Prohibido duplicar lógica de cálculo (ej. BPA) en múltiples archivos. Usar `src/utils/agriMetrics.js` como único motor.
2. **Desacoplamiento de Estado**: Fusionar stores satélites en stores principales para reducir el overhead de imports y reactividad.
3. **Integración Activa**: Las utilidades de optimización (imágenes, geolocalización) deben estar inyectadas en los flujos de persistencia, no solo existir como archivos sueltos.

---

## 1. Hitos Alcanzados (V9.2)
- [x] **Core Stability**: Restaurada persistencia en `syncStore`.
- [x] **ESM Fix**: Eliminados `require()` incompatibles.
- [x] **Performance**: Lazy loading inicial de componentes pesados en `App.vue`.

---

## 2. Fase 28: Unificación Core (Limpieza y Redundancia)
**Objetivo**: Reducir el ruido arquitectónico y unificar estados.

### Pasos de Ejecución:
1. **Fusión Auth/Profile**:
   - Mover estado `user`, `version` y getters de `profileStore.js` a `authStore.js`.
   - Eliminar `src/stores/profileStore.js`.
   - Actualizar masivamente imports en componentes (reemplazar `useProfileStore` por `useAuthStore`).
2. **Unificación BPA**:
   - Migrar lógica de `src/utils/bpaCalculator.js` a `src/utils/agriMetrics.js`.
   - Actualizar `actividadesStore.js` y `zonasStore.js` para usar `agriMetrics.calculateBPAScore`.
   - Eliminar `src/utils/bpaCalculator.js`.
3. **Simplificación Sync Store**:
   - Colapsar `idMapper.js`, `conflictResolver.js` y `syncConfig.js` en `src/stores/sync/core.js`.

---

## 3. Fase 29: Inyección de Valor Agregado (Integración Real)
**Objetivo**: Conectar las joyas de la corona a la experiencia del usuario.

### Pasos de Ejecución:
1. **Avatar Inteligente**:
   - Modificar `src/stores/avatarStore.js`: Importar `imageOptimizer` y procesar/comprimir imágenes antes de subirlas a PocketBase.
2. **Bitácora Geo-Asistida**:
   - Modificar `src/stores/bitacoraStore.js`: En `crearBitacoraEntry`, invocar `locationCoordinator.getPosition()` para auto-llenar coordenadas si no están presentes.
3. **Alertas Centralizadas**:
   - Integrar `useAlertTriggers` en `Dashboard.vue` para mostrar banners de cumplimiento crítico basados en la configuración de la hacienda.

---

## 4. Fase 30: Auditoría Final de Producto
**Objetivo**: Validar que el valor agregado sea visible y funcional.

### Checklist de Verificación:
- [ ] **Firma Digital**: ¿Es visible el sello de integridad en la Bitácora?
- [ ] **Modo Avión**: ¿Avisa el `StatusBar` cuando el usuario pierde conexión?
- [ ] **Ahorro de Datos**: ¿Las imágenes subidas ocupan < 200KB gracias al optimizer?

---

## Resumen de Verificación Senior
| Fase | Verificación | Resultado |
| :--- | :--- | :--- |
| 28 | `ls src/stores/` | `profileStore.js` NO debe existir. |
| 28 | `grep "bpaCalculator"` | 0 coincidencias en el proyecto. |
| 29 | Upload Avatar | Monitor de red muestra carga de archivo comprimido. |
| 29 | Create Bitacora | Objeto JSON incluye coordenadas GPS automáticamente. |
