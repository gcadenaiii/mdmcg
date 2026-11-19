/* Product Build: what each section of the page shows. Every function takes the present data (x.m), the figures worked out
   from it by calc.js (x.d) and returns HTML. No figure is written in this file: this code is public, the data is not. */
import * as C from './calc.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $m = C.money;
const list = (a) => (a && a.length ? a.map(esc).join(', ') : '<span class="pb-none">none</span>');
const STATUS_CLASS = { 'Planning Estimate': 'est', 'Public List Price': 'list', 'Distributor Quote': 'ok', 'Supplier Verified': 'ok', 'Actual Paid': 'ok', 'Engineering Draft': 'draft', 'Review Required': 'warn', Approved: 'ok', Conditional: 'warn', Tested: 'ok', Blocked: 'bad', 'Not Applicable': 'na', Open: 'est', 'No-go': 'bad', 'Approval not valid': 'bad', Pass: 'ok', Fail: 'bad', 'Not run': 'est', High: 'bad', Medium: 'warn', Low: 'ok', 'In place': 'ok', Partly: 'warn', Missing: 'bad', Chosen: 'ok', 'Not chosen': 'na', Fallback: 'est', 'Decision gate': 'warn', Use: 'ok', 'Trial only': 'warn', Active: 'ok', 'not stated': 'warn', Preview: 'warn', NRND: 'bad', Obsolete: 'bad', verified: 'ok', 'not verified': 'warn', reject: 'bad', warn: 'warn', info: 'est', 'On plan': 'ok', 'At risk': 'warn', 'Not started': 'est' };
export const badge = (s) => (s == null || s === '' ? '' : `<span class="pb-b pb-b-${STATUS_CLASS[s] || 'est'}">${esc(s)}</span>`);
export const LABELS = ['Planning Estimate', 'Supplier Verified', 'Engineering Draft', 'Review Required', 'Approved', 'Tested', 'Blocked', 'Not Applicable'];
const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text || 'source')}</a>` : '<span class="pb-none">no source</span>');

/** a value a person can change. c collection, id record, f field; o: { t: number|text|date|select|check, k: sub-key, opts, fmt } */
export function ed(x, c, id, f, val, o = {}) {
  const t = o.t || 'text'; const mine = x.mine(c, id, f, o.k) ? ' pb-ed-mine' : '';
  const common = `data-c="${esc(c)}" data-i="${esc(id)}" data-f="${esc(f)}" data-t="${t}"${o.k != null ? ` data-k="${esc(o.k)}"` : ''}`;
  if (t === 'check') return `<label class="pb-ck${mine}"><input type="checkbox" class="pb-edc" ${common} ${val ? 'checked' : ''}><span class="sr">${esc(o.label || f)}</span></label>`;
  const shown = o.fmt ? o.fmt(val) : (val == null || val === '' ? 'set' : val);
  return `<button type="button" class="pb-ed${mine}" ${common}${o.opts ? ` data-o="${esc(o.opts.join('|'))}"` : ''} data-v="${esc(val ?? '')}" title="Change">${esc(shown)}</button>`;
}

/** a table with a filter box, sortable headings and a CSV button. cols: [{ h, v(row) -> html, n: numeric }] */
export function tbl(id, cols, rows, o = {}) {
  const head = cols.map((c, i) => `<th scope="col"${c.n ? ' class="pb-n"' : ''}><button type="button" class="pb-sort" data-sort="${id}" data-col="${i}">${esc(c.h)}</button></th>`).join('');
  const body = rows.length ? rows.map((r) => `<tr${o.rowAttr ? ' ' + o.rowAttr(r) : ''}>${cols.map((c) => `<td${c.n ? ' class="pb-n"' : ''}>${c.v(r) ?? ''}</td>`).join('')}</tr>`).join('') : `<tr class="pb-empty"><td colspan="${cols.length}">${esc(o.empty || 'Nothing on record.')}</td></tr>`;
  const foot = o.foot ? `<tfoot><tr>${o.foot.map((c, i) => `<td${cols[i] && cols[i].n ? ' class="pb-n"' : ''}>${c ?? ''}</td>`).join('')}</tr></tfoot>` : '';
  return `<div class="pb-tw"><div class="pb-tools"><label class="sr" for="f-${id}">Filter ${esc(o.name || id)}</label><input class="pb-filter" id="f-${id}" data-filter="${id}" type="search" placeholder="Filter"><button type="button" class="pb-btn" data-csv="${id}">CSV</button></div><div class="pb-scroll"><table class="pb-t" id="t-${id}" data-name="${esc(o.name || id)}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div></div>`;
}
const tile = (n, label, sub = '') => `<div class="pb-tile"><b>${n}</b><span>${esc(label)}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
const sec = (title, body, note = '') => `<section class="pb-sec"><h3>${esc(title)}</h3>${note ? `<p class="pb-note">${note}</p>` : ''}${body}</section>`;
const ul = (items) => `<ul class="pb-ul">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const roleName = (x, id) => { const r = x.m.roles.find((q) => q.id === id); return r ? r.short : id; };
const input = (name, label, o = {}) => `<label class="pb-f"><span>${esc(label)}</span>${o.opts ? `<select name="${name}"${o.req ? ' required' : ''}>${o.opts.map((v) => `<option value="${esc(Array.isArray(v) ? v[0] : v)}">${esc(Array.isArray(v) ? v[1] : v)}</option>`).join('')}</select>` : `<input name="${name}" type="${o.type || 'text'}"${o.req ? ' required' : ''}${o.val != null ? ` value="${esc(o.val)}"` : ''}${o.step ? ` step="${o.step}"` : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.list ? ` list="${o.list}"` : ''}>`}</label>`;

/* ---------------------------------------------------------------- charts (plain SVG) */

export function gantt(x) {
  const { sched } = x.d; const prog = x.m.program;
  const order = x.m.phases.map((p) => p.id);
  const rows = [...sched.rows].sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase) || a.start - b.start || a.id.localeCompare(b.id));
  const n = Math.max(sched.endWeek, prog.durationWeeks), L = 232, W = 44, H = 26, T = 44;
  const y = new Map(rows.map((r, i) => [r.id, T + i * H]));
  const xs = (w) => L + (w - 1) * W;
  let g = '';
  for (let w = 1; w <= n; w++) {
    g += `<rect x="${xs(w)}" y="0" width="${W}" height="${T + rows.length * H}" class="${w % 2 ? 'pb-g-a' : 'pb-g-b'}"/>`;
    g += `<text x="${xs(w) + W / 2}" y="17" class="pb-g-wk" text-anchor="middle">${w}</text><text x="${xs(w) + W / 2}" y="33" class="pb-g-dt" text-anchor="middle">${C.weekStart(prog, w).slice(5)}</text>`;
  }
  let phase = null;
  for (const r of rows) {
    const yy = y.get(r.id);
    if (r.phase !== phase) { phase = r.phase; g += `<line x1="0" x2="${L + n * W}" y1="${yy}" y2="${yy}" class="pb-g-ph"/>`; }
    g += `<text x="8" y="${yy + 17}" class="pb-g-id">${esc(r.id)}</text><text x="56" y="${yy + 17}" class="pb-g-tt">${esc(r.title.length > 27 ? r.title.slice(0, 26) + '…' : r.title)}</text>`;
  }
  // dependency lines, under the bars
  for (const r of rows) for (const dep of r.deps) {
    const p = sched.byId.get(dep.id); if (!p) continue;
    const x1 = dep.type === 'SS' ? xs(p.start) : p.milestone ? xs(p.start) + W - 6 : xs(p.finish) + W - 4;
    const x2 = r.milestone ? xs(r.start) + W - 12 : xs(r.start) + 2;
    const y1 = y.get(p.id) + H / 2, y2 = y.get(r.id) + H / 2;
    const mx = dep.type === 'SS' ? Math.min(x1, x2) - 6 : Math.max(x1 + 6, Math.min(x2 - 6, x1 + 6));
    g += `<path d="M${x1} ${y1} H${mx} V${y2} H${x2}" class="pb-g-dep${p.critical && r.critical ? ' pb-g-dep-c' : ''}"/>`;
  }
  for (const r of rows) {
    const yy = y.get(r.id); const cls = r.loe ? 'loe' : r.critical ? 'crit' : 'norm';
    const sel = x.ui.task === r.id ? ' pb-g-sel' : '';
    if (r.milestone) {
      const cx = xs(r.start) + W - 12, cy = yy + H / 2;
      g += `<path d="M${cx} ${cy - 8} L${cx + 8} ${cy} L${cx} ${cy + 8} L${cx - 8} ${cy} Z" class="pb-g-ms pb-g-${cls}${sel}" data-task="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.id + ' ' + r.title + ', ' + r.finishDate)}"><title>${esc(r.id + ' ' + r.title + ' · ' + r.finishDate)}</title></path>`;
      continue;
    }
    const bx = xs(r.start) + 2, bw = (r.finish - r.start + 1) * W - 4;
    if (r.slipWeeks > 0) g += `<rect x="${xs(r.plannedStart) + 2}" y="${yy + 19}" width="${r.len * W - 4}" height="3" class="pb-g-plan"/>`;
    g += `<rect x="${bx}" y="${yy + 6}" width="${bw}" height="13" rx="6.5" class="pb-g-bar pb-g-${cls}${r.overdue ? ' pb-g-over' : ''}${sel}" data-task="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(`${r.id} ${r.title}, ${r.startDate} to ${r.finishDate}, ${r.percent} percent complete`)}"><title>${esc(`${r.id} ${r.title} · ${r.startDate} to ${r.finishDate} · ${r.percent}%`)}</title></rect>`;
    if (r.percent > 0) g += `<rect x="${bx}" y="${yy + 6}" width="${Math.max(6, bw * Math.min(100, r.percent) / 100)}" height="13" rx="6.5" class="pb-g-done" pointer-events="none"/>`;
  }
  if (x.d.nowWeek >= 1 && x.d.nowWeek <= n) { const tx = xs(x.d.nowWeek) + ((new Date(x.d.today).getUTCDay() + 6) % 7) * W / 7; g += `<line x1="${tx}" x2="${tx}" y1="${T - 6}" y2="${T + rows.length * H}" class="pb-g-now"/><text x="${tx + 4}" y="${T - 8}" class="pb-g-dt">today</text>`; }
  const w = L + n * W, h = T + rows.length * H + 6;
  return `<div class="pb-scroll pb-gantt"><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Schedule chart: ${rows.length} tasks and milestones over ${n} weeks">${g}</svg></div>
  <p class="pb-legend"><span><i class="pb-k pb-k-crit"></i>critical path</span><span><i class="pb-k pb-k-norm"></i>has slack</span><span><i class="pb-k pb-k-loe"></i>runs throughout</span><span><i class="pb-k pb-k-ms"></i>stop/go milestone</span><span><i class="pb-k pb-k-done"></i>complete</span><span><i class="pb-k pb-k-plan"></i>planned position when a task has slipped</span></p>`;
}

function bars(rows, o) {  // grouped vertical bars: rows [{ label, a, b }], plus an optional line (cumulative)
  const W = Math.max(520, rows.length * 44 + 60), H = 220, L = 54, B = 28, T = 12;
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b, o.cap || 0]));
  const sy = (v) => T + (H - T - B) * (1 - v / max), bw = (W - L - 8) / rows.length;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; g += `<line x1="${L}" x2="${W}" y1="${sy(v)}" y2="${sy(v)}" class="pb-c-grid"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" class="pb-c-ax">${esc(o.fmt(v))}</text>`; }
  rows.forEach((r, i) => {
    const x0 = L + i * bw;
    g += `<rect x="${x0 + bw * 0.12}" y="${sy(r.a)}" width="${bw * 0.36}" height="${Math.max(0, H - B - sy(r.a))}" class="pb-c-a${r.over ? ' pb-c-over' : ''}"><title>${esc(`${o.unit} ${r.label}: ${o.aName} ${o.fmt(r.a)}`)}</title></rect>`;
    g += `<rect x="${x0 + bw * 0.52}" y="${sy(r.b)}" width="${bw * 0.36}" height="${Math.max(0, H - B - sy(r.b))}" class="pb-c-b"><title>${esc(`${o.unit} ${r.label}: ${o.bName} ${o.fmt(r.b)}`)}</title></rect>`;
    g += `<text x="${x0 + bw / 2}" y="${H - 9}" text-anchor="middle" class="pb-c-ax">${esc(r.label)}</text>`;
  });
  if (o.cap) g += `<line x1="${L}" x2="${W}" y1="${sy(o.cap)}" y2="${sy(o.cap)}" class="pb-c-cap"/><text x="${W - 4}" y="${sy(o.cap) - 5}" text-anchor="end" class="pb-c-ax">${esc(o.capName)}</text>`;
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label)}">${g}</svg></div><p class="pb-legend"><span><i class="pb-k pb-k-a"></i>${esc(o.aName)}</span><span><i class="pb-k pb-k-b"></i>${esc(o.bName)}</span>${o.cap ? `<span><i class="pb-k pb-k-cap"></i>${esc(o.capName)}</span>` : ''}</p>`;
}
const kfmt = (v) => (v >= 1000 ? '$' + (Math.round(v / 100) / 10) + 'k' : '$' + Math.round(v));

function stacked(rows) {  // horizontal stacked bars for the scenarios
  const max = Math.max(1, ...rows.map((r) => r.total)), W = 720, L = 150, bh = 30;
  const parts = [['labour', 'Labor'], ['hardware', 'Hardware'], ['software', 'Software and cloud'], ['external', 'External review'], ['contingency', 'Contingency']];
  let g = '';
  rows.forEach((r, i) => {
    let x0 = L; const yy = 8 + i * (bh + 14);
    g += `<text x="0" y="${yy + 20}" class="pb-c-lab">${esc(r.name)}</text>`;
    parts.forEach(([k, name], j) => { const w = (W - L - 80) * r[k] / max; g += `<rect x="${x0}" y="${yy}" width="${Math.max(0, w)}" height="${bh}" class="pb-s-${j}"><title>${esc(`${r.name}: ${name} ${$m(r[k])}`)}</title></rect>`; x0 += w; });
    g += `<text x="${x0 + 8}" y="${yy + 20}" class="pb-c-lab">${esc($m(r.total))}</text>`;
  });
  const H = rows.length * (bh + 14) + 8;
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Scenario totals by cost category">${g}</svg></div><p class="pb-legend">${parts.map(([, name], j) => `<span><i class="pb-k pb-s-${j}"></i>${esc(name)}</span>`).join('')}</p>`;
}

function archDiagram(x) {
  const nodes = [['Device', 0, 0], ['Recording tool', 1, 0], ['Ingestion', 2, 0], ['Raw store', 3, 0], ['Metadata store', 3, 1], ['Processing', 4, 0], ['Derived store', 5, 0], ['Heart Twin', 6, 0]];
  const bw = 118, bh = 46, gx = 26, gy = 30, ox = 12, oy = 46;
  const pos = new Map(nodes.map(([n, c, r]) => [n, { x: ox + c * (bw + gx), y: oy + r * (bh + gy) }]));
  let g = `<defs><marker id="pb-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" class="pb-a-head"/></marker></defs>`;
  const zone = (label, c0, c1, cls) => { const x0 = ox + c0 * (bw + gx) - 8, w = (c1 - c0 + 1) * (bw + gx) - gx + 16; return `<rect x="${x0}" y="14" width="${w}" height="${oy + 2 * (bh + gy) - 18}" rx="14" class="pb-a-zone ${cls}"/><text x="${x0 + 10}" y="32" class="pb-a-zl">${esc(label)}</text>`; };
  g += zone('Bench', 0, 1, 'pb-a-z1') + zone('Recordings store (proof of concept: synthetic data only)', 2, 5, 'pb-a-z2') + zone('Analysis', 6, 6, 'pb-a-z3');
  for (const f of x.m.flows) { const a = pos.get(f.from), b = pos.get(f.to); if (!a || !b) continue; const same = a.y === b.y;
    g += same ? `<path d="M${a.x + bw} ${a.y + bh / 2} H${b.x - 3}" class="pb-a-ln" marker-end="url(#pb-arr)"><title>${esc(f.text)}</title></path>` : `<path d="M${a.x + bw / 2} ${a.y + bh} V${b.y + bh / 2} H${b.x - 3}" class="pb-a-ln" marker-end="url(#pb-arr)"><title>${esc(f.text)}</title></path>`; }
  for (const [n] of nodes) { const p = pos.get(n); g += `<rect x="${p.x}" y="${p.y}" width="${bw}" height="${bh}" rx="10" class="pb-a-box"/><text x="${p.x + bw / 2}" y="${p.y + bh / 2 + 5}" text-anchor="middle" class="pb-a-t">${esc(n)}</text>`; }
  const W = ox * 2 + 7 * (bw + gx) - gx, H = oy + 2 * (bh + gy);
  return `<div class="pb-scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Data flow from the device to the Heart Twin software">${g}</svg></div>`;
}

/* ---------------------------------------------------------------- A. overview */

export function overview(x) {
  const { m, d } = x; const b = d.bud; const g = d.gates.current;
  const top = [...m.risks].map((r) => ({ ...r, level: C.riskLevel(r.severity, r.probability), score: r.severity * r.probability })).sort((p, q) => q.score - p.score).slice(0, 5);
  const attention = [];
  if (d.sched.errors.length) attention.push(...d.sched.errors.map((e) => `Schedule: ${esc(e)}`));
  if (d.load.conflicts.length) attention.push(`${d.load.conflicts.length} week${d.load.conflicts.length > 1 ? 's' : ''} where a person is planned over their hours (Resource and labor)`);
  if (d.sched.overdue.length) attention.push(`Overdue: ${list(d.sched.overdue)}`);
  if (d.sched.slipped.length) attention.push(`Pushed later by a dependency: ${list(d.sched.slipped)}`);
  if (d.sched.endWeek > m.program.durationWeeks) attention.push(`The schedule ends in week ${d.sched.endWeek}, beyond the program's ${m.program.durationWeeks} weeks`);
  if (d.bom.lifecycleWarnings) attention.push(`${d.bom.lifecycleWarnings} selected part${d.bom.lifecycleWarnings > 1 ? 's' : ''} with a lifecycle warning (Hardware and BOM)`);
  attention.push(`${m.decisions.filter((q) => !q.decision).length} of ${m.decisions.length} decisions await the director (Decisions and stage gates)`);
  attention.push(`${d.trace.gaps.length} traceability links are open: no test has evidence yet (Requirements and traceability)`);
  attention.push(`${b.unverifiedLines} of ${b.items.length} cost lines are planning estimates, not quotations`);
  return `
  <div class="pb-tiles">
    ${tile($m(b.total), 'Planning total', `${$m(b.direct)} direct + ${b.contingencyPct}% contingency`)}
    ${tile(esc(d.sched.endDate), 'Projected completion', `week ${d.sched.endWeek} of ${m.program.durationWeeks}; starts ${esc(m.program.startDate)}`)}
    ${tile(badge(d.status), 'Overall status', esc(d.statusWhy))}
    ${tile(esc(g ? g.id : 'All approved'), 'Current gate', g ? esc(g.title) + ' ' + badge(g.status) : '')}
    ${tile($m(d.spendActual), 'Spend to date', `planned to date ${$m(d.spendPlanned)}`)}
    ${tile(`${b.labour.hours} h`, 'Staffing', m.roles.map((r) => `${esc(r.short)} ${r.weeklyHours} h/week`).join(' · '))}
  </div>
  <p class="pb-actions"><button type="button" class="pb-btn" data-act="print">Print this summary</button></p>
  ${sec('Needs attention', ul(attention))}
  ${sec('Budget', tbl('ov-budget', [{ h: 'Category', v: (r) => esc(r[0]) }, { h: 'Amount', n: 1, v: (r) => $m(r[1]) }, { h: 'Basis', v: (r) => r[2] }], [
    ['A. Internal labor', b.labour.cost, `${b.labour.hours} hours, rate times weekly hours times weeks`],
    ['B. Hardware, components, fixtures and fabrication', b.hardware, badge('Planning Estimate')],
    ['C. Software, AI tools and cloud', b.software, `${badge('Planning Estimate')} bottom-up from list prices: ${$m(d.stack.total)}`],
    ['D. External specialist services', b.external, badge('Planning Estimate')],
    ['Direct expenses', b.direct, ''], [`Contingency (${b.contingencyPct}%)`, b.contingency, 'Shown apart from direct expenses'], ['Planning total', b.total, ''],
  ], { name: 'budget summary' }))}
  ${sec('Stop/go gates', `<ol class="pb-gates">${d.gates.rows.map((q) => `<li class="${g && q.id === g.id ? 'cur' : ''}"><b>${esc(q.id)}</b><span>${esc(q.title)}</span>${badge(q.status)}<small>${esc(C.finishOf(d.sched, q.milestone) || '')}</small></li>`).join('')}</ol>`)}
  ${sec('Major risks', tbl('ov-risks', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Risk', v: (r) => esc(r.hazard) }, { h: 'Kind', v: (r) => esc(r.kind) }, { h: 'Before controls', v: (r) => badge(r.level) }, { h: 'With controls', v: (r) => badge(C.riskLevel(r.residualSeverity, r.residualProbability)) }], top, { name: 'major risks' }), 'The team\'s own estimates. None has been reviewed.')}
  ${sec('Program charter', `<p>${esc(m.program.objective)}</p><p><b>Critical gate.</b> ${esc(m.program.criticalGate)}</p><p>${esc(m.program.value)}</p>${ul(m.program.boundaries.map(esc))}<p class="pb-note">${esc(m.program.calendarNote)}</p>`)}`;
}

/* ---------------------------------------------------------------- B. timeline */

function taskPanel(x, id) {
  const { m, d } = x; const t = m.tasks.find((q) => q.id === id); const r = d.sched.byId.get(id); if (!t || !r) return '';
  const rate = Object.fromEntries(m.roles.map((q) => [q.id, q.rate]));
  const est = m.roles.reduce((s, q) => s + C.taskHours(m.program, t, q.id) * q.rate, 0), act = m.roles.reduce((s, q) => s + (t.actualHours[q.id] || 0) * rate[q.id], 0);
  const exp = (t.expense || []).map((e) => m.lines.find((l) => l.id === e)).filter(Boolean);
  const row = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
  return `<div class="pb-panel" id="pb-task"><div class="pb-panel-h"><h4>${esc(t.id)} ${esc(t.title)}</h4><button type="button" class="pb-btn" data-act="close-task">Close</button></div>
  ${t.description ? `<p>${esc(t.description)}</p>` : ''}
  <dl class="pb-dl">
    ${row('Owner', ed(x, 'tasks', id, 'owner', t.owner, { t: 'select', opts: m.roles.map((q) => q.id), fmt: (v) => roleName(x, v) }))}
    ${row('Planned start week', ed(x, 'tasks', id, 'week', t.week, { t: 'number' }))}
    ${t.milestone ? '' : row('Length, weeks', ed(x, 'tasks', id, 'weeks', t.weeks, { t: 'number' }))}
    ${row('Forecast', `${esc(r.startDate)} to ${esc(r.finishDate)}${r.slipWeeks ? ` (pushed ${r.slipWeeks} week${r.slipWeeks > 1 ? 's' : ''} by ${esc(r.drivenBy)})` : ''}`)}
    ${row('Slack', r.loe ? 'runs throughout' : r.critical ? 'none: on the critical path' : `${r.float} week${r.float > 1 ? 's' : ''}`)}
    ${row('Depends on', ed(x, 'tasks', id, 'deps', C.fmtDeps(t.deps), { t: 'deps', fmt: (v) => v || 'nothing' }))}
    ${t.milestone ? '' : m.roles.map((q) => row(`Estimated hours, ${q.short}`, ed(x, 'tasks', id, 'hours', t.hours[q.id], { t: 'number', k: q.id }))).join('')}
    ${t.milestone ? '' : row('Logged hours', m.roles.map((q) => `${esc(q.short)} ${t.actualHours[q.id] || 0}`).join(' · '))}
    ${t.milestone ? '' : row('Labor cost', `estimated ${$m(C.round2(est))} · logged ${$m(C.round2(act))}`)}
    ${row('Percent complete', ed(x, 'tasks', id, 'percent', t.percent, { t: 'number' }))}
    ${row('Status', ed(x, 'tasks', id, 'status', t.status, { t: 'select', opts: LABELS }))}
    ${row('Approval authority', esc(roleName(x, t.approval)))}
    ${row('Deliverables', list(t.deliverables))}
    ${row('Linked risks', list(t.risks))}
    ${row('Expenses', exp.length ? exp.map((l) => `${esc(l.id)} ${esc(l.title)}: estimated ${$m(l.amount)}, actual ${$m(l.actual || 0)}`).join('<br>') : '<span class="pb-none">none</span>')}
    ${row('Evidence', list(m.evidence.filter((e) => e.task === id).map((e) => e.id)))}
    ${t.gate ? row('Gate', esc(t.gate)) : ''}
    ${t.external ? row('Outside review', esc(t.external)) : ''}
  </dl></div>`;
}

export function timeline(x) {
  const { m, d } = x; const s = d.sched;
  const crit = s.rows.filter((r) => r.critical);
  const ms = s.rows.filter((r) => r.milestone);
  return `
  <div class="pb-controls">
    <span>Program start ${ed(x, 'program', '_', 'startDate', m.program.startDate, { t: 'date' })}</span>
    <span>Length ${ed(x, 'program', '_', 'durationWeeks', m.program.durationWeeks, { t: 'number' })} weeks</span>
    <span>Forecast finish <b>${esc(s.endDate)}</b></span>
  </div>
  <p class="pb-note">Change the start or the length and every date, hour and cost on the page is worked out again. Select a bar to open the task. ${esc(m.program.calendarNote)}</p>
  ${s.errors.length ? `<p class="pb-alert">${s.errors.map(esc).join('<br>')}</p>` : ''}
  ${gantt(x)}
  ${x.ui.task ? taskPanel(x, x.ui.task) : ''}
  ${sec('Critical path', `<p>${crit.map((r) => `<button type="button" class="pb-link" data-task="${esc(r.id)}">${esc(r.id)}</button>`).join(' → ')}</p><p class="pb-note">These ${crit.length} items have no slack. A week lost on any of them moves the final decision by a week. Earliest prototype milestone: <b>${esc(C.finishOf(s, 'M-5') || 'not scheduled')}</b> (prototype bring-up acceptance).</p>`)}
  ${sec('Stop/go milestones', tbl('ms', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Milestone', v: (r) => esc(r.title) }, { h: 'Date', v: (r) => esc(r.finishDate) }, { h: 'Week', n: 1, v: (r) => r.start }, { h: 'Gate', v: (r) => { const g = d.gates.rows.find((q) => q.milestone === r.id); return g ? esc(g.id) + ' ' + badge(g.status) : ''; } }, { h: 'Slack, weeks', n: 1, v: (r) => r.float }], ms, { name: 'milestones' }))}
  ${sec('All tasks', tbl('tasks', [
    { h: 'Id', v: (r) => `<button type="button" class="pb-link" data-task="${esc(r.id)}">${esc(r.id)}</button>` }, { h: 'Task', v: (r) => esc(r.title) }, { h: 'Phase', v: (r) => esc(r.phase) }, { h: 'Owner', v: (r) => esc(roleName(x, r.owner)) },
    { h: 'Start', v: (r) => esc(r.startDate) }, { h: 'Finish', v: (r) => esc(r.finishDate) },
    ...m.roles.map((q) => ({ h: `Est. h ${q.short}`, n: 1, v: (r) => C.taskHours(m.program, m.tasks.find((t) => t.id === r.id), q.id) || '' })),
    { h: 'Logged h', n: 1, v: (r) => { const t = m.tasks.find((q) => q.id === r.id); return (t.actualHours.A || 0) + (t.actualHours.B || 0) || ''; } },
    { h: 'Labor cost', n: 1, v: (r) => { const t = m.tasks.find((q) => q.id === r.id); const c = m.roles.reduce((a, q) => a + C.taskHours(m.program, t, q.id) * q.rate, 0); return c ? $m(C.round2(c)) : ''; } },
    { h: 'Depends on', v: (r) => esc(C.fmtDeps(r.deps)) }, { h: '%', n: 1, v: (r) => ed(x, 'tasks', r.id, 'percent', r.percent, { t: 'number' }) },
    { h: 'Slack', n: 1, v: (r) => (r.loe ? '' : r.float) }, { h: 'Flags', v: (r) => [r.critical ? badge('critical') : '', r.overdue ? badge('Blocked').replace('Blocked', 'overdue') : '', r.slipWeeks ? `<span class="pb-b pb-b-warn">+${r.slipWeeks} wk</span>` : ''].join(' ') },
    { h: 'Status', v: (r) => badge(m.tasks.find((q) => q.id === r.id).status) },
  ], s.rows, { name: 'tasks' }))}`;
}

/* ---------------------------------------------------------------- C. people and hours */

export function resources(x) {
  const { m, d } = x; const lab = d.bud.labour;
  const ext = m.tasks.filter((t) => t.external);
  return `
  ${sec('Roles', tbl('roles', [{ h: 'Role', v: (r) => esc(r.name) }, { h: 'Rate, $/h', n: 1, v: (r) => ed(x, 'roles', r.id, 'rate', r.rate, { t: 'number' }) }, { h: 'Hours a week', n: 1, v: (r) => ed(x, 'roles', r.id, 'weeklyHours', r.weeklyHours, { t: 'number' }) }, { h: 'Weeks', n: 1, v: () => lab.rows[0].weeks },
    { h: 'Budget hours', n: 1, v: (r) => lab.rows.find((q) => q.id === r.id).hours }, { h: 'Budget cost', n: 1, v: (r) => $m(lab.rows.find((q) => q.id === r.id).cost) },
    { h: 'Hours placed in tasks', n: 1, v: (r) => d.load.totals[r.id].planned }, { h: 'Use', n: 1, v: (r) => Math.round(d.load.totals[r.id].utilisation * 100) + '%' }, { h: 'Not yet placed', n: 1, v: (r) => d.load.totals[r.id].unallocated }, { h: 'Logged', n: 1, v: (r) => d.load.totals[r.id].actual }],
  m.roles, { name: 'roles', foot: ['Total', '', '', '', lab.hours, $m(lab.cost), '', '', '', ''] }),
  'The labor budget is rate times weekly hours times weeks. Hours placed in tasks are checked against it and never added to it, so no hour is counted twice. Change a rate or the weekly hours and the budget, the load and every scenario follow.')}
  ${sec('Hours by week', bars(d.load.weeks.map((w) => ({ label: String(w.week), a: w.hours.A || 0, b: w.hours.B || 0, over: w.over.A > 0 })), { fmt: (v) => Math.round(v) + ' h', unit: 'Week', aName: roleName(x, 'A'), bName: roleName(x, 'B'), cap: (m.roles.find((r) => r.id === 'A') || {}).weeklyHours, capName: `${roleName(x, 'A')} weekly hours`, label: 'Planned hours by week for each role' }))}
  ${sec('Workload conflicts', d.load.conflicts.length ? tbl('conf', [{ h: 'Week', n: 1, v: (r) => r.week }, { h: 'Role', v: (r) => esc(roleName(x, r.role)) }, { h: 'Planned h', n: 1, v: (r) => r.hours }, { h: 'Available h', n: 1, v: (r) => r.capacity }, { h: 'Over by', n: 1, v: (r) => r.over }, { h: 'Tasks that week', v: (r) => list(r.tasks) }], d.load.conflicts, { name: 'workload conflicts' }) : '<p>No week asks more of a person than their weekly hours. The plan is achievable by two people on hours alone; it leaves little reserve on the critical path.</p>')}
  ${sec('Work that needs someone outside the team', ul(ext.map((t) => `<b>${esc(t.id)}</b> ${esc(t.external)}`).concat(['The director is not assumed to be an independent verifier in every discipline. Analogue design, safety and regulatory questions each need a qualified outside reader (risk R-14, decision D-06).'])))}
  ${sec('Log hours', `<form class="pb-form" data-add="hoursLog">${input('week', 'Week', { type: 'number', req: 1, min: 1, val: Math.max(1, d.nowWeek) })}${input('role', 'Role', { opts: m.roles.map((r) => [r.id, r.short]) })}${input('task', 'Task', { opts: [['', 'not tied to a task'], ...m.tasks.filter((t) => !t.milestone).map((t) => [t.id, t.id + ' ' + t.title])] })}${input('hours', 'Hours', { type: 'number', req: 1, step: '0.25', min: 0 })}<button class="pb-btn" type="submit">Add</button></form>`
    + tbl('hours', [{ h: 'Week', n: 1, v: (r) => r.week }, { h: 'Role', v: (r) => esc(roleName(x, r.role)) }, { h: 'Task', v: (r) => esc(r.task || '') }, { h: 'Hours', n: 1, v: (r) => r.hours }, { h: 'Entered by', v: (r) => esc(r.by || '') }, { h: 'Entered', v: (r) => esc((r.at || '').slice(0, 10)) }, { h: '', v: (r) => `<button type="button" class="pb-link" data-del="hoursLog" data-id="${esc(r.id)}">remove</button>` }], m.hoursLog, { name: 'hours log', empty: 'No hours logged yet.' }))}
  ${sec('Weekly cost, planned against actual', bars(d.spend.map((w) => ({ label: String(w.week), a: w.planned, b: w.actual })), { fmt: kfmt, unit: 'Week', aName: 'Planned', bName: 'Actual', label: 'Planned and actual spending by week' })
    + tbl('spend', [{ h: 'Week', n: 1, v: (r) => r.week }, { h: 'Starts', v: (r) => esc(r.date) }, { h: 'Planned labor', n: 1, v: (r) => $m(r.plannedLabour) }, { h: 'Planned other', n: 1, v: (r) => $m(r.plannedOther) }, { h: 'Planned total', n: 1, v: (r) => $m(r.planned) }, { h: 'Actual labor', n: 1, v: (r) => $m(r.actualLabour) }, { h: 'Actual other', n: 1, v: (r) => $m(r.actualOther) }, { h: 'Actual total', n: 1, v: (r) => $m(r.actual) }, { h: 'Planned to date', n: 1, v: (r) => $m(r.cumPlanned) }, { h: 'Actual to date', n: 1, v: (r) => $m(r.cumActual) }], d.spend, { name: 'weekly spending' }),
  'Planned labor follows the hours placed in tasks, so its total is below the labor budget by the hours not yet placed. Actual labor comes from the hours log; actual purchases from the cost lines.')}
  ${sec('Duties', m.roles.map((r) => `<p><b>${esc(r.name)}</b></p>${ul(r.duties.map(esc))}`).join(''))}`;
}

/* ---------------------------------------------------------------- D. hardware and parts */

const lineCols = (x) => [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Line', v: (r) => esc(r.title) }, { h: 'Amount', n: 1, v: (r) => ed(x, 'lines', r.id, 'amount', r.amount, { t: 'number', fmt: $m }) }, { h: 'Basis', v: (r) => ed(x, 'lines', r.id, 'kind', r.kind, { t: 'select', opts: C.PRICE_KINDS }) }, { h: 'Planned week', n: 1, v: (r) => ed(x, 'lines', r.id, 'week', r.week, { t: 'number', fmt: (v) => v || 'spread' }) }, { h: 'Actual paid', n: 1, v: (r) => ed(x, 'lines', r.id, 'actual', r.actual, { t: 'number', fmt: $m }) }, { h: 'Paid in week', n: 1, v: (r) => ed(x, 'lines', r.id, 'actualWeek', r.actualWeek, { t: 'number', fmt: (v) => v || 'set' }) }, { h: 'Source', v: (r) => esc(r.source) }, { h: 'Note', v: (r) => ed(x, 'lines', r.id, 'note', r.note, { fmt: (v) => v || 'add a note' }) }];

function partPanel(x, id) {
  const p = x.m.parts.find((q) => q.id === id); if (!p) return '';
  const al = C.partAlerts(p);
  const specs = Object.entries(p.key_specs || {}).filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  return `<div class="pb-panel" id="pb-part"><div class="pb-panel-h"><h4>${esc(p.id)} ${esc(p.manufacturer)} ${esc(p.mpn)}</h4><button type="button" class="pb-btn" data-act="close-part">Close</button></div>
  <p>${esc(p.description)}</p>
  <dl class="pb-dl">${specs}
    <div><dt>Datasheet</dt><dd>${link(p.datasheet_url, 'datasheet')} ${esc(p.datasheet_rev || 'revision not read')}</dd></div>
    <div><dt>Lifecycle</dt><dd>${badge(p.lifecycle_status || 'not stated')} ${link(p.lifecycle_source_url)}</dd></div>
    <div><dt>Longevity commitment</dt><dd>${esc(p.longevity_programme || 'none found')}</dd></div>
    <div><dt>Discontinuation notice</dt><dd>${esc(p.discontinuation_notice || 'none found')}</dd></div>
    <div><dt>Second source</dt><dd>${esc(p.second_source || 'none documented')}</dd></div>
    <div><dt>Substitute on the same footprint</dt><dd>${esc(p.footprint_compatible_substitute || 'none documented')}</dd></div>
    <div><dt>Package</dt><dd>${esc(p.package || 'not read')}</dd></div>
    <div><dt>Temperature range</dt><dd>${esc(p.temp_range || 'not read')}</dd></div>
    <div><dt>RoHS and REACH</dt><dd>${esc(p.rohs_reach || 'not read')}</dd></div>
    <div><dt>Magnetic note</dt><dd>${esc(p.magnetic_note || 'none')}</dd></div>
    <div><dt>Read on a primary page</dt><dd>${list(p.verified_fields)}</dd></div>
    <div><dt>Not verified</dt><dd>${list(p.unverified_fields)}</dd></div>
    <div><dt>Notes</dt><dd>${esc(p.notes || '')}</dd></div>
  </dl>
  ${tbl('chan', [{ h: 'Seller', v: (c) => link(c.url, c.seller) }, { h: 'Authorised', v: (c) => (c.authorised == null ? 'not stated' : c.authorised ? 'yes' : 'no') }, { h: 'Stock', n: 1, v: (c) => c.stock ?? 'not read' }, ...[1, 10, 100, 1000].map((q) => ({ h: `$ at ${q}`, n: 1, v: (c) => (c.price_usd && c.price_usd[q] != null ? $m(c.price_usd[q]) : 'not read') })), { h: 'Minimum order', n: 1, v: (c) => c.moq ?? 'not read' }, { h: 'Lead time', v: (c) => esc(c.lead_time || 'not read') }, { h: 'Read', v: (c) => esc(c.read_at || '') }, { h: 'From', v: (c) => esc(c.source_kind || '') }], p.channels || [], { name: `supply channels ${p.id}`, empty: 'No supply channel on record.' })}
  ${al.length ? ul(al.map((a) => `${badge(a.level)} ${esc(a.text)}`)) : '<p>No warning.</p>'}</div>`;
}

export function hardware(x) {
  const { m, d } = x; const h = d.bom;
  const fn = [...new Map(m.parts.map((p) => [p.function, p.function_name])).entries()];
  const shown = m.parts.filter((p) => !x.ui.partFn || p.function === x.ui.partFn);
  return `
  ${sec('Hardware budget', tbl('hw', lineCols(x), m.lines.filter((l) => l.category === 'hardware'), { name: 'hardware budget', foot: ['', 'Subtotal', $m(d.bud.hardware), '', '', $m(m.lines.filter((l) => l.category === 'hardware').reduce((s, l) => s + (Number(l.actual) || 0), 0)), '', '', ''] }), 'Allowances from the program brief. A line stays a Planning Estimate until someone sets its basis to a quotation or an amount paid.')}
  ${sec('Parts list health', `<div class="pb-tiles">${tile(`${h.selected}`, 'Parts proposed for the design', `${h.candidates} candidates on record`)}${tile(`${h.active}`, 'Listed Active by the maker')}${tile(`${h.multiChannel}`, 'With two or more supply channels')}${tile(`${h.leadExceptions}`, 'Lead time over the four-week target')}${tile(`${h.singleSourceCritical}`, 'Critical parts with one channel or none')}${tile(`${h.lifecycleWarnings}`, 'Lifecycle or discontinuation warnings')}${tile(`${h.unverified}`, 'With lifecycle or price not verified')}</div>`,
  'Lifecycle and stock are judged apart: an Active part with nothing in stock is a stock warning only. Active at a distributor is not a promise of future supply and says nothing about suitability for medical use.')}
  ${sec('Cost of the proposed parts', tbl('bomcost', [{ h: 'Devices built', n: 1, v: (r) => r.qty }, { h: 'Parts cost per device', n: 1, v: (r) => $m(r.perDevice) }, { h: 'Parts cost of the build', n: 1, v: (r) => $m(r.build) }, { h: 'Parts with no price at this quantity', v: (r) => (r.missing.length ? `${r.missing.length}: ${list(r.missing)}` : 'none') }, { h: 'Reading', v: (r) => (r.complete ? 'complete' : '<span class="pb-b pb-b-warn">a floor, not a total</span>') }], d.bomCost, { name: 'parts cost by quantity' }),
  'Only prices read on a seller or maker page are used. Where a part has no price the figure is a floor: the true cost is higher. Quantities per device are one of each until the architecture sets them. Board fabrication, assembly, enclosure and test are not in these figures.')}
  ${sec('Sourcing and lifecycle', `<div class="pb-controls"><label>Function <select data-ui="partFn"><option value="">all</option>${fn.map(([k, n]) => `<option value="${esc(k)}"${x.ui.partFn === k ? ' selected' : ''}>${esc(k)}. ${esc(n)}</option>`).join('')}</select></label></div>`
    + tbl('parts', [{ h: 'Id', v: (p) => `<button type="button" class="pb-link" data-part="${esc(p.id)}">${esc(p.id)}</button>` }, { h: 'In design', v: (p) => ed(x, 'parts', p.id, 'selected', p.selected, { t: 'check', label: 'in design' }) }, { h: 'Function', v: (p) => esc(p.function_name) }, { h: 'Role', v: (p) => esc(p.role) }, { h: 'Maker', v: (p) => esc(p.manufacturer) }, { h: 'Part number', v: (p) => esc(p.mpn) }, { h: 'Lifecycle', v: (p) => badge(p.lifecycle_status || 'not stated') },
      { h: 'Channels', n: 1, v: (p) => C.supplyChannels(p).length }, { h: 'Stock', n: 1, v: (p) => { const s = (p.channels || []).map((c) => Number(c.stock)).filter((n) => n > 0); return s.length ? Math.max(...s) : 'not read'; } }, { h: '$ at 1', n: 1, v: (p) => { const b = C.bestPrice(p, 1); return b ? $m(b.price) : 'not read'; } }, { h: '$ at 100', n: 1, v: (p) => { const b = C.bestPrice(p, 100); return b ? $m(b.price) : 'not read'; } },
      { h: 'Lead time', v: (p) => esc((C.supplyChannels(p).map((c) => c.lead_time).filter(Boolean)[0]) || 'not read') }, { h: 'Substitute', v: (p) => esc(p.second_source || p.footprint_compatible_substitute || 'none') }, { h: 'Per device', n: 1, v: (p) => ed(x, 'parts', p.id, 'qty_per_device', p.qty_per_device, { t: 'number' }) },
      { h: 'Warnings', v: (p) => C.partAlerts(p).filter((a) => a.level !== 'info').map((a) => `<span class="pb-b pb-b-${a.level === 'reject' ? 'bad' : 'warn'}" title="${esc(a.text)}">${esc(a.code)}</span>`).join(' ') }, { h: 'Engineering status', v: (p) => ed(x, 'parts', p.id, 'approval', p.approval, { t: 'select', opts: LABELS }) }],
    shown, { name: 'sourcing and lifecycle', empty: 'No part on record.' })
    + (x.ui.part ? partPanel(x, x.ui.part) : ''),
  `Web research read on ${esc(m.meta.researchReadOn.parts || 'no date')}. Select a part id for its sellers, prices, sources and what could not be verified. "In design" is a first proposal for the developer to confirm at the architecture review; no part is approved.`)}
  ${m.partsNotes ? `<p class="pb-note">${esc(m.partsNotes)}</p>` : ''}
  ${m.partFlags.length ? sec('Selection flags from the research', tbl('flags', [{ h: 'Part', v: (f) => esc(f.part_id) }, { h: 'Flag', v: (f) => esc(f.flag) }, { h: 'Detail', v: (f) => esc(f.detail) }], m.partFlags, { name: 'selection flags' })) : ''}
  ${m.partsNotFound.length ? sec('Could not be found or verified', ul(m.partsNotFound.map(esc))) : ''}
  ${sec('End-of-life plan', tbl('eol', [{ h: 'Topic', v: (r) => esc(r.topic) }, { h: 'Plan', v: (r) => esc(r.text) }], m.eolPlan, { name: 'end-of-life plan' }), 'A plan. Nothing in it has been carried out.')}`;
}

/* ---------------------------------------------------------------- E. software and cloud */

export function software(x) {
  const { m, d } = x; const s = d.stack; const allow = d.bud.software;
  const cloud = s.rows.filter((r) => r.chosen && String(r.tool).startsWith('lightsail'));
  const cloudMonth = cloud.reduce((a, r) => a + (r.cost || 0) / (r.months || 1), 0);
  const cats = [...new Set(m.tools.map((t) => t.category))];
  const tools = m.tools.filter((t) => !x.ui.toolCat || t.category === x.ui.toolCat);
  return `
  ${sec('Budget line', tbl('sw', lineCols(x), m.lines.filter((l) => l.category === 'software'), { name: 'software budget' }))}
  ${sec('Stack and what it costs', tbl('stack', [{ h: 'Take', v: (r) => ed(x, 'stack', r.id, 'chosen', r.chosen, { t: 'check', label: 'take' }) }, { h: 'Tool', v: (r) => esc(r.name) }, { h: 'Plan', v: (r) => esc(r.plan || '') }, { h: 'Unit price', n: 1, v: (r) => (r.unit == null ? 'not stated' : $m(r.unit)) }, { h: 'Per', v: (r) => esc(r.unitText || '') }, { h: 'Seats or units', n: 1, v: (r) => ed(x, 'stack', r.id, 'qty', r.qty, { t: 'number' }) }, { h: 'Months', n: 1, v: (r) => ed(x, 'stack', r.id, 'months', r.months, { t: 'number' }) }, { h: 'Cost', n: 1, v: (r) => (r.cost == null ? `<span class="pb-b pb-b-warn">${esc(r.basis)}</span>` : $m(r.cost)) }, { h: 'Price basis', v: (r) => badge(r.kind === 'public list price' ? 'Public List Price' : null) + (r.kind !== 'public list price' ? esc(r.kind) : '') }, { h: 'Read on the vendor page', v: (r) => badge(r.verified ? 'verified' : 'not verified') + ' ' + link(r.url) }, { h: 'Why', v: (r) => esc(r.why) }],
    s.rows, { name: 'software stack', foot: ['', 'Chosen rows', '', '', '', '', '', $m(s.total), '', '', ''] }),
  `Bottom-up from list prices read on ${esc(m.meta.researchReadOn.tools || 'no date')}: <b>${$m(s.total)}</b> for the chosen rows against an allowance of <b>${$m(allow)}</b>, which leaves ${$m(C.round2(allow - s.total))} for use-based charges and anything not foreseen. ${s.missing ? `${s.missing} chosen row${s.missing > 1 ? 's have' : ' has'} no stated price.` : ''} Which plan to take is decision D-04; nothing has been bought.`)}
  ${sec('Proof-of-concept hosting, by month', `<p>About <b>${$m(C.round2(cloudMonth))}</b> a month for the chosen instance, object storage and snapshots at list price, so about ${$m(C.round2(cloudMonth * 4))} over four months. Data transfer within the plan's allowance is included in the instance price. Monitoring beyond the provider's built-in graphs, a paid authentication service and a separate security service are not in this figure and are not needed for a synthetic-data trial.</p><p class="pb-note">The small-instance service was not found on the provider's list of services eligible for regulated health data when that list was read. It is used here for synthetic and computed data only.</p>`)}
  ${sec('Not needed, or overlapping', ul(s.rows.filter((r) => !r.chosen).map((r) => `<b>${esc(r.name)}</b>${r.plan ? ` (${esc(r.plan)})` : ''}: ${esc(r.why)}${r.cost != null ? ` Would add ${$m(r.cost)}.` : ''}`)))}
  ${sec('Design workflow', tbl('wf', [{ h: 'Step', v: (r) => esc(r.step) }, { h: 'Tool', v: (r) => esc(r.tool) }, { h: 'Rule', v: (r) => esc(r.rule) }], m.workflow.selected, { name: 'design workflow' })
    + `<p><b>Outputs kept for every release.</b> ${list(m.workflow.outputs)}.</p><p><b>Checks before a release.</b></p>${ul(m.workflow.checks.map(esc))}<p><b>Magnetic cleanliness.</b></p>${ul(m.workflow.magnetic.map(esc))}`)}
  ${sec('Design tools compared', tbl('cmp', [{ h: 'Tool', v: (r) => esc(r.tool) }, { h: 'Role', v: (r) => esc(r.role) }, { h: 'List price', v: (r) => r.ids.map((id) => m.tools.find((t) => t.id === id)).filter(Boolean).map((t) => `${esc(t.plan && t.plan !== 'n/a' ? t.plan : t.name)}: ${t.price_usd == null ? esc(t.price_unit || 'not stated') : t.price_usd === 0 ? 'free' : $m(t.price_usd) + ' ' + esc(t.price_unit)}`).join('<br>') }, { h: 'Terms of use', v: (r) => r.ids.map((id) => m.tools.find((t) => t.id === id)).filter(Boolean).map((t) => esc(t.licence || '')).filter(Boolean)[0] || '' }, { h: 'Formats', v: (r) => esc(r.formats) }, { h: 'Capability', v: (r) => esc(r.capability) }, { h: 'Confidentiality', v: (r) => esc(r.confidentiality) }, { h: 'Effort to fit in', v: (r) => esc(r.effort) }, { h: 'Verdict', v: (r) => badge(r.verdict) }], m.workflow.compare, { name: 'design tools compared' }), 'The verdict column is the team\'s judgement. Prices are list prices with their sources in the catalogue below.')}
  ${sec('Catalogue of tools looked at', `<div class="pb-controls"><label>Kind <select data-ui="toolCat"><option value="">all</option>${cats.map((c) => `<option${x.ui.toolCat === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label></div>`
    + tbl('tools', [{ h: 'Tool', v: (t) => esc(t.name) }, { h: 'Kind', v: (t) => esc(t.category) }, { h: 'Plan', v: (t) => esc(t.plan || '') }, { h: 'Price', n: 1, v: (t) => (t.price_usd == null ? 'not stated' : $m(t.price_usd)) }, { h: 'Per', v: (t) => esc(t.price_unit || '') }, { h: 'Basis', v: (t) => esc(t.price_kind || '') }, { h: 'Billing and renewal', v: (t) => esc(t.billing_notes || '') }, { h: 'Terms of use', v: (t) => esc(t.licence || '') }, { h: 'Version', v: (t) => esc([t.version, t.version_date].filter(Boolean).join(', ')) }, { h: 'Support', v: (t) => esc(t.support_status || '') }, { h: 'Plan limits', v: (t) => esc(t.limits || '') }, { h: 'Source', v: (t) => link(t.source_url) }, { h: 'Read today', v: (t) => badge(t.verified ? 'verified' : 'not verified') }],
    tools, { name: 'tool catalogue' }), esc(m.toolsMethod) + ' Renewal dates are blank because nothing has been bought: a date is recorded when a subscription starts.')}
  ${sec('Could not be found or verified', ul(m.toolsNotFound.map(esc)))}
  ${sec('Software this page depends on', tbl('deps', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Package', v: (r) => esc(r.name) }, { h: 'Version', v: (r) => esc(r.version) }, { h: 'Used for', v: (r) => esc(r.use) }, { h: 'Terms of use', v: (r) => esc(r.licence) }, { h: 'Status', v: (r) => badge(r.status) }, { h: 'Note', v: (r) => esc(r.note) }], m.dependencies, { name: 'dependencies' }), 'No package was added for this page.')}`;
}

/* ---------------------------------------------------------------- F. requirements and traceability */

export function requirementsView(x) {
  const { m, d } = x; const t = d.trace;
  const kinds = {}; for (const g of t.gaps) kinds[g.kind] = (kinds[g.kind] || 0) + 1;
  const expected = [...new Set(m.gates.flatMap((g) => g.evidence))].filter((e) => !m.evidence.some((q) => q.id === e));
  return `
  <div class="pb-tiles">${tile(m.needs.length, 'User needs')}${tile(m.requirements.length, 'Requirements')}${tile(m.outputs.length, 'Design outputs')}${tile(m.tests.length, 'Verification tests')}${tile(m.evidence.length, 'Evidence records')}${tile(t.gaps.length, 'Open links')}</div>
  <p class="pb-note">The chain is user need, requirement, design output, risk control, verification test, evidence, review, approval. A link exists only when a record names it. Evidence, reviews and approvals are added by people as the work is done; none is made up, so every test shows "no evidence" today.</p>
  ${sec('Open links', tbl('gaps', [{ h: 'Kind', v: (g) => esc(g.kind.replace(/-/g, ' ')) }, { h: 'Record', v: (g) => esc(g.id) }, { h: 'What is missing', v: (g) => esc(g.text) }], t.gaps, { name: 'open traceability links', empty: 'Every link is in place.' }), Object.entries(kinds).map(([k, n]) => `${n} ${esc(k.replace(/-/g, ' '))}`).join(' · '))}
  ${sec('Traceability matrix', tbl('trace', [{ h: 'Requirement', v: (r) => esc(r.id) }, { h: 'Kind', v: (r) => esc(m.requirements.find((q) => q.id === r.id).type) }, { h: 'Text', v: (r) => ed(x, 'requirements', r.id, 'text', r.text) + (m.requirements.find((q) => q.id === r.id).hypothesis ? ' <span class="pb-b pb-b-warn">research hypothesis</span>' : '') }, { h: 'User needs', v: (r) => list(r.needs) }, { h: 'Outputs', v: (r) => list(r.outputs) }, { h: 'Risks', v: (r) => list(r.risks) }, { h: 'Controls', v: (r) => list(r.controls) }, { h: 'Tests', v: (r) => list(r.tests) }, { h: 'Evidence', v: (r) => list(r.evidence) }, { h: 'Reviews', v: (r) => list(r.reviews) }, { h: 'Approved', v: (r) => list(r.approved) }, { h: 'Status', v: (r) => badge(r.status) }], t.rows, { name: 'traceability matrix' }),
  'The status is worked out from the links: Engineering Draft with an output and a test planned, Tested with evidence on record, Approved when every piece of evidence has an approved review.')}
  ${sec('User needs', tbl('needs', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Need', v: (r) => ed(x, 'needs', r.id, 'text', r.text) }, { h: 'Requirements', v: (r) => list(m.requirements.filter((q) => (q.needs || []).includes(r.id)).map((q) => q.id)) }], m.needs, { name: 'user needs' }))}
  ${sec('Design outputs', tbl('outs', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Output', v: (r) => esc(r.title) }, { h: 'Requirements', v: (r) => list(r.requirements) }, { h: 'Made in', v: (r) => esc(r.task) }, { h: 'Where it is kept', v: (r) => ed(x, 'outputs', r.id, 'location', r.location, { fmt: (v) => v || 'does not exist yet' }) }, { h: 'Status', v: (r) => ed(x, 'outputs', r.id, 'status', r.status, { t: 'select', opts: LABELS }) }], m.outputs, { name: 'design outputs' }))}
  ${sec('Add an evidence record', `<form class="pb-form" data-add="evidence">${input('id', 'Record id', { req: 1, list: 'pb-evid' })}<datalist id="pb-evid">${expected.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>${input('test', 'Test', { opts: [['', 'not a test record'], ...m.tests.map((q) => [q.id, q.id + ' ' + q.title])] })}${input('task', 'Task', { opts: [['', 'none'], ...m.tasks.map((q) => [q.id, q.id])] })}${input('title', 'What it is', { req: 1 })}${input('location', 'Where it is kept (file path or link)', { req: 1 })}${input('result', 'Result', { opts: ['Not a test', 'Pass', 'Fail'] })}${input('date', 'Date', { type: 'date', req: 1, val: x.d.today })}<button class="pb-btn" type="submit">Add</button></form><p class="pb-note">A record points to a real file. The page stores the pointer, your name and the time; it does not hold the file.</p>`
    + tbl('evid', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Test', v: (r) => esc(r.test || '') }, { h: 'Task', v: (r) => esc(r.task || '') }, { h: 'What', v: (r) => esc(r.title) }, { h: 'Where', v: (r) => esc(r.location) }, { h: 'Result', v: (r) => badge(r.result === 'Not a test' ? null : r.result) }, { h: 'Date', v: (r) => esc(r.date) }, { h: 'Entered by', v: (r) => esc(r.by) }, { h: '', v: (r) => `<button type="button" class="pb-link" data-del="evidence" data-id="${esc(r.id)}">remove</button>` }], m.evidence, { name: 'evidence', empty: 'No evidence on record. None has been produced yet.' }))}
  ${sec('Add a review record', `<form class="pb-form" data-add="reviews">${input('id', 'Review id', { req: 1 })}${input('title', 'What was reviewed', { req: 1 })}${input('evidence', 'Evidence ids, separated by commas', { req: 1 })}${input('participants', 'Who took part', { req: 1 })}${input('date', 'Date', { type: 'date', req: 1, val: x.d.today })}${input('approvedBy', 'Approved by (leave empty if not approved)')}<button class="pb-btn" type="submit">Add</button></form>`
    + tbl('revs', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Reviewed', v: (r) => esc(r.title) }, { h: 'Evidence', v: (r) => list(r.evidence) }, { h: 'Participants', v: (r) => esc(r.participants) }, { h: 'Date', v: (r) => esc(r.date) }, { h: 'Approval', v: (r) => (r.approval ? `${esc(r.approval.by)}, ${esc(r.approval.date)}` : badge('Review Required')) }, { h: '', v: (r) => `<button type="button" class="pb-link" data-del="reviews" data-id="${esc(r.id)}">remove</button>` }], m.reviews, { name: 'reviews', empty: 'No review on record.' }))}`;
}

/* ---------------------------------------------------------------- G. quality and regulatory */

export function quality(x) {
  const { m } = x; const cf = m.classification;
  const topics = [...new Set(m.standards.map((s) => s.topic))];
  const std = m.standards.filter((s) => !x.ui.stdTopic || s.topic === x.ui.stdTopic);
  const risks = m.risks.filter((r) => !x.ui.riskKind || r.kind === x.ui.riskKind);
  const kinds = [...new Set(m.risks.map((r) => r.kind))];
  const verified = (rc) => { const t = m.tests.filter((q) => (q.riskControls || []).includes(rc.id)); if (!t.length) return badge('Review Required') + ' no test'; return t.some((q) => m.evidence.some((e) => e.test === q.id && e.result === 'Pass')) ? badge('Tested') : `${esc(t.map((q) => q.id).join(', '))} not run`; };
  const cfBlock = (title, v) => (v == null ? '' : `<p><b>${esc(title)}</b></p>${Array.isArray(v) ? (v.length ? ul(v.map((i) => (typeof i === 'string' ? esc(i) : Object.entries(i).filter(([, q]) => q != null && q !== '').map(([k, q]) => (/url/i.test(k) ? link(q) : `<b>${esc(k.replace(/_/g, ' '))}:</b> ${esc(Array.isArray(q) ? q.join(', ') : typeof q === 'object' ? JSON.stringify(q) : q)}`)).join(' · ')))) : '<p class="pb-none">nothing found</p>') : `<p>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</p>`}`);
  return `
  <p class="pb-alert">This program does not hold a quality certificate and this page claims compliance with no standard and no regulation. What follows is an applicability reading and a gap list for the director, to be read by a qualified regulatory professional before it is relied on.</p>
  ${sec('Standards and regulations: what applies, and when', `<div class="pb-controls"><label>Topic <select data-ui="stdTopic"><option value="">all</option>${topics.map((c) => `<option${x.ui.stdTopic === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label></div>`
    + tbl('std', [{ h: 'Id', v: (s) => esc(s.id) }, { h: 'Standard or rule', v: (s) => esc(s.name) }, { h: 'Edition', v: (s) => esc(s.edition || '') }, { h: 'Topic', v: (s) => esc(s.topic) }, { h: 'In this phase', v: (s) => `<span class="pb-b pb-b-${/applies now/.test(s.applies_in_this_phase) ? 'warn' : /not applicable/.test(s.applies_in_this_phase) ? 'na' : 'est'}">${esc(s.applies_in_this_phase)}</span>` }, { h: 'What it asks for', v: (s) => esc(s.what_it_requires) }, { h: 'Why', v: (s) => esc(s.why) }, { h: 'Clauses', v: (s) => list(s.clauses) }, { h: 'Source', v: (s) => link(s.source_url) + (s.source_quote ? `<br><q>${esc(s.source_quote)}</q>` : '') }, { h: 'Read today', v: (s) => badge(s.verified ? 'verified' : 'not verified') }, { h: 'Note', v: (s) => esc(s.notes || '') }],
    std, { name: 'standards applicability', empty: 'No standard on record.' }), `Web research read on ${esc(m.meta.researchReadOn.standards || 'no date')}. Applicability depends on the intended use, which is "research prototype, no clinical use" for this program. Not every standard applies in the same way; the column "In this phase" says how each one bears on the work now.`)}
  ${cf ? sec('Device classification leads', Object.entries(cf).map(([k, v]) => cfBlock(k.replace(/_/g, ' '), v)).join(''), 'Leads only. No classification has been determined and no equivalence to any cleared device is implied.') : ''}
  ${m.regulatoryQuestions.length ? sec('Questions for a regulatory professional', ul(m.regulatoryQuestions.map(esc))) : ''}
  ${m.standardsNotFound.length ? sec('Could not be found or verified', ul(m.standardsNotFound.map(esc))) : ''}
  ${sec('Quality system gap list', tbl('qgap', [{ h: 'Id', v: (g) => esc(g.id) }, { h: 'Clause', v: (g) => esc(g.clause) }, { h: 'Topic', v: (g) => esc(g.topic) }, { h: 'Today', v: (g) => ed(x, 'gaps', g.id, 'state', g.state, { t: 'select', opts: ['In place', 'Partly', 'Missing'] }) }, { h: 'What exists', v: (g) => esc(g.have) }, { h: 'What is needed', v: (g) => esc(g.need) }, { h: 'By', v: (g) => esc(g.when) }], m.gaps, { name: 'quality gap list' }),
  `${m.gaps.filter((g) => g.state === 'Missing').length} missing, ${m.gaps.filter((g) => g.state === 'Partly').length} partly in place, ${m.gaps.filter((g) => g.state === 'In place').length} in place, against ISO 13485:2016 with the design and development clause 7.3. A version-controlled repository gives history; it is not a compliant quality system on its own.`)}
  ${sec('Risk register', `<div class="pb-controls"><label>Kind <select data-ui="riskKind"><option value="">all</option>${kinds.map((c) => `<option${x.ui.riskKind === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label></div>`
    + tbl('risks', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Area', v: (r) => esc(r.area) }, { h: 'Kind', v: (r) => esc(r.kind) }, { h: 'Hazard', v: (r) => esc(r.hazard) }, { h: 'Harm', v: (r) => esc(r.harm) }, { h: 'Severity', n: 1, v: (r) => ed(x, 'risks', r.id, 'severity', r.severity, { t: 'number' }) }, { h: 'Probability', n: 1, v: (r) => ed(x, 'risks', r.id, 'probability', r.probability, { t: 'number' }) }, { h: 'Level', v: (r) => badge(C.riskLevel(r.severity, r.probability)) }, { h: 'Controls', v: (r) => r.controls.map((c) => `<b>${esc(c.id)}</b> ${esc(c.text)}`).join('<br>') }, { h: 'Control verified', v: (r) => r.controls.map(verified).join('<br>') }, { h: 'Severity after', n: 1, v: (r) => ed(x, 'risks', r.id, 'residualSeverity', r.residualSeverity, { t: 'number' }) }, { h: 'Probability after', n: 1, v: (r) => ed(x, 'risks', r.id, 'residualProbability', r.residualProbability, { t: 'number' }) }, { h: 'Level after', v: (r) => badge(C.riskLevel(r.residualSeverity, r.residualProbability)) }, { h: 'Status', v: (r) => ed(x, 'risks', r.id, 'status', r.status, { t: 'select', opts: LABELS }) }],
    risks, { name: 'risk register' }), 'Severity and probability run from 1 to 5. Level: High at a product of 15 or more, or at severity 5 with probability 3 or more; Medium from 6; Low below. These are the team\'s first estimates and have not been reviewed. "With controls" is an expectation until each control has a passed test. A benefit and risk assessment belongs to a later clinical phase.')}
  ${sec('External review allowance', (() => { const l = m.lines.find((q) => q.id === 'X-01'); return `<p>The allowance is <b>${$m(l ? l.amount : 0)}</b> ${badge(l ? l.kind : 'Planning Estimate')}. No quotation is on record. Whether it is enough cannot be stated from a verified price: it is sized for one independent design review of the electronics. A regulatory strategy consultation, pre-compliance emissions or safety testing, or a skin-contact assessment would each be additional. The extended scenario carries a larger figure as an assumption. Decision D-06 asks for quotations before the release gate.</p>${m.standardsNotes ? `<p class="pb-note">${esc(m.standardsNotes)}</p>` : ''}`; })())}
  ${sec('Design and development file index', tbl('ddf', [{ h: 'Record', v: (r) => esc(r.name) }, { h: 'From task', v: (r) => esc(r.task) }, { h: 'Task complete', n: 1, v: (r) => r.percent + '%' }, { h: 'Status', v: (r) => badge(r.status) }], m.tasks.flatMap((t) => (t.deliverables || []).map((n) => ({ name: n, task: t.id, percent: t.percent, status: t.percent >= 100 ? 'Review Required' : 'Planning Estimate' }))), { name: 'design file index' }), 'Every record the program is to produce, from the task that produces it. A finished task marks its records for review; only a person approves them. Validation and design transfer are outside this program and are named in the gap list.')}`;
}

/* ---------------------------------------------------------------- H. testing */

export function testing(x) {
  const { m } = x;
  const res = (t) => { const e = m.evidence.filter((q) => q.test === t.id && q.result !== 'Not a test'); if (!e.length) return 'Not run'; return e.some((q) => q.result === 'Fail') ? 'Fail' : 'Pass'; };
  const n = { Pass: 0, Fail: 0, 'Not run': 0 }; for (const t of m.tests) n[res(t)]++;
  const cond = ['Still', 'Moving', 'Noisy room', 'Shielded or controlled', 'Normal laboratory'];
  return `
  <div class="pb-tiles">${tile(m.tests.length, 'Tests planned')}${tile(n.Pass, 'Passed')}${tile(n.Fail, 'Failed')}${tile(n['Not run'], 'Not run')}${tile(m.anomalies.filter((a) => a.status !== 'Closed').length, 'Open anomalies')}</div>
  <p class="pb-note">No test has been run. A result appears here only when an evidence record with a result is added under Requirements and traceability. This program verifies an engineering prototype; it does not validate a device for clinical use.</p>
  ${sec('Verification tests', tbl('tests', [{ h: 'Id', v: (t) => esc(t.id) }, { h: 'Test', v: (t) => esc(t.title) }, { h: 'Method', v: (t) => esc(t.method) }, { h: 'Where', v: (t) => esc(t.where) }, { h: 'Requirements', v: (t) => list(t.requirements) }, { h: 'Risk controls', v: (t) => list(t.riskControls) }, { h: 'Result', v: (t) => badge(res(t)) }, { h: 'Evidence', v: (t) => list(m.evidence.filter((e) => e.test === t.id).map((e) => e.id)) }, { h: 'Protocol status', v: (t) => ed(x, 'tests', t.id, 'status', t.status, { t: 'select', opts: LABELS }) }], m.tests, { name: 'verification tests' }))}
  ${sec('Feasibility experiments', `<div class="pb-scroll"><table class="pb-t"><thead><tr><th scope="col">Condition</th><th scope="col">Known coil signal</th><th scope="col">No-heart control</th><th scope="col">Heart signal</th></tr></thead><tbody>${cond.map((c) => `<tr><td>${esc(c)}</td><td>${badge('Not run')}</td><td>${badge('Not run')}</td><td>${badge('Blocked')} decision D-03</td></tr>`).join('')}</tbody></table></div>`,
  'Test VT-02. The pass criterion (signal-to-noise ratio and repeatability) is written down before the experiments and is decision D-02. A heart recording is made only under the oversight set in decision D-03. A failed gate is recorded as a no-go or a conditional result with the other sensor approaches, their cost and the schedule effect.')}
  ${sec('Anomalies', `<form class="pb-form" data-add="anomalies">${input('title', 'What was seen', { req: 1 })}${input('test', 'Found in', { opts: [['', 'not in a test'], ...m.tests.map((q) => [q.id, q.id])] })}${input('effect', 'Effect', { req: 1 })}${input('status', 'Status', { opts: ['Open', 'Under investigation', 'Closed'] })}<button class="pb-btn" type="submit">Add</button></form>`
    + tbl('anom', [{ h: 'Id', v: (a) => esc(a.id) }, { h: 'Seen', v: (a) => esc(a.title) }, { h: 'Found in', v: (a) => esc(a.test || '') }, { h: 'Effect', v: (a) => esc(a.effect) }, { h: 'Status', v: (a) => ed(x, 'anomalies', a.id, 'status', a.status, { t: 'select', opts: ['Open', 'Under investigation', 'Closed'] }) }, { h: 'Entered by', v: (a) => esc(a.by) }, { h: 'Date', v: (a) => esc((a.at || '').slice(0, 10)) }], m.anomalies, { name: 'anomalies', empty: 'No anomaly on record. No test has been run.' }))}`;
}

/* ---------------------------------------------------------------- I. security and data */

export function security(x) {
  const { m, d } = x;
  const cloud = d.stack.rows.filter((r) => r.chosen && String(r.tool).startsWith('lightsail'));
  return `
  <p class="pb-alert">Nothing here is provisioned. The proof of concept is for synthetic, simulated or otherwise non-identifying engineering data only. No recording that identifies a person goes into it.</p>
  ${sec('Data flow', archDiagram(x) + tbl('flows', [{ h: 'From', v: (f) => esc(f.from) }, { h: 'To', v: (f) => esc(f.to) }, { h: 'What moves, and how', v: (f) => esc(f.text) }], m.flows, { name: 'data flows' }))}
  ${sec('Five areas kept apart', tbl('zones', [{ h: 'Id', v: (z) => esc(z.id) }, { h: 'Area', v: (z) => esc(z.name) }, { h: 'Holds', v: (z) => esc(z.holds) }, { h: 'Today', v: (z) => esc(z.today) }, { h: 'In the proof of concept', v: (z) => esc(z.poc) }, { h: 'Data class', v: (z) => esc(z.data) }], m.zones, { name: 'areas' }))}
  ${sec('Security controls', tbl('ctl', [{ h: 'Id', v: (c) => esc(c.id) }, { h: 'Control', v: (c) => esc(c.control) }, { h: 'Design', v: (c) => esc(c.design) }, { h: 'In the proof of concept', v: (c) => esc(c.poc) }, { h: 'Checked by', v: (c) => esc(c.test) }, { h: 'Status', v: (c) => ed(x, 'controls', c.id, 'status', c.status, { t: 'select', opts: LABELS }) }], m.controls, { name: 'security controls' }), 'A design. No control is in operation and none has been tested.')}
  ${sec('Data record', tbl('dm', [{ h: 'Record', v: (r) => esc(r.entity) }, { h: 'Fields', v: (r) => esc(r.fields) }, { h: 'Linked to', v: (r) => esc(r.links) }], m.dataModel, { name: 'data record' }), 'Raw recordings are written once with a hash and never changed. Every derived result names the raw files, the software version and the settings that made it, so it can be made again.')}
  ${sec('Proof-of-concept cost', tbl('poc', [{ h: 'Item', v: (r) => esc(r.name) }, { h: 'Plan', v: (r) => esc(r.plan || '') }, { h: 'Unit price', n: 1, v: (r) => $m(r.unit) }, { h: 'Per', v: (r) => esc(r.unitText) }, { h: 'Units', n: 1, v: (r) => r.qty }, { h: 'By month', n: 1, v: (r) => $m(C.round2((r.cost || 0) / (r.months || 1))) }, { h: 'Months', n: 1, v: (r) => r.months }, { h: 'Total', n: 1, v: (r) => $m(r.cost) }, { h: 'Source', v: (r) => link(r.url) }], cloud, { name: 'proof-of-concept cost', foot: ['Total', '', '', '', '', $m(C.round2(cloud.reduce((a, r) => a + (r.cost || 0) / (r.months || 1), 0))), '', $m(C.round2(cloud.reduce((a, r) => a + (r.cost || 0), 0))), ''] }),
  'List prices. At this size a four-month trial runs economically on the small-instance service. Backups are the snapshot row; bandwidth within the plan allowance is included; monitoring uses the provider\'s built-in graphs; security monitoring is the repositories\' own alerts. Edit the rows under Software and cloud.')}
  ${sec('Which cloud services may hold regulated health data', tbl('hipaa', [{ h: 'Service', v: (h) => esc(h.service) }, { h: 'On the provider\'s eligible list', v: (h) => (h.on_list == null ? '' : h.on_list ? badge('verified').replace('verified', 'listed') : '<span class="pb-b pb-b-bad">not found on the list</span>') }, { h: 'As read', v: (h) => `<q>${esc(h.quote)}</q>` }, { h: 'Source', v: (h) => link(h.source_url) }], m.hipaa, { name: 'eligible services' }), 'A service being on the list does not make a system compliant: an agreement with the provider and the right set-up are both needed.')}
  ${sec('Later architecture, before any data that identifies a person', ul(m.futureArchitecture.map(esc)), 'A direction, not a design. No service is chosen until that phase is authorised.')}
  ${sec('Readiness to move', tbl('mig', [{ h: 'Item', v: (r) => esc(r.item) }, { h: 'State', v: (r) => badge(r.state) }, { h: 'Note', v: (r) => esc(r.note || '') }], m.migrationReadiness, { name: 'migration readiness' }))}`;
}

/* ---------------------------------------------------------------- J. decisions and gates */

export function decisionsView(x) {
  const { m, d } = x;
  const gateCard = (g) => `<article class="pb-gate-card${d.gates.current && d.gates.current.id === g.id ? ' cur' : ''}"><header><h4>${esc(g.id)} ${esc(g.title)}</h4>${badge(g.status)}${g.critical ? ' <span class="pb-b pb-b-warn">critical gate</span>' : ''}<small>${esc(C.finishOf(d.sched, g.milestone) || '')}</small></header>
    <p><b>Criteria</b></p>${ul(g.criteria.map(esc))}
    <p><b>An approval releases:</b> ${esc(g.authorises)}</p>
    ${g.missing.length ? `<p><b>Still needed before a go</b></p>${ul(g.missing.map((q) => esc(q.text)))}` : '<p>Everything the gate asks for is on record.</p>'}
    ${g.approval ? `<p class="pb-approved">${badge(g.status)} ${esc(g.approval.decision)} by ${esc(g.approval.by)} on ${esc(g.approval.date)}${g.approval.note ? `: ${esc(g.approval.note)}` : ''}${g.status === 'Approval not valid' ? ' <b>This approval does not count: the gate\'s tasks, evidence or earlier gates are not complete.</b>' : ''} <button type="button" class="pb-link" data-act="withdraw" data-id="${esc(g.id)}">withdraw</button></p>`
      : `<form class="pb-form" data-approve="${esc(g.id)}">${input('by', 'Decided by (a person\'s name)', { req: 1, val: x.store.who })}${input('date', 'Date', { type: 'date', req: 1, val: d.today })}${input('decision', 'Decision', { opts: ['Approved', 'Conditional', 'No-go'] })}${input('note', 'Note')}<button class="pb-btn" type="submit">Record decision</button></form>`}
  </article>`;
  const open = d.gates.rows.filter((g) => !['Approved', 'Conditional', 'No-go'].includes(g.status)).length;
  return `
  <p class="pb-note">A go can be recorded only when the earlier gates are approved, the gate's tasks are complete and its evidence is on record. A no-go can be recorded at any time. An approval needs a person's name and a date; an AI tool cannot approve. Nothing has been approved: ${open} of ${d.gates.rows.length} gates are open.</p>
  ${sec('Stage gates', `<div class="pb-gate-cards">${d.gates.rows.map(gateCard).join('')}</div>`)}
  ${sec('Decisions for the director', tbl('dec', [{ h: 'Id', v: (q) => esc(q.id) }, { h: 'Decision', v: (q) => `<b>${esc(q.title)}</b><br>${esc(q.question)}` }, { h: 'Alternatives looked at', v: (q) => ul(q.options.map(esc)) }, { h: 'Recommendation', v: (q) => esc(q.recommendation) }, { h: 'Needs first', v: (q) => list(q.needs) }, { h: 'Nothing of this before the decision', v: (q) => esc(q.blocks) }, { h: 'Decided', v: (q) => ed(x, 'decisions', q.id, 'decision', q.decision, { fmt: (v) => v || 'record the decision' }) }, { h: 'By', v: (q) => ed(x, 'decisions', q.id, 'decidedBy', q.decidedBy, { fmt: (v) => v || 'name' }) }, { h: 'On', v: (q) => ed(x, 'decisions', q.id, 'decidedOn', q.decidedOn, { t: 'date', fmt: (v) => v || 'date' }) }, { h: 'Status', v: (q) => badge(q.decision && q.decidedBy && q.decidedOn ? 'Approved' : 'Review Required').replace('Approved', 'Decided') }], m.decisions, { name: 'decisions' }), 'Recommendations are the team\'s. A decision counts when it has the text, a person\'s name and a date.')}
  ${sec('Project-management platform', tbl('pm', [{ h: 'Option', v: (p) => esc(p.name) }, { h: 'Four months, two people', n: 1, v: (p) => p.tools.map((t) => { const tool = m.tools.find((q) => q.id === t.tool); const c = C.toolCost(tool, t.qty, 4); return `${tool ? esc(tool.plan && tool.plan !== 'n/a' ? tool.vendor + ' ' + tool.plan : tool.name) : esc(t.tool)}: ${c.cost == null ? esc(c.basis) : $m(c.cost)}${t.yearly ? ' (from, by the year)' : ''}`; }).join('<br>') }, { h: 'Schedule and milestones', v: (p) => esc(p.gantt) }, { h: 'API', v: (p) => esc(p.api) }, { h: 'AI assistant', v: (p) => esc(p.assistant) }, { h: 'Link to source control', v: (p) => esc(p.source) }, { h: 'Traceability', v: (p) => esc(p.trace) }, { h: 'Quality records', v: (p) => esc(p.quality) }, { h: 'Export', v: (p) => esc(p.export) }, { h: 'Upkeep', v: (p) => esc(p.upkeep) }, { h: 'Verdict', v: (p) => badge(p.verdict) + '<br>' + esc(p.why) }], m.platforms, { name: 'platform comparison' }), 'Costs are list prices at yearly billing where that is the only price published, times two seats and four months; quality systems are sold by the year from the figure shown and need a quotation. Tasks live in one place only, so no record is kept twice.')}`;
}

/* ---------------------------------------------------------------- K. scenarios */

export function scenariosView(x) {
  const { m, d } = x; const sc = d.scenarios;
  const row = (label, f, cls = '') => `<tr class="${cls}"><th scope="row">${esc(label)}</th>${sc.map((s) => `<td class="pb-n">${f(s)}</td>`).join('')}</tr>`;
  const lineIds = m.lines.map((l) => l.id);
  return `
  ${stacked(sc.map((s) => ({ name: s.name, labour: s.b.labour.cost, hardware: s.b.hardware, software: s.b.software, external: s.b.external, contingency: s.b.contingency, total: s.b.total })))}
  <div class="pb-tw"><div class="pb-tools"><button type="button" class="pb-btn" data-csv="scen">CSV</button></div><div class="pb-scroll"><table class="pb-t pb-t-scen" id="t-scen" data-name="scenarios"><thead><tr><th scope="col">Scenario</th>${sc.map((s) => `<th scope="col" class="pb-n">${esc(s.name)}</th>`).join('')}</tr></thead><tbody>
    ${row('Length, weeks', (s) => (s.id === 'baseline' ? `${s.b.durationWeeks} (the program)` : ed(x, 'scenarios', s.id, 'durationWeeks', s.durationWeeks, { t: 'number' })))}
    ${row('Forecast finish', (s) => esc(s.endDate))}
    ${m.roles.map((r) => row(`${r.short}, hours a week`, (s) => (s.id === 'baseline' ? r.weeklyHours : ed(x, 'scenarios', s.id, 'weeklyHours', s.weeklyHours[r.id], { t: 'number', k: r.id })))).join('')}
    ${m.roles.map((r) => row(`${r.short}, hours`, (s) => s.b.labour.rows.find((q) => q.id === r.id).hours)).join('')}
    ${row('Labor hours', (s) => s.b.labour.hours)}
    ${row('A. Labor', (s) => $m(s.b.labour.cost))}
    ${lineIds.map((id) => row(`${id} ${m.lines.find((l) => l.id === id).title}`, (s) => { const it = s.b.items.find((q) => q.id === id); return s.id === 'baseline' ? $m(it.amount) : ed(x, 'scenarios', s.id, 'lines', it.amount, { t: 'scenline', k: id, fmt: $m }) + (it.changedByScenario ? ' <span class="pb-b pb-b-est">assumed</span>' : ''); }, 'pb-sub')).join('')}
    ${row('B. Hardware', (s) => $m(s.b.hardware))}${row('C. Software and cloud', (s) => $m(s.b.software))}${row('D. External review', (s) => $m(s.b.external))}
    ${row('Direct expenses', (s) => $m(s.b.direct), 'pb-sum')}
    ${row('Contingency, %', (s) => (s.id === 'baseline' ? `${s.b.contingencyPct} (the program)` : ed(x, 'scenarios', s.id, 'contingencyPct', s.contingencyPct, { t: 'number' })))}
    ${row('Contingency', (s) => $m(s.b.contingency))}
    ${row('Planning total', (s) => `<b>${$m(s.b.total)}</b>`, 'pb-sum')}
    ${row('Against baseline', (s) => { const base = sc.find((q) => q.id === 'baseline').b.total; const df = C.round2(s.b.total - base); return df === 0 ? '' : (df > 0 ? '+' : '−') + $m(Math.abs(df)); })}
  </tbody></table></div></div>
  <p class="pb-note">The baseline follows the program: change the start, length, rates, hours, cost lines or contingency in their own sections and it moves. Lean and Extended hold their own assumptions, which can be changed here; every figure they change is an assumption for comparison, not a quotation. Program contingency ${ed(x, 'program', '_', 'contingencyPct', m.program.contingencyPct, { t: 'number' })}%.</p>
  ${sc.map((s) => sec(s.name, `<p>${esc(s.summary)}</p>${Object.keys(s.lines || {}).length ? `<p><b>What it changes</b></p>${ul(Object.entries(s.lines).map(([id, o]) => `<b>${esc(id)}</b> ${$m(o.amount)}: ${esc(o.note || '')}`))}` : ''}<p><b>Risks</b></p>${ul(s.risks.map(esc))}`)).join('')}`;
}

/* ---------------------------------------------------------------- L. records */

export function records(x) {
  const { m, d } = x; const w = Math.min(Math.max(1, x.ui.reportWeek || Math.max(1, d.nowWeek)), d.spend.length);
  const sp = d.spend[w - 1]; const g = d.gates.current;
  const inWeek = d.sched.rows.filter((r) => !r.milestone && !r.loe && r.start <= w && r.finish >= w);
  const next = d.sched.rows.filter((r) => !r.loe && r.start === w + 1);
  const hrs = (role) => m.hoursLog.filter((e) => Number(e.week) === w && e.role === role).reduce((s, e) => s + Number(e.hours || 0), 0);
  const report = `<div class="pb-report" id="pb-report"><h4>Weekly progress report: week ${w}, ${esc(C.weekStart(m.program, w))} to ${esc(C.weekEnd(m.program, w))}</h4>
    <dl class="pb-dl">
      <div><dt>Overall status</dt><dd>${badge(d.status)} ${esc(d.statusWhy)}</dd></div>
      <div><dt>Current gate</dt><dd>${g ? `${esc(g.id)} ${esc(g.title)} ${badge(g.status)}; still needs: ${g.missing.length ? g.missing.map((q) => esc(q.text)).join('; ') : 'a recorded decision'}` : 'all gates decided'}</dd></div>
      <div><dt>Work in this week</dt><dd>${inWeek.map((r) => `${esc(r.id)} ${esc(r.title)} (${r.percent}%)`).join('<br>') || 'none'}</dd></div>
      <div><dt>Starting next week</dt><dd>${next.map((r) => `${esc(r.id)} ${esc(r.title)}`).join('<br>') || 'none'}</dd></div>
      <div><dt>Hours, planned and logged</dt><dd>${m.roles.map((r) => `${esc(r.short)}: planned ${d.load.weeks[w - 1] ? d.load.weeks[w - 1].hours[r.id] : 0}, logged ${hrs(r.id)}`).join(' · ')}</dd></div>
      <div><dt>Spending this week</dt><dd>planned ${$m(sp.planned)}, actual ${$m(sp.actual)}</dd></div>
      <div><dt>Spending to date</dt><dd>planned ${$m(sp.cumPlanned)}, actual ${$m(sp.cumActual)}</dd></div>
      <div><dt>Slipped or overdue</dt><dd>${list([...new Set([...d.sched.slipped, ...d.sched.overdue])])}</dd></div>
      <div><dt>Decisions needed</dt><dd>${m.decisions.filter((q) => !q.decision).map((q) => `${esc(q.id)} ${esc(q.title)}`).join('<br>') || 'none'}</dd></div>
      <div><dt>Open anomalies</dt><dd>${m.anomalies.filter((a) => a.status !== 'Closed').map((a) => `${esc(a.id)} ${esc(a.title)}`).join('<br>') || 'none'}</dd></div>
      <div><dt>New or changed risks</dt><dd class="pb-write">to be written by the person reporting</dd></div>
      <div><dt>Work finished this week</dt><dd class="pb-write">to be written by the person reporting</dd></div>
    </dl></div>`;
  const hist = [...x.store.log].reverse();
  return `
  ${sec('Your name and your changes', `<div class="pb-controls"><label>Your name <input id="pb-who" type="text" value="${esc(x.store.who)}" placeholder="needed for approvals and history"></label><button type="button" class="pb-btn" data-act="export">Save my changes to a file</button><label class="pb-btn pb-file">Load changes from a file<input type="file" id="pb-import" accept="application/json"></label><button type="button" class="pb-btn" data-act="reset">Discard my changes</button><button type="button" class="pb-btn" data-act="lock">Lock the page</button></div>
    <p class="pb-note">What you change is kept in this browser, apart from the page's own data, as a list of changes by record. A new version of the page never overwrites a change of yours. To share changes, save them to a file and send it; the other person loads it. To make a change permanent for everyone, hand the file to whoever updates the page's data files. ${x.d.changes} change${x.d.changes === 1 ? '' : 's'} of yours ${x.d.changes === 1 ? 'is' : 'are'} in force (marked with a teal underline).</p>
    ${x.d.conflicts.length ? `<p class="pb-alert">The page's data changed under ${x.d.conflicts.length} of your changes. Yours still shows. ${x.d.conflicts.map((c) => `${esc(c.collection)} ${esc(c.id)} ${esc(c.field)}: the page now says ${esc(JSON.stringify(c.seed))}, you set ${esc(JSON.stringify(c.mine))}`).join('; ')}</p>` : ''}
    ${x.d.orphans.length ? `<p class="pb-alert">Changes to records that no longer exist: ${x.d.orphans.map((o) => `${esc(o.collection)} ${esc(o.id)}`).join(', ')}</p>` : ''}`)}
  ${sec('Weekly progress report', `<div class="pb-controls"><label>Week <input type="number" min="1" max="${d.spend.length}" value="${w}" data-ui="reportWeek"></label><button type="button" class="pb-btn" data-act="print-report">Print this report</button></div>${report}`, 'Filled from the page\'s data. The two written fields are for the person reporting.')}
  ${sec('Work breakdown', m.phases.map((p) => `<p><b>${esc(p.id)} ${esc(p.name)}</b></p>${ul(m.tasks.filter((t) => t.phase === p.id).map((t) => `<b>${esc(t.id)}</b> ${esc(t.title)}${t.deliverables.length ? `: ${t.deliverables.map(esc).join(', ')}` : ''}`))}`).join(''))}
  ${sec('Assumptions', ul(m.assumptions.map(esc)))}
  ${sec('History', `<div class="pb-controls"><span>${x.store.log.length} entr${x.store.log.length === 1 ? 'y' : 'ies'}. Chain check: ${x.d.logOk == null ? 'checking' : x.d.logOk === 0 ? badge('verified').replace('verified', 'unbroken') : `<span class="pb-b pb-b-bad">broken at entry ${x.d.logOk}</span>`}</span></div>`
    + tbl('hist', [{ h: 'No.', n: 1, v: (e) => e.n }, { h: 'When', v: (e) => esc(e.at.replace('T', ' ').slice(0, 19)) }, { h: 'Who', v: (e) => esc(e.who) }, { h: 'What', v: (e) => esc(e.action) }, { h: 'Record', v: (e) => esc([e.collection, e.id, e.field].filter(Boolean).join(' / ')) }, { h: 'From', v: (e) => esc(typeof e.from === 'object' && e.from ? JSON.stringify(e.from) : e.from ?? '') }, { h: 'To', v: (e) => esc(typeof e.to === 'object' && e.to ? JSON.stringify(e.to) : e.to ?? '') }, { h: 'Hash', v: (e) => `<code>${esc(e.hash.slice(0, 10))}</code>` }], hist, { name: 'history', empty: 'No change has been made in this browser.' }),
  'Every change made on this page in this browser. Each entry carries the hash of the one before, so an entry that is removed or altered shows as a broken chain. This is a working record, not a controlled quality record.')}`;
}

export const TABS = [['A', 'Overview', overview], ['B', 'Timeline', timeline], ['C', 'Resource and labor', resources], ['D', 'Hardware and BOM', hardware], ['E', 'Software and cloud', software], ['F', 'Requirements and traceability', requirementsView], ['G', 'Quality and regulatory', quality], ['H', 'Testing', testing], ['I', 'Security and data', security], ['J', 'Decisions and stage gates', decisionsView], ['K', 'Financial scenarios', scenariosView], ['L', 'Records', records]];
