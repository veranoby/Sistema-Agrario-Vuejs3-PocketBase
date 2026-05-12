# Plan de Corrección Definitiva: Entorno y CSS (El Eslabón Perdido)

## 1. El Misterio del Círculo Rojo (Análisis de Arquitectura Refinado)
El usuario preguntó por qué el círculo de la hacienda sí se ve, pero las zonas no.

**Análisis de Causa Raíz (Matices Técnicos):**
Aunque ambos fallos (polígonos y marcadores invisibles) comparten el origen (CSS faltante), las razones técnicas son independientes y acumulativas:
- **Círculo Rojo (Hacienda):** Creado con `L.circle()`. Renderiza SVG directamente en el DOM. Es resiliente a la falta de CSS porque sus atributos de estilo (color, radio, opacidad) se pasan como parámetros de JS que se inyectan como atributos de línea en el elemento `<path>`.
- **Polígonos (Zonas):** Fallan porque Leaflet depende del CSS global para establecer las dimensiones del contenedor SVG y la correcta superposición de capas. Sin el CSS, el panel de vectores puede asumir altura 0 o quedar oculto por otras capas.
- **Marcadores/Pines:** Fallan porque el CSS y la configuración de Leaflet son necesarios para localizar y posicionar las imágenes de los íconos (`marker-icon.png`). Sin esto, el renderizado de la capa de marcadores aborta al no encontrar los recursos.

## 2. La Causa Raíz del Fallo
En una de mis intervenciones iniciales de limpieza en `GisMapComponent.vue`, **borré accidentalmente las siguientes líneas de código críticas**:

```javascript
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

// Fix for Leaflet default icon issues in production/build
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ ... })
```

**Consecuencia Sistémica:** Sin el CSS base de Leaflet, el panel donde se dibujan los polígonos asume dimensiones `0x0` o no renderiza el SVG correctamente. Sin el fix de los íconos, cualquier pin que se intente crear falla al no encontrar su imagen, abortando el renderizado de la capa.

## 3. Plan de Acción (Restauración)
- [ ] Restaurar los imports de `leaflet.css` y `leaflet.draw.css` en la cabecera de `GisMapComponent.vue`.
- [ ] Restaurar el bloque `L.Icon.Default.mergeOptions` para garantizar que los marcadores no fallen silenciosamente al buscar recursos estáticos.

Esto completará la depuración. Los datos ya fluyen correctamente (como verificamos en la Fase 3 previa), ahora solo devolveremos al mapa la capacidad de pintarlos.