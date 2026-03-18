import { describe, it, expect, vi } from 'vitest'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'

describe('useDebouncedSearch', () => {
  it('debe inicializar con valor vacío por defecto', () => {
    const { query, debouncedQuery } = useDebouncedSearch()

    expect(query.value).toBe('')
    expect(debouncedQuery.value).toBe('')
  })

  it('debe inicializar con valor inicial proporcionado', () => {
    const { query, debouncedQuery } = useDebouncedSearch('initial')

    expect(query.value).toBe('initial')
    expect(debouncedQuery.value).toBe('initial')
  })

  it('debe retornar query y debouncedQuery como refs', () => {
    const { query, debouncedQuery } = useDebouncedSearch('test')

    expect(query).toHaveProperty('value')
    expect(debouncedQuery).toHaveProperty('value')
  })

  it('debe manejar valores string', () => {
    const { query } = useDebouncedSearch('test-string')
    expect(query.value).toBe('test-string')
  })

  it('debe manejar valores numéricos', () => {
    const { query } = useDebouncedSearch(123)
    expect(query.value).toBe(123)
  })

  it('debe manejar objetos como valor inicial', () => {
    const initialFilter = { start: '2026-03-01', end: '2026-03-31' }
    const { query } = useDebouncedSearch(initialFilter)

    expect(query.value).toEqual(initialFilter)
  })
})
