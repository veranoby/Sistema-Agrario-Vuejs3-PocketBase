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
// SOLO rotamos el tokenKey en un login real (password/oauth2), NO en auth-refresh.
// auth-refresh llega con authMethod == "" — saltarlo evita el falso positivo de
// auto-expulsión cuando el timer de refresco del frontend llama a auth-refresh.
onRecordAuthRequest((e) => {
    // authMethod es "password", "oauth2", etc. en logins reales.
    // En auth-refresh el campo llega vacío — no rotar en ese caso.
    if (!e.authMethod) {
        return e.next()
    }

    try {
        // Rotar tokenKey ANTES de e.next(): el JWT se firma con la nueva clave,
        // invalidando inmediatamente todos los tokens anteriores del usuario.
        e.record.refreshTokenKey()
        $app.save(e.record)
        
        // OPTIMIZACIÓN: Obligamos a PocketBase a generar un nuevo JWT usando
        // la llave recién creada y reemplazamos el token obsoleto del evento.
        e.token = e.record.newAuthToken()
    } catch (err) {
        $app.logger().error("Error rotando tokenKey para sesión única: " + err)
    }
    return e.next()
}, "users")

