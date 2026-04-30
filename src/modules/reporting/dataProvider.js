/**
 * dataProvider.js
 * Proveedor de datos para reportes
 * Centraliza el acceso a datos desde stores o offline
 */

/**
 * Crea un proveedor de datos inyectable
 * @param {Object} stores - Objeto con stores de Pinia { siembrasStore, actividadesStore, zonasStore, bitacoraStore }
 * @returns {Object} Funciones de acceso a datos filtrados
 */
export function createDataProvider(stores) {
  const { siembrasStore, actividadesStore, zonasStore, bitacoraStore } = stores

  return {
    async getSiembras(config) {
      const { haciendaId, startDate, endDate, cultivos, zonas } = config

      let data = siembrasStore.siembras || []

      if (haciendaId) {
        data = data.filter(s => s.hacienda === haciendaId)
      }
      if (cultivos?.length) {
        data = data.filter(s => cultivos.includes(s.tipo_cultivo))
      }
      if (zonas?.length) {
        data = data.filter(s => zonas.includes(s.zona))
      }
      if (startDate) {
        data = data.filter(s => s.fecha_siembra && new Date(s.fecha_siembra) >= startDate)
      }
      if (endDate) {
        data = data.filter(s => s.fecha_siembra && new Date(s.fecha_siembra) <= endDate)
      }

      return data
    },

    async getActividades(config) {
      const { haciendaId, startDate, endDate } = config

      let data = actividadesStore.actividades || []

      if (haciendaId) {
        data = data.filter(a => a.hacienda === haciendaId)
      }
      if (startDate) {
        data = data.filter(a => a.fecha_ejecucion && new Date(a.fecha_ejecucion) >= startDate)
      }
      if (endDate) {
        data = data.filter(a => a.fecha_ejecucion && new Date(a.fecha_ejecucion) <= endDate)
      }

      return data
    },

    async getZonas(config) {
      const { haciendaId } = config

      let data = zonasStore.zonas || []

      if (haciendaId) {
        data = data.filter(z => z.hacienda === haciendaId)
      }

      return data
    },

    async getBitacoras(config) {
      const { haciendaId, startDate, endDate } = config

      let data = bitacoraStore.bitacoraEntries || []

      if (haciendaId) {
        data = data.filter(b => b.hacienda === haciendaId)
      }
      if (startDate) {
        data = data.filter(b => new Date(b.created) >= startDate)
      }
      if (endDate) {
        data = data.filter(b => new Date(b.created) <= endDate)
      }

      return data
    }
  }
}
