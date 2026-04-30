/**
 * cacheWarmingService.js
 * Servicio de precalentamiento de caché post-autenticación
 * Separa la lógica de warmUpCache del authStore
 */

import { tieredCache, CacheKeys } from '@/utils/cacheManager'
import { CACHE_LEVELS } from '@/constants/bpa'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useProgramacionesStore } from '@/stores/programaciones'
import { logger } from '@/utils/logger'

/**
 * Precalienta la caché tras login exitoso
 * @param {Object} user - Usuario autenticado
 * @returns {Promise<{success: boolean, elapsed?: number, itemsCached?: number, error?: string}>}
 */
export async function warmUpCache(user) {
  const startTime = Date.now()
  logger.info(`[CacheWarming] Iniciando para usuario ${user.id}`)

  try {
    const tiposActividadesStore = useActividadesStore()
    const tiposZonasStore = useZonasStore()

    await Promise.all([
      tiposActividadesStore.fetchTiposActividades({ requestKey: null }),
      tiposZonasStore.fetchTiposZonas({ requestKey: null })
    ])

    tieredCache.setToLevel(CacheKeys.tiposActividades().key, tiposActividadesStore.tiposActividades, CACHE_LEVELS.LOOKUP)
    tieredCache.setToLevel(CacheKeys.tiposZonas().key, tiposZonasStore.tiposZonas, CACHE_LEVELS.LOOKUP)

    const haciendaStore = useHaciendaStore()
    await haciendaStore.fetchHaciendas({ requestKey: null })
    const userHaciendas = haciendaStore.userHaciendas(user.id)

    userHaciendas.forEach(h => {
      tieredCache.setToLevel(`hacienda:${h.id}`, h, CACHE_LEVELS.LOOKUP)
    })

    const programacionesStore = useProgramacionesStore()
    await Promise.all(
      userHaciendas.map(async (hacienda) => {
        await programacionesStore.fetchPage(1, 100, { hacienda: hacienda.id })
        tieredCache.setToLevel(CacheKeys.programaciones(hacienda.id).key, [...programacionesStore.programaciones], CACHE_LEVELS.RECENT)
      })
    )

    const elapsed = Date.now() - startTime
    logger.info(`[CacheWarming] Completado en ${elapsed}ms`)
    return { success: true, elapsed, itemsCached: 2 + userHaciendas.length + userHaciendas.length }
  } catch (error) {
    logger.debug('[CacheWarming] Error (no crítico):', error?.message || error)
    return { success: false, error: error?.message || error }
  }
}
