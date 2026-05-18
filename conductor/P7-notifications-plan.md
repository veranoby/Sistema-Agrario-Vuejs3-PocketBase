# Plan: Implementación de P7 (Notificaciones Push/Email Optimizadas)

## Objetivo Estratégico
Convertir la "automatización" en un generador de retención B2B sin caer en el *Alert Fatigue* (Spam).

## Arquitectura Refinada

En lugar de alertar por eventos individuales, el sistema enviará correos de alto valor ("Digest") gestionados por el motor de Cron interno de PocketBase.

### 1. Tipos de Alertas Permitidas (UI Configurable)
En la pantalla de configuración de la Hacienda, se presentarán **únicamente dos opciones (Checkboxes independientes)**:
*   `[ ]` **Resumen Gerencial Semanal**: Un correo enviado los lunes en la mañana. Contiene:
    *   *Retroactiva:* Qué se completó la semana pasada.
    *   *Proactiva:* Qué tareas/programaciones están previstas para esta nueva semana.
*   `[ ]` **Alertas de Emergencia**: Correos inmediatos/diarios solo para eventos críticos (Ej. Suscripción por expirar, Inconformidades BPA mayores, Caída de sensores).

*Se elimina la opción de "Resumen Diario" y el envío uno-a-uno por tareas comunes.*

### 2. Motor Backend (PocketBase Nativo)
*   **Archivo Objetivo:** `pb_hooks/cron.alerts.pb.js` (Nuevo).
*   **Tecnología:** Usaremos `cronAdd()` de JSVM. El cron consultará la colección `Haciendas`, revisará sus preferencias JSON (qué checkboxes activaron), compilará la data usando `Record` queries, y llamará a la lógica de Resend existente.
*   **Desacople de Datos:** Si el cron falla, la UI de la app (`Dashboard.vue`) seguirá mostrando las tareas vencidas, ya que las fechas base (`proxima_ejecucion`) están intactas en la base de datos.

### 3. Templates HTML (Resend)
*   Se actualizará el módulo en `pb_hooks/api/alerts.send.js` y `src/services/emailAlertService.js` para soportar la plantilla del **Weekly Digest** (diseño en tabla con sección Pasada y sección Futura).

## Archivos de Documentación a Actualizar (brain/)
*Durante la fase de implementación (fuera de Modo Plan), se actualizarán:*
*   `brain/business_proposal.md`: Actualizar "Módulo Automatización" a "Resumen Gerencial y Emergencias".
*   `brain/prd_system.json`: Actualizar el estado de P7 reflejando la nueva estrategia Digest.
*   `brain/pb_api_reference.json`: Registrar el nuevo cronjob `cron.alerts.pb.js`.
