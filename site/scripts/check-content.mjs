// Scans the built HTML in dist/ for wording the owner has ruled out. Run after `pnpm build`:  pnpm check:content
// Exit code 1 if anything is found.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RULES = [
  ['reading time', /\b\d+(\.\d+)?\s*(s|sec|secs|seconds?|min|mins|minutes?|hours?)\b/i],
  ['"not built"', /not built/i],
  ['"simulated" as a tag', />\s*simulated\s*</i],
  ['"concept" or "placeholder" tag', /concept rendering|placeholder|coming soon|lorem ipsum/i],
  ['"Limit:" line', /limit:/i],
  ['"first"', /\bfirst\b/i],
  ['"validated"', /validat/i],
  ['"early warning"', /early[ -]warning/i],
  ['"24/7"', /24\/7/],
  ['"diagnos"', /diagnos/i],
  ['licence', /licen[cs]e/i],
  ['em dash', /—|&mdash;|&#8212;/],
  ['gmail', /gmail/i],
  ['plain mailto or address', /mailto:|[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
  // one name for the research tools (committee change brief, 2026-11-17)
  ['"the lab"', /\b(the|in the|into the) lab\b/i],
  // sentences removed on 2026-11-17: they described a working device, or said more than the facts sheet supports
  ['device described as working', /sensors read the heart|sensor reads the room|The device records and reports|The device sits still and adds up beats|The device lives in a charging case|The device charges in its case|Built for\s*(<[^>]+>\s*)*an ordinary room/i],
  ['"written down in advance" without the count', /<li>Results written down in advance/i],
  ['"39 of 42 rounds" without what followed', /39 of 42 rounds when each chest was left out in turn\.\s*<\/p>/i],
  ['"Checked against real recordings"', /Checked against\s*(<[^>]+>\s*)*real recordings|Every check is open/i],
  ['the published sensor without "one person"', /a heartbeat seen 10 mm from the chest|showing a heartbeat with 6 averaged beats/i],
  ['"every figure comes from one study"', /Every figure on this site/i],
  ['"open to inspect"', /open to inspect|check it yourself|check every figure yourself/i],
  ['old menu label', />Sensors<\/a>|Sensor evaluation/],
];

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.html')) files.push(p);
  }
})('dist');

let bad = 0;
for (const f of files) {
  // visible text and attributes only: scripts and styles are checked separately for the address rules
  const html = readFileSync(f, 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  for (const [name, re] of RULES) {
    const m = text.match(re);
    if (m) { bad++; console.log(`${f}: ${name}: "${text.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' ')}"`); }
  }
  if (/gmail|—/i.test(html)) { bad++; console.log(`${f}: gmail or em dash somewhere in the file`); }
}
console.log(`${files.length} pages checked, ${bad} problem(s).`);
process.exit(bad ? 1 : 0);
