const fs = require('fs');
const content = fs.readFileSync('pb_hooks/main.js', 'utf8');

// Regex to find all routerAdd
const endpoints = [...content.matchAll(/routerAdd\("([^"]+)", "([^"]+)"/g)].map(m => m[2]);

console.log("Registered Endpoints in main.js:");
endpoints.forEach(e => console.log("- " + e));

if (endpoints.includes("/api/ai/chat")) {
  console.log("\nVERIFICATION SUCCESS: /api/ai/chat is explicitly registered in main.js");
} else {
  console.log("\nVERIFICATION FAILED: /api/ai/chat not found in main.js");
}

const activateHandler = content.match(/routerAdd\("POST", "\/api\/modulos\/:id\/activate"[\s\S]+?caller\.get\("role"\) !== "superadmin"[\s\S]+?HTTP_STATUS\.UNAUTHORIZED/);
console.log("\nFIX A (Activate Guard) Logic Match:", !!activateHandler);

const deactivateHandler = content.match(/routerAdd\("POST", "\/api\/modulos\/:id\/deactivate"[\s\S]+?caller\.get\("role"\) !== "superadmin"[\s\S]+?HTTP_STATUS\.UNAUTHORIZED/);
console.log("FIX A (Deactivate Guard) Logic Match:", !!deactivateHandler);
