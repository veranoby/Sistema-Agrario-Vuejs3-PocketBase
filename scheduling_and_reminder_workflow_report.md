# Scheduling and Reminder System Workflow Report

This report details the workflow of the scheduling and reminder system based on the analysis of `recordatoriosStore.js`, `ProgramacionForm.vue`, `ProgramacionesList.vue`, `ProgramacionPanel.vue`, and `programacionesStore.js`.

## 1. Core Data Models and Stores

The system relies on two primary Pinia stores for managing its core data:

*   **`programacionesStore.js`**: Manages "Programaciones" (schedules), which define recurring tasks or activities.
*   **`recordatoriosStore.js`**: Manages "Recordatorios" (reminders), which are individual prompts or notifications, potentially linked to activities, sowings, or zones.

### Key Properties of a "Programación" (Schedule) Object:

A "Programación" object, as managed by `programacionesStore.js`, typically includes:

*   `id`: Unique identifier.
*   `descripcion`: User-defined name or description for the schedule.
*   `actividades`: An array of activity IDs associated with this schedule.
*   `siembras`: An array of "siembra" (sowing/project) IDs, automatically derived from associated activities.
*   `frecuencia`: String indicating the recurrence pattern (e.g., `diaria`, `semanal`, `fecha_especifica`, `personalizada`).
*   `frecuencia_personalizada`: An object detailing custom frequency rules if `frecuencia` is `personalizada` or `fecha_especifica`.
    *   For `personalizada`: `{ tipo: 'dias'/'semanas'/'meses'/'años', cantidad: number, diasSemana: number[], diasMes: string/number[], exclusiones: string[] }`
    *   For `fecha_especifica`: `{ fecha: string (YYYY-MM-DD) }`
*   `estado`: Current status of the schedule (e.g., `activo`, `pausado`, `finalizado`).
*   `ultima_ejecucion`: Timestamp of the last execution.
*   `proxima_ejecucion`: Timestamp calculated for the next expected execution.
*   `hacienda`: ID of the "hacienda" (farm/estate) it belongs to.
*   `version`: Data version number.
*   `created`: Timestamp of creation.
*   `updated`: Timestamp of the last update.
*   `_isTemp` (optional): Boolean flag indicating if the item is a temporary offline record.

### Key Properties of a "Recordatorio" (Reminder) Object:

A "Recordatorio" object, as managed by `recordatoriosStore.js`, typically includes:

*   `id`: Unique identifier.
*   `titulo`: Title of the reminder.
*   `descripcion`: Detailed description of the reminder.
*   `fecha_recordatorio`: Date for the reminder (ISO string).
*   `prioridad`: Priority level (e.g., `media`, `alta`, `baja`).
*   `estado`: Status of the reminder (e.g., `pendiente`, `en_progreso`, `completado`).
*   `siembras`: Array of associated "siembra" IDs.
*   `actividades`: Array of associated activity IDs.
*   `zonas`: Array of associated zone IDs.
*   `hacienda`: ID of the "hacienda" it belongs to.
*   `version`: Data version number.
*   `fecha_creacion`: Timestamp of creation.
*   `created`: System timestamp of creation.
*   `updated`: System timestamp of the last update.
*   `_isTemp` (optional): Boolean flag indicating if the item is a temporary offline record.

## 2. Creating and Managing Schedules

### `ProgramacionForm.vue`:

This Vue component is responsible for the user interface for creating and editing schedules.

*   **User Input:**
    *   **Description (`form.descripcion`):** Users can input a textual description for the schedule. This field is also dynamically updated based on selected activities and frequency.
    *   **Activities (`form.actividadesSeleccionadas`):** Users select one or more activities to be part of the schedule.
        *   The form distinguishes between **"ACTIVIDADES DE SIEMBRA/PROYECTOS"** (activities linked to `siembras`) and **"ACTIVIDADES ADICIONALES"** (general activities not directly tied to a `siembra`). This is handled by `filteredActividadesSiebra` and `filteredActividades` computed properties.
    *   **Frequency (`form.frecuencia`):** Users choose a frequency from a predefined list:
        *   `diaria` (Daily)
        *   `semanal` (Weekly)
        *   `quincenal` (Bi-weekly/Fortnightly)
        *   `mensual` (Monthly)
        *   `fecha_especifica` (Specific Date)
        *   `personalizada` (Custom)
    *   **Custom Frequency Details (`frecuenciaPersonalizada` ref):**
        *   If `fecha_especifica` is chosen, a date input (`frecuenciaPersonalizada.fecha`) appears.
        *   If `personalizada` is chosen, further options appear:
            *   `tipo`: 'dias', 'semanas', 'meses', 'años'.
            *   `cantidad`: Numeric input for "every X days/weeks/etc."
            *   `diasSemana`: Multi-select for specific days of the week (if `tipo` is 'semanas').
            *   `diasMes`: Input for specific days of the month (if `tipo` is 'meses').
            *   `exclusiones`: Options like 'feriados' (holidays), 'fines_de_semana' (weekends).
    *   **State (`form.estado`):** Users select the schedule's state (`activo`, `pausado`, `finalizado`).
*   **Dynamic Description Generation:**
    *   A computed property `descripcionDinamica` automatically generates a descriptive string by combining the names of selected activities and the chosen frequency (e.g., "Activity Name 1, Activity Name 2 - Daily").
    *   This dynamic description is watched, and the `form.descripcion` field is updated accordingly, though users can still manually edit it.
*   **Saving:** The `guardarProgramacion` method handles form submission.

### `programacionesStore.js` (`crearProgramacion`, `actualizarProgramacion` actions):

These actions handle the persistence of schedule data.

*   **Saving New Schedules (`crearProgramacion`):**
    *   Takes `nuevaProgramacion` data from the form.
    *   Enriches the data with `hacienda` ID, `version`, sets `ultima_ejecucion` to `null`, and `created` to the current timestamp.
    *   Crucially, it calls `obtenerSiembrasRelacionadas(nuevaProgramacion.actividadesSeleccionadas)` to automatically populate the `siembras` array by looking up the `siembras` associated with the selected activities (via `actividadesStore`).
    *   **Initial `proxima_ejecucion` Calculation:**
        *   If `frecuencia` is `fecha_especifica`, `proxima_ejecucion` is set to the specified date.
        *   If `frecuencia` is `personalizada`, it calculates the next execution based on the custom configuration (e.g., `addDays(new Date(), config.cantidad)`).
        *   For standard frequencies (`diaria`, `semanal`, etc.), it calculates the next execution relative to the current date (e.g., `addDays(new Date(), 1)` for daily).
    *   **Offline Handling:** If `syncStore.isOnline` is false:
        *   A temporary ID (`tempId`) is generated.
        *   The schedule is added to the local `programaciones` array with an `_isTemp: true` flag.
        *   The operation is queued in `syncStore` (`type: 'create'`).
    *   If online, it calls `pb.collection('programaciones').create()` to save to PocketBase.
*   **Updating Existing Schedules (`actualizarProgramacion`):**
    *   Takes the schedule `id` and `datosActualizados`.
    *   Recalculates `proxima_ejecucion` using `this.calcularProximaEjecucion()` based on the potentially updated frequency and the existing `ultima_ejecucion`.
    *   **Offline Handling:** Similar to creation, if offline, the local array is updated, and an `update` operation is queued in `syncStore`.
    *   If online, it calls `pb.collection('programaciones').update()`.

## 3. Displaying Schedules

### `ProgramacionesList.vue`:

This component displays a list of schedules, organized into groups.

*   **Grouping (`groupedProgramaciones` computed property):**
    *   Schedules are primarily grouped by their associated "Siembras/Proyectos". If a schedule is linked to one or more `siembras` (via its activities), it appears under each respective "Siembra/Proyecto" name. The `siembrasStore.getSiembraNombre(siembraId)` is used to get the name.
    *   Schedules not linked to any `siembra` are grouped under "Actividades". The names of their associated activities (`actividadesStore.getNombreActividad(actividadId)`) are used as the group title.
    *   Each group then lists its schedules, rendering them using the `ProgramacionPanel` component.

### `ProgramacionPanel.vue`:

This component displays the details of a single schedule item.

*   **Information Displayed:**
    *   **Description (`programacion.descripcion`):** The schedule's name/description, truncated for brevity.
    *   **Status (`programacion.estado`):** Indicated by a colored dot (e.g., green for `activo`, orange for `pausado`). A tooltip shows the status text.
    *   **Activity Type (`actividadTipo` computed property):** Shows the type of the first associated activity (e.g., "Siembra", "Cosecha"), fetched via `actividadesStore.getActividadTipo()`.
    *   **Last Execution (`formatFecha(programacion.ultima_ejecucion)`):** Formatted date of the last execution.
    *   **Next Execution (`formatFecha(programacion.proxima_ejecucion)`):** Formatted date of the next calculated execution.
*   **`ejecucionesPendientes` (Computed Property):**
    *   Calculates how many times the schedule should have executed since its `ultima_ejecucion` up to the current date, based on its `frecuencia`.
    *   For `fecha_especifica`, it's 1 if the date is in the past, 0 otherwise.
    *   For frequency-based schedules (daily, weekly, custom, etc.), it uses `differenceInDays` or `differenceInMonths` and the frequency rules (e.g., `Math.floor(diasDesdeUltima / 7)` for weekly).
    *   Displayed as a chip (e.g., `mdi-alert` icon + count) if > 0, often with an "urgent" (red) indication.
*   **`debeEjecutarHoy` (Computed Property):**
    *   Determines if the schedule's `proxima_ejecucion` (or `frecuencia_personalizada.fecha` for specific dates) falls on the current calendar day.
    *   If true, a prominent "Ejecutar hoy" chip is displayed.
*   **Color-Coding:** The main status icon (`mdi-circle`) is color-coded: green for `activo`, orange for `pausado`, red for `finalizado`.

## 4. Executing Schedules

*   **Trigger:** Execution is manually triggered by the user clicking an "Ejecutar" button (single execution) or an "Ejecutar X" button (batch execution for pending instances) on the `ProgramacionPanel.vue` for a specific schedule. These actions emit `ejecutar` or call `ejecutarEnBloque` which in turn calls `programacionesStore.ejecutarProgramacion(id)`.

### `programacionesStore.js` (`ejecutarProgramacion` action):

This action orchestrates the process of executing a schedule.

*   **Detailed Breakdown:**
    1.  Finds the `programacion` object by its `id`.
    2.  Retrieves the list of associated `actividades` from the `programacion.actividades` array.
    3.  **Iterates through Associated `actividades`:** For each `actividadId` in the schedule:
        *   **Creation of Bitácora Entries:**
            *   Constructs an `entryData` object for the bitácora (logbook).
            *   This `entryData` includes:
                *   `programacion_origen`: The ID of the schedule being executed.
                *   `actividad_realizada`: The current `actividadId` from the iteration.
                *   `fecha_ejecucion`: Current timestamp (`new Date().toISOString()`).
                *   `estado_ejecucion`: Set to `'completado'`.
                *   `siembra_asociada`: The first `siembra` ID from `programacion.siembras`, if available; otherwise `null`.
            *   Calls `bitacoraStore.crearBitacoraEntry(entryData)` to log the execution of this specific activity as part of the schedule.
            *   Errors during bitácora creation for one activity do not stop the processing of other activities in the schedule.
    4.  **Updating Schedule:**
        *   Sets `ultima_ejecucion` of the schedule to the current timestamp (`new Date().toISOString()`).
        *   Recalculates `proxima_ejecucion` by calling `this.calcularProximaEjecucion()` with the updated `ultima_ejecucion`.
        *   Calls `this.actualizarProgramacion()` to save these changes (both `ultima_ejecucion` and the new `proxima_ejecucion`) to the store and backend (or queue for sync).
*   **No Direct Creation of Reminders:** The `ejecutarProgramacion` action **does not** automatically create any "Recordatorio" objects.

## 5. Managing Reminders (`recordatoriosStore.js`)

Reminders are managed independently of the schedule execution flow.

*   **`RecordatorioForm.vue` (Implicit):**
    *   Although `RecordatorioForm.vue` was not directly provided for analysis, the actions `abrirNuevoRecordatorio` and `editarRecordatorio` in `recordatoriosStore.js` imply its existence and functionality.
    *   `abrirNuevoRecordatorio(actividadId = null)`: Initializes `recordatorioEdit` with default/empty values (title, description, current date for `fecha_recordatorio`, default priority 'media', state 'pendiente'). It can optionally pre-link an `actividadId`.
    *   `editarRecordatorio(id)`: Loads an existing reminder into `recordatorioEdit` for modification.
    *   Users likely input:
        *   `titulo` (title)
        *   `descripcion` (description)
        *   `fecha_recordatorio` (reminder date)
        *   `prioridad` (priority)
        *   `estado` (status)
        *   Linked entities: `siembras`, `actividades`, `zonas` (likely through multi-selects or similar UI elements in the form).

*   **Store Actions:**
    *   `cargarRecordatorios`: Fetches reminders from PocketBase (filtered by the current `hacienda`) or loads from local storage for offline use.
    *   `crearRecordatorio(recordatorioData)`: Saves a new reminder.
        *   Enriches data with `hacienda` ID, `version`, default `estado` ('pendiente'), and `fecha_creacion`.
        *   Handles offline queuing similarly to `programacionesStore`.
    *   `actualizarRecordatorio(id, newData)`: Updates an existing reminder. Handles offline queuing.
    *   `eliminarRecordatorio(id)`: Deletes a reminder. Handles offline queuing.
*   **Filtering Getters:**
    *   `recordatoriosPorActividad(actividadId)`: Filters reminders linked to a specific activity.
    *   `recordatoriosPendientes(actividadId = null)`: Gets pending reminders, optionally filtered by activity.
    *   `recordatoriosEnProgreso(actividadId = null)`: Gets in-progress reminders, optionally filtered by activity.
    *   `recordatoriosCompletados(actividadId = null)`: Gets completed reminders, optionally filtered by activity.
*   **Offline Handling:** Uses `syncStore` extensively for creating, updating, and deleting reminders, queuing operations when offline and syncing when online.

*   **Current Linkage:** Reminders can be manually linked to `actividades`, `siembras`, and `zonas` during their creation or editing process. This linkage is not automated by the schedule execution process.

## 6. Relationship & Interaction: Schedules, Reminders, and Bitácora

*   **Schedules -> Bitácora (Direct):**
    *   When a schedule is executed via `programacionesStore.ejecutarProgramacion()`, it directly creates entries in the "Bitácora" (logbook) for each activity associated with that schedule. This provides a historical record of scheduled tasks being performed.

*   **Schedules -> Reminders (Indirect/Manual):**
    *   There is **no automatic creation or triggering of "Recordatorios"** when a "Programación" (schedule) is defined or executed.
    *   The link is indirect: a user might create a "Recordatorio" and manually associate it with an "Actividad" that also happens to be part of a "Programación". The system does not enforce or automate this connection based on schedule logic.

*   **Reminders -> Bitácora:**
    *   Based on the analyzed files (primarily `recordatoriosStore.js`), there is **no direct evidence** that completing or changing the state of a "Recordatorio" automatically logs an entry to the "Bitácora".
    *   It's possible that such functionality exists in other parts of the application (e.g., within the UI component that handles reminder state changes) but it's not apparent from the store logic for reminders.

## 7. Offline Functionality (`syncStore`)

Both `programacionesStore.js` and `recordatoriosStore.js` are designed to work offline, leveraging the `syncStore.js` utility.

*   **Queuing Operations:**
    *   When an operation (create, update, delete) is performed while the application is offline (`!syncStore.isOnline`), the respective store action (e.g., `crearProgramacion`, `actualizarRecordatorio`) does not attempt a direct backend call.
    *   Instead, it modifies the local state array (e.g., `this.programaciones`, `this.recordatorios`).
    *   The operation details (type, collection name, data, temporary ID if it's a new item) are then passed to `syncStore.queueOperation()`.
*   **Temporary IDs:**
    *   For new items created offline (schedules or reminders), a temporary ID is generated using `syncStore.generateTempId()`. The local item is stored with this temporary ID and an `_isTemp: true` flag.
    *   This allows the UI to reflect the new item immediately.
*   **Synchronization:**
    *   `syncStore` (presumably through its `init` or other methods not fully detailed here but implied by `applySyncedCreate`, `applySyncedUpdate`, `applySyncedDelete` methods in the stores) handles the synchronization process when the application comes back online.
    *   It iterates through the queued operations:
        *   For `create` operations, it sends the data to PocketBase. Upon successful creation, PocketBase returns the real item with its permanent ID. The `applySyncedCreate` method in the respective store is then called to update the local item (replacing the temporary ID with the real ID and setting `_isTemp` to `false`).
        *   For `update` and `delete` operations, `syncStore` sends the request to PocketBase. The `applySyncedUpdate` and `applySyncedDelete` methods in the stores then update or remove the local items accordingly.
*   **Local Storage:** Both stores also use `syncStore.saveToLocalStorage()` to persist their current state (the arrays of schedules or reminders), allowing data to be available across page reloads even when offline. They load this data via `syncStore.loadFromLocalStorage()` during initialization.

This offline strategy ensures that users can continue to interact with and manage schedules and reminders even without an active internet connection, with changes being synced once connectivity is restored.
markdown
I have created the markdown report as requested and saved it to `scheduling_and_reminder_workflow_report.md`.
