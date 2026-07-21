import { describe, it, expect, vi } from 'vitest'
import { exportLightweightBpaPdf } from './lightweightBpaPdfExporter'

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      this.setFillColor = vi.fn()
      this.rect = vi.fn()
      this.setTextColor = vi.fn()
      this.setFontSize = vi.fn()
      this.setFont = vi.fn()
      this.text = vi.fn()
      this.save = vi.fn()
      this.internal = {
        getNumberOfPages: vi.fn().mockReturnValue(1)
      }
    })
  }
})

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn()
  }
})

describe('lightweightBpaPdfExporter service', () => {
  it('debe arrojar error si no se envían entradas de bitácora', async () => {
    await expect(exportLightweightBpaPdf({ entries: [] })).rejects.toThrow('No hay entradas de bitácora para exportar')
  })

  it('debe generar y guardar el PDF exitosamente con entradas y datos de hacienda', async () => {
    const mockEntries = [
      {
        id: 'entry1',
        fecha_ejecucion: '2026-07-20T10:00:00.000Z',
        actividad_realizada: 'Control de Plagas',
        zonas: ['Lote 1'],
        metricas: {
          periodo_carencia_dias: 7,
          ingrediente_activo: 'Mancozeb 80%'
        },
        estado_ejecucion: 'completada',
        signature: 'data:image/png;base64,...'
      }
    ]

    const result = await exportLightweightBpaPdf({
      entries: mockEntries,
      hacienda: { nombre: 'Hacienda San José', ruc: '0999999999001' },
      titulo: 'Reporte de Bitácora BPA'
    })

    expect(result).toBe(true)
  })
})
