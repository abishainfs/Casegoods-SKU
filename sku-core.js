/*
 * sku-core.js — the rules of the Casegoods SKU system, in one place.
 *
 * Used by:
 *   - index.html            (make / check SKUs)
 *   - editor.html           (the catalogue editor)
 *   - scripts/validate.js   (automatic check on GitHub)
 *   - scripts/store-check.js(weekly comparison with casegoods.in)
 *
 * SKU format:  X-ABCD-EF-GH-IJ      e.g.  F-FFC-03-T1-E0
 *   X     category             1 capital letter            F  = Furniture
 *   ABCD  product              3 or 4 capitals/digits      FFC = Folding Flat Chair
 *   EF    size / type          2 characters                03 = Slung Leather   (00 if the product has no sizes)
 *   GH    primary material     material + finish           T1 = Teak, Natural    (optional)
 *   IJ    secondary material   material + finish           E0 = Leather, Natural Buffalo (optional, needs GH)
 *
 * A SKU is *derived* from these codes: the same choices always give the same SKU.
 * So the one thing that must never happen is a code changing its meaning after
 * SKUs using it exist. Most of the checks below protect that.
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
  const norm = (s) => str(s).trim().toLowerCase().replace(/\s+/g, ' ');
  // Letters that are easy to confuse with digits when typing or reading a SKU.
  const lookalike = (code) => str(code).replace(/O/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8');

  /** An item's name plus its other / old names ("aka", comma-separated). */
  const namesOf = (x) => [str(x && x.name).trim()].concat(str(x && x.aka).split(',').map((a) => a.trim())).filter(Boolean);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const niceDate = (d) => { const [y, m, dd] = str(d).split('-').map(Number); return y ? `${dd} ${MONTHS[m - 1]} ${y}` : str(d); };

  // ---------------------------------------------------------------------------
  // 1. Checking the catalogue for mistakes
  // ---------------------------------------------------------------------------

  /**
   * Returns { errors: [...], warnings: [...] } in plain English.
   * Errors   = would produce wrong or duplicate SKUs; must be fixed.
   * Warnings = probably a typo or redundancy; worth a look, nothing breaks.
   */
  function validate(productsFile, materials) {
    const errors = [];
    const warnings = [];
    const err = (m) => errors.push(m);
    const warn = (m) => warnings.push(m);
    const spacing = (label, value) => {
      if (typeof value === 'string' && value !== value.trim()) warn(`${label} has a space at the start or end.`);
      else if (/\s{2,}/.test(str(value))) warn(`${label} has a double space.`);
    };

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
    const lookalikes = new Map();
    const usedCategories = new Set();
    products.forEach((p, i) => {
      if (!isObj(p)) return err(`Product #${i + 1} is not written correctly.`);
      const code = str(p.code);
      const name = str(p.name).trim();
      const label = `Product "${name || '(no name)'}" (${code || 'no code'})`;
      if (!RULES.productCode.re.test(code)) err(`${label}: code must be ${RULES.productCode.text}.`);
      if (!name) err(`Product #${i + 1} (code "${code}") has no name.`);
      spacing(`${label}: the name`, p.name);
      if (prodCodes.has(code)) {
        err(`Product code "${code}" is used by two products: "${prodCodes.get(code)}" and "${name}". Every product needs its own code.`);
      } else if (code && lookalikes.has(lookalike(code))) {
        warn(`Product codes "${lookalikes.get(lookalike(code))}" and "${code}" look almost the same (O/0, I/1, S/5, B/8). People will mix them up when typing.`);
      }
      prodCodes.set(code, name);
      if (code) lookalikes.set(lookalike(code), code);
      if (name && prodNames.has(name.toLowerCase())) warn(`Two products are named "${name}" (${prodNames.get(name.toLowerCase())} and ${code}).`);
      prodNames.set(name.toLowerCase(), code);
      str(p.aka).split(',').map((a) => a.trim()).filter(Boolean).forEach((a) => {
        if (!p.retired && products.some((o) => o !== p && !o.retired && norm(o.name) === norm(a))) warn(`${label}: its other name "${a}" is the name of another active product.`);
      });

      const cat = str(p.category).trim();
      if (!catNames.has(cat.toLowerCase())) err(`${label}: category "${cat}" does not exist. Use one of: ${[...catCodes.values()].join(', ')}.`);
      else if (!p.retired) usedCategories.add(cat.toLowerCase());

      if (p.retired !== undefined && typeof p.retired !== 'boolean') err(`${label}: "retired" must be true or false.`);
      if (p.bespoke !== undefined && typeof p.bespoke !== 'boolean') err(`${label}: "bespoke" must be true or false.`);
      if (p.retired && p.bespoke) err(`${label} is marked both retired and bespoke — choose one.`);
      if (p.notes !== undefined && typeof p.notes !== 'string') err(`${label}: "notes" must be text.`);
      if (p.aka !== undefined && typeof p.aka !== 'string') err(`${label}: "aka" (other names) must be text.`);
      if (p.link !== undefined && !/^https?:\/\/\S+$/i.test(str(p.link))) err(`${label}: the files link must be a full web address starting with https://`);
      ['primaryPart', 'secondaryPart'].forEach((k) => {
        if (p[k] !== undefined && typeof p[k] !== 'string') err(`${label}: "${k}" must be text.`);
      });
      if (p.secondaryPart && !p.primaryPart) warn(`${label} names a secondary part ("${p.secondaryPart}") but no primary part.`);

      const sizes = p.sizes === undefined ? [] : p.sizes;
      if (!Array.isArray(sizes)) return err(`${label}: "sizes" must be a list.`);
      const sizeCodes = new Map();
      const sizeNames = new Map();
      sizes.forEach((s, j) => {
        if (!isObj(s)) return err(`${label}: size #${j + 1} is not written correctly.`);
        const sc = str(s.code);
        const sn = str(s.name).trim();
        if (!RULES.sizeCode.re.test(sc)) err(`${label}: size "${sn}" has code "${sc}" — it must be ${RULES.sizeCode.text}.`);
        else if (!/^\d\d$/.test(sc)) warn(`${label}: size code "${sc}" contains a letter. Size codes are normally numbers (01, 02…).`);
        if (!sn) err(`${label}: size code "${sc}" has no name.`);
        spacing(`${label}: size "${sc}"`, s.name);
        if (sizeCodes.has(sc)) err(`${label}: size code "${sc}" is used twice ("${sizeCodes.get(sc)}" and "${sn}").`);
        if (sn && sizeNames.has(sn.toLowerCase())) warn(`${label}: sizes ${sizeNames.get(sn.toLowerCase())} and ${sc} have the same name "${sn}". Two codes for one thing creates duplicate SKUs.`);
        sizeCodes.set(sc, sn);
        sizeNames.set(sn.toLowerCase(), sc);
        if (s.aka !== undefined && typeof s.aka !== 'string') err(`${label}: size ${sc} "aka" (other names) must be text.`);
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
    const matNames = new Map();
    materials.forEach((m, i) => {
      if (!isObj(m)) return err(`Material #${i + 1} is not written correctly.`);
      const code = str(m.code);
      const name = str(m.name).trim();
      const label = `Material "${name || '(no name)'}" (${code || 'no code'})`;
      if (!RULES.materialCode.re.test(code)) err(`${label}: code must be ${RULES.materialCode.text}.`);
      if (!name) err(`Material #${i + 1} (code "${code}") has no name.`);
      spacing(`${label}: the name`, m.name);
      if (matCodes.has(code)) err(`Material code "${code}" is used by two materials: "${matCodes.get(code)}" and "${name}".`);
      if (name && matNames.has(name.toLowerCase())) warn(`Two materials are named "${name}" (${matNames.get(name.toLowerCase())} and ${code}).`);
      matCodes.set(code, name);
      matNames.set(name.toLowerCase(), code);
      if (m.aka !== undefined && typeof m.aka !== 'string') err(`${label}: "aka" (other names) must be text.`);
      if (!Array.isArray(m.finishes) || m.finishes.length === 0) return err(`${label} needs at least one finish.`);
      const fCodes = new Map();
      const fNames = new Map();
      m.finishes.forEach((f, j) => {
        if (!isObj(f)) return err(`${label}: finish #${j + 1} is not written correctly.`);
        const fc = str(f.code);
        const fn = str(f.name).trim();
        if (!RULES.finishCode.re.test(fc)) err(`${label}: finish "${fn}" has code "${fc}" — it must be ${RULES.finishCode.text}.`);
        if (!fn) err(`${label}: finish code "${fc}" has no name.`);
        spacing(`${label}: finish "${fc}"`, f.name);
        if (fCodes.has(fc)) err(`${label}: finish code "${fc}" is used twice ("${fCodes.get(fc)}" and "${fn}").`);
        if (fn && fNames.has(fn.toLowerCase())) warn(`${label}: finishes ${fNames.get(fn.toLowerCase())} and ${fc} are both called "${fn}".`);
        fCodes.set(fc, fn);
        fNames.set(fn.toLowerCase(), fc);
        if (f.aka !== undefined && typeof f.aka !== 'string') err(`${label}: finish ${fc} "aka" (other names) must be text.`);
      });
    });

    return { errors, warnings };
  }

  // ---------------------------------------------------------------------------
  // 2. What changed, and does it affect SKUs that already exist?
  // ---------------------------------------------------------------------------

  /**
   * Compares the previous version of the catalogue with the new one.
   * Returns a list of { level: 'danger' | 'notice', text }.
   *  danger = an existing SKU would now mean something else, or stop working.
   *  notice = a harmless change worth recording (additions, retirements).
   */
  function compare(oldProducts, oldMaterials, newProducts, newMaterials) {
    const out = [];
    const danger = (text) => out.push({ level: 'danger', text });
    const notice = (text) => out.push({ level: 'notice', text });
    const byCode = (list) => new Map((Array.isArray(list) ? list : []).filter(isObj).map((x) => [str(x.code), x]));
    const renamed = (a, b) => norm(a) !== norm(b);
    // "Stone - Marble" -> "Marble", "Dome Uplight" -> "Dome Up-Light": same thing, reworded.
    const squash = (v) => norm(v).replace(/[^a-z0-9]/g, '');
    const minor = (a, b) => { const x = squash(a), y = squash(b); return !!x && !!y && (x.includes(y) || y.includes(x)); };
    const rename = (a, b, dangerText, noticeText) => {
      if (!renamed(a, b)) return;
      if (minor(a, b)) notice(noticeText);
      else danger(dangerText);
    };

    // Categories
    const oc = byCode(oldProducts && oldProducts.categories);
    const nc = byCode(newProducts && newProducts.categories);
    oc.forEach((c, code) => {
      if (!nc.has(code)) {
        const moved = [...nc.values()].find((x) => norm(x.name) === norm(c.name));
        if (moved) danger(`Category "${c.name}" changed its code from ${code} to ${moved.code}. Every SKU in it changes (${code}-… becomes ${moved.code}-…).`);
        else danger(`Category ${code} (${c.name}) was removed.`);
      } else if (renamed(c.name, nc.get(code).name)) notice(`Category ${code} renamed from "${c.name}" to "${nc.get(code).name}".`);
    });
    nc.forEach((c, code) => { if (!oc.has(code) && ![...oc.values()].some((x) => norm(x.name) === norm(c.name))) notice(`New category ${code} (${c.name}).`); });

    // Products and sizes
    const catCode = (file, p) => {
      const c = ((file && file.categories) || []).find((c) => norm(c.name) === norm(p.category));
      return c ? c.code : '?';
    };
    const op = byCode(oldProducts && oldProducts.products);
    const np = byCode(newProducts && newProducts.products);
    op.forEach((p, code) => {
      const q = np.get(code);
      if (!q) {
        const moved = [...np.values()].find((x) => norm(x.name) === norm(p.name) && !op.has(x.code));
        if (moved) danger(`"${p.name}" changed its code from ${code} to ${moved.code}. Existing ${code} SKUs will no longer be recognised.`);
        else if (!p.retired) danger(`Product ${code} (${p.name}) was deleted. If any SKU for it was ever used, tick "Retired" instead so the code stays reserved.`);
        else notice(`Retired product ${code} (${p.name}) was deleted — its code is no longer reserved.`);
        return;
      }
      rename(p.name, q.name, `Product ${code} renamed from "${p.name}" to "${q.name}". Fine for a spelling fix — but if it is now a different product, it needs a new code.`, `${code} renamed from "${p.name}" to "${q.name}".`);
      const a = catCode(oldProducts, p);
      const b = catCode(newProducts, q);
      if (a !== b) danger(`${code} moved from ${p.category} to ${q.category}: its SKUs change from ${a}-${code}-… to ${b}-${code}-….`);
      if (!p.retired && q.retired) notice(`${code} (${q.name}) retired — hidden from the generator, code kept reserved.`);
      if (p.bespoke && !q.bespoke && !q.retired) notice(`${code} (${q.name}) joined the catalogue (was bespoke) — its SKUs stay the same.`);
      if (!p.bespoke && q.bespoke) notice(`${code} (${q.name}) marked as bespoke / one-off.`);
      if (p.retired && !q.retired) notice(`${code} (${q.name}) brought back from retirement.`);
      const os = byCode(p.sizes);
      const ns = byCode(q.sizes);
      os.forEach((s, sc) => {
        const t = ns.get(sc);
        if (!t) {
          const moved = [...ns.values()].find((x) => norm(x.name) === norm(s.name));
          if (moved) danger(`${code} size "${s.name}" moved from code ${sc} to ${moved.code}. Existing ${code}-${sc} SKUs now mean something else (or nothing).`);
          else danger(`${code} size ${sc} ("${s.name}") was removed. Existing ${code}-${sc} SKUs will no longer be recognised.`);
        } else rename(s.name, t.name, `${code}-${sc} renamed from "${s.name}" to "${t.name}". Make sure it is still the same physical size/type.`, `${code}-${sc} renamed from "${s.name}" to "${t.name}".`);
      });
      if (os.size === 0 && ns.size > 0) danger(`${code} had no sizes (SKUs used 00) and now has sizes. Existing ${code}-00 SKUs will no longer be recognised — consider adding a size "00".`);
      ns.forEach((s, sc) => { if (!os.has(sc) && ![...os.values()].some((x) => norm(x.name) === norm(s.name))) notice(`${code}: new size ${sc} (${s.name}).`); });
    });
    np.forEach((p, code) => { if (!op.has(code) && ![...op.values()].some((x) => norm(x.name) === norm(p.name))) notice(`New ${p.bespoke ? 'bespoke ' : ''}product ${code} (${p.name}).`); });

    // Materials and finishes
    const om = byCode(oldMaterials);
    const nm = byCode(newMaterials);
    om.forEach((m, code) => {
      const n = nm.get(code);
      if (!n) {
        const moved = [...nm.values()].find((x) => norm(x.name) === norm(m.name));
        if (moved) danger(`Material "${m.name}" changed its code from ${code} to ${moved.code}.`);
        else danger(`Material ${code} (${m.name}) was removed. Existing SKUs using ${code} will no longer be explained.`);
        return;
      }
      rename(m.name, n.name, `Material ${code} renamed from "${m.name}" to "${n.name}". Make sure it is still the same material.`, `Material ${code} renamed from "${m.name}" to "${n.name}".`);
      const of = byCode(m.finishes);
      const nf = byCode(n.finishes);
      of.forEach((f, fc) => {
        const g = nf.get(fc);
        if (!g) {
          const moved = [...nf.values()].find((x) => norm(x.name) === norm(f.name));
          if (moved) danger(`${n.name} finish "${f.name}" moved from code ${code}${fc} to ${code}${moved.code}.`);
          else danger(`${n.name} finish ${code}${fc} ("${f.name}") was removed.`);
        } else rename(f.name, g.name, `${code}${fc} renamed from "${m.name}, ${f.name}" to "${n.name}, ${g.name}". Make sure it is still the same finish.`, `${code}${fc} renamed from "${f.name}" to "${g.name}".`);
      });
      nf.forEach((f, fc) => { if (!of.has(fc) && ![...of.values()].some((x) => norm(x.name) === norm(f.name))) notice(`${n.name}: new finish ${code}${fc} (${f.name}).`); });
    });
    nm.forEach((m, code) => { if (!om.has(code) && ![...om.values()].some((x) => norm(x.name) === norm(m.name))) notice(`New material ${code} (${m.name}).`); });

    return out;
  }

  // ---------------------------------------------------------------------------
  // 3. Building and reading SKUs
  // ---------------------------------------------------------------------------

  function categoryFor(productsFile, product) {
    return (productsFile.categories || []).find((c) => norm(c.name) === norm(product.category)) || null;
  }
  function categoryCodeFor(productsFile, product) {
    const c = categoryFor(productsFile, product);
    return c ? c.code : '';
  }
  /** Sizes for a product, falling back to the "00" default if it has none. */
  function sizesFor(product) {
    return product && Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [DEFAULT_SIZE];
  }
  const isCustom = (finish) => /custom/i.test(str(finish && finish.name));

  /** "Teak, Natural" — the way casegoods.in writes it. Avoids "Rope, Jute Rope". */
  function materialLabel(m, f) {
    if (!m) return '';
    if (!f) return m.name;
    const mn = str(m.name).trim();
    const fn = str(f.name).trim();
    if (norm(fn).includes(norm(mn))) return fn;
    return `${mn}, ${fn}`;
  }

  /**
   * A short, readable description in the website's own wording, e.g.
   *   "Folding Flat Chair, Slung Leather — Frame: Teak, Natural · Seat: Leather, Natural Buffalo"
   *   "Fold Jute Dhurries, Aero - 4x6ft — Woven Jute, Red & Blue"
   */
  function describe(product, size, m1, f1, m2, f2) {
    let text = product.name;
    if (size && product.sizes && product.sizes.length) {
      const sn = str(size.name).trim().replace(/^\((.*)\)$/, '$1');
      if (sn && norm(sn) !== 'standard') text += `, ${sn}`;
    }
    const parts = [];
    if (m1) {
      if (m2 && m1.code === m2.code && !product.primaryPart) {
        parts.push(`${m1.name}, ${f1.name} & ${f2.name}`); // two colours of the same material
        m2 = null;
      } else parts.push((product.primaryPart ? `${product.primaryPart}: ` : '') + materialLabel(m1, f1));
    }
    if (m2) parts.push((product.secondaryPart ? `${product.secondaryPart}: ` : '') + materialLabel(m2, f2));
    return parts.length ? `${text} — ${parts.join(' · ')}` : text;
  }

  /**
   * Build a SKU from choices.
   * sel = { productCode, sizeCode, mat1, fin1, mat2, fin2 }  (mat/fin may be "")
   * Returns { sku, description, notes: [...] } or { error }.
   */
  function buildSku(productsFile, materials, sel) {
    const product = (productsFile.products || []).find((p) => p.code === sel.productCode);
    if (!product) return { error: 'Choose a product.' };
    const cat = categoryCodeFor(productsFile, product);
    if (!cat) return { error: `Product ${product.code} has an unknown category.` };
    const size = sizesFor(product).find((s) => s.code === sel.sizeCode);
    if (!size) return { error: 'Choose a size / type.' };

    const pick = (matCode, finCode, which) => {
      if (!matCode) return { none: true };
      const m = materials.find((x) => x.code === matCode);
      if (!m) return { error: `Unknown ${which} material "${matCode}".` };
      if (!finCode) return { error: `Choose a finish for ${m.name}.` };
      const f = (m.finishes || []).find((x) => x.code === finCode);
      if (!f) return { error: `Unknown finish "${finCode}" for ${m.name}.` };
      return { code: m.code + f.code, m, f };
    };
    const p1 = pick(sel.mat1, sel.fin1, 'primary');
    if (p1.error) return p1;
    const p2 = pick(sel.mat2, sel.fin2, 'secondary');
    if (p2.error) return p2;
    if (p1.none && !p2.none) return { error: 'Choose a primary material first — the secondary material can only be added after it.' };

    const parts = [cat, product.code, size.code];
    if (!p1.none) parts.push(p1.code);
    if (!p2.none) parts.push(p2.code);

    const notes = [];
    if (product.retired) notes.push('This product is retired. Only use this SKU for an existing item.');
    if (product.bespoke) notes.push('Bespoke / one-off: not in the regular catalogue. If it joins the catalogue later, this SKU stays the same.');
    [p1, p2].forEach((p) => {
      if (!p.none && isCustom(p.f)) notes.push(`"${materialLabel(p.m, p.f)}" is a single code for every custom ${p.m.name.toLowerCase()} finish. Record the actual finish separately (e.g. in the order notes).`);
    });

    return {
      sku: parts.join('-'),
      description: describe(product, size, p1.m, p1.f, p2.m, p2.f),
      notes,
    };
  }

  /**
   * Read a SKU someone typed or pasted and explain it.
   * Tolerates lower case, spaces, dots/underscores/long dashes instead of hyphens.
   * Returns {
   *   input, sku (cleaned), ok, segments: [{ code, label, meaning, ok }],
   *   description, errors: [...], warnings: [...], suggestions: [...]
   * }
   */
  function parseSku(productsFile, materials, input, history) {
    const res = { input: str(input), sku: '', ok: false, segments: [], description: '', errors: [], warnings: [], suggestions: [], history: [] };
    // Codes that meant something else in the past (code-history.json): explain them, so old SKUs can still be read.
    const past = (c) => ((history && history.changes) || []).filter((e) => e.code === c);
    const said = new Set();
    const note = (c) => past(c).forEach((e) => {
      const t = `From ${niceDate(e.from)} to ${niceDate(e.until)}, ${c} meant ${e.meant}.`;
      if (!said.has(t)) { said.add(t); res.history.push(t); }
    });
    let s = str(input).trim().toUpperCase().replace(/[\s_.‐-―−/]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    res.sku = s;
    if (!s) { res.errors.push('Nothing to check.'); return res; }
    if (s !== str(input).trim()) res.warnings.push(`Read as ${s}.`);
    const bits = s.split('-');
    if (bits.length < 3) { res.errors.push('Too short: a SKU has at least 3 parts, e.g. F-SPT-01.'); return res; }
    if (bits.length > 5) { res.errors.push('Too many parts: a SKU has at most 5, e.g. F-SPT-01-T1-M0.'); return res; }
    const [x, code, size, g, i] = bits;
    const products = productsFile.products || [];
    const seg = (code, label, meaning, ok) => res.segments.push({ code, label, meaning, ok });

    // Category
    const cat = (productsFile.categories || []).find((c) => c.code === x);
    seg(x, 'Category', cat ? cat.name : 'unknown', !!cat);
    if (!cat) res.errors.push(`"${x}" is not a category code (${(productsFile.categories || []).map((c) => c.code).join(', ')}).`);

    // Product (with typo help)
    let product = products.find((p) => p.code === code);
    if (!product) {
      const alt = products.filter((p) => lookalike(p.code) === lookalike(code));
      res.errors.push(`"${code}" is not a product code.${alt.length ? ` Did you mean ${alt.map((p) => `${p.code} (${p.name})`).join(' or ')}?` : ''}`);
      note(code);
      if (alt.length === 1) product = alt[0];
    }
    seg(code, 'Product', product ? product.name : 'unknown', !!(product && product.code === code));
    if (product && product.code === code) note(code);
    if (product && product.retired) res.warnings.push(`${product.code} (${product.name}) is retired.${product.notes ? ' ' + product.notes : ''}`);
    if (product && product.bespoke) res.warnings.push(`${product.code} (${product.name}) is a bespoke / one-off product, not in the regular catalogue.`);
    if (product && cat) {
      const pc = categoryFor(productsFile, product);
      if (pc && pc.code !== cat.code) res.errors.push(`${product.name} is in ${pc.name} (${pc.code}), not ${cat.name} — the SKU should start with ${pc.code}-.`);
    }

    // Size
    let sizeObj = null;
    if (product) {
      sizeObj = sizesFor(product).find((z) => z.code === size) || null;
      if (!sizeObj) res.errors.push(`${product.code} has no size "${size}". Sizes: ${sizesFor(product).map((z) => `${z.code} (${z.name})`).join(', ')}.`);
    }
    seg(size, 'Size / type', sizeObj ? sizeObj.name : product ? 'unknown' : '—', !!sizeObj);

    // Materials
    const mat = (pair, label) => {
      if (pair === undefined) return {};
      if (pair.length !== 2) { res.errors.push(`"${pair}" should be 2 characters: material + finish (e.g. T1).`); seg(pair, label, 'unknown', false); return {}; }
      const m = materials.find((y) => y.code === pair[0]);
      const f = m && (m.finishes || []).find((y) => y.code === pair[1]);
      if (!m) res.errors.push(`"${pair[0]}" is not a material code.`);
      else if (!f) res.errors.push(`${m.name} has no finish "${pair[1]}". Finishes: ${m.finishes.map((y) => `${y.code} (${y.name})`).join(', ')}.`);
      seg(pair, label, m ? materialLabel(m, f) || m.name : 'unknown', !!(m && f));
      if (past(pair).length) note(pair); else note(pair[0]);
      if (f && isCustom(f)) res.warnings.push(`${pair} is the shared code for any custom ${m.name.toLowerCase()} finish — the SKU alone doesn't say which.`);
      return { m, f };
    };
    const a = mat(g, 'Primary material');
    const b = mat(i, 'Secondary material');

    res.ok = res.errors.length === 0;
    if (res.ok) res.description = describe(product, sizeObj, a.m, a.f, b.m, b.f);

    // Suggest the corrected SKU where we can.
    if (!res.ok && product && cat !== undefined) {
      const pc = categoryFor(productsFile, product);
      const fixed = [pc ? pc.code : x, product.code, size, g, i].filter((v) => v !== undefined).join('-');
      if (fixed !== s) res.suggestions.push(fixed);
    }
    return res;
  }

  // ---------------------------------------------------------------------------
  // 3b. Searching: by name, old / other name, code or size, with "Did you mean…?"
  // ---------------------------------------------------------------------------
  const fold = (t) => str(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ø]+/g, ' ').trim();
  // Edit distance where swapping two neighbouring letters ("tabel" → "table") counts as one typo.
  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(Array(b.length).fill(0)));
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }
  // How closely one typed word matches one word of a name: 3 = starts with it, 2 = contains it, 1 = a typo away, 0 = no.
  const wordScore = (q, w) => {
    if (w.startsWith(q)) return 3;
    if (q.length >= 4 && w.includes(q)) return 2;
    if (q.length < 3) return 0;
    const allowed = q.length <= 5 ? 1 : 2;
    return distance(q, w) <= allowed || (w.length > q.length && distance(q, w.slice(0, q.length)) <= allowed - 1) ? 1 : 0;
  };

  /**
   * Find products for a search, e.g. "capsule chair", "spalyed", "SPT", "1440".
   * Returns { results: [{ product, via, matched }], didYouMean: [{ product, matched }] }
   *   via = 'code' | 'name' | 'other name' | 'size' | 'notes'
   */
  function searchProducts(productsFile, query, opts = {}) {
    const q = fold(query);
    const out = { results: [], didYouMean: [] };
    if (!q) return out;
    const words = q.split(' ');
    const pool = (productsFile.products || []).filter((p) => opts.includeRetired || !p.retired);
    const contains = (text) => { const t = fold(text); return words.every((w) => t.includes(w)); };
    pool.forEach((p) => {
      let via = '', matched = '';
      if (fold(p.code) === q.replace(/ /g, '')) via = 'code';
      else if (contains(`${p.code} ${p.name}`)) via = 'name';
      else {
        const old = namesOf(p).slice(1).find((n) => contains(n));
        if (old) { via = 'other name'; matched = old; }
        else if ((p.sizes || []).some((s) => namesOf(s).some((n) => contains(n)))) { via = 'size'; matched = (p.sizes || []).find((s) => namesOf(s).some((n) => contains(n))).name; }
        else if (p.notes && contains(p.notes)) via = 'notes';
      }
      if (via) out.results.push({ product: p, via, matched });
    });
    if (!out.results.length) {
      // Nothing matched exactly: look for near-misses (typos, missing letters) in names and old names.
      const scored = pool.map((p) => {
        let best = 0, bestName = '';
        namesOf(p).forEach((n) => {
          const nw = fold(n).split(' ');
          const s = words.reduce((sum, w) => sum + Math.max(0, ...nw.map((x) => wordScore(w, x))), 0) / words.length;
          if (s > best) { best = s; bestName = n; }
        });
        return { product: p, matched: bestName, score: best };
      }).filter((x) => x.score >= 1).sort((a, b) => b.score - a.score);
      out.didYouMean = scored.slice(0, 3);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // 4. Tidy, human-friendly file formatting (one size / finish per line)
  // ---------------------------------------------------------------------------
  const q = (v) => JSON.stringify(v);
  const pair = (o) => `{ "code": ${q(str(o.code))}, "name": ${q(str(o.name).trim())}${str(o.aka).trim() ? `, "aka": ${q(str(o.aka).trim())}` : ''} }`;
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
        if (p.bespoke) lines.push(`      "bespoke": true`);
        if (str(p.primaryPart).trim()) lines.push(`      "primaryPart": ${q(str(p.primaryPart).trim())}`);
        if (str(p.secondaryPart).trim()) lines.push(`      "secondaryPart": ${q(str(p.secondaryPart).trim())}`);
        if (str(p.aka).trim()) lines.push(`      "aka": ${q(str(p.aka).trim())}`);
        if (str(p.notes).trim()) lines.push(`      "notes": ${q(str(p.notes).trim())}`);
        if (str(p.link).trim()) lines.push(`      "link": ${q(str(p.link).trim())}`);
        lines.push(`      "sizes": ${list(p.sizes || [], '      ')}`);
        return `    {\n${lines.join(',\n')}\n    }`;
      })
      .join(',\n');
    return `{\n  "categories": [\n${cats}\n  ],\n  "products": [\n${prods}\n  ]\n}\n`;
  }

  function formatMaterials(materials) {
    const body = materials
      .map((m) => `  {\n    "code": ${q(str(m.code))},\n    "name": ${q(str(m.name).trim())},\n${str(m.aka).trim() ? `    "aka": ${q(str(m.aka).trim())},\n` : ''}    "finishes": ${list(m.finishes || [], '    ')}\n  }`)
      .join(',\n');
    return `[\n${body}\n]\n`;
  }

  return {
    RULES, DEFAULT_SIZE,
    validate, compare,
    buildSku, parseSku, describe, materialLabel,
    sizesFor, categoryFor, categoryCodeFor, lookalike, namesOf, niceDate, searchProducts,
    formatProducts, formatMaterials,
  };
});
