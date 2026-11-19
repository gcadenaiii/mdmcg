/* Product Build: the chosen tools, the AI-assisted design workflow and the project-management platform comparison.
   SERVER SIDE ONLY (see program.js).

   Prices are not written here. Each row names a tool by its id in data/product-build/tools.json, where the price, its
   source page and the date it was read are kept; the page multiplies price by seats and months. So a price changes in one
   place, and every figure on the page keeps its source. Which plan is chosen is a planning choice awaiting decision D-04. */

/* The stack the baseline assumes. qty = seats, or gigabytes for a per-gigabyte price. months = how long it is paid. */
export const stack = [
  { id: 'ST-01', tool: 'claude-max', qty: 2, months: 4, chosen: true, why: 'One AI assistant seat for each person, for requirements, code, tests and records. A subscription is easier to budget than billing by use.' },
  { id: 'ST-02', tool: 'kicad', qty: 2, months: 4, chosen: true, why: 'The authoritative, editable electronics design. Open file formats, no fee, no lock-in.' },
  { id: 'ST-03', tool: 'freecad', qty: 1, months: 4, chosen: true, why: 'Enclosure and STEP export at no cost.' },
  { id: 'ST-04', tool: 'github-free', qty: 2, months: 4, chosen: true, why: 'Private repositories and the task board beside the code.' },
  { id: 'ST-05', tool: 'gitleaks', qty: 1, months: 4, chosen: true, why: 'Secret scanning before each commit.' },
  { id: 'ST-06', tool: 'osv-scanner', qty: 1, months: 4, chosen: true, why: 'Dependency vulnerability scan.' },
  { id: 'ST-07', tool: 'github-dependabot', qty: 1, months: 4, chosen: true, why: 'Dependency alerts on the repositories.' },
  { id: 'ST-08', tool: 'lightsail-linux-2gb', qty: 1, months: 4, chosen: true, why: 'The proof-of-concept instance. Created only after decision D-05.' },
  { id: 'ST-09', tool: 'lightsail-object-storage', qty: 1, months: 4, chosen: true, why: 'Raw recording files for the proof of concept.' },
  { id: 'ST-10', tool: 'lightsail-snapshots', qty: 60, months: 4, chosen: true, why: 'Backups. Sixty gigabytes is an assumed disk size.' },
  { id: 'ST-11', tool: 'python', qty: 1, months: 4, chosen: true, why: 'Analysis, with numpy, scipy and the signal libraries listed below, all free.' },
  { id: 'ST-12', tool: 'ngspice', qty: 1, months: 4, chosen: true, why: 'Circuit simulation inside the electronics design tool.' },
  { id: 'ST-13', tool: 'flux-build', qty: 1, months: 1, chosen: false, why: 'Optional: one month during layout, only if a trial shows a measured saving. Overlaps with the chosen electronics tool.' },
  { id: 'ST-14', tool: 'quilter-project', qty: 1, months: 1, chosen: false, why: 'Optional routing alternative. Sold by quotation; the free tier is not meant for commercial work.' },
  { id: 'ST-15', tool: 'fusion-commercial-monthly', qty: 1, months: 3, chosen: false, why: 'Only if the free mechanical tool proves too slow for the enclosure.' },
  { id: 'ST-16', tool: 'github-team', qty: 2, months: 4, chosen: false, why: 'Only if protected branches on private repositories are wanted.' },
  { id: 'ST-17', tool: 'claude-api-payg', qty: 1, months: 4, chosen: false, why: 'Only for automated runs outside a seat. Billed by use; no monthly figure can be stated without a usage estimate.' },
];

/* The AI-assisted design workflow that is proposed. An engineer approves every electrical choice. */
export const workflow = {
  selected: [
    { step: 'Requirements and records', tool: 'AI assistant in the repository', rule: 'Drafts requirements, tests, traceability proposals and this page\'s data. It never writes evidence and never approves.' },
    { step: 'Schematic and layout', tool: 'KiCad', rule: 'The only authoritative electronics source. Native files are under version control. Rule checks run before every review.' },
    { step: 'Layout acceleration', tool: 'Flux or Quilter, optional', rule: 'May propose a layout. A proposal is imported into the authoritative design and reviewed by the developer before it counts.' },
    { step: 'Mechanical design', tool: 'FreeCAD', rule: 'Native files and STEP exports under version control.' },
    { step: 'Simulation', tool: 'ngspice; a field solver where needed', rule: 'Analogue front-end noise and filter response before layout.' },
    { step: 'Manufacturing outputs', tool: 'Generated from the design files', rule: 'Gerber, drill, parts list, pick-and-place, drawings and STEP are produced by script from a tagged revision, never by hand.' },
  ],
  outputs: ['Native project files', 'Schematics', 'Board layouts', 'Gerber files', 'Drill files', 'Parts list', 'Pick-and-place files', 'Manufacturing drawings', 'STEP mechanical models'],
  checks: ['Electrical rule check', 'Design rule check', 'Analogue simulation of the front end', 'Signal integrity on the clock and data lines', 'Emissions and susceptibility review of the layout', 'Test points on every rail and every signal a bring-up step needs', 'A production test plan', 'A written bring-up procedure'],
  magnetic: ['Non-magnetic materials near the sensors: no nickel under gold on nearby pads where avoidable, no steel fasteners, no magnetic shields or inductors with open cores close by', 'Fields made by parts: cell, inductors, the radio\'s power stage and any ferrite are placed and oriented with the sensors in mind and measured', 'Current loops: supply and return run together, switching currents are kept away from the sensors, and the largest loops are listed with their expected field', 'Sensor placement: fixed in the mechanical model with a tolerance, and recorded in the recording\'s geometry data'],
  compare: [
    { tool: 'Claude Code', ids: ['claude-max', 'claude-pro'], role: 'Workflow, requirements, code and records', formats: 'Works on the repository\'s own files', capability: 'Does not lay out boards. Good at structured records, scripts and checks.', confidentiality: 'Vendor terms for the chosen plan are to be read before design files are shared (not checked for this record).', effort: 'Low: already in use', verdict: 'Use' },
    { tool: 'KiCad', ids: ['kicad'], role: 'Authoritative schematic and layout', formats: 'Open native files; Gerber, drill, position, STEP export', capability: 'Full schematic, layout, rule checks, built-in simulation', confidentiality: 'Runs on the developer\'s machine; files stay local', effort: 'Low', verdict: 'Use' },
    { tool: 'Flux', ids: ['flux-build', 'flux-pro'], role: 'AI help with schematic and layout', formats: 'Browser tool. An export of schematics to KiCad was not found on the vendor pages read.', capability: 'AI-driven placement and routing, billed in credits', confidentiality: 'Designs sit on the vendor\'s cloud. A paid plan is needed for private projects.', effort: 'Medium: a second design tool to keep in step', verdict: 'Trial only' },
    { tool: 'Quilter', ids: ['quilter-project', 'quilter-free'], role: 'Automatic layout candidates', formats: 'Takes a finished schematic and a board file', capability: 'Layout only', confidentiality: 'Vendor notes say the free tier is for educational and open designs. Terms for paid work come with the quotation.', effort: 'Medium', verdict: 'Not needed for a small sensor board' },
    { tool: 'Autodesk Fusion', ids: ['fusion-commercial-monthly', 'fusion-commercial-annual', 'fusion-startup'], role: 'Mechanical design', formats: 'Proprietary native format; STEP export', capability: 'Full mechanical design', confidentiality: 'Cloud-based file storage', effort: 'Low for someone who knows it', verdict: 'Only if FreeCAD is too slow' },
    { tool: 'FreeCAD', ids: ['freecad', 'cadquery'], role: 'Mechanical design', formats: 'Open native format; STEP export', capability: 'Enough for an enclosure', confidentiality: 'Local files', effort: 'Medium: steeper to learn', verdict: 'Use' },
  ],
};

/* Project-management platforms, compared for two people over four months. Cost is worked out on the page from tools.json. */
export const platforms = [
  { id: 'PM-1', name: 'AI assistant, GitHub Projects and this page', tools: [{ tool: 'github-free', qty: 2 }], gantt: 'This page draws the schedule with dependencies and the critical path. The task board has a timeline view.', api: 'Yes', assistant: 'Works directly on the repository and the task board', source: 'Tasks sit beside the code and link to commits', trace: 'On this page, by id', quality: 'History and reviewed changes. Not a compliant quality system on its own.', export: 'Everything is files in the repository; this page exports CSV and JSON', upkeep: 'This page is own code and must be maintained', verdict: 'Chosen', why: 'Lowest cost, one place for tasks, no second copy of the records.' },
  { id: 'PM-2', name: 'ClickUp', tools: [{ tool: 'clickup-core', qty: 2 }], gantt: 'Yes on paid plans', api: 'Yes, rate limited', assistant: 'Through its API', source: 'Integration with the repository host', trace: 'Custom fields; no built-in design traceability', quality: 'Not a quality system', export: 'CSV export', upkeep: 'Vendor maintained; a second system to keep in step with the code', verdict: 'Not chosen', why: 'Adds a paid tool and a second copy of the task list for a team of two.' },
  { id: 'PM-3', name: 'Linear', tools: [{ tool: 'linear-basic', qty: 2 }], gantt: 'Project timelines; no dependency-driven schedule with a critical path', api: 'Yes', assistant: 'Through its API', source: 'Strong link to the repository host', trace: 'No built-in design traceability', quality: 'Not a quality system', export: 'CSV export', upkeep: 'Vendor maintained', verdict: 'Fallback', why: 'The free plan would serve if the task board proved too thin.' },
  { id: 'PM-4', name: 'Dedicated medical-device quality system', tools: [{ tool: 'greenlight-guru', qty: 1, yearly: true }, { tool: 'qualio', qty: 1, yearly: true }], gantt: 'No; it is not a scheduling tool', api: 'Varies by vendor; to be confirmed in a quotation', assistant: 'Limited', source: 'Varies by vendor', trace: 'Built for design controls and traceability', quality: 'Built for controlled records, signatures and audit trails. The company must still validate its own use of it.', export: 'To be confirmed in a quotation', upkeep: 'Vendor maintained; yearly contract', verdict: 'Decision gate', why: 'Sold by the year, from five figures. Not justified for a sixteen-week research prototype; decided at the final gate (decision D-07).' },
];
