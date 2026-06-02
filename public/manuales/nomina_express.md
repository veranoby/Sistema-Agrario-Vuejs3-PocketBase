# Manual de Usuario: Nómina Agrícola Express

## 📌 ¿Qué hace este módulo?
El módulo de **Nómina Agrícola Express** calcula automáticamente el pago semanal de cada trabajador de campo basándose en los días que aparecen registrados en la Bitácora de actividades. Genera un reporte descargable listo para pagar, sin necesidad de planillas manuales en Excel.

> **Importante:** El módulo funciona con su propio registro de personal. Los trabajadores de campo **no necesitan tener usuario en el sistema**. Usted registra a cada jornalero una sola vez en la "Plantilla de Personal" y el sistema los reconoce desde ese momento.

---

## 📍 ¿Dónde se accede?
**Menú lateral → "Nómina Express"**  
URL directa: `/hacienda/nomina`

> Solo visible para usuarios con rol **Administrador** y con el módulo `nomina_express` activado en su suscripción.

---

## 📋 Requerimientos Logísticos
Para que la nómina funcione correctamente:
1. **Registre su plantilla de personal** (ver Sección 1 abajo). Un trabajador que no esté en la plantilla nunca aparecerá en la nómina.
2. **Al registrar Bitácoras**, los operadores deben seleccionar en el campo "Trabajadores que participaron" a las personas que estuvieron en esa actividad ese día.
3. Cada trabajador tiene un valor de jornal base definido en su perfil de la plantilla. Este valor puede modificarse en cualquier momento.

---

## 🚀 Guía Paso a Paso

### Pestaña 1: Plantilla de Personal (primer paso, siempre)
1. En `/hacienda/nomina`, haga clic en la pestaña **"Plantilla de Personal"** (icono de grupo).
2. Haga clic en **"Agregar Trabajador"** para registrar a cada jornalero.
3. Complete: Nombre completo, Número de cédula (opcional), y el **Valor del Jornal diario** en dólares.
4. Un trabajador puede **bloquearse** (deja de aparecer en nuevas nóminas, pero conserva el historial) con el botón de activar/desactivar en la tabla.

### Pestaña 2: Cálculo Semanal
1. Seleccione el rango de fechas de la semana que desea calcular usando los botones **"Esta Semana"** o **"Semana Anterior"**, o defina las fechas manualmente.
2. Haga clic en **"Generar"**. El sistema buscará en la Bitácora todos los días en que cada trabajador de la plantilla fue registrado como participante.
3. Revise el borrador generado: verá una tabla con cada trabajador, los días trabajados y el total a pagar.
4. Si hay correcciones (un día que faltó alguien, etc.), corrija la Bitácora del día correspondiente y regenere el borrador.
5. Haga clic en **"Guardar Borrador"** para preservar el cálculo sin cerrarlo aún.
6. Cuando esté listo para pagar, haga clic en **"Cerrar Nómina"**. Una vez cerrada, la nómina pasa al historial y no puede editarse.
7. Al cerrar, aparece el botón **"Marcar como Pagada"** para confirmar que el desembolso se realizó.

### Pestaña 3: Historial de Cerradas
1. Aquí aparecen todas las nóminas ya cerradas, organizadas por semana.
2. Haga clic en **"Exportar Excel"** para descargar el desglose completo con los totales por trabajador.
3. Si tiene el módulo de **Finanzas** activo, use el botón **"Registrar en Finanzas"** para que el costo total de la nómina quede registrado automáticamente como un egreso en su dashboard financiero.

---

## ⚠️ Limitaciones actuales conocidas
- El cálculo de **destajo** (pago por unidad cosechada) se complementa con el módulo de Tarjas. Si tiene ese módulo activo, los datos de cosecha del mismo período se incluyen en el cálculo.
- La nómina calcula **jornal básico** (días presentes × valor jornal). Horas extra o bonificaciones deben calcularse y ajustarse manualmente en la bitácora de notas.
