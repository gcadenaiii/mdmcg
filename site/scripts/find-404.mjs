/* Lists every request that fails or returns 400+ while each live page loads.  node scripts/find-404.mjs */
import { chromium } from 'playwright-core';
const base = process.env.SHOTS_BASE || 'https://mdmcg.com';
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
let cur = '';
p.on('response', (r) => { if (r.status() >= 400) console.log(cur, r.status(), r.url()); });
p.on('requestfailed', (r) => console.log(cur, 'FAILED', r.url(), r.failure()?.errorText));
for (const u of ['/', '/device/', '/science/', '/reading/', '/heart-twin/', '/evidence/', '/team/', '/contact/', '/lab/']) {
  cur = u; await p.goto(base + u, { waitUntil: 'networkidle' }).catch((e) => console.log(u, 'goto', e.message)); await p.waitForTimeout(1500);
}
await b.close(); console.log('done');
