#!/usr/bin/env node
// Self-test for sku-core.js against the real catalogue. Run: node scripts/test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../sku-core.js');

const root = path.join(__dirname, '..');
const P = JSON.parse(fs.readFileSync(path.join(root, 'products.json'), 'utf8'));
const M = JSON.parse(fs.readFileSync(path.join(root, 'materials.json'), 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const build = (productCode, sizeCode, mat1 = '', fin1 = '', mat2 = '', fin2 = '') =>
  core.buildSku(P, M, { productCode, sizeCode, mat1, fin1, mat2, fin2 });

// ---- Building SKUs (these SKUs are live on casegoods.in and must never change) ----
assert.strictEqual(build('FFC', '03', 'T', '1', 'E', '0').sku, 'F-FFC-03-T1-E0');
assert.strictEqual(build('FFC', '03', 'T', '1', 'E', '0').description, 'Folding Flat Chair, Slung Leather — Frame: Teak, Natural · Seat: Leather, Natural Buffalo');
assert.strictEqual(build('RTT', '01', 'T', '2', 'M', '3').sku, 'F-RTT-01-T2-M3');
assert.strictEqual(build('TBL', '05', 'H', '1').sku, 'O-TBL-05-H1');
assert.strictEqual(build('ALC', '01', 'K', '0').description, 'Alcove — Refractory Brick, Natural');
assert.strictEqual(build('FJD', '10', 'J', '2', 'J', '3').description, 'Fold Jute Dhurries, Aero - 4x6ft — Woven Jute, Red & Blue');
assert.strictEqual(build('GML', '00').sku, 'O-GML-00');
assert.strictEqual(build('GML', '00').description, 'Gamla');
assert.strictEqual(build('BBL', '01').description, 'Building Blocks, w/o Holder');
assert.match(build('SPT', '01', 'T', '1', 'P', '1').description, /· Jute Rope$/); // not "Rope, Jute Rope"
assert.ok(build('PSC', '00', 'Q', 'C').notes.some((n) => /custom/i.test(n)));
assert.ok(build('SPT', '01', '', '', 'B', '2').error);
assert.ok(build('SPT', '01', 'T', '').error);

// ---- Reading SKUs ----
let r = core.parseSku(P, M, 'f-ffc-03-t1-e0');
assert.ok(r.ok); assert.strictEqual(r.sku, 'F-FFC-03-T1-E0'); assert.strictEqual(r.segments.length, 5);
r = core.parseSku(P, M, ' F SPT 01 ');
assert.ok(r.ok); assert.strictEqual(r.sku, 'F-SPT-01');
r = core.parseSku(P, M, 'F–SPT—01_T1');            // long dashes and underscores
assert.ok(r.ok); assert.strictEqual(r.sku, 'F-SPT-01-T1');
r = core.parseSku(P, M, 'O-SPT-01');                // wrong category
assert.ok(!r.ok); assert.deepStrictEqual(r.suggestions, ['F-SPT-01']);
r = core.parseSku(P, M, 'L-0TL-01');                // zero instead of letter O
assert.ok(!r.ok); assert.ok(r.errors[0].includes('OTL')); assert.deepStrictEqual(r.suggestions, ['L-OTL-01']);
r = core.parseSku(P, M, 'F-SPT-99');
assert.ok(!r.ok && /no size "99"/.test(r.errors[0]));
r = core.parseSku(P, M, 'F-SPT-01-X1');
assert.ok(!r.ok);
r = core.parseSku(P, M, 'F-FJT-00');                // retired
assert.ok(r.ok && r.warnings.some((w) => /retired/.test(w)));
assert.ok(!core.parseSku(P, M, 'F-SPT').ok);

// ---- Catalogue checks ----
assert.deepStrictEqual(core.validate(P, M).errors, []);
let bad = clone(P);
bad.products.push({ code: 'SPT', name: 'Other', category: 'Furniture', sizes: [] });
assert.ok(core.validate(bad, M).errors.some((e) => e.includes('"SPT"')));
bad = clone(M);
bad.push({ code: 'T', name: 'Rope 2', finishes: [{ code: '0', name: 'x' }] });
assert.ok(core.validate(P, bad).errors.some((e) => e.includes('"T"')));
bad = clone(P);
bad.products.push({ code: '0TL', name: 'Zero Tube', category: 'Lights', sizes: [] });
assert.ok(core.validate(bad, M).warnings.some((w) => /look almost the same/.test(w)));
bad = clone(P);
bad.products[0].sizes.push({ code: '02', name: 'Standard' });
assert.ok(core.validate(bad, M).warnings.some((w) => /same name/.test(w)));

// ---- Change detection ----
assert.deepStrictEqual(core.compare(P, M, P, M), []);
const level = (list, re) => list.find((c) => re.test(c.text));
let n = clone(P);
n.products = n.products.filter((p) => p.code !== 'GML');
assert.strictEqual(level(core.compare(P, M, n, M), /GML/).level, 'danger');
n = clone(P);
n.products.find((p) => p.code === 'SPT').sizes.reverse();          // re-ordering is harmless
assert.deepStrictEqual(core.compare(P, M, n, M), []);
n = clone(P);
const spt = n.products.find((p) => p.code === 'SPT');
spt.sizes = spt.sizes.map((s, i) => ({ code: String(i + 2).padStart(2, '0'), name: s.name }));  // renumbered
assert.ok(core.compare(P, M, n, M).some((c) => c.level === 'danger' && /moved from code/.test(c.text)));
n = clone(P);
n.products.find((p) => p.code === 'GML').category = 'Furniture';
assert.ok(level(core.compare(P, M, n, M), /O-GML/));
n = clone(P);
n.products.find((p) => p.code === 'GML').retired = true;
assert.strictEqual(level(core.compare(P, M, n, M), /retired/).level, 'notice');
n = clone(P);
n.products.push({ code: 'NEW', name: 'New Thing', category: 'Objects', sizes: [] });
assert.strictEqual(level(core.compare(P, M, n, M), /New product/).level, 'notice');
let nm = clone(M);
nm.find((m) => m.code === 'T').finishes[1].name = 'Walnut Stain';
assert.strictEqual(level(core.compare(P, M, P, nm), /T1 renamed/).level, 'danger');

// ---- Formatting round-trips ----
assert.deepStrictEqual(JSON.parse(core.formatProducts(P)), P);
assert.deepStrictEqual(JSON.parse(core.formatMaterials(M)), M);
assert.strictEqual(core.formatProducts(P), fs.readFileSync(path.join(root, 'products.json'), 'utf8'), 'products.json is not in the standard layout — run: node scripts/validate.js --fix');

console.log('✅ sku-core tests passed');
