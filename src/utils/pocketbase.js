import PocketBase from 'pocketbase'

export const pb = new PocketBase('http://127.0.0.1:8090')

/* ESTRUCTURA DE COLECCIONES DE POCKETYBASE

# Colección: haciendas
haciendas:
  id: string
  created: datetime
  updated: datetime
  name: string
  location: string
  gps: json  # Para geolocalización, formato: {lat: number, lng: number}
  info: string
  plan: select(basico, estandar, premium)  # Define el número de usuarios permitidos
  avatar: file

# Colección: tipos_zonas
tipos_zonas:
  id: string
  created: datetime
  updated: datetime
  nombre: string
  descripcion: string

# Colección: zonas
zonas:
  id: string
  created: datetime
  updated: datetime
  hacienda: relation(haciendas)
  tipo: relation(tipos_zonas)
  nombre: string
  info: string
  gps: json  # Para geolocalización, formato: {lat: number, lng: number}
  bpa: boolean  # Bandera para control de buenas prácticas agrícolas
  siembra: relation(siembras)  # Relación con la siembra actual
  area: json # para organizar el tamaño, formato: (area: number, unidad: string)
  contabilizable: boolean # si es una zona contabilizable para cosecha (sumaria las areas de las siembras contabilizables para que SIEMBRAS genere un total)
  avatar: file

# Colección: siembras
siembras:
  id: string
  created: datetime
  updated: datetime
  hacienda: relation(haciendas)
  nombre: string
  tipo: string  # Para especificar variedades específicas
  fecha_inicio: date
  fecha_fin: date  # Opcional, para cultivos permanentes puede ser null
  estado: select(planificada, en_crecimiento, cosechada, finalizada)
  area_total: number  # Área total de la siembra
  info: string
  avatar: file
  
# Colección: tipos_actividades
tipos_actividades:
  id: string
  created: datetime
  updated: datetime
  nombre: string
  descripcion: string

# Colección: actividades
actividades:
  id: string
  created: datetime
  updated: datetime
  hacienda: relation(haciendas)
  tipo: relation(tipos_actividades)
  nombre: string
  descripcion: string
  regularidad: json  # Estructura para definir: si tiene recordatorio, id del recordatorio, la frecuencia y duración relacionado a su recordatorio
  zonas: json  # Estructura para definir: los ids de loas zonas que participaran en esta actividad. puede ser vacio, pueden ser multiples zonas.
  activa: boolean
  metricas_requeridas: json  # Define qué métricas se deben registrar para esta actividad

# Colección: bitacora
bitacora:
  id: string
  created: datetime
  updated: datetime
  hacienda: relation(haciendas)
  fecha: date
  actividad: relation(actividades)
  zona: relation(zonas). pueden ser multiples
  descripcion: string
  responsable: relation(users)
  estado: select(planificada, en_progreso, completada, cancelada)
  metricas: json  # Almacena datos específicos de la actividad según metricas_requeridas
  notas: string

# Colección: recordatorios
recordatorios:
  id: string
  created: datetime
  updated: datetime
  actividad: relation(actividades)
  ultima_ejecucion: date
  proximo_recordatorio: date
  frecuencia: select(diaria, semanal, quincenal, mensual, personalizada)
  frecuencia_personalizada: string  # Para casos especiales, ej: "cada 3 días"
  estado: select(activo, pausado, finalizado)
  destinatarios: json  # Lista de IDs de usuarios a notificar

  */
