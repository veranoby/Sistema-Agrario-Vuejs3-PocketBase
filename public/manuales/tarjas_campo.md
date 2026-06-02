# Manual de Usuario: Tarjas de Campo

## 📌 ¿Qué hace este módulo?
Las **Tarjas de Campo** son el registro digital de la cosecha: cuántas cajas, racimos, kilos o unidades recogió cada trabajador en un día. Este registro alimenta dos cosas simultáneamente:
1. **El módulo de Nómina:** calcula automáticamente el pago por destajo (pago por unidad cosechada).
2. **El módulo de Rentabilidad:** determina el ingreso estimado por lote de siembra.

Está diseñado para usarse **desde el teléfono en campo**, de forma rápida y sin complicaciones.

---

## 📍 ¿Dónde se accede?
**Menú lateral → "Cosechas (Tarjas)"**  
URL directa: `/hacienda/tarjas`

> Solo visible para **Administrador** con el módulo `tarjas_campo` activado.  
> Cualquier usuario puede registrar tarjas desde el menú, pero la vista completa con historial y estadísticas es solo para Administrador.

---

## 📋 Requerimientos Logísticos
1. Las **Siembras/Lotes** deben estar creadas en el sistema antes de registrar tarjas (para saber a qué lote corresponde la cosecha).
2. Los trabajadores que cosechan deben estar registrados en la **Plantilla de Nómina** (si tiene el módulo `nomina_express`) para que el pago por destajo se calcule correctamente.
3. Defina las **tarifas de venta** de su producto (dólares por caja/racimo/kilo) en los ajustes de su hacienda, para que el módulo de Rentabilidad pueda calcular ingresos reales.

---

## 🚀 Guía Paso a Paso

### Registrar una cosecha del día
1. En `/hacienda/tarjas`, haga clic en **"Registrar Cosecha"**.
2. Complete el formulario:
   - **Fecha:** el sistema pone la fecha actual automáticamente.
   - **Trabajador:** seleccione de la lista (de la Plantilla de Nómina).
   - **Siembra/Lote:** a qué lote corresponde esta cosecha.
   - **Tipo de cosecha y cantidad:** ej. "cajas: 24".
   - **Merma (opcional):** si parte de lo cosechado no sirve (daño, enfermedad), anote la cantidad de merma y el motivo. El sistema calculará la **cosecha neta** automáticamente (`total - merma`).
3. Haga clic en **"Guardar"**.

### Ver el historial de cosechas
1. La tabla principal muestra todas las tarjas registradas ordenadas por fecha.
2. Las columnas muestran: trabajador, lote, cantidad total, merma, cosecha neta.
3. El totalizador al pie muestra la suma total del período visible.

### Conexión con Nómina Express
Si tiene el módulo `nomina_express` activo, verá una indicación en la pantalla de Tarjas que confirma que estos registros alimentan el cálculo de destajo. Al generar la nómina semanal, el sistema suma las unidades cosechadas por cada trabajador en el período y las multiplica por la tarifa de destajo definida en su plantilla.

---

## ⚠️ Limitaciones actuales conocidas
- No es posible editar una tarja guardada. Si hay un error, debe eliminarse y volver a registrarse.
- La exportación a Excel del módulo de Tarjas incluye el resumen del período y el desglose por trabajador.
