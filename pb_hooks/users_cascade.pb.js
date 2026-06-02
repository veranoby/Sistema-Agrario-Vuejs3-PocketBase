onRecordDeleteRequest((e) => {
    const user = e.record;
    if (user.get("role") === "administrador") {
        const haciendaId = user.get("hacienda");
        if (haciendaId) {
            try {
                $app.runInTransaction((txApp) => {
                    // Borrar usuarios hijos operativos y auditores
                    const children = txApp.findRecordsByFilter("users", `hacienda = '${haciendaId}' && id != '${user.id}'`);
                    for (let i = 0; i < children.length; i++) {
                        txApp.delete(children[i]);
                    }
                    
                    // Borrar recetas
                    const recetas = txApp.findRecordsByFilter("recetas", `hacienda = '${haciendaId}'`);
                    for (let i = 0; i < recetas.length; i++) {
                        txApp.delete(recetas[i]);
                    }

                    // Borrar hacienda
                    try {
                        const hacienda = txApp.findRecordById("Haciendas", haciendaId);
                        if (hacienda) {
                            txApp.delete(hacienda);
                        }
                    } catch(err) {}
                });
            } catch(err) {
                $app.logger().error("Error cascada users: " + err);
            }
        }
    }
    return e.next();
}, "users");
