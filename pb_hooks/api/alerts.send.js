/// PocketBase Hook para envío de alertas por email
/// Endpoint: POST /api/alerts/send
/// Requiere: RESEND_API_KEY en variables de entorno

((*) => void) => hooks.onFetch((e) => {
  const url = e.request.url.split('/').filter(Boolean)

  // Solo manejar requests POST a /api/alerts/send
  if (url[0] === 'api' && url[1] === 'alerts' && url[2] === 'send') {
    if (e.request.method !== 'POST') {
      throw new ApiError(405, 'Method not allowed')
    }

    try {
      const body = JSON.parse(e.request.body)
      const { type, recipients, data, hacienda } = body

      // Validaciones básicas
      if (!type || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new ApiError(400, 'Missing required fields: type, recipients')
      }

      if (!data || typeof data !== 'object') {
        throw new ApiError(400, 'Invalid data field')
      }

      // Verificar API key de Resend
      const resendApiKey = process.env.RESEND_API_KEY
      if (!resendApiKey) {
        throw new ApiError(500, 'RESEND_API_KEY not configured')
      }

      // Enviar email usando Resend
      const resend = require('resend')(resendApiKey)

      const emailData = {
        from: 'Sistema Agri <noreply@sistemaagri.com>',
        to: recipients,
        subject: getSubject(type, data),
        html: getHTML(type, data, hacienda)
      }

      const result = await resend.emails.send(emailData)

      // Loggear el envío en la colección de logs (opcional)
      try {
        $app.dao().findCollectionByNameOrId('logs').then((collection) => {
          if (collection) {
            const record = new Record(collection)
            record.set('type', 'email_sent')
            record.set('alert_type', type)
            record.set('recipients', recipients)
            record.set('hacienda', hacienda)
            record.set('status', 'success')
            record.set('response_id', result.id)
            $app.dao().saveRecord(record)
          }
        }).catch(() => {
          // Silenciar errores de logging
        })
      } catch (logError) {
        // Continuar incluso si falla el logging
      }

      return new Response(JSON.stringify({ 
        success: true, 
        id: result.id,
        message: 'Email sent successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      // Loggear error en consola para debugging
      console.error('[ALERT_HOOK] Error sending email:', error.message)
      
      // Intentar loggear el error en la colección de logs
      try {
        $app.dao().findCollectionByNameOrId('logs').then((collection) => {
          if (collection) {
            const record = new Record(collection)
            record.set('type', 'email_error')
            record.set('alert_type', body?.type || 'unknown')
            record.set('error', error.message)
            record.set('hacienda', body?.hacienda || 'unknown')
            record.set('status', 'failed')
            $app.dao().saveRecord(record)
          }
        }).catch(() => {
          // Silenciar errores de logging
        })
      } catch (logError) {
        // Continuar
      }
      
      throw new ApiError(500, error.message)
    }
  }
})

/**
 * Obtiene el asunto del email según el tipo de alerta
 * @param {string} type - Tipo de alerta
 * @param {Object} data - Datos de la alerta
 * @returns {string} Asunto del email
 */
function getSubject(type, data) {
  const subjects = {
    actividad_critica: `⚠️ Actividad Crítica: ${data.actividadNombre || 'Sin nombre'}`,
    bpa_vencido: `🔴 Alerta BPA: ${data.zonaNombre || 'Zona sin nombre'}`,
    recordatorio: `📋 Recordatorio: ${data.titulo || 'Sin título'}`,
    actividad_asignada: `✅ Actividad Asignada: ${data.actividadNombre || 'Sin nombre'}`,
    zona_atencion: `🎯 Zona Requiere Atención: ${data.zonaNombre || 'Sin nombre'}`
  }
  return subjects[type] || '📢 Alerta Sistema Agri'
}

/**
 * Genera el HTML del email según el tipo de alerta
 * @param {string} type - Tipo de alerta
 * @param {Object} data - Datos de la alerta
 * @param {string} hacienda - ID de la hacienda
 * @returns {string} HTML del email
 */
function getHTML(type, data, hacienda) {
  const typeLabels = {
    actividad_critica: 'Actividad Crítica',
    bpa_vencido: 'BPA Vencido',
    recordatorio: 'Recordatorio',
    actividad_asignada: 'Actividad Asignada',
    zona_atencion: 'Zona Requiere Atención'
  }

  const typeIcons = {
    actividad_critica: '⚠️',
    bpa_vencido: '🔴',
    recordatorio: '📋',
    actividad_asignada: '✅',
    zona_atencion: '🎯'
  }

  const label = typeLabels[type] || 'Alerta'
  const icon = typeIcons[type] || '📢'

  // Construir detalles específicos según el tipo
  let detailsHTML = ''
  
  switch (type) {
    case 'actividad_critica':
      detailsHTML = `
        <tr><td><strong>Actividad:</strong></td><td>${data.actividadNombre || 'N/A'}</td></tr>
        ${data.descripcion ? `<tr><td><strong>Descripción:</strong></td><td>${data.descripcion}</td></tr>` : ''}
        ${data.prioridad ? `<tr><td><strong>Prioridad:</strong></td><td>${data.prioridad}</td></tr>` : ''}
        ${data.fechaVencimiento ? `<tr><td><strong>Fecha Vencimiento:</strong></td><td>${new Date(data.fechaVencimiento).toLocaleDateString()}</td></tr>` : ''}
      `
      break
    
    case 'bpa_vencido':
      detailsHTML = `
        <tr><td><strong>Zona:</strong></td><td>${data.zonaNombre || 'N/A'}</td></tr>
        ${data.cultivo ? `<tr><td><strong>Cultivo:</strong></td><td>${data.cultivo}</td></tr>` : ''}
        ${data.bpaEstado !== undefined ? `<tr><td><strong>Estado BPA:</strong></td><td>${data.bpaEstado}%</td></tr>` : ''}
        ${data.fechaVencimiento ? `<tr><td><strong>Fecha Vencimiento:</strong></td><td>${new Date(data.fechaVencimiento).toLocaleDateString()}</td></tr>` : ''}
      `
      break
    
    case 'recordatorio':
      detailsHTML = `
        <tr><td><strong>Título:</strong></td><td>${data.titulo || 'N/A'}</td></tr>
        ${data.descripcion ? `<tr><td><strong>Descripción:</strong></td><td>${data.descripcion}</td></tr>` : ''}
        ${data.fechaRecordatorio ? `<tr><td><strong>Fecha:</strong></td><td>${new Date(data.fechaRecordatorio).toLocaleDateString()}</td></tr>` : ''}
        ${data.prioridad ? `<tr><td><strong>Prioridad:</strong></td><td>${data.prioridad}</td></tr>` : ''}
      `
      break
    
    case 'actividad_asignada':
      detailsHTML = `
        <tr><td><strong>Actividad:</strong></td><td>${data.actividadNombre || 'N/A'}</td></tr>
        ${data.descripcion ? `<tr><td><strong>Descripción:</strong></td><td>${data.descripcion}</td></tr>` : ''}
        ${data.responsable ? `<tr><td><strong>Responsable:</strong></td><td>${data.responsable}</td></tr>` : ''}
        ${data.fechaAsignacion ? `<tr><td><strong>Fecha Asignación:</strong></td><td>${new Date(data.fechaAsignacion).toLocaleDateString()}</td></tr>` : ''}
      `
      break
    
    case 'zona_atencion':
      detailsHTML = `
        <tr><td><strong>Zona:</strong></td><td>${data.zonaNombre || 'N/A'}</td></tr>
        ${data.motivo ? `<tr><td><strong>Motivo:</strong></td><td>${data.motivo}</td></tr>` : ''}
        ${data.tipo ? `<tr><td><strong>Tipo:</strong></td><td>${data.tipo}</td></tr>` : ''}
        ${data.ubicacion ? `<tr><td><strong>Ubicación:</strong></td><td>${data.ubicacion}</td></tr>` : ''}
      `
      break
    
    default:
      detailsHTML = `
        <tr><td colspan="2"><pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${JSON.stringify(data, null, 2)}</pre></td></tr>
      `
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta Sistema Agri</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">
                ${icon} Sistema Agri - ${label}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">
                <strong>Hacienda:</strong> ${hacienda || 'N/A'}
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${detailsHTML}
              </table>
              
              <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px;">
                Este es un mensaje automático del Sistema Agri. Por favor, no responda a este correo.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Sistema Agri. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
