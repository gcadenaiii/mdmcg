async (page) => {
  // Viewport screenshots with motion on: the sticky stages at a few scroll positions, and the phone menu.
  const OUT = 'C:/Users/George Cadena/Documents/mdmcg-research/reports/website_redesign_2026-11-16/site_shots/';
  const plan = [
    ['home', '/', ['#device', '#inside', '#worn', '#options', '#heart-twin', '#sensors', '#stands']],
    ['heart-twin', '/heart-twin/', ['#step-1', '#step-3', '#step-5', '#step-8']],
    ['sensors', '/sensors/', ['#step-1', '#step-3', '#step-6', '#step-8']],
  ];
  const browser = page.context().browser();
  const errs = [];
  for (const [vw, vh, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
    const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error') errs.push(tag + ' ' + p.url() + ' ' + m.text()); });
    p.on('pageerror', (e) => errs.push(tag + ' ' + p.url() + ' ' + e.message));
    for (const [name, path, stops] of plan) {
      await p.goto('http://127.0.0.1:5174' + path, { waitUntil: 'networkidle' });
      let k = 0;
      for (const sel of stops) {
        await p.evaluate((sel) => {
          const el = document.querySelector(sel); const r = el.getBoundingClientRect();
          const mid = r.top + window.scrollY + Math.min(r.height, window.innerHeight) / 2 - window.innerHeight / 2;
          window.scrollTo({ top: sel === '#device' ? 0 : Math.max(0, mid), behavior: 'instant' });
        }, sel);
        await p.waitForTimeout(1500);
        await p.screenshot({ path: OUT + 'live_' + name + '_' + tag + '_' + (++k) + '.png' });
      }
    }
    if (tag === '390') {
      await p.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' });
      await p.click('.menu-btn'); await p.waitForTimeout(400);
      await p.screenshot({ path: OUT + 'live_menu_390.png' });
    }
    await ctx.close();
  }
  return JSON.stringify(errs);
}
