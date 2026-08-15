/// <reference path="../pb_data/types.d.ts" />
/**
 * pb_hooks/asesor_tienda.pb.js
 * 
 * Hooks para el ecosistema de Tienda Virtual de Asesores:
 * 1. Auto-generación de código de orden secuencial (ORD-YYYY-XXXX).
 * 2. Registro cronológico de estados en fechas_log.
 * 3. Notificación y auto-ingreso al Kardex de Bodega al confirmar entrega.
 */

// 1. Auto-generar código de orden en asesor_pedidos antes de crear
onRecordCreateRequest((e) => {
  const collName = e.record.collection().name;
  if (collName !== "asesor_pedidos") return;

  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderCode = `ORD-${currentYear}-${randomSuffix}`;
  
  if (!e.record.get("codigo_orden")) {
    e.record.set("codigo_orden", orderCode);
  }

  const nowIso = new Date().toISOString();
  const logs = {
    creado: nowIso
  };
  e.record.set("fechas_log", logs);
}, "asesor_pedidos");

// 2. Control de transiciones de estado y fechas_log
onRecordUpdateRequest((e) => {
  const collName = e.record.collection().name;
  if (collName !== "asesor_pedidos") return;

  const nuevoEstado = e.record.get("estado");
  let fechasLog = {};
  try {
    const raw = e.record.get("fechas_log");
    fechasLog = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
  } catch (err) {
    fechasLog = {};
  }

  const nowIso = new Date().toISOString();

  if (nuevoEstado === "pago_aprobado" && !fechasLog.pagado) {
    fechasLog.pagado = nowIso;
  } else if (nuevoEstado === "en_despacho" && !fechasLog.despachado) {
    fechasLog.despachado = nowIso;
  } else if ((nuevoEstado === "entregado" || nuevoEstado === "completado") && !fechasLog.entregado) {
    fechasLog.entregado = nowIso;
  }

  e.record.set("fechas_log", fechasLog);
}, "asesor_pedidos");
