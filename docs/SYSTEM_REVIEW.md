# SKU system review

A first-principles look at the Casegoods SKU system: what it needs to do, what can go wrong, and what was built to prevent it. The SKU format itself (`X-ABCD-EF-GH-IJ`) is unchanged, and every SKU already in use still means exactly the same thing.

---

## 1. What an SKU system needs to do

| Need | How it's met now |
|---|---|
| **One item, one SKU.** The same product, size and materials must always give the same SKU. | SKUs are *built* from codes, not handed out from a counter. Two people choosing the same things get the same SKU. |
| **One SKU, one item.** A SKU must never mean two different things. | Duplicate codes are blocked. Retired codes stay reserved. Any change that would alter what an existing SKU means is flagged before publishing and after every change. |
| **Readable by people.** Anyone should be able to tell what `F-FFC-03-T1-E0` is. | The **SKU list** lists every code, and pasting a SKU into its search explains it part by part. The generator labels each segment. |
| **Hard to get wrong.** Typos, lookalike characters, wrong order. | The checker fixes lower case, spaces and odd dashes, spots `0`/`O` mix-ups and wrong category letters, and suggests the corrected SKU. |
| **A single source of truth for the codes.** | `products.json` and `materials.json`, with every change recorded. |
| **Agreement with where SKUs are used.** | A weekly **shop check** compares casegoods.in with the catalogue. |
| **Editable by non-technical people.** | The catalogue editor, which blocks mistakes and explains the impact of each change. |

## 2. Is a database needed?

**No, not for the SKU system itself.**

- **SKUs don't need allocating.** A database is mainly needed when IDs are handed out one by one (order #1001, #1002…), where two people could grab the same number at once. Casegoods SKUs are *derived* from codes, so there's nothing to allocate and nothing to collide.
- **The code book already behaves like a database.** It lives in GitHub: every change is recorded with who, when and what, any change can be undone, it's free, and the website is served straight from it.
- **The register of SKUs actually in use already exists. It's Shopify.** Rather than keeping a second list that could drift, the weekly shop check reads Shopify and compares it with the code book.

**When you *would* want one:** if you need to track SKUs that are never on the shop (bespoke pieces, project orders, B2B quotes) along with prices, stock or production status. At that point it's an inventory or order system (Zoho Inventory, a Google Sheet "SKU register", Airtable…), and it should **use** these SKUs rather than replace the code book. *Check a list of SKUs* (on the SKU list page) can audit any list exported from such a system.

**Hosting:** keep it on GitHub Pages. It's free, has no server to maintain, and keeps history. Nothing here needs a server.

## 3. What can go wrong, and what now catches it

### When editing the catalogue

| Risk | Caught by |
|---|---|
| Two products or materials share a code (this had already happened: Rosewood/Rope `R`, Trestles/Towel Rack `FFTR`) | Error. Can't publish. |
| A code that looks like another (`0TL` vs `OTL`, `1` vs `I`, `5` vs `S`) | Warning |
| Same size or finish name entered twice under different codes (one item would get two SKUs) | Warning |
| Missing names, codes in the wrong format, stray spaces | Error or warning; codes are upper-cased automatically |
| **A code's meaning changes**: a size renumbered, a product deleted, a finish renamed to something else, a product moved to another category | **Impact warning** in the editor, listed again in the publish confirmation, and noted on GitHub after the change |
| Deleting something that is live on the shop | Its live-SKU count is shown, and the delete confirmation names the live SKUs |
| Two people editing at once | The editor detects it and asks before overwriting |
| A broken file from editing by hand on GitHub | The automatic check marks the change with a red ❌ and explains why |
| Unpublished work lost | Drafts are kept in the browser and offered back next time |

### When making or using SKUs

| Risk | Caught by |
|---|---|
| Materials entered in the wrong order (`T1-M0` vs `M0-T1` for the same table) | Products can name their parts ("Primary material — Base"). If the shop already uses the reverse order, the generator says so and offers to switch. |
| Custom finishes: every custom marble is `M6`, so the SKU can't say which | A note appears whenever a "Custom" finish is chosen, asking for the details to be recorded separately |
| Retired product used for a new SKU | Retired products are hidden from the generator; the checker flags them |
| Typos when copying SKUs by hand | Copy buttons, plus SKU checking with "Did you mean…?" on the SKU list page |
| Spreadsheet mangling | Copy and download outputs are plain text and keep leading zeros (`01`) |

## 4. What the shop check found on casegoods.in

As of the first run:

- **314 variants, only 37 with a SKU.** All 37 are correct, which is a good sign the system works. For the other 277, the report suggests a SKU for **178** (108 confident, 70 to double-check). The rest need a naming decision first (below).
- **Fillet Joint Table** on the shop is the **Fillet Edge Table (`FET`)**: it was renamed in Nov 2025, but the website still uses the old name. The old code `FJT` stays retired so it's never reused. FET's *Other names* field now holds "Fillet Joint Table", so the shop check links the two. The shop page doesn't say which of FET's 10 sizes each variant is, so it can't suggest SKUs there yet. Renaming the shop product, or adding a size option, would fix it.
- **Names that differ between the shop and the catalogue.** Pick one wording for each:
  - Trestle Table: shop "Only Legs" vs catalogue "Only Trestles"
  - Jute Dhurries runner: shop "2 x 7.5ft" vs catalogue "2.5x7ft". *Which is the real size?*
  - Folding Flat Chair seat: shop "Solid" vs catalogue "Teak Veneer"
  - Leather: shop "Olive Green" vs catalogue "Olive"
  - Aluminium: shop "Nickel Plated" vs catalogue "Nickel, Polished" / "Nickel, Satin"
  - Building Blocks: shop "Blocks" vs catalogue "(w/o Holder)"
- **Hold Shelf.** The shop sells 2, 3, 4, 5 or 6 bays. The catalogue has "2 Bays" plus "Extra Bay", so a 4-bay shelf is *two* SKUs (`CHS-0x` + 2 × the extra-bay SKU). That's a valid approach, but it should be written down so everyone does it the same way.
- **Seven Tube Light, Dome Up-Light, Rolling Round Light, Standing Straight Lamp:** split across several shop pages without saying which size or type each page is. Adding a "Type" option on the shop (e.g. Vertical / Horizontal) would make every variant mappable.
- **Housekeeping on Shopify:** many furniture products have Shopify product type "Lights", and several pages have "-copy" addresses. This doesn't affect SKUs, but it does affect filtering and search on the shop.

The full list is in `reports/store-check.md`, with every variant in `reports/store-sku-suggestions.csv`. Both refresh every Monday, or on demand from GitHub → Actions → *Shop check* → *Run workflow*.

**Filling in the 178 suggested SKUs on Shopify:** open the CSV, filter *Confidence = high*, and paste each SKU into the variant in Shopify admin. For bulk updates, an app such as Matrixify can import the column. Do the "check" rows by eye.

## 4b. Names change; codes must not

In Casegoods' product development, names change all the time: the Drift Chair was the *Capsule Chair*, the Fillet Edge Table was the *Fillet Joint Table*, the Three Leg Table was the *Three Legged Table*. That's fine, **as long as the code stays the same**. The system now supports it:

- **Old & other names** can be stored on every product, size, material and finish: development nicknames, old names, or the name used on casegoods.in. Search finds them ("capsule" → *"Capsule Chair" is now called Drift Chair (DRS)*), and the weekly shop check uses them to match the website.
- **Renaming in the editor keeps the old name automatically.** Nobody has to remember to do it.
- **Typos get "Did you mean…?"**: "spalyed" → *Splayed Plank Table / Splayed Plank Bench*, "bamboo handels" → *Bamboo Handle*. Accents are ignored ("dipa" finds Dīpā).
- The old names already in the repository's history have been filled in: Three Legged Table, Splayed Plank, Chulha, Dīpā, Cylinder, Cast and Faced, Double Hemisphere Knob, Bamboo Handles, Fillet Joint Table, Capsule Chair, Teakwood, Stone - Marble, Jute.

### The dangerous kind: when a code changed meaning

The history shows this *has* happened, three times:

| Date | What changed |
|---|---|
| **21 Nov 2025** | Materials were reorganised. `O` went from Mahogany to Oak; `T2`/`T3` swapped (Black ↔ Dark Stained); every Aluminium finish moved; Marble `M1`–`M5` shifted; the Leather finishes were reordered; `E` was Refractory Brick. |
| **21 Nov 2025 – 2 Mar 2026** | `H` was used by **both** Mahogany and Leather, and `R` by both Rosewood and Rope (until Nov 2026). The old generator always picked the first one, so a "Leather" SKU came out as Mahogany. |
| **4 Feb 2026** | Nickel Satin and Nickel Polished swapped codes (`B5`/`B6`, `U4`/`U5`). |
| **2 Mar 2026** | Leather moved from `H` to `E`; `H` became Mahogany only. |

All 63 old meanings are in **`code-history.json`**, generated from the repository's history. When someone checks an old SKU, the site now explains it: *"From 21 Nov 2025 to 2 Mar 2026, H0 meant Mahogany, Unfinished or Leather, Natural Buffalo."* The 37 SKUs on the shop were all made after these changes and read correctly.

**Going forward:** the editor warns before any change like this. Renames are fine; reusing or reshuffling codes isn't. If it ever has to happen, add a line to `code-history.json`.

## 5. Design decisions

- **Clarity first, Casegoods second.** The look borrows the website's DNA: black on white, grotesk type with serif accents, square corners and thin rules. But buttons stay big and obvious, there's one black primary action per area, and focus outlines and error colours are always visible.
- **One flow, four steps.** Product → size → material → second material, with the SKU building itself on the right. Each segment is labelled underneath, so the structure teaches itself.
- **Search instead of category-first.** Typing "chair" or "SPT" finds the product; the category letter follows automatically.
- **Sizes and finishes as buttons** when there are up to about a dozen (all options visible at once), and a dropdown when there are more (e.g. 28 dhurrie sizes).
- **No pictures.** Product photos were tried and removed to keep the site light. Each product links to its page on casegoods.in instead.
- **The description is written the way the website writes it:** "Folding Flat Chair, Slung Leather — Frame: Teak, Natural · Seat: Leather, Natural Buffalo". It avoids repetition ("Jute Rope", not "Rope, Jute Rope") and merges two colours of the same material ("Woven Jute, Red & Blue").
- **One site, three places:** SKU generator, SKU list (which includes checking) and Edit info share a header. Every product in the SKU list links to *Generate a SKU* and *Edit*, and the editor links back with *Try in generator*.

## 6. Decisions for you

1. Fillet Edge Table: rename it on the shop too (it's still "Fillet Joint Table" there), and add its sizes as a shop option?
2. The six naming differences in section 4: which wording is right?
3. Material order convention: should the *structural* part (frame/base) always be primary? Part names are set for RTT (Base/Top) and FFC (Frame/Seat). Adding them to other two-material products is a 10-second edit each.
4. Do you want a register for non-shop SKUs (bespoke/projects)? If so, a Google Sheet that *Check a list of SKUs* can audit is the lightest option.
