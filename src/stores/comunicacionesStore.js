import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useAuthStore } from '@/stores/authStore'
import { handleError } from '@/utils/errorHandler'

export const useComunicacionesStore = defineStore('comunicaciones', {
  state: () => ({
    mensajes: [],
    loading: false
  }),
  
  getters: {
    mensajesOrdenados: (state) => {
      return [...state.mensajes].sort((a, b) => new Date(a.created) - new Date(b.created))
    }
  },
  
  actions: {
    async fetchMensajesByVinculacion(vinculacionId) {
      if (!vinculacionId) return []
      
      this.loading = true
      try {
        const records = await pb.collection('comunicaciones_asesoria').getFullList({
          filter: `vinculacion_id="${vinculacionId}"`,
          sort: 'created',
          expand: 'emisor_id,paquete_id'
        })
        this.mensajes = records
        return records
      } catch (error) {
        handleError(error, 'Error al cargar el hilo de comunicaciones')
        return []
      } finally {
        this.loading = false
      }
    },
    
    async enviarMensaje(vinculacionId, mensaje, paqueteId = null, fotos = []) {
      const authStore = useAuthStore()
      if (!authStore.user) return null
      
      this.loading = true
      try {
        let payload
        if (fotos && fotos.length > 0) {
          payload = new FormData()
          payload.append('vinculacion_id', vinculacionId)
          payload.append('emisor_id', authStore.user.id)
          payload.append('mensaje', mensaje)
          payload.append('leido', false)
          
          if (paqueteId) {
            payload.append('paquete_id', paqueteId)
          }
          
          for (const foto of fotos) {
            payload.append('fotos', foto)
          }
        } else {
          payload = {
            vinculacion_id: vinculacionId,
            emisor_id: authStore.user.id,
            mensaje: mensaje,
            leido: false
          }
          if (paqueteId) {
            payload.paquete_id = paqueteId
          }
        }
        
        const record = await pb.collection('comunicaciones_asesoria').create(payload)
        
        // Expand manually for the immediate UI update
        const fullRecord = await pb.collection('comunicaciones_asesoria').getOne(record.id, {
          expand: 'emisor_id,paquete_id'
        })
        
        this.mensajes.push(fullRecord)
        return fullRecord
      } catch (error) {
        handleError(error, 'Error al enviar el mensaje')
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async marcarComoLeido(mensajeId) {
      try {
        await pb.collection('comunicaciones_asesoria').update(mensajeId, { leido: true })
        const idx = this.mensajes.findIndex(m => m.id === mensajeId)
        if (idx !== -1) {
          this.mensajes[idx].leido = true
        }
      } catch (error) {
        console.warn('Error marcando mensaje como leído:', error)
      }
    }
  }
})
