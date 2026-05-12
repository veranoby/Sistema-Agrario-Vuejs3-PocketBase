# Plan de Optimizaciones UI: Siembras y Zonas

## Tarea 1: Limpieza en `SiembrasDashboard.vue`
- **Objetivo**: Eliminar la sección gráfica de "Ciclos de cultivo".
- **Acción**:
  - Eliminar el bloque `<v-col cols="12" lg="4">` que contiene el componente `<CycleChart>`.
  - Eliminar el import de `CycleChart.vue` en el bloque script.
  - Asegurar que la columna del mapa ocupe el ancho completo (`<v-col cols="12">`).

## Tarea 2: Reubicación de BPA en `ZonaForm.vue`
- **Objetivo**: Mover la sección de "Seguimiento de Buenas Prácticas Agrícolas (BPA)" a la columna izquierda, debajo del bloque de Notas.
- **Acción**:
  - Cortar el div de "BOTTOM SECTION: BPA Compliance" que está al final del template.
  - Formatearlo para que encaje estéticamente en la columna izquierda (usar diseño de una sola columna `grid-cols-1`, preservando las tarjetas internas).
  - Pegarlo inmediatamente después del bloque de `QuillEditor` (Mi Info).

## Tarea 3: Coordenadas Editables en `ZonaForm.vue`
- **Objetivo**: Mostrar los vértices de un polígono en una cuadrícula de inputs editables, en lugar de texto estático.
- **Acción**:
  - En la columna derecha (debajo del mapa), reemplazar el iterador estático `V1: Lat... Lng...` por componentes `<v-text-field>` conectados mediante `v-model` a las coordenadas de cada vértice (`vertex.lat`, `vertex.lng`).
  - Añadir un evento `@change="updatePolygonFromVertices"` a estos inputs.
  - En el script, implementar `updatePolygonFromVertices()` para reconstruir el array de coordenadas del polígono (asegurando el cierre del anillo conectando el primer y último punto) y actualizar `zonaLocal.geometria`.
  - El watcher pre-existente en `GisMapComponent` detectará la mutación en `zonaLocal.geometria` y actualizará el mapa instantáneamente en tiempo real.