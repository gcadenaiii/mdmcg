/* A recorded walk through the live site for review: what a visitor sees while scrolling and using it, not only still pages.
   node scripts/live-walk.mjs <outDir>          (SHOTS_BASE overrides https://mdmcg.com)
   Writes, for desktop (1440x900) and phone (390x844), motion on:
     walk_<d|m>_home_NNNNN.png   the home page every STEP pixels of scroll, after it settles
     menu_m_open.png, nav hover and dot-click frames, the research tools' opening screens
     walk_log.json / walk_log.txt  per frame: active scene, whether the live 3D canvas is showing, the heartbeat lines' opacity,
                                   the proof bars' widths; plus console errors, every internal link's status, load timings */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const out = process.argv[2];
const base = process.env.SHOTS_BASE || 'https://mdmcg.com';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const log = { base, when: new Date().toISOString(), views: {}, errors: [], links: [], tools: [] };

const probe = () => {
  const on = document.querySelector('.stage .fig.on');
  const dot = document.querySelector('.stage-dots a.on');
  const canvas = document.querySelector('.stage canvas');
  const cs = canvas ? getComputedStyle(canvas) : null;
  const beat = document.querySelector('.herobeat');
  const bars = Array.from(document.querySelectorAll('.stage .proof-f')).map((b) => Math.round(b.getBoundingClientRect().width));
  return {
    y: Math.round(window.scrollY),
    scene: dot ? dot.getAttribute('aria-label') : null,
    figure_kind: on ? on.dataset.kind : null,
    canvas_present: !!canvas,
    canvas_opacity: cs ? Number(cs.opacity) : null,
    canvas_visible: cs ? cs.visibility : null,
    heartbeat_lines_opacity: beat ? Number(getComputedStyle(beat).opacity) : null,
    proof_bar_widths_px: bars,
    bar_scrolled: !!document.querySelector('.bar.scrolled, header.scrolled'),
  };
};

for (const [vw, vh, dev, step] of [[1440, 900, 'd', 300], [390, 844, 'm', 280]]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, reducedMotion: 'no-preference', hasTouch: dev === 'm', isMobile: dev === 'm' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => log.errors.push(`${dev} ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') log.errors.push(`${dev} console: ${m.text()}`); });
  const t0 = Date.now();
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const view = { load_ms: Date.now() - t0, frames: [] };
  await p.waitForTimeout(3200);
  view.page_height = await p.evaluate(() => document.documentElement.scrollHeight);
  view.live_3d_started = await p.evaluate(() => !!window.__stage);
  for (let y = 0; y < view.page_height - vh + step; y += step) {
    await p.mouse.wheel(0, y === 0 ? 0 : step);
    await p.waitForTimeout(900);
    const f = await p.evaluate(probe);
    const name = `walk_${dev}_home_${String(f.y).padStart(5, '0')}.png`;
    await p.screenshot({ path: path.join(out, name) });
    view.frames.push({ file: name, ...f });
    if (f.y + vh >= view.page_height - 2) break;
  }
  // mid-transition frames: the hand-over between the picture and the live model, caught while moving
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await p.waitForTimeout(800);
  for (let k = 0; k < 8; k++) {
    await p.mouse.wheel(0, 240);
    await p.waitForTimeout(160);
    const f = await p.evaluate(probe);
    const name = `moving_${dev}_${String(k).padStart(2, '0')}_y${String(f.y).padStart(5, '0')}.png`;
    await p.screenshot({ path: path.join(out, name) });
    (view.moving ||= []).push({ file: name, ...f });
  }
  // the dots: click the fourth one
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await p.waitForTimeout(500);
  const dots = await p.$$('.stage-dots a');
  if (dots[3]) {
    await dots[3].click({ force: true }).catch(() => {});
    await p.waitForTimeout(1600);
    view.dot_click = await p.evaluate(probe);
    await p.screenshot({ path: path.join(out, `dotclick_${dev}.png`) });
  }
  if (dev === 'm') {
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const btn = await p.$('.menu-btn');
    if (btn) { await btn.click(); await p.waitForTimeout(600); await p.screenshot({ path: path.join(out, 'menu_m_open.png') }); view.menu_items = await p.$$eval('.nav a', (a) => a.map((x) => x.innerText.trim())); }
  } else {
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await p.hover('.nav a').catch(() => {});
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, 'nav_d_hover.png'), clip: { x: 0, y: 0, width: 1440, height: 120 } });
    // every internal link on every page, and where it goes
    const pages = ['/', '/device/', '/science/', '/reading/', '/heart-twin/', '/evidence/', '/team/', '/contact/'];
    const seen = new Map();
    for (const u of pages) {
      await p.goto(base + u, { waitUntil: 'domcontentloaded' });
      const hrefs = await p.$$eval('a[href]', (a) => a.map((x) => [x.getAttribute('href'), x.innerText.trim().replace(/\s+/g, ' ').slice(0, 60)]));
      for (const [h, t] of hrefs) if (h && h.startsWith('/') && !seen.has(h.split('#')[0])) seen.set(h.split('#')[0], { from: u, text: t });
    }
    for (const [h, v] of seen) {
      const r = await ctx.request.get(base + h).catch(() => null);
      log.links.push({ href: h, status: r ? r.status() : 'failed', first_seen_on: v.from, link_text: v.text });
    }
    // the research tools' opening screens
    for (const [name, u] of [['tools_home', '/lab/'], ['tools_heart_twin', '/lab/#/watch'], ['tools_electrodes', '/lab/#/electrodes']]) {
      const t1 = Date.now();
      await p.goto(base + u, { waitUntil: 'networkidle' }).catch(() => {});
      await p.waitForTimeout(3500);
      await p.screenshot({ path: path.join(out, `${name}_d.png`) });
      log.tools.push({ name, url: u, load_ms: Date.now() - t1, title: await p.title(), headings: await p.$$eval('h1, h2', (h) => h.slice(0, 8).map((x) => x.innerText.trim().slice(0, 80))) });
    }
  }
  log.views[dev === 'd' ? 'desktop_1440x900' : 'phone_390x844'] = view;
  await ctx.close();
}
await browser.close();
await writeFile(path.join(out, 'walk_log.json'), JSON.stringify(log, null, 1), 'utf8');
const L = [`Walk through ${base}, ${log.when}. Motion on. Edge, headless, GPU on.`];
for (const [k, v] of Object.entries(log.views)) {
  L.push('', `== ${k}: page height ${v.page_height}px, load ${v.load_ms} ms, live 3D started: ${v.live_3d_started}`);
  for (const f of v.frames) L.push(`${f.file}  y=${f.y}  scene="${f.scene}"  shown=${f.figure_kind}  3D canvas opacity=${f.canvas_opacity}  heartbeat lines opacity=${f.heartbeat_lines_opacity}  bars=${JSON.stringify(f.proof_bar_widths_px)}`);
  L.push('  while moving (160 ms after each 240px wheel step):');
  for (const f of v.moving || []) L.push(`  ${f.file}  y=${f.y}  scene="${f.scene}"  shown=${f.figure_kind}  3D canvas opacity=${f.canvas_opacity}  heartbeat lines opacity=${f.heartbeat_lines_opacity}`);
  if (v.dot_click) L.push(`  after clicking the 4th dot: y=${v.dot_click.y} scene="${v.dot_click.scene}"`);
  if (v.menu_items) L.push(`  phone menu items: ${v.menu_items.join(' | ')}`);
}
L.push('', '== internal links (desktop)');
for (const l of log.links) L.push(`${l.status}  ${l.href}  ("${l.link_text}", first seen on ${l.first_seen_on})`);
L.push('', '== research tools');
for (const t of log.tools) L.push(`${t.name}: ${t.url} loaded in ${t.load_ms} ms; title "${t.title}"; headings ${JSON.stringify(t.headings)}`);
L.push('', `== page errors and console errors: ${log.errors.length}`, ...log.errors.slice(0, 40));
await writeFile(path.join(out, 'walk_log.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.slice(0, 6).join('\n'), '\nerrors:', log.errors.length, 'links:', log.links.length);
