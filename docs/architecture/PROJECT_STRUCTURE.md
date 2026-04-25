# Estructura del Proyecto

## Stores (src/stores/)

### sync/ → Motor de sincronización offline (9 módulos)

El módulo `sync/` implementa un sistema completo de sincronización offline-first con las siguientes características:

- **cacheManager.js**: Factory para crear wrappers de localStorage con namespace. Permite aislar caché de diferentes módulos usando prefijos (ej: `agri_sync_`).
- **networkMonitor.js**: Monitor de conectividad que detecta cambios en el estado online/offline del navegador.
- **conflictResolver.js**: Resolución de conflictos cuando hay cambios concurrentes entre cliente y servidor.
- **idMapper.js**: Mapeo de IDs temporales (locales) a IDs reales del servidor.
- **syncConfig.js**: Configuración de sincronización selectiva, prioridades por colección y deferred sync.
- **conflictUI.js**: Gestión de la UI de conflictos, incluyendo diálogos de resolución para el usuario.
- **queueProcessor.js**: Procesamiento de la cola de operaciones pendientes con reintentos y prioridades.
- **offlineFeatures.js**: Búsqueda offline, indexación de datos y capacidades sin conexión.
- **index.js**: Orquestador que ensambla todos los submódulos y expone la API unificada del store.

**API principal** (exportada por `index.js`):
- `init()`: Inicializa el sistema de sincronización
- `queueOperation(operation)`: Agrega una operación a la cola
- `processPendingQueue()`: Procesa operaciones pendientes
- `persistQueueState()`: Persiste el estado de la cola
- Métodos delegados a submódulos (idMapper, syncConfig, conflictUI, offline)

### userStore.js → Gestión de usuarios

Store de Pinia para gestión de usuarios del sistema. Maneja:
- Autenticación y autorización
- Perfiles de usuario
- Preferencias y configuraciones personales
- Estado de sesión

### haciendaStore.js → Gestión de haciendas

Store de Pinia para gestión de haciendas/fincas. Maneja:
- CRUD de haciendas
- Usuarios asociados a cada hacienda
- Configuraciones por hacienda
- Datos geográficos y límites

## Composables (src/composables/)

### useValidation.js → Validación de campos con caché TTL

Composable para validación de formularios con caché de resultados con TTL (Time To Live):
- Caché de resultados de validación para evitar validaciones repetidas
- TTL configurable por tipo de validación
- Integración con Vuelidate
- Soporte para validaciones asíncronas

### useSubscriptionLimits.js → Límites de plan

Composable para verificar y gestionar límites de suscripción:
- Verificación de límites por módulo (zonas, siembras, actividades, etc.)
- Alertas cuando se aproxima a un límite
- Bloqueo de acciones cuando se excede el límite
- Integración con el sistema de planes y suscripciones

### useDashboardLoader.js → Carga batch del dashboard

Composable para carga optimizada de datos del dashboard:
- Carga batch de múltiples stores simultáneamente
- Priorización de datos críticos
- Carga diferida de datos secundarios
- Manejo de errores y reintentos
- Métricas de rendimiento de carga

## Utils (src/utils/)

### validators.js → Todas las validaciones centralizadas

Archivo centralizado que contiene todas las funciones de validación del sistema:
- Validaciones de autenticación (email, password strength)
- Validaciones de bitácora (variedad, densidad, rendimiento, etc.)
- Validaciones de datos agrícolas
- Validaciones de negocio
- Validadores reutilizables con mensajes de error localizados

**Funciones principales**:
- `validateEmail(email)`: Validación de formato de email
- `validatePassword(password)`: Validación de fortaleza de contraseña
- `validateBitacoraEntry(datos, tipo, context)`: Validación de entradas de bitácora según tipo
- Validadores específicos por tipo de actividad (Siembra, Cosecha, Aplicación, etc.)

### logger.js → Logging con sanitización automática

Sistema de logging inteligente con las siguientes características:
- **Sanitización automática**: Filtra datos sensibles (passwords, tokens, emails) antes de loggear
- **Anti-spam**: Limita logs repetitivos (máximo 3 repeticiones por minuto)
- **Niveles de log**: error, warn, info, debug, auth, sync, perf, p3
- **Ambiente-aware**: En desarrollo muestra más logs, en producción solo errores y warnings importantes
- **Prefijos visuales**: Emojis para identificar rápidamente el nivel de log
- **Throttling**: Para eventos muy frecuentes con intervalo configurable

**API**:
- `logger.error(message, key)`: Log de error
- `logger.warn(message, key)`: Log de advertencia
- `logger.info(message, key)`: Log informativo
- `logger.debug(message, key)`: Log de debug
- `logger.auth(message, key)`: Log de autenticación
- `logger.sync(message, key)`: Log de sincronización
- `logger.perf(message, key)`: Log de performance
- `logger.sanitize(value)`: Sanitiza un valor manualmente

### exporters/ → Exportación CSV, Excel, PDF, JSON

Directorio con módulos especializados para exportación de datos en diferentes formatos:

- **csvExporter.js**: Exportación a formato CSV con opciones de separador, headers y encoding
- **jsonExporter.js**: Exportación a JSON con pretty printing opcional
- **htmlExporter.js**: Exportación a HTML con estilos básicos para tablas
- **pdfExporter.js**: Exportación a PDF usando jspdf y jspdf-autotable (singleton pattern)
- **excelExporter.js**: Exportación a Excel usando xlsx con soporte para múltiples hojas (singleton pattern)
- **helpers.js**: Funciones utilitarias (deepClone, groupBy, nestBy)
- **index.js**: Re-export de todos los módulos para importación unificada

**Uso**:
```javascript
import { exportToCSV, exportToJSON, exportToPDF, ExcelExporter } from '@/utils/exporters'

exportToCSV(data, 'reporte.csv', { headers: ['col1', 'col2'] })
const excel = new ExcelExporter()
excel.exportToExcel(data, 'reporte.xlsx')
```

### eventBus.js → Eventos globales + bus mitt

Sistema de eventos globales usando `mitt`:
- Eventos centralizados con constantes de tipo
- Soporte para emitir, escuchar y escuchar una sola vez
- Funciones de cleanup para evitar memory leaks
- Tipos de eventos predefinidos:
  - Alertas: `ALERTA_ENVIADA`, `ALERT_CONFIG_UPDATED`
  - Módulos: `MODULO_ACTIVADO`, `MODULO_DESACTIVADO`, `MODULO_LIMIT_REACHED`
  - Haciendas: `HACIENDA_UPDATED`, `USUARIO_ADDED`, `USUARIO_REMOVED`
  - Programaciones: `PROGRAMACION_CREADA`, `PROGRAMACION_ACTUALIZADA`
  - Bitácora: `BITACORA_REGISTRO`, `BPA_VENCIDO`

**Uso**:
```javascript
import eventBus, { EVENTS } from '@/utils/eventBus'
import { useEvents } from '@/composables/useEvents'

// Directo
eventBus.emit(EVENTS.HACIENDA_UPDATED, hacienda)
eventBus.on(EVENTS.HACIENDA_UPDATED, (data) => { /* ... */ })

// Via composable
const { emit, on, once } = useEvents()
emit(EVENTS.MODULO_ACTIVADO, { moduleId: 'siembras' })
```
