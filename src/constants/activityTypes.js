/**
 * Constantes de tipos de actividad
 * @module constants/activityTypes
 */

/**
 * Tipos de actividad disponibles en el sistema
 */
export const ACTIVITY_TYPES = {
  SIEMBRA: 'siembra',
  COSECHA: 'cosecha',
  APLICACION: 'aplicacion',
  MONITOREO: 'monitoreo',
  RIEGO: 'riego',
  FERTILIZACION: 'fertilizacion',
  LABRANZA: 'labranza',
  PODA: 'poda'
}

/**
 * Nombres legibles para tipos de actividad
 */
export const ACTIVITY_TYPE_LABELS = {
  siembra: 'Siembra',
  cosecha: 'Cosecha',
  aplicacion: 'Aplicación',
  monitoreo: 'Monitoreo',
  riego: 'Riego',
  fertilizacion: 'Fertilización',
  labranza: 'Labranza',
  poda: 'Poda'
}

/**
 * Iconos para tipos de actividad (Vuetify)
 */
export const ACTIVITY_TYPE_ICONS = {
  siembra: 'mdi-seed',
  cosecha: 'mdi-basket',
  aplicacion: 'mdi-spray-bottle',
  monitoreo: 'mdi-chart-line',
  riego: 'mdi-water',
  fertilizacion: 'mdi-grain',
  labranza: 'mdi-tractor',
  poda: 'mdi-content-cut'
}

/**
 * Colores para tipos de actividad (Vuetify)
 */
export const ACTIVITY_TYPE_COLORS = {
  siembra: 'green',
  cosecha: 'amber',
  aplicacion: 'purple',
  monitoreo: 'blue',
  riego: 'cyan',
  fertilizacion: 'brown',
  labranza: 'orange',
  poda: 'red'
}

/**
 * Constantes para los estados de ejecución de una actividad.
 * Centraliza los valores para evitar "stringly-typed code".
 */
export const ESTADOS_EJECUCION = {
  PLANIFICADA: 'planificada',
  EN_PROGRESO: 'en_progreso',
  COMPLETADO: 'completado',
  CANCELADA: 'cancelada'
}

/**
 * Definición centralizada de requisitos y validaciones por tipo de actividad.
 * Esta es la única fuente de verdad para la lógica de validación.
 */
export const ACTIVITY_TYPE_REQUIREMENTS = {
  siembra: {
    nombre: 'Siembra',
    camposRequeridos: ['variedad', 'densidad', 'fecha_siembra'],
    camposNumericos: ['densidad', 'densidad_plantas'],
    validacionesEspecificas: [
      {
        campo: 'variedad',
        regla: (val) => val && val.trim().length > 0,
        mensaje: 'La variedad es requerida y no puede estar vacía'
      },
      {
        campo: 'densidad',
        regla: (val) => val !== null && val !== undefined && val > 0,
        mensaje: 'La densidad debe ser mayor a 0'
      },
      {
        campo: 'fecha_siembra',
        regla: (val) => val && !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de siembra debe ser válida'
      }
    ]
  },

  cosecha: {
    nombre: 'Cosecha',
    camposRequeridos: ['rendimiento_kg', 'calidad'],
    camposNumericos: ['rendimiento_kg', 'rendimiento_por_hectarea'],
    validacionesEspecificas: [
      {
        campo: 'rendimiento_kg',
        regla: (val) => val !== null && val !== undefined && val > 0,
        mensaje: 'El rendimiento en kg debe ser mayor a 0'
      },
      {
        campo: 'calidad',
        regla: (val) => val && val.trim().length > 0,
        mensaje: 'La calidad es requerida'
      },
      {
        campo: 'fecha_cosecha',
        regla: (val) => !val || !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de cosecha debe ser válida si está presente'
      }
    ]
  },

  aplicacion: {
    nombre: 'Aplicación',
    camposRequeridos: ['producto', 'dosis', 'metodo'],
    camposNumericos: ['dosis', 'cantidad'],
    validacionesEspecificas: [
      {
        campo: 'producto',
        regla: (val) => val && val.trim().length > 0,
        mensaje: 'El producto aplicado es requerido'
      },
      {
        campo: 'dosis',
        regla: (val) => val !== null && val !== undefined && val > 0,
        mensaje: 'La dosis debe ser mayor a 0'
      },
      {
        campo: 'fecha_aplicacion',
        regla: (val) => val && !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de aplicación es requerida y debe ser válida'
      }
    ]
  },

  monitoreo: {
    nombre: 'Monitoreo',
    camposRequeridos: ['fecha_monitoreo'],
    camposNumericos: ['temperatura', 'humedad', 'ph'],
    camposOpcionalesPermitidos: ['observaciones', 'temperatura', 'humedad', 'ph', 'precipitacion'],
    validacionesEspecificas: [
      {
        campo: 'fecha_monitoreo',
        regla: (val) => val && !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de monitoreo es requerida y debe ser válida'
      },
      {
        campo: 'temperatura',
        regla: (val) => val === null || val === undefined || (val >= -50 && val <= 60),
        mensaje: 'La temperatura debe estar entre -50°C y 60°C'
      },
      {
        campo: 'humedad',
        regla: (val) => val === null || val === undefined || (val >= 0 && val <= 100),
        mensaje: 'La humedad debe estar entre 0% y 100%'
      }
    ]
  },

  riego: {
    nombre: 'Riego',
    camposRequeridos: ['metodo', 'fecha_riego'],
    camposNumericos: ['dosis_agua', 'volumen_m3', 'tiempo_horas'],
    validacionesEspecificas: [
      {
        campo: 'fecha_riego',
        regla: (val) => val && !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de riego es requerida y debe ser válida'
      },
      {
        campo: 'dosis_agua',
        regla: (val) => val === null || val === undefined || val > 0,
        mensaje: 'La dosis de agua debe ser mayor a 0 si está presente'
      },
      {
        campo: 'tiempo_horas',
        regla: (val) => val === null || val === undefined || (val > 0 && val <= 24),
        mensaje: 'El tiempo de riego debe estar entre 0 y 24 horas'
      }
    ]
  },

  fertilizacion: {
    nombre: 'Fertilización',
    camposRequeridos: ['tipo_fertilizante', 'dosis', 'metodo_aplicacion'],
    camposNumericos: ['dosis', 'cantidad_kg', 'ph'],
    validacionesEspecificas: [
      {
        campo: 'tipo_fertilizante',
        regla: (val) => val && val.trim().length > 0,
        mensaje: 'El tipo de fertilizante es requerido'
      },
      {
        campo: 'dosis',
        regla: (val) => val !== null && val !== undefined && val > 0,
        mensaje: 'La dosis debe ser mayor a 0'
      },
      {
        campo: 'fecha_fertilizacion',
        regla: (val) => val && !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de fertilización es requerida y debe ser válida'
      }
    ]
  },

  labranza: {
    nombre: 'Labranza',
    camposRequeridos: ['tipo_labranza', 'fecha_labranza'],
    camposNumericos: ['profundidad_cm', 'horas_maquina'],
    validacionesEspecificas: [
      {
        campo: 'tipo_labranza',
        regla: (val) => val && val.trim().length > 0,
        mensaje: 'El tipo de labranza es requerido'
      },
      {
        campo: 'fecha_labranza',
        regla: (val) => val && !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de labranza es requerida y debe ser válida'
      },
      {
        campo: 'profundidad_cm',
        regla: (val) => val === null || val === undefined || (val > 0 && val <= 100),
        mensaje: 'La profundidad debe estar entre 0 y 100 cm'
      }
    ]
  },

  poda: {
    nombre: 'Poda',
    camposRequeridos: ['tipo_poda', 'fecha_poda'],
    camposNumericos: ['porcentaje_elim', 'numero_plantas'],
    validacionesEspecificas: [
      {
        campo: 'tipo_poda',
        regla: (val) => val && val.trim().length > 0,
        mensaje: 'El tipo de poda es requerido'
      },
      {
        campo: 'fecha_poda',
        regla: (val) => val && !isNaN(new Date(val).getTime()),
        mensaje: 'La fecha de poda es requerida y debe ser válida'
      },
      {
        campo: 'porcentaje_elim',
        regla: (val) => val === null || val === undefined || (val >= 0 && val <= 100),
        mensaje: 'El porcentaje de eliminación debe estar entre 0 y 100'
      }
    ]
  }
}

/**
 * Métricas comunes por tipo de actividad
 */
export const ACTIVITY_METRICS = {
  siembra: [
    { key: 'variedad', type: 'text', required: true },
    { key: 'densidad', type: 'number', required: true, unit: 'plants/ha' },
    { key: 'fecha_siembra', type: 'date', required: true },
    { key: 'metodo_siembra', type: 'select', required: false, options: ['directa', 'transplante'] }
  ],
  cosecha: [
    { key: 'rendimiento_kg', type: 'number', required: true },
    { key: 'calidad', type: 'text', required: true },
    { key: 'fecha_cosecha', type: 'date', required: false }
  ],
  aplicacion: [
    { key: 'producto', type: 'text', required: true },
    { key: 'dosis', type: 'number', required: true },
    { key: 'metodo', type: 'text', required: true },
    { key: 'fecha_aplicacion', type: 'date', required: true }
  ],
  monitoreo: [
    { key: 'fecha_monitoreo', type: 'date', required: true },
    { key: 'temperatura', type: 'number', required: false, unit: '°C' },
    { key: 'humedad', type: 'number', required: false, unit: '%' },
    { key: 'observaciones', type: 'textarea', required: false }
  ],
  riego: [
    { key: 'metodo', type: 'text', required: true },
    { key: 'dosis_agua', type: 'number', required: false, unit: 'm³' },
    { key: 'fecha_riego', type: 'date', required: true }
  ],
  fertilizacion: [
    { key: 'tipo_fertilizante', type: 'text', required: true },
    { key: 'dosis', type: 'number', required: true },
    { key: 'metodo_aplicacion', type: 'text', required: true },
    { key: 'fecha_fertilizacion', type: 'date', required: true }
  ]
}

/**
 * Obtiene el label legible de un tipo de actividad
 * @param {string} type - Tipo de actividad
 * @returns {string} Label legible
 */
export function getActivityTypeLabel(type) {
  return ACTIVITY_TYPE_LABELS[type] || type
}

/**
 * Obtiene el icono de un tipo de actividad
 * @param {string} type - Tipo de actividad
 * @returns {string} Icono de Vuetify
 */
export function getActivityTypeIcon(type) {
  return ACTIVITY_TYPE_ICONS[type] || 'mdi-circle'
}

/**
 * Obtiene el color de un tipo de actividad
 * @param {string} type - Tipo de actividad
 * @returns {string} Color de Vuetify
 */
export function getActivityTypeColor(type) {
  return ACTIVITY_TYPE_COLORS[type] || 'grey'
}

/**
 * Verifica si un tipo de actividad es válido
 * @param {string} type - Tipo de actividad
 * @returns {boolean} True si es válido
 */
export function isValidActivityType(type) {
  return Object.values(ACTIVITY_TYPES).includes(type)
}
