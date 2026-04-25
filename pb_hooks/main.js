/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hook - Endpoint /api/alerts/send
 * POST /api/alerts/send
 * Headers: Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "type": "actividad_critica|bpa_vencido|recordatorio|actividad_asignada|zona_atencion",
 *   "recipients": ["email1@example.com", "email2@example.com"],
 *   "hacienda": "nombre_hacienda",
 *   "data": { ... } // datos específicos del tipo de alerta
 * }
 */

// Constants (module scope - evaluated once)
const HTTP_STATUS = { BAD_REQUEST: 400, UNAUTHORIZED: 401, SERVER_ERROR: 500, OK: 200 }
const VALID_ALERT_TYPES = ["actividad_critica", "bpa_vencido", "recordatorio", "actividad_asignada", "zona_atencion"]
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESEND_API_URL = "https://api.resend.com/emails"
const SETTINGS_CACHE_TTL = 60000 // 1 minute

/**
 * Helper function para manejar errores de manera consistente
 * @param {string} context - Contexto del error (ej: "fetching reports")
 * @param {string} operation - Operación que falló (ej: "fetch scheduled reports")
 * @returns {Function} Función de manejo de errores para usar en catch
 */
function handleEndpointError(context, operation) {
  return (err) => {
    const message = err.message || 'Unknown error'
    console.error(`[Reports] ${context}: ${message}`)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: `Failed to ${operation}`,
      details: message
    })
  }
}

// CSS constants (reduces duplication)
const CSS = {
  headerPadding: "padding: 30px",
  boxPadding: "padding: 20px",
  baseFontSize: "font-size: 16px",
  smallFontSize: "font-size: 14px",
  textMargin: "margin: 0 0 10px 0",
  boldText: "font-weight: bold"
}

// Settings cache (reduces DB hits)
let cachedSettings = null
let settingsCacheTime = 0

function getSettings() {
  const now = Date.now()
  if (!cachedSettings || (now - settingsCacheTime) > SETTINGS_CACHE_TTL) {
    cachedSettings = $app.settings()
    settingsCacheTime = now
  }
  return cachedSettings
}

// Email template base (reduces duplication)
const EMAIL_TEMPLATE_BASE = (frontendUrl, hacienda) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Alerta ConAgri</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
`

const EMAIL_TEMPLATE_FOOTER = `
    <p style="${CSS.smallFontSize}; color: #666; margin-top: 30px;">
      Este es un mensaje automático del sistema de gestión agrícola.
    </p>
  </body>
</html>
`

// Email templates (module scope - allocated once)
const EMAIL_TEMPLATES = {
  recordatorio: {
    subject: (hacienda) => `📅 Recordatorio de Actividades - ${hacienda}`,
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    icon: "📅",
    title: "Recordatorio de Actividades",
    color: "#667eea",
    content: (data) => `<div style="background: #ffffff; ${CSS.boxPadding}; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Estimado equipo,</p>
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Este es un recordatorio de las actividades pendientes para <strong>${data.hacienda}</strong>:</p>
      <div style="background: #f8f9fa; ${CSS.boxPadding}; border-radius: 8px; margin: 20px 0;">
        ${data?.actividades ? data.actividades.map(act => `
          <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e1e1e1;">
            <p style="margin: 0 0 5px 0; ${CSS.boldText}; color: #667eea;">${act.nombre || "Actividad"}</p>
            <p style="${CSS.textMargin}; ${CSS.smallFontSize};">📆 Fecha: ${act.fecha || "Por definir"}</p>
            <p style="${CSS.textMargin}; ${CSS.smallFontSize};">👤 Responsable: ${act.responsable || "No asignado"}</p>
            <p style="margin: 0; ${CSS.smallFontSize};">📝 Notas: ${act.notas || "Sin notas"}</p>
          </div>
        `).join("") : "<p>No hay actividades detalladas</p>"}
      </div>`
  },

  actividad_asignada: {
    subject: (hacienda) => `📌 Nueva Actividad Asignada - ${hacienda}`,
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    icon: "📌",
    title: "Actividad Asignada",
    color: "#11998e",
    content: (data) => `<div style="background: #ffffff; ${CSS.boxPadding}; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Estimado equipo,</p>
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Se te ha asignado una nueva actividad en <strong>${data.hacienda}</strong>:</p>
      <div style="background: #f8f9fa; ${CSS.boxPadding}; border-radius: 8px; margin: 20px 0;">
        ${data?.cultivo ? `<p style="margin: 0 0 10px 0; ${CSS.boldText}; color: #11998e;">🌱 Cultivo: ${data.cultivo}</p>` : ""}
        ${data?.cantidad ? `<p style="${CSS.textMargin}; ${CSS.baseFontSize};">📦 Cantidad: <strong>${data.cantidad}</strong> ${data.unidad || "unidades"}</p>` : ""}
        ${data?.fechaCosecha ? `<p style="${CSS.textMargin}; ${CSS.smallFontSize};">📅 Fecha: ${data.fechaCosecha}</p>` : ""}
        ${data?.campo ? `<p style="${CSS.textMargin}; ${CSS.smallFontSize};">📍 Campo/Lote: ${data.campo}</p>` : ""}
        ${data?.descripcion ? `<p style="margin: 0; ${CSS.smallFontSize};">📝 ${data.descripcion}</p>` : ""}
      </div>`
  },

  bpa_vencido: {
    subject: (hacienda) => `📋 BPA Vencido - ${hacienda}`,
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    icon: "📋",
    title: "Certificado BPA Vencido",
    color: "#f5576c",
    content: (data) => `<div style="background: #ffffff; ${CSS.boxPadding}; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Estimado equipo,</p>
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Se ha detectado un certificado BPA vencido o próximo a vencer en <strong>${data.hacienda}</strong>:</p>
      <div style="background: #fff3cd; ${CSS.boxPadding}; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
        ${data?.producto ? `<p style="margin: 0 0 10px 0; ${CSS.boldText}; color: #f5576c;">📦 Producto: ${data.producto}</p>` : ""}
        ${data?.fechaVencimiento ? `<p style="${CSS.textMargin}; ${CSS.baseFontSize};">📅 Vence: <strong>${data.fechaVencimiento}</strong></p>` : ""}
        ${data?.diasRestantes ? `<p style="${CSS.textMargin}; ${CSS.smallFontSize};">⏰ Días restantes: ${data.diasRestantes}</p>` : ""}
        ${data?.ubicacion ? `<p style="${CSS.textMargin}; ${CSS.smallFontSize};">📍 Ubicación: ${data.ubicacion}</p>` : ""}
        ${data?.notas ? `<p style="margin: 0; ${CSS.smallFontSize};">📝 Notas: ${data.notas}</p>` : ""}
      </div>`
  },

  zona_atencion: {
    subject: (hacienda) => `🗺️ Zona Requiere Atención - ${hacienda}`,
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    icon: "🗺️",
    title: "Zona Requiere Atención",
    color: "#1976d2",
    content: (data) => `<div style="background: #ffffff; ${CSS.boxPadding}; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Estimado equipo,</p>
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Una zona ha sido marcada para atención especial en <strong>${data.hacienda}</strong>:</p>
      <div style="background: #e3f2fd; ${CSS.boxPadding}; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        ${data?.zona ? `<p style="margin: 0 0 10px 0; ${CSS.boldText}; color: #1976d2;">🗺️ Zona: ${data.zona}</p>` : ""}
        ${data?.motivo ? `<p style="${CSS.textMargin}; ${CSS.smallFontSize};">⚠️ Motivo: ${data.motivo}</p>` : ""}
        ${data?.prioridad ? `<p style="${CSS.textMargin}; ${CSS.smallFontSize};">🔴 Prioridad: ${data.prioridad}</p>` : ""}
        ${data?.descripcion ? `<p style="margin: 0; ${CSS.smallFontSize};">📝 ${data.descripcion}</p>` : ""}
      </div>`
  },

  actividad_critica: {
    subject: (hacienda) => `⚠️ Actividad Crítica - ${hacienda}`,
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    icon: "⚠️",
    title: "Actividad Crítica",
    color: "#f5576c",
    content: (data, frontendUrl) => `<div style="background: #ffffff; ${CSS.boxPadding}; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="${CSS.baseFontSize}; margin-bottom: 20px;">Se ha marcado una actividad como crítica que requiere atención inmediata.</p>
      <div style="background: #fff3cd; ${CSS.boxPadding}; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
        ${data?.descripcion ? `<p style="margin: 0 0 10px 0; ${CSS.boldText}; color: #f5576c;">${data.descripcion}</p>` : ""}
        ${data?.actividadId ? `<p style="margin: 0; ${CSS.smallFontSize};"><a href="${frontendUrl}/actividades/${data.actividadId}">Ver actividad</a></p>` : ""}
      </div>`
  }
}

routerAdd("POST", "/api/alerts/send", (e) => {
  const info = e.requestInfo()
  const body = info.json
  const { type, recipients, hacienda, data } = body

  // Validation
  if (!type) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Missing 'type' field" })
  }

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "'recipients' must be a non-empty array" })
  }

  if (!hacienda) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Missing 'hacienda' field" })
  }

  if (!VALID_ALERT_TYPES.includes(type)) {
    return e.json(HTTP_STATUS.BAD_REQUEST, {
      error: "Invalid type. Must be one of: " + VALID_ALERT_TYPES.join(", ")
    })
  }

  // Short-circuit email validation (fail fast on first invalid)
  const firstInvalid = recipients.find(email => !EMAIL_REGEX.test(email))
  if (firstInvalid) {
    return e.json(HTTP_STATUS.BAD_REQUEST, {
      error: "Invalid email format: " + firstInvalid
    })
  }

  // Settings (cached)
  const settings = getSettings()
  const resendApiKey = settings.get("RESEND_API_KEY")
  const resendFromEmail = settings.get("RESEND_FROM_EMAIL") || "noreply@conagri.com"
  const frontendUrl = settings.get("FRONTEND_URL") || "http://localhost:5173"

  if (!resendApiKey) {
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "RESEND_API_KEY not configured in Settings UI"
    })
  }

  // Generate email
  const template = EMAIL_TEMPLATES[type]
  if (!template) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Unknown alert type: " + type })
  }

  const subject = template.subject(hacienda)
  const html = EMAIL_TEMPLATE_BASE(frontendUrl, hacienda) +
    `<div style="background: ${template.gradient}; ${CSS.headerPadding}; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; ${CSS.baseFontSize};">${template.icon} ${template.title}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${hacienda}</p>
    </div>` +
    template.content({ ...data, hacienda }, frontendUrl) +
    EMAIL_TEMPLATE_FOOTER

  // Send to Resend
  try {
    const resendResponse = $http.send({
      url: RESEND_API_URL,
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
      timeout: 10000 // 10 seconds
    })

    if (resendResponse.statusCode !== HTTP_STATUS.OK) {
      console.error("Resend API error:", resendResponse.body)
      return e.json(HTTP_STATUS.SERVER_ERROR, {
        error: "Failed to send email via Resend API",
        details: resendResponse.body
      })
    }

    const responseData = resendResponse.json || {}
    const now = new Date().toISOString()

    // Return response immediately (logging happens after)
    const response = e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Email sent successfully",
      recipients: recipients,
      type: type,
      hacienda: hacienda,
      resend_id: responseData.id || null
    })

    // Fire-and-forget logging (non-blocking)
    setTimeout(() => {
      try {
        $app.dao().createRecord("log_comunicaciones", {
          tipo: "alerta",
          destinatario: recipients.join(", "),
          asunto: subject,
          hacienda: hacienda,
          estado: "sent",
          resend_id: responseData.id || null,
          user_id: $apis.authInfo().record.id,
          metadata: JSON.stringify({
            tipo_alerta: type,
            hacienda: hacienda,
            resend_id: responseData.id || null,
            fecha_envio: now
          }),
          created: now
        })
      } catch (logErr) {
        console.error("Failed to log:", logErr.message)
      }
    }, 0)

    return response

  } catch (err) {
    console.error("Error sending email:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to send email",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// GET /api/haciendas/:id/alerts
// ============================================
routerAdd("GET", "/api/haciendas/:id/alerts", (e) => {
  const info = e.requestInfo()
  const haciendaId = info.pathParam("id")

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Hacienda ID required" })
  }

  try {
    const collection = $app.dao().findCollectionByNameOrId("haciendas")
    const record = $app.dao().findFirstRecordByFilter(
      collection,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )

    if (!record) {
      return e.json(404, { error: "Hacienda not found" })
    }

    const config = record.get("alertConfig") || {}
    return e.json(HTTP_STATUS.OK, {
      enabled_types: config.enabledTypes || [],
      recipients: config.recipients || [],
      frequency: config.frequency || "immediate"
    })
  } catch (err) {
    console.error("Error loading alert config:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to load alert config",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// PUT /api/haciendas/:id/alerts
// ============================================
routerAdd("PUT", "/api/haciendas/:id/alerts", (e) => {
  const info = e.requestInfo()
  const body = info.json
  const haciendaId = info.pathParam("id")

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Hacienda ID required" })
  }

  if (!body || !Array.isArray(body.enabled_types) || !Array.isArray(body.recipients)) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Arrays required for enabled_types and recipients" })
  }

  try {
    const collection = $app.dao().findCollectionByNameOrId("haciendas")
    const record = $app.dao().findFirstRecordByFilter(
      collection,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )

    if (!record) {
      return e.json(404, { error: "Hacienda not found" })
    }

    record.set("alertConfig", {
      enabledTypes: body.enabled_types,
      recipients: body.recipients,
      frequency: body.frequency || "immediate"
    })

    $app.dao().saveRecord(record)
    return e.json(HTTP_STATUS.OK, { success: true })
  } catch (err) {
    console.error("Error saving alert config:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to save alert config",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/modulos/:id/activate
// ============================================
routerAdd("POST", "/api/modulos/:id/activate", (e) => {
  const info = e.requestInfo()
  const body = info.json
  const moduloId = info.pathParam("id")
  const { haciendaId } = body || {}

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId required" })
  }

  if (!moduloId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "moduloId required" })
  }

  try {
    // Verificar que el módulo existe
    const modulosCollection = $app.dao().findCollectionByNameOrId("modulos")
    const modulo = $app.dao().findFirstRecordByFilter(
      modulosCollection,
      $app.dao().filter("id = {:id}", { id: moduloId })
    )

    if (!modulo) {
      return e.json(404, { error: "Module not found" })
    }

    // Buscar suscripción existente para esta hacienda + módulo
    const subscriptionsCollection = $app.dao().findCollectionByNameOrId("subscriptions")
    const existingSubscription = $app.dao().findFirstRecordByFilter(
      subscriptionsCollection,
      $app.dao().filter("hacienda = {:haciendaId} && modulo = {:moduloId} && is_active = true", { 
        haciendaId, 
        moduloId 
      })
    )

    // Si ya está activo, retornar éxito
    if (existingSubscription) {
      return e.json(HTTP_STATUS.OK, {
        success: true,
        message: "Module already active",
        subscription_id: existingSubscription.id
      })
    }

    // Crear nueva suscripción
    const newSubscription = $app.dao().createRecord(subscriptionsCollection, {
      hacienda: haciendaId,
      modulo: moduloId,
      is_active: true,
      start_date: new Date().toISOString().split('T')[0],
      billing_cycle: "monthly"
    })

    return e.json(HTTP_STATUS.OK, {
      success: true,
      subscription_id: newSubscription.id,
      modulo: moduloId,
      hacienda: haciendaId
    })

  } catch (err) {
    console.error("Error activating module:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to activate module",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/modulos/:id/deactivate
// ============================================
routerAdd("POST", "/api/modulos/:id/deactivate", (e) => {
  const info = e.requestInfo()
  const body = info.json
  const moduloId = info.pathParam("id")
  const { haciendaId } = body || {}

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId required" })
  }

  if (!moduloId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "moduloId required" })
  }

  try {
    const subscriptionsCollection = $app.dao().findCollectionByNameOrId("subscriptions")
    
    // Buscar suscripción activa
    const subscription = $app.dao().findFirstRecordByFilter(
      subscriptionsCollection,
      $app.dao().filter("hacienda = {:haciendaId} && modulo = {:moduloId} && is_active = true", { 
        haciendaId, 
        moduloId 
      })
    )

    if (!subscription) {
      return e.json(404, { error: "Active subscription not found" })
    }

    // Desactivar suscripción
    subscription.set("is_active", false)
    $app.dao().saveRecord(subscription)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Module deactivated",
      subscription_id: subscription.id
    })

  } catch (err) {
    console.error("Error deactivating module:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to deactivate module",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// GET /api/admin/users
// ============================================
routerAdd("GET", "/api/admin/users", async (e) => {
  try {
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const page = e.request?.query?.get("page") || 1
    const perPage = e.request?.query?.get("perPage") || 50
    const role = e.request?.query?.get("role")
    const status = e.request?.query?.get("status")

    let filter = ""
    if (role || status) {
      const parts = []
      if (role) parts.push(`role = "${role}"`)
      if (status) parts.push(`status = "${status}"`)
      filter = parts.join(" && ")
    }

    const result = await $app.dao().findRecordsByFilter(
      usersCollection,
      filter,
      "-created",
      perPage,
      page,
      ["haciendas"]
    )

    return e.json(HTTP_STATUS.OK, {
      items: result.items,
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    })
  } catch (err) {
    console.error("Error fetching users:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to fetch users",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/users
// ============================================
routerAdd("POST", "/api/admin/users", (e) => {
  const body = e.request?.body

  if (!body?.email || !body?.username || !body?.password) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "email, username, and password required" })
  }

  try {
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    
    const newUser = $app.dao().createRecord(usersCollection, {
      email: body.email,
      username: body.username,
      name: body.name,
      lastname: body.lastname,
      role: body.role || "operador",
      status: body.status || "active",
      haciendas: body.hacienda ? [body.hacienda] : [],
      password: body.password,
      passwordConfirm: body.password
    })

    return e.json(HTTP_STATUS.OK, {
      success: true,
      user: newUser
    })
  } catch (err) {
    console.error("Error creating user:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to create user",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// PUT /api/admin/users/:id
// ============================================
routerAdd("PUT", "/api/admin/users/:id", (e) => {
  const info = e.requestInfo()
  const userId = info.pathParam("id")
  const body = info.json

  if (!userId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "userId required" })
  }

  try {
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const user = $app.dao().findFirstRecordByFilter(
      usersCollection,
      $app.dao().filter("id = {:id}", { id: userId })
    )

    if (!user) {
      return e.json(404, { error: "User not found" })
    }

    // Actualizar campos
    if (body.email) user.set("email", body.email)
    if (body.username) user.set("username", body.username)
    if (body.name) user.set("name", body.name)
    if (body.lastname) user.set("lastname", body.lastname)
    if (body.role) user.set("role", body.role)
    if (body.status) user.set("status", body.status)
    if (body.hacienda !== undefined) {
      user.set("haciendas", body.hacienda ? [body.hacienda] : [])
    }

    // Solo actualizar password si se proporciona
    if (body.password) {
      user.set("password", body.password)
      user.set("passwordConfirm", body.password)
    }

    $app.dao().saveRecord(user)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      user
    })
  } catch (err) {
    console.error("Error updating user:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to update user",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// DELETE /api/admin/users/:id
// ============================================
routerAdd("DELETE", "/api/admin/users/:id", (e) => {
  const info = e.requestInfo()
  const userId = info.pathParam("id")

  if (!userId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "userId required" })
  }

  try {
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const user = $app.dao().findFirstRecordByFilter(
      usersCollection,
      $app.dao().filter("id = {:id}", { id: userId })
    )

    if (!user) {
      return e.json(404, { error: "User not found" })
    }

    // Soft delete: cambiar status a inactive
    user.set("status", "inactive")
    $app.dao().saveRecord(user)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "User deactivated"
    })
  } catch (err) {
    console.error("Error deleting user:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to delete user",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/users/:id/reset-password
// ============================================
routerAdd("POST", "/api/admin/users/:id/reset-password", (e) => {
  const info = e.requestInfo()
  const userId = info.pathParam("id")
  const body = info.json

  if (!userId || !body?.password) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "userId and password required" })
  }

  try {
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const user = $app.dao().findFirstRecordByFilter(
      usersCollection,
      $app.dao().filter("id = {:id}", { id: userId })
    )

    if (!user) {
      return e.json(404, { error: "User not found" })
    }

    user.set("password", body.password)
    user.set("passwordConfirm", body.password)
    $app.dao().saveRecord(user)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Password reset successfully"
    })
  } catch (err) {
    console.error("Error resetting password:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to reset password",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/users/:id/haciendas
// ============================================
routerAdd("POST", "/api/admin/users/:id/haciendas", (e) => {
  const info = e.requestInfo()
  const userId = info.pathParam("id")
  const body = info.json

  if (!userId || !body?.haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "userId and haciendaId required" })
  }

  try {
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const user = $app.dao().findFirstRecordByFilter(
      usersCollection,
      $app.dao().filter("id = {:id}", { id: userId })
    )

    if (!user) {
      return e.json(404, { error: "User not found" })
    }

    user.set("haciendas", [body.haciendaId])
    $app.dao().saveRecord(user)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Hacienda assigned successfully"
    })
  } catch (err) {
    console.error("Error assigning hacienda:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to assign hacienda",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/users/:id/roles
// ============================================
routerAdd("POST", "/api/admin/users/:id/roles", (e) => {
  const info = e.requestInfo()
  const userId = info.pathParam("id")
  const body = info.json

  if (!userId || !body?.role) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "userId and role required" })
  }

  try {
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const user = $app.dao().findFirstRecordByFilter(
      usersCollection,
      $app.dao().filter("id = {:id}", { id: userId })
    )

    if (!user) {
      return e.json(404, { error: "User not found" })
    }

    user.set("role", body.role)
    $app.dao().saveRecord(user)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Role assigned successfully"
    })
  } catch (err) {
    console.error("Error assigning role:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to assign role",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// GET /api/admin/haciendas
// ============================================
routerAdd("GET", "/api/admin/haciendas", async (e) => {
  try {
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")
    const page = e.request?.query?.get("page") || 1
    const perPage = e.request?.query?.get("perPage") || 50
    const status = e.request?.query?.get("status")

    let filter = ""
    if (status) {
      filter = `status = "${status}"`
    }

    const result = await $app.dao().findRecordsByFilter(
      haciendasCollection,
      filter,
      "-created",
      perPage,
      page,
      ["users", "plan"]
    )

    return e.json(HTTP_STATUS.OK, {
      items: result.items,
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages
    })
  } catch (err) {
    console.error("Error fetching haciendas:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to fetch haciendas",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/haciendas
// ============================================
routerAdd("POST", "/api/admin/haciendas", (e) => {
  const body = e.request?.body

  if (!body?.name) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "name required" })
  }

  try {
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")

    const newHacienda = $app.dao().createRecord(haciendasCollection, {
      name: body.name,
      descripcion: body.descripcion,
      ubicacion: body.ubicacion,
      plan: body.plan,
      status: body.status || "active",
      active_modules: body.active_modules || []
    })

    return e.json(HTTP_STATUS.OK, {
      success: true,
      hacienda: newHacienda
    })
  } catch (err) {
    console.error("Error creating hacienda:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to create hacienda",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// PUT /api/admin/haciendas/:id
// ============================================
routerAdd("PUT", "/api/admin/haciendas/:id", (e) => {
  const info = e.requestInfo()
  const haciendaId = info.pathParam("id")
  const body = info.json

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId required" })
  }

  try {
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")
    const hacienda = $app.dao().findFirstRecordByFilter(
      haciendasCollection,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )

    if (!hacienda) {
      return e.json(404, { error: "Hacienda not found" })
    }

    // Actualizar campos
    if (body.name) hacienda.set("name", body.name)
    if (body.descripcion) hacienda.set("descripcion", body.descripcion)
    if (body.ubicacion) hacienda.set("ubicacion", body.ubicacion)
    if (body.plan) hacienda.set("plan", body.plan)
    if (body.status) hacienda.set("status", body.status)
    if (body.active_modules !== undefined) hacienda.set("active_modules", body.active_modules)
    if (body.owner) hacienda.set("owner", body.owner)
    if (body.user_limit) hacienda.set("user_limit", body.user_limit)
    if (body.storage_limit) hacienda.set("storage_limit", body.storage_limit)
    if (body.suspension_reason !== undefined) hacienda.set("suspension_reason", body.suspension_reason)

    $app.dao().saveRecord(hacienda)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      hacienda
    })
  } catch (err) {
    console.error("Error updating hacienda:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to update hacienda",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// DELETE /api/admin/haciendas/:id
// ============================================
routerAdd("DELETE", "/api/admin/haciendas/:id", (e) => {
  const info = e.requestInfo()
  const haciendaId = info.pathParam("id")

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId required" })
  }

  try {
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")
    const hacienda = $app.dao().findFirstRecordByFilter(
      haciendasCollection,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )

    if (!hacienda) {
      return e.json(404, { error: "Hacienda not found" })
    }

    // Soft delete: cambiar status a inactive
    hacienda.set("status", "inactive")
    $app.dao().saveRecord(hacienda)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Hacienda deactivated"
    })
  } catch (err) {
    console.error("Error deleting hacienda:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to delete hacienda",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/haciendas/:id/owner
// ============================================
routerAdd("POST", "/api/admin/haciendas/:id/owner", (e) => {
  const info = e.requestInfo()
  const haciendaId = info.pathParam("id")
  const body = info.json

  if (!haciendaId || !body?.userId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId and userId required" })
  }

  try {
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")
    const hacienda = $app.dao().findFirstRecordByFilter(
      haciendasCollection,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )

    if (!hacienda) {
      return e.json(404, { error: "Hacienda not found" })
    }

    hacienda.set("owner", body.userId)
    $app.dao().saveRecord(hacienda)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Owner assigned successfully"
    })
  } catch (err) {
    console.error("Error assigning owner:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to assign owner",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/haciendas/:id/plan
// ============================================
routerAdd("POST", "/api/admin/haciendas/:id/plan", (e) => {
  const info = e.requestInfo()
  const haciendaId = info.pathParam("id")
  const body = info.json

  if (!haciendaId || !body?.plan) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId and plan required" })
  }

  try {
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")
    const hacienda = $app.dao().findFirstRecordByFilter(
      haciendasCollection,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )

    if (!hacienda) {
      return e.json(404, { error: "Hacienda not found" })
    }

    hacienda.set("plan", body.plan)
    if (body.user_limit) hacienda.set("user_limit", body.user_limit)
    if (body.storage_limit) hacienda.set("storage_limit", body.storage_limit)

    $app.dao().saveRecord(hacienda)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Plan configured successfully"
    })
  } catch (err) {
    console.error("Error configuring plan:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to configure plan",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// POST /api/admin/haciendas/:id/reactivate
// ============================================
routerAdd("POST", "/api/admin/haciendas/:id/reactivate", (e) => {
  const info = e.requestInfo()
  const haciendaId = info.pathParam("id")

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId required" })
  }

  try {
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")
    const hacienda = $app.dao().findFirstRecordByFilter(
      haciendasCollection,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )

    if (!hacienda) {
      return e.json(404, { error: "Hacienda not found" })
    }

    hacienda.set("status", "active")
    hacienda.set("suspension_reason", null)
    $app.dao().saveRecord(hacienda)

    return e.json(HTTP_STATUS.OK, {
      success: true,
      message: "Hacienda reactivated successfully"
    })
  } catch (err) {
    console.error("Error reactivating hacienda:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to reactivate hacienda",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// GET /api/admin/haciendas/:id/metrics
// ============================================
routerAdd("GET", "/api/admin/haciendas/:id/metrics", async (e) => {
  const info = e.requestInfo()
  const haciendaId = info.pathParam("id")

  if (!haciendaId) {
    return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId required" })
  }

  try {
    // Obtener usuarios activos
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const userCount = await $app.dao().countRecords(
      usersCollection,
      $app.dao().filter(`haciendas ~ "{:haciendaId}" && status = "active"`, { haciendaId })
    )

    // Obtener suscripciones activas
    const subscriptionsCollection = $app.dao().findCollectionByNameOrId("subscriptions")
    const activeModules = await $app.dao().countRecords(
      subscriptionsCollection,
      $app.dao().filter(`hacienda = "{:haciendaId}" && is_active = true`, { haciendaId })
    )

    return e.json(HTTP_STATUS.OK, {
      userCount,
      activeModules,
      lastUpdated: new Date().toISOString()
    })
  } catch (err) {
    console.error("Error fetching metrics:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to fetch metrics",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// ANALYTICS - Caché en memoria (TTL 5 min)
// ============================================
const analyticsCache = {
  data: null,
  timestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutos
}

function getFromCache() {
  const now = Date.now()
  if (analyticsCache.data && (now - analyticsCache.timestamp) < analyticsCache.TTL) {
    return analyticsCache.data
  }
  return null
}

function setCache(data) {
  analyticsCache.data = data
  analyticsCache.timestamp = Date.now()
}

// ============================================
// GET /api/analytics/global
// ============================================
routerAdd("GET", "/api/analytics/global", async (e) => {
  try {
    // Verificar autenticación
    const authRecord = $apis.requireAuth()(e)

    // Validar que sea superadmin
    if (authRecord.get("role") !== "superadmin") {
      return e.json(403, { error: "Forbidden: Superadmin role required" })
    }

    // Verificar caché
    const cached = getFromCache()
    if (cached) {
      return e.json(HTTP_STATUS.OK, cached)
    }

    const range = e.request?.query?.get("range") || "month"

    // Calcular fechas según rango
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    let startDate
    switch (range) {
      case "day":
        startDate = todayStart
        break
      case "week":
        startDate = weekStart
        break
      case "month":
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - 1)
        break
      default:
        startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - 1)
    }

    // 1. Queries paralelas (reducir ~400ms → ~75ms)
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    const [totalUsers, activeUsers, usersToday, usersWeek] = await Promise.all([
      $app.dao().countRecords(usersCollection, ""),
      $app.dao().countRecords(usersCollection, $app.dao().filter(`status = "active" && created >= {:startDate}`, { startDate: startDate.toISOString() })),
      $app.dao().countRecords(usersCollection, $app.dao().filter(`created >= {:todayStart}`, { todayStart: todayStart.toISOString() })),
      $app.dao().countRecords(usersCollection, $app.dao().filter(`created >= {:weekStart}`, { weekStart: weekStart.toISOString() }))
    ])

    // 2. Haciendas por plan (countRecords en lugar de findRecordsByFilter)
    const haciendasCollection = $app.dao().findCollectionByNameOrId("Haciendas")
    const [haciendasFree, haciendasPro, haciendasEnterprise] = await Promise.all([
      $app.dao().countRecords(haciendasCollection, $app.dao().filter(`plan = "free"`)),
      $app.dao().countRecords(haciendasCollection, $app.dao().filter(`plan = "pro"`)),
      $app.dao().countRecords(haciendasCollection, $app.dao().filter(`plan = "enterprise"`))
    ])

    const haciendasByPlan = {
      free: haciendasFree,
      pro: haciendasPro,
      enterprise: haciendasEnterprise
    }

    // 3. Módulos más usados (subscriptions activas)
    const subscriptionsCollection = $app.dao().findCollectionByNameOrId("subscriptions")
    const activeSubs = await $app.dao().findRecordsByFilter(
      subscriptionsCollection,
      "is_active = true",
      "-created",
      100,
      1,
      ["modulo"]
    )

    const moduleCount = {}
    activeSubs.items.forEach(sub => {
      const modulo = sub.expand?.modulo
      if (modulo) {
        const name = modulo.get("code") || modulo.get("name") || "unknown"
        moduleCount[name] = (moduleCount[name] || 0) + 1
      }
    })

    const topModules = Object.entries(moduleCount)
      .map(([name, active]) => ({ name, active }))
      .sort((a, b) => b.active - a.active)
      .slice(0, 10)

    // 4. Crecimiento
    const totalHaciendas = haciendasFree + haciendasPro + haciendasEnterprise
    const growth = {
      users: {
        day: usersToday,
        week: usersWeek,
        month: activeUsers
      },
      haciendas: {
        day: 0,
        week: 0,
        month: totalHaciendas
      }
    }

    const result = {
      activeUsers: {
        today: usersToday,
        week: usersWeek,
        month: activeUsers
      },
      haciendasByPlan,
      topModules,
      growth,
      totalUsers,
      cachedAt: new Date().toISOString()
    }

    // Guardar en caché
    setCache(result)

    return e.json(HTTP_STATUS.OK, result)
  } catch (err) {
    console.error("Error fetching global analytics:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to fetch global analytics",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// GET /api/analytics/usage
// ============================================
routerAdd("GET", "/api/analytics/usage", async (e) => {
  try {
    // Verificar autenticación
    const authRecord = $apis.requireAuth()(e)
    
    // Validar que sea superadmin
    if (authRecord.get("role") !== "superadmin") {
      return e.json(403, { error: "Forbidden: Superadmin role required" })
    }

    const query = e.request?.query || {}
    const userId = query.get("userId")
    const haciendaId = query.get("haciendaId")
    const moduleId = query.get("moduleId")
    const startDate = query.get("startDate")
    const endDate = query.get("endDate")
    const format = query.get("format") || "json"

    if (!startDate || !endDate) {
      return e.json(HTTP_STATUS.BAD_REQUEST, { error: "startDate and endDate required" })
    }

    // Buscar logs de actividad (asumiendo colección logs_actividad o similar)
    // Si no existe, usamos bitacora como fallback
    let collection
    try {
      collection = $app.dao().findCollectionByNameOrId("logs_actividad")
    } catch (err) {
      // Fallback a bitacora
      collection = $app.dao().findCollectionByNameOrId("bitacora")
    }

    // Construir filtro
    const filterParts = []
    filterParts.push(`created >= "${startDate}" && created <= "${endDate}"`)
    
    if (userId) filterParts.push(`user_responsable = "${userId}"`)
    if (haciendaId) filterParts.push(`hacienda = "${haciendaId}"`)

    const filterString = filterParts.join(" && ")

    const logs = await $app.dao().findRecordsByFilter(
      collection,
      filterString,
      "-created",
      1000,
      1
    )

    // Agrupar por tipo de acción
    const actionsByType = { create: 0, update: 0, delete: 0 }
    const activityByDay = {}
    const activityByHour = {}
    const userActions = {}

    logs.items.forEach(log => {
      // Contar por tipo (asumiendo campo 'accion' o 'tipo')
      const accion = log.get("accion") || log.get("tipo") || "unknown"
      if (accion === "create" || accion === "crear") actionsByType.create++
      else if (accion === "update" || accion === "actualizar") actionsByType.update++
      else if (accion === "delete" || accion === "eliminar") actionsByType.delete++

      // Agrupar por día
      const logDate = new Date(log.get("created")).toISOString().split("T")[0]
      activityByDay[logDate] = (activityByDay[logDate] || 0) + 1

      // Agrupar por hora
      const logHour = new Date(log.get("created")).getHours()
      activityByHour[logHour] = (activityByHour[logHour] || 0) + 1

      // Contar por usuario
      const userResp = log.get("user_responsable") || log.expand?.user_responsable
      if (userResp) {
        const userId = typeof userResp === "object" ? userResp.id : userResp
        const userName = typeof userResp === "object" ? userResp.name : "Unknown"
        userActions[userId] = userActions[userId] || { name: userName, count: 0 }
        userActions[userId].count++
      }
    })

    // Convertir a arrays
    const activityByDayArray = Object.entries(activityByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const activityByHourArray = Object.entries(activityByHour)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour)

    const topUsers = Object.entries(userActions)
      .map(([userId, data]) => ({ userId, name: data.name, actions: data.count }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 10)

    const result = {
      actionsByType,
      activityByDay: activityByDayArray,
      activityByHour: activityByHourArray,
      topUsers,
      totalActions: logs.items.length,
      period: { startDate, endDate }
    }

    // Soporte para CSV
    if (format === "csv") {
      const csvRows = [["date", "hour", "user", "action"]]
      logs.items.forEach(log => {
        csvRows.push([
          new Date(log.get("created")).toISOString().split("T")[0],
          new Date(log.get("created")).getHours(),
          log.get("user_responsable") || "unknown",
          log.get("accion") || log.get("tipo") || "unknown"
        ])
      })
      
      const csvContent = csvRows.map(row => row.join(",")).join("\n")
      e.response.header("Content-Type", "text/csv")
      e.response.header("Content-Disposition", "attachment; filename=usage_metrics.csv")
      return e.response.send(200, csvContent)
    }

    return e.json(HTTP_STATUS.OK, result)
  } catch (err) {
    console.error("Error fetching usage analytics:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to fetch usage analytics",
      details: err.message
    })
  }
}, $apis.requireAuth())

// ============================================
// GET /api/analytics/patterns
// ============================================
routerAdd("GET", "/api/analytics/patterns", async (e) => {
  try {
    // Verificar autenticación
    const authRecord = $apis.requireAuth()(e)
    
    // Validar que sea superadmin
    if (authRecord.get("role") !== "superadmin") {
      return e.json(403, { error: "Forbidden: Superadmin role required" })
    }

    const query = e.request?.query || {}
    const type = query.get("type") || "siembra"
    const region = query.get("region")
    const cultivo = query.get("cultivo")

    // Construir filtros según tipo
    let collection
    let filterParts = []
    
    if (type === "siembra" || type === "fertilizacion" || type === "rendimiento") {
      try {
        collection = $app.dao().findCollectionByNameOrId("siembras")
      } catch (err) {
        return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Collection 'siembras' not found" })
      }

      if (region) filterParts.push(`zona ~ "${region}"`)
      if (cultivo) filterParts.push(`cultivo = "${cultivo}"`)
    }

    const filterString = filterParts.join(" && ")

    // Obtener registros
    const records = await $app.dao().findRecordsByFilter(
      collection,
      filterString,
      "-created",
      500,
      1
    )

    let patterns = []

    if (type === "siembra") {
      // Patrones de siembra: agrupar por mes y cultivo
      const monthCultivo = {}
      records.items.forEach(rec => {
        const fecha = new Date(rec.get("fecha_siembra") || rec.get("created"))
        const mes = fecha.getMonth() + 1
        const cultivoName = rec.get("cultivo") || "unknown"
        const key = `${mes}-${cultivoName}`
        
        monthCultivo[key] = monthCultivo[key] || { mes, cultivo: cultivoName, count: 0 }
        monthCultivo[key].count++
      })

      // Calcular probabilidad
      const total = records.items.length
      patterns = Object.values(monthCultivo)
        .map(p => ({
          mes: p.mes,
          cultivo: p.cultivo,
          probabilidad: total > 0 ? Math.round((p.count / total) * 100) / 100 : 0,
          count: p.count
        }))
        .sort((a, b) => b.probabilidad - a.probabilidad)
        .slice(0, 20)

    } else if (type === "fertilizacion") {
      // Fertilización promedio por cultivo
      const cultivoFertilizacion = {}
      records.items.forEach(rec => {
        const cultivoName = rec.get("cultivo") || "unknown"
        const fertilizacion = rec.get("fertilizacion") || rec.get("cantidad_fertilizante") || 0
        
        cultivoFertilizacion[cultivoName] = cultivoFertilizacion[cultivoName] || { sum: 0, count: 0 }
        cultivoFertilizacion[cultivoName].sum += parseFloat(fertilizacion) || 0
        cultivoFertilizacion[cultivoName].count++
      })

      patterns = Object.entries(cultivoFertilizacion)
        .map(([cultivo, data]) => ({
          cultivo,
          promedio: data.count > 0 ? Math.round((data.sum / data.count) * 100) / 100 : 0,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)

    } else if (type === "rendimiento") {
      // Rendimientos por cultivo/zona
      const cultivoRendimiento = {}
      records.items.forEach(rec => {
        const cultivoName = rec.get("cultivo") || "unknown"
        const rendimiento = rec.get("rendimiento") || rec.get("cosecha_kg") || 0
        
        cultivoRendimiento[cultivoName] = cultivoRendimiento[cultivoName] || { sum: 0, count: 0 }
        cultivoRendimiento[cultivoName].sum += parseFloat(rendimiento) || 0
        cultivoRendimiento[cultivoName].count++
      })

      patterns = Object.entries(cultivoRendimiento)
        .map(([cultivo, data]) => ({
          cultivo,
          rendimientoPromedio: data.count > 0 ? Math.round((data.sum / data.count) * 100) / 100 : 0,
          count: data.count
        }))
        .sort((a, b) => b.rendimientoPromedio - a.rendimientoPromedio)
    }

    return e.json(HTTP_STATUS.OK, {
      type,
      patterns,
      totalRecords: records.items.length,
      filters: { region, cultivo }
    })
  } catch (err) {
    console.error("Error fetching patterns:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, {
      error: "Failed to fetch patterns",
      details: err.message
    })
  }
}, $apis.requireAuth())

// =============================================================================
// REPORTES PROGRAMADOS - Scheduled Reports
// =============================================================================

/**
 * Calcular próxima ejecución según frecuencia
 * @param {string} frequency - 'daily' | 'weekly' | 'monthly'
 * @returns {string} ISO string de próxima ejecución
 */
function calculateNextExecution(frequency) {
  const now = new Date()
  const next = new Date(now)

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1)
      next.setHours(9, 0, 0, 0)
      break
    case "weekly":
      next.setDate(next.getDate() + 7)
      next.setHours(9, 0, 0, 0)
      break
    case "monthly":
      next.setMonth(next.getMonth() + 1)
      next.setDate(1)
      next.setHours(9, 0, 0, 0)
      break
    default:
      next.setDate(next.getDate() + 1)
      next.setHours(9, 0, 0, 0)
  }

  return next.toISOString()
}

/**
 * POST /api/reports/check-pending
 * Verifica y ejecuta reportes programados pendientes
 */
routerAdd("POST", "/api/reports/check-pending", async (e) => {
  try {
    const authRecord = $apis.requireAuth()(e)
    const now = new Date().toISOString()

    // Buscar colección de reportes programados
    let scheduledCollection
    try {
      scheduledCollection = $app.dao().findCollectionByNameOrId("scheduled_reports")
    } catch (err) {
      // Colección no existe aún - retornar vacío (no es error)
      return e.json(HTTP_STATUS.OK, {
        success: true,
        checked: now,
        executed: 0,
        pending: 0,
        message: "Collection not created yet"
      })
    }

    // Buscar reportes programados activos que deben ejecutarse
    const reports = $app.dao().findRecordsByFilter(
      scheduledCollection,
      `isActive = true && nextExecution <= {:now}`,
      "nextExecution",
      100,
      1,
      null,
      { now: now }
    )

    let executedCount = 0
    const errors = []

    for (const report of reports.items) {
      try {
        const reportType = report.get("type") || "custom"
        const format = report.get("format") || "csv"
        const recipients = report.get("recipients") || []
        const filters = report.get("filters") || {}

        // TODO: Generar reporte según tipo y formato
        // Por ahora, solo actualizar nextExecution
        console.log(`[Reports] Ejecutando reporte ${report.id}: ${report.get("name")}`)

        // Calcular próxima ejecución según frecuencia
        const nextRun = calculateNextExecution(report.get("frequency"))
        report.set("nextExecution", nextRun)
        report.set("lastExecuted", now)
        $app.dao().saveRecord(report)

        executedCount++
      } catch (err) {
        errors.push({ reportId: report.id, error: err.message })
        console.error(`[Reports] Error ejecutando reporte ${report.id}:`, err)
      }
    }

    return e.json(HTTP_STATUS.OK, {
      success: true,
      checked: now,
      executed: executedCount,
      pending: reports.items.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (err) {
    return handleEndpointError("check-pending", "check pending reports")(err)
  }
})

/**
 * GET /api/reports/scheduled
 * Listar reportes programados del usuario actual
 */
routerAdd("GET", "/api/reports/scheduled", async (e) => {
  try {
    const authRecord = $apis.requireAuth()(e)

    let scheduledCollection
    try {
      scheduledCollection = $app.dao().findCollectionByNameOrId("scheduled_reports")
    } catch (err) {
      // Colección no existe - retornar lista vacía
      return e.json(HTTP_STATUS.OK, { items: [] })
    }

    const reports = $app.dao().findRecordsByFilter(
      scheduledCollection,
      `user = {:userId}`,
      "-created",
      100,
      1,
      null,
      { userId: authRecord.id }
    )

    return e.json(HTTP_STATUS.OK, { items: reports.items })
  } catch (err) {
    return handleEndpointError("fetching reports", "list scheduled reports")(err)
  }
})

/**
 * POST /api/reports/scheduled
 * Crear nuevo reporte programado
 */
routerAdd("POST", "/api/reports/scheduled", (e) => {
  try {
    const authRecord = $apis.requireAuth()(e)
    const data = e.request?.body || {}

    // Validaciones básicas
    if (!data.name) {
      return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Name is required" })
    }
    if (!data.type) {
      return e.json(HTTP_STATUS.BAD_REQUEST, { error: "Type is required" })
    }

    let scheduledCollection
    try {
      scheduledCollection = $app.dao().findCollectionByNameOrId("scheduled_reports")
    } catch (err) {
      // Crear colección si no existe
      const collection = new Collection({
        name: "scheduled_reports",
        type: "base"
      })
      collection.add(
        new TextField({
          name: "name",
          required: true
        })
      )
      collection.add(
        new TextField({
          name: "type",
          required: true
        })
      )
      collection.add(
        new TextField({
          name: "frequency",
          required: true,
          default: "weekly"
        })
      )
      collection.add(
        new JsonField({
          name: "recipients",
          required: false
        })
      )
      collection.add(
        new JsonField({
          name: "filters",
          required: false
        })
      )
      collection.add(
        new TextField({
          name: "format",
          required: false,
          default: "csv"
        })
      )
      collection.add(
        new BoolField({
          name: "isActive",
          required: false,
          default: true
        })
      )
      collection.add(
        new TextField({
          name: "nextExecution",
          required: true
        })
      )
      collection.add(
        new TextField({
          name: "lastExecuted",
          required: false
        })
      )

      $app.dao().saveCollection(collection)
      scheduledCollection = collection
    }

    // Calcular primera ejecución
    const frequency = data.frequency || "weekly"
    const nextExecution = calculateNextExecution(frequency)

    const record = new Record(scheduledCollection)
    record.set("user", authRecord.id)
    record.set("name", data.name)
    record.set("type", data.type)
    record.set("frequency", frequency)
    record.set("recipients", data.recipients || [])
    record.set("filters", data.filters || {})
    record.set("format", data.format || "csv")
    record.set("isActive", data.isActive !== false)
    record.set("nextExecution", nextExecution)

    $app.dao().saveRecord(record)

    return e.json(201, record)
  } catch (err) {
    return handleEndpointError("creating report", "create scheduled report")(err)
  }
})

/**
 * PUT /api/reports/scheduled/:id
 * Actualizar reporte programado existente
 */
routerAdd("PUT", "/api/reports/scheduled/:id", (e) => {
  try {
    const authRecord = $apis.requireAuth()(e)
    const id = e.pathParam("id")

    let scheduledCollection
    try {
      scheduledCollection = $app.dao().findCollectionByNameOrId("scheduled_reports")
    } catch (err) {
      return e.json(HTTP_STATUS.SERVER_ERROR, {
        error: "Collection not found"
      })
    }

    const record = $app.dao().findRecordById(scheduledCollection, id)

    // Verificar propiedad
    if (record.get("user") !== authRecord.id) {
      return e.json(HTTP_STATUS.UNAUTHORIZED, { error: "Forbidden" })
    }

    const data = e.request?.body || {}

    if (data.name !== undefined) record.set("name", data.name)
    if (data.type !== undefined) record.set("type", data.type)
    if (data.frequency !== undefined) {
      record.set("frequency", data.frequency)
      record.set("nextExecution", calculateNextExecution(data.frequency))
    }
    if (data.recipients !== undefined) record.set("recipients", data.recipients)
    if (data.filters !== undefined) record.set("filters", data.filters)
    if (data.format !== undefined) record.set("format", data.format)
    if (data.isActive !== undefined) record.set("isActive", data.isActive)

    $app.dao().saveRecord(record)

    return e.json(HTTP_STATUS.OK, record)
  } catch (err) {
    return handleEndpointError("updating report", "update scheduled report")(err)
  }
})

/**
 * DELETE /api/reports/scheduled/:id
 * Eliminar reporte programado
 */
routerAdd("DELETE", "/api/reports/scheduled/:id", (e) => {
  try {
    const authRecord = $apis.requireAuth()(e)
    const id = e.pathParam("id")

    let scheduledCollection
    try {
      scheduledCollection = $app.dao().findCollectionByNameOrId("scheduled_reports")
    } catch (err) {
      return e.json(HTTP_STATUS.SERVER_ERROR, {
        error: "Collection not found"
      })
    }

    const record = $app.dao().findRecordById(scheduledCollection, id)

    // Verificar propiedad
    if (record.get("user") !== authRecord.id) {
      return e.json(HTTP_STATUS.UNAUTHORIZED, { error: "Forbidden" })
    }

    $app.dao().deleteRecord(record)

    return e.json(204, null)
  } catch (err) {
    return handleEndpointError("deleting report", "delete scheduled report")(err)
  }
})
