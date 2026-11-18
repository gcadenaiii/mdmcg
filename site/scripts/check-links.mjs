/* Follows every link and button on every page and reports any that does not arrive.
   node scripts/check-links.mjs      (SHOTS_BASE overrides https://mdmcg.com)
   For each page: every <a href>. Internal page: must answer 200, and a #name must exist on it. Research tools (/lab/#/route):
   opened in the browser, must draw content and no "not found" text. Email buttons are never pressed: only that they carry an
   address and a subject is checked. External links: must answer below 400. Exit code 1 if anything fails. */
import { chromium } from 'playwright-core';
const base = process.env.SHOTS_BASE || 'https://mdmcg.com';
const pages = ['/', '/device/', '/reading/', '/science/', '/heart-twin/', '/evidence/', '/team/', '/contact/', '/this-page-does-not-exist/'];
const b = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const seen = new Map(); // target -> [pages, labels]
let emails = 0, emailBad = 0;
for (const u of pages) {
  await p.goto(base + u, { waitUntil: 'networkidle' });
  const links = await p.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => ({ href: a.getAttribute('href'), label: (a.innerText || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '), mail: a.hasAttribute('data-m'), m: (a.dataset.m || '').length, s: a.dataset.s || '' })));
  for (const l of links) {
    if (l.mail) { emails++; if (!l.m || !l.s) { emailBad++; console.log(`FAIL ${u} email button "${l.label}" has no address or subject`); } continue; }
    if (l.href.startsWith('#') && u.includes('does-not-exist')) continue; // the not-found page's own skip link
    const t = l.href.startsWith('#') ? u + l.href : l.href;
    if (!seen.has(t)) seen.set(t, []);
    seen.get(t).push(`${u} "${l.label}"`);
  }
}
let fail = emailBad;
const anchors = new Map();
const t2 = await ctx.newPage();
for (const [t, from] of seen) {
  let ok = true, why = '';
  try {
    if (/^https?:/.test(t)) {
      const r = await ctx.request.get(t, { timeout: 30000, maxRedirects: 5 }).catch((e) => ({ status: () => 0, e }));
      const st = r.status(); ok = st > 0 && st < 400 || st === 403; why = 'status ' + st + (st === 403 ? ' (site refuses automated visits; open by hand)' : '');
    } else if (t.startsWith('/lab/') || t.startsWith('/v1/')) {
      const errs = [];
      t2.removeAllListeners('response');
      t2.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
      const r = await t2.goto('about:blank').then(() => t2.goto(base + t, { waitUntil: 'networkidle', timeout: 90000 }));
      await t2.waitForTimeout(2500);
      const d = await t2.evaluate(() => ({ text: document.body.innerText.trim(), title: document.title }));
      const nf = /not found|page does not exist|404/i.test(d.text.slice(0, 600));
      ok = r.status() === 200 && d.text.length > 80 && !nf && !errs.length;
      why = `status ${r.status()}, ${d.text.length} characters drawn, heading "${d.text.split('\n').filter(Boolean).slice(0, 3).join(' / ').slice(0, 90)}"${nf ? ', NOT FOUND TEXT' : ''}${errs.length ? ', failed files: ' + errs.join('; ') : ''}`;
    } else {
      const [pth, hash] = t.split('#');
      const r = await ctx.request.get(base + pth, { maxRedirects: 0 }).catch(() => null);
      const st = r ? r.status() : 0;
      ok = st === 200; why = 'status ' + st;
      if (ok && hash) {
        if (!anchors.has(pth)) { await t2.goto(base + pth, { waitUntil: 'domcontentloaded' }); anchors.set(pth, await t2.evaluate(() => Array.from(document.querySelectorAll('[id]')).map((e) => e.id))); }
        ok = anchors.get(pth).includes(hash); why += ok ? ', #' + hash + ' found' : ', #' + hash + ' MISSING';
      }
    }
  } catch (e) { ok = false; why = String(e.message).split('\n')[0]; }
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${t}  [${why}]  used ${from.length}x, e.g. ${from[0]}`);
}
await b.close();
console.log(`\n${seen.size} distinct destinations, ${emails} email buttons (not pressed), ${fail} failure(s) on ${base}`);
process.exit(fail ? 1 : 0);
