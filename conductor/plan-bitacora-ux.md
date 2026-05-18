# Plan de Implementación: Refactorización UX Bitácora y Corrección Documental

## 1. Correcciones Documentales Críticas (brain/)
Debido a las restricciones del Modo Plan, las correcciones a los archivos de auditoría se realizarán como el **Primer Paso** una vez que iniciemos la implementación:
- **`pinia_stores_reference.json`**: Restauración completa de los stores. Se añadirá en `production_blockers` como P6 la "falta de bloqueo reactivo de UI basado en límites de cuota" para el store `plan`, cuyo porcentaje baja al 60%.
- **`js_interfaces_reference.json`**: Expansión para incluir todas las entidades (Zona, Actividad, Programacion, Recordatorio, User, Hacienda, Plan, Subscription).
- **`bpa_schema_reference.json`**: Creación del nuevo esquema. Se añadirá una nota explícita ("ver colección PocketBase directamente") ya que solo se documentan ejemplos y existen 12 tipos de actividades y 11 de zonas.
- **`business_proposal.md`**: Creación de una sección de "Estado Actual vs. Roadmap Pendiente" marcando Fases 1-4 como completadas, además del marcado explícito de los módulos IA (Proxy Hub y Action Cards) como completados (`✅`).
- **`pb_api_reference.json`**: Actualización de `reports.pb.js` marcándolo como obsoleto/eliminado, dado que migraremos al modelo de "Órdenes de Trabajo" impulsado por UI.

## 2. Refactorización Arquitectónica: Adiós a los Crons (Ghost Logs)
El sistema actual no debe generar entradas de bitácora "fantasmas" automáticamente.
- **Backend**: Se eliminará/desactivará la lógica en `pb_hooks/reports.pb.js` que creaba registros de bitácora incompletos.
- **Frontend (Lógica de Negocio)**: El cálculo de qué debe ejecutarse se hará en el cliente tras el inicio de sesión. `Dashboard.vue` y `ActividadesWorkspace.vue` leerán las `programaciones` activas cuya `proxima_ejecucion` ya venció o está por vencer, listándolas como **"Acciones Pendientes" (Órdenes de Trabajo)**.

## 3. Implementación de UX "4 Pasos" (BitacoraEntryForm.vue)
La captura de datos en el campo se transformará a un modelo ágil:

1. **Paso 1 - Contexto Automático**: Al hacer clic en una "Acción Pendiente", se abre el formulario con el `tipo_actividad` y la(s) `siembra(s)` / `zona(s)` ya pre-cargadas.
2. **Paso 2 - Métricas Dinámicas**: Renderizado dinámico de los inputs (`v-select`, `v-text-field` numérico) basado estrictamente en el JSON `metricas` del `tipo_actividad`.
3. **Paso 3 - Checklist BPA Ágil**: Las `preguntas_bpa` se presentarán usando el nuevo componente `BpaChecklist.vue` basado en Toggle Chips de colores, sin formularios complejos.
4. **Paso 4 - Cierre y Firma**: Un solo botón para guardar y generar la Firma Digital RSA.
5. **Post-Guardado (Manejo de Modos)**: Al guardar, el formulario distinguirá dos escenarios:
   - **Modo A (Desde "Orden de Trabajo")**: Con contexto pre-cargado, el store actualizará la `programacion` asociada calculando la nueva `proxima_ejecucion`.
   - **Modo B (Entrada Libre)**: Con selección manual de actividad/siembra/zona, no se actualizará ninguna programación al no existir una de origen.

## 4. Archivos a Modificar
- **Frontend**: `src/components/forms/BitacoraEntryForm.vue` (Refactor principal UX), `src/components/bitacora/BpaChecklist.vue` (Nuevo componente).
- **Lógica Pinia**: `src/stores/programaciones/programacionesStore.js` (Cálculo de próxima ejecución).
- **Backend**: `pb_hooks/reports.pb.js` (Remoción del cron inyector de Ghost Logs).
- **Documentación**: Todos los archivos en `brain/`.
