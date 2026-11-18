import { defineConfig } from 'astro/config';

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
});
