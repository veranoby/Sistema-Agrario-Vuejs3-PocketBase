# Implementación del Pin GPS en el Mapa del Dashboard

El documento `conductor/plan-dashboard-map-priorities.md` identifica correctamente el problema: el `CircleMarker` (que se renderiza como SVG en la capa de vectores de Leaflet) puede quedar oculto bajo otros polígonos o sufrir problemas de renderizado en Vue.

La solución propuesta en el documento es **excelente y la recomiendo como la mejor optimización**: cambiar de `L.circleMarker` a `L.divIcon` renderizado a través de `L.marker`.

**Razonamiento técnico de por qué es la mejor opción:**
1.  **Z-Index Superior**: Los `L.marker` (incluyendo `divIcon`) se renderizan en un panel del DOM (`markerPane`) que siempre está **por encima** del panel donde se dibujan los vectores y polígonos (`overlayPane`). Esto garantiza que el pin principal de la hacienda nunca quedará oculto por un lote.
2.  **Independencia del motor SVG**: Al ser un `div` HTML inyectado directamente, no depende de la redibujada del canvas o SVG de Leaflet, siendo menos propenso a bugs visuales de Vue.

## Proposed Changes

### GisMapComponent

Modificaremos la función `customPointToLayer` para reemplazar la implementación actual por el `L.divIcon` propuesto.

#### [MODIFY] [GisMapComponent.vue](file:///home/veranoby/sistema-agri/src/components/GisMapComponent.vue)
-   Cambiar la lógica dentro del `if (feature.properties && feature.properties.source === 'hacienda-gps')`.
-   Añadir el HTML sugerido con el estilo del punto rojo.
-   Crear el `L.divIcon` con `className: 'hacienda-custom-pin'` y usarlo en un `L.marker` con un `zIndexOffset` alto (ej: 1000).

## User Review Required

Revisa el plan anterior. Si estás de acuerdo con la implementación del `divIcon`, por favor aprueba para que proceda con la edición del código.

# Tareas: Reparación Pin GPS Hacienda

## Fase 1: Implementación de Leaflet DivIcon
- [ ] Editar `src/components/GisMapComponent.vue`.
- [ ] Ubicar la función `customPointToLayer`.
- [ ] Reemplazar `L.circleMarker` para el `source === 'hacienda-gps'` por la implementación HTML de `L.divIcon` detallada en el plan.
- [ ] Asegurar que el `zIndexOffset` esté configurado (ej: 1000) para forzar la visibilidad sobre otras capas.

## Fase 2: Validación
- [ ] Verificar que el punto rojo sólido aparece en el centro exacto donde el mapa hace "flyTo".
- [ ] Comprobar que al hacer clic en el punto rojo, se abre correctamente el popup de "Centro de Hacienda".
