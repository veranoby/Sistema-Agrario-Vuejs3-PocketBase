/**
 * Cache Manager Module
 * Handles intelligent caching, prefetching, and analytics
 */

import { defineStore } from 'pinia'
import { logger, logSync, logError } from '@/utils/logger'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import {
  DEFAULT_OFFLINE_FEATURES,
  DEFAULT_CACHE_LIMITS,
  CACHE_EXPIRY,
  PREFETCH_CONFIG
} from './types'
import { pb } from '@/utils/pocketbase'
import { useHaciendaStore } from '@/stores/haciendaStore'

export const useCacheManager = defineStore('cacheManager', {
  state: () => ({
    // Offline features configuration
    offlineFeatures: { ...DEFAULT_OFFLINE_FEATURES },

    // Cache limits
    cacheLimits: { ...DEFAULT_CACHE_LIMITS },

    // Intelligent cache structure
    intelligentCache: {
      frequentData: new Map(), // Cache of frequently accessed data
      reports: new Map(), // Cache of generated reports
      analytics: {
        dailyStats: new Map(),
        weeklyStats: new Map(),
        monthlyStats: new Map()
      }
    },

    // Interval ID for cleanup
    cleanupIntervalId: null,

    // Performance metrics
    performanceMetrics: {
      syncRate: {
        successRate: 100,
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0
      },
      queueStats: {
        currentQueueSize: 0,
        averageProcessingTime: 0,
        maxQueueSize: 0
      },
      errors: {
        totalErrors: 0,
        recentErrors: []
      },
      history: [] // Metrics history
    }
  }),

  actions: {
    /**
     * Enforce LRU cache limit by removing oldest entries
     * @param {Map} cacheMap - Cache map to enforce limit on
     * @param {string} cacheName - Name of the cache for logging
     * @param {number} maxEntries - Maximum entries allowed
     */
    enforceCacheLimit(cacheMap, cacheName, maxEntries) {
      if (cacheMap.size > maxEntries) {
        // Remove oldest entries (first 20%)
        const entriesToRemove = Math.floor(maxEntries * 0.2)
        let removed = 0
        for (const [key] of cacheMap.keys()) {
          if (removed >= entriesToRemove) break
          cacheMap.delete(key)
          removed++
        }
        logSync(`[CacheManager] Limpiando ${cacheName}: eliminadas ${removed} entradas (tamaño: ${cacheMap.size}/${maxEntries})`)
      }
    },

    /**
     * Safely add to cache with limit enforcement
     * @param {Map} cacheMap - Cache map to add to
     * @param {string} cacheName - Name of the cache for logging
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} maxEntries - Maximum entries allowed
     */
    setWithCacheLimit(cacheMap, cacheName, key, value, maxEntries) {
      // Enforce limit before adding
      this.enforceCacheLimit(cacheMap, cacheName, maxEntries)
      cacheMap.set(key, value)
    },

    /**
     * Clean up intelligent cache by removing expired entries
     */
    cleanupIntelligentCache() {
      try {
        const now = Date.now()
        const expiryTime = this.offlineFeatures.cacheExpiryTime

        // Clean old reports
        for (const [key, report] of this.intelligentCache.reports.entries()) {
          if (now - report.generatedAt > expiryTime) {
            this.intelligentCache.reports.delete(key)
          }
        }

        // Clean old analytics
        Object.values(this.intelligentCache.analytics).forEach(cache => {
          for (const [key, data] of cache.entries()) {
            if (now - data.generatedAt > expiryTime) {
              cache.delete(key)
            }
          }
        })

        logSync('[CacheManager] Cache inteligente limpiado')
      } catch (error) {
        logError('[CacheManager] Error limpiando cache:', error)
      }
    },

    /**
     * Initialize analytics with default values
     */
    initializeAnalytics() {
      try {
        // Generate initial analytics if they don't exist
        const today = new Date().toISOString().split('T')[0]

        if (!this.intelligentCache.analytics.dailyStats.has(`daily_${today}`)) {
          this.generateOfflineAnalytics('daily')
        }

        logSync('[CacheManager] Analytics inicializados')
      } catch (error) {
        logError('[CacheManager] Error inicializando analytics:', error)
      }
    },

    /**
     * Initialize offline features from saved configuration
     */
    initOfflineFeatures() {
      try {
        // Load saved configuration
        const saved = safeLocalStorage.loadFromLocalStorage('offlineFeatures')
        if (saved) {
          this.offlineFeatures = {
            ...this.offlineFeatures,
            ...saved
          }
        }

        // Initialize analytics if enabled
        if (this.offlineFeatures.analyticsEnabled) {
          this.initializeAnalytics()
        }

        // Set up periodic cleanup
        if (this.cleanupIntervalId) {
          clearInterval(this.cleanupIntervalId)
        }
        this.cleanupIntervalId = setInterval(() => this.cleanupIntelligentCache(), 60 * 60 * 1000) // Every hour

        logSync('[CacheManager] Funcionalidades offline inicializadas')
      } catch (error) {
        logError('[CacheManager] Error inicializando funcionalidades offline:', error)
      }
    },

    /**
     * Enable or disable offline features
     * @param {Object} features - Features configuration
     */
    enableOfflineFeatures(features) {
      try {
        this.offlineFeatures = {
          ...this.offlineFeatures,
          ...features
        }

        // Save configuration
        safeLocalStorage.saveToLocalStorage('offlineFeatures', this.offlineFeatures)

        // Initialize enabled features
        if (this.offlineFeatures.analyticsEnabled) {
          this.initializeAnalytics()
        }

        logSync('[CacheManager] Funcionalidades offline configuradas')
        return true
      } catch (error) {
        logError('[CacheManager] Error habilitando funcionalidades offline:', error)
        return false
      }
    },

    /**
     * Track user action for pattern analysis
     * @param {Object} action - Action to track
     */
    trackUserAction(action) {
      try {
        const recentActions = JSON.parse(localStorage.getItem('recent_actions') || '[]')

        // Add new action at the beginning
        recentActions.unshift({
          action: action.type,
          collection: action.collection,
          timestamp: Date.now(),
          route: action.route || window.location.pathname
        })

        // Keep only last 50 actions
        const limitedActions = recentActions.slice(0, PREFETCH_CONFIG.MAX_RECENT_ACTIONS)

        localStorage.setItem('recent_actions', JSON.stringify(limitedActions))
      } catch (error) {
        logError('[CacheManager] Error registrando acción:', error)
      }
    },

    /**
     * Analyze usage patterns and preload probable data
     */
    async prefetchBasedOnPatterns() {
      try {
        if (!navigator.onLine || !pb.authStore.isValid) {
          return
        }

        const recentActions = JSON.parse(localStorage.getItem('recent_actions') || '[]')

        if (recentActions.length < PREFETCH_CONFIG.MIN_ACTIONS_FOR_ANALYSIS) {
          return // Not enough data for analysis
        }

        // Analyze collection access frequencies
        const collectionFrequency = {}
        const now = Date.now()
        const oneHourAgo = now - PREFETCH_CONFIG.ANALYSIS_WINDOW

        recentActions.forEach(action => {
          if (action.timestamp > oneHourAgo) {
            collectionFrequency[action.collection] = (collectionFrequency[action.collection] || 0) + 1
          }
        })

        // Get most used collection
        const mostUsedCollection = Object.keys(collectionFrequency)
          .sort((a, b) => collectionFrequency[b] - collectionFrequency[a])[0]

        if (!mostUsedCollection) {
          return
        }

        logSync(`[CacheManager] Prefetch: Colección más usada = ${mostUsedCollection}`)

        // Preload most used collection if not cached
        const prefetchKey = `prefetch_${mostUsedCollection}`
        const lastPrefetch = localStorage.getItem(prefetchKey)

        if (!lastPrefetch || (now - parseInt(lastPrefetch)) > PREFETCH_CONFIG.COOLDOWN) {
          await this.prefetchCollection(mostUsedCollection)
          localStorage.setItem(prefetchKey, now.toString())
        }
      } catch (error) {
        logError('[CacheManager] Error en prefetch basado en patrones:', error)
      }
    },

    /**
     * Preload a specific collection
     * @param {string} collectionName - Collection to prefetch
     */
    async prefetchCollection(collectionName) {
      try {
        const startTime = performance.now()
        const haciendaStore = useHaciendaStore()
        const haciendaId = haciendaStore.mi_hacienda?.id

        if (!haciendaId) {
          return
        }

        // Collection mapping with filters
        const collectionConfigs = {
          'recordatorios': {
            collection: 'recordatorios',
            filter: `hacienda="${haciendaId}"`
          },
          'siembras': {
            collection: 'siembras',
            filter: `hacienda="${haciendaId}"`
          },
          'actividades': {
            collection: 'actividades',
            filter: `hacienda="${haciendaId}"`
          },
          'zonas': {
            collection: 'zonas',
            filter: `hacienda="${haciendaId}"`
          },
          'programaciones': {
            collection: 'programaciones',
            filter: `hacienda="${haciendaId}"`
          },
          'bitacora': {
            collection: 'bitacora',
            filter: `hacienda="${haciendaId}"`
          }
        }

        const config = collectionConfigs[collectionName]

        if (!config) {
          logger.warn(`[CacheManager] No hay configuración de prefetch para ${collectionName}`)
          return
        }

        // Preload with optimized parameters
        const records = await pb.collection(config.collection).getFullList({
          filter: config.filter,
          fields: 'id,nombre,estado,created', // Only essential fields for prefetch
          skipTotal: true
        })

        const duration = performance.now() - startTime
        logSync(`[CacheManager] Prefetch completado: ${collectionName} (${records.length} registros) en ${duration.toFixed(0)}ms`)

        // Save to intelligent cache with limit
        this.setWithCacheLimit(
          this.intelligentCache.frequentData,
          'frequentData',
          `${config.collection}_prefetch`,
          {
            data: records,
            timestamp: Date.now(),
            duration
          },
          this.cacheLimits.maxFrequentDataEntries
        )

      } catch (error) {
        logError(`[CacheManager] Error prefetching ${collectionName}:`, error)
      }
    },

    /**
     * Get prefetched data from intelligent cache
     * @param {string} collectionName - Collection to get from cache
     */
    getPrefetchedData(collectionName) {
      const cacheKey = `${collectionName}_prefetch`
      const cached = this.intelligentCache.frequentData.get(cacheKey)

      if (cached && cached.data) {
        const age = Date.now() - cached.timestamp
        const maxAge = CACHE_EXPIRY.FREQUENT_DATA

        if (age < maxAge) {
          logSync(`[CacheManager] Usando datos precargados para ${collectionName}`)
          return cached.data
        }
      }

      return null
    },

    /**
     * Generate offline analytics for a period
     * @param {string} period - Period type (daily, weekly, monthly)
     */
    generateOfflineAnalytics(period = 'daily') {
      if (!this.offlineFeatures.analyticsEnabled) {
        logger.warn('[CacheManager] Analytics offline no habilitados')
        return null
      }

      try {
        const analytics = {
          period,
          generatedAt: Date.now(),
          operationsCount: 0,
          syncMetrics: {},
          userActivity: {},
          dataVolume: {}
        }

        // Get sync metrics
        analytics.syncMetrics = this.getPerformanceMetrics()

        // Calculate operation statistics
        analytics.operationsCount = this.performanceMetrics.syncRate.totalOperations

        // Calculate data volume (approximate)
        analytics.dataVolume = this.calculateDataVolume()

        // Save to analytics cache with limit
        const cacheKey = `${period}_${new Date().toISOString().split('T')[0]}`
        const statsMap = this.intelligentCache.analytics[`${period}Stats`]

        // Enforce limit before adding
        if (statsMap.size >= this.cacheLimits.maxAnalyticsEntries) {
          // Remove oldest entry (first key)
          const firstKey = statsMap.keys().next().value
          statsMap.delete(firstKey)
        }

        statsMap.set(cacheKey, analytics)

        logSync('[CacheManager] Analytics offline generados:', period)
        return analytics

      } catch (error) {
        logError('[CacheManager] Error generando analytics offline:', error)
        return null
      }
    },

    /**
     * Calculate approximate data volume
     */
    calculateDataVolume() {
      try {
        const stores = ['Haciendas', 'actividades', 'siembras', 'zonas', 'recordatorios']
        let totalItems = 0
        let estimatedSize = 0

        stores.forEach(storeName => {
          const savedData = safeLocalStorage.loadFromLocalStorage(storeName)
          if (savedData) {
            const itemCount = Array.isArray(savedData) ? savedData.length :
                             savedData.items ? savedData.items.length : 0
            totalItems += itemCount
            estimatedSize += new Blob([JSON.stringify(savedData)]).size
          }
        })

        return {
          totalItems,
          estimatedSize,
          estimatedSizeMB: Math.round(estimatedSize / (1024 * 1024) * 100) / 100
        }
      } catch (error) {
        logError('[CacheManager] Error calculando volumen de datos:', error)
        return { totalItems: 0, estimatedSize: 0, estimatedSizeMB: 0 }
      }
    },

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
      return this.performanceMetrics
    },

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
      this.performanceMetrics = {
        syncRate: {
          successRate: 100,
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0
        },
        queueStats: {
          currentQueueSize: 0,
          averageProcessingTime: 0,
          maxQueueSize: 0
        },
        errors: {
          totalErrors: 0,
          recentErrors: []
        },
        history: []
      }
    },

    /**
     * Get metrics history
     * @param {number} limit - Maximum number of history entries
     */
    getMetricsHistory(limit = 10) {
      return this.performanceMetrics.history.slice(-limit)
    },

    /**
     * Check for performance alerts
     */
    checkPerformanceAlerts() {
      const metrics = this.getPerformanceMetrics()
      const alerts = []

      // Low success rate alert
      if (metrics.syncRate.successRate < 90) {
        alerts.push({
          type: 'LOW_SUCCESS_RATE',
          severity: 'WARNING',
          message: 'La tasa de éxito de sincronización está por debajo del 90%',
          currentValue: metrics.syncRate.successRate,
          threshold: 90
        })
      }

      // Large queue alert
      if (metrics.queueStats.currentQueueSize > 50) {
        alerts.push({
          type: 'LARGE_QUEUE',
          severity: 'WARNING',
          message: `Hay ${metrics.queueStats.currentQueueSize} operaciones pendientes en la cola`,
          currentValue: metrics.queueStats.currentQueueSize,
          threshold: 50
        })
      }

      // High error count alert
      if (metrics.errors.totalErrors > 10) {
        alerts.push({
          type: 'HIGH_ERROR_COUNT',
          severity: 'CRITICAL',
          message: `Se han registrado ${metrics.errors.totalErrors} errores`,
          currentValue: metrics.errors.totalErrors,
          threshold: 10
        })
      }

      return alerts
    },

    /**
     * Update performance metrics
     * @param {Object} update - Metrics update
     */
    updatePerformanceMetrics(update) {
      if (update.syncRate) {
        this.performanceMetrics.syncRate = {
          ...this.performanceMetrics.syncRate,
          ...update.syncRate
        }
      }

      if (update.queueStats) {
        this.performanceMetrics.queueStats = {
          ...this.performanceMetrics.queueStats,
          ...update.queueStats
        }
      }

      if (update.errors) {
        this.performanceMetrics.errors = {
          ...this.performanceMetrics.errors,
          ...update.errors
        }
      }

      // Add to history
      this.performanceMetrics.history.push({
        timestamp: Date.now(),
        ...this.performanceMetrics
      })

      // Keep history manageable
      if (this.performanceMetrics.history.length > 100) {
        this.performanceMetrics.history = this.performanceMetrics.history.slice(-100)
      }
    },

    /**
     * Cleanup method for preventing memory leaks
     */
    cleanup() {
      try {
        // Clear cleanup interval
        if (this.cleanupIntervalId) {
          clearInterval(this.cleanupIntervalId)
          this.cleanupIntervalId = null
        }

        // Clear all caches
        this.intelligentCache.frequentData.clear()
        this.intelligentCache.reports.clear()
        this.intelligentCache.analytics.dailyStats.clear()
        this.intelligentCache.analytics.weeklyStats.clear()
        this.intelligentCache.analytics.monthlyStats.clear()

        logSync('[CacheManager] Cache cleanup completado')
      } catch (error) {
        logError('[CacheManager] Error en cleanup:', error)
      }
    }
  }
})
