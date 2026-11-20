/* Company strategy and the battery plan's commercial, manufacturing and support records. SERVER SIDE ONLY (see program.js).
   Written 2026-11-19 as a planning draft. "Stated" means a company document says it (data/product-build/internal.json holds
   the quote and page); it is not independently verified. "Hypothesis" means nobody has evidence yet. No customer, order,
   quotation, award or approval is recorded here, because none was found on record. */

/* People whose hours are planned beside the two engineering roles (which live once, in program.js, for every program). */
export const extraPeople = [
  { id: 'C', name: 'Business lead (to be named)', short: 'Business lead', rate: null, weeklyHours: null, note: 'Customer discovery, partners and funding need a named person. No rate and no weekly hours are on record, so these hours are shown without a cost and without a capacity line.' },
];

export const objectives = [
  { id: 'OB-1', kind: 'Primary, near term', title: 'Complete and sell the battery impedance scanning product', measure: 'Handover reproduced; 64-channel verification passed; two design partners; a first paid pilot', gate: 'BG-2', program: 'battery' },
  { id: 'OB-2', kind: 'Long term technology', title: 'Keep developing the ECG/MCG device and its cardiac software', measure: 'MCG feasibility gate decided with measurements', gate: 'G-2', program: 'ecg' },
  { id: 'OB-3', kind: 'Financial', title: 'Revenue, customer-funded development, partners, selected grants or investment', measure: 'Cash received, by source, against the plan\'s monthly need', gate: null, program: 'funding' },
  { id: 'OB-4', kind: 'Operating', title: 'Stay lean: outsource manufacture, fabrication, calibration, logistics and selected support', measure: 'One qualified manufacturer and a signed quality agreement before the pilot lot', gate: 'BG-5', program: 'battery' },
  { id: 'OB-5', kind: 'Technology', title: 'Keep control of software, algorithms, firmware, design files, test methods, calibration and product data', measure: 'Every design file and source on file under version control; ownership settled (ED-01, ED-08)', gate: 'BG-0', program: 'shared' },
  { id: 'OB-6', kind: 'Quality', title: 'Structured, risk-based engineering and quality from the start', measure: 'Shared procedures written; open links in each traceability table', gate: null, program: 'shared' },
  { id: 'OB-7', kind: 'Management', title: 'Transparent cost, schedule, risk and responsibility', measure: 'This plan: one capacity model, one budget per program, every figure with its basis', gate: null, program: 'shared' },
];
export const ambition = 'A business of several million dollars a year is an ambition to be tested with customer evidence and the financial scenarios. It is not a forecast. The only revenue projection found in the company\'s documents is a 2024 plan that shows a loss in every year.';

/* Business model chain. status: 'Stated' (company document), 'Shown' (a video or record shows it), 'Hypothesis'. */
export const businessModel = [
  { step: 'Customer need', text: 'Find weak or defective cells sooner; cut scrap and test time', status: 'Stated', basis: 'Company commercialization plan: scrap cost of large cells; interviews summarised there' },
  { step: 'Product', text: 'Multi-channel impedance scanner with magnetic mapping', status: 'Shown', basis: 'A bench assembly and repeated displayed results are shown in the videos; full function is not verified' },
  { step: 'Measurement capability', text: 'Many channels at the same instants; local resistance variation', status: 'Hypothesis', basis: 'Sample correspondence, calibration and the 5% reference criterion are untested' },
  { step: 'Software value', text: 'Maps, pass or fail output, analytics on the customer\'s own computers', status: 'Hypothesis', basis: 'The company\'s own positioning note says a machine-readable output is not shipping' },
  { step: 'Customer outcome', text: 'Fewer scrapped cells; faster development', status: 'Hypothesis', basis: 'No customer acceptance record on file' },
  { step: 'Revenue', text: 'Sale or rental, paid pilots, development contracts', status: 'Hypothesis', basis: 'One rental price on a product sheet; one validation contract named in a 2024 plan, contract not on file' },
  { step: 'Support and recurring', text: 'Calibration, software, support contracts', status: 'Hypothesis', basis: 'No policy or price on record' },
];

/* Shared operations: which processes are common, and what each product adds. */
const SP = (id, process, shared, battery, ecg, state) => ({ id, process, shared, battery, ecg, state, status: state === 'In place' ? 'Engineering Draft' : 'Review Required' });
export const sharedProcesses = [
  SP('SH-01', 'Document control', 'One procedure, one numbering scheme, one approval rule', 'Records kept to ISO 9001', 'Records kept to ISO 13485 with the design and development file', 'Missing'),
  SP('SH-02', 'Supplier management', 'One approved-supplier list and assessment form', 'Contract manufacturer and calibration laboratory', 'Critical component makers and the board vendor', 'Missing'),
  SP('SH-03', 'Change management', 'One change record: what, why, what it affects, who approved', 'Engineering change with customer notice where units are in the field', 'Design change under design control', 'Partly'),
  SP('SH-04', 'Configuration control', 'Version control for every design and source file; tagged releases', 'Serialized product record', 'Prototype unit records', 'Partly'),
  SP('SH-05', 'Training', 'One record of who has read which procedure', 'Operators at the manufacturer', 'Bench safety before any recording', 'Missing'),
  SP('SH-06', 'Corrective action', 'One issue record with cause and follow-up', 'Field failures and warranty returns', 'Anomalies in verification', 'Missing'),
  SP('SH-07', 'Design reviews', 'One review record form; one independent participant', 'Gates BG-0 to BG-6', 'Gates G-1 to G-8', 'Partly'),
  SP('SH-08', 'Software assurance', 'Risk-based check of each tool whose output becomes a record', 'Production test software', 'Software lifecycle to the medical standard', 'Missing'),
  SP('SH-09', 'Security and access control', 'Named accounts by role (decision ED-03)', 'Customer and product data', 'Recordings; nothing that identifies a person', 'Partly'),
  SP('SH-10', 'Records retention', 'One list of record types and periods', 'Product and service records for the product\'s life', 'Design records for the device\'s life', 'Missing'),
  SP('SH-11', 'Audit preparation', 'One internal check list a year', 'ISO 9001 certification, if and when sought', 'ISO 13485, if and when sought', 'Missing'),
];
export const productSpecific = ['Verification and validation records', 'Technical file', 'Risk register', 'Regulatory and marketing claims', 'Product standards: instrument safety and EMC for the battery product; medical electrical, usability, biocompatibility and software standards for ECG/MCG'];

/* One authoritative place for each kind of record. */
export const sourcesOfTruth = [
  { data: 'Source code, firmware, design files', home: 'Private version-controlled repositories', rule: 'Nothing else holds a copy that can be edited' },
  { data: 'Engineering tasks and milestones, day to day', home: 'The task board beside the code, once the team starts using it', rule: 'This plan holds the schedule model; when the board is in use, task status is read from it and never typed twice' },
  { data: 'Schedule model, budgets, scenarios, capacity', home: 'This plan', rule: 'Figures are worked out from task, rate and cost records; a person\'s change is kept apart from the page data' },
  { data: 'Requirements, risks, tests, evidence pointers', home: 'This plan, until a controlled quality system is chosen', rule: 'Evidence files stay in the repository; the plan holds the pointer' },
  { data: 'Controlled approvals and released quality records', home: 'Not yet decided (decision ED-10)', rule: 'An entry here is a working record, not a controlled one' },
  { data: 'Customers, partners, funding opportunities', home: 'This plan', rule: 'One record per organisation; no second list elsewhere' },
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
const ED = (id, title, due, question, options, recommendation, evidence, owner, impact, impactText, program) => ({ id, title, due, question, options, recommendation, evidence, owner, impact, impactText, program, status: 'Review Required', decision: null, decidedBy: null, decidedOn: null });
export const execDecisions = [
  ED('ED-01', 'Which company owns, sells and funds the battery product', '2026-11-30', 'The engineering agreement, the grant application and the patent license are in the name of Parthian Energy LLC. Does that company sell the product, does MDMCG, or is there an agreement between them?', ['Parthian Energy sells; MDMCG provides engineering under contract', 'MDMCG sells under a license from Parthian Energy', 'The two are combined'], 'Settle this in writing with legal advice before any customer, partner or funding document is signed. It decides which company may apply for which grant.', 'Agreement clause 3; grant application and plan (internal documents F-189, F-171)', 'Owner', null, 'Decides where every dollar of battery revenue and funding is booked', 'battery'),
  ED('ED-02', 'Order of work for the two engineers', '2026-11-23', 'Both programs plan the same developer and director. Which program has the engineers when both need them?', ['Battery first; ECG/MCG limited to sensor quotations and planning until battery verification', 'ECG/MCG as planned; battery starts after', 'Both, with a second engineer'], 'Battery first, as the stated near-term priority. Keep the ECG/MCG sensor quotations and the regulatory reading moving, since they need few hours. The Strategic Roadmap shows each choice.', 'Shared capacity chart; reallocation table', 'Director', null, 'A second engineer costs the same hourly rate times the overlap; the roadmap works it out', 'shared'),
  ED('ED-03', 'A server-side store with named accounts for this plan', '2026-12-18', 'Build the proposed sign-in, database and audit log, at a monthly hosting cost and a change to the production server?', ['Build it now', 'Stay with the encrypted file until customer or partner records are entered', 'Use a hosted tool for the sensitive records'], 'Build it before any customer, quotation or investor record is entered. Until then, enter no such record here.', 'Security audit under Shared Operations and Quality', 'Owner', null, 'Hosting from about the cost of one small instance a month; engineering hours not yet estimated', 'shared'),
  ED('ED-04', 'Cash on hand and the approved budget', '2026-11-30', 'What cash is available today, and which program budgets are approved?', ['Enter cash on hand and approve the battery handover phase only', 'Approve both programs\' first gates', 'Hold spending until funding is received'], 'Enter the cash figure under Portfolio Financials. Without it no runway or funding gap can be worked out. Approve spending one gate at a time.', 'Portfolio Financials', 'Owner', null, 'The ECG/MCG planning total and the battery labor floor are shown there', 'shared'),
  ED('ED-05', 'Who leads customers, partners and funding', '2026-11-30', 'The plan places commercial and funding hours on a business lead. Who is it, at what hours and cost?', ['A founder, part time', 'A contracted business developer', 'The director, with fewer engineering hours'], 'Name a person and a weekly hour figure. If it is the director, the engineering schedule moves, and the plan will show by how much.', 'Shared capacity chart', 'Owner', null, 'Not costed: no rate on record', 'shared'),
  ED('ED-06', 'The handover request to the contractor', '2026-12-04', 'What is asked of the contractor, and on what terms? The agreement\'s end date has passed and its 12-month repair term runs from each milestone\'s completion.', ['Ask for the full file set under the agreement', 'Pay for a handover session', 'Proceed from the hardware alone'], 'Send the source checklist as a written request first. Record which milestones were accepted and paid before any discussion of terms.', 'Battery plan, Engineering Completion; agreement sections 2.1 and 2.2', 'Director', null, 'Final milestone is 40% of a fee of up to $145,000 under the agreement', 'battery'),
  ED('ED-07', 'Which funding applications to prepare', '2026-11-30', 'Which programs are applied to, by which company, with whom as lead investigator?', ['One battery and one cardiac application', 'Customer-funded pilots only for now', 'All eligible programs'], 'The nearest date read is an energy-agency pitch due 2026-12-16; health-agency dates follow on 2027-01-05. Decide by the end of November whether to prepare the December pitch, after the eligibility check and decision ED-01. An application costs director and business-lead hours that the capacity chart must show.', 'Funding plan, Pipeline', 'Owner', null, 'Amounts by opportunity are in the pipeline, none committed', 'funding'),
  ED('ED-08', 'The university patent license', '2026-12-18', 'What does the license allow, what does it cost per sale, and can it be used by MDMCG?', ['Obtain and read the license', 'Ask the university for a statement of terms'], 'Read the license before pricing. A percentage owed on sales changes the unit margin.', 'Internal documents F-171: patents licensed from the university, percentage not stated', 'Owner', null, 'A royalty of unknown size on each sale', 'battery'),
  ED('ED-09', 'What is sold: instrument, rental, or license', '2027-01-15', 'A 2024 company plan chose joint validation and software licensing over selling hardware. This program plans an instrument. Which is it?', ['Sell or rent the instrument to laboratories first', 'License design and software to cell makers', 'Both, in that order'], 'Decide after the first ten interviews. Laboratories can buy an instrument now; cell makers told the company they build their own test equipment.', 'Internal documents F-196, F-078, F-081; customer interviews when held', 'Owner', null, 'Changes the whole revenue model', 'battery'),
  ED('ED-10', 'Controlled quality records', '2027-03-12', 'Keep quality records in the repository with written procedures, or take a dedicated quality system?', ['Repository and this plan for now', 'A dedicated system when the first product is released'], 'Decide at the first release gate of either product. See decision D-07 in the ECG/MCG plan.', 'Shared Operations and Quality', 'Director', null, 'Dedicated systems are sold by the year from five figures', 'shared'),
];

/* What-if plans for the shared engineers. shift = weeks added to a program's start. extra = added weekly hours. */
export const reallocations = [
  { id: 'RA-1', name: 'Both as now planned', shift: {}, extra: {}, note: 'Each plan as written. Shows the conflict.' },
  { id: 'RA-2', name: 'Battery first, ECG/MCG after battery verification', shift: { ecg: 14 }, extra: {}, note: 'The ECG/MCG plan starts after the battery verification gate.' },
  { id: 'RA-3', name: 'ECG/MCG first, battery after', shift: { battery: 16 }, extra: {}, note: 'The battery plan starts when the ECG/MCG plan ends.' },
  { id: 'RA-4', name: 'Both, with a second developer', shift: {}, extra: { A: 36 }, extraRate: 80, note: 'A second developer at the same rate for the whole period. Recruiting time is not in the model.' },
];

/* ---------------------------------------------------------------- battery: commercial */

export const funnelTargets = { 'Customer discovery': 12, 'Qualified opportunity': 6, 'Technical evaluation': 4, 'Paid pilot': 2, 'Customer acceptance': 2, 'Purchase order': 1 };
export const funnelMeasures = [
  { stage: 'Customer discovery', measure: 'Interviews held with a written record', target: '10 to 15' },
  { stage: 'Qualified opportunity', measure: 'A named buyer with a budget, a use and a date', target: 'Half of interviews' },
  { stage: 'Technical evaluation', measure: 'Their cells measured, or our data reviewed by their engineer', target: '4' },
  { stage: 'Paid pilot', measure: 'A signed pilot agreement with a price', target: '2 or more design partners' },
  { stage: 'Customer acceptance', measure: 'Their written acceptance criteria signed as met', target: 'Every pilot' },
  { stage: 'Purchase order', measure: 'An order received', target: 'From at least one pilot' },
  { stage: 'Delivery', measure: 'Unit shipped with its serialized record', target: 'On the agreed date' },
  { stage: 'Support and renewal', measure: 'Support, calibration or software renewed', target: 'To be set' },
];
export const segments = [
  { id: 'SG-1', name: 'Battery research and test laboratories', priority: 1, why: 'Can buy an instrument now; short sales path; values measurement quality', evidence: 'Stated: the company\'s positioning note names laboratories as the buyers who can buy today', risk: 'Small budgets; few units each' },
  { id: 'SG-2', name: 'Battery cell and module manufacturers', priority: 2, why: 'Large value if scrap falls', evidence: 'Stated: the 2024 plan says most large factories build their own test equipment and prefer a license; fewer than 20 customers', risk: 'Long qualification; data kept on site; hard to add a station to a line' },
  { id: 'SG-3', name: 'Refurbishment and second-life companies', priority: 3, why: 'Need fast sorting of used cells and modules', evidence: 'Stated: the grant application says the used-battery market is not pursued for now', risk: 'Price sensitive; no interview on record' },
];
export const personas = [
  { id: 'PE-1', role: 'Laboratory lead or principal investigator', wants: 'Trustworthy impedance on many cells at once; raw data', asks: 'How does it compare with my reference instrument?', buys: 'Equipment budget or grant line' },
  { id: 'PE-2', role: 'Cell quality engineer at a manufacturer', wants: 'A pass or fail number per cell, fast, in the factory data system', asks: 'Throughput, false rejects, integration, who calibrates it', buys: 'Through a pilot, then procurement' },
  { id: 'PE-3', role: 'Process development engineer', wants: 'To see where in the cell a defect is', asks: 'Resolution, repeatability, cell formats', buys: 'Development budget; may fund a study' },
  { id: 'PE-4', role: 'Operations lead at a refurbisher', wants: 'Sort packs and modules quickly', asks: 'Cost per cell tested; ruggedness', buys: 'Only on a clear payback' },
];
export const pricingHypotheses = [
  { id: 'PH-1', model: 'Rental', figure: '$9,975 for six months, then $999 a month for 18 months; gantry $5,475 extra', status: 'Stated', basis: 'Company product sheet for the eight-channel model. No rental on record.' },
  { id: 'PH-2', model: 'Sale of an instrument', figure: 'No sale price exists', status: 'Hypothesis', basis: 'The economics model starts from the 24-month rental value as a stand-in until interviews give a figure.' },
  { id: 'PH-3', model: 'License per energy scanned', figure: '$1 per kWh scanned, software only', status: 'Stated', basis: 'Company 2024 plan, for cell makers who build the hardware themselves.' },
  { id: 'PH-4', model: 'Paid validation study', figure: 'One contract of $150,000 is named', status: 'Stated', basis: 'Company 2024 plan. The contract is not on file and its present state is not known.' },
];
export const interviewPlan = ['What do you measure today, on what, how many a day?', 'Which instrument, how many channels, switched or at once?', 'What does a wrong or late result cost you?', 'What accuracy and what proof would you need before trusting ours?', 'Who signs, from which budget, and how long does a purchase take?', 'Would you pay for a pilot? What would have to be true at the end of it?', 'Where must the data live, and in what format?', 'Who calibrates and services your instruments now?'];
export const pilotChecklist = ['The contracting company (decision ED-01)', 'Scope: cells, channels, duration, site', 'Written acceptance criteria and who signs them', 'Price and payment dates', 'Who owns the data and the results', 'Confidentiality', 'Safety: who connects cells, under whose procedures', 'Support during the pilot and response times', 'What happens to the unit at the end', 'Liability and insurance, reviewed by counsel'];
export const launchReadiness = ['Verification passed on the released design', 'Safety and EMC obligations met for the sales region', 'Manufacturer qualified; first articles passed', 'Calibration procedure and certificate format', 'Price list and terms', 'Warranty and support policy', 'Spare parts and repair path', 'User instructions', 'Serialized product record in use', 'Two customer acceptances on record'];

/* Unit economics inputs. Every figure is a hypothesis; the two that carry a number come from company documents. */
export const bEconomics = {
  id: 'economics',
  price: 27957, cogs: 7400,
  distributorSharePct: 0, distributorMarginPct: 0, warrantyPct: 0, installCost: 0, softwarePerYear: 0, supportPerYear: 0, calibrationPerYear: 0, attachPct: 0, cac: 0, fixedOpex: 0, nre: 0, cmSetup: 0, paymentDays: 45, buildLeadDays: 60,
  basis: {
    price: 'Hypothesis. The 24-month value of the rental on the company product sheet: $9,975 plus 18 times $999. No sale price exists.',
    cogs: 'Hypothesis. Worked out from two figures in a 2025 company slide deck: $100 of electronics per channel times 64, plus a $1,000 stage. No bill of materials or quotation exists; enclosure, assembly, calibration and the university royalty are not in it.',
    paymentDays: 'Assumption: payment 45 days after invoice.', buildLeadDays: 'Assumption: parts paid 60 days before shipment.',
  },
  unset: ['distributorSharePct', 'distributorMarginPct', 'warrantyPct', 'installCost', 'softwarePerYear', 'supportPerYear', 'calibrationPerYear', 'attachPct', 'cac', 'fixedOpex', 'nre', 'cmSetup'],
};
export const economicsLabels = { price: 'Selling price per system, $', cogs: 'Manufacturing cost per system, $', distributorSharePct: 'Share sold through distributors, %', distributorMarginPct: 'Distributor margin, %', warrantyPct: 'Warranty reserve, % of price', installCost: 'Installation and training per system, $', softwarePerYear: 'Software license per system a year, $', supportPerYear: 'Support contract per system a year, $', calibrationPerYear: 'Calibration and maintenance per system a year, $', attachPct: 'Systems that take the recurring services, %', cac: 'Customer acquisition cost per system, $', fixedOpex: 'Fixed operating cost a year, $', nre: 'Engineering one-time cost still to recover, $', cmSetup: 'Contract manufacturer set-up, $', paymentDays: 'Days from invoice to payment', buildLeadDays: 'Days parts are paid before shipment' };

/* ---------------------------------------------------------------- battery: manufacturing, support, lifecycle */

/* The flow from release to repair. who: 'MDMCG' keeps it, 'Outsourced' buys it, 'Both' shares it. */
export const mfgFlow = [
  { step: 'Engineering release', who: 'MDMCG', keeps: 'Requirements, approved design, release authority' },
  { step: 'Approved suppliers', who: 'Both', keeps: 'The approved list and each critical part\'s sourcing evidence' },
  { step: 'Contract PCB assembly', who: 'Outsourced', keeps: 'Acceptance criteria and first-article approval' },
  { step: 'System integration', who: 'Outsourced', keeps: 'The work instructions' },
  { step: 'Calibration and production test', who: 'Both', keeps: 'Calibration algorithms, test limits, the test software' },
  { step: 'Final acceptance', who: 'MDMCG', keeps: 'Sign-off of each serialized unit' },
  { step: 'Fulfillment', who: 'Outsourced', keeps: 'Customer records' },
  { step: 'Customer support', who: 'Both', keeps: 'Second-line support, firmware, customer records' },
  { step: 'Repair or replacement', who: 'Outsourced', keeps: 'Failure analysis and the decision to repair or replace' },
];
const MB = (id, fn, choice, why, rfq, criteria) => ({ id, fn, choice, why, rfq, criteria, status: 'Planning Estimate', supplier: null, backup: null, quote: null });
export const makeBuy = [
  MB('MB-01', 'PCB fabrication and assembly', 'Buy', 'No assembly line in house; standard service', 'Fabrication outputs, bill of materials, assembly drawing, test points, IPC class', 'Certification, low-volume experience, lead time, price, component traceability'),
  MB('MB-02', 'Component procurement', 'Buy, with our approved list', 'The manufacturer buys at better terms; we control which parts', 'Approved manufacturer list with alternates', 'Authorised sources only, dated certificates'),
  MB('MB-03', 'Harnesses and mechanical fabrication', 'Buy', 'Standard work', 'Drawings and models', 'First-article inspection'),
  MB('MB-04', 'Final system integration', 'Buy after the pilot lot; in house for the first units', 'The first units teach us the instructions', 'Work instructions, torque and wiring checks', 'A build record for each serial number'),
  MB('MB-05', 'Test fixtures', 'Make the design, buy the build', 'The fixture embodies our test method', 'Fixture drawings and the test software', 'Fixture verified against reference resistors'),
  MB('MB-06', 'Calibration', 'Make the method; buy accredited calibration of the reference standards', 'Calibration algorithms are ours; traceability comes from an accredited laboratory', 'List of reference standards and intervals', 'Accreditation scope covers low resistance and AC impedance'),
  MB('MB-07', 'Fulfillment and logistics', 'Buy', 'Low volume', 'Packing specification, shipping limits for any cells', 'Damage rate, tracking'),
  MB('MB-08', 'Warranty repair, returns and spares', 'Buy the handling; keep failure analysis', 'Low volume; we must learn from every failure', 'Return procedure, spares list', 'Turnaround time, record of each return'),
  MB('MB-09', 'First-line technical support', 'Keep for the pilots; review after', 'Early customers must reach an engineer', 'None yet', 'Response time measured'),
];
export const supplierScorecard = ['On-time delivery', 'First-pass yield at our acceptance test', 'Nonconformances raised and closed', 'Response time to a quality notice', 'Price against quotation', 'Change notices given before a change'];
export const serialRecord = ['Serial number', 'Hardware revision and bill-of-materials revision', 'Firmware and software versions', 'Calibration record and the standards used', 'Production test record', 'Final acceptance sign-off', 'Shipment date and carrier', 'Customer and installation site', 'Warranty start and end', 'Service history: each return, finding and fix', 'Firmware updates applied', 'End of life: date, data erased, disposal'];
export const supportPolicy = [
  { topic: 'Warranty', text: 'Period and cover to be set before the first pilot. A reserve per unit is an input in the economics model; it is zero until set.' },
  { topic: 'Complaints', text: 'Every complaint gets a record, an owner and a reply date. A complaint about a wrong reading opens a corrective action.' },
  { topic: 'Field failures', text: 'Returned units are analysed by us. Findings feed the risk register and, where needed, an engineering change.' },
  { topic: 'Secure firmware updates', text: 'Signed images only; the unit refuses an unsigned one; each update is entered in the unit\'s record.' },
  { topic: 'Spare parts', text: 'A spares list with each critical part\'s lifecycle status; stock sized from the installed base.' },
  { topic: 'Product changes', text: 'A change that affects form, fit, function or calibration is notified to customers who hold units.' },
  { topic: 'Last-time buys', text: 'A discontinuation notice on a critical part opens a decision: buy for the service life, or redesign.' },
  { topic: 'Long-term service', text: 'A stated service period for each product revision; calibration offered for that period.' },
  { topic: 'End of life', text: 'Customer data erased with a record; unit recycled under the electronics waste rules of the region.' },
];
export const qmsElements = ['Document and revision control', 'Configuration management', 'Supplier qualification', 'Calibration and measurement uncertainty', 'Verification and design review', 'Nonconforming material and devices', 'Corrective action', 'Software and firmware release control', 'Manufacturing acceptance', 'Customer complaints', 'Warranty and field failures', 'Engineering change control', 'Product obsolescence and end of life'];

/* Records people add on the page. All start empty: none exists. */
export const capital = { id: 'capital', cashOnHand: null, asOf: null, note: 'Not on record. Enter the figure to see the balance, the runway and the funding gap.' };
export const expenses = [];
export const customers = [];
export const allocations = [];
export const partners = [];

/* Where one program waits on another (drawn as dashed links on the master roadmap). Keys are "program:task id". */
export const crossLinks = [
  { from: 'battery:BM-2', to: 'funding:FM-2', why: 'A paid pilot is easier to sign once the 64-channel verification is on record' },
  { from: 'funding:FM-1', to: 'battery:BM-1', why: 'The contracting company must be settled before customer terms enter the requirements' },
  { from: 'ecg:M-2', to: 'funding:FM-3', why: 'A cardiac application is stronger with the feasibility result' },
  { from: 'battery:BM-5', to: 'funding:FM-5', why: 'An equity decision is better made with manufacturing readiness known' },
];
