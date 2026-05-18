/**
 * queueProcessor.js
 * Engine Factory para procesar cola de sincronización
 * Maneja reintentos con backoff y métricas
 */

import { pb } from '@/utils/pocketbase'

/**
 * Crea procesador de cola
 * @param {Object} params - { getStore, updateRefs, saveCache, resolveConflict, addConflict, notify, pb }
 * @returns {Object} - { processQueue, getMetrics }
 */
export function createQueueProcessor({
  getStore,
  updateRefs,
  saveCache,
  resolveConflict,
  addConflict,
  notify,
  pb: pbClient = pb
}) {
  const MAX_RETRIES = 5
  const metrics = { totalProcessed: 0, successCount: 0, failCount: 0, avgLatency: 0 }

  /**
   * Procesa la cola de operaciones pendientes
   * @param {Array} queue - Cola de operaciones
   * @returns {Object} - { created: [], updated: [], deleted: [] }
   */
  async function processQueue(queue) {
    const pending = queue.filter(op => op.status === 'pending')
    if (pending.length === 0) return { created: [], updated: [], deleted: [] }

    const results = { created: [], updated: [], deleted: [] }

    for (const op of pending) {
      const startTime = Date.now()
      op.status = 'syncing'

      try {
        const store = getStore(op.collection)
        if (!store) throw new Error(`Store no encontrado: ${op.collection}`)

        let result
        switch (op.action) {
          case 'create':
            result = await pbClient.collection(op.collection).create(op.data)
            await updateRefs(op.tempId, result.id)
            if (store.applySyncedCreate) await store.applySyncedCreate(op.tempId, result)
            results.created.push({ tempId: op.tempId, realItem: result })
            break

          case 'update':
            result = await pbClient.collection(op.collection).update(op.data.id, op.data)
            if (store.applySyncedUpdate) await store.applySyncedUpdate(op.data.id, result)
            results.updated.push({ id: op.data.id, updatedItem: result })
            break

          case 'delete':
            await pbClient.collection(op.collection).delete(op.data.id)
            if (store.applySyncedDelete) await store.applySyncedDelete(op.data.id)
            results.deleted.push({ id: op.data.id, collection: op.collection })
            break
        }

        op.status = 'completed'
        metrics.successCount++
      } catch (error) {
        op.retries++
        if (op.retries >= MAX_RETRIES) {
          op.status = 'failed'
          metrics.failCount++
          notify(`Error sincronizando ${op.collection}: ${error.message}`, 'error')
        } else {
          op.status = 'pending'
          const backoff = Math.pow(2, op.retries) * 1000
          await new Promise(r => setTimeout(r, backoff))
        }
      }

      const latency = Date.now() - startTime
      metrics.totalProcessed++
      metrics.avgLatency = (metrics.avgLatency * (metrics.totalProcessed - 1) + latency) / metrics.totalProcessed
      
      // Persist queue state item-by-item
      saveCache('syncQueue', queue.filter(op => op.status !== 'completed'))
    }

    return results
  }

  return { processQueue, getMetrics: () => ({ ...metrics }) }
}
