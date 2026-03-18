/**
 * Calculadora de precios para el Mercado de Módulos
 * 
 * @module utils/moduleCalculator
 */

import { ANNUAL_DISCOUNT } from '@/constants/modules'

/**
 * Clase para cálculos de precios de módulos
 */
export class ModuleCalculator {
  /**
   * Precio base del plan (USD/mes)
   * @type {number}
   */
  static BASE_PRICE = 10

  /**
   * Calcula el precio mensual de módulos
   * @param {Array} modulos - Lista de módulos con precio_monthly
   * @returns {number} Precio mensual total
   */
  static calculateModulePrice(modulos, cycle = 'monthly') {
    const subtotal = modulos.reduce((sum, m) => sum + (m.price_monthly || 0), 0)
    
    if (cycle === 'yearly') {
      // Aplicar descuento anual (17%)
      return subtotal * 12 * (1 - ANNUAL_DISCOUNT)
    }
    
    return subtotal
  }

  /**
   * Calcula el precio total (base + módulos)
   * @param {Array} modulos - Lista de módulos
   * @param {string} cycle - Ciclo de facturación
   * @returns {number} Precio total
   */
  static calculateTotalPrice(modulos, cycle = 'monthly') {
    const modulesPrice = this.calculateModulePrice(modulos, cycle)
    
    if (cycle === 'yearly') {
      return this.BASE_PRICE * 12 + modulesPrice
    }
    
    return this.BASE_PRICE + modulesPrice
  }

  /**
   * Calcula el descuento anual aplicado
   * @param {Array} modulos - Lista de módulos
   * @returns {number} Monto del descuento
   */
  static calculateAnnualDiscount(modulos) {
    const monthlyTotal = this.calculateModulePrice(modulos, 'monthly')
    const yearlyTotal = this.calculateModulePrice(modulos, 'yearly')
    
    return (monthlyTotal * 12) - yearlyTotal
  }

  /**
   * Calcula el precio por categoría
   * @param {Array} modulos - Lista de módulos
   * @returns {Object} Precios por categoría
   */
  static calculatePriceByCategory(modulos) {
    const byCategory = {}
    
    modulos.forEach(m => {
      const category = m.category || 'other'
      if (!byCategory[category]) {
        byCategory[category] = 0
      }
      byCategory[category] += m.price_monthly || 0
    })
    
    return byCategory
  }

  /**
   * Genera resumen de costos
   * @param {Array} modulos - Lista de módulos
   * @param {string} cycle - Ciclo de facturación
   * @returns {Object} Resumen detallado
   */
  static generateCostSummary(modulos, cycle = 'monthly') {
    const basePrice = cycle === 'yearly' ? this.BASE_PRICE * 12 : this.BASE_PRICE
    const modulesPrice = this.calculateModulePrice(modulos, cycle)
    const total = basePrice + modulesPrice
    const discount = cycle === 'yearly' ? this.calculateAnnualDiscount(modulos) : 0

    return {
      basePrice,
      modulesPrice,
      discount,
      total,
      cycle,
      modulosCount: modulos.length,
      byCategory: this.calculatePriceByCategory(modulos)
    }
  }

  /**
   * Compara precios mensual vs anual
   * @param {Array} modulos - Lista de módulos
   * @returns {Object} Comparativa
   */
  static compareCycles(modulos) {
    const monthlyTotal = this.calculateTotalPrice(modulos, 'monthly')
    const yearlyTotal = this.calculateTotalPrice(modulos, 'yearly')
    const savings = (monthlyTotal * 12) - yearlyTotal
    const savingsPercent = ((savings / (monthlyTotal * 12)) * 100).toFixed(2)

    return {
      monthly: {
        total: monthlyTotal,
        perMonth: monthlyTotal
      },
      yearly: {
        total: yearlyTotal,
        perMonth: yearlyTotal / 12
      },
      savings,
      savingsPercent
    }
  }
}

/**
 * Genera cotización en formato texto
 * @param {Array} modulos - Lista de módulos
 * @param {Object} hacienda - Datos de hacienda
 * @returns {string} Cotización formateada
 */
export function generateQuote(modulos, hacienda) {
  const summary = ModuleCalculator.generateCostSummary(modulos, 'monthly')
  const comparison = ModuleCalculator.compareCycles(modulos)

  let quote = `# Cotización de Módulos\n\n`
  quote += `**Hacienda**: ${hacienda?.name || 'N/A'}\n`
  quote += `**Fecha**: ${new Date().toLocaleDateString('es-EC')}\n\n`
  quote += `---\n\n`

  quote += `## Resumen Mensual\n\n`
  quote += `- Plan Base: $${summary.basePrice.toFixed(2)}\n`
  quote += `- Módulos (${summary.modulosCount}): $${summary.modulesPrice.toFixed(2)}\n`
  quote += `- **Total Mensual: $${summary.total.toFixed(2)}**\n\n`

  quote += `## Comparativa Anual\n\n`
  quote += `- Mensual: $${comparison.monthly.perMonth.toFixed(2)}/mes\n`
  quote += `- Anual: $${comparison.yearly.total.toFixed(2)}/año ($${comparison.yearly.perMonth.toFixed(2)}/mes)\n`
  quote += `- **Ahorro**: $${comparison.savings.toFixed(2)} (${comparison.savingsPercent}%)\n\n`

  quote += `## Módulos Cotizados\n\n`
  quote += `| Módulo | Categoría | Precio/Mes |\n`
  quote += `|--------|-----------|------------|\n`
  
  modulos.forEach(m => {
    quote += `| ${m.name} | ${m.category} | $${(m.price_monthly || 0).toFixed(2)} |\n`
  })

  return quote
}
