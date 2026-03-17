/**
 * Offline Indexer Module
 * Handles offline search indexing and report generation
 */

import { defineStore } from 'pinia'
import { logger, logSync, logError } from '@/utils/logger'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import { DEFAULT_CACHE_LIMITS } from './types'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useCacheManager } from './cacheManager'

export const useOfflineIndexer = defineStore('offlineIndexer', {
  state: () => ({
    // Offline features configuration (search-related)
    searchIndexEnabled: true,
    searchIndexLastUpdate: null,

    // Intelligent cache for search and reports
    intelligentCache: {
      searchIndex: new Map(),
      reports: new Map()
    },

    // Cache limits
    cacheLimits: {
      maxSearchIndexEntries: 1000,
      maxReportsEntries: 100
    }
  }),

  actions: {
    /**
     * Enforce cache limit helper
     * @param {Map} cacheMap - Cache map
     * @param {string} cacheName - Cache name
     * @param {number} maxEntries - Max entries
     */
    enforceCacheLimit(cacheMap, cacheName, maxEntries) {
      if (cacheMap.size > maxEntries) {
        const entriesToRemove = Math.floor(maxEntries * 0.2)
        let removed = 0
        for (const [key] of cacheMap.keys()) {
          if (removed >= entriesToRemove) break
          cacheMap.delete(key)
          removed++
        }
        logSync(`[OfflineIndexer] Limpiando ${cacheName}: eliminadas ${removed} entradas`)
      }
    },

    /**
     * Safely add to cache with limit
     * @param {Map} cacheMap - Cache map
     * @param {string} cacheName - Cache name
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} maxEntries - Max entries
     */
    setWithCacheLimit(cacheMap, cacheName, key, value, maxEntries) {
      this.enforceCacheLimit(cacheMap, cacheName, maxEntries)
      cacheMap.set(key, value)
    },

    /**
     * Perform offline search across collections
     * @param {string} query - Search query
     * @param {Array<string>} collections - Collections to search (null = all)
     * @param {Object} options - Search options
     */
    searchOffline(query, collections = null, options = {}) {
      if (!this.searchIndexEnabled) {
        logger.warn('[OfflineIndexer] Búsqueda offline no habilitada')
        return []
      }

      try {
        const {
          limit = 50,
          fuzzy = true,
          fields = ['name', 'nombre', 'descripcion', 'observaciones']
        } = options

        const normalizedQuery = query.toLowerCase().trim()
        if (!normalizedQuery) return []

        const results = []
        const targetCollections = collections || Object.keys(this.intelligentCache.searchIndex)

        for (const collection of targetCollections) {
          const indexData = this.intelligentCache.searchIndex.get(collection) || []

          indexData.forEach(item => {
            let score = 0
            let matchedFields = []

            // Search in specified fields
            fields.forEach(field => {
              const fieldValue = item[field]
              if (fieldValue && typeof fieldValue === 'string') {
                const normalizedValue = fieldValue.toLowerCase()

                // Exact match
                if (normalizedValue.includes(normalizedQuery)) {
                  score += 10
                  matchedFields.push({ field, value: fieldValue, type: 'exact' })
                }
                // Fuzzy match (if enabled)
                else if (fuzzy && this.fuzzyMatch(normalizedQuery, normalizedValue)) {
                  score += 5
                  matchedFields.push({ field, value: fieldValue, type: 'fuzzy' })
                }
              }
            })

            if (score > 0) {
              results.push({
                ...item,
                collection,
                searchScore: score,
                matchedFields,
                searchTimestamp: Date.now()
              })
            }
          })
        }

        // Sort by score and limit results
        return results
          .sort((a, b) => b.searchScore - a.searchScore)
          .slice(0, limit)

      } catch (error) {
        logError('[OfflineIndexer] Error en búsqueda offline:', error)
        return []
      }
    },

    /**
     * Simple fuzzy matching
     * @param {string} query - Query string
     * @param {string} text - Text to match against
     */
    fuzzyMatch(query, text) {
      const distance = this.levenshteinDistance(query, text)
      const maxLength = Math.max(query.length, text.length)
      const similarity = (maxLength - distance) / maxLength
      return similarity > 0.6 // 60% minimum similarity
    },

    /**
     * Calculate Levenshtein distance for fuzzy matching
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     */
    levenshteinDistance(str1, str2) {
      const matrix = []

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1]
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            )
          }
        }
      }

      return matrix[str2.length][str1.length]
    },

    /**
     * Build offline search index from all stores
     */
    async buildSearchIndex() {
      try {
        logSync('[OfflineIndexer] Construyendo índice de búsqueda offline...')

        const stores = [
          { name: 'Haciendas', store: useHaciendaStore },
          { name: 'actividades', store: useActividadesStore },
          { name: 'siembras', store: useSiembrasStore },
          { name: 'zonas', store: useZonasStore },
          { name: 'recordatorios', store: useRecordatoriosStore },
          { name: 'programaciones', store: useProgramacionesStore },
          { name: 'bitacora', store: useBitacoraStore }
        ]

        for (const { name, store } of stores) {
          try {
            const storeInstance = store()
            const items = storeInstance.items || storeInstance.list || []

            // Create search index with relevant data
            const indexData = items.map(item => ({
              id: item.id,
              ...item,
              indexedAt: Date.now()
            }))

            this.setWithCacheLimit(
              this.intelligentCache.searchIndex,
              'searchIndex',
              name,
              indexData,
              this.cacheLimits.maxSearchIndexEntries
            )
            logSync(`[OfflineIndexer] Índice construido para ${name}: ${indexData.length} elementos`)

          } catch (storeError) {
            logger.warn(`[OfflineIndexer] Error indexando ${name}:`, storeError)
          }
        }

        this.searchIndexLastUpdate = Date.now()
        safeLocalStorage.saveToLocalStorage('offlineFeatures', {
          searchIndexLastUpdate: this.searchIndexLastUpdate
        })

        logSync('[OfflineIndexer] Índice de búsqueda offline completado')

      } catch (error) {
        logError('[OfflineIndexer] Error construyendo índice de búsqueda:', error)
      }
    },

    /**
     * Generate offline report
     * @param {string} type - Report type
     * @param {Object} parameters - Report parameters
     */
    generateOfflineReport(type, parameters = {}) {
      try {
        const { dateFrom, dateTo, collections = ['actividades', 'bitacora'] } = parameters

        const reportId = `report_${type}_${Date.now()}`
        const report = {
          id: reportId,
          type,
          parameters,
          generatedAt: Date.now(),
          data: {},
          summary: {}
        }

        switch (type) {
          case 'bpa_compliance':
            report.data = this.generateBPAComplianceReport(collections, dateFrom, dateTo)
            break

          case 'activity_summary':
            report.data = this.generateActivitySummaryReport(collections, dateFrom, dateTo)
            break

          case 'productivity':
            report.data = this.generateProductivityReport(collections, dateFrom, dateTo)
            break

          default:
            logger.warn('[OfflineIndexer] Tipo de reporte no soportado:', type)
            return null
        }

        // Calculate summary
        report.summary = this.calculateReportSummary(report.data, type)

        // Save to cache with limit
        this.setWithCacheLimit(
          this.intelligentCache.reports,
          'reports',
          reportId,
          report,
          this.cacheLimits.maxReportsEntries
        )

        logSync('[OfflineIndexer] Reporte offline generado:', reportId)
        return report

      } catch (error) {
        logError('[OfflineIndexer] Error generando reporte offline:', error)
        return null
      }
    },

    /**
     * Generate BPA compliance report
     * @param {Array} collections - Collections to include
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     */
    generateBPAComplianceReport(collections, dateFrom, dateTo) {
      const data = {
        haciendas: [],
        zonas: [],
        actividades: [],
        totalScore: 0,
        complianceLevel: 'Sin datos'
      }

      try {
        const zonasStore = useZonasStore()
        const zonas = zonasStore.items || []

        zonas.forEach(zona => {
          if (zona.datos_bpa) {
            const bpaScore = this.calculateBPAScore(zona.datos_bpa)
            data.zonas.push({
              id: zona.id,
              nombre: zona.nombre || 'Sin nombre',
              bpaScore,
              lastUpdate: zona.updated || zona.created
            })
          }
        })

        // Calculate total score
        if (data.zonas.length > 0) {
          data.totalScore = data.zonas.reduce((sum, zona) => sum + zona.bpaScore, 0) / data.zonas.length
        }

        // Determine compliance level
        if (data.totalScore >= 90) data.complianceLevel = 'Excelente'
        else if (data.totalScore >= 75) data.complianceLevel = 'Bueno'
        else if (data.totalScore >= 60) data.complianceLevel = 'Regular'
        else data.complianceLevel = 'Deficiente'

      } catch (error) {
        logError('[OfflineIndexer] Error generando reporte BPA:', error)
      }

      return data
    },

    /**
     * Calculate BPA score
     * @param {Object} datosBpa - BPA data
     */
    calculateBPAScore(datosBpa) {
      if (!datosBpa || typeof datosBpa !== 'object') return 0

      let totalPoints = 0
      let maxPoints = 0

      Object.values(datosBpa).forEach(value => {
        if (typeof value === 'number') {
          totalPoints += value
          maxPoints += 100 // Assuming 100 max per category
        }
      })

      return maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
    },

    /**
     * Generate activity summary report
     * @param {Array} collections - Collections to include
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     */
    generateActivitySummaryReport(collections, dateFrom, dateTo) {
      const data = {
        totalActivities: 0,
        completedActivities: 0,
        pendingActivities: 0,
        byCategory: {},
        timeRange: { from: dateFrom, to: dateTo }
      }

      try {
        const actividadesStore = useActividadesStore()
        const actividades = actividadesStore.items || []

        actividades.forEach(actividad => {
          data.totalActivities++

          // Categorize by status (simplified)
          if (actividad.estado === 'completado') {
            data.completedActivities++
          } else {
            data.pendingActivities++
          }

          // Group by category
          const categoria = actividad.categoria || 'Sin categoría'
          data.byCategory[categoria] = (data.byCategory[categoria] || 0) + 1
        })

      } catch (error) {
        logError('[OfflineIndexer] Error generando reporte de actividades:', error)
      }

      return data
    },

    /**
     * Generate productivity report
     * @param {Array} collections - Collections to include
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     */
    generateProductivityReport(collections, dateFrom, dateTo) {
      const data = {
        totalHours: 0,
        averageEfficiency: 0,
        topPerformers: [],
        productivityTrend: []
      }

      try {
        const bitacoraStore = useBitacoraStore()
        const bitacora = bitacoraStore.items || []

        // Simplified productivity analysis
        bitacora.forEach(entrada => {
          if (entrada.tiempo_dedicado) {
            data.totalHours += entrada.tiempo_dedicado
          }
        })

      } catch (error) {
        logError('[OfflineIndexer] Error generando reporte de productividad:', error)
      }

      return data
    },

    /**
     * Calculate report summary
     * @param {Object} reportData - Report data
     * @param {string} type - Report type
     */
    calculateReportSummary(reportData, type) {
      const summary = {
        totalRecords: 0,
        keyMetrics: {},
        recommendations: []
      }

      try {
        switch (type) {
          case 'bpa_compliance':
            summary.totalRecords = reportData.zonas?.length || 0
            summary.keyMetrics = {
              averageScore: reportData.totalScore || 0,
              complianceLevel: reportData.complianceLevel || 'Sin datos'
            }
            if (reportData.totalScore < 75) {
              summary.recommendations.push('Mejorar prácticas de BPA en zonas con bajo puntaje')
            }
            break

          case 'activity_summary':
            summary.totalRecords = reportData.totalActivities || 0
            summary.keyMetrics = {
              completionRate: reportData.totalActivities > 0
                ? Math.round((reportData.completedActivities / reportData.totalActivities) * 100)
                : 0
            }
            break

          case 'productivity':
            summary.totalRecords = 1
            summary.keyMetrics = {
              totalHours: reportData.totalHours || 0,
              efficiency: reportData.averageEfficiency || 0
            }
            break
        }

      } catch (error) {
        logError('[OfflineIndexer] Error calculando resumen de reporte:', error)
      }

      return summary
    },

    /**
     * Initialize search index if enabled
     */
    initSearchIndex() {
      try {
        if (this.searchIndexEnabled) {
          // Build search index in background
          setTimeout(() => this.buildSearchIndex(), 2000)
        }
      } catch (error) {
        logError('[OfflineIndexer] Error inicializando índice de búsqueda:', error)
      }
    },

    /**
     * Cleanup method for preventing memory leaks
     */
    cleanup() {
      try {
        // Clear all caches
        this.intelligentCache.searchIndex.clear()
        this.intelligentCache.reports.clear()

        logSync('[OfflineIndexer] Indexer cleanup completado')
      } catch (error) {
        logError('[OfflineIndexer] Error en cleanup:', error)
      }
    }
  }
})
