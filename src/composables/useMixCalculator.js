/**
 * src/composables/useMixCalculator.js
 * 
 * Composable para la Calculadora de Mezclas "Al Vuelo" (Plan Gratuito)
 * Calcula: areaHectareas * dosisAplicada
 * Incluye degradado gracioso cuando faltan dosis o superficie de lote.
 */

export function useMixCalculator() {
  /**
   * Mapea unidades de dosis a unidades totales e insumos locales (sacos, tanques)
   */
  const mapUnidades = (unidadDosis, totalCantidad) => {
    const unidadLower = (unidadDosis || '').toLowerCase()

    let unidadTotal = 'Unidades'
    let equivalenciaTexto = ''

    if (unidadLower.includes('l/ha') || unidadLower.includes('litros') || unidadLower.includes('l')) {
      unidadTotal = 'Litros'
      const tanques200L = (totalCantidad / 200).toFixed(1)
      equivalenciaTexto = `equivale a aprox. ${tanques200L} tanques de 200 Litros`
    } else if (unidadLower.includes('kg/ha') || unidadLower.includes('kg') || unidadLower.includes('kilos')) {
      unidadTotal = 'kg'
      const sacos50kg = (totalCantidad / 50).toFixed(1)
      equivalenciaTexto = `equivale a aprox. ${sacos50kg} sacos de 50 kg`
    } else if (unidadLower.includes('g/l') || unidadLower.includes('g')) {
      unidadTotal = 'Gramos'
    } else if (unidadLower.includes('ml/l') || unidadLower.includes('ml')) {
      unidadTotal = 'ml'
      if (totalCantidad >= 1000) {
        const litros = (totalCantidad / 1000).toFixed(2)
        equivalenciaTexto = `equivale a ${litros} Litros`
      }
    }

    return { unidadTotal, equivalenciaTexto }
  }

  /**
   * Calcula la cantidad necesaria de mezcla para una superficie dada
   * @param {number|string} areaHectareas - Superficie del lote en ha
   * @param {number|string} dosisAplicada - Dosis por ha/unidad
   * @param {string} unidadDosis - Unidad (ej: L/ha, kg/ha)
   * @returns {Object} { status: 'OK'|'INCOMPLETO', cantidadTotal, unidadTotal, equivalenciaTexto, mensaje }
   */
  const calcularMezcla = (areaHectareas, dosisAplicada, unidadDosis = 'L/ha') => {
    const area = Number(areaHectareas)
    const dosis = Number(dosisAplicada)

    if (!dosisAplicada || isNaN(dosis) || dosis <= 0) {
      return {
        status: 'INCOMPLETO',
        cantidadTotal: null,
        unidadTotal: '',
        equivalenciaTexto: '',
        mensaje: 'Ingresa la dosis para activar la calculadora de mezclas.'
      }
    }

    if (!areaHectareas || isNaN(area) || area <= 0) {
      return {
        status: 'INCOMPLETO',
        cantidadTotal: null,
        unidadTotal: '',
        equivalenciaTexto: '',
        mensaje: 'Selecciona un lote con superficie asignada para calcular el volumen total.'
      }
    }

    const cantidadTotal = Number((area * dosis).toFixed(2))
    const { unidadTotal, equivalenciaTexto } = mapUnidades(unidadDosis, cantidadTotal)

    return {
      status: 'OK',
      cantidadTotal,
      unidadTotal,
      equivalenciaTexto,
      mensaje: `Para ${area} ha necesitas ${cantidadTotal} ${unidadTotal}${equivalenciaTexto ? ' (' + equivalenciaTexto + ')' : ''}.`
    }
  }

  return {
    calcularMezcla
  }
}
