import { describe, it, expect } from 'vitest'
import { useMixCalculator } from './useMixCalculator'

describe('useMixCalculator composable', () => {
  const { calcularMezcla } = useMixCalculator()

  it('debe retornar estado INCOMPLETO con mensaje informativo cuando falta dosis', () => {
    const res = calcularMezcla(5, null, 'L/ha')
    expect(res.status).toBe('INCOMPLETO')
    expect(res.cantidadTotal).toBeNull()
    expect(res.mensaje).toContain('Ingresa la dosis para activar la calculadora')
  })

  it('debe retornar estado INCOMPLETO con mensaje informativo cuando falta superficie (área)', () => {
    const res = calcularMezcla(0, 2.5, 'L/ha')
    expect(res.status).toBe('INCOMPLETO')
    expect(res.cantidadTotal).toBeNull()
    expect(res.mensaje).toContain('Selecciona un lote con superficie asignada')
  })

  it('debe calcular la mezcla correctamente con dosis en L/ha y mostrar equivalencia en tanques', () => {
    const res = calcularMezcla(10, 2, 'L/ha')
    expect(res.status).toBe('OK')
    expect(res.cantidadTotal).toBe(20)
    expect(res.unidadTotal).toBe('Litros')
    expect(res.equivalenciaTexto).toContain('tanques de 200 Litros')
  })

  it('debe calcular la mezcla correctamente con dosis en kg/ha y mostrar equivalencia en sacos', () => {
    const res = calcularMezcla(5, 50, 'kg/ha')
    expect(res.status).toBe('OK')
    expect(res.cantidadTotal).toBe(250)
    expect(res.unidadTotal).toBe('kg')
    expect(res.equivalenciaTexto).toContain('sacos de 50 kg')
  })
})
