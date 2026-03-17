/**
 * Types and constants for sync system
 * Shared types used across all sync modules
 */

// Sync operation types
export const SYNC_OPERATION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
}

// Conflict types
export const CONFLICT_TYPES = {
  VERSION_MISMATCH: 'version_mismatch',
  CONCURRENT_UPDATE: 'concurrent_update',
  DELETE_CONFLICT: 'delete_conflict'
}

// Resolution strategies
export const RESOLUTION_STRATEGIES = {
  LOCAL_WINS: 'local',
  SERVER_WINS: 'server',
  USER_CHOICE: 'user-choice',
  MERGE: 'merge'
}

// Collection priorities
export const COLLECTION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

// Sync status states
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error',
  OFFLINE: 'offline'
}

// Default selective sync configuration
export const DEFAULT_SELECTIVE_SYNC_CONFIG = {
  enabled: false,
  collections: {
    Haciendas: { enabled: true, priority: 'high', immediate: true },
    actividades: { enabled: true, priority: 'high', immediate: true },
    siembras: { enabled: true, priority: 'medium', immediate: true },
    zonas: { enabled: true, priority: 'medium', immediate: true },
    programaciones: { enabled: true, priority: 'low', immediate: false },
    bitacora: { enabled: true, priority: 'low', immediate: false },
    recordatorios: { enabled: false, priority: 'low', immediate: false }
  },
  deferredSyncInterval: 30000, // 30 seconds
  lastDeferredSync: null
}

// Default offline features configuration
export const DEFAULT_OFFLINE_FEATURES = {
  searchIndexEnabled: true,
  reportsEnabled: true,
  analyticsEnabled: true,
  cacheEnabled: true,
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  cacheExpiryTime: 24 * 60 * 60 * 1000, // 24 hours
  searchIndexLastUpdate: null,
  lastReportGeneration: null
}

// Default cache limits
export const DEFAULT_CACHE_LIMITS = {
  maxFrequentDataEntries: 500,
  maxSearchIndexEntries: 1000,
  maxReportsEntries: 100,
  maxAnalyticsEntries: 100
}

// Collection names mapping
export const COLLECTION_NAMES = {
  HACIENDAS: 'Haciendas',
  ACTIVIDADES: 'actividades',
  SIEMBRAS: 'siembras',
  ZONAS: 'zonas',
  RECORDATORIOS: 'recordatorios',
  PROGRAMACIONES: 'programaciones',
  BITACORA: 'bitacora'
}

// Performance metrics defaults
export const PERFORMANCE_METRICS_DEFAULTS = {
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
  }
}

// Cache expiry times (in milliseconds)
export const CACHE_EXPIRY = {
  FREQUENT_DATA: 10 * 60 * 1000, // 10 minutes
  SEARCH_INDEX: 60 * 60 * 1000, // 1 hour
  REPORTS: 24 * 60 * 60 * 1000, // 24 hours
  ANALYTICS: 24 * 60 * 60 * 1000 // 24 hours
}

// Prefetch configuration
export const PREFETCH_CONFIG = {
  COOLDOWN: 5 * 60 * 1000, // 5 minutes
  MAX_RECENT_ACTIONS: 50,
  MIN_ACTIONS_FOR_ANALYSIS: 3,
  ANALYSIS_WINDOW: 60 * 60 * 1000 // 1 hour
}

/**
 * @typedef {Object} SyncOperation
 * @property {string} type - Operation type (create, update, delete)
 * @property {string} collection - Collection name
 * @property {Object} data - Operation data
 * @property {string} tempId - Temporary ID
 * @property {string} userId - User ID
 * @property {number} timestamp - Operation timestamp
 * @property {number} retryCount - Number of retries
 */

/**
 * @typedef {Object} Conflict
 * @property {string} id - Conflict ID
 * @property {string} tempId - Temporary ID
 * @property {string} collection - Collection name
 * @property {string} type - Conflict type
 * @property {Object} local - Local version
 * @property {Object} server - Server version
 * @property {boolean} resolved - Resolution status
 * @property {string} resolution - Resolution strategy
 */

/**
 * @typedef {Object} SearchResult
 * @property {Object} item - Found item
 * @property {string} collection - Collection name
 * @property {number} searchScore - Search score
 * @property {Array} matchedFields - Matched fields
 * @property {number} searchTimestamp - Search timestamp
 */

export default {
  SYNC_OPERATION_TYPES,
  CONFLICT_TYPES,
  RESOLUTION_STRATEGIES,
  COLLECTION_PRIORITIES,
  SYNC_STATUS,
  DEFAULT_SELECTIVE_SYNC_CONFIG,
  DEFAULT_OFFLINE_FEATURES,
  DEFAULT_CACHE_LIMITS,
  COLLECTION_NAMES,
  PERFORMANCE_METRICS_DEFAULTS,
  CACHE_EXPIRY,
  PREFETCH_CONFIG
}
