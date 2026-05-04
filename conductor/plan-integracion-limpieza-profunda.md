# Plan de Integración y Limpieza Profunda - Fase 2

Este documento detalla los siguientes pasos de integración, limpieza arquitectónica y desarrollo de nuevas funcionalidades (Geolocalización y AI), acordados tras la finalización de la Fase 1.

## 1. Consolidación de Tests y Limpieza de Código
* **Objetivo:** Mejorar la organización del proyecto moviendo archivos huérfanos a su ubicación correspondiente.
* **Acciones:**
  * Identificar y mover archivos de prueba dispersos, como `syncStore.test.js` y `cacheManager.tiered.test.js`, hacia el directorio central `/tests/`.
  * *Nota:* La implementación de pruebas E2E automatizadas ha sido pospuesta para etapas futuras.

## 2. Auditoría de Dependencias y Estrategia Offline-First
* **Objetivo:** Prevenir bucles de dependencias y preparar la arquitectura para escalar el almacenamiento local.
* **Acciones:**
  * **Auditoría Estricta:** Revisar los flujos de importación entre los nuevos servicios (ej. `profileService.js`), los stores de Pinia y el `syncPlugin` para asegurar que no existan dependencias circulares que afecten el ciclo de vida de la app.
  * **Evolución Offline-First:** Diseñar la hoja de ruta para migrar colecciones de datos pesadas hacia `IndexedDB` (utilizando herramientas como localForage), reservando `localStorage` estrictamente para credenciales, preferencias y la cola de sincronización de bajo volumen.

## 3. Unificación de Servicios de Geolocalización y Mapas
* **Objetivo:** Solucionar la fragmentación técnica actual (`geoUtils.js`, `geolocation.js`, `locationTracker.js`, `offlineGeoStorage.js`).
* **Acciones:**
  * **Motor Cartográfico Central (`mapService`):** Consolidar todo el tracking, captura y sincronización de coordenadas en un único orquestador.
  * **Capacidades de Dibujo (Draw):** Integrar de manera unificada herramientas sobre el mapa (ej. Leaflet Draw o equivalentes) que permitan a los usuarios trazar polígonos para definir lotes, sectores y zonas de riesgo.
  * **Renderizado Offline:** Implementar la descarga y cacheo local de *tiles* cartográficos, garantizando que tanto los mapas base como las geometrías guardadas se visualicen sin problemas en zonas sin cobertura.

## 4. Integración del Asistente AI según Contexto Operativo
* **Objetivo:** Acoplar agentes de inteligencia artificial adaptados a la naturaleza de cada módulo.
* **A. Sección de Actividades (Registro y Ejecución In Situ):**
  * **Rol:** *Copiloto Técnico y Supervisor.*
  * **Funciones:**
    * Autocompletar bitácoras traduciendo entradas informales en datos estructurados.
    * Detección de anomalías en tiempo real al ingresar insumos (ej. alerta por dosis inusualmente altas).
    * Soporte rápido in situ: sugerencias ante reporte de plagas o enfermedades basadas en bases de datos agronómicas.
* **B. Sección de Programaciones (Planificación a Futuro):**
  * **Rol:** *Orquestador Estratégico.*
  * **Funciones:**
    * Sugerencia de calendarios óptimos cruzando variables climáticas pronosticadas, disponibilidad de maquinaria y tiempos de reingreso/carencia.
    * Prevención de conflictos logísticos: alertar preventivamente sobre cuellos de botella por escasez de personal en semanas de alta demanda y sugerir rebalanceos.

---
> **Regla de Integridad (Recordatorio para el equipo):** 
> Todo el desarrollo de la Fase 2, en particular los módulos de Mapas y AI, debe diseñarse respetando el principio de abstracción de flujo completo. Los servicios deben estar desacoplados de la UI y mantener resiliencia total frente a cortes de conexión.
