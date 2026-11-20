/* Company plan: calculations across the plans, as pure functions (tests: tests/company-plan.test.mjs).
   Public code, no figures. Money in US dollars, dates 'YYYY-MM-DD' (UTC), weeks start on Monday.

   One rule runs through all of it: a value that is not known stays null and is reported as missing. A total that leaves
   something out says so (`notEstimated`, `unpricedHours`, `missing`). Nothing is filled in. */
import * as C from './calc.js';

const sum = (a) => a.reduce((s, x) => s + (Number(x) || 0), 0);
const r2 = C.round2;
const monday = (date) => { const t = C.parseDate(date); return C.fmtDate(t - ((new Date(t).getUTCDay() + 6) % 7) * C.DAY); };
const weeksBetween = (a, b) => Math.round((C.parseDate(b) - C.parseDate(a)) / (7 * C.DAY));
export const monthOf = (date) => String(date).slice(0, 7);

/* ------------------------------------------------------------------ programs and their schedules */

/** the plans, each with its own tasks and cost lines. The ECG/MCG program is the existing Product Build data, untouched. */
export function programs(m) {
  return [
    { id: 'ecg', n: 1, name: 'ECG/MCG', program: m.program, tasks: m.tasks, lines: m.lines, phases: m.phases, gates: m.gates, href: '/product-build/' },
    { id: 'funding', n: 2, name: 'Funding and partnerships', program: m.fProgram, tasks: m.fTasks, lines: m.fLines, phases: m.fPhases, gates: [], href: '/plan/funding/' },
  ];
}
/** each program scheduled on its own dependencies */
export const schedules = (m, today = null) => programs(m).map((p) => ({ ...p, sched: C.schedule(p.program, p.tasks, today) }));
/** everyone whose hours are planned: the two engineering roles (one record, shared by every program) and any other person */
export const people = (m) => [...m.roles, ...(m.extraPeople || [])];

/* ------------------------------------------------------------------ shared capacity */

/**
 * Hours by calendar week, person and program. A task's hours are spread evenly over the weeks it occupies.
 * A person has one weekly capacity for all programs together: that is what prevents an hour being counted twice.
 */
export function portfolioLoad(m, scheds) {
  const ppl = people(m);
  const start = monday(scheds.map((s) => s.program.startDate).sort()[0]);
  const end = scheds.map((s) => s.sched.endDate).sort().pop();
  const n = Math.max(1, weeksBetween(start, monday(end)) + 1);
  const weeks = Array.from({ length: n }, (_, i) => ({ index: i, date: C.addDays(start, 7 * i), by: Object.fromEntries(ppl.map((p) => [p.id, { total: 0 }])), tasks: Object.fromEntries(ppl.map((p) => [p.id, []])) }));
  for (const s of scheds) {
    const off = weeksBetween(start, monday(s.program.startDate));
    for (const t of s.tasks) {
      const row = s.sched.byId.get(t.id); if (!row || row.milestone) continue;
      for (const p of ppl) {
        const h = C.taskHours(s.program, t, p.id); if (!h) continue;
        for (let w = row.start; w <= row.finish; w++) { const slot = weeks[off + w - 1]; if (!slot) continue; const cell = slot.by[p.id]; cell[s.id] = (cell[s.id] || 0) + h / row.len; cell.total += h / row.len; slot.tasks[p.id].push(t.id); }
      }
    }
  }
  const conflicts = []; const totals = {};
  for (const p of ppl) totals[p.id] = { hours: 0, capacity: 0, over: 0, overWeeks: 0, cost: p.rate == null ? null : 0, byProgram: {}, unknownCapacity: p.weeklyHours == null };
  for (const w of weeks) {
    w.over = {};
    for (const p of ppl) {
      const cell = w.by[p.id]; for (const k of Object.keys(cell)) cell[k] = r2(cell[k]);
      const cap = p.weeklyHours;
      const over = cap == null ? 0 : r2(cell.total - cap);
      w.over[p.id] = over > 0.01 ? over : 0;
      const t = totals[p.id]; t.hours += cell.total; if (cap != null) t.capacity += cap;
      for (const s of scheds) if (cell[s.id]) t.byProgram[s.id] = r2((t.byProgram[s.id] || 0) + cell[s.id]);
      if (over > 0.01) { t.over += over; t.overWeeks++; conflicts.push({ index: w.index, date: w.date, person: p.id, hours: cell.total, capacity: cap, over, programs: scheds.filter((s) => cell[s.id]).map((s) => s.id), tasks: w.tasks[p.id] }); }
    }
  }
  for (const p of ppl) { const t = totals[p.id]; t.hours = r2(t.hours); t.over = r2(t.over); t.unallocated = t.unknownCapacity ? null : r2(t.capacity - t.hours); if (p.rate != null) t.cost = r2(t.hours * p.rate); }
  return { start, weeks, conflicts, totals, people: ppl, unpricedHours: r2(sum(ppl.filter((p) => p.rate == null).map((p) => totals[p.id].hours))) };
}

/* ------------------------------------------------------------------ budgets */

/**
 * One program's budget, bottom-up: hours placed in tasks times each person's rate, plus the cost lines that have a figure.
 * Lines with no figure are counted in notEstimated and left out, so the total is a floor until they are quoted.
 */
export function programBudget(m, p) {
  const ppl = people(m); const rate = Object.fromEntries(ppl.map((q) => [q.id, q.rate]));
  const hours = Object.fromEntries(ppl.map((q) => [q.id, r2(sum(p.tasks.map((t) => C.taskHours(p.program, t, q.id))))]));
  const labour = r2(sum(ppl.filter((q) => q.rate != null).map((q) => hours[q.id] * q.rate)));
  const unpricedHours = r2(sum(ppl.filter((q) => q.rate == null).map((q) => hours[q.id])));
  const known = p.lines.filter((l) => l.amount != null);
  const other = r2(sum(known.map((l) => l.amount)));
  const groups = {}; for (const l of p.lines) { const g = groups[l.group || l.category] || (groups[l.group || l.category] = { amount: 0, notEstimated: 0 }); if (l.amount == null) g.notEstimated++; else g.amount = r2(g.amount + Number(l.amount)); }
  const direct = r2(labour + other); const pct = p.program.contingencyPct || 0; const contingency = r2(direct * pct / 100);
  return { id: p.id, hours, labour, unpricedHours, other, groups, notEstimated: p.lines.length - known.length, lines: p.lines.length, direct, contingencyPct: pct, contingency, total: r2(direct + contingency), isFloor: p.lines.length - known.length > 0 || unpricedHours > 0, rate };
}
/**
 * The budgets side by side. The ECG/MCG figure is that plan's own total (its labour is by allocation: rate times
 * weekly hours times weeks), taken as it stands so that the two pages can never disagree.
 */
export function portfolioBudget(m) {
  const ps = programs(m);
  const ecg = C.budget(m.program, m.roles, m.lines);
  const rows = ps.map((p) => {
    if (p.id === 'ecg') return { id: 'ecg', name: p.name, labour: ecg.labour.cost, other: r2(ecg.hardware + ecg.software + ecg.external), contingency: ecg.contingency, total: ecg.total, notEstimated: 0, unpricedHours: 0, isFloor: false, basis: 'The ECG/MCG plan\'s own planning total; labor by allocation' };
    const b = programBudget(m, p);
    return { id: p.id, name: p.name, labour: b.labour, other: b.other, contingency: b.contingency, total: b.total, notEstimated: b.notEstimated, unpricedHours: b.unpricedHours, isFloor: b.isFloor, basis: 'Hours placed in tasks times rate, plus the cost lines that have a figure' };
  });
  return { rows, total: r2(sum(rows.map((r) => r.total))), notEstimated: sum(rows.map((r) => r.notEstimated)), unpricedHours: r2(sum(rows.map((r) => r.unpricedHours))), isFloor: rows.some((r) => r.isFloor) };
}

/* ------------------------------------------------------------------ money by month */

export const EXPENSE_KINDS = ['Quote', 'Purchase order', 'Invoice', 'Paid'];
/**
 * Planned, committed and actual spending by month and program, with cash in and the cash balance.
 *   planned   labour from the hours placed in tasks (people with a rate), and each cost line in its planned week
 *   committed expense records that are a purchase order, an invoice or paid
 *   actual    expense records that are paid, hours logged times rate, and amounts paid on the ECG/MCG cost lines
 *   cash in   funding recorded as received (by its date)
 * capital.cashOnHand null means the balance and the runway cannot be worked out, and the result says so.
 */
export function monthly(m, scheds, load) {
  const ppl = people(m); const rate = Object.fromEntries(ppl.map((p) => [p.id, p.rate]));
  const months = new Map();
  const at = (mo) => { if (!months.has(mo)) months.set(mo, { month: mo, planned: {}, committed: {}, actual: {}, cashIn: 0, funding: 0 }); return months.get(mo); };
  const add = (o, k, v) => { o[k] = r2((o[k] || 0) + v); };
  for (const w of load.weeks) { const mo = at(monthOf(w.date)); for (const p of ppl) { if (p.rate == null) continue; for (const s of scheds) { const h = w.by[p.id][s.id]; if (h) add(mo.planned, s.id, h * p.rate); } } }
  for (const s of scheds) {
    const k = C.scaleOf(s.program); const n = Math.max(1, s.sched.endWeek);
    for (const l of s.lines) {
      if (l.amount != null && Number(l.amount)) {
        if (l.week) add(at(monthOf(C.weekStart(s.program, Math.min(n, Math.round((l.week - 1) * k) + 1)))).planned, s.id, Number(l.amount));
        else for (let w = 1; w <= n; w++) add(at(monthOf(C.weekStart(s.program, w))).planned, s.id, Number(l.amount) / n);
      }
      if (l.actual && l.actualWeek) { const mo = at(monthOf(C.weekStart(s.program, l.actualWeek))); add(mo.actual, s.id, Number(l.actual)); add(mo.committed, s.id, Number(l.actual)); }
    }
  }
  for (const e of m.expenses || []) { if (!e.date || !Number(e.amount)) continue; const mo = at(monthOf(e.date)); const pid = e.program || 'shared'; if (['Purchase order', 'Invoice', 'Paid'].includes(e.kind)) add(mo.committed, pid, Number(e.amount)); if (e.kind === 'Paid') add(mo.actual, pid, Number(e.amount)); }
  for (const h of m.hoursLog || []) { const pid = h.program || 'ecg'; const s = scheds.find((q) => q.id === pid); if (!s || rate[h.role] == null) continue; add(at(monthOf(C.weekStart(s.program, Number(h.week)))).actual, pid, Number(h.hours || 0) * rate[h.role]); }
  for (const o of m.opportunities || []) if (o.stage === 'Cash received' && o.receivedDate && Number(o.amountReceived)) { const mo = at(monthOf(o.receivedDate)); mo.funding = r2(mo.funding + Number(o.amountReceived)); }
  const rows = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  const cash0 = m.capital && m.capital.cashOnHand != null ? Number(m.capital.cashOnHand) : null;
  let bal = cash0, cumP = 0, cumA = 0, runwayMonth = null;
  for (const r of rows) {
    r.plannedTotal = r2(sum(Object.values(r.planned))); r.committedTotal = r2(sum(Object.values(r.committed))); r.actualTotal = r2(sum(Object.values(r.actual)));
    r.cashIn = r.funding; cumP += r.plannedTotal; cumA += r.actualTotal; r.cumPlanned = r2(cumP); r.cumActual = r2(cumA);
    if (bal != null) { bal = r2(bal + r.cashIn - r.plannedTotal); r.balance = bal; if (bal < 0 && !runwayMonth) runwayMonth = r.month; } else r.balance = null;
  }
  const totalPlanned = r2(cumP); const cashIn = r2(sum(rows.map((r) => r.cashIn)));
  return { rows, cashOnHand: cash0, totalPlanned, totalActual: r2(cumA), cashIn, runwayKnown: cash0 != null, runwayMonth, monthsOfRunway: cash0 == null ? null : runwayMonth ? rows.findIndex((r) => r.month === runwayMonth) : rows.length,
    fundingGap: cash0 == null ? null : r2(Math.max(0, totalPlanned - cash0 - cashIn)), avgBurn: rows.length ? r2(totalPlanned / rows.length) : 0 };
}

/* ------------------------------------------------------------------ funding pipeline */

export const FUNDING_STAGES = ['Identified', 'Eligibility checked', 'Application or negotiation', 'Submitted', 'Award or commitment', 'Cash received', 'Closed, not pursued'];
/**
 * The pipeline by stage. Requested and attainable amounts are kept apart from probability-weighted ones, and both apart
 * from money actually received. Only "Cash received" counts as available. A missing probability gives no weighted figure.
 */
export function pipeline(opps) {
  const live = opps.filter((o) => o.stage !== 'Closed, not pursued');
  const stages = FUNDING_STAGES.slice(0, 6).map((name) => { const list = live.filter((o) => o.stage === name); return { name, count: list.length, requested: r2(sum(list.map((o) => o.amountRequested))), attainable: r2(sum(list.map((o) => o.amountAttainable))), ids: list.map((o) => o.id) }; });
  const prospect = live.filter((o) => !['Award or commitment', 'Cash received'].includes(o.stage));
  const withP = prospect.filter((o) => o.probability != null && o.amountAttainable != null);
  return { stages, count: live.length,
    received: r2(sum(live.filter((o) => o.stage === 'Cash received').map((o) => o.amountReceived))),
    committed: r2(sum(live.filter((o) => o.stage === 'Award or commitment').map((o) => o.amountAttainable))),
    prospective: r2(sum(prospect.map((o) => o.amountAttainable))),
    weighted: r2(sum(withP.map((o) => o.amountAttainable * o.probability / 100))),
    weightedCovers: withP.length, noProbability: prospect.length - withP.length, noAmount: prospect.filter((o) => o.amountAttainable == null).length };
}
/** deadlines in date order, with the days left from today; opportunities with no verified date are listed apart */
export function deadlines(opps, today) {
  const dated = opps.filter((o) => o.deadline && o.stage !== 'Closed, not pursued').map((o) => ({ ...o, days: Math.round((C.parseDate(o.deadline) - C.parseDate(today)) / C.DAY) })).sort((a, b) => a.deadline.localeCompare(b.deadline));
  return { upcoming: dated.filter((o) => o.days >= 0), past: dated.filter((o) => o.days < 0), undated: opps.filter((o) => !o.deadline && o.stage !== 'Closed, not pursued') };
}
/**
 * Guard against charging the same cost or the same hours to two awards.
 * allocations: [{ id, award, kind: 'expense' | 'hours', ref (expense id, or person id), week (for hours), amount (dollars or hours) }]
 */
export function allocationCheck(allocations, expenses, hoursLog) {
  const problems = [];
  const byExp = new Map(); for (const a of allocations.filter((x) => x.kind === 'expense')) byExp.set(a.ref, [...(byExp.get(a.ref) || []), a]);
  for (const [ref, list] of byExp) { const e = expenses.find((x) => x.id === ref); const total = r2(sum(list.map((a) => a.amount)));
    if (!e) problems.push({ kind: 'unknown-expense', ref, text: `${ref} is allocated but is not an expense on record` });
    else if (total > Number(e.amount) + 0.005) problems.push({ kind: 'expense-over-allocated', ref, text: `${ref} of ${C.money(e.amount)} is allocated ${C.money(total)} across ${[...new Set(list.map((a) => a.award))].join(', ')}` }); }
  const byPw = new Map(); for (const a of allocations.filter((x) => x.kind === 'hours')) { const k = `${a.ref}|${a.week}`; byPw.set(k, [...(byPw.get(k) || []), a]); }
  for (const [k, list] of byPw) { const [person, week] = k.split('|'); const logged = r2(sum(hoursLog.filter((h) => h.role === person && String(h.week) === week).map((h) => h.hours))); const total = r2(sum(list.map((a) => a.amount)));
    if (total > logged + 0.005) problems.push({ kind: 'hours-over-allocated', ref: k, text: `${total} hours of ${person} in week ${week} are charged to ${[...new Set(list.map((a) => a.award))].join(', ')}; ${logged} were logged` }); }
  return { problems, ok: problems.length === 0 };
}

/* ------------------------------------------------------------------ readiness */

/** engineering readiness of one program from its own records: coverage, tests, evidence, defects, gates. Counts only. */
export function readiness(part) {
  const { requirements = [], tests = [], evidence = [], anomalies = [], risks = [], gates = [], tasks = [], needs = [], outputs = [], reviews = [] } = part;
  const trace = C.traceability({ needs, requirements, outputs, risks, tests, evidence, reviews });
  const result = (t) => { const e = evidence.filter((q) => q.test === t.id && q.result && q.result !== 'Not a test'); return !e.length ? 'Not run' : e.some((q) => q.result === 'Fail') ? 'Fail' : 'Pass'; };
  const res = tests.map(result);
  const g = C.gates({ tasks, evidence, gates });
  const controls = risks.flatMap((k) => k.controls || []);
  return { requirements: requirements.length, withTest: requirements.filter((r) => tests.some((t) => (t.requirements || []).includes(r.id))).length, withEvidence: trace.rows.filter((r) => r.evidence.length).length, approved: trace.rows.filter((r) => r.status === 'Approved').length,
    tests: tests.length, passed: res.filter((x) => x === 'Pass').length, failed: res.filter((x) => x === 'Fail').length, notRun: res.filter((x) => x === 'Not run').length,
    evidence: evidence.filter((e) => tests.some((t) => t.id === e.test)).length, openDefects: anomalies.filter((a) => a.status !== 'Closed').length,
    highRisks: risks.filter((k) => C.riskLevel(k.severity, k.probability) === 'High').length, risks: risks.length, controls: controls.length, controlsVerified: controls.filter((c) => tests.some((t) => (t.riskControls || []).includes(c.id) && result(t) === 'Pass')).length,
    gates: g.rows.length, gatesApproved: g.rows.filter((q) => ['Approved', 'Conditional'].includes(q.status)).length, currentGate: g.current, gateRows: g.rows, gaps: trace.gaps.length };
}

/* ------------------------------------------------------------------ decisions */

/** decisions in due-date order with the days left; a decision counts as made only with text, a person's name and a date */
export function decisionQueue(decisions, today) {
  const rows = decisions.map((d) => ({ ...d, made: !!(d.decision && d.decidedBy && d.decidedOn), days: d.due ? Math.round((C.parseDate(d.due) - C.parseDate(today)) / C.DAY) : null }));
  rows.sort((a, b) => (a.made - b.made) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
  return { rows, open: rows.filter((r) => !r.made).length, overdue: rows.filter((r) => !r.made && r.days != null && r.days < 0).length, next: rows.find((r) => !r.made) || null };
}

/* ------------------------------------------------------------------ everything the pages show */

/**
 * Every figure the pages show, worked out from the page data and one person's changes (store = { edits, added, removed }).
 * A change to a collection or a record that the page data no longer holds is left out and not counted: it cannot crash a page.
 * logOk is the last result of the history check, carried over between redraws.
 */
export function derive(seed, store, today, logOk = null) {
  const added = {}; for (const [k, v] of Object.entries(store.added || {})) if (Array.isArray(seed[k])) added[k] = v.filter((r) => !((store.removed || {})[k] || []).includes(r.id));
  const r = C.applyEdits(seed, store.edits || {}, added);
  const log = r.model.hoursLog || [];
  const tasks = r.model.tasks.map((t) => { const a = { A: 0, B: 0 }; for (const e of log) if (e.task === t.id) a[e.role] = (a[e.role] || 0) + Number(e.hours || 0); return { ...t, actualHours: a }; });
  const m = { ...r.model, tasks };
  const inForce = (c, id) => (Array.isArray(seed[c]) ? m[c].some((q) => q.id === id) : id === '_' && seed[c] != null && typeof seed[c] === 'object');
  let changes = 0; for (const [c, recs] of Object.entries(store.edits || {})) for (const [id, rec] of Object.entries(recs)) if (inForce(c, id)) changes += Object.keys(rec).length; for (const a of Object.values(added)) changes += a.length;
  // the ECG/MCG plan's own figures, exactly as its sections expect them
  const sched = C.schedule(m.program, tasks, today); const eLoad = C.resourceLoad(m.program, m.roles, tasks, sched); const bud = C.budget(m.program, m.roles, m.lines); const spend = C.weeklySpend(m.program, m.roles, tasks, m.lines, sched, log);
  const nowWeek = C.weekOf(m.program, today); const upto = Math.min(Math.max(nowWeek, 0), spend.length);
  let status = 'On plan', statusWhy = 'no task is overdue or pushed later';
  if (today < m.program.startDate) { status = 'Not started'; statusWhy = `the program starts on ${m.program.startDate}`; }
  if (sched.overdue.length || sched.slipped.length || sched.errors.length || sched.endWeek > m.program.durationWeeks || eLoad.conflicts.length) { status = 'At risk'; statusWhy = [sched.overdue.length && `${sched.overdue.length} overdue`, sched.slipped.length && `${sched.slipped.length} pushed later`, eLoad.conflicts.length && `${eLoad.conflicts.length} overloaded weeks`, sched.endWeek > m.program.durationWeeks && 'the schedule runs past the program', sched.errors.length && 'schedule errors'].filter(Boolean).join(', '); }
  const ecg = { today, nowWeek, sched, load: eLoad, bud, spend, status, statusWhy, gates: C.gates(m), trace: C.traceability(m), stack: C.stackCost(m.stack, m.tools), bom: C.bomHealth(m.parts), bomCost: [1, 10, 100, 1000].map((q) => C.bomCost(m.parts, q)),
    scenarios: m.scenarios.map((s) => ({ ...s, b: C.budget(m.program, m.roles, m.lines, s), endDate: C.schedule({ ...m.program, durationWeeks: s.durationWeeks || m.program.durationWeeks }, tasks).endDate })),
    spendActual: spend.length ? spend[spend.length - 1].cumActual : 0, spendPlanned: upto ? spend[upto - 1].cumPlanned : 0, conflicts: r.conflicts, orphans: r.orphans, changes, logOk };
  // the company-wide figures
  const scheds = schedules(m, today); const load = portfolioLoad(m, scheds);
  const byProgram = Object.fromEntries(scheds.map((s) => [s.id, { ...s, next: s.sched.rows.filter((q) => q.milestone && q.percent < 100 && q.finishDate >= today)[0] || s.sched.rows.filter((q) => q.milestone)[0] || null }]));
  const d = { today, ecg, scheds, byProgram, load, budget: portfolioBudget(m), monthly: monthly(m, scheds, load), pipe: pipeline(m.opportunities), dl: deadlines(m.opportunities, today),
    readE: readiness({ needs: m.needs, requirements: m.requirements, outputs: m.outputs, risks: m.risks, tests: m.tests, evidence: m.evidence, reviews: m.reviews, gates: m.gates, tasks: m.tasks, anomalies: m.anomalies || [] }),
    decisions: decisionQueue(m.execDecisions, today), alloc: allocationCheck(m.allocations, m.expenses, log), changes };
  return { m, d };
}
