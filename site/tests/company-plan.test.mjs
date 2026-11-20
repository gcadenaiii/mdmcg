/* Company plan: tests of the cross-program calculations, of what the records may claim, and of what a company with one
   product (the wearable heart device) may still show. Run from site/:  node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import * as C from '../src/product-build/calc.js';
import * as P from '../src/product-build/portfolio.js';
import { seed } from '../src/product-build/seed/index.js';
import { AREAS, PLAN_NAV, KIT, path, pathInfo, panel } from '../src/product-build/plan-views.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const scheds = P.schedules(seed);
const load = P.portfolioLoad(seed, scheds);
const UI = { tab: 'today', working: false, wsub: 0, sub: '', panel: null, task: null, part: null, partFn: '', toolCat: '', stdTopic: '', riskKind: '', reportWeek: null, zoom: 16, decPlan: '', riskPlan: '', sort: {}, filter: {} };
const EMPTY = { edits: {}, added: {}, removed: {}, log: [], who: '' };
/** the page's figures and one object to draw screens from, as plan.js builds them */
const world = (store, today = '2026-11-20') => ({ ...P.derive(seed, store, today), ui: UI, store, mine: () => false });
/** every screen of the given areas at both depths, as one text */
const draw = (x, areas = Object.keys(AREAS)) => areas.flatMap((a) => AREAS[a].tabs.flatMap((t) => [...['', 'pipeline', 'timeline'].map((sub) => t.brief({ ...x, ui: { ...UI, sub, working: !!AREAS[a].library } })), ...(t.working || []).map((w) => w[1]({ ...x, ui: { ...UI, working: true } }))])).join('\n');

test('ecg/mcg plan is intact: its own budget and schedule are unchanged by the company plan', () => {
  const b = C.budget(seed.program, seed.roles, seed.lines);
  assert.equal(b.total, 90482);
  assert.equal(seed.roles.length, 2, 'the two engineering roles are one shared record, not copied per program');
  assert.equal(C.schedule(seed.program, seed.tasks).endDate, '2027-03-12');
  assert.equal(scheds.find((s) => s.id === 'ecg').sched.endDate, '2027-03-12');
  assert.equal(P.portfolioBudget(seed).rows.find((r) => r.id === 'ecg').total, 90482, 'the portfolio shows the same total as the plan itself');
});
test('programs: two, each with a schedule free of errors and with nothing pushed later, each task id unique across the company', () => {
  assert.deepEqual(scheds.map((s) => [s.id, s.n]), [['ecg', 1], ['funding', 2]]);
  for (const s of scheds) { assert.deepEqual(s.sched.errors, [], s.id); assert.deepEqual(s.sched.slipped, [], s.id + ': no milestone sits before the task it waits for'); }
  const ids = scheds.flatMap((s) => s.tasks.map((t) => t.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const s of scheds) for (const t of s.tasks) for (const dep of t.deps) assert.ok(s.tasks.some((q) => q.id === (dep.id || dep)), `${t.id} waits for ${dep.id || dep}, which exists`);
  for (const k of seed.crossLinks) for (const end of [k.from, k.to]) { const [p, id] = end.split(':'); assert.ok(scheds.find((s) => s.id === p).tasks.some((t) => t.id === id), end); }
});
test('capacity: an hour is counted once; each person has one weekly capacity across all programs', () => {
  const t = load.totals;
  const direct = (id) => C.round2(scheds.reduce((a, s) => a + s.tasks.reduce((b, k) => b + C.taskHours(s.program, k, id), 0), 0));
  for (const id of ['A', 'B', 'C']) assert.ok(Math.abs(t[id].hours - direct(id)) < 0.5, id);
  assert.ok(Math.abs(t.A.hours - t.A.byProgram.ecg) < 0.5, 'the developer is planned on the device plan only');
  assert.ok(Math.abs(t.B.hours - (t.B.byProgram.ecg + t.B.byProgram.funding)) < 0.5);
  assert.equal(t.A.cost, C.round2(t.A.hours * 80));
  assert.equal(t.B.cost, C.round2(t.B.hours * 50));
  for (const w of load.weeks) assert.ok(Math.abs(w.by.B.total - ((w.by.B.ecg || 0) + (w.by.B.funding || 0))) < 0.02);
});
test('capacity: the device plan and the funding work together overload the director in some weeks, and the plan says so', () => {
  assert.equal(load.totals.A.overWeeks, 0, 'the developer works on one plan and fits');
  assert.ok(load.totals.B.overWeeks > 0);
  assert.equal(load.conflicts.length, load.totals.B.overWeeks);
  assert.ok(load.conflicts.every((c) => c.person === 'B' && c.over > 0 && c.hours > c.capacity && c.programs.includes('ecg') && c.programs.includes('funding')));
  assert.match(draw(world(EMPTY), ['hub']), new RegExp(`the director is over capacity in ${load.totals.B.overWeeks} weeks`));
});
test('capacity: a person with no rate and no hours on record is shown without a cost and without a capacity', () => {
  assert.equal(load.totals.C.cost, null);
  assert.equal(load.totals.C.unknownCapacity, true);
  assert.equal(load.totals.C.overWeeks, 0);
  assert.ok(load.unpricedHours > 0);
});
test('budget: the funding plan is a bottom-up floor that names what it leaves out', () => {
  const pb = P.portfolioBudget(seed);
  assert.deepEqual(pb.rows.map((r) => r.id), ['ecg', 'funding']);
  const fund = pb.rows.find((r) => r.id === 'funding');
  const hoursB = seed.fTasks.reduce((a, t) => a + t.hours.B, 0), hoursC = seed.fTasks.reduce((a, t) => a + t.hours.C, 0);
  assert.equal(seed.fTasks.reduce((a, t) => a + t.hours.A, 0), 0);
  assert.equal(fund.labour, hoursB * 50);
  assert.equal(fund.unpricedHours, hoursC, 'the business lead has no rate, so those hours are named, not priced');
  assert.equal(fund.other, 0);
  assert.equal(fund.notEstimated, seed.fLines.length);
  assert.ok(fund.isFloor);
  assert.equal(fund.total, C.round2(fund.labour * (1 + seed.fProgram.contingencyPct / 100)));
  assert.equal(pb.total, C.round2(pb.rows.reduce((a, r) => a + r.total, 0)));
  assert.equal(pb.isFloor, true);
});
test('budget: no funding cost carries an invented figure', () => {
  for (const l of seed.fLines) { if (l.amount == null) assert.equal(l.kind, 'Not estimated', l.id); else assert.equal(l.amount, 0, l.id + ' may only be zero without a quotation'); }
  const lines = clone(seed.fLines); lines[0].amount = 5000;
  const b = P.programBudget({ ...seed, fLines: lines }, { ...P.programs(seed).find((p) => p.id === 'funding'), lines });
  assert.equal(b.other, 5000); assert.equal(b.notEstimated, seed.fLines.filter((l) => l.amount == null).length - 1);
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
  const ex = [{ id: 'EX-1', date: '2026-12-10', program: 'funding', kind: 'Quote', amount: 900 }, { id: 'EX-2', date: '2026-12-11', program: 'funding', kind: 'Purchase order', amount: 400 }, { id: 'EX-3', date: '2026-12-12', program: 'ecg', kind: 'Paid', amount: 250 }];
  const dec = P.monthly({ ...seed, expenses: ex }, scheds, load).rows.find((r) => r.month === '2026-12');
  assert.equal(dec.committedTotal, 650); assert.equal(dec.actualTotal, 250); assert.equal(dec.actual.ecg, 250);
});
test('months: received funding enters on its date, and nothing else counts as cash in', () => {
  const opp = clone(seed.opportunities); Object.assign(opp[0], { stage: 'Cash received', amountReceived: 20000, receivedDate: '2027-02-10' }); Object.assign(opp[1], { stage: 'Award or commitment', amountAttainable: 99999 });
  const m = P.monthly({ ...seed, opportunities: opp }, scheds, load);
  assert.equal(m.rows.find((r) => r.month === '2027-02').cashIn, 20000);
  assert.equal(m.cashIn, 20000, 'an award that is not yet cash is not cash in');
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
test('readiness: the counts come from the records; nothing is passed, verified or approved', () => {
  const part = { needs: seed.needs, requirements: seed.requirements, outputs: seed.outputs, risks: seed.risks, tests: seed.tests, evidence: seed.evidence, reviews: seed.reviews, gates: seed.gates, tasks: seed.tasks };
  const r = P.readiness(part);
  assert.equal(r.requirements, seed.requirements.length); assert.equal(r.withTest, r.requirements, 'every requirement names a test');
  assert.equal(r.passed, 0); assert.equal(r.notRun, seed.tests.length); assert.equal(r.withEvidence, 0); assert.equal(r.controlsVerified, 0); assert.equal(r.gatesApproved, 0);
  assert.equal(r.currentGate.id, 'G-1');
  const withControl = seed.tests.find((t) => t.riskControls.length), other = seed.tests.find((t) => t !== withControl);
  const r2 = P.readiness({ ...part, evidence: [{ id: 'E-1', test: withControl.id, result: 'Pass' }, { id: 'E-2', test: other.id, result: 'Fail' }] });
  assert.equal(r2.passed, 1); assert.equal(r2.failed, 1); assert.equal(r2.notRun, seed.tests.length - 2);
  assert.equal(r2.controlsVerified, new Set(withControl.riskControls).size, 'a control counts as verified only through a passed test');
  assert.deepEqual(world(EMPTY).d.readE.gateRows.map((g) => g.id), seed.gates.map((g) => g.id), 'the pages read the same record');
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
  assert.equal(seed.expenses.length + seed.partners.length + seed.allocations.length, 0);
  assert.equal(seed.capital.cashOnHand, null);
  const text = JSON.stringify([seed.objectives, seed.sharedProcesses, seed.securityAudit, seed.channels, seed.execDecisions, seed.fRisks, seed.fTasks, seed.fDeliverables, seed.investorChecklist]);
  assert.ok(!/—/.test(text), 'no em dash');
  assert.ok(!/ISO 9001 certified|ISO 13485 certified|FDA (cleared|approved)|ASD-STE100 compliant|clinical-grade/i.test(text));
  assert.match(seed.securityAudit.verdict, /does not meet/);
});
test('access: the plan pages\' public code never imports the internal data and holds no dollar figure', () => {
  for (const f of ['plan.js', 'plan-views.js', 'plan-sections.js', 'plan-viz.js', 'portfolio.js']) { const t = readFileSync(new URL('../src/product-build/' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); assert.ok(!/seed\/|data\/product-build/.test(t), f); assert.ok(!/\$\s?\d{2},?\d{3}/.test(t), f + ' holds no dollar figure'); }
  const shell = readFileSync(new URL('../src/components/PlanShell.astro', import.meta.url), 'utf8'); assert.ok(!/seed\//.test(shell));
});

/* ---------------------------------------------------------------- one product: the wearable heart device */

/* The device has a battery cell of its own. These are the only collections of the page data that may say the word. */
const DEVICE_CELL = ['lines', 'needs', 'requirements', 'outputs', 'risks', 'tests', 'parts', 'standards', 'regulatoryQuestions', 'standardsNotFound', 'standardsScope'];
test('one product: no page, payload collection or nav entry is a battery plan', () => {
  // navigation and numbering: the plans are counted from the records, 1 ECG/MCG and 2 Funding
  assert.deepEqual(PLAN_NAV.map(([id, href, name]) => [id, href, name]), [['hub', '/plan/', 'Company'], ['ecg', '/product-build/', '1 ECG/MCG'], ['funding', '/plan/funding/', '2 Funding'], ['library', '/plan/reference/', 'Reference and history']]);
  assert.deepEqual(Object.keys(AREAS), PLAN_NAV.map(([id]) => id));
  assert.deepEqual(Object.entries(KIT).map(([id, k]) => [id, k.n]), P.programs(seed).map((p) => [p.id, p.n]));
  assert.deepEqual(P.programs(seed).map((p) => p.n), P.programs(seed).map((_, i) => i + 1));
  for (const [id, a] of Object.entries(AREAS)) { assert.ok(!/batter/i.test(a.title + a.base + a.tabs.map((q) => q.k + q.label + (q.working || []).map((w) => w[0]).join()).join()), id); if (KIT[id]) assert.ok(a.title.startsWith(`Plan ${KIT[id].n}: `), a.title); }
  // pages and code
  const src = (p) => new URL('../src/' + p, import.meta.url);
  assert.ok(!existsSync(src('pages/plan/battery')), 'the battery page is gone');
  assert.ok(!existsSync(src('product-build/seed/battery.js')));
  assert.deepEqual(readdirSync(src('pages/plan')).sort(), ['funding', 'index.astro', 'reference']);
  for (const f of ['pages/plan/index.astro', 'pages/plan/funding/index.astro', 'pages/plan/reference/index.astro', 'pages/product-build/index.astro', 'pages/product-build/payload.json.ts', 'components/PlanShell.astro', 'styles/plan.css', 'product-build/plan.js', 'product-build/plan-views.js', 'product-build/plan-sections.js', 'product-build/plan-viz.js', 'product-build/portfolio.js', 'product-build/seed/company.js', 'product-build/seed/funding.js', 'product-build/seed/index.js']) assert.ok(!/batter/i.test(readFileSync(src(f), 'utf8').replace(/battery plan and its records were removed/, '')), f);
  // the page data
  assert.deepEqual(Object.keys(seed).filter((k) => /^b[A-Z]|batter/i.test(k)), []);
  for (const k of ['bTasks', 'bGates', 'bEconomics', 'businessModel', 'reallocations', 'customers', 'funnelTargets', 'segments', 'personas', 'pricingHypotheses', 'pilotChecklist', 'launchReadiness', 'mfgFlow', 'makeBuy', 'supplierScorecard', 'serialRecord', 'supportPolicy', 'bStandards', 'manufacturers', 'equipment', 'internalFacts']) assert.ok(!(k in seed), k);
  for (const [k, v] of Object.entries(seed)) if (/batter/i.test(JSON.stringify(v))) assert.ok(DEVICE_CELL.includes(k), `${k} mentions a battery`);
  for (const k of ['execDecisions', 'objectives', 'fTasks', 'fRisks', 'fDeliverables', 'fLines', 'investorChecklist', 'channels', 'crossLinks', 'sharedProcesses']) assert.ok(!/\b(ED-0[12689]|BG-\d|BM-\d|BT-\d|FT-103|FT-20\d|FT-302|FM-2)\b/.test(JSON.stringify(seed[k])), k + ' refers to a record that no longer exists');
  assert.ok(seed.execDecisions.every((q) => q.plans.every((p) => KIT[p])) && seed.objectives.every((o) => o.program === 'shared' || KIT[o.program]));
  assert.ok(seed.opportunities.every((o) => !('target' in o)), 'with one product an opportunity is not filed under a product');
  // every screen: the funding screens never say the word, and the company screens only where the one list of risks shows the device's own cell
  const x = world(EMPTY); const cell = (s) => s.split(/batter/i).length - 1;
  assert.equal(cell(draw(x, ['funding'])), 0);
  assert.equal(cell(draw({ ...x, m: { ...x.m, risks: [] } }, ['hub'])), 0, 'with the device risks set aside, no company screen mentions a battery');
  assert.ok(!/\b(both products|two products|three plans|all three|Plan 3)\b/i.test(draw(x).replace(/<[^>]+>/g, ' ')));
  assert.ok(!/battery (plan|product|instrument)|\/plan\/battery/i.test(draw(x)));
});
test('one product: a release holds no battery plan page', { skip: !existsSync(new URL('../dist/', import.meta.url)) && 'the site has not been built' }, () => {
  const dist = (p) => new URL('../dist/' + p, import.meta.url);
  assert.ok(!existsSync(dist('plan/battery')), 'build the site again if this fails');
  for (const p of ['plan/index.html', 'plan/funding/index.html', 'plan/reference/index.html', 'product-build/index.html']) { const t = readFileSync(dist(p), 'utf8'); assert.ok(!/batter/i.test(t), p); assert.ok(!/Plan 3|Three plans/.test(t), p); }
});
test('reading path: it is worked out from the plans, numbers its own steps and ends on "Up to date"', () => {
  const x = world(EMPTY); const p = path(x);
  assert.deepEqual(p[0], ['hub', 'today']); assert.deepEqual(p[p.length - 1], ['hub', 'done']);
  assert.deepEqual([...new Set(p.map(([a]) => a))], ['hub', ...Object.keys(KIT)]);
  p.forEach(([a, k], i) => { const q = pathInfo(x, a, k); assert.equal(q.step, i + 1); assert.equal(q.of, p.length); assert.equal(!!q.prev, i > 0); assert.equal(!!q.next, i < p.length - 1); });
  const last = pathInfo(x, 'hub', 'done'); assert.equal(last.next, null); assert.equal(AREAS.hub.tabs.find((q) => q.k === 'done').label, 'Up to date');
  assert.equal(pathInfo(x, p[p.length - 2][0], p[p.length - 2][1]).next.label, 'Up to date');
  // a screen with something to show joins the path, and the count follows
  const opp = { ...EMPTY, edits: { opportunities: { [seed.opportunities[0].id]: { amountAttainable: { base: null, value: 1000 } } } } };
  assert.equal(path(world(opp)).length, p.length + 1);
});
test('changes kept in a browser: an old overlay that still holds battery records loads and draws every screen', () => {
  const e = (base, value) => ({ base, value, at: '2026-11-19T10:00:00Z' });
  const old = { who: 'A Person', log: [], removed: { customers: ['CU-002'] },
    edits: {
      bTasks: { 'BT-001': { percent: e(0, 50), hours: e({ A: 8, B: 2 }, { A: 12, B: 2 }) } }, bLines: { 'BL-01': { amount: e(null, 4000) } }, bGates: { 'BG-0': { approval: e(null, { by: 'A Person', date: '2026-11-19', decision: 'Approved' }) } },
      bProgram: { _: { startDate: e('2026-11-23', '2026-12-07') } }, bEconomics: { _: { price: e(1, 2), cac: e(0, 500) } }, bSources: { 'BS-03': { state: e('Not received', 'On file') } }, makeBuy: { 'MB-01': { supplier: e(null, 'a supplier') } },
      execDecisions: { 'ED-01': { decision: e(null, 'x'), decidedBy: e(null, 'A Person'), decidedOn: e(null, '2026-11-19') }, 'ED-02': { due: e('2026-11-23', '2026-11-27') }, 'ED-07': { due: e('2026-11-30', '2026-12-05') } },
      lines: { 'H-01': { amount: e(6500, 7000) } },
    },
    added: {
      customers: [{ id: 'CU-001', name: 'A laboratory', segment: 'SG-1', stage: 'Paid pilot', contact: 'lead', value: 5000, record: 'r', lost: false }, { id: 'CU-002', name: 'x', stage: 'Customer discovery' }],
      expenses: [{ id: 'EX-001', date: '2026-12-10', program: 'battery', kind: 'Paid', vendor: 'v', what: 'w', amount: 120, line: 'BL-01', document: 'd', by: 'A Person' }],
      evidence: [{ id: 'B-EV-1', test: 'BV-02', task: 'BT-001', title: 't', location: 'l', result: 'Pass', date: '2026-12-01', by: 'A Person' }],
      opportunities: [{ id: 'FO-U017', organisation: 'o', programme: 'p', type: 'customer-funded', target: 'battery', stage: 'Identified', amountRequested: null, amountAttainable: null, probability: null, probabilityBasis: null, eligibility: 'Not checked', owner: 'C', amountReceived: null, receivedDate: null, verified: false, deadline: null, sourceUrl: null, note: '' }],
      partners: [{ id: 'PA-001', name: 'n', kind: 'k', target: 'battery', state: 'Identified', offer: 'o', record: 'r', by: 'A Person' }],
      hoursLog: [{ id: 'HL-001', program: 'battery', task: 'BT-001', role: 'A', week: 1, hours: 6 }],
    } };
  const before = JSON.stringify(old);
  const x = world(old);
  assert.equal(JSON.stringify(old), before, 'the stored changes are left as they are');
  // what still applies is applied; what has no record any more is left out and not counted
  assert.equal(x.m.lines.find((l) => l.id === 'H-01').amount, 7000);
  assert.equal(x.m.execDecisions.find((q) => q.id === 'ED-07').due, '2026-12-05');
  for (const k of ['bTasks', 'bLines', 'bGates', 'bProgram', 'bEconomics', 'bSources', 'makeBuy', 'customers']) assert.ok(!(k in x.m), k);
  assert.deepEqual(x.d.ecg.orphans, [{ collection: 'execDecisions', id: 'ED-01' }, { collection: 'execDecisions', id: 'ED-02' }]);
  assert.equal(x.d.changes, 2 + 5, 'two edits in force and five added records; the rest is ignored');
  // the figures of the plans that remain are the same as with no overlay, apart from the changes that still apply
  const clean = world(EMPTY);
  assert.deepEqual(x.d.scheds.map((s) => [s.id, s.sched.endDate]), clean.d.scheds.map((s) => [s.id, s.sched.endDate]));
  assert.equal(x.d.budget.rows.find((r) => r.id === 'ecg').total, C.round2(clean.d.budget.rows.find((r) => r.id === 'ecg').total + 500 * (1 + seed.program.contingencyPct / 100)));
  assert.equal(x.d.load.conflicts.length, clean.d.load.conflicts.length);
  assert.equal(x.d.monthly.totalPlanned, C.round2(clean.d.monthly.totalPlanned + 500 * (1 + 0)), 'a paid expense is actual, not planned');
  assert.equal(x.d.monthly.totalActual, 120, 'a payment that was entered stays in the accounts of the company');
  // every screen and every side panel draws
  const html = draw(x); assert.ok(html.length > 10000); assert.ok(!/undefined|NaN|\[object Object\]/.test(html.replace(/<[^>]+>/g, ' ')));
  assert.equal(draw(x).length > 0, true);
  for (const p of [{ kind: 'task', coll: 'bTasks', id: 'BT-001' }, { kind: 'gate', coll: 'bGates', id: 'BG-0' }, { kind: 'risk', coll: 'bRisks', id: 'BK-01' }, { kind: 'decision', coll: 'execDecisions', id: 'ED-01' }, { kind: 'decision', coll: 'bDecisions', id: 'x' }]) assert.equal(panel({ ...x, ui: { ...UI, panel: p } }), '', p.kind + ' ' + p.coll + ': a record that is gone opens nothing');
  for (const p of [{ kind: 'decision', coll: 'execDecisions', id: 'ED-07' }, { kind: 'task', coll: 'fTasks', id: 'FT-101' }, { kind: 'gate', coll: 'gates', id: 'G-1' }, { kind: 'changes' }]) assert.ok(panel({ ...x, ui: { ...UI, panel: p } }).includes('pl-drawer'), p.kind);
  assert.equal(path(x)[path(x).length - 1][1], 'done');
  // a damaged or empty store is no worse
  for (const s of [{}, { edits: { tasks: {} }, added: { nothing: [{ id: 1 }] } }]) assert.ok(draw(world(s), ['hub']).length > 1000);
});

