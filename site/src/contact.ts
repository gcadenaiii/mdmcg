// The contact address, read from SITE_CONTACT_EMAIL at build time. It never reaches the page in plain text:
// only the scrambled form is exported, and scripts/site.js assembles the mail link at the moment of the click.
// Unset, malformed, or left at the example value means there is no address: HAS_CONTACT is false.
const raw = (import.meta.env.SITE_CONTACT_EMAIL ?? process.env.SITE_CONTACT_EMAIL ?? '').trim();

export const HAS_CONTACT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) && !raw.endsWith('@example.org');
export const CONTACT_SCRAMBLED = HAS_CONTACT
  ? Array.from(raw).reverse().map((c) => (c.charCodeAt(0) + 7).toString(36)).join('.')
  : undefined;
