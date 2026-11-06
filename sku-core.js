/*
 * sku-core.js — shared rules for the Casegoods SKU system.
 *
 * Used by:
 *   - index.html   (the SKU generator)
 *   - editor.html  (the no-code catalogue editor)
 *   - scripts/validate.js (automatic check that runs on GitHub)
 *
 * SKU format:  X-ABCD-EF-GH-IJ
 *   X     category code        (1 letter,           e.g. F = Furniture)
 *   ABCD  product code         (3 or 4 letters/digits, e.g. SPT)
 *   EF    size / type code     (2 letters/digits,   e.g. 01)
 *   GH    primary material     (material code + finish code, e.g. T1 = Teak, Natural)
 *   IJ    secondary material   (optional, same as GH)
 *
 * If you change a rule here, every part of the system picks it up.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SkuCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RULES = {
    categoryCode: { re: /^[A-Z]$/, text: '1 capital letter (e.g. F)' },
    productCode: { re: /^[A-Z0-9]{3,4}$/, text: '3 or 4 capital letters/digits (e.g. SPT)' },
    sizeCode: { re: /^[A-Z0-9]{2}$/, text: '2 characters (e.g. 01)' },
    materialCode: { re: /^[A-Z0-9]$/, text: '1 capital letter or digit (e.g. T)' },
    finishCode: { re: /^[A-Z0-9]$/, text: '1 capital letter or digit (e.g. 1)' },
  };

  const DEFAULT_SIZE = { code: '00', name: 'Standard' };

  const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  /**
   * Check the catalogue for mistakes.
   * Returns { errors: [...], warnings: [...] } — plain-English messages.
   * Errors = must be fixed (would create wrong or duplicate SKUs).
   * Warnings = worth a look, but nothing breaks.
   */
  function validate(productsFile, materials) {
    const errors = [];
    const warnings = [];
    const err = (m) => errors.push(m);
    const warn = (m) => warnings.push(m);

    // ---------- products.json ----------
    if (!isObj(productsFile)) {
      err('products.json must contain { "categories": [...], "products": [...] }.');
      productsFile = { categories: [], products: [] };
    }
    const categories = Array.isArray(productsFile.categories) ? productsFile.categories : [];
    const products = Array.isArray(productsFile.products) ? productsFile.products : [];
    if (!Array.isArray(productsFile.categories)) err('products.json is missing its "categories" list.');
    if (!Array.isArray(productsFile.products)) err('products.json is missing its "products" list.');

    const catCodes = new Map();
    const catNames = new Map();
    categories.forEach((c, i) => {
      const where = `Category #${i + 1}`;
      if (!isObj(c)) return err(`${where} is not written correctly.`);
      const code = str(c.code);
      const name = str(c.name).trim();
      if (!RULES.categoryCode.re.test(code)) err(`${where} ("${name}"): code "${code}" must be ${RULES.categoryCode.text}.`);
      if (!name) err(`${where} (code "${code}") has no name.`);
      if (catCodes.has(code)) err(`Category code "${code}" is used twice ("${catCodes.get(code)}" and "${name}").`);
      if (catNames.has(name.toLowerCase())) err(`Category name "${name}" is used twice.`);
      catCodes.set(code, name);
      catNames.set(name.toLowerCase(), code);
    });
    if (categories.length === 0) err('There are no categories.');

    const prodCodes = new Map();
    const prodNames = new Map();
    const usedCategories = new Set();
    products.forEach((p, i) => {
      if (!isObj(p)) return err(`Product #${i + 1} is not written correctly.`);
      const code = str(p.code);
      const name = str(p.name).trim();
      const label = `Product "${name || '(no name)'}" (${code || 'no code'})`;
      if (!RULES.productCode.re.test(code)) err(`${label}: code must be ${RULES.productCode.text}.`);
      if (!name) err(`Product #${i + 1} (code "${code}") has no name.`);
      if (prodCodes.has(code)) {
        err(`Product code "${code}" is used by two products: "${prodCodes.get(code)}" and "${name}". Every product needs its own code.`);
      }
      prodCodes.set(code, name);
      if (name && prodNames.has(name.toLowerCase())) warn(`Two products are named "${name}".`);
      prodNames.set(name.toLowerCase(), code);

      const cat = str(p.category).trim();
      if (!catNames.has(cat.toLowerCase())) err(`${label}: category "${cat}" does not exist. Use one of: ${[...catCodes.values()].join(', ')}.`);
      else if (!p.retired) usedCategories.add(cat.toLowerCase());

      if (p.retired !== undefined && typeof p.retired !== 'boolean') err(`${label}: "retired" must be true or false.`);

      const sizes = p.sizes === undefined ? [] : p.sizes;
      if (!Array.isArray(sizes)) return err(`${label}: "sizes" must be a list.`);
      const sizeCodes = new Map();
      sizes.forEach((s, j) => {
        if (!isObj(s)) return err(`${label}: size #${j + 1} is not written correctly.`);
        const sc = str(s.code);
        const sn = str(s.name).trim();
        if (!RULES.sizeCode.re.test(sc)) err(`${label}: size "${sn}" has code "${sc}" — it must be ${RULES.sizeCode.text}.`);
        if (!sn) err(`${label}: size code "${sc}" has no name.`);
        if (sizeCodes.has(sc)) err(`${label}: size code "${sc}" is used twice ("${sizeCodes.get(sc)}" and "${sn}").`);
        sizeCodes.set(sc, sn);
      });
    });
    catNames.forEach((code, lname) => {
      if (!usedCategories.has(lname)) warn(`Category "${catCodes.get(code)}" has no active products.`);
    });

    // ---------- materials.json ----------
    if (!Array.isArray(materials)) {
      err('materials.json must be a list of materials.');
      materials = [];
    }
    const matCodes = new Map();
    materials.forEach((m, i) => {
      if (!isObj(m)) return err(`Material #${i + 1} is not written correctly.`);
      const code = str(m.code);
      const name = str(m.name).trim();
      const label = `Material "${name || '(no name)'}" (${code || 'no code'})`;
      if (!RULES.materialCode.re.test(code)) err(`${label}: code must be ${RULES.materialCode.text}.`);
      if (!name) err(`Material #${i + 1} (code "${code}") has no name.`);
      if (matCodes.has(code)) err(`Material code "${code}" is used by two materials: "${matCodes.get(code)}" and "${name}".`);
      matCodes.set(code, name);
      if (!Array.isArray(m.finishes) || m.finishes.length === 0) return err(`${label} needs at least one finish.`);
      const fCodes = new Map();
      m.finishes.forEach((f, j) => {
        if (!isObj(f)) return err(`${label}: finish #${j + 1} is not written correctly.`);
        const fc = str(f.code);
        const fn = str(f.name).trim();
        if (!RULES.finishCode.re.test(fc)) err(`${label}: finish "${fn}" has code "${fc}" — it must be ${RULES.finishCode.text}.`);
        if (!fn) err(`${label}: finish code "${fc}" has no name.`);
        if (fCodes.has(fc)) err(`${label}: finish code "${fc}" is used twice ("${fCodes.get(fc)}" and "${fn}").`);
        fCodes.set(fc, fn);
      });
    });

    return { errors, warnings };
  }

  /** Category code (e.g. "F") for a product, or "" if unknown. */
  function categoryCodeFor(productsFile, product) {
    const c = (productsFile.categories || []).find(
      (c) => str(c.name).trim().toLowerCase() === str(product.category).trim().toLowerCase()
    );
    return c ? c.code : '';
  }

  /** Sizes for a product, falling back to the "00" default if it has none. */
  function sizesFor(product) {
    return product && Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [DEFAULT_SIZE];
  }

  /**
   * Build a SKU and description.
   * sel = { productCode, sizeCode, mat1, fin1, mat2, fin2 }  (mat/fin may be "")
   * Returns { sku, description } or { error }.
   */
  function buildSku(productsFile, materials, sel) {
    const product = (productsFile.products || []).find((p) => p.code === sel.productCode);
    if (!product) return { error: 'Please choose a product.' };
    const cat = categoryCodeFor(productsFile, product);
    if (!cat) return { error: `Product ${product.code} has an unknown category.` };
    const size = sizesFor(product).find((s) => s.code === sel.sizeCode);
    if (!size) return { error: 'Please choose a size / type.' };

    const parts = [cat, product.code, size.code];
    let description = product.name + (size.code === DEFAULT_SIZE.code && !product.sizes?.length ? '' : ` (${size.name})`);

    const matPart = (matCode, finCode, which) => {
      if (!matCode) return { none: true };
      const m = materials.find((x) => x.code === matCode);
      if (!m) return { error: `Unknown ${which} material "${matCode}".` };
      if (!finCode) return { error: `Please choose a finish for the ${which} material (${m.name}).` };
      const f = (m.finishes || []).find((x) => x.code === finCode);
      if (!f) return { error: `Unknown finish "${finCode}" for ${m.name}.` };
      return { code: m.code + f.code, m, f };
    };

    const p1 = matPart(sel.mat1, sel.fin1, 'primary');
    if (p1.error) return p1;
    const p2 = matPart(sel.mat2, sel.fin2, 'secondary');
    if (p2.error) return p2;
    if (p1.none && !p2.none) return { error: 'Choose a primary material before a secondary material.' };

    if (!p1.none) {
      parts.push(p1.code);
      description += `, made in ${p1.m.name} with a ${p1.f.name} finish`;
    }
    if (!p2.none) {
      parts.push(p2.code);
      description += ` and a secondary material of ${p2.m.name} with a ${p2.f.name} finish`;
    }
    return { sku: parts.join('-'), description: description + '.' };
  }

  // ---------- Tidy, human-friendly file formatting ----------
  // One size / finish per line, so files stay easy to read and edit by hand.
  const q = (v) => JSON.stringify(v);
  const pair = (o) => `{ "code": ${q(str(o.code))}, "name": ${q(str(o.name).trim())} }`;
  const list = (items, indent) =>
    items.length ? `[\n${items.map((x) => indent + '  ' + pair(x)).join(',\n')}\n${indent}]` : '[]';

  function formatProducts(file) {
    const cats = file.categories.map((c) => '    ' + pair(c)).join(',\n');
    const prods = file.products
      .map((p) => {
        const lines = [
          `      "code": ${q(str(p.code))}`,
          `      "name": ${q(str(p.name).trim())}`,
          `      "category": ${q(str(p.category).trim())}`,
        ];
        if (p.retired) lines.push(`      "retired": true`);
        lines.push(`      "sizes": ${list(p.sizes || [], '      ')}`);
        return `    {\n${lines.join(',\n')}\n    }`;
      })
      .join(',\n');
    return `{\n  "categories": [\n${cats}\n  ],\n  "products": [\n${prods}\n  ]\n}\n`;
  }

  function formatMaterials(materials) {
    const body = materials
      .map(
        (m) =>
          `  {\n    "code": ${q(str(m.code))},\n    "name": ${q(str(m.name).trim())},\n    "finishes": ${list(m.finishes || [], '    ')}\n  }`
      )
      .join(',\n');
    return `[\n${body}\n]\n`;
  }

  return { RULES, DEFAULT_SIZE, validate, buildSku, sizesFor, categoryCodeFor, formatProducts, formatMaterials };
});
