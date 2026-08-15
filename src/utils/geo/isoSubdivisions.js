/**
 * src/utils/geo/isoSubdivisions.js
 * Catálogo estandarizado ISO 3166-2 de Estados, Provincias y Departamentos
 * para países de Iberoamérica con fallback dinámico.
 */

export const SUBDIVISIONS_BY_COUNTRY = {
  // ECUADOR (24 Provincias)
  EC: [
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro',
    'Esmeraldas', 'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos',
    'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza', 'Pichincha',
    'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua',
    'Zamora Chinchipe'
  ],

  // COLOMBIA (32 Departamentos + Distrito Capital)
  CO: [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar',
    'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó',
    'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira',
    'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
    'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
    'Valle del Cauca', 'Vaupés', 'Vichada'
  ],

  // PERÚ (24 Departamentos + Callao)
  PE: [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
    'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
    'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua',
    'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ],

  // MÉXICO (31 Estados + Ciudad de México)
  MX: [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
    'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
    'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
    'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán',
    'Zacatecas'
  ],

  // CHILE (16 Regiones)
  CL: [
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
    'Valparaíso', 'Metropolitana de Santiago', 'O\'Higgins', 'Maule',
    'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos',
    'Aysén', 'Magallanes y Antártica Chilena'
  ],

  // ARGENTINA (23 Provincias + CABA)
  AR: [
    'Buenos Aires', 'Ciudad Autónoma de Buenos Aires (CABA)', 'Catamarca',
    'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa',
    'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
    'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
    'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'
  ],

  // ESPAÑA (17 Comunidades Autónomas + Ceuta y Melilla)
  ES: [
    'Andalucía', 'Aragón', 'Asturias', 'Islas Baleares', 'Canarias',
    'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
    'Extremadura', 'Galicia', 'Madrid', 'Murcia', 'Navarra', 'La Rioja',
    'País Vasco', 'Comunidad Valenciana', 'Ceuta', 'Melilla'
  ]
}

/**
 * Obtiene la lista de estados/provincias para un código de país
 * @param {string} countryCode - Código ISO-2 del país (ej. 'EC', 'CO', 'PE')
 * @returns {Array<string>} Lista de nombres de subdivisiones
 */
export function getSubdivisionsByCountry(countryCode) {
  if (!countryCode) return []
  const upper = String(countryCode).toUpperCase().trim()
  return SUBDIVISIONS_BY_COUNTRY[upper] || []
}

/**
 * Obtiene el término administrativo según el país (Provincia, Departamento, Estado, Región)
 * @param {string} countryCode 
 * @returns {string}
 */
export function getSubdivisionLabelByCountry(countryCode) {
  const upper = String(countryCode || '').toUpperCase().trim()
  switch (upper) {
    case 'CO':
    case 'PE':
    case 'BO':
      return 'Departamento'
    case 'MX':
    case 'US':
    case 'BR':
      return 'Estado'
    case 'CL':
      return 'Región'
    case 'ES':
      return 'Comunidad Autónoma / Provincia'
    case 'EC':
    case 'AR':
    default:
      return 'Provincia / Estado'
  }
}
