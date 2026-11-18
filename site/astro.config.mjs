import { defineConfig } from 'astro/config';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/* Development only: the research tools (/lab/) and the earlier site (/v1/) are not part of this Astro project; a release adds
   them beside the built pages. So that their links also work on the development copy, they are served here from the newest
   assembled release in ../release. Nothing of this is in a build. */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.bin': 'application/octet-stream',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json' };
function releaseParts() {
  return {
    name: 'dev-release-parts',
    configureServer(server) {
      const root = path.resolve('..', 'release');
      const newest = () => (existsSync(root) ? readdirSync(root).filter((d) => /^\d{8}T\d{6}Z$/.test(d) && existsSync(path.join(root, d, 'lab'))).sort().pop() : null);
      for (const part of ['lab', 'v1']) {
        // put first in the stack: Astro's own handler would otherwise answer 404 before this is reached
        server.middlewares.stack.unshift({ route: '/' + part, handle: (req, res, next) => {
          const rel = newest();
          if (!rel) return next();
          const base = path.join(root, rel, part);
          let file = path.join(base, decodeURIComponent((req.url || '/').split('?')[0]));
          if (!file.startsWith(base)) return next();
          if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
          if (!existsSync(file)) return next();
          res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
          res.end(readFileSync(file));
        } });
      }
    },
  };
}

// Static output. Pages are folders with an index.html, addresses end in a slash.
export default defineConfig({
  site: 'https://mdmcg.com',
  output: 'static',
  trailingSlash: 'always',
  redirects: { '/work-with-us/': '/contact/' },
  build: { format: 'directory' },
  server: { port: 5174, host: '127.0.0.1' },
  preview: { port: 5174, host: '127.0.0.1' },
  devToolbar: { enabled: false },
  vite: { plugins: [releaseParts()] },
});
