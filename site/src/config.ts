// One place for site-wide switches and addresses.

/** Private preview: true adds <meta name="robots" content="noindex, nofollow"> to every page. Set to false at launch. */
export const NOINDEX = true;

export const SITE_NAME = 'mdmcg';
export const SITE_TAGLINE = 'Two signals from one heartbeat.';

export const NAV = [
  { href: '/device/', label: 'Device' },
  { href: '/science/', label: 'Science' },
  { href: '/heart-twin/', label: 'Heart Twin' },
  { href: '/sensors/', label: 'Sensor study' },
  { href: '/evidence/', label: 'Evidence' },
  { href: '/team/', label: 'Team' },
];

/** The research tools live outside this site, at /lab/ (built and deployed separately). They open with an access code:
    link to them with the LabLink component, which carries the "Partner access" cue. */
export const LAB = {
  home: '/lab/',
  watch: '/lab/#/watch',
  sensor: '/lab/#/sensor',
  noise: '/lab/#/noise',
  electrodes: '/lab/#/electrodes',
  trust: '/lab/#/trust',
  sensors: '/lab/#/sensors',
  explore: '/lab/#/sensors/explore?body=typical_man&place=sternum%7Cd10&option=a&room=1',
  option1: '/lab/#/sensors/option/a/summary',
  option1wear: '/lab/#/sensors/option/a/wear',
  option1evidence: '/lab/#/sensors/option/a/evidence',
  method: '/lab/#/sensors/method',
};

export const OPTIONS = [
  { n: 1, ring: 'r1', img: 'option-1', flag: 'Recommended', name: 'Wire sensors in one piece', line: 'Wound wire sensors. The best published match to our job.', size: '60 x 32 x 9 mm', sensors: 6, colour: 'teal', alt: 'Option 1: a white core with a teal ring and two soft wings.' },
  { n: 2, ring: 'r2', img: 'option-2', flag: 'Thinnest', name: 'TMR chips with flux concentrators', line: 'The slimmest core of the four, at 6 mm.', size: '60 x 32 x 6 mm', sensors: 6, colour: 'sky blue', alt: 'Option 2: a thinner white core with a sky-blue ring.' },
  { n: 3, ring: 'r3', img: 'option-3', flag: 'Bench plate', name: 'Ready-made boards', line: 'Boards that can be ordered now, for work on the bench.', size: '124 x 46 x 8 mm', sensors: 4, colour: 'navy', alt: 'Option 3: a longer white plate with a navy ring.' },
  { n: 4, ring: 'r4', img: 'option-4', flag: 'Largest battery', name: 'Small fluxgates', line: 'Two cells in a deeper core: the largest battery of the four.', size: '60 x 32 x 14 mm', sensors: 6, colour: 'gold', alt: 'Option 4: a thicker white core with a gold ring.' },
];

export const TEAM = [
  {
    name: 'Farshid Roumi', role: 'Co-Founder', photo: 'farshid-roumi',
    bio: [
      'Founder & CEO of Parthian Energy, developing next-generation energy-storage systems for electric vehicles.',
      'Ph.D. in Mechanical Engineering from Caltech; inventor of 42 published patents in science and engineering.',
      'Former Principal Investigator at Caltech and four-time recipient of the Caltech Innovation Initiative award.',
      'National Academy of Engineering Frontiers of Engineering selectee, 2023: one of 81 early-career engineers nationwide.',
    ],
  },
  {
    name: 'George Cadena', role: 'Co-Founder', photo: 'george-cadena',
    bio: [
      'Engineering leader with 15+ years taking products from concept to market across software, hardware, and regulated medical devices.',
      'Inventor of a wearable multi-lead ECG patch (US-D972736-S); led the company through FDA audit and ISO 13485 certification.',
      'Director at ShotSpotter, leading end-to-end delivery of weapons-detection systems for multi-lane commercial deployment. M.S. Electrical Engineering, Caltech.',
    ],
  },
  {
    name: 'Mahshid Roumi', role: 'Co-Founder', photo: 'mahshid-roumi',
    bio: [
      'Co-Founder & VP of Product Development at Parthian Energy, leading deep-tech energy-storage product development.',
      'Ph.D. in Electrical & Computer Engineering from UC Irvine; 10+ years commercializing research into market-ready products.',
      'Former Postdoctoral Scholar at Caltech.',
    ],
  },
];
