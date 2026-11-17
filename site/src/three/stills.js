/* The still pictures, drawn from the same model and cameras as the live stage. Called by scripts/render-stills.mjs. */
import { Studio, SPECS } from './studio.js';
import { VIEWS, FAMILY, FRAME_ONE, FRAME_FAMILY, sizeLines } from './shots.js';

/* Cameras used only by the stills (the live stage has its own wing view in shots.js). */
const WING_STILL = { tx: -25, ty: 2, tz: 19, az: -0.85, el: 0.5, dist: 112, fit: 1.43 };
const DETAIL_STILL = { tx: -21, ty: 1, tz: 13, az: -0.95, el: 0.52, dist: 176, fit: 1.33 };
const INSIDE_STILL = { tx: 0, ty: 20, tz: 0, az: 2.2, el: 0.7, dist: 360, fit: 1.33 };
const WIDE_STILL = { ...VIEWS.hero, tx: 50, tz: -14, dist: 350, fit: 1.78 };

let S = null;
function studio() {
  if (!S) S = new Studio(document.createElement('canvas'), { pixelRatio: 1, shadowSize: 2048 });
  return S;
}
function one(i, w, h, view, { explode = 0, frame = FRAME_ONE } = {}) {
  const s = studio();
  s.arrange([{ i, x: 0, z: 0 }], frame);
  s.device(i).explode(explode);
  s.touch();
  s.fitAspect = view.fit;
  s.catcher.material.opacity = 0.2 * (1 - explode);
  s.resize(w, h);
  s.draw(view);
  return s;
}
const lines = (s, core) => sizeLines(core).map((d) => {
  const T = d.tick.map((v) => v * 2.2);
  const P = (p, k) => s.project(p[0] + T[0] * k, p[1] + T[1] * k, p[2] + T[2] * k).map((v) => Math.round(v * 10) / 10);
  return { text: d.text, off: d.off, a: P(d.a, 0), b: P(d.b, 0), ta: [P(d.a, -1), P(d.a, 1)], tb: [P(d.b, -1), P(d.b, 1)] };
});

export const STILLS = {
  hero(k = 1) { const s = one(0, 2400 * k, 1600 * k, VIEWS.hero); return { png: s.png(), lines: lines(s, SPECS[0].core) }; },
  open(k = 1) { const s = one(0, 1500 * k, 1700 * k, VIEWS.open, { explode: 1 }); return { png: s.png() }; },
  wing(k = 1) { const s = one(0, 2000 * k, 1400 * k, WING_STILL); return { png: s.png() }; },
  detail(k = 1) { const s = one(0, 2000 * k, 1500 * k, DETAIL_STILL); return { png: s.png() }; },
  wide(k = 1) { const s = one(0, 2800 * k, 1575 * k, WIDE_STILL, { frame: { cx: 0, cz: 0, w: 260, d: 230 } }); return { png: s.png() }; },
  /** option 1 with its lid (the coil is on the lid's underside) and the flexible sheet lifted clear, so the board and the cell are seen in the shell */
  inside(k = 1, view = INSIDE_STILL, lift = [42, 56]) {
    const s = one(0, 2000 * k, 1500 * k, view, { frame: { cx: 0, cz: 0, w: 260, d: 230 } });
    const p = s.device(0).parts;
    p.flex.position.y = lift[0]; p.lid.position.y = lift[1]; p.coil.position.y = lift[1];
    s.catcher.material.opacity = 0.07;
    s.touch(); s.draw(view);
    return { png: s.png() };
  },
  /** any view of option 1, for trying a camera: STILLS.at(k, width, height, view, explode) */
  at(k = 1, w = 1600, h = 1200, view = VIEWS.hero, explode = 0) { const s = one(0, w * k, h * k, view, { explode }); return { png: s.png() }; },
  option(k = 1, i = 0) {
    const c = SPECS[i].core;
    const reach = Math.max(1, (c.l + 70) / 130);
    const s = one(i, 1600 * k, 1100 * k, { ...VIEWS.hero, dist: VIEWS.hero.dist * reach * 1.1 }, { frame: { cx: 0, cz: 0, w: 230 * reach, d: 210 * reach } });
    return { png: s.png() };
  },
  /** the four in a row at true relative scale */
  row(k = 1) {
    const s = studio();
    const half = SPECS.map((p) => p.core.w / 2 - 16 + 62.5);
    let x = 0;
    const places = SPECS.map((p, i) => { x += half[i]; const q = { i, x, z: 0 }; x += half[i] + 22; return q; });
    const total = x - 22;
    places.forEach((p) => { p.x -= total / 2; });
    s.arrange(places, { cx: 0, cz: 6, w: total + 80, d: 260 });
    s.devices.forEach((d) => d && d.explode(0));
    s.fitAspect = 3;
    s.catcher.material.opacity = 0.2;
    s.resize(3000 * k, 840 * k);
    s.draw({ tx: 0, ty: 0, tz: 8, az: 0, el: 0.9, dist: total * 0.9 });
    return { png: s.png() };
  },
  family(k = 1) {
    const s = studio();
    s.arrange(FAMILY, FRAME_FAMILY);
    s.devices.forEach((d) => d && d.explode(0));
    s.fitAspect = VIEWS.family.fit;
    s.catcher.material.opacity = 0.2;
    s.resize(1800 * k, 1700 * k);
    s.draw(VIEWS.family);
    return { png: s.png() };
  },
};
