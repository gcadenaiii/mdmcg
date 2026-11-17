#!/usr/bin/env node
// Put one complete release together as a folder of static files:
//
//   release/<UTC timestamp>/            the new site (site/dist) at the top
//   release/<UTC timestamp>/v1/         the frozen earlier site          (v1/site)
//   release/<UTC timestamp>/lab/        the research app                 (lab/site, made by import-lab.mjs)
//   release/<UTC timestamp>/platform/   the dashboard pages              (platform/site)
//   release/<UTC timestamp>/robots.txt  closed to search engines unless --open
//   release/<UTC timestamp>/RELEASE.json
//
//   node scripts/assemble-release.mjs              use site/dist as it is
//   node scripts/assemble-release.mjs --build      run "pnpm build" in site/ first
//   node scripts/assemble-release.mjs --open       robots.txt lets search engines in (launch day)
//
// Nothing is uploaded. The release/ folder is ignored by git.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const OPEN = args.has("--open");
const RESERVED = ["v1", "lab", "platform", "assets", "api"];   // the new site must never own these names

const die = (msg) => { console.error(`\nASSEMBLE FAILED: ${msg}`); process.exit(1); };
const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join("/")];
});
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sizeOf = (dir) => walk(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);

const parts = {
  site: path.join(repo, "site", "dist"),
  v1: path.join(repo, "v1", "site"),
  lab: path.join(repo, "lab", "site"),
  platform: path.join(repo, "platform", "site"),
};

// ---- the new site
if (args.has("--build")) execSync("pnpm build", { cwd: path.join(repo, "site"), stdio: "inherit" });
for (const [name, dir] of Object.entries(parts)) {
  if (!fs.existsSync(path.join(dir, "index.html"))) die(`${name}: ${dir} has no index.html`);
}
for (const name of RESERVED) {
  if (fs.existsSync(path.join(parts.site, name))) die(`site/dist contains "${name}", a name reserved for another area`);
}

// ---- the lab files must be exactly what the import script checked
const manifestFile = path.join(repo, "lab", "MANIFEST.json");
if (!fs.existsSync(manifestFile)) die("lab/MANIFEST.json is missing; run scripts/import-lab.mjs");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const labFiles = walk(parts.lab).sort();
if (labFiles.length !== manifest.list.length) die(`lab/site has ${labFiles.length} files, the manifest lists ${manifest.list.length}; run scripts/import-lab.mjs again`);
for (const f of manifest.list) {
  const p = path.join(parts.lab, f.path);
  if (!fs.existsSync(p) || sha256(p) !== f.sha256) die(`lab/site/${f.path} does not match lab/MANIFEST.json; run scripts/import-lab.mjs again`);
}

// ---- the frozen builds must be the committed bytes
for (const name of ["v1", "platform"]) {
  const sums = fs.readFileSync(path.join(repo, name, "SHA256SUMS"), "utf8").trim().split(/\r?\n/);
  for (const line of sums) {
    const [sum, file] = line.split(/\s+\*?/);
    const p = path.join(parts[name], file);
    if (!fs.existsSync(p) || sha256(p) !== sum) die(`${name}/site/${file} does not match ${name}/SHA256SUMS`);
  }
}

// ---- copy
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");   // 20261117T081500Z
const out = path.join(repo, "release", stamp);
if (fs.existsSync(out)) die(`${out} already exists`);
fs.mkdirSync(out, { recursive: true });
const copy = (from, to) => fs.cpSync(from, to, { recursive: true, preserveTimestamps: true });
copy(parts.site, out);
copy(parts.v1, path.join(out, "v1"));
copy(parts.lab, path.join(out, "lab"));
copy(parts.platform, path.join(out, "platform"));

// ---- robots.txt
// Closed: nothing is crawled. Open: the site is crawled; /v1/ is NOT blocked here on purpose, so that
// crawlers can read its "noindex" and drop it. /lab/ and /platform/ are behind the access code anyway.
const robots = OPEN
  ? "User-agent: *\nDisallow: /lab/\nDisallow: /platform/\n"
  : "User-agent: *\nDisallow: /\n";
fs.writeFileSync(path.join(out, "robots.txt"), robots);
const homeNoindex = /<meta[^>]+name="robots"[^>]+noindex/i.test(fs.readFileSync(path.join(out, "index.html"), "utf8"));
if (OPEN && homeNoindex) console.warn('WARNING: --open was given but the home page still carries "noindex" (NOINDEX flag in site/src/config.ts).');

// ---- record
let commit = null;
try { commit = execSync("git rev-parse --short HEAD", { cwd: repo }).toString().trim(); } catch { /* no git */ }
const sizes = Object.fromEntries(Object.entries(parts).map(([k, d]) => [k, sizeOf(d)]));
const record = {
  release: stamp,
  website_commit: commit,
  search_engines: OPEN ? "open" : "closed",
  home_page_noindex_tag: homeNoindex,
  lab_import: { imported_utc: manifest.imported_utc, research_commit: manifest.research_commit, files: manifest.files },
  bytes: { ...sizes, total: sizeOf(out) },
  files: walk(out).length + 1,
};
fs.writeFileSync(path.join(out, "RELEASE.json"), JSON.stringify(record, null, 2) + "\n");

const mb = (n) => (n / 1e6).toFixed(1) + " MB";
console.log(`Release ${stamp}`);
console.log(`  site ${mb(sizes.site)}, v1 ${mb(sizes.v1)}, lab ${mb(sizes.lab)}, platform ${mb(sizes.platform)}; total ${mb(record.bytes.total)}, ${record.files} files`);
console.log(`  robots.txt: ${OPEN ? "open" : "closed (Disallow: /)"}`);
console.log(`  ${out}`);
