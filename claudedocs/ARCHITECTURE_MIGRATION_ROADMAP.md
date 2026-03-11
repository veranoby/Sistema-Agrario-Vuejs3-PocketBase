# Roadmap de Migración Arquitectónica
**Sistema Agri - PocketBase → Node.js + PostgreSQL**
**Fecha**: 2026-01-30
**Estado**: Planificación Estratégica

---

## ARQUITECTURA ACTUAL (PocketBase + SQLite)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA AGRI - ACTUAL                        │
│                  Vue 3.5 + Vuetify 3.8                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP/REST + WebSocket
                                  │ PocketBase SDK
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     POCKETBASE SERVER                           │
│                      Single Binary (Go)                         │
│                      Port: 8090                                 │
└─────────────────────────────────────────────────────────────────┘
                          │               │
                          │               │
        ┌─────────────────┘               └─────────────────┐
        │                                                     │
        ▼                                                     ▼
┌──────────────────┐                              ┌──────────────────┐
│   SQLite DB      │                              │   File Storage   │
│   WAL Mode       │                              │   (avatars, etc) │
│   data.db 2.6MB  │                              │   pb_data/storage│
│                  │                              │                  │
│ LIMITS:          │                              │                  │
│ - 1 writer       │                              │                  │
│ - ~100-500 w/s   │                              │                  │
│ - 2MB JSON fields│                              │                  │
└──────────────────┘                              └──────────────────┘

FRONTEND (Vue SPA):
├─ 67 components Vue
├─ 18 stores Pinia (syncStore.js: 2,362 lines)
├─ localStorage: 5MB limit ⚠️ BOTTLENECK
├─ syncQueue: Exponential backoff
└─ Offline-first: Selective sync

LIMITACIONES CRÍTICAS:
❌ Max 200 concurrent users (realistic)
❌ No horizontal scaling
❌ Write lock contention
❌ localStorage 5MB limit
❌ Single point of failure
```

---

## ARQUITECTURA OBJETIVO (Node.js + PostgreSQL)

```
┌─────────────────────────────────────────────────────────────────┐
│              SISTEMA AGRI - FUTURE ARCHITECTURE                 │
│                  Vue 3.5 + Vuetify 3.8 (UNCHANGED)              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP/REST + WebSocket
                                  │ Axios / socket.io-client
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LOAD BALANCER (Nginx)                        │
│                   SSL Termination + Routing                     │
└─────────────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
        ┌───────────┘           └───────────┐
        │                                   │
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Node.js API #1  │              │  Node.js API #2  │
│  Fastify/Express │              │  Fastify/Express │
│  Port: 3000      │              │  Port: 3001      │
│                  │              │                  │
│  Horizontal      │              │  Auto-scaling    │
│  Scaling ✅      │              │  (K8s/Docker)    │
└──────────────────┘              └──────────────────┘
        │                                   │
        └─────────────┬─────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│   PostgreSQL 15+ │      │     Redis 7+     │
│   (Primary DB)   │      │   (Cache+Queue)  │
│                  │      │                  │
│ FEATURES:        │      │ FEATURES:        │
│ - Connection     │      │ - Sync Queue     │
│   Pooling ✅     │      │ - Session Store  │
│ - JSONB Index ✅ │      │ - Pub/Sub        │
│ - HA/Replica ✅  │      │ - Cache          │
│ - 10,000+ w/s    │      │ - Rate Limiting  │
└──────────────────┘      └──────────────────┘

VENTAJAS NUEVAS:
✅ 10,000+ concurrent users
✅ Horizontal scaling nativo
✅ High availability (replicas)
✅ JSONB indexes (100x faster JSON queries)
✅ No write lock contention
✅ IndexedDB instead of localStorage (50MB-1GB)
```

---

## ROADMAP DE MIGRACIÓN (3 FASES)

### FASE 1: OPTIMIZACIÓN POCKETBASE (0-3 meses)
**Objetivo**: Validar MVP sin cambios arquitectónicos mayores

```
┌─────────────────────────────────────────────────────────────┐
│ TARES FASE 1                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ COMPLETADO:                                              │
│  - Scheduler automático                                     │
│  - Exportación PDF/Excel                                    │
│  - Conflict resolution UI                                   │
│  - Optimización performance (carga paralela)                │
│                                                             │
│ ⚠️ PENDIENTE (P0 - CRITICAL):                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ T001: Testing Suite (Vitest + Playwright)           │   │
│  │ - Unit tests para stores críticos                   │   │
│  │ - E2E tests para flujos principales                  │   │
│  │ - Coverage objetivo: 80%+                            │   │
│  │ - Estimado: 16 horas                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ⚠️ PENDIENTE (P0 - CRITICAL):                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ T001-B: IndexedDB Refactor                          │   │
│  │ - Reemplazar localStorage con IndexedDB             │   │
│  │ - Capacidades: 50MB-1GB (vs 5MB actual)             │   │
│  │ - Refactor syncStore.js (2,362 líneas)             │   │
│  │ - Estimado: 20 horas                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ⚠️ PENDIENTE (P1 - IMPORTANT):                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ T004: Monitoring (Sentry)                           │   │
│  │ - Error tracking en producción                      │   │
│  │ - Performance monitoring                            │   │
│  │ - Estimado: 4 horas                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ⚠️ PENDIENTE (P1 - IMPORTANT):                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ T003: Paginación API                                │   │
│  │ - page/perPage parameters en todas las colecciones │   │
│  │ - Infinite scroll o paginación tradicional          │   │
│  │ - Estimado: 6 horas                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 📊 MÉTRICAS A MEDIR:                                        │
│  - Usuarios concurrentes pico                             │
│  - Writes/min sostenidos                                  │
│  - localStorage usage rate                                │
│  - Response time percentiles (p50, p95, p99)              │
│  - Sync queue size (avg, max)                             │
│  - Error rate por tipo                                    │
│                                                             │
│ 🎯 TRIGGER FASE 2:                                         │
│  - >100 usuarios concurrentes sostenidos                  │
│  - >50 writes/min sostenidos                              │
│  - localStorage 5MB lleno en <2 semanas                   │
│  - Validación clara de product-market fit                 │
│  - Performance degradada (>500ms p95 response time)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

COSTO FASE 1: 46 horas + $0/mes
RIESGO: BAJO (optimizaciones sobre stack conocido)
```

### FASE 2: SOLUCIÓN HÍBRIDA (3-6 meses)
**Objetivo**: Escalar a 500-1000 usuarios sin re-escribir todo

```
┌─────────────────────────────────────────────────────────────┐
│ ARQUITECTURA HÍBRIDA                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POCKETBASE (Auth + Metadata)                              │
│  ├── users_auth (login, JWT)                               │
│  ├── Haciendas (metadata only)                             │
│  ├── plans (suscripciones)                                 │
│  └── Realtime subscriptions (WebSocket)                    │
│                                                             │
│  POSTGRESQL (Datos Transaccionales)                        │
│  ├── bitacora (writes intensivos)                          │
│  ├── actividades (frecuently updated)                      │
│  ├── programaciones (scheduler data)                       │
│  ├── zonas (large datasets)                                │
│  └── siembras (relational data)                            │
│                                                             │
│  REDIS (Sync Queue + Cache)                                │
│  ├── Sync queue (reemplaza localStorage)                   │
│  ├── Session store (user sessions)                         │
│  ├── Cache (Haciendas, actividades frecuentes)             │
│  └── Pub/Sub (realtime notifications)                      │
│                                                             │
│  POCKETBASE API GATEWAY                                    │
│  ├── Router: Auth requests → PocketBase                   │
│  ├── Router: Data requests → PostgreSQL                   │
│  ├── Middleware: Auth validation (JWT from PocketBase)     │
│  └── Transformer: PG ↔ PB response format                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TARES FASE 2                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔧 SETUP INFRAESTRUCTURA (6 horas):                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Crear PostgreSQL instance                        │   │
│  │    - Opción A: Render PostgreSQL ($15-25/mes)       │   │
│  │    - Opción B: Supabase (Free tier hasta 500MB)     │   │
│  │    - Opción C: Self-hosted en Hetzner ($0)          │   │
│  │                                                       │   │
│  │ 2. Crear Redis instance                              │   │
│  │    - Opción A: Render Redis ($10-15/mes)            │   │
│  │    - Opción B: Upstash (Free tier)                  │   │
│  │    - Opción C: Self-hosted en Hetzner ($0)          │   │
│  │                                                       │   │
│  │ 3. Configurar connection pooling                     │   │
│  │    - PgBouncer para PostgreSQL                       │   │
│  │    - Redis client con reconnection logic             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🔄 MIGRACIÓN DATOS (12 horas):                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Exportar SQLite → CSV                            │   │
│  │    - sqlite3 data.db ".export bitacora.csv"         │   │
│  │    - Repetir para todas las colecciones              │   │
│  │                                                       │   │
│  │ 2. Crear schema PostgreSQL                          │   │
│  │    - Mapear SQLite TEXT → VARCHAR/TEXT              │   │
│  │    - Mapear SQLite JSON → JSONB                     │   │
│  │    - Crear índices GIN para JSONB                   │   │
│  │    - Crear foreign keys                             │   │
│  │                                                       │   │
│  │ 3. Importar CSV → PostgreSQL                        │   │
│  │    - COPY bitacora FROM '/tmp/bitacora.csv'         │   │
│  │    - Validar datos migrados                         │   │
│  │    - Crear script de migración para futuros         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🔄 REFACTOR SYNCSTORE (20 horas):                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Reemplazar localStorage → IndexedDB             │   │
│  │    - Crear idb-sync-store.js                        │   │
│  │    - APIs: get, set, delete, clear                 │   │
│  │    - Capacidades: 50MB-1GB                          │   │
│  │                                                       │   │
│  │ 2. Mover sync queue → Redis                        │   │
│  │    - Crear Redis sync queue service                 │   │
│  │    - LPUSH para añadir operations                   │   │
│  │    - RPOP para process operations                   │   │
│  │    - Exponential backoff mantiene igual             │   │
│  │                                                       │   │
│  │ 3. Actualizar syncStore.js                         │   │
│  │    - Reemplazar localStorage calls                 │   │
│  │    - Añadir Redis client                            │   │
│  │    - Mantener compatibility con PocketBase auth     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🔌 API GATEWAY (30 horas):                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Crear API Gateway (PocketBase extensions)        │   │
│  │    - Go extender PocketBase con custom handlers     │   │
│  │    - O crear Node.js middleware (recomendado)       │   │
│  │                                                       │   │
│  │ 2. Router Logic                                      │   │
│  │    - Auth requests (login, logout) → PocketBase     │   │
│  │    - Metadata (Haciendas, plans) → PocketBase       │   │
│  │    - Transactional data (bitácoras) → PostgreSQL    │   │
│  │    - Sync operations → Redis                        │   │
│  │                                                       │   │
│  │ 3. Auth Validation                                   │   │
│  │    - JWT issued by PocketBase                       │   │
│  │    - Verify JWT in API gateway                      │   │
│  │    - Forward user context to PostgreSQL             │   │
│  │                                                       │   │
│  │ 4. Response Transformer                              │   │
│  │    - PostgreSQL rows → PocketBase response format  │   │
│  │    - Maintain backward compatibility with frontend  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🧪 TESTING HÍBRIDO (20 horas):                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Unit tests API gateway                           │   │
│  │    - Mock PostgreSQL responses                     │   │
│  │    - Mock Redis responses                          │   │
│  │    - Test routing logic                            │   │
│  │                                                       │   │
│  │ 2. Integration tests                               │   │
│  │    - Test full flow: Frontend → Gateway → PG/Redis │   │
│  │    - Test auth flow with PocketBase                │   │
│  │    - Test sync operations                          │   │
│  │                                                       │   │
│  │ 3. Load tests                                       │   │
│  │    - Simular 500 usuarios concurrentes             │   │
│  │    - Medir response times                          │   │
│  │    - Identificar nuevos cuellos de botella          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🚀 DEPLOYMENT (12 horas):                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Staging environment                              │   │
│  │    - Deploy PostgreSQL + Redis + Gateway           │   │
│  │    - Migrar datos de producción → staging           │   │
│  │    - Testing con usuarios piloto                    │   │
│  │                                                       │   │
│  │ 2. Production rollout                               │   │
│  │    - Blue-green deployment (zero downtime)          │   │
│  │    - Monitorear errores post-deployment             │   │
│  │    - Rollback plan documentado                      │   │
│  │                                                       │   │
│  │ 3. Documentation                                    │   │
│  │    - Diagramas arquitectura actualizados            │   │
│  │    - Runbooks para operaciones                      │   │
│  │    - Troubleshooting guides                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

COSTO FASE 2: 100 horas + $15-30/mes
CAPACIDAD: 500-1000 usuarios concurrentes
RIESGO: MEDIO (arquitectura híbrida es custom)

GAINS FASE 2:
✅ 5x más usuarios (200 → 1000)
✅ 10x más write throughput
✅ Redis sync queue (vs localStorage 5MB)
✅ IndexedDB (50MB-1GB vs 5MB localStorage)
✅ JSONB indexes (100x faster JSON queries)
```

### FASE 3: NODE.JS + POSTGRESQL COMPLETO (6-12 meses)
**Objetivo**: Escalar ilimitado (10,000+ usuarios)

```
┌─────────────────────────────────────────────────────────────┐
│ ARQUITECTURA FINAL                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (VUE 3.5) - SIN CAMBIOS                          │
│  ├── 67 components Vue                                      │
│  ├── 18 stores Pinia (refactor para IndexedDB)            │
│  └─ Axios HTTP client (reemplaza PocketBase SDK)          │
│                                                             │
│  BACKEND (NODE.JS 20+ FASTIFY)                             │
│  ├── API REST/GraphQL                                      │
│  ├── WebSocket server (socket.io)                          │
│  ├── Auth server (Auth.js o Lucia)                         │
│  ├── Background jobs (BullMQ con Redis)                    │
│  └─ Horizontal scaling (Docker/K8s)                        │
│                                                             │
│  DATABASE (POSTGRESQL 15+)                                  │
│  ├── Todas las colecciones migradas                        │
│  ├── JSONB fields con GIN indexes                          │
│  ├── Connection pooling (PgBouncer)                        │
│  └─ Read replicas (si aplica)                              │
│                                                             │
│  CACHE (REDIS 7+)                                           │
│  ├── Session store                                          │
│  ├── Sync queue                                             │
│  ├── Cache frecuentes                                       │
│  └─ Pub/Sub notifications                                  │
│                                                             │
│  INFRAESTRURA                                              │
│  ├── Load balancer (Nginx)                                 │
│  ├── SSL termination                                        │
│  ├── Docker containers                                      │
│  └─ CI/CD pipeline                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TARES FASE 3                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🔧 API REST/GRAPHQL (60 horas):                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Crear API endpoints (reemplazar PocketBase auto) │   │
│  │    - GET /api/haciendas (con paginación)            │   │
│  │    - POST /api/bitacoras                            │   │
│  │    - PUT /api/actividades/:id                       │   │
│  │    - DELETE /api/programaciones/:id                 │   │
│  │    - Repetir para todas las colecciones              │   │
│  │                                                       │   │
│  │ 2. Implementar paginación                            │   │
│  │    - Query parameters: page, perPage, sortBy        │   │
│  │    - Metadata: totalItems, totalPages               │   │
│  │    - Cursor-based pagination para datasets grandes  │   │
│  │                                                       │   │
│  │ 3. Filtering + Searching                            │   │
│  │    - Buscar por campo (ej: nombre=xxx)              │   │
│  │    - Filtros multiples (ej: estado=activa&fecha>xxx)│   │
│  │    - Full-text search con PostgreSQL FTS            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🔐 AUTH SYSTEM (30 horas):                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Reemplazar PocketBase auth                       │   │
│  │    - Opción A: Auth.js (NextAuth) - Flexible        │   │
│  │    - Opción B: Lucia - Lightweight                   │   │
│  │    - Opción C: Custom JWT implementation             │   │
│  │                                                       │   │
│  │ 2. Features requeridas                               │   │
│  │    - Email/password authentication                   │   │
│  │    - Role-based access control (admin, auditor, op) │   │
│  │    - Hacienda-level isolation                       │   │
│  │    - Password reset (email tokens)                  │   │
│  │    - Session management (Redis)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🔌 REALTIME (20 horas):                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Reemplazar PocketBase WebSocket                  │   │
│  │    - Opción A: socket.io (robusto, feature-rich)    │   │
│  │    - Opción B: native WebSocket (simple, ligero)    │   │
│  │    - Opción C: Pusher (service, $0-20/mes)         │   │
│  │                                                       │   │
│  │ 2. Events requeridos                                 │   │
│  │    - bitacora:created (nueva bitácora creada)       │   │
│  │    - actividad:updated (actividad modificada)        │   │
│  │    - sync:completed (sync queue finalizada)         │   │
│  │    - scheduler:executed (programación ejecutada)    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🔄 BACKGROUND JOBS (20 horas):                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Scheduler (reemplazar scheduler.js actual)       │   │
│  │    - BullMQ con Redis para job queue               │   │
│  │    - Cron jobs para programaciones                  │   │
│  │    - Retry logic con backoff                        │   │
│  │                                                       │   │
│  │ 2. Jobs requeridos                                   │   │
│  │    - scheduler:check (cada 5 min)                   │   │
│  │    - sync:process (on demand)                       │   │
│  │    - reports:generate (programado)                  │   │
│  │    - notifications:send (batch)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🧪 TESTING SUITE (40 horas):                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Unit tests (Vitest)                              │   │
│  │    - API endpoints                                  │   │
│  │    - Auth logic                                     │   │
│  │    - Background jobs                                │   │
│  │    - Migrations                                    │   │
│  │                                                       │   │
│  │ 2. Integration tests                                │   │
│  │    - Full API workflows                            │   │
│  │    - Database operations                           │   │
│  │    - Redis operations                              │   │
│  │    - WebSocket events                              │   │
│  │                                                       │   │
│  │ 3. E2E tests (Playwright)                           │   │
│  │    - Login → Dashboard → Bitácoras                 │   │
│  │    - Offline flow (sync queue)                     │   │
│  │    - Scheduler execution                           │   │
│  │                                                       │   │
│  │ 4. Load tests (K6 o Artillery)                      │   │
│  │    - 1000 concurrent users                         │   │
│  │    - 5000 requests/min                             │   │
│  │    - Sustained 1 hour                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 🚀 DEVOPS + DEPLOYMENT (20 horas):                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Docker containers                                │   │
│  │    - Dockerfile para Node.js API                    │   │
│  │    - docker-compose.yml (local dev)                 │   │
│  │    - Multi-stage build (optimizar image size)       │   │
│  │                                                       │   │
│  │ 2. CI/CD pipeline                                   │   │
│  │    - GitHub Actions o GitLab CI                     │   │
│  │    - Run tests on every PR                         │   │
│  │    - Auto-deploy to staging on merge to main       │   │
│  │    - Manual approval for production                │   │
│  │                                                       │   │
│  │ 3. Infrastructure as Code                           │   │
│  │    - Docker Swarm o Kubernetes (opcional)          │   │
│  │    - Nginx load balancer config                    │   │
│  │    - SSL certificates (Let's Encrypt)              │   │
│  │                                                       │   │
│  │ 4. Monitoring                                       │   │
│  │    - Sentry (error tracking)                       │   │
│  │    - Grafana + Prometheus (metrics)                │   │
│  │    - Uptime monitoring (UptimeRobot)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│ 📚 DOCUMENTATION (10 horas):                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. API documentation                                │   │
│  │    - OpenAPI/Swagger spec                          │   │
│  │    - Postman collection                            │   │
│  │                                                       │   │
│  │ 2. Architecture diagrams                            │   │
│  │    - C4 model diagrams                             │   │
│  │    - ERD (database schema)                         │   │
│  │    - Sequence diagrams para workflows clave        │   │
│  │                                                       │   │
│  │ 3. Runbooks                                          │   │
│  │    - Deployment procedures                         │   │
│  │    - Troubleshooting common issues                 │   │
│  │    - Disaster recovery                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

COSTO FASE 3: 200 horas + $25-50/mes
CAPACIDAD: 10,000+ usuarios concurrentes
RIESGO: MEDIO (stack probado, pero re-escritura completa)

GAINS FASE 3:
✅ 100x más usuarios (100 → 10,000+)
✅ 100x más write throughput
✅ Horizontal scaling nativo
✅ High availability (replicas, failover)
✅ Team skill transferable (Node.js demandado)
✅ Future-proof (ecosistema maduro)
```

---

## COMPARATIVO VISUAL DE CAPACIDADES

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPACIDAD POR ARQUITECTURA                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  USUARIOS CONCURRENTES                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PocketBase     │██░░░░░░░░░░░░░░░░│ 200 usuarios (máximo)   │  │
│  │ Hybrid (PG+PB) │███████████░░░░░░│ 1,000 usuarios          │  │
│  │ Node.js+PG     │████████████████│ 10,000+ usuarios         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  WRITE THROUGHPUT (writes/segundo)                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PocketBase     │██░░░░░░░░░░░░░░░░│ ~100-500 w/s             │  │
│  │ Hybrid (PG+PB) │███████████░░░░░░│ ~5,000 w/s               │  │
│  │ Node.js+PG     │████████████████│ ~10,000+ w/s             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  HORIZONTAL SCALING                                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PocketBase     │░░░░░░░░░░░░░░░░░░│ NO (single binary)       │  │
│  │ Hybrid (PG+PB) │███████████░░░░░░│ PARCIAL (PG scales)      │  │
│  │ Node.js+PG     │████████████████│ YES (N instances)        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  HIGH AVAILABILITY (HA)                                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PocketBase     │░░░░░░░░░░░░░░░░░░│ NO (SPOF)                 │  │
│  │ Hybrid (PG+PB) │███████░░░░░░░░░░│ PARCIAL (PG replica)      │  │
│  │ Node.js+PG     │████████████████│ YES (multi-instance HA)   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  COSTO INFRAESTRUCTURA (mensual)                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PocketBase     │█░░░░░░░░░░░░░░░░░│ $0/mes (Hetzner)         │  │
│  │ Hybrid (PG+PB) │████░░░░░░░░░░░░░│ $15-30/mes               │  │
│  │ Node.js+PG     │███████░░░░░░░░░░│ $25-50/mes               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  TIEMPO A PRODUCCIÓN                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PocketBase     │███░░░░░░░░░░░░░░░│ 1 mes (optimizaciones)   │  │
│  │ Hybrid (PG+PB) │███████░░░░░░░░░░│ 2 meses                  │  │
│  │ Node.js+PG     │████████████████│ 4 meses                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  COMPLEJIDAD TÉCNICA                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ PocketBase     │██░░░░░░░░░░░░░░░░│ BAJA (single binary)      │  │
│  │ Hybrid (PG+PB) │███████░░░░░░░░░░│ MEDIA (custom gateway)    │  │
│  │ Node.js+PG     │████████████████│ ALTA (full stack)         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DECISION FRAMEWORK

### ¿Cuándo migrar de Fase?

```
FASE 1 → FASE 2 (PocketBase → Hybrid):
├─ Trigger TÉCNICO:
│  ├─ SQLite write lock contention >20% del tiempo
│  ├─ Response time p95 >500ms
│  └─ localStorage 5MB lleno en <2 semanas
│
├─ Trigger DE NEGOCIO:
│  ├─ >100 usuarios concurrentes sostenidos
│  ├─ Validación clara de product-market fit
│  └─ Budget disponible ($15-30/mes infra)
│
└─ Trigger DE RIESGO:
   ├─ Cliente enterprise solicita SLA garantizado
   └─ Competencia con mejor performance

FASE 2 → FASE 3 (Hybrid → Node.js+PG):
├─ Trigger TÉCNICO:
│  ├─ PocketBase auth bottleneck >30% requests
│  ├─ API gateway latency >100ms overhead
│  └─ PostgreSQL queries >100ms p95
│
├─ Trigger DE NEGOCIO:
│  ├─ >500 usuarios concurrentes sostenidos
│  ├─ Expansión a múltiples regiones (geo-distribution)
│  └─ Budget disponible ($25-50/mes infra)
│
└─ Trigger DE RIESGO:
   ├─ Single point of failure (PocketBase) inaceptable
   └─ Compliance requiere HA (disaster recovery)
```

### ¿Cuándo NO migrar?

```
SEÑALES PARA QUEDARSE EN FASE ACTUAL:
├─ Usuarios <50 concurrentes
├─ Tasa de churn alta (no validated PMF)
├─ Budget limitado ($0/mes requerido)
├─ Equipo técnico pequeño (<2 devs)
├─ Timeline ajustado (<3 meses para MVP)
└─ Incertidumbre sobre futuro del producto

RIESGOS DE MIGRACIÓN PREMATURA:
├─ Over-engineering (YAGNI violado)
├─ Distracción de validación PMF
├─ Burnout equipo por re-escritura
├─ Timeline extended por refactor
└─ Technical debt por cambios apresurados
```

---

## CONCLUSIÓN

**Roadmap recomendado: FASE 1 → FASE 2 → FASE 3 (CONDICIONAL)**

**Fase 1 (HOY - 3 meses)**: Validar MVP con PocketBase
**Fase 2 (3-6 meses)**: Migrar a híbrido si escalabilidad requerida
**Fase 3 (6-12 meses)**: Migrar a Node.js+PG si growth continúa

**Key Insight**: No sobre-ingeniería antes de validar product-market fit. PocketBase es correcto para Fase 1, pero inevitablemente insuficiente para Fase 3 si el producto tiene éxito.

---

**End of Roadmap**
**Next Review**: 2026-04-30 (after Fase 1 completion)
**Owner**: System Architect + Tech Lead
**Approval Required**: CTO/Product Owner
