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

    // Buscar programaciones pendientes
    const programaciones = $app.dao().findRecordsByFilter(
        "1ym87i8vzpwxsi0", // programaciones collection ID
        `hacienda = '${userHacienda}' && estado = 'activo' && proxima_ejecucion <= '${now}'`,
        "-proxima_ejecucion",
        0,
        50
    )

    const executed = []

    for (const prog of programaciones) {
        try {
            // Registrar en bitácora
            const bitacora = new Record($app.dao().findCollectionByNameOrId("jw8s315a3rmbrfw"))
            bitacora.set("hacienda", userHacienda)
            bitacora.set("programaciones", prog.id)
            bitacora.set("fecha", now)
            bitacora.set("estado", "completada")
            bitacora.set("descripcion", `Ejecución automática: ${prog.get("descripcion")}`)
            bitacora.set("user_created", authRecord.id)
            $app.dao().saveRecord(bitacora)

            // Calcular próxima ejecución
            const frecuencia = prog.get("frecuencia")
            const ultimaEjecucion = new Date(now)
            let proximaEjecucion = new Date(ultimaEjecucion)

            switch (frecuencia) {
                case "diaria":
                    proximaEjecucion.setDate(proximaEjecucion.getDate() + 1)
                    break
                case "semanal":
                    proximaEjecucion.setDate(proximaEjecucion.getDate() + 7)
                    break
                case "quincenal":
                    proximaEjecucion.setDate(proximaEjecucion.getDate() + 15)
                    break
                case "mensual":
                    proximaEjecucion.setMonth(proximaEjecucion.getMonth() + 1)
                    break
            }

            // Actualizar programación
            prog.set("ultima_ejecucion", now)
            prog.set("proxima_ejecucion", proximaEjecucion.toISOString())
            $app.dao().saveRecord(prog)

            executed.push({
                id: prog.id,
                descripcion: prog.get("descripcion"),
                bitacora_id: bitacora.id,
                proxima_ejecucion: proximaEjecucion.toISOString()
            })
        } catch (err) {
            console.error(`Error executing programacion ${prog.id}:`, err)
        }
    }

    return e.json(200, {
        executed: executed.length,
        reports: executed,
        timestamp: now
    })
}, $apis.requireAuth())
