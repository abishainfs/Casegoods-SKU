#!/usr/bin/env node
/*
 * Checks products.json and materials.json for mistakes.
 * Runs automatically on GitHub after every change (see .github/workflows/validate.yml).
 *
 *   node scripts/validate.js          check the files
 *   node scripts/validate.js --fix    also rewrite them in the standard tidy layout
 */
const fs = require('fs');
const path = require('path');
const core = require('../sku-core.js');

const root = path.join(__dirname, '..');
const read = (name) => {
  const file = path.join(root, name);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`\n❌ ${name} could not be read. This usually means a missing or extra comma, quote or bracket.\n   ${e.message}\n`);
    process.exit(1);
  }
};

const products = read('products.json');
const materials = read('materials.json');
const { errors, warnings } = core.validate(products, materials);

warnings.forEach((w) => console.log(`⚠️  ${w}`));
errors.forEach((e) => console.log(`❌ ${e}`));

if (errors.length) {
  console.log(`\n${errors.length} problem(s) must be fixed before these files are safe to use.`);
  process.exit(1);
}

if (process.argv.includes('--fix')) {
  fs.writeFileSync(path.join(root, 'products.json'), core.formatProducts(products));
  fs.writeFileSync(path.join(root, 'materials.json'), core.formatMaterials(materials));
  console.log('Files rewritten in the standard layout.');
}

const active = products.products.filter((p) => !p.retired).length;
console.log(`\n✅ All good: ${active} active products, ${materials.length} materials.`);
