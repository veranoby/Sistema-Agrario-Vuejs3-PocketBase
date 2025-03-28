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
    this.tempToRealIdMap = this.loadIdMappings()
    this.config = {
      maxRetries: 3,
      batchSize: 10,
      collectionPriority: ['siembras', 'zonas', 'actividades', 'recordatorios', 'programaciones']
    }
    this.version = 1
    this.isProcessing = false
    this.maxStorageSize = 5 * 1024 * 1024

    // Bind methods para evitar problemas de contexto
    this.sortByCollectionPriority = this.sortByCollectionPriority.bind(this)
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
    return {
      ...operation,
      data: {
        ...operation.data,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      },
      retryCount: 0,
      status: 'pending',
      timestamp: Date.now(),
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
      return
    }

    this.isProcessing = true
    console.log('Iniciando procesamiento de cola:', this.queue)

    try {
      // Verificar conexión antes de procesar
      if (!navigator.onLine) {
        throw new Error('No hay conexión a internet para procesar la cola')
      }

      // 1. Ordenar operaciones por timestamp para mantener orden de creación
      this.queue.sort((a, b) => a.createdAt - b.createdAt)

      // 2. Agrupar operaciones manteniendo prioridad: crear, actualizar, eliminar
      const [creates, updates, deletes] = this.groupOperations()
      console.log('Operaciones agrupadas:', { creates, updates, deletes })

      // 3. Procesar creaciones primero, actualizando referencias inmediatamente
      for (const op of creates) {
        try {
          // Importante: resolver referencias a IDs temporales antes de crear
          op.data = this.replaceTemporaryIdsInData(op.data)

          const result = await this.executeOperation(op)
          if (result && result.id) {
            console.log(`Creado elemento en ${op.collection}: ${op.tempId} -> ${result.id}`)

            // Guardar mapeo de IDs
            this.tempToRealIdMap[op.tempId] = result.id
            this.saveTempToRealIdMap()

            // Actualizar store correspondiente
            const store = this.getStoreForCollection(op.collection)
            if (store) {
              await store.updateLocalItem(op.tempId, result)
            }

            // Actualizar todas las operaciones pendientes con nuevos IDs
            await this.updatePendingOperations(op.tempId, result.id)
          }
        } catch (error) {
          this.handleError(op, error)
        }
      }

      // 4. Procesar actualizaciones
      for (const op of updates) {
        try {
          // Verificar si el ID existe y es válido
          if (!op.id) {
            console.warn('Operación de actualización sin ID, saltando:', op)
            continue
          }

          // Resolver ID del item a actualizar
          let originalId = op.id
          if (typeof op.id === 'string' && op.id.startsWith('temp_')) {
            const realId = this.tempToRealIdMap[op.id]
            if (!realId) {
              console.warn(`No se encontró ID real para ${op.id}, saltando actualización`)
              continue
            }
            op.id = realId
            console.log(
              `Actualización: ID temporal ${originalId} reemplazado por ID real ${realId}`
            )
          }

          // Resolver referencias a IDs temporales en los datos
          op.data = this.replaceTemporaryIdsInData(op.data)

          await this.executeOperation(op)
        } catch (error) {
          this.handleError(op, error)
        }
      }

      // 5. Procesar eliminaciones
      for (const op of deletes) {
        try {
          // Verificar si el ID existe y es válido
          if (!op.id) {
            console.warn('Operación de eliminación sin ID, saltando:', op)
            continue
          }

          if (typeof op.id === 'string' && op.id.startsWith('temp_')) {
            // Si es temporal, solo eliminar del store local
            const store = this.getStoreForCollection(op.collection)
            if (store) {
              await store.removeLocalItem(op.id)
            }
          } else {
            await this.executeOperation(op)
          }
        } catch (error) {
          this.handleError(op, error)
        }
      }

      // Limpiar cola procesada
      this.queue = this.queue.filter((op) => op.status !== 'completed')
    } catch (error) {
      console.error('Error procesando cola:', error)
    } finally {
      this.isProcessing = false
    }
  }

  groupOperations() {
    return [
      this.queue.filter((op) => op.type === 'create'),
      this.queue.filter((op) => op.type === 'update'),
      this.queue.filter((op) => op.type === 'delete')
    ]
  }

  sortByCollectionPriority(a, b) {
    return (
      this.config.collectionPriority.indexOf(a.collection) -
      this.config.collectionPriority.indexOf(b.collection)
    )
  }

  async executeOperation(op) {
    const { type, collection, id, data } = op

    // Para creaciones, usar el ID temporal directamente
    if (type === 'create') {
      try {
        // Eliminar el ID temporal antes de enviar a PocketBase
        const dataToSend = { ...data }
        if (dataToSend.id && dataToSend.id.startsWith('temp_')) {
          delete dataToSend.id
        }

        // Resolver referencias a IDs temporales en los datos
        const resolvedData = this.replaceTemporaryIdsInData(dataToSend)

        console.log(`Creando registro en ${collection} con datos:`, resolvedData)
        const record = await pb.collection(collection).create(resolvedData)

        // Marcar como completada
        op.status = 'completed'

        return record
      } catch (error) {
        console.error('Error creando registro:', error)
        throw error
      }
    }

    // Para actualizaciones y eliminaciones, resolver el ID real
    const resolvedId = this.resolveRealId(id)
    if (!resolvedId) {
      throw new Error(`No se pudo resolver ID para ${id}`)
    }

    try {
      let result
      switch (type) {
        case 'update':
          result = await pb.collection(collection).update(resolvedId, data)
          break
        case 'delete':
          result = await pb.collection(collection).delete(resolvedId)
          break
        default:
          throw new Error(`Operación no soportada: ${type}`)
      }

      // Marcar como completada
      op.status = 'completed'

      return result
    } catch (error) {
      console.error(`Error en operación ${type} para ${collection}:`, error)
      throw error
    }
  }

  // Helpers de IDs
  resolveRealId(tempId) {
    // Si no es un ID temporal, devolverlo directamente
    if (!tempId || typeof tempId !== 'string') return tempId
    if (!tempId.startsWith('temp_')) return tempId

    // Buscar mapeo directo
    const directMatch = this.tempToRealIdMap[tempId]
    if (directMatch) return directMatch

    // Buscar por prefijo
    const prefix = tempId.split('_').slice(0, 3).join('_')
    const match = Object.keys(this.tempToRealIdMap).find((k) => k.startsWith(prefix))

    return match ? this.tempToRealIdMap[match] : null
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

  handleError(op, error) {
    console.error('Error procesando operación:', op, error)
    if (error.response && error.response.data) {
      console.error('Detalles del error:', error.response.data)
    }

    // Incrementar contador de reintentos
    op.retryCount = (op.retryCount || 0) + 1
    if (op.retryCount >= this.config.maxRetries) {
      // Eliminar operaciones relacionadas si la operación falla definitivamente
      const failedTempId = op.tempId
      if (failedTempId) {
        const relatedOps = this.queue.filter(
          (op) =>
            op.id === failedTempId ||
            (op.id &&
              typeof op.id === 'string' &&
              op.id.startsWith(failedTempId.split('_').slice(0, 2).join('_')))
        )

        console.log(`Eliminando ${relatedOps.length} operaciones relacionadas con ${failedTempId}`)
        for (const relOp of relatedOps) {
          this.queue = this.queue.filter((op) => op.tempId !== relOp.tempId)
        }

        this.queue = this.queue.filter((op) => op.tempId !== failedTempId)
      }
    }
  }

  async applyPendingUpdates(createOp, newId) {
    if (!createOp || !createOp.tempId || !newId) return

    console.log(
      `Buscando actualizaciones pendientes para el ID temporal ${createOp.tempId} (ID real: ${newId})`
    )

    // Extraer información del ID temporal para buscar coincidencias
    const tempIdInfo = this.extractTempIdInfo(createOp.tempId)

    if (!tempIdInfo) {
      console.warn(`No se pudo extraer información del ID temporal ${createOp.tempId}`)
      return
    }

    // Buscar actualizaciones pendientes para este ID temporal
    const pendingUpdates = this.queue.filter((op) => {
      // Si es una actualización...
      if (op.type !== 'update') return false

      // Coincidencia exacta del ID
      if (op.id === createOp.tempId) return true

      // Buscar coincidencias parciales basadas en colección y timestamp
      return this.isRelatedTempId(op.id, tempIdInfo)
    })

    if (pendingUpdates.length === 0) {
      console.log(`No se encontraron actualizaciones pendientes para ${createOp.tempId}`)
      return
    }

    console.log(
      `Encontradas ${pendingUpdates.length} actualizaciones pendientes para el ID temporal ${createOp.tempId}`
    )

    // Ordenar por timestamp para aplicar en orden
    pendingUpdates.sort((a, b) => a.createdAt - b.createdAt)

    // Aplicar cada actualización
    for (const updateOp of pendingUpdates) {
      try {
        // Actualizar el ID de la operación al ID real
        const originalId = updateOp.id
        updateOp.id = newId

        // Reemplazar referencias a IDs temporales en los datos
        updateOp.data = this.replaceTemporaryIdsInData(updateOp.data)

        // Ejecutar la actualización
        console.log(
          `Aplicando actualización pendiente para ${createOp.collection} con ID ${newId}:`,
          updateOp.data
        )
        await this.executeOperation(updateOp)

        // Actualizar el mapeo de IDs temporales
        if (originalId !== createOp.tempId) {
          this.tempToRealIdMap[originalId] = newId
          this.saveTempToRealIdMap()
        }

        // Eliminar la operación de la cola después de aplicarla
        const index = this.queue.findIndex((op) => op === updateOp)
        if (index !== -1) {
          this.queue.splice(index, 1)
        }
      } catch (error) {
        console.error(`Error aplicando actualización pendiente para ${createOp.collection}:`, error)
      }
    }

    // Guardar el estado de la cola
    this.saveState()
  }

  // Actualiza las referencias a IDs temporales en operaciones pendientes
  async updatePendingOperations(tempId, realId) {
    if (!tempId || !realId) {
      console.warn('Se requieren ambos IDs para actualizar operaciones pendientes')
      return 0
    }

    console.log(
      `Actualizando operaciones pendientes con ID temporal: ${tempId} -> ID real: ${realId}`
    )

    // Extraer información del ID temporal para comparaciones
    const tempIdInfo = this.extractTempIdInfo(tempId)

    if (!tempIdInfo) {
      console.warn(`No se pudo extraer información del ID temporal ${tempId}`)
      return 0
    }

    let updatedCount = 0

    // Actualizar todas las operaciones pendientes en la cola
    for (const op of this.queue) {
      let updated = false

      // 1. Actualizar IDs en operaciones de actualización y eliminación
      if ((op.type === 'update' || op.type === 'delete') && op.id) {
        // Verificar coincidencia exacta
        if (op.id === tempId) {
          op.id = realId
          updated = true
          console.log(`Actualizado ID en operación ${op.type}: ${tempId} -> ${realId}`)
        }
        // Verificar coincidencia por información de ID temporal
        else if (tempIdInfo && typeof op.id === 'string' && op.id.startsWith('temp_')) {
          const opIdInfo = this.extractTempIdInfo(op.id)
          if (opIdInfo && this.areRelatedTempIds(tempIdInfo, opIdInfo)) {
            console.log(
              `Coincidencia parcial encontrada: ${op.id} parece estar relacionado con ${tempId}`
            )
            op.id = realId
            updated = true
          }
        }
      }

      // 2. Actualizar referencias en datos de operaciones
      if (op.data) {
        const originalData = JSON.stringify(op.data)
        op.data = this.replaceTemporaryIdsInData(op.data)
        if (JSON.stringify(op.data) !== originalData) {
          updated = true
        }
      }

      if (updated) {
        updatedCount++
      }
    }

    if (updatedCount > 0) {
      this.saveState()
      console.log(`Actualizadas ${updatedCount} operaciones pendientes con ID real ${realId}`)
    }

    return updatedCount
  }

  // Extrae información de un ID temporal
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
