/* The device, as geometry. One parametric builder draws any of the four options from its sizes in specs.json
   (copied from the research tool's design data: core size, corner radius, pad thickness, sensor places, ring colour, cell).
   Units are millimetres. X across the chest, Y out of the chest, -Z toward the head. The pad's underside is y = -pad_t.
   Only named parts are drawn: soft pad, shell, ring, sensor board with its sensors, the cell, the self-test coil,
   the flexible sheet (two wings and the top tab, each with its electrode), the lid and its charging pads. */
import {
  BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group,
  LatheGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, TubeGeometry, Vector2, Vector3,
} from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const H = Math.PI / 2;
/** the coloured ring seen from above: its width in millimetres, set to match the hero picture */
const RING_W = 0.95;

/* ---------- lofted solids: a rounded rectangle swept along a profile of [outward, y] points ---------- */

/** points round a rounded rectangle in (x, z); the count is fixed so rings can be joined */
function ringPts(w, l, r, seg, side) {
  const hw = Math.max(w / 2, 0.0005);
  const hl = Math.max(l / 2, 0.0005);
  const rr = Math.max(0.0004, Math.min(r, hw, hl));
  const out = [];
  const corners = [[hw - rr, hl - rr], [-(hw - rr), hl - rr], [-(hw - rr), -(hl - rr)], [hw - rr, -(hl - rr)]];
  for (let c = 0; c < 4; c++) {
    const [cx, cz] = corners[c];
    for (let k = 0; k <= seg; k++) {
      const a = (c + k / seg) * H;
      out.push(cx + rr * Math.cos(a), cz + rr * Math.sin(a));
    }
    const [nx, nz] = corners[(c + 1) % 4];
    const a1 = (c + 1) * H;
    const x0 = cx + rr * Math.cos(a1), z0 = cz + rr * Math.sin(a1);
    const x1 = nx + rr * Math.cos(a1), z1 = nz + rr * Math.sin(a1);
    for (let k = 1; k < side; k++) out.push(x0 + (x1 - x0) * k / side, z0 + (z1 - z0) * k / side);
  }
  return out;
}

/** profile: [outward, y] pairs (outward 0 is the nominal outline; negative is inside it). 'C' closes to the centre line.
    A repeated point makes a crisp edge. Profiles start underneath and end on top. */
function loft(w, l, r, profile, seg = 12, side = 8) {
  const rings = profile.map(([o, y]) => {
    const inset = o === 'C' ? Math.min(w, l) / 2 - 0.0005 : -o;
    return { p: ringPts(w - 2 * inset, l - 2 * inset, r - inset, seg, side), y };
  });
  const n = rings[0].p.length / 2;
  const pos = [];
  for (const R of rings) for (let i = 0; i < n; i++) pos.push(R.p[2 * i], R.y, R.p[2 * i + 1]);
  const idx = [];
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i, b = j * n + (i + 1) % n, c = (j + 1) * n + (i + 1) % n, d = (j + 1) * n + i;
      idx.push(a, d, b, b, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nor = g.attributes.normal;
  if (profile[0][0] === 'C') for (let i = 0; i < n; i++) nor.setXYZ(i, 0, -1, 0);
  if (profile[profile.length - 1][0] === 'C') for (let i = 0; i < n; i++) nor.setXYZ((rings.length - 1) * n + i, 0, 1, 0);
  return g;
}
/** part of a fillet in profile space, from angle a0 to a1 about (oc, yc); rx across, ry up */
function arc(oc, yc, rx, ry, a0, a1, n = 8) {
  const out = [];
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; out.push([oc + rx * Math.cos(a), yc + ry * Math.sin(a)]); }
  return out;
}
/** a closed solid with soft edges: bottom at y0, top at y1, edge radius e, drawn `out` outside the nominal outline */
function slab(w, l, r, y0, y1, e, out = 0) {
  const e2 = Math.min(e, (y1 - y0) / 2);
  return loft(w, l, r, [['C', y0], ...arc(out - e2, y0 + e2, e2, e2, -H, 0), ...arc(out - e2, y1 - e2, e2, e2, 0, H), ['C', y1]]);
}

/* ---------- the flexible sheet ---------- */

/** where the wings, their round ends and the top tab sit for a core of this size (from the design sheet's drawing) */
export function wingPlan(core) {
  const dx = core.w / 2 - 16;
  const zr = 9 + (core.l - 60) / 4;
  return { dx, zr, lobe: { x: 50 + dx, z: zr + 18.3, r: 11 }, tab: { z: -(core.l / 2 + 7.5), r: 5.3 }, pad: 8, tabPad: 3.3 };
}
const bez = (p0, c1, c2, p3, t) => {
  const m = 1 - t;
  return [m * m * m * p0[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p3[1]];
};
/** a soft sheet of thickness th draped over height(x, z), made of patches that share that one surface */
function sheet(height, th) {
  const pos = [], nor = [], uv = [], idx = [];
  const e = 0.4, half = th / 2;
  const up = (x, z) => {
    const gx = (height(x + e, z) - height(x - e, z)) / (2 * e), gz = (height(x, z + e) - height(x, z - e)) / (2 * e);
    const k = 1 / Math.sqrt(gx * gx + 1 + gz * gz);
    return [-gx * k, k, -gz * k];
  };
  const put = (x, y, z, n) => { pos.push(x, y, z); nor.push(n[0], n[1], n[2]); uv.push(x / 4, z / 4); return pos.length / 3 - 1; };
  const top = (p) => { const n = up(p[0], p[1]); return put(p[0] + n[0] * half, height(p[0], p[1]) + n[1] * half, p[1] + n[2] * half, n); };
  return {
    /** a patch of the top face: P(u, v) gives [x, z] */
    grid(ni, nj, P) {
      const base = pos.length / 3;
      for (let i = 0; i <= ni; i++) for (let j = 0; j <= nj; j++) top(P(i / ni, j / nj));
      for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) {
        const a = base + i * (nj + 1) + j, b = a + nj + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    },
    /** the rounded edge along a line of [x, z] points; away(i) is a point on the inside, to tell which way is out */
    edge(line, away, closed = false) {
      const K = 6, N = line.length, base = pos.length / 3;
      for (let i = 0; i < N; i++) {
        const a = line[closed ? (i + N - 1) % N : Math.max(0, i - 1)], p = line[i], b = line[closed ? (i + 1) % N : Math.min(N - 1, i + 1)];
        let ox = b[1] - a[1], oz = -(b[0] - a[0]);
        const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
        const q = away(i);
        if (ox * (p[0] - q[0]) + oz * (p[1] - q[1]) < 0) { ox = -ox; oz = -oz; }
        const n = up(p[0], p[1]);
        const y = height(p[0], p[1]);
        for (let k = 0; k <= K; k++) {
          const f = (k / K) * Math.PI, s = Math.sin(f), c = Math.cos(f);
          const m = [ox * s + n[0] * c, n[1] * c, oz * s + n[2] * c];
          put(p[0] + m[0] * half, y + m[1] * half, p[1] + m[2] * half, m);
        }
      }
      for (let i = 0; i < (closed ? N : N - 1); i++) for (let k = 0; k < K; k++) {
        const a = base + i * (K + 1) + k, b = base + ((i + 1) % N) * (K + 1) + k;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    },
    /** a round patch with its edge */
    disc(cx, cz, r, seg = 56) {
      this.grid(5, seg, (u, v) => [cx + r * u * Math.cos(v * 2 * Math.PI), cz + r * u * Math.sin(v * 2 * Math.PI)]);
      const line = [];
      for (let k = 0; k < seg; k++) line.push([cx + r * Math.cos(k / seg * 2 * Math.PI), cz + r * Math.sin(k / seg * 2 * Math.PI)]);
      this.edge(line, () => [cx, cz], true);
    },
    done() {
      /* make every triangle face the way its corner normals point */
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
        const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
        const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        if (fx * (nor[a] + nor[b] + nor[c]) + fy * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + fz * (nor[a + 2] + nor[b + 2] + nor[c + 2]) < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      return g;
    },
  };
}
/** the whole sheet: the clamped middle, both wings with their round ends, and the top tab */
function sheetGeometry(core, plan, height, th) {
  const S = sheet(height, th);
  const hl = core.l / 2;
  /* the middle, inside the shell */
  const rim = ringPts(core.w - 3.4, core.l - 3.4, Math.max(1, core.r - 1.7), 8, 6);
  const line = [];
  for (let i = 0; i < rim.length; i += 2) line.push([rim[i], rim[i + 1]]);
  S.grid(1, line.length, (u, v) => { const p = line[Math.round(v * line.length) % line.length]; return [p[0] * u, p[1] * u]; });
  S.edge(line, () => [0, 0], true);
  /* the wings: each edge is a curve from the core to the round end */
  const { dx, zr, lobe } = plan;
  const a1 = Math.atan2(9.3, 9), a2 = Math.atan2(-6.7, 8.5);
  for (const sgn of [-1, 1]) {
    const X = (x) => sgn * (x + dx);
    const cx = sgn * lobe.x;
    const upper = (t) => bez([X(14), zr], [X(27), zr], [X(34), zr + 4], [cx - sgn * lobe.r * Math.cos(a1), lobe.z - lobe.r * Math.sin(a1)], t);
    const lower = (t) => bez([X(14), zr + 11.5], [X(22), zr + 11.5], [X(30), zr + 16.5], [cx - sgn * lobe.r * Math.cos(a2), lobe.z - lobe.r * Math.sin(a2)], t);
    const NI = 44;
    S.grid(NI, 8, (u, v) => { const a = upper(u), b = lower(u); return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v]; });
    const U = [], Lo = [];
    for (let i = 0; i <= NI; i++) { U.push(upper(i / NI)); Lo.push(lower(i / NI)); }
    S.edge(U, (i) => Lo[i]);
    S.edge(Lo, (i) => U[i]);
    S.disc(cx, lobe.z, lobe.r);
  }
  /* the top tab */
  const tr = plan.tab.r, tz = plan.tab.z;
  const z0 = -(hl - 2.2);
  S.grid(16, 6, (u, v) => [-tr + 2 * tr * v, z0 + (tz - z0) * u]);
  const A = [], B = [];
  for (let i = 0; i <= 16; i++) { A.push([-tr, z0 + (tz - z0) * i / 16]); B.push([tr, z0 + (tz - z0) * i / 16]); }
  S.edge(A, (i) => B[i]);
  S.edge(B, (i) => A[i]);
  S.disc(0, tz, tr, 40);
  return S.done();
}

/* ---------- surfaces ---------- */

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** the materials every option shares; the ring is made per option */
export function makeMaterials() {
  /* a fine rib with a little fuzz, as a height map: 4 mm of cloth per repeat */
  const knit = canvasTexture(256, (x, s) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 16) {
      const g = x.createLinearGradient(0, y, 0, y + 16);
      g.addColorStop(0, '#5c5c5c'); g.addColorStop(0.5, '#a6a6a6'); g.addColorStop(1, '#5c5c5c');
      x.fillStyle = g; x.fillRect(0, y, s, 16);
    }
    x.globalAlpha = 0.3;
    for (let c = 0; c < s; c += 16) {
      const g = x.createLinearGradient(c, 0, c + 16, 0);
      g.addColorStop(0, '#545454'); g.addColorStop(0.5, '#acacac'); g.addColorStop(1, '#545454');
      x.fillStyle = g; x.fillRect(c, 0, 16, s);
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 3000; i++) { const v = 128 + Math.round((rnd() - 0.5) * 120); x.fillStyle = `rgba(${v},${v},${v},0.3)`; x.fillRect(rnd() * s, rnd() * s, 2, 2); }
  });
  const fuzz = canvasTexture(256, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 5200; i++) { const v = 214 + Math.round(rnd() * 40); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(rnd() * s, rnd() * s, 3, 3); }
  });
  fuzz.colorSpace = SRGBColorSpace;
  knit.repeat.set(0.46, 0.46);
  /* the foam ring round each electrode: white, with a fine dark speckle */
  const speck = canvasTexture(256, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) { const v = 176 + Math.round(rnd() * 60); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(rnd() * s, rnd() * s, 3, 3); }
  });
  speck.colorSpace = SRGBColorSpace;
  speck.repeat.set(0.5, 0.5);
  const turns = canvasTexture(64, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#9a9a9a'; for (let y = 0; y < s; y += 8) x.fillRect(0, y, s, 3);
  });
  turns.colorSpace = SRGBColorSpace;
  turns.repeat.set(1, 3);
  return {
    shell: new MeshPhysicalMaterial({ color: new Color('#f4f4f3'), roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
    cloth: new MeshPhysicalMaterial({ color: new Color('#ebe8e8'), roughness: 1, metalness: 0, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new Color('#ffffff'), map: fuzz, bumpMap: knit, bumpScale: 4, side: DoubleSide }),
    rim: new MeshStandardMaterial({ color: new Color('#eeecec'), roughness: 1, map: speck, bumpMap: speck, bumpScale: 0.5 }),
    gel: new MeshPhysicalMaterial({ color: new Color('#d2d2d1'), roughness: 0.3, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.18 }),
    foam: new MeshStandardMaterial({ color: new Color('#d9dee3'), roughness: 1 }),
    board: new MeshPhysicalMaterial({ color: new Color('#1f6a55'), roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    copper: new MeshStandardMaterial({ color: new Color('#c87b4a'), roughness: 0.38, metalness: 0.85 }),
    wound: new MeshStandardMaterial({ color: new Color('#d98f5c'), roughness: 0.45, metalness: 0.45, map: turns }),
    glass: new MeshPhysicalMaterial({ color: new Color('#e8eef0'), roughness: 0.1, metalness: 0.2, clearcoat: 1 }),
    cell: new MeshStandardMaterial({ color: new Color('#cdd2d6'), roughness: 0.36, metalness: 0.82 }),
    gold: new MeshStandardMaterial({ color: new Color('#d9b064'), roughness: 0.32, metalness: 0.9 }),
  };
}
export function ringMaterial(colour) {
  return new MeshPhysicalMaterial({ color: new Color(colour), roughness: 0.5, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.4, envMapIntensity: 0.6 });
}

/* ---------- one device ---------- */

/** inside: also build the parts seen only when it is opened (board, sensors, cell, coil) */
export function buildDevice(spec, M, { inside = false } = {}) {
  const { w, l, t, r, pad_t: padT } = spec.core;
  const hw = w / 2, hl = l / 2;
  const plan = wingPlan(spec.core);
  const ring = ringMaterial(spec.ring);
  const mesh = (g, m, shadow = true) => { const o = new Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
  const yT = t - 1.7;   // top of the shell wall: the parting line
  const yL = t - 1.55;  // underside of the lid, which sits inside the ring
  const yR = t - 0.45;  // top of the ring: a band round the lid, as wide as RING_W seen from above
  const inL = RING_W + 0.1; // how far the lid's outline is inside the shell's

  const pad = new Group();
  pad.add(mesh(slab(w, l, r, -padT, 0, 0.9, -1.1), M.foam));

  /* shell: floor, wall, rim, and the inside */
  const tray = new Group();
  const eb = Math.min(2.0, yT * 0.45);
  tray.add(mesh(loft(w, l, r, [
    ['C', 0], ...arc(-eb, eb, eb, eb, -H, 0), [0, yT - 0.25], [-0.25, yT], [-0.25, yT],
    [-1.3, yT], [-1.3, yT], [-1.3, 1], [-1.3, 1], ['C', 1],
  ]), M.shell));
  /* the coloured ring at the parting line */
  tray.add(mesh(loft(w, l, r, [[-1.3, yT], [-0.12, yT], [-0.12, yT], [0.06, yT + 0.2], [0.06, yR - 0.4], ...arc(-0.34, yR - 0.4, 0.4, 0.4, 0, H, 6), [-RING_W, yR], [-RING_W, yR], [-RING_W, yL]]), ring));

  const lid = new Group();
  const er = Math.min(1.6, hw * 0.3);
  const crown = 0.22;
  const top = [];
  for (const f of [0.2, 0.42, 0.66, 0.86, 0.97]) top.push([-(inL + er + (hw - inL - er) * f), t + crown * (1 - (1 - f) * (1 - f))]);
  lid.add(mesh(loft(w, l, r, [['C', yL], [-inL, yL], [-inL, yL], [-inL, yR + 0.1], ...arc(-inL - er, yR + 0.1, er, t - yR - 0.1, 0, H, 12), ...top, ['C', t + crown]], 14, 10), M.shell));

  /* flat gold pads at the head end of the lid, which meet the spring pins of the charging case */
  for (let k = 0; k < (spec.contacts || 0); k++) {
    const c = new CylinderGeometry(0.95, 0.95, 0.16, 24, 1);
    c.translate((k - (spec.contacts - 1) / 2) * 3.3, t + crown + 0.02, -(hl - 6.5));
    lid.add(mesh(c, M.gold, false));
  }

  /* the flexible sheet: clamped in the core, two wings and the top tab draped to the surface it lies on */
  const th = 1.7;
  const yS = t - 3.0 - th / 2 - 0.05; // the sheet leaves through the wall below the ring
  const ground = -padT + th / 2 + 0.06;
  const height = (x, z) => {
    const k = Math.max(smooth(hw - 0.4, hw + 15, Math.abs(x)), smooth(hl - 0.4, hl + 5.6, -z));
    return yS + (ground - yS) * k;
  };
  const flex = new Group();
  flex.add(mesh(sheetGeometry(spec.core, plan, height, th), M.cloth));
  const electrode = (x, z, lobeR, padR) => {
    const y = height(x, z) + th / 2;
    const rimP = [];
    const span = lobeR - padR + 0.5;
    for (let k = 0; k <= 12; k++) { const f = k / 12; rimP.push(new Vector2(padR - 0.5 + span * f, Math.sin(f * Math.PI) ** 0.35 * Math.min(1.0, span * 0.6))); }
    const rim = new LatheGeometry(rimP.reverse(), 56);
    const uv = rim.attributes.uv, p = rim.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4);
    rim.translate(x, y - 0.05, z);
    flex.add(mesh(rim, M.rim));
    const domeP = [];
    const dh = padR * 0.3;
    for (let k = 0; k <= 14; k++) { const a = (k / 14) * H; domeP.push(new Vector2(padR * Math.sin(a), dh * Math.cos(a))); }
    const dome = new LatheGeometry(domeP.reverse(), 56);
    dome.translate(x, y + 0.2, z);
    flex.add(mesh(dome, M.gel));
  };
  electrode(-plan.lobe.x, plan.lobe.z, plan.lobe.r, plan.pad);
  electrode(plan.lobe.x, plan.lobe.z, plan.lobe.r, plan.pad);
  electrode(0, plan.tab.z, plan.tab.r, plan.tabPad);

  const sensors = new Group();
  const coil = new Group();
  let tall = 3;
  if (inside) {
    const E = spec.elements;
    sensors.add(mesh(slab(w - 4, l - 4, Math.max(1, r - 2), 1.0, 1.8, 0.12), M.board));
    if (E.kind === 'wire') {
      const h = E.height ?? 5, rad = (E.radius ?? 0.7) + 0.25;
      for (const [x, z] of E.places) {
        const c = new CylinderGeometry(rad, rad, h, 28, 1); c.translate(x, 1.8 + h / 2, z); sensors.add(mesh(c, M.wound));
        const wgl = new CylinderGeometry(0.34, 0.34, h + 0.7, 14, 1); wgl.translate(x, 1.8 + (h + 0.7) / 2, z); sensors.add(mesh(wgl, M.glass));
      }
      tall = h;
    }
    if (spec.cell) {
      const c = spec.cell;
      const cg = slab(c.w, c.l, 1.6, 1.8, 1.8 + c.t, 0.7);
      cg.translate(c.x, 0, c.z);
      sensors.add(mesh(cg, M.cell));
    }
    /* the self-test coil: a flat spiral about 8 mm across, on the inside of the lid */
    const pts = [];
    for (let k = 0; k <= 200; k++) { const f = k / 200, a = f * 5 * 2 * Math.PI, rad = 0.9 + 3.1 * f; pts.push(new Vector3(rad * Math.cos(a), yL - 0.45, rad * Math.sin(a))); }
    coil.add(mesh(new TubeGeometry(new CatmullRomCurve3(pts), 260, 0.24, 6, false), M.copper));
  }

  const parts = { pad, tray, sensors, coil, flex, lid };
  const group = new Group();
  for (const k in parts) group.add(parts[k]);
  const s0 = t + 3;
  return {
    group, parts, plan, spec,
    /* how far each part rises when the device is fully opened */
    lift: { pad: -9, tray: 0, sensors: s0, coil: s0 + tall + 5, flex: s0 + tall + 22, lid: s0 + tall + 35 },
    explode(e) { for (const k in parts) parts[k].position.y = this.lift[k] * e; },
    dispose() { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); ring.dispose(); },
  };
}
