/* Company plan: the Brief screens and how every screen is put together (reorganized 2026-11-20).

   Three depths:
     Brief    one screen, pictures first, a few words. Read-only. This file.
     Working  the full sections with tables and edit fields (plan-sections.js and, for ECG/MCG, views.js). Shown only when
              the reader switches to Working.
     Library  reference material that is looked up, not read: parts, tools, standards, security, records.
   One reading path: Today, Strategy, Roadmap, Money, Decisions. Every plan has the same four views: Now, Plan, Money, Proof.
   Decisions and risks each live in one register for all plans. Detail opens in a side panel.
   Public code: no figure is written here. */
import * as C from './calc.js';
import { esc, badge, ed, tbl, tile, sec, ul, input, gantt, LABELS } from './views.js';
import * as L from './views.js';
import * as S from './plan-sections.js';
import * as V from './plan-viz.js';

const $m = (v) => C.money(v == null ? v : Math.round(Number(v)));
const open = (kind, coll, id, label) => `<button type="button" class="pb-link pl-open" data-open="${kind}|${coll}|${esc(id)}">${esc(label ?? id)}</button>`;
const more = (href, text) => `<a class="pl-more" href="${href}">${esc(text)} →</a>`;
const empty = (b, p = '') => `<div class="pl-empty"><b>${esc(b)}</b>${p ? `<p>${p}</p>` : ''}</div>`;
const xe = (x) => ({ ...x, d: x.d.ecg });                                   // the ECG/MCG sections read their own figures
const KIT = {
  battery: { name: 'Battery Product', n: 1, href: '/plan/battery/', program: 'bProgram', tasks: 'bTasks', gates: 'bGates', lines: 'bLines', risks: 'bRisks' },
  ecg: { name: 'ECG/MCG', n: 2, href: '/product-build/', program: 'program', tasks: 'tasks', gates: 'gates', lines: 'lines', risks: 'risks' },
  funding: { name: 'Funding and Partnerships', n: 3, href: '/plan/funding/', program: 'fProgram', tasks: 'fTasks', gates: null, lines: 'fLines', risks: null },
};
const readOf = (x, id) => (id === 'battery' ? x.d.readB : id === 'ecg' ? x.d.readE : null);
const allDecisions = (x) => [...x.d.decisions.rows.map((r) => ({ ...r, coll: 'execDecisions' })), ...x.m.decisions.map((r) => ({ ...r, coll: 'decisions', program: 'ecg', due: null, days: null, owner: 'Director', made: !!(r.decision && r.decidedBy && r.decidedOn), evidence: (r.needs || []).join('; '), impactText: r.blocks }))];
const allRisks = (x) => [...x.m.bRisks.map((r) => ({ ...r, coll: 'bRisks', program: 'battery' })), ...x.m.risks.map((r) => ({ ...r, coll: 'risks', program: 'ecg' }))].map((r) => ({ ...r, level: C.riskLevel(r.severity, r.probability), after: C.riskLevel(r.residualSeverity, r.residualProbability), score: r.severity * r.probability })).sort((a, b) => b.score - a.score);

/** how one plan stands, from its own records: a word, and the reason */
export function standing(x, id) {
  const s = x.d.byProgram[id]; const over = x.d.load.conflicts.filter((c) => c.programs.includes(id)).length;
  if (s.sched.errors.length) return ['Blocked', 'the schedule has an error'];
  if (s.sched.overdue.length) return ['At risk', `${s.sched.overdue.length} task${s.sched.overdue.length > 1 ? 's' : ''} overdue`];
  if (over) return ['At risk', `${over} person-weeks over capacity`];
  if (x.d.today < s.program.startDate) return ['Not started', `starts ${s.program.startDate}`];
  return ['On plan', 'no task overdue, no week over capacity'];
}
const standBadge = (w) => `<span class="pb-b pb-b-${w === 'On plan' ? 'ok' : w === 'Not started' ? 'est' : w === 'At risk' ? 'warn' : 'bad'}">${esc(w)}</span>`;
const chips = (key, cur) => `<div class="pl-chips" role="group" aria-label="Filter by plan">${[['', 'All'], ['battery', 'Battery'], ['ecg', 'ECG/MCG'], ['funding', 'Funding'], ['shared', 'Shared']].map(([v, n]) => `<button type="button" class="pb-btn${cur === v ? ' pl-on' : ''}" data-chip="${key}|${v}" aria-pressed="${cur === v}">${n}</button>`).join('')}</div>`;
const segs = (key, cur, opts) => `<div class="pl-seg" role="group" aria-label="View">${opts.map(([v, n]) => `<button type="button" class="pb-btn${cur === v ? ' pl-on' : ''}" data-seg="${key}|${v}" aria-pressed="${cur === v}">${n}</button>`).join('')}</div>`;

/* ================================================================ the reading path */

function today(x) {
  const { d } = x; const dec = allDecisions(x).filter((r) => !r.made && r.due).slice(0, 3); const mo = d.monthly;
  const planCard = (id) => { const k = KIT[id]; const s = d.byProgram[id]; const [w, why] = standing(x, id); const rd = readOf(x, id); const g = rd && rd.currentGate;
    return `<a class="pl-card ${V.PCOL[id]}" href="${k.href}"><span class="pl-card-n">Plan ${k.n}</span><b>${esc(k.name)}</b><p>${standBadge(w)} <small>${esc(why)}</small></p>
      <dl><div><dt>Next</dt><dd>${s.next ? `${esc(s.next.title)}<br><b>${esc(s.next.finishDate)}</b>` : 'no milestone'}</dd></div>${g ? `<div><dt>Waiting on</dt><dd>${g.missing.length} thing${g.missing.length === 1 ? '' : 's'} before gate ${esc(g.id)}</dd></div>` : `<div><dt>Pipeline</dt><dd>${d.pipe.count} identified, ${$m(d.pipe.received)} received</dd></div>`}</dl></a>`; };
  return `
  <div class="pl-map-row">${['battery', 'ecg', 'funding'].map(planCard).join('')}</div>
  <div class="pl-today">
    <section><h3>Needs you</h3>${dec.length ? `<ol class="pl-need">${dec.map((r) => `<li>${open('decision', r.coll, r.id, r.title)}<span>${esc(r.due)} · ${r.days < 0 ? `${-r.days} days late` : r.days === 0 ? 'today' : `in ${r.days} days`}</span></li>`).join('')}</ol>` : '<p>No decision is waiting.</p>'}${more('#decisions', `All ${allDecisions(x).filter((r) => !r.made).length} open decisions`)}</section>
    <section><h3>Blocked or at risk</h3><ul class="pl-flags"><li><b>${d.load.totals.A.overWeeks}</b> weeks the developer is planned over capacity</li><li><b>${d.load.totals.B.overWeeks}</b> weeks the director is over capacity</li><li><b>${allRisks(x).filter((r) => r.level === 'High').length}</b> risks rated high</li></ul>${more('#roadmap', 'See the roadmap')}</section>
    <section><h3>Money</h3><ul class="pl-flags"><li><b>${$m(d.budget.total)}</b> planned cost, three plans${d.budget.isFloor ? ' (a floor)' : ''}</li><li><b>${mo.cashOnHand == null ? 'not entered' : $m(mo.cashOnHand)}</b> cash on hand</li><li><b>${mo.runwayKnown ? (mo.runwayMonth || 'beyond the plan') : 'unknown'}</b> cash runs out</li></ul>${more('#money', 'See the money')}</section>
  </div>`;
}

function strategy(x) {
  const { m } = x;
  return `${V.strategyMap(x)}
  ${sec('How the business is meant to work', V.chain(m.businessModel.map((b) => ({ title: b.step, text: b.text, tag: S.stated(b.status), attr: `title="${esc(b.basis)}"` })), { label: 'Business model from customer need to recurring revenue' }))}`;
}

function roadmap(x) {
  const { d } = x; const ppl = d.load.people.filter((p) => p.weeklyHours != null);
  return `${V.roadmap(x)}
  ${sec('Are the people overbooked?', V.hbars(ppl.map((p) => { const t = d.load.totals[p.id]; return { label: p.short, parts: [{ value: Math.max(0, t.hours - t.over), cls: 'pl-c-b', name: 'Hours within capacity' }, { value: t.over, cls: 'pl-c-bad', name: 'Hours over capacity' }], text: `${t.overWeeks} weeks over, by ${Math.round(t.over)} hours` }; }), { left: 110, label: 'Planned hours within and over capacity, by person' }) + V.legend([['pl-c-b', 'Planned hours within capacity'], ['pl-c-bad', 'Hours over capacity']]))}`;
}

function money(x) {
  const { d } = x; const b = d.budget; const mo = d.monthly;
  return `
  <div class="pb-tiles pl-3">${tile($m(b.total) + S.floor(b.isFloor), 'Planned cost, three plans', `${b.notEstimated} costs still need a quotation`)}${tile(mo.cashOnHand == null ? 'not entered' : $m(mo.cashOnHand), 'Cash on hand', mo.cashOnHand == null ? 'Switch to Working to enter it' : '')}${tile($m(d.pipe.received), 'Funding received', `${$m(d.pipe.committed)} committed`)}</div>
  ${sec('What each plan costs', V.hbars(b.rows.map((r) => ({ label: r.name, parts: [{ value: r.labour, cls: V.PCOL[r.id], name: 'Labor' }, { value: r.other, cls: 'pl-c-oth', name: 'Other costs' }, { value: r.contingency, cls: 'pl-c-con', name: 'Contingency' }], text: $m(r.total) + (r.isFloor ? ' floor' : '') })), { fmt: $m, label: 'Budget by plan' }) + V.legend([['pl-c-b', 'Labor (plan colour)'], ['pl-c-oth', 'Other costs'], ['pl-c-con', 'Contingency']]))}
  ${sec('Spending by month', V.monthBars(mo.rows, { label: 'Planned spending by month and plan' }))}
  ${sec('Cash', mo.runwayKnown ? V.balanceLine(mo.rows) : empty('No cash figure is on record.', 'Enter cash on hand to see the balance, the month it runs out and the funding gap.'))}`;
}

function decisions(x) {
  const { d } = x; const f = x.ui.decPlan || ''; const rows = allDecisions(x).filter((r) => !f || r.program === f);
  const row = (r) => `<li class="${r.made ? 'done' : r.days != null && r.days < 0 ? 'late' : ''}"><span class="pl-reg-id">${esc(r.id)}</span>${open('decision', r.coll, r.id, r.title)}<span class="pl-reg-m">${esc(V.PNAME[r.program] || 'Shared')}</span><span class="pl-reg-m">${r.made ? 'Decided' : r.due ? `${esc(r.due)}${r.days < 0 ? ', late' : ''}` : 'no date'}</span></li>`;
  return `${V.decisionLine(d.decisions, d.today)}
  ${chips('decPlan', f)}
  <ul class="pl-reg">${rows.filter((r) => !r.made).map(row).join('')}${rows.filter((r) => r.made).map(row).join('')}</ul>
  <p class="pb-note">${rows.filter((r) => !r.made).length} open. Select a decision to read its alternatives, recommendation and evidence, and to record it.</p>`;
}

function risks(x) {
  const f = x.ui.riskPlan || ''; const all = allRisks(x); const rows = all.filter((r) => !f || r.program === f);
  const count = (p, lvl) => all.filter((r) => r.program === p && r.level === lvl).length;
  return `${V.hbars(['battery', 'ecg'].map((p) => ({ label: V.PNAME[p], parts: [{ value: count(p, 'High'), cls: 'pl-c-bad', name: 'High' }, { value: count(p, 'Medium'), cls: 'pl-c-warn', name: 'Medium' }, { value: count(p, 'Low'), cls: 'pl-c-con', name: 'Low' }], text: `${count(p, 'High')} high · ${count(p, 'Medium')} medium · ${count(p, 'Low')} low` })), { left: 150, label: 'Risks by plan and level' })}
  ${V.legend([['pl-c-bad', 'High'], ['pl-c-warn', 'Medium'], ['pl-c-con', 'Low']])}
  ${chips('riskPlan', f)}
  <ul class="pl-reg">${rows.slice(0, 8).map((r) => `<li><span class="pl-reg-id">${esc(r.id)}</span>${open('risk', r.coll, r.id, r.hazard)}<span class="pl-reg-m">${esc(V.PNAME[r.program])}</span><span class="pl-reg-m">${esc(r.level)} now, ${esc(r.after)} with its control</span></li>`).join('')}</ul>
  <p class="pb-note">The top ${Math.min(8, rows.length)} of ${rows.length}, highest first. First estimates; not reviewed. Switch to Working for the full register.</p>`;
}

/* ================================================================ the same four views for every plan */

function pNow(x, id) {
  const { m, d } = x; const k = KIT[id]; const s = d.byProgram[id]; const [w, why] = standing(x, id); const rd = readOf(x, id); const g = rd && rd.currentGate; const b = d.budget.rows.find((r) => r.id === id);
  const steps = s.sched.rows.filter((r) => !r.milestone && !r.loe && r.percent < 100).slice(0, 3);
  const dec = allDecisions(x).filter((r) => !r.made && r.program === id).slice(0, 2);
  const picture = id === 'battery' ? sec('What the evidence supports today', V.hbars([['Shown', 'Shown in the videos', 'pl-c-b'], ['Credible', 'Sound in principle', 'pl-c-oth'], ['Not verified', 'Not verified', 'pl-c-warn'], ['Open', 'No evidence at all', 'pl-c-bad']].map(([lv, name, cls]) => ({ label: name, value: m.bFindings.filter((f) => f.level === lv).length, cls, text: m.bFindings.filter((f) => f.level === lv).length + ' findings' })), { left: 170, label: 'Audit findings by standing' }) + '<p class="pb-note">From the audit of November 17, 2026. Nothing has been tested by us.</p>')
    : id === 'ecg' ? sec('The gate that matters', `<p class="pl-lead">${esc(m.program.criticalGate)}</p>`)
    : sec('Pipeline', V.chain(d.pipe.stages.map((st) => ({ title: st.name, big: st.count })), { label: 'Funding pipeline by stage' }) + '<p class="pb-note">Only cash received is available.</p>');
  return `
  <div class="pb-tiles pl-4">${tile(standBadge(w), 'Standing', esc(why))}${tile(s.next ? esc(s.next.finishDate) : 'none', 'Next milestone', s.next ? esc(s.next.title) : '')}${g ? tile(esc(g.id), 'Current gate', `${esc(g.title)} · needs ${g.missing.length}`) : tile(String(d.pipe.count), 'Opportunities', `${d.dl.upcoming.length} with a date ahead`)}${tile($m(b.total) + S.floor(b.isFloor), 'Planned cost', b.isFloor ? `${b.notEstimated} costs need a quotation` : 'planning estimate')}</div>
  ${sec('Next three steps', steps.length ? V.chain(steps.map((r) => ({ title: r.title, text: `${r.startDate} to ${r.finishDate}`, foot: open('task', k.tasks, r.id, 'Open ' + r.id) })), { label: 'Next three steps' }) : '<p>Every task is complete.</p>')}
  ${picture}
  ${dec.length ? sec('Decisions this plan is waiting for', `<ul class="pl-reg">${dec.map((r) => `<li><span class="pl-reg-id">${esc(r.id)}</span>${open('decision', r.coll, r.id, r.title)}<span class="pl-reg-m">${esc(r.due || 'no date')}</span></li>`).join('')}</ul>`) : ''}`;
}

function pPlan(x, id) {
  const { m, d } = x; const s = d.byProgram[id]; const sub = x.ui.sub || '';
  const timeline = () => `<p class="pl-lead">${esc(s.program.startDate)} to <b>${esc(s.sched.endDate)}</b> · ${s.sched.endWeek} weeks · ${s.sched.rows.filter((r) => r.critical).length} items on the critical path</p>
    ${gantt(x, { sched: s.sched, program: s.program, phases: s.phases, nowWeek: C.weekOf(s.program, d.today) })}<p class="pb-note">Select a bar or a diamond to open the task.</p>`;
  if (id === 'battery') {
    const cur = sub || 'build'; const seg = segs('sub', cur, [['build', 'Build'], ['sell', 'Sell'], ['make', 'Make']]);
    if (cur === 'sell') return seg + V.funnelViz(d.funnel) + '<p class="pb-note">Filled: customer records that reached the stage. Outline: the target. No customer is on record. Switch to Working to add one.</p>' + S.cards(m.segments.map((sg) => S.card(`${sg.priority}. ${esc(sg.name)}`, `<p>${esc(sg.why)}</p>`)));
    if (cur === 'make') { const cls = { MDMCG: 'pl-own', Outsourced: 'pl-out', Both: 'pl-both' }; return seg + V.chain(m.mfgFlow.map((f) => ({ title: f.step, tag: `<span class="pb-b pb-b-${f.who === 'MDMCG' ? 'ok' : f.who === 'Both' ? 'draft' : 'est'}">${esc(f.who === 'Both' ? 'Shared' : f.who)}</span>`, cls: cls[f.who] })), { wrap: true, label: 'Outsourced manufacturing from release to repair' }) + '<p class="pb-note">MDMCG keeps the requirements, designs, acceptance criteria, firmware, calibration methods, customer records and release authority at every step. No manufacturer is chosen.</p>'; }
    return seg + timeline();
  }
  if (id === 'funding') {
    const cur = sub || 'pipeline'; const seg = segs('sub', cur, [['pipeline', 'Pipeline'], ['dates', 'Dates'], ['timeline', 'Timeline']]);
    if (cur === 'timeline') return seg + timeline();
    if (cur === 'dates') { const up = d.dl.upcoming; return seg + (up.length ? V.hbars(up.map((o) => ({ label: o.organisation.length > 30 ? o.organisation.slice(0, 29) + '…' : o.organisation, value: Math.max(1, o.days), cls: o.days <= 30 ? 'pl-c-warn' : 'pl-c-f', text: `${o.deadline} · in ${o.days} days` })), { left: 250, label: 'Days to each deadline' }) + '<p class="pb-note">Dates as read on each program\'s own page on 2026-11-19. Eligibility is not checked for any of them.</p>' : empty('No verified deadline is on record.')); }
    const TYPES = { 'CH-A': ['customer-funded'], 'CH-B': ['non-dilutive grant', 'contract', 'state grant'], 'CH-C': ['partnership'], 'CH-D': ['equity'] };
    return seg + V.chain(d.pipe.stages.map((st) => ({ title: st.name, big: st.count, text: st.name === 'Cash received' ? $m(d.pipe.received) : st.attainable ? `${$m(st.attainable)} attainable` : '' })), { label: 'Funding pipeline by stage' }) + V.hbars(m.channels.map((c) => ({ label: c.name, value: m.opportunities.filter((o) => TYPES[c.id].includes(o.type)).length, cls: 'pl-c-f' })), { fmt: (v) => v + ' identified', left: 250, label: 'Opportunities by channel' }) + '<p class="pb-note">Identified means found, nothing more. Only cash received counts as available.</p>';
  }
  return timeline();
}

function pMoney(x, id) {
  const { d } = x; const b = d.budget.rows.find((r) => r.id === id);
  if (id === 'battery') { const bb = d.bBudget; const ok = d.econ[0].ok;
    return `<div class="pb-tiles pl-3">${tile($m(bb.total) + S.floor(bb.isFloor), 'Planned cost', `labor only; ${bb.notEstimated} costs need a quotation`)}${tile($m(bb.labour), 'Labor', `${bb.hours.A} h developer · ${bb.hours.B} h director`)}${tile(String(bb.notEstimated), 'Costs with no figure yet', 'left empty, not guessed')}</div>
    ${sec('Three schedules', V.hbars(d.bScen.map((sc) => ({ label: sc.name, value: sc.weeks, cls: sc.id === 'baseline' ? 'pl-c-b' : 'pl-c-oth', text: `${sc.weeks} weeks · ends ${sc.endDate} · labor ${$m(sc.labour)}` })), { left: 110, label: 'Schedule length by scenario' }))}
    ${sec('If it sells: a model, not a forecast', ok ? V.groupBars(d.econ.map((r) => ({ label: `${r.units} a year`, values: [r.revenue, r.grossProfit, r.operatingProfit] })), [{ name: 'Revenue', cls: 'pl-c-b' }, { name: 'Gross profit', cls: 'pl-c-e' }, { name: 'Operating profit', cls: 'pl-c-f' }], { label: 'Revenue, gross profit and operating profit by annual volume' }) + `<p class="pb-alert">An upper bound. The price and unit cost are hypotheses from company documents and ${d.econUnset} cost inputs are still zero. No price, quotation or order exists.</p>` : empty('The model needs a price and a unit cost.'))}`; }
  if (id === 'ecg') { const e = d.ecg; const bud = e.bud;
    return `<div class="pb-tiles pl-3">${tile($m(bud.total), 'Planning total', `${$m(bud.direct)} direct + ${bud.contingencyPct}% contingency`)}${tile($m(e.spendActual), 'Spent to date', `planned to date ${$m(e.spendPlanned)}`)}${tile(`${bud.unverifiedLines} of ${bud.items.length}`, 'Cost lines still estimates', 'none quoted')}</div>
    ${sec('Where the money goes', V.hbars([['Labor', bud.labour.cost, 'pl-c-e'], ['Hardware', bud.hardware, 'pl-c-oth'], ['Software and cloud', bud.software, 'pl-c-oth'], ['External review', bud.external, 'pl-c-oth'], ['Contingency', bud.contingency, 'pl-c-con']].map(([label, value, cls]) => ({ label, value, cls })), { fmt: $m, left: 170, label: 'ECG/MCG budget by category' }))}
    ${sec('Three scenarios', V.hbars(e.scenarios.map((sc) => ({ label: sc.name, value: sc.b.total, cls: sc.id === 'baseline' ? 'pl-c-e' : 'pl-c-oth', text: `${$m(sc.b.total)} · ${sc.b.durationWeeks} weeks · ends ${sc.endDate}` })), { fmt: $m, left: 170, label: 'Scenario totals' }))}`; }
  const mo = d.monthly; const p = d.pipe;
  return `<div class="pb-tiles pl-3">${tile($m(p.received), 'Cash received', 'the only money that is available')}${tile($m(p.committed), 'Committed', 'awarded or signed, not yet cash')}${tile(mo.fundingGap == null ? 'unknown' : $m(mo.fundingGap), 'Funding gap', mo.fundingGap == null ? 'needs cash on hand' : 'planned spending less cash')}</div>
  ${sec('Funding by certainty', V.hbars([{ label: 'Cash received', value: p.received, cls: 'pl-c-act' }, { label: 'Committed', value: p.committed, cls: 'pl-c-f' }, { label: 'Prospective, weighted', value: p.weighted, cls: 'pl-c-con', text: `${$m(p.weighted)} · ${p.noProbability} have no probability` }, { label: 'Prospective, unweighted', value: p.prospective, cls: 'pl-c-oth', text: `${$m(p.prospective)} · ${p.noAmount} have no amount` }], { fmt: $m, label: 'Funding by certainty' }))}
  ${sec('Twelve months of cash', mo.runwayKnown ? V.balanceLine(mo.rows.slice(0, 12)) : empty('No cash figure is on record.', 'Enter cash on hand under Money on the company page.'))}
  <p class="pb-note">The funding work itself is planned at ${$m(b.total)}, a floor: ${b.notEstimated} costs need a quotation.</p>`;
}

function pProof(x, id) {
  const { m, d } = x; const k = KIT[id]; const s = d.byProgram[id];
  if (id === 'funding') { const done = m.investorChecklist.filter((c) => c.state === 'Done').length;
    return `${V.meters([{ label: 'Customer interviews on record', done: d.funnel.rows[0].reached, of: m.funnelTargets['Customer discovery'], note: 'against the target' }, { label: 'Paid pilots signed', done: d.funnel.rows[3].reached, of: m.funnelTargets['Paid pilot'], note: 'against the target' }, { label: 'Investor preparation', done, of: m.investorChecklist.length, note: '' }, { label: 'Funding documents written', done: m.fDeliverables.filter((q) => q.location).length, of: m.fDeliverables.length, note: '' }])}
    ${sec('What counts', V.chain(m.tractionRules.map((t) => ({ title: t })), { wrap: true, label: 'Rules for counting traction' }))}`; }
  const r = readOf(x, id);
  return `${V.meters([{ label: 'Gates approved', done: r.gatesApproved, of: r.gates, note: r.currentGate ? `Current: ${r.currentGate.id}` : 'all decided' }, { label: 'Tests passed', done: r.passed, of: r.tests, note: `${r.notRun} not run` }, { label: 'Requirements with evidence', done: r.withEvidence, of: r.requirements, note: '' }, { label: 'Risk controls verified', done: r.controlsVerified, of: r.controls, note: '' }])}
  ${sec('Stop/go gates', `<ol class="pl-gates">${r.gateRows.map((g) => `<li class="${r.currentGate && g.id === r.currentGate.id ? 'cur' : ''}"><b>${esc(g.id)}</b>${open('gate', k.gates, g.id, g.title)}${badge(g.status)}<small>${esc(C.finishOf(s.sched, g.milestone) || '')}</small></li>`).join('')}</ol><p class="pb-note">Select a gate for its criteria, what it still needs, and to record a decision. Nothing is approved.</p>`)}
  ${id === 'battery' ? sec('Why a zero phase reading is not enough', V.timingFigure()) : ''}`;
}

/* ================================================================ the side panel */

export function panel(x0) {
  const p = x0.ui.panel; if (!p) return '';
  const x = { ...x0, ui: { ...x0.ui, working: true } };             // a record opened in the panel can always be edited
  const { d } = x; const row = (kk, v) => `<div><dt>${esc(kk)}</dt><dd>${v}</dd></div>`; let title = '', body = '';
  if (p.kind === 'task') { const id = Object.keys(KIT).find((q) => KIT[q].tasks === p.coll); const s = d.byProgram[id]; const t = x.m[p.coll].find((q) => q.id === p.id); if (t) { title = `${t.id} ${t.title}`; body = S.taskPanel({ ...x, ui: { ...x.ui, task: p.id } }, p.coll, s).replace(/<div class="pb-panel-h">[\s\S]*?<\/div>/, '').replace('class="pb-panel" id="pb-task"', 'class="pl-in"'); } }
  if (p.kind === 'gate') { const id = Object.keys(KIT).find((q) => KIT[q].gates === p.coll); const g = readOf(x, id).gateRows.find((q) => q.id === p.id); if (g) { title = `${g.id} ${g.title}`;
    body = `<p>${badge(g.status)} ${esc(C.finishOf(d.byProgram[id].sched, g.milestone) || '')}</p><p><b>Criteria</b></p>${ul(g.criteria.map(esc))}<p><b>An approval releases:</b> ${esc(g.authorises)}</p><p><b>Still needed before a go: ${g.missing.length}</b></p>${ul(g.missing.map((q) => esc(q.text)))}
      ${g.approval ? `<p class="pb-approved">${esc(g.approval.decision)} by ${esc(g.approval.by)} on ${esc(g.approval.date)} <button type="button" class="pb-link" data-act="withdraw" data-coll="${p.coll}" data-id="${esc(g.id)}">withdraw</button></p>` : `<form class="pb-form" data-approve="${esc(g.id)}" data-coll="${p.coll}">${input('by', 'Decided by (a person\'s name)', { req: 1, val: x.store.who })}${input('date', 'Date', { type: 'date', req: 1, val: d.today })}${input('decision', 'Decision', { opts: ['Approved', 'Conditional', 'No-go'] })}${input('note', 'Note')}<button class="pb-btn" type="submit">Record decision</button></form>`}`; } }
  if (p.kind === 'decision') { const r = allDecisions(x).find((q) => q.id === p.id && q.coll === p.coll); if (r) { title = `${r.id} ${r.title}`;
    body = `<dl class="pb-dl">${row('Plan', esc(V.PNAME[r.program] || 'Shared'))}${p.coll === 'execDecisions' ? row('Due', ed(x, p.coll, r.id, 'due', r.due, { t: 'date' })) : ''}${row('Owner', esc(r.owner))}${r.impactText ? row(p.coll === 'execDecisions' ? 'Financial impact' : 'Held until decided', esc(r.impactText)) : ''}</dl>
      <p>${esc(r.question)}</p><p><b>Alternatives</b></p>${ul(r.options.map(esc))}<p><b>Recommendation.</b> ${esc(r.recommendation)}</p>${r.evidence ? `<p><b>Evidence.</b> ${esc(r.evidence)}</p>` : ''}
      <dl class="pb-dl pl-record">${row('Decision', ed(x, p.coll, r.id, 'decision', r.decision, { fmt: (v) => v || 'record the decision' }))}${row('By', ed(x, p.coll, r.id, 'decidedBy', r.decidedBy, { fmt: (v) => v || 'name' }))}${row('On', ed(x, p.coll, r.id, 'decidedOn', r.decidedOn, { t: 'date', fmt: (v) => v || 'date' }))}</dl><p class="pb-note">A decision counts with its text, a person's name and a date.</p>`; } }
  if (p.kind === 'risk') { const r = allRisks(x).find((q) => q.id === p.id && q.coll === p.coll); if (r) { title = `${r.id} ${r.hazard}`;
    body = `<dl class="pb-dl">${row('Plan', esc(V.PNAME[r.program]))}${row('Kind', esc(r.kind))}${row('Effect', esc(r.harm))}${row('Severity, 1 to 5', ed(x, p.coll, r.id, 'severity', r.severity, { t: 'number' }))}${row('Probability, 1 to 5', ed(x, p.coll, r.id, 'probability', r.probability, { t: 'number' }))}${row('Level', esc(r.level))}${row('Controls', r.controls.map((c) => `<b>${esc(c.id)}</b> ${esc(c.text)}`).join('<br>'))}${row('Severity with control', ed(x, p.coll, r.id, 'residualSeverity', r.residualSeverity, { t: 'number' }))}${row('Probability with control', ed(x, p.coll, r.id, 'residualProbability', r.residualProbability, { t: 'number' }))}${row('Level with control', esc(r.after))}${row('Status', ed(x, p.coll, r.id, 'status', r.status, { t: 'select', opts: LABELS }))}</dl>`; } }
  if (!body) return '';
  return `<div class="pl-scrim" data-act="close-panel"></div><aside class="pl-drawer" id="pl-drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3><button type="button" class="pb-btn" data-act="close-panel">Close</button></header><div class="pl-drawer-b">${body}</div></aside>`;
}

/* ================================================================ how the screens are put together */

const view = (k, label, brief, working, path = false) => ({ k, label, brief, working, path });
const plan = (id, w) => [view('now', 'Now', (x) => pNow(x, id), w.now), view('plan', 'Plan', (x) => pPlan(x, id), w.plan), view('money', 'Money', (x) => pMoney(x, id), w.money), view('proof', 'Proof', (x) => pProof(x, id), w.proof)];
const ecgLines = (x) => tbl('elines', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Cost', v: (r) => esc(r.title) }, { h: 'Amount', n: 1, v: (r) => ed(x, 'lines', r.id, 'amount', r.amount, { t: 'number', fmt: C.money }) }, { h: 'Basis', v: (r) => ed(x, 'lines', r.id, 'kind', r.kind, { t: 'select', opts: C.PRICE_KINDS }) }, { h: 'Planned week', n: 1, v: (r) => ed(x, 'lines', r.id, 'week', r.week, { t: 'number', fmt: (v) => v || 'spread' }) }, { h: 'Actual paid', n: 1, v: (r) => ed(x, 'lines', r.id, 'actual', r.actual, { t: 'number', fmt: C.money }) }, { h: 'Paid in week', n: 1, v: (r) => ed(x, 'lines', r.id, 'actualWeek', r.actualWeek, { t: 'number', fmt: (v) => v || 'set' }) }, { h: 'Note', v: (r) => esc(r.note || '') }], x.m.lines, { name: 'ecg cost lines' });
const ecgGates = (x) => S.gateCards(x, x.d.readE.gateRows, 'gates', x.d.byProgram.ecg.sched);
const allRiskTable = (x) => tbl('riskreg', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Plan', v: (r) => esc(V.PNAME[r.program]) }, { h: 'Kind', v: (r) => esc(r.kind) }, { h: 'Risk', v: (r) => esc(r.hazard) }, { h: 'Effect', v: (r) => esc(r.harm) }, { h: 'Severity', n: 1, v: (r) => ed(x, r.coll, r.id, 'severity', r.severity, { t: 'number' }) }, { h: 'Probability', n: 1, v: (r) => ed(x, r.coll, r.id, 'probability', r.probability, { t: 'number' }) }, { h: 'Level', v: (r) => esc(r.level) }, { h: 'Controls', v: (r) => r.controls.map((c) => `<b>${esc(c.id)}</b> ${esc(c.text)}`).join('<br>') }, { h: 'With control', v: (r) => esc(r.after) }], allRisks(x), { name: 'risk register' });
const objectives = (x) => S.cards(x.m.objectives.map((o) => S.card(esc(o.title), `<p class="pl-kind">${esc(o.kind)} · ${esc(V.PNAME[o.program] || o.program)}</p><p><b>Measure.</b> ${esc(o.measure)}</p>`, V.PCOL[o.program]))) + `<p class="pb-note">${esc(x.m.ambition)}</p>`;

export const AREAS = {
  hub: { title: 'Company Plan', tabs: [
    view('today', 'Today', today, null, true),
    view('strategy', 'Strategy', strategy, [['Objectives', objectives], ['Shared operations', S.sShared]], true),
    view('roadmap', 'Roadmap', roadmap, [['Capacity and what-ifs', S.sRoadmap]], true),
    view('money', 'Money', money, [['All figures', S.sFinancials]], true),
    view('decisions', 'Decisions', decisions, null, true),
    view('risks', 'Risks', risks, [['Full register', allRiskTable]]),
  ] },
  battery: { title: 'Plan 1: Battery Product', tabs: plan('battery', { now: [['Engineering state', S.bEngineering]], plan: [['Build', S.bDevelopment], ['Sell', S.bCommercial], ['Make', S.bManufacturing], ['Support', S.bSupport]], money: [['Budget and economics', S.bBudget]], proof: [['Gates, standards, traceability', S.bQuality]] }) },
  ecg: { title: 'Plan 2: ECG/MCG', tabs: plan('ecg', { now: [['Overview', (x) => L.overview(xe(x))]], plan: [['Timeline and tasks', (x) => L.timeline(xe(x))], ['People and hours', (x) => L.resources(xe(x))]], money: [['Scenarios', (x) => L.scenariosView(xe(x))], ['Cost lines', ecgLines]], proof: [['Gates', ecgGates], ['Requirements and traceability', (x) => L.requirementsView(xe(x))], ['Tests', (x) => L.testing(xe(x))]] }) },
  funding: { title: 'Plan 3: Funding and Partnerships', tabs: plan('funding', { now: [['Strategy and deliverables', S.fStrategy]], plan: [['Pipeline', S.fPipeline], ['Grants', S.fGrants], ['Customers', S.fCustomer], ['Partners', S.fPartners]], money: [['Cash and awards', S.fCash]], proof: [['Investor preparation', S.fInvestment]] }) },
  library: { title: 'Library', library: true, tabs: [
    view('records', 'Your changes and history', (x) => L.records(xe(x)), null),
    view('parts', 'Parts and sourcing', (x) => L.hardware(xe(x)), null),
    view('tools', 'Tools and software', (x) => L.software(xe(x)), null),
    view('standards', 'Standards and quality', (x) => L.quality(xe(x)), null),
    view('security', 'Security and data', (x) => L.security(xe(x)), null),
  ] },
};
export const PLAN_NAV = [['hub', '/plan/', 'Company'], ['battery', '/plan/battery/', '1 Battery'], ['ecg', '/product-build/', '2 ECG/MCG'], ['funding', '/plan/funding/', '3 Funding'], ['library', '/plan/library/', 'Library']];
export const planNav = (cur) => `<nav class="pl-nav" aria-label="Company plan"><ul>${PLAN_NAV.map(([id, href, name]) => `<li><a href="${href}" class="${V.PCOL[id] || ''}"${id === cur ? ' aria-current="page"' : ''}>${esc(name)}</a></li>`).join('')}</ul></nav>`;
export { allDecisions, allRisks, KIT };
