/**
 * Exportador a Markdown para Knowledge Hub
 * 
 * Genera archivos Markdown estructurados para alimentar IAs externas
 * y generar manuales/documentación automáticamente.
 * 
 * @module utils/markdownExporter
 */

import { format } from 'date-fns'

/**
 * Exporta lista de usuarios a Markdown
 * @param {Array} users - Lista de usuarios
 * @returns {string} Contenido Markdown
 */
export function exportUsersToMarkdown(users) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  
  let md = `# Usuarios del Sistema\n\n`
  md += `**Fecha de exportación**: ${timestamp}\n`
  md += `**Total de usuarios**: ${users.length}\n\n`
  md += `---\n\n`

  users.forEach((user, index) => {
    md += `## Usuario: ${user.email}\n\n`
    md += `- **ID**: ${user.id}\n`
    md += `- **Nombre de usuario**: ${user.username}\n`
    md += `- **Nombre completo**: ${user.firstname} ${user.lastname}\n`
    md += `- **Rol**: ${formatRole(user.role)}\n`
    md += `- **Estado**: ${user.status === 'active' ? '✅ Activo' : '❌ Inactivo'}\n`
    
    if (user.haciendas?.length) {
      md += `- **Haciendas asignadas**:\n`
      user.haciendas.forEach(h => {
        md += `  - ${h.name}\n`
      })
    } else {
      md += `- **Haciendas asignadas**: Ninguna\n`
    }
    
    md += `- **Fecha de creación**: ${formatDate(user.created)}\n`
    md += `- **Última actualización**: ${formatDate(user.updated)}\n`
    
    if (index < users.length - 1) {
      md += `\n---\n\n`
    }
  })

  return md
}

/**
 * Exporta lista de haciendas a Markdown
 * @param {Array} haciendas - Lista de haciendas
 * @returns {string} Contenido Markdown
 */
export function exportHaciendasToMarkdown(haciendas) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  
  let md = `# Haciendas del Sistema\n\n`
  md += `**Fecha de exportación**: ${timestamp}\n`
  md += `**Total de haciendas**: ${haciendas.length}\n\n`
  md += `---\n\n`

  haciendas.forEach((hacienda, index) => {
    md += `## Hacienda: ${hacienda.name}\n\n`
    md += `- **ID**: ${hacienda.id}\n`
    md += `- **Descripción**: ${hacienda.descripcion || 'N/A'}\n`
    md += `- **Ubicación**: ${hacienda.ubicacion || 'N/A'}\n`
    md += `- **Estado**: ${hacienda.status === 'active' ? '✅ Activa' : '❌ Inactiva'}\n`
    md += `- **Plan**: ${hacienda.plan?.name || 'N/A'}\n`
    md += `- **Fecha de creación**: ${formatDate(hacienda.created)}\n`
    
    if (hacienda.users?.length) {
      md += `- **Usuarios**: ${hacienda.users.length}\n`
    }
    
    if (hacienda.active_modules?.length) {
      md += `- **Módulos activos**: ${hacienda.active_modules.join(', ')}\n`
    }
    
    if (index < haciendas.length - 1) {
      md += `\n---\n\n`
    }
  })

  return md
}

/**
 * Exporta tipos de actividades a Markdown
 * @param {Array} tiposActividades - Lista de tipos de actividades
 * @returns {string} Contenido Markdown
 */
export function exportTiposActividadesToMarkdown(tiposActividades) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  
  let md = `# Tipos de Actividades\n\n`
  md += `**Fecha de exportación**: ${timestamp}\n`
  md += `**Total de tipos**: ${tiposActividades.length}\n\n`
  md += `---\n\n`

  tiposActividades.forEach((tipo, index) => {
    md += `## ${tipo.nombre}\n\n`
    md += `- **ID**: ${tipo.id}\n`
    md += `- **Descripción**: ${tipo.descripcion || 'N/A'}\n`
    md += `- **Categoría**: ${tipo.categoria || 'General'}\n`
    
    if (tipo.metricas_bpa?.length) {
      md += `- **Métricas BPA**:\n`
      tipo.metricas_bpa.forEach((metrica, idx) => {
        md += `  ${idx + 1}. ${metrica.pregunta}\n`
      })
    }
    
    md += `- **Fecha de creación**: ${formatDate(tipo.created)}\n`
    
    if (index < tiposActividades.length - 1) {
      md += `\n---\n\n`
    }
  })

  return md
}

/**
 * Exporta tipos de zonas a Markdown
 * @param {Array} tiposZonas - Lista de tipos de zonas
 * @returns {string} Contenido Markdown
 */
export function exportTiposZonasToMarkdown(tiposZonas) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  
  let md = `# Tipos de Zonas\n\n`
  md += `**Fecha de exportación**: ${timestamp}\n`
  md += `**Total de tipos**: ${tiposZonas.length}\n\n`
  md += `---\n\n`

  tiposZonas.forEach((tipo, index) => {
    md += `## ${tipo.nombre}\n\n`
    md += `- **ID**: ${tipo.id}\n`
    md += `- **Descripción**: ${tipo.descripcion || 'N/A'}\n`
    md += `- **Fecha de creación**: ${formatDate(tipo.created)}\n`
    
    if (index < tiposZonas.length - 1) {
      md += `\n---\n\n`
    }
  })

  return md
}

/**
 * Exporta conocimiento completo (Knowledge Hub) a Markdown
 * @param {Object} data - Objeto con todas las entidades
 * @returns {string} Contenido Markdown
 */
export function exportKnowledgeHubToMarkdown(data) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  const totalEntities = 
    (data.usuarios?.length || 0) +
    (data.haciendas?.length || 0) +
    (data.siembras?.length || 0) +
    (data.actividades?.length || 0) +
    (data.programaciones?.length || 0)

  let md = `# Knowledge Hub - ConAgri\n\n`
  md += `**Fecha de exportación**: ${timestamp}\n`
  md += `**Total de entidades**: ${totalEntities}\n\n`
  
  // Tabla de contenidos
  md += `## Tabla de Contenidos\n\n`
  if (data.usuarios?.length) md += `- [Usuarios](#usuarios)\n`
  if (data.haciendas?.length) md += `- [Haciendas](#haciendas)\n`
  if (data.siembras?.length) md += `- [Siembras](#siembras)\n`
  if (data.actividades?.length) md += `- [Actividades](#actividades)\n`
  if (data.programaciones?.length) md += `- [Programaciones](#programaciones)\n`
  md += `\n---\n\n`

  // Usuarios
  if (data.usuarios?.length) {
    md += `## Usuarios\n\n`
    md += exportUsersToMarkdown(data.usuarios)
    md += `\n\n`
  }

  // Haciendas
  if (data.haciendas?.length) {
    md += `## Haciendas\n\n`
    md += exportHaciendasToMarkdown(data.haciendas)
    md += `\n\n`
  }

  // Siembras
  if (data.siembras?.length) {
    md += `## Siembras\n\n`
    md += exportSiembrasToMarkdown(data.siembras)
    md += `\n\n`
  }

  // Actividades
  if (data.actividades?.length) {
    md += `## Actividades\n\n`
    md += exportActividadesToMarkdown(data.actividades)
    md += `\n\n`
  }

  // Programaciones
  if (data.programaciones?.length) {
    md += `## Programaciones\n\n`
    md += exportProgramacionesToMarkdown(data.programaciones)
    md += `\n\n`
  }

  return md
}

/**
 * Exporta siembras a Markdown
 * @param {Array} siembras - Lista de siembras
 * @returns {string} Contenido Markdown
 */
export function exportSiembrasToMarkdown(siembras) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  
  let md = `### Listado de Siembras\n\n`
  md += `**Total**: ${siembras.length}\n\n`

  siembras.forEach((siembra, index) => {
    md += `#### ${siembra.nombre} - ${siembra.tipo_cultivo}\n\n`
    md += `- **ID**: ${siembra.id}\n`
    md += `- **Hacienda**: ${siembra.hacienda_nombre || 'N/A'}\n`
    md += `- **Zona**: ${siembra.zona_nombre || 'N/A'}\n`
    md += `- **Fecha de siembra**: ${formatDate(siembra.fecha_siembra)}\n`
    md += `- **Fecha estimada de cosecha**: ${formatDate(siembra.fecha_cosecha_estimada)}\n`
    md += `- **Estado**: ${siembra.estado || 'N/A'}\n`
    md += `- **Área**: ${siembra.area?.area || 'N/A'} ${siembra.area?.unidad || ''}\n`
    
    if (index < siembras.length - 1) {
      md += `\n---\n\n`
    }
  })

  return md
}

/**
 * Exporta actividades a Markdown
 * @param {Array} actividades - Lista de actividades
 * @returns {string} Contenido Markdown
 */
export function exportActividadesToMarkdown(actividades) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  
  let md = `### Listado de Actividades\n\n`
  md += `**Total**: ${actividades.length}\n\n`

  actividades.forEach((actividad, index) => {
    md += `#### ${actividad.nombre}\n\n`
    md += `- **ID**: ${actividad.id}\n`
    md += `- **Hacienda**: ${actividad.hacienda_nombre || 'N/A'}\n`
    md += `- **Tipo**: ${actividad.tipo || 'N/A'}\n`
    md += `- **Estado**: ${actividad.estado || 'N/A'}\n`
    md += `- **Fecha de ejecución**: ${formatDate(actividad.fecha_ejecucion)}\n`
    
    if (index < actividades.length - 1) {
      md += `\n---\n\n`
    }
  })

  return md
}

/**
 * Exporta programaciones a Markdown
 * @param {Array} programaciones - Lista de programaciones
 * @returns {string} Contenido Markdown
 */
export function exportProgramacionesToMarkdown(programaciones) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  
  let md = `### Listado de Programaciones\n\n`
  md += `**Total**: ${programaciones.length}\n\n`

  programaciones.forEach((prog, index) => {
    md += `#### ${prog.nombre}\n\n`
    md += `- **ID**: ${prog.id}\n`
    md += `- **Hacienda**: ${prog.hacienda_nombre || 'N/A'}\n`
    md += `- **Actividad**: ${prog.actividad_nombre || 'N/A'}\n`
    md += `- **Frecuencia**: ${prog.frecuencia || 'N/A'}\n`
    md += `- **Estado**: ${prog.estado || 'N/A'}\n`
    
    if (index < programaciones.length - 1) {
      md += `\n---\n\n`
    }
  })

  return md
}

// Helpers
function formatRole(role) {
  const roles = {
    superadmin: 'Super Admin',
    administrador: 'Administrador',
    auditor: 'Auditor',
    operador: 'Operador'
  }
  return roles[role] || role
}

function formatDate(date) {
  if (!date) return 'N/A'
  try {
    return format(new Date(date), 'dd/MM/yyyy')
  } catch {
    return 'N/A'
  }
}
