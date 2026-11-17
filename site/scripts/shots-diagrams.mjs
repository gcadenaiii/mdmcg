import { chromium } from 'playwright-core';
const OUT = 'C:/Users/George Cadena/Documents/mdmcg-research/reports/website_prompt0_visual_2026-11-17/after/diagrams/';
const plan = [
  ['home-field', '/', '#why'], ['home-zone', '/', '#worn'], ['home-strength', '/', '.art-ask'],
  ['device-body', '/device/', '#h-worn'], ['evidence-body', '/evidence/', '#method'],
  ['science-hero-strength', '/science/', '.phero-art'], ['science-field', '/science/', '#h-field'],
  ['sensors-zone', '/sensors/', '#step-4'], ['sensors-strength', '/sensors/', '.frame-night'],
  ['twin-anatomy', '/heart-twin/', '#step-2'], ['twin-strength', '/heart-twin/', '#step-6'], ['twin-field', '/heart-twin/', '#step-7'],
  ['reading-landmark', '/reading/', '#h-place'],
];
const only = process.argv[2];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = [];
for (const [vw, vh, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => report.push({ error: e.message, url: p.url() }));
  let last = '';
  for (const [name, path, sel] of plan) {
    if (only && !name.includes(only)) continue;
    if (path !== last) { await p.goto('http://127.0.0.1:5174' + path, { waitUntil: 'networkidle' }); last = path; await p.waitForTimeout(600); }
    await p.evaluate((sel) => {
      const el = document.querySelector(sel); const r = el.getBoundingClientRect();
      const stage = el.closest('.spine');
      let top;
      if (stage) top = r.top + window.scrollY + Math.min(r.height, window.innerHeight) / 2 - window.innerHeight / 2;
      else { const d = (el.closest('section') || el).querySelector('.dgm') || el; const q = d.getBoundingClientRect(); top = q.top + window.scrollY + q.height / 2 - window.innerHeight / 2; }
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }, sel);
    await p.waitForTimeout(2800);
    await p.screenshot({ path: OUT + name + '_' + tag + '.png' });
    const info = await p.evaluate(() => {
      const out = [];
      for (const d of document.querySelectorAll('.dgm')) {
        const r = d.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || r.width === 0) continue;
        const st = getComputedStyle(d.closest('.fig') || d); if (st.visibility === 'hidden') continue;
        const texts = [...d.querySelectorAll('text')].map((t) => { const b = t.getBoundingClientRect(); return { s: t.textContent, px: getComputedStyle(t).fontSize, font: getComputedStyle(t).fontFamily.slice(0, 12), clipped: b.left < r.left - 0.5 || b.right > r.right + 0.5 || b.top < r.top - 0.5 || b.bottom > r.bottom + 0.5, w: Math.round(b.width) }; });
        out.push({ kind: d.dataset.variant || d.dataset.kind, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top), texts });
      }
      return out;
    });
    report.push({ name, tag, info });
  }
  await ctx.close();
}
await browser.close();
for (const r of report) console.log(JSON.stringify(r));
