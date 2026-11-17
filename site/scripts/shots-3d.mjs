/* Review screenshots of the home page's stage, in the installed Edge.
   node scripts/shots-3d.mjs --out DIR [--base URL] [--mode live|nogl|reduce] [--size 1440x900]
   live: real graphics, the 3D stage; nogl: WebGL switched off; reduce: reduced motion.
   --hold keeps the live model on the first scene, where the page normally shows its picture until the visitor scrolls or drags. */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const out = path.resolve(flag('--out', '.shots'));
const base = flag('--base', 'http://127.0.0.1:5174');
const mode = flag('--mode', 'live');
const [W, Hh] = flag('--size', '1440x900').split('x').map(Number);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: mode === 'nogl' ? ['--disable-3d-apis'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: Hh }, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(mode === 'live' ? 4500 : 1200);
if (args.includes('--hold')) { await page.evaluate(() => window.__stage && window.__stage.hold(true)); await page.waitForTimeout(900); }
const info = await page.evaluate(() => ({ gl: document.getElementById('spine').classList.contains('gl'), live: document.getElementById('spine').classList.contains('live'), frames: window.__stage ? window.__stage.frames() : null }));
console.log(mode, W + 'x' + Hh, JSON.stringify(info));
if (mode === 'live' && info.gl && !args.includes('--hold')) {
  /* turning the device by hand on the first scene */
  await page.mouse.move(W * 0.72, Hh * 0.55);
  await page.mouse.down();
  await page.mouse.move(W * 0.72 - 150, Hh * 0.55 + 30, { steps: 12 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, `${mode}_${W}_drag.png`) });
  await page.mouse.up();
  await page.waitForTimeout(1800);
}
const ids = ['device', 'why', 'inside', 'ecg', 'worn', 'options'];
for (let i = 0; i < ids.length; i++) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    const live = document.getElementById('spine').classList.contains('live');
    const r = el.getBoundingClientRect();
    window.scrollTo(0, id === 'device' ? 0 : window.scrollY + r.top - (live ? (window.innerHeight - r.height) / 2 : 80));
  }, ids[i]);
  await page.waitForTimeout(1900);
  await page.screenshot({ path: path.join(out, `${mode}_${W}_${i + 1}_${ids[i]}.png`) });
}
if (mode === 'live' && info.gl) {
  /* at rest nothing may be drawn */
  const a = await page.evaluate(() => window.__stage.frames());
  await page.waitForTimeout(1500);
  const b = await page.evaluate(() => window.__stage.frames());
  console.log('frames drawn in 1.5 s at rest:', b - a);
  /* below the stage nothing may be drawn either, however far the page is scrolled */
  await page.evaluate(() => window.scrollTo(0, document.getElementById('stands').offsetTop + 200));
  await page.waitForTimeout(1200);
  const c = await page.evaluate(() => window.__stage.frames());
  for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(150); }
  const d = await page.evaluate(() => window.__stage.frames());
  console.log('frames drawn while scrolling the rest of the page:', d - c);
  /* half way between two scenes */
  await page.evaluate(() => { const el = document.getElementById('inside'); window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.69); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, `${mode}_${W}_between_2_3.png`) });
}
await browser.close();
if (errors.length) { console.error('errors:\n' + errors.join('\n')); process.exit(1); }
