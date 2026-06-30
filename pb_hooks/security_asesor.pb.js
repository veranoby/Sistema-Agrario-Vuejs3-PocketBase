const protectedCollections = ["recetas", "paquetes_evaluacion", "comunicaciones_asesoria", "vinculaciones_asesor"];

protectedCollections.forEach((coll) => {
  onRecordsListRequest((e) => {
    checkAsesorSubscription(e);
    return e.next();
  }, coll);

  onRecordViewRequest((e) => {
    checkAsesorSubscription(e);
    return e.next();
  }, coll);

  onRecordCreateRequest((e) => {
    checkAsesorSubscription(e);
    return e.next();
  }, coll);

  onRecordUpdateRequest((e) => {
    checkAsesorSubscription(e);
    return e.next();
  }, coll);

  onRecordDeleteRequest((e) => {
    checkAsesorSubscription(e);
    return e.next();
  }, coll);
});

function checkAsesorSubscription(e) {
  const authRecord = e.auth;
  if (!authRecord) return; // Permitir que las reglas normales de la colección manejen accesos anónimos

  // Omitir restricción si es Superuser/Superadmin
  if (e.hasSuperuserAuth() || authRecord.get("role") === "superadmin") {
    return;
  }

  // Solo restringir si el usuario autenticado tiene el rol de asesor
  if (authRecord.get("role") === "asesor") {
    try {
      // 1. Buscar el módulo "asesor_plan" en base de datos
      const modulo = $app.dao().findFirstRecordByFilter("modulos", 'code = "asesor_plan"');
      
      // 2. Buscar suscripción activa para este asesor en este módulo
      $app.dao().findFirstRecordByFilter(
        "subscriptions",
        `user = "${authRecord.id}" && modulo = "${modulo.id}" && is_active = true`
      );
    } catch (err) {
      // Si no se encuentra el módulo o no hay suscripción activa, se arroja BadRequestError
      throw new BadRequestError("Acceso denegado: Se requiere una suscripción mensual activa de Asesor Técnico ($5.00 USD) para acceder a este recurso.");
    }
  }
}
