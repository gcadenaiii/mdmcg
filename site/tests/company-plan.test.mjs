/* Company plan: tests of the cross-program calculations and of what the new records may claim.
   Run from site/:  node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from '../src/product-build/calc.js';
import * as P from '../src/product-build/portfolio.js';
import { seed } from '../src/product-build/seed/index.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const scheds = P.schedules(seed);
const load = P.portfolioLoad(seed, scheds);

test('ecg/mcg plan is intact: its own budget and schedule are unchanged by the company plan', () => {
  const b = C.budget(seed.program, seed.roles, seed.lines);
  assert.equal(b.total, 90482);
  assert.equal(seed.roles.length, 2, 'the two engineering roles are one shared record, not copied per program');
  assert.equal(C.schedule(seed.program, seed.tasks).endDate, '2027-03-12');
  assert.equal(scheds.find((s) => s.id === 'ecg').sched.endDate, '2027-03-12');
  assert.equal(P.portfolioBudget(seed).rows.find((r) => r.id === 'ecg').total, 90482, 'the portfolio shows the same total as the plan itself');
});
test('programs: three, each with a schedule free of errors, each task id unique across the company', () => {
  assert.deepEqual(scheds.map((s) => s.id), ['battery', 'ecg', 'funding']);
  for (const s of scheds) assert.deepEqual(s.sched.errors, [], s.id);
  const ids = scheds.flatMap((s) => s.tasks.map((t) => t.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(scheds.find((s) => s.id === 'battery').sched.endWeek > 16, 'the battery plan is not forced to sixteen weeks');
});
test('battery plan alone fits the two engineers; no week is overloaded when it runs by itself', () => {
  const s = scheds.find((q) => q.id === 'battery');
  const l = C.resourceLoad(seed.bProgram, seed.roles, seed.bTasks, s.sched);
  assert.equal(l.conflicts.length, 0);
});
test('capacity: an hour is counted once; each person has one weekly capacity across all programs', () => {
  const t = load.totals;
  const direct = (id) => C.round2(scheds.reduce((a, s) => a + s.tasks.reduce((b, k) => b + C.taskHours(s.program, k, id), 0), 0));
  for (const id of ['A', 'B', 'C']) assert.ok(Math.abs(t[id].hours - direct(id)) < 0.5, id);
  assert.ok(Math.abs(t.A.hours - (t.A.byProgram.battery + t.A.byProgram.ecg)) < 0.5);
  assert.equal(t.A.cost, C.round2(t.A.hours * 80));
  assert.equal(t.B.cost, C.round2(t.B.hours * 50));
  for (const w of load.weeks) assert.ok(Math.abs(w.by.A.total - ((w.by.A.battery || 0) + (w.by.A.ecg || 0) + (w.by.A.funding || 0))) < 0.02);
});
test('capacity: running both product plans as written overloads the developer, and the plan says so', () => {
  assert.ok(load.totals.A.overWeeks > 0 && load.totals.B.overWeeks > 0);
  assert.ok(load.conflicts.every((c) => c.over > 0 && c.hours > c.capacity));
  assert.ok(load.conflicts.some((c) => c.person === 'A' && c.programs.includes('battery') && c.programs.includes('ecg')));
});
test('capacity: a person with no rate and no hours on record is shown without a cost and without a capacity', () => {
  assert.equal(load.totals.C.cost, null);
  assert.equal(load.totals.C.unknownCapacity, true);
  assert.equal(load.totals.C.overWeeks, 0);
  assert.ok(load.unpricedHours > 0);
});
test('reallocation: moving a program or adding a developer changes the overload and the finish as arithmetic says', () => {
  const r = Object.fromEntries(seed.reallocations.map((s) => [s.id, P.reallocate(seed, s)]));
  assert.equal(r['RA-1'].overWeeks.A, load.totals.A.overWeeks);
  assert.equal(r['RA-3'].overWeeks.A, 0, 'one program after the other frees the developer');
  assert.ok(r['RA-3'].ends.battery > r['RA-1'].ends.battery);
  assert.equal(r['RA-4'].overWeeks.A, 0, 'a second developer covers the overlap');
  assert.equal(r['RA-4'].extraCost, 36 * 80 * load.weeks.length);
  assert.equal(r['RA-1'].extraCost, 0);
});
test('budget: battery and funding are bottom-up floors that name what they leave out', () => {
  const pb = P.portfolioBudget(seed);
  const bat = pb.rows.find((r) => r.id === 'battery');
  const hoursA = seed.bTasks.reduce((a, t) => a + t.hours.A, 0), hoursB = seed.bTasks.reduce((a, t) => a + t.hours.B, 0);
  assert.equal(bat.labour, hoursA * 80 + hoursB * 50);
  assert.equal(bat.other, 0);
  assert.equal(bat.notEstimated, seed.bLines.filter((l) => l.amount == null).length);
  assert.ok(bat.notEstimated >= 10 && bat.isFloor);
  assert.equal(bat.total, C.round2(bat.labour * 1.15));
  assert.equal(pb.total, C.round2(pb.rows.reduce((a, r) => a + r.total, 0)));
  assert.equal(pb.isFloor, true);
});
test('budget: no battery or funding cost carries an invented figure', () => {
  for (const l of [...seed.bLines, ...seed.fLines]) { if (l.amount == null) assert.equal(l.kind, 'Not estimated', l.id); else assert.equal(l.amount, 0, l.id + ' may only be zero without a quotation'); }
  const lines = clone(seed.bLines); lines[0].amount = 5000;
  const b = P.programBudget({ ...seed, bLines: lines }, { ...P.programs(seed)[0], lines });
  assert.equal(b.other, 5000); assert.equal(b.notEstimated, seed.bLines.filter((l) => l.amount == null).length - 1);
});
test('months: planned spending adds up, and with no cash figure there is no balance, runway or gap', () => {
  const m = P.monthly(seed, scheds, load);
  assert.ok(Math.abs(m.totalPlanned - m.rows.reduce((a, r) => a + r.plannedTotal, 0)) < 0.05);
  assert.equal(m.totalActual, 0);
  assert.equal(m.cashOnHand, null); assert.equal(m.runwayKnown, false); assert.equal(m.fundingGap, null); assert.equal(m.runwayMonth, null);
  assert.ok(m.rows.every((r) => r.balance === null && r.cashIn === 0));
  assert.deepEqual(m.rows.map((r) => r.month), [...m.rows.map((r) => r.month)].sort());
});
test('months: with cash entered, the balance, the month it runs out and the gap follow', () => {
  const m = P.monthly({ ...seed, capital: { cashOnHand: 50000 } }, scheds, load);
  assert.equal(m.rows[0].balance, C.round2(50000 - m.rows[0].plannedTotal));
  assert.ok(m.runwayMonth && m.rows.find((r) => r.month === m.runwayMonth).balance < 0);
  assert.equal(m.fundingGap, C.round2(m.totalPlanned - 50000));
  const rich = P.monthly({ ...seed, capital: { cashOnHand: 1e7 } }, scheds, load);
  assert.equal(rich.runwayMonth, null); assert.equal(rich.fundingGap, 0);
});
test('months: a quotation is neither committed nor paid; an order is committed; a payment is actual', () => {
  const ex = [{ id: 'EX-1', date: '2026-12-10', program: 'battery', kind: 'Quote', amount: 900 }, { id: 'EX-2', date: '2026-12-11', program: 'battery', kind: 'Purchase order', amount: 400 }, { id: 'EX-3', date: '2026-12-12', program: 'ecg', kind: 'Paid', amount: 250 }];
  const dec = P.monthly({ ...seed, expenses: ex }, scheds, load).rows.find((r) => r.month === '2026-12');
  assert.equal(dec.committedTotal, 650); assert.equal(dec.actualTotal, 250); assert.equal(dec.actual.ecg, 250);
});
test('months: revenue is left out unless asked for, and received funding enters on its date', () => {
  const opp = clone(seed.opportunities); Object.assign(opp[0], { stage: 'Cash received', amountReceived: 20000, receivedDate: '2027-02-10' });
  const m = P.monthly({ ...seed, opportunities: opp }, scheds, load, { revenue: [{ month: '2027-02', amount: 99999 }] });
  assert.equal(m.rows.find((r) => r.month === '2027-02').cashIn, 20000);
  const m2 = P.monthly({ ...seed, opportunities: opp }, scheds, load, { includeRevenue: true, revenue: [{ month: '2027-02', amount: 1000 }] });
  assert.equal(m2.rows.find((r) => r.month === '2027-02').cashIn, 21000);
});
test('pipeline: nothing is committed or received at the start, and nothing is weighted without a probability', () => {
  const p = P.pipeline(seed.opportunities);
  assert.equal(p.received, 0); assert.equal(p.committed, 0); assert.equal(p.weighted, 0); assert.equal(p.weightedCovers, 0);
  assert.equal(p.stages[0].count, seed.opportunities.length, 'every opportunity starts as identified');
  assert.ok(seed.opportunities.every((o) => o.probability === null && o.amountAttainable === null && o.amountReceived === null));
});
test('pipeline: identified, committed and received money are kept apart; weighting uses only entered probabilities', () => {
  const o = clone(seed.opportunities).slice(0, 4);
  Object.assign(o[0], { amountAttainable: 100000, probability: 20 }); Object.assign(o[1], { amountAttainable: 50000 });
  Object.assign(o[2], { stage: 'Award or commitment', amountAttainable: 30000 }); Object.assign(o[3], { stage: 'Cash received', amountAttainable: 10000, amountReceived: 8000 });
  const p = P.pipeline(o);
  assert.equal(p.prospective, 150000); assert.equal(p.weighted, 20000); assert.equal(p.noProbability, 1);
  assert.equal(p.committed, 30000); assert.equal(p.received, 8000);
  o[0].stage = 'Closed, not pursued'; assert.equal(P.pipeline(o).prospective, 50000);
});
test('pipeline: deadlines are listed in date order with the days left; undated ones are apart', () => {
  const d = P.deadlines(seed.opportunities, '2026-11-20');
  assert.deepEqual(d.upcoming.map((o) => o.deadline), [...d.upcoming.map((o) => o.deadline)].sort());
  assert.ok(d.upcoming.every((o) => o.days >= 0));
  assert.equal(d.upcoming.length + d.past.length + d.undated.length, seed.opportunities.length);
});
test('funding research: every listed program has a source page, and none is called eligible', () => {
  const res = seed.opportunities.filter((o) => o.sourceUrl);
  assert.ok(res.length >= 5);
  for (const o of res) { assert.match(o.sourceUrl, /^https?:\/\//); assert.equal(o.stage, 'Identified'); assert.ok(!/^eligible\b/i.test(o.eligibility || '')); }
});
test('awards: the same expense cannot be charged beyond its amount, nor more hours than were logged', () => {
  const ex = [{ id: 'EX-1', amount: 1000 }]; const log = [{ role: 'A', week: 3, hours: 20 }];
  assert.equal(P.allocationCheck([{ award: 'FO-01', kind: 'expense', ref: 'EX-1', amount: 600 }, { award: 'FO-03', kind: 'expense', ref: 'EX-1', amount: 400 }], ex, log).ok, true);
  const over = P.allocationCheck([{ award: 'FO-01', kind: 'expense', ref: 'EX-1', amount: 600 }, { award: 'FO-03', kind: 'expense', ref: 'EX-1', amount: 600 }], ex, log);
  assert.equal(over.problems[0].kind, 'expense-over-allocated');
  assert.equal(P.allocationCheck([{ award: 'FO-01', kind: 'hours', ref: 'A', week: 3, amount: 12 }, { award: 'FO-03', kind: 'hours', ref: 'A', week: 3, amount: 12 }], ex, log).problems[0].kind, 'hours-over-allocated');
  assert.equal(P.allocationCheck([{ award: 'FO-01', kind: 'hours', ref: 'A', week: 3, amount: 20 }], ex, log).ok, true);
  assert.equal(P.allocationCheck([{ award: 'FO-01', kind: 'expense', ref: 'EX-9', amount: 1 }], ex, log).problems[0].kind, 'unknown-expense');
});
test('funnel: stages count records that reached them; with no customer every stage is zero and no target is met', () => {
  const f0 = P.funnel(seed.customers, seed.funnelTargets);
  assert.equal(seed.customers.length, 0); assert.ok(f0.rows.every((r) => r.reached === 0)); assert.ok(f0.rows.filter((r) => r.target != null).every((r) => r.met === false));
  const f = P.funnel([{ id: 1, stage: 'Customer discovery' }, { id: 2, stage: 'Paid pilot', value: 5000 }, { id: 3, stage: 'Technical evaluation' }, { id: 4, stage: 'Paid pilot', lost: true }], { 'Paid pilot': 2 });
  assert.deepEqual(f.rows.slice(0, 5).map((r) => r.reached), [3, 2, 2, 1, 0]);
  assert.equal(f.rows[3].met, false); assert.equal(f.rows[1].conversion, 0.67); assert.equal(f.lost, 1);
});
test('economics: revenue, gross profit, operating profit and cash are different numbers, each as defined', () => {
  const a = { price: 1000, cogs: 400, distributorSharePct: 50, distributorMarginPct: 20, warrantyPct: 2, installCost: 30, softwarePerYear: 100, supportPerYear: 0, calibrationPerYear: 0, attachPct: 50, cac: 50, fixedOpex: 3000, nre: 2000, cmSetup: 1000, paymentDays: 73, buildLeadDays: 0 };
  const r = P.unitEconomics(a, 10);
  assert.equal(r.hardware, 9000); assert.equal(r.recurring, 500); assert.equal(r.revenue, 9500); assert.equal(r.cogs, 4000);
  assert.equal(r.grossProfit, 9500 - 4000 - 200 - 300); assert.equal(r.operatingProfit, 5000 - 500 - 3000);
  assert.equal(r.cashReceived, 7600); assert.equal(r.receivablesAtYearEnd, 1900);
  assert.equal(r.contribution, 900 + 50 - 400 - 20 - 30 - 50); assert.equal(r.breakEvenUnits, Math.ceil(3000 / 450)); assert.equal(r.paybackUnits, Math.ceil(6000 / 450));
  assert.ok(r.revenue > r.grossProfit && r.grossProfit > r.operatingProfit && r.cashReceived < r.revenue);
});
test('economics: without a price or a unit cost there is no result, only what is missing; a loss has no break-even', () => {
  assert.deepEqual(P.unitEconomics({ price: null, cogs: 5 }, 10), { units: 10, missing: ['price'], ok: false });
  assert.equal(P.unitEconomics({ price: 100, cogs: 150, fixedOpex: 10 }, 10).breakEvenUnits, null);
  assert.deepEqual(P.VOLUMES, [10, 25, 50, 100, 250]);
  const s = P.sensitivity({ price: 1000, cogs: 400, cac: 50, fixedOpex: 3000 }, 25);
  assert.equal(s[0].key, 'price'); assert.ok(s.every((q) => q.swing >= 0));
});
test('economics: the seeded price and unit cost are labelled hypotheses with their basis, and every other input is unset', () => {
  const e = seed.bEconomics;
  assert.match(e.basis.price, /^Hypothesis/); assert.match(e.basis.cogs, /^Hypothesis/);
  assert.equal(e.price, 9975 + 18 * 999); assert.equal(e.cogs, 64 * 100 + 1000);
  for (const k of e.unset) assert.equal(e[k], 0, k);
});
test('readiness: battery counts come from the records; nothing is passed, verified or approved', () => {
  const r = P.readiness({ needs: seed.bNeeds, requirements: seed.bRequirements, outputs: seed.bOutputs, risks: seed.bRisks, tests: seed.bTests, evidence: seed.evidence, reviews: seed.reviews, gates: seed.bGates, tasks: seed.bTasks });
  assert.equal(r.withTest, r.requirements, 'every requirement names a test');
  assert.equal(r.passed, 0); assert.equal(r.notRun, seed.bTests.length); assert.equal(r.withEvidence, 0); assert.equal(r.controlsVerified, 0); assert.equal(r.gatesApproved, 0);
  assert.equal(r.currentGate.id, 'BG-0');
  const ev = [{ id: 'E-1', test: 'BV-02', result: 'Pass' }, { id: 'E-2', test: 'BV-10', result: 'Fail' }];
  const r2 = P.readiness({ requirements: seed.bRequirements, risks: seed.bRisks, tests: seed.bTests, evidence: ev, gates: seed.bGates, tasks: seed.bTasks });
  assert.equal(r2.passed, 1); assert.equal(r2.failed, 1); assert.equal(r2.controlsVerified, 1);
});
test('battery: the audit\'s open matters are all carried, each with a test, and its distinctions are kept', () => {
  const text = JSON.stringify(seed.bRequirements) + JSON.stringify(seed.bTests);
  for (const k of ['64 channels', 'frame number', 'Start-up', 'raw records', 'Lost, repeated or reordered', 'Gain and phase', 'defined by formula', 'Run-to-run variation', '100 runs of 10 ms', 'latency and update rate', 'less than 5%', 'intermittent faults', 'integrated PCB', 'reproduce a measurement']) assert.ok(text.includes(k), k);
  assert.ok(seed.bTests.some((t) => /transient/.test(t.title) && /DFT/.test(t.method)), 'the transient and known-delay test stands beside the DFT test');
  assert.ok(seed.bFindings.filter((f) => f.level === 'Shown').every((f) => /MOV/.test(f.source)));
  assert.ok(seed.bSources.some((s) => s.state === 'Not received') && seed.bSources.filter((s) => s.state === 'On file').length >= 6);
  assert.equal(seed.bAgreement.milestones.reduce((a, m) => a + m.pct, 0), 100);
});
test('battery gates: PCB spending waits for the verification gate', () => {
  const m = { tasks: clone(seed.bTasks), evidence: [], gates: clone(seed.bGates) };
  const g3 = m.gates.find((g) => g.id === 'BG-3'); for (const t of g3.tasks) m.tasks.find((x) => x.id === t).percent = 100; for (const e of g3.evidence) m.evidence.push({ id: e });
  const r = C.gates(m).rows.find((g) => g.id === 'BG-3');
  assert.equal(r.canApprove, false); assert.deepEqual(r.missing.map((x) => x.id), ['BG-2']);
});
test('decisions: none is made; each has a due date, an owner, alternatives and evidence; the queue is in date order', () => {
  const q = P.decisionQueue(seed.execDecisions, '2026-11-20');
  assert.equal(q.open, seed.execDecisions.length);
  for (const d of seed.execDecisions) { assert.ok(d.due && d.owner && d.options.length >= 2 && d.evidence && d.recommendation, d.id); assert.equal(d.decision, null); }
  assert.deepEqual(q.rows.map((r) => r.due), [...q.rows.map((r) => r.due)].sort());
  const d2 = clone(seed.execDecisions); Object.assign(d2[0], { decision: 'x', decidedBy: 'A Person', decidedOn: '2026-11-21' });
  assert.equal(P.decisionQueue(d2, '2026-11-20').open, seed.execDecisions.length - 1);
  Object.assign(d2[1], { decision: 'x' }); assert.equal(P.decisionQueue(d2, '2026-11-20').open, seed.execDecisions.length - 1, 'text alone is not a decision');
});
test('claims: the new records hold no customer, order, award, approval or certificate', () => {
  assert.equal(seed.customers.length + seed.expenses.length + seed.partners.length + seed.allocations.length, 0);
  assert.equal(seed.capital.cashOnHand, null);
  assert.ok(seed.bGates.every((g) => g.approval === null));
  const text = JSON.stringify([seed.objectives, seed.businessModel, seed.sharedProcesses, seed.securityAudit, seed.channels, seed.bFindings, seed.segments, seed.pricingHypotheses, seed.mfgFlow, seed.makeBuy]);
  assert.ok(!/—/.test(text), 'no em dash');
  assert.ok(!/ISO 9001 certified|ISO 13485 certified|FDA (cleared|approved)|ASD-STE100 compliant|clinical-grade/i.test(text));
  assert.ok(seed.businessModel.filter((b) => b.status === 'Hypothesis').length >= 4, 'market hypotheses are marked as such');
  assert.match(seed.securityAudit.verdict, /does not meet/);
});
test('access: the plan pages\' public code never imports the internal data and holds no dollar figure', () => {
  for (const f of ['plan.js', 'plan-views.js', 'plan-sections.js', 'plan-viz.js', 'portfolio.js']) { const t = readFileSync(new URL('../src/product-build/' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); assert.ok(!/seed\/|data\/product-build/.test(t), f); assert.ok(!/\$\s?\d{2},?\d{3}/.test(t), f + ' holds no dollar figure'); }
  const shell = readFileSync(new URL('../src/components/PlanShell.astro', import.meta.url), 'utf8'); assert.ok(!/seed\//.test(shell));
});
