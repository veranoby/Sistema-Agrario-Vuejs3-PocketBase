routerAdd("POST", "/api/contact", (c) => {
    const data = $apis.requestInfo(c).data;
    const nombre = data.nombre || "Usuario";
    const email = data.email || "no-reply@conespacio.org";
    const mensaje = data.mensaje || "";
    const toEmail = "contacto@conespacio.org"; // Definido por el usuario

    const message = new MailerMessage({
        from: {
            address: "contacto@conespacio.org",
            name: "ConAgri Contacto"
        },
        to: [{address: toEmail}],
        subject: "Nuevo mensaje de contacto de " + nombre,
        html: "<p><strong>Nombre:</strong> " + nombre + "</p><p><strong>Email:</strong> " + email + "</p><p><strong>Mensaje:</strong></p><p>" + mensaje + "</p>",
        headers: {
            "Reply-To": email
        }
    });

    try {
        $app.newMailClient().send(message);
        return c.json(200, { success: true, message: "Mensaje enviado exitosamente" });
    } catch (err) {
        return c.json(500, { success: false, message: err.message });
    }
});
