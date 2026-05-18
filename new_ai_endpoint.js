// ============================================
// POST /api/ai/chat
// Proxy seguro para OpenRouter — la key nunca llega al frontend
// Body: { prompt, context, haciendaId }
// ============================================
routerAdd("POST", "/api/ai/chat", (e) => {
  const info = e.requestInfo()
  const { prompt, context, haciendaId } = info.json || {}

  if (!prompt) return e.json(HTTP_STATUS.BAD_REQUEST, { error: "prompt required" })
  if (!haciendaId) return e.json(HTTP_STATUS.BAD_REQUEST, { error: "haciendaId required" })

  const caller = info.authRecord
  if (!caller) return e.json(HTTP_STATUS.UNAUTHORIZED, { error: "Auth required" })

  // ── Resolver API key: BYOK (hacienda) > key global ──
  let openRouterKey = null
  let isGlobalKey = false

  try {
    const haciendaCol = $app.dao().findCollectionByNameOrId("Haciendas")
    const hacienda = $app.dao().findFirstRecordByFilter(
      haciendaCol,
      $app.dao().filter("id = {:id}", { id: haciendaId })
    )
    openRouterKey = hacienda ? hacienda.get("openrouter_key") : null
  } catch (_) {}

  if (!openRouterKey) {
    const settings = getSettings()
    openRouterKey = settings.get("GLOBAL_OPENROUTER_KEY")
    isGlobalKey = true
  }

  if (!openRouterKey) {
    return e.json(HTTP_STATUS.BAD_REQUEST, {
      error: "No hay API key de IA configurada. Ingresa tu propia key en configuración de hacienda."
    })
  }

  // ── Rate limiting para key global: max 20 requests/día por hacienda ──
  if (isGlobalKey) {
    const today = new Date().toISOString().split('T')[0]
    const rateLimitKey = "ai_usage_" + haciendaId + "_" + today

    // Leer uso del día desde system_config (campo temporal en params)
    let usageToday = 0
    try {
      const paramRecord = $app.dao().findFirstRecordByFilter(
        $app.dao().findCollectionByNameOrId("_params"),
        $app.dao().filter("key = {:key}", { key: rateLimitKey })
      )
      usageToday = paramRecord ? parseInt(paramRecord.get("value") || "0") : 0
    } catch (_) {}

    const dailyLimit = 20
    if (usageToday >= dailyLimit) {
      return e.json(429, {
        error: "Límite diario de IA alcanzado (" + dailyLimit + " consultas/día). Ingresa tu propia API key para uso ilimitado.",
        limit: dailyLimit,
        used: usageToday
      })
    }

    // Incrementar contador (fire-and-forget)
    setTimeout(() => {
      try {
        const paramsCol = $app.dao().findCollectionByNameOrId("_params")
        try {
          const existing = $app.dao().findFirstRecordByFilter(
            paramsCol,
            $app.dao().filter("key = {:key}", { key: rateLimitKey })
          )
          existing.set("value", String(usageToday + 1))
          $app.dao().saveRecord(existing)
        } catch (_) {
          $app.dao().createRecord(paramsCol, { key: rateLimitKey, value: "1" })
        }
      } catch (err) {
        console.error("[AI rate limit] Error updating counter:", err.message)
      }
    }, 0)
  }

  // ── Llamada a OpenRouter ──
  try {
    const systemPrompt = "Eres un asistente agrícola experto para la plataforma ConAgri.\nAnalizas datos reales de siembras, actividades y zonas para dar recomendaciones concretas y accionables.\nResponde siempre en español. Sé preciso y conciso.\nSi detectas problemas críticos (BPA bajo, actividades vencidas, plagas), indícalos primero.\nCuando propongas acciones correctivas, enuméralas como pasos concretos que el usuario puede aprobar.";

    const userMessage = context
      ? "Contexto actual:\n" + JSON.stringify(context, null, 2) + "\n\nConsulta: " + prompt
      : prompt

    const response = $http.send({
      url: "https://openrouter.ai/api/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + openRouterKey,
        "HTTP-Referer": "https://conagri.app",
        "X-Title": "ConAgri"
      },
      body: JSON.stringify({
        model: isGlobalKey ? "openai/gpt-4o-mini" : "openai/gpt-4o",
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      }),
      timeout: 30000
    })

    if (response.statusCode !== 200) {
      console.error("[AI proxy] OpenRouter error:", response.body)
      return e.json(HTTP_STATUS.SERVER_ERROR, {
        error: "Error en servicio de IA",
        details: response.statusCode
      })
    }

    const data = response.json || {}
    const text = data.choices?.[0]?.message?.content || "Sin respuesta"
    const tokensUsed = data.usage?.total_tokens || 0

    return e.json(HTTP_STATUS.OK, {
      success: true,
      response: text,
      tokens_used: tokensUsed,
      model: data.model || "unknown",
      is_global_key: isGlobalKey
    })

  } catch (err) {
    console.error("[AI proxy] Error:", err.message)
    return e.json(HTTP_STATUS.SERVER_ERROR, { error: "Error conectando con IA", details: err.message })
  }
}, $apis.requireAuth())
