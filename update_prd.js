const fs = require('fs');
const prd = JSON.parse(fs.readFileSync('brain/prd_system.json', 'utf8'));

prd.modules.bodega_kardex = {
  status: "🟡",
  progress: 60,
  audit_status: "VERIFIED CODE. UI Bodega.vue y bodegaMovimientosStore parciales. Faltan campos costo_adquisicion y costo_unitario_aplicado para costeo real. Sin validación de stock en edición.",
  blockers: [
    { id: "BOD-1", severity: "ALTA", description: "Falta campo costo_adquisicion en UI y Store para costeo real." },
    { id: "BOD-2", severity: "MEDIA", description: "El egreso en bitácora no guarda el costo unitario aplicado." }
  ]
};

prd.modules.pdf_bpa_inmutable = {
  status: "🟡",
  progress: 70,
  audit_status: "VERIFIED CODE. Firma digital RSA base implementada. Falta validación pública en /validar-firma y bloqueo de descarga si no hay firma.",
  blockers: [
    { id: "PDF-1", severity: "ALTA", description: "UI no obliga a firmar para descargar PDF BPA." },
    { id: "PDF-2", severity: "MEDIA", description: "Falta vista pública /validar-firma para leer el hash." }
  ]
};

prd.modules.nomina_agricola = {
  status: "🟡",
  progress: 50,
  audit_status: "VERIFIED CODE. Store nominaStore y UI básica parcial. Modelo actual requiere que jornaleros tengan usuario, lo cual es incorrecto. Falta colección plantilla_nomina.",
  blockers: [
    { id: "NOM-1", severity: "CRITICA", description: "Modelo excluye a jornaleros sin usuario. Se requiere colección plantilla_nomina." },
    { id: "NOM-2", severity: "MEDIA", description: "importarCostosNomina implementada en store pero huérfana en UI." }
  ]
};

prd.modules.costo_por_hectarea = {
  status: "🟡",
  progress: 60,
  audit_status: "VERIFIED CODE. DashboardGerencial y RentabilidadSiembras implementados pero con hardcodings y errores de gating.",
  blockers: [
    { id: "COST-1", severity: "CRITICA", description: "Código de Router incorrecto. Protege con 'business_intelligence' en lugar de 'costo_por_hectarea'." },
    { id: "COST-2", severity: "ALTA", description: "Falta gating de módulo en DashboardGerencial (KPIs visibles a gratis)." },
    { id: "COST-3", severity: "ALTA", description: "Hardcoding en analyticsStore (fallback a 100% de costos de insumos y jornal fijo)." }
  ]
};

prd.modules.tarjas_campo = {
  status: "🟡",
  progress: 80,
  audit_status: "VERIFIED CODE. UI y store implementados y comunican con nómina para destajo. Falta campo de merma.",
  blockers: [
    { id: "TAR-1", severity: "MEDIA", description: "No hay campos de cantidad_merma ni motivo_merma en RegistroTarjaForm." },
    { id: "TAR-2", severity: "BAJA", description: "No hay conexión visual/mensajes en UI que indiquen alimentación a Nómina Express." }
  ]
};

const iaBlocker = { id: "IA-1", severity: "ALTA", description: "BYOK bypasea la verificación de suscripción ai_assistant_premium. Permitido pero no documentado formalmente como bypass intencional en reglas de negocio." };
if (!prd.modules.ia_assistant.blockers.find(b => b.id === "IA-1")) {
  prd.modules.ia_assistant.blockers.push(iaBlocker);
  prd.modules.ia_assistant.status = "🟡";
}

prd.production_blockers_summary = prd.production_blockers_summary.filter(b => !["BOD-1", "PDF-1", "NOM-1"].includes(b.id));

prd.production_blockers_summary.push(
  { id: "BOD-1", severity: "ALTA", module: "bodega_kardex", short: "Falta costo_adquisicion para costeo real" },
  { id: "PDF-1", severity: "ALTA", module: "pdf_bpa_inmutable", short: "UI no exige firma para PDF" },
  { id: "NOM-1", severity: "CRITICA", module: "nomina_agricola", short: "Modelo de datos requiere usuarios para jornaleros" },
  { id: "COST-1", severity: "CRITICA", module: "costo_por_hectarea", short: "Router usa código business_intelligence incorrecto" },
  { id: "IA-1", severity: "ALTA", module: "ia_assistant", short: "BYOK bypasea pago de módulo AI" }
);

fs.writeFileSync('brain/prd_system.json', JSON.stringify(prd, null, 2));
console.log("Updated prd_system.json");
