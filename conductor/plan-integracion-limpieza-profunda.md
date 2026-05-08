# Plan: Sistema de Inteligencia y Métricas Agrícolas

## Goal
Transformar la gestión de métricas en un "Metric Hub" independiente. Se creará una página dedicada (`/metricas`) para analizar el rendimiento, consumo de recursos y salud de los cultivos, extrayendo datos reales de las bitácoras y zonas. Se optimizará el ingreso de datos en bitácora unificando selección y edición.

## User Review Required
> [!IMPORTANT]
> **Instalación de Librerías:** ¿Autorizas la ejecución de `npm install vue-chartjs chart.js` para los gráficos?

> [!WARNING]
> **Resolución de Conflicto de Claves de Métricas y Transformer:** Tras auditar `brain/tipo_actividades.json` y el recién añadido `src/utils/bitacoraMetricTransformer.js`, se confirma que el Transformer usa claves legacy (ej. `rendimiento_kg`) mientras que la Base de Datos usa claves dinámicas (ej. `cantidad_cosechada`). **El nuevo Dashboard ignorará el transformer legacy y extraerá el valor directamente del JSON crudo de la bitácora (`bitacora.metricas.cantidad_cosechada`)**.

## Proposed Changes

### 1. Preparación y Navegación
- **Nueva Página (`src/views/MetricasView.vue`):** Componente principal del dashboard (se creará en la Fase 1).
- **Router y Sidebar:** Añadir ruta `/metricas` en `src/router/index.js` y el objeto de navegación en `src/components/Sidebar.vue`. (Roles: Admin, Auditor, Operador).

### 2. Refactor de `FormularioMetricas.vue` (UI Unificada)
- Renderizar una única vista con un `v-checkbox` (para habilitar) acompañado de un `v-text-field` o `v-select` (para el valor) por cada métrica.

### 3. Capa de Datos y KPIs Avanzados (Análisis de BD)
Se crearán getters de agregación en `bitacoraStore.js` (o en un nuevo `useMetrics.js`).
- **Índice de Sanidad (Control de Plagas):** Mapear `nivel_afectacion` ("Bajo"=1, "Moderado"=2, "Alto"=3) para graficar picos de infestación en el tiempo.
- **Calidad de Cosecha (Pie Chart):** Usar `clasificacion_producto` ("Primera", "Segunda", "Tercera") de la actividad de Cosecha para ver el % de producto premium.
- **Eficiencia de Siembra (Zonas + Actividades):** Comparar la `cantidad_cosechada` vs la `densidad_siembra` (del Lote asociado) para obtener un "Rendimiento por Planta".
- **Horas-Hombre en Seguridad:** Multiplicar `participantes` por `duracion_capacitacion` de la actividad "Capacitación".

### 4. Definición Final de Gráficos Base (Claves Corregidas a DB)
| Actividad / Categoría | Clave Real en PocketBase | Tipo de Gráfico |
| :--- | :--- | :--- |
| **Producción** (Cosecha) | `cantidad_cosechada` | Barras Apiladas |
| **Calidad** (Cosecha) | `clasificacion_producto` | Gráfico de Pastel (Doughnut) |
| **Recursos** (Riego) | `volumen_agua_utilizada` | Línea de Tendencia |
| **Insumos** (Fertilización) | `dosis_aplicada` | Barras |
| **Sanidad** (Plagas) | `nivel_afectacion` | Línea de Picos de Alerta |

## Verification Plan
1. **Verificar Claves Reales:** Validar que al crear una bitácora de riego, se guarda en el JSON como `volumen_agua_utilizada` y no como `dosis_agua`.
2. **Dashboard de KPIs:** Verificar que el gráfico de pastel agrupa correctamente los kilos según su `clasificacion_producto`.

- [ ] **Fase 0: Pre-requisitos**
  - [x] Fix Import: Corregir ruta en `src/stores/sync/index.js` (Resuelto, ahora apunta a `programacionesStore.js`).
  - [ ] Instalar Dependencias: Ejecutar `npm install vue-chartjs chart.js`.
  - [ ] Crear Vista: Crear `src/views/MetricasView.vue` (esqueleto base).

- [ ] **Fase 1: Preparación y Navegación**
  - [ ] Router (`src/router/index.js`): Añadir `/metricas` a `ROUTE_ROLE_MATRIX.hacienda` y definir la ruta con `meta.roles` para Administrador, Auditor y Operador.
  - [ ] Sidebar (`src/components/Sidebar.vue`): Añadir navlink visual para "Métricas".

- [ ] **Fase 2: Refactor del Formulario de Métricas en Bitácora**
  - [ ] Eliminar en `src/components/forms/FormularioMetricas.vue` la lógica de renderizado condicional por "modo".
  - [ ] Unificar la vista: iterar sobre `metricasDisponibles` y renderizar `v-checkbox` (para habilitar inclusión) emparejado con un campo dinámico (`v-text-field`, `v-select`) que recibe el valor explícito.
  - [ ] Validar Flujo: Asegurar que `BitacoraEntryForm.vue` procese correctamente el nuevo formato.

- [ ] **Fase 3: Capa de Inteligencia y Extracción de Datos**
  - [ ] Crear composable `useMetrics.js` o actualizar `bitacoraStore.js`.
  - [ ] Implementar extracción de JSON crudo (`bitacora.metricas.cantidad_cosechada`). **IGNORAR** `src/utils/bitacoraMetricTransformer.js` para los gráficos, ya que usa constantes legacy.
  - [ ] Desarrollar calculadoras de Agregación:
    - [ ] `getTotalCosecha()` (Suma).
    - [ ] `calcularRendimientoPorPlanta()` (Cruza Cosecha con Densidad de Zona).
    - [ ] `calcularIndiceSalud()` (Mapea `nivel_afectacion`).

- [ ] **Fase 4: Desarrollo de `MetricasDashboard`**
  - [ ] Componentizar filtros por Siembra, Actividad y Fechas en la nueva vista.
  - [ ] Implementar tarjetas de KPIs superiores usando los getters de la Fase 3.
  - [ ] Implementar gráficos:
    - [ ] **Doughnut Chart:** Calidad de Cosecha (`clasificacion_producto`).
    - [ ] **Bar Chart Apilado:** Producción (`cantidad_cosechada`).
    - [ ] **Line Chart:** Consumo de Agua (`volumen_agua_utilizada`).
    - [ ] **Bar Chart:** Insumos (`dosis_aplicada`).

- [ ] **Fase 5: Validación Cruzada**
  - [ ] Simular carga de 3 bitácoras y validar que los gráficos renderizan correctamente basándose en los JSONs dinámicos.
