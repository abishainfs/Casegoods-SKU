#!/usr/bin/env node
// Small self-test for sku-core.js. Run: node scripts/test.js
const assert = require('assert');
const core = require('../sku-core.js');

const products = {
  categories: [{ code: 'F', name: 'Furniture' }, { code: 'O', name: 'Objects' }],
  products: [
    { code: 'SPT', name: 'Splayed Plank Table', category: 'Furniture', sizes: [{ code: '01', name: '2800' }] },
    { code: 'GML', name: 'Gamla', category: 'Objects', sizes: [] },
  ],
};
const materials = [
  { code: 'T', name: 'Teak', finishes: [{ code: '1', name: 'Natural' }] },
  { code: 'B', name: 'Brass', finishes: [{ code: '2', name: 'Satin' }] },
];

assert.deepStrictEqual(core.validate(products, materials).errors, []);

let r = core.buildSku(products, materials, { productCode: 'SPT', sizeCode: '01', mat1: 'T', fin1: '1', mat2: 'B', fin2: '2' });
assert.strictEqual(r.sku, 'F-SPT-01-T1-B2');
assert.match(r.description, /Splayed Plank Table \(2800\), made in Teak with a Natural finish and a secondary material of Brass/);

r = core.buildSku(products, materials, { productCode: 'GML', sizeCode: '00', mat1: '', fin1: '', mat2: '', fin2: '' });
assert.strictEqual(r.sku, 'O-GML-00');
assert.strictEqual(r.description, 'Gamla.');

assert.ok(core.buildSku(products, materials, { productCode: 'SPT', sizeCode: '01', mat1: '', fin1: '', mat2: 'B', fin2: '2' }).error);
assert.ok(core.buildSku(products, materials, { productCode: 'SPT', sizeCode: '01', mat1: 'T', fin1: '', mat2: '', fin2: '' }).error);

// Duplicate codes must be caught.
const dup = JSON.parse(JSON.stringify(products));
dup.products.push({ code: 'SPT', name: 'Other', category: 'Furniture', sizes: [] });
assert.ok(core.validate(dup, materials).errors.some((e) => e.includes('"SPT"')));
const dupMat = materials.concat([{ code: 'T', name: 'Rope', finishes: [{ code: '0', name: 'x' }] }]);
assert.ok(core.validate(products, dupMat).errors.some((e) => e.includes('"T"')));

// Formatting round-trips.
assert.deepStrictEqual(JSON.parse(core.formatProducts(products)), products);
assert.deepStrictEqual(JSON.parse(core.formatMaterials(materials)), materials);

console.log('✅ sku-core tests passed');
