/**
 * Service Worker para caché de Map Tiles - Offline Maps
 * 
 * Permite que los mapas funcionen offline cacheando tiles de OpenStreetMap
 * y otros proveedores de mapas.
 * 
 * Estrategia: Cache First para tiles, Network First para otras peticiones
 */

const MAP_CACHE_VERSION = 'v1'
const MAP_CACHE_NAME = `map-tiles-${MAP_CACHE_VERSION}`
const STATIC_CACHE_NAME = 'sistema-agri-static-v1'

// URLs de tiles de mapas soportados
const MAP_TILE_URLS = [
  'https://tile.openstreetmap.org',
  'https://{s}.tile.openstreetmap.org',
  'https://a.tile.openstreetmap.org',
  'https://b.tile.openstreetmap.org',
  'https://c.tile.openstreetmap.org'
]

// Configuración de caché
const CACHE_CONFIG = {
  maxTiles: 1000, // Máximo número de tiles a cachear
  maxAgeDays: 30, // Máxima edad de tiles en caché
  zoomLevels: {
    min: 10,
    max: 16
  }
}

// ============================================================================
// INSTALL EVENT - Precaché de tiles base
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[MapSW] Installing service worker...')
  
  event.waitUntil(
    caches.open(MAP_CACHE_NAME).then(async (cache) => {
      console.log('[MapSW] Cache opened:', MAP_CACHE_NAME)
      
      // Precaché de área base (Colombia central - zoom levels 10-13)
      // Limitado para no sobrecargar el caché inicial
      const tilesToCache = generateBaseTiles()
      
      console.log('[MapSW] Caching', tilesToCache.length, 'base tiles')
      
      try {
        await cache.addAll(tilesToCache.slice(0, 100)) // Limitar a 100 tiles iniciales
        console.log('[MapSW] Base tiles cached successfully')
      } catch (error) {
        console.error('[MapSW] Error caching base tiles:', error)
      }
    })
  )
  
  // Forzar activación inmediata
  self.skipWaiting()
})

// ============================================================================
// ACTIVATE EVENT - Limpieza de caché antiguo
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[MapSW] Activating service worker...')
  
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      // Limpiar cachés de mapas de versiones anteriores
      const oldMapCaches = cacheNames.filter(
        name => name.startsWith('map-tiles-') && name !== MAP_CACHE_NAME
      )
      
      await Promise.all(
        oldMapCaches.map(name => {
          console.log('[MapSW] Deleting old cache:', name)
          return caches.delete(name)
        })
      )
      
      // Tomar control de todas las páginas inmediatamente
      return self.clients.claim()
    })
  )
})

// ============================================================================
// FETCH EVENT - Estrategia de caché para tiles
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = event.request.url
  
  // Verificar si es una petición de tile de mapa
  if (isMapTileRequest(url)) {
    event.respondWith(handleMapTileRequest(event.request))
    return
  }
  
  // Para otras peticiones, usar estrategia Network First
  if (event.request.method === 'GET') {
    event.respondWith(handleOtherRequest(event.request))
  }
})

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Maneja peticiones de tiles de mapa con estrategia Cache First
 */
async function handleMapTileRequest(request) {
  const cache = await caches.open(MAP_CACHE_NAME)
  
  // Intentar obtener del caché primero
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    // Verificar edad del caché
    const isFresh = await isCacheFresh(cachedResponse)
    
    if (isFresh) {
      console.log('[MapSW] Cache HIT (fresh):', request.url)
      return cachedResponse
    } else {
      // Caché viejo, intentar actualizar en background
      console.log('[MapSW] Cache HIT (stale), updating in background:', request.url)
      
      fetch(request).then(async (response) => {
        if (response.ok) {
          await cache.put(request, response.clone())
        }
      }).catch(() => {
        // Sin conexión, devolver caché viejo
        console.log('[MapSW] No connection, serving stale cache')
      })
      
      return cachedResponse
    }
  }
  
  // No está en caché, intentar obtener de red
  console.log('[MapSW] Cache MISS, fetching from network:', request.url)
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Guardar en caché para uso futuro
      await cache.put(request, networkResponse.clone())
      
      // Limpiar caché si excede límite
      await trimCache()
    }
    
    return networkResponse
  } catch (error) {
    console.error('[MapSW] Network error for tile:', request.url, error)
    
    // Sin conexión y no está en caché - devolver placeholder
    return createPlaceholderTile()
  }
}

/**
 * Maneja otras peticiones con estrategia Network First
 */
async function handleOtherRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  
  try {
    const networkResponse = await fetch(request)
    
    // Clonar y guardar en caché si es exitoso
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Fallback a caché
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[MapSW] Fallback to cache:', request.url)
      return cachedResponse
    }
    
    throw error
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Verifica si una URL es un tile de mapa
 */
function isMapTileRequest(url) {
  return MAP_TILE_URLS.some(baseUrl => url.includes(baseUrl)) ||
         url.includes('/tile.openstreetmap.org/') ||
         url.includes('.png') && (url.includes('tile') || url.includes('map'))
}

/**
 * Genera URLs de tiles base para precaché (área de Colombia central)
 */
function generateBaseTiles() {
  const tiles = []
  const baseUrl = 'https://tile.openstreetmap.org'
  
  // Coordenadas aproximadas de Colombia central en tiles
  // Zoom 10-13 para área base
  for (let z = CACHE_CONFIG.zoomLevels.min; z <= 13; z++) {
    const tileRange = getTileRangeForColombia(z)
    
    for (let x = tileRange.xMin; x <= tileRange.xMax; x++) {
      for (let y = tileRange.yMin; y <= tileRange.yMax; y++) {
        tiles.push(`${baseUrl}/${z}/${x}/${y}.png`)
      }
    }
  }
  
  return tiles
}

/**
 * Obtiene rango de tiles para Colombia según zoom level
 */
function getTileRangeForColombia(zoom) {
  // Rangos aproximados para Colombia
  const ranges = {
    10: { xMin: 251, xMax: 255, yMin: 388, yMax: 395 },
    11: { xMin: 503, xMax: 510, yMin: 777, yMax: 790 },
    12: { xMin: 1007, xMax: 1020, yMin: 1555, yMax: 1580 },
    13: { xMin: 2015, xMax: 2040, yMin: 3110, yMax: 3160 }
  }
  
  return ranges[zoom] || { xMin: 0, xMax: 0, yMin: 0, yMax: 0 }
}

/**
 * Verifica si un caché es fresco (menos de 30 días)
 */
async function isCacheFresh(response) {
  const cachedTime = response.headers.get('sw-cache-time')
  
  if (!cachedTime) {
    return false // Sin timestamp, considerar viejo
  }
  
  const age = Date.now() - parseInt(cachedTime)
  const maxAge = CACHE_CONFIG.maxAgeDays * 24 * 60 * 60 * 1000
  
  return age < maxAge
}

/**
 * Limpia el caché si excede el límite de tiles
 */
async function trimCache() {
  const cache = await caches.open(MAP_CACHE_NAME)
  const keys = await cache.keys()
  
  if (keys.length > CACHE_CONFIG.maxTiles) {
    // Eliminar tiles más antiguos (primero en entrar)
    const deleteCount = keys.length - CACHE_CONFIG.maxTiles
    
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i])
    }
    
    console.log('[MapSW] Trimmed cache by', deleteCount, 'tiles')
  }
}

/**
 * Crea un tile placeholder gris para cuando no hay conexión
 */
async function createPlaceholderTile() {
  const canvas = new OffscreenCanvas(256, 256)
  const ctx = canvas.getContext('2d')
  
  // Fondo gris claro
  ctx.fillStyle = '#e0e0e0'
  ctx.fillRect(0, 0, 256, 256)
  
  // Texto "Offline"
  ctx.fillStyle = '#909090'
  ctx.font = '16px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Offline', 128, 128)
  
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  
  return new Response(blob, {
    headers: {
      'Content-Type': 'image/png',
      'sw-cache-time': Date.now().toString()
    }
  })
}

// Mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_TILES') {
    // Solicitar caché de tiles específicos
    cacheTilesFromClient(event.data.tiles)
  }
  
  if (event.data && event.data.type === 'CLEAR_MAP_CACHE') {
    // Limpiar caché de mapas
    caches.delete(MAP_CACHE_NAME)
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    // Reportar estado del caché
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status)
    })
  }
})

/**
 * Cachea tiles solicitados desde el cliente
 */
async function cacheTilesFromClient(tileUrls) {
  const cache = await caches.open(MAP_CACHE_NAME)
  
  try {
    const responses = await Promise.all(
      tileUrls.map(url =>
        fetch(url).catch(() => null)
      )
    )
    
    const validResponses = responses.filter(r => r && r.ok)
    
    await Promise.all(
      validResponses.map((response, index) =>
        cache.put(tileUrls[index], response.clone())
      )
    )
    
    console.log('[MapSW] Cached', validResponses.length, 'tiles from client request')
  } catch (error) {
    console.error('[MapSW] Error caching tiles from client:', error)
  }
}

/**
 * Obtiene estado del caché
 */
async function getCacheStatus() {
  const cache = await caches.open(MAP_CACHE_NAME)
  const keys = await cache.keys()
  
  return {
    tileCount: keys.length,
    maxTiles: CACHE_CONFIG.maxTiles,
    cacheName: MAP_CACHE_NAME,
    usagePercent: Math.round((keys.length / CACHE_CONFIG.maxTiles) * 100)
  }
}

console.log('[MapSW] Service Worker loaded')
