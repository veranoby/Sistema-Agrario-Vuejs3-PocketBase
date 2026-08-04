onRecordDeleteRequest((e) => {
    const hacienda = e.record;
    const haciendaId = hacienda.id;

    try {
        $app.runInTransaction((txApp) => {
            // Borrar usuarios de esta hacienda
            const users = txApp.findRecordsByFilter("users", `hacienda = '${haciendaId}'`);
            for (let i = 0; i < users.length; i++) {
                txApp.delete(users[i]);
            }
            
            // Borrar recetas
            const recetas = txApp.findRecordsByFilter("recetas", `hacienda = '${haciendaId}'`);
            for (let i = 0; i < recetas.length; i++) {
                txApp.delete(recetas[i]);
            }
        });
    } catch(err) {
        $app.logger().error("Error cascada haciendas: " + err);
    }

    return e.next();
}, "Haciendas");

onRecordUpdateRequest((e) => {
    const hacienda = e.record;
    const newStatus = hacienda.get("status");
    if (newStatus === "suspended") {
        const haciendaId = hacienda.id;
        try {
            $app.runInTransaction((txApp) => {
                const users = txApp.findRecordsByFilter("users", `hacienda = '${haciendaId}'`);
                for (let i = 0; i < users.length; i++) {
                    if (users[i].get("status") !== "suspended") {
                        users[i].set("status", "suspended");
                        try { users[i].refreshTokenKey(); } catch(tkErr) {}
                        txApp.save(users[i]);
                    }
                }
            });
        } catch(err) {
            $app.logger().error("Error cascada soft-delete haciendas: " + err);
        }
    }
    return e.next();
}, "Haciendas");
