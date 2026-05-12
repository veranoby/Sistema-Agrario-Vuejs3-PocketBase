# Plan de Renderizado Imperativo y Lógica de Dashboards

## 1. Causa Raíz Descubierta (Rigor de Búho)
El misterio de por qué el círculo rojo sobrevive a los refrescos mientras las zonas no, tiene dos causas fundamentales que operaban en paralelo:

1. **La Laguna Lógica de los Dashboards**: En `Dashboard.vue`, la lógica original agrupaba las zonas buscando primero en `siembrasStore`. Si un "Lote" existía en `Zonas` pero no tenía una siembra asociada, **se descartaba por completo**. De la misma forma, `SiembrasDashboard` ignoraba a las Siembras que dependían de los Lotes. Además, si el dashboard se cargaba antes que `tiposZonas`, los lotes se identificaban como puntos (el famoso pin amarillo) temporalmente.
2. **Inestabilidad Declarativa (`L.geoJSON`)**: Mientras que el círculo rojo se dibuja inyectando el SVG directamente al mapa (`L.circle([lat, lng])`), el método `L.geoJSON` depende de validaciones internas de Leaflet que siguen fracasando intermitentemente por la reactividad residual o por problemas al "desempaquetar" las capas de la `FeatureGroup`. 

## 2. Plan de Acción (La Solución Definitiva)

Aceptando la excelente sugerencia del usuario ("usar el mismo método del círculo rojo"), aplicaremos un enfoque 100% imperativo y a prueba de fallos.

### Tarea A: Reescribir Lógica de Dashboards
- **`Dashboard.vue`**: Reescribir `haciendaGeoJSON` para iterar directamente sobre `zonasStore.zonas`. Si es Lote, se envía. Si es Punto, se envía. Si tiene siembra, hereda el color. Cero exclusiones.
- **`SiembrasDashboard.vue`**: Reescribir `siembrasGeoJSON` para iterar sobre las siembras, y si no tienen geometría propia, buscar exhaustivamente la geometría en la colección `Zonas` y enviarla.

### Tarea B: Renderizado Imperativo en `GisMapComponent.vue`
- **Reemplazo de L.geoJSON**: En lugar de delegar el dibujo a `L.geoJSON(data)`, implementaremos un motor imperativo interno.
- **Para Polígonos**: Extraeremos las coordenadas (e.g., `data.coordinates`) y usaremos `L.polygon(latlngs, estilos).addTo(drawnItems)`.
- **Para Puntos/Pines**: Usaremos `L.marker(latlng, { icon: ... }).addTo(drawnItems)`.
- **Beneficio**: Garantizamos que cada zona se dibuje con el mismo nivel de infalibilidad que el círculo rojo de la hacienda, saltándonos las cajas negras de Leaflet y eliminando el bug de raíz.

Presento este plan para validación final. Una vez aprobado, el sistema GIS quedará blindado.