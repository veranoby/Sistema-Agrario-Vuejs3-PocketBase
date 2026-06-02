/// <reference path="../pb_data/types.d.ts" />

/**
 * pb_hooks/bodega.pb.js
 * Hooks para el módulo Bodega Automatizada:
 * 1. Recálculo autoritativo de stock_actual en bodega_items al crear, actualizar o eliminar bodega_movimientos.
 * 2. Alerta automatizada por email si stock_actual <= stock_minimo.
 */

function recalcularStock(app, itemId) {
    let alertPayload = null

    try {
        app.dao().runInTransaction((txDao) => {
            const itemRecord = txDao.findRecordById("bodega_items", itemId)
            if (!itemRecord) return;

            const movimientos = txDao.findRecordsByFilter(
                "bodega_movimientos",
                `item = "${itemId}"`
            )
            
            let stockActual = 0
            for (let i = 0; i < movimientos.length; i++) {
                const mov = movimientos[i]
                const tipo = mov.get("tipo")
                const cantidad = Number(mov.get("cantidad")) || 0
                if (tipo === "ingreso") {
                    stockActual += cantidad
                } else if (tipo === "egreso") {
                    stockActual -= cantidad
                }
            }

            itemRecord.set("stock_actual", stockActual)
            txDao.saveRecord(itemRecord)

            // Alerta si el stock es crítico (menor o igual al mínimo)
            const stockMinimo = Number(itemRecord.get("stock_minimo")) || 0
            if (stockActual <= stockMinimo) {
                const haciendaId = itemRecord.get("hacienda")
                const haciendaRecord = txDao.findRecordById("Haciendas", haciendaId)
                if (haciendaRecord) {
                    const nameHacienda = haciendaRecord.get("name")
                    const alertConfig = haciendaRecord.get("alertConfig") || {}
                    const recipients = alertConfig.recipients || []
                    
                    if (recipients.length === 0) {
                        const contactoEmail = haciendaRecord.get("contacto_email")
                        if (contactoEmail) {
                            recipients.push(contactoEmail)
                        }
                    }

                    if (recipients.length > 0) {
                        alertPayload = {
                            hacienda: nameHacienda,
                            recipients: recipients,
                            itemName: itemRecord.get("nombre"),
                            stockActual: stockActual,
                            stockMinimo: stockMinimo
                        }
                    }
                }
            }
        })
    } catch (txErr) {
        app.logger().error("[bodega.pb] Error en transacción recalcularStock:", txErr.message)
        throw txErr;
    }

    if (alertPayload) {
        try {
            const systemToken = $os.getenv("SYSTEM_TOKEN") || "sistema-agri-internal-token"
            $http.send({
                url: "http://127.0.0.1:8090/api/ext/alerts/send",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-System-Token": systemToken
                },
                body: JSON.stringify({
                    type: "emergency",
                    hacienda: alertPayload.hacienda,
                    recipients: alertPayload.recipients,
                    data: {
                        emergency_type: "bodega_stock",
                        item_name: alertPayload.itemName,
                        stock_actual: alertPayload.stockActual,
                        stock_minimo: alertPayload.stockMinimo
                    }
                })
            })
        } catch (alertErr) {
            app.logger().warn("[bodega.pb] Alerta de stock mínimo falló en envío HTTP:", alertErr.message)
        }
    }
}

onRecordCreateRequest((e) => {
    const res = e.next()
    try {
        const itemId = e.record.get("item")
        if (itemId) {
            recalcularStock(e.app, itemId)
        }
    } catch (err) {
        e.app.logger().error("[bodega.pb] Error en post-create stock:", err.message)
    }
    return res
}, "bodega_movimientos")

onRecordUpdateRequest((e) => {
    const res = e.next()
    try {
        const itemId = e.record.get("item")
        if (itemId) {
            recalcularStock(e.app, itemId)
        }
    } catch (err) {
        e.app.logger().error("[bodega.pb] Error en post-update stock:", err.message)
    }
    return res
}, "bodega_movimientos")

onRecordDeleteRequest((e) => {
    const res = e.next()
    try {
        const itemId = e.record.get("item")
        if (itemId) {
            recalcularStock(e.app, itemId)
        }
    } catch (err) {
        e.app.logger().error("[bodega.pb] Error en post-delete stock:", err.message)
    }
    return res
}, "bodega_movimientos")
