import { ref, watch } from 'vue'
import { debounce } from '@/utils/debounce'

/**
 * Composable para búsqueda con debounce
 * @param {string|Object} initialQuery - Valor inicial de búsqueda
 * @param {number} delay - Delay en milisegundos (default: 300)
 * @returns {{query: Ref, debouncedQuery: Ref}}
 * 
 * @example
 * // Búsqueda de texto (300ms)
 * const { query: searchQuery, debouncedQuery } = useDebouncedSearch('', 300)
 * 
 * @example
 * // Filtros de fecha (500ms)
 * const { query: dateRange, debouncedQuery } = useDebouncedSearch({ start: null, end: null }, 500)
 */
export function useDebouncedSearch(initialQuery = '', delay = 300) {
  const query = ref(initialQuery)
  const debouncedQuery = ref(initialQuery)

  const updateDebounced = debounce((value) => {
    debouncedQuery.value = value
  }, delay)

  watch(query, (newValue) => {
    updateDebounced(newValue)
  })

  return {
    query,
    debouncedQuery
  }
}
