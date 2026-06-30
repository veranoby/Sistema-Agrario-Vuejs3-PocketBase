/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
    // 1. Identificar si es una solicitud autenticada o de Admin de PB
    const isAdmin = e.hasSuperuserAuth();
    const authRecord = e.auth;

    if (!isAdmin && !authRecord) {
        // === FLUJO DE REGISTRO PÚBLICO (ANÓNIMO) ===
        // B) VALIDACIÓN ANTI-SECUESTRO
        const role = e.record.get("role");
        const haciendaId = e.record.get("hacienda");

        if (role === "administrador" && haciendaId) {
            try {
                const hacienda = $app.findRecordById("Haciendas", haciendaId);
                const createdMs = hacienda.getDateTime("created").time().unixMilli();
                const nowMs = new Date().getTime();
                
                if (nowMs - createdMs > 300000) {
                    throw new BadRequestError("No autorizado: La hacienda ya existe.");
                }
            } catch (findErr) {
                throw new BadRequestError("Hacienda inválida o no encontrada.");
            }
        }
    } else if (!isAdmin && authRecord) {
        // === FLUJO AUTENTICADO ===
        const creatorRole = authRecord.get("role");
        const creatorHacienda = authRecord.get("hacienda");
        
        if (creatorRole !== "superadmin") {
            const targetHacienda = e.record.get("hacienda");
            if (targetHacienda !== creatorHacienda) {
                throw new BadRequestError("Movimiento Lateral Bloqueado.");
            }
        }
    }

    // ====== EJECUTAR GUARDADO Y RESTO DE HOOKS (Equivalente a Before->After) ======
    const res = e.next();

    // ====== LÓGICA AFTER-CREATE ======
    if (e.record.get("role") === "asesor") {
        try {
            const modulos = $app.findAllRecords("modulos", $dbx.exp("code = {:code}", { code: "asesor_plan" }));
            if (modulos && modulos.length > 0) {
                const modulo = modulos[0];
                const collection = $app.findCollectionByNameOrId("solicitudes_suscripcion");
                const solicitud = new Record(collection);
                solicitud.set("solicitante", e.record.id);
                solicitud.set("tipo", "modulo_addon");
                solicitud.set("modulo_solicitado", modulo.id);
                solicitud.set("estado", "pendiente");
                solicitud.set("notas_admin", "Registro automático asesor");
                solicitud.set("fecha_solicitud", new Date().toISOString());
                
                $app.save(solicitud);
            }
        } catch (err) {
            console.error(`[SECURITY] Error creando solicitud para asesor:`, err);
        }
    }

    return res;
}, "users");

// HOOK PARA HACIENDAS
onRecordCreateRequest((e) => {
    return e.next();
}, "Haciendas");
