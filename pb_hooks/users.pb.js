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
