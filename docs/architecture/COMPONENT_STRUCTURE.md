# Estructura de Componentes Refactorizados

## Visualización de Árboles

### 📂 Actividades Workspace Tree

```
📦 src/components/actividades/
├── 📄 ActividadesWorkspace.vue          [279 líneas] ⭐ PRINCIPAL
│   └── Responsabilidad: Orquestador principal, layout y comunicación
│
├── 📄 ActividadesHeader.vue             [170 líneas]
│   ├── Props: actividadInfo, avatarUrl, mi_hacienda, userRole...
│   ├── Events: ninguno
│   └── Responsabilidad: Breadcrumb, chips de estado, avatar
│
├── 📄 ActividadesInfo.vue               [76 líneas]
│   ├── Props: actividadInfo
│   ├── Events: open-edit-dialog
│   └── Responsabilidad: Información y métricas de actividad
│
├── 📄 ActividadesSiembrasZonas.vue      [84 líneas]
│   ├── Props: actividadInfo
│   ├── Events: open-add-siembras-zonas
│   └── Responsabilidad: Lista de siembras/zonas asociadas
│
├── 📄 ActividadesProgramaciones.vue     [65 líneas]
│   ├── Props: programaciones
│   ├── Events: abrir-nueva-programacion, editar-programacion, request-single-execution
│   └── Responsabilidad: Panel de programaciones
│
├── 📄 ActividadesRecordatorios.vue      [113 líneas]
│   ├── Props: actividadId, dialogVisible, recordatorios...
│   ├── Events: actualizar-estado, editar-recordatorio, eliminar-recordatorio, submit-recordatorio
│   └── Responsabilidad: Panel de recordatorios pendientes/en progreso
│
├── 📄 ActividadesBitacora.vue           [45 líneas]
│   ├── Props: actividadId
│   ├── Events: open-new-bitacora-entry-dialog
│   └── Responsabilidad: Lista embebida de bitácora
│
├── 📄 ActividadesEditDialog.vue         [444 líneas]
│   ├── Props: modelValue, actividadInfo, editedActividad...
│   ├── Events: update:modelValue, save, avatar-updated
│   └── Responsabilidad: Formulario completo de edición
│
├── 📄 ActividadesSiembrasZonasDialog.vue [135 líneas]
│   ├── Props: modelValue, siembras, filteredZonas, selected...
│   ├── Events: update:modelValue, update:selected-*, save
│   └── Responsabilidad: Selector de siembras y zonas
│
├── 📁 composables/
│   ├── 📄 useActividadesData.js        [189 líneas]
│   │   └── Responsabilidad: Gestión de datos, carga, estado
│   │
│   └── 📄 useActividadesMetrics.js     [101 líneas]
│       └── Responsabilidad: Lógica de métricas y validaciones
│
└── 📄 index.js                          [16 líneas]
    └── Responsabilidad: Exportaciones centralizadas

📊 Totales: 12 archivos, ~1,725 líneas de código
```

### 📂 Siembra Workspace Tree

```
📦 src/components/siembras/
├── 📄 SiembraWorkspace.vue              [554 líneas] ⭐ PRINCIPAL
│   └── Responsabilidad: Orquestador principal, layout y comunicación
│
├── 📄 SiembraHeader.vue                 [141 líneas]
│   ├── Props: siembraInfo, avatarUrl, mi_hacienda, userRole...
│   ├── Events: ninguno
│   └── Responsabilidad: Breadcrumb, chips de estado, avatar
│
├── 📄 SiembraInfo.vue                   [78 líneas]
│   ├── Props: siembraInfo
│   ├── Events: open-edit-dialog
│   └── Responsabilidad: Información de siembra
│
├── 📄 SiembraZonas.vue                  [216 líneas]
│   ├── Props: siembraInfo, totalArea, zonasfiltradas, headers...
│   ├── Events: open-add-zona, edit-zona, delete-zona
│   └── Responsabilidad: Tabla de zonas con expansión
│
├── 📄 SiembraActividades.vue            [178 líneas]
│   ├── Props: actividadesfiltradas, headers, expanded...
│   ├── Events: open-add-actividad, edit-actividad, delete-actividad
│   └── Responsabilidad: Tabla de actividades relacionadas
│
├── 📄 SiembraBitacora.vue               [68 líneas]
│   ├── Props: siembraId
│   ├── Events: open-new-bitacora-entry-dialog
│   └── Responsabilidad: Lista embebida de bitácora
│
├── 📁 composables/
│   ├── 📄 useSiembraData.js             [219 líneas]
│   │   └── Responsabilidad: Gestión de datos, carga, estado
│   │
│   └── 📄 useSiembraMetrics.js          [35 líneas]
│       └── Responsabilidad: Configuración de tablas y métricas
│
└── 📄 index.js                          [13 líneas]
    └── Responsabilidad: Exportaciones centralizadas

📊 Totales: 9 archivos, ~1,502 líneas de código
```

## 🔄 Flujo de Datos

### Actividades Workspace

```
┌─────────────────────────────────────────────────────────┐
│           ActividadesWorkspace (Orquestador)             │
│  ┌───────────────────────────────────────────────────┐  │
│  │            useActividadesData Composable           │  │
│  │  • actividadInfo (ref)                            │  │
│  │  • loadInitialData()                              │  │
│  │  • openEditDialog()                               │  │
│  └───────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────────┘
           │
           ├──► ActividadesHeader
           │    └── Muestra: breadcrumb, chips, avatar
           │
           ├──► ActividadesInfo
           │    └── Muestra: info + métricas
           │    └── Evento: @open-edit-dialog
           │
           ├──► ActividadesSiembrasZonas
           │    └── Muestra: siembras/zonas asociadas
           │    └── Evento: @open-add-siembras-zonas
           │
           ├──► ActividadesProgramaciones
           │    └── Muestra: panel de programaciones
           │    └── Eventos: @abrir-nueva-programacion, @editar
           │
           ├──► ActividadesRecordatorios
           │    └── Muestra: pendientes/en progreso
           │    └── Eventos: @actualizar-estado, @editar, @eliminar
           │
           └──► ActividadesBitacora
                └── Muestra: lista embebida
                └── Evento: @open-new-bitacora-entry-dialog
```

### Siembra Workspace

```
┌─────────────────────────────────────────────────────────┐
│              SiembraWorkspace (Orquestador)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │               useSiembraData Composable            │  │
│  │  • siembraInfo (ref)                              │  │
│  │  • zonasfiltradas (computed)                      │  │
│  │  • loadInitialData()                              │  │
│  └───────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────────┘
           │
           ├──► SiembraHeader
           │    └── Muestra: breadcrumb, chips, avatar
           │
           ├──► SiembraInfo
           │    └── Muestra: información de siembra
           │    └── Evento: @open-edit-dialog
           │
           ├──► SiembraZonas
           │    └── Muestra: tabla de zonas con expansión
           │    └── Eventos: @open-add-zona, @edit-zona, @delete-zona
           │
           ├──► SiembraActividades
           │    └── Muestra: tabla de actividades
           │    └── Eventos: @open-add-actividad, @edit, @delete
           │
           └──► SiembraBitacora
                └── Muestra: lista embebida
                └── Evento: @open-new-bitacora-entry-dialog
```

## 📊 Comparativa de Complejidad

### Antes de la Refactorización

```
actividadesWorkspace.vue  [██████████████████████████] 1,058 líneas
SiembraWorkspace.vue      [████████████████████████░░]   959 líneas

Total: 2 archivos, 2,017 líneas
Complejidad promedio: 1,008 líneas/archivo
```

### Después de la Refactorización

```
ACTIVIDADES:
ActividadesWorkspace.vue           [████████████░░] 279 líneas (principal)
ActividadesEditDialog.vue          [██████████████] 444 líneas (máximo)
ActividadesHeader.vue              [██████░░░░░░░░] 170 líneas
ActividadesRecordatorios.vue       [█████░░░░░░░░░] 113 líneas
useActividadesData.js              [███████░░░░░░░] 189 líneas
... (7 archivos más pequeños)

Total: 12 archivos, 1,725 líneas
Complejidad promedio: 144 líneas/archivo
Reducción de complejidad: 85.7%

SIEMBRAS:
SiembraWorkspace.vue               [████████████████░] 554 líneas (principal)
useSiembraData.js                   [██████████░░░░░░] 219 líneas
SiembraZonas.vue                    [███████░░░░░░░░] 216 líneas
SiembraActividades.vue             [███████░░░░░░░░] 178 líneas
... (5 archivos más pequeños)

Total: 9 archivos, 1,502 líneas
Complejidad promedio: 167 líneas/archivo
Reducción de complejidad: 83.4%
```

## 🎯 Responsabilidades por Componente

### Componentes Principales (Workspace)
- **Orquestación**: Comunicación entre subcomponentes
- **Estado Global**: Gestión del estado compartido
- **Layout**: Estructura general de la vista
- **Diálogos**: Modales y formularios globales

### Subcomponentes
- **Presentación**: Renderizado de UI específica
- **Interacción**: Manejo de eventos de usuario
- **Especialización**: Funcionalidad específica
- **Reutilización**: Componentes genéricos

### Composables
- **Lógica**: Extracción de lógica reactiva
- **Estado**: Gestión de estado compartible
- **Utilidades**: Funciones helper reutilizables
- **Testing**: Facilita pruebas unitarias

## 🔗 Relaciones de Dependencia

### Dependencias Directas
```
Workspace → Composables
Workspace → Subcomponentes
Subcomponentes → Componentes UI (Vuetify)
Composables → Stores (Pinia)
```

### Dependencias Indirectas
```
Workspace → Router → Route Params
Workspace → i18n → Traducciones
Subcomponentes → Utils → Helpers
```

---

**Última actualización**: 2026-03-14
**Versión**: 1.0.0
**Estado**: Completado ✅
