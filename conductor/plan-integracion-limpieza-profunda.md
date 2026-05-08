# Plan de Solución: Optimización GIS (Mapas)

Este plan aborda los problemas de visualización y edición en el mapa de haciendas y zonas, asumiendo que el campo `geometria` tipo JSON ya existe correctamente en la colección `zonas` de PocketBase.

## Análisis Actualizado del Problema
Ya que el campo `geometria` existe, los problemas de que el pin "no se grabe" ni "se pueda borrar" derivan de dos vectores principales en el frontend:
1. **Fallback Ausente:** Las zonas antiguas que solo tienen `gps` (lat, lng) pero `geometria = null` no generan una capa inicial (`drawnItems`) en Leaflet. Si no hay capa inicial, la herramienta de "Borrar" (`edit: { remove: true }`) permanece deshabilitada o inoperante.
2. **Desincronización en Auto-Ubicación:** Cuando el usuario usa el botón "AUTO" (GPS automático) o edita los campos numéricos manualmente, actualizamos `zonaLocal.gps`, pero **olvidamos generar el objeto geojson para `zonaLocal.geometria`**. Como resultado, al guardar, se envía `geometria: null`, borrando el punto visual de los dashboards.

## Proposed Changes

### Dashboards
#### [MODIFY] src/components/Dashboard.vue
- Añadir la propiedad `:hacienda-gps="mi_hacienda?.gps"` en la instanciación de `<GisMapComponent>` para habilitar de nuevo el renderizado del círculo rojo (GPS principal de la hacienda).

#### [MODIFY] src/components/siembras/SiembrasDashboard.vue
- Añadir la propiedad `:hacienda-gps="mi_hacienda?.gps"` en `<GisMapComponent>` para unificar el punto central de la hacienda a lo largo de las vistas principales.

### GIS Core
#### [MODIFY] src/components/GisMapComponent.vue
- **Bug Fix:** Cambiar `showArea: true` a `showArea: false` en `drawOptions` del modo polígono. Esto soluciona de raíz el crash nativo de `leaflet-draw` (`ReferenceError: type is not defined`) causado por el formateador de tooltips de medición en la librería base al dibujar el tercer vértice.

#### [MODIFY] src/components/forms/ZonaForm.vue
- **Fallback Visual (Init):** Al inicializar la zona en modo edición, si el `gps` existe pero la `geometria` es falsy, autogeneraremos un GeoJSON `Point` válido. Esto asegura que el pin aparezca y active la herramienta de "Borrar".
- **Sincronización `autoLocate`:** Cuando se obtengan coordenadas con el GPS del navegador o al editar manualmente los text-fields, actualizaremos simultáneamente `zonaLocal.geometria` con la estructura `{ type: 'Point', coordinates: [lng, lat] }`. Esto garantizará que el "dibujo" se envíe a PocketBase incluso si no se usó explícitamente el toolbar del mapa.

## Verification Plan
1. **Automated / Code:** 
   - Revisión de la reactividad cruzada entre `gps` (lat/lng numérico) y `geometria` (GeoJSON Point).
2. **Manual:** 
   - Se probará dibujar un polígono de 3+ puntos (Validar que no ocurre crash de `ReferenceError`).
   - Se usará la Auto-ubicación y se guardará la zona, verificando que el pin aparezca instantáneamente en el Dashboard.
   - Se abrirá una zona antigua sin geometría y se verificará que Leaflet genere un pin interactivo (editable/borrable) a partir de sus coordenadas legacy.

- [ ] 1. Actualizar `src/components/Dashboard.vue`
  - [ ] Añadir prop `:hacienda-gps="mi_hacienda?.gps"` a `GisMapComponent`.
- [ ] 2. Actualizar `src/components/siembras/SiembrasDashboard.vue`
  - [ ] Añadir prop `:hacienda-gps="mi_hacienda?.gps"` a `GisMapComponent`.
- [ ] 3. Actualizar `src/components/GisMapComponent.vue`
  - [ ] Cambiar `showArea: false` en `drawOptions` de `polygon`.
- [ ] 4. Actualizar `src/components/forms/ZonaForm.vue`
  - [ ] Sincronizar `autoLocate` para que modifique `zonaLocal.geometria` al tipo `Point`.
  - [ ] En el `watch` de `props.zonaInicial`, si hay `gps` válido pero no `geometria`, generar el `Point` al vuelo para que leaflet renderice el pin inicial.
  - [ ] En el `watch` reactivo de los text fields lat/lng manuales, también sincronizar `zonaLocal.geometria` como `Point`.
