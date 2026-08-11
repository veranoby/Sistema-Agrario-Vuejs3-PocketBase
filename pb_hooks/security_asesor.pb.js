const protectedCollections = ["recetas", "paquetes_evaluacion", "comunicaciones_asesoria", "vinculaciones_asesor"];

protectedCollections.forEach((coll) => {
  onRecordsListRequest((e) => {
    const authRecord = e.auth;
    if (authRecord && !e.hasSuperuserAuth() && authRecord.get("role") === "asesor") {
      try {
        const modulo = $app.dao().findFirstRecordByFilter("modulos", 'code = "asesor_plan"');
        $app.dao().findFirstRecordByFilter(
          "subscriptions",
          `user = "${authRecord.id}" && modulo = "${modulo.id}" && is_active = true`
        );
      } catch (err) {
        throw new BadRequestError("Acceso denegado: Se requiere una suscripción mensual activa de Asesor Técnico ($5.00 USD) para acceder a este recurso.");
      }
    }
    return e.next();
  }, coll);

  onRecordViewRequest((e) => {
    const authRecord = e.auth;
    if (authRecord && !e.hasSuperuserAuth() && authRecord.get("role") === "asesor") {
      try {
        const modulo = $app.dao().findFirstRecordByFilter("modulos", 'code = "asesor_plan"');
        $app.dao().findFirstRecordByFilter(
          "subscriptions",
          `user = "${authRecord.id}" && modulo = "${modulo.id}" && is_active = true`
        );
      } catch (err) {
        throw new BadRequestError("Acceso denegado: Se requiere una suscripción mensual activa de Asesor Técnico ($5.00 USD) para acceder a este recurso.");
      }
    }
    return e.next();
  }, coll);

  onRecordCreateRequest((e) => {
    const authRecord = e.auth;
    if (authRecord && !e.hasSuperuserAuth() && authRecord.get("role") === "asesor") {
      try {
        const modulo = $app.dao().findFirstRecordByFilter("modulos", 'code = "asesor_plan"');
        $app.dao().findFirstRecordByFilter(
          "subscriptions",
          `user = "${authRecord.id}" && modulo = "${modulo.id}" && is_active = true`
        );
      } catch (err) {
        throw new BadRequestError("Acceso denegado: Se requiere una suscripción mensual activa de Asesor Técnico ($5.00 USD) para acceder a este recurso.");
      }
    }
    return e.next();
  }, coll);

  onRecordUpdateRequest((e) => {
    const authRecord = e.auth;
    if (authRecord && !e.hasSuperuserAuth() && authRecord.get("role") === "asesor") {
      try {
        const modulo = $app.dao().findFirstRecordByFilter("modulos", 'code = "asesor_plan"');
        $app.dao().findFirstRecordByFilter(
          "subscriptions",
          `user = "${authRecord.id}" && modulo = "${modulo.id}" && is_active = true`
        );
      } catch (err) {
        throw new BadRequestError("Acceso denegado: Se requiere una suscripción mensual activa de Asesor Técnico ($5.00 USD) para acceder a este recurso.");
      }
    }
    return e.next();
  }, coll);

  onRecordDeleteRequest((e) => {
    const authRecord = e.auth;
    if (authRecord && !e.hasSuperuserAuth() && authRecord.get("role") === "asesor") {
      try {
        const modulo = $app.dao().findFirstRecordByFilter("modulos", 'code = "asesor_plan"');
        $app.dao().findFirstRecordByFilter(
          "subscriptions",
          `user = "${authRecord.id}" && modulo = "${modulo.id}" && is_active = true`
        );
      } catch (err) {
        throw new BadRequestError("Acceso denegado: Se requiere una suscripción mensual activa de Asesor Técnico ($5.00 USD) para acceder a este recurso.");
      }
    }
    return e.next();
  }, coll);
});



