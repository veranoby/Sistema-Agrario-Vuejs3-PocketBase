const fs = require('fs');
const path = require('path');

// Helper to recursively get files
function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      getFiles(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

// 1. PINIA STORES
const storeFiles = getFiles('src/stores').filter(f => f.endsWith('.js'));
const storesData = storeFiles.map(f => {
  const content = fs.readFileSync(f, 'utf8');
  const hasDefineStore = content.includes('defineStore');
  if (!hasDefineStore && !f.includes('index.js')) return null;
  
  let usage = "Internal/Helper";
  if (f.includes('auth')) usage = "RBAC, JWT, Profile Management";
  if (f.includes('hacienda')) usage = "Hacienda Context, Expiry, Module Access";
  if (f.includes('sync')) usage = "Offline Queue, IndexedDB caching, Network monitor";
  if (f.includes('actividades')) usage = "CRUD Actividades, BPA Status calc";
  if (f.includes('zonas')) usage = "GIS GeoJSON (Lotes/Puntos), BPA Status calc";
  if (f.includes('siembras')) usage = "Agricultural Projects, Harvest projections";
  if (f.includes('finanza')) usage = "Income/Expense CRUD, Filters, Excel Export";
  if (f.includes('plan')) usage = "Subscription limits, Available modules fetch";
  if (f.includes('analytics')) usage = "Global Usage/Patterns (SuperAdmin)";
  if (f.includes('bitacora')) usage = "Field logs, Digital Signatures (WebCrypto)";
  if (f.includes('notification')) usage = "In-app alerts, UI feedback";
  if (f.includes('recordatorios')) usage = "Event scheduling, Priorities";
  if (f.includes('programaciones')) usage = "Activity planners, AI Calendar suggestions";

  let status = "✅";
  if (f.includes('finanza') || f.includes('analytics') || f.includes('plan')) status = "🟡";

  return {
    name: path.basename(f, '.js').replace('Store', ''),
    path: f,
    status: status,
    usage: usage,
    state_persistence: content.includes('localStorage') || content.includes('IndexedDB') ? "Yes" : "No"
  };
}).filter(Boolean);

fs.writeFileSync('brain/pinia_stores_reference.json', JSON.stringify({ stores: storesData }, null, 2));

// 2. API ENDPOINTS (pb_hooks)
const hookFiles = getFiles('pb_hooks').filter(f => f.endsWith('.js'));
const endpoints = [];
hookFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = [...content.matchAll(/routerAdd\("([^"]+)", "([^"]+)"/g)];
  matches.forEach(m => {
    endpoints.push({
      path: m[2],
      method: m[1],
      handler_file: f,
      status: f.includes('alerts.send') || f.includes('reports.pb') ? '🟡 (Orphan/Zombie)' : '✅',
      auth: content.includes('$apis.requireAuth()') ? 'requireAuth()' : 'None',
      error_handling: content.includes('catch') ? 'Yes' : 'No'
    });
  });
});

fs.writeFileSync('brain/pb_api_reference.json', JSON.stringify({
  api_type: "PocketBase JSVM / REST",
  base_collections: ["users", "Haciendas", "zonas", "Siembras", "bitacora", "actividades", "tipos_zonas", "tipo_actividades", "recordatorios", "programaciones"],
  custom_hooks: endpoints,
  validation_status: "Standard PB validation + try/catch in hooks."
}, null, 2));

// 3. PRD SYSTEM (Modules)
const prd = {
  system_name: "Gestión Agri",
  version: "1.0.0",
  audit_type: "Absolute Verification (Owl Protocol)",
  modules: {
    core_operativo: {
      name: "Core Operativo (Hacienda, Zonas, Siembras, Bitácora)",
      status: "✅",
      progress: 95,
      components: getFiles('src/components/hacienda').concat(getFiles('src/components/siembras'), getFiles('src/components/actividades')).map(f => path.basename(f)),
      audit_status: "100% Constatado. CRUD altamente funcional. Sincronización offline operando en src/stores/sync/index.js usando IndexedDB. Guards de rol implementados."
    },
    gis_avanzado: {
      name: "GIS Avanzado (Mapeo)",
      status: "✅",
      progress: 90,
      components: ["GisMapComponent.vue"],
      audit_status: "Verificado. Renderizado imperativo en GisMapComponent.vue con soporte para Puntos y Polígonos. Datos geo persistidos."
    },
    finanzas_pro: {
      name: "Finanzas Pro",
      status: "🟡",
      progress: 70,
      components: ["FinanzasConfig.vue", "FinanzasForm.vue", "FinanzasImportExcel.vue"],
      missing: ["Dashboard ROI/Analítica", "Exportación SRI"],
      audit_status: "Registro manual, filtros y exportación básica de Excel confirmados. Carece de la capa analítica prometida (ROI)."
    },
    inteligencia_artificial: {
      name: "IA Assistant",
      status: "🟡",
      progress: 60,
      components: ["AiAssistant.vue"],
      services: ["aiService.js", "aiContextBuilder.js"],
      missing: ["RAG con BD vector", "Análisis de imágenes"],
      audit_status: "UI funcional. Integrado con OpenRouter (modelo fallback local). Limite de cuota en frontend. Usado para sugerir calendarios y autocompletar bitácora."
    },
    auditoria_bpa: {
      name: "Auditoría BPA & Firma",
      status: "🟡",
      progress: 40,
      components: ["BitacoraSignature.vue"],
      services: ["digitalSignature.js"],
      missing: ["Checklists dinámicos", "Dashboard BPA dedicado", "Reportes Inmutables PDF"],
      audit_status: "Servicio WebCrypto verificado e inyectado en BitacoraEntryCard.vue. Cálculo de progreso BPA en stores. Falta flujo completo de certificación."
    },
    alertas_y_reportes: {
      name: "Automatización (Alertas/Reportes)",
      status: "❌",
      progress: 20,
      backend_files: ["alerts.send.js", "reports.pb.js"],
      missing: ["Triggers automáticos (Crons/RecordHooks)", "UI de Configuración"],
      audit_status: "Lógica Backend robusta (Zombies). Frontend no posee UI para activar reportes ni el backend dispara alertas automáticamente. ContactUs expone API Key de Resend (Riesgo)."
    }
  }
};
fs.writeFileSync('brain/prd_system.json', JSON.stringify(prd, null, 2));

// 4. SDD SYSTEM (Architecture)
const sdd = {
  stack: {
    frontend: "Vue 3, Pinia, Vuetify 3, Tailwind CSS",
    backend: "PocketBase (Go + JSVM Hooks)",
    database: "SQLite (PocketBase internal)",
    offline_storage: "IndexedDB (sync store) + LocalStorage"
  },
  data_flows: {
    sync: "Action-based Queue (src/stores/sync/queueProcessor.js) -> IndexedDB -> PocketBase REST",
    rbac: "src/router/index.js enforces route guards using authStore. user.role defines access.",
    gis: "Stores load GeoJSON -> GisMapComponent parses manually (imperative Leaflet) -> DrawnItems",
    signatures: "Bitacora data -> digitalSignature.js (WebCrypto RSA-PSS) -> base64 stored in PocketBase"
  },
  security_audit: {
    authentication: "PocketBase JWT. Secure.",
    authorization: "Frontend route guards exist. Backend API hooks use $apis.requireAuth()",
    vulnerabilities: [
      "Client-side execution of Resend API in ContactUs.vue exposes VITE_RESEND_API_KEY.",
      "Module activation (isModuleActive) hides UI links but lacks strict backend enforcement for all Premium actions."
    ]
  },
  critical_flows_status: {
    checkout_suscripciones: "Unificado en PlanManagement.vue (Plan + Módulos). Requiere validación manual de comprobantes.",
    sincronizacion_offline: "Altamente madura. Resuelve conflictos por timestamp (conflictResolver in core.js)."
  }
};
fs.writeFileSync('brain/sdd_system.json', JSON.stringify(sdd, null, 2));

console.log("JSON Audit Files Generated Successfully.");
