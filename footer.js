/*
 * footer.js — the help footer shown on every page:
 *   1. Contact (WhatsApp / email)
 *   2. How to change the catalogue with your own AI (Claude, ChatGPT…)
 *   3. How this connects to Shopify
 * Edit the text here once; both pages pick it up.
 */
(function () {
  'use strict';
  const REPO = 'abishainfs/Casegoods-SKU';
  const GH = `https://github.com/${REPO}`;
  const WHATSAPP = 'https://wa.me/919100824002';
  const EMAIL = 'abishainfs@gmail.com';

  const waIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
  const mailIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="5" width="19" height="14"/><path d="M3 5.5l9 7 9-7"/></svg>';

  const contactLinks = (small) => `
    <a class="btn ${small ? 'btn-small' : ''}" href="${WHATSAPP}" target="_blank" rel="noopener">${waIcon} WhatsApp</a>
    <a class="btn ${small ? 'btn-small' : ''}" href="mailto:${EMAIL}?subject=Casegoods%20SKU%20site">${mailIcon} ${EMAIL}</a>`;

  // The instructions people paste into a free AI chat together with the file.
  const AI_PROMPT = `You are helping me edit a product catalogue file (JSON) for Casegoods' SKU system.
I will paste the current file, then describe a change. Return the COMPLETE updated file
in one code block, then a short list of what you changed. Change nothing I did not ask for.

Rules:
- Keep exactly the same layout (one size/finish per line).
- products.json: each product has "code" (3-4 CAPITAL letters/digits, unique across ALL
  products including retired ones), "name", "category" (one of the category names at the
  top) and "sizes" (each with a 2-character "code" like "01", unique within the product,
  and a "name"). Optional: "retired": true, "bespoke": true (never both), "primaryPart",
  "secondaryPart", "aka" (other names), "notes" (one line), "link" (a full https:// address). Keep them if present.
- New sizes get the next unused number. NEVER renumber or reuse existing codes: they are
  printed on products, invoices and the shop.
- To discontinue a product, add "retired": true instead of deleting it.
- materials.json: each material has a 1-character "code" (unique), a "name" and "finishes"
  (each with a 1-character "code", unique within that material, and a "name").
- If my request breaks a rule or is unclear, ask me before producing the file.

Here is the file:
<paste the file here>

My change:
<describe the change here>`;

  const html = `
  <footer class="site-footer">
    <div class="inner">
      <section>
        <h3>Need help?</h3>
        <p>Questions, something broken, or an idea? Contact Abishai, who built this.</p>
        <div class="contact-links">${contactLinks()}</div>
      </section>

      <section>
        <h3>Change it with your own AI</h3>
        <p>Prefer typing what you want in plain English? An AI assistant can make the change for you.</p>
        <details>
          <summary>With Claude Code (paid Claude plan — easiest)</summary>
          <ol>
            <li>Go to <a href="https://claude.ai/code" target="_blank" rel="noopener">claude.ai/code</a>, sign in and connect GitHub when asked.</li>
            <li>Choose the repository <strong>${REPO}</strong>.</li>
            <li>Type the change, e.g. <em>"Add a 2900mm size to the Trestle Table"</em> or <em>"Mark Amari Chair as bespoke"</em>.</li>
            <li>Claude follows the rules in the project, runs the checks and opens a <em>pull request</em>. Press <strong>Merge</strong> on GitHub to publish.</li>
          </ol>
        </details>
        <details>
          <summary>With any free AI chat (ChatGPT, Claude, Gemini)</summary>
          <ol>
            <li>Open <a href="${GH}/blob/main/products.json" target="_blank" rel="noopener">products.json</a> (or <a href="${GH}/blob/main/materials.json" target="_blank" rel="noopener">materials.json</a>) and click the copy icon.</li>
            <li><button type="button" class="btn btn-small" id="copyAiPrompt">Copy the AI instructions</button>, paste them into the chat, add the file and describe your change.</li>
            <li>Back on GitHub, click ✏️, replace everything with the AI's answer and press <strong>Commit changes</strong>.</li>
            <li>A green ✅ next to your change a minute later means all good. A red ❌ explains what to fix.</li>
          </ol>
        </details>
        <p style="margin-top:12px">Still stuck? <a href="${WHATSAPP}" target="_blank" rel="noopener">WhatsApp Abishai</a> · <a href="mailto:${EMAIL}?subject=Casegoods%20SKU%20site">email</a></p>
      </section>

      <section>
        <h3>Shopify</h3>
        <p>The site already reads <strong>casegoods.in</strong> every Monday. That's where the "live on casegoods.in" marks, product photos and links come from. It never changes the shop.</p>
        <details>
          <summary>How do we get these SKUs onto Shopify?</summary>
          <h4>One product at a time</h4>
          <p>Shopify admin → <em>Products</em> → open the product → click a variant → paste the SKU from the generator into <em>SKU</em> → Save.</p>
          <h4>Many at once</h4>
          <ol>
            <li>Open the <a href="${GH}/blob/main/reports/store-check.md" target="_blank" rel="noopener">shop report</a> and the <a href="${GH}/blob/main/reports/store-sku-suggestions.csv" target="_blank" rel="noopener">suggested SKUs</a> for every variant.</li>
            <li>Shopify admin → <em>Products</em> → <em>Export</em>. Fill the <em>Variant SKU</em> column from the suggestions. Start with the rows marked <em>high</em>.</li>
            <li><em>Import</em> the file with <em>"Overwrite products with matching handles"</em> ticked. Try one product first.</li>
          </ol>
          <h4>Fully automatic (later)</h4>
          <p>A Shopify <em>custom app</em> with permission to edit products would let the weekly check fill in SKUs by itself. The matching is already written, so a developer (or Claude Code) only needs to add that last step.</p>
          <p><a href="${GH}/actions/workflows/store-check.yml" target="_blank" rel="noopener">Re-run the shop check now ↗</a></p>
        </details>
      </section>
    </div>
    <div class="footer-base">Casegoods SKU system · <a href="${GH}" target="_blank" rel="noopener" class="muted">source on GitHub</a></div>
  </footer>`;

  document.body.insertAdjacentHTML('beforeend', html);
  const btn = document.getElementById('copyAiPrompt');
  if (btn) btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(AI_PROMPT); }
    catch (e) { const t = document.createElement('textarea'); t.value = AI_PROMPT; document.body.append(t); t.select(); try { document.execCommand('copy'); } finally { t.remove(); } }
    btn.textContent = 'Copied ✓';
    setTimeout(() => (btn.textContent = 'Copy the AI instructions'), 2500);
  });
})();
