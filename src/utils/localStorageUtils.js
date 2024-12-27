import { pb } from '@/utils/pocketbase'

// Mantener funciones existentes y agregar nuevas
export function loadFromLocalStorage(key) {
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : null
}

export function saveToLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeFromLocalStorage(key) {
  localStorage.removeItem(key)
}

// Mantener las operaciones CRUD existentes
export function addPendingChange(change) {
  const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges')) || []
  pendingChanges.push(change)
  localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges))
}

export async function syncPendingChanges() {
  const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges')) || []
  for (const change of pendingChanges) {
    try {
      switch (change.type) {
        case 'createZona':
          await pb.collection('zonas').create(change.data)
          break
        case 'updateZona':
          await pb.collection('zonas').update(change.id, change.data)
          break
        case 'deleteZona':
          await pb.collection('zonas').delete(change.id)
          break
        case 'createActividad':
          await pb.collection('actividades').create(change.data)
          break
        case 'updateActividad':
          await pb.collection('actividades').update(change.id, change.data)
          break
        case 'deleteActividad':
          await pb.collection('actividades').delete(change.id)
          break
        case 'createSiembra':
          await pb.collection('siembras').create(change.data)
          break
        case 'updateSiembra':
          await pb.collection('siembras').update(change.id, change.data)
          break
        case 'deleteSiembra':
          await pb.collection('siembras').delete(change.id)
          break
        // Mantener otros casos existentes
      }
    } catch (error) {
      console.error('Error sincronizando cambios pendientes:', error)
    }
  }
  localStorage.removeItem('pendingChanges')
}

// Agregar nueva funcionalidad de versioning manteniendo compatibilidad
export const localStorageManager = {
  save(key, data) {
    const storageData = {
      version: '1.0',
      timestamp: Date.now(),
      data
    }
    saveToLocalStorage(key, storageData)
  },

  load(key) {
    const data = loadFromLocalStorage(key)
    return data?.data || data // Mantener compatibilidad con formato antiguo
  },

  remove(key) {
    removeFromLocalStorage(key)
  }
}
