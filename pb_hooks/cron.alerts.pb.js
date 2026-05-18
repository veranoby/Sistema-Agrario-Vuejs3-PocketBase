/// <reference path="../pb_data/types.d.ts" />

/**
 * Cron Job para envío de Resumen Gerencial Semanal y Alertas de Emergencia
 */

// Resumen Semanal: Todos los lunes a las 08:00
cronAdd("weeklyDigest", "0 8 * * 1", () => {
    console.log("[CRON] Iniciando envío de Resumen Gerencial Semanal...");
    processAlerts("weekly_digest");
});

// Emergencias: Todos los días a las 07:00
cronAdd("emergencyAlerts", "0 7 * * *", () => {
    console.log("[CRON] Iniciando verificación de Alertas de Emergencia...");
    processAlerts("emergency");
});

/**
 * Procesa y envía las alertas según el tipo
 * @param {"weekly_digest" | "emergency"} processType 
 */
function processAlerts(processType) {
    try {
        const haciendas = $app.dao().findRecordsByFilter("Haciendas", "status = 'active'");
        
        for (const hacienda of haciendas) {
            const config = hacienda.get("alertConfig") || {};
            
            // Verificar si tiene activada la preferencia
            if (processType === "weekly_digest" && !config.digestWeekly) continue;
            if (processType === "emergency" && !config.emergencyAlerts) continue;

            const recipients = config.recipients || [];
            if (recipients.length === 0) {
                // Si no hay destinatarios configurados, usar el email de contacto o del dueño
                const contactEmail = hacienda.getString("contacto_email");
                if (contactEmail) recipients.push(contactEmail);
            }

            if (recipients.length === 0) continue;

            // Compilar data para el correo
            const alertData = compileAlertData(hacienda, processType);
            
            if (alertData) {
                sendEmailViaHook(processType, recipients, hacienda.getString("name"), alertData);
            }
        }
    } catch (err) {
        console.error("[CRON_ERROR] Error procesando alertas:", err.message);
    }
}

/**
 * Compila la información necesaria para el correo
 */
function compileAlertData(hacienda, type) {
    const data = {
        haciendaId: hacienda.id,
        summary: {}
    };

    if (type === "weekly_digest") {
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // 1. Retroactiva: Bitácoras completadas la semana pasada
        const pastLogs = $app.dao().findRecordsByFilter(
            "bitacora", 
            `hacienda = "${hacienda.id}" && created >= "${lastWeek.toISOString()}" && estado = "completada"`,
            "-created", 10
        );
        data.summary.past = pastLogs.map(log => ({
            actividad: log.getString("actividades"), // ID o expandir si fuera posible fácilmente
            fecha: log.getString("fecha"),
            usuario: log.getString("user_created")
        }));

        // 2. Proactiva: Programaciones vencidas o por vencer
        const upcoming = $app.dao().findRecordsByFilter(
            "programaciones",
            `hacienda = "${hacienda.id}" && estado = "activo" && proxima_ejecucion <= "${nextWeek.toISOString()}"`,
            "proxima_ejecucion", 10
        );
        data.summary.future = upcoming.map(p => ({
            descripcion: p.getString("descripcion"),
            vencimiento: p.getString("proxima_ejecucion")
        }));

        return data;
    }

    if (type === "emergency") {
        // 1. Suscripción por vencer (menos de 3 días)
        const subEnd = hacienda.getString("subscription_end");
        if (subEnd) {
            const endDate = new Date(subEnd);
            const diffDays = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3 && diffDays >= 0) {
                data.emergency_type = "subscription_expiry";
                data.days_remaining = diffDays;
                return data;
            }
        }

        // 2. BPA Crítico (Zonas con score < 50)
        const criticalZonas = $app.dao().findRecordsByFilter(
            "zonas",
            `hacienda = "${hacienda.id}" && bpa_estado < 50`,
            "bpa_estado"
        );
        if (criticalZonas.length > 0) {
            data.emergency_type = "bpa_risk";
            data.critical_count = criticalZonas.length;
            return data;
        }
    }

    return null;
}

/**
 * Invoca el envío de email llamando internamente a la lógica de Resend
 */
function sendEmailViaHook(type, recipients, haciendaName, data) {
    const settings = $app.settings();
    const resendApiKey = settings.get("RESEND_API_KEY");
    if (!resendApiKey) return;

    // Nota: Aquí reutilizaríamos la lógica de templates de main.js si estuviera exportada,
    // pero en PocketBase JSVM los archivos son independientes a menos que se use un pattern de cargado.
    // Por simplicidad en este paso, hacemos el post a nuestro propio endpoint interno 
    // o enviamos el HTTP directamente a Resend.
    
    // Optamos por llamar al endpoint interno para centralizar logs y templates
    try {
        $http.send({
            url: (settings.get("FRONTEND_URL") || "http://localhost:5173") + "/api/alerts/send",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Usamos un token de sistema o saltamos el auth si es llamada interna (aquí simulamos llamada externa)
            },
            body: JSON.stringify({
                type: type,
                recipients: recipients,
                hacienda: haciendaName,
                data: data
            })
        });
    } catch (e) {
        console.error("[CRON_SEND_ERROR]", e.message);
    }
}
