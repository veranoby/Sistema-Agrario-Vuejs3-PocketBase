import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

export class SyncQueue {
  constructor() {
    this.queue = []
    this.maxRetries = 3
    this.version = 1
    this.isProcessing = false
  }

  async add(operation) {
    this.queue.push({
      ...operation,
      retryCount: 0,
      status: 'pending',
      timestamp: Date.now()
    })
    await this.saveQueue()
  }

  async process() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      while (this.queue.length > 0) {
        const operation = this.queue[0]

        if (operation.retryCount >= this.maxRetries) {
          this.queue.shift()
          continue
        }

        try {
          await this.executeOperation(operation)
          this.queue.shift()
        } catch (error) {
          operation.retryCount++
          operation.status = 'failed'
          operation.lastError = error.message

          handleError(error, 'Error al ejecutar la operación')

          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, operation.retryCount))
          )
        }
      }
    } finally {
      this.isProcessing = false
      await this.saveQueue()
    }
  }

  async syncPendingChanges() {
    const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges')) || []
    for (const change of pendingChanges) {
      try {
        await this.executeOperation(change)
      } catch (error) {
        handleError(error, 'Error sincronizando cambios pendientes')
      }
    }
    localStorage.removeItem('pendingChanges')
  }

  async executeOperation(operation) {
    const { type, collection, id, data } = operation

    // Verificar versión antes de ejecutar
    if (data?.version && data.version !== this.version) {
      await this.handleVersionConflict(operation)
      throw new Error('Version mismatch')
    }

    switch (type) {
      case 'create':
        return await pb.collection(collection).create(data)
      case 'update':
        return await pb.collection(collection).update(id, data)
      case 'delete':
        return await pb.collection(collection).delete(id)
      case 'createAvatar':
        return await pb.collection(collection).update(id, {
          avatar: data.file
        })
      case 'updateAvatar':
        return await pb.collection(collection).update(id, {
          avatar: data.file
        })
      case 'deleteAvatar':
        return await pb.collection(collection).update(id, {
          avatar: null
        })
      default:
        throw new Error(`Tipo de operación no soportada: ${type}`)
    }
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

  async updateLocalData(collection, data) {
    const localData = JSON.parse(localStorage.getItem(collection) || '[]')
    const index = localData.findIndex((item) => item.id === data.id)

    if (index !== -1) {
      localData[index] = { ...localData[index], ...data }
    } else {
      localData.push(data)
    }

    localStorage.setItem(collection, JSON.stringify(localData))
  }

  async cleanOldData() {
    // Eliminar operaciones completadas y antiguas
    this.queue = this.queue.filter((item) => {
      const isRecent = Date.now() - item.timestamp < 7 * 24 * 60 * 60 * 1000
      return item.status !== 'completed' && isRecent
    })

    while (JSON.stringify(this.queue).length > this.maxStorageSize) {
      this.queue.shift()
    }

    await this.saveQueue()
  }

  async saveQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(this.queue))
  }
}
