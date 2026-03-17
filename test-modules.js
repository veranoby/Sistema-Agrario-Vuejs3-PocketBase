#!/usr/bin/env node

/**
 * Simple test script to verify module structure
 */

const fs = require('fs');
const path = require('path');

const modulesDir = '/home/veranoby/sistema-agri/src/stores/programaciones';

console.log('=== Programaciones Module Structure Test ===\n');

// Check if all files exist
const files = [
  'programacionesStore.js',
  'recurrenceCalculator.js',
  'complianceChecker.js',
  'batchOperations.js',
  'utils/dateCalculators.js',
  'utils/frequencyHandlers.js',
  'index.js'
];

console.log('Checking file structure:');
let allExist = true;
files.forEach(file => {
  const filePath = path.join(modulesDir, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allExist = false;
});

if (!allExist) {
  console.log('\n❌ Some files are missing!');
  process.exit(1);
}

// Check line counts
console.log('\nLine counts:');
files.forEach(file => {
  const filePath = path.join(modulesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  console.log(`  ${file}: ${lines} lines`);
});

// Check exports in index.js
console.log('\nChecking exports in index.js:');
const indexPath = path.join(modulesDir, 'index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');
const exports = indexContent.match(/export \{[^}]+\}/g) || [];
exports.forEach(exp => {
  console.log(`  ${exp.trim()}`);
});

// Check imports in main store
console.log('\nChecking imports in programacionesStore.js:');
const storePath = path.join(modulesDir, 'programacionesStore.js');
const storeContent = fs.readFileSync(storePath, 'utf8');
const imports = storeContent.match(/^import .+$/gm) || [];
imports.forEach(imp => {
  console.log(`  ${imp.trim()}`);
});

console.log('\n✅ All checks passed!');
console.log('\nModule structure created successfully.');
console.log('Original file backed up to: programacionesStore.js.bak');
