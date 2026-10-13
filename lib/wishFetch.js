/* ==========================================================================
   Family Hub — wishlist URL metadata fetch
   See docs/family-hub-wishlist-brief.md, "Fetching image and price". The
   highest-care file in this module: it fetches a URL a household member
   pasted in, so every request this makes is attacker-shaped until proven
   otherwise.

   Known limitation, not covered by the brief's own spec and not attempted
   here: this resolves a hostname and checks the resolved address before
   fetching, but Node's own `fetch` resolves DNS again internally when it
   actually connects — a DNS answer with a very short TTL could theoretically
   change between the two lookups (rebinding). Defending against that needs
   connecting to the checked IP directly and setting the Host header by
   hand, which is real extra work for a threat model nothing else in this
   household-scale app defends against either. Flagged here rather than
   silently assumed solved.
   ========================================================================== */

import dns from 'node:dns';
import net from 'node:net';

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = 'Mozilla/5.0 (compatible; FamilyHubWishlist/1.0)';

const EMPTY = { title: null, price: null, image: null };

/** Private, loopback and link-local ranges, both families. Deliberately
    does NOT include an ::ffff:0:0/96 "IPv4-mapped" rule — `net.BlockList`
    checking a plain IPv4 address treats that rule as matching *every*
    IPv4 address (confirmed directly: a real public IP like 4.237.22.38
    came back "blocked"), which would have silently broken every fetch.
    Mapped addresses are unwrapped and re-checked by hand below instead. */
function buildBlockList() {
  const list = new net.BlockList();
  const v4 = [['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['127.0.0.0', 8], ['169.254.0.0', 16], ['0.0.0.0', 8]];
  const v6 = [['::1', 128], ['fc00::', 7], ['fe80::', 10]];
  for (const [addr, prefix] of v4) list.addSubnet(addr, prefix, 'ipv4');
  for (const [addr, prefix] of v6) list.addSubnet(addr, prefix, 'ipv6');
  return list;
}
const BLOCKLIST = buildBlockList();

function isBlockedAddress(address, family) {
  if (family === 6 && address.toLowerCase().startsWith('::ffff:')) {
    const v4Part = address.slice(7);
    if (net.isIPv4(v4Part)) return BLOCKLIST.check(v4Part, 'ipv4');
  }
  return BLOCKLIST.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

async function resolvesToBlockedAddress(hostname) {
  let addresses;
  try {
    addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return true; // can't resolve — treat as unsafe, never fetch
  }
  return addresses.some(({ address, family }) => isBlockedAddress(address, family));
}

/** Fetches one URL with every guard the brief asks for: http(s) only,
    private/loopback/link-local rejected (re-checked on every redirect hop,
    not just the first), capped time and size and redirect count. Throws on
    any violation — callers decide whether that means "fail quietly". */
async function safeFetch(startUrl, { maxBytes, accept }) {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(current);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('blocked scheme');
    if (await resolvesToBlockedAddress(parsed.hostname)) throw new Error('blocked host');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(current, {
        redirect: 'manual', signal: controller.signal,
        headers: { accept, 'user-agent': USER_AGENT },
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    const reader = res.body?.getReader();
    const chunks = [];
    let total = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) { controller.abort(); throw new Error('response too large'); }
        chunks.push(value);
      }
    }
    return { buffer: Buffer.concat(chunks.map((c) => Buffer.from(c))), contentType };
  }
  throw new Error('too many redirects');
}

/** schema.org Product JSON-LD → Open Graph → Twitter card, in that
    preference order, per the brief. */
function extractMetadata(html) {
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldBlocks) {
    try {
      const parsed = JSON.parse(m[1]);
      const candidates = Array.isArray(parsed) ? parsed : (parsed['@graph'] ?? [parsed]);
      const node = candidates.find((n) => {
        const type = n?.['@type'];
        return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      });
      if (node) {
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        return {
          title: node.name || null,
          image: Array.isArray(node.image) ? node.image[0] : (node.image || null),
          price: offer?.price != null ? Number(offer.price) : null,
          currency: offer?.priceCurrency || null,
        };
      }
    } catch {
      // malformed JSON-LD on this page — fall through to Open Graph
    }
  }

  const meta = (attr, key) => html.match(new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ?? null;
  const ogImage = meta('property', 'og:image');
  const ogTitle = meta('property', 'og:title');
  const ogPrice = meta('property', 'product:price:amount');
  const ogCurrency = meta('property', 'product:price:currency');
  if (ogImage || ogTitle || ogPrice) {
    return { title: ogTitle, image: ogImage, price: ogPrice != null ? Number(ogPrice) : null, currency: ogCurrency };
  }

  const twImage = meta('name', 'twitter:image');
  if (twImage) return { title: null, image: twImage, price: null, currency: null };

  return { title: null, image: null, price: null, currency: null };
}

/**
 * Pre-fill, never overwrite: returns what a product page says about
 * itself, or every field `null` on any failure — blocked host, timeout,
 * oversized, wrong content-type, nothing recognisable. Never throws; there
 * is no error dialog anywhere in this module for a failed fetch.
 */
export async function fetchWishMetadata(pageUrl) {
  try {
    const parsed = new URL(pageUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return EMPTY;
  } catch {
    return EMPTY;
  }

  let html, pageContentType;
  try {
    const page = await safeFetch(pageUrl, { maxBytes: MAX_HTML_BYTES, accept: 'text/html' });
    pageContentType = page.contentType;
    html = page.buffer.toString('utf8');
  } catch {
    return EMPTY;
  }
  if (!pageContentType.includes('text/html')) return EMPTY;

  const meta = extractMetadata(html);
  const price = meta.currency === 'AUD' ? meta.price : null;

  let image = null;
  if (meta.image) {
    try {
      const imageUrl = new URL(meta.image, pageUrl).toString();
      const fetched = await safeFetch(imageUrl, { maxBytes: MAX_IMAGE_BYTES, accept: 'image/*' });
      if (fetched.contentType.startsWith('image/')) image = fetched;
    } catch {
      // image fetch failed — fails quietly, the page metadata still stands
    }
  }

  return { title: meta.title, price, image };
}
