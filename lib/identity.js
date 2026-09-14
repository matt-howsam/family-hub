import { cookies } from 'next/headers';
import { randomBytes, createHash, randomInt } from 'node:crypto';
import { sql, hasDb } from './db';

/* Identity & device pairing — see docs/identity.md. A device is paired with
   a six-digit code generated on an already-trusted device, never by asking
   for one itself. The session cookie is set here, server-side, on Set-Cookie
   — never document.cookie or localStorage — because Safari's Intelligent
   Tracking Prevention caps script-writable storage at seven days of
   inactivity, and a server-set first-party cookie is not subject to that
   cap. */

const COOKIE = 'fh_session';
const YEAR_SECONDS = 60 * 60 * 24 * 365;
const REISSUE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CODE_TTL_MS = 10 * 60 * 1000;               // 10 minutes
const MAX_CODE_ATTEMPTS = 5;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function newToken() {
  return randomBytes(32).toString('base64url');
}

function newCode() {
  // Six digits, zero-padded — "042817", not "42817".
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function setSessionCookie(token) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: YEAR_SECONDS,
  });
}

/**
 * The current device's identity, read server-side from the cookie.
 * Returns null for an unpaired or revoked device — callers treat that as
 * "no session" and route to /pair, never as any particular role.
 */
export async function getSession() {
  if (!hasDb) return null;
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const rows = await sql`
    select id, person, role, label, last_seen_at
    from person_device
    where token_hash = ${hash(token)} and revoked_at is null`;

  return rows[0] ?? null;
}

/**
 * Called once per page load from a client component (see
 * components/SessionTouch.jsx) — Server Components can read cookies but
 * never write them, so the sliding reissue and last_seen_at bump both live
 * in this route-handler-only path.
 */
export async function touchSession() {
  if (!hasDb) return null;
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const rows = await sql`
    select id, person, role, label, token_hash, last_seen_at
    from person_device
    where token_hash = ${hash(token)} and revoked_at is null`;
  const device = rows[0];
  if (!device) return null;

  const stale =
    !device.last_seen_at || Date.now() - new Date(device.last_seen_at).getTime() > REISSUE_AFTER_MS;

  if (stale) {
    const fresh = newToken();
    await sql`
      update person_device
      set token_hash = ${hash(fresh)}, last_seen_at = now()
      where id = ${device.id}`;
    await setSessionCookie(fresh);
  } else {
    await sql`update person_device set last_seen_at = now() where id = ${device.id}`;
  }

  return { id: device.id, person: device.person, role: device.role, label: device.label };
}

/**
 * Generate a code for a named person (or role: 'display' for the fridge).
 * Only ever called from a route that has already confirmed the requester is
 * `role = 'adult'`.
 */
export async function createPairingCode({ person, role, issuedBy, label }) {
  if (!hasDb) throw new Error('no database configured');
  if (role !== 'display' && !person) throw new Error('person is required unless role is display');

  const code = newCode();

  // Invalidate any still-live code for the same target, per the brief:
  // "Codes are invalidated when a new one is issued for the same person."
  await sql`
    update pairing_code
    set expires_at = now()
    where redeemed_at is null
      and expires_at > now()
      and role = ${role}
      and person is not distinct from ${person ?? null}`;

  await sql`
    insert into pairing_code (code_hash, person, role, issued_by, expires_at)
    values (${hash(code)}, ${person ?? null}, ${role}, ${issuedBy}, now() + interval '10 minutes')`;

  return { code, expiresInMs: CODE_TTL_MS, label: label ?? (role === 'display' ? 'the fridge' : person) };
}

/**
 * Redeem a code on the device that will become that person's (or the
 * fridge's). The code carries the identity — the redeeming device never
 * gets to choose it.
 */
export async function redeemPairingCode({ code, label }) {
  if (!hasDb) throw new Error('no database configured');
  if (!/^\d{6}$/.test(code ?? '')) return { error: 'invalid_code' };

  const rows = await sql`
    select id, person, role
    from pairing_code
    where code_hash = ${hash(code)} and redeemed_at is null and expires_at > now()`;
  const row = rows[0];

  if (!row) {
    // Wrong, unknown or already-dead code. A wrong 6-digit guess can't be
    // matched to the row it was aimed at — hashing sees no row at all — so
    // brute-force protection instead counts this against every code
    // currently live and burns any that has absorbed five such misses.
    // Same response either way: don't tell a guesser whether they were
    // close or which failure mode they hit.
    await sql`
      update pairing_code set attempts = attempts + 1
      where redeemed_at is null and expires_at > now()`;
    await sql`
      update pairing_code set expires_at = now()
      where redeemed_at is null and expires_at > now() and attempts >= ${MAX_CODE_ATTEMPTS}`;
    return { error: 'expired_or_unknown' };
  }

  const token = newToken();
  await sql`
    insert into person_device (person, role, token_hash, label)
    values (${row.person}, ${row.role}, ${hash(token)}, ${label ?? null})`;
  await sql`update pairing_code set redeemed_at = now() where id = ${row.id}`;

  await setSessionCookie(token);
  return { ok: true, person: row.person, role: row.role };
}

/**
 * One-time bootstrap: SETUP_TOKEN claims the first adult identity. Inert
 * once `app_state.bootstrap_complete` is true — rotating the env var does
 * not re-enable it.
 */
export async function bootstrapAdult({ token, person, label }) {
  if (!hasDb) throw new Error('no database configured');
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return { error: 'not_configured' };
  if (token !== expected) return { error: 'wrong_token' };

  const state = await sql`select value from app_state where key = 'bootstrap_complete'`;
  if (state[0]?.value === true) return { error: 'already_used' };

  const sessionToken = newToken();
  await sql`
    insert into person_device (person, role, token_hash, label)
    values (${person}, 'adult', ${hash(sessionToken)}, ${label ?? null})`;
  await sql`
    insert into app_state (key, value) values ('bootstrap_complete', ${JSON.stringify(true)}::jsonb)
    on conflict (key) do update set value = excluded.value`;

  await setSessionCookie(sessionToken);
  return { ok: true, person };
}

export async function bootstrapAvailable() {
  if (!hasDb) return false;
  if (!process.env.SETUP_TOKEN) return false;
  const state = await sql`select value from app_state where key = 'bootstrap_complete'`;
  return state[0]?.value !== true;
}

export async function listDevices() {
  if (!hasDb) return [];
  return sql`
    select id, person, role, label, created_at, last_seen_at, revoked_at
    from person_device
    order by revoked_at is not null, last_seen_at desc nulls last, created_at desc`;
}

export async function revokeDevice(id) {
  if (!hasDb) return;
  await sql`update person_device set revoked_at = now() where id = ${id} and revoked_at is null`;
}
