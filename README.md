# Sistema Integral de Gestión Agrícola 🌾

SaaS Modular de Digitalización Agrícola - Transforma la gestión de campo en una operación data-driven, escalable y certificable bajo estándares BPA.

[![Project Status: Production Ready](https://img.shields.io/badge/Status-Production--Ready-success)](brain/brain_index.json)
[![Version: 6.0](https://img.shields.io/badge/Version-6.0-blue)](brain/brain_index.json)

---

## 🧠 Sistema BRAIN (Fuente de Verdad)

Este proyecto utiliza el sistema **BRAIN** como Única Fuente de Verdad (SSOT) para la coordinación multi-IA y humana. Toda decisión arquitectónica, progreso de tareas y especificaciones se encuentran aquí:

- [**Índice del Cerebro**](brain/brain_index.json) - Mapa de navegación del proyecto.
- [**Backlog de Tareas**](brain/backlog.json) - Estado real del progreso y tareas pendientes.
- [**Diseño del Sistema (SDD)**](brain/sdd_system.json) - Arquitectura técnica y workflows de ejecución.
- [**Requisitos de Producto (PRD)**](brain/prd_system.json) - Contexto de negocio y stakeholders.

---

## 🚀 Características Principales

- **Offline-first robusto** - Sincronización automática con resolución de conflictos.
- **Arquitectura Modular** - Stores y componentes optimizados para alta performance.
- **Agricultural Workflows** - Escenarios de ejecución Bitácora ↔ Programaciones.
- **Role Safeguard** - Seguridad granular para Administrador, Auditor, Operador y SuperAdmin.
- **AI Assistant** - Integración contextual con Gemini para soporte técnico agrícola.

## 🛠️ Stack Tecnológico

- **Frontend**: Vue 3 (Composition API) + Vuetify 3 + Pinia
- **Backend**: PocketBase (SQLite + WAL mode)
- **Maps**: Leaflet.js + Leaflet-Draw (GIS)
- **AI/Email**: Gemini API + Resend API

---

## 📦 Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar entorno de desarrollo
npm run dev

# Ejecutar tests
npm run test
npm run test:e2e
```

## 📁 Documentación Técnica Consolidada

- [**Arquitectura**](docs/architecture/) - Detalles de implementación de stores y componentes.
- [**Investigación Técnica**](docs/architecture/research/) - Análisis de escalabilidad y roadmaps de migración.
- [**Guías de Usuario**](docs/user/) - Manuales por rol de usuario.

---

## 📅 Estado del Proyecto (Abril 2026)

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 1-6** | ✅ | Core, Optimización y Refactorización. |
| **Fase 8 (V2)** | ✅ | Integración Backend (Alertas, Analytics, Reportes). |
| **Fase 7** | ⏳ | **ACTUAL**: Testing y Calidad (Vitest + Playwright). |
| **Fase 9** | 📋 | Pendiente: Refactor de monolíticos restantes. |

---

**Versión**: 6.0 | **Última actualización**: 2026-04-15
