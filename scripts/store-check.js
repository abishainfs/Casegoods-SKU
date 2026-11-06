#!/usr/bin/env node
/*
 * Compares the live shop (casegoods.in) with the catalogue.
 *
 *   node scripts/store-check.js                      fetch casegoods.in and write the reports
 *   node scripts/store-check.js --input file.json    use a saved copy of the shop's products instead
 *
 * Writes:
 *   store.json                          live SKUs + product pictures/links (used by the SKU generator and editor)
 *   reports/store-check.md              readable report: problems, mismatches, naming differences
 *   reports/store-sku-suggestions.csv   every shop variant with its current SKU and a suggested SKU
 *
 * Runs every Monday on GitHub (see .github/workflows/store-check.yml), or on demand.
 * It never changes the shop: it only reads the public product list.
 */
const fs = require('fs');
const path = require('path');
const core = require('../sku-core.js');

const SHOP = 'https://casegoods.in';
const root = path.join(__dirname, '..');
const P = JSON.parse(fs.readFileSync(path.join(root, 'products.json'), 'utf8'));
const M = JSON.parse(fs.readFileSync(path.join(root, 'materials.json'), 'utf8'));

// ---------------------------------------------------------------- text helpers
const STOP = new Set(['mm', 'ft', 'cm', 'in', 'the', 'and', 'with', 'of', 'set', 'type', 'size', 'finish', 'material']);
const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (s) => new Set(String(s || '').toLowerCase().replace(/\bw\/o\b/g, 'without').replace(/[0-9.]+/g, ' ').split(/[^a-z]+/).filter((w) => w.length > 1 && !STOP.has(w)));
const numbers = (s) => new Set((String(s || '').match(/\d+(\.\d+)?/g) || []).map(Number));
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const subset = (a, b) => [...a].every((x) => b.has(x));

// ---------------------------------------------------------------- matching
const namesOf = (p) => [p.name].concat(String(p.aka || '').split(',').map((a) => a.trim()).filter(Boolean));
function matchProduct(title) {
  // Exact name or "other name" (aka) — active products first, so a renamed product beats its retired old code.
  const exact = P.products.filter((p) => namesOf(p).some((n) => squash(n) === squash(title)))
    .sort((a, b) => (a.retired ? 1 : 0) - (b.retired ? 1 : 0));
  if (exact.length) return { product: exact[0], how: 'exact' };
  const tw = words(title);
  const partial = P.products.filter((p) => !p.retired && subset(words(p.name), tw)).sort((a, b) => words(b.name).size - words(a.name).size);
  if (partial.length && (partial.length === 1 || words(partial[0].name).size > words(partial[1].name).size)) return { product: partial[0], how: 'partial' };
  return { product: null, how: partial.length ? 'ambiguous' : 'none' };
}

function matchFinish(material, text) {
  const t = squash(text);
  // Exact match on the finish's name or any of its old / other names (e.g. "Olive Green").
  const exact = material.finishes.filter((f) => namesOf(f).some((n) => squash(n) === t));
  if (exact.length === 1) return { f: exact[0], sure: true };
  const contains = material.finishes.filter((f) => squash(f.name).includes(t) || t.includes(squash(f.name)));
  if (contains.length === 1) return { f: contains[0], sure: false };
  const tw = words(text);
  const overlap = material.finishes.filter((f) => [...words(f.name)].some((w) => tw.has(w)));
  if (overlap.length === 1) return { f: overlap[0], sure: false };
  return { f: null, options: (contains.length ? contains : overlap).map((f) => f.name) };
}

/** "Teak/ Natural" -> material + finish.  "Red/Blue" -> two finishes of one material (e.g. Woven Jute). */
function parseMaterialValue(value) {
  const [left, ...rest] = value.split('/');
  const right = rest.join('/').trim();
  if (!right) return null;
  const mat = M.find((m) => namesOf(m).some((n) => squash(n) === squash(left)))
    || M.find((m) => squash(m.name).includes(squash(left)) || squash(left).includes(squash(m.name)));
  if (mat) {
    const r = matchFinish(mat, right);
    return [{ m: mat, f: r.f, sure: r.sure, problem: r.f ? null : `"${value.trim()}": ${mat.name} finish "${right}" ${r.options && r.options.length ? `could be ${r.options.join(' or ')}` : 'is not in the catalogue'}` }];
  }
  // A colour pair like "Red/Blue": find the one material that has both finishes.
  const fin = (m, t) => m.finishes.find((f) => namesOf(f).some((n) => squash(n) === squash(t)));
  const both = M.filter((m) => fin(m, left) && fin(m, right));
  if (both.length === 1) {
    const m = both[0];
    return [
      { m, f: fin(m, left), sure: false },
      { m, f: fin(m, right), sure: false },
    ];
  }
  return null;
}

function matchSize(product, descriptors, pool) {
  const sizes = core.sizesFor(product);
  const real = product.sizes && product.sizes.length;
  if (!real) return { size: sizes[0], sure: true };
  let text = descriptors.join(' ');
  if (!text.trim()) {
    // e.g. "Standing Straight Lamp Floor": the size is in the shop's product title.
    const extra = [...words(pool.title)].filter((w) => !namesOf(product).some((n) => squash(n).includes(w)));
    if (extra.length) text = extra.join(' ');
  }
  if (!text.trim()) {
    if (sizes.length === 1) return { size: sizes[0], sure: true };
    return { size: null, problem: `no size shown on the shop; catalogue has ${sizes.length} sizes` };
  }
  const byName = sizes.filter((s) => namesOf(s).slice(1).some((n) => squash(n) === squash(text)));
  if (byName.length === 1) return { size: byName[0], sure: true };
  const dn = numbers(text);
  const dw = words(text);
  const strict = sizes.filter((s) => sameSet(numbers(s.name), dn) && subset(words(s.name), new Set([...dw, ...pool])));
  const loose = sizes.filter((s) => sameSet(numbers(s.name), dn) && subset(dw, words(s.name)));
  const best = (list) => {
    const scored = list.map((s) => ({ s, n: [...words(s.name)].filter((w) => dw.has(w)).length })).sort((a, b) => b.n - a.n);
    if (scored.length === 1 || (scored.length > 1 && scored[0].n > scored[1].n)) return scored[0].s;
    return null;
  };
  const a = best(strict);
  if (a) return { size: a, sure: true };
  const b = best(loose);
  if (b) return { size: b, sure: false };
  const cands = strict.length ? strict : loose;
  const list = sizes.length > 6 ? `any of its ${sizes.length} sizes` : `any of its sizes (${sizes.map((s) => s.name).join(' / ')})`;
  return { size: null, problem: cands.length > 1 ? `"${text}" could be ${cands.map((s) => `${s.code} (${s.name})`).join(' or ')}` : `"${text}" doesn't match ${list}` };
}

function suggest(shopProduct, variant, match) {
  const product = match.product;
  if (!product) return { problem: 'product not found in the catalogue' };
  const descriptors = [];
  const mats = [];
  const problems = [];
  const pool = new Set([...words(product.name), ...words(shopProduct.title)]);
  pool.title = shopProduct.title;
  shopProduct.options.forEach((opt, i) => {
    const value = variant[`option${i + 1}`];
    if (value == null) return;
    words(opt.name).forEach((w) => pool.add(w));
    const parsed = value.includes('/') ? parseMaterialValue(value) : null;
    if (parsed) {
      parsed.forEach((x) => {
        mats.push(x);
        words(x.m.name).forEach((w) => pool.add(w));
        if (x.problem) problems.push(x.problem);
      });
    } else descriptors.push(value);
  });
  const sz = matchSize(product, descriptors, pool);
  if (sz.problem) problems.push(sz.problem);
  if (mats.length > 2) problems.push(`${mats.length} materials — a SKU holds at most 2`);
  if (problems.length) return { problem: problems.join('; ') };
  const r = core.buildSku(P, M, {
    productCode: product.code, sizeCode: sz.size.code,
    mat1: mats[0] ? mats[0].m.code : '', fin1: mats[0] ? mats[0].f.code : '',
    mat2: mats[1] ? mats[1].m.code : '', fin2: mats[1] ? mats[1].f.code : '',
  });
  if (r.error) return { problem: r.error };
  const sure = match.how === 'exact' && sz.sure && mats.every((x) => x.sure);
  return { sku: r.sku, description: r.description, confidence: sure ? 'high' : 'check' };
}

// ---------------------------------------------------------------- fetch
async function fetchShop() {
  const i = process.argv.indexOf('--input');
  if (i > -1) return JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8'));
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${SHOP}/products.json?limit=250&page=${page}`, { headers: { 'User-Agent': 'Casegoods-SKU-check' } });
    if (!res.ok) throw new Error(`${SHOP} answered ${res.status}`);
    const { products } = await res.json();
    all.push(...products);
    if (products.length < 250) break;
  }
  return all;
}

// Write a file only if something other than the timestamp changed (keeps the history quiet).
function writeIfChanged(file, content, stampRe) {
  const full = path.join(root, file);
  const old = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (old && old.replace(stampRe, '') === content.replace(stampRe, '')) return false;
  fs.writeFileSync(full, content);
  return true;
}

// ---------------------------------------------------------------- main
(async () => {
  const shop = await fetchShop();
  const rows = [];
  const issues = { invalid: [], mismatch: [], duplicate: [], retiredOnSale: [], unmatchedProducts: [], noSuggestion: [] };
  const seen = new Map();
  const store = { checkedAt: new Date().toISOString(), shop: SHOP, products: {}, skus: {} };

  shop.forEach((sp) => {
    const match = matchProduct(sp.title);
    const url = `${SHOP}/products/${sp.handle}`;
    const image = sp.images && sp.images[0] ? sp.images[0].src : '';
    if (!match.product) issues.unmatchedProducts.push(`[${sp.title}](${url})`);
    else {
      if (match.product.retired) issues.retiredOnSale.push(`[${sp.title}](${url}) — catalogue code ${match.product.code} is retired`);
      // One picture/link per catalogue product; prefer pages whose address isn't a "-copy".
      const code = match.product.code;
      const cur = store.products[code];
      const withSku = sp.variants.filter((v) => (v.sku || '').trim()).length;
      // Counts are added up over every shop page for this product (some products have several pages).
      const counts = { pages: (cur ? cur.pages : 0) + 1, variants: (cur ? cur.variants : 0) + sp.variants.length, withSku: (cur ? cur.withSku : 0) + withSku };
      if (!cur || (/copy/.test(cur.url) && !/copy/.test(url))) store.products[code] = Object.assign({ title: sp.title, url, image, thumb: image ? image.replace(/(\.\w+)(\?|$)/, '_400x$1$2') : '' }, counts);
      else Object.assign(cur, counts);
    }
    sp.variants.forEach((v) => {
      const current = (v.sku || '').trim();
      const s = suggest(sp, v, match);
      let status = '';
      if (current) {
        const parsed = core.parseSku(P, M, current);
        store.skus[parsed.ok ? parsed.sku : current] = { product: sp.title, variant: v.title, url: `${url}?variant=${v.id}` };
        if (seen.has(current)) issues.duplicate.push(`\`${current}\` is used by both "${seen.get(current)}" and "${sp.title} — ${v.title}"`);
        seen.set(current, `${sp.title} — ${v.title}`);
        if (!parsed.ok) { status = 'invalid'; issues.invalid.push(`\`${current}\` on [${sp.title} — ${v.title}](${url}): ${parsed.errors.join(' ')}`); }
        else if (s.sku && s.sku !== parsed.sku && s.confidence === 'high') { status = 'differs'; issues.mismatch.push(`\`${current}\` on [${sp.title} — ${v.title}](${url}) — the variant's options suggest \`${s.sku}\``); }
        else status = 'ok';
      } else status = s.sku ? 'missing' : 'missing, no suggestion';
      if (!current && !s.sku) issues.noSuggestion.push({ title: sp.title, url, variant: v.title, why: s.problem });
      rows.push({ handle: sp.handle, product: sp.title, variant: v.title, current, suggested: s.sku || '', confidence: s.sku ? s.confidence : '', status, note: s.problem || (s.description || '') });
    });
  });

  // ---- write store.json
  const STAMP = /"checkedAt": "[^"]*"|_Last checked: [^_]*_/g;
  writeIfChanged('store.json', JSON.stringify(store, null, 1) + '\n', STAMP);

  // ---- write CSV
  fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
  const cell = (x) => `"${String(x).replace(/"/g, '""')}"`;
  const csv = [['Shop handle', 'Product', 'Variant', 'Current SKU', 'Suggested SKU', 'Confidence', 'Status', 'Description / why not'].map(cell).join(',')]
    .concat(rows.map((r) => [r.handle, r.product, r.variant, r.current, r.suggested, r.confidence, r.status, r.note].map(cell).join(',')));
  writeIfChanged('reports/store-sku-suggestions.csv', '\ufeff' + csv.join('\r\n') + '\r\n', STAMP);

  // ---- write Markdown report
  const total = rows.length;
  const withSku = rows.filter((r) => r.current).length;
  const sugHigh = rows.filter((r) => !r.current && r.confidence === 'high').length;
  const sugCheck = rows.filter((r) => !r.current && r.confidence === 'check').length;
  const activeCodes = P.products.filter((p) => !p.retired).map((p) => p.code);
  const notOnShop = activeCodes.filter((c) => !store.products[c]).map((c) => `${c} (${P.products.find((p) => p.code === c).name})`);
  const section = (title, intro, items) => (items.length ? `\n## ${title} (${items.length})\n\n${intro}\n\n${items.map((x) => `- ${x}`).join('\n')}\n` : '');
  const groupedNo = {};
  issues.noSuggestion.forEach((x) => { (groupedNo[x.title] = groupedNo[x.title] || { url: x.url, why: new Set() }).why.add(x.why); });

  const md = `# Shop check: casegoods.in vs the SKU catalogue

_Last checked: ${new Date().toUTCString()} — this page updates automatically every Monday._

| | |
|---|---|
| Shop products | ${shop.length} |
| Shop variants | ${total} |
| Variants with a SKU | **${withSku}** |
| Variants without a SKU — suggestion ready | ${sugHigh} confident, ${sugCheck} to double-check |
| Variants without a SKU — no suggestion | ${total - withSku - sugHigh - sugCheck} |

Full list with a suggested SKU for every variant: **[store-sku-suggestions.csv](store-sku-suggestions.csv)** (opens in Excel / Google Sheets).
`
    + section('❌ SKUs on the shop that are not valid', 'These SKUs do not exist in the catalogue. Fix the SKU on Shopify, or add the missing code in the catalogue editor.', issues.invalid)
    + section('❌ The same SKU on two different variants', 'Each variant needs its own SKU.', issues.duplicate)
    + section('⚠️ SKU doesn\'t match the variant\'s options', 'The SKU is valid, but the variant\'s size/material options point to a different SKU. One of the two is wrong.', issues.mismatch)
    + section('⚠️ Retired products still on sale', 'The catalogue says these were discontinued (or renamed). Either un-retire them in the editor or update the shop.', issues.retiredOnSale)
    + section('⚠️ Shop products not found in the catalogue', 'Their names don\'t match any catalogue product, so no SKU can be suggested. Rename on the shop or add the product to the catalogue.', issues.unmatchedProducts)
    + (Object.keys(groupedNo).length ? `\n## Variants where no SKU could be suggested\n\nUsually because the shop and the catalogue name a size or finish differently. Line them up (same wording in both places) and the next check will suggest SKUs.\n\n${Object.entries(groupedNo).map(([t, g]) => `- **[${t}](${g.url})**: ${[...g.why].slice(0, 4).join('; ')}${g.why.size > 4 ? `; …and ${g.why.size - 4} more` : ''}`).join('\n')}\n` : '')
    + (notOnShop.length ? `\n## Catalogue products not on the shop (${notOnShop.length})\n\nFor information only — not every product is sold online.\n\n${notOnShop.join(', ')}\n` : '');
  writeIfChanged('reports/store-check.md', md, STAMP);

  console.log(`Shop: ${shop.length} products, ${total} variants, ${withSku} with SKU. Suggestions: ${sugHigh} confident, ${sugCheck} to check. Invalid: ${issues.invalid.length}, mismatched: ${issues.mismatch.length}, duplicates: ${issues.duplicate.length}.`);
})().catch((e) => {
  console.error('Shop check failed:', e.message);
  process.exit(1);
});
