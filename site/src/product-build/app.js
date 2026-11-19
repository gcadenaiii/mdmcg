/* Product Build: the page's controller. Opens the encrypted data with the access code, keeps a person's changes apart from
   that data (in this browser), works every figure out again after each change, and draws the section in view.
   This file is public and holds no internal figure. */
import * as C from './calc.js';
import { unlock, WrongCode } from './crypto.js';
import { TABS, esc } from './views.js';

const KEY = 'pb:v1', CODE = 'pb:code';
const $ = (s, r = document) => r.querySelector(s);
const gate = $('#pb-gate'), app = $('#pb-app'), msg = $('#pb-msg'), form = $('#pb-form');
let seed = null, envelope = null, d = null, m = null;
let store = { edits: {}, added: {}, removed: {}, log: [], who: '' };
const ui = { tab: 'A', task: null, part: null, partFn: '', toolCat: '', stdTopic: '', riskKind: '', reportWeek: null, sort: {}, filter: {} };

const read = (k, where = localStorage) => { try { return where.getItem(k); } catch { return null; } };
const write = (k, v, where = localStorage) => { try { v == null ? where.removeItem(k) : where.setItem(k, v); return true; } catch { return false; } };
function load() { try { const s = JSON.parse(read(KEY) || 'null'); if (s && typeof s === 'object') store = { edits: s.edits || {}, added: s.added || {}, removed: s.removed || {}, log: s.log || [], who: s.who || '' }; } catch { /* a damaged store is ignored, never guessed at */ } }
function save() { if (!write(KEY, JSON.stringify(store))) note('Your change is shown but could not be stored in this browser. Save your changes to a file under Records.'); }
function note(text) { const n = $('#pb-toast'); if (!n) return; n.textContent = text; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(() => { n.hidden = true; }, 7000); }

/* ------------------------------------------------------------------ open */

async function open(code, quiet) {
  try {
    msg.textContent = 'Opening…';
    seed = await unlock(envelope, code);
    write(CODE, code, sessionStorage);
    load();
    gate.hidden = true; app.hidden = false;
    const h = location.hash.slice(1).toUpperCase(); if (TABS.some((t) => t[0] === h)) ui.tab = h;
    render(); checkLog();
  } catch (e) {
    write(CODE, null, sessionStorage);
    msg.textContent = quiet ? 'Enter the access code to open this workspace.' : e instanceof WrongCode ? e.message : 'The workspace could not be opened in this browser.';
    if (!quiet) { const i = $('#pb-code'); i.value = ''; i.focus(); }
  }
}
async function start() {
  try { envelope = await (await fetch(new URL('payload.json', location.href), { cache: 'no-store' })).json(); } catch { msg.textContent = 'The workspace data could not be loaded.'; return; }
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
  const sched = C.schedule(m.program, tasks, today);
  const load_ = C.resourceLoad(m.program, m.roles, tasks, sched);
  const bud = C.budget(m.program, m.roles, m.lines);
  const spend = C.weeklySpend(m.program, m.roles, tasks, m.lines, sched, log);
  const nowWeek = C.weekOf(m.program, today);
  const upto = Math.min(Math.max(nowWeek, 0), spend.length);
  const scenarios = m.scenarios.map((s) => { const prog = { ...m.program, durationWeeks: s.durationWeeks || m.program.durationWeeks }; return { ...s, b: C.budget(m.program, m.roles, m.lines, s), endDate: C.schedule(prog, tasks).endDate }; });
  let status = 'On plan', statusWhy = 'no task is overdue or pushed later';
  if (today < m.program.startDate) { status = 'Not started'; statusWhy = `the program starts on ${m.program.startDate}`; }
  if (sched.overdue.length || sched.slipped.length || sched.errors.length || sched.endWeek > m.program.durationWeeks || load_.conflicts.length) { status = 'At risk'; statusWhy = [sched.overdue.length && `${sched.overdue.length} overdue`, sched.slipped.length && `${sched.slipped.length} pushed later`, load_.conflicts.length && `${load_.conflicts.length} overloaded weeks`, sched.endWeek > m.program.durationWeeks && 'the schedule runs past the program', sched.errors.length && 'schedule errors'].filter(Boolean).join(', '); }
  let changes = 0; for (const c of Object.values(store.edits)) for (const rec of Object.values(c)) changes += Object.keys(rec).length;
  for (const a of Object.values(added)) changes += a.length;
  d = { today, nowWeek, sched, load: load_, bud, spend, scenarios, status, statusWhy, gates: C.gates(m), trace: C.traceability(m), stack: C.stackCost(m.stack, m.tools), bom: C.bomHealth(m.parts), bomCost: [1, 10, 100, 1000].map((q) => C.bomCost(m.parts, q)),
    spendActual: spend.length ? spend[spend.length - 1].cumActual : 0, spendPlanned: upto ? spend[upto - 1].cumPlanned : 0, conflicts: r.conflicts, orphans: r.orphans, changes, logOk: d ? d.logOk : null };
}
const mine = (c, id, f, k) => { const e = store.edits[c] && store.edits[c][id]; if (!e || !e[f]) return false; if (k == null) return true; const b = e[f].base || {}, v = e[f].value || {}; return JSON.stringify(c === 'scenarios' && f === 'lines' ? (b[k] || null) : b[k]) !== JSON.stringify(v[k]); };

/* ------------------------------------------------------------------ draw */

function render(keepScroll = true) {
  const y = scrollY;
  derive();
  const x = { m, d, ui, store, mine };
  const tab = TABS.find((t) => t[0] === ui.tab) || TABS[0];
  app.innerHTML = `<div class="wrap">
    <nav class="pb-tabs" aria-label="Sections"><ul>${TABS.map(([k, n]) => `<li><a href="#${k}"${k === tab[0] ? ' aria-current="page"' : ''} data-tab="${k}"><b>${k}</b>${esc(n)}</a></li>`).join('')}</ul></nav>
    <div class="pb-head"><h2 class="pb-h2" tabindex="-1">${tab[0]}. ${esc(tab[1])}</h2><p class="pb-meta">${esc(m.program.name)} · data of ${esc(m.meta.dataDate)} · ${d.changes} change${d.changes === 1 ? '' : 's'} of yours</p></div>
    <div class="pb-body" data-tabbody="${tab[0]}">${tab[2](x)}</div>
    <p class="pb-toast" id="pb-toast" role="status" aria-live="polite" hidden></p></div>`;
  enhance();
  if (keepScroll) scrollTo(0, y);
}
/** after drawing: put back each table's filter and sort */
function enhance() {
  for (const [id, text] of Object.entries(ui.filter)) { const i = app.querySelector(`[data-filter="${id}"]`); if (i && text) { i.value = text; filterTable(id, text); } }
  for (const [id, s] of Object.entries(ui.sort)) sortTable(id, s.col, s.dir);
}
function filterTable(id, text) {
  const t = $(`#t-${CSS.escape(id)}`); if (!t) return; const q = text.trim().toLowerCase();
  for (const tr of t.tBodies[0].rows) tr.hidden = !!q && !tr.textContent.toLowerCase().includes(q);
}
function sortTable(id, col, dir) {
  const t = $(`#t-${CSS.escape(id)}`); if (!t || !t.tBodies[0]) return;
  const val = (tr) => { const c = tr.cells[col]; if (!c) return ''; const s = c.textContent.trim(); const n = Number(s.replace(/[$,%\s]/g, '')); return s !== '' && !Number.isNaN(n) ? n : s.toLowerCase(); };
  const rows = [...t.tBodies[0].rows].filter((r) => !r.classList.contains('pb-empty'));
  rows.sort((a, b) => { const p = val(a), q = val(b); const r = typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q), undefined, { numeric: true }); return dir * r; });
  for (const r of rows) t.tBodies[0].appendChild(r);
  t.querySelectorAll('.pb-sort').forEach((b, i) => b.parentElement.setAttribute('aria-sort', i === col ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
}
function tableCsv(id) {
  const t = $(`#t-${CSS.escape(id)}`); if (!t) return;
  const cellText = (c) => { const i = c.querySelector('input[type=checkbox]'); return i ? (i.checked ? 'yes' : 'no') : c.innerText.replace(/\s*\n\s*/g, '; ').trim(); };
  const head = [...t.tHead.rows[0].cells].map(cellText);
  const rows = [...t.tBodies[0].rows].filter((r) => !r.hidden && !r.classList.contains('pb-empty')).concat(t.tFoot ? [...t.tFoot.rows] : []).map((r) => [...r.cells].map(cellText));
  download(`product-build-${(t.dataset.name || id).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${d.today}.csv`, C.toCsv(rows.map((r) => Object.fromEntries(r.map((v, i) => [i, v]))), head.map((h, i) => ({ key: String(i), label: h }))), 'text/csv');
}
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: type + ';charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

/* ------------------------------------------------------------------ change */

async function record(action, collection, id, field, from, to) {
  store.log = await C.appendEvent(store.log, { at: new Date().toISOString(), who: store.who || 'not stated', action, collection, id, field, from, to });
  save(); checkLog();
}
async function checkLog() { const r = await C.verifyLog(store.log); if (d) { d.logOk = r; const b = app.querySelector('[data-tabbody="L"]'); if (b) render(); } }

/** set one field of one record (k = a key inside an object field) */
function setField(c, id, f, value, k) {
  const coll = m[c]; const rec = Array.isArray(coll) ? coll.find((r) => r.id === id) : coll; if (!rec) return;
  const from = k != null ? (rec[f] || {})[k] : rec[f];
  let next = value;
  if (k != null) next = c === 'scenarios' && f === 'lines' ? { ...(rec[f] || {}), [k]: { ...((rec[f] || {})[k] || {}), amount: value } } : { ...(rec[f] || {}), [k]: value };
  const inAdded = (store.added[c] || []).find((r) => r.id === id);
  if (inAdded) inAdded[f] = next; else store.edits = C.setEdit(store.edits, seed, c, Array.isArray(seed[c]) ? id : '_', f, next, new Date().toISOString());
  record('changed', c, id, k != null ? `${f}.${k}` : f, from, value);
  render();
}
function parse(t, raw) {
  if (t === 'number') { if (String(raw).trim() === '') return null; const n = Number(raw); if (Number.isNaN(n) || n < 0) throw new Error('A number of zero or more is needed.'); return n; }
  if (t === 'scenline') { const n = Number(raw); if (String(raw).trim() === '' || Number.isNaN(n) || n < 0) throw new Error('An amount of zero or more is needed.'); return n; }
  if (t === 'date') { if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error('A date is needed.'); return raw || null; }
  if (t === 'deps') return C.parseDeps(raw);
  return String(raw).trim();
}
const LIMITS = { 'program.durationWeeks': [1, 104], 'program.contingencyPct': [0, 100], 'tasks.percent': [0, 100], 'tasks.week': [1, 104], 'tasks.weeks': [1, 104], 'roles.weeklyHours': [0, 80], 'risks.severity': [1, 5], 'risks.probability': [1, 5], 'risks.residualSeverity': [1, 5], 'risks.residualProbability': [1, 5], 'scenarios.durationWeeks': [1, 104], 'scenarios.contingencyPct': [0, 100], 'scenarios.weeklyHours': [0, 80], 'stack.months': [0, 60], 'lines.week': [1, 104], 'lines.actualWeek': [1, 104] };
function commit(b, raw) {
  const { c, i, f, t, k } = b.dataset;
  try {
    const v = parse(t, raw); const lim = LIMITS[`${c}.${f}`];
    if (lim && v != null && (v < lim[0] || v > lim[1])) throw new Error(`A value from ${lim[0]} to ${lim[1]} is needed.`);
    if (lim && v == null && !['lines.week', 'lines.actualWeek'].includes(`${c}.${f}`)) throw new Error('A value is needed.');
    if (c === 'program' && f === 'startDate' && !v) throw new Error('A start date is needed.');
    if (t === 'deps') { const ids = new Set(m.tasks.map((q) => q.id)); for (const dep of v) { if (!ids.has(dep.id)) throw new Error(`${dep.id} is not a task.`); if (dep.id === i) throw new Error('A task cannot depend on itself.'); } }
    if (c === 'decisions' && f === 'decidedBy' && v) { const ok = C.validApproval({ by: v, date: '2000-01-01', decision: 'Approved' }); if (!ok.ok) throw new Error(ok.problems[0]); }
    setField(c, i, f, v, k);
  } catch (e) { render(); note(e.message); }
}
function editCell(b) {
  const { t, v, o } = b.dataset;
  const el = t === 'select' ? Object.assign(document.createElement('select'), { innerHTML: o.split('|').map((x) => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('') }) : Object.assign(document.createElement('input'), { type: t === 'number' || t === 'scenline' ? 'number' : t === 'date' ? 'date' : 'text', value: v });
  if (el.type === 'number') el.step = 'any';
  el.className = 'pb-in'; Object.assign(el.dataset, b.dataset); el.setAttribute('aria-label', `${b.dataset.c} ${b.dataset.i} ${b.dataset.f}`);
  let done = false; const finish = (ok) => { if (done) return; done = true; if (ok && el.value !== v) commit(b, el.value); else render(); };
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') finish(false); });
  el.addEventListener('blur', () => finish(true)); if (t === 'select') el.addEventListener('change', () => finish(true));
  b.replaceWith(el); el.focus(); if (el.select) el.select();
}
function addRecord(c, data) {
  const now = new Date().toISOString();
  if (!store.who.trim() && ['evidence', 'reviews'].includes(c)) throw new Error('Enter your name under Records before adding a record.');
  const list = [...(seed[c] || []), ...(store.added[c] || [])];
  const rec = { ...data, by: store.who || 'not stated', at: now };
  if (c === 'hoursLog') { rec.id = `HL-${String(list.length + 1).padStart(3, '0')}-${now.slice(11, 19).replace(/:/g, '')}`; rec.week = Number(rec.week); rec.hours = Number(rec.hours); if (!(rec.hours > 0) || !(rec.week >= 1)) throw new Error('Hours above zero and a week from 1 are needed.'); }
  if (c === 'anomalies') rec.id = `AN-${String(list.length + 1).padStart(3, '0')}`;
  if (c === 'evidence' || c === 'reviews') {
    rec.id = String(rec.id || '').trim().toUpperCase(); if (!/^[A-Z0-9][A-Z0-9-]*$/.test(rec.id)) throw new Error('An id of letters, digits and dashes is needed.');
    if (list.some((r) => r.id === rec.id && !(store.removed[c] || []).includes(r.id))) throw new Error(`${rec.id} is already on record.`);
  }
  if (c === 'reviews') {
    rec.evidence = String(rec.evidence).split(/[,;\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    const known = new Set(m.evidence.map((e) => e.id)); const bad = rec.evidence.filter((e) => !known.has(e)); if (bad.length) throw new Error(`Not on record as evidence: ${bad.join(', ')}.`);
    if (rec.approvedBy) { const a = { by: rec.approvedBy, date: rec.date, decision: 'Approved' }; const ok = C.validApproval(a); if (!ok.ok) throw new Error('Approval: ' + ok.problems.join('; ') + '.'); rec.approval = a; }
    delete rec.approvedBy;
  }
  store.added[c] = [...(store.added[c] || []), rec];
  if (store.removed[c]) store.removed[c] = store.removed[c].filter((id) => id !== rec.id);
  record('added', c, rec.id, null, null, rec); render();
}

/* ------------------------------------------------------------------ events */

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab],[data-task],[data-part],[data-sort],[data-csv],[data-act],[data-del],.pb-ed'); if (!t) return;
  if (t.dataset.tab) { e.preventDefault(); ui.tab = t.dataset.tab; history.replaceState(null, '', '#' + ui.tab); render(false); scrollTo(0, app.offsetTop - 80); const h = $('.pb-h2', app); if (h) h.focus({ preventScroll: true }); return; }
  if (t.classList.contains('pb-ed')) return editCell(t);
  if (t.dataset.task) { ui.task = t.dataset.task; if (ui.tab !== 'B') ui.tab = 'B'; render(); const p = $('#pb-task'); if (p) p.scrollIntoView({ block: 'nearest' }); return; }
  if (t.dataset.part) { ui.part = t.dataset.part; render(); const p = $('#pb-part'); if (p) p.scrollIntoView({ block: 'nearest' }); return; }
  if (t.dataset.sort) { const id = t.dataset.sort, col = Number(t.dataset.col); const cur = ui.sort[id]; ui.sort[id] = { col, dir: cur && cur.col === col ? -cur.dir : 1 }; return sortTable(id, col, ui.sort[id].dir); }
  if (t.dataset.csv) return tableCsv(t.dataset.csv);
  if (t.dataset.del) { const c = t.dataset.del, id = t.dataset.id; store.removed[c] = [...(store.removed[c] || []), id]; record('removed', c, id, null, null, null); return render(); }
  const act = t.dataset.act;
  if (act === 'close-task') { ui.task = null; return render(); }
  if (act === 'close-part') { ui.part = null; return render(); }
  if (act === 'print') return print();
  if (act === 'print-report') { document.body.classList.add('pb-print-report'); print(); return setTimeout(() => document.body.classList.remove('pb-print-report'), 500); }
  if (act === 'withdraw') { const g = m.gates.find((q) => q.id === t.dataset.id); if (g && confirm(`Withdraw the recorded decision on ${g.id}?`)) setField('gates', g.id, 'approval', null); return; }
  if (act === 'export') return download(`product-build-changes-${d.today}.json`, JSON.stringify({ kind: 'product-build-changes', v: 1, dataDate: m.meta.dataDate, savedAt: new Date().toISOString(), ...store }, null, 1), 'application/json');
  if (act === 'reset') { if (confirm('Discard every change made in this browser, including added records and the history? This cannot be undone. Save your changes to a file first if you may want them back.')) { store = { edits: {}, added: {}, removed: {}, log: [], who: store.who }; save(); render(); } return; }
  if (act === 'lock') { write(CODE, null, sessionStorage); location.reload(); }
});
app.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('svg [data-task]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
app.addEventListener('input', (e) => { const f = e.target.dataset.filter; if (f) { ui.filter[f] = e.target.value; filterTable(f, e.target.value); } });
app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.classList.contains('pb-edc')) return setField(t.dataset.c, t.dataset.i, t.dataset.f, t.checked);
  if (t.dataset.ui) { ui[t.dataset.ui] = t.type === 'number' ? Number(t.value) : t.value; return render(); }
  if (t.id === 'pb-who') { store.who = t.value.trim(); save(); return render(); }
  if (t.id === 'pb-import' && t.files[0]) t.files[0].text().then(async (text) => {
    const s = JSON.parse(text); if (s.kind !== 'product-build-changes') throw new Error('This is not a file of Product Build changes.');
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
      const g = d.gates.rows.find((q) => q.id === f.dataset.approve); const a = { by: data.by.trim(), date: data.date, decision: data.decision, note: data.note.trim() };
      const ok = C.validApproval(a); if (!ok.ok) throw new Error(ok.problems.join('; ') + '.');
      if (a.decision !== 'No-go' && !g.canApprove) throw new Error(`${g.id} cannot be given a go yet: ${g.missing.map((q) => q.text).join('; ')}.`);
      setField('gates', g.id, 'approval', a);
    }
  } catch (err) { note(err.message); }
});
addEventListener('hashchange', () => { const h = location.hash.slice(1).toUpperCase(); if (seed && TABS.some((t) => t[0] === h) && h !== ui.tab) { ui.tab = h; render(false); } });

start();
