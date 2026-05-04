import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSyncStore } from '@/stores/sync'
import { pb } from '@/utils/pocketbase'

// Mock de IndexedDBStorage (nuevo en Hito 2)
vi.mock('@/utils/indexedDBStorage', () => ({
  IndexedDBStorage: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(),
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(),
    removeItem: vi.fn().mockResolvedValue(),
    clear: vi.fn().mockResolvedValue()
  }))
}))

// ... [Mantener el resto del test igual, asegurando que los mocks de stores funcionen] ...
