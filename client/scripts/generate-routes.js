const fs = require('fs');
const path = require('path');

const knownMappings = {
  'appointments': 'appointments',
  'bed-availability': 'beds',
  'billing': 'invoices',
  'diagnosis': 'diagnoses',
  'doctor': 'doctors',
  'ot': 'surgeries',
  'pantry': 'pantry_orders',
  'patients': 'patients',
  'pharmacy': 'medications',
  'reports': 'reports',
  'revenue': 'transactions',
  'staff': 'staff'
};

function toPascalCase(str) {
  return str
    .split(/[-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

const dynamicTables = [];
const dynamicModels = {};

try {
  const pagesDir = path.join(__dirname, '../src/app/admin-dashboard');
  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir);
    for (const file of files) {
      const fullPath = path.join(pagesDir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!knownMappings[file]) {
          const tableName = file.replace(/-/g, '_');
          const modelName = toPascalCase(file);
          dynamicTables.push(tableName);
          dynamicModels[modelName] = tableName;
        }
      }
    }
  }
  
  // Write to dynamic_routes.json
  const outPath = path.join(__dirname, '../src/utils/dynamic_routes.json');
  fs.writeFileSync(outPath, JSON.stringify({ dynamicTables, dynamicModels }, null, 2));
  console.log(`[Build-time Route Generator] Generated dynamic routes with ${dynamicTables.length} new tables.`);
} catch (err) {
  console.error('[Build-time Route Generator] Error:', err.message);
  process.exit(1);
}
