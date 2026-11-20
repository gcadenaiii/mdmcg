/* Execution Plan 1: the battery product. SERVER SIDE ONLY (see program.js).

   Sources read on 2026-11-19, all on the owner's computer:
     AUD  Battery_Prototype_Engineering_Audit.docx  (preliminary audit, dated November 17, 2026)
     DECK Engineering_Prototype_Review.pptx
     AGR  the engineering contracting agreement, effective 1/1/2024 (nine pages)
     the three demonstration videos are on file; what they show is taken from AUD, they were not viewed again for this plan.
   Nothing here is a test result of ours. "Shown" means a video shows it, as the audit describes. "Not verified" means no
   independent record exists. Hours and weeks are planning estimates of 2026-11-19. No supplier has quoted anything. */

export const bProgram = {
  id: 'battery', name: 'Battery product: completion and commercialization', short: 'Battery product',
  startDate: '2026-11-30', baselineWeeks: 48, durationWeeks: 48, contingencyPct: 15, status: 'Planning Estimate',
  objective: 'Finish the existing battery impedance scanning prototype to a verified, reproducible instrument, and sell it through paid pilots to a limited commercial release.',
  startNote: 'The start date is a planning assumption. Both programs use the same two engineers; the Strategic Roadmap shows what that does to each schedule.',
  scheduleNote: 'Forty-eight weeks is a planning estimate from the tasks below. It is not forced to the sixteen weeks of the ECG/MCG plan. It becomes firm only after the handover (week 3) shows what exists.',
};

/* Where each source file is, and what is still missing. state: 'On file' | 'Not received' | 'Not found' */
const SRC = (id, name, state, where, owner, note = '') => ({ id, name, state, where, owner, note, status: state === 'On file' ? 'Engineering Draft' : 'Review Required' });
export const bSources = [
  SRC('BS-01', 'Battery_Prototype_Engineering_Audit.docx', 'On file', 'Desktop/Parthian', 'Director', 'Dated November 17, 2026. The brief names "Battery_Prototype_Engineering_Audit(1).docx"; this is the file found under that name without the "(1)". Two earlier PDF versions are in Downloads.'),
  SRC('BS-02', 'Engineering_Prototype_Review.pptx', 'On file', 'Desktop/Parthian', 'Director', 'Nine slides.'),
  SRC('BS-03', 'IMG_6528.MOV (shared-input timing test)', 'On file', 'Desktop/Parthian', 'Director', 'On file. Content as described in the audit; not viewed again for this plan.'),
  SRC('BS-04', 'IMG_1741.MOV (hardware tour)', 'On file', 'Desktop/Parthian', 'Director', 'On file. Content as described in the audit.'),
  SRC('BS-05', 'IMG_1745.MOV (repeated impedance results)', 'On file', 'Desktop/Parthian', 'Director', 'On file. Content as described in the audit.'),
  SRC('BS-06', 'Engineering contracting agreement with milestone definitions', 'On file', 'Desktop/Parthian', 'Director', 'Effective 1/1/2024. Seven milestones, acceptance test and requirements on pages 1 to 4. The contracting company named in it is Parthian Energy LLC; see decision ED-01.'),
  SRC('BS-07', 'Schematics and PCB design files (editable)', 'Not received', 'Expected from the contractor', 'Contractor', 'Asked for in the audit under "Handover".'),
  SRC('BS-08', 'Bill of materials, module list and board revisions', 'Not received', 'Expected from the contractor', 'Contractor'),
  SRC('BS-09', 'Wiring diagram and channel map (which channel carries current, which voltage)', 'Not received', 'Expected from the contractor', 'Contractor', 'The hardware tour says ADC channels 0 and 1 carry current and voltage.'),
  SRC('BS-10', 'Firmware source for the controllers', 'Not received', 'Expected from the contractor', 'Contractor'),
  SRC('BS-11', 'Host software source, build tools, libraries and settings', 'Not received', 'Expected from the contractor', 'Contractor'),
  SRC('BS-12', 'Build and programming instructions', 'Not received', 'Expected from the contractor', 'Contractor'),
  SRC('BS-13', 'Original raw data records with channel and frame identifiers', 'Not received', 'Expected from the contractor', 'Contractor'),
  SRC('BS-14', 'Calibration records: gains, offsets, phase', 'Not received', 'Expected from the contractor', 'Contractor'),
  SRC('BS-15', 'Per-channel ACIR comparison against a commercial reference', 'Not received', 'Expected from the contractor', 'Contractor', 'The agreement makes this the acceptance test: under 5% difference on each channel.'),
  SRC('BS-16', 'List of known failures and unresolved issues', 'Not received', 'Expected from the contractor', 'Contractor', 'The audit mentions reported intermittent failures.'),
  SRC('BS-17', 'Operating, start-up and calibration instructions', 'Not received', 'Expected from the contractor', 'Contractor'),
  SRC('BS-18', 'Mechanical CAD: gantry and enclosure', 'Not received', 'Expected from the contractor', 'Contractor', 'Milestone 1 of the agreement is an XY gantry with full design.'),
  SRC('BS-19', 'Record of which agreement milestones were verified and paid', 'Not found', 'Company records', 'Director', 'Needed to know what was accepted. Not among the files read.'),
];

/* What the evidence supports. level: 'Shown' (a video shows it) | 'Credible' (a sound choice, not a result) | 'Not verified' | 'Open' (no evidence at all) */
const FND = (id, level, text, source) => ({ id, level, text, source });
export const bFindings = [
  FND('BF-01', 'Shown', 'A bench assembly with AD7768 acquisition modules and Teensy controllers, before PCB integration.', 'AUD, hardware tour; IMG_1741.MOV 0:01 to 0:07'),
  FND('BF-02', 'Shown', 'Current and voltage sensing on ADC channels 0 and 1 for the impedance measurement.', 'AUD; IMG_1741.MOV 1:42 to 1:58'),
  FND('BF-03', 'Shown', 'Two eight-channel modules on a common master clock with parallel synchronization pulses. One channel on each, fed the same 1 kHz signal, displays a phase difference of 0.00 degrees.', 'AUD; IMG_6528.MOV 1:22 to 3:06'),
  FND('BF-04', 'Shown', 'Repeated displayed impedance results near 2.1 milliohm. Each printed result stands for 100 runs of 10 ms.', 'AUD; IMG_1745.MOV about 0:10'),
  FND('BF-05', 'Credible', 'AD7768 converters, Teensy controllers and shared clock and sync signals are defensible choices. The choice alone does not establish a good or a bad implementation.', 'AUD, overall assessment'),
  FND('BF-06', 'Credible', 'A carrier PCB that keeps the evaluation boards can be a valid prototype. New interconnects, power and clock routing need tests on that assembly.', 'AUD, design assessment'),
  FND('BF-07', 'Not verified', 'The 0.00 degree result supports that one comparison. It does not establish raw-sample correspondence, all-channel accuracy or start-up repeatability. A delay of whole periods (2 ms is two cycles at 1 kHz, 125 samples at 62.5 kS/s) reads as zero phase.', 'AUD, practical timing check; DECK slide 3'),
  FND('BF-08', 'Not verified', 'The 2.1 milliohm figure is evidence of repeated displayed results, not of calibrated accuracy. Whether "Impedance" is the magnitude, the resistive part or another quantity is not defined.', 'AUD, ambiguity in the reported impedance; DECK slide 5'),
  FND('BF-09', 'Not verified', 'Whether the firmware preserves sample order and matching frames between modules. A common clock aligns conversions; the records must also match.', 'AUD; DECK slide 2'),
  FND('BF-10', 'Open', 'Complete 64-channel function. The agreement\'s Milestone 7 is a functional 64-channel, 24-bit sensor with DSP, full design and one prototype. Two eight-channel modules are what the videos show.', 'AGR page 2; AUD'),
  FND('BF-11', 'Open', 'The acceptance test: ACIR of a commercial 5 Ah cell compared with a commercial instrument, under 5% difference on each channel. No comparison record is on file.', 'AGR page 1, section 2.1'),
  FND('BF-12', 'Open', 'Readiness for independent handover. Another engineer has not yet reproduced a result from supplied files and instructions.', 'AUD; DECK slide 9'),
];

/* The agreement's own terms, as written. These are requirements to confirm against the controlling agreement, not results. */
export const bAgreement = {
  effective: '2024-01-01', deadline: '2024-08-20', fee: 145000, feeNote: 'A fee of up to this amount for all seven milestones. What was paid is not in the files read.',
  acceptance: 'Measure the AC internal resistance of a commercial 5 Ah battery or similar and compare with a commercial device. For each channel the difference in ACIR should be less than 5% to pass. A milestone is not complete until the validation is verified.',
  warranty: 'The contractor fixes issues related to a milestone free of charge for 12 months from the date that milestone is completed.',
  ip: 'All rights in designs and products developed under the agreement are assigned to the company named in it.',
  milestones: [
    { n: 1, pct: 5, text: 'XY gantry, full design and one prototype, 1 mm pitch, better than 0.025 mm repeatability, computer controlled.' },
    { n: 2, pct: 5, text: 'Current and voltage source and sink PCB, DC and AC to 10 kHz, ranges 10 mA, 100 mA and 1000 mA peak to peak, 2.5 V to 4.5 V.' },
    { n: 3, pct: 10, text: 'Single analog peak-to-peak detector PCB with filters and connections.' },
    { n: 4, pct: 10, text: 'Four-channel analog peak-to-peak detector PCB.' },
    { n: 5, pct: 10, text: 'Single-channel digital sensor, 16-bit ADC, 50 kHz, with DSP.' },
    { n: 6, pct: 20, text: 'Sixteen-channel digital sensor, 16-bit ADC, 50 kHz, with DSP.' },
    { n: 7, pct: 40, text: 'Sixty-four-channel digital sensor, 24-bit ADC, 50 kHz, with DSP, full design and one prototype.' },
  ],
  software: ['Stage motion and control', 'Battery excitation', 'Magnetic sensor calibration', 'Optional FFT for noise and 60 Hz filtering', 'Data storage and retrieval', 'A/D control and tuning', 'System debug mode'],
  specs: ['Electronics temperature recorded and held within 1 degree C', 'Open-circuit voltage: 100 microvolt over 0 to 5 V DC', 'Applied current: 100 Hz to 10 kHz, frequency accuracy 0.2 Hz, 10 mA to 5 A, accuracy 0.1% of reading', 'ACIR: 1 kHz, 1 mA or 10 mA sine, voltage change under 20 mV; 300 milliohm to 3 ohm ranges; accuracy 0.5% of reading plus 5 digits', '100 ms current pulse at 20C (5 A single-layer, 50 A multi-layer cells)', 'Tab connections and wiring that keep inductance noise low'],
  unclear: ['"50 kHz ADC" against the reported 62.5 kS/s per channel', 'Current ranges differ between Milestone 2 (to 1000 mA) and the requirements page (to 5 A, pulses to 50 A)', 'Which specifications apply in which operating mode', 'Numerical limits for timing, where the agreement is silent'],
};

/* The unresolved engineering matters. Each becomes a requirement with a test; none has evidence. */
export const bNeeds = [
  { id: 'BN-01', text: 'A customer can measure the AC internal resistance of every connected cell or channel at the same instants and trust the number.' },
  { id: 'BN-02', text: 'A customer can compare our result with their reference instrument and know what quantity is compared.' },
  { id: 'BN-03', text: 'The instrument starts, runs and recovers the same way every time, without silent data loss.' },
  { id: 'BN-04', text: 'Another engineer can build, calibrate and operate the instrument from the released files.' },
  { id: 'BN-05', text: 'The instrument is safe for its user and legal to sell in its markets.' },
  { id: 'BN-06', text: 'The instrument can be built by a contract manufacturer and serviced for years.' },
  { id: 'BN-07', text: 'The customer gets results fast enough for the use they bought it for.' },
];
const RQ = (id, text, needs, method, src) => ({ id, type: 'System', text, needs, method, src, status: 'Engineering Draft' });
export const bRequirements = [
  RQ('BR-01', 'All 64 channels shall acquire and report a result.', ['BN-01'], 'Test: every channel driven and read', 'AGR Milestone 7'),
  RQ('BR-02', 'Samples that carry the same frame number on any two modules shall have been converted at the same instant, within a limit to be agreed.', ['BN-01'], 'Test: shared transient and a known nonzero delay, beside the DFT phase test', 'AUD; DECK slides 2 and 3'),
  RQ('BR-03', 'Start-up and synchronization shall give the same alignment on every power cycle.', ['BN-03'], 'Test: repeated power cycles with the transient test', 'AUD'),
  RQ('BR-04', 'Original raw records shall be kept with channel and common frame identifiers, in their original order.', ['BN-03', 'BN-04'], 'Inspection and test: records read back', 'AUD'),
  RQ('BR-05', 'Lost, repeated or reordered frames and buffer overruns shall be detected, counted and reported.', ['BN-03'], 'Test: long capture with frame counters; fault injected', 'AUD'),
  RQ('BR-06', 'Gain and phase of every channel shall be calibrated against a traceable standard, with a written procedure.', ['BN-01', 'BN-02'], 'Test: calibration against a reference resistor', 'AUD'),
  RQ('BR-07', 'The reported impedance and phase quantities shall be defined by formula, units and reference direction.', ['BN-02'], 'Review: measurement definition document', 'AUD; DECK slide 5'),
  RQ('BR-08', 'Run-to-run variation and noise shall be measured and stated at a given gain and bandwidth.', ['BN-01'], 'Test: statistics over single runs', 'AUD'),
  RQ('BR-09', 'How 100 runs of 10 ms become one displayed result shall be defined, with the resulting uncertainty.', ['BN-01', 'BN-07'], 'Review of the processing; test against single-run data', 'AUD; DECK slide 4'),
  RQ('BR-10', 'Measurement latency and update rate shall be measured and stated.', ['BN-07'], 'Test: time from excitation to result', 'AUD'),
  RQ('BR-11', 'ACIR on each channel shall differ from the agreed commercial reference by less than 5% under agreed conditions.', ['BN-02'], 'Test: same cell, same quantity, same frequency and excitation on both instruments', 'AGR section 2.1'),
  RQ('BR-12', 'The instrument shall recover from intermittent faults without a restart by hand, and shall record each fault.', ['BN-03'], 'Test: duration run with a stated run count', 'AUD'),
  RQ('BR-13', 'The delivered assembly shall be identified part by part, and the integrated PCB shall pass every test the bench assembly passed.', ['BN-04', 'BN-06'], 'Inspection; repeat of the test set on the PCB', 'AUD'),
  RQ('BR-14', 'An engineer who did not build the instrument shall reproduce a measurement from the released package alone.', ['BN-04'], 'Demonstration with a record of every undocumented step', 'AUD; DECK slide 9'),
  RQ('BR-15', 'The instrument shall meet the electrical safety and EMC requirements that apply to its voltage, user and market.', ['BN-05'], 'Review: applicability analysis; test at a laboratory where required', 'Program brief'),
  RQ('BR-16', 'Every critical part in the released design shall be Active at its maker with dated sourcing evidence and a supported alternative.', ['BN-06'], 'Review: sourcing table', 'Program brief'),
];
const DO = (id, title, requirements, task) => ({ id, title, requirements, task, status: 'Planning Estimate', location: null });
export const bOutputs = [
  DO('BO-01', 'Configuration baseline of the received prototype', ['BR-13'], 'BT-002'),
  DO('BO-02', 'Measurement definition and requirements baseline', ['BR-07', 'BR-09', 'BR-10'], 'BT-101'),
  DO('BO-03', 'Architecture baseline: channels, clocking, timing, calibration', ['BR-01', 'BR-02', 'BR-03', 'BR-06'], 'BT-102'),
  DO('BO-04', 'Verification report on the 64-channel system', ['BR-01', 'BR-02', 'BR-03', 'BR-05', 'BR-08', 'BR-11', 'BR-12'], 'BT-207'),
  DO('BO-05', 'Integrated PCB design: schematics, layout, outputs', ['BR-13', 'BR-16'], 'BT-303'),
  DO('BO-06', 'Firmware and host software release package', ['BR-04', 'BR-05', 'BR-14'], 'BT-305'),
  DO('BO-07', 'Calibration procedure and records', ['BR-06'], 'BT-204'),
  DO('BO-08', 'Safety and EMC applicability analysis', ['BR-15'], 'BT-103'),
  DO('BO-09', 'Handover package and reproduction record', ['BR-14'], 'BT-003'),
];
const VT = (id, title, requirements, riskControls, method) => ({ id, title, requirements, riskControls, method, where: 'Bench', status: 'Planning Estimate', result: null });
export const bTests = [
  VT('BV-01', 'All 64 channels respond', ['BR-01'], [], 'A known signal into every channel in turn and together.'),
  VT('BV-02', 'Shared transient and known-delay test', ['BR-02'], ['BRC-01'], 'One step or pulse into all modules; then a known delay on one path. Kept beside the DFT phase test, which cannot see whole-period offsets.'),
  VT('BV-03', 'Start-up repeatability', ['BR-03'], ['BRC-01'], 'The transient test after each of a stated number of power cycles.'),
  VT('BV-04', 'Raw record check', ['BR-04'], ['BRC-02'], 'Records read back: identifiers present, order kept, a displayed result recomputed from them.'),
  VT('BV-05', 'Frame loss, repeat and reorder', ['BR-05'], ['BRC-02'], 'Long capture with counters; a dropped frame is injected and must be reported.'),
  VT('BV-06', 'Gain and phase calibration', ['BR-06'], ['BRC-03'], 'Reference resistors of known value on every channel.'),
  VT('BV-07', 'Measurement definition review', ['BR-07', 'BR-09'], ['BRC-03'], 'Formula, units and averaging written down and checked against single-run data.'),
  VT('BV-08', 'Noise and run-to-run variation', ['BR-08'], [], 'Statistics over single 10 ms runs at stated gain and bandwidth.'),
  VT('BV-09', 'Latency and update rate', ['BR-10'], [], 'Time from the start of excitation to a displayed result.'),
  VT('BV-10', 'Reference comparison, each channel', ['BR-11'], ['BRC-04'], 'The same commercial cell on our instrument and on the agreed reference; same quantity, frequency and excitation.'),
  VT('BV-11', 'Duration and fault recovery', ['BR-12'], ['BRC-02'], 'A run of stated length; every fault and its recovery recorded.'),
  VT('BV-12', 'Repeat of the test set on the integrated PCB', ['BR-13'], [], 'BV-01 to BV-11 on the assembled PCB.'),
  VT('BV-13', 'Independent reproduction', ['BR-14'], ['BRC-05'], 'A measurement reproduced from the package by an engineer who did not build it.'),
  VT('BV-14', 'Safety and EMC applicability and tests', ['BR-15'], ['BRC-06'], 'Applicability reviewed by a qualified person; laboratory tests where required.'),
  VT('BV-15', 'Sourcing review', ['BR-16'], ['BRC-07'], 'Lifecycle, sellers, lead time and alternative for every critical part, with the date read.'),
];
const R = (id, kind, hazard, harm, sev, prob, controls, sev2, prob2) => ({ id, kind, area: kind, hazard, harm, severity: sev, probability: prob, controls, residualSeverity: sev2, residualProbability: prob2, status: 'Engineering Draft', owner: 'B' });
export const bRisks = [
  R('BK-01', 'Engineering', 'The modules are not sample-aligned although the phase test reads zero', 'Impedance and phase errors that no single-tone test reveals', 4, 3, [{ id: 'BRC-01', text: 'Transient and known-delay test on every power cycle during verification', requirements: ['BR-02', 'BR-03'] }], 4, 1),
  R('BK-02', 'Engineering', 'Frames are lost or reordered without a sign', 'Results that look sound and are not', 4, 3, [{ id: 'BRC-02', text: 'Frame counters in every record, checked on capture', requirements: ['BR-04', 'BR-05', 'BR-12'] }], 4, 1),
  R('BK-03', 'Engineering', 'The displayed impedance is a different quantity from the reference instrument\'s', 'A failed or meaningless comparison', 3, 4, [{ id: 'BRC-03', text: 'Written measurement definition and calibration before any comparison', requirements: ['BR-06', 'BR-07'] }], 3, 1),
  R('BK-04', 'Engineering', 'The system does not meet the 5% per-channel criterion', 'No acceptance; redesign of the analog path', 4, 3, [{ id: 'BRC-04', text: 'Reference comparison early in verification, before PCB spending', requirements: ['BR-11'] }], 4, 2),
  R('BK-05', 'Schedule', 'Source files, firmware or raw data are not handed over, or do not match the hardware', 'Work restarts from the hardware alone', 4, 3, [{ id: 'BRC-05', text: 'Dated snapshot, inventory and an independent reproduction before any new design work', requirements: ['BR-14'] }], 4, 2),
  R('BK-06', 'Regulatory', 'Safety and EMC requirements are found late', 'Redesign after the PCB is released; no sale in a market', 3, 3, [{ id: 'BRC-06', text: 'Applicability analysis in the requirements phase, read by a qualified person', requirements: ['BR-15'] }], 3, 1),
  R('BK-07', 'Cost', 'A critical part is not available or is near end of life', 'Redesign or a stalled build', 3, 3, [{ id: 'BRC-07', text: 'Lifecycle and sourcing evidence for every critical part before release', requirements: ['BR-16'] }], 3, 2),
  R('BK-08', 'Commercial', 'Sixty-four channels alone is not a reason to buy', 'A finished instrument with no buyer', 4, 3, [{ id: 'BRC-08', text: 'Customer interviews and design partners before the PCB is released', requirements: [] }], 4, 2),
  { ...R('BK-09', 'Commercial', 'Which company owns and sells the product is not settled', 'Contracts, grants and revenue booked in the wrong entity', 4, 3, [{ id: 'BRC-09', text: 'Decision ED-01 before any customer or funding agreement', requirements: [] }], 4, 1), scope: 'shared' },
  { ...R('BK-10', 'Schedule', 'The same two engineers are planned on two plans at once', 'Both plans slip', 4, 4, [{ id: 'BRC-10', text: 'One shared capacity plan; decision ED-02 on the order of work', requirements: [] }], 4, 2), scope: 'shared' },
  R('BK-11', 'Safety', 'A connected cell is shorted or over-driven by the instrument', 'Fire or injury', 5, 2, [{ id: 'BRC-11', text: 'Current limits, fusing and a hazard review of the cell connection before any customer use', requirements: ['BR-15'] }], 5, 1),
];

export const bPhases = [
  { id: 'B0', name: 'Engineering handover and control' },
  { id: 'B1', name: 'Requirements and architecture baseline' },
  { id: 'B2', name: '64-channel verification' },
  { id: 'B3', name: 'Integrated PCB and product engineering' },
  { id: 'B4', name: 'Prototype build and verification' },
  { id: 'B5', name: 'Design transfer and outsourced manufacturing' },
  { id: 'B6', name: 'Customer pilot and limited commercial release' },
  { id: 'BC', name: 'Commercial development' },
];
/* hours: A developer, B director, C business lead. Estimates of 2026-11-19, to be replaced after the handover. */
const T = (id, phase, title, week, weeks, a, b, c, deps, more = {}) => ({ id, phase, title, week, weeks, hours: { A: a, B: b, C: c }, actualHours: { A: 0, B: 0, C: 0 }, deps, percent: 0, owner: c > a && c > b ? 'C' : a >= b ? 'A' : 'B', status: 'Planning Estimate', approval: 'B', deliverables: [], requirements: [], risks: [], expense: [], evidence: [], ...more });
const M = (id, phase, title, week, deps, gate) => ({ id, phase, title, week, weeks: 0, milestone: true, hours: { A: 0, B: 0, C: 0 }, actualHours: { A: 0, B: 0, C: 0 }, deps, percent: 0, owner: 'B', status: 'Planning Estimate', approval: 'B', gate, deliverables: [], requirements: [], risks: [], expense: [], evidence: [] });
export const bTasks = [
  T('BT-001', 'B0', 'Request a dated snapshot of all work from the contractor', 1, 1, 2, 5, 0, [], { deliverables: ['Written request listing every file in the source checklist'] }),
  T('BT-002', 'B0', 'Inventory and configuration baseline of what is received', 2, 1, 16, 2, 0, ['BT-001'], { deliverables: ['Configuration baseline', 'Updated source checklist'], risks: ['BK-05'] }),
  T('BT-003', 'B0', 'Independent reproduction of one measurement', 3, 1, 24, 2, 0, ['BT-002'], { description: 'By the developer, who did not build the prototype, from the supplied files and instructions alone. Every undocumented step is recorded.', deliverables: ['Reproduction record'], risks: ['BK-05'] }),
  T('BT-004', 'B0', 'Agreement review: milestones, acceptance criteria and what was accepted', 1, 2, 0, 6, 0, [], { deliverables: ['Milestone status record'], owner: 'B' }),
  M('BM-0', 'B0', 'Handover decision', 3, ['BT-003', 'BT-004'], 'BG-0'),

  T('BT-101', 'B1', 'Requirements and measurement definition', 4, 2, 20, 5, 0, ['BM-0'], { deliverables: ['Requirements baseline', 'Measurement definition'] }),
  T('BT-102', 'B1', 'Architecture baseline: channel count, clocking, timing, calibration', 5, 2, 24, 3, 0, [{ id: 'BT-101', type: 'SS', lag: 1 }], { deliverables: ['Architecture baseline'] }),
  T('BT-103', 'B1', 'Safety and EMC applicability for the industrial market', 4, 3, 4, 6, 0, ['BM-0'], { deliverables: ['Applicability analysis'], owner: 'B', external: 'A product-safety engineer should read the applicability analysis.', risks: ['BK-06'] }),
  T('BT-104', 'B1', 'Quality plan on the shared procedures', 4, 2, 2, 5, 0, ['BM-0'], { deliverables: ['Quality plan'], owner: 'B' }),
  M('BM-1', 'B1', 'Requirements baseline approval', 6, ['BT-101', 'BT-102', 'BT-103', 'BT-104'], 'BG-1'),

  T('BT-201', 'B2', 'Test fixtures, reference resistors and access to the reference instrument', 7, 1, 16, 2, 0, ['BM-1'], { deliverables: ['Fixture record'], expense: ['BL-01', 'BL-02'] }),
  T('BT-202', 'B2', 'Timing: shared transient, known delay and frame correspondence on all modules', 8, 2, 40, 2, 0, ['BT-201'], { deliverables: ['Timing test record'], risks: ['BK-01'] }),
  T('BT-203', 'B2', 'Data integrity: lost, repeated and reordered frames', 9, 2, 26, 1, 0, [{ id: 'BT-202', type: 'SS', lag: 1 }], { deliverables: ['Data integrity record'], risks: ['BK-02'] }),
  T('BT-204', 'B2', 'Gain and phase calibration, noise and run-to-run variation', 10, 2, 36, 2, 0, ['BT-202'], { deliverables: ['Calibration procedure and records'], risks: ['BK-03'] }),
  T('BT-205', 'B2', 'Reference comparison on each channel', 12, 1, 28, 3, 0, ['BT-204'], { deliverables: ['Reference comparison record'], risks: ['BK-04'] }),
  T('BT-206', 'B2', 'Start-up repeatability, fault recovery, latency and update rate', 11, 2, 12, 1, 0, ['BT-203'], { deliverables: ['Reliability record'] }),
  T('BT-207', 'B2', 'Verification report: measured performance and deficiencies', 13, 1, 14, 6, 0, ['BT-205', 'BT-206'], { deliverables: ['Verification report'] }),
  M('BM-2', 'B2', '64-channel verification gate', 13, ['BT-207'], 'BG-2'),

  T('BT-301', 'B3', 'Trade study: carrier PCB or integrated converter design', 14, 1, 20, 4, 0, ['BM-2'], { deliverables: ['Trade study'] }),
  T('BT-302', 'B3', 'Schematics, power and clock architecture', 15, 3, 66, 3, 0, ['BT-301'], { deliverables: ['Schematics (native files)'] }),
  T('BT-303', 'B3', 'PCB layout, test points and manufacturing test interface', 18, 3, 66, 3, 0, ['BT-302'], { deliverables: ['PCB layout (native files)', 'Fabrication and assembly outputs'] }),
  T('BT-304', 'B3', 'Mechanical design', 18, 3, 18, 1, 0, ['BT-301'], { deliverables: ['Mechanical model'] }),
  T('BT-305', 'B3', 'Firmware and host software release package', 15, 6, 36, 2, 0, ['BM-2'], { deliverables: ['Firmware release package'] }),
  T('BT-306', 'B3', 'Bill of materials with lifecycle and sourcing evidence', 16, 2, 12, 5, 0, [{ id: 'BT-302', type: 'SS', lag: 1 }], { deliverables: ['Bill of materials with sourcing record'], risks: ['BK-07'] }),
  T('BT-307', 'B3', 'Independent design review', 21, 1, 8, 5, 0, ['BT-303', 'BT-306'], { deliverables: ['Design review record'], expense: ['BL-06'], external: 'Review of the analog path and layout by an outside engineer.' }),
  M('BM-3', 'B3', 'PCB release authorization', 21, ['BT-307', 'BT-304', 'BT-305'], 'BG-3'),

  T('BT-401', 'B4', 'Component sourcing, fabrication and assembly', 22, 3, 12, 3, 0, ['BM-3'], { description: 'Three weeks is an estimate until a vendor quotes.', deliverables: ['Assembled prototypes'], expense: ['BL-03', 'BL-04'] }),
  T('BT-402', 'B4', 'Bring-up and calibration', 25, 2, 60, 2, 0, ['BT-401'], { deliverables: ['Bring-up record'] }),
  T('BT-403', 'B4', 'Repeat of every essential test on the integrated PCB', 27, 3, 90, 4, 0, ['BT-402'], { deliverables: ['Verification records on the PCB'] }),
  M('BM-4', 'B4', 'Prototype verification gate', 29, ['BT-403'], 'BG-4'),

  T('BT-501', 'B5', 'Request-for-quotation package and manufacturer shortlist', 26, 2, 6, 8, 0, ['BM-3'], { deliverables: ['RFQ package', 'Shortlist with selection criteria'], owner: 'B' }),
  T('BT-502', 'B5', 'Manufacturer qualification and quality agreement', 30, 3, 6, 14, 0, ['BM-4', 'BT-501'], { deliverables: ['Qualification record', 'Technical and quality agreement'], owner: 'B' }),
  T('BT-503', 'B5', 'Manufacturing test procedure and fixture', 30, 3, 54, 2, 0, ['BM-4'], { deliverables: ['Production test procedure', 'Test fixture'], expense: ['BL-07'] }),
  T('BT-504', 'B5', 'Pilot build and first-article verification', 33, 4, 44, 8, 0, ['BT-502', 'BT-503'], { deliverables: ['Pilot lot', 'First-article record'], expense: ['BL-08'] }),
  M('BM-5', 'B5', 'Manufacturing readiness', 36, ['BT-504'], 'BG-5'),

  T('BT-601', 'B6', 'Installation at design partners against written acceptance criteria', 37, 4, 44, 6, 16, ['BM-5', 'BC-05'], { deliverables: ['Installation records', 'Customer acceptance records'] }),
  T('BT-602', 'B6', 'Field feedback, support and fixes', 41, 6, 66, 6, 12, ['BT-601'], { deliverables: ['Field issue log'] }),
  T('BT-603', 'B6', 'Release readiness review, warranty and support policy', 47, 2, 8, 8, 6, ['BT-602', 'BC-06'], { deliverables: ['Release readiness record'], owner: 'B' }),
  M('BM-6', 'B6', 'Limited commercial release decision', 48, ['BT-603'], 'BG-6'),

  T('BC-01', 'BC', 'Competitive analysis and product positioning', 1, 4, 0, 4, 16, [], { deliverables: ['Competitive matrix', 'Positioning statement'] }),
  T('BC-02', 'BC', 'Customer discovery interviews (target 10 to 15)', 3, 10, 4, 6, 50, [{ id: 'BC-01', type: 'SS', lag: 2 }], { deliverables: ['Interview records', 'Customer acceptance criteria'], risks: ['BK-08'] }),
  T('BC-03', 'BC', 'Design-partner selection (target two or more) and pilot agreement checklist', 11, 6, 2, 6, 20, [{ id: 'BC-02', type: 'SS', lag: 6 }], { deliverables: ['Design-partner shortlist', 'Pilot agreement checklist'] }),
  T('BC-04', 'BC', 'Pricing hypotheses and procurement expectations', 13, 6, 0, 4, 16, [{ id: 'BC-02', type: 'SS', lag: 8 }], { deliverables: ['Pricing record'] }),
  T('BC-05', 'BC', 'Paid pilot agreements', 20, 12, 2, 8, 24, ['BC-03', 'BM-2'], { deliverables: ['Signed pilot agreements'] }),
  T('BC-06', 'BC', 'Launch readiness: warranty, support and sales material', 38, 8, 2, 6, 30, ['BC-04'], { deliverables: ['Warranty and support policy', 'Sales material'] }),
];

export const bGates = [
  { id: 'BG-0', milestone: 'BM-0', title: 'Handover decision', after: [], tasks: ['BT-002', 'BT-003', 'BT-004'], evidence: ['E-BG0-01', 'E-BG0-02'], criteria: ['Every file in the source checklist is on file or its absence is recorded with an owner', 'One measurement was reproduced by an engineer who did not build the prototype', 'The agreement\'s milestone status is recorded'], authorises: 'Design work on the received baseline. If the reproduction fails, the decision records what must be rebuilt and what that costs.', approval: null, critical: true },
  { id: 'BG-1', milestone: 'BM-1', title: 'Requirements baseline approval', after: ['BG-0'], tasks: ['BT-101', 'BT-102', 'BT-103', 'BT-104'], evidence: ['E-BG1-01'], criteria: ['The impedance quantity is defined by formula', 'Every requirement names its test', 'The safety and EMC applicability has been read by a qualified person'], authorises: 'Verification against the baseline.', approval: null },
  { id: 'BG-2', milestone: 'BM-2', title: '64-channel verification gate', after: ['BG-1'], tasks: ['BT-202', 'BT-203', 'BT-204', 'BT-205', 'BT-206', 'BT-207'], evidence: ['E-BG2-01', 'E-BG2-02', 'E-BG2-03'], criteria: ['Sample correspondence is shown by a transient and a known-delay test', 'Each channel is within the agreed limit of the reference, or the report says which are not', 'Frame loss is detected and counted', 'Measured performance and deficiencies are written down'], authorises: 'Spending on the integrated PCB.', approval: null, critical: true },
  { id: 'BG-3', milestone: 'BM-3', title: 'PCB release authorization', after: ['BG-2'], tasks: ['BT-302', 'BT-303', 'BT-306', 'BT-307'], evidence: ['E-BG3-01', 'E-BG3-02'], criteria: ['Rule checks are clean or each exception is explained', 'The independent review is on record', 'Every critical part has dated sourcing evidence', 'A fabrication quotation is on record'], authorises: 'The fabrication and assembly order.', approval: null },
  { id: 'BG-4', milestone: 'BM-4', title: 'Prototype verification gate', after: ['BG-3'], tasks: ['BT-402', 'BT-403'], evidence: ['E-BG4-01'], criteria: ['Every essential test passed again on the integrated PCB, or each failure has an owner'], authorises: 'Manufacturer qualification and the pilot build.', approval: null },
  { id: 'BG-5', milestone: 'BM-5', title: 'Manufacturing readiness', after: ['BG-4'], tasks: ['BT-502', 'BT-503', 'BT-504'], evidence: ['E-BG5-01', 'E-BG5-02'], criteria: ['The manufacturer is qualified and the quality agreement is signed', 'First articles passed the production test', 'Each unit has a serialized record'], authorises: 'Shipment of pilot units to design partners.', approval: null },
  { id: 'BG-6', milestone: 'BM-6', title: 'Limited commercial release', after: ['BG-5'], tasks: ['BT-601', 'BT-602', 'BT-603'], evidence: ['E-BG6-01', 'E-BG6-02'], criteria: ['Design partners signed their acceptance criteria as met', 'Safety and EMC obligations for the sales region are met', 'Warranty, support and spare parts are in place'], authorises: 'Controlled commercial sale.', approval: null },
];

/* Non-labour costs. amount null means "not estimated: needs a quotation or the handover". Nothing here is a quote.
   The few figures given are allowances with their basis stated, so that the model can run. */
const L = (id, group, title, amount, week, basis) => ({ id, group, category: 'hardware', title, amount, kind: amount == null ? 'Not estimated' : 'Planning Estimate', week, actual: 0, actualWeek: null, source: basis, note: '' });
export const bLines = [
  L('BL-01', 'Engineering development', 'Reference instrument access for the comparison (rental or laboratory time)', null, 7, 'Needs a rental quotation. The agreement names the class of instrument.'),
  L('BL-02', 'Engineering development', 'Reference resistors, fixtures and test cells', null, 7, 'Needs a parts list after the requirements baseline.'),
  L('BL-03', 'Engineering development', 'Integrated PCB fabrication and assembly, engineering prototypes', null, 22, 'Needs a fabrication quotation at PCB release.'),
  L('BL-04', 'Engineering development', 'Components for engineering prototypes', null, 22, 'Needs the bill of materials.'),
  L('BL-05', 'Engineering development', 'Safety and EMC laboratory testing', null, 34, 'Needs the applicability analysis and a laboratory quotation.'),
  L('BL-06', 'Engineering development', 'Independent design and safety review', null, 21, 'Needs a quotation.'),
  L('BL-07', 'Manufacturing readiness', 'Production test fixture and manufacturer set-up charges', null, 30, 'Needs manufacturer quotations.'),
  L('BL-08', 'Pilot build working capital', 'Pilot lot: components, assembly, integration and calibration', null, 33, 'Needs the bill of materials, a lot size and manufacturer quotations.'),
  L('BL-09', 'Business development', 'Customer visits, demonstrations and trade events', null, null, 'Needs a visit plan from the interview program.'),
  L('BL-10', 'Support and operating', 'Shipping, installation, spares and warranty reserve for pilot units', null, 37, 'Needs the pilot agreements.'),
  L('BL-11', 'Engineering development', 'Design and analysis tools', 0, null, 'The same free design tools as the ECG/MCG plan; AI seats are counted once, in that plan.'),
];

/* Three schedules. Lean and Extended scale the baseline; every figure is an assumption. */
export const bScenarios = [
  { id: 'lean', name: 'Lean', durationWeeks: 40, contingencyPct: 15, summary: 'Carrier PCB that keeps the evaluation modules, one PCB run, pilots at two partners.', risks: ['No time for a second PCB run', 'Assumes the handover is complete and reproducible'] },
  { id: 'baseline', name: 'Baseline', durationWeeks: null, contingencyPct: null, summary: 'The plan as drawn: verification before PCB spending, one PCB run, a pilot lot.', risks: ['Several costs cannot be estimated before the handover and quotations'] },
  { id: 'extended', name: 'Extended', durationWeeks: 64, contingencyPct: 20, summary: 'A failed first verification or an incomplete handover, a second PCB run, safety laboratory testing in the schedule.', risks: ['Sixteen more weeks of labor', 'Revenue starts later'] },
];
