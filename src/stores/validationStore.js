import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'

export const useValidationStore = defineStore('validation', {
  state: () => ({
    validationCache: new Map()
  }),

  actions: {
    async checkFieldsTaken(fields) {
      const results = {}

      try {
        // Agrupar campos por colección
        const collections = new Map()
        fields.forEach((field) => {
          if (!collections.has(field.collection)) {
            collections.set(field.collection, [])
          }
          collections.get(field.collection).push(field)
        })

        // Procesar cada colección
        for (const [collection, fields] of collections.entries()) {
          const filters = fields
            .map((field) => `${field.field} = "${field.value.replace(/"/g, '\\"')}"`)
            .join(' || ')

          const result = await pb.collection(collection).getList(1, 1, {
            filter: filters
          })

          // Procesar resultados
          fields.forEach((field) => {
            const isTaken = result.items.some((item) => item[field.field] === field.value)
            results[field.field] = !isTaken
          })
        }

        return results
      } catch (error) {
        handleError(error, 'Error checking fields')
        return fields.reduce((acc, field) => {
          acc[field.field] = false
          return acc
        }, {})
      }
    }
  }
})
