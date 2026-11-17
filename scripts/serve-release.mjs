#!/usr/bin/env node
// Local check only: serve an assembled release with the same path layout as infra/proposed/.
//
//   node scripts/serve-release.mjs                       newest folder under release/, port 5181
//   node scripts/serve-release.mjs release/<stamp> 5181
//
// Mimics: /v1/* and /platform/* fall back to their own index.html; /platform/api, /platform/ws and the
// other backend addresses answer 502 (no backend here); everything else is a file or the 404 page.
// It does NOT mimic the access code: /lab/ and /platform/ open without one here.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const relDir = path.join(repo, "release");
const root = path.resolve(process.argv[2] ?? path.join(relDir, fs.readdirSync(relDir).sort().at(-1)));
const port = Number(process.argv[3] ?? 5181);

const TYPES = {
  html: "text/html; charset=utf-8", js: "text/javascript", mjs: "text/javascript", css: "text/css", json: "application/json",
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", webp: "image/webp",
  avif: "image/avif", woff2: "font/woff2", woff: "font/woff", txt: "text/plain; charset=utf-8", xml: "application/xml", ico: "image/x-icon",
};
const BACKEND = /^\/platform\/(ws\/|api|upload|heartbeat|gateways|patients|health|admin)/;

const fileFor = (p) => {
  const f = path.join(root, p);
  if (!f.startsWith(root)) return null;
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  const idx = path.join(f, "index.html");
  return fs.existsSync(idx) ? idx : null;
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  const send = (status, file, extra = {}) => {
    res.writeHead(status, { "Content-Type": TYPES[path.extname(file).slice(1).toLowerCase()] ?? "application/octet-stream", ...extra });
    fs.createReadStream(file).pipe(res);
  };
  if (BACKEND.test(p)) { res.writeHead(502, { "Content-Type": "application/json" }); return res.end('{"detail":"no backend in the local check"}'); }
  for (const area of ["v1", "lab", "platform"]) {
    if (p === `/${area}`) { res.writeHead(301, { Location: `/${area}/` }); return res.end(); }
  }
  let file = fileFor(p);
  if (file && fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isDirectory() && !p.endsWith("/")) {
    res.writeHead(301, { Location: p + "/" + url.search }); return res.end();
  }
  const noindex = /^\/(v1|lab|platform)\//.test(p) ? { "X-Robots-Tag": "noindex, nofollow" } : {};
  if (file) return send(200, file, noindex);
  if (p.startsWith("/v1/") && !p.startsWith("/v1/assets/")) return send(200, path.join(root, "v1", "index.html"), noindex);
  if (p.startsWith("/platform/") && !p.startsWith("/platform/assets/")) return send(200, path.join(root, "platform", "index.html"), noindex);
  const notFound = path.join(root, "404.html");
  if (!/^\/(v1|lab|platform)\//.test(p) && fs.existsSync(notFound)) return send(404, notFound);
  res.writeHead(404, { "Content-Type": "text/plain" }); res.end("404");
}).listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
