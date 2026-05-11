# Plan de Estabilización de Componentes GIS

## 1. Análisis del Riesgo en `GisMapComponent`
El usuario tiene razón: modificar el `watcher` y el `onMounted` en `GisMapComponent.vue` de forma indiscriminada podría romper `Dashboard.vue` y `SiembrasDashboard.vue`. 
La arquitectura actual asume que `loadPolygon` puede ser disparado por el watcher cuando cambian las props reactivas. El problema con `ZonaForm.vue` es que la prop `initialGeoJSON` a menudo se asigna de forma síncrona *antes* de que el mapa interno de Leaflet termine de montarse en el `onMounted` del componente hijo, y como su valor *no cambia* después, el watcher no se vuelve a disparar.

**Acción Segura para `GisMapComponent`:**
Restaurar en `initMap()` la carga inicial manual **solo si** el mapa no tiene capas dibujadas. Esto garantiza que componentes que no envían actualizaciones reactivas (como ZonaForm cuando se abre para editar) dibujen su estado inicial.

## 2. El Parpadeo en `SiembrasDashboard.vue`
En el Dashboard principal, el mapa solo se monta cuando `haciendaGeoJSON` tiene datos (`v-if="haciendaGeoJSON"`). En `SiembrasDashboard`, el mapa está fijo y las props reactivas cambian. Cuando la página carga, `siembras` puede llenarse antes que `zonas` (cargas asíncronas separadas). Durante ese milisegundo:
1. `siembrasGeoJSON` se recalcula solo con datos de siembra.
2. Luego llega `zonas`, se recalcula de nuevo, Leaflet limpia y redibuja, causando el parpadeo de pines a polígonos y arruinando el cálculo del auto-zoom que ocurre asíncronamente en 200ms.

**Acción para `SiembrasDashboard`:**
Añadir el atributo `v-if="siembrasGeoJSON"` a `<GisMapComponent>` de forma idéntica a como está en `Dashboard.vue`. Esto obliga al mapa a montarse de una sola vez cuando la `FeatureCollection` completa y consolidada está lista.

## 3. El Problema de ZonaForm
En `ZonaForm.vue`, la variable que pasamos al mapa es `zonaLocal.geometria` (que es puramente reactiva). Sin embargo, el mapa espera la prop `initialGeoJSON`. Si restauramos el renderizado inicial en `initMap()` como se describe en el paso 1, el problema debería resolverse automáticamente sin tocar el código de `ZonaForm`.

## Resumen de Cambios
1. **En `GisMapComponent.vue`**: Añadir al final de `initMap`:
   ```javascript
   if (props.initialGeoJSON) {
     loadPolygon(props.initialGeoJSON)
   }
   ```
2. **En `SiembrasDashboard.vue`**: Añadir `v-if="siembrasGeoJSON"` a la llamada del componente.