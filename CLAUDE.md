# Casegoods SKU system: rules for AI assistants

The people asking you for changes are usually **not technical**. Reply in plain English, keep changes small, and explain what you changed in one or two sentences.

## What this is
- A static site (GitHub Pages): `index.html` (SKU generator + SKU list) and `editor.html` (catalogue editor).
- The data is `products.json` (categories, products, sizes) and `materials.json` (materials, finishes).
- All rules live in `sku-core.js`. SKU format: `X-ABCD-EF-GH-IJ` (category, product, size, primary material+finish, secondary material+finish).

## The golden rules (never break these)
1. **A code never changes meaning.** Don't renumber sizes, reuse a product/material/finish code, change a product's code, or move a product to another category unless the person explicitly confirms they understand existing SKUs will change.
2. **Retire, don't delete.** To discontinue a product, set `"retired": true`.
3. **New things get new codes:** the next unused size number, a new unused product code (3–4 capitals/digits, unique including retired ones), or the next free material letter.
4. Bespoke / one-off / prototype products are normal products with `"bespoke": true`, in their real category. To move one into the catalogue, remove `"bespoke"` and keep its code.
5. Optional product fields: `primaryPart`, `secondaryPart`, `aka` (other names, comma-separated), `notes` (one line), `link` (full https:// URL). If a product is renamed, keep its code and put the old name in `aka`.

## How to make a change
1. Edit `products.json` / `materials.json`.
2. Run `node scripts/validate.js --fix` (tidies the layout and checks everything) and `node scripts/test.js`. Both must pass.
3. Run `node scripts/validate.js --against HEAD` and tell the person about any line marked "AFFECTS EXISTING SKUs".
4. Open a pull request with a short, plain-English description. Don't merge it yourself.

## Don't
- Don't change the SKU format or `sku-core.js` rules unless explicitly asked.
- Don't edit `store.json` or `reports/`: the weekly shop check writes those.
- Don't add frameworks, build steps or dependencies. It's plain HTML/JS on purpose.
