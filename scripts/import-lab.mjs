#!/usr/bin/env node
// Import the research app's BUILT files into lab/site/ for the /lab/ address.
//
//   node scripts/import-lab.mjs                  build the research app into a temp folder, then import
//   node scripts/import-lab.mjs --from <dist>    import an existing build folder instead of building
//   node scripts/import-lab.mjs --app <folder>   where the research app lives (default: ../app)
//
// Rules:
//   1. Only allow-listed built files are copied. Source, scripts and notes never cross.
//   2. Internal references (drive paths, internal document and script names) are replaced by a neutral
//      label IN THE COPY. The research app's own files are never edited.
//   3. Every copied text file is then searched for internal references. One hit and the import fails
//      and lab/site/ is removed.
//   4. lab/MANIFEST.json records what was imported (file list, sizes, sha256). lab/site/ itself is
//      not committed (about 30 MB).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const appDir = path.resolve(opt("--app") ?? path.join(repo, "..", "app"));
const outDir = path.join(repo, "lab", "site");
const LABEL = "internal study record";

// ---------------------------------------------------------------- 1. allow-list
const ALLOW = [
  /^index\.html$/,
  /^assets\/[^/]+\.(js|css)$/,
  /^data\/zenodo_heart_refit\/[^/]+\.(f32|u32|u8|json)$/,
  /^data\/design\/[^/]+\.json$/,
  /^sensor-images\/[^/]+\.webp$/,
  /^sensor-images\/manifest\.json$/,
];
const TEXT = /\.(html|js|css|json)$/;

// ---------------------------------------------------------------- 2. what gets replaced in the copy
// Each rule: [name, pattern]. Applied to decoded JSON strings, and to the raw text of html/js/css.
// In raw js text a backslash inside a string literal is written twice, so [\\/]+ covers both forms.
const INTERNAL_DIRS = "exploration|reports|papers|research_notes|heart_twin|\\.venv[\\w-]*";
const STRIP = [
  ["drive path", /(?<![A-Za-z])[A-Za-z]:(?:\\+|\/(?!\/))[^\s"'`;,()<>]*/g],
  ["data folder", /mdmcg-research-data[^\s"'`;,()<>]*/g],
  ["internal document", new RegExp(`(?:${INTERNAL_DIRS})[\\\\/]+[^"'\`;()<>]*?\\.(?:md|json|py|html|exe)\\b(?:,? section [\\d.]+)?`, "g")],
  ["script name", /(?<![\w.])[A-Za-z0-9_-]{3,}\.py\b/g],
  ["facts sheet", /SYNC_FACTS[\w.-]*/g],
];

// ---------------------------------------------------------------- 3. what must not remain
// Names of the person whose account this runs under come from the operating system, not from this file.
const osNames = [...new Set([os.userInfo().username, path.basename(os.homedir())]
  .flatMap((s) => s.split(/[\s._-]+/)).filter((s) => s.length >= 4))];
const DENY = [
  ["drive letter path", /(?<![A-Za-z])[A-Za-z]:\\/],
  ["drive letter path", /(?<![A-Za-z])[A-Za-z]:\/(?!\/)[\w.-]+\//],
  ["user folder", /[\\/]Users[\\/]/],
  ["data folder", /mdmcg-research-data/],
  ["papers/", /papers\//],
  ["reports/", /reports\//],
  ["research_notes/", /research_notes[\\/]/],
  ["exploration/", /exploration[\\/]/],
  ["virtual environment", /\.venv/],
  ["python script name", /(?<![\w.])[A-Za-z0-9_-]{2,}\.py\b/],
  ["facts sheet", /SYNC_FACTS/],
  ["source map", /sourceMappingURL/],
  ...osNames.map((n) => [`person name from the OS path`, new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")]),
];

// ---------------------------------------------------------------- helpers
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join("/")];
});
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const fail = (msg) => { console.error(`\nIMPORT FAILED: ${msg}`); fs.rmSync(outDir, { recursive: true, force: true }); process.exit(1); };

function stripText(text, hits, where) {
  for (const [name, re] of STRIP) {
    text = text.replace(re, (m) => { hits.push({ where, rule: name, removed: m }); return LABEL; });
  }
  // "internal study record internal study record" after two adjacent hits: keep one.
  return text.replace(new RegExp(`${LABEL}(?:[\\s\\\\]+${LABEL})+`, "g"), LABEL);
}
function stripJson(value, hits, where) {
  if (typeof value === "string") return stripText(value, hits, where);
  if (Array.isArray(value)) return value.map((v, i) => stripJson(v, hits, `${where}[${i}]`));
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) value[k] = stripJson(value[k], hits, `${where}.${k}`);
  }
  return value;
}

// ---------------------------------------------------------------- get a build
let from = opt("--from") ? path.resolve(opt("--from")) : null;
let tmp = null;
if (!from) {
  if (!fs.existsSync(path.join(appDir, "package.json"))) fail(`no research app at ${appDir} (use --app or --from)`);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lab-build-"));
  console.log(`Building the research app into ${tmp} (its own dist/ is not touched) ...`);
  // Same steps as the app's "npm run build", with the output sent to a temp folder.
  execSync(`npx tsc --noEmit && npx vite build --outDir "${tmp}" --emptyOutDir`, { cwd: appDir, stdio: "inherit" });
  from = tmp;
}
if (!fs.existsSync(path.join(from, "index.html"))) fail(`${from} has no index.html`);

// ---------------------------------------------------------------- copy, strip, check
fs.rmSync(outDir, { recursive: true, force: true });
const all = walk(from);
const skipped = all.filter((f) => !ALLOW.some((re) => re.test(f)));
const files = all.filter((f) => ALLOW.some((re) => re.test(f))).sort();
if (!files.length) fail("nothing matched the allow-list");

const hits = [];
const leaks = [];
const manifest = [];
for (const rel of files) {
  const src = path.join(from, rel);
  const dst = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  let buf = fs.readFileSync(src);
  let stripped = 0;
  if (TEXT.test(rel)) {
    const before = hits.length;
    let text = buf.toString("utf8");
    if (rel.endsWith(".json")) {
      const doc = stripJson(JSON.parse(text), hits, rel);
      if (hits.length > before) text = JSON.stringify(doc);   // untouched files keep their exact bytes
    } else {
      text = stripText(text, hits, rel);
    }
    stripped = hits.length - before;
    if (stripped) buf = Buffer.from(text, "utf8");
    for (const [name, re] of DENY) {
      const m = text.match(re);
      if (m) leaks.push(`${rel}: ${name}: "${text.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, " ")}"`);
    }
  }
  fs.writeFileSync(dst, buf);
  fs.utimesSync(dst, fs.statSync(src).atime, fs.statSync(src).mtime);   // unchanged files answer "not modified"
  manifest.push({ path: rel, bytes: buf.length, sha256: sha256(buf), ...(stripped ? { references_replaced: stripped } : {}) });
}
if (tmp) fs.rmSync(tmp, { recursive: true, force: true });

// ---------------------------------------------------------------- report
console.log(`\nCopied ${files.length} files, ${(manifest.reduce((s, f) => s + f.bytes, 0) / 1e6).toFixed(1)} MB, into lab/site/`);
if (skipped.length) console.log(`Not on the allow-list, left behind (${skipped.length}):\n  ${skipped.join("\n  ")}`);
console.log(`\nInternal references replaced by "${LABEL}" in the copy: ${hits.length}`);
for (const h of hits) console.log(`  ${h.where}  [${h.rule}]  ${h.removed}`);

if (leaks.length) fail(`${leaks.length} internal reference(s) still present after stripping:\n  ${leaks.join("\n  ")}`);

let researchCommit = null;
try { researchCommit = execSync("git rev-parse --short HEAD", { cwd: appDir }).toString().trim(); } catch { /* not a git folder */ }
const byRule = {};
for (const h of hits) byRule[h.rule] = (byRule[h.rule] ?? 0) + 1;
fs.writeFileSync(path.join(repo, "lab", "MANIFEST.json"), JSON.stringify({
  imported_utc: new Date().toISOString(),
  research_commit: researchCommit,
  files: manifest.length,
  bytes: manifest.reduce((s, f) => s + f.bytes, 0),
  references_replaced: { total: hits.length, label: LABEL, by_rule: byRule },
  leak_check: "passed",
  list: manifest,
}, null, 2) + "\n");
console.log(`\nLeak check passed. Wrote lab/MANIFEST.json (${manifest.length} files).`);
