/* Execution Plan 2: funding and partnerships. SERVER SIDE ONLY (see program.js).
   A planning draft of 2026-11-19. No application has been made, no award exists, no investor or partner has committed and
   no cash has been received under this plan. Opportunities come from data/product-build/funding.json (web research with
   sources); an opportunity there is "identified", nothing more, until a person checks eligibility and moves it on.
   No probability is given for any opportunity: none has a basis yet. A person enters one with its reason. */

export const fProgram = {
  id: 'funding', name: 'Funding and partnerships', short: 'Funding',
  startDate: '2026-11-23', baselineWeeks: 26, durationWeeks: 26, contingencyPct: 0, status: 'Planning Estimate',
  objective: 'Bring in cash for the heart device from customers, grants, partners and, where it fits, investors, and show at every moment what is committed and what is only hoped for.',
};
export const fPhases = [
  { id: 'F1', name: 'Foundations: eligibility, materials' },
  { id: 'F3', name: 'Grants and non-dilutive funding' },
  { id: 'F4', name: 'Strategic partnerships' },
  { id: 'F5', name: 'Investment readiness' },
  { id: 'F6', name: 'Cash and capital allocation' },
];
/* hours: B director, C business lead. Estimates. */
const T = (id, phase, title, week, weeks, b, c, deps, more = {}) => ({ id, phase, title, week, weeks, hours: { A: 0, B: b, C: c }, actualHours: { A: 0, B: 0, C: 0 }, deps, percent: 0, owner: c >= b ? 'C' : 'B', status: 'Planning Estimate', approval: 'B', deliverables: [], requirements: [], risks: [], expense: [], evidence: [], ...more });
const M = (id, phase, title, week, deps) => ({ id, phase, title, week, weeks: 0, milestone: true, hours: { A: 0, B: 0, C: 0 }, actualHours: { A: 0, B: 0, C: 0 }, deps, percent: 0, owner: 'B', status: 'Planning Estimate', approval: 'B', deliverables: [], requirements: [], risks: [], expense: [], evidence: [] });
export const fTasks = [
  T('FT-101', 'F1', 'Check eligibility for each program', 1, 2, 4, 6, [], { description: 'Ownership, size, lead investigator employment and registration are checked against each program\'s own rules.', deliverables: ['Eligibility record for each opportunity'] }),
  T('FT-102', 'F1', 'Company overview for investors and partners', 2, 3, 2, 14, [], { deliverables: ['Company overview'] }),
  T('FT-104', 'F1', 'ECG/MCG research and commercialization brief', 4, 2, 2, 10, [{ id: 'FT-102', type: 'SS', lag: 2 }], { deliverables: ['ECG/MCG brief'] }),
  T('FT-105', 'F1', 'Evidence registers: commercial traction and technical milestones', 2, 2, 3, 6, [], { description: 'Only what is on record goes in. Today both registers are nearly empty; that is the honest starting point.', deliverables: ['Traction and pilot evidence register', 'Technical milestone evidence register'] }),
  M('FM-1', 'F1', 'Materials and eligibility ready', 5, ['FT-101', 'FT-104', 'FT-105']),

  T('FT-301', 'F3', 'Grant screening: open programs, dates, fit, cost to apply', 1, 2, 2, 8, [], { deliverables: ['Grant opportunity tracker, checked'] }),
  T('FT-303', 'F3', 'Cardiac application: plan, budget, research partner', 10, 6, 6, 30, ['FM-1', 'FT-301'], { deliverables: ['Cardiac application'] }),
  M('FM-3', 'F3', 'First application submitted', 16, ['FT-303']),

  T('FT-401', 'F4', 'Partner list and outreach: sensor makers, medical and research partners', 4, 10, 3, 24, [{ id: 'FT-102', type: 'SS', lag: 2 }], { deliverables: ['Partner outreach tracker'] }),
  T('FT-402', 'F4', 'Research or clinical partner for the cardiac program', 8, 8, 4, 12, ['FT-104'], { deliverables: ['Partner discussions on record'] }),
  M('FM-4', 'F4', 'First partner agreement in negotiation', 16, ['FT-401']),

  T('FT-501', 'F5', 'Investor preparation checklist and data room', 10, 6, 4, 16, ['FM-1'], { deliverables: ['Investor preparation checklist, completed'] }),
  T('FT-502', 'F5', 'Three-year directional model and risk and sensitivity analysis', 8, 4, 6, 8, ['FT-601'], { deliverables: ['Three-year directional model', 'Risk and sensitivity analysis'] }),
  M('FM-5', 'F5', 'Decision: raise equity or not', 18, ['FT-501', 'FT-502']),

  T('FT-601', 'F6', 'Twelve-month cash flow and runway model', 2, 3, 6, 4, [], { description: 'Needs the cash-on-hand figure (decision ED-04).', deliverables: ['12-month cash-flow and runway model'], owner: 'B' }),
  T('FT-602', 'F6', 'Capital need by program and phase; funding-use plan', 5, 2, 5, 3, ['FT-601'], { deliverables: ['Capital requirement by program and phase', 'Funding-use plan'], owner: 'B' }),
  T('FT-603', 'F6', 'Award budgets and allocation records', 12, 14, 8, 4, ['FT-602'], { description: 'Each award gets its own budget. An expense or an hour is charged to one award only; the allocation check on the page enforces it.', deliverables: ['Award budgets'], owner: 'B' }),
];
/* Costs of the funding work itself. None has a figure: each needs a quotation or a decision. */
const L = (id, title, basis) => ({ id, group: 'Funding program', category: 'external', title, amount: null, kind: 'Not estimated', week: null, actual: 0, actualWeek: null, source: basis, note: '' });
export const fLines = [
  L('FL-01', 'Legal: agreement templates', 'Needs a quotation from counsel.'),
  L('FL-02', 'Grant writing or review support', 'Only if an application is decided on (ED-07).'),
  L('FL-03', 'Travel to customers, partners and investors', 'Needs a visit plan.'),
  L('FL-04', 'Accounting set-up for award budgets', 'Needed before the first award.'),
];

export const channels = [
  { id: 'CH-A', name: 'Customer-funded development', items: ['Paid pilots', 'Development agreements', 'Engineering service contracts', 'Preorders with clear delivery terms', 'Strategic customer collaborations'], dilution: 'None', speed: 'Months, once a product can be shown', state: 'No agreement on record.' },
  { id: 'CH-B', name: 'Non-dilutive funding', items: ['Federal small-business research programs', 'Health agency programs', 'State and regional innovation programs', 'Research collaborations'], dilution: 'None', speed: 'Six to twelve months from application to money, by program', state: 'No application in preparation.' },
  { id: 'CH-C', name: 'Strategic industry partnerships', items: ['Sensor and semiconductor companies', 'Medical technology partners', 'Research and clinical organisations'], dilution: 'None or small', speed: 'Slow; depends on evidence', state: 'No partner agreement on record.' },
  { id: 'CH-D', name: 'Equity or other investment', items: ['Angel investment', 'Seed financing', 'Strategic corporate investment', 'Other structures'], dilution: 'Yes', speed: 'Three to nine months', state: 'Not started. A raise needs verified traction or technical evidence; both registers are nearly empty.' },
];

/* Opportunities that are not grant programs (those come from the research file). All "Identified"; no amount is attainable until someone says why. */
const OP = (id, organisation, programme, type, basis) => ({ id, organisation, programme, type, stage: 'Identified', amountRequested: null, amountAttainable: null, probability: null, probabilityBasis: null, eligibility: 'Not checked', deadline: null, owner: 'C', partners: null, matching: null, restrictions: null, expectedDecision: null, expectedPayment: null, reporting: null, amountReceived: null, receivedDate: null, sourceUrl: null, verified: false, readAt: null, status: 'Planning Estimate', note: basis });
export const seedOpportunities = [
  OP('FO-P2', 'Magnetic sensor maker', 'Sensor supply or joint development', 'partnership', 'The device uses sensitive magnetic sensors. No agreement is on file.'),
  OP('FO-P3', 'Clinical or academic research group', 'Research collaboration for the cardiac program', 'partnership', 'Needed for any recording of people and for most health research grants.'),
  OP('FO-E1', 'Angel or seed investors', 'Equity round', 'equity', 'Not started. Decision at milestone FM-5.'),
];

const DL = (id, title, task, state) => ({ id, title, task, state, status: 'Planning Estimate', location: null });
export const fDeliverables = [
  DL('FD-01', 'Investor and partner-facing company overview', 'FT-102', 'Not started'),
  DL('FD-03', 'ECG/MCG research and commercialization brief', 'FT-104', 'Not started'),
  DL('FD-04', 'Commercial traction and pilot evidence register', 'FT-105', 'Not started'),
  DL('FD-05', 'Technical milestone and validation evidence register', 'FT-105', 'On this page: gates and evidence in each plan. Empty today.'),
  DL('FD-06', 'Funding-use plan', 'FT-602', 'Not started'),
  DL('FD-07', 'Three-year directional financial model', 'FT-502', 'Not started'),
  DL('FD-08', '12-month cash-flow and runway model', 'FT-601', 'On this page: Cash Flow and Capital Allocation. Needs cash on hand.'),
  DL('FD-09', 'Capital requirement by program and phase', 'FT-602', 'On this page: the company Money screen.'),
  DL('FD-10', 'Grant opportunity tracker', 'FT-301', 'On this page: Grants and Non-Dilutive Funding.'),
  DL('FD-11', 'Partner outreach tracker', 'FT-401', 'On this page: Strategic Partnerships. Empty today.'),
  DL('FD-12', 'Investor preparation checklist', 'FT-501', 'On this page: Investment and Capital Raising.'),
  DL('FD-13', 'Risk and sensitivity analysis', 'FT-502', 'Not started'),
];
export const investorChecklist = [
  { id: 'IC-3', item: 'Verified technical evidence: the feasibility gate decided with measurements', state: 'Open' },
  { id: 'IC-4', item: 'Verified traction: interviews held, pilots signed, money received', state: 'Open' },
  { id: 'IC-5', item: 'Use of funds by program and phase', state: 'Open' },
  { id: 'IC-6', item: 'Twelve-month cash model with cash on hand entered', state: 'Open' },
  { id: 'IC-7', item: 'Capitalisation table and any earlier grant obligations', state: 'Open' },
  { id: 'IC-8', item: 'Securities rules for the offering reviewed by counsel', state: 'Open' },
  { id: 'IC-9', item: 'Data room with every claim tied to a record', state: 'Open' },
];
export const tractionRules = ['An interview counts when a written record exists.', 'A pilot counts when an agreement is signed.', 'Revenue counts when money is received.', 'A grant counts as available when cash is received, and only for the costs the award allows.', 'A figure from a plan or a slide is an ambition, and is shown as one.'];

/* Risks of the funding plan. First estimates on the same 1 to 5 scale as the other plans; not reviewed. */
const FR = (id, kind, hazard, harm, sev, prob, control, sev2, prob2) => ({ id, kind, area: kind, hazard, harm, severity: sev, probability: prob, controls: [{ id: id.replace('FK', 'FRC'), text: control, requirements: [] }], residualSeverity: sev2, residualProbability: prob2, status: 'Engineering Draft', owner: 'B' });
export const fRisks = [
  FR('FK-01', 'Cost', 'Cash runs out before any funding is received', 'Work stops on the device', 5, 3, 'Enter cash on hand; a twelve-month cash model; spending approved one gate at a time', 5, 2),
  FR('FK-02', 'Regulatory', 'The company is not eligible for a program it applies to', 'An application is rejected, or an award cannot be accepted', 4, 3, 'Eligibility checked against each program\'s own rules before an application is prepared', 4, 1),
  FR('FK-03', 'Schedule', 'Applications take the director and business lead away from the device', 'Device milestones slip', 3, 4, 'Application hours shown in the shared capacity chart before a decision to apply', 3, 2),
  FR('FK-04', 'Regulatory', 'The same cost or the same hours are charged to two awards', 'Repayment, and loss of future eligibility', 4, 2, 'One budget per award and the allocation check on this plan', 4, 1),
  FR('FK-05', 'Commercial', 'An opportunity is counted as money before it is received', 'Spending against funds that do not arrive', 4, 3, 'Identified, committed and received kept apart; only received counts as available', 4, 1),
];
