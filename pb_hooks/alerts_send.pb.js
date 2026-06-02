routerAdd("POST", "/api/ext/alerts/send", (e) => {
  try {
    const _VALID_ALERT_TYPES = ["actividad_critica", "bpa_vencido", "recordatorio", "actividad_asignada", "zona_atencion", "weekly_digest", "emergency"]
    const _EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const _RESEND_API_URL = "https://api.resend.com/emails"

    function _buildEmailHtml(type, data, hacienda, frontendUrl) {
      const header = (gradient, icon, title) => (
        `<div style="background: ${gradient}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 16px;">${icon} ${title}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${hacienda}</p>
        </div>`
      )
      const base = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Alerta ConAgri</title></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">`
      const footer = `<p style="font-size: 14px; color: #666; margin-top: 30px;">Mensaje automatico del sistema de gestion agricola.</p></body></html>`

      let subject = ""
      let html = base

      if (type === "weekly_digest") {
        subject = "Resumen Gerencial Semanal - " + hacienda
        html += header("linear-gradient(135deg, #43a047 0%, #1b5e20 100%)", "[Resumen]", "Resumen Semanal")
        html += `<div style="background: #ffffff; padding: 20px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">`
        html += `<h3 style="color: #43a047;">Logros de la Semana Pasada</h3>`
        const past = (data && data.summary && data.summary.past) || []
        if (past.length > 0) {
          html += `<ul style="font-size: 14px; color: #555;">`
          for (var i = 0; i < past.length; i++) {
            html += `<li>${past[i].actividad || "Actividad registrada"}</li>`
          }
          html += `</ul>`
        } else {
          html += `<p style="font-size: 14px; color: #999;">No se registraron actividades completadas.</p>`
        }
        html += `<h3 style="color: #f57c00; margin-top: 20px;">Plan para esta Semana</h3>`
        const future = (data && data.summary && data.summary.future) || []
        if (future.length > 0) {
          html += `<ul style="font-size: 14px; color: #555;">`
          for (var j = 0; j < future.length; j++) {
            const p = future[j]
            html += `<li>${p.descripcion} (Vence: ${new Date(p.vencimiento).toLocaleDateString()})</li>`
          }
          html += `</ul>`
        } else {
          html += `<p style="font-size: 14px; color: #999;">No hay actividades programadas.</p>`
        }
        html += `<div style="text-align: center; margin-top: 30px;"><a href="${frontendUrl}/dashboard" style="background: #43a047; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Dashboard</a></div>`
        html += `</div>`

      } else if (type === "emergency") {
        subject = "ALERTA CRITICA - " + hacienda
        html += header("linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)", "[ALERTA]", "Notificacion de Emergencia")
        html += `<div style="background: #ffffff; padding: 20px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">`
        html += `<div style="background: #fff5f5; padding: 20px; border-radius: 8px; text-align: center;">`
        html += `<h2 style="color: #d32f2f;">Atencion Inmediata Requerida</h2>`
        html += (data && data.emergency_type === 'subscription_expiry') 
          ? `<p style="font-size: 14px;">Su suscripción expirará en <strong>${data.days_remaining} días</strong>. Por favor, actualice su plan para evitar la suspensión del servicio.</p>`
          : (data && data.emergency_type === 'bpa_risk')
          ? `<p style="font-size: 14px;">Se han detectado <strong>${data.critical_count} zonas</strong> con estado BPA crítico (menor al 50%). Se recomienda inspección urgente.</p>`
          : (data && data.emergency_type === 'bodega_stock')
          ? `<p style="font-size: 14px;">El insumo <strong>${data.item_name}</strong> ha alcanzado un nivel de stock crítico: <strong>${data.stock_actual}</strong> (Mínimo requerido: ${data.stock_minimo}). Por favor, reponga el inventario lo antes posible.</p>`
          : `<p style="font-size: 14px;">Se ha detectado un evento crítico que requiere su atención en el sistema.</p>`
        html += `</div></div>`

      } else if (type === "recordatorio") {
        subject = "Recordatorio de Actividades - " + hacienda
        html += header("linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "[Recordatorio]", "Recordatorio de Actividades")
        html += `<div style="background: #ffffff; padding: 20px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">`
        html += `<p>Estimado equipo, recordatorio de actividades pendientes para <strong>${hacienda}</strong>.</p>`
        html += `</div>`

      } else if (type === "actividad_asignada") {
        subject = "Nueva Actividad Asignada - " + hacienda
        html += header("linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", "[Asignacion]", "Actividad Asignada")
        html += `<div style="background: #ffffff; padding: 20px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">`
        if (data && data.descripcion) html += `<p>${data.descripcion}</p>`
        html += `</div>`

      } else if (type === "bpa_vencido") {
        subject = "BPA Vencido - " + hacienda
        html += header("linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", "[BPA]", "Certificado BPA Vencido")
        html += `<div style="background: #ffffff; padding: 20px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">`
        if (data && data.producto) html += `<p>Producto: <strong>${data.producto}</strong></p>`
        if (data && data.fechaVencimiento) html += `<p>Vence: <strong>${data.fechaVencimiento}</strong></p>`
        html += `</div>`

      } else if (type === "zona_atencion") {
        subject = "Zona Requiere Atencion - " + hacienda
        html += header("linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", "[Zona]", "Zona Requiere Atencion")
        html += `<div style="background: #ffffff; padding: 20px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">`
        if (data && data.zona) html += `<p>Zona: <strong>${data.zona}</strong></p>`
        if (data && data.motivo) html += `<p>Motivo: ${data.motivo}</p>`
        html += `</div>`

      } else if (type === "actividad_critica") {
        subject = "Actividad Critica - " + hacienda
        html += header("linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", "[Critico]", "Actividad Critica")
        html += `<div style="background: #ffffff; padding: 20px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">`
        if (data && data.descripcion) html += `<p style="color: #f5576c;"><strong>${data.descripcion}</strong></p>`
        if (data && data.actividadId) html += `<p><a href="${frontendUrl}/actividades/${data.actividadId}">Ver actividad</a></p>`
        html += `</div>`
      }

      html += footer
      return { subject: subject, html: html }
    }

    const info = e.requestInfo()
    const body = info.body
    const { type, recipients, hacienda, data } = body || {}

    // Autenticacion Hibrida: X-System-Token (cron) o authRecord administrador/superadmin
    const systemToken = e.request.header.get("X-System-Token")
    const expectedToken = $os.getenv("SYSTEM_TOKEN") || "sistema-agri-internal-token"
    let isAuthorized = false

    if (systemToken && systemToken === expectedToken) {
      isAuthorized = true
    } else {
      const caller = info.auth
      if (caller) {
        const role = caller.get("role")
        if (role === "administrador" || role === "superadmin") {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      return e.json(401, { error: "Unauthorized access" })
    }

    if (!type) return e.json(400, { error: "Missing 'type' field" })
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return e.json(400, { error: "'recipients' must be a non-empty array" })
    }
    if (!hacienda) return e.json(400, { error: "Missing 'hacienda' field" })
    if (_VALID_ALERT_TYPES.indexOf(type) === -1) {
      return e.json(400, { error: "Invalid type. Must be one of: " + _VALID_ALERT_TYPES.join(", ") })
    }

    var firstInvalid = null
    for (var ri = 0; ri < recipients.length; ri++) {
      if (!_EMAIL_REGEX.test(recipients[ri])) {
        firstInvalid = recipients[ri]
        break
      }
    }
    if (firstInvalid) {
      return e.json(400, { error: "Invalid email format: " + firstInvalid })
    }

    let resendApiKey = "";
    try {
        const configRecord = $app.dao().findFirstRecordByData("system_config", "key", "resend_api_key");
        resendApiKey = configRecord.get("value");
    } catch (err) {
        // Record not found
    }
    if (!resendApiKey) {
        resendApiKey = $os.getenv("RESEND_API_KEY");
    }
    const resendFromEmail = $os.getenv("RESEND_FROM_EMAIL") || "noreply@conagri.com"
    const frontendUrl = $os.getenv("FRONTEND_URL") || "http://localhost:5173"

    if (!resendApiKey) {
      return e.json(500, { error: "RESEND_API_KEY not configured" })
    }

    const emailData = _buildEmailHtml(type, data, hacienda, frontendUrl)
    const subject = emailData.subject
    const html = emailData.html

    let logRecord = null
    let txExito = false
    const now = new Date().toISOString()

    try {
      e.app.dao().runInTransaction((txDao) => {
        const collection = txDao.findCollectionByNameOrId("log_comunicaciones")
        logRecord = new Record(collection)
        logRecord.set("tipo", "alerta")
        logRecord.set("destinatario", recipients.join(", "))
        logRecord.set("asunto", subject)
        logRecord.set("hacienda", hacienda)
        logRecord.set("estado", "pending")
        logRecord.set("user_id", (info.auth ? info.auth.id : null))
        logRecord.set("metadata", JSON.stringify({
          tipo_alerta: type,
          hacienda: hacienda,
          fecha_creacion: now
        }))
        logRecord.set("created", now)
        txDao.saveRecord(logRecord)
      })
      txExito = true
    } catch (logErr) {
      console.error("Failed to initialize communication log:", logErr.message)
      return e.json(500, { error: "Failed to initialize communication log", details: logErr.message })
    }

    let resendResponse = null
    if (txExito) {
      try {
        resendResponse = $http.send({
          url: _RESEND_API_URL,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + resendApiKey
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: recipients,
            subject: subject,
            html: html
          }),
          timeout: 10000
        })
      } catch (httpErr) {
        console.error("HTTP send error:", httpErr.message)
        try {
          e.app.dao().runInTransaction((txDao) => {
            const freshLogRecord = txDao.findRecordById("log_comunicaciones", logRecord.id)
            freshLogRecord.set("estado", "failed")
            freshLogRecord.set("metadata", JSON.stringify({
              tipo_alerta: type,
              hacienda: hacienda,
              error: httpErr.message,
              fecha_error: new Date().toISOString()
            }))
            txDao.saveRecord(freshLogRecord)
          })
        } catch (updateErr) {
          console.error("Failed to update communication log with error status:", updateErr.message)
        }
        return e.json(500, { error: "Failed to send email", details: httpErr.message })
      }
    }

    if (resendResponse) {
      if (resendResponse.statusCode !== 200) {
        console.error("Resend API error:", resendResponse.body)
        try {
          e.app.dao().runInTransaction((txDao) => {
            const freshLogRecord = txDao.findRecordById("log_comunicaciones", logRecord.id)
            freshLogRecord.set("estado", "failed")
            freshLogRecord.set("metadata", JSON.stringify({
              tipo_alerta: type,
              hacienda: hacienda,
              status_code: resendResponse.statusCode,
              error_details: resendResponse.body,
              fecha_error: new Date().toISOString()
            }))
            txDao.saveRecord(freshLogRecord)
          })
        } catch (updateErr) {
          console.error("Failed to update communication log with failure status:", updateErr.message)
        }
        return e.json(500, {
          error: "Failed to send email via Resend API",
          details: resendResponse.body
        })
      }

      const responseData = resendResponse.json || {}

      try {
        e.app.dao().runInTransaction((txDao) => {
          const freshLogRecord = txDao.findRecordById("log_comunicaciones", logRecord.id)
          freshLogRecord.set("estado", "sent")
          freshLogRecord.set("resend_id", responseData.id || null)
          freshLogRecord.set("metadata", JSON.stringify({
            tipo_alerta: type,
            hacienda: hacienda,
            resend_id: responseData.id || null,
            fecha_envio: new Date().toISOString()
          }))
          txDao.saveRecord(freshLogRecord)
        })
      } catch (updateErr) {
        console.error("Failed to update communication log with success status:", updateErr.message)
      }

      return e.json(200, {
        success: true,
        message: "Email sent successfully",
        recipients: recipients,
        type: type,
        hacienda: hacienda,
        resend_id: responseData.id || null
      })
    }

  } catch (err) {
    console.error("Error in /api/ext/alerts/send:", err.message)
    return e.json(500, {
      error: "Internal error",
      details: err.message
    })
  }
})
