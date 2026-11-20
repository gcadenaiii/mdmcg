/* Product Build: everything the page shows, gathered into one object. SERVER SIDE ONLY (see program.js).
   The three files under data/product-build/ are web research of 2026-11-19 (prices, parts, standards), each record with its
   source page; this file does not change their facts, it only adds the program's own planning fields to the parts. */
import { SENTINEL, program, roles, phases, tasks, gates, evidence, reviews } from './program.js';
import { lines, scenarios } from './budget.js';
import { needs, requirements, outputs, risks, tests } from './design.js';
import { gaps, decisions, eolPlan, dependencies, assumptions, weeklyReportFields } from './quality.js';
import { zones, flows, controls, dataModel, futureArchitecture, migrationReadiness } from './security.js';
import { stack, workflow, platforms } from './tooling.js';
import toolsFile from '../../data/product-build/tools.json' with { type: 'json' };
import partsFile from '../../data/product-build/parts.json' with { type: 'json' };
import standardsFile from '../../data/product-build/standards.json' with { type: 'json' };

/* Which functions of the device a missing part would stop: their parts are "critical" for the sourcing rules. */
const CRITICAL_FUNCTIONS = ['A', 'B', 'C', 'E'];
const parts = (partsFile.parts || []).map((p) => ({
  ...p,
  selected: p.role === 'preferred',            // a first proposal for the parts list; the developer confirms it at the architecture review
  critical: CRITICAL_FUNCTIONS.includes(p.function),
  qty_per_device: 1,                           // not yet designed: one of each until the architecture sets the counts
  approval: 'Review Required',
}));

/* Two short readings of the research, each a judgement and labelled as one. The figures in them are in the research files
   (research_notes/Product build program/parts_notes.md and standards_notes.md) with their sources. */
const PARTS_NOTE = 'Reading of the sourcing research (a judgement): the sensor allowance looks enough to evaluate bought fluxgate and magnetoresistive sensors, and leaves a remainder for magneto-impedance boards whose price is known only by quotation. It is not enough for an optically pumped magnetometer: the lowest price read for one was above the whole allowance. The magneto-impedance class, which the earlier sensor study ranked highest, is a preview product sold on inquiry only and cannot be dated. No maker publishes whether a package, shell or electrode stud is magnetic; every magnetic note here is a caution to test.';
const REVIEW_NOTE = 'Published consultant rates were found in one secondary source only (a federal small-business guidance document that says it is not agency guidance): about 200 to 400 dollars an hour at mid level and 400 to 600 at senior level. At those rates the allowance buys roughly 7 to 15 mid-level hours or 5 to 7 senior hours: one scoped review, not a full assessment. No published price for pre-compliance emissions or safety testing was found.';

export const seed = {
  meta: { id: 'meta', sentinel: SENTINEL, dataDate: '2026-11-19', researchReadOn: { tools: toolsFile.read_on || null, parts: partsFile.read_on || null, standards: standardsFile.read_on || null } },
  program, roles, phases, tasks, gates, evidence, reviews,
  lines, scenarios,
  needs, requirements, outputs, risks, tests,
  gaps, decisions, eolPlan, dependencies, assumptions, weeklyReportFields,
  zones, flows, controls, dataModel, futureArchitecture, migrationReadiness,
  stack, workflow, platforms,
  tools: toolsFile.items || [], hipaa: toolsFile.hipaa_eligibility || [], toolsNotFound: toolsFile.not_found || [], toolsMethod: toolsFile.method_note || '',
  parts, partFlags: partsFile.selection_flags || [], partsNotFound: partsFile.not_found || [], partsNotes: PARTS_NOTE, partsMethod: partsFile.method_notes || null,
  standards: standardsFile.items || [], classification: standardsFile.classification_findings || null, regulatoryQuestions: standardsFile.open_questions_for_a_regulatory_professional || [], standardsNotFound: standardsFile.not_found || [], standardsNotes: REVIEW_NOTE, standardsScope: standardsFile.scope_note || null, standardsMethod: standardsFile.how_verified || null,
  hoursLog: [], anomalies: [],
};
export { SENTINEL };

/* ------------------------------------------------------------------ company plan (added 2026-11-19)
   The three-program plan is added beside the ECG/MCG records above. Nothing above is changed: the ECG/MCG plan reads the
   same collections as before. The new collections carry their own names (b... battery, f... funding). */
import { bProgram, bSources, bFindings, bAgreement, bNeeds, bRequirements, bOutputs, bTests, bRisks, bPhases, bTasks, bGates, bLines, bScenarios } from './battery.js';
import * as company from './company.js';
import { fProgram, fPhases, fTasks, fLines, channels, seedOpportunities, fDeliverables, investorChecklist, tractionRules } from './funding.js';
import internalFile from '../../data/product-build/internal.json' with { type: 'json' };
import fundingFile from '../../data/product-build/funding.json' with { type: 'json' };
import marketFile from '../../data/product-build/market.json' with { type: 'json' };

/* Grant and state programs from the research become pipeline records at the first stage. The research's amounts are the
   program's published range, not what the company could get, so "attainable" stays empty until a person enters it. */
const researched = (fundingFile.opportunities || []).map((o) => ({
  id: o.id, organisation: o.organisation, programme: o.programme, type: o.type, target: o.target === 'ecg-mcg' ? 'ecg' : o.target, stage: 'Identified',
  amountRequested: null, amountAttainable: null, amountText: o.amount_text || null, amountMax: o.amount_max_usd ?? null, probability: null, probabilityBasis: null,
  eligibility: o.eligibility || 'Not checked', eligibilityQuestions: o.eligibility_open_questions || [], openStatus: o.open_status || 'unclear', deadline: o.next_deadline || null, deadlineText: o.deadline_text || null,
  owner: 'C', partners: null, matching: o.match_required || null, restrictions: o.restrictions || null, expectedDecision: o.decision_time || null, expectedPayment: null, reporting: o.reporting || null,
  amountReceived: null, receivedDate: null, sourceUrl: o.source_url || null, quote: o.quote || null, verified: !!o.verified, readAt: o.read_at || null, number: o.number || null, fit: o.fit || null, status: 'Planning Estimate', note: o.notes || '',
}));

Object.assign(seed, {
  bProgram, bSources, bFindings, bAgreement, bNeeds, bRequirements, bOutputs, bTests, bRisks, bPhases, bTasks, bGates, bLines, bScenarios,
  ...company,
  fProgram, fPhases, fTasks, fLines, channels, fDeliverables, investorChecklist, tractionRules,
  opportunities: [...seedOpportunities, ...researched],
  fundingStatus: fundingFile.programme_status || [], fundingRules: fundingFile.rules || [], fundingBenchmarks: fundingFile.benchmarks || [], fundingNotFound: fundingFile.not_found || [],
  equipment: marketFile.equipment || [], marketFacts: marketFile.market || [], bStandards: marketFile.standards || [], manufacturers: marketFile.manufacturers || [], marketBenchmarks: marketFile.benchmarks || [], marketNotFound: marketFile.not_found || [],
  internalFacts: internalFile.facts || [], internalDocs: internalFile.documents || [], internalContradictions: internalFile.contradictions || [], internalMissing: internalFile.not_found || [],
});
seed.meta.researchReadOn = { ...seed.meta.researchReadOn, funding: fundingFile.read_on || null, market: marketFile.read_on || null, internal: internalFile.read_on || null };
