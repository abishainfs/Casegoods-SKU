# Casegoods SKUs

Make, check and look up Casegoods SKUs, and edit the product catalogue without touching code.

| Page | For |
|---|---|
| **`index.html` → Make a SKU** | Choose a product, size and materials; the SKU builds itself. |
| **`index.html` → SKU list** | Every product, size, material and finish code, with filters. Paste a SKU into the search to check it, or use *Check a list of SKUs* for many at once. |
| **`editor.html`** | Add, change or retire products and materials. Publishes to the website. |

- **Editing the catalogue?** Read **[docs/EDITING_GUIDE.md](docs/EDITING_GUIDE.md)**, written for non-technical people.
- **Why it works this way and what it protects against:** **[docs/SYSTEM_REVIEW.md](docs/SYSTEM_REVIEW.md)**
- **Bespoke pieces, integrations, a team questionnaire:** **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)**
- **Online shop vs catalogue:** **[reports/store-check.md](reports/store-check.md)**, updated every Monday.

## SKU format

`X-ABCD-EF-GH-IJ`, e.g. `F-FFC-03-T1-E0` (Folding Flat Chair, Slung Leather, Teak Natural frame, Natural Buffalo leather seat)

| Part | Meaning | Rule |
|---|---|---|
| X | Category | 1 capital letter (F, L, O, H, T) |
| ABCD | Product | 3–4 capitals/digits, unique forever |
| EF | Size / type | 2 characters, unique within the product (`00` if it has none) |
| GH | Primary material + finish | optional, 1 character each |
| IJ | Secondary material + finish | optional, needs a primary material |

**Golden rule:** a code never changes meaning. Add new codes; retire old ones; never renumber.

## Files

| File | What it holds |
|---|---|
| `products.json` | Categories and every product with its sizes. Optional per product: `"retired": true` or `"bespoke": true`, `"primaryPart"` / `"secondaryPart"` (e.g. "Frame" / "Seat"), `"notes"`, `"link"` (Dropbox/Drive folder). |
| `materials.json` | Materials and their finishes. |
| `store.json` | Written by the shop check: SKUs live on casegoods.in, plus product links and pictures. |
| `sku-core.js` | All the rules: checks, change detection, building and reading SKUs, descriptions. Used by every page and script. |
| `styles.css` | Shared look. |
| `logo.svg` | The Casegoods logo (from casegoods.in). |
| `scripts/validate.js` | `node scripts/validate.js [--fix] [--against <commit>]` checks the catalogue and reports changes that affect existing SKUs. |
| `scripts/test.js` | Self-test (including SKUs that are live on the shop). |
| `scripts/store-check.js` | Compares casegoods.in with the catalogue and writes `store.json` and `reports/`. |
| `.github/workflows/validate.yml` | Runs the checks on every change: green ✅ or red ❌. |
| `.github/workflows/store-check.yml` | Runs the shop check every Monday, or on demand. |
| `Archive/` | Old versions, kept for reference. Not used. |

## Running locally

The pages load JSON files, so serve the folder over HTTP rather than opening the file directly:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.
