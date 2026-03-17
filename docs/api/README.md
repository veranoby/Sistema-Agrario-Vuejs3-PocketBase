# API Documentation - Sistema Agri

## Overview

Sistema Agri utiliza **PocketBase** como backend, un BaaS (Backend as a Service) auto-hospedado que provee:
- Base de datos SQLite integrada
- Autenticación JWT
- API REST automática
- Real-time subscriptions
- Sistema de reglas de acceso

---

## Colecciones PocketBase

### users
**Propósito**: Autenticación y perfiles de usuario

**Campos principales**:
```javascript
{
  id: string,           // UUID autogenerado
  username: string,     // Nombre de usuario único (uppercase)
  email: string,        // Email único
  emailVisibility: boolean,
  name: string,         // Nombre
  lastname: string,     // Apellido
  avatar: string,       // URL de avatar
  role: string,         // 'superadmin' | 'administrador' | 'auditor' | 'operador'
  hacienda: string,     // Relación con Haciendas (para usuarios regulares)
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- `create`: Solo admins (gestionado por PocketBase)
- `list`: Solo superadmin (para gestión global)
- `view`: Usuario propio o admins de misma hacienda
- `update`: Usuario propio o admins
- `delete`: Solo superadmin

---

### Haciendas
**Propósito**: Configuración de haciendas agrícolas

**Campos principales**:
```javascript
{
  id: string,
  name: string,         // Nombre de hacienda (uppercase)
  user_limit: number,   // Límite de usuarios (superadmin config)
  active_modules: array, // Módulos activos (marketplace)
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- `create`: Solo superadmin
- `list`: Filtrar por usuario autenticado
- `view`: Usuarios de la hacienda o superadmin
- `update`: Solo superadmin
- `delete`: Solo superadmin

---

### actividades
**Propósito**: Actividades agrícolas realizadas en las zonas

**Campos principales**:
```javascript
{
  id: string,
  nombre: string,
  tipo_actividades: string,  // Relación con tipo_actividades
  zona: string,              // Relación con zonas
  hacienda: string,          // Relación con Haciendas
  fecha_inicio: date,
  fecha_fin: date,
  estado: string,            // 'pendiente' | 'en_progreso' | 'completada'
  bpa_estado: number,        // Score BPA (0-100)
  datos_bpa: object,         // Datos de cumplimiento BPA
  metricas: object,          // Métricas específicas del tipo
  creado_por: string,        // Usuario que creó
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- `create`: Administradores y operadores de la hacienda
- `list`: Filtrar por hacienda del usuario autenticado
- `view`: Usuarios de la misma hacienda
- `update`: Creador o administradores de misma hacienda
- `delete`: Solo creador o administradores

---

### siembras
**Propósito**: Siembras y cultivos en las zonas

**Campos principales**:
```javascript
{
  id: string,
  nombre: string,
  tipo: string,              // Tipo de cultivo
  zonas: array,              // Array de zonas relacionadas
  actividades: array,        // Actividades relacionadas
  fecha_siembra: date,
  estado: string,            // 'activa' | 'finalizada'
  superficie: number,        // Superficie en hectáreas
  hacienda: string,
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- Mismo patrón que actividades (por hacienda)

---

### zonas
**Propósito**: Lotes y geolocalización de terrenos

**Campos principales**:
```javascript
{
  id: string,
  nombre: string,
  tipo_zonas: string,        // Tipo de zona
  hacienda: string,
  gps: object,               // Coordenadas GeoJSON
  area: number,              // Superficie en hectares
  bpa_estado: number,        // Score BPA promedio
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- `create`: Administradores de la hacienda
- `list`: Filtrar por hacienda del usuario autenticado
- `view`: Usuarios de la misma hacienda

---

### programaciones
**Propósito**: Tareas programadas recurrentes

**Campos principales**:
```javascript
{
  id: string,
  nombre: string,
  tipo_actividades: string,
  zonas: array,
  frecuencia: string,        // 'diaria' | 'semanal' | 'mensual' | 'anual'
  intervalo: number,         // Intervalo de repetición
  fecha_inicio: date,
  proxima_ejecucion: date,
  estado: string,            // 'activa' | 'pausada' | 'completada'
  observaciones: string,
  hacienda: string,
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- Mismo patrón que actividades

---

### bitacora
**Propósito**: Registro de bitácora de actividades

**Campos principales**:
```javascript
{
  id: string,
  actividad: string,         // Relación con actividades
  siembra: string,           // Relación con siembras (opcional)
  zona: string,              // Relación con zonas
  fecha: date,
  contenido: string,         // Contenido de la entrada
  fotos: array,              // URLs de fotos
  creado_por: string,
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- `create`: Operadores y administradores de la hacienda
- `list`: Filtrar por actividades de la hacienda
- `view`: Usuarios de la misma hacienda
- `update`: Solo creador
- `delete`: Solo creador

---

### recordatorios
**Propósito**: Alertas y recordatorios de tareas

**Campos principales**:
```javascript
{
  id: string,
  titulo: string,
  descripcion: string,
  fecha_recordatorio: date,
  prioridad: string,         // 'baja' | 'media' | 'alta'
  estado: string,            // 'pendiente' | 'en_progreso' | 'completado'
  actividades: array,        // Actividades relacionadas
  siembras: array,           // Siembras relacionadas
  zonas: array,              // Zonas relacionadas
  hacienda: string,
  creado_por: string,
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- Mismo patrón que actividades

---

### tipo_actividades
**Propósito**: Catálogo de tipos de actividades

**Campos principales**:
```javascript
{
  id: string,
  nombre: string,
  descripcion: string,
  datos_bpa: object,         // Plantilla de datos BPA
  metricas: object,          // Métricas específicas del tipo
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- `create`: Solo superadmin
- `list`: Público (todos los usuarios)
- `view`: Público

---

### tipos_zonas
**Propósito**: Catálogo de tipos de zonas

**Campos principales**:
```javascript
{
  id: string,
  nombre: string,
  descripcion: string,
  created: datetime,
  updated: datetime
}
```

**API Rules**:
- Mismo patrón que tipo_actividades

---

## Authentication

### Login
```javascript
POST /api/collections/users/auth-with-password
{
  "identity": "username",
  "password": "password"
}

Response:
{
  "token": "jwt_token",
  "record": { user_object }
}
```

### Token Refresh
```javascript
POST /api/collections/users/refresh
Headers: {
  "Authorization": "Bearer jwt_token"
}
```

---

## Offline Sync API

### Queue Operations
```javascript
// Obtener operaciones pendientes
GET /api/sync/queue

// Agregar operación a cola
POST /api/sync/queue
{
  "operation": "create" | "update" | "delete",
  "collection": "actividades",
  "data": { ... }
}

// Procesar cola (cuando online)
POST /api/sync/process
```

### Conflict Resolution
```javascript
// Obtener conflictos pendientes
GET /api/sync/conflicts

// Resolver conflicto
POST /api/sync/conflicts/{id}/resolve
{
  "strategy": "local" | "server" | "merge"
}
```

---

## Error Handling

### Códigos de Error HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 400 | Bad Request |
| 401 | No autorizado |
| 403 | Prohibido |
| 404 | No encontrado |
| 409 | Conflicto |
| 500 | Error del servidor |

### Ejemplo de Error
```json
{
  "code": 409,
  "message": "Conflicting record",
  "data": {
    "id": "record_id",
    "conflict": "duplicate"
  }
}
```

---

## Rate Limiting

**Actual**: No implementado (configuración futura)

**Planificado**:
- 60 requests por minuto por usuario
- Burst de 10 requests

---

## Webhooks (Futuro)

**Eventos a implementar**:
- `actividad.created` - Nueva actividad creada
- `actividad.completed` - Actividad completada
- `recordatorio.due` - Recordatorio vencido
- `sync.completed` - Sincronización completada

---

**Versión**: 1.0
**Última actualización**: 2026-03-15
