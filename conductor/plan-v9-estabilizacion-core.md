┃ Plan Consolidado Optimizado - Fase 2: Integración, Limpieza y Nuevas Funcionalidades                                                                                                                                                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Basado en: Propuesta original (conductor/plan-integracion-limpieza-profunda.md), análisis de archivos añadidos (todos los mencionados en el chat), y mejores prácticas de arquitectura Vue/Pinia.                                               


Objetivo General                                                                                                                                                                                                                                

Mejorar mantenibilidad, eliminar fragmentación de servicios, preparar arquitectura offline-first, e integrar funcionalidades de geolocalización y AI, respetando abstracción de flujo y resiliencia offline.                                    

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


1. Consolidación de Tests y Limpieza de Código                                                                                                                                                                                                  

Correcciones a original: Valida tests antes de mover, actualiza imports, limpia código duplicado.                                                                                                                                               

Tareas                                                                                                                                                                                                                                          

1.1 Validar tests existentes:                                                                                                                                                                                                                   

 • Ejecutar syncStore.test.js y cacheManager.tiered.test.js localmente.                                                                                                                                                                         
 • Corregir fallos: El test syncStore.test.js usa syncStore.conflicts pero el actual sync/index.js usa conflictUI; actualizar test o ajustar store. 1.2 Mover tests a estructura centralizada:                                                  
 • Mover src/stores/syncStore.test.js a tests/stores/sync/index.test.js                                                                                                                                                                         
 • Mover src/utils/cacheManager.tiered.test.js a tests/utils/cacheManager.tiered.test.js                                                                                                                                                        
 • Mantener estructura espejo de src/ en tests/. 1.3 Actualizar imports:                                                                                                                                                                        
 • Verificar aliases de vitest (@/ apunta a src/).                                                                                                                                                                                              
 • Eliminar mocks obsoletos tras cambios en stores. 1.4 Limpieza de duplicados:                                                                                                                                                                 
 • Centralizar función downloadFile duplicada en formatters.js, csvExporter.js, htmlExporter.js, jsonExporter.js en src/utils/fileDownload.js.                                                                                                  

Criterio de aceptación                                                                                                                                                                                                                          

100% tests pasan, 0 archivos huérfanos en src/, estructura tests/ espejo de src/.                                                                                                                                                               

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


2. Auditoría de Dependencias y Estrategia Offline-First                                                                                                                                                                                         

Correcciones a original: Usa madge para auditoría, aprovecha offlineGeoStorage.js existente, prioriza colecciones para IndexedDB.                                                                                                               

Tareas                                                                                                                                                                                                                                          

2.1 Auditoría de dependencias:                                                                                                                                                                                                                  

 • Usar madge para detectar ciclos entre:                                                                                                                                                                                                       
    • Servicios: profileService.js (importa useSyncStore), locationCoordinator.js                                                                                                                                                               
    • Stores: sync/index.js (importa todos los stores), authStore.js (importa useSyncStore, profileService), snackbarStore.js                                                                                                                   
    • Constantes: bpa.js (importado en cacheManager.js)                                                                                                                                                                                         
 • Corregir ciclos: Usar import dinámico como ya implementa sync/index.js en resolveStore. 2.2 Evolución Offline-First:                                                                                                                         
 • Migrar colecciones pesadas a IndexedDB aprovechando offlineGeoStorage.js (ya usa IndexedDB):                                                                                                                                                 
    1 Bitácoras/trazas GPS (ya soportado)                                                                                                                                                                                                       
    2 Siembras/zonas (añadir a offlineGeoStorage.js)                                                                                                                                                                                            
    3 Cola de sincronización (syncQueue): Mantener en localStorage (bajo volumen).                                                                                                                                                              
 • Migrar syncCache (en sync/index.js, usa tieredCache de cacheManager.js) a IndexedDB vía localForage para niveles L2/L3, mantener L1 (lookup data) en localStorage.                                                                           
 • Actualizar sync/index.js para usar nueva capa de persistencia.                                                                                                                                                                               

Criterio de aceptación                                                                                                                                                                                                                          

0 ciclos de dependencia, carga offline de datos pesados 50% más rápida, syncQueue funcional sin conexión.                                                                                                                                       

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


3. Unificación de Servicios de Geolocalización y Mapas                                                                                                                                                                                          

Correcciones a original: No ignora locationCoordinator.js existente, aprovecha offlineGeoStorage.js, define stack para tiles offline.                                                                                                           

Tareas                                                                                                                                                                                                                                          

3.1 Consolidar servicios en locationCoordinator.js (ya existente, no crear nuevo mapService):                                                                                                                                                   

 • Integrar offlineGeoStorage.js en locationCoordinator.js para gestionar tracking + almacenamiento offline de geometrías.                                                                                                                      
 • Eliminar instancias singleton duplicadas: Usar la instancia exportada de locationCoordinator.js en toda la app. 3.2 Integrar capacidades de dibujo:                                                                                          
 • Añadir Leaflet + Leaflet.draw para trazar polígonos de lotes/zonas, reutilizando estructura GeoZona de offlineGeoStorage.js.                                                                                                                 
 • Guardar polígonos dibujados directamente vía locationCoordinator.js. 3.3 Renderizado Offline:                                                                                                                                                
 • Implementar cacheo de tiles cartográficos con leaflet-offline o localForage (IndexedDB).                                                                                                                                                     
 • Garantizar visualización de mapas base y geometrías sin conexión.                                                                                                                                                                            

Criterio de aceptación                                                                                                                                                                                                                          

0 servicios de geolocalización duplicados, tracking + dibujo + visualización offline funcionales, soporte para polígonos de zonas/siembras.                                                                                                     

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


4. Integración del Asistente AI                                                                                                                                                                                                                 

Correcciones a original: Define proveedor, estrategia offline, seguridad de datos.                                                                                                                                                              

Tareas                                                                                                                                                                                                                                          

4.1 Arquitectura y proveedor:                                                                                                                                                                                                                   

 • Modelo self-hosted (Llama 3) para datos sensibles (bitácoras, haciendas), fallback a OpenAI solo para datos no sensibles.                                                                                                                    
 • Crear aiService.js desacoplado de UI, con cache de respuestas en IndexedDB. 4.2 Integración por módulo:                                                                                                                                      
 • Actividades: Autocompletar bitácoras, detección de anomalías en dosis, soporte in situ para plagas (usa actividadesStore.js, bitacoraStore.js).                                                                                              
 • Programaciones: Sugerir calendarios cruzando datos de programacionesStore.js, clima cacheado, disponibilidad de maquinaria. 4.3 Resiliencia offline:                                                                                         
 • Cachear respuestas frecuentes en IndexedDB para funcionamiento offline parcial.                                                                                                                                                              

Criterio de aceptación                                                                                                                                                                                                                          

80% precisión mínima en sugerencias, funcionamiento offline parcial, 0 fuga de datos sensibles a terceros.                                                                                                                                      

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


Hitos Temporales (1 semana/hito)                                                                                                                                                                                                                

 1 Hito 1 (S1): Completar Sección 1 (Tests y Limpieza)                                                                                                                                                                                          
 2 Hito 2 (S2): Completar Sección 2 (Dependencias y Offline-First) - Depende de Hito 1                                                                                                                                                          
 3 Hito 3 (S3): Completar Sección 3 (Geolocalización y Mapas) - Depende de Hito 2                                                                                                                                                               
 4 Hito 4 (S4): Completar Sección 4 (Integración AI) - Depende de Hito 3                                                                                                                                                                        

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


Gestión de Riesgos                                                                                                                                                                                                                              

 1 Ciclos de dependencia no detectados: Validar con madge en cada paso de auditoría.                                                                                                                                                            
 2 Pérdida de datos en migración a IndexedDB: Backup de localStorage antes de migrar, transiciones graduales.                                                                                                                                   
 3 Latencia/costos de AI: Priorizar modelo self-hosted, implementar rate limits.                                                                                                                                                                
 4 Peso de tiles offline: Limpieza periódica de cache (eliminar tiles no usados en 30 días). 