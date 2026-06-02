# Manual de Usuario: Kardex de Bodega Conectado

## 📌 ¿Qué hace este módulo?
El **Kardex de Bodega** le permite llevar un control preciso del inventario de insumos agrícolas (plaguicidas, fertilizantes, materiales). Lo más poderoso: cuando un operador registra una actividad en la Bitácora (ej: "Aplicación de fungicida"), puede seleccionar directamente qué producto usó y en qué cantidad. El sistema descuenta automáticamente el stock de bodega. Esto elimina el conteo físico y le alerta cuando un producto está por agotarse.

---

## 📍 ¿Dónde se accede?
**Menú lateral → "Bodega"**  
URL directa: `/hacienda/bodega`

> Solo visible para **Administrador y Auditor** con el módulo `kardex_bodega` activado.  
> El acceso para **Operadores** (solo en Bitácora) no requiere acceder directamente a Bodega.

---

## 📋 Requerimientos Logísticos
1. Antes de registrar consumos en la Bitácora, debe tener los productos ingresados en Bodega con su **stock inicial** y **costo de adquisición**.
2. El costo de adquisición es obligatorio. Sin él, el módulo de **Costo por Hectárea** no puede calcular el costo real de sus insumos.
3. Es recomendable definir un **stock mínimo** por producto para activar alertas automáticas.

---

## 🚀 Guía Paso a Paso

### 1. Registrar un nuevo insumo (primer ingreso)
1. En `/hacienda/bodega`, haga clic en **"Nuevo Insumo"**.
2. Complete los campos:
   - **Nombre del producto** (ej: "Mancozeb 80%")
   - **Código SAR** (opcional, para empresas obligadas a reportar al SAG)
   - **Tipo:** plaguicida / fertilizante / material
   - **Unidad:** litros, kilos, unidades, etc.
   - **Costo Unitario de Compra ($):** precio que pagó por cada unidad. Campo obligatorio.
   - **Stock mínimo de alerta** (opcional)
3. Haga clic en **"Guardar"**.

### 2. Registrar ingreso de inventario (compra de insumos)
1. Encuentre el producto en la tabla y haga clic en su tarjeta.
2. Seleccione **"Registrar Ajuste"** → tipo **"Ingreso"**.
3. Indique la cantidad que ingresa y el precio unitario pagado en esta compra.
4. Si tiene el módulo de **Finanzas** activo, el sistema le preguntará si desea registrar esta compra también como un egreso financiero. Marque la casilla para evitar doble trabajo.
5. El sistema recalcula automáticamente el **costo promedio ponderado** del producto.

### 3. Registrar consumo de insumos (descuento automático desde Bitácora)
1. Al crear una nueva entrada en la **Bitácora** (Menú → Bitácora → botón "+"), aparecerá la sección **"Insumos consumidos"** al final del formulario.
2. Seleccione el producto de la lista desplegable (solo aparecen los que tienen stock > 0).
3. Indique la cantidad usada.
4. Al guardar la Bitácora, el stock se descuenta automáticamente. Si la cantidad pedida supera el stock, el sistema le avisa antes de guardar.

> **Nota:** El descuento desde Bitácora **solo aplica al crear** una nueva entrada. Al editar una entrada existente, no se puede modificar el consumo de bodega.

### 4. Consultar movimientos y auditar el historial
1. En la vista de Bodega puede ver todos los movimientos de cada producto (ingresos manuales, egresos por Bitácora).
2. Cada movimiento guarda la referencia a la Bitácora que lo originó, permitiendo trazabilidad completa.
3. Use **"Eliminar"** solo en casos de corrección, ya que no se puede deshacer.

---

## ⚠️ Alertas de stock bajo
El sistema revisa automáticamente el stock de todos los insumos. Si un producto baja del nivel mínimo definido, aparecerá un ícono de alerta (🔴) en la tabla de bodega y una notificación en el panel de alertas del sistema.
