# Plan: Habilitar Pines y Polígonos en HaciendaForm

## 1. Problema de Persistencia de Geometría
**Síntoma:** El polígono no se guarda y al recargar no aparece.
**Causa:** Aunque hemos añadido `geometria` a los campos permitidos en `haciendaStore.js`, existe la posibilidad de que la clonación de datos para el payload de la API elimine el objeto, o que `HaciendaForm.vue` no esté activando correctamente la reactividad en el formulario principal porque `geometria` no estaba inicializado correctamente en `formData`.
**Acción:** 
- Revisaremos exhaustivamente el payload de guardado y aseguraremos que `HaciendaForm.vue` preserve e inyecte `geometria` correctamente.

## 2. Soporte para Pines y Polígonos Simultáneos
**Síntoma:** Falta la herramienta de Pin en el modo de dibujo de la Hacienda.
**Solución en `GisMapComponent.vue`:**
1. Modificaremos el validador de la prop `drawMode` para aceptar `'both'` (ambos).
2. Configuraremos `drawOptions` en Leaflet para habilitar los botones de `marker` y `polygon/rectangle` simultáneamente cuando el modo sea `'both'`.
3. Ajustaremos el evento `L.Draw.Event.CREATED`. Actualmente limpia todas las capas al crear una nueva. Lo cambiaremos para que:
   - Si se crea un **Pin (L.Marker)**: Únicamente emitimos el evento `first-point-placed`. Esto actualizará el GPS central y Leaflet redibujará su propio marcador de Hacienda (`centerCircleMarker`). No limpiaremos el polígono ni agregaremos el pin a la capa de polígonos.
   - Si se crea un **Polígono**: Limpiamos la capa de polígonos antigua, añadimos el nuevo y emitimos también `first-point-placed` con su vértice inicial.

## 3. Integración en `HaciendaForm.vue`
**Acción:**
- Cambiaremos la prop del mapa a `draw-mode="both"`.
- Validaremos que al colocar un marcador, el campo GPS se sincronice perfectamente y el mapa centre la hacienda.