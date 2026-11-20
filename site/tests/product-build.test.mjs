/* Product Build: tests of every calculation the page shows, of the lock, and of what a release may contain.
   Run from site/:  node --test tests/
   The last group reads dist/ and is skipped when the site has not been built. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../src/product-build/calc.js';
import { lock, unlock, WrongCode, MIN_CODE_LENGTH } from '../src/product-build/crypto.js';
import { seed, SENTINEL } from '../src/product-build/seed/index.js';

const clone = (x) => JSON.parse(JSON.stringify(x));

/* ---------------------------------------------------------------- budget */

test('budget: the baseline reproduces the program brief to the dollar', () => {
  const b = C.budget(seed.program, seed.roles, seed.lines);
  assert.equal(b.labour.rows.find((r) => r.id === 'A').hours, 576);
  assert.equal(b.labour.rows.find((r) => r.id === 'A').cost, 46080);
  assert.equal(b.labour.rows.find((r) => r.id === 'B').hours, 192);
  assert.equal(b.labour.rows.find((r) => r.id === 'B').cost, 9600);
  assert.equal(b.labour.hours, 768);
  assert.equal(b.labour.cost, 55680);
  assert.equal(b.hardware, 17800);
  assert.equal(b.software, 2200);
  assert.equal(b.external, 3000);
  assert.equal(b.direct, 78680);
  assert.equal(b.contingency, 11802);
  assert.equal(b.total, 90482);
});
test('budget: contingency is a share of direct costs and is not inside them', () => {
  const b = C.budget({ ...seed.program, contingencyPct: 20 }, seed.roles, seed.lines);
  assert.equal(b.direct, 78680);
  assert.equal(b.contingency, 15736);
  assert.equal(b.total, 94416);
});
test('budget: every line starts as a planning estimate and is counted as unverified', () => {
  const b = C.budget(seed.program, seed.roles, seed.lines);
  assert.equal(b.unverifiedLines, seed.lines.length);
  const lines = clone(seed.lines); lines[0].kind = 'Distributor Quote';
  assert.equal(C.budget(seed.program, seed.roles, lines).unverifiedLines, seed.lines.length - 1);
});
test('budget: a change of length or rate recalculates labour and the total', () => {
  const b = C.budget({ ...seed.program, durationWeeks: 20 }, seed.roles, seed.lines);
  assert.equal(b.labour.cost, (80 * 36 + 50 * 12) * 20);
  const roles = clone(seed.roles); roles[0].rate = 100;
  assert.equal(C.budget(seed.program, roles, seed.lines).labour.cost, 100 * 36 * 16 + 9600);
});
test('scenarios: lean is below baseline, extended above, and baseline follows the program', () => {
  const by = Object.fromEntries(seed.scenarios.map((s) => [s.id, C.budget(seed.program, seed.roles, seed.lines, s)]));
  assert.equal(by.baseline.total, 90482);
  assert.ok(by.lean.total < by.baseline.total && by.extended.total > by.baseline.total);
  assert.equal(by.lean.hardware, 17800 - 1250 - 1500 - 400 - 700);
  assert.equal(by.extended.durationWeeks, 20);
  assert.equal(by.extended.labour.hours, 960);
  assert.equal(by.extended.total, C.round2(by.extended.direct * 1.2));
  const longer = C.budget({ ...seed.program, durationWeeks: 18 }, seed.roles, seed.lines, seed.scenarios.find((s) => s.id === 'baseline'));
  assert.equal(longer.durationWeeks, 18);
});
test('tools: cost is price times seats times months, a yearly price is charged whole, an unknown price stays unknown', () => {
  assert.equal(C.toolCost({ price_usd: 100, price_unit: 'per user per month' }, 2, 4).cost, 800);
  assert.equal(C.toolCost({ price_usd: 12000, price_unit: 'per year' }, 1, 4).cost, 12000);
  assert.equal(C.toolCost({ price_usd: null, price_unit: 'quote' }, 1, 4).cost, null);
  assert.equal(C.toolCost({ price_usd: 0, price_unit: 'free' }, 5, 4).cost, 0);
  const s = C.stackCost(seed.stack, seed.tools);
  assert.equal(s.total, C.round2(s.rows.filter((r) => r.chosen).reduce((a, r) => a + (r.cost || 0), 0)));
  assert.ok(s.total < 2200, 'the chosen stack fits the software allowance');
  assert.ok(s.rows.every((r) => seed.tools.some((t) => t.id === r.tool)), 'every stack row names a tool that is in the researched list');
});

/* ---------------------------------------------------------------- timeline */

test('timeline: sixteen weeks from 2026-11-23 end on 2027-03-12 with no error', () => {
  const s = C.schedule(seed.program, seed.tasks);
  assert.deepEqual(s.errors, []);
  assert.equal(s.endWeek, 16);
  assert.equal(s.endDate, '2027-03-12');
  assert.equal(C.weekStart(seed.program, 1), '2026-11-23');
  assert.equal(C.weekEnd(seed.program, 16), '2027-03-12');
  assert.equal(C.weekOf(seed.program, '2026-11-22'), 0);
  assert.equal(C.weekOf(seed.program, '2026-11-30'), 2);
  assert.equal(s.slipped.length, 0, 'no task in the seed is pushed off its planned week');
});
test('timeline: the eight stop/go milestones exist and fall in order', () => {
  const s = C.schedule(seed.program, seed.tasks);
  const m = ['M-1', 'M-2', 'M-3', 'M-4', 'M-5', 'M-7', 'M-8'].map((id) => s.byId.get(id).start);
  assert.deepEqual(m, [...m].sort((a, b) => a - b));
  assert.equal(seed.gates.length, 8);
  for (const g of seed.gates) assert.ok(s.byId.get(g.milestone).milestone);
  assert.equal(C.finishOf(s, 'M-5'), '2027-02-12');
});
test('timeline: a late predecessor pushes its successors and the finish', () => {
  const tasks = clone(seed.tasks); tasks.find((t) => t.id === 'T-202').weeks = 4;      // bench set-up takes two weeks longer
  const s = C.schedule(seed.program, tasks);
  assert.ok(s.byId.get('M-2').slipWeeks > 0);
  assert.ok(s.endWeek > 16);
  assert.ok(s.slipped.includes('M-8'));
});
test('timeline: a changed program length stretches the plan', () => {
  const s = C.schedule({ ...seed.program, durationWeeks: 32 }, seed.tasks);
  assert.equal(s.endWeek, 32);
  assert.equal(s.byId.get('T-203').len, 4);
});
test('timeline: a missing dependency and a loop are reported, not hidden', () => {
  const a = C.schedule(seed.program, [{ id: 'X-1', title: 'x', week: 1, weeks: 1, deps: ['X-9'] }]);
  assert.match(a.errors[0], /does not exist/);
  const b = C.schedule(seed.program, [{ id: 'X-1', title: 'x', week: 1, weeks: 1, deps: ['X-2'] }, { id: 'X-2', title: 'y', week: 1, weeks: 1, deps: ['X-1'] }]);
  assert.match(b.errors[0], /loop/);
});
test('timeline: overdue means unfinished after its finish date', () => {
  const s = C.schedule(seed.program, seed.tasks, '2026-12-01');
  assert.ok(s.overdue.includes('T-101') && !s.overdue.includes('T-102'));
  const tasks = clone(seed.tasks); tasks.find((t) => t.id === 'T-101').percent = 100;
  assert.ok(!C.schedule(seed.program, tasks, '2026-12-01').overdue.includes('T-101'));
});
test('timeline: dependencies written as text are read back the same', () => {
  const d = C.parseDeps('T-201, t-202:SS+1; M-2');
  assert.deepEqual(d, [{ id: 'T-201', type: 'FS', lag: 0 }, { id: 'T-202', type: 'SS', lag: 1 }, { id: 'M-2', type: 'FS', lag: 0 }]);
  assert.equal(C.fmtDeps(d), 'T-201, T-202:SS+1, M-2');
  assert.throws(() => C.parseDeps('after lunch'));
});

/* ---------------------------------------------------------------- critical path */

test('critical path: runs from the sensor order through the feasibility gate to the final decision', () => {
  const s = C.schedule(seed.program, seed.tasks);
  for (const id of ['T-201', 'T-202', 'T-203', 'T-204', 'M-2', 'T-401', 'M-3', 'T-502', 'T-504', 'M-4', 'T-602', 'T-603', 'M-5', 'T-902', 'M-7', 'T-905', 'M-8']) assert.ok(s.critical.includes(id), id + ' should be critical');
  for (const id of ['T-503', 'T-701', 'T-802', 'T-001']) assert.ok(!s.critical.includes(id), id + ' should not be critical');
  assert.ok(s.byId.get('T-503').float > 0);
});
test('critical path: slack is how far a task can move before the finish moves', () => {
  const s = C.schedule(seed.program, seed.tasks);
  const f = s.byId.get('T-503').float;
  const tasks = clone(seed.tasks); tasks.find((t) => t.id === 'T-503').week += f;
  assert.equal(C.schedule(seed.program, tasks).endWeek, 16);
  tasks.find((t) => t.id === 'T-503').week += 1;
  assert.ok(C.schedule(seed.program, tasks).endWeek > 16 || C.schedule(seed.program, tasks).byId.get('T-503').float < 0 || C.schedule(seed.program, tasks).byId.get('T-503').critical);
});

/* ---------------------------------------------------------------- labour */

test('labour: hours placed in tasks fit inside the allocation and no week is overloaded', () => {
  const s = C.schedule(seed.program, seed.tasks);
  const l = C.resourceLoad(seed.program, seed.roles, seed.tasks, s);
  assert.equal(l.conflicts.length, 0);
  assert.ok(l.totals.A.planned <= 576 && l.totals.B.planned <= 192);
  assert.equal(l.totals.A.capacity, 576);
  assert.ok(Math.abs(l.weeks.reduce((a, w) => a + w.hours.A, 0) - l.totals.A.planned) < 0.2, 'weekly hours add up to the hours placed (each week is rounded to a hundredth)');
  for (const w of l.weeks) { assert.ok(w.hours.A <= 36.001, `week ${w.week} developer`); assert.ok(w.hours.B <= 12.001, `week ${w.week} director`); }
});
test('labour: a week that asks too much of a person is flagged with the tasks that cause it', () => {
  const tasks = clone(seed.tasks); tasks.find((t) => t.id === 'T-603').hours.A = 60;
  const l = C.resourceLoad(seed.program, seed.roles, tasks, C.schedule(seed.program, tasks));
  const c = l.conflicts.find((q) => q.week === 12 && q.role === 'A');
  assert.ok(c && c.over > 0 && c.tasks.includes('T-603'));
});
test('labour: labour cost is not counted twice', () => {
  const s = C.schedule(seed.program, seed.tasks);
  const spend = C.weeklySpend(seed.program, seed.roles, seed.tasks, seed.lines, s);
  const plannedLabour = C.round2(spend.reduce((a, w) => a + w.plannedLabour, 0));
  const l = C.resourceLoad(seed.program, seed.roles, seed.tasks, s);
  assert.ok(Math.abs(plannedLabour - (l.totals.A.planned * 80 + l.totals.B.planned * 50)) < 15, 'weekly labour adds up to hours placed times rate, within rounding');
  assert.ok(plannedLabour <= 55680);
  const other = C.round2(spend.reduce((a, w) => a + w.plannedOther, 0));
  assert.equal(other, 17800 + 2200 + 3000);
});
test('labour: logged hours become actual cost in their week', () => {
  const s = C.schedule(seed.program, seed.tasks);
  const spend = C.weeklySpend(seed.program, seed.roles, seed.tasks, seed.lines, s, [{ week: 2, role: 'A', hours: 10 }, { week: 2, role: 'B', hours: 2 }]);
  assert.equal(spend[1].actualLabour, 900);
  assert.equal(spend[15].cumActual, 900);
});

/* ---------------------------------------------------------------- traceability */

test('traceability: every need has a requirement, every requirement an output and a test', () => {
  const t = C.traceability(seed);
  const kinds = new Set(t.gaps.map((g) => g.kind));
  for (const k of ['need-without-requirement', 'requirement-without-need', 'requirement-without-output', 'requirement-without-test']) assert.ok(!kinds.has(k), k);
});
test('traceability: with no evidence on record every test is reported as lacking it, and nothing is called tested', () => {
  const t = C.traceability(seed);
  assert.equal(seed.evidence.length, 0);
  assert.equal(seed.reviews.length, 0);
  assert.equal(t.gaps.filter((g) => g.kind === 'test-without-evidence').length, seed.tests.length);
  assert.ok(t.rows.every((r) => r.status !== 'Tested' && r.status !== 'Approved'));
  assert.equal(t.complete, false);
});
test('traceability: broken links are found one by one', () => {
  const m = clone(seed);
  m.requirements.push({ id: 'RQ-99', text: 'orphan', needs: [] });
  m.needs.push({ id: 'UN-99', text: 'unmet' });
  const kinds = C.traceability(m).gaps.filter((g) => ['RQ-99', 'UN-99'].includes(g.id)).map((g) => g.kind).sort();
  assert.deepEqual(kinds, ['need-without-requirement', 'requirement-without-need', 'requirement-without-output', 'requirement-without-test']);
});
test('traceability: evidence, then review, then approval move a requirement forward', () => {
  const m = clone(seed);
  m.evidence.push({ id: 'E-1', test: 'VT-01', result: 'Pass' });
  assert.equal(C.traceability(m).rows.find((r) => r.id === 'RQ-01').status, 'Tested');
  assert.ok(C.traceability(m).gaps.some((g) => g.kind === 'evidence-without-review' && g.id === 'E-1'));
  m.reviews.push({ id: 'RV-1', evidence: ['E-1'] });
  assert.ok(C.traceability(m).gaps.some((g) => g.kind === 'review-without-approval' && g.id === 'RV-1'));
  m.reviews[0].approval = { by: 'A Person', date: '2026-12-01', decision: 'Approved' };
  assert.equal(C.traceability(m).rows.find((r) => r.id === 'RQ-01').status, 'Approved');
});
test('traceability: a risk control with no test is reported', () => {
  const t = C.traceability(seed);
  const open = t.gaps.filter((g) => g.kind === 'control-without-verification').map((g) => g.id);
  assert.ok(open.includes('RC-05'));
  assert.ok(!open.includes('RC-07'));
});
test('ids: every id is unique and every link points at a record that exists', () => {
  for (const c of ['tasks', 'gates', 'lines', 'needs', 'requirements', 'outputs', 'risks', 'tests', 'decisions', 'gaps', 'parts', 'stack', 'controls']) assert.equal(new Set(seed[c].map((r) => r.id)).size, seed[c].length, c);
  const ids = (c) => new Set(seed[c].map((r) => r.id));
  const controls = new Set(seed.risks.flatMap((r) => r.controls.map((k) => k.id)));
  assert.equal(controls.size, seed.risks.flatMap((r) => r.controls).length);
  for (const r of seed.requirements) for (const n of r.needs) assert.ok(ids('needs').has(n), `${r.id} -> ${n}`);
  for (const o of seed.outputs) { for (const r of o.requirements) assert.ok(ids('requirements').has(r)); assert.ok(ids('tasks').has(o.task)); }
  for (const t of seed.tests) { for (const r of t.requirements) assert.ok(ids('requirements').has(r)); for (const k of t.riskControls) assert.ok(controls.has(k), `${t.id} -> ${k}`); }
  for (const t of seed.tasks) { for (const r of t.risks) assert.ok(ids('risks').has(r), `${t.id} -> ${r}`); for (const e of t.expense) assert.ok(ids('lines').has(e), `${t.id} -> ${e}`); }
  for (const g of seed.gates) { for (const t of g.tasks) assert.ok(ids('tasks').has(t)); for (const a of g.after) assert.ok(ids('gates').has(a)); assert.ok(ids('tasks').has(g.milestone)); }
});

/* ---------------------------------------------------------------- approval gating */

test('gates: nothing is approved at the start; the current gate is the requirements baseline', () => {
  const g = C.gates(seed);
  assert.equal(g.current.id, 'G-1');
  assert.ok(g.rows.every((r) => !r.authorisesSpending));
  assert.equal(g.rows.find((r) => r.id === 'G-1').status, 'Open');
  assert.equal(g.rows.find((r) => r.id === 'G-4').status, 'Blocked');
});
test('gates: an approval entered before the work and evidence exist does not count', () => {
  const m = clone(seed);
  m.gates.find((g) => g.id === 'G-2').approval = { by: 'A Person', date: '2026-12-18', decision: 'Approved' };
  const r = C.gates(m).rows.find((g) => g.id === 'G-2');
  assert.equal(r.status, 'Approval not valid');
  assert.equal(r.authorisesSpending, false);
  assert.equal(r.canApprove, false);
  assert.ok(r.missing.some((x) => x.kind === 'gate') && r.missing.some((x) => x.kind === 'task') && r.missing.some((x) => x.kind === 'evidence'));
});
test('gates: the circuit board cannot be released before the feasibility gate is approved', () => {
  const m = clone(seed);
  const done = (g) => { for (const t of g.tasks) m.tasks.find((x) => x.id === t).percent = 100; for (const e of g.evidence) m.evidence.push({ id: e }); };
  const g4 = m.gates.find((g) => g.id === 'G-4'); done(g4);
  let r = C.gates(m).rows.find((g) => g.id === 'G-4');
  assert.equal(r.canApprove, false);
  assert.deepEqual(r.missing.map((x) => x.id).sort(), ['G-2', 'G-3']);
  for (const id of ['G-1', 'G-2', 'G-3']) { const g = m.gates.find((x) => x.id === id); done(g); g.approval = { by: 'A Person', date: '2026-12-20', decision: 'Approved' }; }
  r = C.gates(m).rows.find((g) => g.id === 'G-4');
  assert.equal(r.canApprove, true);
  assert.equal(r.status, 'Review Required');
  g4.approval = { by: 'A Person', date: '2027-01-22', decision: 'Approved' };
  r = C.gates(m).rows.find((g) => g.id === 'G-4');
  assert.equal(r.status, 'Approved');
  assert.equal(r.authorisesSpending, true);
});
test('gates: a no-go can be recorded at any time and releases nothing', () => {
  const m = clone(seed);
  m.gates.find((g) => g.id === 'G-2').approval = { by: 'A Person', date: '2026-12-18', decision: 'No-go' };
  const g = C.gates(m);
  assert.equal(g.rows.find((r) => r.id === 'G-2').status, 'No-go');
  assert.equal(g.rows.find((r) => r.id === 'G-2').authorisesSpending, false);
  assert.equal(g.rows.find((r) => r.id === 'G-4').status, 'Blocked');
});
test('approvals: a person, a date and a decision are needed, and an AI tool cannot approve', () => {
  assert.equal(C.validApproval({ by: 'A Person', date: '2026-12-01', decision: 'Approved' }).ok, true);
  assert.equal(C.validApproval({ by: '', date: '2026-12-01', decision: 'Approved' }).ok, false);
  assert.equal(C.validApproval({ by: 'A Person', date: '', decision: 'Approved' }).ok, false);
  assert.equal(C.validApproval({ by: 'A Person', date: '2026-12-01', decision: 'Maybe' }).ok, false);
  for (const who of ['Claude', 'Claude Code', 'AI assistant', 'automated', 'ChatGPT bot']) assert.equal(C.validApproval({ by: who, date: '2026-12-01', decision: 'Approved' }).ok, false, who);
});

/* ---------------------------------------------------------------- lifecycle alerts */

const part = (o) => ({ id: 'P-x', role: 'preferred', lifecycle_status: 'Active', critical: false, approval: 'Approved', second_source: 'another', channels: [{ seller: 'S1', authorised: true, stock: 100, price_usd: { 1: 2, 100: 1 }, lead_time: '2 weeks' }, { seller: 'S2', authorised: true, stock: 5, price_usd: { 1: 2.5 }, lead_time: 'in stock' }], ...o });
const codes = (p) => C.partAlerts(p).map((a) => a.code);
test('lifecycle: an Active part with two stocked sellers raises nothing', () => { assert.deepEqual(codes(part({})), []); });
test('lifecycle: NRND, obsolete, end-of-life and last-time-buy parts are rejected', () => {
  for (const s of ['NRND', 'Obsolete', 'EOL', 'Last Time Buy', 'Discontinued at Digi-Key', 'Not recommended: NRND']) { const a = C.partAlerts(part({ lifecycle_status: s })); assert.equal(a.find((x) => x.code === 'lifecycle').level, 'reject', s); }
  assert.ok(codes(part({ discontinuation_notice: 'last order 2027-03' })).includes('notice'));
});
test('lifecycle: an unstated or preview status is a warning, never read as Active', () => {
  assert.ok(codes(part({ lifecycle_status: 'not stated' })).includes('lifecycle-unverified'));
  assert.ok(codes(part({ lifecycle_status: 'Preview' })).includes('lifecycle-unverified'));
  assert.ok(codes(part({ lifecycle_status: undefined })).includes('lifecycle-unverified'));
});
test('lifecycle and stock are judged apart', () => {
  const a = codes(part({ channels: [{ seller: 'S1', authorised: true, stock: 0, price_usd: { 1: 2 }, lead_time: '2 weeks' }, { seller: 'S2', authorised: true, stock: 0, price_usd: { 1: 2 }, lead_time: '3 weeks' }] }));
  assert.ok(a.includes('stock') && !a.includes('lifecycle') && !a.includes('lifecycle-unverified'));
});
test('sourcing: one seller, a long lead time, no price and no substitute are each flagged', () => {
  assert.ok(codes(part({ channels: [{ seller: 'S1', authorised: true, stock: 9, price_usd: { 1: 2 }, lead_time: '1 week' }] })).includes('single-source'));
  assert.ok(codes(part({ channels: [{ seller: 'S1', authorised: true, stock: 9, price_usd: { 1: 2 }, lead_time: '26 weeks' }, { seller: 'S2', authorised: true, stock: 9, price_usd: { 1: 2 }, lead_time: '12 wk' }] })).includes('lead-time'));
  assert.ok(codes(part({ channels: [{ seller: 'S1', authorised: true, stock: 9, price_usd: { 1: null }, lead_time: '1 week' }, { seller: 'S2', authorised: true, stock: 9, price_usd: {}, lead_time: '1 week' }] })).includes('price'));
  assert.ok(codes(part({ critical: true, second_source: null })).includes('no-substitute'));
  assert.equal(C.leadWeeks('35 days'), 5);
  assert.equal(C.leadWeeks('not stated'), null);
});
test('sourcing: an unauthorised or unreadable seller is not counted as a supply channel', () => {
  const p = part({ channels: [{ seller: 'S1', authorised: true, stock: 9, price_usd: { 1: 2 }, lead_time: '1 week' }, { seller: 'Broker', authorised: false, stock: 999, price_usd: { 1: 1 } }, { seller: 'S3', authorised: true, source_kind: 'not readable' }] });
  assert.equal(C.supplyChannels(p).length, 1);
});
test('parts cost: a missing price makes the figure a floor and names the part', () => {
  const parts = [part({ id: 'P-1', selected: true, qty_per_device: 2 }), part({ id: 'P-2', selected: true, channels: [] }), part({ id: 'P-3', selected: false })];
  const c = C.bomCost(parts, 100);
  assert.equal(c.perDevice, 2);            // two of P-1 at the 100-piece price of 1
  assert.deepEqual(c.missing, ['P-2']);
  assert.equal(c.complete, false);
  assert.equal(C.bomCost(parts, 1).perDevice, 4);
});
test('parts research: every part names its maker, part number and a source, and no part is marked approved', () => {
  assert.ok(seed.parts.length >= 40);
  for (const p of seed.parts) { assert.ok(p.manufacturer && p.mpn, p.id); assert.ok(p.datasheet_url || p.lifecycle_source_url || (p.channels || []).some((c) => c.url), p.id + ' has a source'); assert.notEqual(p.approval, 'Approved'); }
  const h = C.bomHealth(seed.parts);
  assert.equal(h.selected, seed.parts.filter((p) => p.selected).length);
  assert.ok(h.active <= h.selected);
});

/* ---------------------------------------------------------------- unauthorised access */

test('access: the data opens with the code and with nothing else', async () => {
  const env = await lock(seed, 'correct horse battery', 2000);
  assert.equal((await unlock(env, 'correct horse battery')).meta.sentinel, SENTINEL);
  await assert.rejects(unlock(env, 'correct horse batterx'), WrongCode);
  await assert.rejects(unlock(env, ''), WrongCode);
  await assert.rejects(unlock({ ...env, ct: env.ct.slice(0, -8) + 'AAAAAAA=' }, 'correct horse battery'), WrongCode);
});
test('access: the published envelope shows none of the data', async () => {
  const text = JSON.stringify(await lock(seed, 'correct horse battery', 2000));
  for (const s of [SENTINEL, '46080', 'Engineering director', 'ADS131', 'Planning Estimate']) assert.ok(!text.includes(s), s);
  assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ['cipher', 'ct', 'iter', 'iv', 'kdf', 'salt', 'v']);
});
test('access: a short code is refused at build, and each build uses a fresh salt', async () => {
  await assert.rejects(lock(seed, 'x'.repeat(MIN_CODE_LENGTH - 1), 1000));
  const a = await lock({ a: 1 }, 'x'.repeat(MIN_CODE_LENGTH), 1000), b = await lock({ a: 1 }, 'x'.repeat(MIN_CODE_LENGTH), 1000);
  assert.notEqual(a.salt, b.salt); assert.notEqual(a.ct, b.ct);
});
test('access: a release with no code holds nothing to open', async () => { await assert.rejects(unlock({ locked: true }, 'anything at all')); });
test('access: the page code that the public can read never imports the data', () => {
  for (const f of ['app.js', 'views.js', 'calc.js', 'crypto.js']) { const t = readFileSync(new URL('../src/product-build/' + f, import.meta.url), 'utf8'); assert.ok(!/seed\/|data\/product-build/.test(t.replace(/\/\*[\s\S]*?\*\//g, '')), f + ' must not import the seed'); }
  const page = readFileSync(new URL('../src/pages/product-build/index.astro', import.meta.url), 'utf8');
  assert.ok(!/seed\//.test(page));
});
const dist = new URL('../dist/', import.meta.url);
test('access: nothing internal is readable anywhere in the built site', { skip: !existsSync(dist) && 'the site has not been built' }, () => {
  const marks = [SENTINEL, 'Engineering director', 'ISO 13485 process implementation', 'MCG sensor evaluation hardware', 'correct, the allowance', 'Hazard identification and initial risk analysis', 'ADS131M08'];
  const files = []; (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(html|js|mjs|json|css|txt|xml|map)$/.test(p)) files.push(p); } })(fileURLToPath(dist));
  assert.ok(files.length > 10);
  for (const f of files) { const t = readFileSync(f, 'utf8'); for (const s of marks) assert.ok(!t.includes(s), `${f} contains "${s}"`); assert.ok(!/\$\s?(46,?080|55,?680|90,?482)/.test(t), f + ' contains a budget figure'); }
  const pay = files.find((f) => /product-build[\\/]payload\.json$/.test(f));
  assert.ok(pay, 'the build holds the page data file; build the site again if this fails');
  const env = JSON.parse(readFileSync(pay, 'utf8'));
  assert.ok(env.locked === true || (env.ct && env.salt && !('program' in env)));
});

/* ---------------------------------------------------------------- data integrity and history */

test('integrity: a manual change survives a new version of the page data, and the difference is listed', () => {
  let edits = C.setEdit({}, seed, 'lines', 'H-01', 'amount', 9000, '2026-12-01T00:00:00Z');
  edits = C.setEdit(edits, seed, 'program', '_', 'durationWeeks', 18, '2026-12-01T00:00:00Z');
  const a = C.applyEdits(seed, edits);
  assert.equal(a.model.lines.find((l) => l.id === 'H-01').amount, 9000);
  assert.equal(a.model.program.durationWeeks, 18);
  assert.equal(a.conflicts.length, 0);
  assert.equal(seed.lines.find((l) => l.id === 'H-01').amount, 6500, 'the page data itself is not altered');
  const next = clone(seed); next.lines.find((l) => l.id === 'H-01').amount = 7200; next.lines.find((l) => l.id === 'H-02').amount = 800;
  const b = C.applyEdits(next, edits);
  assert.equal(b.model.lines.find((l) => l.id === 'H-01').amount, 9000, 'the manual value still wins');
  assert.equal(b.model.lines.find((l) => l.id === 'H-02').amount, 800, 'untouched fields take the new data');
  assert.deepEqual(b.conflicts.map((c) => [c.id, c.field, c.seed, c.mine]), [['H-01', 'amount', 7200, 9000]]);
});
test('integrity: setting a field back to the page value removes the change; records that vanish are reported', () => {
  let edits = C.setEdit({}, seed, 'lines', 'H-01', 'amount', 9000, 't');
  edits = C.setEdit(edits, seed, 'lines', 'H-01', 'amount', 6500, 't');
  assert.deepEqual(edits.lines, {});
  const gone = C.applyEdits({ ...seed, lines: seed.lines.filter((l) => l.id !== 'H-01') }, C.setEdit({}, seed, 'lines', 'H-01', 'amount', 1, 't'));
  assert.deepEqual(gone.orphans, [{ collection: 'lines', id: 'H-01' }]);
});
test('integrity: records a person adds are kept beside the page data', () => {
  const a = C.applyEdits(seed, {}, { evidence: [{ id: 'E-G1-01', title: 'baseline' }] });
  assert.equal(a.model.evidence.length, 1);
  assert.equal(seed.evidence.length, 0);
});
test('history: each entry is chained to the one before; a changed, removed or reordered entry is found', async () => {
  let log = [];
  log = await C.appendEvent(log, { at: '2026-12-01T10:00:00Z', who: 'A', action: 'changed', collection: 'lines', id: 'H-01', field: 'amount', from: 6500, to: 9000 });
  log = await C.appendEvent(log, { at: '2026-12-01T10:05:00Z', who: 'A', action: 'added', collection: 'evidence', id: 'E-1', to: { id: 'E-1' } });
  log = await C.appendEvent(log, { at: '2026-12-02T09:00:00Z', who: 'B', action: 'changed', collection: 'gates', id: 'G-1', field: 'approval', to: { by: 'B' } });
  assert.equal(await C.verifyLog(log), 0);
  assert.deepEqual(log.map((e) => e.n), [1, 2, 3]);
  assert.equal(log[1].prev, log[0].hash);
  const altered = clone(log); altered[0].to = 1; assert.equal(await C.verifyLog(altered), 1);
  const removed = [log[0], log[2]]; assert.equal(await C.verifyLog(removed), 2);
  const swapped = [log[1], log[0], log[2]]; assert.equal(await C.verifyLog(swapped), 1);
  assert.equal(await C.verifyLog([]), 0);
});
test('history: the hash does not depend on the order of an object\'s keys', async () => {
  assert.equal(C.stable({ b: 1, a: [2, { d: 1, c: 2 }] }), C.stable({ a: [2, { c: 2, d: 1 }], b: 1 }));
  assert.equal((await C.sha256('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('export: CSV quotes commas, quotes and line breaks', () => {
  assert.equal(C.toCsv([{ a: 'x, y', b: 'say "hi"', c: 'l1\nl2', d: ['p', 'q'] }], ['a', 'b', 'c', 'd']), 'a,b,c,d\r\n"x, y","say ""hi""","l1\nl2",p; q\r\n');
});

/* ---------------------------------------------------------------- claims the page must not make */

test('claims: no record starts approved, tested or supplier verified, and no evidence exists', () => {
  // research files quote their sources word for word, so they are left out of the wording check
  const research = ['tools', 'parts', 'standards', 'hipaa', 'equipment', 'marketFacts', 'bStandards', 'manufacturers', 'marketBenchmarks', 'marketNotFound', 'opportunities', 'fundingStatus', 'fundingRules', 'fundingBenchmarks', 'fundingNotFound', 'internalFacts', 'internalDocs', 'internalContradictions', 'internalMissing'];
  const text = JSON.stringify({ ...seed, ...Object.fromEntries(research.map((k) => [k, []])), classification: null });
  for (const c of ['tasks', 'requirements', 'outputs', 'risks', 'tests', 'controls', 'lines']) for (const r of seed[c]) assert.ok(!['Approved', 'Tested', 'Supplier Verified'].includes(r.status || r.kind), `${c} ${r.id}`);
  assert.ok(seed.gates.every((g) => g.approval === null));
  assert.ok(seed.decisions.every((d) => d.decision === null));
  assert.ok(!/—/.test(text), 'no em dash');
  assert.ok(!/HIPAA[- ](eligible|compliant)\s+(Lightsail|small-instance)/i.test(text));
  const ls = seed.hipaa.find((h) => /Lightsail/.test(h.service)); assert.ok(ls && ls.on_list === false);
});
