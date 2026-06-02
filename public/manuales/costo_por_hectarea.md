# Manual de Usuario: Costo por Hectárea y Rentabilidad

## 📌 ¿Qué hace este módulo?
El módulo de **Costo por Hectárea** es el cerebro financiero analítico de su hacienda. No requiere que ingrese datos aquí directamente. Lo que hace es **cruzar automáticamente** la información de tres fuentes:
- Cuánto insumo salió de **Bodega** y a qué costo (Kardex)
- Cuánto pagó en **Nómina** a los trabajadores
- Cuánto cosechó en **Tarjas de Campo**

Con esto le muestra exactamente cuánto le cuesta mantener cada hectárea de cultivo y si ese lote está siendo rentable (ROI) o está generando pérdidas.

---

## 📍 ¿Dónde se accede?
Este módulo tiene **dos vistas complementarias**:

**1. Dashboard Gerencial:**  
Menú lateral → "Dashboard Gerencial"  
URL directa: `/hacienda/dashboard`  
→ Muestra KPIs consolidados: costo total de nómina, insumos y cosecha del período. Botón "Exportar Excel".

**2. Rentabilidad por Siembras:**  
Menú lateral → "Rentabilidad Siembras"  
URL directa: `/hacienda/rentabilidad`  
→ Muestra una tabla por cada lote/siembra con su costo operativo, ingreso estimado y ROI.

> Ambas vistas son solo para **Administrador** con el módulo `costo_por_hectarea` activado.

---

## 📋 Requerimientos Logísticos
Para que los cálculos sean precisos, la hacienda debe tener configurado:
1. **Siembras con área definida:** Cada lote debe tener declarado su tamaño en hectáreas. Si dice 0, el cálculo de "costo por hectárea" será infinito.
2. **Costo de adquisición en Bodega:** Cada insumo debe tener registrado su precio de compra. Sin esto, los costos de insumos no se incluyen en el cálculo.
3. **Tarifas de venta configuradas:** En los ajustes de su hacienda, defina el precio de venta de su producto (dólares por caja, racimo, kilo, unidad). Sin esto, el sistema no puede calcular el ingreso estimado y mostrará un banner de advertencia.
4. **Trabajadores con jornal definido:** En la Plantilla de Nómina, cada trabajador debe tener su valor de jornal configurado.

---

## 🚀 Guía Paso a Paso

### Dashboard Gerencial (`/hacienda/dashboard`)
1. Al ingresar, el sistema carga automáticamente los datos del mes en curso. Puede tardar unos segundos.
2. Haga clic en **"Actualizar"** para refrescar los datos si realizó cambios recientes.
3. Verá las tarjetas de KPI mostrando:
   - **Total Nómina del período** (solo si tiene `nomina_express` activo)
   - **Total Insumos de Bodega** (solo si tiene `kardex_bodega` activo)
   - **Cosecha estimada** (basada en Tarjas)
   - **Balance general**
4. Use **"Exportar Excel"** para descargar el resumen del período. Si tiene Nómina y Bodega activos, el Excel puede incluir hojas adicionales con el desglose de cada módulo.

### Rentabilidad por Siembras (`/hacienda/rentabilidad`)
1. Al ingresar verá una tabla con cada siembra/lote activo.
2. Para cada lote se muestra:
   - **Costo de insumos aplicados** (del Kardex, según las actividades de Bitácora en ese lote)
   - **Costo de mano de obra** (de la Nómina, proporcional a los jornales en ese lote)
   - **Cosecha neta** (de Tarjas, descontando merma)
   - **Ingreso estimado** (cosecha neta × tarifa de venta configurada)
   - **ROI** (ingreso estimado − costo total)
3. Haga clic en **"Recalcular"** para forzar una nueva lectura de los datos.

---

## ⚠️ Limitaciones actuales conocidas
- Si las **tarifas de venta** no están configuradas en los ajustes de la hacienda, el sistema mostrará un banner amarillo advirtiendo que los ingresos estimados son $0. Los costos sí se calculan correctamente.
- El módulo requiere datos de los otros módulos para funcionar al máximo. Funciona con datos parciales, pero los cálculos serán menos precisos.
