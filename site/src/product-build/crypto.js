/* Product Build: how the page's data is locked. The same code runs at build (Node) and in the browser; both have Web Crypto.

   The build compresses the data, then encrypts it with AES-256-GCM. The key comes from the access code through
   PBKDF2-SHA-256 with a random salt. The published file holds only salt, nonce and ciphertext: without the code it cannot
   be read, and a wrong code fails the authentication check instead of giving wrong data.

   Limit, stated plainly: the encrypted file is public, so anyone can try codes against it on their own machine. The
   protection is as strong as the code. The build refuses a code shorter than MIN_CODE_LENGTH. */

export const ITERATIONS = 600000;
export const MIN_CODE_LENGTH = 12;
const te = new TextEncoder();
const td = new TextDecoder();
const b64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
async function keyFrom(code, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', te.encode(String(code).trim()), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** data (any JSON value) + access code -> the envelope that is published */
export async function lock(data, code, iterations = ITERATIONS) {
  if (String(code || '').trim().length < MIN_CODE_LENGTH) throw new Error(`The access code must have at least ${MIN_CODE_LENGTH} characters.`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = await pipe(te.encode(JSON.stringify(data)), new CompressionStream('gzip'));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(code, salt, iterations), plain);
  return { v: 1, kdf: 'PBKDF2-SHA-256', cipher: 'AES-256-GCM', iter: iterations, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

/** envelope + access code -> data. Throws WrongCode when the code does not open it. */
export class WrongCode extends Error { constructor() { super('That code does not open this page.'); this.name = 'WrongCode'; } }
export async function unlock(env, code) {
  if (!env || env.locked || !env.ct) throw new Error('There is nothing to open.');
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, await keyFrom(code, unb64(env.salt), env.iter), unb64(env.ct)); } catch { throw new WrongCode(); }
  return JSON.parse(td.decode(await pipe(new Uint8Array(plain), new DecompressionStream('gzip'))));
}
