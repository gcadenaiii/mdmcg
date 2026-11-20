/* Company plan: the diagrams. Each one is drawn from the plan's records and figures; none holds a number of its own.
   Public code. Status is never shown by colour alone: every mark carries a word, a number or a shape as well. */
import * as C from './calc.js';
import { esc, badge } from './views.js';

const $m = (v) => C.money(v == null ? v : Math.round(Number(v)));
export const PCOL = { battery: 'pl-c-b', ecg: 'pl-c-e', funding: 'pl-c-f', shared: 'pl-c-s' };
export const PNAME = { battery: 'Battery product', ecg: 'ECG/MCG', funding: 'Funding and partnerships', shared: 'Shared' };
const k$ = (v) => (Math.abs(v) >= 1e6 ? '$' + (Math.round(v / 1e4) / 100) + 'M' : Math.abs(v) >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v));
export const legend = (items) => `<p class="pb-legend">${items.map(([cls, name]) => `<span><i class="pb-k ${cls}"></i>${esc(name)}</span>`).join('')}</p>`;

/* ---- a chain of steps with arrows (business model, manufacturing, support). steps: [{ title, text, tag, cls, foot }] */
export function chain(steps, o = {}) {
  return `<ol class="pl-chain${o.wrap ? ' pl-chain-wrap' : ''}" aria-label="${esc(o.label || 'Steps in order')}">${steps.map((s, i) => `<li class="pl-step ${s.cls || ''}"${s.attr ? ' ' + s.attr : ''}><span class="pl-step-n">${i + 1}</span><b>${esc(s.title)}</b>${s.big != null ? `<strong>${s.big}</strong>` : ''}${s.text ? `<span>${esc(s.text)}</span>` : ''}${s.tag || ''}${s.foot ? `<small>${s.foot}</small>` : ''}</li>`).join('')}</ol>`;
}

/* ---- A. company strategy map */
export function strategyMap(x) {
  const { m, d } = x;
  const card = (p) => { const s = d.byProgram[p.id]; const b = d.budget.rows.find((r) => r.id === p.id); const nx = s.next;
    return `<a class="pl-card ${PCOL[p.id]}" href="${p.href}"><span class="pl-card-n">Execution Plan ${p.n}</span><b>${esc(p.name)}</b><em>${esc(p.role)}</em>
      <dl><div><dt>Next milestone</dt><dd>${nx ? `${esc(nx.title)}<br>${esc(nx.finishDate)}` : 'none'}</dd></div><div><dt>Finish, as planned</dt><dd>${esc(s.sched.endDate)}</dd></div><div><dt>Budget</dt><dd>${$m(b.total)}${b.isFloor ? ' <span class="pb-b pb-b-warn">floor</span>' : ''}</dd></div></dl></a>`; };
  const ps = [{ id: 'battery', n: 1, name: 'Battery Product', role: 'Sell first: the near-term priority', href: '/plan/battery/' }, { id: 'ecg', n: 2, name: 'ECG/MCG', role: 'Longer-horizon medical technology', href: '/product-build/' }, { id: 'funding', n: 3, name: 'Funding and Partnerships', role: 'Capital for both', href: '/plan/funding/' }];
  const shared = ['Quality', 'Intellectual property', 'Finance', 'Security', 'Manufacturing partners', 'Management'];
  return `<div class="pl-map" role="group" aria-label="Company strategy map">
    <div class="pl-map-top"><b>MDMCG</b><span>One company, three coordinated programs, one set of shared systems</span></div>
    <svg class="pl-map-wires" viewBox="0 0 900 44" preserveAspectRatio="none" aria-hidden="true"><path d="M450 0 V22 M150 22 H750 M150 22 V44 M450 22 V44 M750 22 V44"/></svg>
    <div class="pl-map-row">${ps.map(card).join('')}</div>
    <div class="pl-map-flow" aria-label="How the programs feed each other"><span><i>→</i> Revenue from Plan 1 funds Plan 2</span><span><i>→</i> Plan 3 brings capital to Plans 1 and 2</span><span><i>→</i> Plans 1 and 2 share the engineers, the magnetic sensing and the acquisition electronics</span></div>
    <svg class="pl-map-wires" viewBox="0 0 900 30" preserveAspectRatio="none" aria-hidden="true"><path d="M150 0 V15 M450 0 V15 M750 0 V15 M150 15 H750 M450 15 V30"/></svg>
    <div class="pl-map-shared"><b>Shared operations</b><ul>${shared.map((s) => `<li>${esc(s)}</li>`).join('')}</ul><a href="/plan/#4">One set of procedures, people and records for all three</a></div>
  </div>`;
}

/* ---- B. master roadmap: one lane per program, phases as bars, milestones as diamonds, overload strip beneath */
export function roadmap(x) {
  const { d } = x; const W = x.ui.zoom || 16; const L = 210, T = 40, laneGap = 12, rowH = 18;
  const start = d.load.start, n = d.load.weeks.length;
  const xs = (date) => L + (C.parseDate(date) - C.parseDate(start)) / (7 * C.DAY) * W;
  let g = '', y = T;
  for (let i = 0; i < n; i++) { const dt = d.load.weeks[i].date; if (dt.slice(8) <= '07') g += `<line x1="${L + i * W}" x2="${L + i * W}" y1="${T - 8}" y2="100%" class="pl-r-grid"/><text x="${L + i * W + 3}" y="${T - 14}" class="pb-g-dt">${dt.slice(0, 7)}</text>`; }
  const pos = {};
  for (const s of d.scheds) {
    const phases = s.phases.map((ph) => { const rows = s.sched.rows.filter((r) => r.phase === ph.id && !r.milestone && !r.loe); return rows.length ? { ...ph, start: rows.map((r) => r.startDate).sort()[0], end: rows.map((r) => r.finishDate).sort().pop(), crit: rows.some((r) => r.critical), pct: Math.round(rows.reduce((a, r) => a + r.percent, 0) / rows.length) } : null; }).filter(Boolean);
    const h = phases.length * rowH + 24;
    g += `<rect x="0" y="${y}" width="100%" height="${h}" class="pl-r-lane"/><a href="${s.href}"><text x="10" y="${y + 18}" class="pl-r-name">${s.n}. ${esc(s.name)}</text></a><text x="10" y="${y + 34}" class="pb-g-dt">to ${esc(s.sched.endDate)}</text>`;
    phases.forEach((ph, i) => { const yy = y + 8 + i * rowH; const x1 = xs(ph.start), x2 = xs(C.addDays(ph.end, 3));
      g += `<a href="${s.href}"><rect x="${x1}" y="${yy}" width="${Math.max(4, x2 - x1)}" height="11" rx="5.5" class="pl-r-bar ${PCOL[s.id]}${ph.crit ? ' pl-r-crit' : ''}"><title>${esc(`${s.name}: ${ph.name}, ${ph.start} to ${ph.end}, ${ph.pct}% complete${ph.crit ? ', on the critical path' : ''}`)}</title></rect></a><text x="${x2 + 5}" y="${yy + 10}" class="pl-r-ph">${esc(ph.name.length > 34 ? ph.name.slice(0, 33) + '…' : ph.name)}</text>`; });
    for (const r of s.sched.rows.filter((q) => q.milestone)) { const cx = xs(r.finishDate) + W * 0.6, cy = y + h - 9; pos[s.id + ':' + r.id] = [cx, cy];
      g += `<a href="${s.href}"><path d="M${cx} ${cy - 7} L${cx + 7} ${cy} L${cx} ${cy + 7} L${cx - 7} ${cy} Z" class="pl-r-ms"><title>${esc(`${r.id} ${r.title}, ${r.finishDate}`)}</title></path></a>`; }
    y += h + laneGap;
  }
  for (const k of x.m.crossLinks || []) { const a = pos[k.from], b = pos[k.to]; if (!a || !b) continue; const mx = (a[0] + b[0]) / 2;
    g += `<path d="M${a[0]} ${a[1]} C${mx} ${a[1]}, ${mx} ${b[1]}, ${b[0]} ${b[1]}" class="pl-r-link"><title>${esc(k.why)}</title></path>`; }
  // overload strip: one row per person, a marked cell where the week asks more than the person has
  const ppl = d.load.people.filter((p) => p.weeklyHours != null);
  g += `<text x="10" y="${y + 12}" class="pl-r-name">Overloaded weeks</text>`;
  ppl.forEach((p, i) => { const yy = y + 20 + i * 16; g += `<text x="10" y="${yy + 10}" class="pb-g-dt">${esc(p.short)}</text>`;
    d.load.weeks.forEach((w, j) => { const over = w.over[p.id]; g += `<rect x="${L + j * W + 1}" y="${yy}" width="${W - 2}" height="11" class="${over ? 'pl-r-over' : 'pl-r-ok'}"><title>${esc(`${p.short}, week of ${w.date}: ${w.by[p.id].total} of ${p.weeklyHours} hours${over ? `, over by ${over}` : ''}`)}</title></rect>${over && W >= 14 ? `<text x="${L + j * W + W / 2}" y="${yy + 9}" text-anchor="middle" class="pl-r-x">!</text>` : ''}`; }); });
  y += 24 + ppl.length * 16;
  const tx = xs(d.today); if (tx >= L && tx <= L + n * W) g += `<line x1="${tx}" x2="${tx}" y1="${T - 8}" y2="${y}" class="pb-g-now"/><text x="${tx + 4}" y="${T - 2}" class="pb-g-dt">today</text>`;
  const width = L + n * W + 230;
  return `<div class="pb-controls"><span>Zoom</span>${[[8, 'Year'], [16, 'Quarter'], [30, 'Month']].map(([w, n2]) => `<button type="button" class="pb-btn${W === w ? ' pl-on' : ''}" data-zoom="${w}" aria-pressed="${W === w}">${n2}</button>`).join('')}</div>
  <div class="pb-scroll pl-roadmap"><svg viewBox="0 0 ${width} ${y + 6}" width="${width}" height="${y + 6}" role="img" aria-label="Master roadmap of the three programs with milestones and overloaded weeks">${g}</svg></div>
  ${legend([['pl-c-b', 'Battery product'], ['pl-c-e', 'ECG/MCG'], ['pl-c-f', 'Funding and partnerships'], ['pl-k-crit', 'thick outline: on the critical path'], ['pb-k-ms', 'stop/go milestone'], ['pl-k-link', 'dashed: one program waits on another'], ['pl-k-over', '! a person is planned over their hours']])}`;
}

/* ---- I. shared capacity: stacked weekly hours by program for one person, with the capacity line */
export function capacity(x, person) {
  const { d } = x; const W = Math.max(520, d.load.weeks.length * 16 + 70), H = 190, L = 44, B = 26, T = 14;
  const cap = person.weeklyHours; const max = Math.max(cap || 0, ...d.load.weeks.map((w) => w.by[person.id].total), 1) * 1.08;
  const sy = (v) => T + (H - T - B) * (1 - v / max), bw = (W - L - 6) / d.load.weeks.length;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line x1="${L}" x2="${W}" y1="${sy(v)}" y2="${sy(v)}" class="pb-c-grid"/><text x="${L - 5}" y="${sy(v) + 4}" text-anchor="end" class="pb-c-ax">${Math.round(v)}</text>`; }
  d.load.weeks.forEach((w, i) => { let y0 = 0; const cell = w.by[person.id];
    for (const pid of ['battery', 'ecg', 'funding']) { const h = cell[pid] || 0; if (!h) continue; g += `<rect x="${L + i * bw + 1}" y="${sy(y0 + h)}" width="${Math.max(1, bw - 2)}" height="${sy(y0) - sy(y0 + h)}" class="${PCOL[pid]}"><title>${esc(`Week of ${w.date}: ${PNAME[pid]} ${h} h`)}</title></rect>`; y0 += h; }
    if (w.over[person.id]) g += `<text x="${L + i * bw + bw / 2}" y="${sy(y0) - 3}" text-anchor="middle" class="pl-r-x">!</text>`;
    if (w.date.slice(8) <= '07') g += `<text x="${L + i * bw}" y="${H - 8}" class="pb-c-ax">${w.date.slice(2, 7)}</text>`; });
  if (cap != null) g += `<line x1="${L}" x2="${W}" y1="${sy(cap)}" y2="${sy(cap)}" class="pb-c-cap"/><text x="${W - 4}" y="${sy(cap) - 5}" text-anchor="end" class="pb-c-ax">${cap} h a week available</text>`;
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(`Planned hours by week for ${person.short}, by program`)}">${g}</svg></div>`;
}

/* ---- D. bars over months, stacked by program, with a second series as markers and an optional line */
export function monthBars(rows, o) {
  const W = Math.max(560, rows.length * 54 + 70), H = 230, L = 56, B = 30, T = 14;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.plannedTotal, r.actualTotal, r.committedTotal))) * 1.1;
  const sy = (v) => T + (H - T - B) * (1 - v / max), bw = (W - L - 8) / Math.max(1, rows.length);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line x1="${L}" x2="${W}" y1="${sy(v)}" y2="${sy(v)}" class="pb-c-grid"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" class="pb-c-ax">${k$(v)}</text>`; }
  rows.forEach((r, i) => { let y0 = 0; const x0 = L + i * bw;
    for (const pid of ['battery', 'ecg', 'funding', 'shared']) { const v = r.planned[pid] || 0; if (!v) continue; g += `<rect x="${x0 + bw * 0.14}" y="${sy(y0 + v)}" width="${bw * 0.5}" height="${sy(y0) - sy(y0 + v)}" class="${PCOL[pid]}"><title>${esc(`${r.month}: ${PNAME[pid]} planned ${$m(v)}`)}</title></rect>`; y0 += v; }
    g += `<rect x="${x0 + bw * 0.68}" y="${sy(r.actualTotal)}" width="${bw * 0.18}" height="${Math.max(0, sy(0) - sy(r.actualTotal))}" class="pl-c-act"><title>${esc(`${r.month}: actual ${$m(r.actualTotal)}`)}</title></rect>`;
    if (r.committedTotal > r.actualTotal) g += `<line x1="${x0 + bw * 0.64}" x2="${x0 + bw * 0.9}" y1="${sy(r.committedTotal)}" y2="${sy(r.committedTotal)}" class="pl-c-com"><title>${esc(`${r.month}: committed ${$m(r.committedTotal)}`)}</title></line>`;
    g += `<text x="${x0 + bw / 2}" y="${H - 10}" text-anchor="middle" class="pb-c-ax">${r.month.slice(2)}</text>`; });
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label)}">${g}</svg></div>${legend([['pl-c-b', 'Battery, planned'], ['pl-c-e', 'ECG/MCG, planned'], ['pl-c-f', 'Funding work, planned'], ['pl-c-act', 'Actual paid'], ['pl-k-com', 'Committed']])}`;
}
/** cash balance by month as a line; rows need .balance */
export function balanceLine(rows) {
  const W = Math.max(560, rows.length * 54 + 70), H = 200, L = 56, B = 30, T = 14;
  const vals = rows.map((r) => r.balance); const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const sy = (v) => T + (H - T - B) * (1 - (v - min) / (max - min || 1)), sx = (i) => L + (i + 0.5) * (W - L - 8) / rows.length;
  let g = `<line x1="${L}" x2="${W}" y1="${sy(0)}" y2="${sy(0)}" class="pb-c-cap"/><text x="${L - 6}" y="${sy(0) + 4}" text-anchor="end" class="pb-c-ax">$0</text><text x="${L - 6}" y="${sy(max) + 4}" text-anchor="end" class="pb-c-ax">${k$(max)}</text>`;
  g += `<polyline points="${rows.map((r, i) => `${sx(i)},${sy(r.balance)}`).join(' ')}" class="pl-c-line"/>`;
  rows.forEach((r, i) => { g += `<circle cx="${sx(i)}" cy="${sy(r.balance)}" r="3.5" class="${r.balance < 0 ? 'pl-c-neg' : 'pl-c-dot'}"><title>${esc(`${r.month}: balance ${$m(r.balance)}`)}</title></circle><text x="${sx(i)}" y="${H - 10}" text-anchor="middle" class="pb-c-ax">${r.month.slice(2)}</text>`; });
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Cash balance by month">${g}</svg></div>`;
}

/* ---- horizontal bars: [{ label, value, cls, note, parts: [{ value, cls, name }] }] */
export function hbars(rows, o = {}) {
  const max = Math.max(1, ...rows.map((r) => (r.parts ? r.parts.reduce((s, p) => s + p.value, 0) : r.value)), ...(o.ref ? [o.ref] : []));
  const W = 980, L = o.left || 190, bh = 26, gap = 12, R = 400;
  let g = '';
  rows.forEach((r, i) => { const yy = 6 + i * (bh + gap); let x0 = L; const parts = r.parts || [{ value: r.value, cls: r.cls, name: r.label }];
    g += `<text x="0" y="${yy + 17}" class="pb-c-lab">${esc(r.label)}</text>`;
    for (const p of parts) { const w = (W - L - R) * p.value / max; g += `<rect x="${x0}" y="${yy}" width="${Math.max(0, w)}" height="${bh}" class="${p.cls || 'pl-c-b'}"><title>${esc(`${r.label}: ${p.name} ${o.fmt ? o.fmt(p.value) : p.value}`)}</title></rect>`; x0 += w; }
    if (r.outline != null) g += `<rect x="${L}" y="${yy - 2}" width="${(W - L - R) * r.outline / max}" height="${bh + 4}" class="pl-c-out"><title>${esc(`${r.label}: target ${r.outline}`)}</title></rect>`;
    g += `<text x="${Math.max(x0, r.outline != null ? L + (W - L - R) * r.outline / max : 0) + 8}" y="${yy + 17}" class="pb-c-lab">${esc(r.text != null ? r.text : (o.fmt ? o.fmt(r.value != null ? r.value : parts.reduce((s, p) => s + p.value, 0)) : ''))}</text>`; });
  if (o.ref) { const rx = L + (W - L - R) * o.ref / max; g += `<line x1="${rx}" x2="${rx}" y1="0" y2="${rows.length * (bh + gap)}" class="pb-c-cap"/><text x="${rx + 4}" y="10" class="pb-c-ax">${esc(o.refName)}</text>`; }
  const H = rows.length * (bh + gap) + 4;
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label || 'Bar chart')}">${g}</svg></div>`;
}

/* ---- grouped bars: groups [{ label, values: [..] }], series [{ name, cls }] */
export function groupBars(groups, series, o = {}) {
  const W = Math.max(560, groups.length * 120 + 70), H = 230, L = 60, B = 30, T = 14;
  const all = groups.flatMap((gp) => gp.values); const max = Math.max(1, ...all) * 1.08, min = Math.min(0, ...all) * 1.08;
  const sy = (v) => T + (H - T - B) * (1 - (v - min) / (max - min)), gw = (W - L - 8) / groups.length, bw = gw * 0.8 / series.length;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4; g += `<line x1="${L}" x2="${W}" y1="${sy(v)}" y2="${sy(v)}" class="pb-c-grid"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" class="pb-c-ax">${k$(v)}</text>`; }
  g += `<line x1="${L}" x2="${W}" y1="${sy(0)}" y2="${sy(0)}" class="pl-c-zero"/>`;
  groups.forEach((gp, i) => { gp.values.forEach((v, j) => { const x0 = L + i * gw + gw * 0.1 + j * bw; const y1 = sy(Math.max(0, v)), y2 = sy(Math.min(0, v)); g += `<rect x="${x0}" y="${y1}" width="${bw - 2}" height="${Math.max(1, y2 - y1)}" class="${series[j].cls}"><title>${esc(`${gp.label}: ${series[j].name} ${$m(v)}`)}</title></rect>`; }); g += `<text x="${L + i * gw + gw / 2}" y="${H - 10}" text-anchor="middle" class="pb-c-ax">${esc(gp.label)}</text>`; });
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label || 'Grouped bar chart')}">${g}</svg></div>${legend(series.map((s) => [s.cls, s.name]))}`;
}

/* ---- H. readiness meters: [{ label, done, of, note }] */
export function meters(items) {
  return `<div class="pl-meters">${items.map((it) => { const pct = it.of ? Math.round(it.done / it.of * 100) : 0; return `<div class="pl-meter"><div class="pl-meter-h"><b>${esc(it.label)}</b><span>${it.done} of ${it.of}</span></div><div class="pl-meter-t" role="img" aria-label="${esc(`${it.label}: ${it.done} of ${it.of}`)}"><i style="width:${pct}%"></i></div><small>${esc(it.note || '')}</small></div>`; }).join('')}</div>`;
}

/* ---- E. funnel: reached against target, narrowing */
export function funnelViz(f) {
  const max = Math.max(1, ...f.rows.map((r) => Math.max(r.reached, r.target || 0)));
  return `<ol class="pl-funnel" aria-label="Commercialization funnel">${f.rows.map((r, i) => `<li><span class="pl-funnel-n">${i + 1}</span><div class="pl-funnel-b"><b>${esc(r.name)}</b><div class="pl-funnel-t"><i class="pl-funnel-tg" style="width:${(r.target || 0) / max * 100}%"></i><i class="pl-funnel-r" style="width:${r.reached / max * 100}%"></i></div></div><div class="pl-funnel-v"><strong>${r.reached}</strong><span>${r.target != null ? `target ${r.target}` : 'no target set'}</span>${r.conversion != null ? `<small>${Math.round(r.conversion * 100)}% of the step before</small>` : ''}</div></li>`).join('')}</ol>`;
}

/* ---- J. decision timeline: one mark per decision on its due date */
export function decisionLine(q, today) {
  const rows = q.rows.filter((r) => r.due); if (!rows.length) return '';
  const t0 = Math.min(C.parseDate(today), ...rows.map((r) => C.parseDate(r.due))) - 7 * C.DAY, t1 = Math.max(...rows.map((r) => C.parseDate(r.due))) + 14 * C.DAY;
  const W = 900, H = 150, sx = (date) => 30 + (C.parseDate(date) - t0) / (t1 - t0) * (W - 60);
  let g = `<line x1="30" x2="${W - 30}" y1="90" y2="90" class="pl-d-axis"/>`;
  const tx = sx(today); g += `<line x1="${tx}" x2="${tx}" y1="20" y2="104" class="pb-g-now"/><text x="${tx + 4}" y="28" class="pb-g-dt">today ${esc(today)}</text>`;
  const seen = {};
  rows.forEach((r) => { const cx = sx(r.due); const lvl = seen[r.due] = (seen[r.due] || 0) + 1; const cy = 90 - (lvl - 1) * 24; const overdue = !r.made && r.days < 0;
    const mark = r.made ? `<circle cx="${cx}" cy="${cy}" r="8" class="pl-d-made"/>` : overdue ? `<path d="M${cx} ${cy - 10} L${cx + 9} ${cy + 7} L${cx - 9} ${cy + 7} Z" class="pl-d-over"/>` : `<circle cx="${cx}" cy="${cy}" r="8" class="pl-d-open"/>`;
    g += `<a href="#dec-${esc(r.id)}">${mark}<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="pl-d-id">${esc(r.id.replace('ED-', ''))}</text><title>${esc(`${r.id} ${r.title}: due ${r.due}, ${r.made ? 'decided' : overdue ? 'overdue' : 'open'}`)}</title></a>`; });
  [...new Set(rows.map((r) => r.due))].forEach((dt) => { g += `<text x="${sx(dt)}" y="122" text-anchor="middle" class="pb-g-dt">${esc(dt.slice(5))}</text><text x="${sx(dt)}" y="136" text-anchor="middle" class="pb-g-dt">${esc(dt.slice(0, 4))}</text>`; });
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Decisions on their due dates">${g}</svg></div>${legend([['pl-k-open', 'open circle: awaiting decision'], ['pl-k-tri', 'triangle: overdue'], ['pl-k-made', 'filled circle: decided']])}`;
}

/* ---- the timing ambiguity from the audit, as an illustration (not prototype data) */
export function timingFigure() {
  const W = 620, H = 150; const pts = (shift, y0, amp) => Array.from({ length: 241 }, (_, i) => { const t = i / 240 * 6; return `${40 + i * 2.2},${y0 - amp * Math.sin(2 * Math.PI * (t - shift))}`; }).join(' ');
  const step = (x0, y0) => `M40 ${y0} H${x0} V${y0 - 22} H${40 + 240 * 2.2}`;
  return `<figure class="pl-fig"><div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Two modules two milliseconds apart: a 1 kHz tone looks aligned, a shared step shows the offset">
    <text x="40" y="14" class="pb-g-dt">1 kHz tone on both modules, module B late by 2 ms (two whole cycles): the traces coincide, phase reads 0 degrees</text>
    <polyline points="${pts(0, 48, 18)}" class="pl-t-a"/><polyline points="${pts(2, 48, 18)}" class="pl-t-b"/>
    <text x="40" y="92" class="pb-g-dt">A shared step on both modules: the same 2 ms shows as 125 samples at 62.5 kS/s</text>
    <path d="${step(200, 136)}" class="pl-t-a"/><path d="${step(200 + 2 / 6 * 240 * 2.2, 132)}" class="pl-t-b"/>
  </svg></div><figcaption>Illustration of the audit's point, with made-up signals. It is not prototype data and does not show a fault. ${''}</figcaption></figure>`;
}
export { badge };
