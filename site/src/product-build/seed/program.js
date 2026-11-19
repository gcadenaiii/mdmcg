/* Product Build: the program, the two roles, the work breakdown and the eight stop/go gates.
   SERVER SIDE ONLY. This file is read by the build (pages/product-build/payload.json.ts) and by the tests. It must never be
   imported by a page script: everything here is internal and reaches the browser only inside the encrypted payload.

   Every hour and week below is a planning estimate made on 2026-11-19, before any work was done. Nothing here is a measured result. */

export const SENTINEL = 'PB-SEED-SENTINEL-7Q4X';   // the leak test looks for this text in the built site; it must be found nowhere in plain form

export const program = {
  id: 'program',
  name: 'Wearable ECG and MCG device: engineering feasibility program',
  startDate: '2026-11-23',
  baselineWeeks: 16,
  durationWeeks: 16,
  contingencyPct: 15,
  status: 'Planning Estimate',
  objective: 'Build and evaluate one integrated wearable that records the heart\'s electrical signal (ECG) and its magnetic signal (MCG) at the same instants, from commercially available parts wherever that is technically possible, and decide with measurements whether the sensing approach is good enough to go on.',
  criticalGate: 'Cardiac magnetic signal recovery must be demonstrated, against a signal-to-noise and repeatability criterion written down beforehand, before any substantial spending on a custom circuit board.',
  value: 'The company\'s own value sits in software, algorithms, calibration methods, data and scientific models. Hardware uses bought parts, standard interfaces and design files the company owns and can edit.',
  boundaries: [
    'This is a research prototype. It is not a cleared medical device and no clinical claim is made for it.',
    'An ECG does not determine the matching MCG. Any MCG figure comes from an MCG measurement, never from the ECG.',
    'Results from the heart twin and the virtual trial are computed. They set expectations and criteria; they are never shown as measurements.',
    'No recording of a person is made until the oversight question (decision D-03) is settled in writing.',
    'No purchase, order or paid cloud resource is made without the director\'s approval recorded on this page.',
  ],
  calendarNote: 'Week 1 holds a public holiday on 2026-11-26, and weeks 5 and 6 hold 2026-12-25 and 2027-01-01. The schedule counts whole weeks and does not yet take these days out.',
};

export const roles = [
  { id: 'A', name: 'Embedded hardware and firmware developer', short: 'Developer', rate: 80, weeklyHours: 36,
    duties: ['Sensor research and evaluation', 'Electronic architecture', 'Circuit board design and vendor coordination', 'Firmware and synchronization', 'Mechanical integration', 'Test set-up and execution', 'Hardware bring-up', 'Data acquisition integration', 'Technical documentation'] },
  { id: 'B', name: 'Engineering director', short: 'Director', rate: 50, weeklyHours: 12,
    duties: ['Design input review', 'Architecture review', 'ISO 13485 process implementation', 'Risk assessment and risk-control review', 'Supplier and lifecycle approval', 'Budget and timeline oversight', 'Design review milestones', 'Verification acceptance', 'Engineering change approval', 'Final program assessment'] },
];

export const phases = [
  { id: 'P0', name: 'Program management' },
  { id: 'P1', name: 'Requirements, intended use and quality planning' },
  { id: 'P2', name: 'MCG sensor evaluation and feasibility' },
  { id: 'P3', name: 'Synchronized ECG and MCG bench acquisition' },
  { id: 'P4', name: 'Electrical, mechanical and firmware architecture' },
  { id: 'P5', name: 'Circuit board design, mechanical CAD and release' },
  { id: 'P6', name: 'Procurement, fabrication, assembly and bring-up' },
  { id: 'P7', name: 'Firmware, acquisition and software integration' },
  { id: 'P8', name: 'Cloud proof of concept, security and data pipeline' },
  { id: 'P9', name: 'Verification, risk-control evaluation and closure' },
];

/* week = planned start week, weeks = planned length, hours = estimated hours by role over the whole task,
   deps: 'ID' = starts after ID finishes; { id, type: 'SS', lag } = starts `lag` weeks after ID starts.
   expense = budget line ids this task spends from. approval = who accepts the task's output. */
const T = (id, phase, title, week, weeks, a, b, deps, more = {}) => ({ id, phase, title, week, weeks, hours: { A: a, B: b }, actualHours: { A: 0, B: 0 }, deps, percent: 0, owner: a >= b ? 'A' : 'B', status: 'Planning Estimate', approval: 'B', deliverables: [], requirements: [], risks: [], expense: [], evidence: [], ...more });
const M = (id, phase, title, week, deps, gate) => ({ id, phase, title, week, weeks: 0, milestone: true, hours: { A: 0, B: 0 }, actualHours: { A: 0, B: 0 }, deps, percent: 0, owner: 'B', status: 'Planning Estimate', approval: 'B', gate, deliverables: [], requirements: [], risks: [], expense: [], evidence: [] });

export const tasks = [
  T('T-001', 'P0', 'Program management, weekly report and budget tracking', 1, 16, 14, 24, [], { loe: true, description: 'Weekly progress report, planned against actual hours and spending, purchase approvals, supplier contact.', deliverables: ['Weekly progress report', 'Budget and hours record'] }),
  T('T-002', 'P0', 'Document control, design reviews and change control', 1, 16, 8, 20, [], { loe: true, description: 'Keep controlled documents and their revisions, hold and record design reviews, assess each design change.', deliverables: ['Design and development file index', 'Design review records', 'Change records'], owner: 'B' }),

  T('T-101', 'P1', 'Program charter and design and development plan', 1, 1, 4, 3, [], { deliverables: ['Program charter', 'Design and development plan'], owner: 'B' }),
  T('T-102', 'P1', 'User needs and intended-use statement', 1, 2, 4, 4, [{ id: 'T-101', type: 'SS', lag: 0 }], { description: 'Research use only at this stage. States who uses the prototype, on whom, where, and what it is not for.', deliverables: ['User needs', 'Intended-use statement (research)'], owner: 'B' }),
  T('T-103', 'P1', 'System, hardware, firmware and software requirements', 1, 2, 12, 2, [{ id: 'T-102', type: 'SS', lag: 0 }], { deliverables: ['Engineering requirements register'], requirements: ['all'] }),
  T('T-104', 'P1', 'Regulatory and standards applicability analysis', 1, 2, 0, 4, [{ id: 'T-102', type: 'SS', lag: 0 }], { deliverables: ['Applicability analysis'], owner: 'B', external: 'A regulatory specialist should read this analysis before it is relied on (see decision D-06).' }),
  T('T-105', 'P1', 'Quality plan: roles, approvals, records and procedures needed now', 2, 1, 2, 3, [{ id: 'T-101' }], { deliverables: ['Quality plan', 'List of procedures and who is trained on each'], owner: 'B' }),
  M('M-1', 'P1', 'Requirements baseline approval', 2, ['T-103', 'T-104', 'T-105'], 'G-1'),

  T('T-201', 'P2', 'Sensor survey update, quotations and order of evaluation hardware', 1, 1, 14, 1, [], { description: 'Confirm lifecycle, price and lead time with each maker, then order the evaluation sensors the director approves.', deliverables: ['Quotation record', 'Approved evaluation order'], expense: ['H-01', 'H-04'], risks: ['R-01', 'R-12'] }),
  T('T-202', 'P2', 'Bench set-up: reference magnetometer, calibration coil and noise floor', 2, 2, 30, 1, ['T-201'], { description: 'Measure each sensor\'s own noise and the room\'s noise with a known coil signal, before any heart recording.', deliverables: ['Bench set-up record', 'Noise floor measurements'], expense: ['H-04', 'H-08'], risks: ['R-02'] }),
  T('T-203', 'P2', 'Feasibility experiments in the five conditions', 3, 2, 34, 3, [{ id: 'T-202', type: 'SS', lag: 1 }], { description: 'Still, moving, noisy room, shielded or controlled, and normal laboratory. A known coil signal in every condition; a heart recording only under decision D-03.', deliverables: ['Raw recordings with their hashes', 'Experiment log'], risks: ['R-01', 'R-02', 'R-03'] }),
  T('T-204', 'P2', 'Sensor feasibility report with objective measurements', 4, 1, 6, 3, [{ id: 'T-203', type: 'SS', lag: 1 }], { deliverables: ['Sensor feasibility report'] }),
  M('M-2', 'P2', 'MCG feasibility gate', 4, ['T-202', 'T-203', 'T-204'], 'G-2'),

  T('T-301', 'P3', 'ECG front-end evaluation board on the bench', 2, 1, 8, 0, ['T-201'], { deliverables: ['ECG bench record'], expense: ['H-02'] }),
  T('T-302', 'P3', 'Common clock and simultaneous sampling of ECG and MCG', 4, 2, 20, 2, ['T-301'], { description: 'Both signals sampled from one clock. Timing between them measured with a shared test pulse.', deliverables: ['Bench acquisition prototype', 'Timing measurement'], expense: ['H-03'], risks: ['R-04'] }),
  T('T-303', 'P3', 'Recording format with calibration and sensor-geometry records', 5, 1, 5, 2, [{ id: 'T-302', type: 'SS', lag: 1 }], { deliverables: ['Recording format specification'] }),

  T('T-401', 'P4', 'Electrical architecture and preliminary parts list with lifecycle check', 5, 2, 18, 3, ['M-2'], { deliverables: ['Electrical architecture', 'Preliminary parts list with lifecycle record'], risks: ['R-12', 'R-13'] }),
  T('T-402', 'P4', 'Mechanical architecture: non-magnetic materials and sensor placement', 5, 2, 8, 1, ['M-2'], { description: 'Which materials sit near the sensors, the field made by the board\'s own currents and by the cell, and where the sensors go.', deliverables: ['Mechanical architecture', 'Magnetic cleanliness budget'], risks: ['R-05'] }),
  T('T-403', 'P4', 'Firmware architecture and the hardware abstraction layer', 5, 2, 10, 1, ['M-2'], { description: 'One interface for magnetic sensors, ECG front ends and processors, so a part can be swapped without rewriting the cardiac software.', deliverables: ['Firmware architecture', 'Hardware abstraction interface'] }),
  T('T-404', 'P4', 'Hazard identification and initial risk analysis', 4, 3, 4, 9, ['M-1'], { deliverables: ['Risk management plan', 'Risk register, initial'], owner: 'B' }),
  M('M-3', 'P4', 'Architecture review', 6, ['T-401', 'T-402', 'T-403', 'T-404', 'T-302', 'T-303'], 'G-3'),

  T('T-501', 'P5', 'Schematic capture and electrical rule check', 6, 2, 30, 1, [{ id: 'T-401', type: 'SS', lag: 1 }], { description: 'Started before the architecture review closes, at the team\'s own risk of rework. Nothing is ordered on it until the release gate.', deliverables: ['Schematics (native files)', 'Electrical rule check report'] }),
  T('T-502', 'P5', 'Board layout, design rule check and current-loop review', 7, 2, 32, 1, [{ id: 'T-501', type: 'SS', lag: 1 }, 'M-3'], { deliverables: ['Board layout (native files)', 'Design rule check report', 'Current-loop and sensor-placement review'], risks: ['R-05'] }),
  T('T-503', 'P5', 'Mechanical CAD and prototype enclosure', 9, 3, 15, 1, ['M-3'], { deliverables: ['Mechanical model (STEP)', 'Prototype enclosure'], expense: ['H-06'] }),
  T('T-504', 'P5', 'Manufacturing files and independent design review', 9, 1, 8, 4, ['T-502'], { description: 'Gerber, drill, parts list, pick-and-place and drawings. An outside electronics engineer reads the design before release.', deliverables: ['Manufacturing file set', 'Independent review record'], expense: ['X-01'], external: 'Independent review of the analogue front end and the layout by a qualified outside engineer.' }),
  M('M-4', 'P5', 'Circuit board release authorization', 9, ['T-504', 'M-2', 'M-3'], 'G-4'),

  T('T-601', 'P6', 'Order of long-lead parts', 8, 1, 4, 2, ['M-3'], { deliverables: ['Purchase record'], expense: ['H-03', 'H-07'], risks: ['R-12'] }),
  T('T-602', 'P6', 'Board fabrication and assembly at the vendor', 10, 2, 6, 1, ['M-4', 'T-601'], { description: 'Two weeks is a planning estimate for fabrication with assembly. It is replaced by the vendor\'s quoted time once a quotation is in hand.', deliverables: ['Assembled prototype boards', 'Vendor inspection record'], expense: ['H-05', 'H-09'] }),
  T('T-603', 'P6', 'Board bring-up: power, clocks, noise and test points', 12, 1, 26, 1, ['T-602'], { deliverables: ['Bring-up procedure and record'], risks: ['R-06', 'R-07'] }),
  M('M-5', 'P6', 'Prototype bring-up acceptance', 12, ['T-603'], 'G-5'),

  T('T-701', 'P7', 'Firmware on the development kit: drivers, sampling and timestamps', 8, 4, 28, 0, [{ id: 'T-403', type: 'SS', lag: 2 }], { deliverables: ['Acquisition firmware (development kit)'], risks: ['R-04', 'R-08'] }),
  T('T-702', 'P7', 'Host recording tool and automated tests', 9, 3, 16, 0, [{ id: 'T-701', type: 'SS', lag: 1 }], { deliverables: ['Host recording tool', 'Automated test suite'] }),
  T('T-703', 'P7', 'Firmware moved to the prototype board', 13, 2, 20, 0, ['T-603', 'T-701'], { deliverables: ['Acquisition firmware (prototype)'] }),
  T('T-704', 'P7', 'Heart Twin interface: import of recordings and a first view of both signals', 10, 3, 14, 2, ['T-303'], { deliverables: ['Import module', 'ECG and MCG view'] }),

  T('T-801', 'P8', 'Security plan and data architecture', 7, 2, 4, 5, ['M-1'], { deliverables: ['Security plan', 'Data architecture'], owner: 'B', risks: ['R-09', 'R-10'] }),
  T('T-802', 'P8', 'Proof of concept: ingestion, storage and integrity hashes, synthetic data only', 9, 3, 16, 2, ['T-801'], { description: 'Synthetic or computed data only. Paid cloud resources are created only after decision D-05.', deliverables: ['Ingestion service', 'Provenance and hash records'], expense: ['S-01'], risks: ['R-09', 'R-10'] }),
  T('T-803', 'P8', 'Backup and restore test, access review', 12, 2, 6, 3, ['T-802'], { deliverables: ['Restore test record', 'Access review record'] }),
  M('M-6', 'P8', 'Software and data integrity review', 14, ['T-702', 'T-703', 'T-704', 'T-803'], 'G-6'),

  T('T-901', 'P9', 'Verification protocols', 10, 2, 8, 6, ['M-3'], { deliverables: ['Verification protocols'], owner: 'A' }),
  T('T-902', 'P9', 'Verification on the prototype', 13, 3, 54, 4, ['M-5', 'T-901'], { deliverables: ['Verification records', 'Anomaly list'], risks: ['R-06', 'R-07'] }),
  T('T-903', 'P9', 'Risk-control verification and residual-risk review', 14, 2, 6, 9, [{ id: 'T-902', type: 'SS', lag: 1 }], { deliverables: ['Risk register, reviewed', 'Residual-risk review'], owner: 'B' }),
  M('M-7', 'P9', 'Verification completion', 15, ['T-902', 'T-903'], 'G-7'),
  T('T-904', 'P9', 'Supplier and component lifecycle assessment, cost review', 14, 2, 6, 6, [], { deliverables: ['Supplier assessments', 'Lifecycle assessment', 'Cost review'], owner: 'B' }),
  T('T-905', 'P9', 'Final engineering evaluation, limits and next-phase recommendation', 16, 1, 16, 9, ['M-7', 'T-904'], { deliverables: ['Final engineering evaluation'] }),
  M('M-8', 'P9', 'Final feasibility decision', 16, ['T-905', 'M-6'], 'G-8'),
];

/* A gate may be approved only by a named person, with a date, when the earlier gates are approved, its tasks are complete and
   its evidence records exist (calc.gateStatus). `authorises` is what an approval releases; nothing is released before it. */
export const gates = [
  { id: 'G-1', milestone: 'M-1', title: 'Requirements baseline approval', after: [], tasks: ['T-102', 'T-103', 'T-104', 'T-105'], evidence: ['E-G1-01', 'E-G1-02'],
    criteria: ['Every user need has at least one requirement', 'Every requirement names how it will be verified', 'The applicability analysis has been read by the director'], authorises: 'Design work against the baseline. Changes to it go through change control from here on.', approval: null },
  { id: 'G-2', milestone: 'M-2', title: 'MCG feasibility gate', after: ['G-1'], tasks: ['T-202', 'T-203', 'T-204'], evidence: ['E-G2-01', 'E-G2-02', 'E-G2-03'],
    criteria: ['The signal-to-noise and repeatability criterion was written down before the experiments (requirement RQ-02)', 'A known coil signal was recovered in each of the five conditions, with the measured figures', 'A cardiac magnetic signal was recovered and met the criterion, or the report says plainly that it did not', 'Raw recordings are kept unchanged with their hashes'],
    authorises: 'Spending on the custom circuit board. A no-go or a conditional result records the other sensor approaches, their added cost and the schedule effect.', approval: null, critical: true },
  { id: 'G-3', milestone: 'M-3', title: 'Architecture review', after: ['G-2'], tasks: ['T-302', 'T-303', 'T-401', 'T-402', 'T-403', 'T-404'], evidence: ['E-G3-01', 'E-G3-02'],
    criteria: ['Each critical part is Active at its maker and has a documented substitute or an approved exception', 'The hardware abstraction interface covers sensor, ECG front end and processor', 'The magnetic cleanliness budget is written', 'The initial risk analysis is reviewed'], authorises: 'Board layout and the order of long-lead parts.', approval: null },
  { id: 'G-4', milestone: 'M-4', title: 'Circuit board release authorization', after: ['G-2', 'G-3'], tasks: ['T-501', 'T-502', 'T-504'], evidence: ['E-G4-01', 'E-G4-02', 'E-G4-03'],
    criteria: ['Electrical rule check and design rule check are clean or each exception is explained', 'The independent review is on record and its findings are closed or accepted', 'The fabrication quotation is on record'], authorises: 'The fabrication and assembly order.', approval: null },
  { id: 'G-5', milestone: 'M-5', title: 'Prototype bring-up acceptance', after: ['G-4'], tasks: ['T-602', 'T-603'], evidence: ['E-G5-01'],
    criteria: ['Power rails, clocks and each channel\'s noise are measured and recorded against the requirements', 'Every anomaly is listed with an owner'], authorises: 'Verification on the prototype.', approval: null },
  { id: 'G-6', milestone: 'M-6', title: 'Software and data integrity review', after: ['G-1'], tasks: ['T-702', 'T-703', 'T-704', 'T-803'], evidence: ['E-G6-01', 'E-G6-02'],
    criteria: ['A recording can be traced from device to stored file by its identifiers and hash', 'The restore test passed', 'The access review found no account with more rights than its role'], authorises: 'Use of the pipeline for engineering recordings. It does not authorise any data that identifies a person.', approval: null },
  { id: 'G-7', milestone: 'M-7', title: 'Verification completion', after: ['G-5'], tasks: ['T-902', 'T-903'], evidence: ['E-G7-01', 'E-G7-02'],
    criteria: ['Every requirement in the baseline has a verification record or a recorded reason why not', 'Every risk control has a verification record', 'Unresolved anomalies are listed with their effect'], authorises: 'The final evaluation.', approval: null },
  { id: 'G-8', milestone: 'M-8', title: 'Final feasibility decision', after: ['G-6', 'G-7'], tasks: ['T-904', 'T-905'], evidence: ['E-G8-01'],
    criteria: ['The final evaluation states what was measured, what was not, and the limits', 'Cost to date and the cost of the next phase are stated', 'The recommendation is go, conditional or no-go, with reasons'], authorises: 'The next phase, or its stop.', approval: null },
];

/* Records that exist. Evidence, reviews and approvals start empty on purpose: none has been produced, and none is invented.
   People add them on the page as the work is done. */
export const evidence = [];
export const reviews = [];
