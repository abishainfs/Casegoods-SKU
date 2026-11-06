# Bespoke pieces, integrations and next steps

Notes for the Casegoods team on how to grow this tool without making it complicated.

---

## 1. Bespoke, one-offs, exhibitions and prototypes

### How a product actually gets into the catalogue

```
 asked for / designed        made once              liked, made again           no longer made
 ───────────────────▶  BESPOKE / ONE-OFF  ─────▶  IN CATALOGUE  ─────────▶  RETIRED
 (client, exhibition,   (real code from day 1)   (same code, same SKUs)    (code reserved forever)
  prototype)
```

### What's built

Each product in the editor has a **Status**: *In catalogue*, *Bespoke / one-off / prototype*, or *Retired*.

- A bespoke piece gets a **real product code in its real category from day one**, e.g. `F-XPT-01`. If it later joins the catalogue, you only change its status: **its SKUs never change**, so anything already invoiced, photographed or labelled stays correct.
- Bespoke pieces appear in the generator under their own **"Bespoke & one-offs"** heading and in the SKU list behind a **Bespoke** filter, so nobody mistakes them for catalogue products.
- Joining the catalogue is recorded in the History tab ("XPT joined the catalogue (was bespoke)").

**Why not a separate "Bespoke" category letter, like `B-…`?** Because the category letter is part of the SKU. A piece that started as `B-XPT-01` would have to become `F-XPT-01` when it joined the catalogue, and every earlier SKU would be wrong. The status approach avoids that entirely.

### Two kinds of "bespoke"

| Situation | What to do |
|---|---|
| **A new design** made for a client, an exhibition or as a prototype | Add a new product, Status = *Bespoke*. Use **Notes** for the context ("Made for Salone 2026 stand", "Client: Studio X"). |
| **A catalogue product in a custom size or spec** (e.g. a Trestle Table at 2900mm) | Add a new **size** to the existing product, named clearly ("2900mm – bespoke, Studio X"). If it keeps being ordered, it's already in place. |
| **A catalogue product in a custom finish** | Use the material's *Custom* finish and write the actual finish in the order notes. The SKU can't tell custom finishes apart, by design. |

### Exhibitions

No separate feature is needed. Mark new pieces *Bespoke*, put the show in **Notes**, and use **SKU list → Download as spreadsheet** to get an exhibition sheet with every code, size and link.

---

## 2. Product details: what to store here, and what not to

Each product now has two optional fields under **More details**:

- **Notes**: one line shown wherever the product is chosen (context, rules like "extra bays are separate SKUs").
- **Files link**: a Dropbox or Google Drive folder with drawings, photos and spec sheets. Shown as *Drawings & files ↗*.

**Recommendation: keep it to links.** This tool is the *code book*. Files, prices, stock and dimensions belong in systems built for them (Dropbox/Drive, Shopify, accounts). If this site starts holding prices or dimensions, they'll drift out of date in two places. One link to the source of truth avoids that.

---

## 3. Integrations: what's worth it

| Integration | Value | Effort | Recommendation |
|---|---|---|---|
| **Shopify (read)** | Shows what's live, suggests missing SKUs, adds photos and links | Built | ✅ Running weekly |
| **Spreadsheet export** | Price lists, exhibition sheets, stock takes | Built | ✅ SKU list → *Download as spreadsheet* |
| **Dropbox / Drive links** | One click from a product to its drawings | Built (Files link) | ✅ Fill in as you go |
| **QR codes on labels / tags** | Scan a tag → this site explains the SKU (`…/index.html#F-RTT-01-T1-M0` already works as a link) | Small | 👍 Good next step for exhibitions and the workshop |
| **Shopify (write)**: push SKUs into Shopify automatically | Saves pasting the 190 suggested SKUs | Medium; needs a Shopify admin key and care | ⏸ Do the first pass by hand from the CSV; automate only if variants change often |
| **Accounting / inventory** (Tally, Zoho) | Same SKUs across invoices and stock | Depends on the system | ⏸ Export the SKU list into it; don't build a sync |
| **Notifications** (email when the catalogue changes) | Team knows when codes are added | Tiny: GitHub → *Watch* the repository | 👍 Anyone who wants it can turn it on themselves |
| **A database** | Only needed to store things this tool deliberately doesn't (prices, stock, orders) | Large | ❌ Not needed for SKUs (see SYSTEM_REVIEW.md) |

---

## 4. Questionnaire for the team

Short enough to answer in five minutes. Paste it into a Google Form, or just send it as a message.

1. **How often do you make or look up a SKU?** (daily / weekly / monthly / rarely)
2. **Where do you use SKUs most?** (Shopify, invoices / quotes, labels / packaging, stock, exhibitions, talking to the workshop, other)
3. **Was anything confusing the first time you used the SKU site?** What?
4. **Have you ever been unsure which SKU to use** for a product someone ordered? Which product?
5. **Do you know of products that are made but not in the SKU list yet?** Bespoke pieces, prototypes, exhibition pieces…
6. **When a bespoke piece is ordered again, who decides it becomes a catalogue product?** Should the site show who to ask?
7. **Would a QR code on product tags or labels be useful?** (e.g. at exhibitions or in the workshop)
8. **Where do drawings and photos live today?** (Dropbox, Drive, someone's laptop…) Would a link from each product help?
9. **Would you like an email when products or codes are added or changed?** (yes / no)
10. **Who should be allowed to edit the catalogue?** Who should own it?
11. **Anything you'd add, remove or rename on the site?**

**Questions 5, 6 and 10 matter most.** The tool can't decide who owns the catalogue. It works best with one named person who reviews new codes, even if several people can edit.

---

## 5. Keep it simple

- Three places only: **Make a SKU**, **SKU list**, **Edit catalogue**. Resist adding more tabs.
- Before building a feature, ask: *can a link, a note or the spreadsheet export do this?* Usually yes.
- The rules in `sku-core.js` are the heart of it. Everything else is presentation.
