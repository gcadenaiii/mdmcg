/* Company plan: calculations across the three programs, as pure functions (tests: tests/company-plan.test.mjs).
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

/** the three programs, each with its own tasks and cost lines. The ECG/MCG program is the existing Product Build data, untouched. */
export function programs(m) {
  return [
    { id: 'battery', n: 1, name: 'Battery product', program: m.bProgram, tasks: m.bTasks, lines: m.bLines, phases: m.bPhases, gates: m.bGates, href: '/plan/battery/' },
    { id: 'ecg', n: 2, name: 'ECG/MCG', program: m.program, tasks: m.tasks, lines: m.lines, phases: m.phases, gates: m.gates, href: '/product-build/' },
    { id: 'funding', n: 3, name: 'Funding and partnerships', program: m.fProgram, tasks: m.fTasks, lines: m.fLines, phases: m.fPhases, gates: [], href: '/plan/funding/' },
  ];
}
/** each program scheduled on its own dependencies. shift = { programId: weeks } moves a program's start (for what-if). */
export function schedules(m, today = null, shift = {}) {
  return programs(m).map((p) => {
    const program = { ...p.program, startDate: C.addDays(p.program.startDate, 7 * (shift[p.id] || 0)) };
    return { ...p, program, sched: C.schedule(program, p.tasks, today) };
  });
}
/** everyone whose hours are planned: the two engineering roles (one record, shared by every program) and any other person */
export const people = (m) => [...m.roles, ...(m.extraPeople || [])];

/* ------------------------------------------------------------------ shared capacity */

/**
 * Hours by calendar week, person and program. A task's hours are spread evenly over the weeks it occupies.
 * A person has one weekly capacity for all programs together: that is what prevents an hour being counted twice.
 * extra = { personId: hours } adds weekly capacity (a second engineer, for a what-if).
 */
export function portfolioLoad(m, scheds, extra = {}) {
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
      const cap = p.weeklyHours == null ? null : p.weeklyHours + (extra[p.id] || 0);
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

/**
 * What a change of plan does: move programs, add capacity. Returns the finish of each program, the overloaded weeks and
 * the cost of the added capacity. extraRate prices added hours; with no rate the cost is null.
 */
export function reallocate(m, scenario, today = null) {
  const scheds = schedules(m, today, scenario.shift || {});
  const load = portfolioLoad(m, scheds, scenario.extra || {});
  const ppl = people(m);
  const extraCost = Object.entries(scenario.extra || {}).reduce((s, [id, h]) => { const p = ppl.find((q) => q.id === id); const rate = scenario.extraRate != null ? scenario.extraRate : p && p.rate; return rate == null || s == null ? null : s + rate * h * load.weeks.length; }, 0);
  return { id: scenario.id, name: scenario.name, ends: Object.fromEntries(scheds.map((s) => [s.id, s.sched.endDate])), overWeeks: Object.fromEntries(ppl.map((p) => [p.id, load.totals[p.id].overWeeks])), overHours: Object.fromEntries(ppl.map((p) => [p.id, load.totals[p.id].over])), conflicts: load.conflicts.length, extraCost: extraCost == null ? null : r2(extraCost), lastEnd: scheds.map((s) => s.sched.endDate).sort().pop() };
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
 * The three budgets side by side. The ECG/MCG figure is that plan's own total (its labour is by allocation: rate times
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
 *   cash in   funding recorded as received (by its date); revenue only when `includeRevenue` is set (it is a hypothesis)
 * capital.cashOnHand null means the balance and the runway cannot be worked out, and the result says so.
 */
export function monthly(m, scheds, load, opts = {}) {
  const ppl = people(m); const rate = Object.fromEntries(ppl.map((p) => [p.id, p.rate]));
  const months = new Map();
  const at = (mo) => { if (!months.has(mo)) months.set(mo, { month: mo, planned: {}, committed: {}, actual: {}, cashIn: 0, revenue: 0, funding: 0 }); return months.get(mo); };
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
  if (opts.includeRevenue) for (const rv of opts.revenue || []) { const mo = at(rv.month); mo.revenue = r2(mo.revenue + rv.amount); }
  const rows = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
  const cash0 = m.capital && m.capital.cashOnHand != null ? Number(m.capital.cashOnHand) : null;
  let bal = cash0, cumP = 0, cumA = 0, runwayMonth = null;
  for (const r of rows) {
    r.plannedTotal = r2(sum(Object.values(r.planned))); r.committedTotal = r2(sum(Object.values(r.committed))); r.actualTotal = r2(sum(Object.values(r.actual)));
    r.cashIn = r2(r.funding + r.revenue); cumP += r.plannedTotal; cumA += r.actualTotal; r.cumPlanned = r2(cumP); r.cumActual = r2(cumA);
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
    weightedCovers: withP.length, noProbability: prospect.length - withP.length, noAmount: prospect.filter((o) => o.amountAttainable == null).length,
    byTarget: ['battery', 'ecg', 'both'].map((t) => ({ target: t, count: live.filter((o) => o.target === t).length, attainable: r2(sum(live.filter((o) => o.target === t).map((o) => o.amountAttainable))) })) };
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

/* ------------------------------------------------------------------ sales funnel */

export const FUNNEL_STAGES = ['Customer discovery', 'Qualified opportunity', 'Technical evaluation', 'Paid pilot', 'Customer acceptance', 'Purchase order', 'Delivery', 'Support and renewal'];
/** how many customer records have reached each stage, the step-to-step conversion, and the target for the stage where one is set */
export function funnel(customers, targets = {}) {
  const idx = (c) => FUNNEL_STAGES.indexOf(c.stage);
  const live = customers.filter((c) => idx(c) >= 0 && !c.lost);
  const rows = FUNNEL_STAGES.map((name, i) => { const reached = live.filter((c) => idx(c) >= i); return { name, reached: reached.length, here: live.filter((c) => idx(c) === i).length, value: r2(sum(reached.map((c) => c.value))), target: targets[name] ?? null, ids: reached.map((c) => c.id) }; });
  rows.forEach((r, i) => { r.conversion = i === 0 || !rows[i - 1].reached ? null : r2(r.reached / rows[i - 1].reached); r.met = r.target == null ? null : r.reached >= r.target; });
  return { rows, total: live.length, lost: customers.filter((c) => c.lost).length };
}

/* ------------------------------------------------------------------ unit economics */

export const VOLUMES = [10, 25, 50, 100, 250];
const NEEDED = ['price', 'cogs'];
/**
 * One year at a given number of systems. Inputs are assumptions (a = economics record); a missing price or unit cost gives
 * no result, only the list of what is missing. Revenue, gross profit, operating profit and cash received are kept apart.
 */
export function unitEconomics(a, units) {
  const missing = NEEDED.filter((k) => a[k] == null);
  if (missing.length) return { units, missing, ok: false };
  const v = (k) => Number(a[k]) || 0;
  const viaDist = units * v('distributorSharePct') / 100;
  const hardware = r2(units * v('price') - viaDist * v('price') * v('distributorMarginPct') / 100);
  const recurringPerUnit = (v('softwarePerYear') + v('supportPerYear') + v('calibrationPerYear')) * v('attachPct') / 100;
  const recurring = r2(units * recurringPerUnit);
  const revenue = r2(hardware + recurring);
  const cogs = r2(units * v('cogs'));
  const warranty = r2(units * v('price') * v('warrantyPct') / 100);
  const install = r2(units * v('installCost'));
  const grossProfit = r2(revenue - cogs - warranty - install);
  const acquisition = r2(units * v('cac'));
  const fixed = r2(v('fixedOpex'));
  const operatingProfit = r2(grossProfit - acquisition - fixed);
  const oneTime = r2(v('nre') + v('cmSetup'));
  const netPrice = v('price') * (1 - v('distributorSharePct') / 100 * v('distributorMarginPct') / 100);
  const contribution = r2(netPrice + recurringPerUnit - v('cogs') - v('price') * v('warrantyPct') / 100 - v('installCost') - v('cac'));
  const breakEvenUnits = contribution > 0 ? Math.ceil(fixed / contribution) : null;
  const paybackUnits = contribution > 0 ? Math.ceil((fixed + oneTime) / contribution) : null;
  const collected = r2(revenue * Math.max(0, 1 - v('paymentDays') / 365));
  const workingCapital = r2(cogs * v('buildLeadDays') / 365 + revenue * v('paymentDays') / 365);
  return { units, ok: true, missing: [], hardware, recurring, revenue, cogs, warranty, install, grossProfit, grossMarginPct: revenue ? r2(grossProfit / revenue * 100) : null, unitMargin: r2(v('price') - v('cogs')),
    acquisition, fixed, operatingProfit, oneTime, contribution, breakEvenUnits, breakEvenRevenue: breakEvenUnits == null ? null : r2(breakEvenUnits * (netPrice + recurringPerUnit)), paybackUnits, cashReceived: collected, receivablesAtYearEnd: r2(revenue - collected), workingCapital };
}
/** the result with one input moved by a percentage, for the sensitivity view */
export function sensitivity(a, units, keys = ['price', 'cogs', 'cac', 'fixedOpex'], pct = 20) {
  const base = unitEconomics(a, units); if (!base.ok) return [];
  return keys.filter((k) => a[k] != null).map((k) => { const lo = unitEconomics({ ...a, [k]: a[k] * (1 - pct / 100) }, units), hi = unitEconomics({ ...a, [k]: a[k] * (1 + pct / 100) }, units); return { key: k, low: lo.operatingProfit, high: hi.operatingProfit, base: base.operatingProfit, swing: r2(Math.abs(hi.operatingProfit - lo.operatingProfit)) }; }).sort((x, y) => y.swing - x.swing);
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
