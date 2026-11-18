/* Review pictures of the development site, with motion on (the live stage runs where it can).
   node scripts/shots-rev.mjs <outDir> <tag> <page[:y,y,...]> ...   e.g.  home:0,450,900  sensors:0
   Each y is a scroll position in pixels; "full" takes the whole page with reduced motion. Desktop 1440x900 and phone 390x844. */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const [out, tag, ...jobs] = process.argv.slice(2);
const base = process.env.SHOTS_BASE || 'http://127.0.0.1:5174';
const PATHS = { home: '/', device: '/device/', science: '/science/', reading: '/reading/', 'heart-twin': '/heart-twin/', sensors: '/sensors/', evidence: '/evidence/', team: '/team/', 'work-with-us': '/work-with-us/' };
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errs = [];
for (const [vw, vh, dev] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  for (const job of jobs) {
    const [name, ys = '0'] = job.split(':');
    const full = ys === 'full';
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: full ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`${dev} ${name} ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`${dev} ${name} ${m.text()}`); });
    await p.goto(base + PATHS[name], { waitUntil: 'networkidle' });
    await p.evaluate(async () => {
      document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
      await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => 0)));
    });
    await p.waitForTimeout(2600);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ov > 0) errs.push(`${dev} ${name} overflow ${ov}`);
    if (full) {
      await p.screenshot({ path: path.join(out, `${tag}_${dev}_${name}_full.png`), fullPage: true });
    } else {
      for (const y of ys.split(',').map(Number)) {
        await p.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
        await p.waitForTimeout(1500);
        await p.screenshot({ path: path.join(out, `${tag}_${dev}_${name}_${String(y).padStart(5, '0')}.png`) });
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'no errors');
