# Plan de Optimización de Mapa: Lotes, Zonas y Tooltips (Refactorizado)

El feedback recibido es **técnicamente preciso y fundamental**. Aborda vulnerabilidades reales en la arquitectura propuesta (como estados incorrectos y fugas de memoria). Este es el plan de implementación corregido:

## 1. Mapeo de Colores como Constantes Centralizadas
En lugar de hardcodear colores en los componentes, crearemos un archivo de constantes para asegurar consistencia en todo el sistema.
*   **Acción:** Crear `src/constants/mapColors.js` definiendo los colores oficiales para los estados reales de las siembras (`en_crecimiento`, `planificada`, `cosechada`, `finalizada`) y los fallbacks de los Puntos de Interés (POI).

## 2. Estrategia para Zonas Tipo Lote (Siembras)
*   **Mapeo de Estados Reales:** En `Dashboard.vue`, la inyección del color de la siembra utilizará los estados válidos definidos en `useSiembraMetrics.js` mapeados contra `mapColors.js`.
*   **Estilos y Hover:** En `GisMapComponent.vue` (`onEachFeatureHandler`):
    *   Cualquier polígono con `type.includes('siembra')` recibirá el color inyectado o el fallback.
    *   Implementaremos eventos `mouseover` y `mouseout` en los polígonos para aplicar un efecto de resaltado (stroke más grueso y opacidad más alta) para mejorar la interactividad.

## 3. Puntos de Interés Dinámicos (Otras Zonas) y Seguridad de SVG
*   **Validación de Color:** Los valores `z.color` de PocketBase se validarán en `GisMapComponent.vue` usando una expresión regular estricta (`/^#([0-9A-F]{3}){1,2}$/i`). Si fallan, se usará el fallback de infraestructura (Ámbar).
*   **Tooltips e Iconografía:** 
    *   Se inyectará un SVG tipo "edificio/marcador cuadrado" con `aria-label` para accesibilidad.
    *   Se agregará `.bindTooltip()` a los marcadores de POI para mostrar el nombre de la zona y su tipo (`feature.properties.tipoNombre`).

## 4. Gestión de Memoria y Tooltip Central
*   **Tooltip del Centro:** Se utilizará el nombre de la hacienda (`mi_hacienda.name`) dinámicamente en lugar de un string estático. Antes de asignar un nuevo tooltip, se removerá el anterior (`unbindTooltip`) para prevenir acumulación y fugas de memoria.
*   **Limpieza (Cleanup):** Reforzaremos el hook `onBeforeUnmount` de `GisMapComponent.vue` para asegurar que el `centerCircleMarker` y la capa base eliminen todos sus bindings antes de destruirse.

## User Review Required
Por favor, revisa el plan refinado y la nueva lista de tareas. El feedback provisto fue brillante y nos ha salvado de bugs silenciosos. Si estás de acuerdo con esta nueva arquitectura más limpia y segura, aprueba para proceder.

# Lista de Tareas Detallada: Lotes, Zonas y Tooltips

## Fase 1: Arquitectura de Constantes
- [ ] **Archivo:** `src/constants/mapColors.js` (NUEVO)
- [ ] **Acción:** Exportar una constante `SIEMBRA_COLORS` con el mapeo: `en_crecimiento: '#4CAF50'`, `planificada: '#FFEB3B'`, `cosechada: '#FF9800'`, `finalizada: '#9E9E9E'`.
- [ ] **Acción:** Exportar `POI_FALLBACK_COLOR: '#FF8F00'`.

## Fase 2: Inyección y Tooltip del GPS Hacienda
- [ ] **Archivo:** `src/components/GisMapComponent.vue`
- [ ] **Acción:** En `updateCenterCircle(latlng)`, obtener el nombre dinámico desde las props (o inyectar desde el store si es necesario).
- [ ] **Modificación:** Antes de asignar un nuevo tooltip/popup, llamar a `centerCircleMarker.unbindTooltip()`.
- [ ] **Modificación:** Añadir `centerCircleMarker.bindTooltip(nombreDinamico || 'Centro de Hacienda', { permanent: false, direction: 'top' })`.

## Fase 3: Consolidación Visual de Polígonos y Hover
- [ ] **Archivo:** `src/components/Dashboard.vue`
- [ ] **Acción:** Importar `SIEMBRA_COLORS`.
- [ ] **Modificación:** En `haciendaGeoJSON`, asignar `color: SIEMBRA_COLORS[s.estado] || SIEMBRA_COLORS.finalizada` a las siembras y sus lotes iterados.
- [ ] **Archivo:** `src/components/GisMapComponent.vue`
- [ ] **Acción:** En `onEachFeatureHandler`, capturar polígonos con `feature.properties?.type?.includes('siembra')`.
- [ ] **Estilos:** Aplicar color dinámico y registrar eventos `layer.on('mouseover', ...)` para resaltar con `weight: 3, fillOpacity: 0.6` y `layer.on('mouseout', ...)` para restaurar el estilo original.

## Fase 4: Puntos de Interés (POI) y Seguridad de Memoria
- [ ] **Archivo:** `src/components/Dashboard.vue`
- [ ] **Modificación:** Pasar `z.color` a los properties del GeoJSON de "Otras Zonas".
- [ ] **Archivo:** `src/components/GisMapComponent.vue`
- [ ] **Modificación SVG:** En `customPointToLayer`, validar el color inyectado con `const isValidHex = /^#([0-9A-F]{3}){1,2}$/i.test(feature.properties?.color); const pinColor = isValidHex ? feature.properties.color : POI_FALLBACK_COLOR;`.
- [ ] **Accesibilidad:** En el SVG del `divIcon`, añadir `aria-label="Punto de interés" role="img"`.
- [ ] **Tooltips:** En `onEachFeatureHandler` (o en el retorno del marker), agregar `layer.bindTooltip(feature.properties.nombre, { permanent: false, direction: 'top' })`.
- [ ] **Cleanup:** Validar que en `onBeforeUnmount`, además del mapa y el círculo central, los arrays o listeners sueltos sean limpiados (aunque Leaflet destruye los listeners internos de sus capas al hacer `map.remove()`).
