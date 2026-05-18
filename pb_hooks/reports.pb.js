/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/reports/check-pending", (e) => {
    const authRecord = e.get("authRecord")
    if (!authRecord) {
        throw new UnauthorizedError("Auth required")
    }

    const now = new Date().toISOString()
    const userHacienda = authRecord.get("hacienda")

    if (!userHacienda) {
        return e.json(200, { executed: 0, reports: [] })
    }

    // Endpoint obsoleto. La lógica de Órdenes de Trabajo ahora es impulsada
    // estrictamente por el frontend (BitacoraEntryForm).
    // No se generarán más entradas fantasmas desde el backend.
    
    const executed = []

    return e.json(200, {
        executed: executed.length,
        reports: executed,
        timestamp: now
    })
}, $apis.requireAuth())
