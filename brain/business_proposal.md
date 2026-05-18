# Propuesta de Negocio: Plataforma Gestión Agri (Auditoría Real) - V2

## Visión General
SaaS B2B Híbrido para gestión agrícola. La plataforma posee un núcleo funcional robusto y una infraestructura de automatización backend "latente" con alto potencial de monetización inmediata. ConAgri apuesta por un modelo disruptivo de "Plataforma Core Gratuita" para actuar como un caballo de Troya en el sector agropecuario latinoamericano (enfocado inicialmente en Ecuador), rentabilizando a través de Add-ons modulares de bajo costo ($1 - $2/mes), venta cruzada de insumos, servicios integrales de infraestructura agrícola y asesoría especializada.

## 1. Blockers de Producción & Soluciones Técnicas (Prioridad Alta)

| Prioridad | Descripción | Riesgo | Solución (Plan Blueprint) |
| :--- | :--- | :--- | :--- |
| **P1** | `VITE_RESEND_API_KEY` expuesta | Robo de identidad y cuota. | **Resuelto**: Lógica movida a `/api/alerts/send`. |
| **P2** | Bypass de Módulos Premium | Pérdida de ingresos. | **Resuelto**: Validación de rol `superadmin` activada en backend. |
| **P3** | Exposición de LLM Keys | Fuga de secretos. | **Resuelto**: Implementación del Proxy Hub `/api/ai/chat`. |
| **P4** | Integridad de Datos (Ghost Logs) | DB Corrupta. | **Resuelto**: Cron ciego eliminado; lógica trasladada a Modos A/B en UI. |
| **P5** | Suscripción sin candados UI (Plan Store) | Evasión de pagos. | Implementar bloqueo reactivo en frontend al superar cuota. |
| **P6** | Finanzas Pro Aislado (Sin SRI ni Enlace) | Flujo E2E roto. | Terminar módulo legal de facturación SRI e integrar con coste de cosechas. |
| **P7** | Notificaciones "Mudas" | Falsa automatización. | Conectar cronjobs y workers backend a pasarelas reales (Push/Email). |

## 2. Estrategia de IA: Contextual & Segura

- **Proxy Hub Seguro:** Las llaves nunca tocan el frontend. El backend selecciona entre la llave de la Hacienda (BYOK) o la llave Global según el Add-on contratado.
- **Rate Limiting Inteligente:** Control estricto de 20 req/día para uso con llave global; ilimitado para BYOK (gestionado en servidor).
- **Human-in-the-Loop:** 1. IA genera sugerencia en formato JSON estructurado.
  2. UI muestra "Cards de Aprobación" claras.
  3. El usuario confirma; el frontend dispara la acción normal en el Store Pinia.
- **Ahorro de Tokens:** Caché de contexto en sesión y límites de historial por consulta.

## 3. Modelo de Suscripción (Basado en Usuarios)

| Plan | Administradores | Auditores | Operadores | Propósito / Modelo de Monetización |
| :--- | :---: | :---: | :---: | :--- |
| **Gratuito** | 1 | 0 | 0 | Pequeños productores (Self-service). Puerta abierta a monetización indirecta. |
| **Básico** | 1 | 1 | 1 | Equipos familiares/pequeños haciendas. |
| **Premium** | 1 | 2 | 6 | Haciendas medianas con staff especializado. |

## 4. Módulos Add-ons ($1 a $2/mes) - Catálogo Expandido de Alto Impacto

### A. Módulo IA ($1-$2/mes)
- [x] Implementar Proxy Backend `/api/ai/chat` (OpenRouter).
- [x] Implementar flujo de Aprobación de Acciones Sugeridas.
- [ ] RAG con manuales agronómicos locales.

### B. Módulo Seguridad & BPA ($1/mes)
- [x] Forzar Firma RSA en Bitácora (digitalSignature.js).
- [ ] Generación de PDF inmutables certificados de auditoría para Agrocalidad.

### C. Módulo Automatización & Alertas ($2/mes)
- [ ] Desarrollar workers/cronjobs reales que escaneen `proxima_ejecucion`.
- [ ] Integrar pasarela Push/Email final (vincular hooks existentes con Twilio/Resend).

### D. Módulo Finanzas Pro & SRI ($5/mes)
- [ ] Implementar la generación de documentos electrónicos XML/PDF para facturación SRI (Ecuador).
- [ ] Atar automáticamente los egresos de insumos con las bitácoras de cosecha para calcular ROI.

### E. Módulo de Nómina Agrícola Express - Jornales y Destajo (¡Nuevo! $2/mes)
*Oportunidad detectada frente a ERPs rígidos (Agrosoft): Las haciendas necesitan calcular el pago semanal de cuadrillas de forma ágil sin software de RRHH corporativo complejo.*
- [ ] **Mecánica Simple / Alto Impacto:** Utilizar las métricas existentes de `jornales_empleados` en las bitácoras de actividades (Cosecha, Riego, Fertilización) y cruzarlas con una matriz de tarifas configurables por lote o tarea.
- [ ] Generación de reportes automáticos de pago al fin de semana (Sábados de raya).

### F. Módulo de Conexión Automática Bodega-Campo ($1/mes)
- [ ] Automatizar el descuento de stock de la Bodega Especializada de Agroquímicos (`chem_storage_2026`) cada vez que se guarde un registro validado de "Control de Plagas" o "Fertilización".

## 5. Perfil de "Asesor Técnico": Arquitectura de Red y Viabilidad

Para empoderar el posicionamiento de ConAgri como el ecosistema definitivo del agro, se introduce el perfil del **Asesor Técnico** (Ingenieros Agrónomos, Consultores de Inocuidad, Especialistas en Suelos). Este perfil no compite con el agricultor; actúa como un puente normativo e impulsor del canal de venta B2B de suministros.

### Matriz de Factibilidad Técnica y Comercial
- **Complejidad de Implementación:** Media-Baja (Reutiliza las colecciones de datos, pantallas de reportes y las "Cards de Aprobación" de la UI).
- **Impacto en el Usuario:** Crítico. Agrocalidad exige en los Artículos 12 y 15 que las aplicaciones fitosanitarias estén respaldadas por una receta firmada por un profesional colegiado. Este perfil digitaliza esa obligación por ley.

### Flujo Operativo y de Interfaz (UI/UX)

#### A. Entorno del Administrador / Hacienda
1. **Directorio de Profesionales (Solo post-login):** Catálogo interactivo de ingenieros agrónomos y asesores certificados, filtrables por zona geográfica (ej. Guayas, El Oro, Los Ríos) y especialidad técnica (Banano, Cacao, Suelos, Riego).
2. **Sección "Mis Asesores" en Barra Lateral:** Muestra tarjetas de perfil con foto y datos de contacto de los profesionales vinculados a la hacienda.
3. **Control de Privacidad Granular (Lote por Lote):** El productor puede elegir compartir la información de toda la hacienda o restringir el acceso a **Lotes específicos**. Al compartir un lote, el asesor obtiene permisos de lectura sobre sus análisis de suelo, bitácora histórica de plagas y registros de riego.
4. **Buzón de "Recetas Recibidas":** Bandeja de entrada donde caen las prescripciones fitosanitarias emitidas por el asesor.

#### B. Entorno del Asesor Técnico (Panel Simplificado)
1. **Gestión de Perfil Público:** Formulario de datos de colegiatura, experiencia, cultivos de especialidad y reputación de asesorías en la plataforma.
2. **Módulo "Mis Haciendas Clientes":** Listado de fincas que le han otorgado permisos de evaluación. Al ingresar a una hacienda, visualiza las métricas compartidas del lote afectado para diagnosticar con precisión.
3. **Generador de Recetas Digitales:** Formulario donde selecciona el lote del cliente, el blanco biológico (`plaga_o_enfermedad`) y prescribe el producto, ingrediente activo, dosis y plazos de carencia (PHI/REI).
   - **Estados del Documento:** `Borrador` (para preparación previa) y `Enviada`.

#### C. Integración "Human-in-the-Loop"
Al pasar una receta a estado `Enviada` por el Asesor, el sistema backend dispara una **Card de Aprobación de Acción** en la UI de la Hacienda del cliente. Si el agricultor hace clic en "Aprobar", la plataforma automáticamente:
1. Genera e inyecta la programación de la actividad en el Pinia Store/Base de datos de la hacienda (Módulo de Control de Plagas o Fertilización).
2. Auto-rellena el campo `id_receta_asesor` para asegurar el cumplimiento estricto ante los inspectores de Agrocalidad de manera inmutable.

## 6. Sinergia de Negocio con el Modelo ConAgri (Monetización Indirecta)

La gratuidad del núcleo funcional de ConAgri es la ventaja competitiva más agresiva frente a competidores de costo fijo como Agrosoft. El valor no reside en cobrar licencias de uso de software pesadas, sino en transformarse en la infraestructura comercial de la hacienda:

1. **Venta de Suministros Bajo Demanda (Marketplace Latente):** Al procesar las recetas de los asesores o las sugerencias de la IA de fertilización, ConAgri conoce exactamente el volumen de insumos que la finca necesitará en las próximas 2 semanas. El sistema ofrecerá un botón directo de compra: *"Adquirir fertilizante/plaguicida recetado con envío directo a la hacienda"* a través de la red de distribuidores aliados de ConAgri.
2. **Construcción y Adecuación Tecnológica:** El monitoreo hídrico y de bodegas del sistema detectará ineficiencias (ej. fugas o malas lecturas de caudalímetros). ConAgri capitaliza ofreciendo servicios llave en mano de ingeniería agrícola: instalación de riego tecnificado automatizado, rediseño de bodegas bajo la norma INEN NT 1927 y construcción de camas biológicas (Biobeds).
3. **Efecto de Red Orgánico:** El directorio atrae asesores porque les proporciona una herramienta gratuita para administrar a sus clientes; el asesor, a su vez, introduce a todas sus haciendas clientes a la plataforma ConAgri para agilizar su trabajo, reduciendo el costo de adquisición de usuarios (CAC) a cero.

## 7. Estado Actual vs. Roadmap Pendiente (Blueprint Actualizado)

### Completadas (✅)
1. **Fases 1, 2, y 3 Originales**: Resend migrado, Proxy AI asegurado, Bloqueo de módulos activado, Transacciones Atómicas establecidas.
2. **Fase Refactor UX Bitácora**: Modos A/B estructurados, BPA Checklist inyectado, Firma RSA integrada (Ghost Logs eliminados).

### Roadmap Estratégico (Monetizando lo Latente)
3. **Fase Bloqueos Comerciales (P5)**: Establecer los cerrojos reactivos en UI para forzar el upselling del Plan Store.
4. **Fase Finanzas Pro & SRI (P6)**: Completar la integración del CRUD existente con el marco legal tributario y costos operativos (Cosecha → ROI).
5. **Fase Automatización Real (P7)**: Convertir el estado mudo de los recordatorios en notificaciones Push/Email asíncronas de alto valor para el cliente.
6. **Fase Módulos de Alto Impacto (Nómina y Bodega)**: Implementación de la nómina express basada en jornales y la sincronización automática de almacenes químicos.
7. **Fase Ecosistema y Perfil Asesor (Efecto de Red)**: Desarrollo del módulo del directorio, recetas y flujos de aprobación vinculados a la inmutabilidad de la bitácora.
