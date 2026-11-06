# How to change the Casegoods catalogue (no coding needed)

There are three ways to add, remove or change products and materials. Pick whichever suits you.
**Option 1 is the simplest and the hardest to get wrong.**

| | Option 1: Editor page | Option 2: Free AI chat + GitHub website | Option 3: Google Sheet *(not built yet)* |
|---|---|---|---|
| What you need | A web browser and an access key (set up once) | A free GitHub account and a free ChatGPT / Claude / Gemini account | A Google account |
| Install anything? | No | No | No |
| Can you break the website? | No. It blocks mistakes before publishing. | Unlikely. Mistakes are flagged with a red ❌. | Yes, if someone types a duplicate code |
| Cost | Free | Free | Free |

---

## Option 1: The catalogue editor (recommended)

It's a form, like filling in an online order. You never see any code.

### One-time setup (done by Abishai or whoever manages GitHub, about 5 minutes)

1. Sign in to github.com and go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Fill it in:
   - **Name:** `Catalogue editor – <person's name>`
   - **Expiration:** the longest allowed (e.g. 1 year). Put a reminder in your calendar to renew it.
   - **Repository access:** *Only select repositories* → `Casegoods-SKU`
   - **Permissions → Repository permissions → Contents:** *Read and write*. Leave everything else alone.
3. Click **Generate token** and copy the key (it starts with `github_pat_`).
4. On the editor's computer, open the editor page (the website address + `/editor.html`, or click *Open the catalogue editor* at the bottom of the SKU generator).
5. Go to the **Publishing setup** tab, paste the key and click **Save & test connection**. You should see "✓ Connected".
6. Send the key over a private channel, or better, paste it in yourself. It's like a password: it can only change this one project, and it can be cancelled any time on GitHub.

> The editor doesn't need their own GitHub account. Each change is saved under the key's owner, with a description of what changed.

### Everyday use

1. Open the **catalogue editor**: *Edit catalogue* at the top right of the SKU site, or *Edit* next to any product in the SKU list.
2. **To add a product:** click **+ Add product**. Type the code (3–4 letters, e.g. `RVT`) and the name, then pick the category. Click **+ Add size** for each size or type. The editor numbers sizes automatically: 01, 02, 03…
3. **To change something:** click a product to open it, then edit any box.
4. **To stop selling a product:** tick **Retired**. It disappears from the SKU generator, but its code stays reserved so nobody reuses it by accident. Only use **Delete** for something added by mistake that never had a SKU.
5. **Materials & finishes** tab: works the same way for materials and finishes.
6. Problems show up in a **red box** at the top, for example "Product code SPT is used by two products". The Publish button stays disabled until they're fixed.
7. A **yellow box** means a change affects SKUs that may already exist, such as a renumbered size or a deleted product. Green "● live" counts show how many SKUs on casegoods.in use each product, size or finish. Think twice before changing anything that's live.
8. Click **Publish** and read the summary. The live site updates within a minute or two.
9. Every **(?)** explains the field next to it. Hover over it, or tap it on a phone.

Good to know:
- **History & shop check** tab: recent changes, and the weekly report comparing casegoods.in with the catalogue (wrong or missing SKUs, plus a suggested SKU for every shop variant).
- **Part names (optional)**, under each product: name what the two materials are for (e.g. *Frame* / *Seat*). The generator then labels the material steps, so nobody enters them in the wrong order.
- If you close the page before publishing, the editor remembers your unpublished changes and offers them back next time.
- **Undo all changes** throws away everything you haven't published yet.
- No key on this computer? Use **Download files**, then follow steps 3–5 of Option 2 to upload the two downloaded files.

---

## Option 2: Free AI chat + GitHub website

Good for people who prefer typing requests in plain English, such as "add a 2400mm size to the Splayed Plank Bench".

### One-time setup
1. Create a free account at github.com and send Abishai your username.
2. Abishai adds you on GitHub: **repository → Settings → Collaborators → Add people**.
3. Create a free account on any AI chat: chatgpt.com, claude.ai or gemini.google.com.

### Making a change
1. Open the file on GitHub:
   - Products and sizes: `https://github.com/abishainfs/Casegoods-SKU/blob/main/products.json`
   - Materials and finishes: `https://github.com/abishainfs/Casegoods-SKU/blob/main/materials.json`
2. Click the **copy icon** ("Copy raw file") at the top right of the file.
3. Open your AI chat. Paste the **prompt below**, then paste the file and describe your change.
4. Copy the full file the AI gives back.
5. Back on GitHub, click the **pencil ✏️ (Edit)**. Select everything (Ctrl+A / Cmd+A), paste and click **Commit changes…**. Write a short note such as "Added RVT Riverside Table" and confirm.
6. Wait about a minute and refresh the page. A green ✅ next to your change means everything's fine. A red ❌ means the automatic check found a problem: click it to read what's wrong in plain English, then fix it the same way.
   (You can also undo: open **History**, click your change and use **Revert**, or ask Abishai.)

### The prompt to paste into the AI (copy all of it)

```text
You are helping me edit a product catalogue file (JSON) for Casegoods' SKU generator.
I will paste the current file, then describe a change. Return the COMPLETE updated file
in a single code block, followed by a short list of what you changed. Do not change
anything I did not ask for.

Rules you must follow:
- Keep exactly the same layout and style as the file (one size/finish per line).
- products.json: each product has "code" (3-4 CAPITAL letters/digits, unique across ALL
  products including ones marked "retired": true), "name", "category" (must be one of the
  category names listed at the top), and "sizes" (a list; each size has a 2-character
  "code" like "01", unique within that product, and a "name").
- New sizes get the next unused number (01, 02, 03...). Never renumber existing sizes:
  their codes are already printed on SKUs.
- To discontinue a product, add "retired": true instead of deleting it.
- A product may optionally have "primaryPart" and "secondaryPart" (e.g. "Frame", "Seat"):
  what the two materials in its SKU are for. Keep them if present.
- materials.json: each material has a 1-character "code" (unique), a "name", and
  "finishes" (each with a 1-character "code" unique within that material, and a "name").
- Never reuse or change an existing code unless I explicitly ask.
- If my request would break a rule or is unclear, ask me before producing the file.

Here is the file:
<paste file here>

My change:
<describe your change here>
```

> Free AI accounts have daily limits and can make mistakes. That's why the GitHub check exists. Always look at the AI's list of changes before committing.

---

## Option 3: Google Sheet (can be built if you prefer it)

The team would keep the catalogue in a Google Sheet with *Products*, *Sizes* and *Materials* tabs. The website would read the sheet directly, so changes appear as soon as someone types them.

- **Pros:** everyone already knows spreadsheets, there's nothing to set up per person, and Google keeps version history.
- **Cons:** there's no "check before publish" step. A typo or duplicate code goes live straight away (the generator would show a red warning box). Anyone with edit access can change live data, and the website depends on the sheet staying "Published to web".

If the team prefers this, ask for it to be connected. It's a small change to the website.

---

## Golden rules (whichever option you use)

1. **Codes are permanent.** Once a SKU is printed, its product, size, material and finish codes must never mean something else. Add new codes; don't recycle old ones.
2. **Retire, don't delete**, any product that has ever had a SKU.
3. If something looks wrong on the website, nothing is lost: every change is recorded and can be undone.
