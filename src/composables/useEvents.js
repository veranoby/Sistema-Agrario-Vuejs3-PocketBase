import { eventBus, EVENTS } from '@/utils/eventBus'

/**
 * Composable para manejar eventos del sistema
 * @returns {{ emit: Function, on: Function, once: Function }}
 */
export function useEvents() {
  const emit = (event, payload) => {
    eventBus.emit(event, payload)
  }

  const on = (event, handler) => {
    eventBus.on(event, handler)

    // Return cleanup function
    return () => eventBus.off(event, handler)
  }

  const once = (event, handler) => {
    eventBus.once(event, handler)
  }

  return { emit, on, once }
}

export { EVENTS }
