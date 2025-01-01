import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useSyncStore } from './syncStore'

import placeholderUser from '@/assets/placeholder-user.png'
import placeholderHacienda from '@/assets/placeholder-hacienda.png'
import placeholderZonas from '@/assets/placeholder-zonas.png'
import placeholderSiembras from '@/assets/placeholder-siembras.png'
import placeholderActividades from '@/assets/placeholder-actividades.png'

export const useAvatarStore = defineStore('avatar', {
  state: () => ({
    baseImageUrl: pb.baseUrl + '/api/files',
    defaultAvatars: {
      user: placeholderUser,
      hacienda: placeholderHacienda,
      zona: placeholderZonas,
      siembra: placeholderSiembras,
      actividad: placeholderActividades
    }
  }),

  actions: {
    getAvatarUrl(entity, collectionId) {
      if (!entity || !entity.avatar) {
        console.log('enviando placeholder:', entity.type)
        return this.defaultAvatars[entity.type] || this.defaultAvatars.user
      }
      //   console.log('enviando avatar:', entity.avatar)

      return `${this.baseImageUrl}/${collectionId}/${entity.id}/${entity.avatar}`
    },

    async saveAvatar(collection, id, avatarFile) {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        await syncStore.queueOperation({
          type: avatarFile ? 'updateAvatar' : 'createAvatar',
          collection,
          id,
          file: avatarFile
        })
        return
      }

      snackbarStore.showLoading()
      try {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const updatedRecord = await pb.collection(collection).update(id, formData)

        // Actualizar en localStorage
        const storageKey = `${collection}_${id}`
        syncStore.saveToLocalStorage(storageKey, updatedRecord)

        return updatedRecord
      } catch (error) {
        handleError(
          error,
          `Error al ${avatarFile ? 'actualizar' : 'crear'} avatar de ${collection}`
        )
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async deleteAvatar(collection, id) {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        await syncStore.queueOperation({
          type: 'deleteAvatar',
          collection,
          id
        })
        return
      }

      snackbarStore.showLoading()
      try {
        const formData = new FormData()
        formData.append('avatar', '')

        const data = {
          avatar: ''
        }

        const updatedRecord = await pb.collection(collection).update(id, data)
        return updatedRecord
      } catch (error) {
        handleError(error, `Error al eliminar avatar de ${collection}`)
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async handleAvatarOperation(operation, collection, id, avatarFile = null) {
      switch (operation) {
        case 'create':
        case 'update':
          return this.saveAvatar(collection, id, avatarFile)
        case 'delete':
          return this.deleteAvatar(collection, id)
        default:
          throw new Error('Operación de avatar no válida')
      }
    }
  }
})
