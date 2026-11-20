/* The device, as geometry. One parametric builder draws any of the four options from its sizes in specs.json
   (copied from the research tool's design data: core size, corner radius, pad thickness, sensor places, ring colour, cell).
   Units are millimetres. X across the chest, Y out of the chest, -Z toward the head. The pad's underside is y = -pad_t.
   Only named parts are drawn: soft pad, shell, ring, sensor board with its sensors, the cell, the self-test coil,
   the flexible sheet (two clear film arms and the top tab, each with its printed conductor and its electrode), and the lid
   with its coloured corner and light. */
import {
  BoxGeometry, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group,
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
  /* strap: the width of an arm; root: where its head-side edge leaves the core. */
  return { dx, zr, strap: 12, root: zr - 2, lobe: { x: 52 + dx, z: zr + 23, r: 10.5 }, tab: { z: -(core.l / 2 + 15), r: 6.3 }, pad: 6.9, tabPad: 3.4 };
}
const bez = (p0, c1, c2, p3, t) => {
  const m = 1 - t;
  return [m * m * m * p0[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p3[0], m * m * m * p0[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p3[1]];
};
/** the centre line of an arm, from the core to its round end, and where the straight part stops */
function armLine(plan) {
  const { dx, lobe } = plan, hs = plan.strap / 2;
  const endX = lobe.x - dx - Math.sqrt(lobe.r * lobe.r - hs * hs);
  const zc = plan.root + hs;
  return { endX, centre: (t) => bez([14, zc], [14 + (endX - 14) * 0.62, zc], [endX - (endX - 14) * 0.55, lobe.z], [endX, lobe.z], t) };
}
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
  const { dx, lobe } = plan;
  /* each wing is a strap of one width along an S-shaped centre line, level where it leaves the core and where it meets its round end */
  const hs = plan.strap / 2;
  const { centre } = armLine(plan);
  for (const sgn of [-1, 1]) {
    const X = (x) => sgn * (x + dx);
    const cx = sgn * lobe.x;
    const edge = (t, s) => {
      const a = centre(Math.max(0, t - 0.002)), b = centre(Math.min(1, t + 0.002)), c = centre(t);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [X(c[0] - s * hs * (b[1] - a[1]) / L), c[1] + s * hs * (b[0] - a[0]) / L];
    };
    const upper = (t) => edge(t, -1), lower = (t) => edge(t, 1);
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
/** the conductors printed on the film: one fine line from the core to the middle of each electrode */
function traceGeometry(core, plan, height) {
  const S = sheet(height, 0.1);
  const { dx, lobe } = plan, hw = 0.55;
  const { centre, endX } = armLine(plan);
  for (const sgn of [-1, 1]) {
    const X = (x) => sgn * (x + dx);
    const edge = (t, s) => {
      const a = centre(Math.max(0, t - 0.002)), b = centre(Math.min(1, t + 0.002)), c = centre(t);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [X(c[0] - s * hw * (b[1] - a[1]) / L), c[1] + s * hw * (b[0] - a[0]) / L];
    };
    S.grid(44, 1, (u, v) => { const a = edge(u, -1), b = edge(u, 1); return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v]; });
    S.grid(4, 1, (u, v) => [X(endX + (lobe.x - dx - plan.pad * 0.6 - endX) * u), lobe.z - hw + 2 * hw * v]);
  }
  const z0 = -(core.l / 2 - 2.2);
  S.grid(8, 1, (u, v) => [-hw + 2 * hw * v, z0 + (plan.tab.z + plan.tabPad * 0.6 - z0) * u]);
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
  const turns = canvasTexture(64, (x, s) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, s, s);
    x.fillStyle = '#9a9a9a'; for (let y = 0; y < s; y += 8) x.fillRect(0, y, s, 3);
  });
  turns.colorSpace = SRGBColorSpace;
  turns.repeat.set(1, 3);
  return {
    shell: new MeshPhysicalMaterial({ color: new Color('#f4f4f3'), roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
    /* the arms: a thin clear film, as on a long-wear skin patch */
    film: new MeshPhysicalMaterial({ color: new Color('#f3f6f7'), roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true, opacity: 0.5, depthWrite: false, side: DoubleSide }),
    trace: new MeshStandardMaterial({ color: new Color('#9aa1a8'), roughness: 0.4, metalness: 0.75 }),
    silver: new MeshStandardMaterial({ color: new Color('#c9cdd1'), roughness: 0.42, metalness: 0.7 }),
    gel: new MeshPhysicalMaterial({ color: new Color('#eef2f3'), roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }),
    chip: new MeshPhysicalMaterial({ color: new Color('#23272d'), roughness: 0.35, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
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
  const lidGeo = loft(w, l, r, [['C', yL], [-inL, yL], [-inL, yL], [-inL, yR + 0.1], ...arc(-inL - er, yR + 0.1, er, t - yR - 0.1, 0, H, 12), ...top, ['C', t + crown]], 14, 10);
  /* the lid's colours are painted from above: white, with the ring's colour in one corner at the foot end and a small light in it */
  const lp = lidGeo.attributes.position, luv = [];
  for (let i = 0; i < lp.count; i++) luv.push((lp.getX(i) + hw) / w, (lp.getZ(i) + hl) / l);
  lidGeo.setAttribute('uv', new Float32BufferAttribute(luv, 2));
  const lidMat = M.shell.clone();
  const paint = (fill) => {
    const k = 20, tex = canvasTexture(8, () => {}), c = tex.image, x = c.getContext('2d');
    c.width = Math.round(w * k); c.height = Math.round(l * k);
    fill(x, k, c.width, c.height, (hw + hw - inL) * k, (hl + hl - inL) * k);
    tex.flipY = false; tex.colorSpace = SRGBColorSpace; tex.needsUpdate = true;
    return tex;
  };
  const NA = 9, NB = 13; // how far the coloured corner runs along the foot edge and along the side
  lidMat.map = paint((x, k, W, Hh, ax, az) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, Hh);
    const A = [ax - NA * k, az], B = [ax, az - NB * k], mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
    x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(A[0], Hh); x.lineTo(W, Hh); x.lineTo(W, B[1]); x.lineTo(B[0], B[1]);
    x.quadraticCurveTo(ax + (mx - ax) * 0.8, az + (mz - az) * 0.8, A[0], A[1]); x.closePath();
    x.fillStyle = spec.ring; x.fill();
  });
  lidMat.emissiveMap = paint((x, k, W, Hh, ax, az) => {
    x.fillStyle = '#000000'; x.fillRect(0, 0, W, Hh);
    const cx = ax - 3.6 * k, cz = az - 3.9 * k;
    const g = x.createRadialGradient(cx, cz, 0, cx, cz, 2.6 * k);
    g.addColorStop(0, 'rgba(60,220,215,0.5)'); g.addColorStop(1, 'rgba(60,220,215,0)');
    x.fillStyle = g; x.fillRect(cx - 3 * k, cz - 3 * k, 6 * k, 6 * k);
    x.lineCap = 'round'; x.lineWidth = 0.6 * k; x.strokeStyle = '#8ffbf3';
    x.beginPath(); x.moveTo(cx - 0.9 * k, cz); x.lineTo(cx + 0.9 * k, cz); x.stroke();
  });
  lidMat.emissive = new Color('#ffffff');
  lidMat.emissiveIntensity = 1;
  lid.add(mesh(lidGeo, lidMat));

  /* The charging pads (spec.contacts) are not drawn: they are not on the lid, and the model has no other face to show them on. */

  /* the flexible sheet: clamped in the core, two clear arms and the top tab lying on the surface under it */
  const th = 0.5;
  const yS = t - 3.0 - th / 2 - 0.05; // the sheet leaves through the wall below the ring
  const ground = -padT + th / 2 + 0.06;
  const height = (x, z) => {
    const k = Math.max(smooth(hw - 0.4, hw + 15, Math.abs(x)), smooth(hl - 0.4, hl + 5.6, -z));
    return yS + (ground - yS) * k;
  };
  const flex = new Group();
  flex.add(mesh(traceGeometry(spec.core, plan, height), M.trace, false));
  /* the electrode, seen through the film: a silver disc with a low clear cap over it */
  const electrode = (x, z, lobeR, padR) => {
    const y = height(x, z);
    const disc = new CylinderGeometry(padR, padR, 0.14, 56);
    disc.translate(x, y, z);
    flex.add(mesh(disc, M.silver, false));
    const domeP = [];
    const dh = padR * 0.13;
    for (let k = 0; k <= 14; k++) { const a = (k / 14) * H; domeP.push(new Vector2((padR + 0.6) * Math.sin(a), dh * Math.cos(a))); }
    const dome = new LatheGeometry(domeP.reverse(), 56);
    dome.translate(x, y + th / 2, z);
    const cap = mesh(dome, M.gel, false);
    cap.userData.clear = true; cap.renderOrder = 4;
    flex.add(cap);
  };
  const film = mesh(sheetGeometry(spec.core, plan, height, th), M.film, false);
  film.userData.clear = true; film.renderOrder = 3;
  flex.add(film);
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
    if (E.kind === 'chip') {
      /* each chip stands on its long edge, on a pair of gold pads */
      const h = E.height ?? 2.2, len = E.length ?? 4.2, tk = E.thick ?? 0.625;
      for (const [x, z] of E.places) {
        const c = new BoxGeometry(tk, h, len); c.translate(x, 1.8 + h / 2, z); sensors.add(mesh(c, M.chip));
        const f = new BoxGeometry(tk + 1.1, 0.18, len + 0.5); f.translate(x, 1.8 + 0.09, z); sensors.add(mesh(f, M.gold));
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
    dispose() { group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); ring.dispose(); lidMat.map.dispose(); lidMat.emissiveMap.dispose(); lidMat.dispose(); },
  };
}
