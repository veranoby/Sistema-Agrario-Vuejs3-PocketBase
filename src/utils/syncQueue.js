import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

import { useZonasStore } from '@/stores/zonasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'

export class SyncQueue {
  constructor() {
    this.queue = []
    this.maxRetries = 3
    this.version = 1
    this.isProcessing = false
    this.batchSize = 10
    this.maxStorageSize = 5 * 1024 * 1024
  }

  async add(operation) {
    const enrichedOperation = {
      ...this.enrichOperation(operation),
      retryCount: 0,
      status: 'pending',
      timestamp: Date.now(),
      priority: this.calculatePriority(operation.type)
    }

    this.queue.push(enrichedOperation)
    return enrichedOperation.tempId
  }

  enrichOperation(operation) {
    const haciendaStore = useHaciendaStore()
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      ...operation,
      data: {
        ...operation.data,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      },
      tempId
    }
  }

  calculatePriority(operation) {
    // Priorizar operaciones críticas
    const priorities = {
      create: 2,
      update: 1,
      delete: 3,
      createAvatar: 1,
      updateAvatar: 1,
      deleteAvatar: 1
    }
    return priorities[operation] || 0
  }

  async process() {
    if (this.isProcessing) return
    this.isProcessing = true
    console.log('Iniciando proceso de queue...', this.queue)

    try {
      for (const operation of this.queue) {
        try {
          console.log('Procesando operación:', operation)
          const result = await this.processOperation(operation)

          // Remover operación exitosa de la cola
          this.queue = this.queue.filter((op) => op.tempId !== operation.tempId)

          // Notificar al store correspondiente
          //      await this.notifyStoreUpdate(operation, result)

          console.log('Operación procesada exitosamente:', result)
        } catch (error) {
          console.error('Error procesando operación:', error)
          operation.retryCount = (operation.retryCount || 0) + 1
          if (operation.retryCount >= this.maxRetries) {
            console.error('Máximo de reintentos alcanzado para operación:', operation)
            this.queue = this.queue.filter((op) => op.tempId !== operation.tempId)
          }
        }
      }
    } finally {
      this.isProcessing = false
      console.log('Proceso de queue finalizado')
    }
  }

  async processOperation(operation) {
    const { type, collection, id, data, tempId } = operation
    const store = this.getStoreForCollection(collection)

    localStorage.removeItem(collection)
    useSnackbarStore().showSnackbar('Procesando queue...' + collection)

    try {
      let result
      switch (type) {
        case 'create':
          result = await pb.collection(collection).create(data)
          // Actualizar referencias temporales
          break
        case 'update':
          result = await pb.collection(collection).update(id, data)
          break
        case 'delete':
          await pb.collection(collection).delete(id)
          result = { id, deleted: true }
          break
      }

      // Notificar al store sobre el cambio
      //  await store.init()
      return result
    } catch (error) {
      console.error('Error executing operation:', error)
      throw error
    }
  }

  /*
 async updateTempReferences(collection, tempId, realId) {
    const store = this.getStoreForCollection(collection)
    if (store) {
      // Eliminar el registro temporal y agregar el real
      await store.removeLocalData(tempId)
    }
  }
  async notifyStoreUpdate(operation) {
    const store = this.getStoreForCollection(operation.collection)
    if (store) {
        await store.init()
    }
  }*/

  getStoreForCollection(collection) {
    const stores = {
      zonas: useZonasStore(),
      siembras: useSiembrasStore(),
      actividades: useActividadesStore(),
      recordatorios: useRecordatoriosStore()
    }
    return stores[collection]
  }

  async handleVersionConflict(operation) {
    // Obtener datos actuales del servidor
    const serverData = await pb.collection(operation.collection).getOne(operation.id)

    // Guardar conflicto para resolución manual si es necesario
    const conflicts = JSON.parse(localStorage.getItem('syncConflicts') || '[]')
    conflicts.push({
      timestamp: Date.now(),
      operation,
      serverData
    })
    localStorage.setItem('syncConflicts', JSON.stringify(conflicts))
  }
}
