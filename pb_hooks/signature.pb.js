/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hook - Endpoint /api/verify-signature
 * GET /api/verify-signature?hash=<signature_hash>
 * 
 * Endpoint público tipo oráculo para que inspectores externos puedan 
 * validar la autenticidad y origen de una firma digital sin exponer
 * datos métricos sensibles de la hacienda.
 */

routerAdd("GET", "/api/verify-signature", (e) => {
    const hash = e.requestInfo().query.hash;
    if (!hash) {
        return e.json(400, { error: "Parámetro hash es requerido." });
    }

    try {
        if (typeof $app === "undefined") {
            return e.json(500, { error: "Global $app is undefined" });
        }

        // Consultar la colección 'bitacora' por el hash dentro de la columna JSON 'signature'
        let record = null;
        try {
            record = $app.findFirstRecordByFilter(
                "bitacora",
                "signature.hash = {:hash}",
                { hash: hash }
            );
        } catch (dbErr) {
            return e.json(404, { valid: false, error: "Firma no encontrada o registro inexistente." });
        }

        let actividadName = "";
        let operarioName = "";
        let haciendaName = "";
        const fechaEjecucion = record.get("fecha_ejecucion") || record.get("fecha");

        // Expandir relaciones de forma segura
        try {
            const actId = record.getString("actividades");
            if (actId) {
                const actRecord = $app.findRecordById("actividades", actId);
                actividadName = actRecord.getString("nombre") || "";
            }
        } catch (errAct) {
            // Silenciar
        }

        try {
            const userId = record.getString("user_created");
            if (userId) {
                const userRecord = $app.findRecordById("users", userId);
                const name = userRecord.getString("name") || "";
                const lastname = userRecord.getString("lastname") || "";
                operarioName = name || lastname ? `${name} ${lastname}`.trim() : userRecord.getString("username");
            }
        } catch (errUser) {
            // Silenciar
        }

        try {
            const haciendaId = record.getString("hacienda");
            if (haciendaId) {
                const haciendaRecord = $app.findRecordById("Haciendas", haciendaId);
                haciendaName = haciendaRecord.getString("name") || "";
            }
        } catch (errHacienda) {
            // Silenciar
        }

        return e.json(200, {
            valid: true,
            hacienda: haciendaName,
            actividad: actividadName,
            operario: operarioName,
            fecha_ejecucion: fechaEjecucion,
            hash: hash,
            timestamp: record.get("updated") || record.get("created")
        });

    } catch (err) {
        return e.json(500, { valid: false, error: "Error interno al verificar firma", details: err.message });
    }
});
