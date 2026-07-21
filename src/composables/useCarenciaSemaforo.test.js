import { describe, it, expect, beforeEach } from 'vitest'
import { useCarenciaSemaforo } from './useCarenciaSemaforo'
import { setActivePinia, createPinia } from 'pinia'

describe('useCarenciaSemaforo composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('debe retornar SIN_DATOS cuando no se pasa un zonaId', () => {
    const { calcularEstadoCarencia } = useCarenciaSemaforo()
    const res = calcularEstadoCarencia(null)
    expect(res.estado).toBe('SIN_DATOS')
    expect(res.nivelColor).toBe('gris')
    expect(res.mensaje).toContain('Selecciona un lote')
  })

  it('debe retornar SIN_DATOS cuando no hay aplicaciones en el lote', () => {
    const { calcularEstadoCarencia } = useCarenciaSemaforo()
    const res = calcularEstadoCarencia('lote_inexistente')
    expect(res.estado).toBe('SIN_DATOS')
    expect(res.nivelColor).toBe('gris')
    expect(res.mensaje).toContain('Sin aplicaciones registradas')
  })
})
