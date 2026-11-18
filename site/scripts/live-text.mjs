/* Saves the visible text of each live page (and its links and image descriptions) for review. node scripts/live-text.mjs <outDir> */
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const out = process.argv[2];
const base = process.env.SHOTS_BASE || 'https://mdmcg.com';
const pages = ['/', '/device/', '/science/', '/reading/', '/heart-twin/', '/sensors/', '/evidence/', '/team/', '/work-with-us/'];
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const u of pages) {
  const r = await p.goto(base + u, { waitUntil: 'networkidle' });
  const d = await p.evaluate(() => ({
    title: document.title, desc: document.querySelector('meta[name=description]')?.content || '',
    text: document.body.innerText,
    links: Array.from(document.querySelectorAll('main a, header a, footer a')).map((a) => `${a.innerText.trim().replace(/\s+/g, ' ')} -> ${a.getAttribute('href')}`),
    alts: Array.from(document.querySelectorAll('img[alt], svg[aria-label]')).map((i) => i.getAttribute('alt') || i.getAttribute('aria-label')).filter(Boolean),
  }));
  const name = u === '/' ? 'home' : u.replace(/\//g, '');
  await writeFile(path.join(out, `text_${name}.txt`), `URL: ${base + u}\nHTTP: ${r.status()}\nTITLE: ${d.title}\nDESCRIPTION: ${d.desc}\n\n=== VISIBLE TEXT (desktop, in page order) ===\n${d.text}\n\n=== LINKS ===\n${d.links.join('\n')}\n\n=== PICTURE AND DIAGRAM DESCRIPTIONS ===\n${d.alts.join('\n')}\n`, 'utf8');
  console.log(u, r.status(), d.text.length);
}
await b.close();
