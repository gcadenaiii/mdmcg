/* Company plan: the Brief screens and how every screen is put together.
   Reorganized 2026-11-20 and revised twice the same day after independent design reviews.

   Three depths:
     Brief      one screen, pictures first, a few words, read-only, ending in one action. This file.
     Working    the full sections with tables and entry fields (plan-sections.js and, for ECG/MCG, views.js).
     Reference  material that is looked up, not read: parts, tools, standards, security, history of changes.
   One reading path runs through the Brief screens that have something to say, with Back and Next, and ends on
   "Up to date". A screen that would only say "nothing yet" is folded into one line on its plan's Now screen and joins
   the path when it has something to show.
   Every plan has the same four views: Now, Plan, Money, Proof. Decisions (with the gate each plan is waiting at) and
   risks each have one list for all plans. A record opens in a side panel, where it can be changed.
   Each fact has one home; other screens link to it. Names come first, codes second. Every figure says whether it is
   confirmed, planned or assumed.
   Public code: no figure is written here. */
import * as C from './calc.js';
import { esc, badge, ed, tbl, tile, sec, ul, input } from './views.js';
import * as L from './views.js';
import * as S from './plan-sections.js';
import * as V from './plan-viz.js';

const $m = (v) => C.money(v == null ? v : Math.round(Number(v)));
const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const open = (kind, coll, id, label, cls = '') => `<button type="button" class="pb-link pl-open ${cls}" data-open="${kind}|${coll}|${esc(id)}">${esc(label ?? id)}</button>`;
const act = (label, attr) => `<p class="pl-do"><button type="button" class="pb-btn pl-act" ${attr}>${esc(label)}</button></p>`;
const more = (href, text) => `<a class="pl-more" href="${href}">${esc(text)} →</a>`;
const empty = (b, p = '') => `<div class="pl-empty"><b>${esc(b)}</b>${p ? `<p>${p}</p>` : ''}</div>`;
const code = (id) => `<span class="pl-code">${esc(id)}</span>`;
/** what kind of figure this is: confirmed (read on a source or entered as fact), planned (our schedule or estimate), assumed (a hypothesis) */
const tag = (k) => `<span class="pl-tag pl-tag-${k}">${k}</span>`;
const xe = (x) => ({ ...x, d: x.d.ecg });                                   // the ECG/MCG sections read their own figures
const KIT = {
  battery: { name: 'Battery Product', n: 1, href: '/plan/battery/', tasks: 'bTasks', gates: 'bGates', risks: 'bRisks' },
  ecg: { name: 'ECG/MCG', n: 2, href: '/product-build/', tasks: 'tasks', gates: 'gates', risks: 'risks' },
  funding: { name: 'Funding and Partnerships', n: 3, href: '/plan/funding/', tasks: 'fTasks', gates: null, risks: 'fRisks' },
};
const PLANS = ['battery', 'ecg', 'funding'];
const readOf = (x, id) => (id === 'battery' ? x.d.readB : id === 'ecg' ? x.d.readE : null);
const DONE = ['Approved', 'Conditional', 'No-go'];

/** every decision in one list, one shape: company decisions, plan decisions, and the gate each plan is waiting at. Open ones first, by date. */
function allDecisions(x) {
  const { m, d } = x; const days = (due) => (due ? Math.round((C.parseDate(due) - C.parseDate(d.today)) / C.DAY) : null);
  const one = (r, coll) => ({ kind: 'decision', coll, id: r.id, title: r.title, program: r.program, plans: r.plans || [r.program], due: r.due || null, owner: r.owner || 'Director', made: !!(r.decision && r.decidedBy && r.decidedOn) });
  const rows = [...m.execDecisions.map((r) => one(r, 'execDecisions')), ...m.decisions.map((r) => one(r, 'decisions'))];
  for (const id of ['battery', 'ecg']) { const rd = readOf(x, id); for (const g of rd.gateRows) if (DONE.includes(g.status) || (rd.currentGate && g.id === rd.currentGate.id)) rows.push({ kind: 'gate', coll: KIT[id].gates, id: g.id, title: `Gate: ${g.title}`, program: id, plans: [id], due: C.finishOf(d.byProgram[id].sched, g.milestone), owner: 'Director', made: DONE.includes(g.status) }); }
  rows.sort((a, b) => (a.made - b.made) || String(a.due || '9999').localeCompare(String(b.due || '9999')) || a.id.localeCompare(b.id));
  return rows.map((r) => ({ ...r, days: days(r.due) }));
}
function allRisks(x) {
  const { m } = x; const add = (coll, program) => m[coll].map((r) => ({ ...r, coll, program: r.scope || program }));
  return [...add('bRisks', 'battery'), ...add('risks', 'ecg'), ...add('fRisks', 'funding')].map((r) => ({ ...r, level: C.riskLevel(r.severity, r.probability), after: C.riskLevel(r.residualSeverity, r.residualProbability), score: r.severity * r.probability })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
/** how one plan stands on its own schedule. People being booked on two plans at once is a company matter, said once on Today. */
export function standing(x, id) {
  const s = x.d.byProgram[id];
  if (s.sched.errors.length) return ['Blocked', 'the schedule has an error'];
  if (s.sched.overdue.length) return ['Late', `${n(s.sched.overdue.length, 'task', 'tasks')} past the planned date`];
  if (x.d.today < s.program.startDate) return ['Not started', `starts ${s.program.startDate}`];
  return ['On plan', 'no task is late'];
}
const standBadge = (w) => `<span class="pb-b pb-b-${w === 'On plan' ? 'ok' : w === 'Not started' ? 'na' : w === 'Late' ? 'warn' : 'bad'}">${esc(w)}</span>`;
const chips = (key, cur) => `<div class="pl-chips" role="group" aria-label="Filter by plan">${[['', 'All'], ['battery', 'Battery'], ['ecg', 'ECG/MCG'], ['funding', 'Funding']].map(([v, name]) => `<button type="button" class="pb-btn${cur === v ? ' pl-on' : ''}" data-chip="${key}|${v}" aria-pressed="${cur === v}">${name}</button>`).join('')}</div>`;
const segs = (key, cur, opts) => `<div class="pl-seg" role="group" aria-label="View">${opts.map(([v, name]) => `<button type="button" class="pb-btn${cur === v ? ' pl-on' : ''}" data-seg="${key}|${v}" aria-pressed="${cur === v}">${name}</button>`).join('')}</div>`;
const day = (iso) => { const t = new Date(C.parseDate(iso)); return `${t.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getUTCMonth()]}`; };
const when = (r) => (r.made ? 'decided' : r.due ? (r.days < 0 ? `${-r.days} days late` : r.days === 0 ? 'today' : r.days <= 30 ? `in ${n(r.days, 'day', 'days')}` : '') : 'no date');
const holds = (r) => (r.plans.length === 3 ? 'All three plans' : r.plans.map((p) => ({ battery: 'Battery', ecg: 'ECG/MCG', funding: 'Funding' }[p])).join(', '));
const decRow = (r) => `<li class="${r.made ? 'done' : r.days != null && r.days < 0 ? 'late' : ''}"><span class="pl-reg-d">${r.due ? esc(day(r.due)) : ''}<small>${esc(when(r))}</small></span><span class="pl-reg-t">${open(r.kind, r.coll, r.id, r.title)}<small>${esc(holds(r))} · ${esc(r.owner)} decides ${code(r.id)}</small></span>${r.made ? '<span class="pl-reg-m">decided</span>' : `<button type="button" class="pb-btn pl-act pl-sm" data-open="${r.kind}|${r.coll}|${esc(r.id)}">Decide</button>`}</li>`;
const hasProof = (x, id) => { if (id === 'funding') return x.d.funnel.rows[0].reached + x.m.investorChecklist.filter((c) => c.state === 'Done').length + x.m.fDeliverables.filter((q) => q.location).length > 0; const r = readOf(x, id); return r.gatesApproved + r.passed + r.failed + r.withEvidence > 0; };
const hasFundingMoney = (x) => x.d.pipe.received + x.d.pipe.committed + x.d.pipe.prospective > 0;

/* ================================================================ company screens */

function today(x) {
  const { d } = x; const all = allDecisions(x); const dec = all.filter((r) => !r.made && r.due).slice(0, 3); const mo = d.monthly; const tA = d.load.totals.A, tB = d.load.totals.B;
  const planRow = (id) => { const k = KIT[id]; const s = d.byProgram[id]; const [w, why] = standing(x, id); const rd = readOf(x, id); const g = rd && rd.currentGate; const soon = all.filter((r) => !r.made && r.plans.includes(id) && r.days != null && r.days <= 7).length;
    return `<li class="${V.PCOL[id]}"><a class="pl-pl-n" href="${k.href}">${k.n}. ${esc(k.name)}</a><span>${standBadge(w)} <small>${esc(why)}</small></span><span>Next: ${s.next ? `${esc(s.next.title)}, <b>${esc(day(s.next.finishDate))}</b>` : 'no gate'}</span><span>${g ? open('gate', k.gates, g.id, `${n(g.missing.length, 'thing', 'things')} still needed`, 'pl-inl') : `${n(d.pipe.count, 'possibility', 'possibilities')} found`}${soon ? ` · <b>waits for ${n(soon, 'decision', 'decisions')} this week</b>` : ''}</span></li>`; };
  return `
  <section class="pl-needs"><h3>Needs you</h3>
    ${tA.overWeeks || tB.overWeeks ? `<p>The two engineers are planned on two plans at once: the developer is over capacity in ${tA.overWeeks} weeks and the director in ${tB.overWeeks}. Deciding the order of work settles it.</p>` : ''}
    ${dec.length ? `<ul class="pl-reg">${dec.map(decRow).join('')}</ul>` : '<p>No decision is waiting.</p>'}${more('/plan/#decisions', `All ${all.filter((r) => !r.made).length} open decisions`)}</section>
  <ul class="pl-plans">${PLANS.map(planRow).join('')}</ul>
  <div class="pl-today">
    <section><h3>Risk</h3><p><b class="pl-big">${allRisks(x).filter((r) => r.level === 'High').length}</b> of ${allRisks(x).length} risks are rated high.</p>${more('/plan/#risks', 'See the risks')}</section>
    <section><h3>Money</h3>${mo.cashOnHand == null ? `<p>Cash on hand is not entered, so the month it runs out is not known.</p><button type="button" class="pb-btn pl-act" data-open="cash||">Enter cash on hand</button>` : `<p><b class="pl-big">${$m(mo.cashOnHand)}</b> cash on hand. It runs out in <b>${esc(mo.runwayMonth || 'no month of this plan')}</b>.</p>`}${more('/plan/#money', 'See the money')}</section>
  </div>`;
}

function strategy(x) {
  const { m } = x;
  return `${V.strategyMap(x)}
  ${sec('How the business is meant to work', V.chain(m.businessModel.map((b) => ({ title: b.step, text: b.text, tag: S.stated(b.status), attr: `title="${esc(b.basis)}"` })), { label: 'Business model from customer need to recurring revenue' }))}
  ${act('Decide which company sells the battery product', 'data-open="decision|execDecisions|ED-01"')}`;
}

function roadmap(x) {
  return `${V.planBars(x)}
  <p class="pb-note">One bar for each plan; the phases are on each plan's own Plan screen. Working shows every phase together, the hours week by week, and what each change of plan would do.</p>
  ${act('Decide the order of work', 'data-open="decision|execDecisions|ED-02"')}`;
}

function money(x) {
  const { d } = x; const b = d.budget; const mo = d.monthly;
  const basis = { battery: (r) => `at minimum: labor only, ${n(r.notEstimated, 'cost', 'costs')} not yet quoted`, ecg: () => 'full estimate: labor, hardware, tools, review, contingency', funding: (r) => `at minimum: labor only, ${n(r.notEstimated, 'cost', 'costs')} not yet quoted` };
  const cashBtn = '<button type="button" class="pb-btn pl-act" data-open="cash||">Enter cash on hand</button>';
  return `
  <div class="pb-tiles pl-3">${tile(mo.cashOnHand == null ? 'not entered' : $m(mo.cashOnHand), 'Cash on hand', mo.cashOnHand == null ? '' : `${tag('confirmed')} entered by you · ${open('cash', '', '', 'change', 'pl-inl')}`)}${tile(mo.runwayKnown ? esc(mo.runwayMonth || 'beyond the plan') : 'not known', 'Cash runs out', mo.runwayKnown ? `${tag('planned')} gap to fund ${$m(mo.fundingGap)}` : 'needs cash on hand')}${tile($m(d.pipe.received), 'Funding received', `${tag('confirmed')} ${$m(d.pipe.committed)} more is committed`)}</div>
  ${sec('What each plan costs', V.hbars(b.rows.map((r) => ({ label: r.name, parts: [{ value: r.labour, cls: V.PCOL[r.id], name: 'Labor' }, { value: r.other, cls: 'pl-c-oth', name: 'Other costs' }, { value: r.contingency, cls: 'pl-c-con', name: 'Contingency' }], text: `${$m(r.total)} planned, ${basis[r.id](r)}` })), { fmt: $m, label: 'Cost by plan' }) + V.legend([['pl-c-b', 'Labor (plan colour)'], ['pl-c-oth', 'Other costs'], ['pl-c-con', 'Contingency']]) + '<p class="pb-note">The three figures are not the same kind of number, so they are not added up.</p>')}
  ${sec('Spending by month', V.monthBars(mo.rows, { label: 'Planned spending by month and plan' }))}
  ${mo.runwayKnown ? sec('Cash balance', V.balanceLine(mo.rows)) : act('Enter cash on hand', 'data-open="cash||"')}`;
}

function decisions(x) {
  const all = allDecisions(x); const f = x.ui.decPlan || ''; const rows = all.filter((r) => !f || r.plans.includes(f)); const o = rows.filter((r) => !r.made);
  const groups = [['This week', o.filter((r) => r.days != null && r.days <= 7)], ['The two weeks after', o.filter((r) => r.days > 7 && r.days <= 21)], ['Later', o.filter((r) => r.days == null || r.days > 21)]];
  const made = rows.filter((r) => r.made);
  return `<div class="pb-tiles pl-3 pl-wk">${groups.map(([name, list]) => tile(String(list.length), name, list[0] && list[0].due ? `next: ${esc(day(list[0].due))}` : '')).join('')}</div>
  ${chips('decPlan', f)}
  ${groups.map(([name, list], i) => (list.length ? (i === 2 ? `<details class="pl-details"><summary>${esc(name)}: ${list.length}</summary><ul class="pl-reg">${list.map(decRow).join('')}</ul></details>` : `<h3 class="pl-grp">${esc(name)}</h3><ul class="pl-reg">${list.map(decRow).join('')}</ul>`) : '')).join('') || '<p>None for this plan.</p>'}
  ${made.length ? `<details class="pl-details"><summary>Decided: ${made.length}</summary><ul class="pl-reg">${made.map(decRow).join('')}</ul></details>` : ''}
  <p class="pb-note">A gate appears here when a plan is waiting at it. The dates are planning dates: the day the plan needs the answer.</p>`;
}

function risks(x) {
  const f = x.ui.riskPlan || ''; const all = allRisks(x); const rows = all.filter((r) => !f || r.program === f || (r.program === 'shared' && f !== ''));
  const count = (lvl) => all.filter((r) => r.level === lvl).length; const top = rows[0];
  return `<div class="pb-tiles pl-3">${tile(String(count('High')), 'High')}${tile(String(count('Medium')), 'Medium')}${tile(String(count('Low')), 'Low')}</div>
  ${chips('riskPlan', f)}
  <ul class="pl-reg">${rows.slice(0, 8).map((r) => `<li><span class="pl-reg-d">${esc(r.level)}</span><span class="pl-reg-t">${open('risk', r.coll, r.id, r.hazard)}<small>${esc(r.program === 'shared' ? 'All plans' : V.PNAME[r.program])} · ${esc(r.after)} once controlled ${code(r.id)}</small></span></li>`).join('') || '<li class="pl-reg-e">None for this plan.</li>'}</ul>
  <p class="pb-note">The ${Math.min(8, rows.length)} highest of ${rows.length}. ${tag('assumed')} First estimates; not reviewed. Working holds the full list.</p>
  ${top ? act('Open the highest risk', `data-open="risk|${top.coll}|${esc(top.id)}"`) : ''}`;
}

function done(x) {
  const o = allDecisions(x).filter((r) => !r.made).slice(0, 3);
  return `<p class="pl-lead">You have seen the company and the three plans.</p>
  ${sec('Waiting for you', o.length ? `<ul class="pl-reg">${o.map(decRow).join('')}</ul>${more('/plan/#decisions', 'All open decisions')}` : '<p>No decision is waiting.</p>')}
  <p class="pb-note">To change something, switch any screen to Working. Parts, tools, standards, security and the history of changes are under Reference and history.</p>`;
}

/* ================================================================ the same four views for every plan */

function pNow(x, id) {
  const { m, d } = x; const k = KIT[id]; const s = d.byProgram[id]; const [w, why] = standing(x, id); const rd = readOf(x, id); const g = rd && rd.currentGate;
  const steps = s.sched.rows.filter((r) => !r.milestone && !r.loe && r.percent < 100).slice(0, 3);
  const dec = allDecisions(x).filter((r) => !r.made && r.plans.includes(id));
  const TYPES = { 'CH-A': ['customer-funded'], 'CH-B': ['non-dilutive grant', 'contract', 'state grant'], 'CH-C': ['partnership'], 'CH-D': ['equity'] };
  const picture = id === 'battery' ? sec('What the evidence supports today', `<div class="pb-tiles pl-4 pl-ev">${[['Shown', 'Shown in the videos'], ['Credible', 'Sound in principle'], ['Not verified', 'Not verified'], ['Open', 'No evidence at all']].map(([lv, name]) => tile(String(m.bFindings.filter((f) => f.level === lv).length), name)).join('')}</div><p class="pb-note">${tag('confirmed')} Counts of findings in the audit of November 17, 2026. Nothing has been tested by us.</p>`)
    : id === 'ecg' ? sec('The gate that matters', `<p class="pl-lead">${esc(m.program.criticalGate)}</p>`)
    : sec('Where the money could come from', `<div class="pb-tiles pl-4 pl-ev">${m.channels.map((c) => tile(String(m.opportunities.filter((o) => TYPES[c.id].includes(o.type)).length), c.name)).join('')}</div><p class="pb-note">Possibilities found. Found is not eligible, applied or awarded; only cash received counts.</p>`);
  const folded = [];
  if (id === 'funding' && !hasFundingMoney(x)) folded.push(`<b>Money.</b> Nothing is received or committed, and no possibility has an amount yet. ${more('#money', 'Open')}`);
  if (!hasProof(x, id)) folded.push(id === 'funding' ? `<b>Proof.</b> No interview, pilot or funding document is on record yet. ${more('#proof', 'Open')}` : `<b>Proof.</b> Nothing is tested or approved yet; ${n(rd.gates, 'gate', 'gates')} lie ahead. ${more('#proof', 'Open')}`);
  const next = steps[0];
  return `
  <div class="pb-tiles pl-4">${tile(standBadge(w), 'Standing', esc(why))}${tile(s.next ? esc(day(s.next.finishDate)) : 'none', 'Next gate', s.next ? `${tag('planned')} ${esc(s.next.title)}` : '')}${g ? tile(String(g.missing.length), 'Still needed before it', open('gate', k.gates, g.id, 'see what', 'pl-inl')) : tile(d.dl.upcoming[0] ? esc(day(d.dl.upcoming[0].deadline)) : 'none', 'Next application date', d.dl.upcoming[0] ? `${tag('confirmed')} ${esc(d.dl.upcoming[0].organisation)}` : '')}${tile(String(dec.length), 'Decisions it waits for', dec[0] && dec[0].due ? `soonest ${esc(day(dec[0].due))}` : 'none')}</div>
  ${sec('Next three steps', steps.length ? V.chain(steps.map((r) => ({ title: r.title, text: `${day(r.startDate)} to ${day(r.finishDate)}`, foot: open('task', k.tasks, r.id, 'Open this task') })), { label: 'Next three steps' }) : '<p>Every task is complete.</p>')}
  ${picture}
  ${folded.length ? `<ul class="pl-fold">${folded.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
  ${id === 'funding' && d.dl.upcoming[0] ? act(`Check whether the company may apply by ${day(d.dl.upcoming[0].deadline)}`, 'data-go="plan|working|1"') : next ? act('Open the next task', `data-open="task|${k.tasks}|${esc(next.id)}"`) : ''}`;
}

function pPlan(x, id) {
  const { m, d } = x; const k = KIT[id]; const s = d.byProgram[id]; const sub = x.ui.sub || '';
  const next = s.sched.rows.find((r) => !r.milestone && !r.loe && r.percent < 100);
  const timeline = () => `<p class="pl-lead">${esc(day(s.program.startDate))} ${s.program.startDate.slice(0, 4)} to <b>${esc(day(s.sched.endDate))} ${s.sched.endDate.slice(0, 4)}</b>, ${s.sched.endWeek} weeks. ${tag('planned')}</p>${V.phaseChart(s, d.today)}<p class="pb-note">One bar for each phase. Working shows every task and what it depends on.</p>${next ? act('Open the next task', `data-open="task|${k.tasks}|${esc(next.id)}"`) : ''}`;
  if (id === 'battery') {
    const cur = sub || 'build'; const seg = segs('sub', cur, [['build', 'Build'], ['sell', 'Sell'], ['make', 'Make']]);
    if (cur === 'sell') return seg + V.funnelViz(d.funnel) + `<p class="pb-note">Filled: customers on record at each stage. Dashed outline: the target. ${tag('planned')} No customer is on record yet.</p>` + act('Record a customer conversation', 'data-go="plan|working|1"');
    if (cur === 'make') { const cls = { MDMCG: 'pl-own', Outsourced: 'pl-out', Both: 'pl-both' }; return seg + V.chain(m.mfgFlow.map((f) => ({ title: f.step, tag: `<span class="pl-who">${esc(f.who === 'Both' ? 'Both: we and the supplier' : f.who === 'MDMCG' ? 'We do it' : 'Bought in')}</span>`, cls: cls[f.who] })), { wrap: true, label: 'Outsourced manufacturing from release to repair' }) + '<p class="pb-note">We keep the requirements, designs, acceptance criteria, firmware, calibration methods, customer records and release authority at every step. No manufacturer is chosen.</p>' + act('Name a manufacturer to ask for a quotation', 'data-go="plan|working|2"'); }
    return seg + timeline();
  }
  if (id === 'funding') {
    const cur = sub || 'dates'; const seg = segs('sub', cur, [['dates', 'Dates'], ['pipeline', 'Pipeline'], ['timeline', 'Timeline']]);
    if (cur === 'timeline') return seg + timeline();
    if (cur === 'pipeline') { const beyond = d.pipe.stages.slice(1).some((st) => st.count); return seg + (beyond ? V.chain(d.pipe.stages.map((st) => ({ title: st.name, big: st.count, text: st.name === 'Cash received' ? $m(d.pipe.received) : st.attainable ? `${$m(st.attainable)} attainable` : '' })), { label: 'Funding pipeline by stage' }) : `<p class="pl-lead"><b>${n(d.pipe.count, 'possibility is', 'possibilities are')} identified.</b> None has been checked for eligibility, applied for, awarded or received.</p>`) + '<p class="pb-note">The stages are: identified, eligibility checked, application or negotiation, submitted, award or commitment, cash received. Only cash received counts as available.</p>' + act('Move a possibility forward', 'data-go="plan|working|0"'); }
    const up = d.dl.upcoming;
    return seg + (up.length ? `<ul class="pl-reg">${up.map((o) => `<li><span class="pl-reg-d">${esc(day(o.deadline))}<small>${o.days <= 30 ? `in ${n(o.days, 'day', 'days')}` : o.deadline.slice(0, 4)}</small></span><span class="pl-reg-t"><b>${esc(o.organisation)}</b><small>${esc(o.programme.length > 90 ? o.programme.slice(0, 89) + '…' : o.programme)} · for ${esc(o.target === 'both' ? 'both products' : V.PNAME[o.target])}</small></span></li>`).join('')}</ul><p class="pb-note">${tag('confirmed')} Dates as read on each program's own page on 2026-11-19. Whether the company may apply has not been checked for any of them.</p>` : empty('No application date is on record.')) + (up[0] ? act(`Check whether the company may apply by ${day(up[0].deadline)}`, 'data-go="plan|working|1"') : '');
  }
  return timeline();
}

function pMoney(x, id) {
  const { d } = x; const b = d.budget.rows.find((r) => r.id === id);
  if (id === 'battery') { const bb = d.bBudget;
    return `<div class="pb-tiles pl-3">${tile($m(bb.total), 'Planned cost, at minimum', `${tag('planned')} labor only, with ${bb.contingencyPct}% contingency`)}${tile(String(bb.notEstimated), 'Costs not yet quoted', 'left empty, not guessed')}${tile(`${bb.hours.A + bb.hours.B} h`, 'Engineering hours', `${tag('planned')} ${bb.hours.A} developer · ${bb.hours.B} director`)}</div>
    ${sec('Three scenarios', V.hbars(d.bScen.map((sc) => ({ label: sc.name, value: sc.weeks, cls: sc.id === 'baseline' ? 'pl-c-b' : 'pl-c-oth', text: `${sc.weeks} weeks · ends ${day(sc.endDate)} ${sc.endDate.slice(0, 4)} · labor ${$m(sc.labour)}` })), { label: 'Schedule length by scenario' }))}
    <p class="pb-note">A sales model is in Working. It is not drawn here: its price and unit cost are ${tag('assumed')} and ${d.econUnset} of its cost inputs are still zero, so a chart of it would overstate the profit.</p>
    ${act('Enter a quoted cost', 'data-go="money|working|0"')}`; }
  if (id === 'ecg') { const e = d.ecg; const bud = e.bud;
    return `<div class="pb-tiles pl-3">${tile($m(bud.total), 'Planned cost, full estimate', `${tag('planned')} ${$m(bud.direct)} direct + ${bud.contingencyPct}% contingency`)}${tile(`${bud.unverifiedLines} of ${bud.items.length}`, 'Costs not yet quoted', 'allowances, not quotations')}${tile($m(e.spendActual), 'Spent so far', `${tag('confirmed')} planned by now: ${$m(e.spendPlanned)}`)}</div>
    ${sec('Where the money goes', V.hbars([['Labor', bud.labour.cost, 'pl-c-e'], ['Hardware', bud.hardware, 'pl-c-oth'], ['Software and cloud', bud.software, 'pl-c-oth'], ['External review', bud.external, 'pl-c-oth'], ['Contingency', bud.contingency, 'pl-c-con']].map(([label, value, cls]) => ({ label, value, cls })), { fmt: $m, label: 'ECG/MCG cost by category' }))}
    ${sec('Three scenarios', V.hbars(e.scenarios.map((sc) => ({ label: sc.name, value: sc.b.total, cls: sc.id === 'baseline' ? 'pl-c-e' : 'pl-c-oth', text: `${$m(sc.b.total)} · ${sc.b.durationWeeks} weeks · ends ${day(sc.endDate)} ${sc.endDate.slice(0, 4)}` })), { fmt: $m, label: 'Scenario totals' }))}
    ${act('Enter a quoted cost', 'data-go="money|working|1"')}`; }
  const p = d.pipe;
  return `<div class="pb-tiles pl-3">${tile($m(p.received), 'Funding received', `${tag('confirmed')} the only money that is available`)}${tile($m(p.committed), 'Committed', 'awarded or signed, not yet cash')}${tile($m(b.total), 'Cost of the funding work, at minimum', `${tag('planned')} ${n(b.notEstimated, 'cost', 'costs')} not yet quoted`)}</div>
  ${hasFundingMoney(x) ? sec('Funding by certainty', V.hbars([{ label: 'Funding received', value: p.received, cls: 'pl-c-act' }, { label: 'Committed', value: p.committed, cls: 'pl-c-f' }, { label: 'Possible, weighted by chance', value: p.weighted, cls: 'pl-c-con', text: `${$m(p.weighted)} · ${p.noProbability} have no chance entered` }, { label: 'Possible, unweighted', value: p.prospective, cls: 'pl-c-oth', text: `${$m(p.prospective)} · ${p.noAmount} have no amount` }], { fmt: $m, label: 'Funding by certainty' })) : empty('Nothing to draw yet.', `No money is received or committed, and none of the ${p.count} possibilities has an amount entered.`)}
  <p class="pb-note">Cash on hand and the month it runs out are on the company's ${more('/plan/#money', 'Money screen')}</p>
  ${act('Enter an amount for a possibility', 'data-go="plan|working|0"')}`;
}

function pProof(x, id) {
  const { m, d } = x; const k = KIT[id]; const s = d.byProgram[id];
  if (id === 'funding') { const ready = m.investorChecklist.filter((c) => c.state === 'Done').length;
    return `${hasProof(x, id) ? V.meters([{ label: 'Customer interviews on record', done: d.funnel.rows[0].reached, of: m.funnelTargets['Customer discovery'], note: 'against the target' }, { label: 'Paid pilots signed', done: d.funnel.rows[3].reached, of: m.funnelTargets['Paid pilot'], note: 'against the target' }, { label: 'Investor preparation', done: ready, of: m.investorChecklist.length, note: '' }, { label: 'Funding documents written', done: m.fDeliverables.filter((q) => q.location).length, of: m.fDeliverables.length, note: '' }]) : empty('Nothing on record yet.', `Targets: ${m.funnelTargets['Customer discovery']} customer interviews, ${m.funnelTargets['Paid pilot']} paid pilots, ${m.investorChecklist.length} preparation items, ${m.fDeliverables.length} funding documents.`)}
    <p class="pb-note">An interview counts with a written record, a pilot with a signed agreement, revenue and grants when the money is received.</p>
    ${act('Open the preparation list', 'data-go="proof|working|0"')}`; }
  const r = readOf(x, id); const state = (g) => (DONE.includes(g.status) ? badge(g.status) : r.currentGate && g.id === r.currentGate.id ? `<span class="pl-cur">Current · needs ${g.missing.length}</span>` : '<span class="pl-later">Not started</span>');
  return `${hasProof(x, id) ? V.meters([{ label: 'Gates approved', done: r.gatesApproved, of: r.gates, note: '' }, { label: 'Tests passed', done: r.passed, of: r.tests, note: `${r.notRun} not run` }, { label: 'Requirements with evidence', done: r.withEvidence, of: r.requirements, note: '' }, { label: 'Risk controls verified', done: r.controlsVerified, of: r.controls, note: '' }]) : empty('Nothing is tested or approved yet.', `${n(r.tests, 'test', 'tests')} planned, ${n(r.gates, 'gate', 'gates')} ahead, ${n(r.requirements, 'requirement', 'requirements')} to show.`)}
  ${sec('Gates, in order', `<ol class="pl-gates">${r.gateRows.map((g) => `<li class="${r.currentGate && g.id === r.currentGate.id ? 'cur' : ''}">${open('gate', k.gates, g.id, g.title)}${state(g)}<small>${esc(day(C.finishOf(s.sched, g.milestone) || d.today))} ${code(g.id)}</small></li>`).join('')}</ol>`)}
  ${id === 'battery' ? sec('Why a zero phase reading is not enough', V.timingFigure()) : ''}
  ${r.currentGate ? act('Open the current gate', `data-open="gate|${k.gates}|${esc(r.currentGate.id)}"`) : ''}`;
}

/* ================================================================ the side panel */

export function panel(x0) {
  const p = x0.ui.panel; if (!p) return '';
  const x = { ...x0, ui: { ...x0.ui, working: true } };             // the panel is where a record is changed
  const { m, d } = x; const row = (kk, v) => `<div><dt>${esc(kk)}</dt><dd>${v}</dd></div>`; let title = '', body = '';
  if (p.kind === 'task') { const id = PLANS.find((q) => KIT[q].tasks === p.coll); const t = id && m[p.coll].find((q) => q.id === p.id); if (t) { title = t.title; body = `<p>${code(t.id)} ${esc(V.PNAME[id])}</p>` + S.taskPanel({ ...x, ui: { ...x.ui, task: p.id } }, p.coll, d.byProgram[id]).replace(/<div class="pb-panel-h">[\s\S]*?<\/div>/, '').replace('class="pb-panel" id="pb-task"', 'class="pl-in"'); } }
  if (p.kind === 'gate') { const id = PLANS.find((q) => KIT[q].gates === p.coll); const g = id && readOf(x, id).gateRows.find((q) => q.id === p.id); if (g) { title = g.title;
    body = `<p>${code(g.id)} ${esc(V.PNAME[id])} · planned ${esc(C.finishOf(d.byProgram[id].sched, g.milestone) || '')}</p><p><b>Still needed before a go: ${g.missing.length}</b></p>${ul(g.missing.map((q) => esc(q.text)))}<p><b>What it asks</b></p>${ul(g.criteria.map(esc))}<p><b>An approval releases:</b> ${esc(g.authorises)}</p>
      ${g.approval ? `<p class="pb-approved">${esc(g.approval.decision)} by ${esc(g.approval.by)} on ${esc(g.approval.date)} <button type="button" class="pb-link" data-act="withdraw" data-coll="${p.coll}" data-id="${esc(g.id)}">withdraw</button></p>` : `<form class="pb-form" data-approve="${esc(g.id)}" data-coll="${p.coll}">${input('by', 'Decided by (a person\'s name)', { req: 1, val: x.store.who })}${input('date', 'Date', { type: 'date', req: 1, val: d.today })}${input('decision', 'Decision', { opts: ['Approved', 'Conditional', 'No-go'] })}${input('note', 'Note')}<button class="pb-btn pl-act" type="submit">Record decision</button></form>`}`; } }
  if (p.kind === 'decision') { const r = m[p.coll] && m[p.coll].find((q) => q.id === p.id); if (r) { title = r.title;
    body = `<p>${code(r.id)} holds up: ${esc((r.plans || [r.program]).map((q) => V.PNAME[q] || 'all plans').join(', '))}</p><dl class="pb-dl">${row('Needed by', ed(x, p.coll, r.id, 'due', r.due, { t: 'date', fmt: (v) => v || 'set a date' }))}${row('Who decides', esc(r.owner || 'Director'))}${r.impactText ? row('What it affects', esc(r.impactText)) : ''}</dl>
      <p>${esc(r.question)}</p><p><b>Alternatives</b></p><ul class="pb-ul pl-alts">${r.options.map((o) => `<li>${esc(o)} <button type="button" class="pb-link" data-pick="${esc(p.coll)}|${esc(r.id)}|${esc(o)}">choose this</button></li>`).join('')}</ul><p><b>Recommendation.</b> ${esc(r.recommendation)}</p>${r.evidence ? `<p><b>Evidence, or what it needs first.</b> ${esc(r.evidence)}</p>` : ''}
      <dl class="pb-dl pl-record">${row('Decision', ed(x, p.coll, r.id, 'decision', r.decision, { fmt: (v) => v || 'record the decision' }))}${row('By', ed(x, p.coll, r.id, 'decidedBy', r.decidedBy, { fmt: (v) => v || 'name' }))}${row('On', ed(x, p.coll, r.id, 'decidedOn', r.decidedOn, { t: 'date', fmt: (v) => v || 'date' }))}</dl><p class="pb-note">A decision counts with its text, a person's name and a date. "Choose this" fills in the text; the name and the date are yours to enter.</p>`; } }
  if (p.kind === 'risk') { const r = allRisks(x).find((q) => q.id === p.id && q.coll === p.coll); if (r) { title = r.hazard; const linked = ['bTasks', 'tasks', 'fTasks'].flatMap((c) => m[c].filter((t) => (t.risks || []).includes(r.id)).map((t) => open('task', c, t.id, t.title)));
    body = `<p>${code(r.id)} ${esc(r.program === 'shared' ? 'All plans' : V.PNAME[r.program])} · ${esc(r.kind)}</p><dl class="pb-dl">${row('Effect', esc(r.harm))}${row('Owner', esc(S.who(x, r.owner)))}${row('Severity, 1 to 5', ed(x, p.coll, r.id, 'severity', r.severity, { t: 'number' }))}${row('Probability, 1 to 5', ed(x, p.coll, r.id, 'probability', r.probability, { t: 'number' }))}${row('Level now', esc(r.level))}${row('Controls', r.controls.map((c) => esc(c.text)).join('<br>'))}${row('Severity once controlled', ed(x, p.coll, r.id, 'residualSeverity', r.residualSeverity, { t: 'number' }))}${row('Probability once controlled', ed(x, p.coll, r.id, 'residualProbability', r.residualProbability, { t: 'number' }))}${row('Level once controlled', esc(r.after))}${row('Tasks that deal with it', linked.length ? linked.join('<br>') : 'none linked')}</dl>`; } }
  if (p.kind === 'cash') { title = 'Cash on hand'; body = `<p>Enter the cash the company has today. The plan then works out the balance month by month, the month it runs out, and the gap to fund. The plan cannot check this figure.</p><form class="pb-form" data-cash><label class="pb-f"><span>Cash on hand, in dollars</span><input name="cash" type="number" min="0" step="any" required value="${m.capital.cashOnHand ?? ''}" autofocus></label><button class="pb-btn pl-act" type="submit">Save</button></form>`; }
  if (p.kind === 'changes') { title = 'Your changes'; body = `<p>What you change is kept in this browser, apart from the plan's own data. ${n(d.changes, 'change', 'changes')} of yours ${d.changes === 1 ? 'is' : 'are'} in force.</p><label class="pb-f"><span>Your name (needed for decisions and records)</span><input id="pb-who" type="text" value="${esc(x.store.who)}"></label>
    <div class="pl-acts"><button type="button" class="pb-btn" data-act="export">Save my changes to a file</button><label class="pb-btn pb-file">Load changes from a file<input type="file" id="pb-import" accept="application/json"></label><button type="button" class="pb-btn" data-act="reset">Discard my changes</button><button type="button" class="pb-btn" data-act="lock">Lock the plan</button></div><p>${more('/plan/reference/#records', 'Full history of changes')}</p>`; }
  if (!body) return '';
  return `<div class="pl-scrim" data-act="close-panel"></div><aside class="pl-drawer" id="pl-drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3><button type="button" class="pb-btn" data-act="close-panel">Close</button></header><div class="pl-drawer-b">${body}</div></aside>`;
}

/* ================================================================ how the screens are put together */

const view = (k, label, brief, working, o = {}) => ({ k, label, brief, working, ...o });
const plan = (id, w) => [view('now', 'Now', (x) => pNow(x, id), w.now), view('plan', 'Plan', (x) => pPlan(x, id), w.plan, { also: { battery: 'Build, Sell and Make', funding: 'Dates, Pipeline and Timeline' }[id] }), view('money', 'Money', (x) => pMoney(x, id), w.money), view('proof', 'Proof', (x) => pProof(x, id), w.proof)];
const ecgLines = (x) => tbl('elines', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Cost', v: (r) => esc(r.title) }, { h: 'Amount', n: 1, v: (r) => ed(x, 'lines', r.id, 'amount', r.amount, { t: 'number', fmt: C.money }) }, { h: 'Basis', v: (r) => ed(x, 'lines', r.id, 'kind', r.kind, { t: 'select', opts: C.PRICE_KINDS }) }, { h: 'Planned week', n: 1, v: (r) => ed(x, 'lines', r.id, 'week', r.week, { t: 'number', fmt: (v) => v || 'spread' }) }, { h: 'Actual paid', n: 1, v: (r) => ed(x, 'lines', r.id, 'actual', r.actual, { t: 'number', fmt: C.money }) }, { h: 'Paid in week', n: 1, v: (r) => ed(x, 'lines', r.id, 'actualWeek', r.actualWeek, { t: 'number', fmt: (v) => v || 'set' }) }, { h: 'Note', v: (r) => esc(r.note || '') }], x.m.lines, { name: 'ecg cost lines' });
const ecgGates = (x) => S.gateCards(x, x.d.readE.gateRows, 'gates', x.d.byProgram.ecg.sched);
const allRiskTable = (x) => tbl('riskreg', [{ h: 'Id', v: (r) => esc(r.id) }, { h: 'Plan', v: (r) => esc(r.program === 'shared' ? 'All plans' : V.PNAME[r.program]) }, { h: 'Kind', v: (r) => esc(r.kind) }, { h: 'Risk', v: (r) => esc(r.hazard) }, { h: 'Effect', v: (r) => esc(r.harm) }, { h: 'Severity', n: 1, v: (r) => ed(x, r.coll, r.id, 'severity', r.severity, { t: 'number' }) }, { h: 'Probability', n: 1, v: (r) => ed(x, r.coll, r.id, 'probability', r.probability, { t: 'number' }) }, { h: 'Level', v: (r) => esc(r.level) }, { h: 'Control', v: (r) => r.controls.map((c) => esc(c.text)).join('<br>') }, { h: 'Once controlled', v: (r) => esc(r.after) }], allRisks(x), { name: 'risk list' });
const objectives = (x) => S.cards(x.m.objectives.map((o) => S.card(esc(o.title), `<p class="pl-kind">${esc(o.kind)} · ${esc(V.PNAME[o.program] || 'All plans')}</p><p><b>Measure.</b> ${esc(o.measure)}</p>`, V.PCOL[o.program]))) + `<p class="pb-note">${esc(x.m.ambition)}</p>`;
const basisView = (x) => sec('What the figures rest on', ul(x.m.assumptions.map(esc))) + sec('How each plan\'s cost is worked out', ul(x.d.budget.rows.map((r) => `<b>${esc(r.name)}.</b> ${esc(r.basis)}. ${r.isFloor ? `A minimum: ${n(r.notEstimated, 'cost is', 'costs are')} not yet quoted${r.unpricedHours ? ` and ${r.unpricedHours} hours have no rate` : ''}.` : 'A full estimate; nothing in it is quoted yet.'}`)));

export const AREAS = {
  hub: { title: 'Company', base: '/plan/', tabs: [
    view('today', 'Today', today, null),
    view('strategy', 'Strategy', strategy, [['Objectives', objectives], ['Shared operations', S.sShared]]),
    view('roadmap', 'Roadmap', roadmap, [['Every phase, capacity and what-ifs', S.sRoadmap]]),
    view('money', 'Money', money, [['All figures', S.sFinancials], ['Basis', basisView]]),
    view('decisions', 'Decisions', decisions, null),
    view('risks', 'Risks', risks, [['Full list', allRiskTable]]),
    view('done', 'Up to date', done, null, { hidden: true }),
  ] },
  battery: { title: 'Plan 1: Battery Product', base: '/plan/battery/', tabs: plan('battery', { now: [['Engineering state', S.bEngineering]], plan: [['Build', S.bDevelopment], ['Sell', S.bCommercial], ['Make', S.bManufacturing], ['Support', S.bSupport]], money: [['Budget and sales model', S.bBudget]], proof: [['Gates and traceability', S.bQuality]] }) },
  ecg: { title: 'Plan 2: ECG/MCG', base: '/product-build/', tabs: plan('ecg', { now: [['Overview', (x) => L.overview(xe(x))]], plan: [['Timeline and tasks', (x) => L.timeline(xe(x))], ['People and hours', (x) => L.resources(xe(x))]], money: [['Scenarios', (x) => L.scenariosView(xe(x))], ['Cost lines', ecgLines]], proof: [['Gates', ecgGates], ['Requirements and traceability', (x) => L.requirementsView(xe(x))], ['Tests', (x) => L.testing(xe(x))]] }) },
  funding: { title: 'Plan 3: Funding and Partnerships', base: '/plan/funding/', tabs: plan('funding', { now: [['Strategy and deliverables', S.fStrategy]], plan: [['Pipeline', S.fPipeline], ['Grants', S.fGrants], ['Customers', S.fCustomer], ['Partners', S.fPartners]], money: [['Cash and awards', S.fCash]], proof: [['Investor preparation', S.fInvestment]] }) },
  library: { title: 'Reference and history', base: '/plan/reference/', library: true, tabs: [
    view('parts', 'Parts (ECG/MCG)', (x) => L.hardware(xe(x)), null),
    view('tools', 'Tools (ECG/MCG)', (x) => L.software(xe(x)), null),
    view('standards-battery', 'Standards (Battery)', (x) => sec('Standards and rules that may apply to the instrument', S.batteryStandards(x) || empty('Not on record yet.'), 'Web research of 2026-11-19. A product-safety engineer must read this before it is relied on. No certificate is held or claimed.'), null),
    view('standards', 'Standards and quality (ECG/MCG)', (x) => L.quality(xe(x)), null),
    view('security', 'Security and data', (x) => sec('How the private area is protected today', S.securityToday(x)) + '<h3 class="pl-divide">ECG/MCG data and cloud design</h3>' + L.security(xe(x)), null),
    view('records', 'History of changes', (x) => L.records(xe(x)), null),
  ] },
};
export const PLAN_NAV = [['hub', '/plan/', 'Company'], ['battery', '/plan/battery/', '1 Battery'], ['ecg', '/product-build/', '2 ECG/MCG'], ['funding', '/plan/funding/', '3 Funding'], ['library', '/plan/reference/', 'Reference and history']];
export const planNav = (cur) => `<nav class="pl-nav" aria-label="Company plan"><ul>${PLAN_NAV.map(([id, href, name]) => `<li><a href="${href}"${id === cur ? ' aria-current="page"' : ''}>${esc(name)}</a></li>`).join('')}</ul></nav>`;

/** the reading path: the company screens, then for each plan the views that have something to say, then "Up to date" */
export function path(x) {
  const p = ['today', 'strategy', 'roadmap', 'money', 'decisions', 'risks'].map((k) => ['hub', k]);
  for (const id of PLANS) { p.push([id, 'now'], [id, 'plan']); if (id !== 'funding' || hasFundingMoney(x)) p.push([id, 'money']); if (hasProof(x, id)) p.push([id, 'proof']); }
  p.push(['hub', 'done']); return p;
}
export function pathInfo(x, area, k) {
  const P = path(x); const i = P.findIndex(([a, kk]) => a === area && kk === k); if (i < 0) return null;
  const at = (j) => { if (j < 0 || j >= P.length) return null; const [a, kk] = P[j]; const t = AREAS[a].tabs.find((q) => q.k === kk); return { area: a, k: kk, href: `${AREAS[a].base}#${kk}`, label: a === 'hub' ? t.label : `${AREAS[a].title.replace(/^Plan \d: /, '')}, ${t.label}` }; };
  return { step: i + 1, of: P.length, prev: at(i - 1), next: at(i + 1), also: AREAS[area].tabs.find((q) => q.k === k).also || null };
}
export { allDecisions, allRisks, KIT };
