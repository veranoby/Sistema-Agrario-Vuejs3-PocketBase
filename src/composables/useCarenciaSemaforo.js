import { useBitacoraStore } from '@/stores/bitacoraStore'

/**
 * Composable para el Semáforo de Carencia y Cosecha Segura (Plan Gratuito)
 * Evalúa los días de carencia de las aplicaciones de un lote frente a la fecha actual.
 * Incluye degradado gracioso cuando no hay datos de carencia registrados.
 */
export function useCarenciaSemaforo() {
  const bitacoraStore = useBitacoraStore()

  /**
   * Calcula el estado de carencia para una zona/lote
   * @param {string} zonaId - ID de la zona o lote
   * @param {Date|string} fechaRef - Fecha de referencia (por defecto hoy)
   * @returns {Object} { estado: 'BLOQUEADO'|'LIBRE'|'SIN_DATOS', diasRestantes, fechaLibre, nivelColor, mensaje, ultimaAplicacion }
   */
  const calcularEstadoCarencia = (zonaId, fechaRef = new Date()) => {
    if (!zonaId) {
      return {
        estado: 'SIN_DATOS',
        diasRestantes: 0,
        fechaLibre: null,
        nivelColor: 'gris',
        mensaje: 'Selecciona un lote para verificar el periodo de carencia.',
        ultimaAplicacion: null
      }
    }

    const entries = bitacoraStore.getEnrichedBitacoraEntries || []

    const aplicacionesLote = entries.filter(e => {
      const tieneZona = Array.isArray(e.zonas)
        ? e.zonas.includes(zonaId)
        : (e.expand?.zonas?.some(z => z.id === zonaId) || e.zona_id === zonaId)

      const nombreAct = (e.expand?.actividad_realizada?.nombre || '').toLowerCase()
      const tipoAct = (e.expand?.actividad_realizada?.expand?.tipo_actividades?.nombre || '').toLowerCase()

      const isPlagaOrAplicacion = nombreAct.includes('plaga') ||
        tipoAct.includes('plaga') ||
        e.actividad_realizada === 'nqoke21h1pvem5i' ||
        (e.metricas && (e.metricas.periodo_carencia_dias !== undefined || e.metricas.plaga_o_enfermedad))

      return tieneZona && isPlagaOrAplicacion
    })

    if (!aplicacionesLote.length) {
      return {
        estado: 'SIN_DATOS',
        diasRestantes: 0,
        fechaLibre: null,
        nivelColor: 'gris',
        mensaje: 'Sin aplicaciones registradas en este lote.',
        ultimaAplicacion: null
      }
    }

    aplicacionesLote.sort((a, b) => new Date(b.fecha_ejecucion || b.created) - new Date(a.fecha_ejecucion || a.created))
    const ultimaApp = aplicacionesLote[0]

    const carenciaDias = Number(ultimaApp.metricas?.periodo_carencia_dias || 0)

    if (!carenciaDias || carenciaDias <= 0) {
      return {
        estado: 'SIN_DATOS',
        diasRestantes: 0,
        fechaLibre: null,
        nivelColor: 'gris',
        mensaje: 'Sin datos de carencia — completa este campo en la bitácora para activar el semáforo.',
        ultimaAplicacion: ultimaApp
      }
    }

    const fechaAplicacion = new Date(ultimaApp.fecha_ejecucion || ultimaApp.created)
    const fechaLibre = new Date(fechaAplicacion.getTime() + carenciaDias * 24 * 60 * 60 * 1000)

    const ahora = new Date(fechaRef)
    const msRestantes = fechaLibre.getTime() - ahora.getTime()
    const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24))

    if (diasRestantes > 0) {
      return {
        estado: 'BLOQUEADO',
        diasRestantes,
        fechaLibre,
        nivelColor: 'rojo',
        mensaje: `⛔ Lote en periodo de carencia (Art. 16 BPA). Cosecha no recomendada por ${diasRestantes} día(s) más (libre el ${fechaLibre.toLocaleDateString()}).`,
        ultimaAplicacion: ultimaApp
      }
    }

    return {
      estado: 'LIBRE',
      diasRestantes: 0,
      fechaLibre,
      nivelColor: 'verde',
      mensaje: `✅ Cosecha segura. Periodo de carencia finalizado el ${fechaLibre.toLocaleDateString()}.`,
      ultimaAplicacion: ultimaApp
    }
  }

  return {
    calcularEstadoCarencia
  }
}
