/* Company plan: the one controller for the company page, the three plans and the library (reorganized 2026-11-20).
   It opens the encrypted data with the access code, keeps a person's changes apart from that data in this browser (the
   same store as before, so nothing entered earlier is lost), works every figure out again after each change, and draws
   the screen in view at the chosen depth. Public code, no figures. */
import * as C from './calc.js';
import * as P from './portfolio.js';
import { unlock, WrongCode } from './crypto.js';
import { esc, mode } from './views.js';
import { AREAS, planNav, panel, pathInfo } from './plan-views.js';

const KEY = 'pb:v1', CODE = 'pb:code', DEPTH = 'pb:depth';
const $ = (s, r = document) => r.querySelector(s);
const gate = $('#pb-gate'), app = $('#pb-app'), msg = $('#pb-msg'), form = $('#pb-form');
const AREA = app.dataset.area; const DEF = AREAS[AREA];
let seed = null, envelope = null, d = null, m = null;
let store = { edits: {}, added: {}, removed: {}, log: [], who: '' };
const ui = { tab: DEF.tabs[0].k, working: !!DEF.library, unified: true, wsub: 0, sub: '', panel: null, task: null, part: null, partFn: '', toolCat: '', stdTopic: '', riskKind: '', reportWeek: null, zoom: 16, revenue: false, volume: 25, decPlan: '', riskPlan: '', sort: {}, filter: {} };
mode.quiet = true;                                   // default states are stated once, not badged on every row

const read = (k, w = localStorage) => { try { return w.getItem(k); } catch { return null; } };
const write = (k, v, w = localStorage) => { try { v == null ? w.removeItem(k) : w.setItem(k, v); return true; } catch { return false; } };
function load() { try { const s = JSON.parse(read(KEY) || 'null'); if (s && typeof s === 'object') store = { edits: s.edits || {}, added: s.added || {}, removed: s.removed || {}, log: s.log || [], who: s.who || '' }; } catch { /* a damaged store is ignored, never guessed at */ } }
function save() { if (!write(KEY, JSON.stringify(store))) note('Your change is shown but could not be stored in this browser. Save your changes to a file in the Library.'); }
function note(text) { const n = $('#pb-toast'); if (!n) return; n.textContent = text; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(() => { n.hidden = true; }, 7000); }
const OLD = { hub: { 1: 'today', 2: 'roadmap', 3: 'money', 4: 'strategy', 5: 'decisions' }, battery: { 1: 'now', 2: 'plan', 3: 'plan', 4: 'plan', 5: 'plan', 6: 'money', 7: 'proof' }, funding: { 1: 'now', 2: 'plan', 3: 'plan', 4: 'plan', 5: 'proof', 6: 'plan', 7: 'money' }, ecg: { A: 'now', B: 'plan', C: 'plan', K: 'money', F: 'proof', H: 'proof', J: 'proof' } };
function fromHash() { let h = location.hash.slice(1); if (h.startsWith('dec-')) { ui.panel = { kind: 'decision', coll: 'execDecisions', id: h.slice(4) }; h = 'decisions'; } const o = (OLD[AREA] || {})[h]; if (o) h = o; if (DEF.tabs.some((t) => t.k === h)) { ui.tab = h; return true; } return false; }

async function open(code, quiet) {
  try {
    msg.textContent = 'Opening…';
    seed = await unlock(envelope, code);
    write(CODE, code, sessionStorage); load();
    if (!DEF.library) ui.working = read(DEPTH, sessionStorage) === 'working';
    gate.hidden = true; app.hidden = false; fromHash(); render(false); checkLog();
  } catch (e) {
    write(CODE, null, sessionStorage);
    msg.textContent = quiet ? 'Enter the access code to open this workspace.' : e instanceof WrongCode ? e.message : 'The workspace could not be opened in this browser.';
    if (!quiet) { const i = $('#pb-code'); i.value = ''; i.focus(); }
  }
}
async function start() {
  try { envelope = await (await fetch('/product-build/payload.json', { cache: 'no-store' })).json(); } catch { msg.textContent = 'The workspace data could not be loaded.'; return; }
  if (envelope.locked) { form.querySelector('.pb-gate-row').hidden = true; form.querySelector('label').hidden = true; msg.textContent = 'This workspace is not open in this release.'; return; }
  const kept = read(CODE, sessionStorage); if (kept) open(kept, true);
}
form.addEventListener('submit', (e) => { e.preventDefault(); const c = $('#pb-code').value; if (c && envelope && !envelope.locked) open(c, false); });

/* ------------------------------------------------------------------ work everything out */

function derive() {
  const added = {}; for (const [k, v] of Object.entries(store.added)) added[k] = v.filter((r) => !(store.removed[k] || []).includes(r.id));
  const r = C.applyEdits(seed, store.edits, added);
  const today = new Date().toISOString().slice(0, 10);
  const log = r.model.hoursLog || [];
  const tasks = r.model.tasks.map((t) => { const a = { A: 0, B: 0 }; for (const e of log) if (e.task === t.id) a[e.role] = (a[e.role] || 0) + Number(e.hours || 0); return { ...t, actualHours: a }; });
  m = { ...r.model, tasks };
  let changes = 0; for (const c of Object.values(store.edits)) for (const rec of Object.values(c)) changes += Object.keys(rec).length; for (const a of Object.values(added)) changes += a.length;
  // the ECG/MCG plan's own figures, exactly as its sections expect them
  const sched = C.schedule(m.program, tasks, today); const eLoad = C.resourceLoad(m.program, m.roles, tasks, sched); const bud = C.budget(m.program, m.roles, m.lines); const spend = C.weeklySpend(m.program, m.roles, tasks, m.lines, sched, log);
  const nowWeek = C.weekOf(m.program, today); const upto = Math.min(Math.max(nowWeek, 0), spend.length);
  let status = 'On plan', statusWhy = 'no task is overdue or pushed later';
  if (today < m.program.startDate) { status = 'Not started'; statusWhy = `the program starts on ${m.program.startDate}`; }
  if (sched.overdue.length || sched.slipped.length || sched.errors.length || sched.endWeek > m.program.durationWeeks || eLoad.conflicts.length) { status = 'At risk'; statusWhy = [sched.overdue.length && `${sched.overdue.length} overdue`, sched.slipped.length && `${sched.slipped.length} pushed later`, eLoad.conflicts.length && `${eLoad.conflicts.length} overloaded weeks`, sched.endWeek > m.program.durationWeeks && 'the schedule runs past the program', sched.errors.length && 'schedule errors'].filter(Boolean).join(', '); }
  const ecg = { today, nowWeek, sched, load: eLoad, bud, spend, status, statusWhy, gates: C.gates(m), trace: C.traceability(m), stack: C.stackCost(m.stack, m.tools), bom: C.bomHealth(m.parts), bomCost: [1, 10, 100, 1000].map((q) => C.bomCost(m.parts, q)),
    scenarios: m.scenarios.map((s) => ({ ...s, b: C.budget(m.program, m.roles, m.lines, s), endDate: C.schedule({ ...m.program, durationWeeks: s.durationWeeks || m.program.durationWeeks }, tasks).endDate })),
    spendActual: spend.length ? spend[spend.length - 1].cumActual : 0, spendPlanned: upto ? spend[upto - 1].cumPlanned : 0, conflicts: r.conflicts, orphans: r.orphans, changes, logOk: d && d.ecg ? d.ecg.logOk : null };
  // the company-wide figures
  const scheds = P.schedules(m, today); const loadAll = P.portfolioLoad(m, scheds);
  const byProgram = Object.fromEntries(scheds.map((s) => [s.id, { ...s, next: s.sched.rows.filter((q) => q.milestone && q.percent < 100 && q.finishDate >= today)[0] || s.sched.rows.filter((q) => q.milestone)[0] || null }]));
  const bat = scheds.find((s) => s.id === 'battery');
  const bPart = { needs: m.bNeeds, requirements: m.bRequirements, outputs: m.bOutputs, risks: m.bRisks, tests: m.bTests, evidence: m.evidence, reviews: m.reviews, gates: m.bGates, tasks: m.bTasks, anomalies: (m.anomalies || []).filter((a) => a.program === 'battery') };
  d = { today, ecg, scheds, byProgram, load: loadAll, budget: P.portfolioBudget(m), bBudget: P.programBudget(m, bat),
    bScen: m.bScenarios.map((sc) => { const prog = { ...m.bProgram, durationWeeks: sc.durationWeeks || m.bProgram.durationWeeks, contingencyPct: sc.contingencyPct ?? m.bProgram.contingencyPct }; const s = C.schedule(prog, m.bTasks); const b = P.programBudget(m, { ...bat, program: prog }); return { ...sc, weeks: s.endWeek, endDate: s.endDate, labour: b.labour, total: b.total }; }),
    monthly: P.monthly(m, scheds, loadAll), pipe: P.pipeline(m.opportunities), dl: P.deadlines(m.opportunities, today), funnel: P.funnel(m.customers, m.funnelTargets),
    econ: P.VOLUMES.map((v) => P.unitEconomics(m.bEconomics, v)), econUnset: (m.bEconomics.unset || []).filter((k) => !Number(m.bEconomics[k])).length, sens: P.sensitivity(m.bEconomics, 25),
    readB: P.readiness(bPart), readE: P.readiness({ needs: m.needs, requirements: m.requirements, outputs: m.outputs, risks: m.risks, tests: m.tests, evidence: m.evidence, reviews: m.reviews, gates: m.gates, tasks: m.tasks, anomalies: (m.anomalies || []).filter((a) => a.program !== 'battery') }),
    bTrace: C.traceability(bPart), decisions: P.decisionQueue(m.execDecisions, today), realloc: m.reallocations.map((s) => P.reallocate(m, s, today)), alloc: P.allocationCheck(m.allocations, m.expenses, log), changes };
}
const mine = (c, id, f, k) => { const e = store.edits[c] && store.edits[c][id]; if (!e || !e[f]) return false; if (k == null) return true; const b = e[f].base || {}, v = e[f].value || {}; return JSON.stringify(c === 'scenarios' && f === 'lines' ? (b[k] || null) : b[k]) !== JSON.stringify(v[k]); };

/* ------------------------------------------------------------------ draw */

function render(keep = true) {
  const y = scrollY; derive();
  const x = { m, d, ui, store, mine };
  const i = DEF.tabs.findIndex((t) => t.k === ui.tab); const tab = DEF.tabs[i < 0 ? 0 : i];
  const subs = ui.working && tab.working && !DEF.library ? tab.working : null; const ws = subs ? Math.min(ui.wsub, subs.length - 1) : 0;
  const body = subs ? subs[ws][1](x) : tab.brief({ ...x, ui: { ...ui, working: DEF.library ? true : false } });
  const pi = !DEF.library && !ui.working ? pathInfo(AREA, tab.k) : null;
  const link = (q, cls, text) => `<a class="${cls}" href="${q.href}"${q.area === AREA ? ` data-tab="${q.k}"` : ''}>${text}</a>`;
  const foot = pi ? `<nav class="pl-path" aria-label="Reading path">${pi.prev ? link(pi.prev, 'pl-prev', `← ${esc(pi.prev.label)}`) : '<span></span>'}<span>Step ${pi.step} of ${pi.of}</span>${pi.next ? link(pi.next, 'pl-next', `Next: ${esc(pi.next.label)} →`) : link({ href: '/plan/#today', area: 'hub', k: 'today' }, 'pl-next', 'Back to Today')}</nav>` : '';
  app.innerHTML = `<div class="wrap">${planNav(AREA)}
    <div class="pl-bar"><nav class="pb-tabs pl-tabs" aria-label="${esc(DEF.title)}"><ul>${DEF.tabs.filter((t) => !t.hidden || t === tab).map((t) => `<li><a href="#${t.k}"${t === tab ? ' aria-current="page"' : ''} data-tab="${t.k}">${esc(t.label)}</a></li>`).join('')}</ul></nav>
      <div class="pl-side">${!DEF.library && tab.working ? `<div class="pl-depth" role="group" aria-label="Depth"><button type="button" class="pb-btn${ui.working ? '' : ' pl-on'}" data-depth="brief" aria-pressed="${!ui.working}">Brief</button><button type="button" class="pb-btn${ui.working ? ' pl-on' : ''}" data-depth="working" aria-pressed="${ui.working}">Working</button></div>` : ''}<button type="button" class="pb-link pl-mine" data-open="changes||">Your changes${d.changes ? ` (${d.changes})` : ''}</button></div></div>
    <div class="pb-head"><h2 class="pb-h2" tabindex="-1">${esc(tab.label)}</h2><p class="pb-meta">${esc(DEF.title)} · everything is an estimate or a draft unless it is marked otherwise</p></div>
    ${subs && subs.length > 1 ? `<div class="pl-seg" role="group" aria-label="Working section">${subs.map((s, j) => `<button type="button" class="pb-btn${j === ws ? ' pl-on' : ''}" data-wsub="${j}" aria-pressed="${j === ws}">${esc(s[0])}</button>`).join('')}</div>` : ''}
    <div class="pb-body pl-body${subs || DEF.library ? ' pl-working' : ' pl-brief'}" data-view="${tab.k}">${body}</div>
    ${foot}
    <p class="pb-toast" id="pb-toast" role="status" aria-live="polite" hidden></p></div>${panel(x)}`;
  for (const [id, text] of Object.entries(ui.filter)) { const el = app.querySelector(`[data-filter="${id}"]`); if (el && text) { el.value = text; filterTable(id, text); } }
  for (const [id, s] of Object.entries(ui.sort)) sortTable(id, s.col, s.dir);
  if (keep) scrollTo(0, y);
  if (ui.panel) { const c = $('#pl-drawer .pb-btn'); if (c && !app.contains(document.activeElement)) c.focus(); }
}
function filterTable(id, text) { const t = $(`#t-${CSS.escape(id)}`); if (!t) return; const q = text.trim().toLowerCase(); for (const tr of t.tBodies[0].rows) tr.hidden = !!q && !tr.textContent.toLowerCase().includes(q); }
function sortTable(id, col, dir) {
  const t = $(`#t-${CSS.escape(id)}`); if (!t || !t.tBodies[0]) return;
  const val = (tr) => { const c = tr.cells[col]; if (!c) return ''; const s = c.textContent.trim(); const n = Number(s.replace(/[$,%\s]/g, '')); return s !== '' && !Number.isNaN(n) ? n : s.toLowerCase(); };
  const rows = [...t.tBodies[0].rows].filter((r) => !r.classList.contains('pb-empty'));
  rows.sort((a, b) => { const p = val(a), q = val(b); return dir * (typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q), undefined, { numeric: true })); });
  for (const r of rows) t.tBodies[0].appendChild(r);
  t.querySelectorAll('.pb-sort').forEach((b, i) => b.parentElement.setAttribute('aria-sort', i === col ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: type + ';charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function tableCsv(id) {
  const t = $(`#t-${CSS.escape(id)}`); if (!t) return;
  const text = (c) => { const i = c.querySelector('input[type=checkbox]'); return i ? (i.checked ? 'yes' : 'no') : c.innerText.replace(/\s*\n\s*/g, '; ').trim(); };
  const head = [...t.tHead.rows[0].cells].map(text);
  const rows = [...t.tBodies[0].rows].filter((r) => !r.hidden && !r.classList.contains('pb-empty')).concat(t.tFoot ? [...t.tFoot.rows] : []).map((r) => [...r.cells].map(text));
  download(`company-plan-${(t.dataset.name || id).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${d.today}.csv`, C.toCsv(rows.map((r) => Object.fromEntries(r.map((v, i) => [i, v]))), head.map((h, i) => ({ key: String(i), label: h }))), 'text/csv');
}

/* ------------------------------------------------------------------ change */

/* History entries are added one after another: each needs the hash of the one before, so two changes made close together
   must not be hashed at the same time. The change itself is saved at once; its history entry follows in order. */
let logQueue = Promise.resolve();
function record(action, collection, id, field, from, to) {
  const copy = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));   // a copy, so a later edit of the record cannot alter this entry
  const event = { at: new Date().toISOString(), who: store.who || 'not stated', action, collection, id, field, from: copy(from), to: copy(to) };
  save();
  logQueue = logQueue.then(async () => { store.log = await C.appendEvent(store.log, event); save(); checkLog(); });
  return logQueue;
}
async function checkLog() { const r = await C.verifyLog(store.log); if (d && d.ecg && d.ecg.logOk !== r) { d.ecg.logOk = r; if (app.querySelector('[data-view="records"]')) render(); } }

function setField(c, id, f, value, k) {
  const coll = m[c]; const isList = Array.isArray(coll); const rec = isList ? coll.find((r) => r.id === id) : coll; if (!rec) return;
  const from = k != null ? (rec[f] || {})[k] : rec[f];
  let next = value;
  if (k != null) next = c === 'scenarios' && f === 'lines' ? { ...(rec[f] || {}), [k]: { ...((rec[f] || {})[k] || {}), amount: value } } : { ...(rec[f] || {}), [k]: value };
  const inAdded = (store.added[c] || []).find((r) => r.id === id);
  if (inAdded) inAdded[f] = next; else store.edits = C.setEdit(store.edits, seed, c, isList ? id : '_', f, next, new Date().toISOString());
  record('changed', c, id, k != null ? `${f}.${k}` : f, from, value); render();
}
const LIMITS = { durationWeeks: [1, 156], contingencyPct: [0, 100], percent: [0, 100], week: [1, 156], weeks: [1, 156], actualWeek: [1, 156], weeklyHours: [0, 80], months: [0, 60], severity: [1, 5], residualSeverity: [1, 5], residualProbability: [1, 5], distributorSharePct: [0, 100], distributorMarginPct: [0, 100], warrantyPct: [0, 100], attachPct: [0, 100] };
const MAY_BE_EMPTY = /Lines$|^lines$|^opportunities$|^capital$|^bEconomics$|^customers$/;
function commit(b, raw) {
  const { c, i, f, t, k } = b.dataset;
  try {
    let v;
    if (t === 'number' || t === 'scenline') { if (String(raw).trim() === '') v = null; else { v = Number(raw); if (Number.isNaN(v) || v < 0) throw new Error('A number of zero or more is needed.'); } }
    else if (t === 'date') { if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('A date is needed.'); v = raw || null; }
    else if (t === 'deps') { v = C.parseDeps(raw); const ids = new Set(m[c].map((q) => q.id)); for (const dep of v) { if (!ids.has(dep.id)) throw new Error(`${dep.id} is not a task of this plan.`); if (dep.id === i) throw new Error('A task cannot depend on itself.'); } }
    else v = String(raw).trim();
    const riskProb = f === 'probability' && /isks$/.test(c); const lim = riskProb ? [1, 5] : f === 'probability' ? [0, 100] : LIMITS[f];
    if (lim && v != null && (v < lim[0] || v > lim[1])) throw new Error(`A value from ${lim[0]} to ${lim[1]} is needed.`);
    if ((t === 'number' || t === 'scenline') && v == null && !MAY_BE_EMPTY.test(c)) throw new Error('A value is needed.');
    if (f === 'startDate' && !v) throw new Error('A start date is needed.');
    if (f === 'decidedBy' && v) { const ok = C.validApproval({ by: v, date: '2000-01-01', decision: 'Approved' }); if (!ok.ok) throw new Error(ok.problems[0]); }
    if (c === 'opportunities' && f === 'stage' && v === 'Cash received') { const o = m.opportunities.find((q) => q.id === i); if (!(Number(o.amountReceived) > 0) || !o.receivedDate) throw new Error('Enter the amount received and its date before moving this to "Cash received".'); }
    if (c === 'opportunities' && f === 'probability' && v != null) { const o = m.opportunities.find((q) => q.id === i); if (!o.probabilityBasis) throw new Error('Enter the basis of the probability first: a probability needs its reason.'); }
    setField(c, i, f, v, k);
  } catch (e) { render(); note(e.message); }
}
function editCell(b) {
  const { t, v, o } = b.dataset;
  const el = t === 'select' ? Object.assign(document.createElement('select'), { innerHTML: o.split('|').map((q) => `<option${q === v ? ' selected' : ''}>${esc(q)}</option>`).join('') }) : Object.assign(document.createElement('input'), { type: t === 'number' || t === 'scenline' ? 'number' : t === 'date' ? 'date' : 'text', value: v });
  if (el.type === 'number') el.step = 'any';
  el.className = 'pb-in'; el.setAttribute('aria-label', `${b.dataset.c} ${b.dataset.i} ${b.dataset.f}`);
  let done = false; const finish = (ok) => { if (done) return; done = true; if (ok && el.value !== v) commit(b, el.value); else render(); };
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.stopPropagation(); finish(false); } });
  el.addEventListener('blur', () => finish(true)); if (t === 'select') el.addEventListener('change', () => finish(true));
  b.replaceWith(el); el.focus(); if (el.select) el.select();
}
const PREFIX = { expenses: 'EX', customers: 'CU', partners: 'PA', allocations: 'AL', opportunities: 'FO-U', anomalies: 'AN' };
function addRecord(c, data) {
  const now = new Date().toISOString();
  if (!store.who.trim() && c !== 'hoursLog') throw new Error('Enter your name first: "Your changes" at the top right.');
  const all = [...(seed[c] || []), ...(store.added[c] || [])];
  const rec = { ...data, by: store.who || 'not stated', at: now };
  if (c === 'evidence' || c === 'reviews') { rec.id = String(rec.id || '').trim().toUpperCase(); if (!/^[A-Z0-9][A-Z0-9-]*$/.test(rec.id)) throw new Error('An id of letters, digits and dashes is needed.'); if (all.some((r) => r.id === rec.id && !(store.removed[c] || []).includes(r.id))) throw new Error(`${rec.id} is already on record.`); }
  else if (c === 'hoursLog') { rec.id = `HL-${String(all.length + 1).padStart(3, '0')}-${now.slice(11, 19).replace(/:/g, '')}`; rec.week = Number(rec.week); rec.hours = Number(rec.hours); if (!(rec.hours > 0) || !(rec.week >= 1)) throw new Error('Hours above zero and a week from 1 are needed.'); }
  else rec.id = `${PREFIX[c]}-${String(all.length + 1).padStart(3, '0')}`;
  if (c !== 'hoursLog') for (const k of ['amount', 'value', 'week']) if (rec[k] !== undefined) rec[k] = rec[k] === '' ? null : Number(rec[k]);
  if (c === 'reviews') {
    rec.evidence = String(rec.evidence).split(/[,;\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    const known = new Set(m.evidence.map((e) => e.id)); const bad = rec.evidence.filter((e) => !known.has(e)); if (bad.length) throw new Error(`Not on record as evidence: ${bad.join(', ')}.`);
    if (rec.approvedBy) { const a = { by: rec.approvedBy, date: rec.date, decision: 'Approved' }; const ok = C.validApproval(a); if (!ok.ok) throw new Error('Approval: ' + ok.problems.join('; ') + '.'); rec.approval = a; } delete rec.approvedBy;
  }
  if (c === 'customers') rec.lost = false;
  if (c === 'opportunities') Object.assign(rec, { stage: 'Identified', amountRequested: null, amountAttainable: null, probability: null, probabilityBasis: null, eligibility: 'Not checked', owner: 'C', amountReceived: null, receivedDate: null, verified: false, status: 'Planning Estimate', deadline: rec.deadline || null, sourceUrl: rec.sourceUrl || null, note: 'Added by ' + store.who });
  if (c === 'allocations') { const chk = P.allocationCheck([...m.allocations, rec], m.expenses, m.hoursLog || []); if (!chk.ok) throw new Error('Not added. ' + chk.problems[chk.problems.length - 1].text + '.'); }
  store.added[c] = [...(store.added[c] || []), rec];
  if (store.removed[c]) store.removed[c] = store.removed[c].filter((id) => id !== rec.id);
  record('added', c, rec.id, null, null, rec); render();
}
const taskColl = (id) => ['tasks', 'bTasks', 'fTasks'].find((c) => m[c].some((t) => t.id === id));
function go(k) { ui.tab = k; ui.task = null; ui.wsub = 0; ui.sub = ''; ui.panel = null; history.replaceState(null, '', '#' + k); render(false); scrollTo(0, Math.max(0, app.offsetTop - 80)); const h = $('.pb-h2', app); if (h) h.focus({ preventScroll: true }); }

/* ------------------------------------------------------------------ events */

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab],[data-open],[data-task],[data-part],[data-sort],[data-csv],[data-act],[data-del],[data-zoom],[data-depth],[data-wsub],[data-seg],[data-chip],.pb-ed,a[href^="#"]'); if (!t) return;
  if (t.dataset.tab) { e.preventDefault(); return go(t.dataset.tab); }
  if (t.matches('a[href^="#"]') && !t.dataset.tab) { const k = t.getAttribute('href').slice(1); if (DEF.tabs.some((q) => q.k === k)) { e.preventDefault(); return go(k); } return; }
  if (t.classList.contains('pb-ed')) return editCell(t);
  if (t.dataset.depth) { if (t.disabled) return; ui.working = t.dataset.depth === 'working'; ui.wsub = 0; ui.task = null; write(DEPTH, ui.working ? 'working' : 'brief', sessionStorage); return render(false); }
  if (t.dataset.wsub) { ui.wsub = Number(t.dataset.wsub); ui.task = null; return render(false); }
  if (t.dataset.seg) { const [key, v] = t.dataset.seg.split('|'); ui[key] = v; return render(); }
  if (t.dataset.chip) { const [key, v] = t.dataset.chip.split('|'); ui[key] = v; return render(); }
  if (t.dataset.open) { const [kind, coll, id] = t.dataset.open.split('|'); ui.panel = { kind, coll, id }; return render(); }
  if (t.dataset.zoom) { ui.zoom = Number(t.dataset.zoom); return render(); }
  if (t.dataset.task) { if (ui.working && !DEF.library) { ui.task = t.dataset.task; render(); const p = $('#pb-task'); if (p) p.scrollIntoView({ block: 'nearest' }); } else { ui.panel = { kind: 'task', coll: taskColl(t.dataset.task), id: t.dataset.task }; render(); } return; }
  if (t.dataset.part) { ui.part = t.dataset.part; render(); const p = $('#pb-part'); if (p) p.scrollIntoView({ block: 'nearest' }); return; }
  if (t.dataset.sort) { const id = t.dataset.sort, col = Number(t.dataset.col); const cur = ui.sort[id]; ui.sort[id] = { col, dir: cur && cur.col === col ? -cur.dir : 1 }; return sortTable(id, col, ui.sort[id].dir); }
  if (t.dataset.csv) return tableCsv(t.dataset.csv);
  if (t.dataset.del) { const c = t.dataset.del; store.removed[c] = [...(store.removed[c] || []), t.dataset.id]; record('removed', c, t.dataset.id, null, null, null); return render(); }
  const act = t.dataset.act;
  if (act === 'close-panel') { ui.panel = null; return render(); }
  if (act === 'close-task') { ui.task = null; return render(); }
  if (act === 'close-part') { ui.part = null; return render(); }
  if (act === 'print') return print();
  if (act === 'print-report') { document.body.classList.add('pb-print-report'); print(); return setTimeout(() => document.body.classList.remove('pb-print-report'), 500); }
  if (act === 'withdraw') { if (confirm(`Withdraw the recorded decision on ${t.dataset.id}?`)) setField(t.dataset.coll || 'gates', t.dataset.id, 'approval', null); return; }
  if (act === 'export') return download(`company-plan-changes-${d.today}.json`, JSON.stringify({ kind: 'product-build-changes', v: 1, dataDate: m.meta.dataDate, savedAt: new Date().toISOString(), ...store }, null, 1), 'application/json');
  if (act === 'reset') { if (confirm('Discard every change made in this browser, including added records and the history? This cannot be undone. Save your changes to a file first if you may want them back.')) { store = { edits: {}, added: {}, removed: {}, log: [], who: store.who }; save(); render(); } return; }
  if (act === 'lock') { write(CODE, null, sessionStorage); location.reload(); }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.panel && seed) { ui.panel = null; render(); } });
app.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('svg [data-task], svg [data-open]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
app.addEventListener('input', (e) => { const f = e.target.dataset.filter; if (f) { ui.filter[f] = e.target.value; filterTable(f, e.target.value); } });
app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.classList.contains('pb-edc')) return setField(t.dataset.c, t.dataset.i, t.dataset.f, t.checked);
  if (t.dataset.uick) { ui[t.dataset.uick] = t.checked; return render(); }
  if (t.dataset.ui) { ui[t.dataset.ui] = t.type === 'number' ? Number(t.value) : t.value; return render(); }
  if (t.id === 'pb-who') { store.who = t.value.trim(); save(); return render(); }
  if (t.id === 'pb-import' && t.files[0]) t.files[0].text().then(async (text) => {
    const s = JSON.parse(text.replace(/^﻿/, '')); if (s.kind !== 'product-build-changes') throw new Error('This is not a file of plan changes.');
    if (await C.verifyLog(s.log || [])) throw new Error('The history in this file does not check out, so it was not loaded.');
    if (!confirm('Load this file? It replaces the changes now in this browser.')) return;
    store = { edits: s.edits || {}, added: s.added || {}, removed: s.removed || {}, log: s.log || [], who: store.who || s.who || '' }; await record('loaded a changes file', null, null, null, null, s.savedAt || null); render();
  }).catch((err) => note(err.message || 'The file could not be read.'));
});
app.addEventListener('submit', (e) => {
  e.preventDefault(); const f = e.target; const data = Object.fromEntries(new FormData(f).entries());
  try {
    if (f.dataset.add) return addRecord(f.dataset.add, data);
    if (f.dataset.approve) {
      const coll = f.dataset.coll || 'gates'; const g = C.gates({ tasks: coll === 'gates' ? m.tasks : m.bTasks, evidence: m.evidence, gates: m[coll] }).rows.find((q) => q.id === f.dataset.approve);
      const a = { by: data.by.trim(), date: data.date, decision: data.decision, note: (data.note || '').trim() };
      const ok = C.validApproval(a); if (!ok.ok) throw new Error(ok.problems.join('; ') + '.');
      if (a.decision !== 'No-go' && !g.canApprove) throw new Error(`${g.id} cannot be given a go yet: ${g.missing.map((q) => q.text).join('; ')}.`);
      setField(coll, g.id, 'approval', a);
    }
  } catch (err) { note(err.message); }
});
addEventListener('hashchange', () => { if (seed && fromHash()) render(false); });
start();
