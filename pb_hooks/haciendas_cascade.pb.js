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
