# Casegoods SKU Generator

A small website that builds Casegoods SKUs, plus a no-code editor for the product catalogue.

- **`index.html`**: the SKU generator everyone uses.
- **`editor.html`**: the catalogue editor, for adding, changing or retiring products, sizes and materials without touching code.
- **To edit the catalogue**, read **[docs/EDITING_GUIDE.md](docs/EDITING_GUIDE.md)**. It's written for non-technical people.

## SKU format

`X-ABCD-EF-GH-IJ`, e.g. `F-SPT-03-T1-P1`

| Part | Meaning | Rule |
|---|---|---|
| X | Category | 1 capital letter (F, L, O, H, T) |
| ABCD | Product | 3–4 capital letters/digits, unique forever |
| EF | Size / type | 2 characters, unique within the product (`00` if the product has no sizes) |
| GH | Primary material + finish | optional, 1 character each |
| IJ | Secondary material + finish | optional, needs a primary material |

## Files

| File | What it holds |
|---|---|
| `products.json` | Categories and every product with its sizes. `"retired": true` hides a product from the generator but keeps its code reserved. |
| `materials.json` | Materials and their finishes. |
| `sku-core.js` | The rules: checking for mistakes, building SKUs and tidy file formatting. The generator, the editor and the automatic check all use it. |
| `styles.css` | Shared look for both pages. |
| `scripts/validate.js` | `node scripts/validate.js` checks the data. Add `--fix` to also tidy the formatting. |
| `scripts/test.js` | Self-test for `sku-core.js`. |
| `.github/workflows/validate.yml` | Runs both scripts on GitHub after every change, giving a green tick or a red cross. |
| `Archive/` | Old versions, kept for reference. The site doesn't use them. |

## Safety nets

1. The **editor** won't publish while there are problems (duplicate codes, missing names, codes in the wrong format).
2. **GitHub** checks every change automatically. A red ❌ on a commit means something needs fixing.
3. The **generator** shows a red warning box if the data ever has problems, instead of quietly producing wrong SKUs.
4. **Every change is a commit**, so any mistake can be undone from the repository history.

## Running locally

The pages load JSON files, so they must be served over HTTP, not opened as a file:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.
