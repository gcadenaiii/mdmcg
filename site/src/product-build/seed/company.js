/* Company strategy and shared operations. SERVER SIDE ONLY (see program.js).
   Written 2026-11-19 as a planning draft; cut back on 2026-11-20 to a company with one product, the wearable heart device.
   No order, quotation, award or approval is recorded here, because none was found on record. */

/* People whose hours are planned beside the two engineering roles (which live in program.js). */
export const extraPeople = [
  { id: 'C', name: 'Business lead (to be named)', short: 'Business lead', rate: null, weeklyHours: null, note: 'Partners and funding need a named person. No rate and no weekly hours are on record, so these hours are shown without a cost and without a capacity line.' },
];

export const objectives = [
  { id: 'OB-2', kind: 'Product', title: 'Develop the wearable ECG/MCG heart device and its cardiac software', measure: 'MCG feasibility gate decided with measurements', gate: 'G-2', program: 'ecg' },
  { id: 'OB-3', kind: 'Financial', title: 'Revenue, customer-funded development, partners, selected grants or investment', measure: 'Cash received, by source, against the plan\'s monthly need', gate: null, program: 'funding' },
  { id: 'OB-5', kind: 'Technology', title: 'Keep control of software, algorithms, firmware, design files, test methods, calibration and product data', measure: 'Every design file and source on file under version control', gate: null, program: 'shared' },
  { id: 'OB-6', kind: 'Quality', title: 'Structured, risk-based engineering and quality from the start', measure: 'Shared procedures written; open links in the traceability table', gate: null, program: 'shared' },
  { id: 'OB-7', kind: 'Management', title: 'Transparent cost, schedule, risk and responsibility', measure: 'This plan: one capacity model, one budget per program, every figure with its basis', gate: null, program: 'shared' },
];

/* Shared operations: the company procedure, and what the medical device adds to it. */
const SP = (id, process, shared, ecg, state) => ({ id, process, shared, ecg, state, status: state === 'In place' ? 'Engineering Draft' : 'Review Required' });
export const sharedProcesses = [
  SP('SH-01', 'Document control', 'One procedure, one numbering scheme, one approval rule', 'Records kept to ISO 13485 with the design and development file', 'Missing'),
  SP('SH-02', 'Supplier management', 'One approved-supplier list and assessment form', 'Critical component makers and the board vendor', 'Missing'),
  SP('SH-03', 'Change management', 'One change record: what, why, what it affects, who approved', 'Design change under design control', 'Partly'),
  SP('SH-04', 'Configuration control', 'Version control for every design and source file; tagged releases', 'Prototype unit records', 'Partly'),
  SP('SH-05', 'Training', 'One record of who has read which procedure', 'Bench safety before any recording', 'Missing'),
  SP('SH-06', 'Corrective action', 'One issue record with cause and follow-up', 'Anomalies in verification', 'Missing'),
  SP('SH-07', 'Design reviews', 'One review record form; one independent participant', 'Gates G-1 to G-8', 'Partly'),
  SP('SH-08', 'Software assurance', 'Risk-based check of each tool whose output becomes a record', 'Software lifecycle to the medical standard', 'Missing'),
  SP('SH-09', 'Security and access control', 'Named accounts by role (decision ED-03)', 'Recordings; nothing that identifies a person', 'Partly'),
  SP('SH-10', 'Records retention', 'One list of record types and periods', 'Design records for the device\'s life', 'Missing'),
  SP('SH-11', 'Audit preparation', 'One internal check list a year', 'ISO 13485, if and when sought', 'Missing'),
];

/* One authoritative place for each kind of record. */
export const sourcesOfTruth = [
  { data: 'Source code, firmware, design files', home: 'Private version-controlled repositories', rule: 'Nothing else holds a copy that can be edited' },
  { data: 'Engineering tasks and milestones, day to day', home: 'The task board beside the code, once the team starts using it', rule: 'This plan holds the schedule model; when the board is in use, task status is read from it and never typed twice' },
  { data: 'Schedule model, budgets, scenarios, capacity', home: 'This plan', rule: 'Figures are worked out from task, rate and cost records; a person\'s change is kept apart from the page data' },
  { data: 'Requirements, risks, tests, evidence pointers', home: 'This plan, until a controlled quality system is chosen', rule: 'Evidence files stay in the repository; the plan holds the pointer' },
  { data: 'Controlled approvals and released quality records', home: 'Not yet decided (decision D-07)', rule: 'An entry here is a working record, not a controlled one' },
  { data: 'Partners and funding opportunities', home: 'This plan', rule: 'One record per organisation; no second list elsewhere' },
  { data: 'Invoices and payments', home: 'The company\'s accounts', rule: 'This plan holds a pointer and an amount; the accounts are authoritative' },
];
export const syncRules = ['An outside tool is read into this plan; this plan never writes to it without a person asking', 'If a record differs in two places, the authoritative place above wins and the difference is listed', 'An approved record is never changed by a regenerated page: a person\'s entries are stored apart and win', 'Task completion is never set by an AI tool; a person sets it', 'Every change on this page is entered in the history with who and when'];

/* How the private area is protected today, as found in the code on 2026-11-19, and what is proposed. */
export const securityAudit = {
  today: [
    { item: 'Where the data is', finding: 'One file on the public server, encrypted (AES-256-GCM). The key comes from the access code (PBKDF2-SHA-256, 600,000 rounds). Without the code the file cannot be read.', state: 'In place' },
    { item: 'Where it is decrypted', finding: 'In the reader\'s browser. The server does not check who asks: anyone can download the encrypted file and try codes on their own machine.', state: 'Partly' },
    { item: 'Accounts and roles', finding: 'None. One shared code; no named accounts; a person who has the code cannot be removed except by changing the code and publishing again.', state: 'Missing' },
    { item: 'Sessions', finding: 'The code is kept for the browser tab only.', state: 'In place' },
    { item: 'Where changes are kept', finding: 'In each reader\'s browser. No shared store, no server backup, no server audit log. The page\'s own history is a hash chain in that browser.', state: 'Partly' },
    { item: 'Transport', finding: 'HTTPS on the public server.', state: 'In place' },
    { item: 'Public code', finding: 'The page\'s program code is public and holds no figure; tests search every built file for internal text.', state: 'In place' },
    { item: 'Source repository', finding: 'Rates, budgets and these records are in the private repository in plain text.', state: 'Partly' },
    { item: 'Dependency and secret scanning', finding: 'Not switched on for the repository.', state: 'Missing' },
  ],
  verdict: 'The data is not in the public bundle in readable form, and it is not a hidden page: it is encrypted. It is still protected by one shared code and checked in the browser, not on a server. That does not meet the standard this program sets for financial, intellectual property, quality and customer records.',
  proposal: [
    { part: 'Sign-in', design: 'Named accounts with a second factor; roles for owner, director, engineer and read-only partner. A single sign-in page, no shared code.' },
    { part: 'Server', design: 'A small application server that checks the session before it sends any record. The private area leaves the public site\'s files.' },
    { part: 'Store', design: 'A database with encryption at rest, versioned records and a daily backup that is restored once as a test.' },
    { part: 'Audit', design: 'Every read of a sensitive record and every change written to a log the application cannot rewrite.' },
    { part: 'Secrets', design: 'Held in the host\'s secret store; none in the repository; secret and dependency scanning switched on.' },
    { part: 'Migration', design: 'Each person saves their changes to a file on this page and loads it once into the new store. Record ids stay the same.' },
    { part: 'Hosting', design: 'A small cloud instance is enough for planning data. It holds no health data. Anything that identifies a patient needs the later architecture in the ECG/MCG plan.' },
  ],
  needs: 'This changes the production server and adds a monthly cost. It is not built. It waits for decision ED-03.',
};

/* What an AI tool may draft and what only a person decides. */
export const aiUse = {
  ai: ['Work breakdowns and schedules', 'Supplier and funding research with sources', 'Draft specifications and test protocols', 'Traceability and quality gap checks', 'Budget arithmetic', 'Software', 'Draft reports'],
  human: ['Safety-critical engineering decisions', 'Approval of requirements', 'Final product acceptance', 'Supplier qualification', 'Financial commitments', 'Anything sent outside the company', 'Grant certifications', 'Customer contract acceptance', 'Manufacturing release'],
  marks: 'A record made by an AI tool is marked Engineering Draft or Planning Estimate. It becomes Approved or Tested only through a person\'s named entry with evidence.',
};

/* Decisions for the executive. None is made. impact: dollars where a figure exists, else null with impactText. */
/* plans: every plan the decision holds up (so each plan's own screen can count it). program: where it is filed. */
const HOLDS = { 'ED-03': ['ecg', 'funding'], 'ED-04': ['ecg', 'funding'], 'ED-05': ['funding'], 'ED-07': ['funding'] };
const ED = (id, title, due, question, options, recommendation, evidence, owner, impact, impactText, program) => ({ id, title, due, question, options, recommendation, evidence, owner, impact, impactText, program, plans: HOLDS[id] || [program], status: 'Review Required', decision: null, decidedBy: null, decidedOn: null });
export const execDecisions = [
  ED('ED-03', 'A server-side store with named accounts for this plan', '2026-12-18', 'Build the proposed sign-in, database and audit log, at a monthly hosting cost and a change to the production server?', ['Build it now', 'Stay with the encrypted file until customer or partner records are entered', 'Use a hosted tool for the sensitive records'], 'Build it before any customer, quotation or investor record is entered. Until then, enter no such record here.', 'Security audit under Shared Operations and Quality', 'Owner', null, 'Hosting from about the cost of one small instance a month; engineering hours not yet estimated', 'shared'),
  ED('ED-04', 'Cash on hand and the approved budget', '2026-11-30', 'What cash is available today, and how far is spending on the device plan approved?', ['Enter cash on hand and approve the device plan up to its next gate only', 'Hold spending until funding is received'], 'Enter the cash figure on the Money screen. Without it no runway or funding gap can be worked out. Approve spending one gate at a time.', 'Money screen', 'Owner', null, 'The cost of each plan is shown there', 'shared'),
  ED('ED-05', 'Who leads partners and funding', '2026-11-30', 'The plan places partner and funding hours on a business lead. Who is it, at what hours and cost?', ['A founder, part time', 'A contracted business developer', 'The director, with fewer engineering hours'], 'Name a person and a weekly hour figure. If it is the director, the engineering schedule moves, and the plan will show by how much.', 'Shared capacity chart', 'Owner', null, 'Not costed: no rate on record', 'shared'),
  ED('ED-07', 'Which funding applications to prepare', '2026-11-30', 'Which programs are applied to, with whom as lead investigator?', ['One cardiac application', 'All eligible programs'], 'The nearest dates read are health-agency dates on 2027-01-05. Decide after the eligibility check. An application costs director and business-lead hours that the capacity chart must show.', 'Funding plan, Pipeline', 'Owner', null, 'Amounts by opportunity are in the pipeline, none committed', 'funding'),
];

/* Records people add on the page. All start empty: none exists. */
export const capital = { id: 'capital', cashOnHand: null, asOf: null, note: 'Not on record. Enter the figure to see the balance, the runway and the funding gap.' };
export const expenses = [];
export const allocations = [];
export const partners = [];

/* Where one plan waits on the other (drawn as a dashed link on the master roadmap). Keys are "program:task id". */
export const crossLinks = [
  { from: 'ecg:M-2', to: 'funding:FM-3', why: 'A cardiac application is stronger with the feasibility result' },
];
