# Sistema Integral de Gestión Agrícola

SaaS Modular de Digitalización Agrícola - Transforma la gestión de campo en una operación data-driven, escalable y certificable bajo estándares BPA.

## 🚀 Características

- **Offline-first robusto** - Trabaja sin conexión, sincroniza cuando hay red
- **PWA Adaptativa** - Tablet (Dashboard) / Mobile (Registro rápido)
- **Role Safeguard** - Seguridad basada en roles (Administrador, Auditor, Operador)
- **Paginación real** - Escalabilidad para manejar miles de registros
- **Mapas GIS** - Visualización y dibujo de lotes con Leaflet
- **AI Assistant** - Consultas técnicas contextuales con Gemini
- **Email Transaccional** - Reportes automáticos via Resend

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Frontend | Vue 3 + Vuetify 3 |
| Build | Vite 5.4+ |
| State | Pinia (modular) |
| Backend | PocketBase |
| Maps | Leaflet.js + Leaflet-Draw |
| AI | Gemini API |
| Email | Resend (SMTP & API) |
| PWA | vite-plugin-pwa |
| Testing | Vitest + Playwright |

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Tests
npm run test
npm run test:coverage
```

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes Vue
│   ├── actividades/     # Workspace de actividades modularizado
│   └── siembras/        # Workspace de siembras modularizado
├── stores/              # Pinia stores
│   ├── sync/            # Módulos de sincronización (6 archivos)
│   ├── programaciones/  # Módulos de programaciones (7 archivos)
│   └── *.js             # Stores individuales
├── utils/               # Utilidades
│   ├── logger.js        # Logging seguro
│   ├── debounce.js      # Debounce nativo
│   └── ...
├── router/              # Vue Router
└── assets/              # Assets estáticos

docs/
└── architecture/        # Documentación técnica
```

## 🏗️ Arquitectura Modular

### Stores Especializados

**syncStore** (2,413 → 791 líneas - 67% reducción)
- `sync/types.js` - Constantes y tipos
- `sync/cacheManager.js` - Gestión de caché LRU
- `sync/offlineIndexer.js` - Búsqueda offline
- `sync/conflictResolver.js` - Resolución de conflictos
- `sync/syncQueueManager.js` - Gestión de cola
- `sync/syncStore.js` - Orchestrator

**programacionesStore** (1,355 → 768 líneas - 43% reducción)
- `programaciones/recurrenceCalculator.js` - Cálculo de recurrencia
- `programaciones/complianceChecker.js` - BPA compliance
- `programaciones/batchOperations.js` - Operaciones batch
- `programaciones/utils/dateCalculators.js` - Utilidades de fecha
- `programaciones/utils/frequencyHandlers.js` - Manejo de frecuencias

### Componentes Modulares

**actividadesWorkspace** (1,058 → 279 líneas - 74% reducción)
- 8 subcomponentes especializados
- 2 composables reutilizables

**SiembraWorkspace** (959 → 554 líneas - 42% reducción)
- 5 subcomponentes especializados
- 2 composables reutilizables

## 🔐 Seguridad

- **Secure Logger**: Filtra automáticamente tokens, passwords y datos sensibles
- **Role Safeguard**: Middleware de Router y reglas API
- **Timer Cleanup**: $dispose hooks prevenir memory leaks
- **Cache Limits**: LRU enforcement en stores

## 📊 Performance

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| syncStore líneas | 2,413 | 791 | 67% ↓ |
| programacionesStore líneas | 1,355 | 768 | 43% ↓ |
| Componente más grande | 1,058 | 279 | 74% ↓ |
| console.* con datos sensibles | 617 | 0 | 100% ↓ |
| Lodash dependency | Sí | No | ~70 KB ↓ |
| Bundle (gzipped) | - | 304 KB | Optimizado |

## 🧪 Testing

```bash
# Unit tests
npm run test

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

**Estado actual**: ~5% cobertura
**Meta**: 60-80% cobertura

## 📖 Documentación

- `docs/architecture/` - Documentación técnica detallada
- `brain/` - Especificaciones de producto y diseño
- `README_ENTREGA.md` - Guía de entrega

## 🔄 Roadmap

| Fase | Estado | Descripción |
|------|--------|-------------|
| Fase 1-5 | ✅ Completado | Core features |
| Fase 6 | ✅ Completado | Optimización y refactorización |
| Fase 7 | 🟡 Pendiente | Testing y calidad |
| Fase 8 | ⏳ Futuro | Pulido y limpieza |
| Fase 9 | ⏳ Futuro | Features adicionales |

## 👥 Roles

- **Administrador**: Gestión completa de hacienda
- **Auditor**: Solo lectura, reportes y trazabilidad
- **Operador**: Registro en campo, offline-first
- **Super Admin**: Gestión de plataforma, marketplace

## 📄 Licencia

Privado - Todos los derechos reservados

---

**Versión**: 6.0 | **Última actualización**: 2026-03-14
