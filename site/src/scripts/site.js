/* mdmcg site script. Plain script, no library.
   1. bar and phone menu  2. email buttons  3. scroll reveals  4. sticky stages (stills changed by scroll)
   5. the live 3D device on the home page's stage, loaded afterwards and only where it can run well.
   With reduced motion, or without this script, everything is simply shown in place. */
const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. bar shadow once the page has moved; phone menu
const bar = document.querySelector('.bar');
const btn = document.querySelector('.menu-btn');
const nav = document.getElementById('nav');
function closeMenu() { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
/* the small menus inside the bar (Research): a button opens each one. Hover opens it too; Escape, a click elsewhere or
   focus moving away closes it. In the phone menu the button is not shown and the links are simply listed under a label. */
const groups = Array.from(document.querySelectorAll('.nav-group')).map((el) => ({ el, b: el.querySelector('.nav-sub-btn'), by: '' }));
function setGroup(g, open, by) {
  g.by = open ? by : '';
  g.el.classList.toggle('open', open);
  g.b.setAttribute('aria-expanded', String(open));
}
function closeGroups(except) { groups.forEach((g) => { if (g !== except) setGroup(g, false); }); }
groups.forEach((g) => {
  g.b.addEventListener('click', () => {
    const open = g.el.classList.contains('open');
    closeGroups(g);
    if (open && g.by === 'hover') g.by = 'click'; else setGroup(g, !open, 'click');   // a click on a menu the pointer opened keeps it open
  });
  g.el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !g.el.classList.contains('open')) { closeGroups(g); setGroup(g, true, 'hover'); } });
  g.el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && g.by === 'hover') setGroup(g, false); });
  g.el.addEventListener('focusout', (e) => { if (!g.el.contains(e.relatedTarget)) setGroup(g, false); });
});
document.addEventListener('click', (e) => { if (!e.target.closest('.nav-group') || e.target.closest('.nav-sub a')) closeGroups(); });
if (btn && nav) {
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const g = groups.find((x) => x.el.classList.contains('open'));
    if (g) { const inside = g.el.contains(document.activeElement); setGroup(g, false); if (inside) g.b.focus(); return; }
    if (nav.classList.contains('open')) { closeMenu(); btn.focus(); }
  });
}

// 2. email buttons: the address is stored scrambled; the mailto link exists only at the moment of the click
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-m]');
  if (!a) return;
  e.preventDefault();
  const to = a.dataset.m.split('.').map((c) => String.fromCharCode(parseInt(c, 36) - 7)).reverse().join('');
  const subject = a.dataset.s ? '?subject=' + encodeURIComponent(a.dataset.s) : '';
  window.location.href = 'mai' + 'lto:' + to + subject;
});

// 3. scroll reveals, staggered inside a row
if (!reduce && 'IntersectionObserver' in window) {
  const items = Array.from(document.querySelectorAll('[data-r]'));
  items.forEach((el) => {
    const sibs = Array.from(el.parentNode.children).filter((c) => c.hasAttribute('data-r'));
    el.style.setProperty('--d', (sibs.indexOf(el) * 90) + 'ms');
  });
  root.classList.add('reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
  // nothing may stay hidden if the observer never fires (print, capture)
  window.addEventListener('beforeprint', () => items.forEach((el) => el.classList.add('in')));
}

// 4. sticky stages: one per .spine. Each scene's figure moves onto the stage; scroll picks the one shown.
const spines = Array.from(document.querySelectorAll('.spine')).map((spine) => {
  const stage = spine.querySelector('.stage');
  const scenes = Array.from(spine.querySelectorAll('.scene'));
  if (!stage || !scenes.length || reduce) return null;
  /* on a phone: no pinned picture, on any page. Each scene's picture stays with its own words and scrolls with them. */
  if (window.innerWidth <= 900) return null;
  const layers = stage.querySelector('.stage-layers');
  const dots = stage.querySelector('.stage-dots');
  const figs = scenes.map((sc, i) => {
    const f = sc.querySelector('.fig');
    layers.appendChild(f);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + sc.id;
    a.setAttribute('aria-label', 'Scene ' + (i + 1) + ' of ' + scenes.length + ': ' + sc.dataset.scene);
    a.dataset.label = sc.dataset.scene;
    a.addEventListener('click', (e) => { e.preventDefault(); goScene(spine, sc); history.replaceState(null, '', '#' + sc.id); });
    li.appendChild(a); dots.appendChild(li);
    return f;
  });
  /* the opening picture is already on the screen before this script runs: keep it there. It takes the stage at once, with no
     fade, and the scene dots start hidden (they belong to the later scenes). */
  figs[0].classList.add('on', 'now');
  stage.dataset.scene = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => figs[0].classList.remove('now')));
  stage.hidden = false;
  if (window.innerWidth <= 900) spine.insertBefore(stage, scenes[0]); // phone: the picture comes before the headline on the opening screen
  spine.classList.add('live');
  spine.style.setProperty('--n', scenes.length);
  return { stage, scenes, figs, links: Array.from(dots.querySelectorAll('a')), current: -1 };
}).filter(Boolean);

/* Bring a scene's text into view. Wide: its top a little below the bar. Phone: just under the picture pinned at the top,
   so the headline is not hidden behind it. */
function goScene(spine, sc) {
  const stage = spine.querySelector('.stage');
  const phone = window.innerWidth <= 900;
  const first = sc === spine.querySelector('.scene');
  const under = phone && !first ? stage.getBoundingClientRect().height + (bar ? bar.offsetHeight : 0) - 12 : (bar ? bar.offsetHeight : 0) + 8;
  const y = first ? 0 : sc.getBoundingClientRect().top + window.scrollY - under;
  window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
}

function show(s, i) {
  if (i === s.current) return;
  s.current = i;
  s.stage.dataset.scene = String(i);   // the scene dots are not shown on the opening scene (site.css)
  s.figs.forEach((f, k) => f.classList.toggle('on', k === i));
  s.links.forEach((a, k) => {
    a.classList.toggle('on', k === i);
    if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
}

function tick() {
  if (bar) bar.classList.toggle('scrolled', window.scrollY > 8);
  spines.forEach((s) => {
    /* wide: a scene takes the stage when its text is a little above the middle of the window.
       phone: the stage sticks above the text. The first picture holds until the next scene's text has slid under the
       stage; later scenes take over once their text has arrived in the space below it. */
    const phone = window.innerWidth <= 900;
    const b = phone ? s.stage.getBoundingClientRect().bottom : 0;
    let i = 0;
    for (let k = 1; k < s.scenes.length; k++) {
      const ref = !phone ? window.innerHeight * 0.55 : k === 1 ? b - 8 : b + (window.innerHeight - b) * 0.25;
      if (s.scenes[k].getBoundingClientRect().top <= ref) i = k;
    }
    show(s, i);
  });
}

let queued = false;
function onScroll() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; tick(); }); }
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
tick();
// a link straight to a scene (for example /#record): land the same way a dot does
if (location.hash.length > 1) {
  const sc = document.getElementById(location.hash.slice(1));
  const sp = sc && sc.classList.contains('scene') && spines.find((s) => s.scenes.includes(sc));
  if (sp) window.addEventListener('load', () => setTimeout(() => goScene(sp.stage.closest('.spine'), sc), 60));
}

// 5. the live 3D device. The stills stay as they are unless all of this holds: motion allowed, a wide screen,
// no data saving, a machine with some memory and cores, and WebGL 2 on real graphics hardware.
const home = document.getElementById('spine');
function canRun3d() {
  if (!home || reduce || !spines.length || window.innerWidth <= 900) return false;
  const n = navigator;
  if ((n.connection && n.connection.saveData) || (n.deviceMemory && n.deviceMemory < 4) || (n.hardwareConcurrency && n.hardwareConcurrency < 4)) return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch { return false; }
}
if (canRun3d()) {
  const start = () => import('../three/stage.js').then((m) => { window.__stage = m.mount(home); }).catch(() => {});
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
  if (document.readyState === 'complete') idle(start); else window.addEventListener('load', () => idle(start));
}
