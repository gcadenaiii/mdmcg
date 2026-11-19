/* Product Build: user needs, requirements, design outputs, risks with their controls, and verification tests.
   SERVER SIDE ONLY (see program.js).

   Everything here is an Engineering Draft written on 2026-11-19 for the director to review at the requirements baseline.
   Where a number has not been decided, the text says "to be set at the baseline" and names what it must be derived from.
   No requirement is marked verified and no test has a result: none has been run.

   Ids: UN user need, RQ requirement, DO design output, R risk, RC risk control, VT verification test. */

export const needs = [
  { id: 'UN-01', text: 'A researcher can record the heart\'s electrical and magnetic signals from one wearable at the same instants.' },
  { id: 'UN-02', text: 'A researcher can trust that a recorded magnetic signal comes from the heart and can see how good it is.' },
  { id: 'UN-03', text: 'The team can change the magnetic sensor, the ECG front end or the processor without rewriting the cardiac software.' },
  { id: 'UN-04', text: 'Every recording carries what is needed to reproduce an analysis: time, calibration, sensor positions and versions.' },
  { id: 'UN-05', text: 'The wearer can wear the prototype comfortably and safely for a recording session.' },
  { id: 'UN-06', text: 'Recordings reach storage intact and only authorised people can read them.' },
  { id: 'UN-07', text: 'The Heart Twin software can read a recording and show both signals.' },
  { id: 'UN-08', text: 'The prototype runs from its own battery for a recording session.' },
  { id: 'UN-09', text: 'Leadership can see cost, schedule, risk and evidence for every decision.' },
  { id: 'UN-10', text: 'The design can still be built in later years: parts stay available or have a named replacement.' },
];

const RQ = (id, type, text, needs, method, more = {}) => ({ id, type, text, needs, method, status: 'Engineering Draft', ...more });
export const requirements = [
  RQ('RQ-01', 'System', 'The device shall sample all ECG and MCG channels from one clock, with the timing error between any two channels at or below a limit to be set at the baseline from the timing accuracy the analysis needs.', ['UN-01'], 'Test: shared test pulse into every channel'),
  RQ('RQ-02', 'System', 'A cardiac magnetic signal shall be recovered with a signal-to-noise ratio and a repeatability at or above criteria written down before the feasibility experiments. The criteria are derived from the virtual trial, which is computed, and are confirmed or changed only by the director.', ['UN-02'], 'Test: feasibility protocol', { hypothesis: true }),
  RQ('RQ-03', 'Hardware', 'Each magnetic channel\'s own noise, measured with the sensor in a shield or with a quiet reference, shall be at or below a figure to be set at the baseline from the chosen sensor\'s published noise.', ['UN-02'], 'Test: noise spectrum in a shield'),
  RQ('RQ-04', 'System', 'The acquisition shall support a sampling rate of 1 kHz on every channel. The usable signal band is whatever the chosen magnetic sensor delivers and is stated with the result.', ['UN-01'], 'Test: recorded sample count and spectrum', { hypothesis: true }),
  RQ('RQ-05', 'Hardware', 'The ECG front end shall record at least one ECG lead with input noise and bandwidth to be set at the baseline from the front-end part\'s datasheet.', ['UN-01'], 'Test: ECG simulator input'),
  RQ('RQ-06', 'System', 'The device shall carry a reference magnetic channel and a motion sensor recorded with the heart channels.', ['UN-02'], 'Inspection and test: recorded channels'),
  RQ('RQ-07', 'Firmware', 'Sensor, ECG front end and processor shall each sit behind a defined interface, so that one can be replaced with changes confined to its driver.', ['UN-03'], 'Review: interface specification; test: second sensor driver on the same interface'),
  RQ('RQ-08', 'Software', 'Every recording shall carry device id, firmware version, sensor and channel ids, calibration version, sampling rate, clock data, electrode configuration, sensor positions with their reference frame, and session and dataset ids.', ['UN-04'], 'Test: record check against the format specification'),
  RQ('RQ-09', 'Software', 'Raw recordings shall be stored unchanged, each with a hash made at the time of recording. Derived data shall name the raw files, the software version and the settings that made them.', ['UN-04', 'UN-06'], 'Test: hash check after transfer; re-run of one analysis'),
  RQ('RQ-10', 'Hardware', 'Parts that touch the wearer\'s skin shall be of materials with a stated record for skin contact, to be confirmed against the applicability analysis.', ['UN-05'], 'Inspection: material declarations'),
  RQ('RQ-11', 'Hardware', 'The surface temperature of the worn parts shall stay at or below a limit to be set at the baseline from the applicable safety standard.', ['UN-05'], 'Test: temperature during a recording session'),
  RQ('RQ-12', 'Hardware', 'The wearer shall be isolated from any mains-powered equipment. The prototype shall not be connected to a charger or to mains-powered instruments while worn.', ['UN-05'], 'Review: design; test: no connection possible while worn'),
  RQ('RQ-13', 'Hardware', 'The battery circuit shall have protection against over-charge, over-discharge, over-current and short circuit, and the cell shall carry its maker\'s safety certification.', ['UN-05', 'UN-08'], 'Inspection: cell certificate; test: protection trip'),
  RQ('RQ-14', 'Hardware', 'The device shall record for a session length to be set at the baseline on one charge.', ['UN-08'], 'Test: run time'),
  RQ('RQ-15', 'Hardware', 'The magnetic field made at the sensors by the device\'s own currents, cell and materials shall be at or below a budget to be set at the baseline from the heart signal\'s size.', ['UN-02'], 'Test: device on and off beside the sensors in a shield'),
  RQ('RQ-16', 'Software', 'Data in transit shall use TLS and data at rest shall be encrypted. Each device shall have its own identity and key.', ['UN-06'], 'Test: connection inspection; review: key handling'),
  RQ('RQ-17', 'Software', 'Access to recordings shall be by named account and role, with every access and change recorded.', ['UN-06'], 'Test: access attempts by each role'),
  RQ('RQ-18', 'Software', 'The Heart Twin software shall import a recording in the defined format and display the ECG and MCG channels on one time axis.', ['UN-07'], 'Test: import of a reference recording'),
  RQ('RQ-19', 'Firmware', 'Firmware images shall be signed and the device shall refuse an unsigned image.', ['UN-06'], 'Test: unsigned image refused'),
  RQ('RQ-20', 'System', 'Each part in the baseline design shall be Active at its maker, and each critical part shall have a documented substitute or an approved exception.', ['UN-10'], 'Review: sourcing table'),
  RQ('RQ-21', 'System', 'Design files shall be kept in editable, exportable formats under version control, and manufacturing outputs shall be generated from them.', ['UN-03', 'UN-10'], 'Inspection: repository'),
  RQ('RQ-22', 'System', 'Each requirement, risk control, test and approval shall have a unique id and be linked on the program page.', ['UN-09'], 'Inspection: traceability table'),
];

const DO = (id, title, requirements, task) => ({ id, title, requirements, task, status: 'Planning Estimate', location: null });
export const outputs = [
  DO('DO-01', 'Electrical architecture and schematics (native files)', ['RQ-01', 'RQ-03', 'RQ-04', 'RQ-05', 'RQ-06', 'RQ-12', 'RQ-13'], 'T-501'),
  DO('DO-02', 'Board layout and manufacturing file set', ['RQ-15', 'RQ-21'], 'T-504'),
  DO('DO-03', 'Mechanical model and enclosure', ['RQ-10', 'RQ-11', 'RQ-15'], 'T-503'),
  DO('DO-04', 'Acquisition firmware with the hardware abstraction interface', ['RQ-01', 'RQ-04', 'RQ-07', 'RQ-19'], 'T-703'),
  DO('DO-05', 'Recording format specification', ['RQ-08', 'RQ-09'], 'T-303'),
  DO('DO-06', 'Host recording tool', ['RQ-08', 'RQ-09'], 'T-702'),
  DO('DO-07', 'Ingestion and storage service (proof of concept)', ['RQ-09', 'RQ-16', 'RQ-17'], 'T-802'),
  DO('DO-08', 'Heart Twin import module and view', ['RQ-18'], 'T-704'),
  DO('DO-09', 'Sensor feasibility report', ['RQ-02', 'RQ-03'], 'T-204'),
  DO('DO-10', 'Battery and power design', ['RQ-13', 'RQ-14'], 'T-501'),
  DO('DO-11', 'Sourcing and lifecycle table', ['RQ-20'], 'T-401'),
  DO('DO-12', 'Traceability and program page', ['RQ-22'], 'T-002'),
];

/* Severity and probability on a 1 to 5 scale, estimated before any control and again with the controls in place.
   These are the team's first estimates and have not been reviewed. A control is "verified" only when a test names it
   and that test has evidence. */
const R = (id, area, hazard, harm, sev, prob, controls, sev2, prob2, more = {}) => ({ id, area, hazard, harm, severity: sev, probability: prob, controls, residualSeverity: sev2, residualProbability: prob2, status: 'Engineering Draft', owner: 'B', ...more });
const RC = (id, text, requirements = []) => ({ id, text, requirements });
export const risks = [
  R('R-01', 'Sensing', 'The chosen magnetic sensor cannot recover a heart signal outside a shield', 'The program\'s main aim fails; money spent on a custom board is lost', 4, 4, [RC('RC-01', 'Feasibility gate before any custom board spending', ['RQ-02']), RC('RC-02', 'A second sensor type evaluated side by side where the budget allows', ['RQ-07'])], 4, 2, { kind: 'Engineering' }),
  R('R-02', 'Measurement', 'Room noise or motion is taken for a heart signal', 'A wrong conclusion about feasibility', 4, 3, [RC('RC-03', 'A reference channel and a motion sensor recorded with the heart channels', ['RQ-06']), RC('RC-04', 'A known coil signal and a no-heart control in every condition; beats are never selected for looking like a heartbeat', ['RQ-02'])], 4, 2, { kind: 'Engineering' }),
  R('R-03', 'Foreseeable misuse', 'The prototype\'s output is read as a medical finding', 'A person acts on a research signal', 5, 2, [RC('RC-05', 'Research-use statement on the device, the software and every report; no interpretation is shown', []), RC('RC-06', 'Recordings of people only under the oversight set in decision D-03', [])], 5, 1, { kind: 'Regulatory' }),
  R('R-04', 'Measurement', 'ECG and MCG samples are not taken at the same instants', 'Timing between the two signals is wrong and the analysis is misled', 3, 3, [RC('RC-07', 'One clock for all channels and a shared test pulse', ['RQ-01'])], 3, 1, { kind: 'Engineering' }),
  R('R-05', 'Measurement', 'The device\'s own currents, cell or materials make a field at the sensors', 'The heart signal is buried or distorted', 4, 4, [RC('RC-08', 'Magnetic cleanliness budget, current-loop review of the layout, non-magnetic materials near the sensors', ['RQ-15'])], 4, 2, { kind: 'Engineering' }),
  R('R-06', 'Electrical', 'A fault connects the wearer to a hazardous voltage', 'Electric shock', 5, 2, [RC('RC-09', 'Battery operation only while worn; no charger or mains instrument can be connected while worn', ['RQ-12'])], 5, 1, { kind: 'Safety' }),
  R('R-07', 'Battery and thermal', 'The cell overheats, or a part becomes hot against the skin', 'Burn or fire', 5, 2, [RC('RC-10', 'Certified cell with a protection circuit', ['RQ-13']), RC('RC-11', 'Surface temperature limit and test', ['RQ-11'])], 5, 1, { kind: 'Safety' }),
  R('R-08', 'Software', 'Firmware drops or reorders samples without a sign', 'A recording looks sound but is not', 3, 3, [RC('RC-12', 'Sample counters and timestamps in every record, checked on import', ['RQ-08'])], 3, 1, { kind: 'Engineering' }),
  R('R-09', 'Cybersecurity', 'An unauthorised person reads or alters recordings or firmware', 'Loss of confidential data; altered results', 4, 3, [RC('RC-13', 'TLS, encryption at rest, a key for each device', ['RQ-16']), RC('RC-14', 'Named accounts by role with an access record', ['RQ-17']), RC('RC-15', 'Signed firmware', ['RQ-19'])], 4, 1, { kind: 'Security' }),
  R('R-10', 'Data integrity', 'A recording is changed, lost or cannot be traced to its settings', 'Results cannot be reproduced', 3, 3, [RC('RC-16', 'Hash at recording, raw files kept unchanged, derived data name their inputs', ['RQ-09'])], 3, 1, { kind: 'Engineering' }),
  R('R-11', 'Skin contact', 'A material against the skin irritates it', 'Skin reaction', 2, 3, [RC('RC-17', 'Materials with a stated skin-contact record; electrodes bought as finished medical electrodes', ['RQ-10'])], 2, 2, { kind: 'Safety' }),
  R('R-12', 'Supply and cost', 'A magnetic sensor costs far more than the allowance, has a long lead time or is not sold', 'The gate slips or the budget is exceeded', 3, 4, [RC('RC-18', 'Quotations before the order; the extended scenario holds the larger figure', ['RQ-20'])], 3, 3, { kind: 'Cost' }),
  R('R-13', 'Supply', 'A critical part is discontinued or has one seller', 'Redesign and requalification', 3, 3, [RC('RC-19', 'Active parts only, a documented substitute for each critical part, lifecycle checked at each gate', ['RQ-20'])], 3, 2, { kind: 'Schedule' }),
  R('R-14', 'Program', 'Two people cannot cover every discipline or review their own work independently', 'A design fault or a compliance gap goes unnoticed', 3, 4, [RC('RC-20', 'An outside engineer reviews the analogue design before release; a regulatory specialist reads the applicability analysis', [])], 3, 2, { kind: 'Schedule' }),
  R('R-15', 'EMC', 'The device disturbs, or is disturbed by, nearby equipment', 'Corrupted recordings; interference with other equipment', 3, 3, [RC('RC-21', 'Layout and shielding practice reviewed at release; emissions looked at on the bench before any formal test', [])], 3, 2, { kind: 'Engineering' }),
  R('R-16', 'Regulatory', 'Recordings of people are made without the oversight they need', 'Harm to the people recorded and to the company\'s standing; results that cannot be used', 4, 3, [RC('RC-22', 'No recording of a person before decision D-03 is settled in writing', [])], 4, 1, { kind: 'Regulatory' }),
];

const VT = (id, title, requirements, riskControls, method, where) => ({ id, title, requirements, riskControls, method, where, status: 'Planning Estimate', result: null });
export const tests = [
  VT('VT-01', 'Channel timing with a shared test pulse', ['RQ-01'], ['RC-07'], 'One pulse into every channel; the spread of its arrival times is the result.', 'Bench'),
  VT('VT-02', 'Feasibility protocol: coil signal and heart signal in five conditions', ['RQ-02'], ['RC-01', 'RC-04'], 'Still, moving, noisy room, shielded or controlled, normal laboratory. Criterion written beforehand. A no-heart control in each.', 'Bench and controlled room'),
  VT('VT-03', 'Sensor noise spectrum', ['RQ-03'], [], 'Sensor in a shield or against a quiet reference; spectrum over the heart band.', 'Bench'),
  VT('VT-04', 'Sampling rate and usable band', ['RQ-04'], [], 'Sample count over a timed run; response to a swept coil signal.', 'Bench'),
  VT('VT-05', 'ECG input noise and band', ['RQ-05'], [], 'ECG simulator into the front end.', 'Bench'),
  VT('VT-06', 'Reference and motion channels present and useful', ['RQ-06'], ['RC-03'], 'A field applied from far away must appear on the reference and be reduced on the heart channels after correction.', 'Bench'),
  VT('VT-07', 'Sensor swap on the abstraction interface', ['RQ-07'], ['RC-02'], 'A second sensor driver is fitted; the application code is unchanged.', 'Bench'),
  VT('VT-08', 'Record completeness', ['RQ-08'], ['RC-12'], 'Each field of the format is checked in recorded files; a dropped sample is injected and must be reported.', 'Software'),
  VT('VT-09', 'Integrity and reproducibility', ['RQ-09'], ['RC-16'], 'Hashes compared after transfer; one analysis re-run from raw files must give the same output.', 'Software'),
  VT('VT-10', 'Skin-contact materials', ['RQ-10'], ['RC-17'], 'Material declarations collected for every part that touches skin.', 'Inspection'),
  VT('VT-11', 'Surface temperature', ['RQ-11'], ['RC-11'], 'Temperature of worn surfaces over a full session.', 'Bench'),
  VT('VT-12', 'Isolation from mains while worn', ['RQ-12'], ['RC-09'], 'Design review, and an attempt to connect a charger while the device is in its worn state.', 'Bench'),
  VT('VT-13', 'Battery protection', ['RQ-13'], ['RC-10'], 'Cell certificate on file; over-current and short-circuit trip.', 'Bench'),
  VT('VT-14', 'Run time', ['RQ-14'], [], 'Recording until the battery cut-off.', 'Bench'),
  VT('VT-15', 'Self-made field at the sensors', ['RQ-15'], ['RC-08'], 'Device switched on and off beside the sensors in a shield.', 'Bench'),
  VT('VT-16', 'Transport and storage security', ['RQ-16'], ['RC-13'], 'Connection inspection, storage settings, key handling review.', 'Software'),
  VT('VT-17', 'Access by role', ['RQ-17'], ['RC-14'], 'Each role tries each action; the access record is read back.', 'Software'),
  VT('VT-18', 'Heart Twin import', ['RQ-18'], [], 'A reference recording imported and displayed.', 'Software'),
  VT('VT-19', 'Unsigned firmware refused', ['RQ-19'], ['RC-15'], 'An unsigned image and an altered image are offered to the device.', 'Bench'),
  VT('VT-20', 'Sourcing review', ['RQ-20'], ['RC-18', 'RC-19'], 'Lifecycle, sellers and substitutes checked for every part in the list.', 'Review'),
  VT('VT-21', 'Design files and outputs', ['RQ-21'], [], 'Manufacturing outputs regenerated from the repository on a clean machine.', 'Inspection'),
  VT('VT-22', 'Traceability complete', ['RQ-22'], [], 'The traceability table on the program page shows no broken link.', 'Inspection'),
];
