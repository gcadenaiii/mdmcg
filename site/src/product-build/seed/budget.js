/* Product Build: the non-labour budget lines and the three scenarios. SERVER SIDE ONLY (see program.js).
   Labour is not a line here: it is worked out from each role's rate, weekly hours and the program's length (calc.labour),
   so no hour is counted twice.

   kind says where a figure comes from: 'Planning Estimate' (an allowance, nobody has quoted it), 'Public List Price',
   'Distributor Quote', 'Supplier Verified', 'Actual Paid'. Every line starts as a Planning Estimate: these are the
   allowances given in the program brief of 2026-11-19 and none has been confirmed by a supplier. */

const L = (id, category, title, amount, week, note = '') => ({ id, category, title, amount, kind: 'Planning Estimate', week, actual: 0, actualWeek: null, source: 'Program brief, 2026-11-19 (allowance)', note });

export const lines = [
  L('H-01', 'hardware', 'MCG sensor evaluation hardware', 6500, 1, 'The largest unknown in the budget. Several candidate sensors are sold only on quotation, and one is not sold at all. See the sourcing table and risk R-12.'),
  L('H-02', 'hardware', 'ECG front-end hardware', 700, 1),
  L('H-03', 'hardware', 'Embedded processors and acquisition electronics', 900, 3),
  L('H-04', 'hardware', 'Reference sensors and test fixtures', 2200, 2),
  L('H-05', 'hardware', 'Two circuit board fabrication and assembly runs', 2500, 10, 'The second run is spent only if the first needs a revision.'),
  L('H-06', 'hardware', 'Mechanical prototypes and enclosures', 1000, 9),
  L('H-07', 'hardware', 'Battery and power components', 900, 8),
  L('H-08', 'hardware', 'Additional test equipment', 1500, 2),
  L('H-09', 'hardware', 'Shipping, rework and consumables', 1600, null),
  L('S-01', 'software', 'Software, AI tools and cloud, four months', 2200, null, 'One allowance for all tools and hosting. The Software and cloud section builds this figure up from each tool\'s own price.'),
  L('X-01', 'external', 'Independent engineering, quality, safety or regulatory review', 3000, 9, 'Provisional. The Quality section states whether this is enough.'),
];

/* A scenario changes the program length, the weekly hours, single lines and the contingency. Every changed figure is an
   assumption made for comparison, not a quotation. People can edit each assumption on the page. */
export const scenarios = [
  { id: 'lean', name: 'Lean', summary: 'Lowest cost: equipment already on hand, evaluation boards, free design tools and one circuit board run.',
    durationWeeks: 16, weeklyHours: { A: 36, B: 12 }, contingencyPct: 15,
    lines: {
      'H-05': { amount: 1250, note: 'One fabrication run in place of two (half the allowance).' },
      'H-08': { amount: 0, note: 'Uses test equipment already on hand. Holds only if that equipment is enough for the noise measurements.' },
      'H-06': { amount: 600, note: 'Printed enclosure only.' },
      'H-04': { amount: 1500, note: 'Fixtures built in house.' },
      'S-01': { amount: 900, note: 'Free design tools; one AI subscription and the smallest hosting plan.' },
    },
    risks: ['One board run leaves no money for a layout fault', 'Borrowed or existing instruments may not reach the noise level needed, which would weaken the feasibility result', 'No allowance for a second sensor type if the chosen one fails the gate'],
  },
  { id: 'baseline', name: 'Baseline', summary: 'The standard plan: two people, sixteen weeks, reasonable test capability and two prototype runs.',
    durationWeeks: null, weeklyHours: {}, contingencyPct: null, lines: {},
    risks: ['The sensor allowance may be too small once quotations arrive', 'The external review allowance covers a design review but not a full regulatory assessment', 'No schedule reserve beyond the hours left unplanned each week'],
  },
  { id: 'extended', name: 'Extended feasibility', summary: 'Allows for dearer magnetic sensors, a failed sensing approach, a third board run, more outside review and four more weeks.',
    durationWeeks: 20, weeklyHours: { A: 36, B: 12 }, contingencyPct: 20,
    lines: {
      'H-01': { amount: 15000, note: 'Room for a second sensor type and a dearer evaluation kit. An assumption until quotations are in.' },
      'H-05': { amount: 3750, note: 'Three fabrication runs at the same allowance per run.' },
      'H-04': { amount: 3000, note: 'A better reference sensor.' },
      'H-09': { amount: 2000, note: 'Four more weeks of consumables and shipping.' },
      'S-01': { amount: 2750, note: 'The same monthly allowance for five months.' },
      'X-01': { amount: 8000, note: 'A design review plus a regulatory strategy consultation. An assumption until quotations are in.' },
    },
    risks: ['Four more weeks of labour is the largest added cost', 'A second sensing approach repeats the feasibility experiments', 'Still no clinical evidence at the end: this remains an engineering result'],
  },
];
