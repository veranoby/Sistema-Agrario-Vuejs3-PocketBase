# Reporte Final: El Misterio del Renderizado GIS

## 1. Análisis de los Logs de Trazabilidad
Gracias a los logs profundos que inyectamos, hemos descubierto la verdad absoluta de lo que está ocurriendo:
- **PocketBase (zonasStore.js):** SÍ está entregando los datos. El log `Ejemplo Zona Cruda` demuestra que el payload contiene `geometria` y `gps` como objetos válidos y presentes.
- **Dashboard.vue:** SÍ está procesando las zonas. El log `FeatureCollection finalizada con 3 elementos` demuestra que las zonas con coordenadas fueron empaquetadas correctamente. (Las 4 zonas descartadas son legítimamente zonas sin coordenadas espaciales, como el taller).
- **GisMapComponent:** NUNCA imprimió el log `[TRACE-GIS]`. Esto significa que el componente del mapa NUNCA se enteró de que había datos nuevos y jamás ejecutó el proceso de dibujo.

## 2. La Verdadera Causa Raíz (El Bug Silencioso de Vue 3)
El problema no es PocketBase, ni Leaflet, ni la lógica que implementamos. Es un **caso clásico y silencioso de conversión de nombres de propiedades (Prop Casing) en Vue 3**.

En `GisMapComponent.vue`, la propiedad está definida usando un acrónimo en mayúsculas:
```javascript
props: {
  initialGeoJSON: { ... }
}
```
En Vue 3, cuando una propiedad de un componente pasa a ser un atributo en la plantilla, Vue convierte el `camelCase` a `kebab-case` insertando un guión antes de CADA letra mayúscula. 
Por tanto, la transformación estricta de Vue para `initialGeoJSON` es:
`<GisMapComponent :initial-geo-j-s-o-n="..." />`

Sin embargo, en TODOS los dashboards y formularios del sistema, se le está enviando así:
`<GisMapComponent :initial-geo-json="..." />`

Como el nombre no coincide con el formato esperado por el framework, **Vue descarta la asignación y deja la propiedad interna `initialGeoJSON` con su valor por defecto (`null`)**. El watcher nunca se dispara y Leaflet jamás recibe la orden de dibujar porque para él, la información nunca le fue entregada.

*(Nota: Por eso el círculo rojo sí funciona. Su propiedad es `haciendaGps`, la cual tiene solo una mayúscula y se traduce perfectamente y de forma natural a `:hacienda-gps`)*.

## 3. Plan de Corrección Quirúrgica (Fase de Cierre)

**Tarea A: Solución del Casing en Plantillas (Descartada/Pospuesta)**
Aunque el casing de Vue es un factor, el usuario ha identificado el bug crítico principal que bloquea todo el renderizado: un problema de **Timing y Reactividad**.

**Tarea B: Solución de Timing (Bug Principal)**
El componente `GisMapComponent` nunca dibuja porque `loadPolygon` nunca se llama. 
1. **Ruta 1 (initMap)**: Solo ejecuta si `initialGeoJSON` tiene datos en el mount. Como `Dashboard.vue` usa un computed (`haciendaGeoJSON`) que puede resolverse *después* del mount, aquí llega nulo y se saltea.
2. **Ruta 2 (watch)**: Detecta cambios, pero carece de `immediate: true`. Como el computed de Vue recrea el objeto en cada recálculo, el watcher sin `immediate` puede perderse la asignación inicial tardía.

**Acciones en `src/components/GisMapComponent.vue`:**
1.  **Modificar el Watcher:** Añadir `immediate: true` y manejar el caso donde el mapa aún no está listo:
    ```javascript
    watch(() => props.initialGeoJSON, (newVal) => {
      if (!newVal) return
      if (map) {
        loadPolygon(newVal)
      }
    }, { deep: true, immediate: true })
    ```
2.  **Limpiar redundancia:** Eliminar el bloque de carga en `initMap()` (línea ~353) ya que el watcher con `immediate` ahora se encarga de esto unificadamente.