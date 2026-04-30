import { createSyncActions } from '@/utils/syncActions'
import { useSyncStore } from '@/stores/sync/index'

/**
 * Pinia Plugin para inyectar métodos de sincronización offline.
 * @param {import('pinia').PiniaPluginContext} context
 */
export function syncPlugin({ store, options }) {
  if (!options.sync) return

  const { collectionName, stateProp, hooks = {} } = options.sync

  // Bind hooks al contexto del store para acceso a `this`
  const boundHooks = {}
  if (hooks.onCreate) boundHooks.onCreate = hooks.onCreate.bind(store)
  if (hooks.onUpdate) boundHooks.onUpdate = hooks.onUpdate.bind(store)
  if (hooks.onDelete) boundHooks.onDelete = hooks.onDelete.bind(store)

  store.applySyncedCreate = (tempId, realItem) => {
    const syncStore = useSyncStore()
    const actions = createSyncActions(
      store.$id.toUpperCase(),
      store[stateProp],
      (data) => syncStore.saveToLocalStorage(collectionName, data),
      boundHooks
    )
    actions.applySyncedCreate(tempId, realItem)
  }

  store.applySyncedUpdate = (id, updatedData) => {
    const syncStore = useSyncStore()
    const actions = createSyncActions(
      store.$id.toUpperCase(),
      store[stateProp],
      (data) => syncStore.saveToLocalStorage(collectionName, data),
      boundHooks
    )
    actions.applySyncedUpdate(id, updatedData)
  }

  store.applySyncedDelete = (id) => {
    const syncStore = useSyncStore()
    const actions = createSyncActions(
      store.$id.toUpperCase(),
      store[stateProp],
      (data) => syncStore.saveToLocalStorage(collectionName, data),
      boundHooks
    )
    actions.applySyncedDelete(id)
  }
}
