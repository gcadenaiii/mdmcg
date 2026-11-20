/* Company plan: the diagrams. Each one is drawn from the plan's records and figures; none holds a number of its own.
   Public code. Status is never shown by colour alone: every mark carries a word, a number or a shape as well. */
import * as C from './calc.js';
import { esc, badge } from './views.js';

const $m = (v) => C.money(v == null ? v : Math.round(Number(v)));
export const PCOL = { ecg: 'pl-c-e', funding: 'pl-c-f', shared: 'pl-c-s' };
export const PNAME = { ecg: 'ECG/MCG', funding: 'Funding and partnerships', shared: 'Shared' };
const k$ = (v) => (Math.abs(v) >= 1e6 ? '$' + (Math.round(v / 1e4) / 100) + 'M' : Math.abs(v) >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v));
export const legend = (items) => `<p class="pb-legend">${items.map(([cls, name]) => `<span><i class="pb-k ${cls}"></i>${esc(name)}</span>`).join('')}</p>`;

/* ---- a chain of steps with arrows. steps: [{ title, big, text, cls, foot }] */
export function chain(steps, o = {}) {
  return `<ol class="pl-chain${o.wrap ? ' pl-chain-wrap' : ''}" aria-label="${esc(o.label || 'Steps in order')}">${steps.map((s, i) => `<li class="pl-step ${s.cls || ''}"><span class="pl-step-n">${i + 1}</span><b>${esc(s.title)}</b>${s.big != null ? `<strong>${s.big}</strong>` : ''}${s.text ? `<span>${esc(s.text)}</span>` : ''}${s.foot ? `<small>${s.foot}</small>` : ''}</li>`).join('')}</ol>`;
}

/* ---- A. company strategy map */
export function strategyMap(x) {
  const { m, d } = x;
  const card = (p) => { const s = d.byProgram[p.id]; const nx = s.next;
    return `<a class="pl-card ${PCOL[p.id]}" href="${p.href}"><span class="pl-card-n">Plan ${p.n}</span><b>${esc(p.name)}</b><em>${esc(p.role)}</em>
      <dl><div><dt>Next milestone</dt><dd>${nx ? `${esc(nx.title)}<br>${esc(nx.finishDate)}` : 'none'}</dd></div><div><dt>Finish, as planned</dt><dd>${esc(s.sched.endDate)}</dd></div></dl></a>`; };
  const ps = [{ id: 'ecg', n: 1, name: 'ECG/MCG', role: 'The product: a wearable heart device', href: '/product-build/' }, { id: 'funding', n: 2, name: 'Funding and Partnerships', role: 'Capital for the product', href: '/plan/funding/' }];
  const shared = ['Quality', 'Intellectual property', 'Finance', 'Security', 'Management'];
  return `<div class="pl-map" role="group" aria-label="Company strategy map">
    <div class="pl-map-top"><b>MDMCG</b><span>One company, one product, two coordinated plans, one set of shared systems</span></div>
    <svg class="pl-map-wires" viewBox="0 0 900 44" preserveAspectRatio="none" aria-hidden="true"><path d="M450 0 V22 M225 22 H675 M225 22 V44 M675 22 V44"/></svg>
    <div class="pl-map-row">${ps.map(card).join('')}</div>
    <div class="pl-map-flow" aria-label="How the plans feed each other"><span><i>→</i> Plan 2 brings capital to Plan 1</span></div>
    <svg class="pl-map-wires" viewBox="0 0 900 30" preserveAspectRatio="none" aria-hidden="true"><path d="M225 0 V15 M675 0 V15 M225 15 H675 M450 15 V30"/></svg>
    <div class="pl-map-shared"><b>Shared operations</b><ul>${shared.map((s) => `<li>${esc(s)}</li>`).join('')}</ul><a href="/plan/#strategy">One set of procedures, people and records for both plans</a></div>
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
  <div class="pb-scroll pl-roadmap"><svg viewBox="0 0 ${width} ${y + 6}" width="${width}" height="${y + 6}" role="img" aria-label="Master roadmap of the plans with milestones and overloaded weeks">${g}</svg></div>
  ${legend([['pl-c-e', 'ECG/MCG'], ['pl-c-f', 'Funding and partnerships'], ['pl-k-crit', 'thick outline: on the critical path'], ['pb-k-ms', 'gate'], ['pl-k-link', 'dashed: one program waits on another'], ['pl-k-over', '! a person is planned over their hours']])}`;
}

/* ---- I. shared capacity: stacked weekly hours by program for one person, with the capacity line */
export function capacity(x, person) {
  const { d } = x; const W = Math.max(520, d.load.weeks.length * 16 + 70), H = 190, L = 44, B = 26, T = 14;
  const cap = person.weeklyHours; const max = Math.max(cap || 0, ...d.load.weeks.map((w) => w.by[person.id].total), 1) * 1.08;
  const sy = (v) => T + (H - T - B) * (1 - v / max), bw = (W - L - 6) / d.load.weeks.length;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line x1="${L}" x2="${W}" y1="${sy(v)}" y2="${sy(v)}" class="pb-c-grid"/><text x="${L - 5}" y="${sy(v) + 4}" text-anchor="end" class="pb-c-ax">${Math.round(v)}</text>`; }
  d.load.weeks.forEach((w, i) => { let y0 = 0; const cell = w.by[person.id];
    for (const pid of ['ecg', 'funding']) { const h = cell[pid] || 0; if (!h) continue; g += `<rect x="${L + i * bw + 1}" y="${sy(y0 + h)}" width="${Math.max(1, bw - 2)}" height="${sy(y0) - sy(y0 + h)}" class="${PCOL[pid]}"><title>${esc(`Week of ${w.date}: ${PNAME[pid]} ${h} h`)}</title></rect>`; y0 += h; }
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
    for (const pid of ['ecg', 'funding', 'shared']) { const v = r.planned[pid] || 0; if (!v) continue; g += `<rect x="${x0 + bw * 0.14}" y="${sy(y0 + v)}" width="${bw * 0.5}" height="${sy(y0) - sy(y0 + v)}" class="${PCOL[pid]}"><title>${esc(`${r.month}: ${PNAME[pid]} planned ${$m(v)}`)}</title></rect>`; y0 += v; }
    g += `<rect x="${x0 + bw * 0.68}" y="${sy(r.actualTotal)}" width="${bw * 0.18}" height="${Math.max(0, sy(0) - sy(r.actualTotal))}" class="pl-c-act"><title>${esc(`${r.month}: actual ${$m(r.actualTotal)}`)}</title></rect>`;
    if (r.committedTotal > r.actualTotal) g += `<line x1="${x0 + bw * 0.64}" x2="${x0 + bw * 0.9}" y1="${sy(r.committedTotal)}" y2="${sy(r.committedTotal)}" class="pl-c-com"><title>${esc(`${r.month}: committed ${$m(r.committedTotal)}`)}</title></line>`;
    g += `<text x="${x0 + bw / 2}" y="${H - 10}" text-anchor="middle" class="pb-c-ax">${r.month.slice(2)}</text>`; });
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label)}">${g}</svg></div>${legend([['pl-c-e', 'ECG/MCG, planned'], ['pl-c-f', 'Funding work, planned'], ['pl-c-act', 'Actual paid'], ['pl-k-com', 'Committed']])}`;
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

/* ---- horizontal bars, as HTML so the labels keep their size on any screen: [{ label, value, cls, text, parts: [{ value, cls, name }] }] */
export function hbars(rows, o = {}) {
  const tot = (r) => (r.parts ? r.parts.reduce((s, p) => s + p.value, 0) : r.value);
  const max = Math.max(1, ...rows.map(tot), o.ref || 0);
  return `<div class="pl-hb" role="group" aria-label="${esc(o.label || 'Bar chart')}">${rows.map((r) => { const parts = r.parts || [{ value: r.value, cls: r.cls, name: r.label }]; const text = r.text != null ? r.text : (o.fmt ? o.fmt(tot(r)) : '');
    return `<div class="pl-hb-row"><span class="pl-hb-l">${esc(r.label)}</span><span class="pl-hb-t">${parts.map((p) => `<i class="${p.cls || 'pl-c-e'}" style="width:${Math.max(0, p.value) / max * 100}%" title="${esc(`${p.name}: ${o.fmt ? o.fmt(p.value) : p.value}`)}"></i>`).join('')}</span><span class="pl-hb-v">${esc(text)}</span></div>`; }).join('')}</div>`;
}

/* ---- one bar per phase, with its dates and the gate that closes it. Brief depth; the task chart is in Working. */
export function phaseChart(s, today) {
  const t0 = C.parseDate(s.program.startDate), t1 = C.parseDate(s.sched.endDate) + C.DAY; const pct = (dt) => Math.max(0, Math.min(100, (C.parseDate(dt) - t0) / (t1 - t0) * 100));
  const rows = s.phases.map((ph) => { const ts = s.sched.rows.filter((r) => r.phase === ph.id && !r.loe); const work = ts.filter((r) => !r.milestone); if (!work.length) return null;
    const a = work.map((r) => r.startDate).sort()[0], b = work.map((r) => r.finishDate).sort().pop(); const ms = ts.filter((r) => r.milestone).pop();
    return { name: ph.name, a, b, ms, crit: work.some((r) => r.critical), pctDone: Math.round(work.reduce((x, r) => x + r.percent, 0) / work.length) }; }).filter(Boolean);
  const now = today >= s.program.startDate && today <= s.sched.endDate ? `<i class="pl-ph-now" style="left:${pct(today)}%" title="today"></i>` : '';
  const months = []; { const d0 = new Date(t0); let m = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1); while (m < t1) { months.push(C.fmtDate(m)); const dd = new Date(m); m = Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 1); } }
  const axis = `<div class="pl-ax" aria-hidden="true">${months.map((mo) => `<span style="left:${pct(mo)}%">${mo.slice(2, 7)}</span>`).join('')}${now ? `<em style="left:${pct(today)}%">today</em>` : ''}</div>`;
  return `${axis}<ol class="pl-ph" aria-label="Phases in order, one bar each">${rows.map((r) => `<li><div class="pl-ph-h"><b>${esc(r.name)}</b><span>${esc(r.a)} to ${esc(r.b)}${r.ms ? ` · gate ${esc(r.ms.finishDate)}` : ''}</span></div><div class="pl-ph-t"><i class="pl-ph-b${r.crit ? ' pl-ph-c' : ''}" style="left:${pct(r.a)}%;width:${Math.max(1.5, pct(r.b) - pct(r.a))}%"></i>${r.ms ? `<i class="pl-ph-m" style="left:${pct(r.ms.finishDate)}%" title="${esc(r.ms.title + ', ' + r.ms.finishDate)}"></i>` : ''}${now}</div></li>`).join('')}</ol>
  <p class="pb-legend"><span><i class="pb-k pl-ph-kc"></i>dark bar: no slack, a week lost here moves the finish</span><span><i class="pb-k pl-ph-kn"></i>lighter bar: has slack</span><span><i class="pb-k pb-k-ms"></i>gate</span></p>`;
}

/* ---- H. readiness meters: [{ label, done, of, note }] */
export function meters(items) {
  return `<div class="pl-meters">${items.map((it) => { const pct = it.of ? Math.round(it.done / it.of * 100) : 0; return `<div class="pl-meter"><div class="pl-meter-h"><b>${esc(it.label)}</b><span>${it.done} of ${it.of}</span></div><div class="pl-meter-t" role="img" aria-label="${esc(`${it.label}: ${it.done} of ${it.of}`)}"><i style="width:${pct}%"></i></div><small>${esc(it.note || '')}</small></div>`; }).join('')}</div>`;
}

/* ---- J. decision timeline: one numbered mark per decision on its due date (the same numbers as the list beneath) */
export function decisionLine(list, today) {
  const rows = list.filter((r) => r.due); if (!rows.length) return '';
  const t0 = Math.min(C.parseDate(today), ...rows.map((r) => C.parseDate(r.due))) - 7 * C.DAY, t1 = Math.max(...rows.map((r) => C.parseDate(r.due))) + 10 * C.DAY;
  const W = 1000, sx = (date) => 30 + (C.parseDate(date) - t0) / (t1 - t0) * (W - 60);
  const stack = {}; let top = 1; for (const r of rows) { stack[r.due] = (stack[r.due] || 0) + 1; top = Math.max(top, stack[r.due]); }
  const base = 28 + top * 24, H = base + 50; const seen = {};
  let g = `<line x1="30" x2="${W - 30}" y1="${base}" y2="${base}" class="pl-d-axis"/>`;
  const tx = sx(today); g += `<line x1="${tx}" x2="${tx}" y1="6" y2="${base + 12}" class="pb-g-now"/><text x="${tx - 4}" y="14" text-anchor="end" class="pb-g-dt">today</text>`;
  for (const r of rows) { const cx = sx(r.due); const lvl = seen[r.due] = (seen[r.due] || 0) + 1; const cy = base - (lvl - 1) * 24; const late = !r.made && r.days < 0;
    const mark = r.made ? `<circle cx="${cx}" cy="${cy}" r="9" class="pl-d-made"/>` : late ? `<path d="M${cx} ${cy - 11} L${cx + 10} ${cy + 8} L${cx - 10} ${cy + 8} Z" class="pl-d-over"/>` : `<circle cx="${cx}" cy="${cy}" r="9" class="pl-d-open"/>`;
    g += `<g data-open="${r.kind || 'decision'}|${r.coll}|${esc(r.id)}" class="pl-d-g" tabindex="0" role="button" aria-label="${esc(`${r.n}. ${r.title}, due ${r.due}, ${r.made ? 'decided' : late ? 'late' : 'open'}`)}">${mark}<text x="${cx}" y="${cy + 4}" text-anchor="middle" class="pl-d-id">${r.n}</text><title>${esc(`${r.n}. ${r.title}: ${r.due}`)}</title></g>`; }
  let lastX = -999, low = false;
  [...new Set(rows.map((r) => r.due))].sort().forEach((dt) => { const cx = sx(dt); low = cx - lastX < 70 ? !low : false; lastX = cx; g += `<text x="${cx}" y="${base + (low ? 40 : 26)}" text-anchor="middle" class="pb-g-dt">${esc(dt.slice(2))}</text>`; });
  return `<div class="pb-scroll pl-dline"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Decisions on their due dates">${g}</svg></div>${legend([['pl-k-open', 'open circle: awaiting decision'], ['pl-k-tri', 'triangle: late'], ['pl-k-made', 'filled circle: decided']])}`;
}

/* ---- the plans on one month axis, one bar each, with the weeks that overload a person (Brief roadmap) */
export function planBars(x) {
  const { d, m } = x; const start = d.load.start; const end = d.scheds.map((s) => s.sched.endDate).sort().pop();
  const t0 = C.parseDate(start), t1 = C.parseDate(end) + 7 * C.DAY; const pct = (dt) => Math.max(0, Math.min(100, (C.parseDate(dt) - t0) / (t1 - t0) * 100));
  const months = []; { const d0 = new Date(t0); let mo = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1); while (mo < t1) { months.push(C.fmtDate(mo)); const dd = new Date(mo); mo = Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 1); } }
  const now = d.today >= start && d.today <= end ? `<i class="pl-ph-now" style="left:${pct(d.today)}%" title="today"></i>` : '';
  const waits = (id) => [...new Set((m.crossLinks || []).filter((k) => k.to.startsWith(id + ':')).map((k) => k.from.split(':')[0]))].map((from) => `<span class="pl-wait">waits for ${esc(PNAME[from])}</span>`).join(' ');
  const rows = d.scheds.map((s) => { const ms = s.sched.rows.filter((r) => r.milestone); const nx = d.byProgram[s.id].next;
    return `<li><div class="pl-ph-h"><b><a href="${s.href}">${s.n}. ${esc(s.name)}</a></b><span>${esc(s.program.startDate)} to ${esc(s.sched.endDate)}${nx ? ` · next gate: ${esc(nx.title)}, ${esc(nx.finishDate)}` : ''} ${waits(s.id)}</span></div><div class="pl-ph-t pl-ph-big"><i class="pl-ph-b ${PCOL[s.id]}" style="left:${pct(s.program.startDate)}%;width:${Math.max(1.5, pct(s.sched.endDate) - pct(s.program.startDate))}%"></i>${ms.map((r) => `<i class="pl-ph-m" style="left:${pct(r.finishDate)}%" title="${esc(r.title + ', ' + r.finishDate)}"></i>`).join('')}${now}</div></li>`; }).join('');
  const ppl = d.load.people.filter((p) => p.weeklyHours != null);
  const strip = ppl.map((p) => `<li><div class="pl-ph-h"><b>${esc(p.short)}</b><span>${d.load.totals[p.id].overWeeks} weeks over capacity</span></div><div class="pl-ph-t pl-over" role="img" aria-label="${esc(`${p.short}: ${d.load.totals[p.id].overWeeks} weeks over capacity`)}">${d.load.weeks.filter((w) => w.over[p.id]).map((w) => `<i style="left:${pct(w.date)}%;width:${Math.max(0.6, 7 * C.DAY / (t1 - t0) * 100)}%" title="${esc(`week of ${w.date}: over by ${w.over[p.id]} hours`)}"></i>`).join('')}${now}</div></li>`).join('');
  return `<div class="pl-ax" aria-hidden="true">${months.map((mo) => `<span style="left:${pct(mo)}%">${mo.slice(2, 7)}</span>`).join('')}${now ? `<em style="left:${pct(d.today)}%">today</em>` : ''}</div><ol class="pl-ph">${rows}</ol><h4 class="pl-h4">Weeks that ask more of a person than they have</h4><ol class="pl-ph">${strip}</ol>
  <p class="pb-legend"><span><i class="pb-k pb-k-ms"></i>gate</span><span><i class="pb-k pl-k-over"></i>week over capacity</span></p>`;
}
export { badge };
