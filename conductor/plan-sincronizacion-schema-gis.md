# Plan de Sincronización de Esquema y Optimización GIS

Este plan formaliza las correcciones necesarias para alinear el código con el esquema real de PocketBase y optimizar la visualización geográfica.

## Objetivo
- Corregir nombres de campos "fantasmales" para evitar errores 400.
- Implementar la visualización dinámica de siembras mediante la agregación de geometrías de lotes.
- Mejorar la reactividad y precisión del centrado en el mapa.

## Análisis de Riesgos ("No arreglar aquí para dañar allá")
- **Bitácora**: El campo real es `siembras` (plural, relación múltiple). El código actual lo trata como `siembra_asociada` (singular). Cambiaremos a manejo de arrays para evitar romper la integridad de datos cuando una actividad afecte a múltiples siembras.
- **Zonas**: El campo real es `siembra` (singular). El código usa `siembra_asociada`. Se corregirá en el store y formularios.
- **Case Sensitivity**: Se forzará el uso de `Siembras` y `Haciendas` en las peticiones API.

## Cambios Propuestos

### 1. Sincronización de Stores (Core)
- **zonasStore.js**: 
    - Reemplazar `siembra_asociada` por `siembra`.
    - Ajustar `expand: "siembra"` (eliminar `user_responsable` ya que no existe en el esquema).
- **bitacoraStore.js**: 
    - Reemplazar `siembra_asociada` por `siembras`.
    - Actualizar filtros: `siembras ~ "${id}"` (operador de intersección para arrays en PocketBase).
- **siembrasStore.js**:
    - Asegurar que apunte a la colección `Siembras`.

### 2. Geometría Dinámica (Agregación)
- **Lógica**: No guardaremos una "geometría" estática en la colección `Siembras`.
- **Implementación**: 
    - En `SiembrasDashboard.vue`, utilizaremos un computed que filtre todas las `zonas` cuyo campo `siembra` coincida con la siembra actual.
    - Estas zonas se enviarán al `GisMapComponent` como un `FeatureCollection` de GeoJSON.
    - El mapa usará `L.geoJSON(data).getBounds()` para encuadrar automáticamente todos los lotes asociados.

### 3. Mejoras en GisMapComponent
- **Transiciones**: Implementar `map.flyTo` con animación al cambiar el centro o detectar auto-ubicación.
- **Fallback de Centrado**: Si no hay zonas con geometría, el mapa se centrará automáticamente en el GPS de la Hacienda (usando `haciendaStore`).

### 4. Formularios y UI
- **ZonaForm.vue**: Sincronizar el campo `siembra` y asegurar que la auto-ubicación genere un GeoJSON `Point` válido en el campo `geometria`.
- **BitacoraEntryForm.vue**: Cambiar el selector para que apunte a `siembras` y maneje correctamente la selección (múltiple si se requiere).

## Verificación y Pruebas
1. **API Check**: Monitorear la consola para asegurar que no existan errores "Unknown field" en los expand/filters.
2. **Visual Check**: Entrar a una Siembra con 3 lotes; el mapa debe mostrar los 3 polígonos y auto-ajustar el zoom para que todos sean visibles.
3. **Persistencia**: Crear una zona, dibujarla, y verificar en PocketBase Admin que el JSON de `geometria` y el ID de `siembra` sean correctos.

---
**¿Estás de acuerdo con este enfoque, especialmente con el manejo de `siembras` como array en Bitácora?**
