/* Product Build: quality system gap analysis, decisions, records, end-of-life plan and the program's written assumptions.
   SERVER SIDE ONLY (see program.js). Written 2026-11-19 as an Engineering Draft; nothing here is an approval or a certificate.
   The company does not hold ISO 13485 certification for this program and this page does not claim compliance with any standard. */

/* What the repository and the team's practice hold today against what ISO 13485:2016 asks for during design and development.
   state: 'In place' | 'Partly' | 'Missing'. `have` is what was found in the repository on 2026-11-19. */
const G = (id, clause, topic, state, have, need, when) => ({ id, clause, topic, state, have, need, when, status: state === 'In place' ? 'Engineering Draft' : 'Review Required' });
export const gaps = [
  G('QG-01', '4.2.4', 'Controlled documents and revisions', 'Partly', 'Every file is under version control with a dated history, and released site versions are listed in a deploy record.', 'A written document control procedure: who approves a document, how a revision is released, how an old one is withdrawn. A commit is not an approval.', 'Before G-1'),
  G('QG-02', '4.2.5', 'Records and their retention', 'Partly', 'Raw model output, call records and check results are kept. No retention period is written.', 'A list of record types with a retention period and where each is kept.', 'Before G-1'),
  G('QG-03', '5.5', 'Roles and approval authority', 'Missing', 'Two roles are named on this page.', 'A signed statement of who may approve requirements, design changes, purchases and gates, and who stands in.', 'Before G-1'),
  G('QG-04', '6.2', 'Training records', 'Missing', 'None.', 'A record that each person has read each procedure that applies to their work.', 'Before G-1'),
  G('QG-05', '7.3.2', 'Design and development plan', 'Partly', 'This page holds the stages, reviews, responsibilities and schedule.', 'The plan released as a controlled document and kept current as the work moves.', 'Before G-1'),
  G('QG-06', '7.3.3', 'Design inputs', 'Partly', 'User needs and requirements are drafted on this page with ids.', 'Review and approval by the director; several figures are still to be set.', 'G-1'),
  G('QG-07', '7.3.4', 'Design outputs', 'Missing', 'Outputs are listed; none exists yet.', 'Each output released against its requirements before it is used.', 'G-3 to G-5'),
  G('QG-08', '7.3.5', 'Design reviews', 'Missing', 'Eight gates are defined with criteria.', 'A record for each review: who took part, what was looked at, what was decided. One participant should be independent of the work reviewed.', 'Each gate'),
  G('QG-09', '7.3.6', 'Design verification', 'Missing', 'Twenty-two tests are planned; none has been run.', 'Protocols approved before the tests; records with results, equipment used and who ran them.', 'G-5 to G-7'),
  G('QG-10', '7.3.7', 'Design validation', 'Missing', 'Out of scope for this program.', 'A validation plan for a later phase. This program ends at engineering verification of a research prototype.', 'After G-8'),
  G('QG-11', '7.3.8', 'Design transfer', 'Missing', 'Out of scope for this program.', 'A statement that no transfer to production is made in this phase.', 'After G-8'),
  G('QG-12', '7.3.9', 'Design change control', 'Partly', 'Changes are visible in version history and in this page\'s history.', 'A change record that states what changes, why, what it affects (requirements, risks, tests) and who approved it.', 'From G-1'),
  G('QG-13', '7.3.10', 'Design and development file', 'Partly', 'This page indexes requirements, risks, tests, gates and decisions.', 'An index that points to every released record by id and revision.', 'From G-1'),
  G('QG-14', '7.4', 'Supplier assessment', 'Missing', 'A sourcing table with sellers and lifecycle.', 'A short assessment of each critical supplier and of the board vendor before an order.', 'Before G-4'),
  G('QG-15', '7.6', 'Test equipment calibration', 'Missing', 'None.', 'A list of instruments used for verification, each with its calibration state. Results from an uncalibrated instrument are marked as such.', 'Before G-5'),
  G('QG-16', '8.3', 'Nonconforming product, issues and deviations', 'Missing', 'An anomaly list is planned for bring-up and verification.', 'A simple procedure: record, assess, decide, close.', 'Before G-5'),
  G('QG-17', '8.5', 'Corrective and preventive action', 'Missing', 'None.', 'For a two-person research program an issue record with root cause and follow-up is enough; a full procedure comes with a quality system.', 'After G-8'),
  G('QG-18', '7.1 with ISO 14971', 'Risk management', 'Partly', 'A risk register with controls is drafted on this page.', 'A risk management plan with acceptance criteria, approved by the director; control verification; a residual-risk review.', 'G-3 and G-7'),
  G('QG-19', '4.1.6', 'Software used in the quality system', 'Missing', 'This page, the repository host and the design tools are in use; none has been assessed.', 'A short risk-based assessment of each tool whose output is relied on for a quality record.', 'Before G-4'),
];

/* Decisions the director must make. None has been made. `blocks` is what may not happen before the decision. */
/* due: the date by which the plan needs the answer (a planning date, from the task it holds up). owner: who decides. */
const DUE = { 'D-01': '2026-11-27', 'D-02': '2026-12-04', 'D-03': '2026-12-04', 'D-04': '2026-11-27', 'D-05': '2027-01-15', 'D-06': '2027-01-15', 'D-07': '2027-03-12', 'D-08': '2027-01-22', 'D-09': '2026-11-27', 'D-10': '2026-11-23' };
const D = (id, title, question, options, recommendation, blocks, needs = []) => ({ id, title, question, options, recommendation, blocks, needs, due: DUE[id] || null, owner: 'Director', program: 'ecg', plans: ['ecg'], impact: null, impactText: 'Held until decided: ' + blocks, evidence: needs.join('; '), status: 'Review Required', decision: null, decidedBy: null, decidedOn: null });
export const decisions = [
  D('D-01', 'Purchase of MCG sensor evaluation hardware', 'Which sensors are bought for the feasibility experiments, and at what cost?', ['The candidates the developer shortlists after quotations', 'A single lowest-cost candidate', 'Wait for a second quotation round'], 'Shortlist two sensor types if the quotations fit the allowance, so that one failure does not end the experiments.', 'Any sensor order (budget line H-01)', ['Quotations on record']),
  D('D-02', 'The feasibility criterion', 'What signal-to-noise ratio and repeatability must the heart signal reach for the gate to pass?', ['Derive from the virtual trial\'s figures for the chosen sensor', 'Take a published unshielded recording as the bar', 'Set a simpler bar on the coil signal only'], 'Derive it from the virtual trial and write it down before the first experiment. It must not be changed after results are seen.', 'The start of the feasibility experiments (T-203)'),
  D('D-03', 'Oversight for recording a person', 'Under what oversight may a heart recording be made on a person, including a member of the team?', ['An ethics committee review before any recording', 'A written determination from a qualified adviser that the planned recording does not need one', 'No recording of a person in this program: coil and phantom signals only'], 'Take advice from a qualified person before week 3. Until then the plan holds only coil and phantom signals, and the gate\'s heart-signal criterion cannot be met.', 'Any recording of a person', ['Applicability analysis, human subjects entry']),
  D('D-04', 'Tool subscriptions', 'Which paid tools are taken, and for how long?', ['Free design tools with one AI subscription', 'Add a paid design assistant for the layout weeks only', 'Add a paid mechanical CAD seat'], 'Start with the free design tools. Add a paid tool only for the weeks it is used, after a trial shows it saves time.', 'Any subscription (budget line S-01)'),
  D('D-05', 'Cloud proof of concept', 'May the developer create the paid cloud resources for the proof of concept?', ['Yes, the smallest plan, synthetic data only', 'Run it on a local machine and defer the cloud', 'Go straight to the later architecture'], 'Yes, the smallest plan, for synthetic and computed data only, with a monthly cost limit and an end date.', 'Creating any paid cloud resource (T-802)'),
  D('D-06', 'Outside reviewers', 'Who gives the independent design review and who reads the regulatory analysis?', ['One electronics engineer for the design review only', 'An electronics engineer and a regulatory specialist', 'Defer the regulatory reading to the next phase'], 'Engage the electronics reviewer before week 9. Ask a regulatory specialist for a fixed-price reading of the applicability analysis; if it does not fit the allowance, the extended scenario holds a larger figure.', 'Circuit board release (G-4)', ['Quotations on record']),
  D('D-07', 'Quality records system', 'Are quality records kept in the repository with written procedures, or in a dedicated quality system?', ['Repository and this page, with written procedures, for this program', 'A dedicated quality system now', 'Decide at the final gate'], 'Repository and this page for this program, and decide on a dedicated system at the final gate. A repository alone is not a compliant quality system; the gap list shows what is missing.', 'Nothing in this program; it shapes the next phase'),
  // The fabrication order is decided at gate G-4 (circuit board release), so it is not a second record here.
  D('D-09', 'Sensor that is not sold as a part', 'If the best-matching sensor has to be built and cannot be bought, does the program build it?', ['Use only sensors that can be bought', 'Build the element in a later program', 'Build it now, outside this budget'], 'Use bought sensors in this program. Building a sensor element is a separate research effort with its own budget.', 'Scope of T-201'),
  D('D-10', 'Start of the ECG/MCG plan', 'Does the plan start on the date shown, with the two people named?', ['Yes', 'Later date', 'Changed staffing'], 'Confirm the date and the people before any spending. The start date and the hours can be changed on this page.', 'All spending'),
];

/* The plan for the end of a part's life and of a device's life. Text only; nothing here has been carried out. */
export const eolPlan = [
  { topic: 'Replacement parts', text: 'Each critical part has a named substitute in the sourcing table before the architecture review. Where none exists, the exception is written and approved, and the part is bought in a quantity that covers the prototypes and a follow-on build.' },
  { topic: 'Product change notifications', text: 'The developer subscribes to change notices for each part at its maker and at the distributor. A notice opens a change record.' },
  { topic: 'Last-time buys', text: 'A last-time-buy notice on a part in the design opens a decision: buy for the planned builds, or redesign. A part already under such a notice is not designed in.' },
  { topic: 'Firmware compatibility', text: 'Each part sits behind the hardware abstraction interface. A substitute needs a driver, not a change to the cardiac software. The firmware reports which hardware revision it runs on.' },
  { topic: 'Requalification', text: 'A changed part repeats the tests linked to the requirements it touches. The traceability table lists them.' },
  { topic: 'Servicing', text: 'Prototypes are serviced by the developer only. Each unit has a record of what was replaced.' },
  { topic: 'Data export', text: 'Recordings are stored in a documented format with their metadata and can be exported whole, with their hashes, at any time.' },
  { topic: 'Secure retirement', text: 'A retired unit has its key revoked, its storage erased and its identity marked retired in the device list before it leaves the bench.' },
];

/* Dependencies of this page. No new package was added for it: the charts and the schedule view are drawn with plain SVG.
   Versions are those in the site's package file on 2026-11-19. Support status and known vulnerabilities have NOT been
   checked against the registries for this record and are marked so. */
export const dependencies = [
  { id: 'DEP-01', name: 'astro', version: '7.4.12', use: 'Builds the site, including this page', licence: 'MIT', status: 'Review Required', note: 'Already in the site. Support status and advisories not checked for this record.' },
  { id: 'DEP-02', name: 'three', version: '0.187.0', use: 'The 3D scene on the home page; not used by this page', licence: 'MIT', status: 'Review Required', note: 'Already in the site.' },
  { id: 'DEP-03', name: 'sharp', version: '0.35.5', use: 'Image sizes at build; not used by this page', licence: 'Apache-2.0', status: 'Review Required', note: 'Already in the site.' },
  { id: 'DEP-04', name: 'playwright-core', version: '1.56.1', use: 'Screenshots and page checks during development only', licence: 'Apache-2.0', status: 'Review Required', note: 'Development only.' },
  { id: 'DEP-05', name: 'Web Crypto (browser and Node built in)', version: 'platform', use: 'Encrypts this page\'s data at build and opens it with the access code', licence: 'Part of the platform', status: 'Engineering Draft', note: 'No package. AES-GCM with a key from PBKDF2-SHA-256.' },
  { id: 'DEP-06', name: 'Schedule and chart drawing', version: 'own code', use: 'The schedule view and the charts on this page', licence: 'Own code', status: 'Engineering Draft', note: 'A schedule library was considered and not added: the calculation is small, is covered by tests, and a library would add a dependency to review and maintain.' },
];

export const assumptions = [
  'The two people named are available for the hours shown from the start date.',
  'All hours and all non-labour figures are planning estimates from the program brief of 2026-11-19. None is a quotation.',
  'Labour is rate times weekly hours times weeks. Hours placed in tasks are checked against that total and are not added to it.',
  'Contingency is a percentage of all direct costs and is shown apart from them.',
  'The schedule counts whole weeks from a Monday. Public holidays are not yet taken out.',
  'Two weeks for board fabrication with assembly is an estimate until a vendor quotes.',
  'The magnetic sensor is bought, not built. The sensor with the best published match to the task is not sold as a part.',
  'Figures from the heart twin and the virtual trial are computed. They set criteria; they are not results of this program.',
  'The cloud proof of concept holds synthetic and computed data only. It never holds data that identifies a person.',
  'This program ends at engineering verification of a research prototype. It makes no clinical claim and no claim of compliance with any standard.',
  'What a person changes on this page is stored in that person\'s browser. It reaches others by export and import, or by an update of the page\'s data files.',
];

/* Weekly report: the page fills this from live data; the three text fields are written by the person reporting. */
export const weeklyReportFields = ['Week and dates', 'Overall status', 'Current gate and what it still needs', 'Work finished this week', 'Work planned next week', 'Hours planned and logged, by role', 'Spending planned and actual, to date', 'Schedule: slipped or overdue tasks', 'New or changed risks', 'Decisions needed from the director', 'Anomalies opened and closed'];
