/* Product Build: every calculation the page shows, as pure functions (no page, no storage), so each can be tested with
   `node --test` (site/tests/product-build.test.mjs). The page (app.js) only draws what these return.

   Units: money in US dollars, time in whole weeks of the program (week 1 starts on the program's start date, a Monday),
   dates as 'YYYY-MM-DD' in UTC. Nothing here invents a value: a missing price stays null and is reported as missing. */

export const DAY = 86400000;
export const parseDate = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const fmtDate = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s, n) => fmtDate(parseDate(s) + n * DAY);
export const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const sum = (a) => a.reduce((s, x) => s + (Number(x) || 0), 0);

/* ------------------------------------------------------------------ schedule */

/** week 1..n -> the Monday that starts it */
export const weekStart = (program, w) => addDays(program.startDate, (w - 1) * 7);
/** the Friday that ends week w */
export const weekEnd = (program, w) => addDays(program.startDate, (w - 1) * 7 + 4);
/** which program week a date falls in (1-based; 0 or less before the start) */
export const weekOf = (program, date) => Math.floor((parseDate(date) - parseDate(program.startDate)) / (7 * DAY)) + 1;

/** how much every planned position and duration is stretched when the program's length is changed */
export const scaleOf = (program) => (program.durationWeeks || program.baselineWeeks) / program.baselineWeeks;

/**
 * The forecast schedule. Tasks carry a planned start week and length for the baseline length of the program, and
 * dependencies ({ id, type: 'FS' | 'SS', lag }). Planned positions are scaled to the present length, then pushed later
 * wherever a dependency requires it (forward pass), and the slack of each task is found from the end (backward pass).
 * Returns { rows, byId, endWeek, endDate, critical: [ids], errors: [..] }.
 */
export function schedule(program, tasks, today = null) {
  const k = scaleOf(program);
  const byId = new Map();
  const errors = [];
  for (const t of tasks) {
    const ps = Math.round((t.week - 1) * k) + 1;
    const len = t.milestone ? 0 : Math.max(1, Math.round(t.weeks * k));
    byId.set(t.id, { id: t.id, task: t, plannedStart: ps, len, deps: (t.deps || []).map((d) => (typeof d === 'string' ? { id: d, type: 'FS', lag: 0 } : { type: 'FS', lag: 0, ...d })) });
  }
  for (const r of byId.values()) for (const d of r.deps) if (!byId.has(d.id)) errors.push(`${r.id}: depends on ${d.id}, which does not exist`);
  // order: predecessors before successors (Kahn); anything left over is in a loop
  const indeg = new Map([...byId.keys()].map((id) => [id, 0]));
  const succ = new Map([...byId.keys()].map((id) => [id, []]));
  for (const r of byId.values()) for (const d of r.deps) if (byId.has(d.id)) { indeg.set(r.id, indeg.get(r.id) + 1); succ.get(d.id).push({ id: r.id, type: d.type, lag: d.lag || 0 }); }
  const order = [];
  const queue = [...byId.keys()].filter((id) => indeg.get(id) === 0);
  while (queue.length) {
    const id = queue.shift(); order.push(id);
    for (const s of succ.get(id)) { indeg.set(s.id, indeg.get(s.id) - 1); if (indeg.get(s.id) === 0) queue.push(s.id); }
  }
  if (order.length !== byId.size) {
    const loop = [...byId.keys()].filter((id) => !order.includes(id));
    errors.push(`dependency loop among: ${loop.join(', ')}`);
    for (const id of loop) order.push(id);
  }
  // forward pass
  for (const id of order) {
    const r = byId.get(id);
    let s = r.plannedStart; let driver = null;
    for (const d of r.deps) {
      const p = byId.get(d.id); if (!p || p.start == null) continue;
      let need;
      if (d.type === 'SS') need = p.start + (d.lag || 0);
      else if (r.task.milestone && !p.task.milestone) need = p.finish + (d.lag || 0);       // a milestone falls at the end of the week its work ends
      else need = p.finish + 1 + (d.lag || 0);
      if (need > s) { s = need; driver = d.id; }
    }
    r.start = s; r.finish = r.task.milestone ? s : s + r.len - 1; r.slipWeeks = s - r.plannedStart; r.drivenBy = driver;
  }
  const endWeek = Math.max(0, ...[...byId.values()].map((r) => r.finish || 0));
  // backward pass
  for (const id of [...order].reverse()) {
    const r = byId.get(id);
    let lf = endWeek;
    for (const s of succ.get(id)) {
      const q = byId.get(s.id); if (q.lateStart == null) continue;
      let allow;
      if (s.type === 'SS') allow = q.lateStart - s.lag + (r.task.milestone ? 0 : r.len - 1);
      else if (q.task.milestone && !r.task.milestone) allow = q.lateStart - s.lag;
      else allow = q.lateStart - 1 - s.lag;
      if (allow < lf) lf = allow;
    }
    r.lateFinish = lf; r.lateStart = r.task.milestone ? lf : lf - r.len + 1; r.float = r.lateStart - r.start;
  }
  const rows = order.map((id) => {
    const r = byId.get(id); const t = r.task;
    const startDate = weekStart(program, r.start);
    const finishDate = t.milestone ? weekEnd(program, r.start) : weekEnd(program, r.finish);
    const pct = Number(t.percent) || 0;
    const overdue = !!today && pct < 100 && parseDate(today) > parseDate(finishDate);
    return { id, title: t.title, owner: t.owner, milestone: !!t.milestone, phase: t.phase, plannedStart: r.plannedStart, start: r.start, finish: r.finish, len: r.len,
      startDate: t.milestone ? finishDate : startDate, finishDate, slipWeeks: r.slipWeeks, drivenBy: r.drivenBy, float: r.float, critical: r.float <= 0 && !t.loe, loe: !!t.loe, percent: pct, overdue, deps: r.deps };
  });
  rows.sort((a, b) => a.start - b.start || (a.milestone ? 1 : 0) - (b.milestone ? 1 : 0) || a.id.localeCompare(b.id));
  return { rows, byId: new Map(rows.map((r) => [r.id, r])), endWeek, endDate: endWeek ? weekEnd(program, endWeek) : program.startDate,
    critical: rows.filter((r) => r.critical).map((r) => r.id), slipped: rows.filter((r) => r.slipWeeks > 0).map((r) => r.id), overdue: rows.filter((r) => r.overdue).map((r) => r.id), errors };
}

/** the earliest date of a milestone or task finish, by id (null when it is not in the schedule) */
export const finishOf = (sched, id) => (sched.byId.get(id) ? sched.byId.get(id).finishDate : null);

/* ------------------------------------------------------------------ people and hours */

/** estimated hours of a task for a role at the present program length (hours stretch with the schedule) */
export const taskHours = (program, task, roleId) => round2(((task.hours && task.hours[roleId]) || 0) * scaleOf(program));

/**
 * Hours per week for each role, with each task's hours spread evenly over the weeks it occupies.
 * Returns { weeks: [{ week, hours: {A, B}, over: {A, B} }], totals: { A: { planned, capacity, actual, utilisation } }, conflicts: [...] }.
 */
export function resourceLoad(program, roles, tasks, sched) {
  const n = Math.max(sched.endWeek, program.durationWeeks || program.baselineWeeks);
  const weeks = Array.from({ length: n }, (_, i) => ({ week: i + 1, hours: Object.fromEntries(roles.map((r) => [r.id, 0])), tasks: Object.fromEntries(roles.map((r) => [r.id, []])) }));
  for (const t of tasks) {
    const r = sched.byId.get(t.id); if (!r || r.milestone) continue;
    for (const role of roles) {
      const h = taskHours(program, t, role.id); if (!h) continue;
      const per = h / r.len;
      for (let w = r.start; w <= r.finish; w++) { const slot = weeks[w - 1]; if (!slot) continue; slot.hours[role.id] += per; slot.tasks[role.id].push(t.id); }
    }
  }
  const conflicts = [];
  for (const slot of weeks) {
    slot.over = {};
    for (const role of roles) {
      slot.hours[role.id] = round2(slot.hours[role.id]);
      const over = round2(slot.hours[role.id] - role.weeklyHours);
      slot.over[role.id] = over > 0.01 ? over : 0;
      if (over > 0.01) conflicts.push({ week: slot.week, role: role.id, hours: slot.hours[role.id], capacity: role.weeklyHours, over, tasks: slot.tasks[role.id] });
    }
  }
  const totals = {};
  for (const role of roles) {
    const planned = round2(sum(tasks.map((t) => taskHours(program, t, role.id))));
    const capacity = round2(role.weeklyHours * (program.durationWeeks || program.baselineWeeks));
    const actual = round2(sum(tasks.map((t) => (t.actualHours && t.actualHours[role.id]) || 0)));
    totals[role.id] = { planned, capacity, actual, unallocated: round2(capacity - planned), utilisation: capacity ? round2(planned / capacity) : 0, overAllocated: planned > capacity + 0.01 };
  }
  return { weeks, totals, conflicts };
}

/* ------------------------------------------------------------------ money */

export const PRICE_KINDS = ['Planning Estimate', 'Public List Price', 'Distributor Quote', 'Supplier Verified', 'Actual Paid'];

/** labour at the allocation given: rate x weekly hours x weeks, per role. This is the budget's labour figure; the hours placed
    in tasks are checked against it (resourceLoad), never added to it, so no hour is counted twice. */
export function labour(program, roles) {
  const weeks = program.durationWeeks || program.baselineWeeks;
  const rows = roles.map((r) => ({ id: r.id, name: r.name, rate: r.rate, weeklyHours: r.weeklyHours, weeks, hours: round2(r.weeklyHours * weeks), cost: round2(r.rate * r.weeklyHours * weeks) }));
  return { rows, hours: round2(sum(rows.map((r) => r.hours))), cost: round2(sum(rows.map((r) => r.cost))) };
}

/**
 * The bottom-up budget. `lines` are the non-labour items ({ id, category: 'hardware' | 'software' | 'external', amount, kind, ... }).
 * A scenario may change the program length, each role's weekly hours, single lines (amount, or leave out) and the contingency.
 */
export function budget(program, roles, lines, scenario = null) {
  const sc = scenario || {};
  const prog = { ...program, durationWeeks: sc.durationWeeks || program.durationWeeks || program.baselineWeeks };
  const rs = roles.map((r) => ({ ...r, weeklyHours: (sc.weeklyHours && sc.weeklyHours[r.id] != null) ? sc.weeklyHours[r.id] : r.weeklyHours, rate: (sc.rates && sc.rates[r.id] != null) ? sc.rates[r.id] : r.rate }));
  const lab = labour(prog, rs);
  const items = lines.filter((l) => !(sc.exclude || []).includes(l.id)).map((l) => {
    const o = (sc.lines && sc.lines[l.id]) || null;
    const amount = o && o.amount != null ? o.amount : l.amount;
    return { ...l, amount: Number(amount) || 0, kind: (o && o.kind) || l.kind || 'Planning Estimate', changedByScenario: !!o, note: (o && o.note) || l.note || '' };
  }).concat(sc.add || []);
  const by = (c) => round2(sum(items.filter((l) => l.category === c).map((l) => l.amount)));
  const hardware = by('hardware'), software = by('software'), external = by('external');
  const direct = round2(lab.cost + hardware + software + external);
  const pct = sc.contingencyPct != null ? sc.contingencyPct : program.contingencyPct;
  const contingency = round2(direct * pct / 100);
  const unverified = items.filter((l) => l.kind === 'Planning Estimate').length;
  return { durationWeeks: prog.durationWeeks, labour: lab, items, hardware, software, external, direct, contingencyPct: pct, contingency, total: round2(direct + contingency),
    actual: round2(sum(items.map((l) => l.actual || 0))), unverifiedLines: unverified, verifiedLines: items.length - unverified };
}

/**
 * Planned and actual spending per week. Planned labour follows the hours placed in tasks; a line is spent in the week it names
 * (or is spread over the program when it names none). Actual labour comes from the hours logged on tasks (`log`: [{ week, role, hours }]).
 */
export function weeklySpend(program, roles, tasks, lines, sched, log = []) {
  const load = resourceLoad(program, roles, tasks, sched);
  const n = load.weeks.length;
  const rate = Object.fromEntries(roles.map((r) => [r.id, r.rate]));
  const k = scaleOf(program);
  const rows = load.weeks.map((w) => ({ week: w.week, date: weekStart(program, w.week), plannedLabour: round2(sum(roles.map((r) => w.hours[r.id] * r.rate))), plannedOther: 0, actualLabour: 0, actualOther: 0 }));
  for (const l of lines) {
    const amt = Number(l.amount) || 0; if (!amt) continue;
    if (l.week) { const w = Math.min(n, Math.max(1, Math.round((l.week - 1) * k) + 1)); rows[w - 1].plannedOther += amt; } else for (const r of rows) r.plannedOther += amt / n;
    if (l.actual) { const w = l.actualWeek ? Math.min(n, Math.max(1, l.actualWeek)) : null; if (w) rows[w - 1].actualOther += Number(l.actual); }
  }
  for (const e of log) { const r = rows[e.week - 1]; if (r) r.actualLabour += (Number(e.hours) || 0) * (rate[e.role] || 0); }
  let cp = 0, ca = 0;
  for (const r of rows) {
    r.plannedOther = round2(r.plannedOther); r.actualLabour = round2(r.actualLabour); r.actualOther = round2(r.actualOther);
    r.planned = round2(r.plannedLabour + r.plannedOther); r.actual = round2(r.actualLabour + r.actualOther);
    cp += r.planned; ca += r.actual; r.cumPlanned = round2(cp); r.cumActual = round2(ca);
  }
  return rows;
}

/* ------------------------------------------------------------------ parts */

const BAD_LIFECYCLE = ['NRND', 'EOL', 'Obsolete', 'Last Time Buy', 'Discontinued'];
/** lead time text ('6 weeks', '12 wk', '26 Weeks', 'In stock') -> weeks, or null when it cannot be read */
export function leadWeeks(text) {
  if (text == null) return null;
  const s = String(text).toLowerCase();
  if (/in stock|stock|immediate/.test(s) && !/\d/.test(s)) return 0;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(week|wk|day)/); if (!m) return null;
  return m[2] === 'day' ? Math.ceil(Number(m[1]) / 7) : Number(m[1]);
}
/** the channels of a part that are authorised sellers with a readable page */
export const supplyChannels = (part) => (part.channels || []).filter((c) => c.authorised !== false && c.source_kind !== 'not readable' && c.seller);
/** the lowest unit price at a quantity among channels that state one, with where it came from; null when none does */
export function bestPrice(part, qty) {
  let best = null;
  for (const c of part.channels || []) {
    const p = c.price_usd && c.price_usd[String(qty)];
    if (p == null) continue;
    if (!best || p < best.price) best = { price: Number(p), seller: c.seller, source_kind: c.source_kind, read_at: c.read_at };
  }
  return best;
}
/** every warning a part carries. Lifecycle and stock are judged separately: an Active part with no stock is a stock warning only. */
export function partAlerts(part, policy = { maxLeadWeeks: 4, minChannels: 2 }) {
  const a = [];
  const st = part.lifecycle_status || 'not stated';
  if (BAD_LIFECYCLE.some((b) => st.toLowerCase().includes(b.toLowerCase()))) a.push({ level: 'reject', code: 'lifecycle', text: `Lifecycle is "${st}": not allowed in the baseline design without a documented, approved exception` });
  else if (st === 'not stated' || st === 'Preview') a.push({ level: 'warn', code: 'lifecycle-unverified', text: `Lifecycle is "${st}": not verified as Active` });
  if (part.discontinuation_notice) a.push({ level: 'reject', code: 'notice', text: `Notice: ${part.discontinuation_notice}` });
  const ch = supplyChannels(part);
  const role = part.role || '';
  if (role !== 'reference class') {
    if (ch.length < policy.minChannels) a.push({ level: part.critical ? 'warn' : 'info', code: 'single-source', text: ch.length ? `One supply channel (${ch[0].seller})` : 'No supply channel verified' });
    const leads = ch.map((c) => leadWeeks(c.lead_time)).filter((x) => x != null);
    if (leads.length && Math.min(...leads) > policy.maxLeadWeeks) a.push({ level: 'warn', code: 'lead-time', text: `Shortest stated lead time ${Math.min(...leads)} weeks (target ${policy.maxLeadWeeks})` });
    const stocked = ch.some((c) => Number(c.stock) > 0);
    if (ch.length && !stocked) a.push({ level: 'warn', code: 'stock', text: 'No stock verified at any channel' });
    if (!bestPrice(part, 1)) a.push({ level: 'info', code: 'price', text: 'Unit price not verified' });
  }
  if (part.critical && !part.second_source && !part.footprint_compatible_substitute) a.push({ level: 'warn', code: 'no-substitute', text: 'Critical part with no documented substitute' });
  if (part.approval !== 'Approved') a.push({ level: 'info', code: 'approval', text: `Engineering status: ${part.approval || 'Review Required'}` });
  return a;
}
/** the numbers on the BOM health panel */
export function bomHealth(parts, policy) {
  const sel = parts.filter((p) => p.selected);
  const count = (f) => sel.filter(f).length;
  const has = (p, code) => partAlerts(p, policy).some((x) => x.code === code);
  return { selected: sel.length, candidates: parts.length,
    active: count((p) => p.lifecycle_status === 'Active'), multiChannel: count((p) => supplyChannels(p).length >= 2),
    leadExceptions: count((p) => has(p, 'lead-time')), singleSourceCritical: count((p) => p.critical && has(p, 'single-source')),
    lifecycleWarnings: count((p) => has(p, 'lifecycle') || has(p, 'notice')), unverified: count((p) => has(p, 'lifecycle-unverified') || has(p, 'price')) };
}
/** cost of the selected parts per device at a build quantity; `missing` lists the parts with no price at that quantity (the total is then a floor) */
export function bomCost(parts, qty) {
  let total = 0; const missing = []; const rows = [];
  for (const p of parts.filter((x) => x.selected)) {
    const tier = [1, 10, 100, 1000].filter((q) => q <= qty).reverse().map((q) => bestPrice(p, q)).find(Boolean) || null;
    const n = Number(p.qty_per_device) || 1;
    if (!tier) { missing.push(p.id); rows.push({ id: p.id, qty: n, unit: null, ext: null }); continue; }
    total += tier.price * n; rows.push({ id: p.id, qty: n, unit: tier.price, ext: round2(tier.price * n), seller: tier.seller, source_kind: tier.source_kind });
  }
  return { qty, perDevice: round2(total), build: round2(total * qty), missing, complete: missing.length === 0, rows };
}

/* ------------------------------------------------------------------ traceability */

/**
 * User need -> requirement -> design output -> risk control -> verification test -> evidence -> review -> approval.
 * Returns one row per requirement and the list of broken links. Nothing is assumed: a link exists only when a record names it.
 */
export function traceability(m) {
  const { needs = [], requirements = [], outputs = [], risks = [], tests = [], evidence = [], reviews = [] } = m;
  const gaps = [];
  const outBy = (r) => outputs.filter((o) => (o.requirements || []).includes(r.id));
  const testBy = (r) => tests.filter((t) => (t.requirements || []).includes(r.id));
  const controls = risks.flatMap((k) => (k.controls || []).map((c) => ({ ...c, risk: k.id })));
  const ctlBy = (r) => controls.filter((c) => (c.requirements || []).includes(r.id));
  const evBy = (t) => evidence.filter((e) => e.test === t.id);
  const revBy = (e) => reviews.filter((v) => (v.evidence || []).includes(e.id));
  for (const n of needs) if (!requirements.some((r) => (r.needs || []).includes(n.id))) gaps.push({ kind: 'need-without-requirement', id: n.id, text: `${n.id} has no requirement` });
  const rows = requirements.map((r) => {
    const o = outBy(r), t = testBy(r), c = ctlBy(r);
    const ev = t.flatMap(evBy); const rv = ev.flatMap(revBy); const approved = rv.filter((v) => v.approval && v.approval.by && v.approval.date);
    if (!(r.needs || []).length) gaps.push({ kind: 'requirement-without-need', id: r.id, text: `${r.id} traces to no user need` });
    if (!o.length) gaps.push({ kind: 'requirement-without-output', id: r.id, text: `${r.id} has no design output` });
    if (!t.length) gaps.push({ kind: 'requirement-without-test', id: r.id, text: `${r.id} has no verification test` });
    for (const x of t) if (!evBy(x).length) gaps.push({ kind: 'test-without-evidence', id: x.id, text: `${x.id} has no evidence on record` });
    for (const e of ev) if (!revBy(e).length) gaps.push({ kind: 'evidence-without-review', id: e.id, text: `${e.id} has not been reviewed` });
    for (const v of rv) if (!(v.approval && v.approval.by && v.approval.date)) gaps.push({ kind: 'review-without-approval', id: v.id, text: `${v.id} has no approval` });
    const status = approved.length && approved.length === rv.length && ev.length ? 'Approved' : ev.length ? 'Tested' : t.length && o.length ? 'Engineering Draft' : 'Review Required';
    return { id: r.id, text: r.text, needs: r.needs || [], outputs: o.map((x) => x.id), controls: c.map((x) => x.id), risks: [...new Set(c.map((x) => x.risk))], tests: t.map((x) => x.id), evidence: ev.map((x) => x.id), reviews: rv.map((x) => x.id), approved: approved.map((x) => x.id), status };
  });
  for (const c of controls) if (!tests.some((t) => (t.riskControls || []).includes(c.id))) gaps.push({ kind: 'control-without-verification', id: c.id, text: `${c.id} (risk ${c.risk}) has no test that verifies it` });
  const uniq = []; const seen = new Set();
  for (const g of gaps) { const key = g.kind + g.id; if (!seen.has(key)) { seen.add(key); uniq.push(g); } }
  return { rows, gaps: uniq, complete: uniq.length === 0 };
}

/** risk level from severity (1 to 5) and probability (1 to 5), on the scale the register states */
export function riskLevel(sev, prob) {
  const s = sev * prob;
  return s >= 15 || sev === 5 && prob >= 3 ? 'High' : s >= 6 ? 'Medium' : 'Low';
}

/* ------------------------------------------------------------------ gates and approvals */

/**
 * What a gate still needs. A gate may be approved only by a named person, with a date, and only when the earlier gates are
 * approved, its tasks are complete and its evidence records exist. An approval entered without those is reported as not valid.
 */
export function gateStatus(gate, ctx) {
  const { tasksById, evidenceIds, gatesById } = ctx;
  const missing = [];
  for (const g of gate.after || []) { const p = gatesById.get(g); if (!p || !isApproved(p)) missing.push({ kind: 'gate', id: g, text: `Gate ${g} is not approved` }); }
  for (const t of gate.tasks || []) { const x = tasksById.get(t); if (!x) missing.push({ kind: 'task', id: t, text: `Task ${t} does not exist` }); else if ((Number(x.percent) || 0) < 100) missing.push({ kind: 'task', id: t, text: `Task ${t} is ${Number(x.percent) || 0} % complete` }); }
  for (const e of gate.evidence || []) if (!evidenceIds.has(e)) missing.push({ kind: 'evidence', id: e, text: `Evidence ${e} is not on record` });
  const ready = missing.length === 0;
  const a = gate.approval;
  const hasApproval = isApproved(gate);
  let status;
  // a stop can be recorded at any time and releases nothing; a go needs everything the gate asks for
  if (hasApproval && a.decision === 'No-go') status = 'No-go';
  else if (hasApproval && ready) status = a.decision === 'Conditional' ? 'Conditional' : 'Approved';
  else if (hasApproval && !ready) status = 'Approval not valid';
  else if (ready) status = 'Review Required';
  else status = missing.some((m) => m.kind === 'gate') ? 'Blocked' : 'Open';
  return { id: gate.id, status, ready, missing, canApprove: ready, authorisesSpending: status === 'Approved' || status === 'Conditional' };
}
export const isApproved = (g) => !!(g && g.approval && g.approval.by && String(g.approval.by).trim() && g.approval.date && ['Approved', 'Conditional', 'No-go'].includes(g.approval.decision));
/** an approval may be recorded only with a person's name, a date and a decision, and never under an assistant's name */
export function validApproval(a) {
  const problems = [];
  if (!a || !String(a.by || '').trim()) problems.push('a person must be named');
  else if (/\b(claude|assistant|ai|gpt|copilot|bot|automated)\b/i.test(a.by)) problems.push('an approval must come from a person, not from an AI tool');
  if (!a || !/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) problems.push('a date is needed');
  if (!a || !['Approved', 'Conditional', 'No-go'].includes(a.decision)) problems.push('a decision is needed: Approved, Conditional or No-go');
  return { ok: problems.length === 0, problems };
}
/** all gates in order, each with its status, and the first one that is not yet approved (the "current gate") */
export function gates(model) {
  const tasksById = new Map((model.tasks || []).map((t) => [t.id, t]));
  const evidenceIds = new Set((model.evidence || []).map((e) => e.id));
  const gatesById = new Map((model.gates || []).map((g) => [g.id, g]));
  const rows = (model.gates || []).map((g) => ({ ...g, ...gateStatus(g, { tasksById, evidenceIds, gatesById }) }));
  const current = rows.find((g) => !['Approved', 'Conditional'].includes(g.status)) || null;
  return { rows, current };
}

/* ------------------------------------------------------------------ local changes kept apart from the generated data */

/**
 * The page's data are generated files (the "seed"). What a person changes on the page is kept apart, as edits by record id:
 *   edits = { [collection]: { [id]: { [field]: { value, base, at } } } }, added = { [collection]: [records] }
 * so a regenerated seed never overwrites a manual change. `base` is the seed's value when the change was made: if the seed
 * later differs from it, the manual value still wins and the difference is listed for a person to look at.
 */
export function applyEdits(seed, edits = {}, added = {}) {
  const out = {}; const conflicts = [];
  for (const [name, val] of Object.entries(seed)) {
    if (!Array.isArray(val)) {
      const e = (edits[name] && edits[name]._) || {};
      if (val && typeof val === 'object') {
        out[name] = { ...val };
        for (const [f, c] of Object.entries(e)) { if (JSON.stringify(val[f]) !== JSON.stringify(c.base) && JSON.stringify(val[f]) !== JSON.stringify(c.value)) conflicts.push({ collection: name, id: '_', field: f, seed: val[f], mine: c.value, base: c.base }); out[name][f] = c.value; }
      } else out[name] = val;
      continue;
    }
    const ce = edits[name] || {};
    out[name] = val.map((rec) => {
      const e = ce[rec.id]; if (!e) return rec;
      const r = { ...rec };
      for (const [f, c] of Object.entries(e)) {
        if (JSON.stringify(rec[f]) !== JSON.stringify(c.base) && JSON.stringify(rec[f]) !== JSON.stringify(c.value)) conflicts.push({ collection: name, id: rec.id, field: f, seed: rec[f], mine: c.value, base: c.base });
        r[f] = c.value;
      }
      return r;
    }).concat((added[name] || []).filter((a) => !val.some((r) => r.id === a.id)));
  }
  const orphans = [];
  for (const [name, ce] of Object.entries(edits)) for (const id of Object.keys(ce)) if (id !== '_' && Array.isArray(seed[name]) && !seed[name].some((r) => r.id === id) && !(added[name] || []).some((r) => r.id === id)) orphans.push({ collection: name, id });
  return { model: out, conflicts, orphans };
}
/** record one manual change (returns new edits; the seed value at that moment is kept as `base`) */
export function setEdit(edits, seed, collection, id, field, value, at) {
  const coll = seed[collection];
  const rec = Array.isArray(coll) ? coll.find((r) => r.id === id) : coll;
  const base = rec ? rec[field] : undefined;
  const key = Array.isArray(coll) ? id : '_';
  const next = { ...edits, [collection]: { ...(edits[collection] || {}), [key]: { ...((edits[collection] || {})[key] || {}) } } };
  if (JSON.stringify(base) === JSON.stringify(value)) delete next[collection][key][field]; else next[collection][key][field] = { value, base, at };
  if (!Object.keys(next[collection][key]).length) delete next[collection][key];
  return next;
}

/* ------------------------------------------------------------------ history with a hash chain */

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
/** a stable text form of a value (object keys in order), so the same content always gives the same hash */
export function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
export async function sha256(text) { return hex(await globalThis.crypto.subtle.digest('SHA-256', enc.encode(text))); }
/** add an entry to the history. Each entry carries the hash of the one before it, so a removed or altered entry shows. */
export async function appendEvent(log, event) {
  const prev = log.length ? log[log.length - 1].hash : '0'.repeat(64);
  const body = { n: log.length + 1, at: event.at, who: event.who || 'not stated', action: event.action, collection: event.collection || null, id: event.id || null, field: event.field || null, from: event.from === undefined ? null : event.from, to: event.to === undefined ? null : event.to, prev };
  return [...log, { ...body, hash: await sha256(stable(body)) }];
}
/** check the whole history; returns the number of the first entry that does not fit, or 0 when all do */
export async function verifyLog(log) {
  let prev = '0'.repeat(64);
  for (let i = 0; i < log.length; i++) {
    const { hash, ...body } = log[i];
    if (body.prev !== prev || body.n !== i + 1 || (await sha256(stable(body))) !== hash) return i + 1;
    prev = hash;
  }
  return 0;
}

/* ------------------------------------------------------------------ export */

const cell = (v) => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
/** rows -> CSV text. columns: [{ key, label }] or [key] */
export function toCsv(rows, columns) {
  const cols = columns.map((c) => (typeof c === 'string' ? { key: c, label: c } : c));
  return [cols.map((c) => cell(c.label)).join(','), ...rows.map((r) => cols.map((c) => cell(typeof c.key === 'function' ? c.key(r) : r[c.key])).join(','))].join('\r\n') + '\r\n';
}
export const money = (x) => (x == null || Number.isNaN(Number(x)) ? 'not stated' : '$' + Number(x).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));

/* ------------------------------------------------------------------ tools and subscriptions */

/** what one tool costs for `qty` seats (or units) over `months`. A yearly price is charged for the whole year, a one-time price once.
    Returns { cost, basis } with cost null when the price is not known (quotation, not found). */
export function toolCost(tool, qty = 1, months = 1) {
  if (!tool) return { cost: null, basis: 'tool not in the list' };
  const p = tool.price_usd; const u = String(tool.price_unit || '').toLowerCase();
  if (u === 'free' || p === 0) return { cost: 0, basis: 'no charge' };
  if (p == null) return { cost: null, basis: u.includes('quote') ? 'sold by quotation' : 'price not found' };
  if (u.includes('per year')) return { cost: round2(p * qty * Math.ceil(months / 12)), basis: 'yearly price, whole year charged' };
  if (u.includes('one-time')) return { cost: round2(p * qty), basis: 'one payment' };
  if (u.includes('month')) return { cost: round2(p * qty * months), basis: 'price x quantity x months' };
  return { cost: null, basis: 'billed by use; no fixed figure' };
}
/** the chosen stack priced from the tool list; `missing` counts chosen rows whose price is not known */
export function stackCost(stack, tools) {
  const byId = new Map(tools.map((t) => [t.id, t]));
  const rows = stack.map((s) => { const tool = byId.get(s.tool) || null; return { ...s, name: tool ? tool.name : s.tool, plan: tool ? tool.plan : null, unit: tool ? tool.price_usd : null, unitText: tool ? tool.price_unit : null, kind: tool ? tool.price_kind : 'not found', verified: !!(tool && tool.verified), url: tool ? tool.source_url : null, ...toolCost(tool, s.qty, s.months) }; });
  const chosen = rows.filter((r) => r.chosen);
  return { rows, total: round2(sum(chosen.map((r) => r.cost || 0))), missing: chosen.filter((r) => r.cost == null).length, optional: round2(sum(rows.filter((r) => !r.chosen).map((r) => r.cost || 0))) };
}

/* ------------------------------------------------------------------ dependencies as text */

/** [{ id, type, lag }] -> 'T-201, T-202:SS+1' */
export const fmtDeps = (deps = []) => deps.map((d) => (typeof d === 'string' ? d : d.type === 'SS' ? `${d.id}:SS${d.lag ? '+' + d.lag : ''}` : d.lag ? `${d.id}+${d.lag}` : d.id)).join(', ');
/** 'T-201, T-202:SS+1' -> [{ id, type, lag }]; throws on text it cannot read */
export function parseDeps(text) {
  return String(text || '').split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^([A-Za-z]+-\d+)(?::(SS|FS))?(?:\+(\d+))?$/i);
    if (!m) throw new Error(`Cannot read "${s}". Write an id such as T-201, T-201:SS or T-201:SS+1.`);
    return { id: m[1].toUpperCase(), type: (m[2] || 'FS').toUpperCase(), lag: Number(m[3] || 0) };
  });
}
