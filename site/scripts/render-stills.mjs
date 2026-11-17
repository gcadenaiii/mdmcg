/* Renders the device stills from the site's own 3D model (src/three), in a headless browser (the installed Edge).
   Needs the dev server:  pnpm dev --port 5174   then:  node scripts/render-stills.mjs [name ...] [--out DIR] [--install]
   Without --install the pictures are only written to the output folder (default: ./.stills) as PNG.
   With --install the ones that have a master replace it in src/assets/img (WebP).
   The hero has no master here: the home page keeps its own picture (device-hero), which is the look the studio is tuned to. */
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const install = args.includes('--install'); if (install) args.splice(args.indexOf('--install'), 1);
const out = path.resolve(flag('--out') ?? '.stills');
const base = flag('--base') ?? 'http://127.0.0.1:5174';
// name, function in src/three/stills.js, its arguments, master in src/assets/img, width in pixels, keep the whole frame (no cut to the picture's edge)
const JOBS = [
  ['hero', 'hero', [], null, 2400],
  ['open', 'open', [], 'device-open', 1500],
  ['wing', 'wing', [], 'device-wing', 2000, true],
  ['detail', 'detail', [], 'device-detail', 2000],
  ['wide', 'wide', [], 'device-wide', 2800, true],
  ['option-1', 'option', [0], 'option-1', 1600], ['option-2', 'option', [1], 'option-2', 1600],
  ['option-3', 'option', [2], 'option-3', 1600], ['option-4', 'option', [3], 'option-4', 1600],
  ['row', 'row', [], 'options-row', 3000],
  ['family', 'family', [], null, 1800],
];
const want = args.length ? JOBS.filter((j) => args.includes(j[0])) : JOBS;
const SS = 2; // drawn at twice the size, then reduced, for clean edges

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/', { waitUntil: 'load' });
console.log('renderer:', await page.evaluate(() => {
  const g = document.createElement('canvas').getContext('webgl2');
  const e = g && g.getExtension('WEBGL_debug_renderer_info');
  return g ? (e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'webgl2') : 'none';
}));
for (const [name, fn, a, asset, width, whole] of want) {
  const r = await page.evaluate(async ([fn, a, SS]) => {
    const m = await import('/src/three/stills.js');
    return m.STILLS[fn](SS, ...a);
  }, [fn, a, SS]);
  const png = await sharp(Buffer.from(r.png.split(',')[1], 'base64')).resize({ width }).png().toBuffer();
  await writeFile(path.join(out, name + '.png'), png);
  const meta = await sharp(png).metadata();
  console.log(name, meta.width + 'x' + meta.height, Math.round(png.length / 1024) + ' kB');
  if (r.lines) {
    const sc = (p) => p.map((v) => Math.round((v / SS) * 10) / 10);
    const data = { width: meta.width, height: meta.height, lines: r.lines.map((l) => ({ text: l.text, off: l.off, a: sc(l.a), b: sc(l.b), ta: l.ta.map(sc), tb: l.tb.map(sc) })) };
    await writeFile(path.join(out, name + '-lines.json'), JSON.stringify(data, null, 1) + '\n');
  }
  /* the masters are cut to the picture's own edge, with a small margin, so they fill their boxes on the pages */
  if (install && asset && whole) await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(path.resolve('src/assets/img', asset + '.webp'));
  else if (install && asset) {
    const cut = await sharp(png).trim({ threshold: 4 }).toBuffer({ resolveWithObject: true });
    const m = Math.round(cut.info.width * 0.03);
    await sharp(cut.data).extend({ top: m, bottom: m, left: m, right: m, background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(path.resolve('src/assets/img', asset + '.webp'));
  }
}
await browser.close();
if (errors.length) { console.error('errors:\n' + errors.join('\n')); process.exit(1); }
