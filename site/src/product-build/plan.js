/* Company plan: the controller for the Company Strategy, Battery and Funding pages. It opens the same encrypted data as
   the ECG/MCG Product Build page with the same access code, and keeps a person's changes in the same store, so the four
   pages are one plan. Public code, no figures. */
import * as C from './calc.js';
import * as P from './portfolio.js';
import { unlock, WrongCode } from './crypto.js';
import { esc } from './views.js';
import { AREAS, planNav } from './plan-views.js';

const KEY = 'pb:v1', CODE = 'pb:code';
const $ = (s, r = document) => r.querySelector(s);
const gate = $('#pb-gate'), app = $('#pb-app'), msg = $('#pb-msg'), form = $('#pb-form');
const AREA = app.dataset.area; const DEF = AREAS[AREA];
let seed = null, envelope = null, d = null, m = null;
let store = { edits: {}, added: {}, removed: {}, log: [], who: '' };
const ui = { tab: '1', task: null, zoom: 16, revenue: false, volume: 25, sort: {}, filter: {} };

const read = (k, w = localStorage) => { try { return w.getItem(k); } catch { return null; } };
const write = (k, v, w = localStorage) => { try { v == null ? w.removeItem(k) : w.setItem(k, v); return true; } catch { return false; } };
function load() { try { const s = JSON.parse(read(KEY) || 'null'); if (s && typeof s === 'object') store = { edits: s.edits || {}, added: s.added || {}, removed: s.removed || {}, log: s.log || [], who: s.who || '' }; } catch { /* a damaged store is ignored */ } }
function save() { if (!write(KEY, JSON.stringify(store))) note('Your change is shown but could not be stored in this browser.'); }
function note(text) { const n = $('#pb-toast'); if (!n) return; n.textContent = text; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(() => { n.hidden = true; }, 7000); }

async function open(code, quiet) {
  try {
    msg.textContent = 'Opening…';
    seed = await unlock(envelope, code);
    write(CODE, code, sessionStorage); load();
    gate.hidden = true; app.hidden = false;
    const h = location.hash.slice(1); if (DEF.tabs.some((t) => t[0] === h)) ui.tab = h;
    render(false);
    if (location.hash.startsWith('#dec-')) { ui.tab = '5'; render(false); const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
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
  m = r.model;
  const today = new Date().toISOString().slice(0, 10);
  const scheds = P.schedules(m, today);
  const loadAll = P.portfolioLoad(m, scheds);
  const byProgram = Object.fromEntries(scheds.map((s) => [s.id, { ...s, next: s.sched.rows.filter((q) => q.milestone && q.percent < 100 && q.finishDate >= today)[0] || s.sched.rows.filter((q) => q.milestone)[0] || null }]));
  const bat = scheds.find((s) => s.id === 'battery');
  const bPart = { needs: m.bNeeds, requirements: m.bRequirements, outputs: m.bOutputs, risks: m.bRisks, tests: m.bTests, evidence: m.evidence, reviews: m.reviews, gates: m.bGates, tasks: m.bTasks, anomalies: (m.anomalies || []).filter((a) => a.program === 'battery') };
  const econ = P.VOLUMES.map((v) => P.unitEconomics(m.bEconomics, v));
  const bBudget = P.programBudget(m, bat);
  const bScen = m.bScenarios.map((sc) => { const prog = { ...m.bProgram, durationWeeks: sc.durationWeeks || m.bProgram.durationWeeks, contingencyPct: sc.contingencyPct ?? m.bProgram.contingencyPct }; const s = C.schedule(prog, m.bTasks); const b = P.programBudget(m, { ...bat, program: prog }); return { ...sc, weeks: s.endWeek, endDate: s.endDate, labour: b.labour, total: b.total }; });
  d = { today, scheds, byProgram, load: loadAll, budget: P.portfolioBudget(m), bBudget, bScen, monthly: P.monthly(m, scheds, loadAll), pipe: P.pipeline(m.opportunities), dl: P.deadlines(m.opportunities, today),
    funnel: P.funnel(m.customers, m.funnelTargets), econ, econUnset: (m.bEconomics.unset || []).filter((k) => !Number(m.bEconomics[k])).length, sens: P.sensitivity(m.bEconomics, 25),
    readB: P.readiness(bPart), readE: P.readiness({ needs: m.needs, requirements: m.requirements, outputs: m.outputs, risks: m.risks, tests: m.tests, evidence: m.evidence, reviews: m.reviews, gates: m.gates, tasks: m.tasks, anomalies: (m.anomalies || []).filter((a) => a.program !== 'battery') }),
    bTrace: C.traceability(bPart), decisions: P.decisionQueue(m.execDecisions, today), realloc: m.reallocations.map((s) => P.reallocate(m, s, today)), alloc: P.allocationCheck(m.allocations, m.expenses, m.hoursLog || []), conflicts: r.conflicts };
  let changes = 0; for (const c of Object.values(store.edits)) for (const rec of Object.values(c)) changes += Object.keys(rec).length; for (const a of Object.values(added)) changes += a.length; d.changes = changes;
}
const mine = (c, id, f, k) => { const e = store.edits[c] && store.edits[c][id]; if (!e || !e[f]) return false; if (k == null) return true; return JSON.stringify((e[f].base || {})[k]) !== JSON.stringify((e[f].value || {})[k]); };

function render(keep = true) {
  const y = scrollY; derive();
  const x = { m, d, ui, store, mine };
  const tab = DEF.tabs.find((t) => t[0] === ui.tab) || DEF.tabs[0];
  app.innerHTML = `<div class="wrap">${planNav(AREA)}
    <nav class="pb-tabs" aria-label="Sections"><ul>${DEF.tabs.map(([k, n]) => `<li><a href="#${k}"${k === tab[0] ? ' aria-current="page"' : ''} data-tab="${k}"><b>${k}</b>${esc(n)}</a></li>`).join('')}</ul></nav>
    <div class="pb-head"><h2 class="pb-h2" tabindex="-1">${esc(tab[1])}</h2><p class="pb-meta">${esc(DEF.title)} · data of ${esc(m.meta.dataDate)} · ${d.changes} change${d.changes === 1 ? '' : 's'} of yours · <button type="button" class="pb-link" data-act="print">print</button> · <a href="/product-build/#L">your name, saved changes and history</a></p></div>
    <div class="pb-body pl-body">${tab[2](x)}</div>
    <p class="pb-toast" id="pb-toast" role="status" aria-live="polite" hidden></p></div>`;
  for (const [id, text] of Object.entries(ui.filter)) { const i = app.querySelector(`[data-filter="${id}"]`); if (i && text) { i.value = text; filterTable(id, text); } }
  for (const [id, s] of Object.entries(ui.sort)) sortTable(id, s.col, s.dir);
  if (keep) scrollTo(0, y);
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
function tableCsv(id) {
  const t = $(`#t-${CSS.escape(id)}`); if (!t) return;
  const text = (c) => { const i = c.querySelector('input[type=checkbox]'); return i ? (i.checked ? 'yes' : 'no') : c.innerText.replace(/\s*\n\s*/g, '; ').trim(); };
  const head = [...t.tHead.rows[0].cells].map(text);
  const rows = [...t.tBodies[0].rows].filter((r) => !r.hidden && !r.classList.contains('pb-empty')).concat(t.tFoot ? [...t.tFoot.rows] : []).map((r) => [...r.cells].map(text));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + C.toCsv(rows.map((r) => Object.fromEntries(r.map((v, i) => [i, v]))), head.map((h, i) => ({ key: String(i), label: h })))], { type: 'text/csv;charset=utf-8' }));
  a.download = `company-plan-${(t.dataset.name || id).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${d.today}.csv`; document.body.appendChild(a); a.click(); a.remove();
}

/* ------------------------------------------------------------------ change */

/* History entries are added one after another: each needs the hash of the one before, so two changes made close together
   must not be hashed at the same time. The change itself is saved at once; its history entry follows in order. */
let logQueue = Promise.resolve();
function record(action, collection, id, field, from, to) {
  const copy = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));   // a copy, so a later edit of the record cannot alter this entry
  const event = { at: new Date().toISOString(), who: store.who || 'not stated', action, collection, id, field, from: copy(from), to: copy(to) };
  save();
  logQueue = logQueue.then(async () => { store.log = await C.appendEvent(store.log, event); save(); });
  return logQueue;
}
function setField(c, id, f, value, k) {
  const coll = m[c]; const isList = Array.isArray(coll);
  const rec = isList ? coll.find((r) => (r.id ?? r.item) === id) : coll; if (!rec) return;
  const from = k != null ? (rec[f] || {})[k] : rec[f];
  const next = k != null ? { ...(rec[f] || {}), [k]: value } : value;
  const inAdded = (store.added[c] || []).find((r) => r.id === id);
  if (inAdded) inAdded[f] = next;
  else if (isList && seed[c].every((r) => r.id == null)) { /* a list keyed by its text (the investor checklist): keep the change under that text */ const s2 = { ...seed, [c]: seed[c].map((r) => ({ ...r, id: r.item })) }; store.edits = C.setEdit(store.edits, s2, c, id, f, next, new Date().toISOString()); }
  else store.edits = C.setEdit(store.edits, seed, c, isList ? id : '_', f, next, new Date().toISOString());
  record('changed', c, id, k != null ? `${f}.${k}` : f, from, value); render();
}
const LIMITS = { durationWeeks: [1, 156], contingencyPct: [0, 100], percent: [0, 100], week: [1, 156], weeks: [1, 156], severity: [1, 5], probability: [0, 100], residualSeverity: [1, 5], residualProbability: [1, 5], distributorSharePct: [0, 100], distributorMarginPct: [0, 100], warrantyPct: [0, 100], attachPct: [0, 100] };
function commit(b, raw) {
  const { c, i, f, t, k } = b.dataset;
  try {
    let v;
    if (t === 'number') { if (String(raw).trim() === '') v = null; else { v = Number(raw); if (Number.isNaN(v) || v < 0) throw new Error('A number of zero or more is needed.'); } }
    else if (t === 'date') { if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('A date is needed.'); v = raw || null; }
    else if (t === 'deps') { v = C.parseDeps(raw); const ids = new Set(m[c].map((q) => q.id)); for (const dep of v) { if (!ids.has(dep.id)) throw new Error(`${dep.id} is not a task of this plan.`); if (dep.id === i) throw new Error('A task cannot depend on itself.'); } }
    else v = String(raw).trim();
    const lim = LIMITS[f]; const riskProb = f === 'probability' && /Risks$/.test(c);
    if (lim && v != null) { const [lo, hi] = riskProb ? [1, 5] : lim; if (v < lo || v > hi) throw new Error(`A value from ${lo} to ${hi} is needed.`); }
    if (['durationWeeks', 'week', 'weeks', 'percent', 'severity'].includes(f) && v == null && !/Lines$/.test(c)) throw new Error('A value is needed.');
    if (f === 'startDate' && !v) throw new Error('A start date is needed.');
    if (f === 'decidedBy' && v) { const ok = C.validApproval({ by: v, date: '2000-01-01', decision: 'Approved' }); if (!ok.ok) throw new Error(ok.problems[0]); }
    if (c === 'opportunities' && f === 'stage' && v === 'Cash received') { const o = m.opportunities.find((q) => q.id === i); if (!(Number(o.amountReceived) > 0) || !o.receivedDate) throw new Error('Enter the amount received and its date before moving this to "Cash received".'); }
    if (c === 'opportunities' && f === 'probability' && v != null) { const o = m.opportunities.find((q) => q.id === i); if (!o.probabilityBasis) throw new Error('Enter the basis of the probability first: a probability needs its reason.'); }
    setField(c, i, f, v, k);
  } catch (e) { render(); note(e.message); }
}
function editCell(b) {
  const { t, v, o } = b.dataset;
  const el = t === 'select' ? Object.assign(document.createElement('select'), { innerHTML: o.split('|').map((q) => `<option${q === v ? ' selected' : ''}>${esc(q)}</option>`).join('') }) : Object.assign(document.createElement('input'), { type: t === 'number' ? 'number' : t === 'date' ? 'date' : 'text', value: v });
  if (el.type === 'number') el.step = 'any';
  el.className = 'pb-in'; el.setAttribute('aria-label', `${b.dataset.c} ${b.dataset.i} ${b.dataset.f}`);
  let done = false; const finish = (ok) => { if (done) return; done = true; if (ok && el.value !== v) commit(b, el.value); else render(); };
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') finish(false); });
  el.addEventListener('blur', () => finish(true)); if (t === 'select') el.addEventListener('change', () => finish(true));
  b.replaceWith(el); el.focus(); if (el.select) el.select();
}
const PREFIX = { expenses: 'EX', customers: 'CU', partners: 'PA', allocations: 'AL', opportunities: 'FO-U' };
function addRecord(c, data) {
  const now = new Date().toISOString();
  if (!store.who.trim()) throw new Error('Enter your name first: open "your name, saved changes and history" at the top of this page.');
  const all = [...(seed[c] || []), ...(store.added[c] || [])];
  const rec = { ...data, by: store.who, at: now };
  if (c === 'evidence') { rec.id = String(rec.id || '').trim().toUpperCase(); if (!/^[A-Z0-9][A-Z0-9-]*$/.test(rec.id)) throw new Error('An id of letters, digits and dashes is needed.'); if (all.some((r) => r.id === rec.id && !(store.removed[c] || []).includes(r.id))) throw new Error(`${rec.id} is already on record.`); }
  else rec.id = `${PREFIX[c]}-${String(all.length + 1).padStart(3, '0')}`;
  for (const k of ['amount', 'value', 'week']) if (rec[k] !== undefined) rec[k] = rec[k] === '' ? null : Number(rec[k]);
  if (c === 'customers') rec.lost = false;
  if (c === 'opportunities') Object.assign(rec, { stage: 'Identified', amountRequested: null, amountAttainable: null, probability: null, probabilityBasis: null, eligibility: 'Not checked', owner: 'C', amountReceived: null, receivedDate: null, verified: false, status: 'Planning Estimate', deadline: rec.deadline || null, sourceUrl: rec.sourceUrl || null, note: 'Added by ' + store.who });
  if (c === 'allocations') { const chk = P.allocationCheck([...m.allocations, rec], m.expenses, m.hoursLog || []); if (!chk.ok) throw new Error('Not added. ' + chk.problems[chk.problems.length - 1].text + '.'); }
  store.added[c] = [...(store.added[c] || []), rec];
  record('added', c, rec.id, null, null, rec); render();
}

/* ------------------------------------------------------------------ events */

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab],[data-task],[data-sort],[data-csv],[data-act],[data-del],[data-zoom],.pb-ed'); if (!t) return;
  if (t.dataset.tab) { e.preventDefault(); ui.tab = t.dataset.tab; ui.task = null; history.replaceState(null, '', '#' + ui.tab); render(false); scrollTo(0, app.offsetTop - 80); const h = $('.pb-h2', app); if (h) h.focus({ preventScroll: true }); return; }
  if (t.classList.contains('pb-ed')) return editCell(t);
  if (t.dataset.zoom) { ui.zoom = Number(t.dataset.zoom); return render(); }
  if (t.dataset.task) { ui.task = t.dataset.task; render(); const p = $('#pb-task'); if (p) p.scrollIntoView({ block: 'nearest' }); return; }
  if (t.dataset.sort) { const id = t.dataset.sort, col = Number(t.dataset.col); const cur = ui.sort[id]; ui.sort[id] = { col, dir: cur && cur.col === col ? -cur.dir : 1 }; return sortTable(id, col, ui.sort[id].dir); }
  if (t.dataset.csv) return tableCsv(t.dataset.csv);
  if (t.dataset.del) { const c = t.dataset.del; store.removed[c] = [...(store.removed[c] || []), t.dataset.id]; record('removed', c, t.dataset.id, null, null, null); return render(); }
  if (t.dataset.act === 'close-task') { ui.task = null; return render(); }
  if (t.dataset.act === 'print') return print();
  if (t.dataset.act === 'withdraw') { if (confirm(`Withdraw the recorded decision on ${t.dataset.id}?`)) setField(t.dataset.coll, t.dataset.id, 'approval', null); }
});
app.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('svg [data-task]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
app.addEventListener('input', (e) => { const f = e.target.dataset.filter; if (f) { ui.filter[f] = e.target.value; filterTable(f, e.target.value); } });
app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.classList.contains('pb-edc')) return setField(t.dataset.c, t.dataset.i, t.dataset.f, t.checked);
  if (t.dataset.uick) { ui[t.dataset.uick] = t.checked; return render(); }
  if (t.dataset.ui) { ui[t.dataset.ui] = t.value; return render(); }
});
app.addEventListener('submit', (e) => {
  e.preventDefault(); const f = e.target; const data = Object.fromEntries(new FormData(f).entries());
  try {
    if (f.dataset.add) return addRecord(f.dataset.add, data);
    if (f.dataset.approve) {
      const coll = f.dataset.coll; const g = C.gates({ tasks: m.bTasks, evidence: m.evidence, gates: m[coll] }).rows.find((q) => q.id === f.dataset.approve);
      const a = { by: data.by.trim(), date: data.date, decision: data.decision, note: data.note.trim() };
      const ok = C.validApproval(a); if (!ok.ok) throw new Error(ok.problems.join('; ') + '.');
      if (a.decision !== 'No-go' && !g.canApprove) throw new Error(`${g.id} cannot be given a go yet: ${g.missing.map((q) => q.text).join('; ')}.`);
      setField(coll, g.id, 'approval', a);
    }
  } catch (err) { note(err.message); }
});
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (seed && DEF.tabs.some((t) => t[0] === h) && h !== ui.tab) { ui.tab = h; render(false); } });
start();
