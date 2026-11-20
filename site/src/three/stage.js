/* The home page's live stage: one device, moved by the scroll. Loaded after first paint, only where it can run well.
   Each scene has a camera position and a state of the parts; scrolling blends between neighbours.
   Nothing is drawn unless something changed. The stills stay in the page underneath and return if this is removed. */
import { Studio, SPECS } from './studio.js';
import { VIEWS, FAMILY, FRAME_ONE, FRAME_FAMILY, LEAD, sizeLines } from './shots.js';

/* The first two scenes keep their own pictures. The live model first appears at the third scene ("It opens").
   A picture and the model are never seen together: the one on the stage fades to nothing, then the other fades in. */

const TAU = Math.PI * 2;
/* one row per scene on the page, in the page's order (src/pages/index.astro): whole device, two signals, it opens
   (six sensors and the two wings, one scene), on a chest, a reading. gl: 0 leaves the scene's still picture on the stage.
   The model is seen in one scene: it opens on the way in, and closes and turns to its wing on the way out.
   enter: where the camera comes from on the way into a scene, when that is not the scene before. It is used only
   after a scene with gl: 0, so the change of place happens while the canvas is not seen. */
const SCENES = [
  { ...VIEWS.hero, explode: 0, family: 0, gl: 0, lines: 0 },
  { ...VIEWS.hero, az: VIEWS.hero.az + 1.1, dist: VIEWS.hero.dist * 1.25, explode: 0, family: 0, gl: 0, lines: 0 },
  { ...VIEWS.open, explode: 1, family: 0, gl: 1, lines: 0 },
  { ...VIEWS.wing, az: VIEWS.wing.az + TAU + 0.25, dist: VIEWS.wing.dist * 1.5, explode: 0, family: 0, gl: 0, lines: 0 },
  { ...VIEWS.wing, az: VIEWS.wing.az + TAU + 0.5, dist: VIEWS.wing.dist * 1.5, explode: 0, family: 0, gl: 0, lines: 0 },
];
/* the scene that shows the four options, and the scroll position past which the four are laid on the ground:
   inside the scene before it, whose picture covers the stage (gl: 0) */
const FAMILY_AT = SCENES.findIndex((s) => s.family === 1);
const FAMILY_FROM = FAMILY_AT < 0 ? Infinity : FAMILY_AT - 1;   // no four-options scene on the page: the ground never changes
const KEYS = ['tx', 'ty', 'tz', 'az', 'el', 'dist', 'fit', 'explode', 'family', 'gl', 'lines'];
const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const NS = 'http://www.w3.org/2000/svg';

export function mount(spine) {
  const stage = spine.querySelector('.stage');
  const scenes = Array.from(spine.querySelectorAll('.scene'));
  if (!stage || scenes.length !== SCENES.length) return null;
  const heroFig = null;
  /* the pictures of the scenes the model does not draw: each gives way as the model comes in over it */
  const stills = Array.from(stage.querySelectorAll('.stage-layers > .fig:not([data-gl])'));

  const wrap = document.createElement('div');
  wrap.className = 'stage-gl';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The device in three dimensions. It turns, opens and closes as the page scrolls.');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'dims stage-lines');
  svg.setAttribute('aria-hidden', 'true');
  const marks = document.createElement('div');
  marks.className = 'stage-marks';
  marks.setAttribute('aria-hidden', 'true');
  wrap.append(canvas, svg, marks);
  stage.insertBefore(wrap, stage.firstChild);

  let S;
  performance.mark('gl-a');
  try { S = new Studio(canvas, { pixelRatio: Math.min(window.devicePixelRatio || 1, 2), deferEnv: true }); } catch { wrap.remove(); return null; }
  performance.mark('gl-b');
  S.arrange([{ i: LEAD, x: 0, z: 0 }], FRAME_ONE);
  performance.mark('gl-c');

  /* the three size lines, drawn over the canvas so the type matches the page */
  const lines = sizeLines(SPECS[LEAD].core).map((d) => {
    const g = document.createElementNS(NS, 'g');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('pathLength', '1');
    path.style.strokeDasharray = '1';
    const text = document.createElementNS(NS, 'text');
    text.textContent = d.text;
    text.setAttribute('text-anchor', d.off[0] > 0 ? 'start' : d.off[0] < 0 ? 'end' : 'middle');
    g.setAttribute('class', 'dim-line');
    g.append(path);
    svg.append(g, text);
    return { d, path, text };
  });
  const badges = FAMILY.map((p) => {
    const b = document.createElement('span');
    b.className = 'ring r' + (p.i + 1);
    b.textContent = String(p.i + 1);
    b.setAttribute('aria-hidden', 'true');
    marks.append(b);
    return b;
  });

  const cur = { ...SCENES[0] };
  const goal = { ...SCENES[0] };
  const drag = { on: false, x: 0, y: 0, az: 0, el: 0, gaz: 0, gel: 0 };
  let appear = 0;          // the canvas fading in for the first time
  let veil = 1;            // dips to nothing while the ground is re-laid for another scene
  let pos = 0;             // where the scroll is, in scenes
  let family = false;      // whether the four are on the ground
  let linesIn = heroFig ? 1 : 0; // the size lines draw in once, after the first settle
  let raf = 0, last = 0, started = 0, frames = 0, owed = 1, dead = false, hold = false;

  function target() {
    const vh = window.innerHeight;
    let p = 0;
    for (let k = 1; k < scenes.length; k++) p += clamp((vh * 0.92 - scenes[k].getBoundingClientRect().top) / (vh * 0.46), 0, 1);
    pos = p;
    const i = Math.min(SCENES.length - 2, Math.floor(p));
    const f = ease(p - i);
    const b = SCENES[i + 1], a = b.enter ? { ...SCENES[i], ...b.enter } : SCENES[i];
    for (const k of KEYS) goal[k] = a[k] + (b[k] - a[k]) * f;
    /* a device that opens does so late in the hand-over, while the model is already seen, so the visitor watches it open */
    if (b.explode > a.explode) goal.explode = a.explode + (b.explode - a.explode) * ease(clamp((p - i - 0.68) / 0.32, 0, 1));
    /* gl runs 0..1 across a hand-over. Below one half only the picture is seen (fading out as gl rises), above one half
       only the model. The page puts the next scene's picture on the stage at 0.8 of the way (src/scripts/site.js), so a
       model that is leaving reaches one half exactly there. */
    if (a.gl !== b.gl) goal.gl = a.gl > b.gl ? 1 - ease(clamp((p - i - 0.6) / 0.4, 0, 1)) : ease(clamp((p - i - 0.3) / 0.7, 0, 1));
    /* on the first scene the picture stays until the visitor scrolls, or turns the device by hand.
       If the second scene keeps its own picture, the model then hands over to it as any other scene would. */
    if (heroFig && i === 0) {
      const turning = hold || drag.on || Math.abs(drag.az) > 0.004 || Math.abs(drag.el) > 0.004;
      const leave = b.gl < 1 ? 1 - ease(clamp((p - 0.25) / 0.45, 0, 1)) : 1;
      goal.gl = Math.max(turning ? 1 : 0, ease(clamp(p / 0.2, 0, 1))) * leave;
    }
  }
  function draw() {
    S.resize(wrap.clientWidth, wrap.clientHeight);
    const A = S.device(LEAD);
    if (A.parts.lid.position.y !== A.lift.lid * cur.explode) { A.explode(cur.explode); S.touch(); }
    S.catcher.material.opacity = 0.2 * (1 - cur.explode);
    const fam = family ? cur.family : 0;
    if (family) {
      FAMILY.forEach((p) => {
        const dev = S.device(p.i);
        const out = (1 - cur.family) * 46;
        const x = p.x + (p.x > 0 ? out : 0), z = p.z + (p.z > 0 ? out : 0);
        if (dev.group.position.x !== x || dev.group.position.z !== z) { dev.group.position.set(x, 0, z); S.touch(); }
      });
    }
    S.fitAspect = cur.fit;
    S.draw({ tx: cur.tx, ty: cur.ty, tz: cur.tz, az: cur.az + drag.az, el: clamp(cur.el + drag.el, 0.12, 1.45), dist: cur.dist });
    const g = cur.gl;
    const shown = Math.round(clamp(g * 2 - 1, 0, 1) * appear * veil * 1000) / 1000;
    wrap.style.opacity = String(shown);
    /* one out, then one in: the picture is gone by the time the model starts to show, and the other way round */
    const still = Math.round((1 - clamp(g * 2, 0, 1)) * 1000) / 1000;
    for (const f of stills) {
      const on = f.classList.contains('on') && g > 0;
      f.style.opacity = on ? String(still) : '';
      f.style.transition = on ? 'none' : '';
    }
    /* size lines */
    const show = cur.lines * linesIn;
    svg.style.opacity = String(Math.round(show * 1000) / 1000);
    if (show > 0.01) {
      svg.setAttribute('viewBox', `0 0 ${S.w} ${S.h}`);
      const f = (v) => v.toFixed(1);
      lines.forEach(({ d, path, text }, n) => {
        const T = d.tick.map((v) => v * 2.2);
        const P = (q, k) => S.project(q[0] + T[0] * k, q[1] + T[1] * k, q[2] + T[2] * k);
        const a = P(d.a, 0), b = P(d.b, 0), a0 = P(d.a, -1), a1 = P(d.a, 1), b0 = P(d.b, -1), b1 = P(d.b, 1);
        path.setAttribute('d', `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}M${f(a0[0])} ${f(a0[1])}L${f(a1[0])} ${f(a1[1])}M${f(b0[0])} ${f(b0[1])}L${f(b1[0])} ${f(b1[1])}`);
        const grow = clamp(linesIn * 3 - n * 0.8, 0, 1);
        path.style.strokeDashoffset = String(1 - grow);
        text.setAttribute('x', f((a[0] + b[0]) / 2 + d.off[0] * 16));
        text.setAttribute('y', f((a[1] + b[1]) / 2 + d.off[1] * 26 + 5));
        text.style.opacity = String(clamp(grow * 2 - 1, 0, 1));
      });
    }
    /* the four numbered rings */
    marks.style.opacity = String(Math.round(fam * cur.gl * veil * 1000) / 1000);
    if (family) {
      FAMILY.forEach((p, n) => {
        const dev = S.device(p.i), c = dev.spec.core;
        const q = S.project(dev.group.position.x - c.w / 2 - 20, c.t, dev.group.position.z - c.l / 2 - 4);
        badges[n].style.transform = `translate(${q[0].toFixed(1)}px, ${q[1].toFixed(1)}px) translate(-50%, -50%)`;
      });
    }
  }
  function frame(now) {
    raf = 0;
    if (dead) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    let moving = false;
    /* the first second is also a test: a machine that cannot keep up keeps the stills */
    if (document.hidden) started = -1;
    if (started !== -1) {
      if (now - started > 1000) { if (frames < 26) { unmount(); return; } started = -1; } else moving = true;
    }
    target();
    const k = 1 - Math.exp(-dt / (started === -1 || heroFig ? 0.13 : 0.34));
    for (const key of KEYS) {
      const d = goal[key] - cur[key];
      if (Math.abs(d) > (key === 'dist' ? 0.05 : 0.0006)) { cur[key] += d * k; moving = true; } else cur[key] = goal[key];
    }
    for (const [c, g] of [['az', 'gaz'], ['el', 'gel']]) {
      const d = drag[g] - drag[c];
      if (Math.abs(d) > 0.0006) { drag[c] += d * (1 - Math.exp(-dt / (drag.on ? 0.05 : 0.22))); moving = true; } else drag[c] = drag[g];
    }
    if (appear < 1) { appear = Math.min(1, appear + dt / 0.5); moving = true; }
    /* one device or four: the ground is changed only while the canvas is not seen */
    const want = pos > FAMILY_FROM;
    if (want !== family) {
      if (cur.gl * veil > 0.02) veil = Math.max(0, veil - dt / 0.18);
      else {
        family = want;
        if (family) S.arrange(FAMILY, FRAME_FAMILY); else S.arrange([{ i: LEAD, x: 0, z: 0 }], FRAME_ONE);
      }
      moving = true;
    } else if (veil < 1) { veil = Math.min(1, veil + dt / 0.3); moving = true; }
    if (linesIn < 1 && cur.lines > 0.5 && (linesIn > 0 || !moving)) { linesIn = Math.min(1, linesIn + dt / 1.1); moving = true; }
    /* draw only if something changed (and once more after it stops, to land exactly) */
    if (moving) owed = 2;
    if (owed > 0) { owed--; frames++; draw(); }
    if (moving || owed > 0) kick();
  }
  let ready = false;       // the materials are compiled; until then nothing is drawn
  function kick() { if (ready && !raf && !dead) raf = requestAnimationFrame(frame); }

  /* a pointer may turn the device a little on the first scene; it goes back when let go */
  function down(e) {
    if (pos > 0.3 || e.button > 0) return;
    drag.on = true; drag.x = e.clientX; drag.y = e.clientY;
    wrap.classList.add('dragging');
    try { wrap.setPointerCapture(e.pointerId); } catch { /* nothing to capture */ }
    kick();
  }
  function move(e) {
    if (!drag.on) return;
    drag.gaz = clamp(drag.gaz - (e.clientX - drag.x) * 0.006, -0.9, 0.9);
    drag.gel = clamp(drag.gel + (e.clientY - drag.y) * 0.004, -0.4, 0.4);
    drag.x = e.clientX; drag.y = e.clientY;
    kick();
  }
  function up() { if (!drag.on) return; drag.on = false; drag.gaz = 0; drag.gel = 0; wrap.classList.remove('dragging'); last = 0; kick(); }
  const wake = () => { last = 0; owed = 1; kick(); };
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', wake);
  const ro = new ResizeObserver(wake);
  ro.observe(wrap);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); unmount(); });

  function unmount() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', kick);
    window.removeEventListener('resize', wake);
    ro.disconnect();
    spine.classList.remove('gl', 'gl-rest');
    if (heroFig) heroFig.style.opacity = '';
    for (const f of stills) { f.style.opacity = ''; f.style.transition = ''; }
    wrap.remove();
    S.dispose();
  }

  target();
  Object.assign(cur, goal);
  /* shown from the start: begin a little turned away and further back, then settle once */
  if (!heroFig && pos < 0.5) { cur.az -= 0.42; cur.dist *= 1.07; cur.el += 0.06; } else linesIn = 1;
  /* The first picture needs every material compiled. Done in one go that stops the page for seconds on a first visit, so it is
     handed to the browser's background compile (WebGLRenderer.compileAsync) and the first draw waits for it. The still picture
     of the opening scene stays on the screen meanwhile. */
  const first = () => {
    if (dead) return;
    /* the ground shadow is baked in a task of its own, so the two halves of the first picture do not add up to one long stop */
    performance.mark('gl-d0');
    if (S.dirty) S.bake();
    performance.mark('gl-d1');
    setTimeout(firstPicture, 0);
  };
  const firstPicture = () => {
    if (dead) return;
    ready = true;
    target();
    Object.assign(cur, goal);
    if (!heroFig && pos < 0.5) { cur.az -= 0.42; cur.dist *= 1.07; cur.el += 0.06; } else linesIn = 1;
    performance.mark('gl-d');
    draw();
    performance.mark('gl-e');
    spine.classList.add('gl');
    if (heroFig) spine.classList.add('gl-rest');
    started = performance.now();
    kick();
    /* the other three options are built when the browser is idle, well before the last scene */
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
    if (FAMILY_AT >= 0) [0, 1, 2, 3].filter((i) => i !== LEAD).forEach((i, n) => idle(() => { if (!dead) S.device(i); }, { timeout: 2500 + n * 600 }));
  };
  S.resize(wrap.clientWidth, wrap.clientHeight);
  S.device(LEAD).group.visible = true;
  setTimeout(() => {
    if (dead) return;
    performance.mark('gl-env0');
    S.makeEnv();
    performance.mark('gl-env1');
    setTimeout(compileAll, 0);
  }, 0);
  const compileAll = () => {
    if (dead) return;
    const r = S.renderer;
    if (!r.compileAsync) { first(); return; }
    /* the scene's own materials, then the shadow passes' (the depth pass through the ground camera, the blur and the haze) */
    r.compileAsync(S.scene, S.cam)
      .then(() => { S.scene.overrideMaterial = S.depthMat; return r.compileAsync(S.scene, S.up); })
      .then(() => { S.scene.overrideMaterial = null; return r.compileAsync(S.quad, S.up); })
      .then(() => (S.hazeQuad ? r.compileAsync(S.hazeQuad, S.up) : null))
      /* the haze pass draws the scene into a texture, which needs its own variant of every material */
      .then(() => { if (!S.rtH1) return null; r.setRenderTarget(S.rtH1); const q = r.compileAsync(S.scene, S.cam); r.setRenderTarget(null); return q; })
      .then(first, () => { S.scene.overrideMaterial = null; first(); });
  };
  return { unmount, studio: S, /** how many pictures have been drawn so far */ frames: () => frames, /** keep the model on the first scene (for review pictures) */ hold(v) { hold = v; kick(); } };
}
