/* The camera positions and layouts shared by the live stage and the rendered stills, so the two cannot disagree. */
/** the option the site is built round: its place in specs.json (1 is option 2, the TMR chips) */
export const LEAD = 1;
export const VIEWS = {
  hero: { tx: -2, ty: 0, tz: 8, az: 0.31, el: 0.86, dist: 186, fov: 32, fit: 1.5 },
  open: { tx: 0, ty: 27, tz: 4, az: 2.56, el: 0.36, dist: 400, fit: 0.9 },
  wing: { tx: 4, ty: 0, tz: 12, az: -0.62, el: 0.5, dist: 286, fit: 1.4 },
  family: { tx: 73, ty: 0, tz: 70, az: 0, el: 0.74, dist: 800, fit: 1.05 },
};
/** the four options on one ground at true relative scale: two by two */
export const FAMILY = [{ i: 0, x: 0, z: 0 }, { i: 1, x: 150, z: 0 }, { i: 2, x: 0, z: 136 }, { i: 3, x: 150, z: 136 }];
export const FRAME_ONE = { cx: 0, cz: 0, w: 230, d: 210 };
export const FRAME_FAMILY = { cx: 72, cz: 78, w: 440, d: 400 };
/** the three size lines of a core, as pairs of points in millimetres */
export function sizeLines(core) {
  const hw = core.w / 2, hl = core.l / 2, t = core.t;
  return [
    { a: [hw + 9, t, -hl], b: [hw + 9, t, hl], tick: [1, 0, 0], text: `${core.l} mm`, off: [1, 0] },
    { a: [-hw, -core.pad_t, hl + 5], b: [hw, -core.pad_t, hl + 5], tick: [0, 0, 1], text: `${core.w} mm`, off: [0, 1] },
    { a: [-hw - 7, 0, hl - 3], b: [-hw - 7, t, hl - 3], tick: [1, 0, 0], text: `${t} mm`, off: [-1, 0] },
  ];
}
