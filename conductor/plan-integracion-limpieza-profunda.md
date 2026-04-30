Plan Optimizado Final                                                                                               

Fase 23: Corrección de Emergencia                                                                                   

Paso 1: Corregir src/utils/cacheManager.js                                                                          

Agregar invalidatePattern a CacheManager:                                                                           

                                                                                                                    
/**                                                                                                                 
 * Invalida entradas que coincidan con un patrón                                                                    
 * @param {string} pattern - Patrón de clave a invalidar                                                            
 */                                                                                                                 
invalidatePattern(pattern) {                                                                                        
  const keysToDelete = []                                                                                           
  for (const key of this.cache.keys()) {                                                                            
    if (key.includes(pattern)) {                                                                                    
      keysToDelete.push(key)                                                                                        
    }                                                                                                               
  }                                                                                                                 
  keysToDelete.forEach(key => this.delete(key))                                                                     
}                                                                                                                   
                                                                                                                    

Corregir invalidateAcrossLevels en TieredCacheManager:                                                              

                                                                                                                    
/**                                                                                                                 
 * Invalida en todos los niveles de cache                                                                           
 * @param {string} keyPattern - Patrón de clave                                                                     
 */                                                                                                                 
invalidateAcrossLevels(keyPattern) {                                                                                
  ;[this.l1Cache, this.l2Cache, this.l3Cache].forEach(cache => {                                                    
    if (cache.invalidatePattern) {                                                                                  
      cache.invalidatePattern(keyPattern)                                                                           
    }                                                                                                               
  })                                                                                                                
}                                                                                                                   
                                                                                                                    

Agregar invalidatePattern al wrapper tieredCache:                                                                   

                                                                                                                    
export const tieredCache = {                                                                                        
  // ... métodos existentes ...                                                                                     
  invalidateAcrossLevels: (pattern) => getGlobalTieredCache().invalidateAcrossLevels(pattern),                      
  invalidatePattern: (pattern) => getGlobalTieredCache().invalidatePattern(pattern)                                 
}                                                                                                                   
                                                                                                                    

Paso 2: Corregir src/services/cacheWarmingService.js                                                                

                                                                                                                    
// ANTES (INCORRECTO)                                                                                               
import { cache, CacheKeys } from '@/utils/cacheManager'                                                             
cache.setToLevel(...)                                                                                               
                                                                                                                    
// DESPUÉS (CORRECTO)                                                                                               
import { tieredCache, CacheKeys } from '@/utils/cacheManager'                                                       
tieredCache.setToLevel(...)                                                                                         
                                                                                                                    

Cambios específicos:                                                                                                

                                                                                                                    
// Todas las llamadas cambiar de:                                                                                   
cache.setToLevel(key, data, level)                                                                                  
// A:                                                                                                               
tieredCache.setToLevel(key, data, level)                                                                            
                                                                                                                    

Paso 3: Corregir ciclo de dependencias en src/stores/sync/index.js                                                  

                                                                                                                    
// ANTES (import estático - riesgo de ciclo)                                                                        
import { useZonasStore } from '@/stores/zonasStore'                                                                 
import { useSiembrasStore } from '@/stores/siembrasStore'                                                           
// ...                                                                                                              
                                                                                                                    
const ALL_STORES = [useZonasStore, useSiembrasStore, ...]                                                           
                                                                                                                    
// DESPUÉS (lazy resolution - sin ciclo)                                                                            
const STORE_MAP = {                                                                                                 
  zonas: () => useZonasStore(),                                                                                     
  siembras: () => useSiembrasStore(),                                                                               
  actividades: () => useActividadesStore(),                                                                         
  recordatorios: () => useRecordatoriosStore(),                                                                     
  programaciones: () => useProgramacionesStore(),                                                                   
  bitacora: () => useBitacoraStore()                                                                                
}                                                                                                                   
                                                                                                                    
const ALL_STORES = [                                                                                                
  useZonasStore,                                                                                                    
  useSiembrasStore,                                                                                                 
  useActividadesStore,                                                                                              
  useRecordatoriosStore,                                                                                            
  useProgramacionesStore,                                                                                           
  useBitacoraStore                                                                                                  
]                                                                                                                   
                                                                                                                    
// Cambiar getStoreByCollectionName:                                                                                
getStoreByCollectionName(name) {                                                                                    
  return STORE_MAP[name]?.()  // ← Resolución lazy                                                                  
}                                                                                                                   
                                                                                                                    

--------------------------------------------------------------------------------------------------------------------

Fase 24: Lazy Loading (solo lo que falta)                                                                           

Verificar estado actual                                                                                             

                                                                                                                    
grep -n "component:" src/router/index.js | grep -v "() =>"                                                          
                                                                                                                    

Solo aplicar lazy loading a rutas que NO lo tengan.                                                                 

Archivo: src/router/index.js                                                                                        

                                                                                                                    
// Si alguna ruta usa import estático, cambiar a:                                                                   
{ path: '/ruta', component: () => import('@/components/Componente.vue') }                                           
                                                                                                                    

--------------------------------------------------------------------------------------------------------------------

Fase 25: Consolidación UI/UX                                                                                        

Paso 1: Mover colores a tailwind.config.js                                                                          

                                                                                                                    
// tailwind.config.js                                                                                               
export default {                                                                                                    
  theme: {                                                                                                          
    extend: {                                                                                                       
      colors: {                                                                                                     
        priority: {                                                                                                 
          baja: '#4caf50',                                                                                          
          media: '#ff9800',                                                                                         
          alta: '#f44336',                                                                                          
          critica: '#b71c1c'                                                                                        
        },                                                                                                          
        season: {                                                                                                   
          primavera: '#81c784',                                                                                     
          verano: '#ffb74d',                                                                                        
          otono: '#ff8a65',                                                                                         
          invierno: '#64b5f6'                                                                                       
        }                                                                                                           
      }                                                                                                             
    }                                                                                                               
  }                                                                                                                 
}                                                                                                                   
                                                                                                                    

Paso 2: Actualizar componentes                                                                                      

                                                                                                                    
<!-- ANTES -->                                                                                                      
<div :style="{ color: PRIORITY_COLORS.alta }">                                                                      
                                                                                                                    
<!-- DESPUÉS -->                                                                                                    
<div class="text-priority-alta">                                                                                    
                                                                                                                    

--------------------------------------------------------------------------------------------------------------------

Fase 26: Tests (futuro)                                                                                             

                                                      
 Test           Archivo                               
 ──────────────────────────────────────────────────── 
 Auth Provider  src/services/authProvider.test.js     
 Sync Plugin    src/stores/plugins/syncPlugin.test.js 
                                                      

--------------------------------------------------------------------------------------------------------------------


Resumen ejecutivo                                                                                                   

                                                                                         
 Fase  Crear            Modificar                                               Eliminar 
 ─────────────────────────────────────────────────────────────────────────────────────── 
 23    —                cacheManager.js, cacheWarmingService.js, sync/index.js  —        
 24    —                router/index.js (solo rutas sin lazy)                   —        
 25    —                tailwind.config.js, componentes                         —        
 26    2 archivos test  —                                                       —        
                                                                                         

--------------------------------------------------------------------------------------------------------------------


Orden de ejecución                                                                                                  

                                                                  
 Paso  Fase  Acción                            Tiempo  Prioridad  
 ──────────────────────────────────────────────────────────────── 
 1     23    Corregir cacheManager.js          10 min  🔴 Crítica 
 2     23    Corregir cacheWarmingService.js   5 min   🔴 Crítica 
 3     23    Corregir sync/index.js            10 min  🔴 Crítica 
 4     23    Build test + login test           5 min   🔴 Crítica 
 5     24    Verificar lazy loading existente  5 min   🟡 Media   
 6     24    Aplicar lazy loading faltante     10 min  🟡 Media   
 7     25    Mover colores a Tailwind          15 min  🟢 Baja    
 8     26    Crear tests (futuro)              30 min  ⚪ Futuro  
                                                                  

