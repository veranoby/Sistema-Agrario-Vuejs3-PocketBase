import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useHaciendaStore } from './haciendaStore'

export const useActividadesStore = defineStore('actividades', () => {
  const haciendaStore = useHaciendaStore()
  const actividades = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchActividades = async () => {
    loading.value = true
    error.value = null
    try {
      const records = await pb.collection('actividades').getFullList({
        sort: '-created',
        expand: 'tipo,zonas,recordatorio',
        filter: `hacienda="${haciendaStore.mi_hacienda.id}"`
      })
      actividades.value = records
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  const fetchActividadById = async (id) => {
    try {
      return await pb.collection('actividades').getOne(id, {
        expand: 'tipo,zonas,recordatorio'
      })
    } catch (err) {
      error.value = err.message
      return null
    }
  }

  const createActividad = async (actividadData) => {
    try {
      const record = await pb.collection('actividades').create(actividadData)
      await fetchActividades()
      return record
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateActividad = async (id, actividadData) => {
    try {
      const record = await pb.collection('actividades').update(id, actividadData)
      await fetchActividades()
      return record
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const deleteActividad = async (id) => {
    try {
      await pb.collection('actividades').delete(id)
      await fetchActividades()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const fetchTiposActividad = async () => {
    try {
      return await pb.collection('tipos_actividades').getFullList({
        sort: 'nombre'
      })
    } catch (err) {
      error.value = err.message
      return []
    }
  }

  const fetchMetricasDisponibles = async () => {
    // This is a placeholder. You might want to implement this based on your specific requirements
    return ['Cantidad', 'Duracion', 'Temperatura', 'Humedad', 'pH']
  }

  return {
    actividades: computed(() => actividades.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchActividades,
    fetchActividadById,
    createActividad,
    updateActividad,
    deleteActividad,
    fetchTiposActividad,
    fetchMetricasDisponibles
  }
})
