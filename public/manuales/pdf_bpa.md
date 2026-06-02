# Manual de Usuario: Exportación PDF BPA Certificada

## 📌 ¿Qué hace este módulo?
El módulo de **PDF BPA Certificado** genera un reporte PDF inmutable de cada entrada de Bitácora, con una firma digital RSA que garantiza que el documento no ha sido alterado. Este PDF está diseñado para presentarse ante inspectores de **Agrocalidad** o auditorías de certificación BPA (Buenas Prácticas Agrícolas).

El PDF incluye: portada con datos de la hacienda, tabla de la actividad realizada, las preguntas y respuestas de cumplimiento BPA marcadas, y un código QR de verificación.

---

## 📍 ¿Dónde se accede?
**No tiene una sección propia en el menú.** El botón de descarga de PDF aparece directamente en cada **tarjeta de entrada de Bitácora**.

Flujo: Menú lateral → **"Bitácora"** → abrir una entrada → botón **"Descargar PDF BPA"** (ícono de hoja con sello).

> El botón de descarga solo aparece si:
> 1. La hacienda tiene el módulo `pdf_bpa` activado, Y
> 2. La entrada de Bitácora tiene una **firma digital aplicada** (hash de firma presente).

---

## 📋 Requerimientos Logísticos
1. La hacienda debe tener configurados sus datos completos (nombre, RUC, dirección, logo) en el perfil, ya que aparecen en la portada del PDF.
2. Cada actividad registrada en Bitácora debe completar el **cuestionario BPA** (las preguntas de cumplimiento asociadas al tipo de actividad).
3. El operador o responsable debe **firmar digitalmente** la entrada antes de que se pueda generar el PDF.

---

## 🚀 Guía Paso a Paso

### 1. Completar el cuestionario BPA al registrar la actividad
1. Al crear una entrada en la **Bitácora** (Menú → Bitácora → botón "+"), complete todos los campos del formulario.
2. Si la actividad tiene preguntas BPA asociadas (ej: "¿Se usó EPP?", "¿Se respetaron las dosis?"), respóndalas todas. Las respuestas pueden ser: Sí / No / Parcialmente / No Aplica.
3. Al final del formulario, el campo de **Firma Digital** le permite firmar la entrada con su nombre o código de operador. Esta firma es obligatoria para generar el PDF.
4. Haga clic en **"Guardar"**.

### 2. Descargar el PDF de una entrada firmada
1. En la lista de la **Bitácora**, encuentre la entrada que desea certificar.
2. Si la entrada tiene firma, verá el botón **"Descargar PDF BPA"** (ícono de certificado o hoja).
3. Haga clic. El sistema generará el PDF en su dispositivo automáticamente (sin necesidad de conexión a internet una vez iniciado).
4. El PDF descargado tiene un nombre descriptivo con la fecha y el tipo de actividad.

### 3. Verificar la autenticidad de un PDF (para inspectores)
Cada PDF contiene un **código QR** en la esquina inferior. Un inspector puede:
1. Escanear el código QR con su teléfono.
2. El QR abre la URL: `https://conagri.conespacio.org/validar-firma?hash=XXXXXX`
3. Si el documento es auténtico y no ha sido alterado, el sistema mostrará en pantalla: **"✅ Documento verificado"** con los datos de la entrada.
4. Si el hash no coincide, mostrará: **"❌ Documento no encontrado o alterado"**.

---

## ⚠️ Limitaciones actuales conocidas
- Si una entrada de Bitácora **no fue firmada** en el momento de crearla, no es posible agregar la firma después (el formulario de edición no muestra la sección de firma). La entrada debe eliminarse y recrearse con firma.
- El PDF se genera en el dispositivo del usuario (no en el servidor). En conexiones lentas o dispositivos antiguos, puede tardar unos segundos.
