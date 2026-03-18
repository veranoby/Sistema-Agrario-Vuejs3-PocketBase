/**
 * Exportador especializado para Knowledge Hub
 * 
 * Genera archivos Markdown estructurados con índice y tablas de contenido
 * para alimentar IAs externas y generar documentación.
 * 
 * @module utils/markdownKnowledgeExporter
 */

import { format } from 'date-fns'

/**
 * Exporta conocimiento completo con índice detallado
 * @param {Object} data - Objeto con todas las entidades
 * @param {Object} options - Opciones de exportación
 * @returns {string} Contenido Markdown
 */
export function exportKnowledgeHubToMarkdown(data, options = {}) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  const { includeTOC = true, includeMetadata = true } = options

  const totalEntities = countEntities(data)

  let md = `# Knowledge Hub - Sistema Agri\n\n`
  
  if (includeMetadata) {
    md += `**Fecha de exportación**: ${timestamp}\n`
    md += `**Total de entidades**: ${totalEntities}\n\n`
  }

  // Tabla de contenidos
  if (includeTOC && totalEntities > 0) {
    md += `## Tabla de Contenidos\n\n`
    if (data.usuarios?.length) md += `1. [Usuarios](#usuarios)\n`
    if (data.haciendas?.length) md += `2. [Haciendas](#haciendas)\n`
    if (data.siembras?.length) md += `3. [Siembras](#siembras)\n`
    if (data.actividades?.length) md += `4. [Actividades](#actividades)\n`
    if (data.programaciones?.length) md += `5. [Programaciones](#programaciones)\n`
    if (data.tipos_actividades?.length) md += `6. [Tipos de Actividades](#tipos-de-actividades)\n`
    if (data.tipos_zonas?.length) md += `7. [Tipos de Zonas](#tipos-de-zonas)\n`
    md += `\n---\n\n`
  }

  // Usuarios
  if (data.usuarios?.length) {
    md += `## Usuarios\n\n`
    md += exportUsersSection(data.usuarios)
    md += `\n\n`
  }

  // Haciendas
  if (data.haciendas?.length) {
    md += `## Haciendas\n\n`
    md += exportHaciendasSection(data.haciendas)
    md += `\n\n`
  }

  // Siembras
  if (data.siembras?.length) {
    md += `## Siembras\n\n`
    md += exportSiembrasSection(data.siembras)
    md += `\n\n`
  }

  // Actividades
  if (data.actividades?.length) {
    md += `## Actividades\n\n`
    md += exportActividadesSection(data.actividades)
    md += `\n\n`
  }

  // Programaciones
  if (data.programaciones?.length) {
    md += `## Programaciones\n\n`
    md += exportProgramacionesSection(data.programaciones)
    md += `\n\n`
  }

  // Tipos de Actividades
  if (data.tipos_actividades?.length) {
    md += `## Tipos de Actividades\n\n`
    md += exportTiposActividadesSection(data.tipos_actividades)
    md += `\n\n`
  }

  // Tipos de Zonas
  if (data.tipos_zonas?.length) {
    md += `## Tipos de Zonas\n\n`
    md += exportTiposZonasSection(data.tipos_zonas)
    md += `\n\n`
  }

  return md
}

/**
 * Exporta una entidad específica con todas sus relaciones
 * @param {string} type - Tipo de entidad
 * @param {Object} entity - Entidad completa
 * @returns {string} Contenido Markdown
 */
export function exportEntityToMarkdown(type, entity) {
  switch (type) {
    case 'siembra':
      return exportSiembraDetail(entity)
    case 'programacion':
      return exportProgramacionDetail(entity)
    case 'actividad':
      return exportActividadDetail(entity)
    case 'hacienda':
      return exportHaciendaDetail(entity)
    default:
      return `# ${type}\n\n${JSON.stringify(entity, null, 2)}`
  }
}

// ============================================================================
// SECCIONES INDIVIDUALES
// ============================================================================

function exportUsersSection(users) {
  let md = `**Total**: ${users.length} usuarios\n\n`
  
  users.forEach((user, i) => {
    md += `### ${user.email}\n\n`
    md += `- **ID**: ${user.id}\n`
    md += `- **Nombre**: ${user.firstname} ${user.lastname}\n`
    md += `- **Rol**: ${formatRole(user.role)}\n`
    md += `- **Estado**: ${user.status === 'active' ? '✅ Activo' : '❌ Inactivo'}\n`
    
    if (user.haciendas?.length) {
      md += `- **Haciendas**: ${user.haciendas.map(h => h.name).join(', ')}\n`
    }
    
    if (i < users.length - 1) md += `\n---\n\n`
  })

  return md
}

function exportHaciendasSection(haciendas) {
  let md = `**Total**: ${haciendas.length} haciendas\n\n`
  
  haciendas.forEach((h, i) => {
    md += `### ${h.name}\n\n`
    md += `- **ID**: ${h.id}\n`
    md += `- **Descripción**: ${h.descripcion || 'N/A'}\n`
    md += `- **Ubicación**: ${h.ubicacion || 'N/A'}\n`
    md += `- **Plan**: ${h.plan?.name || 'N/A'}\n`
    md += `- **Estado**: ${h.status === 'active' ? '✅ Activa' : '❌ Inactiva'}\n`
    
    if (h.users?.length) {
      md += `- **Usuarios**: ${h.users.length}\n`
    }
    
    if (h.active_modules?.length) {
      md += `- **Módulos**: ${h.active_modules.join(', ')}\n`
    }
    
    if (i < haciendas.length - 1) md += `\n---\n\n`
  })

  return md
}

function exportSiembrasSection(siembras) {
  let md = `**Total**: ${siembras.length} siembras\n\n`
  
  siembras.forEach((s, i) => {
    md += `### ${s.nombre} - ${s.tipo_cultivo}\n\n`
    md += `- **ID**: ${s.id}\n`
    md += `- **Hacienda**: ${s.hacienda_nombre || 'N/A'}\n`
    md += `- **Zona**: ${s.zona_nombre || 'N/A'}\n`
    md += `- **Fecha siembra**: ${formatDate(s.fecha_siembra)}\n`
    md += `- **Fecha cosecha estimada**: ${formatDate(s.fecha_cosecha_estimada)}\n`
    md += `- **Estado**: ${s.estado || 'N/A'}\n`
    md += `- **Área**: ${s.area?.area || 'N/A'} ${s.area?.unidad || ''}\n`
    
    if (i < siembras.length - 1) md += `\n---\n\n`
  })

  return md
}

function exportActividadesSection(actividades) {
  let md = `**Total**: ${actividades.length} actividades\n\n`
  
  actividades.forEach((a, i) => {
    md += `### ${a.nombre}\n\n`
    md += `- **ID**: ${a.id}\n`
    md += `- **Hacienda**: ${a.hacienda_nombre || 'N/A'}\n`
    md += `- **Tipo**: ${a.tipo || 'N/A'}\n`
    md += `- **Estado**: ${a.estado || 'N/A'}\n`
    md += `- **Fecha ejecución**: ${formatDate(a.fecha_ejecucion)}\n`
    
    if (i < actividades.length - 1) md += `\n---\n\n`
  })

  return md
}

function exportProgramacionesSection(programaciones) {
  let md = `**Total**: ${programaciones.length} programaciones\n\n`
  
  programaciones.forEach((p, i) => {
    md += `### ${p.nombre}\n\n`
    md += `- **ID**: ${p.id}\n`
    md += `- **Hacienda**: ${p.hacienda_nombre || 'N/A'}\n`
    md += `- **Actividad**: ${p.actividad_nombre || 'N/A'}\n`
    md += `- **Frecuencia**: ${p.frecuencia || 'N/A'}\n`
    md += `- **Estado**: ${p.estado || 'N/A'}\n`
    
    if (i < programaciones.length - 1) md += `\n---\n\n`
  })

  return md
}

function exportTiposActividadesSection(tipos) {
  let md = `**Total**: ${tipos.length} tipos\n\n`
  
  tipos.forEach((t, i) => {
    md += `### ${t.nombre}\n\n`
    md += `- **ID**: ${t.id}\n`
    md += `- **Descripción**: ${t.descripcion || 'N/A'}\n`
    md += `- **Categoría**: ${t.categoria || 'General'}\n`
    
    if (t.metricas_bpa?.length) {
      md += `- **Métricas BPA**:\n`
      t.metricas_bpa.forEach((m, idx) => {
        md += `  ${idx + 1}. ${m.pregunta}\n`
      })
    }
    
    if (i < tipos.length - 1) md += `\n---\n\n`
  })

  return md
}

function exportTiposZonasSection(tipos) {
  let md = `**Total**: ${tipos.length} tipos\n\n`
  
  tipos.forEach((t, i) => {
    md += `### ${t.nombre}\n\n`
    md += `- **ID**: ${t.id}\n`
    md += `- **Descripción**: ${t.descripcion || 'N/A'}\n`
    
    if (i < tipos.length - 1) md += `\n---\n\n`
  })

  return md
}

// ============================================================================
// DETALLES INDIVIDUALES
// ============================================================================

function exportSiembraDetail(siembra) {
  let md = `# Siembra: ${siembra.nombre}\n\n`
  md += `## Información General\n\n`
  md += `- **ID**: ${siembra.id}\n`
  md += `- **Nombre**: ${siembra.nombre}\n`
  md += `- **Tipo de cultivo**: ${siembra.tipo_cultivo}\n`
  md += `- **Hacienda**: ${siembra.hacienda_nombre}\n`
  md += `- **Zona**: ${siembra.zona_nombre}\n`
  md += `- **Fecha de siembra**: ${formatDate(siembra.fecha_siembra)}\n`
  md += `- **Fecha estimada de cosecha**: ${formatDate(siembra.fecha_cosecha_estimada)}\n`
  md += `- **Estado**: ${siembra.estado}\n`
  md += `- **Área**: ${siembra.area?.area} ${siembra.area?.unidad}\n\n`

  if (siembra.actividades_relacionadas?.length) {
    md += `## Actividades Relacionadas\n\n`
    siembra.actividades_relacionadas.forEach((a, i) => {
      md += `${i + 1}. ${a.nombre} - ${formatDate(a.fecha)}\n`
    })
    md += `\n`
  }

  if (siembra.bitacoras?.length) {
    md += `## Bitácoras\n\n`
    siembra.bitacoras.forEach((b, i) => {
      md += `${i + 1}. ${b.descripcion} - ${formatDate(b.fecha)}\n`
    })
    md += `\n`
  }

  return md
}

function exportProgramacionDetail(prog) {
  let md = `# Programación: ${prog.nombre}\n\n`
  md += `## Información General\n\n`
  md += `- **ID**: ${prog.id}\n`
  md += `- **Nombre**: ${prog.nombre}\n`
  md += `- **Hacienda**: ${prog.hacienda_nombre}\n`
  md += `- **Actividad**: ${prog.actividad_nombre}\n`
  md += `- **Frecuencia**: ${prog.frecuencia}\n`
  md += `- **Estado**: ${prog.estado}\n`
  md += `- **Fecha creación**: ${formatDate(prog.created)}\n\n`

  if (prog.ejecuciones?.length) {
    md += `## Historial de Ejecuciones\n\n`
    md += `| Fecha | Estado | Responsable |\n`
    md += `|-------|--------|-------------|\n`
    prog.ejecuciones.forEach(e => {
      md += `| ${formatDate(e.fecha)} | ${e.estado} | ${e.responsable || 'N/A'} |\n`
    })
    md += `\n`
  }

  return md
}

function exportActividadDetail(act) {
  let md = `# Actividad: ${act.nombre}\n\n`
  md += `## Información\n\n`
  md += `- **ID**: ${act.id}\n`
  md += `- **Nombre**: ${act.nombre}\n`
  md += `- **Tipo**: ${act.tipo}\n`
  md += `- **Hacienda**: ${act.hacienda_nombre}\n`
  md += `- **Estado**: ${act.estado}\n`
  md += `- **Fecha ejecución**: ${formatDate(act.fecha_ejecucion)}\n`

  return md
}

function exportHaciendaDetail(hacienda) {
  let md = `# Hacienda: ${hacienda.name}\n\n`
  md += `## Información General\n\n`
  md += `- **ID**: ${hacienda.id}\n`
  md += `- **Nombre**: ${hacienda.name}\n`
  md += `- **Descripción**: ${hacienda.descripcion}\n`
  md += `- **Ubicación**: ${hacienda.ubicacion}\n`
  md += `- **Plan**: ${hacienda.plan?.name || 'N/A'}\n`
  md += `- **Estado**: ${hacienda.status === 'active' ? 'Activa' : 'Inactiva'}\n\n`

  if (hacienda.users?.length) {
    md += `## Usuarios\n\n`
    hacienda.users.forEach((u, i) => {
      md += `${i + 1}. ${u.email} (${u.role})\n`
    })
    md += `\n`
  }

  if (hacienda.active_modules?.length) {
    md += `## Módulos Activos\n\n`
    hacienda.active_modules.forEach(m => {
      md += `- ${formatModule(m)}\n`
    })
    md += `\n`
  }

  return md
}

// ============================================================================
// HELPERS
// ============================================================================

function countEntities(data) {
  return Object.values(data).reduce((sum, arr) => sum + (arr?.length || 0), 0)
}

function formatRole(role) {
  const roles = {
    superadmin: 'Super Admin',
    administrador: 'Administrador',
    auditor: 'Auditor',
    operador: 'Operador'
  }
  return roles[role] || role
}

function formatModule(module) {
  const names = {
    users: 'Usuarios',
    haciendas: 'Haciendas',
    ai: 'IA Assistant',
    reports: 'Reportes',
    storage: 'Almacenamiento',
    support: 'Soporte'
  }
  return names[module] || module
}

function formatDate(date) {
  if (!date) return 'N/A'
  try {
    return format(new Date(date), 'dd/MM/yyyy')
  } catch {
    return 'N/A'
  }
}
