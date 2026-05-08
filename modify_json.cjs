const fs = require('fs');

// 1. Read files
const tiposActividadesPath = './brain/tipo_actividades.json';
const tiposZonasPath = './brain/tipos_zonas.json';

let actividades = JSON.parse(fs.readFileSync(tiposActividadesPath, 'utf8'));
let zonas = JSON.parse(fs.readFileSync(tiposZonasPath, 'utf8'));

// Helper to rebuild metricas and formato_reporte
function updateActividad(nombre, nuevasMetricas) {
  const act = actividades.find(a => a.nombre === nombre);
  if (!act) return;

  const metricasObj = { metricas: nuevasMetricas };
  
  // Rebuild formato_reporte.columnas
  const columnas = [];
  for (const [key, val] of Object.entries(nuevasMetricas)) {
    columnas.push({
      nombre: val.descripcion.split('.')[0], // Simplification for report header
      metrica: key
    });
  }
  columnas.push({ nombre: "Observaciones", tipo: "text" });

  const formatoObj = { columnas };

  act.metricas = JSON.stringify(metricasObj, null, 2);
  act.formato_reporte = JSON.stringify(formatoObj, null, 2);
}

function updateZona(nombre, nuevasMetricas) {
  const zona = zonas.find(z => z.nombre === nombre);
  if (!zona) return;

  const metricasObj = { metricas: nuevasMetricas };
  zona.metricas = JSON.stringify(metricasObj, null, 2);
}

// --- ACTUALIZAR ACTIVIDADES ---

updateActividad("Riego y Monitoreo de Agua", {
  "fuente_agua": { "tipo": "select", "opciones": ["Pozo", "Río", "Embalse", "Agua de lluvia", "Agua tratada"], "descripcion": "Fuente de agua utilizada" },
  "tipo_riego": { "tipo": "select", "opciones": ["Goteo", "Aspersión", "Gravedad", "Microaspersión", "Otro"], "descripcion": "Tipo de sistema de riego" },
  "tiempo_riego": { "tipo": "number", "descripcion": "Tiempo de riego" },
  "unidad_tiempo_riego": { "tipo": "select", "opciones": ["Horas", "Minutos"], "descripcion": "Unidad de tiempo" },
  "volumen_agua_utilizada": { "tipo": "number", "descripcion": "Cantidad de agua utilizada" },
  "unidad_volumen_agua": { "tipo": "select", "opciones": ["m³", "Litros", "Galones"], "descripcion": "Unidad de volumen" },
  "parametros_calidad_agua": { "tipo": "multi-select", "opciones": ["pH", "Conductividad eléctrica", "Nitratos", "Sales disueltas", "Coliformes fecales"], "descripcion": "Parámetros de calidad" },
  "responsable_actividad": { "tipo": "string", "descripcion": "Responsable del riego" }
});

updateActividad("Control de Plagas y Enfermedades", {
  "plaga_o_enfermedad": { "tipo": "string", "descripcion": "Plaga o enfermedad detectada" },
  "nivel_afectacion": { "tipo": "select", "opciones": ["Bajo", "Moderado", "Alto"], "descripcion": "Grado de afectación" },
  "medida_aplicada": { "tipo": "multi-select", "opciones": ["Control biológico", "Control cultural", "Control químico", "Rotación", "Trampas"], "descripcion": "Estrategia de control" },
  "producto_fitosanitario": { "tipo": "string", "descripcion": "Producto fitosanitario aplicado" },
  "ingrediente_activo": { "tipo": "string", "descripcion": "Ingrediente activo" },
  "dosis_aplicada": { "tipo": "number", "descripcion": "Dosis aplicada por planta o área" },
  "unidad_dosis": { "tipo": "select", "opciones": ["L/ha", "kg/ha", "ml/L", "g/L", "g/planta"], "descripcion": "Unidad de dosis" },
  "cantidad_total_utilizada": { "tipo": "number", "descripcion": "Cantidad neta total usada" },
  "unidad_total": { "tipo": "select", "opciones": ["Litros", "kg", "Galones", "Envases", "Fundas"], "descripcion": "Unidad de cantidad total" },
  "frecuencia_aplicacion": { "tipo": "select", "opciones": ["Semanal", "Quincenal", "Mensual", "Según monitoreo"], "descripcion": "Frecuencia de aplicación" },
  "responsable_aplicacion": { "tipo": "string", "descripcion": "Responsable de la aplicación" }
});

updateActividad("Fertilización y Nutrición", {
  "tipo_fertilizante": { "tipo": "select", "opciones": ["Orgánico", "Sintético", "Foliar", "Granulado", "Líquido"], "descripcion": "Tipo de fertilizante" },
  "producto_fertilizante_1": { "tipo": "string", "descripcion": "Producto fertilizante primario" },
  "producto_fertilizante_2": { "tipo": "string", "descripcion": "Producto fertilizante secundario" },
  "dosis_aplicada": { "tipo": "number", "descripcion": "Dosis aplicada" },
  "unidad_dosis": { "tipo": "select", "opciones": ["kg/ha", "L/ha", "g/planta", "ml/L"], "descripcion": "Unidad de dosis" },
  "cantidad_total_utilizada": { "tipo": "number", "descripcion": "Cantidad neta total usada" },
  "unidad_total": { "tipo": "select", "opciones": ["kg", "Litros", "Sacos (50kg)", "Galones", "Quintales"], "descripcion": "Unidad de cantidad total" },
  "metodo_aplicacion": { "tipo": "select", "opciones": ["Drench", "Fertirriego", "Foliar", "Directo al suelo", "Al voleo"], "descripcion": "Método de aplicación" },
  "frecuencia_aplicacion": { "tipo": "select", "opciones": ["Semanal", "Quincenal", "Mensual", "Según análisis"], "descripcion": "Frecuencia de aplicación" },
  "responsable_aplicacion": { "tipo": "string", "descripcion": "Responsable de fertilización" }
});

updateActividad("Cosecha y Poscosecha", {
  "cultivo_cosechado": { "tipo": "select", "opciones": ["Maíz", "Arroz", "Cacao", "Banano", "Caña de azúcar", "Palma", "Otro"], "descripcion": "Cultivo cosechado" },
  "lote_origen": { "tipo": "string", "descripcion": "Lote de origen" },
  "fecha_cosecha": { "tipo": "date", "descripcion": "Fecha de cosecha" },
  "cantidad_cosechada": { "tipo": "number", "descripcion": "Cantidad recolectada" },
  "unidad_cosecha": { "tipo": "select", "opciones": ["kg", "Libras", "Quintales (100lb)", "Cajas", "Racimos", "Toneladas"], "descripcion": "Unidad de cosecha" },
  "grado_madurez": { "tipo": "select", "opciones": ["Verde", "Pintón", "Maduro", "Sobre maduro"], "descripcion": "Grado de madurez" },
  "clasificacion_producto": { "tipo": "select", "opciones": ["Primera", "Segunda", "Tercera", "Descarte"], "descripcion": "Clasificación por calidad" },
  "condicion_almacenamiento": { "tipo": "select", "opciones": ["Temperatura controlada", "Ventilado", "Granel", "Ninguna"], "descripcion": "Condiciones de almacenamiento" },
  "responsable_actividad": { "tipo": "string", "descripcion": "Responsable de cosecha" }
});

updateActividad("Gestión de Residuos y Manejo Ambiental", {
  "tipo_residuo": { "tipo": "select", "opciones": ["Orgánico", "Inorgánico", "Peligroso", "Envases de agroquímicos"], "descripcion": "Tipo de residuo" },
  "cantidad_residuo": { "tipo": "number", "descripcion": "Cantidad generada" },
  "unidad_residuo": { "tipo": "select", "opciones": ["kg", "Libras", "Toneladas", "Unidades/Envases"], "descripcion": "Unidad de medida" },
  "metodo_disposicion": { "tipo": "select", "opciones": ["Compostaje", "Reciclaje", "Reutilización", "Sitio autorizado", "Incineración"], "descripcion": "Método de disposición" },
  "empresa_recoleccion": { "tipo": "string", "descripcion": "Empresa recolectora" },
  "responsable_gestion": { "tipo": "string", "descripcion": "Responsable de gestión" }
});

updateActividad("Capacitación y Seguridad Laboral", {
  "tipo_capacitacion": { "tipo": "select", "opciones": ["Manejo agroquímicos", "Maquinaria", "Primeros auxilios", "Seguridad laboral", "BPA"], "descripcion": "Tema de capacitación" },
  "fecha_capacitacion": { "tipo": "date", "descripcion": "Fecha de capacitación" },
  "duracion_capacitacion": { "tipo": "number", "descripcion": "Duración de la capacitación" },
  "unidad_duracion": { "tipo": "select", "opciones": ["Horas", "Días"], "descripcion": "Unidad de duración" },
  "participantes": { "tipo": "number", "descripcion": "Número de participantes (personas)" },
  "uso_epp": { "tipo": "multi-select", "opciones": ["Casco", "Guantes", "Mascarilla", "Gafas", "Ropa protectora", "Botas"], "descripcion": "EPP requerido" },
  "control_medico_realizado": { "tipo": "boolean", "descripcion": "Control médico realizado" },
  "responsable_capacitacion": { "tipo": "string", "descripcion": "Responsable / Instructor" }
});

updateActividad("Almacenamiento y Transporte", {
  "producto_almacenado": { "tipo": "select", "opciones": ["Maíz", "Arroz", "Cacao", "Banano", "Caña", "Insumos", "Otro"], "descripcion": "Producto" },
  "tipo_almacenamiento": { "tipo": "select", "opciones": ["Refrigerada", "Ventilada", "Granel", "Frío", "Silo"], "descripcion": "Tipo de bodega" },
  "temperatura_almacenamiento": { "tipo": "number", "descripcion": "Temperatura" },
  "unidad_temperatura": { "tipo": "select", "opciones": ["°C", "°F"], "descripcion": "Unidad de temperatura" },
  "humedad_relativa": { "tipo": "number", "descripcion": "Humedad relativa (%)" },
  "medio_transporte": { "tipo": "select", "opciones": ["Camión refrigerado", "Camión ventilado", "Contenedor", "Vehículo abierto", "Otro"], "descripcion": "Medio de transporte" },
  "destino_transporte": { "tipo": "string", "descripcion": "Destino final" },
  "responsable_logistica": { "tipo": "string", "descripcion": "Responsable logística" }
});

updateActividad("Auditorías y Certificaciones BPA", {
  "tipo_auditoria": { "tipo": "select", "opciones": ["Interna", "Externa", "Certificación inicial", "Renovación"], "descripcion": "Tipo de auditoría" },
  "entidad_certificadora": { "tipo": "string", "descripcion": "Entidad auditora" },
  "fecha_auditoria": { "tipo": "date", "descripcion": "Fecha auditoría" },
  "resultado_auditoria": { "tipo": "select", "opciones": ["Cumple", "Cumple con obs.", "No cumple"], "descripcion": "Resultado" },
  "acciones_correctivas": { "tipo": "boolean", "descripcion": "Acciones correctivas" },
  "responsable_auditoria": { "tipo": "string", "descripcion": "Responsable" }
});

updateActividad("Manejo de Material de Propagación y Semillas", {
  "tipo_material": { "tipo": "select", "opciones": ["Semilla", "Esqueje", "Injerto", "Planta en vivero", "Clon"], "descripcion": "Tipo de material" },
  "variedad_material": { "tipo": "string", "descripcion": "Variedad" },
  "procedencia_material": { "tipo": "string", "descripcion": "Procedencia" },
  "cantidad_material": { "tipo": "number", "descripcion": "Cantidad" },
  "unidad_material": { "tipo": "select", "opciones": ["kg", "Libras", "Unidades", "Bandejas", "Fundas"], "descripcion": "Unidad" },
  "tratamiento_previo": { "tipo": "select", "opciones": ["Desinfección", "Escarificación", "Pregerminación", "Inoculación", "Ninguno"], "descripcion": "Tratamiento" },
  "condiciones_almacenamiento": { "tipo": "select", "opciones": ["Humedad", "Temperatura", "Hermético", "Sin control"], "descripcion": "Almacenamiento" },
  "responsable_actividad": { "tipo": "string", "descripcion": "Responsable" }
});

updateActividad("Siembra, Resiembra y Manejo del Cultivo", {
  "tipo_siembra": { "tipo": "select", "opciones": ["Siembra directa", "Trasplante", "Resiembra"], "descripcion": "Tipo siembra" },
  "procedencia_semilla_planta": { "tipo": "string", "descripcion": "Procedencia" },
  "densidad_siembra": { "tipo": "number", "descripcion": "Densidad de siembra" },
  "unidad_densidad": { "tipo": "select", "opciones": ["Plantas/ha", "Plantas/m²", "kg/ha"], "descripcion": "Unidad de densidad" },
  "tecnica_manejo": { "tipo": "select", "opciones": ["Poda", "Raleo", "Tutorado", "Deshierba manual", "Deshierba química", "Aporque", "Otro"], "descripcion": "Técnica aplicada" },
  "responsable_actividad": { "tipo": "string", "descripcion": "Responsable" }
});

updateActividad("Preparación y Manejo del Suelo", {
  "tipo_suelo": { "tipo": "select", "opciones": ["Arenoso", "Arcilloso", "Franco", "Limoso", "Pedregoso"], "descripcion": "Tipo de suelo" },
  "tecnica_preparacion": { "tipo": "select", "opciones": ["Labranza mínima", "Rotación", "Abono orgánico", "Solarización", "Drenaje", "Arado", "Rastra"], "descripcion": "Técnica" },
  "area_preparada": { "tipo": "number", "descripcion": "Área preparada" },
  "unidad_area": { "tipo": "select", "opciones": ["Hectáreas", "Cuadras", "m²"], "descripcion": "Unidad de área" },
  "desinfectante_utilizado": { "tipo": "select", "opciones": ["Bromuro", "Formol", "Cal", "Trichoderma", "Ninguno", "Otro"], "descripcion": "Desinfectante" },
  "frecuencia_desinfeccion": { "tipo": "select", "opciones": ["Pre-siembra", "Cada 2 ciclos", "Anual"], "descripcion": "Frecuencia desinfección" },
  "fecha_ultimo_analisis": { "tipo": "date", "descripcion": "Fecha de análisis" },
  "responsable_actividad": { "tipo": "string", "descripcion": "Responsable" }
});

updateActividad("Mantenimiento y Sanitización de Equipos y Maquinaria", {
  "equipo_mantenido": { "tipo": "select", "opciones": ["Tractor", "Aspersor", "Bomba", "Motosierra", "Sembradora", "Cosechadora", "Vehículo"], "descripcion": "Equipo" },
  "tipo_mantenimiento": { "tipo": "select", "opciones": ["Preventivo", "Correctivo", "Calibración", "Sanitización"], "descripcion": "Tipo mantenimiento" },
  "producto_sanitizante": { "tipo": "select", "opciones": ["Hipoclorito", "Peróxido", "Alcohol", "Detergente", "Ninguno"], "descripcion": "Sanitizante" },
  "cantidad_producto": { "tipo": "number", "descripcion": "Cantidad de producto" },
  "unidad_producto": { "tipo": "select", "opciones": ["Litros", "ml", "kg", "g"], "descripcion": "Unidad producto" },
  "frecuencia_mantenimiento": { "tipo": "select", "opciones": ["Diaria", "Semanal", "Mensual", "Trimestral", "Anual", "Por horas"], "descripcion": "Frecuencia" },
  "horas_uso_equipo": { "tipo": "number", "descripcion": "Horas de uso" },
  "estado_final_equipo": { "tipo": "select", "opciones": ["Operativo", "Reparación menor", "Reparación mayor", "Baja"], "descripcion": "Estado final" },
  "operario_responsable": { "tipo": "string", "descripcion": "Operario" }
});

// --- ACTUALIZAR ZONAS ---

updateZona("Infraestructura General", {
  "tipo_infraestructura": { "tipo": "select", "opciones": ["Oficinas", "Bodega", "Campamento", "Comedor", "Otro"], "descripcion": "Clasificación" },
  "superficie_total": { "tipo": "number", "descripcion": "Área total" },
  "unidad_superficie": { "tipo": "select", "opciones": ["m²", "Hectáreas"], "descripcion": "Unidad de superficie" },
  "estado_infraestructura": { "tipo": "select", "opciones": ["Buen estado", "Mantenimiento menor", "Mantenimiento mayor"], "descripcion": "Estado actual" },
  "medidas_seguridad": { "tipo": "multi-select", "opciones": ["Extintores", "Señalización", "Botiquín", "Iluminación de emergencia"], "descripcion": "Medidas" },
  "responsable_mantenimiento": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Áreas de gestión de residuos", {
  "tipo_residuo_principal": { "tipo": "select", "opciones": ["Orgánico", "Inorgánico", "Peligroso", "Mixto"], "descripcion": "Tipo residuo" },
  "capacidad_almacenamiento": { "tipo": "number", "descripcion": "Capacidad" },
  "unidad_capacidad": { "tipo": "select", "opciones": ["kg", "Toneladas", "m³"], "descripcion": "Unidad de capacidad" },
  "metodo_disposicion_principal": { "tipo": "select", "opciones": ["Compostaje", "Reciclaje", "Reutilización", "Sitio autorizado"], "descripcion": "Método" },
  "estado_instalaciones_sanitarias": { "tipo": "select", "opciones": ["Buen estado", "Requiere mantenimiento", "Malo"], "descripcion": "Estado" },
  "responsable_gestion": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Lotes", {
  "tipo_suelo": { "tipo": "select", "opciones": ["Arenoso", "Arcilloso", "Franco", "Limoso", "Pedregoso"], "descripcion": "Tipo suelo" },
  "subtipo_lote": { "tipo": "select", "opciones": ["Parcelas de siembra", "Descanso", "Experimental"], "descripcion": "Subtipo" },
  "area_lote": { "tipo": "number", "descripcion": "Área total" },
  "unidad_area": { "tipo": "select", "opciones": ["Hectáreas", "Cuadras", "m²"], "descripcion": "Unidad de área" },
  "densidad_siembra_estimada": { "tipo": "number", "descripcion": "Densidad de siembra" },
  "unidad_densidad": { "tipo": "select", "opciones": ["plantas/ha", "plantas/m²"], "descripcion": "Unidad de densidad" },
  "responsable_manejo": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Fuentes de Agua y Sistema de Riego", {
  "tipo_fuente_agua": { "tipo": "select", "opciones": ["Pozo", "Río", "Embalse", "Agua lluvia", "Otro"], "descripcion": "Fuente" },
  "capacidad_almacenamiento": { "tipo": "number", "descripcion": "Capacidad almacenamiento" },
  "unidad_capacidad": { "tipo": "select", "opciones": ["m³", "Litros", "Galones"], "descripcion": "Unidad capacidad" },
  "caudal_promedio": { "tipo": "number", "descripcion": "Caudal" },
  "unidad_caudal": { "tipo": "select", "opciones": ["L/s", "m³/h", "GPM"], "descripcion": "Unidad caudal" },
  "tipo_sistema_riego": { "tipo": "select", "opciones": ["Goteo", "Aspersión", "Gravedad", "Microaspersión", "Otro"], "descripcion": "Sistema de riego" },
  "medidas_eficiencia_hidrica": { "tipo": "multi-select", "opciones": ["Tecnificado", "Captación de lluvia", "Programación eficiente", "Monitoreo humedad"], "descripcion": "Eficiencia" },
  "responsable_manejo_agua": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Almacenamiento y bodegas", {
  "tipo_almacen": { "tipo": "select", "opciones": ["Insumos", "Herramientas", "Cosecha", "Otro"], "descripcion": "Tipo" },
  "superficie_total": { "tipo": "number", "descripcion": "Superficie total" },
  "unidad_superficie": { "tipo": "select", "opciones": ["m²", "Hectáreas"], "descripcion": "Unidad de superficie" },
  "capacidad_volumetrica": { "tipo": "number", "descripcion": "Capacidad" },
  "unidad_volumetrica": { "tipo": "select", "opciones": ["m³", "Toneladas", "Quintales"], "descripcion": "Unidad de capacidad" },
  "productos_almacenados": { "tipo": "multi-select", "opciones": ["Semillas", "Fertilizantes", "Pesticidas", "Herramientas", "Cosecha"], "descripcion": "Productos" },
  "control_ambiental": { "tipo": "multi-select", "opciones": ["Temperatura", "Humedad", "Ventilación", "Ninguno"], "descripcion": "Control" },
  "medidas_seguridad": { "tipo": "multi-select", "opciones": ["Extintores", "Señalización", "Control plagas", "Ventilación", "Antideslizantes"], "descripcion": "Seguridad" },
  "responsable_almacen": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Talleres y Áreas de Mantenimiento", {
  "tipo_taller": { "tipo": "select", "opciones": ["Maquinaria", "Equipos", "Calibración"], "descripcion": "Tipo" },
  "area_taller": { "tipo": "number", "descripcion": "Área del taller" },
  "unidad_area": { "tipo": "select", "opciones": ["m²"], "descripcion": "Unidad área" },
  "equipos_mantenidos": { "tipo": "multi-select", "opciones": ["Tractores", "Guadañas", "Cosechadoras", "Bombas", "Herramientas manuales"], "descripcion": "Equipos" },
  "medidas_seguridad": { "tipo": "multi-select", "opciones": ["Extintores", "Señalización", "EPP", "Antideslizantes", "Botiquín"], "descripcion": "Seguridad" },
  "gestion_residuos": { "tipo": "select", "opciones": ["Reciclaje", "Vertedero", "Inadecuada"], "descripcion": "Gestión residuos" },
  "responsable_mantenimiento": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Viveros e Invernaderos", {
  "tipo_estructura": { "tipo": "select", "opciones": ["Vivero", "Invernadero", "Casa de cultivo"], "descripcion": "Tipo" },
  "superficie_total": { "tipo": "number", "descripcion": "Superficie total" },
  "unidad_superficie": { "tipo": "select", "opciones": ["m²", "Hectáreas"], "descripcion": "Unidad superficie" },
  "capacidad_plantas": { "tipo": "number", "descripcion": "Capacidad" },
  "unidad_plantas": { "tipo": "select", "opciones": ["Unidades", "Bandejas"], "descripcion": "Unidad capacidad" },
  "parametros_controlados": { "tipo": "multi-select", "opciones": ["Temperatura", "Humedad", "Ventilación", "Riego automatizado", "Luz artificial"], "descripcion": "Control" },
  "tipo_propagacion": { "tipo": "select", "opciones": ["Semillas", "Esquejes", "Injertos", "In vitro"], "descripcion": "Propagación" },
  "insumos_utilizados": { "tipo": "multi-select", "opciones": ["Sustratos", "Fertilizantes", "Hormonas", "Fungicidas", "Otro"], "descripcion": "Insumos" },
  "responsable_manejo": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Trampas y Monitoreo", {
  "tipo_trampa": { "tipo": "multi-select", "opciones": ["Feromonas", "Luz", "Adhesivas", "Otro"], "descripcion": "Tipo" },
  "cantidad_trampas": { "tipo": "number", "descripcion": "Cantidad de trampas" },
  "unidad_cantidad": { "tipo": "select", "opciones": ["Unidades", "Trampas/ha"], "descripcion": "Unidad" },
  "especie_monitoreada": { "tipo": "string", "descripcion": "Especie" },
  "frecuencia_revision": { "tipo": "select", "opciones": ["Diaria", "Semanal", "Quincenal", "Mensual"], "descripcion": "Frecuencia" },
  "responsable_monitoreo": { "tipo": "string", "descripcion": "Responsable" }
});

updateZona("Instalaciones sanitarias", {
  "tipo_instalacion": { "tipo": "multi-select", "opciones": ["Baños permanentes", "Móviles", "Lavamanos", "Duchas", "Vestidores", "Desinfección", "Otro"], "descripcion": "Tipo" },
  "ubicacion": { "tipo": "select", "opciones": ["Campo", "Cerca trabajo", "Empacadora", "Oficinas", "Bodega", "Otro"], "descripcion": "Ubicación" },
  "capacidad": { "tipo": "number", "descripcion": "Capacidad" },
  "unidad_capacidad": { "tipo": "select", "opciones": ["Personas", "Unidades"], "descripcion": "Unidad" },
  "frecuencia_limpieza": { "tipo": "select", "opciones": ["Dos veces/día", "Diaria", "Cada 2 días", "Semanal", "Otro"], "descripcion": "Limpieza" },
  "suministros": { "tipo": "multi-select", "opciones": ["Agua potable", "Jabón", "Toallas", "Papel", "Desinfectante", "Basureros"], "descripcion": "Suministros" },
  "estado": { "tipo": "select", "opciones": ["Excelente", "Bueno", "Regular", "Requiere mantenimiento", "Fuera de servicio"], "descripcion": "Estado" },
  "responsable_mantenimiento": { "tipo": "string", "descripcion": "Responsable" }
});

fs.writeFileSync(tiposActividadesPath, JSON.stringify(actividades, null, 2));
fs.writeFileSync(tiposZonasPath, JSON.stringify(zonas, null, 2));
console.log('Done!');
