async (page) => {
  const OUT = 'C:/Users/George Cadena/Documents/mdmcg-research/reports/website_redesign_2026-11-16/site_shots/';
  const all = [['home','/'],['device','/device/'],['science','/science/'],['reading','/reading/'],['heart-twin','/heart-twin/'],['sensors','/sensors/'],['evidence','/evidence/'],['team','/team/'],['work-with-us','/work-with-us/'],['404','/nope/']];
  const only = globalThis.__only;
  const pages = only ? all.filter((p) => only.includes(p[0])) : all;
  const browser = page.context().browser();
  const errs = [];
  for (const [vw, vh, tag] of [[1440, 900, '1440'], [390, 844, '390']]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    p.on('console', (m) => { if (m.type() === 'error' && !/nope/.test(p.url())) errs.push(tag + ' ' + p.url() + ' ' + m.text()); });
    p.on('pageerror', (e) => errs.push(tag + ' ' + p.url() + ' ' + e.message));
    for (const [name, path] of pages) {
      await p.goto('http://127.0.0.1:5174' + path, { waitUntil: 'networkidle' });
      await p.evaluate(async () => {
        document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
        await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => 0)));
      });
      await p.waitForTimeout(300);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const broken = await p.evaluate(() => Array.from(document.images).filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.src));
      if (ov > 0) errs.push(tag + ' ' + name + ' overflow ' + ov);
      if (broken.length) errs.push(tag + ' ' + name + ' broken ' + broken.join(','));
      await p.screenshot({ path: OUT + 'full_' + name + '_' + tag + '.png', fullPage: true });
    }
    await ctx.close();
  }
  return JSON.stringify(errs);
}
