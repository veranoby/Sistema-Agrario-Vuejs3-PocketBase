/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  // Ajuste de reglas para system_config (Permitir lectura a usuarios autenticados)
  try {
    const systemConfig = db.findCollectionByNameOrId("system_config");
    systemConfig.listRule = "@request.auth.id != \"\"";
    systemConfig.viewRule = "@request.auth.id != \"\"";
    db.saveCollection(systemConfig);
  } catch (e) {
    console.warn("Colección system_config no encontrada durante la migración.");
  }

  // Ajuste de reglas para solicitudes_suscripcion (Permitir gestión a administradores de hacienda)
  try {
    const solicitudesSuscripcion = db.findCollectionByNameOrId("solicitudes_suscripcion");
    solicitudesSuscripcion.listRule = "@request.auth.hacienda = hacienda";
    solicitudesSuscripcion.viewRule = "@request.auth.hacienda = hacienda";
    solicitudesSuscripcion.createRule = "@request.auth.id != \"\"";
    // Nota: El campo 'hacienda' en la colección debe coincidir con el campo 'hacienda' del usuario autenticado
    db.saveCollection(solicitudesSuscripcion);
  } catch (e) {
    console.warn("Colección solicitudes_suscripcion no encontrada durante la migración.");
  }
}, (db) => {
  // Rollback: Restringir de nuevo a solo superusuarios
  try {
    const systemConfig = db.findCollectionByNameOrId("system_config");
    systemConfig.listRule = null;
    systemConfig.viewRule = null;
    db.saveCollection(systemConfig);
  } catch (e) {}

  try {
    const solicitudesSuscripcion = db.findCollectionByNameOrId("solicitudes_suscripcion");
    solicitudesSuscripcion.listRule = null;
    solicitudesSuscripcion.viewRule = null;
    solicitudesSuscripcion.createRule = null;
    db.saveCollection(solicitudesSuscripcion);
  } catch (e) {}
})
