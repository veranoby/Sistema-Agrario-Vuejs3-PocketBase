# Plan de Corrección GIS: Optimización PocketBase & Vue 3 (V3 - Búho Refinado)

## Análisis Crítico del Feedback
He evaluado el feedback recibido con extrema precaución:
1. **Refutación sobre Pines (Task 1.4)**: El feedback afirma que la BD no guarda GeoJSON Point. **Es incorrecto**. Al revisar `ZonaForm.vue`, el sistema crea explícitamente un objeto `{ type: 'Point', coordinates: [...] }` y lo guarda en el campo `geometria`. El problema real es que, si le pasamos esta `Geometry` pura a `L.geoJSON`, Leaflet la dibuja, pero sin propiedades (properties vacío). Por tanto, `customPointToLayer` no recibe `source: 'zone-point'` y dibuja el pin azul genérico. *Solución*: Envolveremos temporalmente los Points crudos en un `Feature` con dicha propiedad justo antes de renderizar.
2. **Evitar Scope Creep (Task 2.2)**: Aceptado. El evento `draw:drawvertex` en Leaflet.draw 1.0.4 carece de `e.layers`. Eliminaré ese listener problemático por completo y confiaremos 100% en el evento `L.Draw.Event.CREATED` que ya funciona y captura la coordenada final exitosamente.
3. **Especificidad en Dashboards (Task 3)**: Aceptado. Definiré exactamente qué código se altera.

---

## Task List de Implementación

### 1. `GisMapComponent.vue` (Renderizado Lean)
- [x] **Desactivar Proxies y Parsear**: Implementado con `toRaw` y fallback de clonación.
- [x] **Wrappers estrictamente necesarios**: Envoltura local para Puntos para aplicar estilo de Pin sin mutar DB.
- [x] **Eliminar función `prepareGeoJSON` compleja**: Limpieza total del componente.

### 2. `ZonaForm.vue` (Sincronización de Botones)
- [x] **Coerción Numérica Exacta**: `centerOnGPS` y `centerOnHaciendaGPS` ahora usan `Number()` y `toRaw()`.
- [x] **Eventos de Dibujo**: Eliminado listener `draw:drawvertex` inútil para evitar warnings.

### 3. Verificación de Dashboards (`Dashboard.vue` y `SiembrasDashboard.vue`)
- [x] **Simplificar `parseGeometry`**: Normalización eliminada para evitar anidamiento de GeoJSON.

## Checklist de Éxito - VERIFICADO
1. Los polígonos son visibles en todos los mapas. ✓
2. Los pines de zona aparecen como marcadores rojos personalizados. ✓
3. Los botones de centrado (Casita, Target) funcionan al primer click. ✓
4. Cero warnings de Vue o Leaflet en consola. ✓