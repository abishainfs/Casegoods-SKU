#!/usr/bin/env node
/*
 * Checks products.json and materials.json for mistakes.
 * Runs automatically on GitHub after every change (see .github/workflows/validate.yml).
 *
 *   node scripts/validate.js                  check the files
 *   node scripts/validate.js --fix            also rewrite them in the standard tidy layout
 *   node scripts/validate.js --against <git>  also list changes since that commit that affect existing SKUs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const core = require('../sku-core.js');

const root = path.join(__dirname, '..');
const inCI = !!process.env.GITHUB_ACTIONS;
const annotate = (kind, msg) => (inCI ? console.log(`::${kind}::${msg}`) : console.log(`${kind === 'error' ? '❌' : '⚠️ '} ${msg}`));

const parse = (name, text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    annotate('error', `${name} could not be read — usually a missing or extra comma, quote or bracket. (${e.message})`);
    process.exit(1);
  }
};
const read = (name) => parse(name, fs.readFileSync(path.join(root, name), 'utf8'));

const products = read('products.json');
const materials = read('materials.json');
const { errors, warnings } = core.validate(products, materials);

warnings.forEach((w) => annotate('warning', w));
errors.forEach((e) => annotate('error', e));

// What changed since the previous version?
const i = process.argv.indexOf('--against');
const ref = i > -1 ? process.argv[i + 1] : '';
if (ref && !/^0+$/.test(ref)) {
  try {
    const old = (f) => execFileSync('git', ['show', `${ref}:${f}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const oldProducts = JSON.parse(old('products.json'));
    const oldMaterials = JSON.parse(old('materials.json'));
    if (Array.isArray(oldProducts)) throw new Error('older file layout');
    const changes = core.compare(oldProducts, oldMaterials, products, materials);
    if (changes.length) console.log(`\nChanges since ${/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref}:`);
    changes.forEach((c) => (c.level === 'danger' ? annotate('warning', `AFFECTS EXISTING SKUs: ${c.text}`) : console.log(`   • ${c.text}`)));
  } catch (e) {
    console.log(`(Could not compare with ${/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref}: ${e.message.split('\n')[0]})`);
  }
}

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
console.log(`\n✅ All good: ${active} active products, ${materials.length} materials${warnings.length ? `, ${warnings.length} warning(s)` : ''}.`);
