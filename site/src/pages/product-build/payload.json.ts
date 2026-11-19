// The Product Build page's data, encrypted at build with the access code (see src/product-build/crypto.js).
// The code is read from PRODUCT_BUILD_CODE in the environment or in site/.env (not in version control).
// Without a code a release holds no internal data at all: the page then says it is not open.
// On the development server only, a fixed local code is used so the page can be worked on.
import type { APIRoute } from 'astro';
import { seed } from '../../product-build/seed/index.js';
import { lock, MIN_CODE_LENGTH } from '../../product-build/crypto.js';

const DEV_CODE = 'local-preview';

export const GET: APIRoute = async () => {
  const set = (import.meta.env.PRODUCT_BUILD_CODE ?? process.env.PRODUCT_BUILD_CODE ?? '').trim();
  const code = set || (import.meta.env.DEV ? DEV_CODE : '');
  let body;
  if (!code) body = { locked: true, reason: 'no-code' };
  else {
    if (code.length < MIN_CODE_LENGTH) throw new Error(`PRODUCT_BUILD_CODE must have at least ${MIN_CODE_LENGTH} characters. The encrypted file is public, so a short code could be guessed.`);
    body = await lock(seed, code);
  }
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};
