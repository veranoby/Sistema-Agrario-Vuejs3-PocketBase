onRecordCreateRequest((e) => {
    const res = e.next();
    
    try {
        const user = e.record;
        const email = user.get("email");
        const name = user.get("name") || user.get("username") || "Usuario";

        const payload = {
            to: email,
            subject: "Bienvenido a ConAgri - Verifica tu cuenta",
            html: `<h1>Hola ${name}</h1><p>Gracias por registrarte en ConAgri. Por favor, verifica tu cuenta para empezar.</p>`,
            type: "onboarding"
        };

        $http.send({
            url: "http://127.0.0.1:8090/api/alerts/send",
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        $app.logger().error("Error disparando email de bienvenida via Resend: " + err);
    }
    
    return res;
}, "users");

// Política de sesión única — PocketBase v0.23+ compatible
// Rotamos el tokenKey ANTES de e.next() para que el JWT se firme con la nueva clave.
// Esto invalida inmediatamente todos los tokens anteriores de este usuario en el servidor.
onRecordAuthRequest((e) => {
    try {
        // refreshTokenKey() genera y asigna un nuevo tokenKey aleatorio en el record (en memoria)
        e.record.refreshTokenKey()
        // $app.save() persiste el nuevo tokenKey en la BD — API correcta en PB v0.23+
        // (reemplaza el $app.dao().saveRecord() removido desde v0.23)
        $app.save(e.record)
    } catch (err) {
        $app.logger().error("Error rotando tokenKey para sesión única: " + err)
    }
    // e.next() se ejecuta DESPUÉS del save: el JWT que genera usa el tokenKey ya persistido
    return e.next()
}, "users")

