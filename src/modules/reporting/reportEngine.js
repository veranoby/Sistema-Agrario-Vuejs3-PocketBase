/**
 * reportEngine.js
 * Motor de reportes puro
 * NO importa stores - recibe datos ya filtrados
 */

import { parseISO, differenceInDays } from 'date-fns'

export const reportEngine = {
  generate(type, data, config) {
    switch (type) {
      case 'rendimientos':
        return this.generateRendimientos(data.siembras, config)
      case 'cumplimiento':
        return this.generateCumplimiento(data.zonas, config)
      case 'actividades':
        return this.generateActividades(data.actividades, config)
      case 'siembras_activas':
        return this.generateSiembrasActivas(data.siembras, config)
      case 'bpa_compliance':
        return this.generateBPACompliance(data.zonas, config)
      case 'libro_diario_bpa':
        return this.generateLibroDiarioBPA(data.bitacoras, config)
      default:
        throw new Error(`Tipo de reporte no soportado: ${type}`)
    }
  },

  generateRendimientos(siembras, config) {
    const processed = siembras.map(s => ({
      cultivo: s.tipo_cultivo || 'Sin especificar',
      zona: s.zona_nombre || 'Sin zona',
      area: s.area_total || 0,
      produccion: s.produccion_estimada || 0,
      rendimiento: s.rendimiento || 0,
      fecha_siembra: s.fecha_siembra,
      estado: s.estado,
      dias_ciclo: this.calculateCycleDays(s)
    }))

    return {
      metadata: { type: 'rendimientos', generatedAt: new Date().toISOString() },
      data: processed,
      summary: {
        totalSiembras: processed.length,
        rendimientoPromedio: processed.length > 0
          ? Math.round(processed.reduce((sum, d) => sum + (d.rendimiento || 0), 0) / processed.length)
          : 0,
        areaTotal: processed.reduce((sum, d) => sum + (d.area || 0), 0).toFixed(2)
      }
    }
  },

  generateActividades(actividades, config) {
    const processed = actividades.map(a => ({
      nombre: a.nombre || 'Sin nombre',
      tipo: a.tipo || 'Sin tipo',
      fecha_ejecucion: a.fecha_ejecucion,
      estado: a.estado,
      hacienda: a.hacienda
    }))

    return {
      metadata: { type: 'actividades', generatedAt: new Date().toISOString() },
      data: processed,
      summary: {
        totalActividades: processed.length,
        completadas: processed.filter(a => a.estado === 'Completado').length,
        pendientes: processed.filter(a => a.estado === 'Pendiente').length
      }
    }
  },

  generateSiembrasActivas(siembras, config) {
    const activas = siembras.filter(s => s.estado === 'Activo')

    const processed = activas.map(s => ({
      nombre: s.nombre || 'Sin nombre',
      cultivo: s.tipo_cultivo,
      area: s.area_total,
      fecha_siembra: s.fecha_siembra,
      dias_transcurridos: this.calculateCycleDays(s)
    }))

    return {
      metadata: { type: 'siembras_activas', generatedAt: new Date().toISOString() },
      data: processed,
      summary: {
        totalActivas: processed.length,
        areaTotal: processed.reduce((sum, s) => sum + (s.area || 0), 0).toFixed(2)
      }
    }
  },

  generateBPACompliance(zonas, config) {
    const processed = zonas.map(z => ({
      zona: z.nombre,
      bpaScore: z.bpa_estado || 0,
      status: (z.bpa_estado || 0) >= 60 ? 'Compliant' : 'Non-Compliant'
    }))

    const compliantCount = processed.filter(z => z.status === 'Compliant').length
    const averageBPA = processed.length > 0
      ? processed.reduce((sum, z) => sum + z.bpaScore, 0) / processed.length
      : 0

    return {
      metadata: { type: 'bpa_compliance', generatedAt: new Date().toISOString() },
      data: processed,
      summary: {
        totalZonas: zonas.length,
        compliantCount,
        nonCompliantCount: zonas.length - compliantCount,
        averageBPA: Math.round(averageBPA)
      }
    }
  },

  generateLibroDiarioBPA(bitacoras, config) {
    const processed = bitacoras.map(b => ({
      fecha: new Date(b.created).toLocaleString('es-EC'),
      responsable: b.expand?.user_created?.name || 'No especificado',
      actividad: b.expand?.actividad_realizada?.nombre || 'Sin actividad',
      zonas: b.expand?.zonas?.map(z => z.nombre).join(', ') || 'N/A',
      siembras: b.expand?.siembra_asociada?.nombre || 'N/A',
      estado: b.estado,
      cumplimiento_bpa: b.cumplimiento_bpa || 0,
      notas: b.notas || ''
    }))

    return {
      metadata: { type: 'libro_diario_bpa', generatedAt: new Date().toISOString() },
      data: processed,
      summary: {
        total_registros: processed.length,
        cumplimiento_promedio: processed.length > 0
          ? Math.round(processed.reduce((sum, b) => sum + b.cumplimiento_bpa, 0) / processed.length)
          : 0
      }
    }
  },

  generateCumplimiento(zonas, config) {
    return this.generateBPACompliance(zonas, config)
  },

  calculateCycleDays(siembra) {
    if (!siembra.fecha_siembra) return 0
    const start = parseISO(siembra.fecha_siembra)
    const end = siembra.fecha_cosecha_estimada
      ? parseISO(siembra.fecha_cosecha_estimada)
      : new Date()
    return differenceInDays(end, start)
  }
}
