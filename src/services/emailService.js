/**
 * Email Service - Resend Integration
 * 
 * Provides email functionality via Resend API for:
 * - Transactional emails (password reset, verification)
 * - Report attachments (PDF exports)
 * - Notifications
 * 
 * Usage:
 * import { emailService } from '@/services/emailService'
 * await emailService.sendReport({ to, subject, pdfBase64 })
 */

import { pb } from '@/utils/pocketbase'

// Resend API configuration
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || ''
const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev'

// Email logging collection
const LOG_COLLECTION = 'log_comunicaciones'

export const emailService = {
  /**
   * Send email with optional PDF attachment
   * @param {Object} options - Email options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} [options.pdfBase64] - Base64 encoded PDF
   * @param {string} [options.pdfFilename] - PDF filename
   * @param {Object} [options.metadata] - Additional metadata for logging
   * @returns {Promise<Object>} Send result
   */
  /**
   * Send email with optional PDF attachment and retry logic
   * @param {Object} options - Email options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} [options.pdfBase64] - Base64 encoded PDF
   * @param {string} [options.pdfFilename] - PDF filename
   * @param {Object} [options.metadata] - Additional metadata for logging
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({
    to,
    subject,
    html,
    pdfBase64 = null,
    pdfFilename = 'documento.pdf',
    metadata = {}
  }) {
    const maxRetries = 3
    let lastError

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this._sendEmailInternal({
          to, subject, html, pdfBase64, pdfFilename, metadata
        })
        return result
      } catch (error) {
        lastError = error
        console.warn(`[EmailService] Attempt ${attempt + 1} failed:`, error.message)
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          console.log(`[EmailService] Retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    // All retries failed
    console.error('[EmailService] All retry attempts failed')
    throw lastError
  },

  /**
   * Internal email sending implementation
   * @private
   */
  async _sendEmailInternal({
    to,
    subject,
    html,
    pdfBase64 = null,
    pdfFilename = 'documento.pdf',
    metadata = {}
  }) {
    // Validate API key
    if (!RESEND_API_KEY) {
      console.warn('[EmailService] RESEND_API_KEY not configured. Using mock mode.')
      return this.logEmail({ to, subject, status: 'mock', metadata })
    }

    // Prepare attachments
    const attachments = []
    if (pdfBase64) {
      attachments.push({
        filename: pdfFilename,
        content: pdfBase64,
        type: 'application/pdf'
      })
    }

    // Prepare email payload
    const payload = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments: attachments.length > 0 ? attachments : undefined
    }

    // Send via Resend API
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send email')
    }

    const result = await response.json()

    // Log successful send
    await this.logEmail({
      to,
      subject,
      status: 'sent',
      resendId: result.id,
      metadata
    })

    console.log('[EmailService] Email sent successfully:', result.id)
    return { success: true, id: result.id }
  },

  /**
   * Send report with PDF attachment
   * @param {Object} options - Report options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.reportType - Type of report (bitacora, programacion, etc.)
   * @param {string} options.pdfBase64 - Base64 encoded PDF
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Promise<Object>} Send result
   */
  async sendReport({
    to,
    subject,
    reportType,
    pdfBase64,
    metadata = {}
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Reporte Generado</h2>
        <p>Adjunto encontrará el reporte solicitado: <strong>${subject}</strong></p>
        <p><strong>Tipo:</strong> ${reportType}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          Este email fue generado automáticamente por ConAgri.
          Por favor no responda a este mensaje.
        </p>
      </div>
    `

    return this.sendEmail({
      to,
      subject,
      html,
      pdfBase64,
      pdfFilename: `${reportType}_${Date.now()}.pdf`,
      metadata: {
        ...metadata,
        reportType,
        isReport: true
      }
    })
  },

  /**
   * Send verification email
   * @param {Object} options - Verification options
   * @param {string} options.to - Recipient email
   * @param {string} options.verificationUrl - Verification URL
   * @returns {Promise<Object>} Send result
   */
  async sendVerificationEmail({ to, verificationUrl }) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Verifica tu Email</h2>
        <p>Gracias por registrarte en ConAgri.</p>
        <p>Por favor verifica tu email haciendo clic en el siguiente enlace:</p>
        <p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
            Verificar Email
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          Este enlace expirará en 24 horas.
        </p>
      </div>
    `

    return this.sendEmail({
      to,
      subject: 'Verifica tu Email - ConAgri',
      html,
      metadata: {
        emailType: 'verification'
      }
    })
  },

  /**
   * Send password reset email
   * @param {Object} options - Reset options
   * @param {string} options.to - Recipient email
   * @param {string} options.resetUrl - Password reset URL
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordReset({ to, resetUrl }) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Restablecer Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña en ConAgri.</p>
        <p>Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
        <p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px;">
            Restablecer Contraseña
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          Si no solicitaste este cambio, puedes ignorar este email.
          Este enlace expirará en 1 hora.
        </p>
      </div>
    `

    return this.sendEmail({
      to,
      subject: 'Restablecer Contraseña - ConAgri',
      html,
      metadata: {
        emailType: 'password_reset'
      }
    })
  },

  /**
   * Log email to log_comunicaciones collection
   * @param {Object} logData - Log data
   * @returns {Promise<void>}
   */
  async logEmail({ to, subject, status, resendId = null, error = null, metadata = {} }) {
    try {
      const logEntry = {
        tipo: 'email',
        destinatario: Array.isArray(to) ? to.join(', ') : to,
        asunto: subject,
        estado: status, // 'sent', 'failed', 'mock'
        resend_id: resendId,
        error: error,
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          ...metadata
        }),
        created: new Date().toISOString()
      }

      // Try to save to log_comunicaciones collection
      // This collection should exist for audit trail
      try {
        await pb.collection(LOG_COLLECTION).create(logEntry)
      } catch (logError) {
        // Collection might not exist yet, log to console
        console.warn('[EmailService] Could not log to log_comunicaciones:', logError.message)
        console.log('[EmailService] Log entry:', logEntry)
      }
    } catch (error) {
      console.error('[EmailService] Error logging email:', error)
    }
  },

  /**
   * Test email service configuration
   * @returns {Promise<Object>} Test result
   */
  async testConfiguration() {
    const issues = []

    if (!RESEND_API_KEY) {
      issues.push('RESEND_API_KEY not configured')
    }

    if (!FROM_EMAIL || FROM_EMAIL === 'onboarding@resend.dev') {
      issues.push('FROM_EMAIL not configured or using default')
    }

    // Check if log_comunicaciones collection exists
    try {
      await pb.collection(LOG_COLLECTION).getList(1, 1)
    } catch (error) {
      issues.push(`log_comunicaciones collection does not exist: ${error.message}`)
    }

    return {
      configured: issues.length === 0,
      issues,
      config: {
        hasApiKey: !!RESEND_API_KEY,
        fromEmail: FROM_EMAIL,
        hasLogCollection: !issues.some(i => i.includes('log_comunicaciones'))
      }
    }
  }
}

// Export convenience methods
export const sendReport = emailService.sendReport.bind(emailService)
export const sendVerificationEmail = emailService.sendVerificationEmail.bind(emailService)
export const sendPasswordReset = emailService.sendPasswordReset.bind(emailService)
export const testEmailConfig = emailService.testConfiguration.bind(emailService)
