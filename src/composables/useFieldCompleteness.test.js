import { describe, it, expect, beforeEach } from 'vitest'
import { useFieldCompleteness, CRITICAL_FIELDS_MAP } from './useFieldCompleteness'
import { setActivePinia, createPinia } from 'pinia'

describe('useFieldCompleteness composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('debe exportar CRITICAL_FIELDS_MAP con las llaves requeridas', () => {
    expect(CRITICAL_FIELDS_MAP['nqoke21h1pvem5i']).toContain('periodo_carencia_dias')
    expect(CRITICAL_FIELDS_MAP['fbb751efx9rkp3s']).toContain('analisis_suelo_referencia')
    expect(CRITICAL_FIELDS_MAP['yhtpctztpakym9h']).toContain('codigo_trazabilidad_lote')
  })

  it('debe calcular 100% cuando no hay métricas esperadas ni métricas en objeto', () => {
    const { calculateCompleteness } = useFieldCompleteness()
    const res = calculateCompleteness('desconocido', {})
    expect(res.porcentaje).toBe(100)
    expect(res.nivelColor).toBe('verde')
  })

  it('debe detectar campos críticos faltantes en Control de Plagas', () => {
    const { calculateCompleteness } = useFieldCompleteness()
    const metricasPrueba = {
      plaga_o_enfermedad: 'Gusano cogollero',
      dosis_aplicada: 2
      // Faltan: periodo_carencia_dias, ingrediente_activo, registro_oficial_agrocalidad
    }

    const res = calculateCompleteness('nqoke21h1pvem5i', metricasPrueba)
    expect(res.criticosFaltantes).toContain('periodo_carencia_dias')
    expect(res.criticosFaltantes).toContain('ingrediente_activo')
    expect(res.criticosFaltantes).toContain('registro_oficial_agrocalidad')
    expect(res.porcentaje).toBeLessThan(100)
  })

  it('debe retornar 100% y nivel verde cuando todos los campos críticos y métricas están llenos', () => {
    const { calculateCompleteness } = useFieldCompleteness()
    const metricasCompletas = {
      periodo_carencia_dias: 14,
      ingrediente_activo: 'Mancozeb',
      registro_oficial_agrocalidad: '123-AGRO'
    }

    const res = calculateCompleteness('nqoke21h1pvem5i', metricasCompletas)
    expect(res.criticosFaltantes.length).toBe(0)
    expect(res.porcentaje).toBe(100)
    expect(res.nivelColor).toBe('verde')
  })

  it('debe clasificar el nivel de color como rojo cuando el porcentaje es <= 50', () => {
    const { calculateCompleteness } = useFieldCompleteness()
    const metricasPocas = {
      plaga_o_enfermedad: ''
    }
    const res = calculateCompleteness('nqoke21h1pvem5i', metricasPocas)
    expect(res.nivelColor).toBe('rojo')
  })
})
