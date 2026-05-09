const fs = require('fs');
const filePath = 'src/components/hacienda/PlanManagement.vue';

let content = fs.readFileSync(filePath, 'utf8');

// Permitir renovar plan expirado (enviar mismo plan si se quiere renovar)
content = content.replace(
    /:disabled="!selectedPlan \|\| selectedPlan === haciendaStore\.mi_hacienda\.plan \|\| !paymentReceipt"/,
    `:disabled="!selectedPlan || (!haciendaStore.isPlanExpired && selectedPlan === haciendaStore.mi_hacienda.plan) || !paymentReceipt"`
);

content = content.replace(
    /if \(!selectedPlan\.value \|\| selectedPlan\.value === haciendaStore\.mi_hacienda\.plan\) \{[\s\S]*?return[\s\S]*?\}/,
    `if (!selectedPlan.value) return;
  if (!haciendaStore.isPlanExpired && selectedPlan.value === haciendaStore.mi_hacienda.plan) return;`
);

fs.writeFileSync(filePath, content);
console.log('PlanManagement.vue disabled button patched.');
