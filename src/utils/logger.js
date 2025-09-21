// Logger inteligente para Sistema Agri
// Reduce logs excesivos en production y proporciona control granular

class Logger {
  constructor() {
    this.isDev = import.meta.env.DEV
    this.logCounts = new Map() // Tracking de logs repetitivos
    this.maxRepeats = 3 // Máximo de logs repetidos
    this.resetInterval = 60000 // Reset counter cada minuto
    this.lastReset = Date.now()
  }

  // Verificar si debe mostrar el log (anti-spam)
  shouldLog(key, level = 'info') {
    const now = Date.now()

    // Reset counters cada minuto
    if (now - this.lastReset > this.resetInterval) {
      this.logCounts.clear()
      this.lastReset = now
    }

    // En desarrollo, siempre log (excepto spam extremo)
    if (this.isDev && level !== 'spam') {
      return true
    }

    // En production, solo errores y warnings importantes
    if (!this.isDev && !['error', 'warn', 'critical'].includes(level)) {
      return false
    }

    // Anti-spam: contar logs repetitivos
    if (key) {
      const count = this.logCounts.get(key) || 0
      if (count >= this.maxRepeats) {
        return false
      }
      this.logCounts.set(key, count + 1)
    }

    return true
  }

  // Log con nivel y anti-spam
  log(message, level = 'info', key = null) {
    if (!this.shouldLog(key, level)) return

    const prefix = this.getPrefix(level)

    switch (level) {
      case 'error':
      case 'critical':
        console.error(prefix, message)
        break
      case 'warn':
        console.warn(prefix, message)
        break
      case 'info':
      case 'debug':
        console.log(prefix, message)
        break
      default:
        console.log(prefix, message)
    }
  }

  getPrefix(level) {
    const timestamp = this.isDev ? new Date().toLocaleTimeString() : ''
    const levelMap = {
      error: '🔴 [ERROR]',
      critical: '💥 [CRITICAL]',
      warn: '🟡 [WARN]',
      info: '🔵 [INFO]',
      debug: '🔍 [DEBUG]',
      auth: '🔐 [AUTH]',
      sync: '🔄 [SYNC]',
      perf: '⚡ [PERF]',
      p3: '🚀 [P3.1]'
    }

    return `${levelMap[level] || '[LOG]'} ${timestamp}`
  }

  // Métodos de conveniencia
  error(message, key = null) {
    this.log(message, 'error', key)
  }

  warn(message, key = null) {
    this.log(message, 'warn', key)
  }

  info(message, key = null) {
    this.log(message, 'info', key)
  }

  debug(message, key = null) {
    this.log(message, 'debug', key)
  }

  auth(message, key = null) {
    this.log(message, 'auth', key)
  }

  sync(message, key = null) {
    this.log(message, 'sync', key)
  }

  perf(message, key = null) {
    this.log(message, 'perf', key)
  }

  p3(message, key = null) {
    this.log(message, 'p3', key)
  }

  // Log de performance con métricas
  performance(operation, duration, details = {}) {
    if (!this.isDev && duration < 1000) return // Solo logs lentos en production

    const message = `${operation}: ${duration}ms ${JSON.stringify(details)}`
    this.perf(message, `perf_${operation}`)
  }

  // Log con throttling para eventos frecuentes
  throttle(key, message, level = 'info', intervalMs = 5000) {
    const now = Date.now()
    const lastLog = this.logCounts.get(`throttle_${key}`) || 0

    if (now - lastLog > intervalMs) {
      this.log(message, level, key)
      this.logCounts.set(`throttle_${key}`, now)
    }
  }
}

// Instancia singleton
export const logger = new Logger()

// Exports de conveniencia
export const logError = (message, key) => logger.error(message, key)
export const logWarn = (message, key) => logger.warn(message, key)
export const logInfo = (message, key) => logger.info(message, key)
export const logDebug = (message, key) => logger.debug(message, key)
export const logAuth = (message, key) => logger.auth(message, key)
export const logSync = (message, key) => logger.sync(message, key)
export const logPerf = (message, key) => logger.perf(message, key)
export const logP3 = (message, key) => logger.p3(message, key)