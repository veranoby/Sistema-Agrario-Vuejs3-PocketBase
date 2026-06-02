/**
 * Tests para formatters
 * @file tests/unit/utils/formatters.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { formatDate, formatNumber, formatCurrency } from '@/utils/formatters'

describe('formatDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formateo básico', () => {
    it('debe formatear fecha correctamente con formato yyyy-MM-dd', () => {
      const result = formatDate('2026-03-16', 'yyyy-MM-dd')
      expect(result).toBe('2026-03-16')
    })

    it('debe formatear fecha correctamente con formato dd/MM/yyyy', () => {
      const result = formatDate('2026-03-16', 'dd/MM/yyyy')
      expect(result).toBe('16/03/2026')
    })

    it('debe formatear fecha correctamente con formato MMMM dd, yyyy', () => {
      const result = formatDate('2026-03-16', 'MMMM dd, yyyy')
      expect(result).toContain('2026')
      expect(result).toContain('16')
    })

    it('debe formatear objeto Date correctamente', () => {
      const date = new Date('2026-03-16')
      const result = formatDate(date, 'yyyy-MM-dd')
      expect(result).toBe('2026-03-16')
    })

    it('debe formatear timestamp correctamente', () => {
      const timestamp = new Date('2026-03-16').getTime()
      const result = formatDate(timestamp, 'yyyy-MM-dd')
      expect(result).toBe('2026-03-16')
    })
  })

  describe('manejo de valores nulos/inválidos', () => {
    it('debe retornar N/A para null', () => {
      const result = formatDate(null)
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para undefined', () => {
      const result = formatDate(undefined)
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para string vacío', () => {
      const result = formatDate('')
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para fecha inválida', () => {
      const result = formatDate('fecha-invalida')
      expect(result).toBe('N/A')
    })

    it('debe retornar mensaje personalizado para valor inválido', () => {
      const result = formatDate(null, 'yyyy-MM-dd', 'Sin fecha')
      expect(result).toBe('Sin fecha')
    })
  })

  describe('formato por defecto', () => {
    it('debe usar formato dd/MM/yyyy por defecto', () => {
      const result = formatDate('2026-03-16')
      expect(result).toBe('16/03/2026')
    })
  })
})

describe('formatNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formateo básico', () => {
    it('debe formatear número entero correctamente', () => {
      const result = formatNumber(1234567)
      expect(result).toBe('1.234.567')
    })

    it('debe formatear número decimal correctamente', () => {
      const result = formatNumber(1234.567, 2)
      expect(result).toBe('1.234,57')
    })

    it('debe formatear número negativo correctamente', () => {
      const result = formatNumber(-1234567)
      expect(result).toBe('-1.234.567')
    })

    it('debe formatear cero correctamente', () => {
      const result = formatNumber(0)
      expect(result).toBe('0')
    })
  })

  describe('manejo de decimales', () => {
    it('debe usar 0 decimales por defecto', () => {
      const result = formatNumber(1234.2)
      expect(result).toBe('1.234')
    })

    it('debe usar cantidad específica de decimales', () => {
      const result = formatNumber(1234.567, 3)
      expect(result).toBe('1.234,567')
    })

    it('debe redondear correctamente', () => {
      const result = formatNumber(1234.5678, 2)
      expect(result).toBe('1.234,57')
    })
  })

  describe('manejo de valores nulos/inválidos', () => {
    it('debe retornar N/A para null', () => {
      const result = formatNumber(null)
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para undefined', () => {
      const result = formatNumber(undefined)
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para string vacío', () => {
      const result = formatNumber('')
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para NaN', () => {
      const result = formatNumber(NaN)
      expect(result).toBe('N/A')
    })
  })
})

describe('formatCurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formateo básico', () => {
    it('debe formatear moneda con formato europeo por defecto', () => {
      const result = formatCurrency(1234567.89)
      expect(result).toBe('1.234.567,89 €')
    })

    it('debe formatear moneda con símbolo personalizado', () => {
      const result = formatCurrency(1234567.89, 'USD')
      expect(result).toMatch(/USD|US\$/)
    })

    it('debe formatear moneda negativa correctamente', () => {
      const result = formatCurrency(-1234567.89)
      expect(result).toBe('-1.234.567,89 €')
    })

    it('debe formatear cero correctamente', () => {
      const result = formatCurrency(0)
      expect(result).toBe('0,00 €')
    })
  })

  describe('manejo de decimales', () => {
    it('debe usar 2 decimales por defecto (Intl.NumberFormat)', () => {
      const result = formatCurrency(1234.567)
      expect(result).toContain('€')
      expect(result).toContain('1.234,57')
    })

    it('debe formatear con moneda diferente', () => {
      const result = formatCurrency(1234.567, 'COP')
      expect(result).toContain('COP')
      expect(result).toContain('1.234,57')
    })
  })

  describe('manejo de valores nulos/inválidos', () => {
    it('debe retornar N/A para null', () => {
      const result = formatCurrency(null)
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para undefined', () => {
      const result = formatCurrency(undefined)
      expect(result).toBe('N/A')
    })

    it('debe retornar N/A para NaN', () => {
      const result = formatCurrency(NaN)
      expect(result).toBe('N/A')
    })
  })
})
