import PocketBase from 'pocketbase'

export const pb = new PocketBase('http://127.0.0.1:8090')

/* ESTRUCTURA DE COLECCIONES DE POCKETYBASE

# Colección: 
Haciendas:
  id: string
  created: datetime
  updated: datetime
  name: string
  location: string
  gps: json  # Para geolocalización, formato: {lat: number, lng: number}
  info: string
  plan: select(basico, estandar, premium)  # Define el número de usuarios permitidos
  avatar: file
  metricas: json (metrica_X": {"tipo": "boolean/checkbox/select/number","descripcion": "xyz?"})


# Colección: 
tipos_zonas:
  id: string
  created: datetime
  updated: datetime
  nombre: string
  descripcion: string
  datos_bpa: json (va a disponer de la seccion preguntas_bpa, en donde se encontraran las preguntas a responderse. generalmente en estructura pregunta,opciones,descripcion. pueden ser multiples preguntas)
  metricas: json (metrica_X": {"tipo": "boolean/checkbox/select/number","descripcion": "xyz?"})
  icon: string

# Colección: 
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
  bpa_estado: number (aqui se grabara el porcentaje de avance calculado del bpa para esta zona)
  datos_bpa: JSON (aqui se grabaran las respuestas al formulario cargado por tipos_zonas para este tipo de elemento)
  metricas: json (metrica_X": {"tipo": "boolean/checkbox/select/number","descripcion": "xyz?"})

# Colección: 
Siembras:
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
  
# Colección: 
tipos_actividades:
  id: string
  created: datetime
  updated: datetime
  nombre: string
  descripcion: string
  datos_bpa: json (va a disponer de la seccion preguntas_bpa, en donde se encontraran las preguntas a responderse. generalmente en estructura pregunta,opciones (radiobuttons),descripcion. pueden ser multiples preguntas)
  metricas: json (metrica_X": {"tipo": "boolean/checkbox/select/number","descripcion": "xyz?"})
  icon: string


# Colección: 
actividades:
  id: string
  created: datetime
  updated: datetime
  hacienda: relation(haciendas)
  tipo_actividades: relation(tipos_actividades)
  nombre: string
  descripcion: string
  recordatorio:  relation(recordatorios).
  zonas:  relation(zonas). multiple.
  siembras:  relation(siembras). multiple.
  activa: boolean
  metricas: json  # Define qué métricas se deben registrar para esta actividad
  bpa_estado: number (aqui se grabara el porcentaje de avance calculado del bpa para esta actividad)
  datos_bpa: JSON (aqui se grabaran las respuestas al formulario cargado por tipos_zonas para este tipo de elemento)

# Colección: 
bitacora:
  id: string
  hacienda: relation(haciendas)
   siembras:  relation(siembras). multiple.
  actividades: relation(actividades)
  programaciones:  relation(programaciones). 
  zonas: relation(zonas). pueden ser multiples
   fecha: date
descripcion: string
  user_created: relation(users) . para definir los responsables
   user_edited: relation(users) . para definir los responsables
 estado: select(planificada, en_progreso, completada, cancelada)
  metricas: json  # Almacena datos específicos de la actividad según metricas_requeridas
  notas: string
  created: datetime
  updated: datetime

# Colección: 
programaciones:
  id: string
  created: datetime
  updated: datetime
   descripcion: string
 hacienda: relation(haciendas)
  siembras:  relation(siembras). multiple.
actividades: relation(actividades)
  ultima_ejecucion: date
  proxima_ejecucion: date
  frecuencia: select(diaria, semanal, quincenal, mensual, personalizada)
  frecuencia_personalizada: json  # Para casos especiales, ej: "cada 3 días"
  estado: select(activo, pausado, finalizado)


  # Colección: 
recordatorios:
  id: string
  created: datetime
  updated: datetime
  hacienda: relation(haciendas)
  titulo: string
  descripcion: string
  fecha_recordatorio: datetime
  fecha_creacion: datetime
  estado: select(pendiente, en_progreso, completado)
  prioridad: select(baja, media, alta)
  siembras:  relation(siembras). multiple.
  actividades: relation(actividades). pueden ser multiples
  zonas: relation(zonas). pueden ser multiples

  */
