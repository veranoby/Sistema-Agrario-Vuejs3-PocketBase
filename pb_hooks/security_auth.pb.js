/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
    // 1. Identificar si es una solicitud autenticada o de Admin de PB
    const isAdmin = e.hasSuperuserAuth();
    const authRecord = e.auth;

    // Saneamiento anti-bypassing de atributos críticos para solicitudes no-SuperAdmin
    if (!isAdmin) {
        e.record.set("verified", false);
        if (e.record.get("role") === "asesor") {
            e.record.set("status", "pending");
        } else {
            e.record.set("status", "active");
        }
    }

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

        // Validación de límites de plan para administradores
        if (creatorRole === "administrador" && creatorHacienda) {
            const targetRole = e.record.get("role");
            if (targetRole === "operador" || targetRole === "auditor") {
                try {
                    const hacienda = $app.findRecordById("Haciendas", creatorHacienda);
                    if (hacienda && hacienda.get("plan")) {
                        const plan = $app.findRecordById("planes", hacienda.get("plan"));
                        const limit = (plan.getInt("auditores") || 0) + (plan.getInt("operadores") || 0);
                        if (limit > 0) {
                            const existingUsers = $app.findAllRecords("users", $dbx.exp("hacienda = {:haciendaId} AND status = 'active' AND (role = 'operador' OR role = 'auditor')", { haciendaId: creatorHacienda }));
                            if (existingUsers.length >= limit) {
                                throw new BadRequestError(`Límite de usuarios de su plan excedido (${existingUsers.length}/${limit}).`);
                            }
                        }
                    }
                } catch (planErr) {
                    if (planErr instanceof BadRequestError) throw planErr;
                    console.error("[SECURITY] Error validando límites de plan:", planErr);
                }
            }
        }
    }

    // ====== EJECUTAR GUARDADO Y RESTO DE HOOKS (Equivalente a Before->After) ======
    const res = e.next();

    // ====== LÓGICA AFTER-CREATE ======
    if (e.record.get("role") === "asesor") {
        if (!isAdmin) {
            try {
                e.record.refreshTokenKey();
                $app.save(e.record);
            } catch (tokenErr) {
                console.error(`[SECURITY] Error rotando tokenKey para asesor:`, tokenErr);
            }
        }
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

// REVOCACIÓN DE TOKEN AL SUSPENDER USUARIO
onRecordUpdateRequest((e) => {
    const newStatus = e.record.get("status");
    let oldStatus = "";
    try {
        if (typeof e.record.original === "function") {
            oldStatus = e.record.original().get("status");
        } else {
            const existing = $app.findRecordById("users", e.record.id);
            if (existing) oldStatus = existing.get("status");
        }
    } catch (err) {
        // Ignorar error al obtener estado anterior
    }

    if (newStatus === "suspended" && oldStatus !== "suspended") {
        try {
            e.record.refreshTokenKey();
        } catch (tokenErr) {
            console.error(`[SECURITY] Error rotando tokenKey al suspender usuario ${e.record.id}:`, tokenErr);
        }
    }

    return e.next();
}, "users");
