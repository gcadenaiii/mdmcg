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
if (btn && nav) {
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); btn.focus(); }
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
    li.appendChild(a); dots.appendChild(li);
    return f;
  });
  stage.hidden = false;
  if (window.innerWidth <= 900) spine.insertBefore(stage, scenes[0]); // phone: the picture comes before the headline on the opening screen
  spine.classList.add('live');
  spine.style.setProperty('--n', scenes.length);
  return { stage, scenes, figs, links: Array.from(dots.querySelectorAll('a')), current: -1 };
}).filter(Boolean);

function show(s, i) {
  if (i === s.current) return;
  s.current = i;
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

// 6. the heartbeat lines on the first screen fade out as soon as the page moves, so they never cross the next scene's words.
const beat = document.querySelector('.herobeat');
if (beat) {
  const fade = () => { beat.style.opacity = String(Math.max(0, 1 - window.scrollY / 110)); };
  window.addEventListener('scroll', fade, { passive: true });
  fade();
}
