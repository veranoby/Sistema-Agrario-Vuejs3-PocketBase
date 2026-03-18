/**
 * Seeder de módulos iniciales para el Marketplace
 * 
 * Ejecutar después de aplicar la migración de módulos
 */

/**
 * Módulos iniciales del sistema
 */
export const initialModules = [
  // Módulos de Usuarios y Haciendas
  {
    name: 'Usuario Adicional',
    code: 'users_additional',
    description: 'Agrega usuarios adicionales a tu hacienda',
    price_monthly: 5,
    price_yearly: 50,
    category: 'users',
    is_active: true,
    icon: 'mdi-account-plus'
  },
  {
    name: 'Hacienda Adicional',
    code: 'haciendas_additional',
    description: 'Gestiona múltiples haciendas',
    price_monthly: 15,
    price_yearly: 150,
    category: 'haciendas',
    is_active: true,
    icon: 'mdi-barn'
  },
  
  // Módulos de IA
  {
    name: 'IA Assistant - Siembras',
    code: 'ai_siembras',
    description: 'Asistente IA para recomendaciones de siembras',
    price_monthly: 20,
    price_yearly: 200,
    category: 'ai',
    is_active: true,
    icon: 'mdi-brain'
  },
  {
    name: 'IA Assistant - Finanzas',
    code: 'ai_finanzas',
    description: 'Análisis financiero con IA',
    price_monthly: 20,
    price_yearly: 200,
    category: 'ai',
    is_active: true,
    icon: 'mdi-chart-line'
  },
  
  // Módulos de Reportes
  {
    name: 'Reportes Personalizados',
    code: 'reports_custom',
    description: 'Crea reportes personalizados y exportables',
    price_monthly: 15,
    price_yearly: 150,
    category: 'reports',
    is_active: true,
    icon: 'mdi-file-chart'
  },
  {
    name: 'Knowledge Export',
    code: 'knowledge_export',
    description: 'Exporta conocimiento a Markdown para IA',
    price_monthly: 25,
    price_yearly: 250,
    category: 'reports',
    is_active: true,
    icon: 'mdi-language-markdown'
  },
  
  // Módulos de Almacenamiento
  {
    name: 'Almacenamiento Extendido',
    code: 'storage_extended',
    description: 'Amplía tu límite de almacenamiento (10GB extra)',
    price_monthly: 10,
    price_yearly: 100,
    category: 'storage',
    is_active: true,
    icon: 'mdi-cloud-upload'
  },
  
  // Módulos de Soporte
  {
    name: 'Soporte Prioritario',
    code: 'support_priority',
    description: 'Soporte técnico prioritario 24/7',
    price_monthly: 50,
    price_yearly: 500,
    category: 'support',
    is_active: true,
    icon: 'mdi-headset'
  },
  
  // Módulos Avanzados
  {
    name: 'Bitácoras Avanzadas',
    code: 'bitacoras_advanced',
    description: 'Funcionalidades avanzadas para bitácoras',
    price_monthly: 10,
    price_yearly: 100,
    category: 'bitacoras_avanzadas',
    is_active: true,
    icon: 'mdi-book-edit'
  },
  {
    name: 'Programaciones Inteligentes',
    code: 'programaciones_smart',
    description: 'Optimización inteligente de programaciones',
    price_monthly: 15,
    price_yearly: 150,
    category: 'programaciones_inteligentes',
    is_active: true,
    icon: 'mdi-calendar-clock'
  },
  {
    name: 'Alertas Proactivas',
    code: 'alertas_proactive',
    description: 'Alertas predictivas basadas en IA',
    price_monthly: 10,
    price_yearly: 100,
    category: 'alertas_proactivas',
    is_active: true,
    icon: 'mdi-bell-ring'
  },
  {
    name: 'Auditoría BPA',
    code: 'auditoria_bpa',
    description: 'Herramientas completas de auditoría BPA',
    price_monthly: 20,
    price_yearly: 200,
    category: 'auditoria_bpa',
    is_active: true,
    icon: 'mdi-clipboard-check'
  }
]

/**
 * Función para seedear módulos en PocketBase
 * @param {PocketBase} pb - Instancia de PocketBase
 */
export async function seedModules(pb) {
  try {
    // Verificar si ya existen módulos
    const existing = await pb.collection('modulos').getFullList()
    
    if (existing.length > 0) {
      console.log('Los módulos ya existen. Saltando seed.')
      return
    }

    // Crear módulos
    for (const module of initialModules) {
      await pb.collection('modulos').create(module)
      console.log(`Módulo creado: ${module.name}`)
    }

    console.log(`Seed completado: ${initialModules.length} módulos creados`)
  } catch (error) {
    console.error('Error al seedear módulos:', error)
    throw error
  }
}

export default initialModules
