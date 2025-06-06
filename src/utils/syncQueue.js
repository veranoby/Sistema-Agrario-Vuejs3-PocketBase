import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

import { useZonasStore } from '@/stores/zonasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useAuthStore } from '@/stores/authStore'

export class SyncQueue {
  constructor() {
    this.queue = []
    this.tempToRealIdMap = this.loadIdMappings()
    this.config = {
      maxRetries: 3,
      batchSize: 10
      // collectionPriority: ['siembras', 'zonas', 'actividades', 'recordatorios', 'programaciones'] // Removed
    }
    this.version = 1
    this.isProcessing = false
    this.maxStorageSize = 5 * 1024 * 1024

    // Bind methods para evitar problemas de contexto
    // this.sortByCollectionPriority = this.sortByCollectionPriority.bind(this) // Removed
  }

  // Carga inicial
  loadIdMappings() {
    try {
      return JSON.parse(localStorage.getItem('tempToRealIdMap')) || {}
    } catch (e) {
      console.error('Error cargando mapeo de IDs:', e)
      return {}
    }
  }

  // Guardar mapeo de IDs en localStorage
  saveTempToRealIdMap() {
    try {
      localStorage.setItem('tempToRealIdMap', JSON.stringify(this.tempToRealIdMap))
    } catch (e) {
      console.error('Error al guardar mapeo de IDs temporales:', e)
    }
  }

  async add(operation) {
    // Asegurar ID temporal para creaciones
    if (operation.type === 'create') {
      const tempId = this.generateConsistentTempId()
      operation.tempId = tempId

      // Asegurarse de que data exista antes de asignar el ID
      if (!operation.data) {
        operation.data = {}
      }
      operation.data.id = tempId // Guardar ID temporal en los datos
    }

    const enrichedOp = this.enrichOperation(operation)

    // Añadir timestamp para mantener orden de creación
    enrichedOp.createdAt = Date.now()

    this.queue.push(enrichedOp)
    this.saveState()
    return enrichedOp.tempId
  }

  enrichOperation(operation) {
    const haciendaStore = useHaciendaStore()
    const authStore = useAuthStore()

    return {
      ...operation,
      data: {
        ...operation.data,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      },
      userId: authStore.user?.id || null,
      retryCount: 0,
      status: 'pending',
      timestamp: Date.now(),
      createdAt: Date.now(),
      priority: this.calculatePriority(operation.type)
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
    if (this.isProcessing) {
      console.log('Ya hay un procesamiento en curso, saltando...')
      return { createdItems: [], updatedItems: [], deletedItems: [] } // Early exit with summary
    }

    this.isProcessing = true
    let createdItems = []
    let updatedItems = []
    let deletedItems = []
    console.log('Iniciando procesamiento de cola:', JSON.parse(JSON.stringify(this.queue)))

    try {
      if (!navigator.onLine) {
        throw new Error('No hay conexión a internet para procesar la cola')
      }

      const authStore = useAuthStore()
      const currentUserId = authStore.user?.id

      // Define a working queue for current processing run.
      // Filter by current user (if any) and ensure we only attempt to process 'pending' operations.
      let workQueue = []
      if (currentUserId) {
        workQueue = this.queue.filter(
          (op) => (!op.userId || op.userId === currentUserId) && op.status === 'pending'
        )
        console.log(
          `Procesando ${workQueue.length} operaciones pendientes para usuario ${currentUserId}`
        )
      } else {
        workQueue = this.queue.filter((op) => !op.userId && op.status === 'pending')
        console.log(`Procesando ${workQueue.length} operaciones pendientes sin usuario asignado`)
      }

      if (workQueue.length === 0) {
        console.log('No hay operaciones pendientes para procesar.')
        this.isProcessing = false
        return { createdItems, updatedItems, deletedItems }
      }

      // Create Pass
      const createOps = workQueue
        .filter((op) => op.type === 'create') // Already filtered by status === 'pending'
        .sort((a, b) => a.createdAt - b.createdAt)

      if (createOps.length > 0) {
        console.log('Create Pass - Operaciones:', JSON.parse(JSON.stringify(createOps)))
        for (let i = 0; i < createOps.length; i += this.config.batchSize) {
          const clientBatchOps = createOps.slice(i, i + this.config.batchSize)
          // clientBatchOps are guaranteed to be 'create' and 'pending'

          const pbBatch = pb.createBatch()
          clientBatchOps.forEach((op) => {
            const dataToSend = { ...op.data }
            if (dataToSend.id && typeof dataToSend.id === 'string' && dataToSend.id.startsWith('temp_')) {
              delete dataToSend.id
            }
            const resolvedData = this.replaceTemporaryIdsInData(dataToSend) // General mode
            pbBatch.collection(op.collection).create(resolvedData)
          })

          try {
            console.log(`Create Pass - Enviando batch de ${clientBatchOps.length} operaciones`)
            const results = await pbBatch.send()
            console.log('Create Pass - Resultados del batch:', JSON.parse(JSON.stringify(results)))

            for (let j = 0; j < results.length; j++) {
              const createdRecord = results[j]
              const originalOp = clientBatchOps[j] // op from our workQueue

              if (createdRecord && createdRecord.id) {
                this.tempToRealIdMap[originalOp.tempId] = createdRecord.id
                originalOp.status = 'completed' // Mark as completed in the workQueue/original queue
                createdItems.push({ tempId: originalOp.tempId, realItem: createdRecord })
                await this.updatePendingOperations(originalOp.tempId, createdRecord.id)
              } else {
                console.error('Create Pass - Resultado inesperado para op:', originalOp, 'Resultado:', createdRecord)
                this.handleBatchError([originalOp], new Error('Resultado inesperado en batch de creación'))
              }
            }
            this.saveTempToRealIdMap()
          } catch (batchError) {
            console.error('Error en Create Pass batch:', batchError)
            this.handleBatchError(clientBatchOps, batchError)
          }
        }
      } else {
        console.log('Create Pass - No hay operaciones de creación.')
      }

      // Update/Delete Pass
      // We need to re-evaluate from workQueue which operations are *still* pending for update/delete,
      // as some create operations might have resolved dependencies or some ops might have failed.
      const updateDeleteOps = workQueue // workQueue items' statuses might have changed
        .filter((op) => (op.type === 'update' || op.type === 'delete') && op.status === 'pending')
        .sort((a, b) => a.createdAt - b.createdAt)

      if (updateDeleteOps.length > 0) {
        console.log('Update/Delete Pass - Operaciones:', JSON.parse(JSON.stringify(updateDeleteOps)))
        for (let i = 0; i < updateDeleteOps.length; i += this.config.batchSize) {
          const clientBatchOps = updateDeleteOps.slice(i, i + this.config.batchSize)
          // clientBatchOps are 'update' or 'delete' and still 'pending'

          const pbBatch = pb.createBatch()
          const validClientBatchOps = []
            const opsWithResolvedIds = [] // Store ops with their resolved IDs for later use

          for (const op of clientBatchOps) {
            let resolvedMainId = op.id
            if (typeof op.id === 'string' && op.id.startsWith('temp_')) {
              resolvedMainId = this.tempToRealIdMap[op.id]
              if (!resolvedMainId) {
                console.warn(`Update/Delete Pass: ID real para ${op.id} (op ${op.type} en ${op.collection}) no encontrado. Saltando del batch.`)
                continue
              }
            }
            if (!resolvedMainId) {
              console.warn(`Update/Delete Pass: ID principal nulo/inválido para ${op.type} en ${op.collection} (ID: ${op.id}). Saltando.`)
              continue
            }
            
            const resolvedDataPayload = this.replaceTemporaryIdsInData(op.data) // General mode

            if (op.type === 'update') {
              pbBatch.collection(op.collection).update(resolvedMainId, resolvedDataPayload)
                opsWithResolvedIds.push({ ...op, resolvedMainId, resolvedDataPayload })
            } else if (op.type === 'delete') {
              pbBatch.collection(op.collection).delete(resolvedMainId)
                opsWithResolvedIds.push({ ...op, resolvedMainId })
            }
              validClientBatchOps.push(op) // Still push original op to validClientBatchOps for status update
          }

            if (opsWithResolvedIds.length === 0) { // Check opsWithResolvedIds instead of validClientBatchOps
            console.log('Update/Delete Pass - No hay operaciones válidas en este batch para enviar.')
            continue
          }

          try {
            console.log(`Update/Delete Pass - Enviando batch de ${opsWithResolvedIds.length} operaciones`)
            await pbBatch.send()
            console.log('Update/Delete Pass - Batch enviado exitosamente.')
            
            // Iterate over opsWithResolvedIds to correctly populate updatedItems and deletedItems
            opsWithResolvedIds.forEach((opDetails) => {
              // Find the original operation in validClientBatchOps to update its status
              const originalOp = validClientBatchOps.find(vOp => vOp.tempId === opDetails.tempId || vOp.id === opDetails.id);
              if (originalOp) {
                originalOp.status = 'completed' // Mark as completed in workQueue/original queue

                if (opDetails.type === 'update') {
                  updatedItems.push({
                    id: opDetails.resolvedMainId,
                    updatedItem: opDetails.resolvedDataPayload,
                    collection: opDetails.collection
                  })
                } else if (opDetails.type === 'delete') {
                  deletedItems.push({
                    id: opDetails.resolvedMainId,
                    collection: opDetails.collection
                  })
                }
              } else {
                console.warn("Update/Delete Pass: No se encontró la operación original para marcar como completada después del batch:", opDetails);
              }
            })
          } catch (batchError) {
            console.error('Error en Update/Delete Pass batch:', batchError)
            this.handleBatchError(validClientBatchOps, batchError)
          }
        }
      } else {
        console.log('Update/Delete Pass - No hay operaciones de actualización/eliminación.')
      }

      // Final queue cleanup: remove all 'completed' ops from the main this.queue
      this.queue = this.queue.filter((op) => op.status !== 'completed')
      // Failed operations (maxRetries exceeded) will also be filtered here if their status is 'failed'
      this.queue = this.queue.filter((op) => op.status !== 'failed')

      this.saveState() // Saves the potentially modified main queue and the ID map
    } catch (error) {
      console.error('Error general procesando cola:', error)
    } finally {
      this.isProcessing = false
      console.log('Procesamiento de cola finalizado. Estado actual de this.queue:', JSON.parse(JSON.stringify(this.queue)))
      console.log('Estado actual del mapeo de IDs:', JSON.parse(JSON.stringify(this.tempToRealIdMap)))
      return { createdItems, updatedItems, deletedItems }
    }
  }

  // groupOperations y sortByCollectionPriority eliminados

  // executeOperation ya no es necesaria, su lógica está en el loop de process
  // async executeOperation(op) { ... }


  // Helpers de IDs
  resolveRealId(tempId) {
    // Si no es un ID temporal, devolverlo directamente
    if (!tempId || typeof tempId !== 'string') return tempId
    if (!tempId.startsWith('temp_')) return tempId

    // Buscar mapeo directo
    const directMatch = this.tempToRealIdMap[tempId];
    if (directMatch) {
      return directMatch;
    }

    // If no direct match is found, resolution has failed for this tempId.
    return null;
  }

  // Verifica si dos IDs temporales están relacionados
  isRelatedTempId(id1, id2) {
    if (!id1 || !id2 || typeof id1 !== 'string' || typeof id2 !== 'string') return false
    if (!id1.startsWith('temp_') || !id2.startsWith('temp_')) return false

    // Verificar si los IDs tienen el mismo prefijo y timestamp
    const parts1 = id1.split('_')
    const parts2 = id2.split('_')
    return parts1[1] === parts2[1] && parts2[2] === parts2[2]
  }

  // Método optimizado para reemplazar IDs temporales en datos
  replaceTemporaryIdsInData(data) {
    if (!data || typeof data !== 'object') return data

    const self = this

    // Función recursiva simplificada para reemplazar IDs
    function processValue(value) {
      // Caso base: no es un objeto ni un string con temp_
      if (!value || typeof value !== 'object') {
        if (typeof value === 'string' && value.startsWith('temp_')) {
          // Buscar el ID real en el mapa
          const mappedValue = self.resolveRealId(value)
          if (mappedValue !== value) {
            console.log(`Reemplazando ID temporal: ${value} -> ${mappedValue}`)
            return mappedValue
          }
        }
        return value
      }

      // Si es un array, procesar cada elemento
      if (Array.isArray(value)) {
        return value.map((item) => processValue(item))
      }

      // Si es un objeto, procesar cada propiedad
      const result = { ...value }
      for (const key in result) {
        result[key] = processValue(result[key])
      }

      return result
    }

    return processValue(data)
  }

  cleanupOldMappings() {
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

    for (const [tempId, realId] of Object.entries(this.tempToRealIdMap)) {
      const timestamp = parseInt(tempId.split('_')[1])
      if (timestamp && timestamp < oneWeekAgo) {
        delete this.tempToRealIdMap[tempId]
      }
    }

    this.saveTempToRealIdMap()
  }

  // Método para eliminar operaciones duplicadas
  removeDuplicateOperations() {
    const uniqueOps = {}
    const newQueue = []

    // Mantener solo la última operación para cada entidad
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const op = this.queue[i]
      const key = `${op.type}_${op.collection}_${op.id || op.tempId}`

      if (!uniqueOps[key]) {
        uniqueOps[key] = true
        newQueue.unshift(op)
      } else {
        console.log(`Eliminando operación duplicada: ${key}`)
      }
    }

    this.queue = newQueue
  }

  handleSuccess(op, result) {
    // Implementa la lógica para manejar un resultado exitoso
    console.log('Operación exitosa:', op, result)
  }

  handleSuccess(op, result) {
    // Implementa la lógica para manejar un resultado exitoso
    console.log('Operación exitosa:', op, result)
  }

  // handleError se reemplaza o complementa con handleBatchError
  // La lógica de reintentos individuales se mantiene si una op falla repetidamente en batches
  handleError(op, error) {
    console.error('Error procesando operación individualmente (fuera de un batch):', op, error)
    if (error.response && error.response.data) {
      console.error('Detalles del error individual:', error.response.data)
    }
    op.retryCount = (op.retryCount || 0) + 1
    if (op.retryCount >= this.config.maxRetries) {
      op.status = 'failed' // Marcar como fallida permanentemente
      console.warn(
        `Operación ${op.type} para ${op.collection} ID ${
          op.id || op.tempId
        } ha fallado ${this.config.maxRetries} veces. Marcada como 'failed'.`
      )
    }
    // La limpieza de operaciones 'failed' se hará en la limpieza general de la cola al final de process().
  }

  handleBatchError(operationsInFailedBatch, error) {
    console.error(
      'Error en batch PocketBase:',
      error,
      'Operaciones afectadas:',
      JSON.parse(JSON.stringify(operationsInFailedBatch))
    )

    // Intentar obtener más detalles del error si es una instancia de ClientResponseError de PocketBase
    if (error && error.isAbort === false && error.status !== 0 && typeof error.data === 'object') {
      console.error('Detalles del error de batch (PocketBase ClientResponseError):', error.data)
      // TODO: Considerar si el error.data de PocketBase puede indicar qué operaciones específicas del batch fallaron.
      // Si es así, se podría aplicar retryCount/failed status solo a esas. Por ahora, se aplica a todas en el batch.
    }

    operationsInFailedBatch.forEach((op) => {
      op.retryCount = (op.retryCount || 0) + 1
      console.log(
        `Incrementado retryCount para op (ID: ${op.tempId || op.id}, Colección: ${
          op.collection
        }) a ${op.retryCount}. Status actual: ${op.status}`
      )
      if (op.retryCount >= this.config.maxRetries && op.status !== 'completed') { // No marcar como failed si de alguna manera se completó
        op.status = 'failed'
        console.warn(
          `Operación ${op.type} para ${op.collection} ID ${
            op.id || op.tempId
          } ha fallado ${
            this.config.maxRetries
          } veces tras error de batch. Marcada como 'failed'.`
        )
      }
    })
  }

  // applyPendingUpdates es obsoleta y se elimina. updatePendingOperations es la sucesora.

  async updatePendingOperations(tempIdJustCreated, newRealId) {
    if (!tempIdJustCreated || !newRealId) {
      console.warn(
        'updatePendingOperations: Se requieren tempIdJustCreated y newRealId.'
      )
      return 0
    }

    console.log(
      `updatePendingOperations: Actualizando todas las operaciones pendientes en la cola global usando el mapeo: ${tempIdJustCreated} -> ${newRealId}`
    )

    let updatedCount = 0

    for (const op of this.queue) {
      // Solo procesar operaciones que aún no están completadas o fallidas.
      if (op.status === 'completed' || op.status === 'failed') {
        continue
      }

      let modifiedByThisUpdate = false

      // 1. Actualizar el ID principal de la operación (si es 'update' o 'delete' y su ID era tempIdJustCreated)
      if (
        (op.type === 'update' || op.type === 'delete') &&
        op.id === tempIdJustCreated
      ) {
        console.log(
          `  - En op ${op.type} (ID: ${op.id}, Colección: ${op.collection}), actualizando ID principal a ${newRealId}`
        )
        op.id = newRealId
        modifiedByThisUpdate = true
      }

      // 2. Actualizar CUALQUIER referencia a tempIdJustCreated DENTRO del payload op.data
      if (op.data && typeof op.data === 'object') {
        const originalDataSnapshot = JSON.stringify(op.data)
        // Usamos la versión de replaceTemporaryIdsInData que reemplaza un ID específico.
        op.data = this.replaceTemporaryIdsInData(op.data, tempIdJustCreated, newRealId)

        if (JSON.stringify(op.data) !== originalDataSnapshot) {
          console.log(
            `  - En op ${op.type} (ID: ${op.id || op.tempId}, Colección: ${op.collection}), datos internos actualizados para reflejar ${tempIdJustCreated} -> ${newRealId}`
          )
          modifiedByThisUpdate = true
        }
      }

      if (modifiedByThisUpdate) {
        updatedCount++
      }
    }

    if (updatedCount > 0) {
      console.log(
        `updatePendingOperations: ${updatedCount} operaciones pendientes fueron actualizadas con el mapeo ${tempIdJustCreated} -> ${newRealId}.`
      )
      // No llamamos a this.saveState() aquí, se llamará al final de process() o saveTempToRealIdMap().
    }
    return updatedCount
  }

  // replaceTemporaryIdsInData:
  // - Si specificTempIdToReplace y newRealId se proporcionan, solo reemplaza esa instancia.
  // - Si no, usa this.tempToRealIdMap para reemplazar todos los IDs temporales conocidos (modo general).
  replaceTemporaryIdsInData(data, specificTempIdToReplace = null, newRealId = null) {
    if (!data) return data

    // Caso 1: Reemplazo específico de un ID temporal
    if (specificTempIdToReplace && newRealId) {
      if (typeof data === 'string' && data === specificTempIdToReplace) {
        // console.log(`Reemplazo específico: ${specificTempIdToReplace} -> ${newRealId}`)
        return newRealId
      }
      if (Array.isArray(data)) {
        return data.map((item) =>
          this.replaceTemporaryIdsInData(item, specificTempIdToReplace, newRealId)
        )
      }
      if (typeof data === 'object') {
        const result = { ...data }
        for (const key in result) {
          result[key] = this.replaceTemporaryIdsInData(
            result[key],
            specificTempIdToReplace,
            newRealId
          )
        }
        return result
      }
      return data
    }

    // Caso 2: Modo general - reemplazar todos los IDs temporales conocidos usando this.tempToRealIdMap
    if (typeof data === 'string' && data.startsWith('temp_')) {
      const mappedValue = this.tempToRealIdMap[data] // Usar el mapa general
      if (mappedValue) {
        // console.log(`Reemplazo general: ${data} -> ${mappedValue}`)
        return mappedValue
      }
      return data // Si no está en el mapa, devolver el temp_ id original
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.replaceTemporaryIdsInData(item)) // Llamada recursiva en modo general
    }

    if (typeof data === 'object') {
      const result = { ...data }
      for (const key in result) {
        result[key] = this.replaceTemporaryIdsInData(result[key]) // Llamada recursiva en modo general
      }
      return result
    }

    return data
  }

  // Extrae información de un ID temporal - Esta función ya no es crítica con la nueva lógica de reemplazo,
  // pero se mantiene por si es útil para debugging o extensiones futuras.
  extractTempIdInfo(tempId) {
    if (!tempId || typeof tempId !== 'string' || !tempId.startsWith('temp_')) {
      return null
    }

    const parts = tempId.split('_')
    let timestamp

    // Formato nuevo simplificado: temp_TIMESTAMP_RANDOM
    if (parts.length === 3) {
      timestamp = parseInt(parts[1])
    } else {
      // Formatos antiguos
      if (parts.length === 4) {
        // Formato anterior: temp_COLLECTION_TIMESTAMP_RANDOM
        timestamp = parseInt(parts[2])
      } else if (parts.length === 3 && isNaN(parseInt(parts[1]))) {
        // Formato antiguo con prefijo: temp_PREFIX_TIMESTAMP
        timestamp = parseInt(parts[2])
      } else {
        // Cualquier otro formato
        timestamp = parseInt(parts[1])
      }
    }

    if (isNaN(timestamp)) {
      console.warn(`No se pudo extraer timestamp válido del ID temporal: ${tempId}`)
      return null
    }

    // Ya no usamos colección, solo timestamp para comparaciones
    return { timestamp }
  }

  // Verifica si dos informaciones de ID temporal están relacionadas
  areRelatedTempIds(info1, info2) {
    if (!info1 || !info2) return false

    // Ya no verificamos colección, solo comparamos timestamps
    // Verificar si los timestamps están cercanos (dentro de 5 segundos)
    const timestampDiff = Math.abs(info1.timestamp - info2.timestamp)
    return timestampDiff < 5000 // 5 segundos de diferencia
  }

  // Método auxiliar para normalizar nombres de colección
  normalizeCollectionName(prefix) {
    if (!prefix) return ''

    // Simplemente devolver el nombre de la colección en minúsculas
    // para asegurar consistencia
    return prefix.toLowerCase()
  }

  // Genera un ID temporal consistente sin usar prefijos de colección
  generateConsistentTempId() {
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substr(2, 6)

    // Formato simple y consistente: temp_TIMESTAMP_RANDOM
    return `temp_${timestamp}_${randomPart}`
  }

  // State management
  saveState() {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.queue))
      localStorage.setItem('tempToRealIdMap', JSON.stringify(this.tempToRealIdMap))
    } catch (e) {
      console.error('Error al guardar estado:', e)
    }
  }

  getStoreForCollection(collection) {
    const stores = {
      zonas: useZonasStore(),
      siembras: useSiembrasStore(),
      actividades: useActividadesStore(),
      recordatorios: useRecordatoriosStore()
    }
    return stores[collection]
  }
}
