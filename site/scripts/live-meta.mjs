/* What each live page says about itself and where each of its buttons and links leads, for review.
   node scripts/live-meta.mjs <outDir>      (SHOTS_BASE overrides https://mdmcg.com)
   Writes meta_and_actions.txt: per page the title, description, robots, canonical, headings in order, and every button or link in
   the main content with its label and destination; then the contact path: what the "Email us" button does when pressed (the
   press is intercepted so that no mail program opens and nothing is sent; the address itself is never written to the file). */
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const out = process.argv[2];
const base = process.env.SHOTS_BASE || 'https://mdmcg.com';
const pages = ['/', '/device/', '/reading/', '/science/', '/heart-twin/', '/evidence/', '/team/', '/contact/'];
const b = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const L = [`Meta and actions of ${base}, ${new Date().toISOString()}`];
for (const f of ['/robots.txt', '/sitemap.xml', '/sitemap-index.xml']) {
  const r = await ctx.request.get(base + f).catch(() => null);
  L.push('', `== ${f}: ${r ? r.status() : 'failed'}`, r && r.ok() ? (await r.text()).slice(0, 300) : '');
}
for (const u of pages) {
  await p.goto(base + u, { waitUntil: 'networkidle' });
  const d = await p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const act = Array.from(document.querySelectorAll('main a, main button, section a, section button')).filter((a, i, all) => all.indexOf(a) === i)
      .map((a) => `${a.classList.contains('btn') ? 'BUTTON' : 'link  '}  "${a.innerText.trim().replace(/\s+/g, ' ')}" -> ${a.getAttribute('href') || '(no address)'}${a.hasAttribute('data-m') ? '  [email button]' : ''}${a.target === '_blank' ? '  [new tab]' : ''}`);
    return {
      title: document.title, desc: q('meta[name=description]')?.content, robots: q('meta[name=robots]')?.content, canonical: q('link[rel=canonical]')?.href,
      og: q('meta[property="og:title"]')?.content, lang: document.documentElement.lang,
      heads: Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => `${h.tagName} ${h.innerText.trim().replace(/\s+/g, ' ')}`),
      act, forms: document.querySelectorAll('form, input, textarea, select').length, words: document.body.innerText.split(/\s+/).length,
    };
  });
  L.push('', `==================== ${u}`, `title: ${d.title}`, `description: ${d.desc}`, `robots meta: ${d.robots}`, `canonical: ${d.canonical}`, `og:title: ${d.og}`, `lang: ${d.lang}`,
    `words on page: ${d.words}; form fields on page: ${d.forms}`, '-- headings in order', ...d.heads, '-- buttons and links in the content, in order', ...d.act);
}
// the contact path, pressed but intercepted
await p.goto(base + '/contact/', { waitUntil: 'networkidle' });
const res = await p.evaluate(async () => {
  const a = document.querySelector('a[data-m]');
  if (!a) return { found: false };
  const before = a.getAttribute('href');
  let assigned = null;
  document.addEventListener('click', (e) => { e.preventDefault(); }, true);
  a.click();
  await new Promise((r) => setTimeout(r, 400));
  const after = a.getAttribute('href') || '';
  const mask = (h) => h.replace(/mailto:[^?]+/, 'mailto:[address hidden in this log]');
  return { found: true, label: a.innerText.trim(), href_before_press: before, href_after_press: mask(after), is_mailto_after: after.startsWith('mailto:'), assigned };
});
L.push('', '==================== contact path (press intercepted; nothing opened, nothing sent)', JSON.stringify(res, null, 1),
  'Note: whether a mail program opens, and what the visitor sees if they have none, cannot be verified without a real press on a real machine.');
await b.close();
await writeFile(path.join(out, 'meta_and_actions.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.slice(0, 12).join('\n'), '\n...', res);
