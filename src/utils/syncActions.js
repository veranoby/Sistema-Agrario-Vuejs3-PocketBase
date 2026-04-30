/**
 * syncActions.js
 * Utilidad genérica para acciones de sincronización
 * Compatible con Pinia Options API
 *
 * @param {string} storeName - Nombre para logging
 * @param {Array} items - Array plano (this.items del store)
 * @param {Function} saveFn - Función para guardar en localStorage
 * @param {Object} hooks - Callbacks opcionales post-sync
 */
export function createSyncActions(storeName, items, saveFn, hooks = {}) {
  function applySyncedCreate(tempId, realItem) {
    console.log(`[${storeName}] Synced create: ${tempId} -> ${realItem.id}`)

    const index = items.findIndex(i => i.id === tempId && i._isTemp)
    if (index !== -1) {
      items[index] = { ...realItem, _isTemp: false }
    } else {
      if (!items.some(i => i.id === realItem.id)) {
        items.unshift({ ...realItem, _isTemp: false })
      }
    }

    saveFn(items)
    hooks.onCreate?.(realItem)
  }

  function applySyncedUpdate(id, updatedData) {
    console.log(`[${storeName}] Synced update: ${id}`)

    const index = items.findIndex(i => i.id === id)
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedData, _isTemp: false }
      saveFn(items)
    }

    hooks.onUpdate?.(id, updatedData)
  }

  function applySyncedDelete(id) {
    console.log(`[${storeName}] Synced delete: ${id}`)

    const initialLength = items.length
    const filtered = items.filter(i => i.id !== id)
    items.length = 0
    items.push(...filtered)

    if (items.length < initialLength) {
      saveFn(items)
    }

    hooks.onDelete?.(id)
  }

  return { applySyncedCreate, applySyncedUpdate, applySyncedDelete }
}
