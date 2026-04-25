/**
 * useDashboardLoader.js
 * Composable para batch loading del dashboard
 * Carga múltiples stores en paralelo con manejo de errores
 */

import { ref } from 'vue'

/**
 * Carga datos del dashboard en batch
 * @param {Array} stores - Array de store getters
 * @returns {Object} - { loading, error, loadDashboard }
 */
export function useDashboardLoader(stores) {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Carga todos los stores en paralelo
   */
  async function loadDashboard() {
    loading.value = true
    error.value = null

    try {
      const promises = stores.map(useStore => {
        try {
          const store = useStore()
          if (typeof store.fetchAll === 'function') {
            return store.fetchAll()
          } else if (typeof store.initFromLocalStorage === 'function') {
            return store.initFromLocalStorage()
          }
          return Promise.resolve()
        } catch (e) {
          console.warn('[useDashboardLoader] Error con store:', e)
          return Promise.resolve()
        }
      })

      await Promise.all(promises)
    } catch (err) {
      error.value = err.message
      console.error('[useDashboardLoader] Error cargando dashboard:', err)
    } finally {
      loading.value = false
    }
  }

  return { loading, error, loadDashboard }
}
